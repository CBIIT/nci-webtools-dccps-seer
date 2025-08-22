"use client";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";
import { useQuery, useMutation, useQueryClient, useIsMutating } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { useStore, defaultForm, defaultAdvOptions } from "./store";
import { parseSeerStatDictionary, parseSeerStatFiles } from "@/services/file/file.service";
import { asFileList } from "@/components/file-input";
import { fetchSession, submit, importWorkspace } from "@/services/queries";
import { Accordion } from "react-bootstrap";

const FileInput = dynamic(() => import("@/components/file-input"), {
  ssr: false,
});

export default function AnalysisForm({ id }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const setState = useStore((state) => state.setState);
  const setUserCsv = useStore((state) => state.setUserCsv);
  const resetStore = useStore((state) => state.resetStore);
  const seerData = useStore((state) => state.seerData);
  const modelOptions = useStore((state) => state.modelOptions);
  const [error, setError] = useState(null);
  const isMutatingSubmit = useIsMutating({ mutationKey: ["submitJp"] });
  const isMutatingImport = useIsMutating({ mutationKey: ["importJp"] });
  const isSubmitting = isMutatingSubmit || isMutatingImport;

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    trigger,
    formState: { errors },
  } = useForm({ defaultValues: defaultForm });

  const {
    fields,
    append,
    reset: resetFields,
  } = useFieldArray({
    control,
    name: "cohorts",
  });

  const inputType = watch("inputType");
  const inputFile = watch("inputFile");
  const sendNotification = watch("sendNotification");
  const useCondModel = watch("useCondModel");
  const useRelaxModel = watch("useRelaxModel");
  const notificationRequired = watch("maxJp") > 2 || isMultiCohort(watch("cohorts"));

  const submitForm = useMutation({
    mutationKey: "submitJp",
    mutationFn: ({ params, data }) => submit(params.id, params, data),
    onSettled: (data, error) => {
      if (error) setError(error.response.data.error);
      else if (data) setError(null);
    },
  });
  const importMutation = useMutation({
    mutationKey: "importJp",
    mutationFn: ({ id, fileList }) => importWorkspace(id, fileList),
    onSettled: (data, error) => {
      if (error) setError(error.response.data.error);
      else if (data) setError(null);
    },
  });
  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => fetchSession(id),
    retry: false,
    enabled: !!id,
  });

  const handleLoadData = useCallback(
    async (inputType, inputFile) => {
      if (inputFile) {
        const files = Array.from(inputFile);
        const dictionaryFile = files.find((file) => /.dic$/i.test(file.name));
        const dataFile = files.find((file) => /(.txt|.csv|.tsv)$/i.test(file.name));

        if (inputType === "seer" && dictionaryFile && dataFile) {
          try {
            if (dictionaryFile && dataFile) {
              // parse SEER*Stat files to extract dictionary headers and data
              const { headers, config } = await parseSeerStatDictionary(dictionaryFile);
              const { data } = await parseSeerStatFiles(dictionaryFile, dataFile);
              // get cohort variables by filtering unknown labels
              const exclude = ["Page type", "Interval", /^year/gi];
              const cohortVariables = headers
                .filter(
                  (e) =>
                    e.factors.length &&
                    !exclude.some((item) => (item instanceof RegExp ? item.test(e.label) : item === e.label))
                )
                .map((e) => ({
                  ...e,
                  factors: e.factors.map((f) => ({ ...f, label: f.label.replace(/"/gi, "").trim() })),
                }));

              const seer = {
                dictionaryFile: dictionaryFile.name,
                dataFile: dataFile.name,
                seerStatDictionary: headers,
                seerStatData: data,
                cohortVariables,
                config,
              };

              setModelOptions(seer);
              setState({ seerData: seer });
            } else {
              throw new Error("Invalid SEER*STAT files selected.");
            }
          } catch (e) {
            console.error(e);
          }
        } else if (inputType === "csv" && dataFile) {
          setUserCsv({ userData: dataFile, openConfigDataModal: true });
        }
      }
    },
    [setState, setUserCsv]
  );

  // load previous params if available
  useEffect(() => {
    if (session && !getValues("id")) {
      setState({ seerData: session.seerData, params: session.params });
      setModelOptions(session.seerData);
      reset({ ...session.params, inputFile: asFileList(session.params.inputFile) });
    }
  }, [getValues, session]);
  useEffect(() => {
    if (inputFile && !seerData?.cohortVariables) handleLoadData(inputType, inputFile);
  }, [inputType, inputFile, seerData, handleLoadData]);
  useEffect(() => {
    if (Object.keys(seerData).length && !Object.keys(modelOptions).length) setModelOptions(seerData);
  }, [seerData, modelOptions]);

  function handleCohort(e, key) {
    const { checked } = e.target;
    setValue(key, checked);
  }

  function setModelOptions(seerData) {
    const { seerStatDictionary, cohortVariables } = seerData;
    const yearOptions = seerStatDictionary
      .filter(({ label }) => /year/gi.test(label))
      .map((e) => ({ label: e.label, name: e.name }));
    const yearRangeOptions = seerStatDictionary.filter(({ name }) => name === yearOptions[0].name)[0]["factors"];
    const intervals = seerStatDictionary.filter(({ name }) => name === "Interval")[0]["factors"];
    // const intervals = [...Array(+config["Session Options"]["NumberOfIntervals"]).keys()].map((i) => i + 1);
    // by default, use 25 years of follow-up (less if there are fewer years of follow-up in the data)
    const interval = Math.max(...intervals.map((e) => e.value));
    // const interval = Math.min(25, getMaxFollowUpYears(config));
    const allIntervals = intervals.map((e) => e.value);

    // add dynamic fields for cohort variables
    cohortVariables.forEach(({ label, name, factors }) => append({ label, name, options: factors }));

    // set default values in form
    setValue("year", yearOptions[0]?.name);
    setValue("yearStart", yearRangeOptions[0]?.value);
    setValue("yearEnd", yearRangeOptions?.at(-1).value);
    setValue("interval", interval);
    setValue("conditionalEnd", intervals.at(-1).value);
    setValue("cutpoint", allIntervals.includes(5) ? 5 : Math.max(allIntervals));

    setState({ modelOptions: { yearOptions, yearRangeOptions, intervals } });
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

  // check if multiple cohorts are selected
  function isMultiCohort(cohorts) {
    if (!cohorts) return false;
    return cohorts.some(({ options }) => {
      const countSelected = options.filter((e) => e.checked).length;
      return countSelected === 0 || countSelected > 1;
    });
  }

  /**
   * Processes the cohorts data and returns the filtered cohorts and cohort parameters.
   *
   * @param {Object} formData - The form data containing the cohorts.
   * @returns {Object} - An object containing the filtered cohorts and cohort parameters.
   */
  function processCohorts(formData) {
    const cohorts = formData.cohorts.map(({ options, ...rest }) => {
      // if no options are selected, select all
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
    if (inputType === "seer" || inputType === "csv") {
      await submitCalculation(formData);
    } else if (inputType === "zip" && inputFile.length) {
      await loadWorkspace(formData);
    }
  }

  async function submitCalculation(formData) {
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
      inputFile: Array.from(inputFile).map((file) => file.name),
    };

    // const seerStatFile = asFileList(
    //   new File([JSON.stringify(seerData)], params.files.seerStatFile, { type: "application/json" })
    // );
    // await uploadFiles(`/api/upload/${id}`, { ...formData, seerDataFile });
    // await uploadFiles(`/api/upload/${id}`, { seerStatFile });
    await submitForm.mutateAsync({ params, data: seerData });
    reset(params);
    setState({ params });
    router.push(`${pathname}?id=${id}`, { shallow: true });
  }

  async function loadWorkspace() {
    const id = uuidv4();
    const workspace = asFileList(inputFile[0]);
    const { data: workspaceId } = await importMutation.mutateAsync({ id, fileList: workspace });
    router.push(`${pathname}?id=${workspaceId}`, { shallow: true });
  }

  function onReset(event) {
    event.preventDefault();
    router.push("/jpsurv", { shallow: false });
    reset(defaultForm);
    resetStore();
    queryClient.invalidateQueries();
    setError(null);
  }

  function numberInputOnWheelPreventChange(e) {
    // Prevent the input value change
    e.target.blur();
    // Prevent the page/container scrolling
    e.stopPropagation();
    // Refocus immediately, on the next tick (after the current function is done)
    setTimeout(() => {
      e.target.focus();
    }, 0);
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)} onReset={onReset} noValidate>
      <Image src={"/assets/jpsurv.png"} alt="JPSurv (Joint Point Survival Model)" width={120} height={43} />
      <fieldset className="fieldset shadow-sm border rounded my-4 pt-4 px-3">
        <legend className="legend fw-bold">Data</legend>
        <Form.Group className="mb-4" controlId="inputType">
          <Form.Label className="required fw-bold">File Format</Form.Label>
          <Form.Select required {...register("inputType", { required: true })}>
            <option value="seer">SEER*Stat Dictionary and Data Files</option>
            <option value="csv">CSV File</option>
            <option value="zip">Workspace</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="inputFile">
          <Form.Label className="required fw-bold">
            {inputType === "seer"
              ? "SEER*Stat Dictionary and Data Files (.dic/.txt)"
              : inputType === "csv"
              ? "Data (.txt/.csv/.tsv)"
              : "Workspace (.zip)"}
          </Form.Label>
          <FileInput
            control={control}
            rules={{
              required: !Object.keys(seerData).length,
              max: inputType === "seer" ? 2 : 1,
              validate: (files) => {
                if (inputType === "seer") {
                  return files?.length === 2 || "Exactly 2 files are required for SEER*Stat.";
                }
                return true;
              },
            }}
            name="inputFile"
            multiple={inputType === "seer"}
            accept={".dic,.csv,.tsv,.zip,.txt"}
            isInvalid={errors?.inputFile}
            onChange={() => {
              trigger("inputFile");
              // if (fields) reset("cohorts");
              setState({ seerData: {} });
            }}
          />
          <Form.Text className="text-danger">{errors?.inputFile?.message}</Form.Text>
        </Form.Group>
        {Object.keys(seerData).length > 0 && (
          <div>
            <b>Data Type: </b>
            {seerData.config["Session Options"]["Statistic"]} in{" "}
            {seerData.config["Session Options"]["RatesDisplayedAs"]}
          </div>
        )}
        {!Object.keys(seerData).length && inputType === "seer" && (
          <div>
            <div>
              <Button
                className="p-0"
                variant="link"
                size="sm"
                onClick={async () => {
                  try {
                    // Helper function to fetch and convert a file to a Blob
                    const fetchFile = async (url, fileName) => {
                      const response = await fetch(url);
                      if (!response.ok) throw new Error(`Failed to fetch ${fileName}`);
                      const blob = await response.blob();
                      return new File([blob], fileName, { type: blob.type });
                    };

                    // Fetch both files
                    const dicFile = await fetchFile(
                      "/data/Tutorial_JPSurv_01242022.dic",
                      "Tutorial_JPSurv_01242022.dic"
                    );
                    const txtFile = await fetchFile(
                      "/data/Tutorial_JPSurv_01242022.txt",
                      "Tutorial_JPSurv_01242022.txt"
                    );

                    // Set the files in the form
                    setValue("inputFile", asFileList([dicFile, txtFile]));
                  } catch (error) {
                    console.error("Error loading example files:", error);
                  }
                }}>
                Load Example
              </Button>
            </div>
            <div>
              <Button className="p-0" variant="link" size="sm" href="/data/Tutorial_JPSurv_01242022.txt" download>
                Download Example (.txt)
              </Button>
            </div>
            <div>
              <Button className="p-0" variant="link" size="sm" href="/data/Tutorial_JPSurv_01242022.dic" download>
                Download Example (.dic)
              </Button>
            </div>
          </div>
        )}
        <div className="text-end mb-3">
          {inputType === "csv" && (
            <Button variant="link" onClick={() => setUserCsv({ openConfigDataModal: true })}>
              Configure CSV
            </Button>
          )}
          {/* <Button variant="primary" onClick={() => handleLoadData(inputType, inputFile)} disabled={false}>
            Load
          </Button> */}
        </div>
      </fieldset>

      {Object.keys(modelOptions).length > 0 && (
        <>
          <fieldset className="fieldset shadow-sm border rounded my-4 pt-4 px-3">
            <legend className="legend fw-bold legend-wrap">Cohort and Model Specifications</legend>
            <Form.Group className="my-3" controlId="year">
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
                    return (
                      <Form.Check
                        {...register(`cohorts.${fIndex}.options.${oIndex}.checked`)}
                        onChange={(e) => handleCohort(e, `cohorts.${fIndex}.options.${oIndex}.checked`)}
                        label={e.label}
                        value={e.name}
                        name={e.label}
                        id={e.label}
                        key={e.label}
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
                    <Form.Control
                      {...register("numbetwn", {
                        valueAsNumber: true,
                        validate: (value) => !isNaN(value) || "Value must be a valid number",
                      })}
                      type="number"
                      min="2"
                      onWheel={numberInputOnWheelPreventChange}
                    />
                  </Form.Group>
                  <Form.Group controlId="numfromstart" className="my-3">
                    <Form.Label className="fw-bold">
                      Minimum Number of Years before First Joinpoint (Excluding Joinpoint)
                    </Form.Label>
                    <Form.Control
                      {...register("numfromstart", {
                        valueAsNumber: true,
                        validate: (value) => !isNaN(value) || "Value must be a valid number",
                      })}
                      type="number"
                      onWheel={numberInputOnWheelPreventChange}
                      min="2"
                    />
                  </Form.Group>
                  <Form.Group controlId="numtoend" className="my-3">
                    <Form.Label className="fw-bold">
                      Minimum Number of Years after Last Joinpoint (Excluding Joinpoint)
                    </Form.Label>
                    <Form.Control
                      {...register("numtoend", {
                        valueAsNumber: true,
                        validate: (value) => !isNaN(value) || "Value must be a valid number",
                      })}
                      type="number"
                      min="2"
                      onWheel={numberInputOnWheelPreventChange}
                    />
                  </Form.Group>
                  <Form.Group controlId="projectedYears" className="my-3">
                    <Form.Label className="fw-bold">Number of Calendar Years of Projected Survival</Form.Label>
                    <Form.Control
                      {...register("projectedYears", {
                        valueAsNumber: true,
                        validate: (value) => !isNaN(value) || "Value must be a valid number",
                      })}
                      type="number"
                      min="0"
                      onWheel={numberInputOnWheelPreventChange}
                    />
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
                  required: notificationRequired,
                })}
              />
              <div>
                <Form.Text className="text-danger">{errors?.sendNotification ? "Required" : ""}</Form.Text>
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
                    {...register("jobName", { required: sendNotification, disabled: !sendNotification })}
                    name="jobName"
                    required={sendNotification}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="email">
                  <Form.Label className={sendNotification && "required"}>Email</Form.Label>
                  <Form.Control
                    {...register("email", { required: sendNotification, disabled: !sendNotification })}
                    name="email"
                    type="email"
                    required={sendNotification}
                  />
                </Form.Group>
              </div>
            )}
          </fieldset>
        </>
      )}

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      <div className="text-end">
        <Button type="reset" variant="outline-danger" className="me-1">
          Reset
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={inputType === "zip" ? !inputFile.length : !Object.keys(seerData).length || isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Loading
            </>
          ) : (
            "Submit"
          )}
        </Button>
      </div>
    </Form>
  );
}
