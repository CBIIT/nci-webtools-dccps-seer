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
  colors,
} from "@/components/plots/utils";
import Plot from "@/components/plots/survival";
import { DeathYearPlotProps } from "./types";

export default function DeathYearPlot({
  data,
  trendData,
  params,
  title,
  subtitle,
  xTitle,
  yTitle,
  observedHeader,
  predictedHeader,
  precision,
}: DeathYearPlotProps) {
  const [fontSize, setFontSize] = useState<number>(14);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const { statistic, yearStart, yearEnd } = params;
  const groupByInterval = groupBy(data, "Interval");

  const traces = Object.entries(groupByInterval)
    .map(([interval, data], index) => {
      const observedTraceName = `${interval}-year Observed`;
      const predictedTraceName = `${interval}-year Predicted`;
      const projectedTraceName = `${interval}-year Projected`;
      const projectedStart = data.map((e) => e[observedHeader]).findIndex((e) => !e);
      const predictedData = data.slice(0, projectedStart > -1 ? projectedStart : data.length);
      const projectedData = data.slice(projectedStart > 1 ? projectedStart - 1 : projectedStart);

      const observedTraces = makeMarkerTrace(
        observedTraceName,
        interval,
        index,
        data.map((e) => e[params.year]),
        data.map((e) => e[observedHeader]),
        statistic,
        precision,
        fontSize
      );

      const predictedTraces = makeLineTrace(
        predictedTraceName,
        interval,
        index,
        predictedData.map((e) => e[params.year]),
        predictedData.map((e) => e[predictedHeader]),
        statistic,
        precision,
        fontSize
      );
      const projectedTraces = makeDashTrace(
        projectedTraceName,
        interval,
        index,
        projectedData.map((e) => e[params.year]),
        projectedData.map((e) => e[predictedHeader]),
        statistic,
        precision,
        fontSize
      );

      const observedLegendTrace = makeLegendTrace(observedTraceName, interval, index, "markers");
      const predictedLegendTrace = makeLegendTrace(predictedTraceName, interval, index, "lines");
      const projectedLegendTrace = makeLegendTrace(
        projectedTraceName,
        interval,
        index,
        "lines",
        "dash",
        projectedStart > -1
      );

      return [
        predictedTraces,
        observedTraces,
        projectedTraces,
        observedLegendTrace,
        predictedLegendTrace,
        projectedLegendTrace,
      ];
    })
    .flat();

  const trendAnnotations = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];
    return Object.entries(groupBy(trendData, "interval")).flatMap(([interval, trends], intervalIndex) =>
      trends.map((trend: any, index: number) => {
        const { "start.year": startYear, "end.year": endYear, estimate } = trend;
        const intervalData = groupByInterval[interval] || [];
        const midIndex = startYear + Math.floor((endYear - startYear) / 2);
        const dataPoint = intervalData[midIndex] || {};

        return makeAnnotation(
          params.firstYear + startYear + (endYear - startYear) / 2,
          Math.max(dataPoint[observedHeader] || 0, dataPoint[predictedHeader] || 0) + 3,
          index,
          estimate.toFixed(precision),
          colors[intervalIndex % 10],
          { captureevents: false }
        );
      })
    );
  }, [trendData, groupByInterval, observedHeader, predictedHeader, precision, params.firstYear]);

  const layout = makeLayout([yearStart, yearEnd], title, subtitle, xTitle, yTitle, fontSize);
  const layoutMemo = useMemo(
    () => ({
      ...layout,
      annotations: [...annotations, ...trendAnnotations],
    }),
    [layout, annotations, trendAnnotations]
  );

  async function addAnnotation(): Promise<void> {
    const xMid = params.firstYear + (params.yearStart + params.yearEnd) / 2;
    const newAnnotation = makeAnnotation(xMid, 50, annotations.length);
    setAnnotations([...annotations, newAnnotation]);
  }
  async function removeAnnotation(index: number): Promise<void> {
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
          <Form.Group className="d-flex text-nowrap align-items-center" controlId="fontSizeDeath">
            <Form.Label className="me-2">Font Size</Form.Label>
            <Form.Control
              type="number"
              defaultValue={14}
              min={12}
              max={20}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
          </Form.Group>
        </Col>
      </Row>
      <Plot data={traces} layout={layoutMemo} removeAnnotation={removeAnnotation} />
    </Container>
  );
}
