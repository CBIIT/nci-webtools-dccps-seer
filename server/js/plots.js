// draw a line chart plot

const colors = [
  '#1f77b4', // muted blue
  '#ff7f0e', // safety orange
  '#2ca02c', // cooked asparagus green
  '#d62728', // brick red
  '#9467bd', // muted purple
  '#8c564b', // chestnut brown
  '#e377c2', // raspberry yogurt pink
  '#7f7f7f', // middle gray
  '#bcbd22', // curry yellow-green
  '#17becf', // blue-teal
];

export function makeLineTrace(divId, name = '', index, xArray, yArray) {
  return {
    // name,
    x: xArray,
    y: yArray,
    showlegend: false,
    hovertemplate: makeLineHoverTemplate(divId, name),
    hoverlabel: {
      align: 'left',
      bgcolor: '#FFF',
      bordercolor: colors[index % 10],
      font: { size: fontSize, color: 'black' },
    },
    mode: 'lines',
    line: { shape: 'spline', color: colors[index % 10] },
    type: 'scatter',
    legendgroup: name,
  };
}

export function makeDashTrace(divId, name = '', index = '', xArray, yArray) {
  return {
    // name,
    x: xArray,
    y: yArray,
    showlegend: false,
    hovertemplate: makeLineHoverTemplate(divId, name),
    hoverlabel: {
      align: 'left',
      bgcolor: '#FFF',
      bordercolor: index ? colors[index % 10] : 'black',
      font: { size: fontSize, color: 'black' },
    },
    mode: 'lines',
    line: { dash: 'dash', color: colors[index % 10] },
    type: 'scatter',
    legendgroup: name,
  };
}

export function makeMarkerTrace(divId, name = '', index, xArray, yArray) {
  return {
    // name,
    x: xArray,
    y: yArray,
    showlegend: false,
    hovertemplate: makeMarkerHoverTemplate(divId, name),
    hoverlabel: {
      align: 'left',
      bgcolor: '#FFF',
      bordercolor: colors[index % 10],
      font: { size: fontSize, color: 'black' },
    },
    mode: 'markers',
    type: 'scatter',
    marker: { color: colors[index % 10] },
    legendgroup: name,
  };
}

export function makeLegendTrace(name, index, mode = 'lines+markers') {
  return {
    name,
    x: [null],
    y: [null],
    showlegend: true,
    mode: mode,
    type: 'scatter',
    line: { color: colors[index % 10] },
    legendgroup: name,
  };
}

export function makeLayout(divId, range, xTitle, yTitle, statistic, modelInfo) {
  return {
    title: titles(statistic, modelInfo)[divId].plotTitle,
    hovermode: 'closest',
    font: {
      size: fontSize,
      family: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    },
    legend: {
      orientation: 'h',
      // x: 0.5,
      y: -0.15,
      // yanchor: 'top',
      // xanchor: 'center',
    },
    xaxis: {
      title: '<b>' + xTitle + '</b>',
      range: range,
      autorange: divId == 'timePlot' ? true : false,
      dtick: divId == 'timePlot' ? 1 : null,
    },
    yaxis: {
      title: '<b>' + yTitle + '</b>',
      showline: true,
      tickformat: '%',
      tickmode: 'auto',
      nticks: 11,
      range: [0, 1.05],
      autorange: false,
    },
    height: 700,
    width: 1000,
  };
}

function makeLineHoverTemplate(
  divId,
  name,
  statistic = jpsurvData.additional.statistic,
  precision = $('#precision').val()
) {
  return divId != 'timePlot'
    ? `<b>${name} ${statistic}</b>` +
        `<br>•    Year at Diagnosis: %{x}` +
        (divId == 'yearPlot'
          ? `<br>•    Predicted Survival: %{y:.${precision}%}<extra></extra>`
          : `<br>•    Predicted Death: %{y:.${precision}%}<extra></extra>`)
    : `<b>${name}</b>` + `<br>•    Interval: %{x}` + `<br>•    Predicted Survival: %{y:.${precision}%}<extra></extra>`;
}

