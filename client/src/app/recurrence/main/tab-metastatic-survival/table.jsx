"use client";
import { useMemo } from "react";
import Table from "@/components/table";
import { toTableColumns } from "@/components/column-spec";
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

export default function MetastaticSurvivalTable({ data, showObserved, showAdjusted, showExponential, precision = 4 }) {
  const columns = useMemo(
    () =>
      toTableColumns(getMetastaticSurvivalColumns({ showObserved, showAdjusted, showExponential, precision }), {
        useColumnHeader: true,
      }),
    [showObserved, showAdjusted, showExponential, precision]
  );

  return (
    <Table data={data} columns={columns} useSort usePagination emptyMessage="No data available for this stratum" />
  );
}
