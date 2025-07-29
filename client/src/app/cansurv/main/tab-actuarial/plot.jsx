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

  const estTraceName = "Estimated";
  const obsTraceName = "Observed Actuarial";
  const cureTraceName = "Cure Fraction";

  const estTraces = makeLineTrace(
    estTraceName,
    estTraceName,
    0,
    [0, ...data.map((e) => e.Interval)],
    [100, ...data.map((e) => e[".Surv.Est"] * 100)],
    false,
    precision,
    fontSize
  );
  const obsTraces = makeMarkerTrace(
    obsTraceName,
    obsTraceName,
    1,
    [0, ...data.map((e) => e.Interval)],
    [100, ...data.map((e) => e["Relative_Survival_Cum"] * 100)],
    false,
    precision,
    fontSize
  );

  const cureFraction = data[0]?.[".Cure.Fraction"] ? data[0][".Cure.Fraction"][0] : 0;
  const cureThreshold = 0.0001; // lower limit for displaying the cure fraction to avoid cluttering the plot with a line at 0
  const cureTraces =
    cureFraction > cureThreshold
      ? makeDashTrace(
          cureTraceName,
          cureTraceName,
          2,
          [0, ...data.map((e) => e.Interval)],
          [cureFraction * 100, ...data.map((_) => cureFraction * 100)],
          false,
          precision,
          fontSize
        )
      : [];

  const estLegendTrace = makeLegendTrace(estTraceName, estTraceName, 0, "lines");
  const actLegendTrace = makeLegendTrace(obsTraceName, obsTraceName, 1, "markers");
  const cureLegendTrace =
    cureFraction > cureThreshold ? makeLegendTrace(cureTraceName, cureTraceName, 2, "lines", "dash") : [];

  const traces = [obsTraces, estTraces, cureTraces, estLegendTrace, actLegendTrace, cureLegendTrace];

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
