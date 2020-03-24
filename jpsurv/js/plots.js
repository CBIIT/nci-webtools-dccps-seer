// yMark - marker, yLine - line
function plotLineChart(x, yMark, yLine, dimension, plotTitle, xTitle, yTitle, divID) {
  var mTrace = {};
  var lTrace = {};
  var legend = {};
  var data = [];
  var uniqueDimensions = Array.from(new Set(dimension));
  var layout = {
    title: plotTitle,
    hovermode: 'closest',
    xaxis: {
      title: xTitle
    },
    yaxis: {
      title: `${yTitle}\n\t\n\t`,
      showline: true,
      tickformat: '%',
      range: [0, 1],
      autorange: false
    },
    height: 600,
    width: 900
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

  uniqueDimensions.forEach(function(interval, i) {
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
      name: divID != 'timePlot' ? interval + '-year ' + jpsurvData.additional.statistic : interval,
      legendgroup: interval
    };
  });

  x.forEach(function(x, i) {
    var markerText =
      divID != 'timePlot'
        ? 'Year at Diagnosis: ' +
          x +
          '<br>Recorded Survival: ' +
          yMark[i].toPrecision(4) +
          '%' +
          '<br>Interval: ' +
          dimension[i]
        : 'Interval: ' +
          x +
          '<br>Recorded Survival: ' +
          yMark[i].toPrecision(4) +
          '%' +
          '<br>Year: ' +
          dimension[i];

    var lineText =
      divID != 'timePlot'
        ? 'Year at Diagnosis: ' +
          x +
          '<br>Predicted Survival: ' +
          yLine[i].toPrecision(4) +
          '%' +
          '<br>Interval: ' +
          dimension[i]
        : 'Interval: ' +
          x +
          '<br>Predicted Survival: ' +
          yLine[i].toPrecision(4) +
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
