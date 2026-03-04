"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useStore } from "../store";
import { fetchStatus, fetchOutput } from "@/services/queries";
import Status from "../status";
import Results from "./results";
import Help from "./help";
import { Controls } from "./controls";
import { downloadAll } from "@/services/xlsx";

export default function AnalysisMain({ id }) {
  const setState = useStore((state) => state.setState);
  const seerData = useStore((state) => state.seerData);
  const params = useStore((state) => state.params);

  const { data: jobStatus } = useQuery({
    queryKey: ["status", id],
    queryFn: () => fetchStatus(id),
    enabled: !!id,
    refetchInterval: (data) =>
      data?.state?.data?.status === "SUBMITTED" || data?.state?.data?.status === "IN_PROGRESS" ? 5 * 1000 : false,
  });
  const { data: results } = useSuspenseQuery({
    queryKey: ["results", id, jobStatus],
    queryFn: () => (jobStatus?.status === "COMPLETED" ? fetchOutput(id, "results.json") : null),
  });

  useEffect(() => {
    if (id) {
      setState({ openSidebar: false });
    }
  }, [setState, jobStatus, id]);

  return (
    <Container>
      <Status status={jobStatus} seerData={seerData} />
      <div className="shadow border rounded bg-white my-3">
        <Tabs defaultActiveKey="results">
          <Tab eventKey="results" title="Results">
            <Results data={results} />
          </Tab>
          <Tab eventKey="help" title="Help">
            <Help />
          </Tab>
        </Tabs>
      </div>
    </Container>
  );
}
