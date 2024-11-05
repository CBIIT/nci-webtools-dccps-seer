"use client";
import { groupBy } from "lodash";
import { makeLineTrace, makeMarkerTrace, makeLegendTrace, makeLayout } from "../../../../components/plots/plotUtils";
import Plot from "@/components/plots/time-plot";

export default function SurvTimePlot({
  data,
  params,
  title,
  xTitle,
  yTitle,
  observedHeader,
  predictedHeader,
  className = "",
}) {
  const { statistic, firstYear } = params;
  const intervalStart = Math.min(data.map((e) => e.Interval));
  const intervalEnd = Math.max(data.map((e) => e.Interval));
  const groupByYear = groupBy(data, params.year);

  const traces = Object.entries(groupByYear)
    .map(([interval, data], index) => {
      const observedTraceName = `${+interval + firstYear} Observed`;
      const predictedTraceName = `${+interval + firstYear} Predicted`;

      const observedTraces = makeMarkerTrace(
        observedTraceName,
        interval,
        index,
        data.map((e) => e.Interval),
        data.map((e) => e[observedHeader]),
        statistic
      );

      const predictedTraces = makeLineTrace(
        predictedTraceName,
        interval,
        index,
        data.map((e) => e.Interval),
        data.map((e) => e[predictedHeader]),
        statistic
      );

      const observedLegendTrace = makeLegendTrace(observedTraceName, interval, index, "markers");
      const predictedLegendTrace = makeLegendTrace(predictedTraceName, interval, index, "lines");

      return [predictedTraces, observedTraces, observedLegendTrace, predictedLegendTrace];
    })
    .flat();

  const layout = makeLayout([intervalStart, intervalEnd], title, xTitle, yTitle);

  return <Plot data={traces} layout={layout} className={className} />;
}
