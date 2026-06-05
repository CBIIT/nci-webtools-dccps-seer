"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useStore } from "../store";
import { fetchStatus, fetchOutput } from "@/services/queries";
import Status from "../status";
import Results from "./results";
import Description from "./description";

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
      {!Object.keys(seerData).length > 0 ? <Description /> : <Status seerData={seerData} status={jobStatus} />}
      {jobStatus?.status === "COMPLETED" && (
        <div className="shadow p-3 border rounded bg-white mb-3">
          <Results data={results} params={params} />
        </div>
      )}
    </Container>
  );
}
