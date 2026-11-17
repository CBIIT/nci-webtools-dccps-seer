"use client";
import { createColumnHelper } from "@tanstack/react-table";
import ColumnHeader from "@/components/column-header";

const helper = createColumnHelper();

/**
 * Converts column specs shared with xlsx.downloadDataset into react-table columns.
 * @param {{ id: string, label: string, definition?: string, getValue: (row: object) => any, format?: (value: any) => any }[]} specs
 */
export function toTableColumns(specs, { useColumnHeader = false } = {}) {
  return specs.map(({ id, label, definition, getValue, format }) =>
    helper.accessor(getValue, {
      id,
      header: useColumnHeader ? () => <ColumnHeader label={label} definition={definition} /> : () => label,
      cell: (info) => (format ? format(info.getValue()) : info.getValue()),
    })
  );
}
