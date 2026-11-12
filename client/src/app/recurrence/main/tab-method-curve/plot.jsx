"use client";
import { useMemo, useState } from "react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import { colors, hexToRgba, makeLegendTrace, makeAnnotation } from "@/components/plots/utils";
import Plot from "@/components/plots/survival";
import { hasNumericalEstimate } from "./utils";

const ANALYTICAL_COLOR_INDEX = 0;
const NUMERICAL_COLOR_INDEX = 1;

export default function MethodCurvePlot({ config, data, method, showBand, title, subtitle, precision = 4 }) {
  const [fontSize, setFontSize] = useState(14);
  const [annotations, setAnnotations] = useState([]);

  const { analyticalKey, numericalKey, getCI, valueLabel, seriesSuffix, yAxis } = config;
  const analyticalName = `Analytical${seriesSuffix}`;
  const numericalName = `Numerical${seriesSuffix}`;

  // `data` is expected to already be sorted by followup (see method-curve.jsx).
  const sortedData = data ?? [];
  const numericalData = useMemo(
    () => sortedData.filter((r) => hasNumericalEstimate(r, numericalKey)),
    [sortedData, numericalKey]
  );

  const showAnalytical = method === "analytical" || method === "both";
  const showNumerical = method === "numerical" || method === "both";
  const canShowBand = Boolean(getCI) && showAnalytical && showBand;

  const traces = useMemo(() => {
    const result = [];

    if (canShowBand) {
      const x = sortedData.map((r) => r.followup);
      const upperY = sortedData.map((r) => (getCI(r)?.[1] ?? r[analyticalKey]) * 100);
      const lowerY = sortedData.map((r) => (getCI(r)?.[0] ?? r[analyticalKey]) * 100);

      result.push({
        name: `95% CI upper bound (${analyticalName})`,
        x,
        y: upperY,
        mode: "lines",
        line: { width: 0, color: colors[ANALYTICAL_COLOR_INDEX] },
        hoverinfo: "skip",
        showlegend: false,
        legendgroup: "analytical-band",
        type: "scatter",
      });
      result.push({
        name: `95% CI (${analyticalName})`,
        x,
        y: lowerY,
        mode: "lines",
        line: { width: 0, color: colors[ANALYTICAL_COLOR_INDEX] },
        fill: "tonexty",
        fillcolor: hexToRgba(colors[ANALYTICAL_COLOR_INDEX], 0.2),
        hoverinfo: "skip",
        showlegend: false,
        legendgroup: "analytical-band",
        type: "scatter",
      });
    }

    if (showAnalytical) {
      result.push({
        name: analyticalName,
        x: sortedData.map((r) => r.followup),
        y: sortedData.map((r) => r[analyticalKey] * 100),
        customdata: sortedData.map((r) => {
          const ci = getCI ? getCI(r) : null;
          return ci ? [ci[0] * 100, ci[1] * 100] : [null, null];
        }),
        mode: "lines",
        line: { shape: "spline", color: colors[ANALYTICAL_COLOR_INDEX] },
        showlegend: false,
        legendgroup: "analytical",
        type: "scatter",
        hovertemplate: canShowBand
          ? [
              `<b>${analyticalName}</b>`,
              "<br>\u2022    Years Since Diagnosis: %{x}",
              `<br>\u2022    ${valueLabel}: %{y:.${precision}f}%`,
              `<br>\u2022    95% CI: %{customdata[0]:.${precision}f}% \u2013 %{customdata[1]:.${precision}f}%<extra></extra>`,
            ].join("")
          : [
              `<b>${analyticalName}</b>`,
              "<br>\u2022    Years Since Diagnosis: %{x}",
              `<br>\u2022    ${valueLabel}: %{y:.${precision}f}%<extra></extra>`,
            ].join(""),
      });
    }

    if (showNumerical) {
      result.push({
        name: numericalName,
        x: numericalData.map((r) => r.followup),
        y: numericalData.map((r) => r[numericalKey] * 100),
        mode: "lines",
        line: { shape: "spline", color: colors[NUMERICAL_COLOR_INDEX] },
        showlegend: false,
        legendgroup: "numerical",
        type: "scatter",
        hovertemplate: [
          `<b>${numericalName}</b>`,
          "<br>\u2022    Years Since Diagnosis: %{x}",
          `<br>\u2022    ${valueLabel}: %{y:.${precision}f}%<extra></extra>`,
        ].join(""),
      });
    }

    if (showAnalytical) result.push(makeLegendTrace(analyticalName, "analytical", ANALYTICAL_COLOR_INDEX, "lines"));
    if (showNumerical) result.push(makeLegendTrace(numericalName, "numerical", NUMERICAL_COLOR_INDEX, "lines"));
    if (canShowBand) {
      result.push({
        name: `95% CI (${analyticalName})`,
        x: [null],
        y: [null],
        mode: "lines",
        fill: "toself",
        fillcolor: hexToRgba(colors[ANALYTICAL_COLOR_INDEX], 0.2),
        line: { color: hexToRgba(colors[ANALYTICAL_COLOR_INDEX], 0.2) },
        showlegend: true,
        legendgroup: "analytical-band",
        type: "scatter",
      });
    }

    return result;
  }, [
    sortedData,
    numericalData,
    showAnalytical,
    showNumerical,
    canShowBand,
    precision,
    analyticalKey,
    numericalKey,
    getCI,
    analyticalName,
    numericalName,
    valueLabel,
  ]);

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
      title: `<b>${yAxis.title}</b>`,
      showline: true,
      ticksuffix: "%",
      ...(yAxis.rangemode ? { rangemode: yAxis.rangemode } : {}),
      ...(yAxis.range ? { range: yAxis.range } : {}),
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
          <Form.Group className="d-flex text-nowrap align-items-center" controlId={`fontSize-${config.id}`}>
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
