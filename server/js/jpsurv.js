import { singleExport, multiExport, exportTableWithSettings } from '../queueProcessor/services/xlsxExport.js';
import { importBackEnd } from './exportImport.js';
import { updatePlotData, drawLineChart } from './plots.js';
import { populateCondIntOptions, getIntervalOptions } from './joinpointConditional.js';

window.control_data = {};
window.cohort_covariance_variables = {};
window.advfields = ['adv-between', 'adv-first', 'adv-last', 'adv-year'];
window.fontSize = getCookie('fontSize') || 14;
window.showMessage = showMessage;
window.jpsurvData = {
  file: {
    dictionary: 'Breast.dic',
    data: 'something.txt',
    form: 'form-983832.json',
  },
  calculate: {
    form: { yearOfDiagnosisRange: [], conditional: false, relaxProp: false },
    static: {},
  },
  plot: { form: {}, static: { imageId: -1 } },
  additional: {
    headerJoinPoints: 0,
    yearOfDiagnosis: null,
    intervals: [5, 10],
    absTmp: [NaN, NaN],
    absChgRange: null,
  },
  tokenId: 'unknown',
  status: 'unknown',
  stage2completed: 0,
  mapping: {},
  recalculateConditional: {},
};
window.maxJP = 2;
window.first_modal = true;
if (getUrlParameter('tokenId')) {
  jpsurvData.tokenId = getUrlParameter('tokenId');
}

if (getUrlParameter('status')) {
  jpsurvData.status = getUrlParameter('status');
}

$(document).ready(function () {
  addInputSection();
  addEventListeners();
  addMessages();
  hide_display_email();
  $('#precision').val(getCookie('precision') || 2);
  // disable calculate button on document load if there are cohorts to select
  if (
    !getUrlParameter('request') &&
    (!jpsurvData.calculate.form.cohortValues || jpsurvData.calculate.form.cohortValues.length != 0)
  ) {
    $('#calculate').prop('disabled', true);
  }
  // disable calculate button if loading queue result
  if (getUrlParameter('request') == 'true') {
    $('#calculate').prop('disabled', true);
  }
  if (jpsurvData.status === 'uploaded') {
    $('#description').html(
      '<div style="font-size:1.25rem;">Please select Cohort and Model specifications on the left and click on Calculate / Submit.</div>'
    );
  } else {
    $('#description').append($('<div>').load('./html/description.html'));
  }

  advfields.forEach(function (id) {
    $('#' + id).keyup(function () {
      checkInput(id);
    });
  });

  // initialize tooltips and popover
  $('#max_help').popover();
  $('[data-toggle="tooltip"]').tooltip();

  // Show correct container when navigating back a page
  if ($('#dic').prop('checked')) {
    $('#dic_container').show();
    $('#csv_container').hide();
    $('#import_container').hide();
  } else if ($('#csv').prop('checked')) {
    $('#dic_container').hide();
    $('#csv_container').show();
    $('#import_container').hide();
  } else if ($('#importRadioButton').prop('checked')) {
    $('#dic_container').hide();
    $('#csv_container').hide();
    $('#import_container').show();
  }

  // Navbar control Analysis and Help page view
  $('#help').load('./html/help.html');
  function handleNavTab(hash) {
    if (hash == '#analysis') {
      $('#helpNav').removeClass('active');
      $('#main').removeClass('d-none');
      $('#analysisNav').addClass('active');
      $('#help').addClass('d-none');
    } else if (hash == '#help') {
      $('#helpNav').addClass('active');
      $('#main').addClass('d-none');
      $('#analysisNav').removeClass('active');
      $('#help').removeClass('d-none');
    }
  }
  handleNavTab(window.location.hash);
  $(window).on('hashchange', () => handleNavTab(window.location.hash));
});

function checkInput(id) {
  var element = $('#' + id);
  var min = element.attr('min');

  if (parseInt(element.val()) < parseInt(min)) {
    element.val(min);
  }
}

function validateEmail() {
  var id = 'e-mail';
  var errorMsg = 'Please enter a valid email address before submitting.';

  if ($('#' + id).is(':invalid')) {
    $('#' + id).attr('title', errorMsg);
    $('#calculate').prop('disabled', true);
  } else {
    $('#' + id).removeAttr('title');
    if (getUrlParameter('request') == 'true') {
      $('#calculate').prop('disabled', true);
    } else {
      $('#calculate').prop('disabled', false);
    }
  }

  //var pattern = new RegExp('^' + $(this).attr('pattern') + '$');

  if (typeof $('#' + id).setCustomValidity === 'function') {
    $('#' + id).setCustomValidity(hasError ? errorMsg : '');
  }
  // Not supported by the browser, fallback to manual error display...
}

// check if multiple cohorts are selected
function check_multiple() {
  var fieldsets = $('#cohort-variables fieldset').length;
  for (var i = 0; i < fieldsets; i++) {
    if ($('#cohort-' + i + ' input').filter(':checked').length > 1) {
      return true;
    }
  }
  return false;
}

// check if there are any unselected cohorts
function checkUnselected() {
  var fieldsets = $('#cohort-variables fieldset').length;
  for (var i = 0; i < fieldsets; i++) {
    if ($('#cohort-' + i + ' input').filter(':checked').length == 0) {
      return true;
    }
  }
  return false;
}

// mark cohorts as checked if none are selected
function checkUnselectedCohorts() {
  var fieldsets = $('#cohort-variables fieldset').length;
  for (var i = 0; i < fieldsets; i++) {
    if ($('#cohort-' + i + ' input').filter(':checked').length == 0) {
      $('#cohort-' + i + ' input').each(function (i, checkbox) {
        $(checkbox).prop('checked', true);
      });
    }
  }
}

function useQueue() {
  return parseInt($('#max_join_point_select').val()) > maxJP || check_multiple() == true || checkUnselected() == true;
}

function hide_display_email() {
  if (useQueue()) {
    $('.e-mail-grp').fadeIn();
    $('#calculate').prop('disabled', true);
    validateEmail();
  } else {
    $('.e-mail-grp').fadeOut();
    if (getUrlParameter('request') == 'true') {
      $('#calculate').prop('disabled', true);
    } else {
      $('#calculate').prop('disabled', false);
    }
  }
}

// disable recalculate button if any of the interval or year selects are empty
function checkSelect() {
  if (
    $('#interval-years').val().length == 0 ||
    $('#interval-years-death').val().length == 0 ||
    $('#year-of-diagnosis').val().length == 0
  ) {
    $('.recalculate').prop('disabled', true);
  } else {
    $('.recalculate').prop('disabled', false);
  }
}

function checkAbsChg() {
  var absTmp = jpsurvData.additional.absTmp;

  function removeTooltip() {
    if ($('.recalculate').prop('disabled')) {
      $('#warning-wrapper').css('cursor', '');
      $('#warning-wrapper').popover('dispose');
      $('.recalculate').prop('disabled', false);
    }
  }

  if ($('#toggleAbsSelect').is(':checked')) {
    if (absTmp.findIndex(Number.isNaN) > -1 || absTmp[1] <= absTmp[0]) {
      jpsurvData.additional.absChgRange = null;
      $('#warning-wrapper').css('cursor', 'not-allowed');
      $('#warning-wrapper').popover({
        content: 'Selected years must be a progressive range.',
        trigger: 'focus hover',
        placement: 'bottom',
      });
      $('.recalculate').prop('disabled', true);
    } else {
      jpsurvData.additional.absChgRange = jpsurvData.additional.absTmp;
      removeTooltip();
    }
  } else {
    jpsurvData.additional.absChgRange = null;
    removeTooltip();
  }
}

function addEventListeners() {
  $('#e-mail').on('keydown change', function (e) {
    if (e.which == 13) {
      e.preventDefault();
    }
    validateEmail();
  });

  $('#cohort-variables').on('change', function (e) {
    hide_display_email();
  });

  $('#max_join_point_select').on('change', function (e) {
    jpsurvData.calculate.form.maxjoinPoints = parseInt(this.value);
    hide_display_email();
  });

  $('#intervals_from_diagnosis')
    .change(function () {
      jpsurvData.calculate.form.interval = parseInt(this.value);
    })
    .change();

  $('#interval-years').on('change', function () {
    checkSelect();
  });

  $('#interval-years-death').on('change', function () {
    checkSelect();
  });

  $('#year-of-diagnosis').on('change', function () {
    checkSelect();
  });

  $('#toggleAbsSelect').on('change', function () {
    toggleAbsSelect();
    checkAbsChg();
    showTrendTable();
  });

  $('#showYearTrend').on('change', function () {
    if (this.checked) {
      if (jpsurvData.results.yearData.survTrend && jpsurvData.results.yearData.survTrend['ACS.jp']) {
        $('#yearAnnoControl').css('display', 'block');
      }
    } else {
      $('#yearAnnoControl').css('display', 'none');
      $('#yearAnno').prop('checked', false);
    }
    showTrendTable();
  });

  $('#showDeathTrend').on('change', function () {
    if (this.checked) {
      if (jpsurvData.results.deathData.deathTrend) {
        $('#deathAnnoControl').css('display', 'block');
      }
    } else {
      $('#deathAnnoControl').css('display', 'none');
      $('#deathAnno').prop('checked', false);
    }
    showTrendTable();
  });

  $('#yearAnno').on('change', function () {
    // getAnnoGraph();
    drawPlot('year', true);
  });

  $('#deathAnno').on('change', function () {
    // getAnnoGraph();
    drawPlot('death', true);
  });

  $('#absChgFrom').on('change', function () {
    jpsurvData.additional.absTmp[0] = parseInt($('#absChgFrom').val());
    checkAbsChg();
  });

  $('#absChgTo').on('change', function () {
    jpsurvData.additional.absTmp[1] = parseInt($('#absChgTo').val());
    checkAbsChg();
  });

  $(document).on('click', '#model-selection-table tbody tr', function (e) {
    e.stopPropagation();
    $(this).addClass('info').siblings().removeClass('info');
    if (jpsurvData.additional.headerJoinPoints == this.rowIndex - 1) {
      return;
    }
    jpsurvData.additional.headerJoinPoints = this.rowIndex - 1;

    resetShowTrend();
    setCalculateData();
    // uncheck recalculation conditional when changing models
    if ($('#useConditionalJp').is(':checked')) {
      $('#useConditionalJp').prop('checked', false).change();
    }
  });

  // $("#covariate_select").on("change", change_covariate_select);
  $('#precision').on('change', userChangePrecision);

  // recalculate button
  Array.prototype.map.call(document.querySelectorAll('.recalculate'), function (link) {
    link.onclick = function (event) {
      event.preventDefault();
      jpsurvData.additional.recalculate = 'true';
      setCalculateData();
    };
  });

  // Set click listeners
  $('#calculate').on('click', function () {
    // $('#calculate').prop('disabled', true);
    // jpsurvData.stage2completed = false;
    // checkUnselectedCohorts();
    // setCalculateData();

    // custom validation rules
    $.validator.addMethod('lessThan', (value, element, param) => {
      const $otherElement = $(param);
      return parseInt(value) < parseInt($otherElement.val());
    });

    // add form rules and validation event
    const rules = {
      condIntStart: { lessThan: `#condIntEnd` },
    };
    const messages = {
      condIntStart: { lessThan: 'Start must be less than End' },
    };

    // form validation and submit
    $('#parameters')
      .submit((e) => e.preventDefault())
      .validate({
        rules,
        messages,
        submitHandler: async (form) => {
          jpsurvData.stage2completed = false;
          checkUnselectedCohorts();
          setCalculateData();
          if (useQueue()) {
            $('#calculate').prop('disabled', true);
          }
        },
      });
    $('#parameters').submit();
  });

  $('#clusterControl :input').on('change', (e) => {
    jpsurvData.viewConditional = ['conditional', 'merged'].includes(e.target.value);
    jpsurvData.merged = e.target.value == 'merged';
    resetShowTrend();
    setCalculateData();
  });

  $('#file_data').on('change', checkInputFiles);
  $('#file_control').on('change', checkInputFiles);
  $('#file_control_csv').on('change', checkInputFiles);
  $('#fileSelect').on('change', checkInputFiles);

  //  ** font size
  $('.fontControl').on('input', (e) => {
    const size = parseInt(e.target.value);
    fontSize = size;
    setCookie('fontSize', size);
    document.querySelectorAll('.fontControl').forEach((v) => {
      v.value = size;
      updatePlotFontSize(`${v.id.split(/font/i)[0]}Plot`, size);
    });
  });

  // add annotation
  $('.addPlotAnno').on('click', (e) => {
    const id = e.target.id;

    if (id.match(/year/i)) addAnnotation(document.querySelector('#yearPlot'));
    if (id.match(/death/i)) addAnnotation(document.querySelector('#deathPlot'));
    if (id.match(/time/i)) addAnnotation(document.querySelector('#timePlot'));
  });
}

// reset view - uncheck "Show Trend Measures" and reset AbsChg Year Range
function resetShowTrend() {
  $('#showYearTrend').prop('checked', false).trigger('change');
  $('#showDeathTrend').prop('checked', false).trigger('change');
  $('#toggleAbsSelect').prop('checked', false).trigger('change');
}

function userChangePrecision() {
  setCookie('precision', $('#precision').val(), 14);
  changePrecision();
}
function addMessages() {
  var e_mail_msg =
    'Multiple Cohorts or single cohort with maximum Joinpoints greater than ' +
    maxJP +
    '  will require additional computing time. When computation is completed, a notification will be sent to the e-mail entered above.';
  $('#e-mail-msg').text(e_mail_msg);

  $('#jpsurv-help-message-container').hide();
}

