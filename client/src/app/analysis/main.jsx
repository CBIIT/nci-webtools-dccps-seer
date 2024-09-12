"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect } from "react";
import { useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import ModelTable from "./model-table";
import SurvivalVsYear from "./survivalVsYear";
import CohortSelect from "./cohort-select";
import { useStore } from "./store";
import { fetchStatus, fetchResults } from "./queries";

export default function AnalysisMain({ id }) {
  const queryClient = useQueryClient();
  const setState = useStore((state) => state.setState);
  const seerData = useStore((state) => state.seerData);
  const params = useStore((state) => state.params);
  const { cohortIndex, modelIndex } = useStore((state) => state.main);

  const { data: jobStatus } = useQuery({
    queryKey: ["status", id],
    queryFn: () => fetchStatus(id),
    enabled: !!id,
  });
  const { data: results } = useQuery({
    queryKey: ["results", id, cohortIndex],
    queryFn: () => fetchResults(id, cohortIndex),

    enabled: jobStatus === "COMPLETED",
  });

  useEffect(() => {
    if (jobStatus === "SUBMITTED" || jobStatus === "IN_PROGRESS") {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["status"] }), 1000 * 5);
    }
  }, [jobStatus]);

  function setModelIndex(index) {
    setState({ main: { cohortIndex, modelIndex: index } });
  }

  return (
    <Container>
      <code>{JSON.stringify(jobStatus)}</code>
      {results && seerData && Object.keys(seerData).length > 0 && Object.keys(params).length > 0 && (
        <>
          <CohortSelect params={params} />
          <ModelTable data={results} handleRowSelect={setModelIndex} />
          <Tabs defaultActiveKey="survival" className="my-3">
            <Tab eventKey="survival" title="Survival vs. Year at Diagnosis">
              <SurvivalVsYear data={results[modelIndex].fullpredicted} seerData={seerData} params={params} />
            </Tab>
            <Tab eventKey="death" title="Death vs. Year at Diagnosis">
              Tab content for Profile
            </Tab>
            <Tab eventKey="time" title="Survival vs. Time Since Diagnosis">
              Tab content for Contact
            </Tab>
            <Tab eventKey="estimates" title="Model Estimates">
              Tab content for Contact
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
