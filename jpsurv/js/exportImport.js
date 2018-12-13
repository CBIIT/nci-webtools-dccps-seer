$(document).ready(function() {
  $("#importButton").on("click", importBackEnd)

  $("#fileSelect").on("change",  handleImportFileSelectChange)

  $("#exportButton").on("click", exportBackEnd)

  setEventHandlerForImports()
  handleImportFileSelectChange()

  handleExportFileButton()

})

//
// Import -- Upload a previous session ( stored in a zip with the extension .jpsurv  )
//
function importBackEnd(event) {

      var formData = new FormData()
      formData.append("zipData", $("#fileSelect")[0].files[0] )

      $.ajax({
         'type': "post",
         'url':  "jpsurvRest/import",
         'data': formData,
         'async': true,
         'contentType': false,
         'processData': false,
         'success': function(data) {
            importFrontEnd(data.tokenIdForForm, data.tokenIdForRest, data.txtFile, data.controlFile, data.type, data.imageIdStartCount, data.delimiter)
         },
         'fail' : function(jqXHR, textStatus) {
            handleBackendError()
         },
         'error' : function(jqXHR, textStatus) {
            console.dir(jqXHR);
            console.log('Error on load_ajax');
            console.log(jqXHR.status);
            console.log(jqXHR.statusText);
            console.log(textStatus);
          }
        })
}

//
// Export the data to a file by sending a request to the backend to zip the files for the current session into a file
// with the extension .jpsurv
//
function exportBackEnd(event) {

    var form_data = new FormData()

    if ( jpsurvData.stage2completed == false ) {
        handleError("No Analysis is currently running.  Pleas either import or select files to analyze")
        return
    }

    function isCSV(inString) {
        return ( inString.match("\.dic$")) ? "dic" : "csv"
    }

    // Get the token for the input files from the form.
    var inputTokenId = jpsurvData.file.form.split("-")[1]
    inputTokenId = inputTokenId.split(".")[0]

    var data = {};
    data.type = isCSV(jpsurvData.file.dictionary)
    data.dictionary = jpsurvData.file.dictionary
    data.form = jpsurvData.file.form
    data.inputTokenId = inputTokenId
    data.tokenId = jpsurvData.tokenId
    data.filename = generateToken(12) + ".jpsurv"

    /* Saving the Form Variables */
    data.yearOfDiagnosisRangeStart = jpsurvData.calculate.form.yearOfDiagnosisRange[0]
    data.yearOfDiagnosisRangeEnd   = jpsurvData.calculate.form.yearOfDiagnosisRange[1]
    data.cohortVariables = jpsurvData.results.Runs
    data.maxJoinPoints = jpsurvData.calculate.form.maxjoinPoints
    data.advBetween = jpsurvData.calculate.static.advanced.advBetween
    data.advDelInterval = jpsurvData.calculate.static.advanced.advDeleteInterval
    data.advFirst = jpsurvData.calculate.static.advanced.advFirst
    data.advLast = jpsurvData.calculate.static.advanced.advLast
    data.advYear = jpsurvData.calculate.static.advanced.advYear
    data.controlFilename = jpsurvData.file.dictionary
    data.email = jpsurvData.queue.email

    if ( data.type == "dic") data.txtFile = jpsurvData.file.data


    try {
        $('#exportButton').attr("href", "jpsurvRest/export" + generateQueryParameterStr(data))
    } catch(error) {
        console.log(error)
    }

//    var anchorTag = document.createElement("a")
//    anchorTag.href = "jpsurvRest/export" + generateQueryParameterStr(data)
//    anchorTag.click()
}

//
// Import -- Once the backend has unarchvied the data and restored the files the front end will need to call the
// query string and
//
function importFrontEnd(idOfForm, idOfOthers, txtFile, controlFile, dataType, imageIdStartCount, delimiter) {

    localStorage.setItem("importing", "YES")
    localStorage.setItem("initialIdCnt", imageIdStartCount.toString())
    localStorage.setItem("delimiter", delimiter)

    var url = [ location.protocol, "//", location.host, location.pathname ].join('')

    // The URL that will called causing the input window to appear.  The window for the cohor and the window with the
    // three tabs ( Survival Graph/Data, Model Estimates, Trends
    var parameters = { request : false,
                       file_control_filename : controlFile,
                       output_filename: "form-" + idOfForm + ".json",
                       status: "uploaded",
                       tokenId: idOfOthers
                     }

    if ( dataType == "DIC") {
        parameters["file_data_filename"] = txtFile
    }

    url = url + generateQueryParameterStr(parameters)

    window.location.assign(url)
}

/**
 * This section updates the application with the data that saved from a previous sessesion
 * One of the requirements was that the data not be calculated again, but read from the files
 * that were created from the previous section.
 */
function updatePageAfterRefresh(event) {

    try {

        if ( window.location.search === undefined || window.location.search.length === 0 ) return

        jpsurvData.stage2completed = true

        setIntervalsDefault()
        getIntervals()
        parse_diagnosis_years()

        setData()

        load_ajax_with_success_callback(generateResultsFilename(), loadResults)
        calculateFittedResultsCallback()
        updateCohortDropdown()

        calculateTrendCallback()
        setRun()

        jpsurvData.plot.static.imageId = parseInt(localStorage.getItem("initialIdCnt")) - 1
        jpsurvData.additional.del = localStorage.getItem("delimiter")

        jpsurvData.stage2completed = true

        load_ajax_with_success_callback(createFormValuesFilename(), loadUserInput)

     } catch(err) {

        console.log("An exception happen.  The error is " + err.message)
        jpsurvData.stage2completed = 0

     } finally {
        localStorage.removeItem("importing")
        localStorage.removeItem("initialIdCnt")
        localStorage.removeItem("delimiter")
        setEventHandlerForImports()
        handleExportFileButton()

     }
}

