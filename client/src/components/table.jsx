import { useState } from "react";
import BsTable from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Table({
  data,
  columns,
  useFilter = false,
  useColumnFilter = false,
  useSort = false,
  usePagination = false,
  componentHeader = [],
  emptyMessage = "No data available",
  ...props
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data,
    columns,
    state: {
      ...(useFilter && { globalFilter }),
      ...(useColumnFilter && { columnFilters }),
      ...(useSort && { sorting }),
      ...(usePagination && { pagination }),
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    ...((useFilter || useColumnFilter) && { getFilteredRowModel: getFilteredRowModel() }),
    ...(useSort && { getSortedRowModel: getSortedRowModel() }),
    ...(usePagination && { getPaginationRowModel: getPaginationRowModel() }),
  });

  const { pageIndex, pageSize } = table.getState().pagination ?? {};
  const pageCount = usePagination ? table.getPageCount() : 0;
  const totalRows = table.getFilteredRowModel().rows.length;
  const rowStart = usePagination ? pageIndex * pageSize + 1 : 1;
  const rowEnd = usePagination ? Math.min((pageIndex + 1) * pageSize, totalRows) : totalRows;

  const columnCount = table.getHeaderGroups()[0]?.headers.length ?? 0;
  const rows = table.getRowModel().rows;

  return (
    <Container className="mb-3">
      <Row className="mb-2">
        {useFilter && (
          <Col sm="2">
            <Form.Control
              aria-label="Search filter"
              placeholder="Search filter"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </Col>
        )}
        {componentHeader &&
          componentHeader.map((e, i) => (
            <Col sm="auto" key={i} className={i === 0 ? "ms-auto" : ""}>
              {e}
            </Col>
          ))}
      </Row>

      <div tabIndex="0" className="table-responsive" style={usePagination ? undefined : { maxHeight: "650px" }}>
        <BsTable striped bordered {...props} className="m-0">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={useColumnFilter ? "text-nowrap" : undefined}
                    onClick={useSort ? header.column.getToggleSortingHandler() : undefined}
                    style={
                      useSort && header.column.getCanSort() ? { cursor: "pointer", userSelect: "none" } : undefined
                    }>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {useSort && ({ asc: " \u2191", desc: " \u2193" }[header.column.getIsSorted()] ?? "")}
                  </th>
                ))}
              </tr>
            ))}
            {useColumnFilter && (
              <tr>
                {table.getHeaderGroups()[0]?.headers.map((header) => (
                  <th key={header.id} className="p-1 bg-light">
                    {header.column.getCanFilter() ? (
                      <Form.Control
                        size="sm"
                        aria-label={`Filter ${header.column.id}`}
                        placeholder="Filter"
                        value={header.column.getFilterValue() ?? ""}
                        onChange={(e) => header.column.setFilterValue(e.target.value)}
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="text-muted p-0">
                  <div
                    className="d-flex align-items-center justify-content-center text-center"
                    style={{ minHeight: "100px" }}>
                    {emptyMessage}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </BsTable>
      </div>

      {usePagination && (
        <div className="d-flex flex-wrap align-items-center justify-content-between mt-2 gap-2">
          <div className="d-flex align-items-center gap-2">
            <Form.Select
              aria-label="Page size"
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
            <span className="fw-semibold text-nowrap">Page size</span>
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
            <div className="d-flex align-items-center gap-1">
              <Form.Select
                aria-label="Go to page"
                size="sm"
                style={{ width: "auto" }}
                value={pageCount === 0 ? "" : pageIndex}
                disabled={pageCount === 0}
                onChange={(e) => table.setPageIndex(Number(e.target.value))}>
                {Array.from({ length: pageCount }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </Form.Select>
            </div>
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
    </Container>
  );
}
