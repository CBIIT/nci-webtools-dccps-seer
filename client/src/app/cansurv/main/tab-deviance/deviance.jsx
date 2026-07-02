"use client";
import { useMemo } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import DeviancePlot from "./plot";
import DevianceTable from "./table";
import { getValueToLabelMap } from "../controls";
import { downloadTableCansurv } from "@/services/xlsx";

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
      <Row className="justify-content-between align-items-center">
        <Col sm="auto">Total Row Count: {memoData.length}</Col>
        <Col sm="auto">
          <Button
            variant="link"
            onClick={() =>
              downloadTableCansurv(memoData, Object.keys(memoData[0]), params, `deviance-${getPlotSubtitle()}`)
            }>
            Download Graph Dataset
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <DevianceTable data={memoData} seerData={seerData} valueToLabelMap={valueToLabelMap} precision={precision} />
        </Col>
      </Row>
    </Container>
  );
}
