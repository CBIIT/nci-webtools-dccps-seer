// Shared helpers for the method-based curve tabs (Net Metastatic Recurrence
// Risk, Net Recurrence-free Probability, Recurrence-free Probability among
// the Noncured Fraction), operating on rows from the RecurRisk results (see
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

// Returns [lower, upper] proportions (clamped to [0, 1]) for the analytical
// net recurrence-free probability's confidence interval, or null when no SE
// is available. G_analytical = 1 - CI_analytical, so it shares the same SE.
export function getRecurrenceFreeCI(row, z = 1.96) {
  const se = getAnalyticalSE(row);
  if (se === null || se === undefined) return null;
  return [clamp01(row.G_analytical - z * se), clamp01(row.G_analytical + z * se)];
}

// Numerical estimates (CI_numerical, G_numerical, s1_numerical) are all null
// in lockstep for follow-up years beyond what the numerical deconvolution
// could estimate. `key` selects which field to check on `row`.
export function hasNumericalEstimate(row, key = "CI_numerical") {
  return row?.[key] !== null && row?.[key] !== undefined;
}
