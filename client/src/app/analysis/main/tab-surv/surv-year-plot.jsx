"use client";
import { groupBy } from "lodash";
import {
  makeLineTrace,
  makeMarkerTrace,
  makeDashTrace,
  makeLegendTrace,
  makeLayout,
} from "../../../../components/plots/plotUtils";
import Plotly from "@/components/plots/plot";

export default function SurvYearPlot({ data, seerData, params, title, xTitle, yTitle, className = "" }) {
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

  return <Plotly data={traces} layout={layout} />;
}
