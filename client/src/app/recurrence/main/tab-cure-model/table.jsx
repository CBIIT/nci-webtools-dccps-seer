"use client";
import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/components/table";
import ColumnHeader from "@/components/column-header";
import { getTableColumn } from "../table-columns";

function formatPercent(value, precision) {
  return value === null || value === undefined ? "NA" : (value * 100).toFixed(precision);
}

function header(key, fallbackLabel, suffix = "") {
  const column = getTableColumn(key);
  return () => <ColumnHeader label={`${column?.label ?? fallbackLabel}${suffix}`} definition={column?.definition} />;
}

export default function CureModelTable({ data, precision = 4 }) {
  const columns = useMemo(() => {
    const helper = createColumnHelper();
    return [
      helper.accessor("followup", {
        header: header("followup", "Years Since Diagnosis"),
        cell: (info) => info.getValue(),
      }),
      helper.accessor("obs_surv", {
        header: header("obs_surv", "Input Net Cancer Survival", " (%)"),
        cell: (info) => formatPercent(info.getValue(), precision),
      }),
      helper.accessor("surv_curemodel", {
        header: header("surv_curemodel", "Fitted Net Cancer Survival", " (%)"),
        cell: (info) => formatPercent(info.getValue(), precision),
      }),
    ];
  }, [precision]);

  return <Table data={data} columns={columns} useSort usePagination emptyMessage="No data available for this stratum" />;
}
