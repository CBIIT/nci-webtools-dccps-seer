"use client";
import { useMemo, useState } from "react";
import { Container, Row, Col, Form, Alert, Button } from "react-bootstrap";
import MetastaticPlot from "./plot";
import MetastaticTable from "./table";
import { hasNumericalEstimate } from "./utils";
import { downloadTableCansurv } from "@/services/xlsx";

const METHOD_OPTIONS = [
  { value: "both", label: "Analytical and Numerical" },
  { value: "analytical", label: "Analytical" },
  { value: "numerical", label: "Numerical" },
];

export default function Metastatic({ data, params, stratumLabel, precision }) {
  const [method, setMethod] = useState("both");
  const [showBand, setShowBand] = useState(true);

  const sortedData = useMemo(() => [...(data ?? [])].sort((a, b) => a.followup - b.followup), [data]);

  // Years after which numerical estimates are unavailable for this stratum, if any.
  const truncationYear = useMemo(() => {
    if (!sortedData.length) return null;
    const withNumerical = sortedData.filter(hasNumericalEstimate);
    const lastYear = Math.max(...sortedData.map((r) => r.followup));
    if (!withNumerical.length) return lastYear;
    const lastNumericalYear = Math.max(...withNumerical.map((r) => r.followup));
    return lastNumericalYear < lastYear ? lastNumericalYear : null;
  }, [sortedData]);

  const bandDisabled = method === "numerical";

  function handleDownload() {
    downloadTableCansurv(
      sortedData,
      Object.keys(sortedData[0] ?? {}),
      params,
      `recurrisk-${stratumLabel || "data"}`
    );
  }

  return (
    <Container fluid>
      <Row className="border-bottom mb-3">
        <Col className="p-3">
          <Row className="align-items-end">
            <Col sm="auto">
              <Form.Group controlId="metastaticMethod">
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
            <Col sm="auto">
              <Form.Group controlId="metastaticShowBand">
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
          </Row>
        </Col>
      </Row>
      {truncationYear !== null && method !== "analytical" && (
        <Alert variant="info">Numerical estimates are not available after year {truncationYear} for this stratum.</Alert>
      )}
      <Row>
        <Col>
          <MetastaticPlot
            data={sortedData}
            method={method}
            showBand={showBand && !bandDisabled}
            title="Net Metastatic Recurrence Risk"
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
          <MetastaticTable data={sortedData} method={method} showBand={showBand && !bandDisabled} precision={precision} />
        </Col>
      </Row>
    </Container>
  );
}