function addInputSection() {
  if (getUrlParameter('request') == 'true') {
    // attempt to download queued result from s3
    // let check = $.ajax({
    //   async: false,
    //   type: 'HEAD',
    //   url: 'jpsurvRest/results',
    //   data: {
    //     file: 'cohort_models-' + jpsurvData.tokenId + '.json',
    //     tokenId: jpsurvData.tokenId,
    //   },
    // });

    // if (check.status != 200) {
    var file = `${getUrlParameter('tokenId')}.zip`;
    $.ajax({
      type: 'GET',
      url: `jpsurvRest/downloadS3?file=${file}`,
      async: false,
      contentType: 'application/json',
    })
      // .done(function (msg) {
      // })
      .fail(function (jqXHR, textStatus) {
        okAlert(
          'Opps. It looks like the time to view your results has expired.  Please submit another calculation.',
          'JPSurv Time Expired'
        );
      });
    // }
  }
  var status = getUrlParameter('status');
  if (status == 'uploaded') {
    setUploadData();

    control_data = load_ajax(jpsurvData.file.form, jpsurvData.tokenId);
    // load input data if exists (from queued result)
    inputData = load_ajax('input_' + jpsurvData.tokenId + '.json', jpsurvData.tokenId);
    if (inputData) {
      jpsurvData = inputData;
    }

    if (control_data.input_type == undefined) {
      jpsurvData.additional.input_type = 'dic';
      $('#import_container').remove();
      $('#csv_container').remove();
      $('#dic_container').show();

      $('#file_control_container')
        .empty()
        .append(
          $('<div>')
            .addClass('jpsurv-label-container')
            .append($('<span>').append('Dictionary File:').addClass('jpsurv-label'))
            .append(
              $('<span>')
                .append(getUrlParameter('file_control_filename', true))
                .attr('title', getUrlParameter('file_control_filename', true))
                .addClass('jpsurv-label-content')
            )
        );
      $('#file_data_container')
        .empty()
        .append(
          $('<div>')
            .addClass('jpsurv-label-container')
            .append($('<span>').append('Data File:').addClass('jpsurv-label'))
            .append(
              $('<span>')
                .append(getUrlParameter('file_data_filename', true))
                .attr('title', getUrlParameter('file_data_filename', true))
                .addClass('jpsurv-label-content')
            )
        );
      $('#inputTypeLabel').remove();
      $('#input_type_select').remove();
      $(' #upload-form #seperator').remove();
      $(' #input_type');
      load_form();
      $('#data_type_container')
        .empty()
        .append(
          $('<div>')
            .addClass('jpsurv-label-container')
            .append($('<span>').append('Data Type:').addClass('jpsurv-label'))
            .append(
              $('<span>')
                .append(jpsurvData.additional.statistic + ' in ' + getSessionOptionInfo('RatesDisplayedAs'))
                .attr(
                  'title',
                  'Type of data is ' +
                    jpsurvData.additional.statistic +
                    ' in ' +
                    getSessionOptionInfo('RatesDisplayedAs')
                )
                .addClass('jpsurv-label-content')
            )
        );
    } else if (control_data.input_type == 'csv') {
      jpsurvData.additional.input_type = 'csv';
      $('#csv_container').show();
      $('#dic_container').remove();
      $('#import_container').remove();

      $('#file_control_container_csv')
        .empty()
        .append(
          $('<div>')
            .append($('<span>').append('CSV File:').addClass('jpsurv-label'))
            .append(
              $('<span>')
                .append(getUrlParameter('file_control_filename', true))
                .attr('title', getUrlParameter('file_control_filename', true))
                .addClass('jpsurv-label-content')
            )
        );
      $('#inputTypeLabel').remove();
      $('#input_type_select').remove();
      $('#upload-form #seperator').remove();
      $('.upload_file_submit').remove();
      $('#has_headers').remove();
      $('#csv_label_data').remove();
      $('#csv_label_headers').remove();
      $('#data_type').remove();
      $('#Adv_input').remove();

      load_form();
      $('#data_type_container')
        .empty()
        .append(
          $('<div>')
            .addClass('jpsurv-label-container')
            .append($('<span>').append('Data Type:').addClass('jpsurv-label'))
            .append(
              $('<span>')
                .append(jpsurvData.additional.statistic + ' in ' + control_data.rates)
                .attr('title', 'Type of data is ' + jpsurvData.additional.statistic + ' in ' + control_data.rates)
                .addClass('jpsurv-label-content')
            )
        );
    }
  } else if (status == 'failed_upload') {
    message =
      'An unexpected error occured. Please ensure the input file(s) is in the correct format and/or correct parameters were chosen. <br>';
    message_type = 'error';
    id = 'jpsurv';
    showMessage(id, message, message_type);
    $('#right_panel').hide();
    $('#descriptionCard').show();
  } else if (status == 'failed_import') {
    handleError(
      'An unexpected error occured. Please ensure the input file(s) is in the correct format and/or correct parameters were chosen. <br>'
    );
  }
  const calc_status = getUrlParameter('calculation');
  if (calc_status == 'failed') {
    message =
      'An unexpected error occured. Please ensure the input file(s) is in the correct format and/or correct parameters were chosen. <br>';
    message_type = 'error';
    id = 'jpsurv';
    showMessage(id, message, message_type);
    $('#right_panel').hide();
    $('#descriptionCard').show();
    var inputData = load_ajax('input_' + jpsurvData.tokenId + '.json', jpsurvData.tokenId);

    //console.warn("inputData");
    //console.dir(inputData);
    load_input_form(inputData);
  }
  if (getUrlParameter('request') == 'true' && checkInputFile() && calc_status != 'failed') {
    preLoadValues();
  }
}

function checkInputFile() {
  var results = $.ajax({
    async: false,
    type: 'HEAD',
    url: 'jpsurvRest/results',
    data: {
      file: 'input_' + jpsurvData.tokenId + '.json',
      tokenId: jpsurvData.tokenId,
    },
  });

  return results.status == 200;
}

//loads the form based on selected values
function preLoadValues() {
  //Check to see if input file exists.

  var inputData = load_ajax('input_' + jpsurvData.tokenId + '.json', jpsurvData.tokenId);
  if (inputData) {
    //Set jpsurvData and update everything....
    jpsurvData = { ...jpsurvData, ...inputData };
    setIntervalsDefault();
    getIntervals();
    load_input_form(inputData);
    stage2('no calculate'); // This is the initial calculation and setup.
    retrieveResults();
  }
}

function load_input_form(inputData) {
  $('#year_of_diagnosis_start').val(inputData.calculate.form.yearOfDiagnosisRange[0]);
  $('#year_of_diagnosis_end').val(inputData.calculate.form.yearOfDiagnosisRange[1]);

  $('#cohort-variables fieldset').each(function (index, element) {
    var inputs = $(element).find('.' + element.id);
    $.each(inputs, function (index2, element2) {
      $(element2).prop('checked', false);
    });
    $.each(inputs, function (index2, element2) {
      $.each(inputData.calculate.form.AllcohortValues, function (key, value) {
        //loops through each possible cohort on the form, if the cohort is in the json it gets checked
        for (var i = 0; i < value.length; i++) {
          if (value[i].substr(1, value[i].length - 2) == $(element2).val() && element2.className.indexOf(key) > -1) {
            $(element2).prop('checked', true);
          }
        }
      });
    });
  });

  $('#intervals_from_diagnosis').val(inputData.calculate.form.interval);
  $('#max_join_point_select').val(inputData.calculate.form.maxjoinPoints);
  $('#e-mail').val(inputData.queue.email);

  //Advanced section
  if (inputData.calculate.static.advanced.advDeleteInterval == 'T') {
    $('#del-int-yes').attr('checked', true);
  } else {
    $('#del-int-no').attr('checked', true);
  }

  $('#adv-between').val(inputData.calculate.static.advanced.advBetween);
  $('#adv-first').val(inputData.calculate.static.advanced.advFirst);
  $('#adv-last').val(inputData.calculate.static.advanced.advLast);
  $('#adv-year').val(inputData.calculate.static.advanced.advYear);
}
//populates the chort dropdown window based on the form selection
export function updateCohortDropdown() {
  $('#cohort-display').empty();
  var cohort_array = jpsurvData.results.Runs.trim().split(' jpcom ');
  for (var i = 0; i < cohort_array.length; i++) {
    var option = new Option(cohort_array[i], i + 1);
    $('#cohort-display').append(option);
  }

  dropdownListener();
}

export function updateCutPointOptions() {
  $('#cutpoint-display').empty();
  const fitInfo = jpsurvData.results.fitInfo;
  const maxCutPoint = +$('#maxCutPoint').val();
  const optimalIndex = fitInfo['BestFit(Min BIC)'].indexOf('*');
  const cutPointIndex = jpsurvData.results.cutPoint + 1;

  for (let i = 0; i <= maxCutPoint; i++) {
    const label = `${i}${i == optimalIndex ? ' (Optimal)' : ''}`;
    const option = new Option(label, i + 1);
    $('#cutpoint-display').append(option);
  }

  $('#cutpoint-display').val(cutPointIndex).trigger('change');
  jpsurvData.cutPointIndex = cutPointIndex;

  $('#cutpoint-display').on('select2:select', function () {
    jpsurvData.cutPointIndex = this.value || 1;
    if (this.value == 1) jpsurvData.viewConditional = false;
    jpsurvData.plot.static.imageId = 0;
    jpsurvData.additional.recalculate = 'true';
    resetShowTrend();
    calculate(true);
  });
}

//populates the input json with the desired cohort combination based on the cohort dropdown window
function dropdownListener() {
  $('#cohort-display').on('select2:select', function () {
    //splits the cohorts based on a " + "
    var cohorts = $('#cohort-display option:selected').text().split(' + ');
    //adds each cohort to the json
    jpsurvData.calculate.form.cohortValues = cohorts.map(function (cohort) {
      return '"' + cohort + '"';
    });
    //resets the image id
    jpsurvData.plot.static.imageId = 0;
    jpsurvData.firstCalc = true;
    resetShowTrend();
    calculate(true);
  });
}

function updateCohortDisplay() {
  jpsurvData.calculate.form.cohortValues = [];
  var cohort_message = '';
  $('#cohort-variables fieldset').each(function (index, element) {
    jpsurvData.calculate.form.AllcohortValues[index] = [];
    let count = 0;
    var inputs = $(element).find('.' + element.id);
    //Adds all cohorts selected
    $.each(inputs, function (index2, element2) {
      //if checked add to ALL cohorts to be used for populating the drop down (if at least one checkbox is selected)
      if ($(element2).prop('checked')) {
        count++;
        cohort_message += '"' + $(element2).val() + '"';
        if (!jpsurvData.calculate.form.AllcohortValues[index].includes('"' + $(element2).val() + '"')) {
          jpsurvData.calculate.form.AllcohortValues[index].push('"' + $(element2).val() + '"');
        }
      }
    });
    if (count == 0) {
      jpsurvData.calculate.form.AllcohortValues[index].push('""');
    }
    //if none was checked lopp back through and add all cohort values for that cohort
    cohort_message += ' and ';
  });
  //inserts the first cohort combination based on all the cohorts slected (1st value of each cohort)
  const keys = Object.keys(jpsurvData.calculate.form.AllcohortValues);
  for (var i = 0; i < keys.length; i++) {
    const key = i.toString();
    const element = jpsurvData.calculate.form.AllcohortValues[key[0]][0];
    jpsurvData.calculate.form.cohortValues.push(element);
  }

  var i = 0;
  var html = '';
  $('#something').empty();
  $.each(cohort_covariance_variables, function (key, value) {
    $('#something').append(value + ' and');
    i++;
  });
}

function addCohortVariables() {
  jpsurvData.calculate.form.cohortVars = [];
  jpsurvData.calculate.form.AllcohortValues = {};

  if (Object.keys(cohort_covariance_variables).length == 0) {
    $('#cohort-variables')
      .empty()
      .append(
        $('<div>', {
          class: 'jpsurv-label text-info font-weight-bold',
          html: 'No cohorts available',
        })
      );
  } else {
    $('#cohort-variables').empty();
    var i = 0;
    $.each(cohort_covariance_variables, function (key, value) {
      if (key) {
        jpsurvData.calculate.form.cohortVars.push(key);
        jpsurvData.calculate.form.AllcohortValues[i] = [];

        var html =
          '<div class="row"><div class="col-md-12"><fieldset id="cohort-' +
          i +
          '" data-cohort="' +
          key +
          '"><legend><span class="jpsurv-label">' +
          key +
          ':</span></legend></fieldset></div></div>';
        $('#cohort-variables').append(html);
        if (control_data.input_type == undefined) {
          if (typeof control_data.VarFormatSecList[key].ItemValueInDic == 'string') {
            $('#cohort-' + 0).append(
              $('<div>')
                .addClass('custom-control custom-checkbox')
                .append([
                  $('<input>', {
                    class: 'custom-control-input cohort cohort-' + i,
                    id: control_data.VarFormatSecList[key].ItemValueInDic.replace(/\s/g, '_'),
                    value: control_data.VarFormatSecList[key].ItemValueInDic,
                    type: 'checkbox',
                  }),
                  $('<label>', {
                    class: 'custom-control-label cohort-' + i,
                    for: control_data.VarFormatSecList[key].ItemValueInDic.replace(/\s/g, '_'),
                    html: control_data.VarFormatSecList[key].ItemValueInDic,
                  }),
                ])
            );
          } else {
            $.each(control_data.VarFormatSecList[key].ItemValueInDic, function (key2, value2) {
              $('#cohort-' + i).append(
                $('<div>')
                  .addClass('custom-control custom-checkbox')
                  .append([
                    $('<input>', {
                      type: 'checkbox',
                      value: value2,
                      id: value2.replace(/\s/g, '_'),
                      class: 'custom-control-input cohort cohort-' + i,
                    }),
                    $('<label>', {
                      for: value2.replace(/\s/g, '_'),
                      class: 'custom-control-label cohort-' + i,
                      html: value2,
                    }),
                  ])
              );
            });
          }
        } else if (control_data.input_type == 'csv') {
          if (
            typeof cohort_covariance_variables[key] == 'number' ||
            typeof cohort_covariance_variables[key] == 'string'
          ) {
            $('#cohort-' + i).append(
              $('<div>')
                .addClass('custom-control custom-checkbox')
                .append([
                  $('<input>', {
                    class: 'custom-control-input cohort cohort-' + i,
                    id: key + cohort_covariance_variables[key],
                    value: cohort_covariance_variables[key],
                    type: 'checkbox',
                  }),
                  $('<label>', {
                    class: 'custom-control-label cohort-' + i,
                    for: key + cohort_covariance_variables[key],
                    html: cohort_covariance_variables[key],
                  }),
                ])
            );
          }
          for (var j = 0; j < cohort_covariance_variables[key].length; j++) {
            $('#cohort-' + i).append(
              $('<div>')
                .addClass('custom-control custom-checkbox')
                .append([
                  $('<input>', {
                    class: 'custom-control-input cohort cohort-' + i,
                    id: key + cohort_covariance_variables[key][j],
                    value: cohort_covariance_variables[key][j],
                    type: 'checkbox',
                  }),
                  $('<label>', {
                    class: 'custom-control-label cohort-' + i,
                    for: key + cohort_covariance_variables[key][j],
                    html: cohort_covariance_variables[key][j],
                  }),
                ])
            );
          }
        }
        // $("#cohort-"+i).find('input').filter(":first").prop('checked', true);
        i++;
      }
    });
  }
  updateCohortDisplay();
}

