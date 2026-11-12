"use client";
import { useMemo } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import CureModelPlot from "./plot";
import CureModelTable from "./table";
import { downloadTableCansurv } from "@/services/xlsx";

const DOWNLOAD_COLUMNS = ["followup", "obs_surv", "surv_curemodel"];

export default function CureModel({ data, params, stratumLabel, precision }) {
  const sortedData = useMemo(() => [...(data ?? [])].sort((a, b) => a.followup - b.followup), [data]);

  function handleDownload() {
    downloadTableCansurv(sortedData, DOWNLOAD_COLUMNS, params, `recurrisk-cure-model-${stratumLabel || "data"}`);
  }

  return (
    <Container fluid>
      <Row>
        <Col>
          <CureModelPlot
            data={sortedData}
            title="Mixture Cure Model Fit"
            subtitle={stratumLabel}
            precision={precision}
          />
        </Col>
      </Row>
      <Row className="justify-content-between align-items-center">
        <Col sm="auto">Total Row Count: {sortedData.length}</Col>
        <Col sm="auto">
          <Button variant="link" onClick={handleDownload} disabled={sortedData.length === 0}>
            Download Graph Dataset
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <CureModelTable data={sortedData} precision={precision} />
        </Col>
      </Row>
    </Container>
  );
}
