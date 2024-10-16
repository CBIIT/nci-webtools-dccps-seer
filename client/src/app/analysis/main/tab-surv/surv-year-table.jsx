"use client";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";

export default function SurvYearTable({
  data,
  seerData,
  params,
  observedHeader,
  observedSeHeader,
  predictedHeader,
  predictedSeHeader,
  isRecalcCond = false,
}) {
  const yearStart = +seerData.seerStatDictionary.filter((e) => e.name === params.year)[0]["factors"][0].label;
  const statistic = seerData?.config["Session Options"]["Statistic"];

  const columnHelper = createColumnHelper();
  const columns = [
    columnHelper.accessor(params.year, {
      header: () => "Year of Diagnosis",
      cell: (info) => info.getValue() + yearStart,
    }),
    columnHelper.accessor("Interval", {
      header: () => "Interval",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor(observedHeader, {
      header: () => (isRecalcCond ? `Conditional ${statistic} (%)` : "Relative Survival Cumulative (%)"),
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor(observedSeHeader, {
      header: () =>
        isRecalcCond ? `Conditional ${statistic} Std. Err. (%)` : "Relative Survival Cumulative Std. Err. (%)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor(predictedHeader, {
      header: `Predicted ${isRecalcCond ? "Conditional" : ""} Cumulative Survival (%)`,
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor(predictedSeHeader, {
      header: `Predicted ${isRecalcCond ? "Conditional" : ""} Cumulative Survival Std. Err. (%)`,
      cell: (info) => info.renderValue(),
    }),
  ];

  return <Table data={data} columns={columns} />;
}
