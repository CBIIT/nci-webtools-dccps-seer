"use client";
import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/components/table";
import ColumnHeader from "@/components/column-header";

function formatR(r) {
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatPercent(value, precision) {
  return value === null || value === undefined ? "NA" : (value * 100).toFixed(precision);
}

export default function RSensitivityTable({ followups, series, precision = 4 }) {
  const rows = useMemo(
    () =>
      followups.map((followup, i) => {
        const row = { followup };
        series.forEach((s) => {
          row[`r_${s.r}`] = s.values[i];
        });
        return row;
      }),
    [followups, series]
  );

  const columns = useMemo(() => {
    const helper = createColumnHelper();
    const cols = [
      helper.accessor("followup", {
        header: () => <ColumnHeader label="Years Since Diagnosis" />,
        cell: (info) => info.getValue(),
      }),
    ];

    series.forEach((s) => {
      const label = `Net Recurrence Risk, r = ${formatR(s.r)}${s.isModel ? " (model)" : ""} (%)`;
      const key = `r_${s.r}`;
      cols.push(
        // Use a function accessor (not a string accessorKey) so r values
        // like 1.5 don't get parsed as a dotted nested-path lookup.
        helper.accessor((row) => row[key], {
          id: `r-sensitivity-${s.r}`,
          header: () => <ColumnHeader label={label} />,
          cell: (info) => formatPercent(info.getValue(), precision),
        })
      );
    });

    return cols;
  }, [series, precision]);

  return <Table data={rows} columns={columns} useSort usePagination emptyMessage="No data available for this stratum" />;
}
