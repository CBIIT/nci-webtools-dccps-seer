/**
 * Replaces variables in the given data based on the provided SEER data and parameters.
 *
 * @param {Array<Object>} data - The data array where variables need to be replaced.
 * @param {Object} seerData - The SEER data containing cohort variables.
 * @param {Object} params - The parameters for replacement.
 * @returns {Array<Object>} The data array with replaced variables.
 */
export function relabelData(data, seerData, params) {
  const { cohortVariables } = seerData;
  const replacement = data.map((row) => {
    return {
      ...row,
      [params.year]: row[params.year] + params.firstYear,
      ...cohortVariables.reduce(
        (acc, cohort) => ({
          ...acc,
          [cohort.name]: cohort.factors.filter((e) => e.value == row[cohort.name])[0]?.label,
        }),
        {}
      ),
    };
  });

  return replacement;
}

const columns = [
  "Observed_Survival_Cum",
  "Observed_Survival_Interval",
  "Expected_Survival_Interval",
  "Expected_Survival_Cum",
  "Relative_Survival_Interval",
  "Relative_Survival_Cum",
  "Observed_SE_Interval",
  "Observed_SE_Cum",
  "Relative_SE_Interval",
  "Relative_SE_Cum",
  "CauseSpecific_Survival_Interval",
  "CauseSpecific_Survival_Cum",
  "CauseSpecific_SE_Interval",
  "CauseSpecific_SE_Cum",
  "Predicted_Survival_Int",
  "Predicted_ProbDeath_Int",
  "Predicted_Survival_Cum",
  "Predicted_Survival_Int_SE",
  "Predicted_ProbDeath_Int_SE",
  "Predicted_Survival_Cum_SE",
  "pred_cum",
  "pred_cum_se",
  "pred_int",
  "pred_int_se",
  "observed",
  "observed_se",
];

export function changePrecision(data, precision) {
  return data.map((row) => ({
    ...row,
    ...columns.reduce((acc, col) => {
      return {
        ...acc,
        [col]: row[col] ? Number(row[col].toFixed(precision)) : row[col],
      };
    }, {}),
  }));
}

export function scaleData(data, scale = 100) {
  return data.map((row) => ({
    ...row,
    ...columns.reduce((acc, col) => {
      return {
        ...acc,
        [col]: row[col] ? row[col] * scale : row[col],
      };
    }, {}),
  }));
}
