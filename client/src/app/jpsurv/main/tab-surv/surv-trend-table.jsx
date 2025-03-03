"use client";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";

export default function TrendTable({ data, params, precision }) {
  const { firstYear } = params;
  const columnHelper = createColumnHelper();
  const columns = [
    columnHelper.accessor("interval", {
      header: () => "Interval",
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
      cell: (info) => (info.getValue() ? info.getValue().toFixed(precision) : "NA"),
    }),
    columnHelper.accessor("lowCI", {
      header: () => "Lower Limit 95% C.I.",
      cell: (info) => (info.getValue() ? info.getValue()[0].toFixed(precision) : "NA"),
    }),
    columnHelper.accessor("upCI", {
      header: () => "Upper Limit 95% C.I.",
      cell: (info) => (info.getValue() ? info.getValue()[0].toFixed(precision) : "NA"),
    }),
    {
      id: "significance",
      header: "Significance",
      cell: ({ row }) => {
        let trend = "";
        if (row.original["lowCI"] > 0) trend = "Increasing";
        else if (row.original["upCI"] < 0) trend = "Decreasing";
        else if (row.original["lowCI"] <= 0 && original["upCI"] >= 0) trend = "Not significant";
        return <span>{trend}</span>;
      },
    },
  ];

  return <Table data={data} columns={columns} />;
}
