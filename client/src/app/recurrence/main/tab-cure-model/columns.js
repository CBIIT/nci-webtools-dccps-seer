import { catalogColumn, formatPercent } from "../table-columns";

export function getCureModelColumns({ precision = 4 }) {
  const percent = (value) => formatPercent(value, precision);
  return [
    catalogColumn("followup", "Years Since Diagnosis"),
    catalogColumn("obs_surv", "Input Net Cancer Survival", { suffix: " (%)", format: percent }),
    catalogColumn("surv_curemodel", "Fitted Net Cancer Survival", { suffix: " (%)", format: percent }),
  ];
}
