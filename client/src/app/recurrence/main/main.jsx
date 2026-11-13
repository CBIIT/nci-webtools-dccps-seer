"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useStore } from "../store";
import { fetchStatus, fetchOutput } from "@/services/queries";
import Status from "../status";
import Results from "./results";
import Description from "./description";
import MethodCurve from "./tab-method-curve/method-curve";
import { METASTATIC, RECURRENCE_FREE, NONCURED } from "./tab-method-curve/configs";
import CureModel from "./tab-cure-model/cure-model";
import MetastaticSurvival from "./tab-metastatic-survival/metastatic-survival";
import RSensitivity from "./tab-r-sensitivity/r-sensitivity";
import Controls, { getStratumVariables, filterByStratum, getStratumLabel } from "./controls";

export default function AnalysisMain({ id }) {
  const setState = useStore((state) => state.setState);
  const seerData = useStore((state) => state.seerData);
  const params = useStore((state) => state.params);
  const main = useStore((state) => state.main);
  const stratum = main?.stratum ?? {};
  const precision = main?.precision ?? 4;
  const [activeTab, setActiveTab] = useState("metastatic");

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

  const filteredResults = useMemo(
    () => [...filterByStratum(results, stratum)].sort((a, b) => a.followup - b.followup),
    [results, stratum]
  );
  const stratumLabel = getStratumLabel(stratumVariables, stratum);

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
              showStratum={activeTab !== "results"}
            />
          </div>
          <div className="shadow border rounded bg-white mb-3">
            <Tabs activeKey={activeTab} onSelect={(key) => key && setActiveTab(key)}>
              <Tab eventKey="metastatic" title="Net Metastatic Recurrence Risk">
                <MethodCurve
                  config={METASTATIC}
                  data={filteredResults}
                  params={params}
                  stratumLabel={stratumLabel}
                  precision={precision}
                />
              </Tab>
              <Tab eventKey="recurrence-free" title="Net Recurrence-free Probability">
                <MethodCurve
                  config={RECURRENCE_FREE}
                  data={filteredResults}
                  params={params}
                  stratumLabel={stratumLabel}
                  precision={precision}
                />
              </Tab>
              <Tab eventKey="cure-model" title="Mixture Cure Model Fit">
                <CureModel data={filteredResults} params={params} stratumLabel={stratumLabel} precision={precision} />
              </Tab>
              <Tab eventKey="noncured" title="Recurrence-free Probability among the Noncured Fraction">
                <MethodCurve
                  config={NONCURED}
                  data={filteredResults}
                  params={params}
                  stratumLabel={stratumLabel}
                  precision={precision}
                />
              </Tab>
              <Tab eventKey="metastatic-survival" title="Survival After Metastatic Disease">
                <MetastaticSurvival
                  data={filteredResults}
                  params={params}
                  stratumLabel={stratumLabel}
                  precision={precision}
                />
              </Tab>
              <Tab eventKey="r-sensitivity" title="Sensitivity of Recurrence Risk to r">
                <RSensitivity
                  data={filteredResults}
                  params={params}
                  stratumLabel={stratumLabel}
                  precision={precision}
                />
              </Tab>
              <Tab eventKey="results" title="Data">
                <Results data={results} params={params} seerData={seerData} precision={precision} />
              </Tab>
            </Tabs>
          </div>
        </>
      )}
    </Container>
  );
}
