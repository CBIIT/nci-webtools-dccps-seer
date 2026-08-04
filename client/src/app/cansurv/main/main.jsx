"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useStore } from "../store";
import { fetchStatus, fetchOutput } from "@/services/queries";
import Description from "./description";
import Status from "../status";
import Report from "./report";
import Actuarial from "./tab-actuarial/actuarial";
import Deviance from "./tab-deviance/deviance";
import KYear from "./tab-k-year/k-year";
import Loglike from "./tab-loglike/loglike";
import { Controls, getStratumOptions, getStratumValueToLabel } from "./controls";
import { downloadAll } from "@/services/xlsx";

export default function AnalysisMain({ id }) {
  const setState = useStore((state) => state.setState);
  const seerData = useStore((state) => state.seerData);
  const params = useStore((state) => state.params);
  const main = useStore((state) => state.main);
  const { precision, stratumIndex } = main;

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
  const { data: results } = useSuspenseQuery({
    queryKey: ["results", id, jobStatus, manifest],
    queryFn: () => (jobStatus?.status === "COMPLETED" && manifest?.data ? fetchOutput(id, manifest.data) : null),
  });

  // periodically dispatch resize event to trigger plotly redraw
  useEffect(() => {
    setInterval(() => {
      if (window) dispatchEvent(new Event("resize"));
    }, 1000);
  }, []);
  useEffect(() => {
    // if (jobStatus && jobStatus.status === "COMPLETED") {
    if (id) {
      setState({ openSidebar: false });
    }
  }, [setState, jobStatus, id]);

  const stratumOptions = useMemo(() => getStratumOptions(results, seerData), [results, seerData]);
  const stratumValueToLabel = useMemo(() => getStratumValueToLabel(results, seerData), [results, seerData]);

  // clamp stratumIndex when new results have fewer strata
  useEffect(() => {
    if (stratumOptions.length > 0 && stratumIndex >= stratumOptions.length) {
      setState({ main: { ...main, stratumIndex: 0 } });
    }
  }, [stratumOptions.length]);

  async function handleSaveResults() {
    const { modelData, coefData } = await fetchAll(id, manifest);
    const filename = params.files.dataFile;

    downloadAll(modelData, coefData, seerData, params, `cansurv_${filename.split(".").slice(0, -1).join(".")}`);
  }

  return (
    <Container>
      <Status status={jobStatus} />
      {!jobStatus && <Description />}
      {manifest && (
        <div className="shadow p-3 border rounded bg-white mb-3">
          <Controls manifest={manifest} results={results} seerData={seerData} handleSaveResults={handleSaveResults} />
        </div>
      )}
      {results && Object.keys(seerData).length > 0 && (
        <div className="shadow border rounded bg-white my-3">
          <Tabs defaultActiveKey="report">
            <Tab eventKey="report" title="Report">
              <Report data={results} seerData={seerData} precision={precision} stratumIndex={stratumIndex} />
            </Tab>
            <Tab eventKey="act" title="Estimated and Actuarial Survival Curves">
              <Actuarial
                data={results}
                seerData={seerData}
                params={params}
                precision={precision}
                stratumIndex={stratumIndex}
                stratumValueToLabel={stratumValueToLabel}
              />
            </Tab>
            <Tab eventKey="kYear" title="K-Year Survival Rate">
              <KYear
                data={results}
                seerData={seerData}
                params={params}
                precision={precision}
                stratumIndex={stratumIndex}
                stratumValueToLabel={stratumValueToLabel}
              />
            </Tab>
            <Tab eventKey="dev" title="Deviance Residuals">
              <Deviance
                data={results}
                seerData={seerData}
                params={params}
                precision={precision}
                stratumIndex={stratumIndex}
                stratumValueToLabel={stratumValueToLabel}
              />
            </Tab>
            <Tab eventKey="ll" title="LogLikelihood L(c) vs c">
              <Loglike
                data={results}
                seerData={seerData}
                params={params}
                precision={precision}
                stratumIndex={stratumIndex}
                stratumValueToLabel={stratumValueToLabel}
              />
            </Tab>
          </Tabs>
        </div>
      )}
    </Container>
  );
}