function loadUserInput(data) {

    function modifyForm(data) {
        $("e-mail").val(data.email)
        $("#year_of_diagnosis_start").val(data.yearOfDiagnosisRangeStart)
        $("#year_of_diagnosis_end").val(data.yearOfDiagnosisRangeEnd)
        $("#max_join_point_select").val(data.maxJoinPoints)

        $("#cohort-variables").find(":checkbox").prop("checked", false)
        var cohorts = data.cohortVariables.split("+")

        $.each(cohorts, function(index, element) {
            element = element.trim()

            var selector = "div#cohort-variables label:contains('" + element + "')"
            $(selector).children("input").prop("checked", true)
        })


        if ( data.advDelInterval === 'T')
            $("#del-int-yes").prop("checked", true)
        else
            $("#del-int-no").prop("checked", true)

        $("#adv-between").val(parseInt(data.advBetween))
        $("#adv-first").val(parseInt(data.advFirst))
        $("#adv-last").val(parseInt(data.advLast))
        $("#adv-year").val(parseInt(data.advYear))
    }

    function modifyJPSurv(data ) {
        jpsurvData.queue.email = data.email
        jpsurvData.calculate.form.yearOfDiagnosisRange[0] = parseInt(data.yearOfDiagnosisRangeStart)
        jpsurvData.calculate.form.yearOfDiagnosisRange[1] = parseInt(data.yearOfDiagnosisRangeEnd)
        jpsurvData.calculate.form.maxJoinPoints = parseInt(data.maxjoinPoints)

        jpsurvData.calculate.static.advanced.advDeleteInterval = data.advDelInterval
        jpsurvData.calculate.static.advanced.advBetween = parseInt(data.advBetween)
        jpsurvData.calculate.static.advanced.advFirst = parseInt(data.advFirst)
        jpsurvData.calculate.static.advanced.advLast = parseInt(data.advLast)
        jpsurvData.calculate.static.advanced.advYear = parseInt(data.advYear)

    }

    console.log(data)

    modifyForm(data)
    modifyJPSurv(data)
}


// Creates the filename for the storage for the values of the form
function createFormValuesFilename() {
    return "tmp/currentState-" + jpsurvData.tokenId + ".json"
}

// Loads data using ajax and then calls a function.  This routine is needed since the GetJSON is asynchronous and the
// data is not loaded until after the function returns causing problems with the program.
function load_ajax_with_success_callback(url, callback) {
    $.ajax({
       'async': false,
       'global': false,
       'url': url,
       'dataType': "json",
       'success': function (data) {
            callback(data)
          },
       'fail' : function(jqXHR, textStatus) {
        alert('Fail on load_ajax');
       },
       'error' : function(jqXHR, textStatus) {
        //console.dir(jqXHR);
        //console.warn('Error on load_ajax');
        //console.log(jqXHR.status);
        //console.log(jqXHR.statusText);
        //console.log(textStatus);
       }
    })
}

// Sets the event handler when data is being imported into the system
function setEventHandlerForImports() {
    if ( localStorage.getItem("importing") === "YES")
        $(window).on('load', updatePageAfterRefresh)
    else
        $(window).off('load', updatePageAfterRefresh)
}

function handleError(error) {

    message = error
    message_type = 'error';
    id="jpsurv"
    showMessage(id, message, message_type);
    $("#right_panel").hide();
    $("#help").show();
    var inputData = load_ajax("input_" + jpsurvData.tokenId + ".json");
    preloadValues()
}

function handleBackendError() {
    handleError("A problem happen on the back end.  Please have the administrator review the log files")
}

/* Create an invisble anchor to allow the user to download the file.  Note that anchorTag is local to this function   */
/* and should be delete when the function is completed                                                                */
function  createInvisibleDownloadLink(filename) {

    var anchorTag = document.createElement("a")
    anchorTag.href = filename
    anchorTag.click()
}

/* Copied from https://stackoverflow.com/questions/8532406/create-a-random-token-in-javascript-based-on-user-details */
function generateToken(n) {
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var token = '';
    for(var i = 0; i < n; i++) {
        token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
}

// Returns a String that can be attached to a URL
//
// Input : An object literal
// Output ; The query string including the "?" to start the section
function generateQueryParameterStr(data) {
    return "?" + $.param(data)
}

// if the Input[File] for the import has no files then disable the button, has files then enable the button
function handleImportFileSelectChangeOld() {

    var button = "#importButton"

    if ( $("#fileSelect2").length === 0 ) {
        return
    }

    if ( $("#fileSelect2")[0].files.length == 0 ) {
        disableHTMLObject(button)
    } else {
        enableHTMLObject(button)
    }
}

// if the Input[File] for the import has no files then disable the button, has files then enable the button
function handleImportFileSelectChange() {

    var button = "#upload_file_submit"

    if ( $("#fileSelect").length === 0 ) {
        return
    }

    if ( $("#fileSelect")[0].files.length == 0 ) {
        disableHTMLObject(button)
    } else {
        enableHTMLObject(button)
    }
}

// If there is an analysis being shown then set the export button to true
function handleExportFileButton() {

    var button ="#exportButton"

    if ( analysisDisplayed() )
        enableHTMLObject(button)
    else
        disableHTMLObject(button)
}

function disableHTMLObject(selector) {
    $(selector).attr("disabled", true)
    $(selector).attr("aria-disabled", true)
}

function enableHTMLObject(selector) {
    $(selector).attr("disabled", false)
    $(selector).attr("aria-disabled", false)
}

