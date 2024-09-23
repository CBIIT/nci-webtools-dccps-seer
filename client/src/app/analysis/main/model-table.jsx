"use client";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useRef, useEffect } from "react";
import { Table } from "react-bootstrap";

export default function ModelTable({ data, handleRowSelect }) {
  const models = useMemo(
    () => data.map((m, i) => ({ index: i, aic: m.aic, bic: m.bic, ll: m.ll, converged: m.converged ? "Yes" : "No" })),
    [data]
  );

  const columnHelper = createColumnHelper();
  const columns = [
    {
      id: "select",
      header: () => <span class="visually-hidden">Select Model</span>,
      cell: ({ row }) => (
        <div className="px-1">
          <IndeterminateCheckbox
            {...{
              checked: row.getIsSelected(),
              disabled: !row.getCanSelect(),
              indeterminate: row.getIsSomeSelected(),
              label: `Select ${row.index}`,
              onChange: () => {
                row.toggleSelected();
                handleRowSelect(row.index);
              },
            }}
          />
        </div>
      ),
    },
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
    enableRowSelection: true,
    enableMultiRowSelection: false,
    initialState: { rowSelection: { 0: true } },
  });

  function IndeterminateCheckbox({ indeterminate, className = "", label = "", ...rest }) {
    const ref = useRef(null);
    useEffect(() => {
      if (typeof indeterminate === "boolean") {
        ref.current.indeterminate = !rest.checked && indeterminate;
      }
    }, [ref, indeterminate]);
    return <input type="radio" ref={ref} className={className + " cursor-pointer"} aria-label={label} {...rest} />;
  }

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
