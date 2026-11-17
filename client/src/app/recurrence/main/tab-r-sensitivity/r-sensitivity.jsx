"use client";
import { useMemo, useState } from "react";
import { Container, Row, Col, Form } from "react-bootstrap";
import RSensitivityPlot from "./plot";
import { getRSensitivityColumns, getRSensitivityRows } from "./columns";
import { analyticalRisk, numericalRisk, parseRValues } from "./utils";
import DatasetTable from "@/components/dataset-table";
import { getRecurrenceSettingsRows } from "../download-settings";

const METHOD_OPTIONS = [
  { value: "analytical", label: "Analytical" },
  { value: "numerical", label: "Numerical" },
];

function defaultRText(r) {
  if (r === null || r === undefined) return "";
  return [r + 0.5, r + 1, r + 1.5, r + 2].map((v) => Number(v.toFixed(4))).join(", ");
}

export default function RSensitivity({ data, params, seerData, stratumLabel, precision }) {
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
  const rows = getRSensitivityRows(followups, series);
  const columns = getRSensitivityColumns({ series, precision });

  function getSettingsRows() {
    return getRecurrenceSettingsRows(params, seerData, stratumLabel, [
      ["Method", METHOD_OPTIONS.find((o) => o.value === effectiveMethod)?.label],
      ["r values to compare", series.filter((s) => !s.isModel).map((s) => s.r).join(", ")],
      ["Model r", modelR],
    ]);
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
      <DatasetTable
        title="Sensitivity of Recurrence Risk to r"
        data={rows}
        columns={columns}
        filename={`recurrisk-r-sensitivity-${stratumLabel || "data"}`}
        getSettingsRows={getSettingsRows}
        useColumnHeader
        useSort
        usePagination
        emptyMessage="No data available for this stratum"
      />
    </Container>
  );
}
