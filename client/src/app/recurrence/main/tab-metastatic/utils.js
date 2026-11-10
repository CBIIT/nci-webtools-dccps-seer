// Shared helpers for the Net Metastatic Recurrence Risk plot and table,
// operating on rows from the RecurRisk results (see
// server/recurrence/recurrenceV1.R).

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

// se_CI_analytical is emitted as a one-element array; unwrap it.
export function getAnalyticalSE(row) {
  const se = row?.se_CI_analytical;
  return Array.isArray(se) ? se[0] : se;
}

// Returns [lower, upper] proportions (clamped to [0, 1]) for the analytical
// net recurrence risk's confidence interval, or null when no SE is available.
export function getAnalyticalCI(row, z = 1.96) {
  const se = getAnalyticalSE(row);
  if (se === null || se === undefined) return null;
  return [clamp01(row.CI_analytical - z * se), clamp01(row.CI_analytical + z * se)];
}

// CI_numerical is null for follow-up years beyond what the numerical
// deconvolution could estimate.
export function hasNumericalEstimate(row) {
  return row?.CI_numerical !== null && row?.CI_numerical !== undefined;
}
