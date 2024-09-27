import { updateTabs, showMessage, formatCell, changePrecision } from './jpsurv.js';
import { makeLineTrace, makeDashTrace, makeMarkerTrace, drawPlot, makeLayout, makeLegendTrace } from './plots.js';

// define controls and actions
const formContainer = $('#conditionalIntervalContainer');
const addForm = $('#addConditionalInterval').click(addCondIntForm);
const conditionalRecalculateButton = $('#recalculateConditional').click(recalculateConditional);

// toggle and update select forms options
$('#useConditionalJp').change((e) => {
  const checked = e.currentTarget.checked;
  const allFormSelects = $('.conditionalIntervalStart, .conditionalIntervalEnd');
  $('#recalculateConditional').prop('disabled', !checked);
  allFormSelects.each((i, e) => $(e).prop('disabled', !checked));

  // toggle state and visibility of form controls
  // tab links
  if (checked) {
    $('#addConditionalInterval').prop('disabled', false);
    $('.removeCondInterval').prop('disabled', false);
    $('#graph-year-link').html('Conditional Survival vs. Year at Diagnosis');
    $('#graph-time-link').html('Conditional Survival vs. Time Since Diagnosis');
    $('#graph-death-link').addClass('disabled');
    $('#estimates-link').addClass('disabled');
    $('#timeRecalc').hide();
    $('#timeConditionalRecalc').show();
  } else {
    $('#addConditionalInterval').prop('disabled', true);
    $('.removeCondInterval').prop('disabled', true);
    $('#graph-year-link').html('Survival vs. Year at Diagnosis');
    $('#graph-time-link').html('Survival vs. Time Since Diagnosis');
    $('#graph-death-link').removeClass('disabled');
    $('#estimates-link').removeClass('disabled');
    $('#timeRecalc').show();
    $('#timeConditionalRecalc').hide();
  }
  // year tab controls
  $('#showYearTrend').prop('checked', false).trigger('change');
  $('#showYearTrend').prop('disabled', checked);
  $('#interval-years').prop('disabled', checked);
  $('#toggleAbsSelect').prop('checked', false).trigger('change');
  $('#toggleAbsSelect').prop('disabled', checked);
  // death tab controls
  $('#showDeathTrend').prop('checked', false).trigger('change');
  $('#showDeathTrend').prop('disabled', checked);
  $('#interval-years-death').prop('disabled', checked);
  // time tab controls
  $('#year-of-diagnosis').prop('disabled', checked);
  // recalculate buttons
  $('.recalculate').prop('disabled', checked);

  // replace plots and tables with conditional or unconditional data
  if (checked) {
    populateCondIntOptions();
    const [model] = getCurrentModel();
    if (jpsurvData?.recalculateConditional && jpsurvData.recalculateConditional[model]) {
      loadConditionalResults(model);
    }
  } else {
    if (jpsurvData.results) updateTabs();
  }
});

export function getIntervalOptions() {
  const intervals =
    control_data.input_type == 'csv'
      ? control_data?.data[control_data.interval[1]]
      : control_data?.VarFormatSecList.Interval.ItemNameInDic;
  if (Array.isArray(intervals)) return intervals;
  else return [intervals];
}

export function populateCondIntOptions() {
  const intervals = getIntervalOptions();
  const allFormSelects = $('.conditionalIntervalStart, .conditionalIntervalEnd');
  // add options
  allFormSelects.each((_, e) => {
    if ($(e).find('option').length == 0) {
      intervals.forEach((i) => $(e).append(`<option value="${i}">${i}</option>`));
    }
  });
}

function addCondIntForm() {
  const disabled = !$('#useConditionalJp').is(':checked');
  const allForms = $('.conditionalIntervalForm');
  const index = allForms.length;
  const form = $(
    $.parseHTML(
      `
      <div 
        id="conditionalIntervalForm-${index}" 
        class="conditionalIntervalForm d-flex"
      >
        <div class="d-block">
          <div class="form-group mb-0 mr-3">
            <label
              class="font-weight-bold"
              for="intervalStart${index}"
            >Start Interval:</label
            >       
            <select
              id="intervalStart${index}"
              name="intervalStart${index}"
              class="conditionalIntervalStart mx-3"
              aria-label="start"
              ${disabled ? 'disabled' : ''}
              required
            ></select>
            </div>
            <label
              id="intervalStart${index}-error"
              for="intervalStart${index}"
              class="text-danger error"
            >
            </label>
          </div>
          <div class="form-group mb-0">
            <label
              class="font-weight-bold"
              for="intervalEnd${index}"
              >End Interval:</label
            >
            <select
              id="intervalEnd${index}"
              name="intervalEnd${index}"
              class="conditionalIntervalEnd mx-3"
              aria-label="end"
              ${disabled ? 'disabled' : ''}
              required
            ></select>
          </div>
          <button 
            type="button" 
            class="btn btn-link mb-4 removeCondInterval" 
            onClick="removeCondIntForm(${index})">
            - Remove Interval
          </button>
          <div class="invalid-feedback">
            Start interval must be less than the end interval.
          </div>
        </div>
      </div>
      `
    )
  );

  formContainer.append(form);
  $('select').select2({
    dropdownAutoWidth: true,
    width: 'auto',
  });
  populateCondIntOptions();
}

