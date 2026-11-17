"use client";
import { useMemo } from "react";
import Table from "@/components/table";
import { toTableColumns } from "@/components/column-spec";
import { catalogColumn, formatPercent } from "../table-columns";
import { getAnalyticalSE } from "./utils";

export function getMethodCurveColumns({ config, method, showBand, precision = 4 }) {
  const { analyticalKey, numericalKey, getCI, seKey, valueLabel } = config;
  const showAnalytical = method === "analytical" || method === "both";
  const showNumerical = method === "numerical" || method === "both";
  const showCI = Boolean(getCI) && showAnalytical && showBand;
  const percent = (value) => formatPercent(value, precision);

  const cols = [catalogColumn("followup", "Years Since Diagnosis")];

  if (showAnalytical) {
    cols.push(
      catalogColumn(analyticalKey, `${valueLabel} - Analytical`, {
        id: `${config.id}-analytical`,
        suffix: " (%)",
        format: percent,
      })
    );
    if (showCI) {
      cols.push(
        {
          id: `${config.id}-analytical-ci-lower`,
          label: "95% CI Lower - Analytical (%)",
          getValue: (row) => getCI(row)?.[0],
          format: percent,
        },
        {
          id: `${config.id}-analytical-ci-upper`,
          label: "95% CI Upper - Analytical (%)",
          getValue: (row) => getCI(row)?.[1],
          format: percent,
        }
      );
    }
    if (seKey) {
      cols.push(
        catalogColumn(seKey, "Standard Error - Analytical", {
          id: `${config.id}-analytical-se`,
          suffix: " (%)",
          getValue: (row) => getAnalyticalSE(row),
          format: percent,
        })
      );
    }
  }

  if (showNumerical) {
    cols.push(
      catalogColumn(numericalKey, `${valueLabel} - Numerical`, {
        id: `${config.id}-numerical`,
        suffix: " (%)",
        format: percent,
      })
    );
  }

  return cols;
}

export default function MethodCurveTable({ config, data, method, showBand, precision = 4 }) {
  const columns = useMemo(
    () => toTableColumns(getMethodCurveColumns({ config, method, showBand, precision }), { useColumnHeader: true }),
    [config, method, showBand, precision]
  );

  return <Table data={data} columns={columns} useSort usePagination emptyMessage="No data available for this stratum" />;
}