$('#file_control_csv').change(function () {
  first_modal = true;
  $('#modalContent').html(
    '<table id="data_table" class="table table-striped" style="height:100px;border-top:none;border-left:none;line-height:0" cellspacing:"0" cellpadding="0px" width="100%"></table>'
  );
  $('#Adv_input').removeAttr('disabled');
  $('#has_headers').prop('checked', true);
  Read_csv_file();
});
function checkInputFiles() {
  //If both files are filed out then enable the Upload Files Button

  var file_control = $('#file_control').val();
  var file_data = $('#file_data').val();
  var file_control_csv = $('#file_control_csv').val();

  if ($('#dic').is(':checked')) {
    var has_dic = false;
    var has_txt = false;
    var error_msg = 'Please choose 1 dictionary file and one text file';
    $('#file_display').empty();

    if ($('#file_control').prop('files').length > 2)
      $('#file_display').html('<span style="color:red">' + error_msg + '</span></br>');
    else {
      for (var i = 0; i < $('#file_control').prop('files').length; i++) {
        var ext = $('#file_control')
          .prop('files')
          [i].name.substr($('#file_control').prop('files')[i].name.length - 3);
        if (ext == 'txt' && has_txt == false) {
          $('#file_display').append(
            "<span'><b>Data file: </b>" + $('#file_control').prop('files')[i].name + '</span></br>'
          );
          has_txt = true;
        }
        if (ext == 'dic' && has_dic == false) {
          $('#file_display').append(
            "<span'><b>Dictionary file: </b>" + $('#file_control').prop('files')[i].name + '</span></br>'
          );
          has_dic = true;
        }
      }
    }
    var numberOfFiles = $('#file_control').prop('files').length;
    if (numberOfFiles == 2 && has_dic == true && has_txt == true) {
      $('#upload_dictxt').removeAttr('disabled');
      $('#upload_dictxt').on('click', handleSubmit);
    } else if (numberOfFiles == 1) {
      $('#file_display').html('<span style="color:red">' + error_msg + '</span></br>');
    }
  } else if ($('#csv').is(':checked')) {
    $('#file_display_csv').empty();
    $('#upload_csv').attr('title', 'Upload Data from CSV File');
    if (file_control_csv.length > 0 && jpsurvData.passed == true) {
      $('#upload_csv').removeAttr('disabled');
      $('#upload_csv').on('click', handleSubmit);
      $('#file_display_csv').append(
        "<span'><b>CSV file: </b>" + $('#file_control_csv').prop('files')[0].name + '</span></br>'
      );
    } else {
      $('#upload_csv').prop('disabled', true);
    }
  } else if ($('#importRadioButton').is(':checked')) {
    $('#file_display_workspace').empty();
    $('#upload_session').attr('title', 'Import Workspace from file');
    if ($('#fileSelect')[0].files.length == 1) {
      $('#upload_session').prop('disabled', false);
      $('#upload_session').on('click', importBackEnd);
      $('#file_display_workspace').append(
        "<span'><b>Workspace file: </b>" + $('#fileSelect').prop('files')[0].name + '</span></br>'
      );
    }
  }
}

// set Data after STAGE 1
function setUploadData() {
  //Set Stage 1 upload data to jpsurvData
  //Set file data
  jpsurvData.file.dictionary = getUrlParameter('file_control_filename');
  jpsurvData.file.data = getUrlParameter('file_data_filename');
  jpsurvData.file.form = getUrlParameter('output_filename');

  let session = getUrlParameter('output_filename');
  session = session.split('.json').shift();
  session = session.split('form-').pop();
  jpsurvData.session_tokenId = session;
  //jpsurvData.file.formId = getUrlParameter('output_filename').substr(5, 6);
  jpsurvData.status = getUrlParameter('status');
}

function createModelSelection() {
  if (jpsurvData.results.SelectedModel == 'NA') {
    jpsurvData.results.SelectedModel = 1;
  }
  jpsurvData.additional.headerJoinPoints = jpsurvData.results.jpInd;

  var ModelSelection = jpsurvData.results.ModelSelection;
  var jp = 0;
  var title = 'Click row to change Number of Joinpoints to ';
  var locations = jpsurvData.results.jpLocation;
  if (!Array.isArray(locations)) locations = [locations];

  $('#model-selection-table > tbody').empty();
  Object.values(ModelSelection).forEach(function (value, index) {
    row = '<tr  id="jp_' + jp + '" title="' + title + jp.toString() + '">';
    row += '"<td class="model-number">' + (jp + 1) + '</td>';
    row += '<td>' + jp || 'None' + '</td>';
    row += '<td>' + locations[index].replace(/\s+/g, ', ') + '</td>';
    row += formatCell(value.bic);
    row += formatCell(value.aic);
    row += formatCell(value.ll);
    row += '<td>' + (value.converged ? 'Yes' : 'No') + '</td></tr>/n';
    $('#model-selection-table > tbody').append(row);
    jp++;
  });
  $('#jp_' + jpsurvData.additional.headerJoinPoints)
    .addClass('info')
    .siblings()
    .removeClass('info');
  $('#jp_' + (jpsurvData.results.SelectedModel - 1))
    .find('td.model-number')
    .text(jpsurvData.results.SelectedModel + ' (final selected model)');

  $('#estimates-coefficients > tbody').empty();
  var row;
  var xvectors = jpsurvData.results.Coefficients.Xvectors.split(',');
  var estimates = jpsurvData.results.Coefficients.Estimates.split(',');
  var std_error = jpsurvData.results.Coefficients.Std_Error.split(',');

  $.each(xvectors, function (index, value) {
    row = '<tr><td>' + value + '</td>';
    row += formatCell(estimates[index]);
    row += formatCell(std_error[index]) + '</tr>\n';
    $('#estimates-coefficients > tbody').append(row);
  });
}

// make sure inputs are arrays
export function checkArray(arr) {
  if (!Array.isArray(arr)) {
    return [arr];
  }
  return arr;
}

function drawPlot(plot, update = false) {
  if (jpsurvData.results) {
    const yodVarName = jpsurvData.calculate.static.yearOfDiagnosisVarName
      .replace(/\(|\)|-/g, '')
      .replace(/__/g, '_')
      .replace(/([^a-zA-Z0-9_]+)/gi, '');
    const cohort = $('#cohort-display option:selected')
      .text()
      .replace(/\s\+\s/g, ' - ');
    const jpInd = jpsurvData.results.jpInd;
    const jp = jpInd ? ` (${jpsurvData.results.jpLocation[jpInd].replace(/\s/g, ', ')})` : '';
    const modelInfo = [cohort ? cohort + ' - ' : '', `Joinpoint ${jpInd}`, jp].join('');
    const observed = jpsurvData.additional.observed;

    if (plot == 'year') {
      const yearData = jpsurvData.results.yearData;
      const trend =
        !$('#yearAnno').is(':checked') && yearData.survTrend && yearData.survTrend['ACS.jp']
          ? yearData.survTrend['ACS.jp']
          : null;

      update
        ? updatePlotData(
            'yearPlot',
            checkArray(yearData.survTable[yodVarName]),
            checkArray(yearData.survTable?.observed || yearData.survTable[observed]),
            checkArray(yearData.survTable.Predicted_Survival_Cum),
            checkArray(yearData.survTable.Interval),
            trend
          )
        : drawLineChart(
            'yearPlot',
            checkArray(yearData.survTable[yodVarName]),
            checkArray(yearData.survTable?.observed || yearData.survTable[observed]),
            checkArray(yearData.survTable.Predicted_Survival_Cum),
            checkArray(yearData.survTable.Interval),
            trend,
            modelInfo
          );
    } else if (plot == 'death') {
      const deathData = jpsurvData.results.deathData;
      const yMark = (
        deathData.deathTable.Relative_Survival_Interval || deathData.deathTable.CauseSpecific_Survival_Interval
      ).map(function (x) {
        return isNaN(x) ? x : 100 - x;
      });

      update
        ? updatePlotData(
            'deathPlot',
            checkArray(deathData.deathTable[yodVarName]),
            checkArray(yMark),
            checkArray(deathData.deathTable.Predicted_ProbDeath_Int),
            checkArray(deathData.deathTable.Interval),
            !$('#deathAnno').is(':checked') && deathData.deathTrend ? deathData.deathTrend : null
          )
        : drawLineChart(
            'deathPlot',
            checkArray(deathData.deathTable[yodVarName]),
            checkArray(yMark),
            checkArray(deathData.deathTable.Predicted_ProbDeath_Int),
            checkArray(deathData.deathTable.Interval),
            !$('#deathAnno').is(':checked') && deathData.deathTrend ? deathData.deathTrend : null,
            modelInfo
          );
    } else if (plot == 'time') {
      const timeData = jpsurvData.results.timeData.timeTable;
      $('#timePlots').empty().append(`<div id="timePlot" class="mx-auto mt-1 d-block"></div>`);

      drawLineChart(
        'timePlot',
        checkArray(timeData.Interval),
        checkArray(timeData[observed]),
        checkArray(timeData.Predicted_Survival_Cum),
        checkArray(timeData[yodVarName]),
        null,
        modelInfo
      );
    }
  }
}

function updateGraphs() {
  // Display annotation on graph if trend exists
  jpsurvData.results.yearData.survTrend &&
  jpsurvData.results.yearData.survTrend['ACS.jp'] &&
  $('#showYearTrend').is(':checked')
    ? ($('#yearAnnoControl').css('display', 'block'), $('#yearAnno').prop('checked', false))
    : ($('#yearAnnoControl').css('display', 'none'), $('#yearAnno').prop('checked', true));
  jpsurvData.results.deathData.deathTrend
    ? ($('#deathAnnoControl').css('display', 'block'), $('#deathAnno').prop('checked', false))
    : ($('#deathAnnoControl').css('display', 'none'), $('#deathAnno').prop('checked', true));

  drawPlot('year');
  drawPlot('death');
  drawPlot('time');

  var yodVarName = jpsurvData.calculate.static.yearOfDiagnosisVarName
    .replace(/\(|\)|-/g, '')
    .replace(/__/g, '_')
    .replace(/([^a-zA-Z0-9_]+)/gi, '');

  //Add the Year Table
  if (jpsurvData.results.yearData.survTable != undefined) {
    const observedCol =
      jpsurvData.calculate.form.relaxProp || jpsurvData.calculate.form.conditional
        ? 'Relative Survival Interval'
        : jpsurvData.results.statistic;
    var yodCol = jpsurvData.results.yearData.survTable[yodVarName];
    var data_type = observedCol.replace('Cum', 'Cumulative');
    var data_se = jpsurvData.results.statistic.replace('Survival', 'SE');
    var se_col = jpsurvData.results.statistic.replace('Cum', 'Cumulative Std. Err.');
    var yearHeaders = [
      'Year of Diagnosis',
      'Interval',
      data_type + ' (%)',
      se_col + ' (%)',
      'Predicted Cumulative Survival (%)',
      'Predicted Cumulative Survival Std. Err. (%)',
    ];
    var allHeaders = jpsurvData.calculate.form.cohortVars.concat(yearHeaders);
    addTable(yodCol, allHeaders, $('#graph-year-table'), jpsurvData.results.yearData.survTable, data_se, 'survival');

    $('#year-tab-rows').html('Total Row Count: ' + (yodCol.length || 1));
  } else {
    $('#graph-year-table > tbody').empty();
  }

  //Add the Death Table
  if (jpsurvData.results.deathData.deathTable != undefined) {
    var yodCol = jpsurvData.results.deathData.deathTable[yodVarName];
    var data_type = jpsurvData.results.statistic.replace('Cum', 'Interval');
    var data_se = jpsurvData.results.statistic.replace('Cum', 'Interval').replace('Survival', 'SE');
    var deathHeader = [
      'Year of Diagnosis',
      'Interval',
      'Observed Prob. of Death Interval (%)',
      'Observed Prob. of Death Interval Std. Err. (%)',
      'Predictive Prob. of Death Interval (%)',
      'Predictive Prob. of Death Interval Std. Err. (%)',
    ];
    var allHeaders = jpsurvData.calculate.form.cohortVars.concat(deathHeader);
    addTable(yodCol, allHeaders, $('#graph-death-table'), jpsurvData.results.deathData.deathTable, data_se, 'death');

    $('#death-tab-rows').html('Total Row Count: ' + (yodCol.length || 1));
  } else {
    $('#graph-death-table > tbody').empty();
  }

  //Add the Time Table
  if (jpsurvData.results.timeData.timeTable != undefined) {
    yodCol = jpsurvData.results.timeData.timeTable[yodVarName];
    var data_type = jpsurvData.results.statistic;
    let observed_header = '';
    if (data_type == 'CauseSpecific_Survival_Cum') observed_header = 'Cumulative CauseSpecific Survival';
    if (data_type == 'Relative_Survival_Cum') observed_header = 'Cumulative Relative Survival';

    var timeHeader = [
      'Year of Diagnosis',
      'Interval',
      observed_header + ' (%)',
      'Predicted Cumulative Relative Survival (%)',
    ];
    var allHeaders = jpsurvData.calculate.form.cohortVars.concat(timeHeader);
    addTable(yodCol, allHeaders, $('#graph-time-table'), jpsurvData.results.timeData.timeTable, null, 'time');

    if (!$('#year-of-diagnosis').data('changed')) {
      $('#year-of-diagnosis').val(jpsurvData.results.yod);
    }
    $('#year-of-diagnosis').data('changed', false);

    $('#time-tab-rows').html('Total Row Count: ' + (yodCol.length || 1));
  } else {
    $('#graph-time-table > tbody').empty();
  }
  changePrecision();
}

export function addTable(yodCol, headers, table, data, data_se, graph) {
  table.empty();
  var tableHeader = $('<tr>').append();
  headers.forEach(function (header) {
    $('<th>').attr('scope', 'col').text(header.replace(/_/g, ' ')).appendTo(tableHeader);
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
    var row = $('<tr>');

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

    $('<td>').text(year).appendTo(row);

    if (jpsurvData.results.input_type == 'dic') {
      row.append(formatCell(data.Interval[index]));
    } else if (jpsurvData.results.input_type == 'csv') {
      row.append(formatCell(data[jpsurvData.results.headers.Interval][index]));
    }

    if (graph != 'time') {
      graph == 'survival'
        ? row.append(formatCell(data[jpsurvData.results.statistic][index]))
        : row.append(formatCell(100 - data[jpsurvData.results.statistic.replace('Cum', 'Interval')][index]));

      row.append(formatCell(data[data_se][index]));
      if (graph == 'survival') {
        row.append(formatCell(data.Predicted_Survival_Cum[index]));
        row.append(formatCell(data.Predicted_Survival_Cum_SE[index]));
      } else if (graph == 'death') {
        row.append(formatCell(data.Predicted_ProbDeath_Int[index]));
        row.append(formatCell(data.Predicted_ProbDeath_Int_SE[index]));
      }
    } else {
      if (jpsurvData.results.input_type == 'dic') {
        row.append(formatCell(data?.observed?.[index] || data[jpsurvData.results.statistic][index]));
      } else if (jpsurvData.results.input_type == 'csv') {
        row.append(
          formatCell(data?.observed[index] || data[jpsurvData.results.headers[jpsurvData.results.statistic]][index])
        );
      }
      row.append(formatCell(data.Predicted_Survival_Cum[index]));
    }
    tableBody.append(row);
  });
  table.append(tableBody);
}

