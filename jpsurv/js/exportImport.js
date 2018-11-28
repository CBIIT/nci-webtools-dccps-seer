$(document).ready(function() {
  $("#importButton").on("click", importBackEnd)
  $("#exportButton").on("click", exportBackEnd)
  $("#fileSelect").on("change", handleImportFileSelectChange)

  setEventHandlerForImports()
  handleImportFileSelectChange()

})

//
// Import -- Upload a previous session ( stored in a zip with the extension .jpsurv_export  )
//
function importBackEnd(event) {

      var formData = new FormData()
      formData.append("zipData", $("#fileSelect")[0].files[0] )

      checkForNoFileSelected("No file was chosen for Import. Please use the Choose File Select to select a file and then click the Import Button")

      $.ajax({
         'type': "post",
         'url':  "/jpsurvRest/import",
         'data': formData,
         'async': false,
         'contentType': false,
         'processData': false,
         'success': function(data) {
            importFrontEnd(data.tokenIdForForm, data.tokenIdForRest, data.txtFile, data.controlFile, data.type)
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
// with the extension .jpsurv_export
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

    var data = {};
    data.type = isCSV(jpsurvData.file.dictionary)
    data.dictionary = jpsurvData.file.dictionary
    data.form = jpsurvData.file.form
    data.tokenId = jpsurvData.tokenId
    data.filename = generateToken(12) + ".jpsurv_export"
    if ( data.type == "dic") data.txtFile = jpsurvData.file.data

    console.log(data)

    var anchorTag = document.createElement("a")
    anchorTag.href = "/jpsurvRest/export" + generateQueryParameterStr(data)
    anchorTag.click()
}

//
// Import -- Once the backend has unarchvied the data and restored the files the front end will need to call the
// query string and
//
function importFrontEnd(idOfForm, idOfOthers, txtFile, controlFile, dataType) {

    localStorage.setItem("importing", "YES")

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

     } finally {
        localStorage.removeItem("importing")
        setEventHandlerForImports()

     }
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
}

function handleBackendError() {
    handleError("A problem happen on the back end.  Please have the administrator review the log files")
}


function checkForNoFileSelected(message) {
    var checkForFalsy = $("#fileSelect")[0].files[0]
    if ( checkForFalsy === undefined || checkForFalsy === null  ) {
        handleError(message)
    }
}

/* Create an invisble anchor to allow the user to download the file.  Note that anchorTag is local to this function   */
/* and should be delete when the function is completed                                                                */
function  createInvisibleDownloadLink(filename) {

    var anchorTag = document.createElement("a")
    anchorTag.href = filename
    //anchorTag.download = 'my-jpsurv-workspace.jpsurv_export';
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
function handleImportFileSelectChange() {

    if ( $("#fileSelect")[0].files.length == 0 ) {
        $("#importButton").attr("disabled", true)
        $("#importButton").attr("aria-disabled", true)
    } else {
        $("#importButton").attr("disabled", false)
        $("#importButton").attr("aria-disabled", false)
    }
}

