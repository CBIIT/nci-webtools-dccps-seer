import { formatPercent } from "../table-columns";

function formatR(r) {
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function getRSensitivityRows(followups, series) {
  return followups.map((followup, i) => {
    const row = { followup };
    series.forEach((s) => {
      row[`r_${s.r}`] = s.values[i];
    });
    return row;
  });
}

export function getRSensitivityColumns({ series, precision = 4 }) {
  return [
    { id: "followup", label: "Years Since Diagnosis", getValue: (row) => row.followup },
    // Function accessors keep r values like 1.5 from being read as nested paths
    ...series.map((s) => ({
      id: `r-sensitivity-${s.r}`,
      label: `Net Recurrence Risk, r = ${formatR(s.r)}${s.isModel ? " (model)" : ""} (%)`,
      getValue: (row) => row[`r_${s.r}`],
      format: (value) => formatPercent(value, precision),
    })),
  ];
}
