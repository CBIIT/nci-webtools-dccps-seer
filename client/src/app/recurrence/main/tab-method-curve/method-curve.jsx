"use client";
import { useState } from "react";
import { Container, Row, Col, Form, Alert, Button } from "react-bootstrap";
import MethodCurvePlot from "./plot";
import MethodCurveTable from "./table";
import { hasNumericalEstimate } from "./utils";
import { downloadTableCansurv } from "@/services/xlsx";

const METHOD_OPTIONS = [
  { value: "both", label: "Analytical and Numerical" },
  { value: "analytical", label: "Analytical" },
  { value: "numerical", label: "Numerical" },
];

export default function MethodCurve({ config, data, params, stratumLabel, precision }) {
  const [method, setMethod] = useState("both");
  const [showBand, setShowBand] = useState(true);

  // Years after which numerical estimates are unavailable for this stratum, if any.
  let truncationYear = null;
  if (data.length) {
    const withNumerical = data.filter((r) => hasNumericalEstimate(r, config.numericalKey));
    const lastYear = Math.max(...data.map((r) => r.followup));
    if (!withNumerical.length) {
      truncationYear = lastYear;
    } else {
      const lastNumericalYear = Math.max(...withNumerical.map((r) => r.followup));
      truncationYear = lastNumericalYear < lastYear ? lastNumericalYear : null;
    }
  }

  const hasBand = Boolean(config.getCI);
  const bandDisabled = method === "numerical";

  function handleDownload() {
    const columns = config.downloadColumns ?? Object.keys(data[0] ?? {});
    downloadTableCansurv(data, columns, params, `${config.filenamePrefix}-${stratumLabel || "data"}`);
  }

  return (
    <Container fluid>
      <Row className="border-bottom mb-3">
        <Col className="p-3">
          <Row className="align-items-end">
            <Col sm="auto">
              <Form.Group controlId={`${config.id}Method`}>
                <Form.Label>Method</Form.Label>
                <Form.Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            {hasBand && (
              <Col sm="auto">
                <Form.Group controlId={`${config.id}ShowBand`}>
                  <Form.Check
                    type="checkbox"
                    label="Show 95% confidence band"
                    checked={showBand && !bandDisabled}
                    disabled={bandDisabled}
                    onChange={(e) => setShowBand(e.target.checked)}
                  />
                  {bandDisabled && (
                    <Form.Text muted>Confidence bands are only available for the analytical method.</Form.Text>
                  )}
                </Form.Group>
              </Col>
            )}
          </Row>
        </Col>
      </Row>
      {config.note && <Alert variant="secondary">{config.note}</Alert>}
      {truncationYear !== null && method !== "analytical" && (
        <Alert variant="info">
          Numerical estimates are not available after year {truncationYear} for this stratum.
        </Alert>
      )}
      <Row>
        <Col>
          <MethodCurvePlot
            config={config}
            data={data}
            method={method}
            showBand={hasBand && showBand && !bandDisabled}
            title={config.title}
            subtitle={stratumLabel}
            precision={precision}
          />
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
          <MethodCurveTable
            config={config}
            data={data}
            method={method}
            showBand={hasBand && showBand && !bandDisabled}
            precision={precision}
          />
        </Col>
      </Row>
    </Container>
  );
}
