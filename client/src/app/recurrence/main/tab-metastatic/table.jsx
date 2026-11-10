"use client";
import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/components/table";
import ColumnHeader from "@/components/column-header";
import { getTableColumn } from "../table-columns";
import { getAnalyticalSE, getAnalyticalCI } from "./utils";

function formatPercent(value, precision) {
  return value === null || value === undefined ? "NA" : (value * 100).toFixed(precision);
}

function header(key, fallbackLabel) {
  const column = getTableColumn(key);
  return () => <ColumnHeader label={column?.label ?? fallbackLabel} definition={column?.definition} />;
}

export default function MetastaticTable({ data, method, showBand, precision = 4 }) {
  const showAnalytical = method === "analytical" || method === "both";
  const showNumerical = method === "numerical" || method === "both";

  const columns = useMemo(() => {
    const helper = createColumnHelper();
    const cols = [
      helper.accessor("followup", {
        header: header("followup", "Years Since Diagnosis"),
        cell: (info) => info.getValue(),
      }),
    ];

    if (showAnalytical) {
      cols.push(
        helper.accessor("CI_analytical", {
          id: "metastatic-analytical",
          header: header("CI_analytical", "Net Recurrence Risk - Analytical (%)"),
          cell: (info) => formatPercent(info.getValue(), precision),
        })
      );
      if (showBand) {
        cols.push(
          helper.display({
            id: "metastatic-analytical-ci-lower",
            header: () => <ColumnHeader label="95% CI Lower - Analytical (%)" />,
            cell: ({ row }) => formatPercent(getAnalyticalCI(row.original)?.[0], precision),
          }),
          helper.display({
            id: "metastatic-analytical-ci-upper",
            header: () => <ColumnHeader label="95% CI Upper - Analytical (%)" />,
            cell: ({ row }) => formatPercent(getAnalyticalCI(row.original)?.[1], precision),
          })
        );
      }
      cols.push(
        helper.accessor((row) => getAnalyticalSE(row), {
          id: "metastatic-analytical-se",
          header: header("se_CI_analytical", "Standard Error - Analytical (%)"),
          cell: (info) => formatPercent(info.getValue(), precision),
        })
      );
    }

    if (showNumerical) {
      cols.push(
        helper.accessor("CI_numerical", {
          id: "metastatic-numerical",
          header: header("CI_numerical", "Net Recurrence Risk - Numerical (%)"),
          cell: (info) => formatPercent(info.getValue(), precision),
        })
      );
    }

    return cols;
  }, [showAnalytical, showNumerical, showBand, precision]);

  return <Table data={data} columns={columns} useSort usePagination emptyMessage="No data available for this stratum" />;
}
