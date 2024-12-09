"use client";
import { useState, useMemo } from "react";
import { groupBy } from "lodash";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import {
  makeLineTrace,
  makeMarkerTrace,
  makeDashTrace,
  makeLegendTrace,
  makeLayout,
  makeAnnotation,
} from "@/components/plots/plotUtils";
import Plot from "@/components/plots/time-plot";

export default function SurvTimePlot({
  data,
  params,
  title,
  xTitle,
  yTitle,
  observedHeader,
  predictedHeader,
  isRecalcCond,
  precision,
}) {
  const [fontSize, setFontSize] = useState(14);
  const [annotations, setAnnotations] = useState([]);
  const { statistic } = params;
  const intervals = data.map((e) => e.Interval);
  const intervalStart = Math.min(...intervals);
  const intervalEnd = Math.max(...intervals);
  const groupByYear = groupBy(data, params.year);

  const traces = Object.entries(groupByYear)
    .map(([interval, data], index) => {
      const observedTraceName = `${+interval} Observed`;
      const predictedTraceName = `${+interval} Predicted`;
      const projectedTraceName = `${+interval} Predicted`;

      if (isRecalcCond) {
        data = [{ [observedHeader]: 100, [predictedHeader]: 100 }, ...data];
      }

      const projectedStart = data.map((e) => e[observedHeader]).findIndex((e) => !e);
      const predictedData = data.slice(0, projectedStart > -1 ? projectedStart : data.length);
      const projectedData = data.slice(projectedStart > 1 ? projectedStart - 1 : projectedStart);

      const observedTraces = makeMarkerTrace(
        observedTraceName,
        interval,
        index,
        data.map((e) => e.Interval),
        data.map((e) => e[observedHeader]),
        statistic,
        precision,
        fontSize
      );
      const predictedTraces = makeLineTrace(
        predictedTraceName,
        interval,
        index,
        predictedData.map((e) => e.Interval),
        predictedData.map((e) => e[predictedHeader]),
        statistic,
        precision,
        fontSize
      );
      const projectedTraces = makeDashTrace(
        projectedTraceName,
        interval,
        index,
        projectedData.map((e) => e.Interval),
        projectedData.map((e) => e[predictedHeader]),
        statistic,
        precision,
        fontSize
      );
      const startingIntervalIndicator = makeDashTrace(
        "",
        interval,
        0,
        [intervalStart, intervalStart],
        [0, 100],
        statistic
      );

      const observedLegendTrace = makeLegendTrace(observedTraceName, interval, index, "markers");
      const predictedLegendTrace = makeLegendTrace(predictedTraceName, interval, index, "lines");
      const projectedLegendTrace = makeLegendTrace(projectedTraceName, interval, index, "lines", "dash");

      return [
        predictedTraces,
        observedTraces,
        projectedTraces,
        observedLegendTrace,
        predictedLegendTrace,
        projectedLegendTrace,
        // isRecalcCond ? startingIntervalIndicator : [],
      ];
    })
    .flat();

  const layout = makeLayout([intervalStart, intervalEnd], title, xTitle, yTitle, fontSize);
  const layoutMemo = useMemo(() => ({ ...layout, annotations }), [layout, annotations]);

  async function addAnnotation() {
    const xData = traces[0].x;
    const xMean = xData.reduce((a, b) => a + b) / xData.length;
    const yData = traces[0].y.filter(Boolean);
    const yMean = yData.reduce((a, b) => a + b) / yData.length;
    const newAnnotation = makeAnnotation(xMean, yMean + 10, annotations.length);
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
          <Form.Group className="d-flex text-nowrap align-items-center" controlId="fontSize">
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
