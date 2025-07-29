"use client";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";

export default function KYearTable({ data, seerData, valueToLabelMap, precision }) {
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
    columnHelper.accessor("Relative_Survival_Cum", {
      header: () => "Observed (%)",
      cell: (info) => (info.getValue() ? (info.getValue() * 100).toFixed(precision) : "NA"),
    }),
    columnHelper.accessor((e) => e[".Surv.Est"], {
      id: "estimated-survival",
      header: () => "Estimated (%)",
      cell: (info) => (info.getValue() ? (info.getValue() * 100).toFixed(precision) : "NA"),
    }),
  ];

  return <Table data={data} columns={columns} />;
}
