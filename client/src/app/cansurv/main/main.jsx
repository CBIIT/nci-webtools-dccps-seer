"use client";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useEffect, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useStore } from "../store";
import { fetchStatus, fetchOutput } from "@/services/queries";
import Status from "../status";
import Report from "./report";
import Actuarial from "./tab-actuarial/actuarial";
import Deviance from "./tab-deviance/deviance";
import KYear from "./tab-k-year/k-year";
import Loglike from "./tab-loglike/loglike";

export default function AnalysisMain({ id }) {
  const setState = useStore((state) => state.setState);
  const seerData = useStore((state) => state.seerData);
  const params = useStore((state) => state.params);
  const main = useStore((state) => state.main);
  const { precision } = main;

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
    select: (data) => (data.includes(".json") ? data : false),
    enabled: jobStatus?.status === "COMPLETED",
  });
  const { data: results } = useSuspenseQuery({
    queryKey: ["results", id, jobStatus, manifest],
    queryFn: () => (jobStatus?.status === "COMPLETED" && !!manifest ? fetchOutput(id, manifest) : null),
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
            <Tab eventKey="curves" title="Estimated and Actuarial Survival Curves">
              <Actuarial data={results} seerData={seerData} params={params} precision={precision} />
            </Tab>
            <Tab eventKey="kYear" title="K-Year Survival Rate">
              <KYear data={results} seerData={seerData} params={params} precision={precision} />
            </Tab>
            <Tab eventKey="dev" title="Deviance Residuals">
              <Deviance data={results} seerData={seerData} params={params} precision={precision} />
            </Tab>
            <Tab eventKey="ll" title="LogLikelihood L(c) vs c">
              <Loglike data={results} seerData={seerData} params={params} precision={precision} />
            </Tab>
          </Tabs>
        </div>
      )}
    </Container>
  );
}
