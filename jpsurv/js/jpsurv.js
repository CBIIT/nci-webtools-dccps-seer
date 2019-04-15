var jpsurv_version = "1.0";

var restService = {protocol:'http',hostname:document.location.hostname,fqn:"nci.nih.gov",route : "jpsurvRest"}
var restServerUrl = restService.protocol + "://" + restService.hostname + "/"+ restService.route;

var control_data;
var cohort_covariance_variables;
var advfields = ['adv-between','adv-first','adv-last','adv-year'];

var jpsurvData = {"file":{"dictionary":"Breast.dic","data":"something.txt", "form":"form-983832.json"}, "calculate":{"form": {"yearOfDiagnosisRange":[]}, "static":{}}, "plot":{"form": {}, "static":{"imageId":-1} }, "additional":{"headerJoinPoints":0,"yearOfDiagnosis":null,"intervals":[1,4]}, "tokenId":"unknown", "status":"unknown", "stage2completed":0.};
jpsurvData.mapping={}
var DEBUG = false;
var maxJP = (DEBUG ? 0 : 2);
var first_modal=true
if(getUrlParameter('tokenId')) {
  jpsurvData.tokenId = getUrlParameter('tokenId');
}

if(getUrlParameter('status')) {
  jpsurvData.status = getUrlParameter('status');
}

$(document).ready(function() {
  addInputSection();
  addEventListeners();
  addMessages();
  loadHelp();

  if(DEBUG) {
    //console.warn("%cDEBUG is on", "color:white; background-color:red");
    $("#year_of_diagnosis_start").val("1975");
    $("#year_of_diagnosis_end").val("1985");
  }

  advfields.forEach(function(id) {
    $('#' + id).keyup(function() {
      checkInput(id);
    })
  })

  $([name='data']).prop("checked", true)

  $("[name='data']:checked").click()

  /* Needed when the user hovers over the radio button without clicking the section for the File Formats,the tooltips */
  /* will not work                                                                                                    */
  $("#upload-form").hover(function(event) {
    //$(this).focus()
    $("#upload-form").focus()
  })

  //var fileFormatDiv = $('#input_type_select [class~="file_format_selection_section"] :radio, span')
  var fileFormatDiv = $('#input_type_select [class~="file_format_selection_section"] :radio, #input_type_select [class~="file_format_selection_section"] span')
  var exportButton = $('#exportButton')

  // Clicking on the radio button will force the tooltip to disappear.
  $('#input_type_select [class~="file_format_selection_section"] :radio').click( function(event) {
    $(this).tooltip("hide")
  })

  /* Hovering over the radio or the text for each file format will produce a tooltip                                  */
  $(fileFormatDiv).hover(
    function(event) {

       $(this).tooltip({
            delay: "1500",
            title: txtForInputButtonToolTip,
            placement: "bottom",
       });
    },

    function(event) {
        $(this).tooltip("hide")
    })

});


// Provides the help text for the button that will upload the file
// The problem is that the upload button handles three different types of upload ( dic/txt, csv, file exported)git
function txtForInputButtonToolTip() {
    var helpTxt = "Help String not defined for this object";

    var selectedOption = $(this).parent().attr("id");
    if ( selectedOption == "import_section" )
        helpTxt = "Import a JPSurv workspace exported previously.";
    else if ( selectedOption == "csv_section")
        helpTxt = "SEER Data File";
    else if ( selectedOption == "dic_section")
        helpTxt = "SEER*Stat survival text and dictionary files";
    else if ( selectedOption == "exportButton") {
        helpTxt = "Export cohort, model specification and results to a workspace file.";
    }

    return helpTxt
}


function checkInput(id) {
  var element = $('#' + id);
  var min=element.attr('min');

  if(parseInt(element.val())<parseInt(min)){
      element.val(min);
  }

}


function checkEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  var result = re.test(email);

  return result;
}

function validateEmail() {

  var id = "e-mail";
  var errorMsg = "Please enter a valid email address before submitting.";;

  if ($("#"+id).is(":invalid")) {
        $("#"+id).attr('title', errorMsg);
        $("#calculate").prop('disabled', true);
    } else {
        $("#"+id).removeAttr('title');
        $("#calculate").prop('disabled', false);
    }

    //var pattern = new RegExp('^' + $(this).attr('pattern') + '$');

    if (typeof $("#"+id).setCustomValidity === 'function') {
    //console.log("setting error message: "+errorMsg);
    $("#"+id).setCustomValidity(hasError ? errorMsg : '');
    }
    // Not supported by the browser, fallback to manual error display...

}

function check_multiple(){
  var multiple=false;
  var num_types=$("#cohort-variables fieldset").length
  var checked=$('[type=checkbox]').filter(':checked').length

  if(checked>num_types||checked<num_types){
    multiple=true;
  }
  if(checked<num_types){
    jpsurvData.none=true;
  }

  return multiple
}
function hide_display_email(){

  if(parseInt($("#max_join_point_select").val())>maxJP ||check_multiple()==true) {
      $(".e-mail-grp").fadeIn();
      $("#calculate").val("Submit");
      validateEmail();
    } else {
      $(".e-mail-grp").fadeOut();
      $("#calculate").val("Calculate");
      $("#calculate").prop("disabled", false);
    }
}
function addEventListeners() {

  $('#e-mail').on('keydown change', function(e) {
    if (e.which == 13) {
      e.preventDefault();
    }
    validateEmail();
  });


  $("#cohort-variables").on('change', function(e){
    hide_display_email();

  });

  $("#max_join_point_select").on('change', function(e){
    hide_display_email();

  });
  $("#trends-tab-anchor").click(function(e) {
  if(jpsurvData.stage2completed && jpsurvData.recentTrends == 0) {
      calculateTrend();
    }
  });

  $("#icon").on('click', slideToggle);

  $(document).on('click', '#model-selection-table tbody tr', function(e) {
    e.stopPropagation();
    $(this).addClass('info').siblings().removeClass('info');
    if(jpsurvData.additional.headerJoinPoints == this.rowIndex - 1) {
      return;
    }
    jpsurvData.additional.headerJoinPoints = this.rowIndex - 1;
    setCalculateData();
    });

  $("#cohort_select").on("change", change_cohort_select);
  $("#covariate_select").on("change", change_covariate_select);
  $("#precision").on("change", userChangePrecision);

  //$("#upload_file_submit").click(function(event) {
  //  setEventHandlerForImports()
  //  file_submit(event);
  //});


  $( "#recalculate" ).click(function() {
    jpsurvData.additional.recalculate="true"
    jpsurvData.additional.use_default="false"
    setCalculateData();
    jpsurvData.additional.use_default="true"
  });

  $( "#year-of-diagnosis" ).change(function() {
    //console.log("click event fired, changing to "+ $( "#year-of-diagnosis" ).val() )
    jpsurvData.additional.use_default="false"
    jpsurvData.additional.recalculate="true"
    setCalculateData();
    jpsurvData.additional.use_default="true"
    $("#year-of-diagnosis").data('changed', true);
  });



  //
  // Set click listeners
  //
  $("#calculate").on("click", function() {
    //Reset main calculation.  This forces a rebuild R Database
    jpsurvData.stage2completed = false;
    setCalculateData("default");
  });

  $("#file_data").on("change", checkInputFiles);
  $("#file_control").on("change", checkInputFiles);
  $("#file_control_csv").on("change", checkInputFiles);
  $("#fileSelect").on("change", checkInputFiles)

  $( "#upload-form" ).on("submit", function( event ) {
;
  });
}

/* The Original Code for submitting the a (Dictionary/Data Files) and CSV */
function submitDicOrCsv(event) {
  //$("#upload_file_submit").click(function(event) {
    setEventHandlerForImports()
    file_submit(event);
  //});
}

function userChangePrecision() {
  setCookie("precision", $("#precision").val(), 14);
  changePrecision();
}
function addMessages() {
  var e_mail_msg = "Multiple Cohorts or single cohort with maximum Joinpoints greater than "+maxJP+"  will require additional computing time. When computation is completed, a notification will be sent to the e-mail entered above.";
  $("#e-mail-msg").text(e_mail_msg);

  $("#jpsurv-help-message-container").hide();
}

function addInputSection() {

  var status = getUrlParameter('status');
  if(status == "uploaded") {

    setUploadData();

    control_data = load_ajax(jpsurvData.file.form);

    if( control_data.input_type==undefined){
      jpsurvData.additional.input_type="dic"
      $("#import_container").remove();
      $('#csv_container').remove();
      $('#dic_container').show();

          $('#file_control_container')
      .empty()
      .append($('<div>')
        .addClass('jpsurv-label-container')
        .append($('<span>')
          .append('Dictionary File:')
          .addClass('jpsurv-label')
        )
        .append($('<span>')
          .append(getUrlParameter('file_control_filename',true))
          .attr('title', getUrlParameter('file_control_filename',true))
          .addClass('jpsurv-label-content')
        )
      );
    $('#file_data_container')
      .empty()
      .append($('<div>')
        .addClass('jpsurv-label-container')
        .append($('<span>')
          .append('Data File:')
          .addClass('jpsurv-label')
        )
        .append($('<span>')
          .append(getUrlParameter('file_data_filename',true))
          .attr('title', getUrlParameter('file_data_filename',true))
          .addClass('jpsurv-label-content')
        )
      );
      $( "#input_type_select" ).remove();
      $(" #upload-form #seperator").remove();
      $(" #input_type")
      load_form();
       $('#data_type_container')
      .empty()
      .append($('<div>')
        .addClass('jpsurv-label-container')
        .append($('<span>')
          .append('Data Type:')
          .addClass('jpsurv-label')
        )
        .append($('<span>')
          .append(jpsurvData.additional.statistic+" in "+getSessionOptionInfo("RatesDisplayedAs"))
          .attr('title', "Type of data is "+jpsurvData.additional.statistic+" in "+getSessionOptionInfo("RatesDisplayedAs"))
          .addClass('jpsurv-label-content')
        )
      );

    }
    else if( control_data.input_type=="csv"){
      jpsurvData.additional.input_type="csv"
      $('#csv_container').show();
      $('#dic_container').remove();
      $("#import_container").remove()

      $('#file_control_container_csv')
      .empty()
      .append($('<div>')

        .append($('<span>')
          .append('CSV File:')
          .addClass('jpsurv-label')
        )
        .append($('<span>')
          .append(getUrlParameter('file_control_filename',true))
          .attr('title', getUrlParameter('file_control_filename',true))
          .addClass('jpsurv-label-content')
        )
      );
      $("#input_type_select").remove();
      $("#upload-form #seperator").remove();
      $("#upload_file_submit").remove();
      $( "#has_headers" ).remove();
      $("#csv_label_data").remove();
      $("#csv_label_headers").remove();
      $("#data_type").remove();
      $("#Adv_input").remove();

    load_form();
    $('#data_type_container')
      .empty()
      .append($('<div>')
        .addClass('jpsurv-label-container')
        .append($('<span>')
          .append('Data Type:')
          .addClass('jpsurv-label')
        )
        .append($('<span>')
          .append(jpsurvData.additional.statistic+" in "+control_data.rates)
          .attr('title', "Type of data is "+jpsurvData.additional.statistic+" in "+control_data.rates)
          .addClass('jpsurv-label-content')
        )
      );

    }

    $('#upload_file_submit_container').remove();





  }
  else if (status=="failed_upload")
  {
    message = "An unexpected error occured. Please ensure the input file(s) is in the correct format and/or correct parameters were chosen. <br>";;
    message_type = 'error';
    id="jpsurv"
    showMessage(id, message, message_type);
    $("#right_panel").hide();
    $("#help").show();

  }
  else if ( status=="failed_import")
  {
    handleError("An unexpected error occured. Please ensure the input file(s) is in the correct format and/or correct parameters were chosen. <br>")
  }
  calc_status=getUrlParameter('calculation')
  if(calc_status=="failed"){
    message = "An unexpected error occured. Please ensure the input file(s) is in the correct format and/or correct parameters were chosen. <br>";;
    message_type = 'error';
    id="jpsurv"
    showMessage(id, message, message_type);
    $("#right_panel").hide();
    $("#help").show();
    var inputData = load_ajax("input_" + jpsurvData.tokenId + ".json");

    //console.warn("inputData");
    //console.dir(inputData);
    load_input_form(inputData)

  }
  if(getUrlParameter('request') == "true" && checkInputFile()&&calc_status!="failed") {
    preLoadValues();
  }
}

