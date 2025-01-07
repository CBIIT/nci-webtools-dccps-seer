"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useStore } from "../store";
import { fetchStatus, fetchOutput } from "@/services/queries";
import Status from "../status";
import Report from "./report";

export default function AnalysisMain({ id }) {
  const setState = useStore((state) => state.setState);
  const seerData = useStore((state) => state.seerData);
  const params = useStore((state) => state.params);
  const main = useStore((state) => state.main);
  const {} = main;

  const { data: jobStatus } = useQuery({
    queryKey: ["status", id],
    queryFn: () => fetchStatus(id),
    enabled: !!id,
    refetchInterval: (data) =>
      data?.state?.data?.status === "SUBMITTED" || data?.state?.data?.status === "IN_PROGRESS" ? 5 * 1000 : false,
  });
  const { data: manifest } = useQuery({
    queryKey: ["manifest", id],
    queryFn: () => fetchOutput(id, "manifest.json"),
    enabled: jobStatus?.status === "COMPLETED",
  });
  const { data: results } = useQuery({
    queryKey: ["results", id],
    queryFn: () => fetchOutput(id, manifest),
    enabled: jobStatus?.status === "COMPLETED" && !!manifest,
  });

  useEffect(() => {
    // if (jobStatus && jobStatus.status === "COMPLETED") {
    if (id) {
      setState({ openSidebar: false });
    }
  }, [setState, jobStatus, id]);

  return (
    <Container>
      <Status seerData={seerData} status={jobStatus} />
      {results && (
        <div className="shadow border rounded bg-white my-3">
          <Tabs defaultActiveKey="report">
            <Tab eventKey="report" title="Report">
              <Report data={results} />
            </Tab>
            <Tab eventKey="data" title="Data"></Tab>
            <Tab eventKey="curves" title="Estimated and Actuarial Survival Curves"></Tab>
            <Tab eventKey="kYear" title="K-Year Survival Rate"></Tab>
            <Tab eventKey="dev" title="Deviance Residuals"></Tab>
            <Tab eventKey="ll" title="LogLikelihood L(c) vs c"></Tab>
          </Tabs>
        </div>
      )}
    </Container>
  );
}
