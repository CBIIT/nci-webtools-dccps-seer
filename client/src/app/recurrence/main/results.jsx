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
  return String(value);
}

function buildColumns(keys) {
  const helper = createColumnHelper();
  return keys.map((key) =>
    helper.accessor(key, {
      header: () => <div className="mx-3">{key}</div>,
      cell: (info) => formatCell(info.getValue()),
    })
  );
}

export default function Results({ data, params }) {
  const rows = data ?? [];

  const columns = useMemo(() => {
    const keys = rows.length > 0 ? Object.keys(rows[0]) : DEFAULT_COLUMN_KEYS;
    return buildColumns(keys);
  }, [rows]);

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
    <Button key="download-results" variant="link" onClick={handleDownloadResults} className="text-decoration-none">
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
        useFilter
        useSort
        usePagination
      />
    </div>
  );
}