function checkInputFile() {
  var results = $.ajax({
    url:'tmp/input_' + jpsurvData.tokenId + '.json',
    type:'HEAD',
    async: false
  });
  var found = results.status == 200;
  if(found == false) {
    okAlert("Opps. It looks like the time to view your results has expired.  Please submit another calculation.", "JPSurv Time Expired")
  }
  return found;
}

//loads the form based on selected values
function preLoadValues() {

  //
  //Check to see if input file exists.
  //

  var inputData = load_ajax("input_" + jpsurvData.tokenId + ".json");

  //console.warn("inputData");
  //console.dir(inputData);
  load_input_form(inputData)
  //Form section


  //Set jpsurvData and update everything....
  jpsurvData = inputData;

  setIntervalsDefault();
  getIntervals();
  stage2("no calculate"); // This is the initial calculation and setup.
  retrieveResults();
  var status = getUrlParameter('status');
  //console.log(status)
}

function load_input_form(inputData){
  $("#year_of_diagnosis_start").val(inputData.calculate.form.yearOfDiagnosisRange[0]);
  $("#year_of_diagnosis_end").val(inputData.calculate.form.yearOfDiagnosisRange[1]);

  $("#cohort-variables fieldset").each(function(index,element) {
    var inputs = $(element).find("."+element.id);
    $.each(inputs, function(index2, element2) {
      $(element2).prop('checked', false);

  });
    $.each(inputs, function(index2, element2) {
          $.each( inputData.calculate.form.AllcohortValues, function( key, value ) {
            //loops through each possible cohort on the form, if the cohort is in the json it gets checked
            for(var i=0;i<value.length;i++){
                if(value[i].substr(1,value[i].length-2) == $(element2).val()&&element2.className.indexOf(key) > -1) {
              $(element2).prop('checked', true);
              }

            }
        });
    });
  });

  $("#max_join_point_select").val(inputData.calculate.form.maxjoinPoints);
  $("#e-mail").val(inputData.queue.email);

  //Advanced section
  if(inputData.calculate.static.advanced.advDeleteInterval == "T") {
    $("#del-int-yes").attr('checked', true);
  } else {
    $("#del-int-no").attr('checked', true);
  }

  $("#adv-between").val(inputData.calculate.static.advanced.advBetween);
  $("#adv-first").val(inputData.calculate.static.advanced.advFirst);
  $("#adv-last").val(inputData.calculate.static.advanced.advLast);
  $("#adv-year").val(inputData.calculate.static.advanced.advYear);
}
//populates the chort dropdown window based on the form selection
function updateCohortDropdown(){
  var cohort_array = jpsurvData.results.Runs.split('jpcom');
  var display = document.getElementById("cohort-display");
  var displayParent = display.parentElement;
  var length=cohort_array.length;

  display.innerHTML = "";
  for (var i=0;i<length;i++){
    var option=document.createElement("option");
    option.setAttribute("id", i+1);
    cohort=cohort_array[i]
    option.text=cohort;
    display.add(option);
  }

  if (length === 0 || $.inArray("",cohort_array) === 0) {
    displayParent.style.display = "none";
  }

  dropdownListener();
}

//populates the inpout json with the desired cohort combination based on the cohort dropdown window
function dropdownListener(){
  var display = document.getElementById("cohort-display");
  display.addEventListener("change", function() {
      var options = display.querySelectorAll("option");
      var count = options.length;
      //  jpsurvData.additional.headerJoinPoints=null
          jpsurvData.calculate.form.cohortValues=[]
          //splits the cohorts based on a " + "
          var cohorts = display.options[display.selectedIndex].value.split(' + ');
          //adds each cohort to the json
          for(var j=0;j<cohorts.length;j++){
            jpsurvData.calculate.form.cohortValues.push('"'+cohorts[j]+'"');
          }
          //resets the image id
          jpsurvData.plot.static.imageId=0

      jpsurvData.switch=true
      jpsurvData.additional.use_default="true"
      jpsurvData.additional.Runs=jpsurvData.results.Runs;
      calculate(true);

          //console.log(s.results);
  });
}

function updateCohortDisplay() {
  jpsurvData.calculate.form.cohortValues = [];
  var cohort_message = ""
  $("#cohort-variables fieldset").each(function(index,element) {
    jpsurvData.calculate.form.AllcohortValues[index]=[]

      var inputs = $(element).find("."+element.id);
    //Adds all cohorts selected
    checked=false //will be used to flag if any cohort vlues are checked, default is false until a vlaue is seen as checked
    $.each(inputs, function(index2, element2) {
    //if checked add to ALL cohorts to be used for populating the drop down (if at least one checkbox is selected)
      if($(element2).prop('checked')){
        checked=true;
        cohort_message +=' "'+$(element2).val()+'"';
        if(!jpsurvData.calculate.form.AllcohortValues[index].includes('"'+$(element2).val()+'"')){
          jpsurvData.calculate.form.AllcohortValues[index].push('"'+$(element2).val()+'"');
        }
      }
    });

    if(checked==false)
       $.each(inputs, function(index2, element2) {
    //if checked add to ALL cohorts to be used for populating the drop down (if at least one checkbox is selected)
        cohort_message +=' "'+$(element2).val()+'"';
        if(!jpsurvData.calculate.form.AllcohortValues[index].includes('"'+$(element2).val()+'"')){
          jpsurvData.calculate.form.AllcohortValues[index].push('"'+$(element2).val()+'"');
        }

    });
    //if none was checked lopp back through and add all cohort values for that cohort
      cohort_message += " and "

  });
  //inserts the first cohort combination based on all the cohorts slected (1st value of each cohort)
  keys=Object.keys(jpsurvData.calculate.form.AllcohortValues)
  for (var i=0; i<keys.length;i++){
    key=i.toString();
    element=jpsurvData.calculate.form.AllcohortValues[key[0]][0];
    jpsurvData.calculate.form.cohortValues.push(element);
  }


  $("#cohort-variables fieldset").each(function(index,element) {
  });

  var i=0;
  var html = "";
  $("#something").empty();
  $.each(cohort_covariance_variables, function(key, value) {

    $('#something').append(value+" and");
    i++;
  });

}

function addCohortVariables() {
  jpsurvData.calculate.form.cohortVars = [];
  jpsurvData.calculate.form.AllcohortValues = {};

  var i=0;
  var html = "";
    $.each(cohort_covariance_variables, function(key, value) {
      if(key) {
        jpsurvData.calculate.form.cohortVars.push(key);
        jpsurvData.calculate.form.AllcohortValues[i]=[];

        html = '<div class="row"><div class="col-md-12"><fieldset id="cohort-'+i+'" data-cohort="'+key+'"><legend><span class="jpsurv-label">'+key+':</span></legend></fieldset></div></div>';
        $("#cohort-variables").append(html);
        if(control_data.input_type==undefined)
        {
          if(typeof control_data.VarFormatSecList[key].ItemValueInDic == 'string')
          {
            $("#cohort-"+0)
                .append(
                  $('<div>').addClass('checkbox')
                    .append($('<label>')
                      .append($('<input>')
                          .attr('type', 'checkbox')
                          .attr('value', control_data.VarFormatSecList[key].ItemValueInDic)
                          .addClass('cohort')
                          .addClass('cohort-'+i)
                        ).append(control_data.VarFormatSecList[key].ItemValueInDic)
                        .addClass('cohort-'+i)
                  )
                );
          }
          else{
            $.each(control_data.VarFormatSecList[key].ItemValueInDic, function(key2, value2) {
              $("#cohort-"+i)
                .append(
                  $('<div>').addClass('checkbox')
                    .append($('<label>')
                      .append($('<input>')
                          .attr('type', 'checkbox')
                          .attr('value', value2)
                          .addClass('cohort')
                          .addClass('cohort-'+i)
                        ).append(value2)
                        .addClass('cohort-'+i)
                  )
                );
            });
          }
        }
        else if(control_data.input_type=="csv")
        {
          if(typeof  cohort_covariance_variables[key]=='number'|| typeof cohort_covariance_variables[key]=="string")
          {
            $("#cohort-"+i)
              .append(
                $('<div>').addClass('checkbox')
                  .append($('<label>')
                    .append($('<input>')
                        .attr('type', 'checkbox')
                        .attr('value', cohort_covariance_variables[key])
                        .addClass('cohort')
                        .addClass('cohort-'+i)
                      ).append(cohort_covariance_variables[key])
                      .addClass('cohort-'+i)
                )
              );
          }

          for(var j=0;j<cohort_covariance_variables[key].length;j++) {
            $("#cohort-"+i)
              .append(
                $('<div>').addClass('checkbox')
                  .append($('<label>')
                    .append($('<input>')
                        .attr('type', 'checkbox')
                        .attr('value', cohort_covariance_variables[key][j])
                        .addClass('cohort')
                        .addClass('cohort-'+i)
                      ).append(cohort_covariance_variables[key][j])
                      .addClass('cohort-'+i)
                )
              );
          }

        }
        // $("#cohort-"+i).find('input').filter(":first").prop('checked', true);
        i++;
      }

    });

  updateCohortDisplay();
}

function loadHelp() {
  $("#help-tab").load("./html/help.html");
  $("#help").append($("<div>").load("./html/description.html"));
}