function makeMarkerHoverTemplate(
  divId,
  name,
  statistic = jpsurvData.additional.statistic,
  precision = $('#precision').val()
) {
  return divId != 'timePlot'
    ? `<b>${name} ${statistic}</b>` +
        `<br>•    Year at Diagnosis: %{x}` +
        (divId == 'yearPlot'
          ? `<br>•    Observed Survival: %{y:.${precision}%}<extra></extra>`
          : `<br>•    Observed Death: %{y:.${precision}%}<extra></extra>`)
    : `<b>${name}</b>` + `<br>•    Interval: %{x}` + `<br>•    Observed Survival: %{y:.${precision}%}<extra></extra>`;
}

export async function drawPlot(divId, data = [], layout = {}, config = {}) {
  return await Plotly.newPlot(divId, data, layout, {
    editable: true,
    ...config,
  });
}

export function processPlotData(divID, x, yMark, yLine, dimension, trends) {
  let markerTrace = {};
  let lineTrace = {};
  let projectedTrace = {};
  let lineTrendLabel = {}; // place trend labels on an invisible trace 2% higher than the line trace to avoid overlap
  let legend = {}; // group intervals in the legend with a custom title
  let projectedLegend = {};
  let observedLegend = {};
  let data = [];
  const uniqueDimensions = Array.from(new Set(dimension));

  const statistic = jpsurvData.additional.statistic;

  uniqueDimensions.forEach(function (interval, i) {
    if (!legend[interval]) {
      markerTrace[interval] = {
        x: [],
        y: [],
        showlegend: false,
        hovertemplate: [],
        hoverlabel: {
          align: 'left',
          bgcolor: '#FFF',
          bordercolor: colors[i % 10],
          font: { size: fontSize, color: 'black' },
        },
        mode: 'markers',
        type: 'scatter',
        marker: { color: colors[i % 10] },
        legendgroup: interval,
      };

      lineTrace[interval] = {
        x: [],
        y: [],
        showlegend: false,
        hovertemplate: [],
        hoverlabel: {
          align: 'left',
          bgcolor: '#FFF',
          bordercolor: colors[i % 10],
          font: { size: fontSize, color: 'black' },
        },
        mode: 'lines',
        line: { shape: 'spline', color: colors[i % 10] },
        type: 'scatter',
        legendgroup: interval,
      };

      projectedTrace[interval] = {
        x: [],
        y: [],
        showlegend: false,
        hovertemplate: [],
        hoverlabel: {
          align: 'left',
          bgcolor: '#FFF',
          bordercolor: colors[i % 10],
          font: { size: fontSize, color: 'black' },
        },
        mode: 'lines',
        line: { dash: 'dash', color: colors[i % 10] },
        type: 'scatter',
        legendgroup: interval,
      };

      lineTrendLabel[interval] = {
        x: [],
        y: [],
        showlegend: false,
        hoverinfo: 'skip',
        text: [],
        textposition: 'top',
        textfont: { color: colors[i % 10], size: fontSize },
        mode: 'text',
        type: 'scatter',
        legendgroup: interval,
      };

      legend[interval] = {
        x: [null],
        y: [null],
        showlegend: true,
        mode: 'lines',
        type: 'scatter',
        line: { color: colors[i % 10] },
        name:
          divID != 'timePlot'
            ? divID == 'yearPlot'
              ? `${interval}-year Predicted`
              : `Interval ${interval - 1}-${interval} Predicted`
            : `${interval} Predicted`,
        legendgroup: interval,
      };

      observedLegend[interval] = {
        x: [null],
        y: [null],
        showlegend: true,
        mode: 'markers',
        type: 'scatter',
        line: { color: colors[i % 10] },
        name:
          divID != 'timePlot'
            ? divID == 'yearPlot'
              ? `${interval}-year Observed`
              : `Interval ${interval - 1}-${interval} Observed`
            : interval + ' Observed',
        legendgroup: interval,
      };

      projectedLegend[interval] = {
        x: [null],
        y: [null],
        showlegend: true,
        mode: 'lines',
        type: 'scatter',
        line: { dash: 'dash', color: colors[i % 10] },
        name:
          divID != 'timePlot'
            ? divID == 'yearPlot'
              ? `${interval}-year Projected`
              : `Interval ${interval - 1}-${interval} Projected`
            : interval + ' Projected',
        legendgroup: interval,
      };
    }
  });

  x.forEach(function (x, i) {
    const precision = $('#precision').val();
    const markerTemplate =
      divID != 'timePlot'
        ? `<b>${dimension[i]}-year ${statistic}</b>` +
          `<br>•    Year at Diagnosis: %{x}` +
          (divID == 'yearPlot'
            ? `<br>•    Observed Survival: %{y:.${precision}%}<extra></extra>`
            : `<br>•    Observed Death: %{y:.${precision}%}<extra></extra>`)
        : `<b>${dimension[i]}</b>` +
          `<br>•    Interval: %{x}` +
          `<br>•    Observed Survival: %{y:.${precision}%}<extra></extra>`;

    const lineTemplate =
      divID != 'timePlot'
        ? `<b>${dimension[i]}-year ${statistic}</b>` +
          `<br>•    Year at Diagnosis: %{x}` +
          (divID == 'yearPlot'
            ? `<br>•    Predicted Survival: %{y:.${precision}%}<extra></extra>`
            : `<br>•    Predicted Death: %{y:.${precision}%}<extra></extra>`)
        : `<b>${dimension[i]}</b>` +
          `<br>•    Interval: %{x}` +
          `<br>•    Predicted Survival: %{y:.${precision}%}<extra></extra>`;

    markerTrace[dimension[i]].x.push(x);
    markerTrace[dimension[i]].y.push(yMark[i] / 100);
    markerTrace[dimension[i]].hovertemplate.push(markerTemplate);

    const dim = dimension[i];
    if (divID == 'timePlot' || i < yMark.findIndex((e, i) => dim == dimension[i] && e == 'NA')) {
      lineTrace[dimension[i]].x.push(x);
      lineTrace[dimension[i]].y.push(yLine[i] / 100);
      lineTrace[dimension[i]].hovertemplate.push(lineTemplate);
    } else {
      const dim = projectedTrace[dimension[i]];
      dim.x.push(x);
      dim.y.push(yLine[i] / 100);
      dim.hovertemplate.push(lineTemplate);
    }

    lineTrendLabel[dimension[i]].x.push(x + 0.5);
    lineTrendLabel[dimension[i]].y.push(yLine[i] / 98);
    lineTrendLabel[dimension[i]].text.push('');
  });

  // draw annotations
  if (trends) {
    function buildTemplate(trend) {
      const trendLabel = divID == 'yearPlot' ? 'Trend AAC:' : 'Trend DAP:';
      if (Array.isArray(trend.interval)) {
        trend.interval.forEach(function (interval, i) {
          let year = Math.floor((trend['start.year'][i] + trend['end.year'][i]) / 2);
          if (i == trend.interval.length - 1) year = Math.floor(year - interval / 2);

          const yearIndex = lineTrace[interval].x.indexOf(year);
          lineTrendLabel[interval].text[yearIndex] = (100 * trend.estimate[i]).toFixed(2);

          const startYear = lineTrace[interval].x.indexOf(trend['start.year'][i]);
          const endYear =
            lineTrace[interval].x.indexOf(trend['end.year'][i]) > -1
              ? lineTrace[interval].x.indexOf(trend['end.year'][i])
              : lineTrace[interval].x.length;
          if (startYear > -1 && endYear > -1) {
            let newTemplate = lineTrace[interval].hovertemplate.slice();

            for (let j = startYear; j < endYear; j++) {
              newTemplate[j] = newTemplate[j].substr(0, newTemplate[j].indexOf('<extra>'));
              newTemplate[j] +=
                `<br>•    ${trendLabel} ${(100 * trend.estimate[i]).toFixed(2)} ` +
                `(${trend['start.year'][i]} - ${trend['end.year'][i]})<extra></extra>`;
            }
            lineTrace[interval].hovertemplate = newTemplate;
          }
        });
      } else {
        const year = Math.floor((trend['start.year'] + trend['end.year'] - trend.interval) / 2);
        const yearIndex = lineTrace[trend.interval].x.indexOf(year);
        lineTrendLabel[trend.interval].text[yearIndex] = (100 * trend.estimate).toFixed(2);

        const newTemplate = lineTrace[trend.interval].hovertemplate.map(function (template) {
          template = template.substr(0, template.indexOf('<extra>'));
          return (template +=
            `<br>•    ${trendLabel} ${(100 * trend.estimate).toFixed(2)} ` +
            `(${trend['start.year']} - ${trend['end.year']})<extra></extra>`);
        });

        lineTrace[trend.interval].hovertemplate = newTemplate;
      }
    }
    if (divID == 'yearPlot') {
      // select correct trend if both exist
      if (trends['ACS.jp']) trends = trends['ACS.jp'];
      // only draw multiple trend annotations if less than 4 trend measures
      if (trends.length < 4) {
        for (const trend of trends) {
          buildTemplate(trend);
        }
        // only draw top annotation
      } else {
        buildTemplate(trends[0]);
      }
      // only draw top annotation for dying plot
    } else if (divID == 'deathPlot') {
      // find top-most line trace
      let max = 0;
      let targetInt = 0;

      Object.keys(lineTrace).forEach(function (interval) {
        if (lineTrace[interval].y[0] > max) {
          max = lineTrace[interval].y[0];
          targetInt = interval;
        }
      });

      trends.forEach(function (trend, i) {
        if (Array.isArray(trend.interval)) {
          if (trend.interval[0] == targetInt) {
            buildTemplate(trends[i]);
          }
        } else if (trend.interval == targetInt) {
          buildTemplate(trends[i]);
        }
      });
    }
  }

  [
    markerTrace,
    lineTrace,
    projectedTrace,
    lineTrendLabel,
    legend,
    observedLegend,
    divID !== 'timePlot' ? projectedLegend : false,
  ]
    .filter(Boolean)
    .forEach((traceGroup) => {
      Object.keys(traceGroup).forEach((trace) => {
        data.push(traceGroup[trace]);
      });
    });
  return data;
}

