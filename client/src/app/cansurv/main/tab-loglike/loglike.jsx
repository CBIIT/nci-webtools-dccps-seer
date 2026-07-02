"use client";
import { useMemo } from "react";
import { Container, Row, Col, Alert, Button } from "react-bootstrap";
import LoglikePlot from "./plot";
import LoglikeTable from "./table";
import { downloadTableCansurv } from "@/services/xlsx";

export default function Loglike({ data, seerData, params, precision, stratumIndex = 0, stratumValueToLabel = {} }) {
  const hasStrata = data["fit.list.by"]?.length > 0;

  const memoData = useMemo(() => {
    return data["fit.list"][stratumIndex]?.profileLL ?? {};
  }, [data, stratumIndex]);

  const valueToLabelMap = useMemo(() => {
    const map = {
      stratum: stratumValueToLabel,
      ...Object.fromEntries(seerData.cohortVariables.map((e) => [e.name, {}])),
    };
    seerData.cohortVariables.forEach((varObj) => {
      varObj.factors.forEach((factor) => {
        map[varObj.name][factor.value] = factor.label;
      });
    });
    return map;
  }, [seerData, stratumValueToLabel]);

  function getPlotSubtitle() {
    return hasStrata ? valueToLabelMap.stratum[stratumIndex] ?? "" : "";
  }

  return (
    <Container fluid>
      {!Object.keys(memoData).length > 0 ? (
        <Alert variant="info">
          <div>LogLikelihood Unavailable</div>
          <div>LogLikehood is only available if all covariates are not configured as Cure</div>
        </Alert>
      ) : (
        <>
          <Row>
            <Col>
              <LoglikePlot
                data={memoData}
                title={`Profile Log-Likelihood Plot with Cure Fraction C`}
                subtitle={getPlotSubtitle()}
                xTitle={"Cure Fraction C"}
                yTitle={"Log(L)"}
                precision={precision}
              />
            </Col>
          </Row>
          <Row className="justify-content-between align-items-center">
            <Col sm="auto">Total Row Count: {memoData.length}</Col>
            <Col sm="auto">
              <Button
                variant="link"
                onClick={() =>
                  downloadTableCansurv(memoData, Object.keys(memoData), params, `loglike-${getPlotSubtitle()}`)
                }>
                Download Graph Dataset
              </Button>
            </Col>
          </Row>
          <Row>
            <Col>
              <LoglikeTable
                data={memoData}
                seerData={seerData}
                valueToLabelMap={valueToLabelMap}
                precision={precision}
              />
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}