$('#file_control_csv').change(function(){
   first_modal=true
   $('#modalContent').html('<table id="data_table" class="table table-striped" style="height:100px;border-top:none;border-left:none;line-height:0" cellspacing:"0" cellpadding="0px" width="100%"></table>');
    $("#Adv_input").removeAttr('disabled');
      $("#has_headers").prop("checked", true)
    Read_csv_file();
});
function checkInputFiles() {
  //If both files are filed out then enable the Upload Files Button

  var file_control = $("#file_control").val();
  var file_data = $("#file_data").val();
  var file_control_csv = $("#file_control_csv").val();

    if($('#dic').is(':checked')){
      var has_dic=false
      var has_txt=false
      var error_msg="Please choose 1 dictionary file and one text file"
      $("#file_display").empty();

      $("#upload_file_submit").text('Upload Input Files');

      if($("#file_control").prop("files").length>2)
        $("#file_display").html('<span style="color:red">'+error_msg+'</span></br>');
      else{
        for(var i=0;i<($("#file_control").prop("files").length);i++){
          var ext=$("#file_control").prop("files")[i].name.substr($("#file_control").prop("files")[i].name.length-3)
          if(ext=="txt"&& has_txt==false)
          {
            $("#file_display").append("<span'><b>Dictionary file: </b>"+$("#file_control").prop("files")[i].name+'</span></br>');
            has_txt=true;
          }
          if(ext=="dic"&& has_dic==false)
          {
            $("#file_display").append("<span'><b>Data file: </b>"+$("#file_control").prop("files")[i].name+'</span></br>');
            has_dic=true;
          }

        }
      }
      var numberOfFiles = $("#file_control").prop("files").length
      if(numberOfFiles == 2 && has_dic==true &&  has_txt==true) {
        $("#upload_file_submit").removeAttr('disabled');
        $("#upload_file_submit").text('Upload Input Files');
        $("#upload_file_submit").on("click", submitDicOrCsv)
      } else if (numberOfFiles == 1) {
        $("#file_display").html('<span style="color:red">'+error_msg+'</span></br>');
      }

    }

    else if($('#csv').is(':checked')){

      $("#upload_file_submit").attr('title', 'Upload Data from CSV File');
      $("#upload_file_submit").text('Upload Input Files');

      if(file_control_csv.length > 0 &&jpsurvData.passed==true) {
        $("#upload_file_submit").removeAttr('disabled');

        $("#upload_file_submit").on("click", submitDicOrCsv)

      }
      else{
        $("#upload_file_submit").prop('disabled', true);
      }
    }
    else if ( $("#importRadioButton").is(":checked")) {

        $("#upload_file_submit").attr('title', 'Import Workspace from file');
        $("#upload_file_submit").text('Import Workspace');

        if ( $("#fileSelect")[0].files.length == 1 ) {
            $("#upload_file_submit").removeAttr('disabled');
            $("#upload_file_submit").off("click", "#upload_file_submit", submitDicOrCsv)
            $("#upload_file_submit").on("click", importBackEnd)
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

  session=getUrlParameter('output_filename');
  session=session.split(".json").shift();
  session=session.split("form-").pop();
  jpsurvData.session_tokenId=session;
  //jpsurvData.file.formId = getUrlParameter('output_filename').substr(5, 6);
  jpsurvData.status = getUrlParameter('status');

}

function setupModel() {

  if(jpsurvData.results.SelectedModel == "NA") {
    jpsurvData.results.SelectedModel = 1;
  }

  jpsurvData.additional.headerJoinPoints = jpsurvData.results.jpInd;

}

function createModelSelection() {

  setupModel();
  var ModelSelection = JSON.parse(jpsurvData.results.ModelSelection);

  $("#model-selection-table > tbody").empty();
  var jp = 0;
  var title = "Click row to change Number of Joinpoints to "
  $.each(ModelSelection, function( index, value ) {
    row = '<tr  id="jp_'+jp+'" title="'+title+jp.toString()+'">';
    row += '"<td class="model-number">'+(jp+1)+'</td>';
    row += "<td>"+jp+"</td>";
    row += formatCell(value.bic);
    row += formatCell(value.aic);
    row += formatCell(value.ll);
    row += "<td>"+(value.converged ? "Yes" :"No")+"</td></tr>/n";
    $("#model-selection-table > tbody").append(row);
    jp++;
  });
  $("#jp_"+jpsurvData.additional.headerJoinPoints).addClass('info').siblings().removeClass('info');
  $("#jp_"+(jpsurvData.results.SelectedModel-1)).find('td.model-number').text(jpsurvData.results.SelectedModel+" (final selected model)");



  $("#estimates-coefficients > tbody").empty();
  var row;
  var xvectors = jpsurvData.results.Coefficients.Xvectors.split(",");
  var estimates = jpsurvData.results.Coefficients.Estimates.split(",");
  var std_error = jpsurvData.results.Coefficients.Std_Error.split(",");


  $.each(xvectors, function( index, value ) {
    row = "<tr><td>"+value+"</td>";
    row += formatCell(estimates[index]);
    row += formatCell(std_error[index])+"</tr>\n";
    $("#estimates-coefficients > tbody").append(row);
  });
}

function updateGraphs(token_id) {

  //Populate graph-year
  $("#graph-year-tab").find( "img" ).show();
  $("#graph-year-tab").find( "img" ).css("width","65%");
  $("#graph-year-tab").find( "img" ).attr("src", "tmp/plot_Year-"+token_id+"-"+jpsurvData.results.com+"-"+jpsurvData.results.jpInd+"-"+jpsurvData.results.imageId+".png");
  $("#graph-year-table > tbody").empty();
  $("#graph-year-table > tbody").append('<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>');

  //Populate time-year
  $("#graph-time-tab").find( "img" ).show();
  $("#graph-time-tab").find( "img" ).css("width","70%");
  $("#graph-time-tab").find( "img" ).attr("src", "tmp/plot_Int-"+token_id+"-"+jpsurvData.results.com+"-"+jpsurvData.results.jpInd+"-"+jpsurvData.results.imageId+".png");


  var row;


  var header = [];
  var newVars = [];
  var yodVarName = jpsurvData.calculate.static.yearOfDiagnosisVarName.replace(/\(|\)|-/g, "");
  yodVarName = yodVarName.replace(/__/g, '_');

  //Add the Year Table
  if(jpsurvData.results.YearData.RelSurvYearData!=undefined){
    var yod = jpsurvData.results.YearData.RelSurvYearData[yodVarName];
    header = [];
    $.each(jpsurvData.calculate.form.cohortVars, function(index, value) {
      header.push(value);
    });

    var data_type = jpsurvData.results.statistic
    var data_type = data_type.replace("Cum", "Cumulative");

    var timeHeader = ["Year of Diagnosis", "Interval", "Died", "Alive_at_Start","Lost_to_Followup","Expected_Survival_Interval",data_type,"Predicted Interval Survival","Predicted Cumulative Survival","Predicted Interval Survival Std. Err.","Predicted Cumulative Survival Std. Err. "];
    header.push.apply(header, timeHeader);
    //Create the header
    $("#graph-year-table > thead").empty();
    row = "<tr>";
    $.each(header, function( index, value ) {
      row += '<th scope="col">'+value.replace(/_/g, " ")+'</th>';
    });
    row += "</tr>/n";
    $("#graph-year-table > thead").append(row);

    $("#graph-year-table > tbody").empty();
    var rows=0;
    if (yod) {
      $.each(yod, function( index, value ) {
        row = "<tr>";

        if(jpsurvData.results.Runs.split('jpcom')!=undefined){
          var cohort_array = jpsurvData.results.Runs.split('jpcom');
          var values= cohort_array[jpsurvData.results.com-1].split(" + ");
          $.each(values, function(index2, value2) {
            if(value2) {
              row += "<td>"+value2.replace(/"/g, "")+"</td>";
            }
          });
        }
        else{
          var cohort_array = jpsurvData.results.Runs.split('jpcom');
          var values= cohort_array.split(" + ");
          $.each(values, function(index2, value2) {
            if(value2) {
              row += "<td>"+value2.replace(/"/g, "")+"</td>";
            }
          });
        }
        var type = Object.keys(jpsurvData.results.IntData.RelSurIntData)[2];
        row += "<td>"+value+"</td>";

        if(jpsurvData.results.input_type=="dic"){
          row += formatCell(jpsurvData.results.YearData.RelSurvYearData.Interval[index]);
          row += formatCell(jpsurvData.results.YearData.RelSurvYearData.Died[index]);
          row += formatCell(jpsurvData.results.YearData.RelSurvYearData.Alive_at_Start[index]);
          row += formatCell(jpsurvData.results.YearData.RelSurvYearData.Lost_to_Followup[index]);
          row += formatCell(jpsurvData.results.YearData.RelSurvYearData.Expected_Survival_Interval[index]);
        }
        else if(jpsurvData.results.input_type=="csv"){
          row += formatCell(jpsurvData.results.YearData.RelSurvYearData[jpsurvData.results.headers.Interval][index]);
          row += formatCell(jpsurvData.results.YearData.RelSurvYearData[jpsurvData.results.headers.Died][index]);
          row += formatCell(jpsurvData.results.YearData.RelSurvYearData[jpsurvData.results.headers.Alive_at_Start][index]);
          row += formatCell(jpsurvData.results.YearData.RelSurvYearData[jpsurvData.results.headers.Lost_to_followup][index]);
          row += formatCell(jpsurvData.results.YearData.RelSurvYearData[jpsurvData.results.headers.Expected_Survival_Interval][index]);
        }
        row += formatCell(jpsurvData.results.YearData.RelSurvYearData[type][index]);
        row += formatCell(jpsurvData.results.YearData.RelSurvYearData.pred_int[index])
        row += formatCell(jpsurvData.results.YearData.RelSurvYearData.pred_cum[index]);
        row += formatCell(jpsurvData.results.YearData.RelSurvYearData.pred_int_se[index]);
        row += formatCell(jpsurvData.results.YearData.RelSurvYearData.pred_cum_se[index])+"</tr>/n";
        $("#graph-year-table > tbody").append(row);
        rows++;
      });
    }
    $("#year-tab-rows").html("Total Row Count: "+rows)

  }
  else{
      $("#graph-year-table > tbody").empty();
  }

  //Add the Time Table
  if(jpsurvData.results.IntData.RelSurIntData!=undefined){
    yod = jpsurvData.results.IntData.RelSurIntData[yodVarName];
    header = [];
    $.each(jpsurvData.calculate.form.cohortVars, function(index, value) {
      header.push(value);
    });
    var data_type = jpsurvData.results.statistic
    var Cumulative_header=""
    if(data_type=="CauseSpecific_Survival_Cum")
      Cumulative_header="Cumulative CauseSpecific Survival"
    if(data_type=="Relative_Survival_Cum")
      Cumulative_header="Cumulative Relative Survival"

    var timeHeader = ["Year of Diagnosis", "Interval", Cumulative_header, "Predicted Cumulative Relative Survival"];
    header.push.apply(header, timeHeader);
    //Create the header
    $("#graph-time-table > thead").empty();
    row = "<tr>";
    $.each(header, function( index, value ) {
      row += '<th scope="col">'+value.replace(/_/g, " ")+'</th>';
    });
    row += "</tr>/n";
    $("#graph-time-table > thead").append(row);

    $("#graph-time-table > tbody").empty();
    var rows=0;
    if (yod) {
      $.each(yod, function( index, value ) {
        row = "<tr>";

        if(jpsurvData.results.Runs.split('jpcom')!=undefined){
          var cohort_array = jpsurvData.results.Runs.split('jpcom');
          var values= cohort_array[jpsurvData.results.com-1].split(" + ");
          $.each(values, function(index2, value2) {
            if(value2) {
              row += "<td>"+value2.replace(/"/g, "")+"</td>";
            }
          });
        }
        else{
          var cohort_array = jpsurvData.results.Runs.split('jpcom');
          var values= cohort_array.split("+");
          $.each(values, function(index2, value2) {
            row += "<td>"+value2.replace(/"/g, "")+"</td>";
          });
        }




        row += "<td>"+value+"</td>";

        if(jpsurvData.results.input_type=="dic"){
          row += formatCell(jpsurvData.results.IntData.RelSurIntData.Interval[index]);
          row += formatCell(jpsurvData.results.IntData.RelSurIntData[jpsurvData.results.statistic][index]);
        }
        else if(jpsurvData.results.input_type=="csv"){
          row += formatCell(jpsurvData.results.IntData.RelSurIntData[jpsurvData.results.headers.Interval][index]);
          row += formatCell(jpsurvData.results.IntData.RelSurIntData[jpsurvData.results.headers[jpsurvData.results.statistic]][index]);
        }
        row += formatCell(jpsurvData.results.IntData.RelSurIntData.pred_cum[index])+"</tr>/n";
        $("#graph-time-table > tbody").append(row);
        rows++;

      });
    }

    if(!$('#year-of-diagnosis').data('changed')) {
      $('#year-of-diagnosis').val(jpsurvData.results.yod);
      //console.log("setting to "+jpsurvData.results.yod+" from json")
    }
    $("#year-of-diagnosis").data('changed', false);

    $("#time-tab-rows").html("Total Row Count: "+rows)

  }
  else{
      $("#graph-time-table > tbody").empty();
  }
}

function updateEstimates(token_id) {

  var row;
  jointpoints=JSON.parse(jpsurvData.results.ModelSelection)
  if(jpsurvData.additional.headerJoinPoints!=undefined){
      Model=jpsurvData.additional.headerJoinPoints+1
  }
  else{
    Model=jpsurvData.results.SelectedModel
  }

  $("#estimates-jp > tbody").empty();
  row = "<tr>";
  row += "<td>Bayesian Information Criterion (BIC)</td>"+formatCell(jointpoints["joinpoint"+Model].bic)+"</tr>";
  row += "<td>Akaike Information Criterial (AIC)</td>"+formatCell(jointpoints["joinpoint"+Model].aic)+"</td></tr>";
  row += "<td>Log Likelihood</td>"+formatCell(jointpoints["joinpoint"+Model].ll)+"</tr>";
  row += "<td>Converged</td><td>"+(String(jointpoints["joinpoint"+Model].converged).toUpperCase() == "TRUE" ? "Yes" :"No")+"</td></tr>/n";
  $("#estimates-jp > tbody").append(row);

  $("#yod-range").text(jpsurvData.results.JP);
  $("#estimates-jp-selected").text(jpsurvData.additional.headerJoinPoints);


}

function updateTrend(token_id) {
  updateTrendGraph(JSON.parse(jpsurvData.results.CS_AAPC), "trend-apc");
  updateTrendGraph(JSON.parse(jpsurvData.results.CS_AAAC), "trend-aac");
  updateTrendGraph(JSON.parse(jpsurvData.results.HAZ_APC), "trend-dap");
}

function updateTrendGraph(trend, table_id) {


  var row;
  $("#"+table_id+" > tbody").empty();
  if(typeof trend["start.year"] == "number") {
    row = "<tr><td>"+trend["start.year"]+"</td>";
    row += "<td>"+trend["end.year"]+"</td>";
    row += formatCell(trend.estimate);
    row += formatCell(trend["std.error"])+"</td>";
    row += formatCell(trend["lowCI"])+"</td>";
    row += formatCell(trend["upCI"])+"</td>";
    var trend_sig=""
    if (trend["lowCI"]>0)
        trend_sig="Increasing"
    else if(trend["upCI"]<0)
        trend_sig="Decreasing"
    else if(trend["lowCI"]<=0 &&trend["upCI"]>=0)
        trend_sig="Not significant"
    row+=formatCell(trend_sig)+"</tr>/n";
    $("#"+table_id+" > tbody").append(row);
  } else {
    $.each(trend["start.year"], function( index, value ) {
      row = "<tr><td>"+value+"</td>";
      row += "<td>"+trend["end.year"][index]+"</td>";
      row += formatCell(trend.estimate[index]);
      row += formatCell(trend["std.error"][index])+"</td>";
      row += formatCell(trend["lowCI"][index])+"</td>";
      row += formatCell(trend["upCI"][index])+"</td>";
      var trend_sig=""
      if (trend["lowCI"][index]>0)
        trend_sig="Increasing"
      else if(trend["upCI"][index]<0)
        trend_sig="Decreasing"
      else if(trend["lowCI"][index]<=0 &&trend["upCI"][index]>=0)
        trend_sig="Not significant"
      row+=formatCell(trend_sig)+"</tr>/n";
      $("#"+table_id+" > tbody").append(row);

    });
  }
}
function updateGraphLinks(token_id) {
  $("#graph-year-dataset-link").attr("href", "tmp/data_Year-"+token_id+"-"+jpsurvData.results.com+"-"+jpsurvData.results.jpInd+"-"+jpsurvData.results.imageId+".csv");
  $("#graph-time-dataset-link").attr("href", "tmp/data_Int-"+token_id+"-"+jpsurvData.results.com+"-"+jpsurvData.results.jpInd+"-"+jpsurvData.results.imageId+".csv");
  $(".full-dataset-link").attr("href", "tmp/Full_Predicted-"+token_id+"-"+jpsurvData.results.com+"-"+jpsurvData.results.imageId+".csv");
}

function updateSelections(token_id) {
  return
}

function updateTabs(tokenId) {
  updateGraphs(tokenId);
  updateEstimates(tokenId);
  updateGraphLinks(tokenId);
  updateSelections(tokenId);
  //Change the precision of all the floats.
  changePrecision();
  var trend_selected = $("#jpsurv-tabs").find("a[href='#trends-tab']").parent().hasClass("active");
  if(trend_selected) {
    calculateTrend();
  }
}

function calculateAllData() {
  jpsurvRest2('stage3_recalculate', "calculateAllDataCallback");
}

function calculateAllDataCallback() {
  //console.log("calculateAllDataCallback..");
  var cohort_com=jpsurvData.run;
  var jpInd=jpsurvData.additional.headerJoinPoints;
  retrieveResults(cohort_com,jpInd,jpsurvData.switch);
  jpsurvData.switch=false
  jpsurvData.additional.use_default="true"

}

function calculateFittedResults() {
  jpsurvRest2('stage2_calculate', "calculateFittedResultsCallback");
}

function calculateFittedResultsCallback() {
  //console.log("calculateFittedResultsCallback..");
  $("#right_panel").show();
  $("#right_panel").css('display', 'inline-block');
  $("#help").hide();
  $("#icon").css('visibility', 'visible');

  $("#year-of-diagnosis").empty();
  for (year=jpsurvData.calculate.form.yearOfDiagnosisRange[0];year<=jpsurvData.calculate.form.yearOfDiagnosisRange[1];year++) {
    $("#year-of-diagnosis").append("<OPTION>"+year+"</OPTION>\n");
  }
  //Set precision if cookie is available
  var precision = getCookie("precision");
  if(parseInt(precision) > 0) {
    $('#precision>option:eq('+(parseInt(precision)-1)+')').prop('selected', true);
  }
  retrieveResults();
  jpsurvData.additional.use_default="true"

}

function calculateTrend() {
  window.jpsurvData.trendsInterval = $('#trends-interval-years').val();
  jpsurvRest2('stage4_trends_calculate', "calculateTrendCallback");
}

function calculateTrendCallback() {
  var trendData = load_ajax("trend_results-" + jpsurvData.tokenId + ".json");
  if ( trendData != undefined && trendData != null ) {
    jpsurvData.results.CS_AAPC = trendData.CS_AAPC;
    jpsurvData.results.CS_AAAC = trendData.CS_AAAC;
    jpsurvData.results.HAZ_APC = trendData.HAZ_APC;
    updateTrend(jpsurvData.tokenId);
    changePrecision();
    jpsurvData.recentTrends = 1;
  } else {
    jpsurvData.recentTrends = 0
  }
}

function changePrecision() {

  var precision = $("#precision").val();
  $("td[data-float]").each(function(index,element) {
    var number = $(element).attr("data-float");
    var myFloat = parseFloat(number);
    var myInt = parseInt(number);
    if(myInt == myFloat) {
      //Set the int part
      $(element).text(myInt);
    } else {
      //Set the float part
      $(element).text(myFloat.toFixed(precision));
    }
  });
}

function formatCell(x) {
  //If the content is a float return a cell with the attribute of data-float
  // else return data in a table cell
  if(isNaN(parseFloat(x))) {
    return "<td>"+x+"</td>";
  } else {
    return "<td data-float='"+x+"'><i>float</i></td>";
  }
}

function setCalculateData(type) {

    setData(type)

    if(validateVariables()) {

      calculate();
    } else {
      //console.log("Not Calculating - validateVariables did not pass");
    }
}

function setData(type) {
    type = type || 0;
    if(type == "default") {
    }

    updateCohortDisplay();

    jpsurvData.queue = {};
    jpsurvData.queue.email = $("#e-mail").val();
    jpsurvData.queue.url = encodeURIComponent(window.location.href.toString()+"&request=true");

    //Set static data
    var inputAnswers;
    var yearOfDiagnosisVarName = jpsurvData.calculate.static.yearOfDiagnosisTitle.replace('+', '');
    yearOfDiagnosisVarName = yearOfDiagnosisVarName.replace(new RegExp(" ", 'g'), "_");

    //Remove spaces and replace with underscore
    jpsurvData.calculate.static.yearOfDiagnosisVarName = yearOfDiagnosisVarName;
    jpsurvData.calculate.static.seerFilePrefix =jpsurvData.file.dictionary.replace(/.\w*$/, "");
    jpsurvData.calculate.static.allVars = get_cohort_covariance_variable_names();
    jpsurvData.calculate.static.allVars.push(yearOfDiagnosisVarName);
    jpsurvData.calculate.form.covariateVars = "";
    jpsurvData.calculate.form.yearOfDiagnosisRange = [parseInt($('#year_of_diagnosis_start').val()), parseInt($('#year_of_diagnosis_end').val())];
    jpsurvData.calculate.form.maxjoinPoints = parseInt($('#max_join_point_select').val()),

    //
    // Get Advanced Options
    //
    jpsurvData.calculate.static.advanced = {};
    jpsurvData.calculate.static.advanced.advDeleteInterval = (($("input[name='adv-delete-interval']:checked").val() == "Yes") ? "T" : "F");
    jpsurvData.calculate.static.advanced.advBetween = $("#adv-between").val();
    jpsurvData.calculate.static.advanced.advFirst = $("#adv-first").val();
    jpsurvData.calculate.static.advanced.advLast = $("#adv-last").val();
    jpsurvData.calculate.static.advanced.advYear = $("#adv-year").val();


    jpsurvData.additional.yearOfDiagnosis = parseInt($("#year-of-diagnosis").val());
    jpsurvData.additional.DataTypeVariable = "Relative_Survival_Cum";
    if(jpsurvData.additional.statistic == "Relative Survival") {
      jpsurvData.additional.DataTypeVariable = "Relative_Survival_Cum";
    }
    if(jpsurvData.additional.statistic == "Cause-Specific Survival") {
      jpsurvData.additional.DataTypeVariable = "CauseSpecific_Survival_Cum";
    }
}

function validateYearRange() {
  if(jpsurvData.calculate.form.yearOfDiagnosisRange[1]<=jpsurvData.calculate.form.yearOfDiagnosisRange[0]) {
    okAlert("The Year of Diagnosis Range is invalid.<br><br>The start year can not be greater then or equal to end year.", "Rule Validation");
    return false;
  } else {
    return true;
  }
}

function okAlert(message, title) {
  $("#ok-alert").find(".modal-title").empty().html(title);
  $("#ok-alert").find(".modal-body").empty().html(message);
  $("#ok-alert").modal('show');
}

function validateRule1() {
  /*
    Rule 1:
    max(Year) >= min(Year) + advFirst + ((maxjoinPoints-1) * (advBetween+1)) + advLast
    max(Year) >= min(Year) + op$numfromstart + ((nJP-1) * (op$numbetwn+1)) + op$numtoend;
  */
  //Skip this test is maxjoinPoint is zero.
  if(jpsurvData.calculate.form.maxjoinPoints == 0) {
    return true;
  }
  var minYear = jpsurvData.calculate.form.yearOfDiagnosisRange[0];
  var maxYear = jpsurvData.calculate.form.yearOfDiagnosisRange[1];
  var rightside = minYear
    + parseInt(jpsurvData.calculate.static.advanced.advFirst)
    + ((parseInt(jpsurvData.calculate.form.maxjoinPoints)-1)
      * (parseInt(jpsurvData.calculate.static.advanced.advBetween)+1))
    + parseInt(jpsurvData.calculate.static.advanced.advLast);

  if(maxYear >= minYear
    + parseInt(jpsurvData.calculate.static.advanced.advFirst)
    + ((parseInt(jpsurvData.calculate.form.maxjoinPoints)-1)
      * (parseInt(jpsurvData.calculate.static.advanced.advBetween)+1))
    + parseInt(jpsurvData.calculate.static.advanced.advLast)) {
    return true;
  } else {
    okAlert(sprintf("<p>Unable to perform calculation because the following equation is not true."
        + "<br><br>maxYear >= minYear + advFirst + ((maxjoinPoints-1) * (advBetween+1)) + advLast"
        + "<br><br>maxYear = %d<br>minYear = %d<br>advFirst = %d<br>maxjoinPoints = %d<br>advBetween = %d<br>advLast = %d<br>"
        + "<br><br>Adjust variables to satisfy the equation and try again."
        , maxYear
        , minYear
        , jpsurvData.calculate.static.advanced.advFirst
        , jpsurvData.calculate.form.maxjoinPoints
        , jpsurvData.calculate.static.advanced.advBetween
        , jpsurvData.calculate.static.advanced.advLast), "Rule Validation");
  }

  return false;
}

function validateVariables() {

  if(validateYearRange() && validateRule1()) {
    return true;
  } else {
    return false;
  }
}

function calculate(run) {

  //incrementImageId();
  //Next tokenID

  if(jpsurvData.stage2completed) {
    if(run!=true) {
      incrementImageId();
    }
    else{
      jpsurvData.plot.static.imageId=0
    }
    setRun()
    stage3();  // This is a recalculation.
  } else {
    jpsurvData.tokenId = renewTokenId(true);
    incrementImageId();
    jpsurvData.run=1;
    if(parseInt($("#max_join_point_select").val())>maxJP && validateVariables() || check_multiple()==true) {
      //asks user to confirm they want thier job queued
      var send = confirm("Please confirm you would like your job sent to the queuing system for calculation");
      // SEND TO QUEUE
      if(send == true){
        setIntervalsDefault();
        getIntervals();
        setUrlParameter("request", "true");
        jpsurvData.additional.use_default="true"
        jpsurvData.queue.url = encodeURIComponent(window.location.href.toString());
        jpsurvData.additional.yearOfDiagnosis = jpsurvData.calculate.form.yearOfDiagnosisRange[0].toString();
        jpsurvData.additional.yearOfDiagnosis_default = parseInt($("#year_of_diagnosis_start").val());
        jpsurvData.additional.del=control_data.del
      //  jpsurvData.additional.rates=control.rates
        var params = getParams();
        $("#right_panel").hide();
        $("#help").show();
        $("#icon").css('visibility', 'hidden');
        var comm_results = JSON.parse(jpsurvRest('stage5_queue', params));
        $("#calculating-spinner").modal('hide');
        okAlert("Your submission has been queued.  You will receive an e-mail when calculation is completed.", "Calculation in Queue");
      }

    }
    else if(parseInt($("#max_join_point_select").val())>maxJP && !validateVariables()){
      console.log("Not Calculating - validateVariables did not pass");
    }
    else {
      jpsurvData.plot.static.imageId=0
      jpsurvData.additional.yearOfDiagnosis_default = parseInt($("#year_of_diagnosis_start").val());
      jpsurvData.additional.use_default="true"
      jpsurvData.additional.del=control_data.del
   //   jpsurvData.additional.rates=control.rates
      stage2("calculate"); // This is the initial calculation and setup.
    }
  }

}

function setRun() {
    var dropdown = document.getElementById("cohort-display");
    jpsurvData.run=dropdown.options[dropdown.selectedIndex].id;
}

function file_submit(event) {
  jpsurvData.tokenId = renewTokenId(false);
  if($('#csv').is(':checked')){
    headers=""
    del=$("input[name=del]:checked").val()
    //console.log("del" +del)
    for (var i=0;i<$('#header_row th').length/2;i++){
      header=$('#header_'+i).val()
      headers+=header+del;
    }
    headers=headers.substring(0,headers.length-1)
    jpsurvData.additional.statistic=$("#data_type").val()
    jpsurvData.mapping.has_headers=String($('#has_headers').is(':checked'));
    $("#upload-form").attr('action', 'jpsurvRest/stage1_upload?tokenId='+jpsurvData.tokenId+'&input_type='+jpsurvData.input_type+'&map='+JSON.stringify(jpsurvData)+'&has_headers='+jpsurvData.mapping.has_headers+'&headers='+headers);
  }

  else{
    jpsurvData.input_type="dic";
    $("#upload-form").attr('action', 'jpsurvRest/stage1_upload?tokenId='+jpsurvData.tokenId+'&input_type='+jpsurvData.input_type);
  }

  getRestServerStatus();

}

function retrieveResults(cohort_com,jpInd,switch_cohort) {
  var file_name=""
  if(jpInd!=undefined && cohort_com!=undefined &&switch_cohort==false)
    file_name='tmp/results-'+jpsurvData.tokenId+"-"+cohort_com+"-"+jpInd+'.json';
  else
  {
    file_name = generateResultsFilename()
  }
  $.getJSON(file_name, function (results) {
    loadResults(results)
  });

  jpsurvData.switch=false
  jpsurvData.additional.use_default="true"


}

function generateResultsFilename(cohort_com,jpInd,switch_cohort) {


    var file_name = ""

    $.ajax({
        // // url: '/jpsurv/tmp/cohort_models-'+jpsurvData.tokenId+'.json',
        url: 'tmp/cohort_models-'+jpsurvData.tokenId+'.json',
        type: 'GET',
        async: false,
        dataType: 'json', // added data type
        success: function(results) {
            cohort_models=results
            if(switch_cohort==undefined)
                cohort_com=1
            file_name='tmp/results-'+jpsurvData.tokenId+"-"+cohort_com+"-"+results[cohort_com-1]+'.json';
        }
    });

    return file_name
}

function loadResults(results) {
    jpsurvData.results = results;
    if(!jpsurvData.stage2completed) {
      updateCohortDropdown();
      setupModel();
      createModelSelection();

    }
    else{
      setupModel();
      createModelSelection();
      createModelSelection();
    }
    if(certifyResults() == false){
      //console.warn("Results are corrupt.");
    }
    updateTabs(jpsurvData.tokenId);
    jpsurvData.stage2completed = true;
    jpsurvData.additional.recalculate="false"
}

function preLoadResults(results) {
    jpsurvData.results = results
    updateCohortDropdown()
}

function getParams() {
  //console.warn("getParams -  when is the vars set?");
  //console.dir(jpsurvData);

  jpsurvData.results = {};
  var params = 'jpsurvData='+JSON.stringify(jpsurvData);
  params = replaceAll('None', '', params);
  params = params.replace(/\+/g, "{plus}");

  return params;
}

function incrementImageId() {

  jpsurvData.plot.static.imageId++;

}

function stage2(action) {

  $("#jpsurv-message-container").hide();
  jpsurvData.recentTrends = 0;
  setIntervalsDefault();
  getIntervals();
  jpsurvData.additional.yearOfDiagnosis = jpsurvData.calculate.form.yearOfDiagnosisRange[0].toString();
  if(action == "calculate") {
    calculateFittedResults()
  } else {
    calculateFittedResultsCallback();
  }



}

function stage3() {
    //Run initial calculation with setup.
  //console.log("stage3")
  //console.log("Currently in stgage3()")
  $("#jpsurv-message-container").hide();
  jpsurvData.recentTrends = 0;
  $("#year_of_diagnosis_start").val(jpsurvData.calculate.form.yearOfDiagnosisRange[0]);
  getIntervals();
  delete jpsurvData.results;

  calculateAllData();
}

function getIntervals() {
  //
  // SET INTERVALS
  //
  var intervals = $("#interval-years").val();
  jpsurvData.additional.intervals = [];
  $.each(intervals, function( index, value ) {
    jpsurvData.additional.intervals[index] = parseInt(value);
  });

}


function append_plot_intervals(max_interval) {
  $("#plot_intervals").empty();
  for(var i=1; i<=max_interval; i++) {
    $("#plot_intervals").append(
      $('<option>').val(i).html(i)
      );
  }

}

function jpTrim(str, len) {
  //Trim to the right if too long...
  var newstr = str;
  if(str.length > len) {
      newstr = str.substr(0, len)+" ...";
  }

  return newstr;
}

function load_form() {

  parse_diagnosis_years();
  parse_cohort_covariance_variables();
  addCohortVariables();
  addSessionVariables();
  build_parameter_column();

  if(control_data.input_type=="csv"){
    get_column_values()
  }



  $('#diagnosis_title')
    .empty()
    .append($('<div>')
      .addClass('jpsurv-label-container')
      .append($('<span>')
          .append('Year of Diagnosis:')
          .addClass('jpsurv-label')
      )
      .append($('<span>')
          .append(jpsurvData.calculate.static.yearOfDiagnosisTitle)
          .attr('title', 'Year of diagnosis label')
          .addClass('jpsurv-label-content')
      )
  );

}

function get_column_values(){
  jpsurvData.additional.has_headers=control_data.has_headers;
  jpsurvData.additional.alive_at_start=control_data.alive_at_start;
  jpsurvData.additional.died=control_data.died;
  jpsurvData.additional.lost_to_followup=control_data.lost_to_followup;
  jpsurvData.additional.exp_int=control_data.exp_int;
  jpsurvData.additional.observed=control_data.observed;
  jpsurvData.additional.interval=control_data.interval[1];
}
function addSessionVariables() {
  if(control_data.input_type==undefined)
    jpsurvData.additional.statistic = getSessionOptionInfo("Statistic");
  else if(control_data.input_type=="csv")
    jpsurvData.additional.statistic = control_data.statistic
}

function build_parameter_column() {
  set_year_of_diagnosis_select();
  set_cohort_select(Object.keys(cohort_covariance_variables));
  var covariate_options = Object.keys(cohort_covariance_variables);
  covariate_options.unshift("None");
  set_covariate_select(covariate_options);
  $("#stage2-calculate").fadeIn();

}

function parse_diagnosis_years() {
  // First we need to find the element that says "Year of Diagnosis"
  // Then we need to read the label for the previous row, this will be the name used for the title,
  // it will ALSO be the value in the array needed to find the years

  if(control_data.input_type==undefined){
    var diagnosis_row = find_year_of_diagnosis_row();
    if (diagnosis_row >= 2) {
      jpsurvData.calculate.static.yearOfDiagnosisTitle = control_data.VarAllInfo.ItemValueInDic[diagnosis_row-1];
    }
    jpsurvData.calculate.static.years = control_data.VarFormatSecList[jpsurvData.calculate.static.yearOfDiagnosisTitle].ItemValueInDic;
  }

  else if(control_data.input_type=="csv"){
    jpsurvData.calculate.static.yearOfDiagnosisTitle =control_data.year[0]
    var year_column=control_data.year[1]
    jpsurvData.calculate.static.years = control_data.data[year_column]
  }
}
function parse_cohort_covariance_variables() {
  ////console.log('parse_cohort_covariance_variables()');

  // First find the variables
  //  They are everything between the Page type and Year Of Diagnosis Label (noninclusive) with the VarName attribute
  if(control_data.input_type==undefined){
    var cohort_covariance_variable_names = get_cohort_covariance_variable_names();
    cohort_covariance_variables = new Object();
    for (var i=0; i< cohort_covariance_variable_names.length;i++) {
      ////console.log("cohort_covariance_variable_names[i] where i ="+i+" and value is "+cohort_covariance_variable_names[i])
      var cohort_covariance_variable_values = get_cohort_covariance_variable_values(cohort_covariance_variable_names[i]);
      cohort_covariance_variables[cohort_covariance_variable_names[i]] = cohort_covariance_variable_values;
    }
  }
  else if (control_data.input_type=="csv"){
    cohort_covariance_variables = new Object();
    var cohort_covariance_variable_names=control_data.cohort_names

    for (var i=0; i< control_data.cohort_names.length;i++) {
      ////console.log("cohort_covariance_variable_names[i] where i ="+i+" and value is "+cohort_covariance_variable_names[i])
      cohort_col=control_data.cohort_keys[i];
      cohort_covariance_variables[control_data.cohort_names[i]] =control_data.data[cohort_col];
    }
  }
}

function setIntervalsDefault() {
jpsurvData.additional.intervals_default = [];

  //
  // Initially select years 1 and 4
  //


  var intervals = getNumberOfIntervals();
    var selectedRange = jpsurvData.calculate.form.yearOfDiagnosisRange[1] - jpsurvData.calculate.form.yearOfDiagnosisRange[0];
    $("#interval-years").empty();
    if(control_data.input_type==undefined){
    intervals = (selectedRange < intervals ? selectedRange : intervals);
    ////console.log(intervals+" : "+selectedRange);
    var years = [];
    //Set the ranges based on interval length
    if(intervals >= 10) {
      years = [5, 10];
      jpsurvData.additional.intervals_default=years
    } else if (intervals >= 5) {
      years = [5];
      jpsurvData.additional.intervals_default=years
    } else if (intervals < 5) {
      years = [1];
      jpsurvData.additional.intervals_default=years
    }

    for (var i = 1; i <= intervals; i++) {
      if($.inArray(i, years) >= 0) {
        $("#interval-years").append($("<option>").attr("selected", "selected").text(i));
      } else {
        $("#interval-years").append($("<option>").text(i));
      }
    }

  }

  else if(control_data.input_type=="csv"){
      years = [intervals[0]];
      jpsurvData.additional.intervals_default=years

      for (var i = 0; i < intervals.length; i++) {
      if($.inArray(intervals[i], years) >= 0) {
        $("#interval-years").append($("<option>").attr("selected", "selected").text(intervals[i]));
      } else {
        $("#interval-years").append($("<option>").text(intervals[i]));
      }
    }
  }

}

function getNumberOfIntervals() {
  if(control_data.input_type==undefined)
    return parseInt(getSessionOptionInfo("NumberOfIntervals"));
  else if(control_data.input_type=="csv"){
    interval_col=control_data.interval[1]
    intervals=control_data.data[interval_col]
    return intervals
  }
}

function getSessionOptionInfo(var_name) {

  ////console.log("getSessionOptionInfo()");
  if(control_data.input_type==undefined){
    var session_value = "-1";
    var options = control_data.SessionOptionInfo.ItemNameInDic;
    $.each(control_data.SessionOptionInfo.ItemNameInDic, function(key, value) {
      if(value == var_name) {
        session_value = control_data.SessionOptionInfo.ItemValueInDic[key];
      }
    });
  }

  return session_value;
}

function get_cohort_covariance_variable_names() {
  var cohort_covariance_variable_names = [];
  var yearOfDiagnosisTitle = jpsurvData.calculate.static.yearOfDiagnosisTitle;

  if(control_data.input_type==undefined){
    var form_data = control_data;
    var names = control_data.VarAllInfo.ItemNameInDic;


    var values = control_data.VarAllInfo.ItemValueInDic;
    var regex_base = /^Var\d*Base/;
    var regex_name = /^Var\d*Name/;
    var regex_interval = /Interval/;
    var regex_year = new RegExp('Year of diagnosis|'+yearOfDiagnosisTitle);
    //Go through Item Value and look for "Year of diagnosis"
    //Push variable names on to a list called cohort_covariance_variable_names.
    for (var i=0; i<names.length; i++) {

      if (regex_interval.test(values[i])) break; //stops at a value with "Interval" in it
      if (!regex_name.test(names[i])) continue;
      if (values[i] == "Page type") continue; // Skip the Page type
      if (regex_year.test(values[i])) continue; //skips "Year of diagnosis"
      //if variable has Base for which
      cohort_covariance_variable_names.push(values[i]);
    }

  }
  else if(control_data.input_type=="csv"){
    for (var i=0; i< control_data.cohort_names.length;i++) {
      cohort_col=control_data.cohort_keys[i];
      cohort_covariance_variable_names.push(control_data.cohort_names[i]);
    }
  }
  return cohort_covariance_variable_names;
}

function get_cohort_covariance_variable_values(name) {
  return control_data.VarFormatSecList[name].ItemValueInDic;
}

function find_year_of_diagnosis_row() {

  if(control_data.input_type==undefined){
    var vals = control_data.VarAllInfo.ItemValueInDic;
    for (var i=0; i< vals.length; i++) {
      if (vals[i] == "Year of diagnosis") return i;
    }
  }
  return 0;
}

function set_year_of_diagnosis_select() {

  $("#diagnosis_title").empty().append(jpsurvData.calculate.static.yearOfDiagnosisTitle);
  for (i=0;i<jpsurvData.calculate.static.years.length;i++) {
    $("#year_of_diagnosis_start").append("<OPTION>"+jpsurvData.calculate.static.years[i]+"</OPTION>");
    $("#year_of_diagnosis_end").append("<OPTION>"+jpsurvData.calculate.static.years[i]+"</OPTION>");
  }
  //
  //Set last entry in year_of_diagnosis_end
  //
  //
  //Count the number of options in #year_of_diagnosis_end and select the last one.
  //
  var numberOfOptions = $('select#year_of_diagnosis_end option').length;
  $('#year_of_diagnosis_end option')[numberOfOptions-1].selected = true;

}

function set_cohort_select(cohort_options) {
  var max_size = 4;
  if (cohort_options.length < 4) max_size = cohort_options.length
  $("#cohort_select").attr("size", max_size);

  $("#cohort_select").empty();
  for (i=0;i<cohort_options.length;i++) {
    $("#cohort_select").append("<OPTION>"+cohort_options[i]+"</OPTION>");
  }
}

function set_covariate_select(covariate_options) {

  if(covariate_options.length == 0 ) {
  }

  $("#covariate_select").empty();
  $("#covariate_select_plot").empty();

  for (i=0;i<covariate_options.length;i++) {
    $("#covariate_select").append("<OPTION data-info=\"Selecting a covariate variable in this model assumes that the hazards are proportional to the different levels of this covariate. This might not be realistic.\">"+covariate_options[i]+"</OPTION>");
    $("#covariate_select_plot").append("<OPTION data-info=\"Selecting a covariate variable in this model assumes that the hazards are proportional to the different levels of this covariate. This might not be realistic.\">"+covariate_options[i]+"</OPTION>");
  }

}

function change_cohort_first_index_select() {
  var val = $("#cohort_value_0_select").val();
  $("#header-cohort-value").text(val);
}

function change_cohort_select() {

  alert("change_cohort_select");

  var all_selected = $("#cohort_select").val();
  $("#header-cohort-name").text(all_selected);

  var keys =  Object.keys(cohort_covariance_variables);

  $("#cohort_sub_select").empty();
  $("#covariate_select").val('None');
  $("#covariate-fieldset").hide();
  $("#covariate_sub_select").empty();
  if (all_selected != null) {
    for (var i=0;i<all_selected.length;i++) {
      for (var j=0;j<keys.length;j++) {
        if (all_selected[i] == keys[j])
          add_cohort_covariance_variable_select($("#cohort_sub_select"), "cohort_value_"+i, keys[j], cohort_covariance_variables[keys[j]]);
      }
    }
    var covariate_options = remove_items_from_set(keys, all_selected);
    $("#cohort-fieldset").show();
  } else {
    var covariate_options = keys;
    $("#cohort-fieldset").hide();
  }
  covariate_options.unshift("None");
  set_covariate_select(covariate_options);
  change_cohort_first_index_select();

}

function remove_items_from_set(big_set, removed_set) {
  var new_set = [];

  for (i=0;i<big_set.length;i++) {
    if ($.inArray(big_set[i], removed_set) == -1) new_set.push(big_set[i]);
  }


  return new_set;
}

function change_covariate_select() {

  var all_selected = $("#covariate_select").val();
  var keys =  Object.keys(cohort_covariance_variables);

  $("#covariate_sub_select").empty();


  if (all_selected != null) {
      for (var j=0;j<keys.length;j++) {
        if (all_selected == keys[j])
          add_cohort_covariance_variable_select($("#covariate_sub_select"), "covariate_value", keys[j], cohort_covariance_variables[keys[j]]);
      }
    var covariate_options = remove_items_from_set(keys, all_selected);
  } else {
    var covariate_options = keys;
  }

  if(all_selected == "None"){
    $("#covariate-fieldset").hide();
  } else {
    $("#covariate-fieldset").show();
  }


}

function add_cohort_covariance_variable_select(field, variable_name, variable_title, values) {


  var variable_select = $("<SELECT id='"+variable_name+"_select' name='"+variable_name+"_select' >");
  for (i=0;i<values.length;i++) {
    variable_select.append("<OPTION>"+values[i]+"</OPTION>");
  }
  var sub_form_div = $('<div>').addClass('col-md-6');
  sub_form_div.append(variable_select);

  var label_message = variable_title + " :";

  //Label
  var label = $("<label>")
    .append(label_message)
    .attr('for',variable_name+'_select')
    .addClass('control-label')
    .addClass('col-md-6');

  field.append($("<DIV class='sub_select'>")
      .append(label)
      .append(sub_form_div)
      );
  field.append($("<div>").css("clear","both"));

  if(field.attr('id') == "covariate_sub_select") {
    $("#"+variable_name+"_select").attr('multiple', '');
  }
  $("#cohort_value_0_select").change(change_cohort_first_index_select);
}

function build_output_format_column() {
  $("#output_format").fadeIn();
}

function jpsurvRest2(action, callback) {
  var params = getParams();

  $("#calculating-spinner").modal('show');
  //console.log('jpsurvRest2');
  //console.info(params);
  var url = 'jpsurvRest/'+action+'?'+encodeURI(params);
  var ajaxRequest = $.ajax({
    type : 'GET',
    url : url,
    contentType : 'application/json' // JSON
  });
  ajaxRequest.success(function(data) {
    //console.log("Success");
    window[callback]();
  });
  ajaxRequest.error(function(jqXHR, textStatus) {
    $("#calculating-spinner").modal('hide');
    displayCommFail("jpsurv", jqXHR, textStatus);
  });
  ajaxRequest.done(function(msg) {
    $("#calculating-spinner").modal('hide');
  });

}

function displayCommFail(id, jqXHR, textStatus) {
  console.log("textrStatus", textStatus);
  console.dir("jqXHR", jqXHR);
  console.warn("CommFail\n"+"Status: "+textStatus);
  var message;
  var errorThrown = "";
  console.warn("header: " + jqXHR
  + "\ntextStatus: " + textStatus
  + "\nerrorThrown: " + errorThrown);
  // ERROR
  if(jqXHR.status == 500) {
    message = "An unexpected error occured. Please ensure the input file(s) is in the correct format and/or correct parameters were chosen. <br>";
    message_type = 'error';
  } else {
    message = jqXHR.statusText+" ("+ textStatus + ")<br><br>";
    message += "The server is temporarily unable to service your request due to maintenance downtime or capacity problems. Please try again later.<br>";
    message += "<br>code("+jqXHR.status+")";
    message_type = 'error';
  }
  showMessage(id, message, message_type);

}
function jpsurvRest(action, params) {

  var json = (function () {
    var json = null;

    var url = 'jpsurvRest/'+action+'?'+encodeURI(params);


    $.ajax({
      'async': false,
      'global': false,
      'url': url,
      'dataType': "json",
      'success': function (data) {
        json = data;
      },
      'error' : function(jqXHR, textStatus, errorThrown) {
        //console.dir(jqXHR);
        //console.log(errorThrown);
        var id = 'jpsurv';
        console.warn("header: " + jqXHR
          + "\ntextStatus: " + textStatus
          + "\nerrorThrown: " + errorThrown);
        // ERROR
        if(errorThrown == "INTERNAL SERVER ERROR") {
          message = "An unexpected error occured. Please esnure the input file(s) is in the correct format and/or correct parameters were chosen. <br>";
          message_type = 'error';
        } else {
          message = 'Service Unavailable: ' + textStatus + "<br>";
          message += "The server is temporarily unable to service your request due to maintenance downtime or capacity problems. Please try again later.<br>";
          message_type = 'error';
        }
        showMessage(id, message, message_type);
        $("#calculating-spinner").modal('hide');

        json = '{"status":"error"}';
      }
    });
    return json;
  })();
  if(typeof json === 'object') {
  }

  return json;
}

function showMessage(id, message, message_type) {

  //
  //  Display either a warning an error.
  //
  $("#right_panel").show();
  $("#help").hide();
  $("#icon").css('visibility', 'visible');

  //console.log("Show Message");

  var css_class = "";
  var header = "";
  var container_id = id+"-message-container";
  //console.log(container_id);

  if(message_type.toUpperCase() == 'ERROR') {
    css_class = 'panel-danger';
    header = 'Error';
  } else {
    css_class = 'panel-warning';
    header = 'Warning';
  }
  $("#"+container_id).empty().show();
  $("#"+container_id).append(
    $('<div>')
      .addClass('panel')
      .addClass(css_class)
      .append(
        $('<div>')
          .addClass('panel-heading')
          .append(header)
          )
      .append(
        $('<div>')
          .addClass('panel-body')
          .append(message)
          )
    );
}

function load_ajax(filename) {
  ////console.log(filename);
  var json = (function () {
    var json = null;
    // // var url = '/jpsruv/tmp/'+filename;
    var url = 'tmp/'+filename;
    $.ajax({
          'async': false,
          'global': false,
          'url': url,
          'dataType': "json",
          'success': function (data) {
            json = data;
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
        return undefined;
       }
        });
        return json;
    })();
  return json;
}

function getUrlParameter(sParam,abbr) {
  var sPageURL = window.location.search.substring(1);
  var sURLVariables = sPageURL.split('&');

  for (var i = 0; i < sURLVariables.length; i++) {
    var sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] == sParam)
    {
      if(abbr==true&&sParameterName[1].length>30){
        start=sParameterName[1].substring(0,14);
        end=sParameterName[1].substring(sParameterName[1].length-15);
        name=start+"..."+end;
        return name;
      }
      else{
        return sParameterName[1];
      }
    }
  }
}

function inspect(object) {
  //console.log(typeof object);
  //console.dir(object);

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
    if (typeof object != "object")
        return "Invalid object";
    if (typeof result == "undefined")
        result = '';

    if (result.length > 50)
        return "[RECURSION TOO DEEP. ABORTING.]";

    var rows = [];
    for (var property in object) {
        var datatype = typeof object[property];

        var tempDescription = result+'"'+property+'"';
        tempDescription += ' ('+datatype+') => ';
        if (datatype == "object")
            tempDescription += 'object: '+objectInspector(object[property],result+'  ');
        else
            tempDescription += object[property];

        rows.push(tempDescription);
    }//Close for

    return rows.join(result+"\n");
}//End objectInspector

$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
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

function openHelpWindow(pageURL) {
    var helpWin = window.open(pageURL, "Help", "alwaysRaised,dependent,status,scrollbars,resizable,width=1000,height=800");
    helpWin.focus();
}

function slideToggle() {
  $("#slideout").toggleClass("slide");
}

function Slide_menu_Horz(action) {

  if($("#icon").hasClass("fa fa-caret-left fa-2x")||action=='hide')
    {
       $('#icon').removeClass("fa fa-caret-left fa-2x");
       $('#icon').addClass("fa fa-caret-right fa-2x");
       $("#slideoutForm").fadeOut(300);


       $("#icon").animate({
        marginLeft: '1%',
    }, 300);

      $("#slideoutForm").animate({
        transform: 'translate(-400px, 0px)',
    }, 300);

      setTimeout(function(){
        $("#right_panel").animate({
      }, 300);

    $("#right_panel").removeClass("col-lg-7");
    $("#right_panel").removeClass("col-md-7");



    $("#right_panel").addClass("col-lg-12");
    $("#right_panel").addClass("col-md-12");
    }, 300);



    }
    else if($("#icon").hasClass("fa fa-caret-right fa-2x")||action=='show')
    {
       $('#icon').removeClass("fa fa-caret-right fa-2x");
       $('#icon').addClass("fa fa-caret-left fa-2x");
       $("#slideoutForm").fadeIn(500);
       $("#right_panel").removeClass("col-lg-12");
       $("#right_panel").removeClass("col-md-12");

       $("#right_panel").addClass("col-lg-7");
       $("#right_panel").addClass("col-md-7");
       left_panel_width=$("#slideoutTab").width();

       $("#icon").animate({
        marginLeft: "100%"
    }, 20);

  }
}

function Slide_menu_Vert(Id,action){

  if($("#"+Id).css('display') != 'none' &&action=='both'||action=='hide')
  {
    $("#"+Id).animate({height:"0px", opacity:0}, 300);
      setTimeout(function(){
        document.getElementById(Id).style.display="none";
    }, 299);

    }
    else if($("#"+Id).css('display') == 'none' &&action=='both'||action=='show')
    {
        document.getElementById(Id).style.display="block";
        $("#"+Id).animate({
        height: "400px",
        opacity:1
      }, 300);
    }
}

function decimalPlaces(num) {


  var match = (''+num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) {
    return 0;
  }

  //console.dir(match);

  var answer = Math.max(0,
       // Number of digits right of decimal point.
       (match[1] ? match[1].length : 0)
       // Adjust for scientific notation.
       - (match[2] ? +match[2] : 0));
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
    $('#' + id + '-message-warning-content').empty().append(data.warning);
    //hide error
    $('#' + id + '-message').hide();
  }

  if (data.error) {
    // ERROR
    $('#' + id + '-message').show();
    $('#' + id + '-message-content').empty().append(data.error);
    //hide warning
    $('#' + id + '-message-warning').hide();

    //matrix specific
    $('#'+id+"-download-links").hide();

    $('#'+id+"-results-container").hide();

    error = true;
  }
  return error;
}

function getRestServerStatus() {

  var id = "jpsurv-help";

  //console.log("getRestServerStatus");



  var url = "jpsurvRest/status";
  var ajaxRequest = $.ajax({
    url : url,
    async :false,
    contentType : 'application/json' // JSON
  });
  ajaxRequest.success(function(data) {

    $("#"+id+"-message-container").hide();
    if (displayError(id, data) == false) {

      $("#upload-form").submit();
    }
  });
  ajaxRequest.fail(function(jqXHR, textStatus) {
    //console.log("ajaxRequetst.fail");
    //console.dir(jqXHR);
    //console.log(textStatus);
    displayCommFail(id, jqXHR, textStatus);
  });
    ajaxRequest.error(function(jqXHR, textStatus) {
    $("#calculating-spinner").modal('hide');
    displayCommFail("jpsurv", jqXHR, textStatus);
  });

}

function certifyResults() {
  if(jpsurvData.results.IntData.RelSurIntData!=undefined){
    $.each(jpsurvData.results.IntData.RelSurIntData, function(index, value) {

      if(index.substring(0,1) == "X" ) {
        //console.log("jpsurvData.results.RelSurIntData look corrupt:");
        //console.dir(jpsurvData.results.IntData.RelSurIntData);
        $("#right_panel").hide();
        okAlert("RelSurIntData is corrupt:<br><br>"+JSON.stringify(jpsurvData.results.IntData.RelSurIntData), "Corrupt Data");
        return false;
      }
    });
  }
  return true;
}

function renewTokenId(refresh_url) {

  var tokenId = Math.floor(Math.random() * (999999 - 100000 + 1));
  jpsurvData.plot.static.imageId = -1;
  //console.warn(tokenId);
  if(refresh_url == true) {
    setUrlParameter("tokenId", tokenId.toString());
    setUrlParameter("request", "false");
  }

  return tokenId.toString();
}

function setUrlParameter(sParam, value) {
  var sPageURL = window.location.search.substring(1);
  //console.log(sPageURL);
  //console.log("So you want to change %s to %s", sParam, value);

  var sURLVariables = sPageURL.split('&');
  //console.dir(sURLVariables);
  $.each(sURLVariables, function(key, content) {
    var sParameterName = content.split('=');
    //console.dir(sParameterName);
    if (sParameterName[0] == sParam) {
      sURLVariables[key] = sParameterName[0]+"="+value;
    }
    //console.log(sURLVariables[key]);
  });

  //console.log("Here is your new url");
  //console.dir(sURLVariables);
  //console.log("Put this back on the url");
  //console.log("Will this work: "+sURLVariables.join("&"))
    window.history.pushState({},'', "?"+sURLVariables.join("&"));

  //console.log(window.location.search.substring(1));


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
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length,c.length);
        }
    }
    return "";
}
$( "#csv" ).click(function() {
  jpsurvData.input_type="csv";
  $("#dic_container").hide();
  $("#import_container").hide()
  $("#csv_container").show();
  $('#upload_file_submit').prop("disabled",true);
  checkInputFiles();

});

