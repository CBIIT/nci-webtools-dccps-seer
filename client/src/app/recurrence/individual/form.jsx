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

export default function IndividualDataForm({ id }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const setState = useStore((state) => state.setState);
  const resetStore = useStore((state) => state.resetStore);
  const individualData = useStore((state) => state.individualData);
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
      setState({ individualData: session.individualData });
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

    setValue("individualData", null);
    setValue("workspaceFile", null);
    setState({ individualData: [] });
    setError(null);
  }, [inputType]);

  async function handleIndividualDataChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data } = await parseCsvFile(files[0]);
      setState({ individualData: data });
    } catch (err) {
      console.error(err);
      setError("Error parsing individual data files: " + err.message);
      setState({ individualData: [] });
    } finally {
      setIsLoading(false);
    }
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
    };
    submitForm.mutate({ params, data: useStore.getState().individualData });
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
    router.push("/recurrence/individual", { shallow: false });
    reset(defaultParams);
    resetStore();
    queryClient.invalidateQueries();
    setError(null);
  }

  const hasIndividualData = individualData.length > 0;
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
              <option value="data">Individual Data Files</option>
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
              <Form.Group className="mb-4" controlId="individualDataFile">
                <Form.Label className="required fw-bold">Individual Data File (.csv)</Form.Label>
                <FileInput
                  control={control}
                  name="individualDataFile"
                  accept=".csv"
                  rules={{ required: "This field is required." }}
                  onChange={handleIndividualDataChange}
                  disabled={hasIndividualData}
                />
                {errors.individualDataFile && (
                  <Form.Text className="text-danger">
                    {errors.individualDataFile.message || "This field is required."}
                  </Form.Text>
                )}
              </Form.Group>

              {!hasIndividualData && (
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

                        const individualDataFile = await fetchFile(
                          "/data/recurrence_risk_individualdata.csv",
                          "recurrence_risk_individualdata.csv"
                        );
                        setValue("individualDataFile", asFileList([individualDataFile]));
                        await handleIndividualDataChange({ target: { files: [individualDataFile] } });
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
                      href="/data/recurrence_risk_individualdata.csv"
                      download>
                      Download Example (.csv)
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </fieldset>

        {hasIndividualData && (
          <fieldset className="fieldset shadow-sm border rounded my-4 pt-4 px-3">
            <legend className="legend fw-bold">Parameters</legend>
          </fieldset>
        )}

        {hasIndividualData && (
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
                : !hasIndividualData || !!isSubmitting
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
