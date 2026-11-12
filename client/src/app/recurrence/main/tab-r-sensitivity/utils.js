// Recomputes the net metastatic recurrence risk for an arbitrary adjustment
// factor r, for a single stratum's rows (already sorted by followup, with
// followup starting at 1 and increasing by 1 each row). This ports the
// analytical formula and the numerical (Volterra) deconvolution from
// server/recurrence/recurrenceV1.R, lines 547-562 and 637-692 / 1105-1227.
//
// Every input besides r is held fixed at the job's fitted values: `cure`,
// `lambda`, `k`, `link` and `surv_notcured` don't depend on r. Only `theta`
// (the analytical hazard) and `obs_dist_surv^r` (the numerical input) scale
// with r.

const MAX_R_VALUES = 8;

function clampNonNegative(value) {
  return Math.max(0, value);
}

// Returns an array of net recurrence risk proportions (CI), or null entries
// where an input is missing. `rows[i].theta` is already `r * theta_fit`
// (see recurrenceV1.R lines 391-402 and 1095-1105), so the fit's own hazard
// is recovered as `theta / r` before rescaling to `rNew`.
export function analyticalRisk(rows, rNew) {
  return rows.map((row) => {
    const { theta, r, lambda, k, cure, link, followup, surv_notcured: survNotCured } = row;
    if (theta === null || theta === undefined || !r || !lambda || !k) return null;

    const thetaNew = (theta * rNew) / r;
    const ratio = followup / lambda;

    let s1;
    if (link === "Weibull") {
      s1 = survNotCured * (1 - (k / thetaNew / lambda) * ratio ** (k - 1));
    } else if (link === "Loglogistic") {
      s1 = (1 + ratio ** k - (k / thetaNew / lambda) * ratio ** (k - 1)) / (1 + ratio ** k) ** 2;
    } else {
      return null;
    }

    s1 = clampNonNegative(s1);
    const G = cure + (1 - cure) * s1;
    return 1 - G;
  });
}

// Runs the same Volterra deconvolution as R's `volterra_continuous`, with
// delta = 1, over obs_dist_surv raised to `rNew`. Returns an array of net
// recurrence risk proportions (CI), or null where an input is missing or a
// computation is not finite (mirrors the CI_numerical gaps produced by R
// when obs_dist_surv runs out before the requested follow-up).
export function numericalRisk(rows, rNew) {
  const n = rows.length;
  if (!n) return [];

  const survNotCured = rows.map((r) => (r.surv_notcured ?? NaN));
  const obsDistSurv = rows.map((r) => (r.obs_dist_surv === null || r.obs_dist_surv === undefined ? NaN : r.obs_dist_surv));
  const cure = rows.map((r) => (r.cure ?? NaN));

  const oldSurv = survNotCured.map((_, i) => (i === 0 ? 1 : survNotCured[i - 1]));
  const oldDist = obsDistSurv.map((_, i) => (i === 0 ? 1 : obsDistSurv[i - 1]));

  const tPdf = survNotCured.map((s, i) => oldSurv[i] - s);
  const t2Pdf = obsDistSurv.map((d, i) => oldDist[i] ** rNew - d ** rNew);

  const f1 = new Array(n).fill(NaN);
  const f1Surv = new Array(n).fill(NaN);
  const delta = 1;

  f1[0] = tPdf[0] / (delta * t2Pdf[0]);
  f1Surv[0] = 1 - f1[0] * delta;

  for (let i = 1; i < n; i++) {
    let value = tPdf[i];
    for (let j = 0; j < i; j++) {
      value -= f1[j] * t2Pdf[i - j] * delta;
    }
    f1[i] = value / (delta * t2Pdf[0]);
    f1Surv[i] = f1Surv[i - 1] - f1[i] * delta;
  }

  return f1Surv.map((s1Surv, i) => {
    const s1 = clampNonNegative(s1Surv);
    const G = cure[i] + (1 - cure[i]) * s1;
    const CI = 1 - G;
    return Number.isFinite(CI) ? CI : null;
  });
}

// Parses a comma-separated list of positive numbers for the r-values input.
// Removes duplicates, sorts ascending, and caps the list at MAX_R_VALUES.
export function parseRValues(text) {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { values: [], error: "Enter at least one r value." };

  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  const values = [];
  for (const part of parts) {
    const num = Number(part);
    if (!Number.isFinite(num) || num <= 0) {
      return { values: [], error: `"${part}" is not a valid positive number.` };
    }
    values.push(num);
  }

  const unique = [...new Set(values)].sort((a, b) => a - b);
  if (unique.length > MAX_R_VALUES) {
    return { values: unique.slice(0, MAX_R_VALUES), error: `Only the first ${MAX_R_VALUES} r values are shown.` };
  }
  return { values: unique, error: null };
}
