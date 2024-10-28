"use client";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { useStore, defaultForm, defaultAdvOptions } from "./store";
import { parseSeerStatDictionary, parseSeerStatFiles } from "@/services/file/file.service";
import { uploadFiles, asFileList } from "@/components/file-input";
import { fetchSession, submit } from "./queries";
import { Accordion } from "react-bootstrap";

const FileInput = dynamic(() => import("@/components/file-input"), {
  ssr: false,
});

export default function AnalysisForm({ id }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const setState = useStore((state) => state.setState);
  const resetStore = useStore((state) => state.resetStore);
  const seerData = useStore((state) => state.seerData);
  const modelOptions = useStore((state) => state.modelOptions);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: defaultForm });

  const { fields, append } = useFieldArray({
    control,
    name: "cohorts",
  });

  const inputType = watch("inputType");
  const inputFile = watch("inputFile");
  const sendNotification = watch("sendNotification");
  const useCondModel = watch("useCondModel");
  const useRelaxModel = watch("useRelaxModel");

  const submitForm = useMutation({
    mutationFn: ({ id, params }) => submit(id, params),
  });
  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => fetchSession(id),
    retry: false,
    enabled: !!id,
  });

  // load previous params if available
  useEffect(() => {
    if (session && !getValues("id")) {
      setState({ seerData: session.seerData, params: session.params });
      setModelOptions(session.seerData);
      reset(session.params);
    }
  }, [getValues, session]);
  useEffect(() => {
    if (inputFile && !Object.keys(seerData).length) handleLoadData();
  }, [inputType, inputFile, seerData, handleLoadData]);

  function handleChange(event) {
    const { name, value, checked } = event.target;
    switch (name) {
      case "sendNotification":
        if (!checked) {
          setValue("jobName", null);
          setValue("email", null);
        }
        break;
    }
  }

  function handleCohort(e, key) {
    const { checked } = e.target;
    setValue(key, checked);
  }

  async function handleLoadData() {
    if (inputType == "seer" && inputFile) {
      const files = Array.from(inputFile);
      const dictionaryFile = files.find((file) => /.dic$/i.test(file.name));
      const dataFile = files.find((file) => /.txt$/i.test(file.name));

      try {
        if (dictionaryFile && dataFile) {
          // parse SEER*Stat files to extract dictionary headers and data
          const { headers, config } = await parseSeerStatDictionary(dictionaryFile);
          const { data } = await parseSeerStatFiles(dictionaryFile, dataFile);
          const seer = {
            dictionaryFile: dictionaryFile.name,
            dataFile: dataFile.name,
            seerStatDictionary: headers,
            seerStatData: data,
            config,
          };

          setModelOptions(seer);
          setState({ seerData: seer });
        } else {
          throw new Error("Invalid SEER*STAT files selected.");
        }
      } catch (e) {
        console.log(e);
      }
    }
  }

  function setModelOptions(seerData) {
    const { seerStatDictionary, config } = seerData;
    const yearOptions = seerStatDictionary
      .filter(({ label }) => /year/gi.test(label))
      .map((e) => ({ label: e.label, name: e.name }));
    const yearRangeOptions = seerStatDictionary.filter(({ name }) => name === yearOptions[0].name)[0]["factors"];
    const intervals = seerStatDictionary.filter(({ name }) => name === "Interval")[0]["factors"];
    // const intervals = [...Array(+config["Session Options"]["NumberOfIntervals"]).keys()].map((i) => i + 1);
    // by default, use 25 years of follow-up (less if there are fewer years of follow-up in the data)
    const interval = Math.min(25, getMaxFollowUpYears(config));
    const allIntervals = intervals.map((e) => e.value);
    // get cohort variables, located between year of diagnosis and interval variables
    const varNames = seerStatDictionary.map((e) => e.label);
    const yearIndex = varNames.indexOf(yearOptions[0].label);
    const intervalIndex = varNames.indexOf("Interval");
    const cohortVariables = seerStatDictionary.slice(yearIndex + 1, intervalIndex);

    // add dynamic fields for cohort variables
    cohortVariables.forEach(({ label, name, factors }) => append({ label, name, options: factors }));

    // set default values in form
    setValue("year", yearOptions[0]?.name);
    setValue("yearStart", yearRangeOptions[0]?.value);
    setValue("yearEnd", yearRangeOptions?.at(-1).value);
    setValue("interval", interval);
    setValue("conditionalEnd", intervals.at(-1).value);
    setValue("cutpoint", allIntervals.includes(5) ? 5 : Math.max(allIntervals));

    setState({ modelOptions: { yearOptions, yearRangeOptions, intervals, cohortVariables } });
  }

  /**
   * Retrieves the maximum number of follow-up years from the SEER*Stat dictionary
   * @param seerStatDictionryConfig
   * @returns
   */
  function getMaxFollowUpYears(seerStatDictionryConfig) {
    // determine the maximum number of followup years
    const sessionOptions = seerStatDictionryConfig["Session Options"];
    const numberOfIntervals = +sessionOptions?.NumberOfIntervals || 30;
    const monthsPerInterval = +sessionOptions?.MonthsPerInterval || 12;
    const maxFollowUpYears = Math.ceil((monthsPerInterval * numberOfIntervals) / 12);
    return maxFollowUpYears;
  }

  /**
   * Processes the cohorts data and returns the filtered cohorts and cohort parameters.
   *
   * @param {Object} formData - The form data containing the cohorts.
   * @returns {Object} - An object containing the filtered cohorts and cohort parameters.
   */
  function processCohorts(formData) {
    const cohorts = formData.cohorts.map(({ options, ...rest }) => {
      const noSelect = options.filter((e) => e.checked).length === 0;
      return {
        ...rest,
        options: noSelect ? options.map((e) => ({ ...e, checked: true })) : options,
      };
    });

    const selectedCohorts = cohorts.reduce(
      (acc, { name, options }) => ({
        ...acc,
        [name]: options.filter((e) => e.checked).map((e) => e.value),
      }),
      {}
    );
    const cohortVars = Object.keys(selectedCohorts);
    const cohortCombos = Object.values(selectedCohorts).reduce(
      (acc, row) => acc.flatMap((prefix) => row.map((value) => [...prefix, value])),
      [[]]
    );

    return { cohorts, cohortVars, cohortCombos };
  }

  async function onSubmit(formData) {
    const id = uuidv4();
    const { cohorts, cohortVars, cohortCombos } = processCohorts(formData);
    const statistic = seerData.config["Session Options"]["Statistic"];
    const rates = seerData.config["Session Options"]["RatesDisplayedAs"];
    const firstYear = +seerData.seerStatDictionary.filter((e) => e.name === formData.year)[0]["factors"][0].label;

    const params = {
      ...formData,
      id,
      cohorts,
      cohortVars,
      cohortCombos,
      observed: statistic === "Relative Survival" ? "Relative_Survival_Cum" : "CauseSpecific_Survival_Cum",
      rates,
      firstYear,
      statistic,
      files: {
        dictionaryFile: seerData?.dictionaryFile,
        dataFile: seerData.dataFile,
        headers: seerData.seerStatDictionary.map((e) => e.name),
        seerStatFile: "seerStatData.json",
      },
    };

    const seerStatFile = asFileList(
      new File([JSON.stringify(seerData)], params.files.seerStatFile, { type: "application/json" })
    );
    // await uploadFiles(`/api/upload/${id}`, { ...formData, seerDataFile });
    await uploadFiles(`api/upload/${id}`, { seerStatFile });
    submitForm.mutate({ id, params });
    reset(params);
    setState({ params });
    router.push(`${pathname}?id=${id}`, { shallow: true });
  }

  function onReset(event) {
    event.preventDefault();
    router.push("/analysis", { shallow: false });
    reset(defaultForm);
    resetStore();
    queryClient.invalidateQueries();
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)} onReset={onReset}>
      <fieldset className="fieldset shadow-sm border rounded my-4 pt-4 px-3">
        <legend className="legend fw-bold">Data</legend>
        <Form.Group className="mb-4" controlId="inputType">
          <Form.Label className="required fw-bold">Input Type</Form.Label>
          <Form.Select
            required
            {...register("inputType", {
              required: true,
              onChange: handleChange,
            })}>
            <option value="seer">Dictionary/Data Files</option>
            <option value="csv">CSV File</option>
            <option value="zip">Workspace</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="inputFile">
          <Form.Label className="required fw-bold">Files</Form.Label>
          <FileInput
            control={control}
            rules={{ required: inputType === "seer" && !Object.keys(seerData).length }}
            name="inputFile"
            multiple
            accept=".dic,.csv,.zip,.txt"
          />
          <Form.Text className="text-danger">{errors?.referenceDataFiles?.message}</Form.Text>
        </Form.Group>
        {Object.keys(seerData).length > 0 && (
          <div>
            <b>Data Type: </b>
            {seerData.config["Session Options"]["Statistic"]} in{" "}
            {seerData.config["Session Options"]["RatesDisplayedAs"]}
          </div>
        )}
        <div className="text-end mb-3">
          <Button variant="primary" onClick={() => handleLoadData()} disabled={false}>
            Load
          </Button>
        </div>
      </fieldset>

      {Object.keys(seerData).length > 0 && (
        <>
          <fieldset className="fieldset shadow-sm border rounded my-4 pt-4 px-3">
            <legend className="legend fw-bold">Cohort and Model Specifications</legend>
            <Form.Group className="mb-4" controlId="year">
              <Form.Label className="required fw-bold">Year of Diagnosis</Form.Label>
              <Form.Select required {...register("year", { required: true })}>
                {modelOptions.yearOptions.map((e) => (
                  <option key={e.name} value={e.name}>
                    {e.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Label className="required fw-bold">Year of Diagnosis Range</Form.Label>
            <Row className="mb-4">
              <Col sm="auto">
                <Form.Select {...register("yearStart", { required: true })} required aria-label="Year Start">
                  {modelOptions.yearRangeOptions.map((e) => (
                    <option key={"start" + e.value} value={+e.value}>
                      {e.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col sm="auto">
                <Form.Select {...register("yearEnd", { required: true })} required aria-label="Year End">
                  {modelOptions.yearRangeOptions.map((e) => (
                    <option key={"end" + e.value} value={+e.value}>
                      {e.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            </Row>

            <Form.Group className="mb-4" controlId="interval">
              <Form.Label className="required fw-bold">Interval</Form.Label>
              <Form.Select required {...register("interval", { required: true, valueAsNumber: true })}>
                {modelOptions.intervals.map(({ label, value }) => (
                  <option key={value} value={value}>
                    {`<= ${value}`}
                  </option>
                ))}
              </Form.Select>
              <small>Max No. of Years from Diagnosis (follow-up) to include</small>
            </Form.Group>

            {fields.length ? (
              fields.map(({ label, options }, fIndex) => (
                <Form.Group key={label} controlId={label} className="mb-4">
                  <Form.Label className="fw-bold">{label}</Form.Label>
                  {options.map((e, oIndex) => {
                    const checkLabel = e.label.replace(/"/gi, "").trim();
                    return (
                      <Form.Check
                        {...register(`cohorts.${fIndex}.options.${oIndex}.checked`)}
                        onChange={(e) => handleCohort(e, `cohorts.${fIndex}.options.${oIndex}.checked`)}
                        label={checkLabel}
                        value={e.name}
                        name={checkLabel}
                        id={checkLabel}
                        key={checkLabel}
                        type="checkbox"
                      />
                    );
                  })}
                </Form.Group>
              ))
            ) : (
              <p className="text-info">No cohorts in data</p>
            )}

            <Form.Group className="mb-4" controlId="maxJp">
              <Form.Label className="required fw-bold">Maximum Joinpoints</Form.Label>
              <Form.Select required {...register("maxJp", { required: true, valueAsNumber: true })}>
                {[...Array(6).keys()].map((n) => (
                  <option key={n} value={+n}>
                    {n}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <div className="mb-4">
              <Form.Group>
                <Form.Check
                  {...register(`useCondModel`)}
                  id="useCondModel"
                  label={<b>Conditional Survival Model Using Truncated Data</b>}
                  aria-label="calculate conditional model"
                  type="checkbox"
                  disabled={useRelaxModel}
                />
              </Form.Group>
              {useCondModel && (
                <div>
                  <Form.Label>Interval Range</Form.Label>
                  <Row>
                    <Col sm="auto">
                      <Form.Group className="d-flex align-items-center">
                        <Form.Select
                          {...register(`conditionalStart`, {
                            valueAsNumber: true,
                            required: useCondModel ? "Required" : false,
                            validate: (value, form) =>
                              value < form.conditionalEnd || `Must be less than ${form.conditionalEnd}`,
                          })}
                          isInvalid={errors?.conditionalStart}
                          aria-label="Interval start">
                          {modelOptions.intervals.map(({ value }) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors?.conditionalStart && errors?.conditionalStart?.message}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col sm="auto">
                      <Form.Group className="d-flex align-items-center">
                        <Form.Select
                          {...register(`conditionalEnd`, {
                            valueAsNumber: true,
                            required: useCondModel ? "Required" : false,
                            validate: (value, form) =>
                              value > form.conditionalStart || `Must be greater than ${form.conditionalStart}`,
                          })}
                          isInvalid={errors?.conditionalEnd}
                          aria-label="Interval End">
                          {modelOptions.intervals.map(({ value }) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors?.conditionalEnd && errors?.conditionalEnd?.message}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>
              )}
            </div>
            <div className="mb-4">
              <Form.Group>
                <Form.Check
                  {...register(`useRelaxModel`)}
                  id="useRelaxModel"
                  label={<b>Relax Proportionality</b>}
                  aria-label="calculate relax proportionality model"
                  type="checkbox"
                  disabled={useCondModel}
                />
              </Form.Group>
              {useRelaxModel && (
                <Form.Group>
                  <Form.Label>Cut Point</Form.Label>
                  <Form.Select
                    {...register(`cutpoint`, {
                      valueAsNumber: true,
                      required: useRelaxModel ? "Required" : false,
                    })}
                    aria-label="cut point">
                    {modelOptions.intervals.slice(0, -1).map(({ value }) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text>
                    The cut-point is the time after diagnosis that splits data into two groups. Cluster 1 includes years
                    1 to the cut-point. Separate JPSurv models are applied to each cluster.
                  </Form.Text>
                </Form.Group>
              )}
            </div>

            <Accordion className="mb-3">
              <Accordion.Item eventKey="0">
                <Accordion.Header>Advanced Options</Accordion.Header>
                <Accordion.Body>
                  <Form.Group controlId="delLastIntvl">
                    <Form.Check
                      {...register("delLastIntvl")}
                      type="switch"
                      label="Delete Last Interval"
                      className="fw-bold"
                    />
                  </Form.Group>
                  <Form.Group controlId="numbetwn" className="my-3">
                    <Form.Label className="fw-bold">
                      Minimum Number of Years between Joinpoints (Excluding Joinpoints)
                    </Form.Label>
                    <Form.Control {...register("numbetwn", { valueAsNumber: true })} type="number" min="2" />
                  </Form.Group>
                  <Form.Group controlId="numfromstart" className="my-3">
                    <Form.Label className="fw-bold">
                      Minimum Number of Years before First Joinpoint (Excluding Joinpoint)
                    </Form.Label>
                    <Form.Control
                      {...register("numfromstart", { valueAsNumber: true })}
                      type="number"
                      min="2"></Form.Control>
                  </Form.Group>
                  <Form.Group controlId="numtoend" className="my-3">
                    <Form.Label className="fw-bold">
                      Minimum Number of Years after Last Joinpoint (Excluding Joinpoint)
                    </Form.Label>
                    <Form.Control
                      {...register("numtoend", { valueAsNumber: true })}
                      type="number"
                      min="2"></Form.Control>
                  </Form.Group>
                  <Form.Group controlId="projectedYears" className="my-3">
                    <Form.Label className="fw-bold">Number of Calendar Years of Projected Survival</Form.Label>
                    <Form.Control
                      {...register("projectedYears", { valueAsNumber: true })}
                      type="number"
                      min="0"></Form.Control>
                  </Form.Group>
                  <Button variant="link" className="mt-3" onClick={() => reset({ ...watch(), ...defaultAdvOptions })}>
                    Reset Advanced Options
                  </Button>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </fieldset>

          <fieldset className="fieldset shadow-sm border rounded my-4 pt-4 px-3">
            <legend className="legend fw-bold">Notifications</legend>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Long-running Job"
                name="sendNotification"
                id="sendNotification"
                {...register("sendNotification", {
                  // required: (covariateFile || geneSetFile) !== null,
                  onChange: handleChange,
                })}
              />
              <div>
                <Form.Text className="text-danger">
                  {errors?.sendNotification ? "Required for Gene Set Analysis" : ""}
                </Form.Text>
              </div>
              <Form.Text className="text-muted fst-italic">
                When submitting a long-running job, select this option to receive a notification via email upon
                completion.
              </Form.Text>
            </Form.Group>

            {sendNotification && (
              <div className={sendNotification ? "d-block" : "d-block"}>
                <Form.Group className="mb-3" controlId="jobName">
                  <Form.Label className={sendNotification && "required"}>Job Name</Form.Label>
                  <Form.Control
                    name="jobName"
                    required={sendNotification}
                    disabled={!sendNotification}
                    {...register("jobName", { required: sendNotification })}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="email">
                  <Form.Label className={sendNotification && "required"}>Email</Form.Label>
                  <Form.Control
                    name="email"
                    type="email"
                    required={sendNotification}
                    {...register("email", {
                      required: sendNotification,
                      disabled: !sendNotification,
                    })}
                  />
                </Form.Group>
              </div>
            )}
          </fieldset>
        </>
      )}

      <div className="text-end">
        <Button type="reset" variant="outline-danger" className="me-1">
          Reset
        </Button>
        <Button type="submit" variant="primary" disabled={!Object.keys(seerData).length}>
          Submit
        </Button>
      </div>
    </Form>
  );
}
