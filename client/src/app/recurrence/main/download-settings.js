import { getNotificationRows } from "@/services/download-settings";

export function getRecurrenceParameterRows(params, seerData) {
  const stageHeader = seerData?.seerStatDictionary?.find((h) => h.name === params.stageVariable);
  const distantFactor = stageHeader?.factors?.find((f) => String(f.value) === String(params.distantStageValue));
  const distantStageValue = distantFactor
    ? `${distantFactor.value} - ${String(distantFactor.label).replace(/"/g, "").trim()}`
    : params.distantStageValue;

  const strataRows = (params.strataOptions ?? []).map((variable) => {
    // The distant stage level is always included in the analysis
    const isIncluded = (o) =>
      o.checked || (variable.name === params.stageVariable && String(o.value) === String(params.distantStageValue));
    const selected = variable.options.filter(isIncluded);
    return [
      `Strata: ${variable.label}`,
      selected.length === variable.options.length ? "All" : selected.map((o) => o.label).join(", "),
    ];
  });

  return [
    ["Job ID", params.id],
    ["Input Type", params.inputType === "zip" ? "Workspace (.zip)" : "SEER*Stat/CanSurv Files"],
    ["SEER*Stat Files", seerData?.seerStatDataFileNames?.join(", ")],
    ["CanSurv File", seerData?.canSurvDataFileName],
    ["Stage Variable", params.stageVariable],
    ["Distant Stage Value", distantStageValue],
    ["Adjustment Factor r", params.adjustmentFactorR],
    ["Years of Follow-up", params.followUpYears],
    ...strataRows,
    ...getNotificationRows(params),
  ];
}

export function getRecurrenceSettingsRows(params, seerData, stratumLabel, tabRows = []) {
  return [...getRecurrenceParameterRows(params, seerData), ["Stratum", stratumLabel || "All"], ...tabRows];
}
