"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useStore } from "../store";
import { fetchStatus, fetchOutput } from "@/services/queries";
import Status from "../status";
import Results from "./results";
import Description from "./description";
import Metastatic from "./tab-metastatic/metastatic";
import Controls, { getStratumVariables, filterByStratum, getStratumLabel } from "./controls";

export default function AnalysisMain({ id }) {
  const setState = useStore((state) => state.setState);
  const seerData = useStore((state) => state.seerData);
  const params = useStore((state) => state.params);
  const main = useStore((state) => state.main);
  const stratum = main?.stratum ?? {};
  const precision = main?.precision ?? 4;

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

  const stratumVariables = useMemo(() => getStratumVariables(results, seerData), [results, seerData]);

  // Default (or re-clamp) the selected stratum whenever the available variables/results change.
  useEffect(() => {
    if (!stratumVariables.length) return;
    const next = { ...stratum };
    let changed = false;
    for (const variable of stratumVariables) {
      const isValid = variable.options.some((o) => o.value == next[variable.name]);
      if (!isValid) {
        next[variable.name] = variable.options[0]?.value;
        changed = true;
      }
    }
    if (changed) {
      setState({ main: { ...main, stratum: next } });
    }
  }, [stratumVariables]);

  const filteredResults = useMemo(() => filterByStratum(results, stratum), [results, stratum]);
  const stratumLabel = useMemo(() => getStratumLabel(stratumVariables, stratum), [stratumVariables, stratum]);

  function handleStratumChange(name, value) {
    setState({ main: { ...main, stratum: { ...stratum, [name]: value } } });
  }

  function handlePrecisionChange(value) {
    setState({ main: { ...main, precision: value } });
  }

  async function handleSaveWorkspace() {
    const jobId = params?.id;
    if (!jobId) return;
    const response = await fetch(`/api/export/${jobId}`);
    if (!response.ok) {
      throw new Error("Error during workspace export");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recurrence-${jobId}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (id) {
      setState({ openSidebar: false });
    }
  }, [setState, jobStatus, id]);

  return (
    <Container>
      <Status status={jobStatus} />
      {!jobStatus && <Description />}
      {jobStatus?.status === "COMPLETED" && (
        <>
          <div className="shadow p-3 border rounded bg-white mb-3">
            <Controls
              stratumVariables={stratumVariables}
              stratum={stratum}
              onStratumChange={handleStratumChange}
              precision={precision}
              onPrecisionChange={handlePrecisionChange}
              onSaveWorkspace={handleSaveWorkspace}
              id={params?.id}
            />
          </div>
          <div className="shadow border rounded bg-white mb-3">
            <Tabs defaultActiveKey="metastatic">
              <Tab eventKey="metastatic" title="Net Metastatic Recurrence Risk">
                <Metastatic data={filteredResults} params={params} stratumLabel={stratumLabel} precision={precision} />
              </Tab>
              <Tab eventKey="results" title="Results">
                <Results data={results} params={params} seerData={seerData} precision={precision} />
              </Tab>
            </Tabs>
          </div>
        </>
      )}
    </Container>
  );
}
