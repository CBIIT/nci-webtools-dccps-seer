import {
  updateTabs,
  showMessage,
  formatCell,
  changePrecision,
} from './jpsurv.js';
import {
  makeLineTrace,
  makeMarkerTrace,
  drawPlot,
  makeLayout,
  makeLegendTrace,
} from './plots.js';

// define controls and actions
const formContainer = $('#conditionalIntervalContainer');
const addForm = $('#addConditionalInterval').click(addCondIntForm);
const conditionalRecalculateButton = $('#recalculateConditional').click(
  recalculateConditional
);

// toggle and update select forms options
$('#useConditionalJp').change((e) => {
  const checked = e.currentTarget.checked;
  const allFormSelects = $(
    '.conditionalIntervalStart, .conditionalIntervalEnd'
  );
  $('#recalculateConditional').prop('disabled', !checked);
  allFormSelects.each((i, e) => $(e).prop('disabled', !checked));

  // toggle state and visibility of form controls
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
    if (jpsurvData?.recalculateConditional) {
      loadConditionalResults();
    }
  } else {
    updateTabs();
  }
});

export function getIntervalOptions() {
  if (control_data.input_type == 'csv') {
    return control_data?.data[control_data.interval[1]];
  } else {
    return control_data?.VarFormatSecList.Interval.ItemNameInDic;
  }
}

