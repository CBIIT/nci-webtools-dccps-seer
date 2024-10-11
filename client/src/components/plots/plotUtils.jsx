const colors = [
  "#1f77b4", // muted blue
  "#ff7f0e", // safety orange
  "#2ca02c", // cooked asparagus green
  "#d62728", // brick red
  "#9467bd", // muted purple
  "#8c564b", // chestnut brown
  "#e377c2", // raspberry yogurt pink
  "#7f7f7f", // middle gray
  "#bcbd22", // curry yellow-green
  "#17becf", // blue-teal
];
const fontSize = 14;

export function makeLineTrace(name = "", group, index, xArray, yArray, statistic, precision = 2) {
  return {
    name,
    x: xArray,
    y: yArray,
    showlegend: false,
    hovertemplate: predictedHoverTemplate(name, statistic, precision),
    hoverlabel: {
      align: "left",
      bgcolor: "#FFF",
      bordercolor: colors[index % 10],
      font: { size: fontSize, color: "black" },
    },
    mode: "lines",
    line: { shape: "spline", color: colors[index % 10] },
    type: "scatter",
    legendgroup: group,
  };
}

export function makeDashTrace(name = "", group, index, xArray, yArray, statistic, precision = 2) {
  return {
    name,
    x: xArray,
    y: yArray,
    showlegend: false,
    hovertemplate: predictedHoverTemplate(name, statistic, precision),
    hoverlabel: {
      align: "left",
      bgcolor: "#FFF",
      bordercolor: colors[index % 10],
      font: { size: fontSize, color: "black" },
    },
    mode: "lines",
    line: { dash: "dash", color: colors[index % 10] },
    type: "scatter",
    legendgroup: group,
  };
}

export function makeMarkerTrace(name = "", group, index, xArray, yArray, statistic, precision = 2) {
  return {
    name,
    x: xArray,
    y: yArray,
    showlegend: false,
    hovertemplate: observationHoverTemplate(name, statistic, precision),
    hoverlabel: {
      align: "left",
      bgcolor: "#FFF",
      bordercolor: colors[index % 10],
      font: { size: fontSize, color: "black" },
    },
    mode: "markers",
    type: "scatter",
    marker: { color: colors[index % 10] },
    legendgroup: group,
  };
}

export function makeLegendTrace(name, group, index, mode = "lines+markers", dash = null) {
  return {
    name,
    x: [null],
    y: [null],
    showlegend: true,
    mode: mode,
    type: "scatter",
    line: { color: colors[index % 10], dash: dash },
    legendgroup: group,
  };
}

export function makeLayout(range, title, xTitle, yTitle) {
  return {
    title: `<b>${title}</b>`,
    hovermode: "closest",
    font: {
      size: fontSize,
      family: "Inter, sans-serif",
    },
    legend: {
      orientation: "h",
      // x: 0.5,
      y: -0.15,
      // yanchor: 'top',
      // xanchor: 'center',
    },
    xaxis: {
      title: `<b>${xTitle}</b>`,
      range: range,
      autorange: true,
      //   dtick: divId == "timePlot" ? 1 : null,
    },
    yaxis: {
      title: `<b>${yTitle}</b>`,
      showline: true,
      tickformat: "1%",
      tickmode: "auto",
      nticks: 11,
      range: [0, 1.05],
      autorange: false,
    },
    height: 700,
    // width: 1000,
    autosize: true,
  };
}

const observationHoverTemplate = (name, statistic, precision) =>
  [
    `<b>${name} ${statistic}</b>`,
    `<br>•\tYear at Diagnosis: %{x}`,
    `<br>•\tObserved Survival: %{y:.${precision}%}<extra></extra>`,
  ].join("");

const predictedHoverTemplate = (name, statistic, precision) =>
  [
    `<b>${name} ${statistic}</b>`,
    `<br>•\tYear at Diagnosis: %{x}`,
    `<br>•\tPredicted Survival: %{y:.${precision}%}<extra></extra>`,
  ].join("");

function makeLineHoverTemplate(name, statistic = jpsurvData.additional.statistic, precision = $("#precision").val()) {
  return divId != "timePlot"
    ? `<b>${name} ${statistic}</b>` +
        `<br>•    Year at Diagnosis: %{x}` +
        (divId == "yearPlot"
          ? `<br>•    Predicted Survival: %{y:.${precision}%}<extra></extra>`
          : `<br>•    Predicted Death: %{y:.${precision}%}<extra></extra>`)
    : `<b>${name}</b>` + `<br>•    Interval: %{x}` + `<br>•    Predicted Survival: %{y:.${precision}%}<extra></extra>`;
}

function makeMarkerHoverTemplate(name, statistic = jpsurvData.additional.statistic, precision = $("#precision").val()) {
  return divId != "timePlot"
    ? `<b>${name} ${statistic}</b>` +
        `<br>•    Year at Diagnosis: %{x}` +
        (divId == "yearPlot"
          ? `<br>•    Observed Survival: %{y:.${precision}%}<extra></extra>`
          : `<br>•    Observed Death: %{y:.${precision}%}<extra></extra>`)
    : `<b>${name}</b>` + `<br>•    Interval: %{x}` + `<br>•    Observed Survival: %{y:.${precision}%}<extra></extra>`;
}
