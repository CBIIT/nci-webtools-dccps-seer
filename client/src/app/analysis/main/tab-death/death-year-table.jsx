"use client";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";

export default function DeathYearTable({
  data,
  seerData,
  params,
  observedHeader,
  observedSeHeader,
  predictedHeader,
  predictedSeHeader,
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
      header: () => "Observed Prob. of Death Interval (%)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor(observedSeHeader, {
      header: () => "Observed Prob. of Death Interval Std. Err. (%)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor(predictedHeader, {
      header: "Predictive Prob. of Death Interval (%)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor(predictedSeHeader, {
      header: "Predictive Prob. of Death Interval Std. Err. (%)",
      cell: (info) => info.renderValue(),
    }),
  ];

  return <Table data={data} columns={columns} />;
}