export function populateCondIntOptions() {
  const intervals = getIntervalOptions();
  const allFormSelects = $(
    '.conditionalIntervalStart, .conditionalIntervalEnd'
  );
  // add options
  allFormSelects.each((_, e) => {
    if ($(e).find('option').length == 0) {
      intervals.forEach((i) =>
        $(e).append(`<option value="${i}">${i}</option>`)
      );
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
            class="btn btn-link mb-4" 
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
            jpsurvData.recalculateConditional = data;

            loadConditionalResults();
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

// update plots and graphs with conditional data
function loadConditionalResults() {
  const conditional = jpsurvData.recalculateConditional.data;
  const { startIntervals, endIntervals } =
    jpsurvData.recalculateConditional.params;
  const yodColName = jpsurvData.calculate.static.yearOfDiagnosisVarName
    .replace(/\(|\)|-/g, '')
    .replace(/__/g, '_')
    .replace(/([^a-zA-Z0-9_]+)/gi, '');
  const intervalRanges = startIntervals.map((e, i) => [e, endIntervals[i]]);

  function loadSurvivalData() {
    const dataPerInterval = intervalRanges.map(([start, end], index) => {
      const yearData = conditional.filter(
        (e) => e['Start.interval'] == start && e.Interval <= end
      );
      const yearDataEnd = yearData.filter((e) => e.Interval == end);
      const years = yearDataEnd.map((e) => e[yodColName]);
      const predicted = yearDataEnd.map((e) => e.pred_cum);
      const predicted_se = yearDataEnd.map((e) => e.pred_cum_se);
      const intervals = yearDataEnd.map(
        (e) => `${e['Start.interval']} - ${e.Interval}`
      );

      const observed = Object.values(
        yearData.reduce((obj, e, i) => {
          const year = e[yodColName];
          const obs =
            (e?.Relative_Survival_Interval ||
              e?.CauseSpecific_Survival_Interval) / 100;
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
      const predictedTraces = makeLineTrace(
        'yearPlot',
        traceGroup,
        index,
        years,
        predicted.map((e) => e / 100)
      );
      const observedTraces = makeMarkerTrace(
        'yearPlot',
        traceGroup,
        index,
        years,
        observed.map((e) => e / 100)
      );
      const legendTrace = makeLegendTrace(traceGroup, index);

      return {
        years,
        intervals,
        predicted,
        predicted_se,
        observed,
        observed_se,
        predictedTraces,
        observedTraces,
        legendTrace,
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
    const modelInfo = [
      cohort ? cohort + ' - ' : '',
      `Joinpoint ${jpInd}`,
      jp,
    ].join('');

    const years = [...new Set(dataPerInterval.map((e) => e.years).flat())];
    const xTitle = 'Year at Diagnosis';
    const yTitle = 'Conditional Relative Survival';
    const layout = makeLayout(
      divId,
      years,
      xTitle,
      yTitle,
      statistic,
      modelInfo
    );
    const traces = dataPerInterval
      .map((e) => [e.predictedTraces, e.observedTraces, e.legendTrace])
      .flat();

    drawPlot(divId, traces, layout);

    //Add the Year Table
    const obsIntSur = statistic.replace('Cum', 'Interval') + ' (%)';
    const obsIntSurSe =
      statistic.replace('Cum', 'Interval Std. Err.') + 'Std. Err. (%)';
    const yearHeaders = [
      ...jpsurvData.calculate.form.cohortVars,
      'Year of Diagnosis',
      'Interval',
      `Conditional ${obsIntSur}`,
      `Conditional ${obsIntSurSe}`,
      'Predicted Conditional Cumulative Survival (%)',
      'Predicted Conditional Cumulative Survival Std. Err. (%)',
    ];
    addTable($('#graph-year-table'), 'survival', dataPerInterval, yearHeaders);
    const yearTableRows = dataPerInterval.reduce(
      (total, e) => total + e.years.length,
      0
    );
    $('#year-tab-rows').html('Total Row Count: ' + yearTableRows);
  }

  function loadTimeData() {
    const divId = 'timePlot';
    const dataPerInterval = intervalRanges
      .map(([start, end]) => {
        const timeData = conditional.filter(
          (e) => e['Start.interval'] == start && e.Interval <= end
        );
        const allYears = timeData.map((e) => e[yodColName]);
        const uniqueYears = [...new Set(allYears)];
        const timeInterval =
          uniqueYears.length < 5
            ? uniqueYears
            : jStat
                .quantiles(uniqueYears, [0, 0.25, 0.5, 0.75, 1])
                .map(Math.round);

        const condTimeData = timeData.filter((e) =>
          timeInterval.includes(e[yodColName])
        );
        return timeInterval.map((year, index) => {
          const timeDataEnd = condTimeData.filter((e) => e[yodColName] == year);
          const years = timeDataEnd.map((e) => e[yodColName]);
          const predicted = timeDataEnd.map((e) => e.pred_cum);
          const intervals = timeDataEnd.map((e) => e.Interval);
          const observed = timeDataEnd.reduce((arr, e, i) => {
            const obs =
              (e?.Relative_Survival_Interval ||
                e?.CauseSpecific_Survival_Interval) / 100;
            const prev = i > 0 ? arr[i - 1] : 1;
            return [...arr, obs * prev];
          }, []);
          const traceGroup = `${year} (Int. ${start} - ${end})`;
          const predictedTraces = makeLineTrace(
            divId,
            traceGroup,
            index,
            intervals,
            predicted.map((e) => e / 100)
          );
          const observedTraces = makeMarkerTrace(
            divId,
            traceGroup,
            index,
            intervals,
            observed.map((e) => e)
          );
          const legendTrace = makeLegendTrace(traceGroup, index);

          return {
            years,
            intervals,
            predicted,
            observed,
            predictedTraces,
            observedTraces,
            legendTrace,
          };
        });
      })
      .flat();
    const statistic = jpsurvData.additional.statistic;
    const cohort = $('#cohort-display option:selected')
      .text()
      .replace(/\s\+\s/g, ' - ');
    const jpInd = jpsurvData.results.jpInd;
    const jpLocation = jpsurvData.results.jpLocation;
    const jp = jpInd ? ` (${jpLocation[jpInd].replace(/\s/g, ', ')})` : '';
    const modelInfo = [
      cohort ? cohort + ' - ' : '',
      `Joinpoint ${jpInd}`,
      jp,
    ].join('');

    const xTitle = 'Conditional Interval';
    const yTitle = 'Conditional Relative Survival';
    const layout = makeLayout(
      divId,
      dataPerInterval[0].intervals,
      xTitle,
      yTitle,
      statistic,
      modelInfo
    );
    const traces = dataPerInterval
      .map((e) => [e.predictedTraces, e.observedTraces, e.legendTrace])
      .flat();

    drawPlot(divId, traces, layout);

    //Add the Time Table
    let obsHeader = '';
    if (statistic == 'Cause-Specific Survival')
      obsHeader = 'Conditional Cumulative CauseSpecific Survival (%)';
    if (statistic == 'Relative Survival')
      obsHeader = 'Conditional Cumulative Relative Survival (%)';
    const timeHeader = [
      ...jpsurvData.calculate.form.cohortVars,
      'Year of Diagnosis',
      'Interval',
      obsHeader,
      'Predicted Conditional Cumulative Relative Survival (%)',
    ];
    addTable($('#graph-time-table'), 'time', dataPerInterval, timeHeader);
    const timeTableRows = dataPerInterval.reduce(
      (total, e) => total + e.years.length,
      0
    );
    $('#time-tab-rows').html('Total Row Count: ' + timeTableRows);
  }

  loadSurvivalData();
  loadTimeData();

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
    $('<th>')
      .attr('scope', 'col')
      .text(header.replace(/_/g, ' '))
      .appendTo(tableHeader);
  });
  table.append($('<thead>').append(tableHeader));

  const tableBody = $('<tbody>');
  data.forEach((dataPerInterval) => {
    const { years, intervals, observed, observed_se, predicted, predicted_se } =
      dataPerInterval;
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
      $('<td>').text(intervals[index]).appendTo(row);

      // add predicted data and error
      if (type == 'survival') {
        row.append(formatCell(observed[index] || 'NA'));
        row.append(formatCell(observed_se[index] || 'NA'));
        row.append(formatCell(predicted[index]));
        row.append(formatCell(predicted_se[index]));
      } else if (type == 'time') {
        row.append(formatCell(observed[index]));
        row.append(formatCell(predicted[index]));
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
