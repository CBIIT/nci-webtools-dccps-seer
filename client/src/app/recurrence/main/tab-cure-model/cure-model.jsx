"use client";
import { Container, Row, Col, Button } from "react-bootstrap";
import CureModelPlot from "./plot";
import CureModelTable from "./table";
import { downloadTableCansurv } from "@/services/xlsx";

const DOWNLOAD_COLUMNS = ["followup", "obs_surv", "surv_curemodel"];

export default function CureModel({ data, params, stratumLabel, precision }) {
  function handleDownload() {
    downloadTableCansurv(data, DOWNLOAD_COLUMNS, params, `recurrisk-cure-model-${stratumLabel || "data"}`);
  }

  return (
    <Container fluid>
      <Row>
        <Col>
          <CureModelPlot data={data} title="Mixture Cure Model Fit" subtitle={stratumLabel} precision={precision} />
        </Col>
      </Row>
      <Row className="justify-content-between align-items-center">
        <Col sm="auto">Total Row Count: {data.length}</Col>
        <Col sm="auto">
          <Button variant="link" onClick={handleDownload} disabled={data.length === 0}>
            Download Graph Dataset
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <CureModelTable data={data} precision={precision} />
        </Col>
      </Row>
    </Container>
  );
}