$( "#dic" ).click(function() {
  jpsurvData.input_type="dic";
  $("#csv_container").hide();
  $("#import_container").hide()
  $("#dic_container").show();
    $('#upload_file_submit').prop("disabled",true);

  checkInputFiles();

});

$("#importRadioButton").click(function() {
  $("#csv_container").hide();
  $("#dic_container").hide();
  $("#import_container").show()

  checkInputFiles()
})


//MODAL CONTENT BELOW!!/////////////////
$('#Adv_input').click(function() {
   if(first_modal==true)
      Read_csv_file()
  else{
    $('#modal').modal('show')
    var type=$('#data_type').val()
    $('option[id="observed"]').text(type)

}
})

function Read_csv_file(){
   var fileInput = $('#file_control_csv');
  fileInput = fileInput[0];
  var file = fileInput.files[0];
  var filereader = new FileReader();
  var content="";
    var has_headers=$('#has_headers').is(':checked')
  lines=parseInt($('#lines_displayed').val())
  if(first_modal==true){
    lines=19
    has_headers=true

}

  filereader.onload = function(event) { create_table(event.currentTarget.result,lines,has_headers)}
  filereader.readAsText(file);

}





var template_string='<div class="modal fade" id="modal" tabindex="-1" role="dialog">'
  +'<div class="modal-dialog  modal-lg" role="document">'
    +'<div class="modal-content" >'
      +'<div class="modal-header">'
        +'<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span></button>'
        +'<b><h2 class="modal-title" id="modalTitle">Modal title</h4></b>'
      +'</div>'
      +'<div class="modal-body"><div id ="container" >'
      +'<fieldset style="padding:0 0 .75em"><legend   style="font-size: 12px;margin-bottom:12px"><h4><span style="margin-right:80%">Delimiters</span></h4></legend>'
        +'<div id="dels" class="row" style="padding-left:12.5%">'
            +'<div style="width:25%; display:inline-block"><input type="radio" id="comma" name="del" value="," aria-label="comma" checked/>Comma</div>'
            +'<div style="width:25% ;display:inline-block"><input type="radio" id="tab"   name="del" value=" " aria-label="tab"/>Tab</div>'
            +'<div style="width:25%; display:inline-block"><input type="radio" id="colan" name="del" value=";" aria-label="colan"/>Semi-Colon</div>'
            +'<div style="width:25%; display:inline-block"><input type="radio" id="space" name="del" value=" " aria-label="sapce"/>Space</div>'
        +'</div>'
      +'</fieldset></br>'
      +'<label for="has_headers" id="csv_label_headers" style="margin-bottom:1%">Does the file contain headers?  </label>'

      +'<input type="checkbox" name="has_headers" id="has_headers" value="yes" checked></br>'
      +'<label for="data_type" id="csv_label_data">Data Type:  </label>'
               +'<select id="data_type" class="jpsurv-label-content" name="data_type" aria-label="data_type" style="margin-bottom:1%">'
                +'<option>Relative Survival</option>'
                +'<option>Cause-Specific Survival</option>'
               +'</select>'
      +'<label for="rates_display" id="csv_label_rates" style="margin-left:1%">Rates Displayed As:  </label>'
               +'<select id="rates_display" class="jpsurv-label-content" name="rates_display" aria-label="rates_display" style="margin-bottom:1%">'
                +'<option>Percents</option>'
                +'<option>Proportions</option>'
               +'</select></br>'
      +'Displaying <select id="lines_displayed" class="jpsurv-label-content" name="lines_displayed" aria-label="display lines">'
                      +'<option>20</option>'
                      +'<option>30</option>'
                      +'<option>40</option>'
                      +'<option>50</option>'
                      +'<option>60</option>'
                    +'</select> lines of the data file</br></br>'
      +'<span>Please map <b><i>all</i></b> required parameters to the appropriate columns (see help for details)</span>'
      +'<div id="modalContent"><table id="data_table" class="table table-striped" style="height:100px;border-top:none;border-left:none;line-height:0" cellspacing:"0" cellpadding="0px" width="100%"></table>'
      +'</div><button type="button" id="save" class="btn btn-primary btn-sm" style="margin-left:45%;margin-top:1%;display:inline-block" onclick=\"save_params()\" >Save</button></button><button type="button" id="cancel" class="btn btn-primary btn-sm" style="display:inline-block;margin-left:5%;margin-top:1%"">Cancel</button>'
      +'</div></div></div></div>';

