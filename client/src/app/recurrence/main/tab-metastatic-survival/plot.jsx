"use client";
import { useMemo, useState } from "react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import { colors, makeLegendTrace, makeAnnotation } from "@/components/plots/utils";
import Plot from "@/components/plots/survival";

const OBSERVED_COLOR_INDEX = 0;
const ADJUSTED_COLOR_INDEX = 1;
const EXPONENTIAL_COLOR_INDEX = 2;

function withDefined(rows, key) {
  return rows.filter((r) => r[key] !== null && r[key] !== undefined);
}

export default function MetastaticSurvivalPlot({
  data,
  showObserved,
  showAdjusted,
  showExponential,
  title,
  subtitle,
  precision = 4,
}) {
  const [fontSize, setFontSize] = useState(14);
  const [annotations, setAnnotations] = useState([]);

  // `data` is expected to already be sorted by followup (see metastatic-survival.jsx).
  const sortedData = data ?? [];

  const traces = useMemo(() => {
    const result = [];

    if (showObserved) {
      const rows = withDefined(sortedData, "obs_dist_surv");
      result.push({
        name: "Survival after metastatic disease at diagnosis",
        x: rows.map((r) => r.followup),
        y: rows.map((r) => r.obs_dist_surv * 100),
        mode: "lines+markers",
        line: { shape: "spline", color: colors[OBSERVED_COLOR_INDEX] },
        marker: { color: colors[OBSERVED_COLOR_INDEX] },
        showlegend: false,
        legendgroup: "observed",
        type: "scatter",
        hovertemplate: [
          "<b>Survival after metastatic disease at diagnosis</b>",
          "<br>\u2022    Years Since Metastatic Diagnosis or Recurrence: %{x}",
          `<br>\u2022    Survival: %{y:.${precision}f}%<extra></extra>`,
        ].join(""),
      });
    }

    if (showAdjusted) {
      const rows = withDefined(sortedData, "dist_surv_adjusted");
      result.push({
        name: "Assumed survival after metastatic recurrence",
        x: rows.map((r) => r.followup),
        y: rows.map((r) => r.dist_surv_adjusted * 100),
        mode: "lines",
        line: { shape: "spline", color: colors[ADJUSTED_COLOR_INDEX] },
        showlegend: false,
        legendgroup: "adjusted",
        type: "scatter",
        hovertemplate: [
          "<b>Assumed survival after metastatic recurrence</b>",
          "<br>\u2022    Years Since Metastatic Diagnosis or Recurrence: %{x}",
          `<br>\u2022    Survival: %{y:.${precision}f}%<extra></extra>`,
        ].join(""),
      });
    }

    if (showExponential) {
      const rows = withDefined(sortedData, "dist_surv_exponential");
      result.push({
        name: "Exponential approximation (analytical method)",
        x: rows.map((r) => r.followup),
        y: rows.map((r) => r.dist_surv_exponential * 100),
        mode: "lines",
        line: { shape: "spline", dash: "dash", color: colors[EXPONENTIAL_COLOR_INDEX] },
        showlegend: false,
        legendgroup: "exponential",
        type: "scatter",
        hovertemplate: [
          "<b>Exponential approximation (analytical method)</b>",
          "<br>\u2022    Years Since Metastatic Diagnosis or Recurrence: %{x}",
          `<br>\u2022    Survival: %{y:.${precision}f}%<extra></extra>`,
        ].join(""),
      });
    }

    if (showObserved)
      result.push(
        makeLegendTrace("Survival after metastatic disease at diagnosis", "observed", OBSERVED_COLOR_INDEX, "lines+markers")
      );
    if (showAdjusted)
      result.push(makeLegendTrace("Assumed survival after metastatic recurrence", "adjusted", ADJUSTED_COLOR_INDEX, "lines"));
    if (showExponential)
      result.push(
        makeLegendTrace("Exponential approximation (analytical method)", "exponential", EXPONENTIAL_COLOR_INDEX, "lines", "dash")
      );

    return result;
  }, [sortedData, showObserved, showAdjusted, showExponential, precision]);

  const followups = sortedData.map((r) => r.followup);
  const maxFollowup = followups.length ? Math.max(...followups) : 1;
  const minFollowup = followups.length ? Math.min(...followups) : 0;

  const layout = {
    title: { text: `<b>${title}</b>`, subtitle: { text: subtitle } },
    hovermode: "closest",
    font: {
      size: fontSize,
      family: "Inter, sans-serif",
    },
    xaxis: {
      title: "<b>Years Since Metastatic Diagnosis or Recurrence</b>",
      dtick: 1,
      range: [Math.max(0, minFollowup - 1), maxFollowup + 1],
      automargin: true,
    },
    yaxis: {
      title: "<b>Survival (%)</b>",
      showline: true,
      ticksuffix: "%",
      range: [0, 100],
    },
    legend: {
      orientation: "h",
      y: -0.15,
    },
    margin: { b: 160 },
    height: 700,
    autosize: true,
  };

  const layoutMemo = useMemo(() => ({ ...layout, annotations }), [layout, annotations]);

  async function addAnnotation() {
    const xMid = maxFollowup / 2;
    const newAnnotation = makeAnnotation(xMid, 50, annotations.length);
    setAnnotations([...annotations, newAnnotation]);
  }
  async function removeAnnotation(index) {
    setAnnotations(annotations.slice(0, index).concat(annotations.slice(index + 1)));
  }

  return (
    <Container>
      <Row>
        <Col sm="auto">
          <Button variant="link" onClick={addAnnotation}>
            + Add Annotation
          </Button>
        </Col>
        <Col sm="auto">
          <Form.Group className="d-flex text-nowrap align-items-center" controlId="fontSizeMetastaticSurvival">
            <Form.Label className="me-2">Font Size</Form.Label>
            <Form.Control
              type="number"
              defaultValue={14}
              min={12}
              max={20}
              onChange={(e) => setFontSize(e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>
      <Plot data={traces} layout={layoutMemo} removeAnnotation={removeAnnotation} />
    </Container>
  );
}
