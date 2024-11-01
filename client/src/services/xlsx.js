import { utils, writeFile } from "xlsx";
import { replaceVariables } from "./seer-variables";

export function downloadAll(modelData, coefData, seerData, params, filename) {
  const wb = utils.book_new();
  const combinedData = modelData.flat().reduce((acc, fit) => [...acc, ...fit.fullpredicted], []);
  const dataWs = utils.json_to_sheet(combinedData);
  utils.book_append_sheet(wb, dataWs, "Data");

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

export function downloadTable(data, headers, seerData, params, filename) {
  const wb = utils.book_new();
  const table = data.map((row) =>
    headers.reduce((acc, key) => {
      if (row.hasOwnProperty(key)) {
        acc[key] = row[key];
      }
      return acc;
    }, {})
  );
  const dataWs = utils.json_to_sheet(table);
  utils.book_append_sheet(wb, dataWs, "Data");

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
