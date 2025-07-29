"use client";
import { useState, useMemo } from "react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import { makeMarkerTrace, makeAnnotation } from "@/components/plots/utils";
import Plot from "@/components/plots/survival";

export default function DevPlot({ data, params, title, subtitle, xTitle, yTitle, precision }) {
  const [fontSize, setFontSize] = useState(14);
  const [annotations, setAnnotations] = useState([]);

  const devTraces = makeMarkerTrace(
    "dev",
    "dev",
    1,
    data.map((e) => e.Interval),
    data.map((e) => e[".Dev.Resid"]),
    false,
    precision,
    fontSize
  );

  const traces = [devTraces];

  const layout = {
    title: { text: `<b>${title}</b>`, subtitle: { text: subtitle } },
    hovermode: "closest",
    font: {
      size: fontSize,
      family: "Inter, sans-serif",
    },
    xaxis: {
      title: `<b>${xTitle}</b>`,
      range: [0.5, data.length + 0.5],
      dtick: 1,
      autorange: true,
      zeroline: false,
    },
    yaxis: {
      title: `<b>${yTitle}</b>`,
      showline: true,
      dtick: 10,
      autorange: true,
      zeroline: false,
    },
    height: 700,
    autosize: true,
  };

  const layoutMemo = useMemo(() => ({ ...layout, annotations }), [layout, annotations]);

  async function addAnnotation() {
    const xMid = Math.max(...data.map((e) => e.Interval)) / 2;
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
          <Form.Group className="d-flex text-nowrap align-items-center" controlId="fontSizeSurv">
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
