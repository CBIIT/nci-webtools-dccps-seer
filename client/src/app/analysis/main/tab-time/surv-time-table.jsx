"use client";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";

export default function SurvTimeTable({
  data,
  params,
  observedHeader,
  predictedHeader,
  isRecalcCond = false,
}) {
  const { firstYear } = params;
  const columnHelper = createColumnHelper();
  const columns = [
    columnHelper.accessor(params.year, {
      header: () => "Year of Diagnosis",
      cell: (info) => info.getValue() + firstYear,
    }),
    columnHelper.accessor("Interval", {
      header: () => "Interval",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor(observedHeader, {
      header: () => `${isRecalcCond ? "Conditional" : ""} Cumulative Relative Survival (%)`,
      cell: (info) => info.renderValue(),
    }),

    columnHelper.accessor(predictedHeader, {
      header: `Predicted ${isRecalcCond ? "Conditional" : ""} Cumulative Relative Survival (%)`,
      cell: (info) => info.renderValue(),
    }),
  ];

  return <Table data={data} columns={columns} />;
}
