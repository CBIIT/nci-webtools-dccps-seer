// Shared by the JPSurv tables and their "Download Graph Dataset" exports

function formatValue(precision) {
  // Falsy values (including 0) display as "NA", matching the original table cells
  return (value) => (value ? value.toFixed(precision) : "NA");
}

function getBaseColumns(params) {
  return [
    ...(params.cohorts || []).map((cohort) => ({
      id: cohort.name,
      label: cohort.label,
      getValue: (row) => row[cohort.name],
    })),
    { id: params.year, label: "Year of Diagnosis", getValue: (row) => row[params.year] },
    { id: "Interval", label: "Time Since Diagnosis", getValue: (row) => row.Interval },
  ];
}

function valueColumn(key, label, precision) {
  return { id: key, label, getValue: (row) => row[key], format: formatValue(precision) };
}

export function getSurvYearColumns({
  params,
  observedHeader,
  observedSeHeader,
  predictedHeader,
  predictedSeHeader,
  isRecalcCond = false,
  precision,
}) {
  const { statistic } = params;
  const predicted = isRecalcCond ? "Predicted Conditional" : "Predicted";
  return [
    ...getBaseColumns(params),
    valueColumn(
      observedHeader,
      isRecalcCond ? `Conditional ${statistic} (%)` : "Relative Survival Cumulative (%)",
      precision
    ),
    valueColumn(
      observedSeHeader,
      isRecalcCond ? `Conditional ${statistic} Std. Err. (%)` : "Relative Survival Cumulative Std. Err. (%)",
      precision
    ),
    valueColumn(predictedHeader, `${predicted} Cumulative Survival (%)`, precision),
    valueColumn(predictedSeHeader, `${predicted} Cumulative Survival Std. Err. (%)`, precision),
  ];
}

export function getDeathYearColumns({
  params,
  observedHeader,
  observedSeHeader,
  predictedHeader,
  predictedSeHeader,
  precision,
}) {
  return [
    ...getBaseColumns(params),
    valueColumn(observedHeader, "Observed Prob. of Death Interval (%)", precision),
    valueColumn(observedSeHeader, "Observed Prob. of Death Interval Std. Err. (%)", precision),
    valueColumn(predictedHeader, "Predictive Prob. of Death Interval (%)", precision),
    valueColumn(predictedSeHeader, "Predictive Prob. of Death Interval Std. Err. (%)", precision),
  ];
}

export function getSurvTimeColumns({ params, observedHeader, predictedHeader, isRecalcCond = false, precision }) {
  return [
    ...getBaseColumns(params),
    valueColumn(
      observedHeader,
      isRecalcCond ? "Conditional Cumulative Relative Survival (%)" : "Cumulative Relative Survival (%)",
      precision
    ),
    valueColumn(
      predictedHeader,
      `${isRecalcCond ? "Predicted Conditional" : "Predicted"} Cumulative Relative Survival (%)`,
      precision
    ),
  ];
}
