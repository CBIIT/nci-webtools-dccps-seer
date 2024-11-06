"use client";
import { groupBy } from "lodash";
import {
  makeLineTrace,
  makeMarkerTrace,
  makeDashTrace,
  makeLegendTrace,
  makeLayout,
} from "../../../../components/plots/plotUtils";
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
      const observedTraces = makeMarkerTrace(
        observedTraceName,
        interval,
        index,
        data.map((e) => e[params.year]),
        data.map((e) => e[observedHeader]),
        statistic
      );

      const projectedStart = data.map((e) => +e[observedHeader]).findIndex(Number.isNaN);
      const predictedData = data.slice(0, projectedStart);
      const projectedData = data.slice(projectedStart);

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

  return <Plot data={traces} layout={layout} className={className} />;
}
