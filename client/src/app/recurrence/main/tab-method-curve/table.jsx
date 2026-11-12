"use client";
import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/components/table";
import ColumnHeader from "@/components/column-header";
import { getTableColumn } from "../table-columns";
import { getAnalyticalSE } from "./utils";

function formatPercent(value, precision) {
  return value === null || value === undefined ? "NA" : (value * 100).toFixed(precision);
}

function header(key, fallbackLabel, suffix = "") {
  const column = getTableColumn(key);
  return () => <ColumnHeader label={`${column?.label ?? fallbackLabel}${suffix}`} definition={column?.definition} />;
}

export default function MethodCurveTable({ config, data, method, showBand, precision = 4 }) {
  const { analyticalKey, numericalKey, getCI, seKey, valueLabel } = config;
  const showAnalytical = method === "analytical" || method === "both";
  const showNumerical = method === "numerical" || method === "both";
  const showCI = Boolean(getCI) && showAnalytical && showBand;

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
        helper.accessor(analyticalKey, {
          id: `${config.id}-analytical`,
          header: header(analyticalKey, `${valueLabel} - Analytical`, " (%)"),
          cell: (info) => formatPercent(info.getValue(), precision),
        })
      );
      if (showCI) {
        cols.push(
          helper.display({
            id: `${config.id}-analytical-ci-lower`,
            header: () => <ColumnHeader label="95% CI Lower - Analytical (%)" />,
            cell: ({ row }) => formatPercent(getCI(row.original)?.[0], precision),
          }),
          helper.display({
            id: `${config.id}-analytical-ci-upper`,
            header: () => <ColumnHeader label="95% CI Upper - Analytical (%)" />,
            cell: ({ row }) => formatPercent(getCI(row.original)?.[1], precision),
          })
        );
      }
      if (seKey) {
        cols.push(
          helper.accessor((row) => getAnalyticalSE(row), {
            id: `${config.id}-analytical-se`,
            header: header(seKey, "Standard Error - Analytical", " (%)"),
            cell: (info) => formatPercent(info.getValue(), precision),
          })
        );
      }
    }

    if (showNumerical) {
      cols.push(
        helper.accessor(numericalKey, {
          id: `${config.id}-numerical`,
          header: header(numericalKey, `${valueLabel} - Numerical`, " (%)"),
          cell: (info) => formatPercent(info.getValue(), precision),
        })
      );
    }

    return cols;
  }, [config.id, analyticalKey, numericalKey, getCI, seKey, valueLabel, showAnalytical, showNumerical, showCI, precision]);

  return <Table data={data} columns={columns} useSort usePagination emptyMessage="No data available for this stratum" />;
}
