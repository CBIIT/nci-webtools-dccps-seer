"use client";
import { useMemo } from "react";
import { Container, Row, Col } from "react-bootstrap";
import DeviancePlot from "./plot";
import { getValueToLabelMap } from "../controls";
import { getDevianceColumns } from "../table-columns";
import DatasetTable from "@/components/dataset-table";
import { getCansurvSettingsRows } from "../download-settings";

export default function Deviance({ data, seerData, params, precision, stratumIndex = 0, stratumValueToLabel = {} }) {
  const hasStrata = data["fit.list.by"]?.length > 0;

  const memoData = useMemo(() => {
    return data["fit.list"][stratumIndex]?.data ?? [];
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
      <Row>
        <Col>
          <DeviancePlot
            data={memoData}
            params={params}
            title={`Plot of Deviance Residuals`}
            subtitle={getPlotSubtitle()}
            xTitle={"Time Since Diagnosis"}
            yTitle={"Deviance Residuals"}
            precision={precision}
          />
        </Col>
      </Row>
      <DatasetTable
        title="Plot of Deviance Residuals"
        data={memoData}
        columns={getDevianceColumns({ seerData, valueToLabelMap, precision })}
        filename={`deviance-${getPlotSubtitle()}`}
        getSettingsRows={() => getCansurvSettingsRows(params, seerData, getPlotSubtitle())}
      />
    </Container>
  );
}
