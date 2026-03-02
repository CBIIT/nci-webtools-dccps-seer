"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import { parseSeerStatDictionary, parseSeerStatFiles, parseCsvFile, parseJsonFile } from "@/services/file/file.service";
import LoadingOverlay from "@/components/loading-overlay";
import { useStore, defaultParams } from "./store";

const FileInput = dynamic(() => import("@/components/file-input"), { ssr: false });

export default function GroupDataForm({ onSubmit: onFormSubmit }) {
  const setState = useStore((state) => state.setState);
  const resetStore = useStore((state) => state.resetStore);
  const seerStatDictionary = useStore((state) => state.seerStatDictionary);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const isFirstRender = useRef(true);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: defaultParams });

  const inputFileType = watch("inputFileType");
  const stageVariable = watch("stageVariable");
  const selectedHeader = seerStatDictionary.find((h) => h.name === stageVariable);

  // Clear all file inputs and parsed data when file type changes (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setValue("workspaceDataFile", null);
    setValue("seerStatDataFiles", null);
    setValue("canSurvDataFile", null);
    setValue("stageVariable", "");
    setValue("distantStageValue", "");
    setState({ seerStatDictionary: [], seerStatData: [], canSurvData: [] });
    setError(null);
  }, [inputFileType]);

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

      setState({ seerStatDictionary: headers, seerStatData: data });
      setValue("followUpYears", followUpYears);
      setValue("stageVariable", "");
      setValue("distantStageValue", "");
    } catch (err) {
      console.error(err);
      setError("Error parsing SEER*Stat files: " + err.message);
      setState({ seerStatDictionary: [], seerStatData: [] });
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
      setState({ canSurvData: data });
    } catch (err) {
      console.error(err);
      setError("Error parsing CanSurv file: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleWorkspaceDataFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    try {
      const workspace = await parseJsonFile(file);
      const { parameters } = workspace;
      setState({
        seerStatDictionary: parameters.seerStatDictionary,
        seerStatData: parameters.seerStatData,
        canSurvData: parameters.canSurvData,
      });
      reset({
        inputFileType: "workspaceFile",
        stageVariable: parameters.stageVariable,
        distantStageValue: String(parameters.distantStageValue),
        adjustmentFactorR: parameters.adjustmentFactorR,
        followUpYears: parameters.followUpYears,
      });
    } catch (err) {
      console.error(err);
      setError("Error loading workspace: " + err.message);
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

  function onSubmit(formData) {
    const store = useStore.getState();
    const params = {
      seerStatData: store.seerStatData,
      seerStatDataFileNames: Array.from(formData.seerStatDataFiles || []).map((f) => f.name),
      canSurvData: store.canSurvData,
      canSurvDataFileName: Array.from(formData.canSurvDataFile || [])[0]?.name ?? "",
      seerStatDictionary: store.seerStatDictionary,
      stageVariable: formData.stageVariable,
      distantStageValue: Number(formData.distantStageValue),
      adjustmentFactorR: Number(formData.adjustmentFactorR),
      followUpYears: Number(formData.followUpYears),
    };
    if (onFormSubmit) onFormSubmit(params);
  }

  function onReset(e) {
    e.preventDefault();
    reset(defaultParams);
    resetStore();
    setError(null);
  }

  return (
    <div style={{ position: "relative" }}>
      <LoadingOverlay isVisible={isLoading} message="Loading data..." />
      <Form onSubmit={handleSubmit(onSubmit)} onReset={onReset} noValidate>
        <fieldset className="fieldset shadow-sm border rounded my-4 pt-4 px-3">
          <legend className="legend fw-bold">Input</legend>

          <Form.Group className="mb-4">
            <Form.Label className="required fw-bold">Input File Type</Form.Label>
            <div>
              <Form.Check
                {...register("inputFileType", { required: true })}
                type="radio"
                id="inputFileType-seer"
                label="SEER*Stat/CanSurv Files"
                value="seerStatAndCanSurvFiles"
              />
              <Form.Check
                {...register("inputFileType", { required: true })}
                type="radio"
                id="inputFileType-workspace"
                label="Workspace File"
                value="workspaceFile"
              />
            </div>
            {errors.inputFileType && <Form.Text className="text-danger">This field is required.</Form.Text>}
          </Form.Group>

          {inputFileType === "workspaceFile" && (
            <Form.Group className="mb-4" controlId="workspaceDataFile">
              <Form.Label className="required fw-bold">Workspace File (.group_data_workspace)</Form.Label>
              <FileInput
                control={control}
                name="workspaceDataFile"
                accept=".group_data_workspace"
                rules={{ required: "This field is required." }}
                onChange={handleWorkspaceDataFileChange}
              />
              {errors.workspaceDataFile && (
                <Form.Text className="text-danger">{errors.workspaceDataFile.message}</Form.Text>
              )}
            </Form.Group>
          )}

          {inputFileType === "seerStatAndCanSurvFiles" && (
            <>
              <Form.Group className="mb-4" controlId="seerStatDataFiles">
                <Form.Label className="required fw-bold">
                  SEER*Stat Dictionary/Data Files (.dic/.txt)
                </Form.Label>
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
                />
                {errors.canSurvDataFile && (
                  <Form.Text className="text-danger">{errors.canSurvDataFile.message}</Form.Text>
                )}
              </Form.Group>
            </>
          )}
        </fieldset>

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
              {seerStatDictionary
                .filter((h) => h.factors?.length > 0)
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
            <Form.Control.Feedback type="invalid">
              {errors.adjustmentFactorR?.message}
            </Form.Control.Feedback>
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

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <div className="text-end">
          <Button type="reset" variant="outline-danger" className="me-1">
            Reset
          </Button>
          <Button type="submit" variant="primary">
            Submit
          </Button>
        </div>
      </Form>
    </div>
  );
}
