"use client";
import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import Dropdown from "react-bootstrap/Dropdown";
import Table from "@/components/table";
import { useStore } from "../store";
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
      header: () => key,
      cell: (info) => formatCell(info.getValue()),
    })
  );
}

export default function Results({ data }) {
  const params = useStore((state) => state.params);

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
    const response = await fetch(`/api/export/${id}`);
    if (!response.ok) {
      throw new Error("Error during workspace export");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cansurv-${id}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  if (!rows.length) return null;

  return (
    <div className="p-3">
      <div className="d-flex justify-content-end mb-2">
        <Dropdown>
          <Dropdown.Toggle variant="outline-primary" id="export-group-results">
            Export
          </Dropdown.Toggle>
          <Dropdown.Menu align="end">
            <Dropdown.Item onClick={handleDownloadResults}>Results</Dropdown.Item>
            <Dropdown.Item onClick={handleSaveWorkspace}>Workspace</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
      <Table data={rows} columns={columns} size="sm" useFilter useSort usePagination />
    </div>
  );
}
