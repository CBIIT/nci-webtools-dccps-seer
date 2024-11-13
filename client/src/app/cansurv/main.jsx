"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useStore } from "./store";
import { fetchStatus, fetchResults } from "@/services/queries";

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
      data?.state?.data === "SUBMITTED" || data?.state?.data === "IN_PROGRESS" ? 5 * 1000 : false,
  });
  const { data: manifest } = useQuery({
    queryKey: ["manifest", id],
    queryFn: () => fetchResults(id, "manifest"),
    enabled: jobStatus === "COMPLETED",
  });
  const { data: results } = useQuery({
    queryKey: ["results", id],
    queryFn: () => fetchResults(id, "results"),
    enabled: jobStatus === "COMPLETED",
  });

  return (
    <Container>
      <code>{JSON.stringify(jobStatus)}</code>
      <br />
      <code>{JSON.stringify(manifest)}</code>
    </Container>
  );
}