window.removeCondIntForm = function removeCondIntForm(index) {
  $(`#conditionalIntervalForm-${index}`).remove();
};

// validate and submit form
function recalculateConditional() {
  const form = $('#conditionalJoinpointForm');
  let rules = {};
  let messages = {};

  // dynamically add form rules
  form.find('select').each((i, e) => {
    const name = $(e).attr('name');
    const formIndex = name.slice(-1);
    if (name.includes('Start')) {
      rules[name] = { lessThan: `#intervalEnd${formIndex}` };
      messages[name] = { lessThan: `Start must be less than End` };
    }
  });

  form
    .submit((e) => e.preventDefault())
    .validate({
      rules,
      messages,
      submitHandler: async (form) => {
        const formData = [...new FormData(form).entries()].reduce(
          (obj, [name, value]) => {
            if (name.includes('Start')) {
              obj.startIntervals.push(+value);
              return obj;
            } else {
              obj.endIntervals.push(+value);
              return obj;
            }
          },
          {
            startIntervals: [],
            endIntervals: [],
            njp: jpsurvData.results.jpInd,
          }
        );

        try {
          $('#calculating-spinner').modal({ backdrop: 'static' });
          $('#calculating-spinner').modal('show');
          const res = await fetch('jpsurvRest/recalculateConditionalJp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...formData,
              state: JSON.parse(getParams()),
            }),
          });

          if (res?.ok) {
            // parse and save results
            const data = await res.json();
            const [model] = getCurrentModel();
            if (!jpsurvData.recalculateConditional) jpsurvData.recalculateConditional = {};
            jpsurvData.recalculateConditional[model] = data;

            loadConditionalResults(model);
          } else {
            throw await res.json();
          }
        } catch (error) {
          console.error(error);
          showMessage('jpsurv', error, 'error');
        } finally {
          $('#calculating-spinner').modal('hide');
        }
      },
    });
}

/**
 * return an array containing the [cohort]-[joinpoint] index string, cohort index, and joinpoint index
 * @param {object} results jpsurv calculation results
 * @returns array[]
 */
function getCurrentModel(results = jpsurvData.results) {
  const com = results.com;
  const jpInd = results.jpInd;
  const model = com + '-' + jpInd;
  return [model, com, jpInd];
}

/**
 * update plots and graphs with conditional data
 * @param {string} model cohort index and joinpoint index string e.g. 1-0 (cohort combination 1, joinpoint 0)
 */
