"use client";
import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/components/table";
import Button from "react-bootstrap/Button";
import { FaDownload } from "react-icons/fa";
import { downloadGroupResults } from "@/services/xlsx";

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

const PRECISION = 4;

function formatCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value.toFixed(PRECISION);
  if (Array.isArray(value)) return value.map((v) => formatCell(v)).join(", ");
  return String(value);
}

function buildColumns(keys, columnLabels) {
  const helper = createColumnHelper();
  return keys.map((key) =>
    helper.accessor(key, {
      header: () => <div className="mx-3">{columnLabels[key] ?? key}</div>,
      cell: (info) => formatCell(info.getValue()),
    })
  );
}

export default function Results({ data, params, seerData }) {
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
    return buildColumns(keys, columnLabels);
  }, [rows, columnLabels]);

  function handleDownloadResults() {
    const prefix = params.id ? `recurrisk_group_data_results_${params.id}` : "recurrisk_group_data_results";
    downloadGroupResults(rows, params, prefix);
  }

  async function handleSaveWorkspace() {
    const jobId = params?.id;
    if (!jobId) return;
    const response = await fetch(`/api/export/${jobId}`);
    if (!response.ok) {
      throw new Error("Error during workspace export");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recurrence-${jobId}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  const componentHeader = [
    <Button
      key="download-results"
      variant="link"
      onClick={handleDownloadResults}
      className="text-decoration-none"
      disabled={rows.length === 0}>
      <FaDownload /> Results
    </Button>,
    <Button
      key="save-workspace"
      variant="link"
      onClick={handleSaveWorkspace}
      className="text-decoration-none"
      disabled={!params?.id}>
      <FaDownload /> Workspace
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
