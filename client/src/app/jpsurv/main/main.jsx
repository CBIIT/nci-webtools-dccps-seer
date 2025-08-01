"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import ModelTable from "./model-table";
import SurvivalVsYear from "./tab-surv/surv-year";
import DeathVsYear from "./tab-death/death-year";
import SurvivalVsTime from "./tab-time/surv-time";
import { CohortSelect } from "./cohort-select";
import { useStore } from "../store";
import { fetchStatus, fetchResults, fetchAll } from "@/services/queries";
import ModelEstimates from "./tab-model-estimates/model-estimates";
import ConditionalRecalcForm from "./conditional-form";
import { downloadAll } from "@/services/xlsx";
import Description from "./description";
import Status from "./status";
import { scaleData, changePrecision } from "@/services/seer-results-transform";

export default function AnalysisMain({ id }) {
  const setState = useStore((state) => state.setState);
  const seerData = useStore((state) => state.seerData);
  const params = useStore((state) => state.params);
  const main = useStore((state) => state.main);
  const { cohortIndex, cutpointIndex, fitIndex, cluster, precision } = main;
  const useConditional = useStore((state) => state.useConditional);
  const conditional = useStore((state) => state.conditional);
  const useRelaxModel = params.useRelaxModel;
  const resultsFile = `${cluster === "cond" ? "cond-" : ""}${
    useRelaxModel ? `${cohortIndex}-${cutpointIndex}` : cohortIndex
  }`;
  const modelEstimatesFile = `${cluster === "cond" ? "cond-" : ""}${cohortIndex}-${
    cutpointIndex ? `${cutpointIndex}-` : ""
  }coefficients`;

  const { data: jobStatus } = useQuery({
    queryKey: ["status", id],
    queryFn: () => fetchStatus(id),
    enabled: !!id,
    refetchInterval: (data) =>
      data?.state?.data?.status === "SUBMITTED" || data?.state?.data?.status === "IN_PROGRESS" ? 5 * 1000 : false,
  });
  const { data: manifest } = useQuery({
    queryKey: ["manifest", id],
    queryFn: () => fetchResults(id, "manifest"),
    enabled: jobStatus?.status === "COMPLETED",
  });
  const { data: results } = useSuspenseQuery({
    queryKey: ["results", id, cohortIndex, cutpointIndex, cluster],
    queryFn: () => (jobStatus?.status === "COMPLETED" && !!cohortIndex ? fetchResults(id, resultsFile) : null),
  });
  const { data: modelEstimates } = useSuspenseQuery({
    queryKey: ["results", id, modelEstimatesFile],
    queryFn: () => (jobStatus?.status === "COMPLETED" && !!cohortIndex ? fetchResults(id, modelEstimatesFile) : null),
  });

  const memoResults = useMemo(
    () =>
      results
        ? results.map((e) => ({ ...e, fullpredicted: changePrecision(scaleData(e.fullpredicted, 100), precision) }))
        : [],
    [results]
  );

  function setFitIndex(index) {
    setState({ main: { ...main, fitIndex: index } });
  }

  // periodically dispatch resize event to trigger plotly redraw
  useEffect(() => {
    setInterval(() => {
      if (window) dispatchEvent(new Event("resize"));
    }, 1000);
  }, []);
  useEffect(() => {
    // if (jobStatus && jobStatus.status === "COMPLETED") {
    if (id) {
      setState({ openSidebar: false });
    }
  }, [setState, jobStatus, id]);

  async function handleSaveResults() {
    const { modelData, coefData } = await fetchAll(id, manifest);

    downloadAll(
      modelData,
      coefData,
      seerData,
      params,
      `jpsurv_${params.files.dataFile.split(".").slice(0, -1).join(".")}`
    );
  }

  return (
    <Container>
      {!Object.keys(seerData).length > 0 ? <Description /> : <Status seerData={seerData} status={jobStatus} />}
      {params.id && manifest && (
        <div className="shadow p-3 border rounded bg-white mb-3">
          <CohortSelect params={params} manifest={manifest} data={memoResults} handleSaveResults={handleSaveResults} />
          {cohortIndex && (
            <ModelTable
              data={memoResults}
              params={params}
              manifest={manifest}
              cohortIndex={cohortIndex}
              handleRowSelect={setFitIndex}
              precision={precision}
            />
          )}
        </div>
      )}
      {results && (
        <>
          {!params.useCondModel && !params.useRelaxModel && (
            <ConditionalRecalcForm
              data={memoResults[fitIndex]}
              params={params}
              cohortIndex={cohortIndex}
              fitIndex={fitIndex}
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
                  conditional={useConditional ? conditional : null}
                  cluster={cluster}
                  precision={precision}
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
                />
              </Tab>
              <Tab eventKey="time" title={`${useConditional ? "Conditional " : ""}Survival vs. Time Since Diagnosis`}>
                <SurvivalVsTime
                  data={memoResults[fitIndex].fullpredicted}
                  seerData={seerData}
                  params={params}
                  cohortIndex={cohortIndex}
                  fitIndex={fitIndex}
                  conditional={useConditional ? conditional : null}
                  precision={precision}
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
                />
              </Tab>
            </Tabs>
          </div>
        </>
      )}
    </Container>
  );
}
