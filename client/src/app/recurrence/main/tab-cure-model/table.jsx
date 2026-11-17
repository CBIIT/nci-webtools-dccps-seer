"use client";
import { useMemo } from "react";
import Table from "@/components/table";
import { toTableColumns } from "@/components/column-spec";
import { catalogColumn, formatPercent } from "../table-columns";

export function getCureModelColumns({ precision = 4 }) {
  const percent = (value) => formatPercent(value, precision);
  return [
    catalogColumn("followup", "Years Since Diagnosis"),
    catalogColumn("obs_surv", "Input Net Cancer Survival", { suffix: " (%)", format: percent }),
    catalogColumn("surv_curemodel", "Fitted Net Cancer Survival", { suffix: " (%)", format: percent }),
  ];
}

export default function CureModelTable({ data, precision = 4 }) {
  const columns = useMemo(
    () => toTableColumns(getCureModelColumns({ precision }), { useColumnHeader: true }),
    [precision]
  );

  return (
    <Table data={data} columns={columns} useSort usePagination emptyMessage="No data available for this stratum" />
  );
}
