"use client";
import { useMemo, useState } from "react";
import { Container, Row, Col, Form, Alert, Button } from "react-bootstrap";
import MetastaticSurvivalPlot from "./plot";
import MetastaticSurvivalTable from "./table";
import { withMetastaticSurvivalCurves } from "./utils";
import { downloadTableCansurv } from "@/services/xlsx";

const DOWNLOAD_COLUMNS = ["followup", "obs_dist_surv", "dist_surv_adjusted", "dist_surv_exponential", "r", "theta"];

export default function MetastaticSurvival({ data, params, stratumLabel, precision }) {
  const [showObserved, setShowObserved] = useState(true);
  const [showAdjusted, setShowAdjusted] = useState(true);
  const [showExponential, setShowExponential] = useState(true);

  const sortedData = useMemo(() => withMetastaticSurvivalCurves(data), [data]);

  const r = sortedData[0]?.r;
  const theta = sortedData[0]?.theta;
  const thetaMissing = theta === null || theta === undefined;

  function handleDownload() {
    downloadTableCansurv(
      sortedData,
      DOWNLOAD_COLUMNS,
      params,
      `recurrisk-metastatic-survival-${stratumLabel || "data"}`
    );
  }

  return (
    <Container fluid>
      <Row className="border-bottom mb-3">
        <Col className="p-3">
          <Row className="align-items-end">
            <Col sm="auto">
              <Form.Group controlId="metastaticSurvivalShowObserved">
                <Form.Check
                  type="checkbox"
                  label="Survival after metastatic disease at diagnosis"
                  checked={showObserved}
                  onChange={(e) => setShowObserved(e.target.checked)}
                />
              </Form.Group>
            </Col>
            <Col sm="auto">
              <Form.Group controlId="metastaticSurvivalShowAdjusted">
                <Form.Check
                  type="checkbox"
                  label="Assumed survival after metastatic recurrence"
                  checked={showAdjusted}
                  onChange={(e) => setShowAdjusted(e.target.checked)}
                />
              </Form.Group>
            </Col>
            <Col sm="auto">
              <Form.Group controlId="metastaticSurvivalShowExponential">
                <Form.Check
                  type="checkbox"
                  label="Exponential approximation (analytical method)"
                  checked={showExponential && !thetaMissing}
                  disabled={thetaMissing}
                  onChange={(e) => setShowExponential(e.target.checked)}
                />
              </Form.Group>
            </Col>
          </Row>
          {!thetaMissing && (
            <Row className="mt-2">
              <Col>
                <Form.Text muted>
                  Adjustment factor r = {Number(r).toFixed(precision)}; \u03b8 = {Number(theta).toFixed(precision)}
                </Form.Text>
              </Col>
            </Row>
          )}
        </Col>
      </Row>
      {thetaMissing && (
        <Alert variant="info">The exponential approximation is not available for this stratum.</Alert>
      )}
      <Row>
        <Col>
          <MetastaticSurvivalPlot
            data={sortedData}
            showObserved={showObserved}
            showAdjusted={showAdjusted}
            showExponential={showExponential && !thetaMissing}
            title="Survival After Metastatic Disease"
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
          <MetastaticSurvivalTable
            data={sortedData}
            showObserved={showObserved}
            showAdjusted={showAdjusted}
            showExponential={showExponential && !thetaMissing}
            precision={precision}
          />
        </Col>
      </Row>
    </Container>
  );
}
