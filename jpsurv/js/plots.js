// yMark - marker, yLine - line
function plotLineChart(x, yMark, yLine, dimension, plotTitle, xTitle, yTitle, divID) {
  var mTrace = {};
  var lTrace = {};
  var data = [];
  var uniqueDimensions = Array.from(new Set(dimension));
  var layout = {
    title: plotTitle,
    xaxis: {
      title: xTitle
    },
    yaxis: {
      title: yTitle,
      tickformat: '.2%'
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
      mode: 'markers',
      type: 'scatter',
      marker: { color: colors[i % 10] }
    };
    lTrace[interval] = {
      x: [],
      y: [],
      mode: 'lines',
      line: { shape: 'spline' },
      type: 'scatter',
      line: { color: colors[i % 10] }
    };
  });

  x.forEach(function(x, i) {
    mTrace[dimension[i]].x.push(x);
    mTrace[dimension[i]].y.push(yMark[i] / 100);
    mTrace[dimension[i]].name = 'Recorded - ' + dimension[i];
    mTrace[dimension[i]].legendgroup = dimension[i];

    lTrace[dimension[i]].x.push(x);
    lTrace[dimension[i]].y.push(yLine[i] / 100);
    lTrace[dimension[i]].name = 'Predicted - ' + dimension[i];
    lTrace[dimension[i]].legendgroup = dimension[i];
  });

  [mTrace, lTrace].map(function(traceGroup) {
    Object.keys(traceGroup).forEach(function(trace) {
      data.push(traceGroup[trace]);
    });
  });

  Plotly.newPlot(divID, data, layout);
}
