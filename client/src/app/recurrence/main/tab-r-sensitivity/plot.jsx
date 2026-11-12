"use client";
import { useMemo, useState } from "react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import { colors, makeLegendTrace, makeAnnotation } from "@/components/plots/utils";
import Plot from "@/components/plots/survival";

function formatR(r) {
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export default function RSensitivityPlot({ followups, series, title, subtitle, precision = 4 }) {
  const [fontSize, setFontSize] = useState(14);
  const [annotations, setAnnotations] = useState([]);

  const traces = useMemo(() => {
    const result = [];

    series.forEach((s, index) => {
      const colorIndex = index % 10;
      const label = s.isModel ? `r = ${formatR(s.r)} (model)` : `r = ${formatR(s.r)}`;
      const points = followups
        .map((followup, i) => ({ followup, value: s.values[i] }))
        .filter((p) => p.value !== null && p.value !== undefined);

      result.push({
        name: label,
        x: points.map((p) => p.followup),
        y: points.map((p) => p.value * 100),
        mode: "lines",
        line: { shape: "spline", color: colors[colorIndex], width: s.isModel ? 3 : 2 },
        showlegend: false,
        legendgroup: `r-${s.r}`,
        type: "scatter",
        hovertemplate: [
          `<b>${label}</b>`,
          "<br>\u2022    Years Since Diagnosis: %{x}",
          `<br>\u2022    Net Recurrence Risk: %{y:.${precision}f}%<extra></extra>`,
        ].join(""),
      });

      result.push(makeLegendTrace(label, `r-${s.r}`, colorIndex, "lines"));
    });

    return result;
  }, [series, followups, precision]);

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
      title: "<b>Net Metastatic Recurrence Risk (%)</b>",
      showline: true,
      ticksuffix: "%",
      rangemode: "tozero",
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
          <Form.Group className="d-flex text-nowrap align-items-center" controlId="fontSizeRSensitivity">
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
