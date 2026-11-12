// Shared helpers for the Survival After Metastatic Disease tab, operating on
// rows from the RecurRisk results (see server/recurrence/recurrenceV1.R).
//
// `obs_dist_surv` is the observed survival after metastatic disease at
// diagnosis. `r` is the adjustment factor, and the output `theta` is already
// the fitted hazard multiplied by `r` (theta = RR * theta_fit, see
// recurrenceV1.R lines 391-402 and 1095-1105). That means:
//   - [obs_dist_surv(t)]^r is the assumed survival after metastatic
//     recurrence, used as the input to the numerical deconvolution.
//   - exp(-theta*t) is the exponential approximation of that same curve,
//     used by the analytical method.

// Returns a new array of rows with two derived fields added:
// `dist_surv_adjusted` ([obs_dist_surv]^r) and `dist_surv_exponential`
// (exp(-theta*followup)). Both are null when an input is missing.
// Rows are expected to already be sorted by followup (see main.jsx).
export function withMetastaticSurvivalCurves(rows) {
  return (rows ?? []).map((row) => {
    const { obs_dist_surv: obsDistSurv, r, theta, followup } = row;
    const distSurvAdjusted =
      obsDistSurv === null || obsDistSurv === undefined || r === null || r === undefined ? null : obsDistSurv ** r;
    const distSurvExponential = theta === null || theta === undefined ? null : Math.exp(-theta * followup);
    return { ...row, dist_surv_adjusted: distSurvAdjusted, dist_surv_exponential: distSurvExponential };
  });
}
