"use client";
import { groupBy } from "lodash";
import {
  makeLineTrace,
  makeMarkerTrace,
  makeDashTrace,
  makeLegendTrace,
  makeLayout,
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
  className = "",
}) {
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
        precision
      );
      const predictedTraces = makeLineTrace(
        predictedTraceName,
        interval,
        index,
        predictedData.map((e) => e.Interval),
        predictedData.map((e) => e[predictedHeader]),
        statistic,
        precision
      );
      const projectedTraces = makeDashTrace(
        projectedTraceName,
        interval,
        index,
        projectedData.map((e) => e.Interval),
        projectedData.map((e) => e[predictedHeader]),
        statistic,
        precision
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

  const layout = makeLayout([intervalStart, intervalEnd], title, xTitle, yTitle);

  return <Plot data={traces} layout={layout} className={className} />;
}
