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

export function makeLineTrace(name = "", group, index, xArray, yArray, statistic, precision = 2, fontSize = 14) {
  return {
    name,
    x: xArray,
    y: yArray,
    showlegend: false,
    hovertemplate: statistic ? predictedHoverTemplate(name, statistic, precision) : false,
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

export function makeDashTrace(name = "", group, index, xArray, yArray, statistic, precision = 2, fontSize = 14) {
  return {
    name,
    x: xArray,
    y: yArray,
    showlegend: false,
    hovertemplate: statistic ? projectedHoverTemplate(name, statistic, precision) : false,
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

export function makeMarkerTrace(name = "", group, index, xArray, yArray, statistic, precision = 2, fontSize = 14) {
  return {
    name,
    x: xArray,
    y: yArray,
    showlegend: false,
    hovertemplate: statistic ? observationHoverTemplate(name, statistic, precision) : false,
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

export function makeLegendTrace(name, group, index, mode = "lines+markers", dash = null, showlegend = true) {
  return {
    name,
    showlegend,
    x: [null],
    y: [null],
    mode: mode,
    type: "scatter",
    line: { color: colors[index % 10], dash: dash },
    legendgroup: group,
  };
}

export function makeLayout(range, title, subtitle, xTitle, yTitle, fontSize = 14) {
  return {
    title: { text: `<b>${title}</b>`, subtitle: { text: subtitle } },
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
      dtick: 1,
    },
    yaxis: {
      title: `<b>${yTitle}</b>`,
      showline: true,
      // tickformat: ".2f",
      ticksuffix: "%",
      tickmode: "auto",
      nticks: 11,
      range: [0, 100],
      autorange: false,
    },
    height: 700,
    // width: 1000,
    autosize: true,
  };
}

export function makeAnnotation(x, y, index) {
  return {
    x,
    y,
    xref: "x",
    yref: "y",
    text: `Annotation ${index + 1}`,
    bgcolor: "rgba(255, 255, 255, 0.9)",
    captureevents: true,
    showarrow: false,
  };
}

const observationHoverTemplate = (name, statistic, precision) =>
  [
    `<b>${name} ${statistic}</b>`,
    `<br>•    Year at Diagnosis: %{x}`,
    `<br>•    Observed Survival: %{y:.${precision}f}%<extra></extra>`,
  ].join("");

const predictedHoverTemplate = (name, statistic, precision) =>
  [
    `<b>${name} ${statistic}</b>`,
    `<br>•    Year at Diagnosis: %{x}`,
    `<br>•    Predicted Survival: %{y:.${precision}f}%<extra></extra>`,
  ].join("");

const projectedHoverTemplate = (name, statistic, precision) =>
  [
    `<b>${name} ${statistic}</b>`,
    `<br>•    Year at Diagnosis: %{x}`,
    `<br>•    Projected Survival: %{y:.${precision}f}%<extra></extra>`,
  ].join("");