function updateEstimates() {
  var row;
  const jointpoints = jpsurvData.results.ModelSelection;
  const Model =
    jpsurvData.additional.headerJoinPoints != undefined
      ? jpsurvData.additional.headerJoinPoints + 1
      : jpsurvData.results.SelectedModel;

  $('#estimates-jp > tbody').empty();
  row =
    '<tr><td>Bayesian Information Criterion (BIC)</td>' + formatCell(jointpoints['joinpoint' + Model].bic) + '</tr>';
  row += '<tr><td>Akaike Information Criterial (AIC)</td>' + formatCell(jointpoints['joinpoint' + Model].aic) + '</tr>';
  row += '<tr><td>Log Likelihood</td>' + formatCell(jointpoints['joinpoint' + Model].ll) + '</tr>';
  row +=
    '<tr><td>Converged</td><td>' +
    (String(jointpoints['joinpoint' + Model].converged).toUpperCase() == 'TRUE' ? 'Yes' : 'No') +
    '</td></tr>/n';
  $('#estimates-jp > tbody').append(row);

  $('#yod-range').text(jpsurvData.results.JP);
  $('#estimates-jp-selected').text(jpsurvData.additional.headerJoinPoints);
}

function updateTrend() {
  if (jpsurvData.results.yearData.survTrend) {
    $('#trend-aac > tbody').empty();
    updateTrendGraph(jpsurvData.results.yearData.survTrend, 'trend-aac');
  }
  if (jpsurvData.results.deathData.deathTrend) {
    $('#trend-dap > tbody').empty();
    updateTrendGraph(jpsurvData.results.deathData.deathTrend, 'trend-dap');
  }
}

function updateTrendGraph(trends, table_id) {
  function createRow(trend) {
    if (Array.isArray(trend['start.year'])) {
      var rows = [];
      for (let i in trend['start.year']) {
        var tempTrend = {};
        Object.keys(trend).forEach(function (key) {
          tempTrend[key] = trend[key][i];
        });
        rows.push(buildRow(tempTrend));
      }
      return rows;
    } else {
      return buildRow(trend);
    }
  }

  function buildRow(trend) {
    var trend_sig = '';
    if (trend['lowCI'] > 0) trend_sig = 'Increasing';
    else if (trend['upCI'] < 0) trend_sig = 'Decreasing';
    else if (trend['lowCI'] <= 0 && trend['upCI'] >= 0) trend_sig = 'Not significant';

    return $('<tr>').append([
      $('<td>').text(trend['interval'] || trend['Interval']),
      $('<td>').text(trend['start.year']),
      $('<td>').text(trend['end.year']),
      formatCell(trend.estimate * 100),
      formatCell(trend['std.error'] * 100),
      formatCell(trend['lowCI'] * 100),
      formatCell(trend['upCI'] * 100),
      formatCell(trend_sig),
    ]);
  }

  function setTrendTitle(type) {
    // between calendar years or joinpoints
    const title = type == 'calendar' ? 'Trend Measures for User Selected Years' : 'Average Absolute Change in Survival';

    $('#yearTrendHeader').text(title);
  }
  if (table_id == 'trend-aac') {
    // if jp and user trends
    if (trends['ACS.jp'] && trends['ACS.user']) {
      [trends['ACS.jp'], trends['ACS.user']].forEach(function (t, i) {
        if (i == 1) {
          // add user-specified trends "header" row
          $('<tr style="border-bottom: 1px solid black">')
            .append(
              $('<td colspan="100%" class="pt-3 px-0 bg-white">').append(
                $('<h4>').text('Trend Measures for User Selected Years')
              )
            )
            .appendTo('#' + table_id + ' > tbody');
        }
        t.forEach(function (trend) {
          $('#' + table_id + ' > tbody').append(createRow(trend));
        });
        // set original title
        setTrendTitle('joinpoint');
      });
    } else {
      if (trends['ACS.jp']) {
        setTrendTitle('joinpoint');
        trends['ACS.jp'].forEach(function (t) {
          $('#' + table_id + ' > tbody').append(createRow(t));
        });
      }
      if (trends['ACS.user']) {
        setTrendTitle('calendar');
        trends['ACS.user'].forEach(function (t) {
          $('#' + table_id + ' > tbody').append(createRow(t));
        });
      }
    }
  }
  if (table_id == 'trend-dap') {
    trends.forEach(function (t) {
      $('#' + table_id + ' > tbody').append(createRow(t));
    });
  }
}
function updateGraphLinks() {
  document.querySelector('#graph-year-dataset-link').onclick = (event) => {
    event.preventDefault();
    downloadData('survByYear');
  };
  document.querySelector('#graph-death-dataset-link').onclick = (event) => {
    event.preventDefault();
    downloadData('deathByYear');
  };
  document.querySelector('#graph-time-dataset-link').onclick = (event) => {
    event.preventDefault();
    downloadData('survByTime');
  };
  document.querySelector('#model-estimates-link').onclick = (event) => {
    event.preventDefault();
    downloadData('modelEstimates');
  };
  Array.prototype.map.call(document.querySelectorAll('#full-dataset-link'), (link) => {
    link.onclick = async (event) => {
      event.preventDefault();
      await downloadFullData();
    };
  });
}

export function updateTabs() {
  updateGraphs();
  updateEstimates();
  updateGraphLinks();
  updateTrend();
  changePrecision();
  // getAnnoGraph();
}

function calculateAllData() {
  jpsurvRest2('stage3_recalculate', calculateAllDataCallback);
}

function calculateAllDataCallback() {
  var cohort_com = jpsurvData.run;
  var jpInd = jpsurvData.additional.headerJoinPoints;
  retrieveResults(cohort_com, jpInd, jpsurvData.firstCalc);
  jpsurvData.firstCalc = false;
}

function calculateFittedResultsCallback(file = ['']) {
  $('#right_panel').show();
  $('#right_panel').css('display', 'inline-block');
  $('#descriptionCard').hide();
  $('#icon').css('visibility', 'visible');
  Slide_menu_Horz('hide');

  retrieveResults(false, false, false, file[0]);

  //Set precision if cookie is available
  var precision = getCookie('precision');
  if (parseInt(precision) > 0) {
    $('#precision>option:eq(' + (parseInt(precision) - 1) + ')').prop('selected', true);
  }
}

export function buildTimeYod() {
  var minYear = jpsurvData.calculate.form.yearOfDiagnosisRange[0];
  var maxYear = jpsurvData.calculate.form.yearOfDiagnosisRange[1];
  $('#year-of-diagnosis').empty();
  if (jpsurvData.results && Object.keys(jpsurvData.results).length > 0 && jpsurvData.results.timeData.minYear) {
    minYear = Math.max(minYear, jpsurvData.results.timeData.minYear);
    maxYear = Math.min(maxYear, jpsurvData.results.timeData.maxYear);
  }
  for (var i = minYear; i <= maxYear; i++) {
    $('#year-of-diagnosis').append('<OPTION>' + i + '</OPTION>\n');
  }
  if (jpsurvData.results && jpsurvData.results.yod) {
    $('#year-of-diagnosis').val(jpsurvData.results.yod).trigger('change');
  } else {
    $('#year-of-diagnosis').val($('#year-of-diagnosis option:first').val()).trigger('change');
  }
}

export function changePrecision() {
  var precision = $('#precision').val();
  $('td[data-float]').each(function (index, element) {
    var number = $(element).attr('data-float');
    var myFloat = parseFloat(number);
    var myInt = parseInt(number);
    if (myInt == myFloat) {
      //Set the int part
      $(element).text(myInt);
    } else {
      //Set the float part
      $(element).text(myFloat.toFixed(precision));
    }
  });
}

export function formatCell(x) {
  //If the content is a float return a cell with the attribute of data-float
  // else return data in a table cell
  if (isNaN(parseFloat(x))) {
    return '<td>' + x + '</td>';
  } else {
    return "<td data-float='" + x + "'><i>float</i></td>";
  }
}

function setCalculateData() {
  setData();
  if (validateVariables()) {
    calculate();
  }
}

export function setData() {
  updateCohortDisplay();
  jpsurvData.queue = {};
  jpsurvData.queue.email = $('#e-mail').val();
  jpsurvData.queue.url = encodeURIComponent(window.location.href.toString() + '&request=true');

  //Set static data
  var yearOfDiagnosisVarName = $('#selectYear').val()
    ? $('#selectYear').val()
    : jpsurvData.calculate.static.yearOfDiagnosisTitle;

  //Remove spaces and replace with underscore
  jpsurvData.calculate.static.yearOfDiagnosisVarName = yearOfDiagnosisVarName;
  jpsurvData.calculate.static.seerFilePrefix = jpsurvData.file.dictionary.replace(/.\w*$/, '');
  jpsurvData.calculate.static.allVars = get_cohort_covariance_variable_names();
  jpsurvData.calculate.static.allVars.push(yearOfDiagnosisVarName);
  jpsurvData.calculate.form.covariateVars = '';

  jpsurvData.calculate.form.yearOfDiagnosisRange = [
    parseInt($('#year_of_diagnosis_start').val()),
    parseInt($('#year_of_diagnosis_end').val()),
  ];
  jpsurvData.calculate.form.maxjoinPoints = parseInt($('#max_join_point_select').val());
  //
  // Get Advanced Options
  //
  jpsurvData.calculate.static.advanced = {};
  jpsurvData.calculate.static.advanced.advDeleteInterval =
    $("input[name='adv-delete-interval']:checked").val() == 'Yes' ? 'T' : 'F';
  jpsurvData.calculate.static.advanced.advBetween = $('#adv-between').val();
  jpsurvData.calculate.static.advanced.advFirst = $('#adv-first').val();
  jpsurvData.calculate.static.advanced.advLast = $('#adv-last').val();
  jpsurvData.calculate.static.advanced.advYear = $('#adv-year').val();

  var yearsD = $('#year-of-diagnosis').val();
  jpsurvData.additional.yearOfDiagnosis = [];
  $.each(yearsD, function (index, value) {
    jpsurvData.additional.yearOfDiagnosis[index] = parseInt(value);
  });

  jpsurvData.additional.observed = 'Relative_Survival_Cum';
  // if (jpsurvData.additional.statistic == 'Relative Survival') {
  //   jpsurvData.additional.observed = 'Relative_Survival_Interval';
  // }
  if (jpsurvData.additional.statistic == 'Cause-Specific Survival') {
    jpsurvData.additional.observed = 'CauseSpecific_Survival_Cum';
  }
}

function validateYearRange() {
  if (jpsurvData.calculate.form.yearOfDiagnosisRange[1] <= jpsurvData.calculate.form.yearOfDiagnosisRange[0]) {
    okAlert(
      'The Year of Diagnosis Range is invalid.<br><br>The start year can not be greater then or equal to end year.',
      'Rule Validation'
    );
    return false;
  } else {
    return true;
  }
}

function okAlert(message, title) {
  $('#ok-alert').find('.modal-title').empty().html(title);
  $('#ok-alert').find('.modal-body').empty().html(message);
  $('#ok-alert').modal('show');
}

function validateRule1() {
  /*
    Rule 1:
    max(Year) >= min(Year) + advFirst + ((maxjoinPoints-1) * (advBetween+1)) + advLast
    max(Year) >= min(Year) + op$numfromstart + ((nJP-1) * (op$numbetwn+1)) + op$numtoend;
  */
  //Skip this test is maxjoinPoint is zero.
  if (jpsurvData.calculate.form.maxjoinPoints == 0) {
    return true;
  }
  var minYear = jpsurvData.calculate.form.yearOfDiagnosisRange[0];
  var maxYear = jpsurvData.calculate.form.yearOfDiagnosisRange[1];

  if (
    maxYear >=
    minYear +
      parseInt(jpsurvData.calculate.static.advanced.advFirst) +
      (parseInt(jpsurvData.calculate.form.maxjoinPoints) - 1) *
        (parseInt(jpsurvData.calculate.static.advanced.advBetween) + 1) +
      parseInt(jpsurvData.calculate.static.advanced.advLast)
  ) {
    return true;
  } else {
    okAlert(
      sprintf(
        '<p>Unable to perform calculation because the following equation is not true.' +
          '<br><br>maxYear >= minYear + advFirst + ((maxjoinPoints-1) * (advBetween+1)) + advLast' +
          '<br><br>maxYear = %d<br>minYear = %d<br>advFirst = %d<br>maxjoinPoints = %d<br>advBetween = %d<br>advLast = %d<br>' +
          '<br><br>Adjust variables to satisfy the equation and try again.',
        maxYear,
        minYear,
        jpsurvData.calculate.static.advanced.advFirst,
        jpsurvData.calculate.form.maxjoinPoints,
        jpsurvData.calculate.static.advanced.advBetween,
        jpsurvData.calculate.static.advanced.advLast
      ),
      'Rule Validation'
    );
  }

  return false;
}

function validateVariables() {
  return validateYearRange() && validateRule1();
}

function calculate(run) {
  //incrementImageId();
  //Next tokenID

  if (jpsurvData.stage2completed) {
    if (run != true) {
      incrementImageId();
    } else {
      jpsurvData.plot.static.imageId = 0;
    }
    setRun();
    stage3(); // This is a recalculation.
  } else {
    // jpsurvData.tokenId = renewTokenId(true);
    incrementImageId();
    jpsurvData.run = 1;
    jpsurvData.recentTrends = 0;
    jpsurvData.cutPointIndex = 1;
    jpsurvData.viewConditional = false;
    jpsurvData.merged = false;
    if (useQueue() && validateVariables()) {
      setIntervalsDefault();
      getIntervals();
      setUrlParameter('request', 'true');
      jpsurvData.queue.url = encodeURIComponent(window.location.href.toString());
      jpsurvData.additional.yearOfDiagnosis[0] = jpsurvData.calculate.form.yearOfDiagnosisRange[0].toString();
      jpsurvData.additional.yearOfDiagnosis_default = [parseInt($('#year_of_diagnosis_start').val())];
      jpsurvData.additional.del = control_data.del;
      //  jpsurvData.additional.rates=control.rates
      var params = getParams();
      $('#right_panel').hide();
      $('#descriptionCard').show();
      $('#icon').css('visibility', 'hidden');
      var comm_results = jpsurvRest('stage5_queue', params);
      $('#calculating-spinner').modal('hide');
      okAlert(
        'Your submission has been queued.  You will receive an e-mail when calculation is completed.',
        'Calculation in Queue'
      );
    } else if (parseInt($('#max_join_point_select').val()) > maxJP && !validateVariables()) {
      console.log('Not Calculating - validateVariables did not pass');
    } else {
      jpsurvData.plot.static.imageId = 0;
      jpsurvData.additional.yearOfDiagnosis_default = [parseInt($('#year_of_diagnosis_start').val())];
      jpsurvData.additional.del = control_data.del;
      //   jpsurvData.additional.rates=control.rates
      var maxJP = jpsurvData.calculate.form.maxjoinPoints;
      var headerJP = jpsurvData.additional.headerJoinPoints;
      if (headerJP > maxJP) jpsurvData.additional.headerJoinPoints = maxJP;
      stage2('calculate'); // This is the initial calculation and setup.
    }
  }
}

export function setRun() {
  jpsurvData.run = $('#cohort-display').val();
}

