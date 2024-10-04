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

export default function AnalysisMain({ id }) {
  const setState = useStore((state) => state.setState);
  const seerData = useStore((state) => state.seerData);
  const params = useStore((state) => state.params);
  const { cohortIndex, fitIndex } = useStore((state) => state.main);

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

  return (
    <Container>
      <code>{JSON.stringify(jobStatus)}</code>
      {params.id && manifest && <CohortSelect params={params} manifest={manifest} />}
      {results && seerData && Object.keys(seerData).length > 0 && Object.keys(params).length > 0 && (
        <>
          <ModelTable data={results} handleRowSelect={setFitIndex} />
          <Tabs defaultActiveKey="survival" className="my-3">
            <Tab eventKey="survival" title="Survival vs. Year at Diagnosis">
              <SurvivalVsYear
                data={results[fitIndex]}
                seerData={seerData}
                params={params}
                cohortIndex={cohortIndex}
                fitIndex={fitIndex}
              />
            </Tab>
            <Tab eventKey="death" title="Death vs. Year at Diagnosis">
              <DeathVsYear data={results[fitIndex]} seerData={seerData} params={params} />
            </Tab>
            <Tab eventKey="time" title="Survival vs. Time Since Diagnosis">
              <SurvivalVsTime data={results[fitIndex].fullpredicted} seerData={seerData} params={params} />
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
