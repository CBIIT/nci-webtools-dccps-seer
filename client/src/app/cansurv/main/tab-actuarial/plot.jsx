"use client";
import { useState, useMemo } from "react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import {
  makeLineTrace,
  makeMarkerTrace,
  makeDashTrace,
  makeLegendTrace,
  makeLayout,
  makeAnnotation,
} from "@/components/plots/utils";
import Plot from "@/components/plots/survival";

export default function ActPlot({ data, params, title, subtitle, xTitle, yTitle, precision }) {
  const [fontSize, setFontSize] = useState(14);
  const [annotations, setAnnotations] = useState([]);

  const estTraceName = `Estimated`;
  const actTraceName = `Actuarial`;
  const cureTraceName = `Cure Fraction`;

  const estTraces = makeLineTrace(
    estTraceName,
    estTraceName,
    0,
    data.map((e) => e.Interval),
    data.map((e) => e[".Surv.Est"] * 100),
    false,
    precision,
    fontSize
  );
  const actTraces = makeMarkerTrace(
    actTraceName,
    actTraceName,
    1,
    data.map((e) => e.Interval),
    data.map((e) => e[".Surv.Act"] * 100),
    false,
    precision,
    fontSize
  );

  const cureTraces = data[0]?.[".Cure.Fraction"]
    ? makeDashTrace(
        cureTraceName,
        cureTraceName,
        2,
        data.map((e) => e.Interval),
        data.map((e) => e[".Cure.Fraction"][0] * 100),
        false,
        precision,
        fontSize
      )
    : [];

  const estLegendTrace = makeLegendTrace(estTraceName, estTraceName, 0, "lines");
  const actLegendTrace = makeLegendTrace(actTraceName, actTraceName, 1, "markers");
  const cureLegendTrace = data[0]?.[".Cure.Fraction"]
    ? makeLegendTrace(cureTraceName, cureTraceName, 2, "lines", "dash")
    : [];

  const traces = [actTraces, estTraces, cureTraces, estLegendTrace, actLegendTrace, cureLegendTrace];

  const layout = makeLayout([0, data.length + 1], title, subtitle, xTitle, yTitle, fontSize);
  const layoutMemo = useMemo(() => ({ ...layout, annotations }), [layout, annotations]);

  async function addAnnotation() {
    const xMid = data.length / 2;
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
