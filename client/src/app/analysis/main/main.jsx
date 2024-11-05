"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import ModelTable from "./model-table";
import SurvivalVsYear from "./tab-surv/surv-year";
import DeathVsYear from "./tab-death/death-year";
import SurvivalVsTime from "./tab-time/surv-time";
import CohortSelect from "./cohort-select";
import { useStore } from "../store";
import { fetchStatus, fetchResults, fetchAll } from "../queries";
import ModelEstimates from "./tab-model-estimates/model-estimates";
import ConditionalRecalcForm from "./conditional-form";
import { downloadAll } from "@/services/xlsx";
import Instructions from "./instructions";
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
      data?.state?.data === "SUBMITTED" || data?.state?.data === "IN_PROGRESS" ? 5 * 1000 : false,
  });
  const { data: manifest } = useQuery({
    queryKey: ["manifest", id],
    queryFn: () => fetchResults(id, "manifest"),
    enabled: jobStatus === "COMPLETED",
  });
  const { data: results } = useQuery({
    queryKey: ["results", id, cohortIndex, cutpointIndex, cluster],
    queryFn: () => fetchResults(id, resultsFile),
    enabled: jobStatus === "COMPLETED" && !!cohortIndex,
  });
  const { data: modelEstimates } = useQuery({
    queryKey: ["results", id, modelEstimatesFile],
    queryFn: () => fetchResults(id, modelEstimatesFile),
    enabled: jobStatus === "COMPLETED" && !!cohortIndex,
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
      <code>{JSON.stringify(jobStatus)}</code>
      {params.id && manifest && (
        <CohortSelect
          className="mb-3"
          params={params}
          manifest={manifest}
          data={memoResults}
          handleSaveResults={handleSaveResults}
        />
      )}
      {results && seerData && seerData && params && manifest ? (
        <>
          <ModelTable
            data={memoResults}
            params={params}
            manifest={manifest}
            cohortIndex={cohortIndex}
            handleRowSelect={setFitIndex}
          />
          {!params.useCondModel && !params.useRelaxModel && (
            <ConditionalRecalcForm
              data={memoResults[fitIndex]}
              params={params}
              cohortIndex={cohortIndex}
              fitIndex={fitIndex}
            />
          )}
          <Tabs defaultActiveKey="survival" className="my-3">
            <Tab eventKey="survival" title={`${useConditional ? "Conditional " : ""}Survival vs. Year at Diagnosis`}>
              <SurvivalVsYear
                data={memoResults[fitIndex]}
                seerData={seerData}
                params={params}
                cohortIndex={cohortIndex}
                fitIndex={fitIndex}
                conditional={useConditional ? conditional : null}
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
              />
            </Tab>
            <Tab eventKey="estimates" title="Model Estimates">
              <ModelEstimates data={modelEstimates} params={params} cohortIndex={cohortIndex} fitIndex={fitIndex} />
            </Tab>
          </Tabs>
        </>
      ) : (
        <Instructions />
      )}
    </Container>
  );
}