function handleSubmit(e) {
  e.preventDefault();
  jpsurvData.tokenId = renewTokenId(false);
  if ($('#csv').is(':checked')) {
    let headers = '';
    const del = $('input[name=del]:checked').val();

    for (var i = 0; i < $('#header_row th').length / 2; i++) {
      const header = $('#header_' + i).val();
      headers += header + del;
    }
    headers = headers.substring(0, headers.length - 1);
    jpsurvData.additional.statistic = $('#data_type').val();
    jpsurvData.mapping.has_headers = String($('#has_headers').is(':checked'));
    $('#upload-form').attr(
      'action',
      'jpsurvRest/stage1_upload?tokenId=' +
        jpsurvData.tokenId +
        '&input_type=' +
        jpsurvData.input_type +
        '&map=' +
        JSON.stringify(jpsurvData) +
        '&has_headers=' +
        jpsurvData.mapping.has_headers +
        '&headers=' +
        headers
    );
  } else {
    jpsurvData.input_type = 'dic';
    $('#upload-form').attr(
      'action',
      'jpsurvRest/stage1_upload?tokenId=' + jpsurvData.tokenId + '&input_type=' + jpsurvData.input_type
    );
  }

  const form = $('#upload-form');

  // disable upload buttons
  $('#upload_dictxt').prop('disabled', true);
  $('#upload_csv').prop('disabled', true);
  $('#upload_session').prop('disabled', true);

  $.ajax({
    url: form.attr('action'),
    type: 'POST',
    data: new FormData(form[0]),
    processData: false,
    contentType: false,
    dataType: 'json',
    success: (data) => {
      if (data.redirect) window.location.href = data.redirect;
      else {
        console.log(data);
        showMessage('jpsurv', 'Server failed to redirect', 'warning');
      }
    },
    error: (err) => {
      showMessage(
        'jpsurv',
        [
          $('<p>').html('An error occured while processing your files. Please reivew your data.'),
          $('<p>').html(err.responseJSON),
        ],
        'error'
      );
    },
    complete: () => {
      // re-enable upload buttons
      $('#upload_dictxt').prop('disabled', false);
      $('#upload_csv').prop('disabled', false);
      $('#upload_session').prop('disabled', false);
    },
  });
}

function retrieveResults(cohort_com, jpInd, firstCalc, file = '') {
  let file_name = '';
  if (file) {
    file_name = `jpsurvRest/results?file=${file}&tokenId=${jpsurvData.tokenId}`;
  } else if (jpInd != undefined && cohort_com != undefined && firstCalc == false) {
    const relaxProp = jpsurvData.calculate.form.relaxProp;
    const cutPointIndex = jpsurvData.cutPointIndex;
    let prefix = jpsurvData.viewConditional ? 'results-conditional-' : 'results-';
    if (jpsurvData.merged) prefix += 'merged-';
    file_name =
      `jpsurvRest/results?file=${prefix}` +
      jpsurvData.tokenId +
      '-' +
      cohort_com +
      '-' +
      jpInd +
      (relaxProp ? `-${cutPointIndex}` : '') +
      '.json&tokenId=' +
      jpsurvData.tokenId;
  } else {
    file_name = generateResultsFilename(cohort_com, jpInd, firstCalc);
  }
  $.getJSON(file_name, function (results) {
    loadResults(results);
  });

  jpsurvData.firstCalc = false;
}

export function generateResultsFilename(cohort_com, jpInd, firstCalc) {
  let file_name = '';
  const relaxProp = jpsurvData.calculate.form.relaxProp;
  const cutPointIndex = jpsurvData.cutPointIndex;
  let prefix = jpsurvData.viewConditional ? 'results-conditional-' : 'results-';
  if (jpsurvData.merged) prefix += 'merged-';
  $.ajax({
    async: false,
    type: 'GET',
    url: 'jpsurvRest/results',
    data: {
      file: 'cohort_models-' + jpsurvData.tokenId + '.json',
      tokenId: jpsurvData.tokenId,
    },
    dataType: 'json',
  })
    .done(function (results) {
      if (!firstCalc) cohort_com = 1;
      file_name =
        `jpsurvRest/results?file=${prefix}` +
        jpsurvData.tokenId +
        '-' +
        cohort_com +
        '-' +
        results[cohort_com - 1] +
        (relaxProp ? `-${cutPointIndex}` : '') +
        '.json&tokenId=' +
        jpsurvData.tokenId;
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      console.warn(jqXHR, textStatus, errorThrown);
    });

  return file_name;
}

export function loadResults(results) {
  const relaxProp = jpsurvData.calculate.form.relaxProp;
  jpsurvData.results = results;

  if (!jpsurvData.stage2completed) {
    updateCohortDropdown();
    if (relaxProp) updateCutPointOptions();
    // reset toggle
    $('#useConditionalJp').prop('checked', false).change();
  } else {
    // restore calculated trend if available
    if (jpsurvData.results.yearData.survTrend) {
      if (jpsurvData.results.yearData.survTrend['ACS.jp']) $('#showYearTrend').prop('checked', true).trigger('change');
      if (jpsurvData.results.yearData.survTrend['ACS.user'])
        $('#toggleAbsSelect').prop('checked', true).trigger('change');
    }
    if (jpsurvData.results.deathData.deathTrend) $('#showDeathTrend').prop('checked', true).trigger('change');
  }
  createModelSelection();
  updateTabs();
  absChgDynamic();
  setIntervalsDynamic();

  const conditional = jpsurvData.calculate.form.conditional;
  if (relaxProp) addCutpointInfo();

  $('#clusterControl').toggleClass('d-none', !relaxProp);
  $('#cutpoint-display-control').toggleClass('d-none', !relaxProp);
  $('#cutpointInfo').toggleClass('d-none', !relaxProp);
  $('#conditionalRecalcVis').toggleClass('d-none', conditional || relaxProp);
  $('#viewCluster2').prop('disabled', +jpsurvData.cutPointIndex == 1);
  $('#viewCluster3').prop('disabled', +jpsurvData.cutPointIndex == 1);
  // $('#toggleConditionalView').prop('checked', jpsurvData.viewConditional);
  $('#toggleConditionalJp').prop('checked', conditional);
  $('#toggleRelaxProp').prop('checked', relaxProp);

  // restore user trend if available
  var survTrend = jpsurvData.results.yearData.survTrend;
  if (survTrend && survTrend['ACS.user']) {
    var trend = survTrend['ACS.user'][0];
    $('#toggleAbsSelect').prop('checked', true).trigger('change');
    $('#absChgFrom').val(trend['start.year']).trigger('change');
    $('#absChgTo').val(trend['end.year']).trigger('change');
  }
  jpsurvData.stage2completed = true;
  jpsurvData.additional.recalculate = 'false';
  updateTrend();
  showTrendTable();
  changePrecision();

  if (results.errors && (results.errors.invalidCohorts || results.errors.errorCohorts)) {
    const invalidCohorts = Array.isArray(results.errors.invalidCohorts)
      ? results.errors.invalidCohorts
      : [results.errors.invalidCohorts];
    const errorCohorts = Array.isArray(results.errors.errorCohorts)
      ? results.errors.errorCohorts
      : [results.errors.errorCohorts];

    const msg = $('<div>')
      .append(
        $('<h6>').text(
          'No data available for the following cohort selections. Please review your input data for compatibility:'
        )
      )
      .append(
        $('<ul>').append([...invalidCohorts, ...errorCohorts].map((cohort) => (cohort ? $('<li>').text(cohort) : '')))
      );

    showMessage('jpsurv', msg, 'Warning');
  }
}

function addCutpointInfo() {
  const { AIC, BIC } = jpsurvData.results.fitInfo;
  const { cutPoint, totalBic, totalLog } = jpsurvData.results;
  $('#cpBic').html(parseFloat(BIC[cutPoint]).toFixed($('#precision').val()));
  $('#totalAic').html(parseFloat(AIC[cutPoint]).toFixed($('#precision').val()));
  $('#totalBic').html(parseFloat(totalBic[cutPoint]).toFixed($('#precision').val()));
  $('#totalLog').html(parseFloat(totalLog[cutPoint]).toFixed($('#precision').val()));
}

function defaultTrends() {
  $('#showYearTrend').prop('checked', false).trigger('change');
  $('#showDeathTrend').prop('checked', false).trigger('change');
  $('#absChgFrom').val('').trigger('change');
  $('#absChgTo').val('').trigger('change');
}

window.getParams = function getParams() {
  const { results, recalculateConditional, ...rest } = jpsurvData;
  const params = JSON.stringify({
    ...rest,
    covariates: cohort_covariance_variables,
  });
  return replaceAll('None', '', params);
};

function incrementImageId() {
  jpsurvData.plot.static.imageId++;
}

function stage2(action) {
  $('#jpsurv-message-container').hide();
  setIntervalsDefault();
  getIntervals();
  setAbsChangeDefault();
  buildTimeYod();
  defaultTrends();
  getTrendTables();
  jpsurvData.additional.yearOfDiagnosis[0] = jpsurvData.calculate.form.yearOfDiagnosisRange[0].toString();
  if (action == 'calculate') {
    jpsurvRest2('stage2_calculate', calculateFittedResultsCallback);
  } else {
    calculateFittedResultsCallback();
  }
}

function stage3() {
  //Run initial calculation with setup.
  $('#jpsurv-message-container').hide();
  jpsurvData.recentTrends = 0;
  $('#year_of_diagnosis_start').val(jpsurvData.calculate.form.yearOfDiagnosisRange[0]);
  getIntervals();
  getTrendTables();
  delete jpsurvData.results;
  calculateAllData();
}

export function getIntervals() {
  var intervals = $('#interval-years').val();
  jpsurvData.additional.intervals = [];
  $.each(intervals, function (index, value) {
    jpsurvData.additional.intervals[index] = parseInt(value);
  });

  var intervalsDeath = $('#interval-years-death').val();
  jpsurvData.additional.intervalsDeath = [];
  $.each(intervalsDeath, function (index, value) {
    jpsurvData.additional.intervalsDeath[index] = parseInt(value);
  });
}

function load_form() {
  $('#diagnosis_title')
    .empty()
    .append(
      $('<div>')
        .addClass('jpsurv-label-container')
        .append(
          $('<span>', {
            id: 'yodLabel',
            class: 'jpsurv-label',
            html: 'Year of Diagnosis<span class="text-danger" title="Year of Diagnosis is required">*</span>:',
          })
        )
    );

  if (control_data.input_type == undefined) {
    $('#yodLabel').append(
      $('<select>')
        .attr({
          id: 'selectYear',
        })
        .append(getYearOptions())
    );
    $('#selectYear').on('select2:select', function () {
      // set diagnosis years and year of diagnosis title
      jpsurvData.calculate.static.years =
        control_data.VarFormatSecList[$('#selectYear option:selected').text()].ItemValueInDic;
      jpsurvData.calculate.static.yearOfDiagnosisTitle = $('#selectYear option:selected').text();
      loadCohorts();
    });
  } else {
    jpsurvData.calculate.static.yearOfDiagnosisTitle = control_data.year[0];
    jpsurvData.calculate.static.years = control_data.data[control_data.year[1]];
    $('#yodLabel').append(
      $('<span>', {
        class: 'jpsurv-label-content',
        title: 'Year of diagnosis label',
        html: jpsurvData.calculate.static.yearOfDiagnosisTitle,
      })
    );
  }

  loadCohorts();
  $('#stage2-calculate').fadeIn();
}

function loadCohorts() {
  if ($('#selectYear').val() != '(Select one)') {
    set_year_of_diagnosis_select();
    set_intervals_from_diagnosis();
    addSessionVariables();
    parse_cohort_covariance_variables();
    addCohortVariables();
    setupParameters();
  }
  if (control_data.input_type == 'csv') {
    get_column_values();
  }
}

// setup conditional and relax proportionality parameters
function setupParameters() {
  // populate select dropdowns
  const intervals = getIntervalOptions();
  jpsurvData.calculate.form.condIntStart = +intervals[0];
  jpsurvData.calculate.form.condIntEnd = +intervals.unshift();
  jpsurvData.calculate.form.maxCutPoint = +intervals.length - 1 < 5 ? intervals.length - 1 : 5;
  $('#condIntStart').each((_, e) => {
    if ($(e).find('option').length == 0) {
      intervals.forEach((v, i) => $(e).append(`<option ${i == 0 ? 'selected' : ''} value="${v}">${v}</option>`));
    }
  });
  $('#condIntEnd').each((_, e) => {
    if ($(e).find('option').length == 0) {
      intervals.forEach((v, i) =>
        $(e).append(`<option ${i == intervals.length - 1 ? 'selected' : ''} value="${v}">${v}</option>`)
      );
    }
  });
  $('#maxCutPoint').each((_, e) => {
    if ($(e).find('option').length == 0) {
      intervals.slice(0, -1).forEach((v, i, arr) => $(e).append(`<option value="${v}">${v}</option>`));
      $(e).val(jpsurvData.calculate.form.maxCutPoint);
    }
  });

  // checkbox visibility toggle
  $('#toggleConditionalJp').on('change', (e) => {
    if (e.target.checked) {
      $('#conditionalForm').attr('class', 'form');
      jpsurvData.calculate.form.conditional = true;
      // disable relax proportionality
      $('#toggleRelaxProp').prop('disabled', true);
      $('#toggleRelaxProp').prop('checked', false).change();
    } else {
      $('#conditionalForm').attr('class', 'form d-none');
      jpsurvData.calculate.form.conditional = false;
      // enable relax proportionality
      $('#toggleRelaxProp').prop('disabled', false);
    }
  });
  $('#toggleRelaxProp').on('change', (e) => {
    if (e.target.checked) {
      $('#relaxPropForm').removeClass('d-none');
      $('#maxCutPoint').prop('disabled', false);
      jpsurvData.calculate.form.relaxProp = true;
      // disable conditional survival
      $('#toggleConditionalJp').prop('disabled', true);
      $('#toggleConditionalJp').prop('checked', false).change();
    } else {
      $('#relaxPropForm').addClass('d-none');
      $('#maxCutPoint').prop('disabled', true);
      jpsurvData.calculate.form.relaxProp = false;
      // enable conditional survival
      $('#toggleConditionalJp').prop('disabled', false);
    }
  });
  // disable relax proportionality for less than 2
  if (intervals.length == 1) {
    $('#toggleRelaxProp').prop('disabled', true);
  } else {
    $('#toggleRelaxProp').prop('disabled', false);
  }

  // save selected values
  $('#condIntStart').change((e) => {
    jpsurvData.calculate.form.condIntStart = +e.target.value;
  });
  $('#condIntEnd').change((e) => {
    jpsurvData.calculate.form.condIntEnd = +e.target.value;
  });
  $('#maxCutPoint').change((e) => {
    jpsurvData.calculate.form.maxCutPoint = +e.target.value;
  });
}

