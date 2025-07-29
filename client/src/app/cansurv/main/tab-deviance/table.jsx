"use client";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";

export default function DevTable({ data, seerData, valueToLabelMap, precision }) {
  const { cohortVariables } = seerData;
  const columnHelper = createColumnHelper();
  const columns = [
    ...cohortVariables.map((e) =>
      columnHelper.accessor(e.name, {
        header: () => e.label,
        cell: (info) => valueToLabelMap[e.name][info.getValue()],
      })
    ),
    columnHelper.accessor("Interval", {
      header: () => "Time Since Diagnosis",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor((e) => e[".Dev.Resid"], {
      id: "dev",
      header: () => "Deviance Residuals",
      cell: (info) => (info.getValue() ? info.getValue().toFixed(precision) : "NA"),
    }),
  ];

  return <Table data={data} columns={columns} />;
}
