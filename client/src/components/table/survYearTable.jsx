"use client";
import Table from "react-bootstrap/Table";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

export default function SurvYearTable({ data, seerData, params }) {
  const yearStart = +seerData.seerStatDictionary.filter((e) => e.name === params.year)[0]["factors"][0].label;
  const observedHeader = params?.observed;
  const observedSeHeader = observedHeader?.includes("Relative") ? "Relative_SE_Cum" : "CauseSpecific_SE_Cum";
  const predictedHeader = "pred_cum";
  const predictedSeHeader = "pred_cum_se";

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
      header: () => "Relative Survival Cumulative (%)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor(observedSeHeader, {
      header: () => "Relative Survival Cumulative Std. Err. (%)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor(predictedHeader, {
      header: "Predicted Cumulative Survival (%)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor(predictedSeHeader, {
      header: "Predicted Cumulative Survival Std. Err. (%)",
      cell: (info) => info.renderValue(),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table striped bordered>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
