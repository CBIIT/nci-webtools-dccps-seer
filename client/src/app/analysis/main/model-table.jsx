"use client";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useRef, useEffect } from "react";
import { Table } from "react-bootstrap";

export default function ModelTable({ data, params, manifest, cohortIndex, handleRowSelect, precision }) {
  const { firstYear } = params;
  const { final_model_index } = manifest[cohortIndex - 1];
  const models = useMemo(
    () =>
      data.map((m, i) => ({
        index: i,
        jp: m.jp ? m.jp.length : 0,
        location: m?.jp
          ? Array.isArray(m.jp)
            ? m.jp.map((e) => +e + firstYear).join(", ")
            : m.jp + firstYear
          : "None",
        aic: m.aic.toFixed(precision),
        bic: m.bic.toFixed(precision),
        ll: m.ll.toFixed(precision),
        converged: m.converged ? "Yes" : "No",
      })),
    [data, precision]
  );

  const columnHelper = createColumnHelper();
  const columns = [
    {
      id: "select",
      header: () => <span className="visually-hidden">Select Model</span>,
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
      cell: (info) => `${info.getValue() + 1}${info.getValue() === final_model_index ? " (final selected model)" : ""}`,
    }),
    columnHelper.accessor("index", {
      id: "index",
      header: () => "Joinpoints",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("location", {
      header: () => "Location",
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
    initialState: { rowSelection: { [0]: true } },
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
        {table.getHeaderGroups().map((headerGroup, hgIndex) => (
          <tr key={hgIndex + headerGroup.id}>
            {headerGroup.headers.map((header, hIndex) => (
              <th key={hgIndex + hIndex + header.id}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row, rIndex) => (
          <tr key={rIndex + row.id}>
            {row.getVisibleCells().map((cell, cIndex) => (
              <td key={rIndex + cIndex + "td" + cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
