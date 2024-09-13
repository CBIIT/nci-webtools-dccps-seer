"use client";
import dynamic from "next/dynamic";
import { Container, Row, Col } from "react-bootstrap";
import { groupBy } from "lodash";
import { makeLineTrace, makeMarkerTrace, makeDashTrace, makeLegendTrace, makeLayout } from "./plotUtils";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
});

export default function SurvYearPlot({ data, seerData, params, title, xTitle, yTitle }) {
  const precision = 2;
  const statistic = seerData?.config["Session Options"]["Statistic"];
  const yearStart = +seerData.seerStatDictionary.filter((e) => e.name === params.year)[0]["factors"][0].label;
  const yearEnd = +seerData.seerStatDictionary.filter((e) => e.name === params.year)[0]["factors"].at(-1).label;
  const observedHeader = params?.observed;
  const predictedHeader = "pred_cum";
  const groupByInterval = groupBy(data, "Interval");

  const traces = Object.entries(groupByInterval)
    .map(([interval, data], index) => {
      const observedTraceName = `${interval}-year Observed`;
      const predictedTraceName = `${interval}-year Predicted`;
      const projectedTraceName = `${interval}-year Projected`;
      const observedTraces = makeMarkerTrace(
        observedTraceName,
        interval,
        index,
        data.map((e) => e[params.year] + yearStart),
        data.map((e) => e[observedHeader]),
        statistic,
        precision
      );

      const projectedStart = data.map((e) => +e[observedHeader]).findIndex(Number.isNaN);
      const predictedData = data.slice(0, projectedStart);
      const projectedData = data.slice(projectedStart);

      const predictedTraces = makeLineTrace(
        predictedTraceName,
        interval,
        index,
        predictedData.map((e) => e[params.year] + yearStart),
        predictedData.map((e) => e[predictedHeader]),
        statistic,
        precision
      );
      const projectedTraces = makeDashTrace(
        projectedTraceName,
        interval,
        index,
        projectedData.map((e) => e[params.year] + yearStart),
        projectedData.map((e) => e[predictedHeader]),
        statistic,
        precision
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
      ];
    })
    .flat();

  const layout = makeLayout([yearStart, yearEnd], title, xTitle, yTitle);

  return (
    <Container fluid style={{ minHeight: layout.height || 500 }} className="border rounded">
      <Row>
        <Col>
          <Plot
            className={`w-100 $`}
            style={{ minHeight: layout.height || 500 }}
            divId={"survival"}
            data={traces}
            layout={layout}
            config={{
              displayModeBar: true,
              responsive: true,
              displaylogo: false,
              toImageButtonOptions: {
                format: "svg",
                // filename: filename || divId,
                scale: 1,
              },
            }}
            useResizeHandler
          />
        </Col>
      </Row>
      <Row className="p-3 d-flex justify-content-end">
        {/* <Col sm="auto">
              <Button
                variant="link"
                onClick={() =>
                  downloadImage(divId, {
                    format: 'png',
                    filename: filename,
                  })
                }
              >
                Download PNG
              </Button>
            </Col>
            <Col sm="auto">
              <Button
                variant="link"
                onClick={() =>
                  downloadImage(divId, {
                    format: 'svg',
                    filename: filename,
                  })
                }
              >
                Download SVG
              </Button>
            </Col> */}
        {/* {originalData && (
          <Col sm="auto">
            <Button
              variant="link"
              className="ml-auto m-0"
              onClick={() => handleSaveCSV(originalData, `${filename || divId}.csv`)}>
              Download Data
            </Button>
          </Col>
        )}
        <Col sm="auto m-1">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() =>
              saveAs(
                new Blob([JSON.stringify({ traces: data, layout })], {
                  type: "application/json",
                }),
                `${filename}.json`
              )
            }>
            Download Plotly Data &gt;
          </Button>
        </Col> */}
      </Row>
    </Container>
  );
}
