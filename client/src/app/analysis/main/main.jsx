"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import ModelTable from "./model-table";
import SurvivalVsYear from "./tab-surv/surv-year";
import DeathVsYear from "./tab-death/death-year";
import SurvivalVsTime from "./tab-time/surv-time";
import CohortSelect from "./cohort-select";
import { useStore } from "../store";
import { fetchStatus, fetchResults } from "../queries";
import ModelEstimates from "./tab-model-estimates/model-estimates";
import ConditionalRecalcForm from "./conditional-form";

export default function AnalysisMain({ id }) {
  const setState = useStore((state) => state.setState);
  const seerData = useStore((state) => state.seerData);
  const params = useStore((state) => state.params);
  const { cohortIndex, fitIndex } = useStore((state) => state.main);
  const useConditional = useStore((state) => state.useConditional);
  const conditional = useStore((state) => state.conditional);

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
    queryKey: ["results", id, cohortIndex],
    queryFn: () => fetchResults(id, cohortIndex),
    enabled: jobStatus === "COMPLETED" && !!cohortIndex,
  });

  function setFitIndex(index) {
    setState({ main: { cohortIndex, fitIndex: index } });
  }

  // periodically dispatch resize event to trigger plotly redraw
  useEffect(() => {
    setInterval(() => {
      if (window) dispatchEvent(new Event("resize"));
    }, 1000);
  }, []);

  return (
    <Container>
      <code>{JSON.stringify(jobStatus)}</code>
      {params.id && manifest && <CohortSelect className="mb-3" params={params} manifest={manifest} />}
      {results && seerData && Object.keys(seerData).length > 0 && Object.keys(params).length > 0 && (
        <>
          <ModelTable data={results} handleRowSelect={setFitIndex} />
          {!params.useCondModel && !params.useRelaxModel && (
            <ConditionalRecalcForm
              data={results[fitIndex]}
              seerData={seerData}
              params={params}
              cohortIndex={cohortIndex}
              fitIndex={fitIndex}
            />
          )}
          <Tabs defaultActiveKey="survival" className="my-3">
            <Tab eventKey="survival" title="Survival vs. Year at Diagnosis">
              <SurvivalVsYear
                data={results[fitIndex]}
                seerData={seerData}
                params={params}
                cohortIndex={cohortIndex}
                fitIndex={fitIndex}
                conditional={useConditional ? conditional : null}
              />
            </Tab>
            <Tab eventKey="death" title="Death vs. Year at Diagnosis" disabled={useConditional}>
              <DeathVsYear
                data={results[fitIndex]}
                seerData={seerData}
                params={params}
                conditional={useConditional ? conditional : null}
              />
            </Tab>
            <Tab eventKey="time" title="Survival vs. Time Since Diagnosis">
              <SurvivalVsTime
                data={results[fitIndex].fullpredicted}
                seerData={seerData}
                params={params}
                conditional={useConditional ? conditional : null}
              />
            </Tab>
            <Tab eventKey="estimates" title="Model Estimates">
              <ModelEstimates id={id} cohortIndex={cohortIndex} fitIndex={fitIndex} />
            </Tab>
          </Tabs>
        </>
      )}

      {/* <code>{JSON.stringify(results?.aic)}</code> */}
      {/* {error && <Alert variant="danger">Results expired</Alert>}
      <banner />
      <div className={displayTab === "instructions" ? "d-block" : "d-none"}>
        <Instructions formLimits={formLimits} />
      </div>
      <div className={displayTab === "status" ? "d-block" : "d-none"}>
        <Status />
      </div>
      {status && status === "COMPLETED" && <></>} */}
    </Container>
  );
}