const titles = (statistic, modelInfo) => ({
  yearPlot: {
    plotTitle: `<b>${statistic} by Diagnosis Year</b>${modelInfo ? '<br>' + modelInfo : ''}`,
    xTitle: 'Year at Diagnosis',
    yTitle: statistic + ' (%)',
  },
  deathPlot: {
    plotTitle: `<b>Annual Probability of Dying of Cancer by Diagnosis Year</b>${modelInfo ? '<br>' + modelInfo : ''}`,
    xTitle: 'Year at Diagnosis',
    yTitle: 'Anual Probability of Cancer Death (%)',
  },
  timePlot: {
    plotTitle: `<b>${statistic} by Year Since Diagnosis for Selected Diagnosis Year</b>${
      modelInfo ? '<br>' + modelInfo : ''
    }`,
    xTitle: 'Interval',
    yTitle: statistic + ' (%)',
  },
});

export async function drawLineChart(divID, x, yMark, yLine, dimension, trends, modelInfo) {
  // fontSize defined in jpsurv.js
  const conditional = jpsurvData.calculate.form.conditional;
  const statistic = (conditional ? 'Conditional ' : '') + jpsurvData.additional.statistic;
  const plotTitles = titles(statistic);
  const layout = makeLayout(
    divID,
    [Math.min(...x), Math.max(...x)],
    plotTitles[divID].xTitle,
    plotTitles[divID].yTitle,
    statistic,
    modelInfo
  );

  const data = processPlotData(divID, x, yMark, yLine, dimension, trends);

  const plot = await Plotly.newPlot(divID, data, layout, { editable: true });

  // remove context menu from plotly
  plot.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
  });

  // add click events for annotations
  plot
    // remove annotation on right click
    .on('plotly_clickannotation', (data) => {
      if (data.event.button == 2) Plotly.relayout(divID, 'annotations[' + data.index + ']', 'remove');
    });
}

export function addAnnotation(plot) {
  const xData = plot.data[0].x;
  const xMean = xData.reduce((a, b) => a + b) / xData.length;
  const yData = plot.data[0].y.filter(Boolean);
  const yMean = yData.reduce((a, b) => a + b) / yData.length;
  const index = plot.layout.annotations ? plot.layout.annotations.length : 0;
  Plotly.relayout(plot, `annotations[${index}]`, {
    x: xMean,
    y: yMean + 0.1,
    xref: 'x',
    yref: 'y',
    text: `Annotation ${index + 1}`,
    bgcolor: 'rgba(255, 255, 255, 0.9)',
    captureevents: true,
    showarrow: false,
  });
}

export function updatePlotFontSize(divID, size) {
  // layout
  Plotly.relayout(divID, { font: { size: size } });
  // data (traces)
  Plotly.restyle(divID, {
    textFont: { size: size },
    hoverlabel: { font: { size: size } },
  });
}

export function updatePlotData(divID, x, yMark, yLine, dimension, trends) {
  const data = processPlotData(divID, x, yMark, yLine, dimension, trends);

  data.forEach((trace, i) => {
    Plotly.deleteTraces(divID, i);
    Plotly.addTraces(divID, trace, i);
  });
}
