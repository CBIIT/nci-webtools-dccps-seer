import {
  updateTabs,
  showMessage,
  formatCell,
  changePrecision,
  checkArray,
} from './jpsurv.js';

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

function getIntervalOptions() {
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
              for="endStart${index}"
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
  const data = jpsurvData.recalculateConditional;

  // add plots
  drawPlot('year');
  drawPlot('death');
  drawPlot('time');

  // build tables
  const yodColName = jpsurvData.calculate.static.yearOfDiagnosisVarName
    .replace(/\(|\)|-/g, '')
    .replace(/__/g, '_')
    .replace(/([^a-zA-Z0-9_]+)/gi, '');

  //Add the Year Table
  // if (jpsurvData.results.yearData.survTable != undefined) {
  const yodCol = data[yodColName];
  let data_type = jpsurvData.results.statistic.replace('Cum', 'Cumulative');
  const se_col = jpsurvData.results.statistic.replace(
    'Cum',
    'Cumulative Std. Err.'
  );

  const yearHeaders = [
    ...jpsurvData.calculate.form.cohortVars,
    'Year of Diagnosis',
    'Interval',
    'Predicted Cumulative Survival (%)',
    'Predicted Cumulative Survival Std. Err. (%)',
  ];
  addTable(yodCol, yearHeaders, $('#graph-year-table'), data, 'survival');

  $('#year-tab-rows').html('Total Row Count: ' + (yodCol.length || 1));

  //Add the Death Table
  data_type = jpsurvData.results.statistic.replace('Cum', 'Interval');
  const deathHeader = [
    ...jpsurvData.calculate.form.cohortVars,
    'Year of Diagnosis',
    'Interval',
    'Predictive Prob. of Death Interval (%)',
    'Predictive Prob. of Death Interval Std. Err. (%)',
  ];

  addTable(yodCol, deathHeader, $('#graph-death-table'), data, 'death');

  $('#death-tab-rows').html('Total Row Count: ' + (yodCol.length || 1));

  //Add the Time Table

  data_type = jpsurvData.results.statistic;
  let Cumulative_header = '';
  if (data_type == 'CauseSpecific_Survival_Cum')
    Cumulative_header = 'Cumulative CauseSpecific Survival';
  if (data_type == 'Relative_Survival_Cum')
    Cumulative_header = 'Cumulative Relative Survival';

  const timeHeader = [
    ...jpsurvData.calculate.form.cohortVars,
    'Year of Diagnosis',
    'Interval',
    'Predicted Cumulative Relative Survival (%)',
  ];

  addTable(yodCol, timeHeader, $('#graph-time-table'), data, 'time');

  $('#time-tab-rows').html('Total Row Count: ' + (yodCol.length || 1));
  changePrecision();
}

function addTable(yodCol, headers, table, data, graph) {
  table.empty();
  var tableHeader = $('<tr>').append();
  headers.forEach(function (header) {
    $('<th>')
      .attr('scope', 'col')
      .text(header.replace(/_/g, ' '))
      .appendTo(tableHeader);
  });
  table.append($('<thead>').append(tableHeader));

  // if data only contains one row, store value in array
  if (!Array.isArray(yodCol)) {
    yodCol = [yodCol];
    for (var key in data) {
      data[key] = [data[key]];
    }
  }

  var tableBody = $('<tbody>');
  yodCol.forEach(function (year, index) {
    const row = $('<tr>');

    var cohort_array = jpsurvData.results.Runs.split('jpcom');
    if (cohort_array[0].length) {
      if (jpsurvData.results.Runs.split('jpcom')) {
        var values = cohort_array[jpsurvData.results.com - 1].split(' + ');
        values.forEach(function (value) {
          $('<td>').text(value.replace(/"/g, '')).appendTo(row);
        });
      } else {
        var values = cohort_array.split(' + ');
        values.forEach(function (value) {
          $('<td>').text(value.replace(/"/g, '')).appendTo(row);
        });
      }
    }

    // add year of diagnosis
    $('<td>').text(year).appendTo(row);
    // add interval
    $('<td>')
      .text(`${data['Start.interval'][index]} - ${data.Interval[index]}`)
      .appendTo(row);

    // add predicted data and error
    if (graph == 'survival') {
      row.append(formatCell(data.pred_cum[index]));
      row.append(formatCell(data.pred_cum_se[index]));
    } else if (graph == 'death') {
      row.append(formatCell(100 - data.pred_int[index]));
      row.append(formatCell(data.pred_int_se[index]));
    } else if (graph == 'time') {
      row.append(formatCell(data.pred_cum[index]));
    }

    tableBody.append(row);
  });
  table.append(tableBody);
}

function drawPlot(plot) {
  if (jpsurvData.recalculateConditional) {
    const data = jpsurvData.recalculateConditional;
    const yodVarName = jpsurvData.calculate.static.yearOfDiagnosisVarName
      .replace(/\(|\)|-/g, '')
      .replace(/__/g, '_')
      .replace(/([^a-zA-Z0-9_]+)/gi, '');
    const cohort = $('#cohort-display option:selected')
      .text()
      .replace(/\s\+\s/g, ' - ');
    const jpInd = jpsurvData.results.jpInd;
    const jp = jpInd
      ? ` (${jpsurvData.results.jpLocation[jpInd].replace(/\s/g, ', ')})`
      : '';

    const modelInfo = [
      cohort ? cohort + ' - ' : '',
      `Joinpoint ${jpInd}`,
      jp,
    ].join('');

    const yodCol = data[yodVarName];
    if (plot == 'year') {
      drawLineChart(
        'yearPlot',
        checkArray(yodCol),
        [],
        checkArray(data.pred_cum),
        checkArray(data.Interval),
        false,
        modelInfo
      );
    } else if (plot == 'death') {
      drawLineChart(
        'deathPlot',
        checkArray(yodCol),
        [],
        checkArray(data.pred_int.map((e) => 100 - e)),
        checkArray(data.Interval),
        false,
        modelInfo
      );
    } else if (plot == 'time') {
      // drawLineChart(
      //   'timePlot',
      //   checkArray(data.Interval),
      //   [],
      //   checkArray(data.pred_cum),
      //   checkArray(yodCol),
      //   false,
      //   modelInfo
      // );
    }
  }
}

// custom validation rules
$.validator.addMethod('lessThan', (value, element, param) => {
  const $otherElement = $(param);
  return parseInt(value) < parseInt($otherElement.val());
});