var selector= '<select id="column_values" class="jpsurv-label-content" name="data_type" aria-label="column values">'
                      +'<option></option>'
                      +'<option>Cohort</option>'
                      +'<option>Year</option>'
                      +'<option>Interval</option>'
                      +'<option>Number.Dead</option>'
                      +'<option>Number.Alive</option>'
                      +'<option>Number.Lost</option>'
                      +'<option>Expected.Survival</option>'
                      +'<option id="observed">observedrelsurv</option>'

              +'</select>';


function createModal() {
  var header = "CSV Configuration";
  $('body').append($(template_string));
  $('#modalTitle').html(header);
  $("#data_type").change(function(){

    var type=$('#data_type').val()
    $('option[id="observed"]').text(type)
  });


  $('#modal').modal({backdrop: 'static', keyboard: false})
  setTimeout(function(){ Read_csv_file() }, 1);



  $('#cancel').click(function() {
    checkInputFiles();
      $('#modal').modal('hide');

  });

    $("#has_headers").on('change', function(e){
    Read_csv_file()
  });

$('#lines_displayed').change(function() {
Read_csv_file()

});
//populating drop down values from previous saved paramaters
  if(jpsurvData.mapping.cohorts!=undefined){
    length=$( "#data_table th" ).length/2
    for (var i = 0; i < length; i ++) {
      if(jpsurvData.mapping.cohorts.indexOf(i+1)!=-1){
          $('#type_'+i+' select').val("Cohort")
        }
      else if (jpsurvData.mapping.year==i+1)
      {
        $('#type_'+i+' select').val("Year")
      }

      else if (jpsurvData.mapping.interval==i+1)
      {
        $('#type_'+i+' select').val("Interval")
      }

      else if (jpsurvData.mapping.died==i+1)
      {
        $('#type_'+i+' select').val("Number.Dead")
      }

      else if ( jpsurvData.mapping.alive_at_start==i+1)
      {
        $('#type_'+i+' select').val("Number.Alive")
      }

      else if (jpsurvData.mapping.lost_to_followup==i+1)
      {
        $('#type_'+i+' select').val("Number.Lost")
      }

      else if (jpsurvData.mapping.exp_int==i+1)
      {
        $('#type_'+i+' select').val("Expected.Survival")
      }

      else if (jpsurvData.mapping.observed==i+1)
      {
        var type=$('#data_type').val()
        $('#type_'+i+' select').val(type)
      }

    }

  }

  $('#modal').modal('show')


}
function save_params() {
  //Mapping selected drop down values to json
    var params = ['year','interval','died','alive_at_start','lost_to_followup','exp_int','observed'];
    jpsurvData.mapping.cohorts=[]
    length=$( "#data_table th" ).length
    var type=$('#data_type').val()
   for (var i = 0; i < length; i ++) {
      value=$('#type_'+i+' select').val()
      if(value=="Cohort"){
        jpsurvData.mapping.cohorts.push(i+1)
      }
      else if (value=="Year")
      {
        jpsurvData.mapping.year=i+1
      }

      else if (value=="Interval")
      {
        jpsurvData.mapping.interval=i+1
      }

      else if (value=="Number.Dead")
      {
        jpsurvData.mapping.died=i+1
      }

      else if (value=="Number.Alive")
      {
        jpsurvData.mapping.alive_at_start=i+1
      }

      else if (value=="Number.Lost")
      {
        jpsurvData.mapping.lost_to_followup=i+1
      }

      else if (value=="Expected.Survival")
      {
        jpsurvData.mapping.exp_int=i+1
      }

      else if (value==type)
      {
        jpsurvData.mapping.observed=i+1
      }
   }
    var passed=true;
  jpsurvData.additional.del=$("input[name=del]:checked").val()
  jpsurvData.additional.rates=$("#rates_display").val()
    jpsurvData.passed=true

       for (var i=0;i<params.length;i++){
          if(jpsurvData.mapping[params[i]]==undefined){
            alert("Please choose all necessary parameters to continue")
            //console.log("Please choose all necessary parameters to continue")
            passed=false;
            jpsurvData.passed=false
            break;
          }
       }
       //console.log(jpsurvData.mapping.cohorts)
       if(passed==true){
          checkInputFiles()
          $('#modal').modal('hide');
       }


  }
