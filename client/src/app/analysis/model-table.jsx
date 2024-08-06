"use client";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { Table } from "react-bootstrap";

export default function ModelTable({ data }) {
  const models = useMemo(
    () => data.map((m, i) => ({ index: i, aic: m.aic, bic: m.bic, ll: m.ll, converged: m.converged ? "Yes" : "No" })),
    [data]
  );
  console.log(models);
  const columnHelper = createColumnHelper();
  const columns = [
    columnHelper.accessor("index", {
      header: () => "Model",
      cell: (info) => info.getValue() + 1,
    }),
    columnHelper.accessor("index", {
      id: "jp",
      header: () => "Number of Joinpoints",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("bic", {
      header: () => "Bayesian Information Criterion (BIC)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor("aic", {
      header: () => "Akaike Information Criterion (AIC)",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor("ll", {
      header: "Log Likelihood",
      cell: (info) => info.renderValue(),
    }),
    columnHelper.accessor("converged", {
      header: "Converged",
      cell: (info) => info.renderValue(),
    }),
  ];

  const table = useReactTable({
    data: models,
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
