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

export default function MetastaticSurvivalTable({ data, showObserved, showAdjusted, showExponential, precision = 4 }) {
  const columns = useMemo(() => {
    const helper = createColumnHelper();
    const cols = [
      helper.accessor("followup", {
        header: () => <ColumnHeader label="Years Since Metastatic Diagnosis or Recurrence" />,
        cell: (info) => info.getValue(),
      }),
    ];

    if (showObserved) {
      cols.push(
        helper.accessor("obs_dist_surv", {
          header: header("obs_dist_surv", "Survival after metastatic disease at diagnosis", " (%)"),
          cell: (info) => formatPercent(info.getValue(), precision),
        })
      );
    }
    if (showAdjusted) {
      cols.push(
        helper.accessor("dist_surv_adjusted", {
          header: header("dist_surv_adjusted", "Assumed survival after metastatic recurrence", " (%)"),
          cell: (info) => formatPercent(info.getValue(), precision),
        })
      );
    }
    if (showExponential) {
      cols.push(
        helper.accessor("dist_surv_exponential", {
          header: header("dist_surv_exponential", "Exponential approximation of survival after recurrence", " (%)"),
          cell: (info) => formatPercent(info.getValue(), precision),
        })
      );
    }

    return cols;
  }, [showObserved, showAdjusted, showExponential, precision]);

  return <Table data={data} columns={columns} useSort usePagination emptyMessage="No data available for this stratum" />;
}
