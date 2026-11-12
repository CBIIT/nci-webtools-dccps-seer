"use client";
import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/components/table";
import Button from "react-bootstrap/Button";
import { FaDownload } from "react-icons/fa";
import { downloadGroupResults } from "@/services/xlsx";
import ColumnHeader from "@/components/column-header";
import { getTableColumn } from "./table-columns";

const DEFAULT_COLUMN_KEYS = [
  "followup",
  "link",
  "r",
  "cure",
  "lambda",
  "k",
  "theta",
  "surv_curemodel",
  "surv_notcure",
  "median_surv_notcured",
  "s1_numerical",
  "G_numerical",
  "CI_numerical",
  "s1_analytical",
  "G_analytical",
  "CI_analytical",
  "se_CI_analytical",
  "obs_surv",
  "obs_dist_surv",
];

function formatCell(value, precision) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value.toFixed(precision);
  if (Array.isArray(value)) return value.map((v) => formatCell(v, precision)).join(", ");
  return String(value);
}

function buildColumns(keys, columnLabels, cohortMaps, precision) {
  const helper = createColumnHelper();
  return keys.map((key) => {
    const tableColumn = getTableColumn(key);
    const label = tableColumn?.label ?? columnLabels[key] ?? key;
    const filterVariant = cohortMaps[key] ? "select" : tableColumn?.filterVariant;
    return helper.accessor(key, {
      header: () => <ColumnHeader label={label} definition={tableColumn?.definition} />,
      cell: (info) => formatCell(info.getValue(), precision),
      meta: { filterVariant, filterLabel: label },
      ...(filterVariant === "select" && {
        filterFn: (row, columnId, value) => String(row.getValue(columnId)) === value,
      }),
    });
  });
}

export default function Results({ data, params, seerData, precision = 4 }) {
  const { cohortMaps, columnLabels } = useMemo(() => {
    const dict = seerData?.seerStatDictionary ?? [];
    const cohortMaps = {};
    const columnLabels = {};
    for (const h of dict) {
      columnLabels[h.name] = h.label;
      if (h.factors?.length) {
        cohortMaps[h.name] = new Map(h.factors.map((f) => [String(f.value), f.label]));
      }
    }
    return { cohortMaps, columnLabels };
  }, [seerData]);

  const rows = useMemo(
    () =>
      (data ?? []).map((row) => {
        const out = { ...row };
        for (const key of Object.keys(out)) {
          const fmap = cohortMaps[key];
          if (fmap) out[key] = fmap.get(String(out[key])) ?? out[key];
        }
        return out;
      }),
    [data, cohortMaps]
  );

  const columns = useMemo(() => {
    const keys = rows.length > 0 ? Object.keys(rows[0]) : DEFAULT_COLUMN_KEYS;
    return buildColumns(keys, columnLabels, cohortMaps, precision);
  }, [rows, columnLabels, cohortMaps, precision]);

  function handleDownloadResults() {
    const prefix = params.id ? `recurrisk_group_data_results_${params.id}` : "recurrisk_group_data_results";
    downloadGroupResults(data ?? [], params, prefix);
  }

  const componentHeader = [
    <Button
      key="download-results"
      variant="link"
      onClick={handleDownloadResults}
      className="text-decoration-none"
      disabled={(data ?? []).length === 0}>
      <FaDownload /> Save
    </Button>,
  ];

  return (
    <div className="pt-3">
      <Table
        data={rows}
        columns={columns}
        componentHeader={componentHeader}
        size="sm"
        useColumnFilter
        useSort
        usePagination
      />
    </div>
  );
}
