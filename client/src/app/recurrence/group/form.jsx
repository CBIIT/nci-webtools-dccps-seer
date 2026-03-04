"use client";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import { useQuery, useMutation, useQueryClient, useIsMutating } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { parseSeerStatDictionary, parseSeerStatFiles, parseCsvFile } from "@/services/file/file.service";
import { asFileList } from "@/components/file-input";
import { fetchSession, submit, importWorkspace } from "@/services/queries";
import LoadingOverlay from "@/components/loading-overlay";
import { useStore, defaultParams } from "./store";

const FileInput = dynamic(() => import("@/components/file-input"), { ssr: false });

export default function GroupDataForm({ id }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const setState = useStore((state) => state.setState);
  const resetStore = useStore((state) => state.resetStore);
  const seerData = useStore((state) => state.seerData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const isFirstRender = useRef(true);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: useStore.getState().params });

  const inputType = watch("inputType");
  const workspaceFile = watch("workspaceFile");
  const sendNotification = watch("sendNotification");
  const stageVariable = watch("stageVariable");
  const selectedHeader = seerData.seerStatDictionary?.find((h) => h.name === stageVariable);

  const isMutatingSubmit = useIsMutating({ mutationKey: ["submitRecurrence"] });
  const isMutatingImport = useIsMutating({ mutationKey: ["importRecurrence"] });
  const isSubmitting = isMutatingSubmit || isMutatingImport;

  const submitForm = useMutation({
    mutationKey: ["submitRecurrence"],
    mutationFn: ({ params, data }) => submit(params.id, params, data),
    onSettled: (_, err) => {
      if (err) setError(err?.response?.data?.error ?? err.message);
      else setError(null);
    },
  });

  const importMutation = useMutation({
    mutationKey: ["importRecurrence"],
    mutationFn: ({ id, fileList }) => importWorkspace(id, fileList),
    onSettled: (_, err) => {
      if (err) setError(err?.response?.data?.error ?? err.message);
      else setError(null);
    },
  });

  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: () => fetchSession(id),
    retry: false,
    enabled: !!id,
  });

  // Session rehydration
  useEffect(() => {
    if (session && !getValues("id")) {
      setState({ seerData: session.seerData });
      reset({ ...session.params });
    }
  }, [session]);

  // Watch sync to store
  useEffect(() => {
    const { unsubscribe } = watch((values) => setState({ params: values }));
    return () => unsubscribe();
  }, [watch, setState]);

  // Clear file inputs and parsed data when inputType changes (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setValue("seerStatDataFiles", null);
    setValue("canSurvDataFile", null);
    setValue("workspaceFile", null);
    setValue("stageVariable", "");
    setValue("distantStageValue", "");
    setState({ seerData: {} });
    setError(null);
  }, [inputType]);

  // Reset distantStageValue when stageVariable changes
  useEffect(() => {
    setValue("distantStageValue", "");
  }, [stageVariable]);

  async function handleSeerStatDataFilesChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const dictionaryFile = files.find((f) => /.dic$/i.test(f.name));
    const dataFile = files.find((f) => /.txt$/i.test(f.name));
    if (!dictionaryFile || !dataFile) return;

    setIsLoading(true);
    setError(null);
    try {
      const { headers, config } = await parseSeerStatDictionary(dictionaryFile);
      const { data } = await parseSeerStatFiles(dictionaryFile, dataFile);
      const followUpYears = Math.min(25, getMaxFollowUpYears(config));

      setState({
        seerData: {
          ...useStore.getState().seerData,
          seerStatDictionary: headers,
          seerStatData: data,
          seerStatDataFileNames: [dictionaryFile.name, dataFile.name],
        },
      });
      setValue("followUpYears", followUpYears);
      setValue("stageVariable", "");
      setValue("distantStageValue", "");
    } catch (err) {
      console.error(err);
      setError("Error parsing SEER*Stat files: " + err.message);
      setState({ seerData: {} });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCanSurvDataFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data } = await parseCsvFile(file);
      setState({
        seerData: {
          ...useStore.getState().seerData,
          canSurvData: data,
          canSurvDataFileName: file.name,
        },
      });
    } catch (err) {
      console.error(err);
      setError("Error parsing CanSurv file: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function getMaxFollowUpYears(config) {
    const sessionOptions = config["Session Options"];
    const numberOfIntervals = +sessionOptions?.NumberOfIntervals || 30;
    const monthsPerInterval = +sessionOptions?.MonthsPerInterval || 12;
    return Math.ceil((monthsPerInterval * numberOfIntervals) / 12);
  }

  async function onSubmit(formData) {
    if (inputType === "data") {
      await submitCalculation(formData);
    } else if (inputType === "zip") {
      await loadWorkspace(formData);
    }
  }

  async function submitCalculation(formData) {
    const newId = uuidv4();
    const params = {
      ...formData,
      id: newId,
      distantStageValue: Number(formData.distantStageValue),
      adjustmentFactorR: Number(formData.adjustmentFactorR),
      followUpYears: Number(formData.followUpYears),
    };
    submitForm.mutate({ params, data: seerData });
    reset(params);
    setState({ params });
    router.push(`${pathname}?id=${newId}`, { shallow: true });
  }

  async function loadWorkspace(formData) {
    const newId = uuidv4();
    const workspaceFiles = Array.from(formData.workspaceFile || []);
    if (!workspaceFiles.length) return;
    const fileList = asFileList(workspaceFiles[0]);
    const { data: workspaceId } = await importMutation.mutateAsync({ id: newId, fileList });
    router.push(`${pathname}?id=${workspaceId}`, { shallow: true });
  }

  function onReset(e) {
    e.preventDefault();
    router.push("/recurrence/group", { shallow: false });
    reset(defaultParams);
    resetStore();
    queryClient.invalidateQueries();
    setError(null);
  }

  const hasSeerData = Object.keys(seerData).length > 0;
  console.log(seerData);
  return (
    <div style={{ position: "relative" }}>
      <LoadingOverlay isVisible={isLoading} message="Loading data..." />
      <Form onSubmit={handleSubmit(onSubmit)} onReset={onReset} noValidate>
        <fieldset className="fieldset shadow-sm border rounded my-4 pt-4 px-3">
          <legend className="legend fw-bold">Data</legend>

          <Form.Group className="mb-4" controlId="inputType">
            <Form.Label className="required fw-bold">Input Type</Form.Label>
            <Form.Select
              {...register("inputType", { required: true })}
              onChange={(e) => {
                reset({ ...defaultParams, inputType: e.target.value });
                resetStore();
              }}
              disabled={!!id}>
              <option value="data">SEER*Stat/CanSurv Files</option>
              <option value="zip">Workspace (.zip)</option>
            </Form.Select>
          </Form.Group>

          {inputType === "zip" && (
            <Form.Group className="mb-4" controlId="workspaceFile">
              <Form.Label className="required fw-bold">Workspace File (.zip)</Form.Label>
              <FileInput
                control={control}
                name="workspaceFile"
                accept=".zip"
                rules={{ required: "This field is required." }}
              />
              {errors.workspaceFile && <Form.Text className="text-danger">{errors.workspaceFile.message}</Form.Text>}
            </Form.Group>
          )}

          {inputType === "data" && (
            <>
              <Form.Group className="mb-4" controlId="seerStatDataFiles">
                <Form.Label className="required fw-bold">SEER*Stat Dictionary/Data Files (.dic/.txt)</Form.Label>
                <FileInput
                  control={control}
                  name="seerStatDataFiles"
                  accept=".dic,.txt"
                  multiple
                  rules={{
                    required: "This field is required.",
                    validate: (files) => {
                      const arr = Array.from(files || []);
                      return (
                        (arr.some((f) => /.dic$/i.test(f.name)) && arr.some((f) => /.txt$/i.test(f.name))) ||
                        "SEER*Stat .dic and .txt files are required."
                      );
                    },
                  }}
                  onChange={handleSeerStatDataFilesChange}
                  disabled={hasSeerData}
                />
                {errors.seerStatDataFiles && (
                  <Form.Text className="text-danger">
                    {errors.seerStatDataFiles.message || "This field is required."}
                  </Form.Text>
                )}
              </Form.Group>

              <Form.Group className="mb-4" controlId="canSurvDataFile">
                <Form.Label className="required fw-bold">CanSurv Data File (.csv)</Form.Label>
                <FileInput
                  control={control}
                  name="canSurvDataFile"
                  accept=".csv"
                  rules={{ required: "This field is required." }}
                  onChange={handleCanSurvDataFileChange}
                  disabled={hasSeerData}
                />
                {errors.canSurvDataFile && (
                  <Form.Text className="text-danger">{errors.canSurvDataFile.message}</Form.Text>
                )}
              </Form.Group>

              {hasSeerData && seerData.seerStatDataFileNames && (
                <div className="mb-3">
                  <small className="text-muted">
                    <b>SEER*Stat:</b> {seerData.seerStatDataFileNames.join(", ")}
                  </small>
                  {seerData.canSurvDataFileName && (
                    <div>
                      <small className="text-muted">
                        <b>CanSurv:</b> {seerData.canSurvDataFileName}
                      </small>
                    </div>
                  )}
                </div>
              )}

              {!hasSeerData && (
                <div className="mb-3">
                  <Button
                    className="p-0"
                    variant="link"
                    size="sm"
                    onClick={async () => {
                      try {
                        const fetchFile = async (url, fileName) => {
                          const response = await fetch(url);
                          if (!response.ok) throw new Error(`Failed to fetch ${fileName}`);
                          const blob = await response.blob();
                          return new File([blob], fileName, { type: blob.type });
                        };
                        const dicFile = await fetchFile(
                          "/data/recurrence_risk_groupdata/groupdata_example_seer.dic",
                          "groupdata_example_seer.dic"
                        );
                        const txtFile = await fetchFile(
                          "/data/recurrence_risk_groupdata/groupdata_example_seer.txt",
                          "groupdata_example_seer.txt"
                        );
                        const cansurvFile = await fetchFile(
                          "/data/recurrence_risk_groupdata/groupdata_example_cansurv.csv",
                          "groupdata_example_cansurv.csv"
                        );
                        setValue("seerStatDataFiles", asFileList([dicFile, txtFile]));
                        setValue("canSurvDataFile", asFileList([cansurvFile]));
                        await handleSeerStatDataFilesChange({ target: { files: [dicFile, txtFile] } });
                        await handleCanSurvDataFileChange({ target: { files: [cansurvFile] } });
                      } catch (err) {
                        console.error("Error loading example files:", err);
                      }
                    }}>
                    Load Example
                  </Button>
                  <div>
                    <Button
                      className="p-0"
                      variant="link"
                      size="sm"
                      href="/data/recurrence_risk_groupdata/recurrence_risk_groupdata.zip"
                      download>
                      Download Example (.zip)
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </fieldset>

        {hasSeerData && (
          <fieldset className="fieldset shadow-sm border rounded my-4 pt-4 px-3">
            <legend className="legend fw-bold">Parameters</legend>

            <Form.Group className="mb-4" controlId="stageVariable">
              <Form.Label className="required fw-bold">Stage Variable</Form.Label>
              <Form.Select
                {...register("stageVariable", { required: "This field is required." })}
                isInvalid={!!errors.stageVariable}>
                <option value="" hidden>
                  No stage variable selected
                </option>
                {seerData.seerStatDictionary
                  ?.filter((h) => h.factors?.length > 0)
                  .map((h) => (
                    <option key={h.name} value={h.name}>
                      {h.name}
                    </option>
                  ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{errors.stageVariable?.message}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-4" controlId="distantStageValue">
              <Form.Label className="required fw-bold">Distant Stage Value</Form.Label>
              <Form.Select
                {...register("distantStageValue", { required: "This field is required." })}
                isInvalid={!!errors.distantStageValue}>
                {!stageVariable && (
                  <option value="" hidden>
                    No distant stage value selected
                  </option>
                )}
                {selectedHeader?.factors?.map((factor) => (
                  <option key={factor.value} value={factor.value}>
                    {factor.value} - {factor.label}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{errors.distantStageValue?.message}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-4" controlId="adjustmentFactorR">
              <Form.Label className="required fw-bold">Adjustment Factor r</Form.Label>
              <Form.Control
                {...register("adjustmentFactorR", {
                  required: "This field is required.",
                  valueAsNumber: true,
                  min: { value: 0.5, message: "Please enter a value equal to or greater than 0.5." },
                  max: { value: 2, message: "Please enter a value equal to or less than 2." },
                })}
                type="number"
                step="0.1"
                min="0.5"
                max="2"
                isInvalid={!!errors.adjustmentFactorR}
              />
              <Form.Control.Feedback type="invalid">{errors.adjustmentFactorR?.message}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-4" controlId="followUpYears">
              <Form.Label className="required fw-bold">Years of Follow-up</Form.Label>
              <Form.Control
                {...register("followUpYears", {
                  required: "This field is required.",
                  valueAsNumber: true,
                  min: { value: 1, message: "Please enter a value equal to or greater than 1." },
                })}
                type="number"
                min="1"
                isInvalid={!!errors.followUpYears}
              />
              <Form.Control.Feedback type="invalid">{errors.followUpYears?.message}</Form.Control.Feedback>
            </Form.Group>
          </fieldset>
        )}

        {hasSeerData && (
          <fieldset className="fieldset shadow-sm border rounded my-4 pt-4 px-3">
            <legend className="legend fw-bold">Notifications</legend>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Long-running Job"
                id="sendNotification"
                {...register("sendNotification")}
              />
              <Form.Text className="text-muted fst-italic">
                When submitting a long-running job, select this option to receive a notification via email upon
                completion.
              </Form.Text>
            </Form.Group>
            {sendNotification && (
              <>
                <Form.Group className="mb-3" controlId="jobName">
                  <Form.Label className="required">Job Name</Form.Label>
                  <Form.Control {...register("jobName", { required: sendNotification })} />
                  {errors.jobName && <Form.Text className="text-danger">This field is required.</Form.Text>}
                </Form.Group>
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label className="required">Email</Form.Label>
                  <Form.Control {...register("email", { required: sendNotification })} type="email" />
                  {errors.email && <Form.Text className="text-danger">This field is required.</Form.Text>}
                </Form.Group>
              </>
            )}
          </fieldset>
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
            disabled={
              inputType === "zip"
                ? !Array.from(workspaceFile || []).length || !!isSubmitting
                : !hasSeerData || !!isSubmitting
            }>
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
    </div>
  );
}
