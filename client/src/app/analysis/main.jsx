"use client";
import { Container } from "react-bootstrap";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import ModelTable from "./model-table";

export default function AnalysisMain({ id }) {
  const queryClient = useQueryClient();
  const { data: jobStatus } = useQuery({
    queryKey: ["status", id],
    queryFn: async () => {
      return (await axios.get(`/api/data/output/${id}/status.json`)).data.status;
    },
    enabled: !!id,
  });
  const { data: results } = useQuery({
    queryKey: ["results", id],
    queryFn: async () => {
      return (await axios.get(`/api/data/output/${id}/results.json`)).data;
    },

    enabled: jobStatus === "COMPLETED",
  });

  useEffect(() => {
    if (jobStatus === "SUBMITTED" || jobStatus === "IN_PROGRESS") {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["status"] }), 1000 * 5);
    }
  }, [jobStatus]);

  return (
    <Container>
      <code>{JSON.stringify(jobStatus)}</code>
      {results && (
        <>
          <ModelTable data={results} />
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
