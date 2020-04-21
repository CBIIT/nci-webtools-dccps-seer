// yMark - marker, yLine - line
function plotLineChart(x, yMark, yLine, dimension, trends, divID) {
  var statistic = jpsurvData.additional.statistic;
  titles = {
    yearPlot: {
      plotTitle: 'Average Absolute Change in ' + statistic + ' by Diagnosis Year',
      xTitle: 'Year at Diagnosis',
      yTitle: statistic + ' (%)',
    },
    deathPlot: {
      plotTitle: 'Percent Change in the Anual Probability of Dying by Cancer by Diagnosis Year',
      xTitle: 'Year at Diagnosis',
      yTitle: 'Anual Probability of Cancer Death (%)',
    },
    timePlot: {
      plotTitle: statistic + ' by Interval per Diagnosis Year',
      xTitle: 'Interval',
      yTitle: statistic + ' (%)',
    },
  };

  var mTrace = {};
  var lTrace = {};
  var legend = {};
  var data = [];
  var uniqueDimensions = Array.from(new Set(dimension));
  var layout = {
    title: '<b>' + titles[divID].plotTitle + '</b>',
    hovermode: 'closest',
    font: {
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
      range: [0, 1],
      autorange: false,
    },
    height: 700,
    width: 900,
  };
  var colors = [
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
      mTrace[interval] = {
        x: [],
        y: [],
        showlegend: false,
        hovertemplate: [],
        hoverlabel: {
          align: 'left',
          bgcolor: '#FFF',
          bordercolor: colors[i % 10],
          font: { color: 'black' },
        },
        mode: 'markers',
        type: 'scatter',
        marker: { color: colors[i % 10] },
        legendgroup: interval,
      };

      lTrace[interval] = {
        x: [],
        y: [],
        showlegend: false,
        hovertemplate: [],
        hoverlabel: {
          align: 'left',
          bgcolor: '#FFF',
          bordercolor: colors[i % 10],
          font: { color: 'black' },
        },
        text: [],
        textposition: 'top',
        textfont: { color: colors[i % 10], size: 14 },
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
          `<br>•    Observed Survival: %{y:.${precision}%}<extra></extra>`;

    mTrace[dimension[i]].x.push(x);
    mTrace[dimension[i]].y.push(yMark[i] / 100);
    mTrace[dimension[i]].hovertemplate.push(markerTemplate);

    lTrace[dimension[i]].x.push(x);
    lTrace[dimension[i]].y.push(yLine[i] / 100);
    lTrace[dimension[i]].hovertemplate.push(lineTemplate);
    lTrace[dimension[i]].text.push('');
  });

  if (trends) {
    function buildTemplate(trend) {
      var trendLabel = divID == 'yearPlot' ? 'Trend AAC:' : 'Trend DAP:';
      if (Array.isArray(trend.interval)) {
        trend.interval.forEach(function (interval, i) {
          var year = Math.floor((trend['start.year'][i] + trend['end.year'][i]) / 2);
          if (i == trend.interval.length - 1) year = Math.floor(year - interval / 2);

          var yearIndex = lTrace[interval].x.indexOf(year);
          lTrace[interval].text[yearIndex] = (100 * trend.estimate[i]).toFixed(2);

          var startYear = lTrace[interval].x.indexOf(trend['start.year'][i]);
          var endYear =
            lTrace[interval].x.indexOf(trend['end.year'][i]) > -1
              ? lTrace[interval].x.indexOf(trend['end.year'][i])
              : lTrace[interval].x.length;
          if (startYear > -1 && endYear > -1) {
            var newTemplate = lTrace[interval].hovertemplate.slice();

            for (var j = startYear; j < endYear; j++) {
              newTemplate[j] = newTemplate[j].substr(0, newTemplate[j].indexOf('<extra>'));
              newTemplate[j] +=
                `<br>•    ${trendLabel} ${(100 * trend.estimate[i]).toFixed(2)} ` +
                `(${trend['start.year'][i]} - ${trend['end.year'][i]})<extra></extra>`;
            }
            lTrace[interval].hovertemplate = newTemplate;
          }
        });
      } else {
        var year = Math.floor((trend['start.year'] + trend['end.year'] - trend.interval) / 2);
        var yearIndex = lTrace[trend.interval].x.indexOf(year);
        lTrace[trend.interval].text[yearIndex] = (100 * trend.estimate).toFixed(2);

        var newTemplate = lTrace[trend.interval].hovertemplate.map(function (template) {
          template = template.substr(0, template.indexOf('<extra>'));
          return (template +=
            `<br>•    ${trendLabel} ${(100 * trend.estimate).toFixed(2)} ` +
            `(${trend['start.year']} - ${trend['end.year']})<extra></extra>`);
        });

        lTrace[trend.interval].hovertemplate = newTemplate;
      }
    }
    if (trends.length < 4) {
      for (var trend of trends) {
        buildTemplate(trend);
      }
    } else {
      buildTemplate(trends[0]);
    }
  }

  [mTrace, lTrace, legend].forEach(function (traceGroup) {
    Object.keys(traceGroup).forEach(function (trace) {
      data.push(traceGroup[trace]);
    });
  });

  Plotly.newPlot(divID, data, layout);
}
