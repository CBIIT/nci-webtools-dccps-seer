import { utils, writeFile } from "@e965/xlsx";

function getCohortLabel(params, cohortIndex) {
  return (
    params.cohortCombos?.[cohortIndex]
      ?.map((c, i) => params.cohorts[i].options.find((o) => o.value == c)?.label)
      .join(" + ") ?? `Cohort ${cohortIndex}`
  );
}

export function downloadAll(modelData, coefData, seerData, params, filename, manifest) {
  const wb = utils.book_new();

  // align valid manifest entries with modelData (same filter as fetchAll)
  const validManifest = manifest?.filter((e) => e?.model);
  const isFinalModel = (cohortIndex, modelIndex) => validManifest?.[cohortIndex]?.final_model_index === modelIndex;

  const indexRows = modelData.flatMap((models, cohortIndex) =>
    models.map((fit, modelIndex) => ({
      Sheet: isFinalModel(cohortIndex, modelIndex)
        ? `${cohortIndex}-${modelIndex} (final selected model)`
        : `${cohortIndex}-${modelIndex}`,
      Cohort: getCohortLabel(params, cohortIndex),
      Joinpoints: modelIndex,
    }))
  );
  const indexWs = utils.json_to_sheet(indexRows);
  utils.book_append_sheet(wb, indexWs, "Index");

  modelData.forEach((models, cohortIndex) => {
    models.forEach((fit, modelIndex) => {
      const dataWs = utils.json_to_sheet(fit.fullpredicted);
      const suffix = isFinalModel(cohortIndex, modelIndex) ? " (final selected model)" : "";
      utils.book_append_sheet(wb, dataWs, `Data ${cohortIndex}-${modelIndex}${suffix}`);
    });
  });

  coefData.forEach((modelEstimates, cohortIndex) => {
    modelEstimates.forEach((me, modelIndex) => {
      const modelEstWs = modelEstimatesSheet(me, modelData[cohortIndex][modelIndex], modelIndex, params);
      utils.book_append_sheet(wb, modelEstWs, `Model Estimates ${cohortIndex}-${modelIndex}`);
    });
  });

  const settingsWs = settingsSheet(params);
  utils.book_append_sheet(wb, settingsWs, "Settings");
  writeFile(wb, `${filename}.xlsx`);
}

function modelEstimatesSheet(estData, data, jp, params) {
  const estimates = estData.map((e) => ({
    "Parameter": e["_row"],
    "Estimate (%)": e["Estimates"],
    "Standard Error (%)": e["Std.Error"],
  }));
  const estimatesArray = Object.keys(estimates[0]).map((key) => [key, ...estimates.map((e) => e[key])]);

  const info = {
    "Locations": data?.jp
      ? Array.isArray(data.jp)
        ? data.jp.map((e) => +e + params.firstYear).join(", ")
        : data.jp + params.firstYear
      : "None",
    "Estimates": "Joinpoint " + jp,
    "Bayesian Information Criterion (BIC)": data.bic,
    "Akaike Information Criterial (AIC)": data.aic,
    "Log Likelihood": data.ll,
    "Converged": data.converged ? "Yes" : "No",
  };

  const transposeInfo = Object.keys(info).map((key) => [key, info[key]]);
  return utils.aoa_to_sheet([...transposeInfo, [], ...estimatesArray]);
}

function settingsSheet(params) {
  const data = {
    "Year of Diagnosis": params.year,
    "Year of Diagnosis Range": `${params.yearStart + params.firstYear} - ${params.yearEnd + params.firstYear}`,
    "Max Intervals from Diagnosis to Include": params.interval,
    ...params.cohorts.reduce((acc, cohort, ci) => {
      const cohortValue = cohort.options
        .filter((e) => e.checked)
        .map((e) => e.label)
        .join(", ");
      return { ...acc, [cohort.name]: cohortValue };
    }, {}),

    "Maximum Joinpoints": params.maxJp,
  };

  const transposedData = Object.keys(data).map((key) => [key, data[key]]);
  return utils.aoa_to_sheet(transposedData);
}

function parameterSheet(parameterRows) {
  return utils.aoa_to_sheet([["Parameter", "Value"], ...parameterRows.map(([label, value]) => [label, value ?? ""])]);
}

function formatExportValue(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  // Keep rounded display text numeric so Excel can sort/compute with it
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
  return value;
}

export function downloadGroupResults(results, parameterRows, filename) {
  const wb = utils.book_new();
  utils.book_append_sheet(wb, utils.json_to_sheet(results), "Data");
  utils.book_append_sheet(wb, parameterSheet(parameterRows), "Settings");
  writeFile(wb, `${filename}.xlsx`);
}

/**
 * @param {object[]} rows
 * @param {{ label: string, getValue: (row: object) => any, format?: (value: any) => any }[]} columns
 * @param {[string, any][]} settingsRows
 * @param {string} filename
 */
export function downloadDataset(rows, columns, settingsRows, filename) {
  const wb = utils.book_new();
  const table = rows.map((row) =>
    columns.map(({ getValue, format }) => {
      const value = getValue(row);
      return formatExportValue(format ? format(value) : value);
    })
  );
  utils.book_append_sheet(wb, utils.aoa_to_sheet([columns.map((c) => c.label), ...table]), "Data");
  utils.book_append_sheet(wb, parameterSheet(settingsRows), "Settings");
  writeFile(wb, `${filename}.xlsx`);
}
