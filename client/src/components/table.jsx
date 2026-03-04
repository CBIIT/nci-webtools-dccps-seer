import { useState } from "react";
import BsTable from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Table({ data, columns, useFilter = false, useSort = false, usePagination = false, ...props }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data,
    columns,
    state: {
      ...(useFilter && { globalFilter }),
      ...(useSort && { sorting }),
      ...(usePagination && { pagination }),
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    ...(useFilter && { getFilteredRowModel: getFilteredRowModel() }),
    ...(useSort && { getSortedRowModel: getSortedRowModel() }),
    ...(usePagination && { getPaginationRowModel: getPaginationRowModel() }),
  });

  const { pageIndex, pageSize } = table.getState().pagination ?? {};
  const totalRows = table.getFilteredRowModel().rows.length;
  const rowStart = usePagination ? pageIndex * pageSize + 1 : 1;
  const rowEnd = usePagination ? Math.min((pageIndex + 1) * pageSize, totalRows) : totalRows;

  return (
    <div className="mb-3">
      {useFilter && (
        <div className="mb-2">
          <Form.Control
            aria-label="Search filter"
            placeholder="Search filter"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
      )}

      <div tabIndex="0" className="table-responsive" style={usePagination ? undefined : { maxHeight: "650px" }}>
        <BsTable striped bordered {...props} className="m-0">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={useSort ? header.column.getToggleSortingHandler() : undefined}
                    style={useSort && header.column.getCanSort() ? { cursor: "pointer", userSelect: "none" } : undefined}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {useSort &&
                      ({ asc: " \u2191", desc: " \u2193" }[header.column.getIsSorted()] ?? "")}
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
        </BsTable>
      </div>

      {usePagination && (
        <div className="d-flex flex-wrap align-items-center justify-content-between mt-2 gap-2">
          <div className="d-flex align-items-center gap-2">
            <Form.Select
              aria-label="Items per page"
              size="sm"
              style={{ width: "auto" }}
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Form.Select>
            <span className="fw-semibold text-nowrap">Items per page</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="fw-semibold text-nowrap">
              {totalRows === 0 ? "0" : `${rowStart}\u2013${rowEnd}`} of {totalRows}
            </span>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}>
              &lsaquo;
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}>
              &rsaquo;
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