function create_table(content,rows,has_headers){
  if(first_modal==true)
    createModal();
  var arr=content.split("\n");
  if(content.indexOf(",") !== -1){
    $("#comma").prop("checked", true)
    var matrix=arr.map(function(line) { return line.split(',') })
  }
  else if(content.indexOf(";") !== -1){
    $("#colan").prop("checked", true)
    var matrix=arr.map(function(line) { return line.split(";") })
  }
  else if(content.indexOf("\t") !== -1){
    $("#tab").prop("checked", true)
    var matrix=arr.map(function(line) { return line.split('\t') })
  }
  else if(content.indexOf(" ") !== -1){
    $("#space").prop("checked", true)
    var matrix=arr.map(function(line) { return line.split(' ') })
  }

  //reads csv file headers to be placed in text box and reads he first row to act as the "headers" ofthe datatable
  if(has_headers==true){
    var headers=matrix[0].map(function(header) {
      return {
        title: header
      }
    });
    matrix.shift();

    var first_row=matrix[0].map(function(first) {
      return {
        title: first
      }
    });

  }
    //reads csv file if no headers are present and places a generic V1, V2 etc as the editable header row.

  else{
    counter=0;
    var headers=matrix[0].map(function(column) {
      counter++;
      return {
        title: "V"+counter
      }
    });

      var first_row=matrix[0].map(function(first) {
      counter++;
      return {
        title: first
      }
    });
  }
  //console.log(headers);
  //console.log(matrix);

data_table(matrix,first_row,rows)
var html=""

if(first_modal==true){
  var header = $('#modalContent thead').first()
  var headerRow = $('<tr id="header_row">')
  var selector_row = $('<tr>')

  for (var i = 0; i < headers.length; i ++) {
    var title = headers[i].title
    var selectHeader = $('<th  scope="col" id="type_'+i+'" style="border-left:1px solid white;border-right:1px solid white;padding:8px 3px 8px 3px"/>')
    var text_box_headers = $('<th scope="col" style="padding:0 0 0 0" id="textboxes">&#8204<input type="text" id="header_'+i+'" style="width:100%;text-align:center;border:none;border: 1px solid #ddd;font-weight:bold" value="'+title+'" aria-label="textbox"/></th>')

    headerRow.append(text_box_headers)

    selectHeader.html(selector)
    selector_row.append(selectHeader)
  }

  header.prepend(headerRow)
  header.prepend(selector_row)
  var type=$('#data_type').val()
  $('option[id="observed"]').text(type)

  first_modal=false
}

else{
  for (var i = 0; i < headers.length; i ++) {
    var title = headers[i].title
     $('#header_'+i).val(title);

  }
}

}