function loadConditionalResults(model) {
  const conditional = jpsurvData.recalculateConditional[model].data;
  const { startIntervals, endIntervals } = jpsurvData.recalculateConditional[model].params;
  const yodColName = jpsurvData.calculate.static.yearOfDiagnosisVarName
    .replace(/\(|\)|-/g, '')
    .replace(/__/g, '_')
    .replace(/([^a-zA-Z0-9_]+)/gi, '');
  const intervalRanges = startIntervals.map((e, i) => [e, endIntervals[i]]);

  function loadSurvivalData() {
    const dataPerInterval = intervalRanges.map(([start, end], index) => {
      const yearData = conditional.filter((e) => e['Start.interval'] == start && e.Interval <= end);
      const yearDataEnd = yearData.filter((e) => e.Interval == end);
      const years = yearDataEnd.map((e) => e[yodColName]);
      const predicted = yearDataEnd.map((e) => e.pred_cum);
      const predicted_se = yearDataEnd.map((e) => e.pred_cum_se);
      const range = yearDataEnd.map((e) => `${e['Start.interval']} - ${e.Interval}`);
      const intervals = yearDataEnd.map((e) => e.Interval);

      const observed = Object.values(
        yearData.reduce((obj, e, i) => {
          const year = e[yodColName];
          const obs = (e?.Relative_Survival_Interval || e?.CauseSpecific_Survival_Interval) / 100;
          const prev = obj[year] || 1;

          return { ...obj, [year]: prev * obs };
        }, {})
      ).map((e) => e * 100);

      const observed_se = Object.values(
        yearData
          .map((e) => {
            const alive = e.Alive_at_Start;
            const lost = e.Lost_to_Followup;
            const risk = alive - 0.5 * lost;
            return { ...e, risk };
          })
          .reduce((obj, e, i) => {
            const year = e[yodColName];
            const risk = e.risk;
            const died = e.Died;
            const error = died / (risk * (risk - died));
            const prev = obj[year] || 0;
            return { ...obj, [year]: prev + error };
          }, {})
      ).map((e, i) => Math.sqrt(e) * observed[i]);

      const traceGroup = `Interval ${start} - ${end}`;
      const projectedIndex = observed.findIndex(isNaN);
      const projectedTraces = makeDashTrace(
        'yearPlot',
        traceGroup,
        index,
        years.slice(projectedIndex),
        predicted.slice(projectedIndex).map((e) => e / 100)
      );
      const predictedTraces = makeLineTrace(
        'yearPlot',
        traceGroup,
        index,
        years.slice(0, projectedIndex),
        predicted.slice(0, projectedIndex).map((e) => e / 100)
      );
      const observedTraces = makeMarkerTrace(
        'yearPlot',
        traceGroup,
        index,
        years,
        observed.map((e) => e / 100)
      );
      const legendTrace = { ...makeLegendTrace(traceGroup, index, 'lines'), name: traceGroup + ' Predicted' };
      const projectedLegendTrace = {
        ...makeLegendTrace(traceGroup, index, 'lines'),
        name: traceGroup + ' Projected',
        line: { ...legendTrace.line, dash: 'dash' },
      };
      const observedLegendTrace = {
        ...makeLegendTrace(traceGroup, index, 'markers'),
        name: traceGroup + ' Observed',
      };

      const traces = [
        predictedTraces,
        observedTraces,
        projectedTraces,
        legendTrace,
        projectedLegendTrace,
        observedLegendTrace,
      ];

      return {
        years,
        range,
        intervals,
        predicted,
        predicted_se,
        observed,
        observed_se,
        traces,
      };
    });
    const divId = 'yearPlot';
    const statistic = jpsurvData.additional.statistic;
    const cohort = $('#cohort-display option:selected')
      .text()
      .replace(/\s\+\s/g, ' - ');
    const jpInd = jpsurvData.results.jpInd;
    const jpLocation = jpsurvData.results.jpLocation;
    const jp = jpInd ? ` (${jpLocation[jpInd].replace(/\s/g, ', ')})` : '';
    const modelInfo = [cohort ? cohort + ' - ' : '', `Joinpoint ${jpInd}`, jp].join('');

    const years = [...new Set(dataPerInterval.map((e) => e.years).flat())];
    const xTitle = 'Year at Diagnosis';
    const yTitle = 'Conditional Relative Survival';
    const layout = makeLayout(divId, [Math.min(...years), Math.max(...years)], xTitle, yTitle, statistic, modelInfo);
    const traces = dataPerInterval.map((e) => e.traces).flat();

    drawPlot(divId, traces, layout);

    //Add the Year Table
    const obsIntSur = statistic.replace('Cum', 'Interval') + ' (%)';
    const obsIntSurSe = statistic.replace('Cum', 'Interval Std. Err.') + ' Std. Err. (%)';
    const yearHeaders = [
      ...jpsurvData.calculate.form.cohortVars,
      'Year of Diagnosis',
      'Range',
      'Conditional Interval',
      `Conditional ${obsIntSur}`,
      `Conditional ${obsIntSurSe}`,
      'Predicted Conditional Cumulative Survival (%)',
      'Predicted Conditional Cumulative Survival Std. Err. (%)',
    ];
    addTable($('#graph-year-table'), 'survival', dataPerInterval, yearHeaders);
    const yearTableRows = dataPerInterval.reduce((total, e) => total + e.years.length, 0);
    $('#year-tab-rows').html('Total Row Count: ' + yearTableRows);
  }

  loadSurvivalData();
  loadTimeData(conditional, yodColName, intervalRanges);

  changePrecision();
}

/**
 *
 * @param {jQuery object} table selected jquery element
 * @param {string} type survival or time table
 * @param {object[]} data processed data
 * @param {string[]} headers table headers
 */
