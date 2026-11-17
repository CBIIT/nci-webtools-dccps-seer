"use client";
import { useMemo } from "react";
import { Container, Row, Col, Alert } from "react-bootstrap";
import LoglikePlot from "./plot";
import { getValueToLabelMap } from "../controls";
import { getLoglikeColumns } from "../table-columns";
import DatasetTable from "@/components/dataset-table";
import { getCansurvSettingsRows } from "../download-settings";

export default function Loglike({ data, seerData, params, precision, stratumIndex = 0, stratumValueToLabel = {} }) {
  const hasStrata = data["fit.list.by"]?.length > 0;

  const memoData = useMemo(() => {
    return data["fit.list"][stratumIndex]?.profileLL ?? {};
  }, [data, stratumIndex]);

  const valueToLabelMap = useMemo(
    () => getValueToLabelMap(seerData.cohortVariables, stratumValueToLabel),
    [seerData, stratumValueToLabel]
  );

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
          <DatasetTable
            data={Object.values(memoData)}
            columns={getLoglikeColumns({ precision })}
            filename={`loglike-${getPlotSubtitle()}`}
            getSettingsRows={() => getCansurvSettingsRows(params, seerData, getPlotSubtitle())}
          />
        </>
      )}
    </Container>
  );
}