function myCallbackFunction(updatedCell, updatedRow, oldValue) {
    //console.log("The new value for the cell is: " + updatedCell.data());
    //console.log("The old value for that cell was: " + oldValue);
    //console.log("The values for each cell in that row are: " + updatedRow.data());
}

function data_table(matrix,headers,rows){
 var table=   $('#data_table').DataTable({
    columns: headers,
    data: matrix.slice(1,rows+1),
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


  })

}

$(document).ready(function(){
  $("#max_help").popover({
    html: true,
    content: "Most common situation is to have 0 or 1 joinpoint since survival trends change gradually. Begin with small number of joinpoints. Increase the number if there is not a good fit or to be sure you capture all joinpoints. Computation time increases exponentially with number of joinpoints tested.",
    title:'Maximum Joinpoints<a class="close" href="#");">&times;</a>',
    template: '<div class="popover" stylle="width:100%"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>'
  });
 // $('a[rel=popover]').addClass('custom_popover');
 $.ajaxSetup({ cache: false });

});

$(document).click(function (e) {

    if ($(e.target).is('.close'))
      $('#max_help').popover('hide');

});

// A routine to determine if there is a calcuation in the system.  This is done by verifying that stage2 is complete
// meaning the calculations are done and the panel that contains the calculations is visible.
function analysisDisplayed() {
    return  ( jpsurvData.stage2completed && $("#right_panel:visible").length == 1) ? true : false
}





