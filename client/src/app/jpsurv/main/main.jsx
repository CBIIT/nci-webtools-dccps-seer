"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect, useMemo } from "react";
import { useQuery, skipToken } from "@tanstack/react-query";
import ModelTable from "./model-table";
import SurvivalVsYear from "./tab-surv/surv-year";
import DeathVsYear from "./tab-death/death-year";
import SurvivalVsTime from "./tab-time/surv-time";
import { CohortSelect, resolveSelection } from "./cohort-select";
import { useStore, defaultMain } from "../store";
import { fetchStatus, fetchResults, fetchAll } from "@/services/queries";
import ModelEstimates from "./tab-model-estimates/model-estimates";
import ConditionalRecalcForm from "./conditional-form";
import { downloadAll } from "@/services/xlsx";
import Description from "./description";
import Status from "./status";
import Loading from "@/components/loading";
import { scaleData, changePrecision } from "@/services/seer-results-transform";

export default function AnalysisMain({ id }) {
  const setState = useStore((state) => state.setState);
  const setMain = useStore((state) => state.setMain);
  const seerData = useStore((state) => state.seerData);
  const params = useStore((state) => state.params);
  const storedMain = useStore((state) => state.main);
  const useConditional = useStore((state) => state.useConditional);
  const conditional = useStore((state) => state.conditional);
  const useRelaxModel = params.useRelaxModel;

  const { data: jobStatus } = useQuery({
    queryKey: ["status", id],
    queryFn: () => fetchStatus(id),
    enabled: !!id,
    refetchInterval: (data) =>
      data?.state?.data?.status === "SUBMITTED" || data?.state?.data?.status === "IN_PROGRESS" ? 5 * 1000 : false,
  });
  const isCompleted = jobStatus?.status === "COMPLETED";
  const { data: manifest } = useQuery({
    queryKey: ["manifest", id],
    queryFn: isCompleted ? () => fetchResults(id, "manifest") : skipToken,
    staleTime: Infinity,
  });

  const selection = resolveSelection(storedMain.id === id ? storedMain : defaultMain, manifest, useRelaxModel);
  const { cohortIndex, cutpointIndex, cluster, precision } = selection;
  const setSelection = (update) => setMain(id, update);
  const resultsFile = `${cluster === "cond" ? "cond-" : ""}${
    useRelaxModel ? `${cohortIndex}-${cutpointIndex}` : cohortIndex
  }`;
  const modelEstimatesFile = `${cluster === "cond" ? "cond-" : ""}${cohortIndex}-${
    cutpointIndex ? `${cutpointIndex}-` : ""
  }coefficients`;
  const canFetchResults = isCompleted && !!cohortIndex;

  const { data: results, isLoading: isLoadingResults } = useQuery({
    queryKey: ["results", id, resultsFile],
    queryFn: canFetchResults ? () => fetchResults(id, resultsFile) : skipToken,
    staleTime: Infinity,
  });
  const { data: modelEstimates } = useQuery({
    queryKey: ["results", id, modelEstimatesFile],
    queryFn: canFetchResults ? () => fetchResults(id, modelEstimatesFile) : skipToken,
    staleTime: Infinity,
  });

  const memoResults = useMemo(
    () =>
      results
        ? results.map((e) => ({ ...e, fullpredicted: changePrecision(scaleData(e.fullpredicted, 100), precision) }))
        : [],
    [results, precision]
  );
  // a stored fit may not exist in another cohort's results
  const fitIndex = memoResults[selection.fitIndex] ? selection.fitIndex : 0;
  const resolvedSelection = { ...selection, fitIndex };

  function setFitIndex(index) {
    setSelection({ fitIndex: index });
  }

  useEffect(() => {
    // if (jobStatus && jobStatus.status === "COMPLETED") {
    if (id) {
      setState({ openSidebar: false });
    }
  }, [setState, jobStatus, id]);

  async function handleSaveResults() {
    const { modelData, coefData } = await fetchAll(id, manifest);
    const filename = params.files.dataFile;

    downloadAll(
      modelData,
      coefData,
      seerData,
      params,
      `jpsurv_${filename.split(".").slice(0, -1).join(".")}`,
      manifest
    );
  }

  return (
    <Container>
      <Status status={jobStatus} />
      {!jobStatus && <Description />}
      {params.id && manifest && (
        <div className="shadow p-3 border rounded bg-white mb-3">
          <CohortSelect
            id={id}
            params={params}
            manifest={manifest}
            selection={resolvedSelection}
            setSelection={setSelection}
            handleSaveResults={handleSaveResults}
          />
          {cohortIndex && (
            <ModelTable
              data={memoResults}
              params={params}
              manifest={manifest}
              cohortIndex={cohortIndex}
              fitIndex={fitIndex}
              handleRowSelect={setFitIndex}
              precision={precision}
            />
          )}
        </div>
      )}
      {isLoadingResults && <Loading />}
      {results && (
        <>
          {!params.useCondModel && !params.useRelaxModel && (
            <ConditionalRecalcForm
              data={memoResults[fitIndex]}
              params={params}
              cohortIndex={cohortIndex}
              fitIndex={fitIndex}
              precision={precision}
              className="shadow"
            />
          )}
          <div className="shadow border rounded bg-white my-3">
            <Tabs defaultActiveKey="survival">
              <Tab eventKey="survival" title={`${useConditional ? "Conditional " : ""}Survival vs. Year at Diagnosis`}>
                <SurvivalVsYear
                  data={memoResults[fitIndex]}
                  seerData={seerData}
                  params={params}
                  cohortIndex={cohortIndex}
                  fitIndex={fitIndex}
                  cutpointIndex={cutpointIndex}
                  conditional={useConditional ? conditional : null}
                  cluster={cluster}
                  precision={precision}
                  selection={resolvedSelection}
                />
              </Tab>
              <Tab eventKey="death" title="Death vs. Year at Diagnosis" disabled={useConditional}>
                <DeathVsYear
                  data={memoResults[fitIndex]}
                  seerData={seerData}
                  params={params}
                  cohortIndex={cohortIndex}
                  fitIndex={fitIndex}
                  conditional={useConditional ? conditional : null}
                  precision={precision}
                  selection={resolvedSelection}
                />
              </Tab>
              <Tab eventKey="time" title={`${useConditional ? "Conditional " : ""}Survival vs. Time Since Diagnosis`}>
                <SurvivalVsTime
                  data={memoResults[fitIndex].fullpredicted}
                  jp={memoResults[fitIndex].jp}
                  seerData={seerData}
                  params={params}
                  cohortIndex={cohortIndex}
                  fitIndex={fitIndex}
                  conditional={useConditional ? conditional : null}
                  precision={precision}
                  selection={resolvedSelection}
                />
              </Tab>
              <Tab eventKey="estimates" title="Model Estimates">
                <ModelEstimates
                  data={modelEstimates}
                  results={memoResults[fitIndex]}
                  params={params}
                  cohortIndex={cohortIndex}
                  fitIndex={fitIndex}
                  precision={precision}
                  selection={resolvedSelection}
                />
              </Tab>
            </Tabs>
          </div>
        </>
      )}
    </Container>
  );
}
