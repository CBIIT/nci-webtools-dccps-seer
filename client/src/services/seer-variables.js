/**
 * Replaces variables in the given data based on the provided SEER data and parameters.
 *
 * @param {Array<Object>} data - The data array where variables need to be replaced.
 * @param {Object} seerData - The SEER data containing cohort variables.
 * @param {Object} params - The parameters for replacement.
 * @returns {Array<Object>} The data array with replaced variables.
 */
export function replaceVariables(data, seerData, params) {
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
