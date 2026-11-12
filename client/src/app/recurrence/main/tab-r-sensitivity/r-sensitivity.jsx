"use client";
import { useMemo, useState } from "react";
import { Container, Row, Col, Form, Alert, Button } from "react-bootstrap";
import RSensitivityPlot from "./plot";
import RSensitivityTable from "./table";
import { analyticalRisk, numericalRisk, parseRValues } from "./utils";
import { downloadTableCansurv } from "@/services/xlsx";

const METHOD_OPTIONS = [
  { value: "analytical", label: "Analytical" },
  { value: "numerical", label: "Numerical" },
];

function defaultRText(r) {
  if (r === null || r === undefined) return "";
  return [r + 0.5, r + 1, r + 1.5, r + 2].map((v) => Number(v.toFixed(4))).join(", ");
}

export default function RSensitivity({ data, params, stratumLabel, precision }) {
  const sortedData = data ?? [];
  const modelR = sortedData[0]?.r;
  const link = sortedData[0]?.link;
  const thetaMissing = sortedData[0]?.theta === null || sortedData[0]?.theta === undefined;

  const [method, setMethod] = useState(thetaMissing ? "numerical" : "analytical");
  const [rText, setRText] = useState(() => defaultRText(modelR));

  const effectiveMethod = method === "analytical" && thetaMissing ? "numerical" : method;
  const methodLabel = effectiveMethod === "analytical" ? "Analytical method" : "Numerical method";

  const { error: parseError } = parseRValues(rText);

  const series = useMemo(() => {
    if (!sortedData.length) return [];
    const { values: parsedValues } = parseRValues(rText);
    const allRs =
      modelR !== undefined && modelR !== null
        ? [...new Set([modelR, ...parsedValues])].sort((a, b) => a - b)
        : [...new Set(parsedValues)].sort((a, b) => a - b);
    return allRs.map((r) => ({
      r,
      isModel: r === modelR,
      values: effectiveMethod === "analytical" ? analyticalRisk(sortedData, r) : numericalRisk(sortedData, r),
    }));
  }, [sortedData, rText, modelR, effectiveMethod]);

  const followups = sortedData.map((r) => r.followup);

  function handleDownload() {
    const rows = followups.map((followup, i) => {
      const row = { followup };
      series.forEach((s) => {
        row[`CI_r=${s.r}`] = s.values[i];
      });
      return row;
    });
    downloadTableCansurv(
      rows,
      ["followup", ...series.map((s) => `CI_r=${s.r}`)],
      params,
      `recurrisk-r-sensitivity-${stratumLabel || "data"}`
    );
  }

  return (
    <Container fluid>
      <Row className="border-bottom mb-3">
        <Col className="p-3">
          <Row className="align-items-end">
            <Col sm="auto">
              <Form.Group controlId="rSensitivityMethod">
                <Form.Label>Method</Form.Label>
                <Form.Select value={effectiveMethod} onChange={(e) => setMethod(e.target.value)}>
                  {METHOD_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={option.value === "analytical" && thetaMissing}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
                {thetaMissing && (
                  <Form.Text muted>Analytical is not available for this stratum (no fitted θ).</Form.Text>
                )}
              </Form.Group>
            </Col>
            <Col sm="auto" style={{ minWidth: "20rem" }}>
              <Form.Group controlId="rSensitivityValues">
                <Form.Label>r values to compare (comma-separated)</Form.Label>
                <Form.Control
                  type="text"
                  value={rText}
                  isInvalid={Boolean(parseError)}
                  onChange={(e) => setRText(e.target.value)}
                />
                {parseError && <Form.Control.Feedback type="invalid">{parseError}</Form.Control.Feedback>}
              </Form.Group>
            </Col>
          </Row>
          <Row className="mt-2">
            <Col>
              <Form.Text muted>
                Stratum: {stratumLabel || "All"} | Distribution: {link ?? "N/A"} | Method: {methodLabel} | Model r ={" "}
                {modelR !== undefined && modelR !== null ? Number(modelR).toFixed(precision) : "N/A"}
              </Form.Text>
            </Col>
          </Row>
        </Col>
      </Row>
      <Row>
        <Col>
          <RSensitivityPlot
            followups={followups}
            series={series}
            title="Sensitivity of Recurrence Risk to r"
            subtitle={stratumLabel ? `${stratumLabel} - ${methodLabel}` : methodLabel}
            precision={precision}
          />
        </Col>
      </Row>
      <Row className="justify-content-between align-items-center">
        <Col sm="auto">Total Row Count: {followups.length}</Col>
        <Col sm="auto">
          <Button variant="link" onClick={handleDownload} disabled={followups.length === 0 || series.length === 0}>
            Download Graph Dataset
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <RSensitivityTable followups={followups} series={series} precision={precision} />
        </Col>
      </Row>
    </Container>
  );
}
