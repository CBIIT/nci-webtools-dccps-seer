"use client";
import { useMemo, useState } from "react";
import { Container, Row, Col, Form, Alert } from "react-bootstrap";
import MetastaticSurvivalPlot from "./plot";
import { getMetastaticSurvivalColumns } from "./columns";
import { withMetastaticSurvivalCurves } from "./utils";
import DatasetTable from "@/components/dataset-table";
import { getRecurrenceSettingsRows } from "../download-settings";
import { yesNo } from "@/services/download-settings";

export default function MetastaticSurvival({ data, params, seerData, stratumLabel, precision }) {
  const [showObserved, setShowObserved] = useState(true);
  const [showAdjusted, setShowAdjusted] = useState(true);
  const [showExponential, setShowExponential] = useState(true);

  const sortedData = useMemo(() => withMetastaticSurvivalCurves(data), [data]);

  const r = sortedData[0]?.r;
  const theta = sortedData[0]?.theta;
  const thetaMissing = theta === null || theta === undefined;
  const exponentialShown = showExponential && !thetaMissing;
  const columns = getMetastaticSurvivalColumns({
    showObserved,
    showAdjusted,
    showExponential: exponentialShown,
    precision,
  });

  function getSettingsRows() {
    return getRecurrenceSettingsRows(params, seerData, stratumLabel, [
      ["Survival after metastatic disease at diagnosis", yesNo(showObserved)],
      ["Assumed survival after metastatic recurrence", yesNo(showAdjusted)],
      ["Exponential approximation (analytical method)", thetaMissing ? "N/A" : yesNo(showExponential)],
    ]);
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
                  Adjustment factor r = {Number(r).toFixed(precision)}; θ = {Number(theta).toFixed(precision)}
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
            showExponential={exponentialShown}
            title="Survival After Metastatic Disease"
            subtitle={stratumLabel}
            precision={precision}
          />
        </Col>
      </Row>
      <DatasetTable
        title="Survival After Metastatic Disease"
        data={sortedData}
        columns={columns}
        filename={`recurrisk-metastatic-survival-${stratumLabel || "data"}`}
        getSettingsRows={getSettingsRows}
        useColumnHeader
        useSort
        usePagination
        emptyMessage="No data available for this stratum"
      />
    </Container>
  );
}
