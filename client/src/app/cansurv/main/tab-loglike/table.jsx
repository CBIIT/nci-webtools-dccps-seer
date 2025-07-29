"use client";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";

export default function LoglikeTable({ data, seerData, valueToLabelMap, precision }) {
  const { cohortVariables } = seerData;
  const columnHelper = createColumnHelper();
  const columns = [
    columnHelper.accessor((e) => e[0], {
      id: "cureFraction",
      header: () => "Cure Fraction C",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor((e) => e[1], {
      id: "ll",
      header: () => "Log(L)",

      cell: (info) => {
        const value = info.getValue();
        return !isNaN(value) ? info.getValue().toFixed(precision) : "NA";
      },
    }),
  ];

  return <Table data={data} columns={columns} />;
}
