"use client";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";

export default function ActTable({ data, formState, seerData, valueToLabelMap, precision }) {
  const { stratum, ...subStratum } = formState;
  const columnHelper = createColumnHelper();
  const columns = [
    columnHelper.display({
      id: "stratum",
      header: () => "Stratum",
      cell: valueToLabelMap.stratum[formState.stratum],
    }),
    ...seerData.cohortVariables
      .filter((e) => Object.keys(subStratum).includes(e.name))
      .map((e) =>
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
    ...(data[0]?.[".Cure.Fraction"]
      ? [
          columnHelper.accessor((e) => e[".Cure.Fraction"], {
            id: "cure-fraction",
            header: `Cure Fraction (%)`,
            cell: (info) => (info.getValue() ? (info.getValue()[0] * 100).toFixed(precision) : "NA"),
          }),
        ]
      : []),
  ];

  return <Table data={data} columns={columns} />;
}