// construct year of diagnosis option elements
function getYearOptions() {
  var cohortFilter = ['Page type', 'Interval'];
  var dicOptions = Object.keys(control_data.VarFormatSecList).filter(function (e) {
    return !cohortFilter.includes(e);
  });
  if (jpsurvData.calculate.static.yearOfDiagnosisTitle) {
    var found = true;
  } else {
    var found = parse_diagnosis_years();
  }
  if (found) {
    var yodTitle = jpsurvData.calculate.static.yearOfDiagnosisTitle;
    html = dicOptions.map(function (option) {
      if (option.includes(yodTitle)) {
        return '<option selected value=' + option.replace(/\s+/g, '_') + '>' + option + '</option>';
      } else {
        return '<option value=' + option.replace(/\s+/g, '_') + '>' + option + '</option>';
      }
    });
    return html.join('');
  } else {
    showMessage(
      'jpsurv',
      'Year of Diagnosis not found. Please select it manually and ensure it is included with your file input.',
      'Warning'
    );
    var html = dicOptions.map(function (option) {
      return '<option value=' + option.replace(/\s+/g, '_') + '>' + option + '</option>';
    });
    return '<option>(Select one)</option>' + html;
  }
}

function get_column_values() {
  jpsurvData.additional.has_headers = control_data.has_headers;
  jpsurvData.additional.alive_at_start = control_data.alive_at_start;
  jpsurvData.additional.died = control_data.died;
  jpsurvData.additional.lost_to_followup = control_data.lost_to_followup;
  jpsurvData.additional.exp_int = control_data.exp_int;
  jpsurvData.additional.observed = control_data.observed;
  jpsurvData.additional.interval = control_data.interval[1];
}
function addSessionVariables() {
  if (control_data.input_type == undefined) jpsurvData.additional.statistic = getSessionOptionInfo('Statistic');
  else if (control_data.input_type == 'csv') jpsurvData.additional.statistic = control_data.statistic;
}

// returns true if YoD is found and set, otherwise return false
export function parse_diagnosis_years() {
  // First we need to find the element that says "Year of Diagnosis"
  // Then we need to read the label for the previous row, this will be the name used for the title,
  // it will ALSO be the value in the array needed to find the years
  var diagnosis_row = find_year_of_diagnosis_row();
  if (diagnosis_row >= 2) {
    jpsurvData.calculate.static.yearOfDiagnosisTitle = control_data.VarAllInfo.ItemValueInDic[diagnosis_row - 1];
    jpsurvData.calculate.static.years =
      control_data.VarFormatSecList[jpsurvData.calculate.static.yearOfDiagnosisTitle].ItemValueInDic;
  } else {
    return false;
  }
  return true;
}
function parse_cohort_covariance_variables() {
  // First find the variables
  //  They are everything between the Page type and Year Of Diagnosis Label (noninclusive) with the VarName attribute
  if (control_data.input_type == undefined) {
    var cohortVarNames = get_cohort_covariance_variable_names();
    cohort_covariance_variables = new Object();
    for (var i = 0; i < cohortVarNames.length; i++) {
      var cohort_covariance_variable_values = get_cohort_covariance_variable_values(cohortVarNames[i]);
      cohort_covariance_variables[cohortVarNames[i]] = cohort_covariance_variable_values;
    }
  } else if (control_data.input_type == 'csv') {
    cohort_covariance_variables = new Object();
    var cohortVarNames = control_data.cohort_names;

    for (var i = 0; i < control_data.cohort_names.length; i++) {
      const cohort_col = control_data.cohort_keys[i];
      cohort_covariance_variables[control_data.cohort_names[i]] = control_data.data[cohort_col];
    }
  }
}
export function setIntervalsDefault() {
  jpsurvData.additional.intervals_default = [];

  var maxInt = jpsurvData.calculate.form.interval;
  var selectedRange =
    jpsurvData.calculate.form.yearOfDiagnosisRange[1] - jpsurvData.calculate.form.yearOfDiagnosisRange[0];

  maxInt = selectedRange < maxInt ? selectedRange : maxInt;
  var selectedYears = [];
  //Set the ranges based on interval length
  if (maxInt >= 10) {
    selectedYears = [5, 10];
    jpsurvData.additional.intervals_default = selectedYears;
    jpsurvData.additional.intervals = selectedYears;
    jpsurvData.additional.intervalsDeath = selectedYears;
  } else if (maxInt >= 5) {
    selectedYears = [5];
    jpsurvData.additional.intervals_default = selectedYears;
    jpsurvData.additional.intervals = selectedYears;
    jpsurvData.additional.intervalsDeath = selectedYears;
  } else if (maxInt < 5) {
    selectedYears = [maxInt];
    jpsurvData.additional.intervals_default = selectedYears;
    jpsurvData.additional.intervals = selectedYears;
    jpsurvData.additional.intervalsDeath = selectedYears;
  }

  setIntervalYears(1, maxInt);
}

function setIntervalYears(min, max) {
  clearIntervalYears();
  const prevInt = jpsurvData.additional.intervals || [];
  const prevIntDeath = jpsurvData.additional.intervalsDeath || [];

  for (let i = +min; i <= +max; i++) {
    $('#interval-years').append(new Option(i, i));
    $('#interval-years-death').append(new Option(i, i));
  }

  if (prevInt.length && prevInt.some((e) => e >= min && e <= max)) {
    $('#interval-years').val(prevInt).trigger('change');
  } else {
    $('#interval-years').val([max]).trigger('change');
  }
  if (prevIntDeath.length && prevIntDeath.some((e) => e >= min && e <= max)) {
    $('#interval-years-death').val(prevIntDeath).trigger('change');
  } else {
    $('#interval-years-death').val([max]).trigger('change');
  }
}

function getSessionOptionInfo(var_name) {
  if (control_data.input_type == undefined) {
    var session_value = '-1';
    $.each(control_data.SessionOptionInfo.ItemNameInDic, function (key, value) {
      if (value == var_name) {
        session_value = control_data.SessionOptionInfo.ItemValueInDic[key];
      }
    });
  }

  return session_value;
}

function get_cohort_covariance_variable_names() {
  var cohort_covariance_variable_names = [];
  var yearOfDiagnosisTitle = jpsurvData.calculate.static.yearOfDiagnosisTitle;

  if (control_data.input_type == undefined) {
    var form_data = control_data;
    var names = control_data.VarAllInfo.ItemNameInDic;

    var values = control_data.VarAllInfo.ItemValueInDic;
    var regex_base = /^Var\d*Base/;
    var regex_name = /^Var\d*Name/;
    var regex_interval = /Interval/;
    var regex_year = yearOfDiagnosisTitle;
    //Go through Item Value and look for "Year of diagnosis"
    //Push variable names on to a list called cohort_covariance_variable_names.
    for (var i = 0; i < names.length; i++) {
      if (regex_interval.test(values[i])) break; //stops at a value with "Interval" in it
      if (!regex_name.test(names[i])) continue;
      if (values[i] == 'Page type') continue; // Skip the Page type
      if (regex_year == values[i]) continue; //skips "Year of diagnosis"
      //if variable has Base for which
      cohort_covariance_variable_names.push(values[i]);
    }
  } else if (control_data.input_type == 'csv') {
    for (var i = 0; i < control_data.cohort_names.length; i++) {
      cohort_covariance_variable_names.push(control_data.cohort_names[i]);
    }
  }
  return cohort_covariance_variable_names;
}

function get_cohort_covariance_variable_values(name) {
  return control_data.VarFormatSecList[name].ItemValueInDic;
}

function find_year_of_diagnosis_row() {
  if (control_data.input_type == undefined) {
    var vals = control_data.VarAllInfo.ItemValueInDic;
    for (var i = 0; i < vals.length; i++) {
      if (vals[i] == 'Year of diagnosis') return i;
    }
  }
  return 0;
}

function toggleAbsSelect() {
  const toggled = $('#toggleAbsSelect').prop('checked');
  if (!toggled) {
    $('#absChgFrom').prop('disabled', !toggled).val('').trigger('change');
    $('#absChgTo').prop('disabled', !toggled).val('').trigger('change');
    $('#warning-wrapper').popover('dispose');
  } else {
    $('#absChgFrom').prop('disabled', !toggled);
    $('#absChgTo').prop('disabled', !toggled);
    $('#warning-wrapper').popover('dispose');
  }
}

function clearAbsChg() {
  jpsurvData.additional.absTmp = [NaN, NaN];
  jpsurvData.additional.absChgRange = null;
  $('#absChgFrom').empty().append('<OPTION value="">----</OPTION>');
  $('#absChgTo').empty().append('<OPTION value="">----</OPTION>');
  $('#toggleAbsSelect').prop('checked', false).trigger('change');
}

function setAbsRange(range) {
  $('#absChgFrom').empty();
  $('#absChgTo').empty();
  for (var year = range[0]; year <= range[1]; year++) {
    $('#absChgFrom').append('<OPTION>' + year + '</OPTION>');
    $('#absChgTo').append('<OPTION>' + year + '</OPTION>');
  }
}

export function setAbsChangeDefault() {
  clearAbsChg();
  setAbsRange(jpsurvData.calculate.form.yearOfDiagnosisRange);
}

// only allow options within range with cohort combo
function absChgDynamic() {
  if (Object.keys(jpsurvData.results).length > 0) {
    if (jpsurvData.results.timeData.minYear) {
      var tmpRange = jpsurvData.additional.absChgRange;
      var checked = $('#toggleAbsSelect').is(':checked');
      // clearAbsChg();
      let range = [jpsurvData.results.timeData.minYear, jpsurvData.results.timeData.maxYear];
      range[0] = Math.max(range[0], jpsurvData.calculate.form.yearOfDiagnosisRange[0]);
      range[1] = Math.min(range[1], jpsurvData.calculate.form.yearOfDiagnosisRange[1]);
      setAbsRange(range);
      if (tmpRange != null) {
        $('#absChgFrom').val(tmpRange[0]).trigger('change');
        $('#absChgTo').val(tmpRange[1]).trigger('change');
      }
      $('#toggleAbsSelect').prop('checked', checked);
    }
  }
}

function clearIntervalYears() {
  $('#interval-years').empty();
  $('#interval-years-death').empty();
}

// only allow intervals within range of cohort combo
function setIntervalsDynamic() {
  const { Interval } = jpsurvData.results?.timeData;
  const relaxProp = jpsurvData.calculate.form.relaxProp;
  if (relaxProp) {
    const { fitInfo, cutPoint, fullDownload } = jpsurvData.results;
    const [min, max] = jpsurvData.merged
      ? [
          Math.min(...fullDownload.Interval.filter(Number.isFinite)),
          Math.max(...fullDownload.Interval.filter(Number.isFinite)),
        ]
      : (jpsurvData.viewConditional ? fitInfo['Intervals.2'] : fitInfo['Intervals.1'])[cutPoint].split(' - ');
    setIntervalYears(min, max);
  } else if (Interval?.length) {
    setIntervalYears(Math.min(...Interval), Math.max(...Interval));
  }
}

function set_year_of_diagnosis_select() {
  jpsurvData.calculate.static.years.forEach(function (year) {
    $('#year_of_diagnosis_start').append('<OPTION>' + year + '</OPTION>');
    $('#year_of_diagnosis_end').append('<OPTION>' + year + '</OPTION>');
  });
  // Set last entry in year_of_diagnosis_end
  // Count the number of options in #year_of_diagnosis_end and select the last one.
  var numberOfOptions = $('select#year_of_diagnosis_end option').length;
  $('#year_of_diagnosis_end option')[numberOfOptions - 1].selected = true;
}

function set_intervals_from_diagnosis() {
  if (control_data.input_type == 'csv') {
    generateIntervalSelect(control_data.data[control_data.interval[1]]);
  } else {
    generateIntervalSelect(control_data.VarFormatSecList.Interval.ItemNameInDic);
  }
}

function generateIntervalSelect(source) {
  $('#intervals_from_diagnosis').empty();
  for (let i = 0; i < source.length; i++) {
    $('#intervals_from_diagnosis').append('<OPTION value=' + source[i] + '> <= ' + source[i] + '</OPTION>');
    // default to last interval
    $('#intervals_from_diagnosis').val($('#intervals_from_diagnosis option:last').val());
    jpsurvData.calculate.form.interval = parseInt($('#intervals_from_diagnosis option:last').val());
  }
}

// function set_covariate_select(covariate_options) {
//   if (covariate_options.length == 0) {
//   }

//   $("#covariate_select").empty();
//   $("#covariate_select_plot").empty();

//   for (i = 0; i < covariate_options.length; i++) {
//     $("#covariate_select").append(
//       '<OPTION data-info="Selecting a covariate variable in this model assumes that the hazards are proportional to the different levels of this covariate. This might not be realistic.">' +
//         covariate_options[i] +
//         "</OPTION>"
//     );
//     $("#covariate_select_plot").append(
//       '<OPTION data-info="Selecting a covariate variable in this model assumes that the hazards are proportional to the different levels of this covariate. This might not be realistic.">' +
//         covariate_options[i] +
//         "</OPTION>"
//     );
//   }
// }

function change_cohort_first_index_select() {
  var val = $('#cohort_value_0_select').val();
  $('#header-cohort-value').text(val);
}

function remove_items_from_set(big_set, removed_set) {
  var new_set = [];

  for (let i = 0; i < big_set.length; i++) {
    if ($.inArray(big_set[i], removed_set) == -1) new_set.push(big_set[i]);
  }

  return new_set;
}

// function change_covariate_select() {
//   var all_selected = $("#covariate_select").val();
//   var keys = Object.keys(cohort_covariance_variables);

//   $("#covariate_sub_select").empty();

//   if (all_selected != null) {
//     for (var j = 0; j < keys.length; j++) {
//       if (all_selected == keys[j])
//         add_cohort_covariance_variable_select(
//           $("#covariate_sub_select"),
//           "covariate_value",
//           keys[j],
//           cohort_covariance_variables[keys[j]]
//         );
//     }
//     var covariate_options = remove_items_from_set(keys, all_selected);
//   } else {
//     var covariate_options = keys;
//   }

//   if (all_selected == "None") {
//     $("#covariate-fieldset").hide();
//   } else {
//     $("#covariate-fieldset").show();
//   }
// }

function add_cohort_covariance_variable_select(field, variable_name, variable_title, values) {
  var variable_select = $("<SELECT id='" + variable_name + "_select' name='" + variable_name + "_select' >");
  for (let i = 0; i < values.length; i++) {
    variable_select.append('<OPTION>' + values[i] + '</OPTION>');
  }
  var sub_form_div = $('<div>').addClass('col-md-6');
  sub_form_div.append(variable_select);

  var label_message = variable_title + ' :';

  //Label
  var label = $('<label>')
    .append(label_message)
    .attr('for', variable_name + '_select')
    .addClass('pt-0')
    .addClass('col-md-6');

  field.append($("<DIV class='sub_select'>").append(label).append(sub_form_div));
  field.append($('<div>').css('clear', 'both'));

  if (field.attr('id') == 'covariate_sub_select') {
    $('#' + variable_name + '_select').attr('multiple', '');
  }
  $('#cohort_value_0_select').change(change_cohort_first_index_select);
}

