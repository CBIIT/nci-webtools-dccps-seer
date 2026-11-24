"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect, useMemo } from "react";
import { useQuery, skipToken } from "@tanstack/react-query";
import { useStore, defaultMain } from "../store";
import { fetchStatus, fetchOutput } from "@/services/queries";
import Loading from "@/components/loading";
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
  const setMain = useStore((state) => state.setMain);
  const seerData = useStore((state) => state.seerData);
  const params = useStore((state) => state.params);
  const storedMain = useStore((state) => state.main);
  const main = storedMain.id === id ? storedMain : defaultMain;

  const { data: jobStatus } = useQuery({
    queryKey: ["status", id],
    queryFn: () => fetchStatus(id),
    enabled: !!id,
    refetchInterval: (data) =>
      data?.state?.data?.status === "SUBMITTED" || data?.state?.data?.status === "IN_PROGRESS" ? 5 * 1000 : false,
  });
  const isCompleted = jobStatus?.status === "COMPLETED";
  const { data: manifest } = useQuery({
    queryKey: ["manifest", id],
    queryFn: isCompleted ? () => fetchOutput(id, "manifest.json") : skipToken,
    staleTime: Infinity,
  });
  const resultsFile = manifest?.data;
  const { data: results, isLoading: isLoadingResults } = useQuery({
    queryKey: ["results", id, resultsFile],
    queryFn: resultsFile ? () => fetchOutput(id, resultsFile) : skipToken,
    staleTime: Infinity,
  });

  useEffect(() => {
    // if (jobStatus && jobStatus.status === "COMPLETED") {
    if (id) {
      setState({ openSidebar: false });
    }
  }, [setState, jobStatus, id]);

  const stratumOptions = useMemo(() => getStratumOptions(results, seerData), [results, seerData]);
  const stratumValueToLabel = useMemo(() => getStratumValueToLabel(results, seerData), [results, seerData]);
  // a stored stratum may not exist in these results
  const stratumIndex = main.stratumIndex < stratumOptions.length ? main.stratumIndex : 0;
  const { precision } = main;
  const selection = { ...main, stratumIndex };
  const setSelection = (update) => setMain(id, update);

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
          <Controls
            manifest={manifest}
            results={results}
            seerData={seerData}
            selection={selection}
            setSelection={setSelection}
            handleSaveResults={handleSaveResults}
          />
        </div>
      )}
      {isLoadingResults && <Loading />}
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
