// draw a line chart plot

function processPlotData(divID, x, yMark, yLine, dimension, trends) {
  let markerTrace = {};
  let lineTrace = {};
  let legend = {};
  let data = [];
  const uniqueDimensions = Array.from(new Set(dimension));

  const statistic = jpsurvData.additional.statistic;
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
        text: [],
        textposition: 'top',
        textfont: { color: colors[i % 10], size: fontSize },
        mode: 'lines+text',
        line: { shape: 'spline', color: colors[i % 10] },
        type: 'scatter',
        legendgroup: interval,
      };

      legend[interval] = {
        x: [null],
        y: [null],
        showlegend: true,
        mode: 'lines+markers',
        type: 'scatter',
        line: { color: colors[i % 10] },
        name: divID != 'timePlot' ? interval + '-year ' + statistic : interval,
        legendgroup: interval,
      };
    }
  });

  x.forEach(function (x, i) {
    var precision = $('#precision').val();
    var markerTemplate =
      divID != 'timePlot'
        ? `<b>${dimension[i]}-year ${statistic}</b>` +
          `<br>•    Year at Diagnosis: %{x}` +
          (divID == 'yearPlot'
            ? `<br>•    Observed Survival: %{y:.${precision}%}<extra></extra>`
            : `<br>•    Observed Death: %{y:.${precision}%}<extra></extra>`)
        : `<b>${dimension[i]}</b>` +
          `<br>•    Interval: %{x}` +
          `<br>•    Observed Survival: %{y:.${precision}%}<extra></extra>`;

    var lineTemplate =
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

    lineTrace[dimension[i]].x.push(x);
    lineTrace[dimension[i]].y.push(yLine[i] / 100);
    lineTrace[dimension[i]].hovertemplate.push(lineTemplate);
    lineTrace[dimension[i]].text.push('');
  });

  // draw annotations
  if (trends) {
    function buildTemplate(trend) {
      var trendLabel = divID == 'yearPlot' ? 'Trend AAC:' : 'Trend DAP:';
      if (Array.isArray(trend.interval)) {
        trend.interval.forEach(function (interval, i) {
          var year = Math.floor(
            (trend['start.year'][i] + trend['end.year'][i]) / 2
          );
          if (i == trend.interval.length - 1)
            year = Math.floor(year - interval / 2);

          var yearIndex = lineTrace[interval].x.indexOf(year);
          lineTrace[interval].text[yearIndex] = (
            100 * trend.estimate[i]
          ).toFixed(2);

          var startYear = lineTrace[interval].x.indexOf(trend['start.year'][i]);
          var endYear =
            lineTrace[interval].x.indexOf(trend['end.year'][i]) > -1
              ? lineTrace[interval].x.indexOf(trend['end.year'][i])
              : lineTrace[interval].x.length;
          if (startYear > -1 && endYear > -1) {
            var newTemplate = lineTrace[interval].hovertemplate.slice();

            for (var j = startYear; j < endYear; j++) {
              newTemplate[j] = newTemplate[j].substr(
                0,
                newTemplate[j].indexOf('<extra>')
              );
              newTemplate[j] +=
                `<br>•    ${trendLabel} ${(100 * trend.estimate[i]).toFixed(
                  2
                )} ` +
                `(${trend['start.year'][i]} - ${trend['end.year'][i]})<extra></extra>`;
            }
            lineTrace[interval].hovertemplate = newTemplate;
          }
        });
      } else {
        var year = Math.floor(
          (trend['start.year'] + trend['end.year'] - trend.interval) / 2
        );
        var yearIndex = lineTrace[trend.interval].x.indexOf(year);
        lineTrace[trend.interval].text[yearIndex] = (
          100 * trend.estimate
        ).toFixed(2);

        var newTemplate = lineTrace[trend.interval].hovertemplate.map(function (
          template
        ) {
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
        for (var trend of trends) {
          buildTemplate(trend);
        }
        // only draw top annotation
      } else {
        buildTemplate(trends[0]);
      }
      // only draw top annotation for dying plot
    } else if (divID == 'deathPlot') {
      // find top-most line trace
      var max = 0;
      var targetInt = 0;

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

  [markerTrace, lineTrace, legend].forEach(function (traceGroup) {
    Object.keys(traceGroup).forEach(function (trace) {
      data.push(traceGroup[trace]);
    });
  });
  return data;
}

function drawLineChart(divID, x, yMark, yLine, dimension, trends) {
  // fontSize defined in jpsurv.js
  const statistic = jpsurvData.additional.statistic;
  titles = {
    yearPlot: {
      plotTitle: statistic + ' by Diagnosis Year',
      xTitle: 'Year at Diagnosis',
      yTitle: statistic + ' (%)',
    },
    deathPlot: {
      plotTitle: 'Annual Probability of Dying of Cancer by Diagnosis Year',
      xTitle: 'Year at Diagnosis',
      yTitle: 'Anual Probability of Cancer Death (%)',
    },
    timePlot: {
      plotTitle:
        statistic + ' by Year Since Diagnosis for Selected Diagnosis Year',
      xTitle: 'Interval',
      yTitle: statistic + ' (%)',
    },
  };

  var layout = {
    title: '<b>' + titles[divID].plotTitle + '</b>',
    hovermode: 'closest',
    font: {
      size: fontSize,
      family: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    },
    legend: {
      orientation: 'h',
      x: 0.5,
      y: -0.15,
      yanchor: 'top',
      xanchor: 'center',
    },
    xaxis: {
      title: '<b>' + titles[divID].xTitle + '</b>',
    },
    yaxis: {
      title: '<b>' + titles[divID].yTitle + '<br> </b>',
      showline: true,
      tickformat: '%',
      tickmode: 'auto',
      nticks: 11,
      range: [0, 1.05],
      autorange: false,
    },
    height: 700,
    width: 900,
  };

  const data = processPlotData(divID, x, yMark, yLine, dimension, trends);

  Plotly.react(divID, data, layout);
}

function updatePlotFontSize(divID, size) {
  // layout
  Plotly.relayout(divID, { font: { size: size } });
  // data (traces)
  Plotly.restyle(divID, {
    textFont: { size: size },
    hoverlabel: { font: { size: size } },
  });
}

function updatePlotData(divID, x, yMark, yLine, dimension, trends) {
  const data = processPlotData(divID, x, yMark, yLine, dimension, trends);

  data.forEach((trace, i) => {
    Plotly.deleteTraces(divID, i);
    Plotly.addTraces(divID, trace, i);
  });
}
