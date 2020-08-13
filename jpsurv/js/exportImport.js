$(document).ready(function () {
  $('#importButton').on('click', importBackEnd);
  $('#exportButton').on('click', exportBackEnd);
  setEventHandlerForImports();
});

//
// Import -- Upload a previous session ( stored in a zip with the extension .jpsurv  )
//
function importBackEnd(event) {
  var formData = new FormData();
  formData.append('zipData', $('#fileSelect')[0].files[0]);

  $.ajax({
    type: 'post',
    url: 'jpsurvRest/import',
    data: formData,
    contentType: false,
    processData: false,
  })
    .done(function (data) {
      importFrontEnd(
        data.tokenIdForForm,
        data.tokenIdForRest,
        data.txtFile,
        data.controlFile,
        data.type,
        data.imageIdStartCount,
        data.delimiter
      );
    })
    .fail(function (jqXHR, textStatus) {
      handleBackendError();
      console.dir(jqXHR);
      console.log('Error on load_ajax');
      console.log(jqXHR.status);
      console.log(jqXHR.statusText);
      console.log(textStatus);
    });
}

//
// Export the data to a file by sending a request to the backend to zip the files for the current session into a file
// with the extension .jpsurv
//
function exportBackEnd(event) {
  var form_data = new FormData();

  if (jpsurvData.stage2completed == false) {
    handleError(
      'No Analysis is currently running.  Pleas either import or select files to analyze'
    );
    return;
  }

  function isCSV(inString) {
    return inString.match('.dic$') ? 'dic' : 'csv';
  }

  // Get the token for the input files from the form.
  var inputTokenId = jpsurvData.file.form.split('-')[1];
  inputTokenId = inputTokenId.split('.')[0];

  var data = {};
  data.type = isCSV(jpsurvData.file.dictionary);
  data.dictionary = jpsurvData.file.dictionary;
  data.form = jpsurvData.file.form;
  data.inputTokenId = inputTokenId;
  data.tokenId = jpsurvData.tokenId;
  data.filename = generateToken(12) + '.jpsurv';

  /* Saving the Form Variables */
  data.yearOfDiagnosisRangeStart =
    jpsurvData.calculate.form.yearOfDiagnosisRange[0];
  data.yearOfDiagnosisRangeEnd =
    jpsurvData.calculate.form.yearOfDiagnosisRange[1];
  data.cohortVariables = jpsurvData.results.Runs;
  data.maxJoinPoints = jpsurvData.calculate.form.maxjoinPoints;
  data.intFromDiagnosis = jpsurvData.calculate.form.interval;
  data.cohortVars = JSON.stringify(jpsurvData.calculate.form.cohortVars);
  data.cohortValues = JSON.stringify(jpsurvData.calculate.form.cohortValues);
  data.advBetween = jpsurvData.calculate.static.advanced.advBetween;
  data.advDelInterval = jpsurvData.calculate.static.advanced.advDeleteInterval;
  data.advFirst = jpsurvData.calculate.static.advanced.advFirst;
  data.advLast = jpsurvData.calculate.static.advanced.advLast;
  data.advYear = jpsurvData.calculate.static.advanced.advYear;
  data.controlFilename = jpsurvData.file.dictionary;
  data.email = jpsurvData.queue.email;
  data.intervals = jpsurvData.additional.intervals.toString();
  data.diagnosisYear = jpsurvData.results.yod;

  // Save UI controsl
  data.showYearTrend = $('#showYearTrend').is(':checked');
  data.showDeathTrend = $('#showDeathTrend').is(':checked');
  data.toggleAbsSelect = $('#toggleAbsSelect').is(':checked');
  data.absChgFrom = $('#absChgFrom').val();
  data.absChgTo = $('#absChgTo').val();

  // save selected model and cohort
  data.headerJP = jpsurvData.additional.headerJoinPoints;
  data.selectedCohort = $('#cohort-display').val();

  if (data.type == 'dic') {
    dataFile = jpsurvData.file.data.split('.')[0];
    dicFile = jpsurvData.file.dictionary.split('.')[0];
    if (dataFile != dicFile) {
      data.txtFile = dicFile + '.txt';
    } else {
      data.txtFile = jpsurvData.file.data;
    }
  }

  $.ajax({
    type: 'GET',
    url: 'jpsurvRest/export' + generateQueryParameterStr(data),
  })
    .done(function (res) {
      window.location = 'jpsurvRest/export' + generateQueryParameterStr(data);
    })
    .fail(function (jqXHR, textStatus) {
      displayCommFail('jpsurv', jqXHR, textStatus);
    });
}

