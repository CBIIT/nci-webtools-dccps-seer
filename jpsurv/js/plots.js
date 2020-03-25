// yMark - marker, yLine - line
function plotLineChart(x, yMark, yLine, dimension, trends, plotTitle, xTitle, yTitle, divID) {
  var mTrace = {};
  var lTrace = {};
  var legend = {};
  var data = [];
  var uniqueDimensions = Array.from(new Set(dimension));
  var layout = {
    title: '<b>' + plotTitle + '</b>',
    hovermode: 'closest',
    font: {
      family: 'Arial, Helvetica, sans-serif'
    },
    legend: {
      orientation: 'h',
      x: 0.5,
      y: -0.15,
      yanchor: 'top',
      xanchor: 'center'
    },
    xaxis: {
      title: '<b>' + xTitle + '</b>'
    },
    yaxis: {
      title: '<b>' + yTitle + '<br> </b>',
      showline: true,
      tickformat: '%',
      range: [0, 1],
      autorange: false
    },
    height: 600,
    width: 900,
    annotations: []
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
    '#17becf' // blue-teal
  ];

  if (trends) {
    for (var trend of trends) {
      if (Array.isArray(trend.interval)) {
        for (var i in trend.interval) {
          var year = Math.floor((trend['start.year'][i] + trend['end.year'][i]) / 2);

          layout.annotations.push({
            x: year,
            y: yLine[x.indexOf(year) + dimension.indexOf(trend.interval[i])] / 100,
            xref: 'x',
            yref: 'y',
            text: (100 * trend.estimate[i]).toFixed(1),
            font: { color: colors[dimension.indexOf(trend.interval[i]) % 10] },
            showarrow: true,
            arrowcolor: colors[dimension.indexOf(trend.interval[i]) % 10]
          });
        }
      } else {
        var year = Math.floor((trend['start.year'] + trend['end.year']) / 2);

        layout.annotations.push({
          x: year,
          y: yLine[x.indexOf(year) + dimension.indexOf(trend.interval)] / 100,
          xref: 'x',
          yref: 'y',
          text: (100 * trend.estimate).toFixed(1),
          font: { color: colors[dimension.indexOf(trend.interval) % 10] },
          showarrow: true,
          arrowcolor: colors[dimension.indexOf(trend.interval) % 10]
        });
      }
    }
  }

  uniqueDimensions.forEach(function(interval, i) {
    if (!legend[interval]) {
      mTrace[interval] = {
        x: [],
        y: [],
        showlegend: false,
        text: [],
        textposition: 'top center',
        hoverinfo: 'text',
        mode: 'markers',
        type: 'scatter',
        marker: { color: colors[i % 10] },
        legendgroup: interval
      };

      lTrace[interval] = {
        x: [],
        y: [],
        showlegend: false,
        text: [],
        hoverinfo: 'text',
        mode: 'lines',
        line: { shape: 'spline' },
        type: 'scatter',
        line: { color: colors[i % 10] },
        legendgroup: interval
      };

      legend[interval] = {
        x: [null],
        y: [null],
        showlegend: true,
        mode: 'lines+markers',
        type: 'scatter',
        line: { color: colors[i % 10] },
        name:
          divID != 'timePlot' ? interval + '-year ' + jpsurvData.additional.statistic : interval,
        legendgroup: interval
      };
    }
  });

  x.forEach(function(x, i) {
    var markerText =
      divID != 'timePlot'
        ? 'Year at Diagnosis: ' +
          x +
          '<br>Recorded Survival: ' +
          yMark[i].toFixed($('#precision').val()) +
          '%' +
          '<br>Interval: ' +
          dimension[i]
        : 'Interval: ' +
          x +
          '<br>Recorded Survival: ' +
          yMark[i].toFixed($('#precision').val()) +
          '%' +
          '<br>Year: ' +
          dimension[i];

    var lineText =
      divID != 'timePlot'
        ? 'Year at Diagnosis: ' +
          x +
          '<br>Predicted Survival: ' +
          yLine[i].toFixed($('#precision').val()) +
          '%' +
          '<br>Interval: ' +
          dimension[i]
        : 'Interval: ' +
          x +
          '<br>Predicted Survival: ' +
          yLine[i].toFixed($('#precision').val()) +
          '%' +
          '<br>Year: ' +
          dimension[i];

    mTrace[dimension[i]].x.push(x);
    mTrace[dimension[i]].y.push(yMark[i] / 100);
    mTrace[dimension[i]].text.push(markerText);

    lTrace[dimension[i]].x.push(x);
    lTrace[dimension[i]].y.push(yLine[i] / 100);
    lTrace[dimension[i]].text.push(lineText);
  });

  [mTrace, lTrace, legend].map(function(traceGroup) {
    Object.keys(traceGroup).forEach(function(trace) {
      data.push(traceGroup[trace]);
    });
  });

  Plotly.newPlot(divID, data, layout);
}
