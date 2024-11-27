"use client";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";

export default function SurvTimeTable({
  data,
  params,
  observedHeader,
  predictedHeader,
  isRecalcCond = false,
  precision,
}) {
  const columnHelper = createColumnHelper();
  const columns = [
    ...params.cohorts.map((cohort) =>
      columnHelper.accessor(cohort.name, {
        header: () => cohort.label,
        cell: (info) => info.getValue(),
      })
    ),
    columnHelper.accessor(params.year, {
      header: () => "Year of Diagnosis",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("Interval", {
      header: () => "Interval",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor(observedHeader, {
      header: () => `${isRecalcCond ? "Conditional" : ""} Cumulative Relative Survival (%)`,
      cell: (info) => (info.getValue() ? info.getValue().toFixed(precision) : "NA"),
    }),

    columnHelper.accessor(predictedHeader, {
      header: `Predicted ${isRecalcCond ? "Conditional" : ""} Cumulative Relative Survival (%)`,
      cell: (info) => (info.getValue() ? info.getValue().toFixed(precision) : "NA"),
    }),
  ];

  return <Table data={data} columns={columns} />;
}
