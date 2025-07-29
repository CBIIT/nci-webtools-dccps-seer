"use client";
import { useState, useMemo } from "react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import { makeMarkerTrace, makeAnnotation } from "@/components/plots/utils";
import Plot from "@/components/plots/survival";

export default function LoglikePlot({ data, title, subtitle, xTitle, yTitle, precision }) {
  const [fontSize, setFontSize] = useState(14);
  const [annotations, setAnnotations] = useState([]);

  const markerTraces = makeMarkerTrace(
    0,
    0,
    0,
    data.map((e) => e[0]),
    data.map((e) => e[1]),
    false,
    precision,
    fontSize
  );

  const traces = [markerTraces];

  const layout = {
    title: { text: `<b>${title}</b>`, subtitle: { text: subtitle } },
    hovermode: "closest",
    font: {
      size: fontSize,
      family: "Inter, sans-serif",
    },
    xaxis: {
      title: `<b>${xTitle}</b>`,
      range: [-0.05, 1.05],
      dtick: 0.1,
      zeroline: false,
    },
    yaxis: {
      title: `<b>${yTitle}</b>`,
      showline: true,
      // autorange: true,
      // dtick: 10,
      zeroline: false,
      // type: "log",
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
