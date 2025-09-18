"use client";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";
import { TrendTableProps, TrendDataPoint } from "../types";

export default function TrendTable({ data, params, precision }: TrendTableProps) {
  const { firstYear } = params;
  const columnHelper = createColumnHelper<TrendDataPoint>();

  const columns = [
    columnHelper.accessor("interval", {
      header: () => "Time Since Diagnosis",
      cell: (d) => d.getValue(),
    }),
    columnHelper.accessor((row) => row["start.year"], {
      id: "startYear",
      header: () => "Start Year",
      cell: (d) => d.getValue() + firstYear,
    }),
    columnHelper.accessor((row) => row["end.year"], {
      id: "endYear",
      header: () => "End Year",
      cell: (d) => d.getValue() + firstYear,
    }),
    columnHelper.accessor("estimate", {
      header: () => "Estimate pp",
      cell: (info) => {
        const value = info.getValue();
        return value && typeof value === 'number' ? value.toFixed(precision) : "NA";
      },
    }),
    columnHelper.accessor("lowCI", {
      header: () => "Lower Limit 95% C.I.",
      cell: (info) => {
        const value = info.getValue();
        if (!value) return "NA";
        const numValue = Array.isArray(value) ? value[0] : value;
        return numValue.toFixed(precision);
      },
    }),
    columnHelper.accessor("upCI", {
      header: () => "Upper Limit 95% C.I.",
      cell: (info) => {
        const value = info.getValue();
        if (!value) return "NA";
        const numValue = Array.isArray(value) ? value[0] : value;
        return numValue.toFixed(precision);
      },
    }),
    {
      id: "significance",
      header: "Significance",
      cell: ({ row }: { row: { original: TrendDataPoint } }) => {
        const lowCI = row.original["lowCI"];
        const upCI = row.original["upCI"];

        const lowValue = Array.isArray(lowCI) ? lowCI[0] : lowCI;
        const upValue = Array.isArray(upCI) ? upCI[0] : upCI;

        let trend = "";
        if (lowValue > 0) trend = "Increasing";
        else if (upValue < 0) trend = "Decreasing";
        else if (lowValue <= 0 && upValue >= 0) trend = "Not significant";
        return <span>{trend}</span>;
      },
    },
  ];

  return <Table data={data} columns={columns} />;
}
