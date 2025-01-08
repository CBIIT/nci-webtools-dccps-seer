"use client";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { useStore, defaultForm } from "./store";
import { parseSeerStatDictionary, parseSeerStatFiles } from "@/services/file/file.service";
import { asFileList } from "@/components/file-input";
import { fetchSession, submit, importWorkspace } from "@/services/queries";

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
    name: "covariates",
  });

  const inputType = watch("inputType");
  const inputFile = watch("inputFile");
  const sendNotification = watch("sendNotification");

  const submitForm = useMutation({
    mutationFn: ({ params, data }) => submit(params.id, params, data),
  });
  const importMutation = useMutation({
    mutationFn: ({ id, fileList }) => importWorkspace(id, fileList),
  });
  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => fetchSession(id),
    retry: false,
    enabled: !!id,
  });

  const populatecovariates = useCallback(
    (cohortVariables) => {
      // add dynamic fields for cohort variables
      setValue("covariates", []);
      cohortVariables.forEach(({ label, name }) => append({ label, name, type: {} }));
    },
    [setValue, append]
  );

  const setSeerVariables = useCallback(
    (seerStatDictionary) => {
      // set seer variables for cansurv params
      setValue("time", seerStatDictionary.find((e) => e.label === "Interval")?.name);
      setValue("alive", seerStatDictionary.find((e) => e.label === "Alive at Start")?.name);
      setValue("died", seerStatDictionary.find((e) => e.label === "Died")?.name);
      setValue("lost", seerStatDictionary.find((e) => e.label === "Lost to Followup")?.name);
      setValue("exp_cum", seerStatDictionary.find((e) => e.label === "Expected Survival (Cum)")?.name);
      setValue("rel_cum", seerStatDictionary.find((e) => e.label === "Relative Survival (Cum)")?.name);
    },
    [setValue]
  );

  const handleLoadData = useCallback(
    async (inputType, inputFile) => {
      if (inputFile) {
        const files = Array.from(inputFile);
        const dictionaryFile = files.find((file) => /.dic$/i.test(file.name));
        const dataFile = files.find((file) => /(.txt|.csv|.tsv)$/i.test(file.name));

        if (inputType == "seer") {
          try {
            if (dictionaryFile && dataFile) {
              // parse SEER*Stat files to extract dictionary headers and data
              const { headers, config } = await parseSeerStatDictionary(dictionaryFile);
              const { data } = await parseSeerStatFiles(dictionaryFile, dataFile);
              // get cohort variables, located between year of diagnosis and interval variables
              const varNames = headers.map((e) => e.label);
              const pageTypeIndex = varNames.findIndex((e) => /page type/gi.test(e));
              const intervalIndex = varNames.indexOf("Interval");
              const cohortVariables =
                intervalIndex - pageTypeIndex > 1
                  ? headers.slice(pageTypeIndex + 1, intervalIndex).map((e) => ({
                      ...e,
                      factors: e.factors.map((f) => ({ ...f, label: f.label.replace(/"/gi, "").trim() })),
                    }))
                  : [];

              const seer = {
                dictionaryFile: dictionaryFile.name,
                dataFile: dataFile.name,
                seerStatDictionary: headers,
                seerStatData: data,
                cohortVariables,
                config,
              };

              setState({ seerData: seer });
            } else {
              throw new Error("Invalid SEER*STAT files selected.");
            }
          } catch (e) {
            console.log(e);
          }
        } else if (inputType == "csv") {
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
      populatecovariates(session.seerData.cohortVariables);
      setSeerVariables(session.seerData.seerStatDictionary);
      reset(session.params);
    }
  }, [session, setState, getValues, reset, populatecovariates, setSeerVariables]);
  // parse seerdata after data upload
  useEffect(() => {
    if (inputFile && !Object.keys(seerData).length) handleLoadData(inputType, inputFile);
  }, [inputType, inputFile, seerData, handleLoadData]);
  // populate form after seerdata is parsed
  useEffect(() => {
    if (Object.keys(seerData).length && fields.length == 0) {
      populatecovariates(seerData.cohortVariables);
      setSeerVariables(seerData.seerStatDictionary);
    }
  }, [seerData, fields, populatecovariates, setSeerVariables]);

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

  function handleCheck(e, key) {
    const { checked } = e.target;
    setValue(key, checked);
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
    const getVariableOptions = (covariates) => {
      let options = { cure: [], mu: [], sigma: [], continuous: [], by: [] };
      covariates.forEach((v) =>
        Object.entries(v.type).forEach(([option, bool]) => {
          if (bool) options[option].push(v.name);
        })
      );
      return options;
    };
    const variableOptions = getVariableOptions(formData.covariates);
    const params = {
      ...formData,
      ...variableOptions,
      id,
      type: "cansurv",
      files: {
        dictionaryFile: seerData?.dictionaryFile,
        dataFile: seerData.dataFile,
        headers: seerData.seerStatDictionary.map((e) => e.name),
        seerStatFile: "seerStatData.json",
      },
    };

    submitForm.mutate({ params, data: seerData });
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
    router.push("/cansurv", { shallow: false });
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
            <option value="seer">SEER*Stat Dictionary/Data Files</option>
            {/* <option value="csv">CSV File</option>
            <option value="zip">Workspace</option> */}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="inputFile">
          <Form.Label className="required fw-bold">
            {inputType === "seer"
              ? "SEER*Stat Dictionary/Data Files (.dic/.txt)"
              : inputType === "csv"
              ? "Data (.txt/.csv/.tsv)"
              : "Workspace (.zip)"}
          </Form.Label>
          <FileInput
            control={control}
            rules={{
              required: !Object.keys(seerData).length,
            }}
            name="inputFile"
            multiple={inputType === "seer"}
            accept={".dic,.csv,.tsv,.zip,.txt"}
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

      {Object.keys(seerData).length > 0 && (
        <>
          <fieldset className="fieldset shadow-sm border rounded my-4 pt-4 px-3">
            <legend className="legend fw-bold">Model Specifications</legend>
            <Form.Group className="mb-3">
              <Form.Check
                {...register(`est_cure`, {})}
                onChange={(e) => {
                  handleCheck(e, `est_cure`);
                }}
                label={"Cure in Model"}
                id={`est_cure`}
                name={`est_cure`}
                type="checkbox"
              />
            </Form.Group>
            <Form.Group className="mb-4" controlId="year">
              <Form.Label className="required fw-bold">Distribution</Form.Label>
              <Form.Select required {...register("distribution", { required: true })}>
                {[
                  { label: "Lognormal", value: "lnorm" },
                  { label: "Loglogistic", value: "llogis" },
                  { label: "Weibull", value: "weibull" },
                  { label: "Gompertz", value: "gompertz" },
                  { label: "Semi-Parametric", value: "semi-parametric" },
                ].map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <h5>Computation Specifications</h5>
            <Form.Group controlId="maxit" className="my-3">
              <Form.Label className="fw-bold">Maximum Number of Iterations</Form.Label>
              <Form.Control {...register("maxit", { valueAsNumber: true })} type="number" min="100" max="1000" />
            </Form.Group>
            <Form.Group controlId="reltol" className="my-3">
              <Form.Label className="fw-bold">Relative Convergence Tolerance</Form.Label>
              <Form.Control
                {...register("reltol", {
                  valueAsNumber: true,
                  min: { value: 1e-10, message: "Value must be at least 1e-10" },
                  max: {
                    value: 1e-4,
                    message: "Value must be at most 1e-4",
                  },
                })}
              />
              <Form.Text className="text-danger">{errors?.reltol?.message}</Form.Text>
            </Form.Group>
            <Form.Group controlId="n_restart_conv" className="my-3">
              <Form.Label className="fw-bold">Number of Restarts</Form.Label>
              <Form.Control {...register("n_restart_conv", { valueAsNumber: true })} type="number" min="0" max="100" />
            </Form.Group>
            <Form.Group controlId="seed" className="my-3">
              <Form.Label className="fw-bold">Seed</Form.Label>
              <Form.Control {...register("seed", { valueAsNumber: true })} type="number"></Form.Control>
            </Form.Group>

            <h5>Analysis Variables</h5>
            {fields.length ? (
              fields.map(({ label }, fieldIndex) => (
                <Form.Group key={label} controlId={label} className="mb-4">
                  <Form.Label className="fw-bold">{label}</Form.Label>
                  <Form.Check
                    {...register(`covariates.${fieldIndex}.type.continuous`, {})}
                    onChange={(e) => {
                      handleCheck(e, `covariates.${fieldIndex}.type.continuous`);
                    }}
                    label={"Continuous"}
                    id={`${label}.continuous`}
                    name={`${label}.continuous`}
                    type="checkbox"
                  />
                  <Form.Check
                    {...register(`covariates.${fieldIndex}.type.by`, {
                      disabled: watch(`covariates.${fieldIndex}.type.continuous`),
                    })}
                    onChange={(e) => {
                      handleCheck(e, `covariates.${fieldIndex}.type.by`);
                    }}
                    label={"Stratum"}
                    id={`${label}.by`}
                    name={`${label}.by`}
                    type="checkbox"
                  />
                  <Form.Check
                    {...register(`covariates.${fieldIndex}.type.mu`, {
                      disabled: watch(`covariates.${fieldIndex}.type.by`),
                    })}
                    onChange={(e) => {
                      handleCheck(e, `covariates.${fieldIndex}.type.mu`);
                    }}
                    label={"Mu"}
                    id={`${label}.mu`}
                    name={`${label}.mu`}
                    type="checkbox"
                  />
                  <Form.Check
                    {...register(`covariates.${fieldIndex}.type.sigma`, {
                      disabled: watch(`covariates.${fieldIndex}.type.by`),
                    })}
                    onChange={(e) => {
                      handleCheck(e, `covariates.${fieldIndex}.type.sigma`);
                    }}
                    label={"Sigma"}
                    id={`${label}.sigma`}
                    name={`${label}.sigma`}
                    type="checkbox"
                  />
                  <Form.Check
                    {...register(`covariates.${fieldIndex}.type.cure`, {
                      disabled: watch(`covariates.${fieldIndex}.type.by`),
                    })}
                    onChange={(e) => {
                      handleCheck(e, `covariates.${fieldIndex}.type.cure`);
                    }}
                    label={"Cure"}
                    id={`${label}.cure`}
                    name={`${label}.cure`}
                    type="checkbox"
                  />
                </Form.Group>
              ))
            ) : (
              <p className="text-info">No covariates in data</p>
            )}
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
                  onChange: handleChange,
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
        <Button
          type="submit"
          variant="primary"
          disabled={inputType === "zip" ? !inputFile.length : !Object.keys(seerData).length}>
          Submit
        </Button>
      </div>
    </Form>
  );
}
