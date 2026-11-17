import { getCohortLabel } from "./cohort-select";
import { getNotificationRows, yesNo } from "@/services/download-settings";

const INPUT_TYPES = {
  seer: "SEER*Stat Dictionary and Data Files",
  csv: "CSV File",
  zip: "Workspace",
};

export function getJpsurvParameterRows(params, seerData) {
  const yearLabel = seerData?.seerStatDictionary?.find((h) => h.name === params.year)?.label ?? params.year;
  const cohortRows = (params.cohorts ?? []).map((cohort) => [
    cohort.label ?? cohort.name,
    cohort.options
      .filter((o) => o.checked)
      .map((o) => o.label)
      .join(", "),
  ]);

  return [
    ["File Format", INPUT_TYPES[params.inputType] ?? params.inputType],
    ["Input Files", Array.isArray(params.inputFile) ? params.inputFile.join(", ") : params.inputFile],
    ["Statistic", params.statistic],
    ["Rates Displayed As", params.rates],
    ["Year of Diagnosis", yearLabel],
    ["Year of Diagnosis Range", `${+params.yearStart + params.firstYear} - ${+params.yearEnd + params.firstYear}`],
    ["Max No. of Years from Diagnosis (follow-up) to include", params.interval],
    ...cohortRows,
    ["Maximum Joinpoints", params.maxJp],
    ["Conditional Survival Model Using Truncated Data", yesNo(params.useCondModel)],
    ...(params.useCondModel ? [["Interval Range", `${params.conditionalStart} - ${params.conditionalEnd}`]] : []),
    ["Relax Proportionality", yesNo(params.useRelaxModel)],
    ...(params.useRelaxModel ? [["Cut Point", params.cutpoint]] : []),
    ["Delete Last Interval", yesNo(params.delLastIntvl)],
    ["Minimum Number of Years between Joinpoints (Excluding Joinpoints)", params.numbetwn],
    ["Minimum Number of Years before First Joinpoint (Excluding Joinpoint)", params.numfromstart],
    ["Minimum Number of Years after Last Joinpoint (Excluding Joinpoint)", params.numtoend],
    ["Number of Calendar Years of Projected Survival", params.projectedYears],
    ...getNotificationRows(params),
  ];
}

/**
 * @param {object} options
 * @param {object} options.main - store `main` (cohortIndex, fitIndex, cutpointIndex, cluster)
 * @param {object[] | null} options.conditionalIntervals - recalculation intervals, when conditional data is shown
 */
export function getJpsurvSettingsRows(params, seerData, { main, conditionalIntervals }, tabRows = []) {
  const { cohortIndex, fitIndex, cutpointIndex, cluster } = main;
  return [
    ...getJpsurvParameterRows(params, seerData),
    ["Cohort", getCohortLabel(params, cohortIndex)],
    ["Joinpoint Model", fitIndex],
    ...(params.useRelaxModel
      ? [
          // The cutpoint dropdown shows the 0-based position of the 1-based cutpoint_index
          ["Cutpoint", cutpointIndex ? cutpointIndex - 1 : ""],
          ["Cluster", cluster === "cond" ? "Cluster 2" : "Cluster 1"],
        ]
      : []),
    ...(conditionalIntervals?.length
      ? [
          [
            "Conditional Survival Recalculation Intervals",
            conditionalIntervals.map(({ start, end }) => `${start} - ${end}`).join(", "),
          ],
        ]
      : []),
    ...tabRows,
  ];
}
