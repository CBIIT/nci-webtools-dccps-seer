"use client";
import { useMemo, useState } from "react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import { colors, makeLegendTrace, makeAnnotation } from "@/components/plots/utils";
import Plot from "@/components/plots/survival";

const OBSERVED_COLOR_INDEX = 0;
const FITTED_COLOR_INDEX = 1;

export default function CureModelPlot({ data, title, subtitle, precision = 4 }) {
  const [fontSize, setFontSize] = useState(14);
  const [annotations, setAnnotations] = useState([]);

  // `data` is expected to already be sorted by followup (see cure-model.jsx).
  const sortedData = data ?? [];
  const observedData = useMemo(
    () => sortedData.filter((r) => r.obs_surv !== null && r.obs_surv !== undefined),
    [sortedData]
  );
  const fittedData = useMemo(
    () => sortedData.filter((r) => r.surv_curemodel !== null && r.surv_curemodel !== undefined),
    [sortedData]
  );

  const traces = useMemo(() => {
    const result = [];

    result.push({
      name: "Input Survival (obs_surv)",
      x: observedData.map((r) => r.followup),
      y: observedData.map((r) => r.obs_surv * 100),
      mode: "markers",
      marker: { color: colors[OBSERVED_COLOR_INDEX] },
      showlegend: false,
      legendgroup: "observed",
      type: "scatter",
      hovertemplate: [
        "<b>Input Survival</b>",
        "<br>\u2022    Years Since Diagnosis: %{x}",
        `<br>\u2022    Observed Survival: %{y:.${precision}f}%<extra></extra>`,
      ].join(""),
    });

    result.push({
      name: "Fitted Mixture Cure Model (surv_curemodel)",
      x: fittedData.map((r) => r.followup),
      y: fittedData.map((r) => r.surv_curemodel * 100),
      mode: "lines",
      line: { shape: "spline", color: colors[FITTED_COLOR_INDEX] },
      showlegend: false,
      legendgroup: "fitted",
      type: "scatter",
      hovertemplate: [
        "<b>Fitted Mixture Cure Model</b>",
        "<br>\u2022    Years Since Diagnosis: %{x}",
        `<br>\u2022    Fitted Survival: %{y:.${precision}f}%<extra></extra>`,
      ].join(""),
    });

    result.push(makeLegendTrace("Input Survival (obs_surv)", "observed", OBSERVED_COLOR_INDEX, "markers"));
    result.push(makeLegendTrace("Fitted Mixture Cure Model (surv_curemodel)", "fitted", FITTED_COLOR_INDEX, "lines"));

    return result;
  }, [observedData, fittedData, precision]);

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
      title: "<b>Years Since Diagnosis</b>",
      dtick: 1,
      range: [Math.max(0, minFollowup - 1), maxFollowup + 1],
    },
    yaxis: {
      title: "<b>Net Cancer Survival (%)</b>",
      showline: true,
      ticksuffix: "%",
      range: [0, 100],
    },
    legend: {
      orientation: "h",
      y: -0.15,
    },
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
          <Form.Group className="d-flex text-nowrap align-items-center" controlId="fontSizeCureModel">
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
