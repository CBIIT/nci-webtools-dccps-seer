// Catalog of explanatory display labels and technical definitions for RecurRisk
// output table columns. Keyed by the field name produced by the analysis
// pipeline (see server/recurrence/recurrenceV1.R), with `aliases` covering
// any alternate spellings referenced elsewhere in the codebase.

export const TABLE_COLUMNS = [
  {
    key: "link",
    label: "Survival distribution for the noncured fraction",
    definition:
      "Parametric distribution specified in CanSurv for survival from diagnosis to cancer death among the noncured fraction: Weibull or log-logistic.",
  },
  {
    key: "cure",
    label: "Statistically cured fraction",
    definition:
      "Estimated proportion of the population not at risk of eventually dying from the cancer, under the mixture cure model.",
  },
  {
    key: "lambda",
    label: "Noncured survival parameter λ",
    definition:
      "Parameter λ of the survival distribution for the noncured fraction. Its interpretation depends on the distribution and parameterization used by CanSurv.",
  },
  {
    key: "k",
    label: "Noncured survival parameter k",
    definition:
      "Parameter k of the survival distribution for the noncured fraction. Its interpretation depends on the distribution and parameterization used by CanSurv.",
  },
  {
    key: "theta",
    label: "Cancer mortality hazard after recurrence",
    definition:
      "Exponential hazard parameter for the time from metastatic recurrence to cancer death, used in the analytical method.",
  },
  {
    key: "surv_curemodel",
    label: "Fitted net cancer survival",
    definition:
      "Net survival from diagnosis estimated by the mixture cure model, combining the cured and noncured fractions.",
  },
  {
    key: "surv_notcured",
    aliases: ["surv_notcure"],
    label: "Cancer survival among the noncured fraction",
    definition:
      "Estimated probability of surviving beyond a specified time from diagnosis within the noncured fraction, in the absence of other causes of death.",
  },
  {
    key: "median_surv_notcured",
    label: "Median survival among the noncured fraction",
    definition:
      "Estimated median time from diagnosis to cancer death within the noncured fraction, in the absence of other causes of death.",
  },
  {
    key: "s1_numerical",
    label: "Recurrence-free probability among the noncured fraction - numerical",
    definition:
      "Estimated probability of remaining free of metastatic recurrence or progression beyond a specified time from diagnosis within the noncured fraction, calculated using numerical deconvolution.",
  },
  {
    key: "G_numerical",
    label: "Net recurrence-free probability - numerical",
    definition:
      "Estimated probability of remaining free of metastatic recurrence or progression beyond a specified time from diagnosis in the full population, calculated using the numerical method.",
  },
  {
    key: "CI_numerical",
    label: "Net metastatic recurrence risk - numerical",
    definition:
      "Estimated net cumulative incidence of metastatic recurrence or progression by a specified time after diagnosis, calculated as 1 − net_recurrence_free_numerical.",
  },
  {
    key: "s1_analytical",
    label: "Recurrence-free probability among the noncured fraction - analytical",
    definition:
      "Estimated probability of remaining free of metastatic recurrence or progression beyond a specified time from diagnosis within the noncured fraction, calculated using analytical deconvolution.",
  },
  {
    key: "G_analytical",
    label: "Net recurrence-free probability - analytical",
    definition:
      "Estimated probability of remaining free of metastatic recurrence or progression beyond a specified time from diagnosis in the specified cohort, calculated using the analytical method.",
  },
  {
    key: "CI_analytical",
    label: "Net metastatic recurrence risk - analytical",
    definition:
      "Estimated net cumulative incidence of metastatic recurrence or progression by a specified time after diagnosis, calculated as 1 − net_recurrence_free_analytical.",
  },
  {
    key: "se_CI_analytical",
    label: "Standard error of net recurrence risk - analytical",
    definition:
      "Estimated standard error of the analytical net recurrence risk. The published calculation does not include uncertainty in adjustment factor r.",
  },
  {
    key: "obs_surv",
    label: "Input net cancer survival",
    definition:
      "Relative or cause-specific survival estimates exported from SEER*Stat for the population group being analyzed.",
  },
  {
    key: "obs_dist_surv",
    label: "Input net survival for metastatic disease at diagnosis",
    definition:
      "Relative or cause-specific survival estimates exported from SEER*Stat for patients with distant metastatic disease at initial diagnosis, used to estimate survival after metastatic recurrence.",
  },
];

// Map of key (and any aliases) -> catalog entry, for O(1) lookup.
export const TABLE_COLUMN_MAP = TABLE_COLUMNS.reduce((acc, entry) => {
  acc[entry.key] = entry;
  for (const alias of entry.aliases ?? []) {
    acc[alias] = entry;
  }
  return acc;
}, {});

export function getTableColumn(key) {
  return TABLE_COLUMN_MAP[key];
}
