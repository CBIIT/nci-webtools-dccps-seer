"use client";
import { groupBy } from "lodash";
import {
  makeLineTrace,
  makeMarkerTrace,
  makeDashTrace,
  makeLegendTrace,
  makeLayout,
} from "@/components/plots/plotUtils";
import Plot from "@/components/plots/survival-plot";

export default function SurvYearPlot({
  data,
  params,
  title,
  xTitle,
  yTitle,
  observedHeader,
  predictedHeader,
  className = "",
}) {
  const { statistic, yearStart, yearEnd } = params;
  const groupByInterval = groupBy(data, (e) =>
    e["Start.interval"] ? `${e["Start.interval"]}-${e.Interval}` : e.Interval
  );

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
        statistic
      );
      const predictedTraces = makeLineTrace(
        predictedTraceName,
        interval,
        index,
        predictedData.map((e) => e[params.year]),
        predictedData.map((e) => e[predictedHeader]),
        statistic
      );
      const projectedTraces = makeDashTrace(
        projectedTraceName,
        interval,
        index,
        projectedData.map((e) => e[params.year]),
        projectedData.map((e) => e[predictedHeader]),
        statistic
      );

      const observedLegendTrace = makeLegendTrace(observedTraceName, interval, index, "markers", projectedStart != 0);
      const predictedLegendTrace = makeLegendTrace(predictedTraceName, interval, index, "lines", projectedStart != 0);
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

  const layout = makeLayout([yearStart, yearEnd], title, xTitle, yTitle);

  return <Plot data={traces} layout={layout} className={className} />;
}