function addTable(table, type, data = [], headers = []) {
  table.empty();
  const tableHeader = $('<tr>').append();
  headers.forEach(function (header) {
    $('<th>').attr('scope', 'col').text(header.replace(/_/g, ' ')).appendTo(tableHeader);
  });
  table.append($('<thead>').append(tableHeader));

  const tableBody = $('<tbody>');
  data.forEach((dataPerInterval) => {
    const { years, range, intervals, observed, observed_se, predicted, predicted_se } = dataPerInterval;
    years.forEach(function (year, index) {
      const row = $('<tr>');
      const cohort_array = jpsurvData.results.Runs.split('jpcom');
      if (cohort_array[0].length) {
        if (cohort_array) {
          const values = cohort_array[jpsurvData.results.com - 1].split(' + ');
          values.forEach(function (value) {
            $('<td>').text(value.replace(/"/g, '')).appendTo(row);
          });
        } else {
          const values = cohort_array.split(' + ');
          values.forEach(function (value) {
            $('<td>').text(value.replace(/"/g, '')).appendTo(row);
          });
        }
      }

      // add year of diagnosis
      $('<td>').text(year).appendTo(row);
      // add interval
      $('<td>').text(range[index]).appendTo(row);
      $('<td>').text(intervals[index]).appendTo(row);

      // add predicted data and error
      if (type == 'survival') {
        row.append(formatCell(observed[index] || 'NA'));
        row.append(formatCell(observed_se[index] || 'NA'));
        row.append(formatCell(predicted[index]));
        row.append(formatCell(predicted_se[index]));
      } else if (type == 'time') {
        row.append(formatCell(observed[index] || 'NA'));
        row.append(formatCell(predicted[index] || 'NA'));
      }
      tableBody.append(row);
    });
    table.append(tableBody);
  });
}

// custom validation rules
$.validator.addMethod('lessThan', (value, element, param) => {
  const $otherElement = $(param);
  return parseInt(value) < parseInt($otherElement.val());
});

function setupTimeControls(years = []) {
  const condYodSelect = $('#conditional-yod');
  condYodSelect.empty();
  years.forEach((y) => condYodSelect.append(`<option value=${y}>${y}</option>`));
  condYodSelect.val($('#conditional-yod option:first').val()).trigger('change');

  $('#conditionalRecalc').click(recalculateTimePlot);
}

function generateTimePlotData(selectedYears, allYears, data, yearCol, start, end, controlIndex, divId) {
  return selectedYears.map((year, index) => {
    const timeDataEnd = data.filter((e) => e[yearCol] == year);
    const years = [year, ...timeDataEnd.map((e) => e[yearCol])];
    const predicted = [100, ...timeDataEnd.map((e) => e.pred_cum)];
    const allIntervals = timeDataEnd.map((e) => e.Interval);
    const range = Array(predicted.length).fill(`${start} - ${end}`);
    const intervals = [Math.min(...allIntervals) - 1, ...allIntervals];
    const observed = [100, ...timeDataEnd.map((e) => e.observed)];
    // const observed = timeDataEnd
    //   .reduce(
    //     (arr, e, i) => {
    //       const obs = (e?.Relative_Survival_Interval || e?.CauseSpecific_Survival_Interval) / 100;
    //       const prev = i > 0 ? arr[i] : 1;
    //       return [...arr, obs * prev];
    //     },
    //     [1]
    //   )
    //   .map((e) => e * 100);
    const traceGroup = `${year} (Int. ${start} - ${end})`;

    const observedTraces = makeMarkerTrace(
      divId,
      traceGroup,
      index,
      intervals,
      observed.map((e) => e / 100)
    );

    const predictedTraces =
      year < allYears.at(-1) - end
        ? makeLineTrace(
            divId,
            traceGroup,
            index,
            intervals,
            predicted.map((e) => e / 100)
          )
        : makeDashTrace(
            divId,
            traceGroup,
            index,
            intervals,
            predicted.map((e) => e / 100)
          );

    const observedLegendTrace = {
      ...makeLegendTrace(traceGroup, index, 'markers'),
      name: traceGroup + ' Observed',
    };
    const predictedLegendTrace =
      year < allYears.at(-1) - end
        ? { ...makeLegendTrace(traceGroup, index, 'lines'), name: traceGroup + ' Predicted' }
        : {
            ...makeLegendTrace(traceGroup, index, 'lines'),
            name: traceGroup + ' Projected',
            line: { ...observedLegendTrace.line, dash: 'dash' },
          };

    return {
      controlIndex,
      start,
      end,
      years,
      range,
      intervals,
      predicted,
      observed,
      predictedTraces,
      observedTraces,
      legendTraces: [observedLegendTrace, predictedLegendTrace],
    };
  });
}

function renderTimePlot(dataPerInterval, intervalRanges, divId) {
  const statistic = jpsurvData.additional.statistic;
  const cohort = $('#cohort-display option:selected')
    .text()
    .replace(/\s\+\s/g, ' - ');
  const jpInd = jpsurvData.results.jpInd;
  const jpLocation = jpsurvData.results.jpLocation;
  const jp = jpInd ? ` (${jpLocation[jpInd].replace(/\s/g, ', ')})` : '';
  const modelInfo = [cohort ? cohort + ' - ' : '', `Joinpoint ${jpInd}`, jp].join('');

  const xTitle = 'Conditional Interval';
  const yTitle = 'Conditional Relative Survival';
  const [minInterval, maxInterval] = intervalRanges.reduce(
    (arr, [start, end]) => {
      const [min, max] = arr;
      return [Math.min(start, min), Math.max(end, max)];
    },
    [+Infinity, -Infinity]
  );
  $('#timePlots').empty();
  dataPerInterval.forEach((plotData) => {
    const { controlIndex, start } = plotData[0];
    const layout = {
      ...makeLayout(divId, [minInterval, maxInterval], xTitle, yTitle, statistic, modelInfo),
      title: `<b>Conditional ${statistic} (Given Alive at ${minInterval} years) by Year Since Diagnosis for Selected Diagnosis Year</b>${
        modelInfo ? '<br>' + modelInfo : ''
      }`,
    };
    const startingIntervalTrace = makeDashTrace(divId, '', '', [start, start], [0, 1]);
    const traces = plotData
      .map((e) => [e.predictedTraces, e.observedTraces, ...e.legendTraces, startingIntervalTrace])
      .flat();
    const newPlot = `${divId}-${controlIndex}`;
    $('#timePlots').append(`<div id="${newPlot}" class="mx-auto mt-1 d-block"></div>`);
    drawPlot(newPlot, traces, layout);
  });
}

function recalculateTimePlot() {
  const [model] = getCurrentModel();
  const data = jpsurvData.recalculateConditional[model].data;
  const yodColName = jpsurvData.calculate.static.yearOfDiagnosisVarName
    .replace(/\(|\)|-/g, '')
    .replace(/__/g, '_')
    .replace(/([^a-zA-Z0-9_]+)/gi, '');
  const { startIntervals, endIntervals } = jpsurvData.recalculateConditional[model].params;
  const intervalRanges = startIntervals.map((e, i) => [e, endIntervals[i]]);
  loadTimeData(data, yodColName, intervalRanges, false);
  changePrecision();
}

function loadTimeData(data, yodColName, intervalRanges, setupControls = true) {
  const divId = 'timePlot';
  const dataPerInterval = intervalRanges.map(([start, end], controlIndex) => {
    const timeData = data.filter((e) => e['Start.interval'] == start && e.Interval <= end);
    const allYears = [...new Set(timeData.map((e) => e[yodColName]))];

    if (setupControls) setupTimeControls(allYears);
    const selectedYears = $('#conditional-yod')
      .val()
      .map((e) => parseInt(e));
    const condTimeData = timeData.filter((e) => selectedYears.includes(e[yodColName]));
    return generateTimePlotData(selectedYears, allYears, condTimeData, yodColName, start, end, controlIndex, divId);
  });

  renderTimePlot(dataPerInterval, intervalRanges, divId);
  const statistic = jpsurvData.additional.statistic;

  //Add the Time Table
  let obsHeader = '';
  if (statistic == 'Cause-Specific Survival') obsHeader = 'Conditional Cumulative CauseSpecific Survival (%)';
  if (statistic == 'Relative Survival') obsHeader = 'Conditional Cumulative Relative Survival (%)';
  const timeHeader = [
    ...jpsurvData.calculate.form.cohortVars,
    'Year of Diagnosis',
    'Range',
    'Conditional Interval',
    obsHeader,
    'Predicted Conditional Cumulative Relative Survival (%)',
  ];
  addTable($('#graph-time-table'), 'time', dataPerInterval.flat(), timeHeader);
  const timeTableRows = dataPerInterval.flat().reduce((total, e) => total + e.years.length, 0);
  $('#time-tab-rows').html('Total Row Count: ' + timeTableRows);
}
