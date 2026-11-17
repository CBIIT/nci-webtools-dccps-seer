import { catalogColumn, formatPercent } from "../table-columns";

export function getMetastaticSurvivalColumns({ showObserved, showAdjusted, showExponential, precision = 4 }) {
  const percent = (value) => formatPercent(value, precision);
  return [
    { id: "followup", label: "Years Since Metastatic Diagnosis or Recurrence", getValue: (row) => row.followup },
    ...(showObserved
      ? [
          catalogColumn("obs_dist_surv", "Survival after metastatic disease at diagnosis", {
            suffix: " (%)",
            format: percent,
          }),
        ]
      : []),
    ...(showAdjusted
      ? [
          catalogColumn("dist_surv_adjusted", "Assumed survival after metastatic recurrence", {
            suffix: " (%)",
            format: percent,
          }),
        ]
      : []),
    ...(showExponential
      ? [
          catalogColumn("dist_surv_exponential", "Exponential approximation of survival after recurrence", {
            suffix: " (%)",
            format: percent,
          }),
        ]
      : []),
  ];
}
