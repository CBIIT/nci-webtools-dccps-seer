"use client";
import { Form, Row, Col, Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { FaDownload } from "react-icons/fa";
import { FaCircleInfo } from "react-icons/fa6";

// Build the list of stratum/covariate variables from the results columns that
// precede "followup" (see server/recurrence/recurrenceV1.R), using only the
// values present in the results and labels from the SEER*Stat dictionary.
export function getStratumVariables(results, seerData) {
  if (!results?.length) return [];
  const dict = seerData?.seerStatDictionary ?? [];
  const keys = Object.keys(results[0]);
  const followupIndex = keys.indexOf("followup");
  const stratumKeys = followupIndex > -1 ? keys.slice(0, followupIndex) : [];

  return stratumKeys.map((name) => {
    const dictEntry = dict.find((d) => d.name === name);
    const factorMap = new Map((dictEntry?.factors ?? []).map((f) => [String(f.value), f.label]));
    const values = [...new Set(results.map((row) => row[name]))].sort((a, b) => a - b);
    return {
      name,
      label: dictEntry?.label ?? name,
      options: values.map((value) => ({ value, label: factorMap.get(String(value)) ?? String(value) })),
    };
  });
}

// Keep only rows matching the currently selected stratum.
export function filterByStratum(rows, stratum) {
  const entries = Object.entries(stratum ?? {});
  if (!entries.length) return rows ?? [];
  return (rows ?? []).filter((row) => entries.every(([key, value]) => row[key] == value));
}

// Build a display label for the selected stratum
export function getStratumLabel(stratumVariables, stratum) {
  return stratumVariables
    .map((variable) => {
      const option = variable.options.find((o) => o.value == stratum?.[variable.name]);
      return `${variable.label}: ${option?.label ?? stratum?.[variable.name] ?? ""}`;
    })
    .join(" / ");
}

export default function Controls({
  stratumVariables,
  stratum,
  onStratumChange,
  precision,
  onPrecisionChange,
  onSaveWorkspace,
  id,
  showStratum = true,
}) {
  function handleChange(name, rawValue) {
    const numericValue = Number(rawValue);
    onStratumChange(name, Number.isNaN(numericValue) ? rawValue : numericValue);
  }

  return (
    <Form>
      <Row className="align-items-end">
        {showStratum &&
          stratumVariables.map((variable) => (
            <Col key={variable.name} sm="auto">
              <Form.Group controlId={`stratum-${variable.name}`}>
                <Form.Label>{variable.label}</Form.Label>
                <Form.Select
                  value={stratum?.[variable.name] ?? ""}
                  onChange={(e) => handleChange(variable.name, e.target.value)}>
                  {variable.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          ))}
        <Col sm="auto">
          <Form.Group controlId="precision">
            <Form.Label>
              Precision{" "}
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="precision-tooltip">Number of decimal places in data</Tooltip>}>
                <span>
                  <FaCircleInfo />
                </span>
              </OverlayTrigger>
            </Form.Label>
            <Form.Select value={precision} onChange={(e) => onPrecisionChange(+e.target.value)}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col />
        <Col sm="auto">
          <Button variant="link" onClick={onSaveWorkspace} disabled={!id} className="text-decoration-none">
            <FaDownload /> Export Workspace
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
