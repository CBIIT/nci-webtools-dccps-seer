// Mirrors the CanSurv tables' cell formatting: falsy values display as "NA"
export function formatCansurvPercent(value, precision) {
  return value ? (value * 100).toFixed(precision) : "NA";
}

export function getCohortVariableColumns(cohortVariables, valueToLabelMap) {
  return cohortVariables.map((e) => ({
    id: e.name,
    label: e.label,
    getValue: (row) => row[e.name],
    format: (value) => valueToLabelMap[e.name][value],
  }));
}

export const intervalColumn = { id: "Interval", label: "Time Since Diagnosis", getValue: (row) => row.Interval };

export function getSurvivalColumns(precision) {
  const percent = (value) => formatCansurvPercent(value, precision);
  return [
    { id: "Relative_Survival_Cum", label: "Observed (%)", getValue: (row) => row.Relative_Survival_Cum, format: percent },
    { id: "estimated-survival", label: "Estimated (%)", getValue: (row) => row[".Surv.Est"], format: percent },
  ];
}

export function getActuarialColumns({ data, formState, seerData, valueToLabelMap, precision, stratumIndex = 0 }) {
  const subStratumVars = seerData.cohortVariables.filter((e) => Object.keys(formState).includes(e.name));
  return [
    { id: "stratum", label: "Stratum", getValue: () => valueToLabelMap.stratum[stratumIndex] },
    ...getCohortVariableColumns(subStratumVars, valueToLabelMap),
    intervalColumn,
    ...getSurvivalColumns(precision),
    ...(data[0]?.[".Cure.Fraction"]
      ? [
          {
            id: "cure-fraction",
            label: "Cure Fraction (%)",
            getValue: (row) => row[".Cure.Fraction"],
            format: (value) => formatCansurvPercent(value?.[0], precision),
          },
        ]
      : []),
  ];
}

export function getKYearColumns({ seerData, valueToLabelMap, precision }) {
  return [
    ...getCohortVariableColumns(seerData.cohortVariables, valueToLabelMap),
    intervalColumn,
    ...getSurvivalColumns(precision),
  ];
}

export function getDevianceColumns({ seerData, valueToLabelMap, precision }) {
  return [
    ...getCohortVariableColumns(seerData.cohortVariables, valueToLabelMap),
    intervalColumn,
    {
      id: "dev",
      label: "Deviance Residuals",
      getValue: (row) => row[".Dev.Resid"],
      format: (value) => (value ? value.toFixed(precision) : "NA"),
    },
  ];
}

// profileLL rows are [cureFraction, logL] pairs
export function getLoglikeColumns({ precision }) {
  return [
    { id: "cureFraction", label: "Cure Fraction C", getValue: (row) => row[0] },
    {
      id: "ll",
      label: "Log(L)",
      getValue: (row) => row[1],
      format: (value) => (!isNaN(value) ? value.toFixed(precision) : "NA"),
    },
  ];
}