//
// Import -- Once the backend has unarchvied the data and restored the files the front end will need to call the
// query string and
//
function importFrontEnd(
  idOfForm,
  idOfOthers,
  txtFile,
  controlFile,
  dataType,
  imageIdStartCount,
  delimiter
) {
  localStorage.setItem('importing', 'YES');
  localStorage.setItem('initialIdCnt', imageIdStartCount.toString());
  localStorage.setItem('delimiter', delimiter);

  var url = [location.protocol, '//', location.host, location.pathname].join(
    ''
  );

  // The URL that will called causing the input window to appear.  The window for the cohor and the window with the
  // three tabs ( Survival Graph/Data, Model Estimates, Trends
  var parameters = {
    request: false,
    file_control_filename: controlFile,
    output_filename: 'form-' + idOfForm + '.json',
    status: 'uploaded',
    tokenId: idOfOthers,
  };

  if (dataType == 'DIC') {
    parameters['file_data_filename'] = txtFile;
  }

  url = url + generateQueryParameterStr(parameters);

  window.location.assign(url);
}

/**
 * This section updates the application with the data that saved from a previous sessesion
 * One of the requirements was that the data not be calculated again, but read from the files
 * that were created from the previous section.
 */
function updatePageAfterRefresh(e) {
  try {
    if (
      window.location.search === undefined ||
      window.location.search.length === 0
    )
      return;

    jpsurvData.stage2completed = true;
    setIntervalsDefault();
    getIntervals();
    parse_diagnosis_years();
    setData();
    load_ajax_with_success_callback(generateResultsFilename(), loadResults);
    load_ajax_with_success_callback(
      createFormValuesFilename(),
      retrieveCohortComboResults
    );
    updateCohortDropdown();
    setRun();
    setAbsChangeDefault();
    buildTimeYod();

    jpsurvData.plot.static.imageId =
      parseInt(localStorage.getItem('initialIdCnt')) - 1;
    jpsurvData.additional.del = localStorage.getItem('delimiter');
    jpsurvData.stage2completed = true;

    load_ajax_with_success_callback(createFormValuesFilename(), loadUserInput);
  } catch (err) {
    console.error(err);
    jpsurvData.stage2completed = 0;
  } finally {
    localStorage.removeItem('importing');
    localStorage.removeItem('initialIdCnt');
    localStorage.removeItem('delimiter');
  }
}

function retrieveCohortComboResults(data) {
  $('#right_panel').show();
  $('#right_panel').css('display', 'inline-block');
  $('#helpCard').hide();
  $('#icon').css('visibility', 'visible');
  Slide_menu_Horz('hide');

  file_name =
    window.location.pathname +
    'results?filename=results-' +
    data.tokenId +
    '-' +
    data.selectedCohort +
    '-' +
    data.headerJP +
    '.json';

  $.getJSON(file_name, function (results) {
    loadResults(results);
  });

  jpsurvData.switch = false;

  jpsurvData.additional.use_default = 'true';

  //Set precision if cookie is available
  var precision = getCookie('precision');
  if (parseInt(precision) > 0) {
    $('#precision>option:eq(' + (parseInt(precision) - 1) + ')').prop(
      'selected',
      true
    );
  }
}

/*
 * From the JPSurv applicaiton the user can make certain selections.  This code load the user selections from the
 * jpsurv file imported
 */