function jpsurvRest2(action, callback) {
  const params = getParams();
  $('#calculating-spinner').modal({ backdrop: 'static' });
  $('#calculating-spinner').modal('show');
  const url = 'jpsurvRest/' + action + '?jpsurvData=' + encodeURIComponent(params);
  return $.ajax({
    type: 'GET',
    url: url,
    contentType: 'application/json',
  })
    .done(function (data) {
      callback(data);
      $('#calculating-spinner').modal('hide');
    })
    .fail(function (jqXHR, textStatus) {
      $('#calculating-spinner').modal('hide');
      displayCommFail('jpsurv', jqXHR, textStatus);
    });
}

function displayCommFail(id, jqXHR, textStatus) {
  console.warn('jqXHR', jqXHR);
  var message;
  // ERROR
  if (jqXHR.status == 500) {
    message =
      'An unexpected error occured. Please ensure the input file(s) is in the correct format and/or correct parameters were chosen.';
  } else if (jqXHR.status == 404) {
    message = 'Could not export workspace. Please check that input files are properly named and formatted.';
  } else if (jqXHR.status == 400) {
    message = jqXHR.responseJSON.msg;
  } else {
    message = 'code(' + jqXHR.status + ') ' + jqXHR.statusText + ' (' + textStatus + ')';
    message +=
      'The server is temporarily unable to service your request due to maintenance downtime or capacity problems. Please try again later.';
  }

  showMessage(id, message, 'error');
}
function jpsurvRest(action, params) {
  var json = (function () {
    var json = null;

    var url = 'jpsurvRest/' + action + '?jpsurvData=' + encodeURIComponent(params);

    $.ajax({
      async: false,
      global: false,
      url: url,
      dataType: 'json',
      success: function (data) {
        json = data;
      },
      error: function (jqXHR, textStatus, errorThrown) {
        //console.dir(jqXHR);
        //console.log(errorThrown);
        var id = 'jpsurv';
        console.warn('header: ' + jqXHR + '\ntextStatus: ' + textStatus + '\nerrorThrown: ' + errorThrown);
        // ERROR
        if (errorThrown == 'INTERNAL SERVER ERROR') {
          message =
            'An unexpected error occured. Please esnure the input file(s) is in the correct format and/or correct parameters were chosen. <br>';
          message_type = 'error';
        } else {
          message = 'Service Unavailable: ' + textStatus + '<br>';
          message +=
            'The server is temporarily unable to service your request due to maintenance downtime or capacity problems. Please try again later.<br>';
          message_type = 'error';
        }
        showMessage(id, message, message_type);
        $('#calculating-spinner').modal('hide');

        json = '{"status":"error"}';
      },
    });
    return json;
  })();
  if (typeof json === 'object') {
  }

  return json;
}

export function showMessage(id, message, message_type) {
  //  Display either a warning an error.
  $('#right_panel').show();
  $('#descriptionCard').hide();
  $('#icon').css('visibility', 'visible');

  var css_class = '';
  var header = '';
  var container_id = id + '-message-container';

  if (message_type.toUpperCase() == 'ERROR') {
    css_class = 'bg-danger text-white';
    header = 'Error';
  } else {
    css_class = 'bg-warning';
    header = 'Warning';
  }
  // console.warn(message);
  $('#' + container_id)
    .empty()
    .show()
    .append(
      $('<div>')
        .addClass('card')
        .append(
          $('<div>')
            .addClass('card-header ' + css_class)
            .text(header)
        )
        .append($('<div>').addClass('card-body').append($('<p>').html(message)))
    );
}

function load_ajax(filename, tokenId) {
  var json = null;

  $.ajax({
    async: false,
    global: false,
    type: 'GET',
    url: 'jpsurvRest/results',
    data: {
      file: filename,
      tokenId: tokenId,
    },
    dataType: 'json',
  })
    .done(function (data) {
      json = data;
    })
    .fail(function (jqXHR, textStatus) {
      console.log(filename, 'not found');
    });

  return json;
}

function getUrlParameter(sParam, abbr) {
  var sPageURL = window.location.search.substring(1);
  var sURLVariables = sPageURL.split('&');

  for (var i = 0; i < sURLVariables.length; i++) {
    var sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] == sParam) {
      if (abbr == true && sParameterName[1].length > 30) {
        const start = sParameterName[1].substring(0, 14);
        const end = sParameterName[1].substring(sParameterName[1].length - 15);
        return start + '...' + end;
      } else {
        return sParameterName[1];
      }
    }
  }
}

/**
 * objectInspector digs through a Javascript object
 * to display all its properties
 *
 * @param object - a Javascript object to inspect
 * @param result - a string of properties with datatypes
 *
 * @return result - the concatenated description of all object properties
 */
function objectInspector(object, result) {
  if (typeof object != 'object') return 'Invalid object';
  if (typeof result == 'undefined') result = '';

  if (result.length > 50) return '[RECURSION TOO DEEP. ABORTING.]';

  var rows = [];
  for (var property in object) {
    var datatype = typeof object[property];

    var tempDescription = result + '"' + property + '"';
    tempDescription += ' (' + datatype + ') => ';
    if (datatype == 'object') tempDescription += 'object: ' + objectInspector(object[property], result + '  ');
    else tempDescription += object[property];

    rows.push(tempDescription);
  } //Close for

  return rows.join(result + '\n');
} //End objectInspector

$.fn.serializeObject = function () {
  var o = {};
  var a = this.serializeArray();
  $.each(a, function () {
    if (o[this.name] !== undefined) {
      if (!o[this.name].push) {
        o[this.name] = [o[this.name]];
      }
      o[this.name].push(this.value || '');
    } else {
      o[this.name] = this.value || '';
    }
  });
  return o;
};

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

window.Slide_menu_Horz = function Slide_menu_Horz(action) {
  if ($('#icon').hasClass('fa fa-caret-left fa-2x') || action == 'hide') {
    $('#icon').removeClass('fa fa-caret-left fa-2x');
    $('#icon').addClass('fa fa-caret-right fa-2x');
    $('#slideoutForm').fadeOut(300);

    $('#icon').animate(
      {
        marginLeft: '1%',
      },
      300
    );

    $('#slideoutForm').animate(
      {
        transform: 'translate(-400px, 0px)',
      },
      300
    );

    setTimeout(function () {
      $('#right_panel').animate({}, 300);
      $('#right_panel').removeClass('col-lg-8');
      // $("#right_panel").removeClass("col-md-7");
      $('#right_panel').addClass('col-lg-12');
      // $("#right_panel").addClass("col-md-12");
      $('#right_panel').css('margin-top', '0%');
    }, 300);
  } else if ($('#icon').hasClass('fa fa-caret-right fa-2x') || action == 'show') {
    $('#icon').removeClass('fa fa-caret-right fa-2x');
    $('#icon').addClass('fa fa-caret-left fa-2x');
    $('#slideoutForm').fadeIn(500);
    $('#right_panel').removeClass('col-lg-12');
    // $("#right_panel").removeClass("col-md-12");
    $('#right_panel').addClass('col-lg-8');
    // $("#right_panel").addClass("col-md-7");
    $('#right_panel').css('margin-top', '2%');

    $('#icon').animate(
      {
        marginLeft: '100%',
      },
      20
    );
  }
};

window.Slide_menu_Vert = function Slide_menu_Vert(Id, action) {
  if (($('#' + Id).css('display') != 'none' && action == 'both') || action == 'hide') {
    $('#' + Id).animate({ height: '0px', opacity: 0 }, 300);
    setTimeout(function () {
      document.getElementById(Id).style.display = 'none';
    }, 299);
  } else if (($('#' + Id).css('display') == 'none' && action == 'both') || action == 'show') {
    document.getElementById(Id).style.display = 'block';
    $('#' + Id).animate(
      {
        height: '400px',
        opacity: 1,
      },
      300
    );
  }
};

function decimalPlaces(num) {
  var match = ('' + num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) {
    return 0;
  }

  //console.dir(match);

  var answer = Math.max(
    0,
    // Number of digits right of decimal point.
    (match[1] ? match[1].length : 0) -
      // Adjust for scientific notation.
      (match[2] ? +match[2] : 0)
  );
  return answer;
}

function displayError(id, data) {
  // Display error or warning if available.
  //console.dir(data);

  var error = false;
  if (data.traceback) {
    //console.warn("traceback");
    //console.warn(data.traceback);
  }
  if (data.warning) {
    $('#' + id + '-message-warning').show();
    $('#' + id + '-message-warning-content')
      .empty()
      .append(data.warning);
    //hide error
    $('#' + id + '-message').hide();
  }

  if (data.error) {
    // ERROR
    $('#' + id + '-message').show();
    $('#' + id + '-message-content')
      .empty()
      .append(data.error);
    //hide warning
    $('#' + id + '-message-warning').hide();

    //matrix specific
    $('#' + id + '-download-links').hide();

    $('#' + id + '-results-container').hide();

    error = true;
  }
  return error;
}

function renewTokenId(refresh_url) {
  const tokenId = crypto.randomUUID();
  jpsurvData.plot.static.imageId = -1;
  //console.warn(tokenId);
  if (refresh_url == true) {
    setUrlParameter('tokenId', tokenId.toString());
    setUrlParameter('request', 'false');
  }

  return tokenId.toString();
}

function setUrlParameter(sParam, value) {
  var sPageURL = window.location.search.substring(1);

  var sURLVariables = sPageURL.split('&');
  //console.dir(sURLVariables);
  $.each(sURLVariables, function (key, content) {
    var sParameterName = content.split('=');
    //console.dir(sParameterName);
    if (sParameterName[0] == sParam) {
      sURLVariables[key] = sParameterName[0] + '=' + value;
    }
  });

  window.history.pushState({}, '', '?' + sURLVariables.join('&'));
}

function sprintf() {
  var args = arguments,
    string = args[0],
    i = 1;
  return string.replace(/%((%)|s|d)/g, function (m) {
    // m is the matched format, e.g. %s, %d
    var val = null;
    if (m[2]) {
      val = m[2];
    } else {
      val = args[i];
      // A switch statement so that the formatter can be extended. Default is %s
      switch (m) {
        case '%d':
          val = parseFloat(val);
          if (isNaN(val)) {
            val = 0;
          }
          break;
      }
      i++;
    }
    return val;
  });
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  var expires = 'expires=' + d.toUTCString();
  document.cookie = cname + '=' + cvalue + '; ' + expires;
}

export function getCookie(cname) {
  var name = cname + '=';
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}
$('#csv').click(function () {
  jpsurvData.input_type = 'csv';
  $('#dic_container').hide();
  $('#import_container').hide();
  $('#csv_container').show();
  $('#upload_csv').prop('disabled', true);
  checkInputFiles();
});

$('#dic').click(function () {
  jpsurvData.input_type = 'dic';
  $('#csv_container').hide();
  $('#import_container').hide();
  $('#dic_container').show();
  $('#upload_dictxt').prop('disabled', true);

  checkInputFiles();
});

$('#importRadioButton').click(function () {
  $('#csv_container').hide();
  $('#dic_container').hide();
  $('#import_container').show();

  checkInputFiles();
});

//MODAL CONTENT BELOW!!/////////////////
$('#Adv_input').click(function () {
  if (first_modal == true) Read_csv_file();
  else {
    $('#modal').modal('show');
    var type = $('#data_type').val();
    $('option[id="survCum"]').text(type + ' Cum');
    $('option[id="survInt"]').text(type + ' Int');
    $('option[id="survCumSE"]').text(type + ' Cum SE');
    $('option[id="survIntSE"]').text(type + ' Int SE');
  }
});

function Read_csv_file() {
  var fileInput = $('#file_control_csv');
  fileInput = fileInput[0];
  var file = fileInput.files[0];
  var filereader = new FileReader();
  var has_headers = $('#has_headers').is(':checked');
  let lines = parseInt($('#lines_displayed').val());
  if (first_modal == true) {
    lines = 19;
    has_headers = true;
  }

  filereader.onload = function (event) {
    if (event.target.result) {
      $('#jpsurv-message-container').hide();
      create_table(event.target.result, lines, has_headers);
    } else {
      showMessage('jpsurv', 'Unable to process file. Please review your data and try again.', 'warning');
    }
  };
  filereader.readAsText(file);
}

var template_string =
  '<div class="modal fade" id="modal" tabindex="-1" role="dialog">' +
  '<div class="modal-dialog modal-xl" role="document">' +
  '<div class="modal-content bg-light">' +
  '<div class="modal-header">' +
  '<b><h2 class="modal-title" id="modalTitle">Modal title</h4></b>' +
  '</div>' +
  '<div class="modal-body"><div id="container" >' +
  '<fieldset class="px-0 pb-3"><legend class="border-bottom border-dark mb-3" style="font-size: 12px;"><h4><span style="margin-right:80%">Delimiters</span></h4></legend>' +
  '<div id="dels" class="row" style="padding-left:12.5%">' +
  '<div style="width:25%; display:inline-block"><input type="radio" id="comma" name="del" value="," aria-label="comma" checked/>Comma</div>' +
  '<div style="width:25% ;display:inline-block"><input type="radio" id="tab"   name="del" value=" " aria-label="tab"/>Tab</div>' +
  '<div style="width:25%; display:inline-block"><input type="radio" id="colan" name="del" value=";" aria-label="colan"/>Semi-Colon</div>' +
  '<div style="width:25%; display:inline-block"><input type="radio" id="space" name="del" value=" " aria-label="sapce"/>Space</div>' +
  '</div>' +
  '</fieldset></br>' +
  '<label for="has_headers" id="csv_label_headers" class="font-weight-bold mb-1">Does the file contain headers?</label>' +
  '<input type="checkbox" name="has_headers" id="has_headers" value="yes" checked></br>' +
  '<label for="data_type" id="csv_label_data" class="font-weight-bold">Data Type:  </label>' +
  '<select id="data_type" class="jpsurv-label-content" name="data_type" aria-label="data_type" style="margin-bottom:1%">' +
  '<option>Relative Survival</option>' +
  '<option>Cause-Specific Survival</option>' +
  '</select>' +
  '<label for="rates_display" id="csv_label_rates" class="ml-3 font-weight-bold">Rates Displayed As:  </label>' +
  '<select id="rates_display" class="jpsurv-label-content" name="rates_display" aria-label="rates_display" style="margin-bottom:1%">' +
  '<option>Percents</option>' +
  '<option>Proportions</option>' +
  '</select></br>' +
  'Displaying <select id="lines_displayed" class="jpsurv-label-content" name="lines_displayed" aria-label="display lines">' +
  '<option>20</option>' +
  '<option>30</option>' +
  '<option>40</option>' +
  '<option>50</option>' +
  '<option>60</option>' +
  '</select> lines of the data file</br></br>' +
  '<span>Please map <b><i>all</i></b> required parameters to the appropriate columns (see help for details)</span>' +
  '<div id="modalContent"><table id="data_table" class="table table-striped" style="height:100px;border-top:none;border-left:none;line-height:0" cellspacing:"0" cellpadding="0px" width="100%"></table>' +
  '</div><button type="button" id="save" class="btn btn-primary btn-sm" style="margin-left:45%;margin-top:1%;display:inline-block" onclick="save_params()" >Save</button></button><button type="button" id="cancel" class="btn btn-primary btn-sm" style="display:inline-block;margin-left:5%;margin-top:1%"">Cancel</button>' +
  '</div></div></div></div>';

