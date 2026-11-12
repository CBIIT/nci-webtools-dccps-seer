// Config catalog for the method-based curve tabs. Each config describes one
// tab's analytical/numerical fields, labels, axis settings, and download
// shape. tab-method-curve/method-curve.jsx, plot.jsx and table.jsx are all
// driven by whichever config is passed in.
import { getAnalyticalCI, getRecurrenceFreeCI } from "./utils";

export const METASTATIC = {
  id: "metastatic",
  title: "Net Metastatic Recurrence Risk",
  valueLabel: "Net Recurrence Risk",
  yAxis: { title: "Net Metastatic Recurrence Risk (%)", rangemode: "tozero" },
  analyticalKey: "CI_analytical",
  numericalKey: "CI_numerical",
  getCI: getAnalyticalCI,
  seKey: "se_CI_analytical",
  seriesSuffix: "",
  note: null,
  downloadColumns: null,
  filenamePrefix: "recurrisk",
};

export const RECURRENCE_FREE = {
  id: "recurrenceFree",
  title: "Net Recurrence-free Probability",
  valueLabel: "Net Recurrence-free Probability",
  yAxis: { title: "Net Recurrence-free Probability (%)", range: [0, 100] },
  analyticalKey: "G_analytical",
  numericalKey: "G_numerical",
  getCI: getRecurrenceFreeCI,
  seKey: "se_CI_analytical",
  seriesSuffix: "",
  note: null,
  downloadColumns: ["followup", "G_analytical", "se_CI_analytical", "G_numerical"],
  filenamePrefix: "recurrisk-recurrence-free",
};

export const NONCURED = {
  id: "noncured",
  title: "Recurrence-free Probability among the Noncured Fraction",
  valueLabel: "Recurrence-free Probability",
  yAxis: { title: "Recurrence-free Probability, Noncured Fraction (%)", range: [0, 100] },
  analyticalKey: "s1_analytical",
  numericalKey: "s1_numerical",
  getCI: null,
  seKey: null,
  seriesSuffix: " (Noncured Fraction)",
  note: "These estimates apply only to the modeled noncured fraction (patients at risk of cancer death), not to the full cohort.",
  downloadColumns: ["followup", "s1_analytical", "s1_numerical"],
  filenamePrefix: "recurrisk-noncured",
};
