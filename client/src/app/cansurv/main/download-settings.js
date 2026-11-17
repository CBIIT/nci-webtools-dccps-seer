import { DISTRIBUTION_OPTIONS } from "../store";
import { getNotificationRows, yesNo } from "@/services/download-settings";

const COVARIATE_ROLES = [
  ["by", "Stratum"],
  ["mu", "Mu"],
  ["sigma", "Sigma"],
  ["cure", "Cure"],
];

function cleanLabel(label) {
  return String(label).replace(/"/g, "").trim();
}

export function getCansurvParameterRows(params, seerData) {
  const covariateRows = (params.covariates ?? []).flatMap((covariate) => {
    const roles = COVARIATE_ROLES.filter(([key]) => covariate.type?.[key]).map(([, label]) => label);
    const factors = seerData?.seerStatDictionary?.find((h) => h.name === covariate.name)?.factors ?? [];
    const checked = factors.filter((f, i) => covariate.options?.[i]?.checked);
    // No levels checked means all levels are included
    const levels =
      !checked.length || checked.length === factors.length ? "All" : checked.map((f) => cleanLabel(f.label)).join(", ");
    return [
      [`Covariate: ${covariate.label}`, roles.length ? roles.join(", ") : "Not used"],
      [`Covariate: ${covariate.label} Levels`, levels],
    ];
  });

  return [
    ["Input Type", params.inputType === "zip" ? "Workspace" : "SEER*Stat Dictionary and Data Files"],
    ["Input Files", Array.isArray(params.inputFile) ? params.inputFile.join(", ") : params.inputFile],
    ["Cure in Model", yesNo(params.est_cure)],
    ["Distribution", DISTRIBUTION_OPTIONS.find((o) => o.value === params.distribution)?.label ?? params.distribution],
    ["Maximum Number of Iterations", params.maxit],
    ["Relative Convergence Tolerance", params.reltol],
    ["Number of Restarts", params.n_restart_conv],
    ["Seed", params.seed],
    ...covariateRows,
    ...getNotificationRows(params),
  ];
}

export function getCansurvSettingsRows(params, seerData, stratumLabel, tabRows = []) {
  return [...getCansurvParameterRows(params, seerData), ["Stratum", stratumLabel || "All"], ...tabRows];
}

export function getSubStratumRows(subStratum, seerData, valueToLabelMap) {
  return Object.entries(subStratum).map(([name, value]) => [
    seerData.cohortVariables.find((v) => v.name === name)?.label ?? name,
    valueToLabelMap[name]?.[value] ?? value,
  ]);
}