var selector =
  '<select id="column_values" class="jpsurv-label-content" name="data_type" aria-label="column values">' +
  '<option></option>' +
  '<option>Cohort</option>' +
  '<option>Year</option>' +
  '<option>Interval</option>' +
  '<option>Number.Alive</option>' +
  '<option>Number.Dead</option>' +
  '<option>Number.Lost</option>' +
  '<option>Expected.Survival.Int</option>' +
  '<option id="survInt">survInt</option>' +
  '<option id="survCum">survCum</option>' +
  '<option id="survIntSE">survIntse</option>' +
  '<option id="survCumSE">survCumse</option>' +
  '</select>';

function createModal() {
  var header = 'CSV Configuration';
  $('body').append($(template_string));
  $('#modalTitle').html(header);
  $('#data_type').change(function () {
    var type = $('#data_type').val();
    $('option[id="survCum"]').text(type + ' Cum');
    $('option[id="survInt"]').text(type + ' Int');
    $('option[id="survCumSE"]').text(type + ' Cum SE');
    $('option[id="survIntSE"]').text(type + ' Int SE');
  });

  $('#modal').modal({ backdrop: 'static', keyboard: false });
  setTimeout(function () {
    Read_csv_file();
  }, 1);

  $('#cancel').click(function () {
    checkInputFiles();
    $('#modal').modal('hide');
  });

  $('#has_headers').on('change', function (e) {
    Read_csv_file();
  });

  $('#lines_displayed').change(function () {
    Read_csv_file();
  });
  //populating drop down values from previous saved paramaters
  if (jpsurvData.mapping.cohorts != undefined) {
    length = $('#data_table th').length / 2;
    for (var i = 0; i < length; i++) {
      if (jpsurvData.mapping.cohorts.indexOf(i + 1) != -1) {
        $('#type_' + i + ' select').val('Cohort');
      } else if (jpsurvData.mapping.year == i + 1) {
        $('#type_' + i + ' select').val('Year');
      } else if (jpsurvData.mapping.interval == i + 1) {
        $('#type_' + i + ' select').val('Interval');
      } else if (jpsurvData.mapping.alive_at_start == i + 1) {
        $('#type_' + i + ' select').val('Number.Alive');
      } else if (jpsurvData.mapping.died == i + 1) {
        $('#type_' + i + ' select').val('Number.Dead');
      } else if (jpsurvData.mapping.lost_to_followup == i + 1) {
        $('#type_' + i + ' select').val('Number.Lost');
      } else if (jpsurvData.mapping.exp_int == i + 1) {
        $('#type_' + i + ' select').val('Expected.Survival.Int');
      } else if (jpsurvData.mapping.observed == i + 1) {
        var type = $('#data_type').val();
        $('#type_' + i + ' select').val(type + ' Cum');
      } else if (jpsurvData.mapping.survInt == i + 1) {
        var type = $('#data_type').val();
        $('#type_' + i + ' select').val(type + ' Int');
      } else if (jpsurvData.mapping.survIntSE == i + 1) {
        var type = $('#data_type').val();
        $('#type_' + i + ' select').val(type + ' Int SE');
      } else if (jpsurvData.mapping.survCumSE == i + 1) {
        var type = $('#data_type').val();
        $('#type_' + i + ' select').val(type + ' Cum SE');
      }
    }
  }

  $('#modal').modal('show');
}
window.save_params = function save_params() {
  //Mapping selected drop down values to json
  var params = [
    'year',
    'interval',
    'died',
    'alive_at_start',
    'lost_to_followup',
    'exp_int',
    'observed',
    'survInt',
    'survCumSE',
    'survIntSE',
  ];
  jpsurvData.mapping.cohorts = [];
  length = $('#data_table th').length;
  var type = $('#data_type').val();
  for (var i = 0; i < length; i++) {
    const value = $('#type_' + i + ' select').val();
    if (value == 'Cohort') {
      jpsurvData.mapping.cohorts.push(i + 1);
    } else if (value == 'Year') {
      jpsurvData.mapping.year = i + 1;
      $('input[id="header_' + i + '"]').val('Year_of_Diagnosis');
    } else if (value == 'Interval') {
      jpsurvData.mapping.interval = i + 1;
      $('input[id="header_' + i + '"]').val('Interval');
    } else if (value == 'Number.Dead') {
      jpsurvData.mapping.died = i + 1;
      $('input[id="header_' + i + '"]').val('Died');
    } else if (value == 'Number.Alive') {
      jpsurvData.mapping.alive_at_start = i + 1;
      $('input[id="header_' + i + '"]').val('Alive_at_Start');
    } else if (value == 'Number.Lost') {
      jpsurvData.mapping.lost_to_followup = i + 1;
      $('input[id="header_' + i + '"]').val('Lost_to_Followup');
    } else if (value == 'Expected.Survival.Int') {
      jpsurvData.mapping.obsSEInt = i + 1;
      jpsurvData.mapping.exp_int = i + 1;
      $('input[id="header_' + i + '"]').val('Expected_Survival_Interval');
    } else if (value == type + ' Cum') {
      jpsurvData.mapping.observed = i + 1;
      var obscum = value.replace(/\s/g, '_');
      $('input[id="header_' + i + '"]').val(obscum);
    } else if (value == type + ' Int') {
      jpsurvData.mapping.survInt = i + 1;
      var obsint = type.replace(/\s/g, '_') + '_Interval';
      $('input[id="header_' + i + '"]').val(obsint);
    } else if (value == type + ' Cum SE') {
      jpsurvData.mapping.survCumSE = i + 1;
      var cumSE = type.replace(/\s/g, '_').replace('Survival', 'SE_Cum');
      $('input[id="header_' + i + '"]').val(cumSE);
    } else if (value == type + ' Int SE') {
      jpsurvData.mapping.survIntSE = i + 1;
      var intSE = type.replace(/\s/g, '_').replace('Survival', 'SE_Interval');
      $('input[id="header_' + i + '"]').val(intSE);
    }
  }
  var passed = true;
  jpsurvData.additional.del = $('input[name=del]:checked').val();
  jpsurvData.additional.rates = $('#rates_display').val();
  jpsurvData.passed = true;

  for (var i = 0; i < params.length; i++) {
    if (jpsurvData.mapping[params[i]] == undefined) {
      alert('Please choose all necessary parameters to continue ' + params[i]);
      passed = false;
      jpsurvData.passed = false;
      break;
    }
  }
  if (passed == true) {
    checkInputFiles();
    $('#modal').modal('hide');
  }
};
function create_table(content, rows, has_headers) {
  if (first_modal == true) createModal();
  var arr = content.split(/\r\n|\n|\r/);
  if (content.indexOf(',') !== -1) {
    $('#comma').prop('checked', true);
    var matrix = arr.map(function (line) {
      return line.split(',');
    });
  } else if (content.indexOf(';') !== -1) {
    $('#colan').prop('checked', true);
    var matrix = arr.map(function (line) {
      return line.split(';');
    });
  } else if (content.indexOf('\t') !== -1) {
    $('#tab').prop('checked', true);
    var matrix = arr.map(function (line) {
      return line.split('\t');
    });
  } else if (content.indexOf(' ') !== -1) {
    $('#space').prop('checked', true);
    var matrix = arr.map(function (line) {
      return line.split(' ');
    });
  }

  //reads csv file headers to be placed in text box and reads he first row to act as the "headers" ofthe datatable
  if (has_headers == true) {
    var headers = matrix[0].map(function (header) {
      return {
        title: header,
      };
    });
    matrix.shift();

    var first_row = matrix[0].map(function (first) {
      return {
        title: first,
      };
    });
  }
  //reads csv file if no headers are present and places a generic V1, V2 etc as the editable header row.
  else {
    let counter = 0;
    var headers = matrix[0].map(function (column) {
      counter++;
      return {
        title: 'V' + counter,
      };
    });

    var first_row = matrix[0].map(function (first) {
      counter++;
      return {
        title: first,
      };
    });
  }

  data_table(matrix, first_row, rows);
  var html = '';

  if (first_modal == true) {
    var header = $('#modalContent thead').first();
    var headerRow = $('<tr id="header_row">');
    var selector_row = $('<tr>');

    for (var i = 0; i < headers.length; i++) {
      var title = headers[i].title;
      var selectHeader = $(
        '<th  scope="col" id="type_' +
          i +
          '" style="border-left:1px solid white;border-right:1px solid white;padding:8px 3px 8px 3px"/>'
      );
      var text_box_headers = $(
        '<th scope="col" style="padding:0 0 0 0" id="textboxes">&#8204<input type="text" id="header_' +
          i +
          '" style="width:100%;text-align:center;border:none;border: 1px solid #ddd;font-weight:bold" value="' +
          title +
          '" aria-label="textbox"/></th>'
      );

      headerRow.append(text_box_headers);

      selectHeader.html(selector);
      selector_row.append(selectHeader);
    }

    header.prepend(headerRow);
    header.prepend(selector_row);
    var type = $('#data_type').val();
    $('option[id="survCum"]').text(type + ' Cum');
    $('option[id="survInt"]').text(type + ' Int');
    $('option[id="survCumSE"]').text(type + ' Cum SE');
    $('option[id="survIntSE"]').text(type + ' Int SE');
    first_modal = false;
  } else {
    for (var i = 0; i < headers.length; i++) {
      var title = headers[i].title;
      $('#header_' + i).val(title);
    }
  }
}

function data_table(matrix, headers, rows) {
  var table = $('#data_table').DataTable({
    columns: headers,
    data: matrix.slice(1, rows + 1),
    bSort: false,
    bFilter: false,
    paging: false,
    responsive: true,
    fixedColumns: true,
    destroy: true,
    aaSorting: [],
    dom: 't',
    scrollY: '150px',
    scrollX: true,
  });
}

$(document).ready(function () {
  $.ajaxSetup({ cache: false });

  // Apply select2 to all dropdowns
  $('select').select2({
    dropdownAutoWidth: true,
    width: 'auto',
  });

  // Add aria labels for 508 compliance
  $('.select2-search__field').attr('aria-label', function () {
    return $(this).closest('.form-group').children('label').text();
  });

  // populate conditional joinpoint controls
  populateCondIntOptions();
});

$(document).click(function (e) {
  if ($(e.target).is('.close')) $('#max_help').popover('hide');
});

function getTrendTables() {
  jpsurvData.additional.yearTrend = 0;
  jpsurvData.additional.deathTrend = 0;

  if ($('#showYearTrend').is(':checked')) jpsurvData.additional.yearTrend = 1;

  if ($('#showDeathTrend').is(':checked')) jpsurvData.additional.deathTrend = 1;
}

function showTrendTable() {
  var results = jpsurvData.results;
  if (results && results.yearData.survTrend) {
    (results.yearData.survTrend['ACS.jp'] && $('#showYearTrend').is(':checked')) ||
    (results.yearData.survTrend['ACS.user'] && $('#toggleAbsSelect').is(':checked'))
      ? $('#yearTrendTable').removeClass('d-none')
      : $('#yearTrendTable').addClass('d-none');
  }
  if (results && results.deathData) {
    results.deathData.deathTrend && $('#showDeathTrend').is(':checked')
      ? $('#deathTrendTable').removeClass('d-none')
      : $('#deathTrendTable').addClass('d-none');
  }
}

// Creates an excel worksheet from JSON parameter.
// Destructures JSON into an array of arrays.
// Inner arrays and values corespond to rows and columns e.g.
//  [
//    [A1, A2, A3],
//    [B1, B2, B3],
//    ...
//  ]
function generateSheet(data, cohorts = false) {
  let dataMatrix = [];
  Object.entries(data).forEach(([key, values], col) => {
    values.forEach((value, row) => {
      if (!dataMatrix[row]) dataMatrix[row] = [];
      // fix NaN values
      if (isNaN(value) && typeof value != 'string') dataMatrix[row][col] = 'NA';
      else dataMatrix[row][col] = value;
    });
  });

  let sheet = [Object.keys(data), ...dataMatrix];
  if (cohorts) sheet.unshift(['Cohort', cohorts]);

  return XLSX.utils.aoa_to_sheet(sheet);
}

function downloadData(type) {
  const state = {
    ...jpsurvData,
    covariates: cohort_covariance_variables,
  };
  if ($('#useConditionalJp').is(':checked')) {
    exportTableWithSettings(type, state);
  } else {
    singleExport(type, state);
  }
}

async function downloadFullData() {
  try {
    // show loading indicator
    $('#full-dataset-spinner').removeClass('d-none');
    $('#full-dataset-link').addClass('disabled');

    const allResults = await getData();
    if (!Object.keys(allResults).length) throw 'Failed to retrieve results';
    const wb = await multiExport(allResults, '', {
      ...jpsurvData,
      covariates: cohort_covariance_variables,
    });

    XLSX.writeFile(wb, wb.props.Title + '.xlsx');
  } catch (error) {
    console.error(error);
  } finally {
    // hide loading indicator
    $('#full-dataset-spinner').addClass('d-none');
    $('#full-dataset-link').removeClass('disabled');
  }
}

// retrieve results data for all cohorts/models
async function getData() {
  const cohorts = jpsurvData.results.Runs.trim().split(' jpcom ');
  const models = Object.keys(jpsurvData.results.ModelSelection);
  const paramsBatch = cohorts
    .map((cohort, cohortIndex) =>
      models
        .map((_, jp) => {
          const { results, ...params } = jpsurvData;
          const calcParams = {
            ...params,
            run: cohortIndex + 1,
            additional: { ...params.additional, headerJoinPoints: jp },
            calculate: {
              ...params.calculate,
              form: {
                ...params.calculate.form,
                cochortValues: cohort.split(' + '),
              },
            },
            viewConditional: false,
          };

          const relaxProp = jpsurvData.calculate.form.relaxProp;
          if (relaxProp) {
            const maxCutPoint = +jpsurvData.calculate.form.maxCutPoint;
            return [...Array(maxCutPoint).keys()]
              .map((i) => {
                const rpParams = { ...calcParams, cutPointIndex: i + 1 };
                const paramsArray = [rpParams];
                if (i != 0) paramsArray.push({ ...rpParams, viewConditional: true });
                return paramsArray.flat();
              })
              .flat();
          } else {
            return calcParams;
          }
        })
        .flat()
    )
    .flat();

  try {
    return await (
      await fetch('api/recalculateBatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paramsBatch),
      })
    ).json();
  } catch (error) {
    console.error(error);
    return {};
  }
}

// reset Advanced Options to their default settings
window.resetAdvancedOptions = function resetAdvancedOptions() {
  $('#del-int-no').click();
  $('#adv-between').val('2');
  $('#adv-first').val('3');
  $('#adv-last').val('5');
  $('#adv-year').val('5');
};