function loadUserInput(data) {
  /*
   * Import the user input into the HTML Form itself
   */
  function modifyForm(data, intervals) {
    $('e-mail').val(data.email);
    $('#year_of_diagnosis_start')
      .val(data.yearOfDiagnosisRangeStart)
      .trigger('change');
    $('#year_of_diagnosis_end')
      .val(data.yearOfDiagnosisRangeEnd)
      .trigger('change');
    $('#max_join_point_select').val(data.maxJoinPoints).trigger('change');
    $('#intervals_from_diagnosis').val(data.intFromDiagnosis).trigger('change');
    $('#cohort-variables').find(':checkbox').prop('checked', false);

    // The cohort Stirng which contains (site recode/ARN), Sex ( Male, Female) , Seer Stage A
    // The data.cohoretVaribles.replace  two split tokens : jpcom and + where jpcom splits the
    // string into rows.  For each the + divide the stinrg into individual parts ( ARN, Sex, Seer Stage A).

    // Split cohort string into a matrix, each row contains a combination of cohort values
    var cohortLines = data.cohortVariables.split('jpcom');
    var cohortArrays = cohortLines.map(function (line) {
      return line
        .trim()
        .split('+')
        .map(function (value) {
          return value.trim();
        });
    });

    // Go through cohort matrix to set checkboxes for each value selected
    var cohortOptions = Array.prototype.slice.call(
      document.querySelectorAll('#cohort-variables fieldset')
    );

    if (cohortOptions.length > 0) {
      cohortOptions.forEach(function (element, index) {
        cohortOptions[index] = Array.prototype.slice.call(
          element.querySelectorAll('#cohort-variables .custom-control-input')
        );
      });

      cohortArrays.forEach(function (array) {
        array.forEach(function (cohortVal, index) {
          cohortOptions[index].forEach(function (checkbox) {
            if (checkbox.value == cohortVal) checkbox.checked = true;
          });
        });
      });
    }

    if (data.advDelInterval === 'T') $('#del-int-yes').prop('checked', true);
    else $('#del-int-no').prop('checked', true);

    $('#adv-between').val(parseInt(data.advBetween));
    $('#adv-first').val(parseInt(data.advFirst));
    $('#adv-last').val(parseInt(data.advLast));
    $('#adv-year').val(parseInt(data.advYear));

    $('#interval-years').val(intervals);
    $('#interval-years-death').val(intervals);
    $('#year-of-diagnosis').val(data.diagnosisYear);

    // Restore UI controls
    $('#showYearTrend')
      .prop('checked', data.showYearTrend == 'true')
      .trigger('change');
    $('#showDeathTrend')
      .prop('checked', data.showDeathTrend == 'true')
      .trigger('change');
    $('#toggleAbsSelect')
      .prop('checked', data.toggleAbsSelect == 'true')
      .trigger('change');
    $('#absChgFrom').val(data.absChgFrom).trigger('change');
    $('#absChgTo').val(data.absChgTo).trigger('change');
  }

  /*
   * Import the user input into the datastructure itslef.
   */
  function modifyJPSurv(data, intervals) {
    jpsurvData.queue.email = data.email;
    jpsurvData.calculate.form.yearOfDiagnosisRange[0] = parseInt(
      data.yearOfDiagnosisRangeStart
    );
    jpsurvData.calculate.form.yearOfDiagnosisRange[1] = parseInt(
      data.yearOfDiagnosisRangeEnd
    );
    jpsurvData.calculate.form.maxjoinPoints = parseInt(data.maxJoinPoints);
    jpsurvData.calculate.form.cohortVars = JSON.parse(data.cohortVars);
    jpsurvData.calculate.form.cohortValues = JSON.parse(data.cohortValues);

    jpsurvData.calculate.static.advanced.advDeleteInterval =
      data.advDelInterval;
    jpsurvData.calculate.static.advanced.advBetween = parseInt(data.advBetween);
    jpsurvData.calculate.static.advanced.advFirst = parseInt(data.advFirst);
    jpsurvData.calculate.static.advanced.advLast = parseInt(data.advLast);
    jpsurvData.calculate.static.advanced.advYear = parseInt(data.advYear);
    jpsurvData.additional.intervals = intervals;
    jpsurvData.results.yod = data.diagnosisYear;

    // restore selected cohort
    if (parseInt(data.selectedCohort) != 1) {
      $('#cohort-display').val(parseInt(data.selectedCohort)).trigger('change');
    }
  }

  // Convert a comma separated string of numbers into an array of actual number
  var intervals = data.intervals.split(',').map(Number);

  modifyForm(data, intervals);
  modifyJPSurv(data, intervals);
}

// Creates the filename for the storage for the values of the form
function createFormValuesFilename() {
  return (
    window.location.pathname +
    'results?filename=currentState-' +
    jpsurvData.tokenId +
    '.json'
  );
}

// Loads data using ajax and then calls a function.  This routine is needed since the GetJSON is asynchronous and the
// data is not loaded until after the function returns causing problems with the program.
function load_ajax_with_success_callback(url, callback) {
  $.ajax({
    async: false,
    global: false,
    url: url,
    dataType: 'json',
  })
    .done(function (data) {
      callback(data);
    })
    .fail(function (jqXHR, textStatus) {
      alert('Fail on load_ajax');
      //console.dir(jqXHR);
      //console.warn('Error on load_ajax');
      //console.log(jqXHR.status);
      //console.log(jqXHR.statusText);
      //console.log(textStatus);
    });
}

// Sets the event handler when data is being imported into the system
function setEventHandlerForImports() {
  if (localStorage.getItem('importing') === 'YES') {
    $(function (e) {
      updatePageAfterRefresh(e);
    });
  }
}

function handleError(error) {
  message_type = 'error';
  id = 'jpsurv';
  showMessage(id, error, message_type);
  $('#right_panel').hide();
  Slide_menu_Horz();
  $('#help').show();
  preLoadValues();
}

function handleBackendError() {
  handleError(
    'A problem happen on the back end.  Please have the administrator review the log files'
  );
}

/* Copied from https://stackoverflow.com/questions/8532406/create-a-random-token-in-javascript-based-on-user-details */
function generateToken(n) {
  var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var token = '';
  for (var i = 0; i < n; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// Returns a String that can be attached to a URL
//
// Input : An object literal
// Output ; The query string including the "?" to start the section
function generateQueryParameterStr(data) {
  return '?' + $.param(data);
}
