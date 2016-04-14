var jpsurv_version = "1.0";

var restService = {protocol:'http',hostname:document.location.hostname,fqn:"nci.nih.gov",route : "jpsurvRest"}
var restServerUrl = restService.protocol + "://" + restService.hostname + "/"+ restService.route;

var control_data;
var cohort_covariance_variables;
var jpsurvData = {"file":{"dictionary":"Breast.dic","data":"something.txt", "form":"form-983832.json"}, "calculate":{"form": {"yearOfDiagnosisRange":[]}, "static":{}}, "plot":{"form": {}, "static":{"imageId":0} }, "additional":{"headerJoinPoints":0,"yearOfDiagnosis":null,"intervals":[1,4]}, "tokenId":"unknown", "status":"unknown", "stage2completed":0};

var DEBUG = false;
var maxJP = (DEBUG ? 0 : 2);

if(getUrlParameter('tokenId')) {
	jpsurvData.tokenId = getUrlParameter('tokenId');
}
if(getUrlParameter('status')) {
	jpsurvData.status = getUrlParameter('status');
}

$(document).ready(function() {
	loadHelp();
	addEventListeners();
	addMessages();
	addTools();
	addInputSection();
	if(DEBUG) {
		console.warn("%cDEBUG is on", "color:white; background-color:red");
		$("#year_of_diagnosis_start").val("1975");
		$("#year_of_diagnosis_end").val("1985");
	}
});

function checkEmail(email) {
	var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	var result = re.test(email);
	//console.dir(result);

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
		console.log("setting error message: "+errorMsg);
		$("#"+id).setCustomValidity(hasError ? errorMsg : '');
    }
    // Not supported by the browser, fallback to manual error display...

}

function addEventListeners() {

	$('#e-mail').on('keyup', validateEmail);

	$("#max_join_point_select").on('change', function(e){
		//console.log("%s:%s",maxJP, $("#max_join_point_select").val());
		if(parseInt($("#max_join_point_select").val())>maxJP) {
			//console.log("fadeIn()");
			$(".e-mail-grp").fadeIn();
			$("#calculate").val("Submit");
			validateEmail();
		} else {
			//console.log("fadeOut()");
			$(".e-mail-grp").fadeOut();
			$("#calculate").val("Calculate");
			$("#calculate").prop("disabled", false);
		}
	});
	$("#trends-tab-anchor").click(function(e) {
		//console.warn("You clicked on trends-tab-anchor");
		//Need to figure out this variable...
		if(jpsurvData.stage2completed && jpsurvData.recentTrends == 0) {
			$("#calculating-spinner").modal('show');
			setTimeout(calculateTrend(jpsurvData.tokenId), 1000);
		}
	});
	
	$("#icon").on('click', slideToggle);

	//$("#covariate_select").on("change", onChange_covariate); 
	//$("#max_join_point_select").on("change", onChange_joints); 
	//Select Joinpoint
	$(document).on('click', '#model-selection-table tbody tr', function(e) {
		e.stopPropagation();
		$(this).addClass('info').siblings().removeClass('info'); 
		if(jpsurvData.additional.headerJoinPoints == this.rowIndex - 1) {
			return;
		}
		jpsurvData.additional.headerJoinPoints = this.rowIndex - 1;
		//console.log("headerJoinPoints: "+jpsurvData.additional.headerJoinPoints);
		setCalculateData();
    });

	$("#cohort_select").on("change", change_cohort_select);
	$("#covariate_select").on("change", change_covariate_select);
	$("#precision").on("change", changePrecision);

	$("#upload_file_submit").click(function(event) { 
		file_submit(event);
	});
	$("#year-of-diagnosis").on('change', setCalculateData);
	$("#recalculate").on('click', setCalculateData);
	//
	// Set click listeners
	//
	$("#calculate").on("click", function() { 
		//Reset main calculation.  This forces a rebuild R Database
		jpsurvData.stage2completed = false;
		setCalculateData("default");
	});

	//$("#calculate").on("click", show_graph_temp);
	$("#file_data").on("change", checkInputFiles);
	$("#file_control").on("change", checkInputFiles);
	//$("#parameters").on("change", checkPlotStatus);
	//$("#plot").on("click", showPlot);
	//Checking Plot parameters
//	$("#covariate_value_select").on("change", checkPlotParameters);
//	$("#plot_intervals").on("change", checkPlotParameters);
//	$("#covariate-fieldset").on("click", "#covariate_value_select", checkPlotParameters);
	//$("#data-set").on("click", getDownloadOutput);
	$( "#upload-form" ).on("submit", function( event ) {

		//event.preventDefault();
		//console.log("submitting files");

	});

	$("#cohort-variables").on('click', ".cohort", function(e) {
		$("."+this.classList.item(1)).attr('checked', false);
		$(this).prop('checked', true);
	});

}

function addMessages() {
	var e_mail_msg = "Maximum Joinpoints greater than "+maxJP+" requires additional computing time.  When computation is completed a notification will be sent to the e-mail entered below.";
	$("#e-mail-msg").text(e_mail_msg);

	$("#jpsurv-help-message-container").hide();
}

function addInputSection() {

	var status = getUrlParameter('status');
	if(status == "uploaded") {

		setUploadData();
		control_data = load_ajax("form-" + jpsurvData.tokenId + ".json");
		load_form();

		$('#file_control_container')
			.empty()
			.append($('<div>')
				.addClass('jpsurv-label-container')
				.append($('<span>')
					.append('Dictionary File:')
					.addClass('jpsurv-label')
				)
				.append($('<span>')
					.append(getUrlParameter('file_control_filename'))
					.attr('title', getUrlParameter('file_control_filename'))
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
	//					.append(jpTrim(getUrlParameter('file_data_filename'), 30))
				.append($('<span>')
					.append(getUrlParameter('file_data_filename'))
					.attr('title', getUrlParameter('file_data_filename'))
					.addClass('jpsurv-label-content')
				)
			);
		$('#data_type_container')
			.empty()
			.append($('<div>')
				.addClass('jpsurv-label-container')
				.append($('<span>')
					.append('Data Type:')
					.addClass('jpsurv-label')
				)
	//					.append(jpTrim(getUrlParameter('file_data_filename'), 30))
				.append($('<span>')
					.append(jpsurvData.additional.statistic)
					.attr('title', "Type of data is "+jpsurvData.additional.statistic)
					.addClass('jpsurv-label-content')
				)
			);

		$('#upload_file_submit_container').remove();
		//console.log(file_control_output	);
		//var file_data_output = load_ajax(getUrlParameter('file_data_filename'));
	}
	if(getUrlParameter('request') == "true") {
		//console.log("preLoadValues");
		preLoadValues();
	}
}

function preLoadValues() {

	var inputData = load_ajax("input_" + jpsurvData.tokenId + ".json");
	
	//console.warn("inputData");
	//console.dir(inputData);

	//Form section
	$("#year_of_diagnosis_start").val(inputData.calculate.form.yearOfDiagnosisRange[0]);
	$("#year_of_diagnosis_end").val(inputData.calculate.form.yearOfDiagnosisRange[1]);

	$("#cohort-variables fieldset").each(function(index,element) {
		var inputs = $(element).find("."+element.id);
		$.each(inputs, function(index2, element2) {
			if(inputData.calculate.form.cohortValues[index].substr(1,inputData.calculate.form.cohortValues[index].length -2) == $(element2).val()) {
				$(element2).attr('checked', true);
			} else {
				$(element2).attr('checked', false);
			}
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

	//Set jpsurvData and update everything....
	jpsurvData = inputData;
	setIntervalsDefault();
	getIntervals();
	stage2("no calculate"); // This is the initial calculation and setup.
	retrieveResults();

}

function addTools() {
	$('[data-toggle="tooltip"]').tooltip({container: 'body'});
}

function updateCohortDisplay() {
	//jpsurvData.calculate.form.cohortVars = ["Age groups", "Breast stage"];
	jpsurvData.calculate.form.cohortValues = [];

	var cohort_message = ""
	$("#cohort-variables fieldset").each(function(index,element) {
		//console.warn(index+" : "+element);
		//console.log(element.id);
		//console.log($(element).attr('data-cohort'))
		cohort_message += $(element).attr('data-cohort');

		//jpsurvData.calculate.form.cohortValues.push($(element).attr('data-cohort'));
		//Go through each checkbox to see which one is checked
  		var inputs = $(element).find("."+element.id);
  		//console.log("inputs length: "+inputs.length);
		//Go through each checkbox to see which one is checked
		$.each(inputs, function(index2, element2) {
			//console.log($(element2).val()+" "+$(element2).prop('checked'));
			if($(element2).prop('checked')){
				cohort_message +=' "'+$(element2).val()+'"';
				jpsurvData.calculate.form.cohortValues.push('"'+$(element2).val()+'"');
			}
		});
		if(index < jpsurvData.calculate.form.cohortVars.length-1) {
			cohort_message += " and "
		}
	});
	
	//console.log(cohort_message);
	//console.warn("form data");
	//console.dir(jpsurvData.calculate.form);


/*
		jpsurvData.calculate.form.cohortValues = [];

		$.each(jpsurvData.calculate.form.cohortVars, function( index, value ) {
			jpsurvData.calculate.form.cohortValues.push('"'+$('#cohort_value_'+index+'_select').val()+'"');
		});
*/
	$("#cohort-display").text(cohort_message);

	$("#cohort-variables fieldset").each(function(index,element) {
		//console.warn(index+" : "+element);
	});
	//console.log("Hello");
	//console.warn("control_data");
	//console.dir(control_data);
	var i=0;
	var html = "";
	$("#something").empty();
	$.each(cohort_covariance_variables, function(key, value) {
		//console.warn("cohort-i: cohort-"+i);
		//console.info(key+": "+value);
		//alert("cohort"+i);
		//$.each(control_data.VarFormatSecList[key].ItemValueInDic, function(key2, value2) {
		//var v		$("#cohort-"+i).find('input').filter(":first").attr('checked', true);
		$('#something').append(value+" and");
		i++;
	});

}

function addCohortVariables() {
	//console.warn("control_data");
	//console.dir(control_data);
	jpsurvData.calculate.form.cohortVars = [];

	var i=0;
	var html = "";
	$.each(cohort_covariance_variables, function(key, value) {
		jpsurvData.calculate.form.cohortVars.push(key);
		//console.warn("cohort-i: cohort-"+i);
		//console.info(key+": "+value);
		//alert("cohort"+i);
		html = '<div class="row"><div class="col-md-12"><fieldset id="cohort-'+i+'" data-cohort="'+key+'"><legend><span class="jpsurv-label">'+key+':</span></legend></fieldset></div></div>';
		$("#cohort-variables").append(html);
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
					)
				);
		});
		$("#cohort-"+i).find('input').filter(":first").prop('checked', true);
		i++;
	});
	updateCohortDisplay();
}

function loadHelp() {
	$("#help-tab").load("help.html");
	$("#help").append($("<div>").load("description.html"));
}

function checkInputFiles() {
	//If both files are filed out then enable the Upload Files Button
	var file_control = $("#file_control").val();
	var file_data = $("#file_data").val();

	if(file_control.length > 0 && file_data.length > 0) {
		$("#upload_file_submit").removeAttr('disabled');
		$("#upload_file_submit").attr('title', 'Upload Input Files');
	}
}

// set Data after STAGE 1
function setUploadData() {
	//console.log("setUploadData() - after STAGE 1");
	//console.dir(jpsurvData);
	//Set Stage 1 upload data to jpsurvData
	//Set file data
	jpsurvData.file.dictionary = getUrlParameter('file_control_filename');
	jpsurvData.file.data = getUrlParameter('file_data_filename');
	jpsurvData.file.form = getUrlParameter('output_filename');
	jpsurvData.status = getUrlParameter('status');
}

function setupModel() {

	if(jpsurvData.results.SelectedModel == "NA") {
		//console.warn("jpsurvData.results.SelectedModel is NA.  Changing to 0");
		jpsurvData.results.SelectedModel = 1;
	}
	/*
	console.log("SelectedModel:%s, headerJP:%s, stage2completed:%s",
		jpsurvData.results.SelectedModel, 
		jpsurvData.additional.headerJoinPoints,
		jpsurvData.stage2completed);
	*/
	//Set SelectedModel to headerJoinPoints
	jpsurvData.additional.headerJoinPoints = jpsurvData.results.SelectedModel-1;
	
}

function createModelSelection() {

	setupModel();

	//console.warn("updateModel");
	//console.log("SELECTED MODEL = "+jpsurvData.results.SelectedModel);

	var ModelSelection = JSON.parse(jpsurvData.results.ModelSelection);
	//console.info("Triforce");
	//console.info("jpsurvData.stage2completed is "+jpsurvData.stage2completed);
	//console.info("headerJoinPoints is "+jpsurvData.additional.headerJoinPoints);
	//console.info("stage2completed is "+jpsurvData.stage2completed);

	$("#model-selection-table > tbody").empty();
	var jp = 0;
	var title = "Click row to change Number of Joinpoints to "
	$.each(ModelSelection, function( index, value ) {
		//console.log( index + ": " + value);
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

	/*
	console.log("SelectedModel:%s, headerJP:%s, stage2completed:%s",
		jpsurvData.results.SelectedModel, 
		jpsurvData.additional.headerJoinPoints,
		jpsurvData.stage2completed);
	*/

	$("#estimates-coefficients > tbody").empty();
	var row;
	var xvectors = jpsurvData.results.Xvectors.split(",");
	var estimates = jpsurvData.results.Estimates.split(",");
	var std_error = jpsurvData.results.Std_Error.split(",");

//	console.log(typeof xvectors);
//	console.dir(xvectors);
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
	$("#graph-year-tab").find( "img" ).attr("src", "tmp/plot_Year-"+token_id+"-"+jpsurvData.plot.static.imageId+".png");
	$("#graph-year-table > tbody").empty();
	$("#graph-year-table > tbody").append('<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>');

	//Populate time-year
	$("#graph-time-tab").find( "img" ).show();
	$("#graph-time-tab").find( "img" ).attr("src", "tmp/plot_Int-"+token_id+"-"+jpsurvData.plot.static.imageId+".png");

	//console.log("updateGraph: RelSurYearData");
	//console.dir(jpsurvData.results.RelSurYearData);

	var row;
	//console.info("About to make the table");
	//console.dir(jpsurvData.calculate.form);
	//var vars = ["Interval", "Died", "Alive_at_Start", "Lost_to_Followup", "Expected_Survival_Interval", "Relative_Survival_Cum", "pred_int", "pred_cum", "pred_int_se", "pred_cum_se"];
	//vars.unshift(jpsurvData.calculate.static.yearOfDiagnosisVarName);
	//console.warn("vars");
	//console.log(jpsurvData.calculate.static.yearOfDiagnosisVarName);

	var header = [];
	var newVars = [];
	var tableVar = "RelSurvYearData.";
	//Add the cohort variables to the header
	$.each(jpsurvData.calculate.form.cohortVars, function(index, value) {
		//console.log("HEADER: adding value "+value);
		header.push(value);
	});
	//Add the other variables to the header
	$.each(jpsurvData.results, function(index, value) {
		//console.warn(index);
		//console.log(index.search(tableVar));
		if(index.search(tableVar) == 0) {
			//console.log("Got one: "+index.substr(tableVar.length));
			newVars.push(index.substr(tableVar.length));
		}
	});
	header.push.apply(header, newVars);
	//Put all the keys  on the header
	//Create the header
	$("#graph-year-table > thead").empty();
	row = "<tr>";
	$.each(header, function( index, value ) {
		row += "<th>"+value.replace(/_/g, " ")+"</th>";
	});
	row += "</tr>/n";
	$("#graph-year-table > thead").append(row);

	//Add the body of Year table
	var yodVarName = jpsurvData.calculate.static.yearOfDiagnosisVarName.replace(/\(|\)|-/g, "");

	var yod = jpsurvData.results["RelSurvYearData."+yodVarName];
	//console.warn("yod");
	//console.log("yes");
	//console.log(yod);
	//console.log("no");

	$("#graph-year-table > tbody").empty();
	$.each(yod, function( index, value ) {
		row = "<tr>";
		$.each(jpsurvData.calculate.form.cohortValues, function(index2, value2) {
			row += "<td>"+value2.replace(/"/g, "")+"</td>";
		});
		$.each(newVars, function( index3, value3 ) {
			row += formatCell(jpsurvData.results["RelSurvYearData."+value3][index]);
		});
		row += "</tr>/n";
		$("#graph-year-table > tbody").append(row);
	});
	//console.log("Got here A");
	//
	//Add the Time Table
	//
	yod = jpsurvData.results.RelSurIntData[yodVarName];
	header = [];
	$.each(jpsurvData.calculate.form.cohortVars, function(index, value) {
		header.push(value);
	});
	//console.dir(jpsurvData);
	//console.log("graph-time-table: RelSurIntData");
	//console.dir(jpsurvData.results.RelSurIntData);
	var timeHeader = ["Year of Diagnosis", "Interval", "Cumulative Relative Survival", "Predicted Cumulative Relative Survival"];
	header.push.apply(header, timeHeader);
	//Create the header
	$("#graph-time-table > thead").empty();
	row = "<tr>";
	$.each(header, function( index, value ) {
		row += "<th>"+value.replace(/_/g, " ")+"</th>";
	});
	row += "</tr>/n";
	$("#graph-time-table > thead").append(row);

	$("#graph-time-table > tbody").empty();
	$.each(yod, function( index, value ) {
		row = "<tr>";
		$.each(jpsurvData.calculate.form.cohortValues, function(index2, value2) {
			row += "<td>"+value2.replace(/"/g, "")+"</td>";
		});
		row += "<td>"+value+"</td>";
		row += formatCell(jpsurvData.results.RelSurIntData.Interval[index]);
		row += formatCell(jpsurvData.results.RelSurIntData[jpsurvData.additional.DataTypeVariable][index]);
		row += formatCell(jpsurvData.results.RelSurIntData.pred_cum[index])+"</tr>/n";
		$("#graph-time-table > tbody").append(row);
	});
}

function updateEstimates(token_id) {

	var row;
	$("#estimates-jp > tbody").empty();
	row = "<tr>";
	row += "<td>Boyesian Information Criterion (BIC)</td>"+formatCell(jpsurvData.results.bic)+"</tr>";
	row += "<td>Akaike Information Criterial (AIC)</td>"+formatCell(jpsurvData.results.aic)+"</td></tr>";
	row += "<td>Log Likelihood</td>"+formatCell(jpsurvData.results.ll)+"</tr>";
	row += "<td>Converged</td><td>"+(jpsurvData.results.converged.toUpperCase() == "TRUE" ? "Yes" :"No")+"</td></tr>/n";
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
	//console.log("Trend: table_id="+table_id);
	//console.log("start.year typeof: "+typeof trend["start.year"]);
	//console.dir(trend);

	var row;
	$("#"+table_id+" > tbody").empty();
	if(typeof trend["start.year"] == "number") {
		row = "<tr><td>"+trend["start.year"]+"</td>";
		row += "<td>"+trend["end.year"]+"</td>";
		row += formatCell(trend.estimate);
		row += formatCell(trend["std.error"])+"</tr>/n";
		$("#"+table_id+" > tbody").append(row);
	} else {
		//console.log("Array length"+trend["start.year"].length);
		$.each(trend["start.year"], function( index, value ) {
			row = "<tr><td>"+value+"</td>";
			row += "<td>"+trend["end.year"][index]+"</td>";
			row += formatCell(trend.estimate[index]);
			row += formatCell(trend["std.error"][index])+"</tr>/n";
			$("#"+table_id+" > tbody").append(row);
		});
	}
}
function updateGraphLinks(token_id) {
	$("#graph-year-dataset-link").attr("href", "tmp/data_Year-"+token_id+"-"+jpsurvData.plot.static.imageId+".csv");
	$("#graph-time-dataset-link").attr("href", "tmp/data_Int-"+token_id+"-"+jpsurvData.plot.static.imageId+".csv");
	$(".full-dataset-link").attr("href", "tmp/Full_Predicted-"+token_id+"-"+jpsurvData.plot.static.imageId+".csv");
}

function updateSelections(token_id) {
	return
}

function updateTabs(tokenId) {
	//updateModel(tokenId);
	updateGraphs(tokenId);
	//console.log("Got Here B");
	updateEstimates(tokenId);
	//console.log("Got Here C");
	//updateTrend(tokenId);
	updateGraphLinks(tokenId);
	//console.log("Got Here D");
	updateSelections(tokenId);
	//Change the precision of all the floats.
	changePrecision();
	var trend_selected = $("#jpsurv-tabs").find("a[href='#trends-tab']").parent().hasClass("active");
	if(trend_selected) {
			$("#calculating-spinner").modal('show');
			setTimeout(calculateTrend(jpsurvData.tokenId), 1000);
	}
}

function calculateTrend(tokenId) {


	//console.log("calculateTrend");
	var params = getParams();
	var comm_results = JSON.parse(jpsurvRest('stage4_trends_calculate', params));
	$("#calculating-spinner").modal('hide');

	//console.dir(comm_results);
	var trendData = load_ajax("trend_results-" + jpsurvData.tokenId + ".json");
	jpsurvData.results.CS_AAPC = trendData.CS_AAPC;
	jpsurvData.results.CS_AAAC = trendData.CS_AAAC;
	jpsurvData.results.HAZ_APC = trendData.HAZ_APC;
	updateTrend(tokenId);
	changePrecision();
	jpsurvData.recentTrends = 1;

	//  Check precision.

	//console.dir(trendData);
	//console.log("RESULTS: ");
	//console.dir(jpsurvData.results);
}

function changePrecision() {

	var precision = $("#precision").val();;
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
			//$(element).text(myFloat.toPrecision(precision));
			//$(element).text(roundup(myFloat, precision));
		}
	});
}

function formatCell(x) {
	//If the content is a float return a cell with the attribute of data-float
	// else return data in a table cell
	if(isNaN(parseFloat(x))) {
		//console.log(x+" is NaN");
		return "<td>"+x+"</td>";
	} else {
		//console.log(x+" is a float");
		return "<td data-float='"+x+"'><i>float</i></td>"; 
	}
}

function setCalculateData(type) {
 		type = type || 0;
 		if(type == "default") {
 			//alert("reset to default");
 		}

		updateCohortDisplay();

		jpsurvData.queue = {};
		//jpsurvData.queue.email = (DEBUG ? "chris.kneisler@nih.gov" : $("#e-mail").val());
		jpsurvData.queue.email = $("#e-mail").val();
		jpsurvData.queue.url = encodeURIComponent(window.location.href.toString()+"&request=true");
		//console.info("QUEUE");
		//console.dir(jpsurvData.queue);

		//Set static data
		var inputAnswers;
		var yearOfDiagnosisVarName = jpsurvData.calculate.static.yearOfDiagnosisTitle.replace('+', '');
		yearOfDiagnosisVarName = yearOfDiagnosisVarName.replace(new RegExp(" ", 'g'), "_");

		//Remove spaces and replace with underscore
		jpsurvData.calculate.static.yearOfDiagnosisVarName = yearOfDiagnosisVarName;
		jpsurvData.calculate.static.seerFilePrefix = jpsurvData.file.dictionary.substring(0, jpsurvData.file.dictionary.indexOf("."));

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

		//console.warn("setCalculateData()");
		//console.info("jpsurvData - (ie. input variable json");
		//console.dir(jpsurvData);
		//console.log(JSON.stringify(jpsurvData));
		if(validateVariables()) {
			//console.log("Calculating");
			$("#calculating-spinner").modal("show");
			setTimeout(calculate, 1000);
		} else {
			console.log("Not Calculating - validateVariables did not pass");
		}
		//append_plot_intervals(jpsurvData.calculate.form.yearOfDiagnosisRange[1] - jpsurvData.calculate.form.yearOfDiagnosisRange[0]);
}
function validateYearRange() {
	//max(Year) >= min(Year) + op$numfromstart + (nJP - 1) * intervalSize 
	if(jpsurvData.calculate.form.yearOfDiagnosisRange[1]<=jpsurvData.calculate.form.yearOfDiagnosisRange[0]) {
		okAlert("The Year of Diagnosis Range is invalid.<br><br>The start year can not be greater then or equal to end year.");
		return false;
	} else {
		return true;
	}
}

function okAlert(message) {
	$("#ok-alert").find(".modal-body").empty().html(message);
	$("#ok-alert").modal('show');
}

function validateRule1() {
	/*
		Rule 1:
		max(Year) >= min(Year) + advFirst + ((maxjoinPoints-1) * (advBetween+1)) + advLast
		max(Year) >= min(Year) + op$numfromstart + ((nJP-1) * (op$numbetwn+1)) + op$numtoend;
	*/
	var minYear = jpsurvData.calculate.form.yearOfDiagnosisRange[0];
	var maxYear = jpsurvData.calculate.form.yearOfDiagnosisRange[1];
	var rightside = minYear 
		+ parseInt(jpsurvData.calculate.static.advanced.advFirst)
		+ ((parseInt(jpsurvData.calculate.form.maxjoinPoints)-1)
			* (parseInt(jpsurvData.calculate.static.advanced.advBetween)+1))
		+ parseInt(jpsurvData.calculate.static.advanced.advLast);
	//console.log("maxYear=%d", maxYear);
	//console.log("minYear=%d", minYear);
	//console.log("rightside=%d", rightside);
	
	/*
		console.log("%d : %d : %d : %d", jpsurvData.calculate.static.advanced.advFirst
			, jpsurvData.calculate.form.maxjoinPoints
			, jpsurvData.calculate.static.advanced.advBetween
			, jpsurvData.calculate.static.advanced.advLast);
	*/
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
				, jpsurvData.calculate.static.advanced.advLast));
	}

	return false;
}

function validateVariables() {
	//console.warn("validateVariables()");
	//console.dir(jpsurvData);
	if(validateYearRange() && validateRule1()) {
		return true;
	} else {
		return false;
	}
}

function calculate() {

	//$("#calculating-spinner").modal('show');
	if(jpsurvData.stage2completed) {
		stage3();  // This is a recalculation.
		retrieveResults();
	} else {
		if(parseInt($("#max_join_point_select").val())>maxJP) {
			// SEND TO QUEUE
			//Always get a new tokenId and always set imageId to 1
			//That way each time the create a separate calculation
			//jpsurvData.tokenId = renewTokenId();
			jpsurvData.plot.static.imageId = 100;
			setIntervalsDefault();
			getIntervals();
			var params = getParams();
			var comm_results = JSON.parse(jpsurvRest('stage5_queue', params));
			alert("Your submission has been queued.  You will receive an e-mail when calculation is completed.");
		} else {
			stage2("calculate"); // This is the initial calculation and setup.
			retrieveResults();
		}
	}
	$("#calculating-spinner").modal('hide');

}

function file_submit(event) {
	//event.preventDefault();
	//set tokenId
	jpsurvData.tokenId = renewTokenId();
	$("#upload-form").attr('action', '/jpsurvRest/stage1_upload?tokenId='+jpsurvData.tokenId);
	getRestServerStatus();
}
/*
function get_plot() {
	$('#plot-instructions').hide();
	$("#plot-container").hide();
	$("#spinner-plotting").show();
	//console.log('get_plot');

	var params = 'jpsurvData='+JSON.stringify(jpsurvData);
	var plot_json = JSON.parse(jpsurvRest('stage3_plot', params));
	//console.dir(plot_json);
	//Check to see if there was a comm error
	if(plot_json.status == 'error') {
		return;
	}

	//console.log("plot_json");
	//console.dir(plot_json);

	$("#spinner-plotting").hide();
	$("#plot-image").attr('src', '../jpsurv/tmp/plot-'+jpsurvData.tokenId+'.png');
	$("#plot-container").fadeIn();

}
*/
function retrieveResults() {

	//console.log("retrieveResults");
	$.get('tmp/results-'+jpsurvData.tokenId+'.json', function (results) {

		jpsurvData.results = results;
		//console.log("jpsurvData");
		//console.log(JSON.stringify(jpsurvData));
		//console.dir(jpsurvData);
		if(!jpsurvData.stage2completed) {
			createModelSelection();
		}
		if(certifyResults() == false){
			console.warn("Results are corrupt.");
		} else {
			//console.warn("Results are certified.");
		}
		updateTabs(jpsurvData.tokenId);
		//Change stage2completed HERE.  After retrieving file.
		jpsurvData.stage2completed = true;
	});

}

function getParams() {
	//console.warn("getParams -  when is the vars set?");
	jpsurvData.results = {};
	var params = 'jpsurvData='+JSON.stringify(jpsurvData);
	params = replaceAll('None', '', params);
	params = params.replace(/\+/g, "{plus}");

	return params;
}

function incrementImageId() {
	//console.log("incrementImageId:"+jpsurvData.plot.static.imageId);
	jpsurvData.plot.static.imageId++;
	//console.log("incrementImageId (new value):"+jpsurvData.plot.static.imageId);

}

function stage2(action) {

	//console.log("STAGE 2");

	$("#jpsurv-message-container").hide();
	jpsurvData.recentTrends = 0;
	setIntervalsDefault();
	getIntervals();
	//console.log(JSON.stringify(jpsurvData));
	//console.dir(jpsurvData);
	jpsurvData.additional.yearOfDiagnosis = jpsurvData.calculate.form.yearOfDiagnosisRange[0].toString();
	//jpsurvData.additional.yearOfDiagnosis = "1988";
	//alert(JSON.stringify(jpsurvData.additional));

	var params = getParams();
	//console.log("getParams()");
	//console.log(params);

	var comm_results;
	if(action == "calculate") {
		//Run initial calculation with setup.
		//incrementImageId();
		comm_results = JSON.parse(jpsurvRest('stage2_calculate', params));
	}

	$("#right_panel").show();
	$("#help").remove();
	$("#icon").css('visibility', 'visible');

	//console.log("Current year 0 ");
	//console.log(jpsurvData.calculate.form.yearOfDiagnosisRange[0]);

	//$("#year-of-diagnosis").val(jpsurvData.calculate.form.yearOfDiagnosisRange[0]);

	$("#year-of-diagnosis").empty();
	for (year=jpsurvData.calculate.form.yearOfDiagnosisRange[0];year<=jpsurvData.calculate.form.yearOfDiagnosisRange[1];year++) {
		$("#year-of-diagnosis").append("<OPTION>"+year+"</OPTION>\n");
	}

	// Get new file called results-xxxx.json
	// populate images on tab 1.
	//console.log('apc_json');
	//console.log(apc_json);
	/*
	console.info("TODO: Make this work for only one row");
	$('#startYear0').empty().append(apc_json['start.year'][0]);
	$('#startYear1').empty().append(apc_json['start.year'][1]);
	$('#endYear0').empty().append(apc_json['end.year'][0]);
	$('#endYear1').empty().append(apc_json['end.year'][1]);
	$('#estimate0').empty().append(apc_json.estimate[0]);
	$('#estimate1').empty().append(apc_json.estimate[1]);

	return true;
	*/
}

function stage3() {
		//Run initial calculation with setup.
	$("#jpsurv-message-container").hide();
	jpsurvData.recentTrends = 0;

	//console.warn("STAGE 3");
	//alert("stage 3");
	//console.info("HERE ARE the new values for re-calculate purposes.");
	//alert($("#year-of-diagnosis").val());

	//
	// SET START YEAR
	//
	//jpsurvData.calculate.form.yearOfDiagnosisRange[0] = parseInt($("#year-of-diagnosis").val());
	//jpsurvData.calculate.static.yearOfDiagnosisTitle = "Year of diagnosis "+$("#year-of-diagnosis").val()+"+";
	$("#year_of_diagnosis_start").val(jpsurvData.calculate.form.yearOfDiagnosisRange[0]);

	//jpsurvData.additional.headerJoinPoints = 1;

//	jpsurvData.calculate.static.yearOfDiagnosisVarName = "Year_of_diagnosis_"+$("#year-of-diagnosis").val();
//	jpsurvData.calculate.static.yearOfDiagnosisVarName = "Year_of_diagnosis_1975+";

	//console.info("calculate.form.yearOfDiagnosisRange");
	//console.dir(jpsurvData.calculate.form.yearOfDiagnosisRange);
	//console.info("calculate.static.yearOfDiagnosisVarName");
	//console.log(jpsurvData.calculate.static.yearOfDiagnosisVarName);

	getIntervals();
	incrementImageId();
	//console.warn("STRINGIFY inputs");
	delete jpsurvData.results;
	//console.log(JSON.stringify(jpsurvData));

	var params = getParams();
	var comm_results = JSON.parse(jpsurvRest('stage3_recalculate', params));
}

function getIntervals() {
	//
	// SET INTERVALS
	//
	//console.log("INTERVALS");
	var intervals = $("#interval-years").val();
	jpsurvData.additional.intervals = [];
	$.each(intervals, function( index, value ) {
		jpsurvData.additional.intervals[index] = parseInt(value);
	});

}

function getApcTable() {


	//jpsurvRest('calculate', newobj);
	$("#spinner").show();
	$("#apc-container").hide();
	$("#plot-container").hide();
	$("#plot-form").hide();
	$("#jpsurv-message-container").hide();

	if(show_apc_table() == true) {
		$("#spinner").hide();
		$("#plot-form").show();
		$("#apc-container").fadeIn();
	}
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
	//console.log('load_form()');
	//Removing File Reader, because file is on server
	//
	//var file_control = document.getElementById('file_control').files[0];
	//var reader = new FileReader();

		//reader.onload = function(e) {
   //console.log("This may not be JSON!!!!");
	//console.dir(text);
	//alert(JSON.stringify(text));
	//control_data = JSON.parse(text);
	//console.log("control data");
	//console.dir(control_data);
	parse_diagnosis_years();
	parse_cohort_covariance_variables();
	addCohortVariables();
	addSessionVariables();
	build_parameter_column();

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

function addSessionVariables() {
	jpsurvData.additional.statistic = getSessionOptionInfo("Statistic");
}

function build_parameter_column() {
	//console.warn("build_parameter_column");
	set_year_of_diagnosis_select();
	//console.dir(Object.keys(cohort_covariance_variables));
	set_cohort_select(Object.keys(cohort_covariance_variables));
	var covariate_options = Object.keys(cohort_covariance_variables);
	covariate_options.unshift("None");
	set_covariate_select(covariate_options);
	$("#stage2-calculate").fadeIn();

}

function parse_diagnosis_years() {
	// First we need to find the element that says "Year of Diagnosis"
	var diagnosis_row = find_year_of_diagnosis_row();
	// Then we need to read the label for the previous row, this will be the name used for the title,
	// it will ALSO be the value in the array needed to find the years

	if (diagnosis_row >= 2) {
		jpsurvData.calculate.static.yearOfDiagnosisTitle = control_data.VarAllInfo.ItemValueInDic[diagnosis_row-1];
	}
	jpsurvData.calculate.static.years = control_data.VarFormatSecList[jpsurvData.calculate.static.yearOfDiagnosisTitle].ItemValueInDic;

}
function parse_cohort_covariance_variables() {
	//console.log('parse_cohort_covariance_variables()');

	// First find the variables
	//  They are everything between the Page type and Year Of Diagnosis Label (noninclusive) with the VarName attribute

	var cohort_covariance_variable_names = get_cohort_covariance_variable_names();

	cohort_covariance_variables = new Object();
	for (var i=0; i< cohort_covariance_variable_names.length;i++) {
		//console.log("cohort_covariance_variable_names[i] where i ="+i+" and value is "+cohort_covariance_variable_names[i])
		var cohort_covariance_variable_values = get_cohort_covariance_variable_values(cohort_covariance_variable_names[i]);
		cohort_covariance_variables[cohort_covariance_variable_names[i]] = cohort_covariance_variable_values;
	}
}

function setIntervalsDefault() {

	//
	// Initially select years 1 and 4
	//

	//console.warn("setIntervalsDefault");

	var intervals = getNumberOfIntervals();
	var selectedRange = jpsurvData.calculate.form.yearOfDiagnosisRange[1] - jpsurvData.calculate.form.yearOfDiagnosisRange[0];
	intervals = (selectedRange < intervals ? selectedRange : intervals);
	//console.log(intervals+" : "+selectedRange);
	var years = [];
	//Set the ranges based on interval length
	if(intervals >= 10) {
		years = [5, 10];
	} else if (intervals >= 5) {
		years = [5];
	} else if (intervals < 5) {
		years = [1];
	} 
	//console.dir(years);

	$("#interval-years").empty();
	for (var i = 1; i <= intervals; i++) {
		if($.inArray(i, years) >= 0) {
			$("#interval-years").append($("<option>").attr("selected", "selected").text(i));
		} else {
			$("#interval-years").append($("<option>").text(i));
		}
	}

}

function getNumberOfIntervals() {
	return parseInt(getSessionOptionInfo("NumberOfIntervals"));
}

function getSessionOptionInfo(var_name) {

	//console.log("getSessionOptionInfo()");
	var session_value = "-1";
	var options = control_data.SessionOptionInfo.ItemNameInDic;
	$.each(control_data.SessionOptionInfo.ItemNameInDic, function(key, value) {
		if(value == var_name) {
			session_value = control_data.SessionOptionInfo.ItemValueInDic[key];
		}
	});
	//console.log(session_value);

	return session_value;
}

function get_cohort_covariance_variable_names() {
	//getNumberOfIntervals();
	var cohort_covariance_variable_names = [];

	//var names = control_data.VarAllInfo.ItemNameInDic;
	var form_data = control_data;
	var names = control_data.VarAllInfo.ItemNameInDic;

	//Put answer in footer
	/*
	$('#footer_output')
			.append(
				$('<div>').append(JSON.stringify(form_data[0]))
			);
	*/
	var values = control_data.VarAllInfo.ItemValueInDic;
	var regex_base = /^Var\d*Base/;
	var regex_name = /^Var\d*Name/;
	var regex_interval = /Interval/;
	var regex_year = /Year of diagnosis/;
  //Go through Item Value and look for "Year of diagnosis"
  //Push variable names on to a list called cohort_covariance_variable_names.
	for (var i=0; i<names.length; i++) {
		//console.log('names['+i+'] = '+names[i]+', values['+i+'] = '+values[i]);
		//if (regex_base.test(names[i]) && values[i] == "Year of diagnosis") break;
		if (regex_interval.test(values[i])) break; //stops at a value with "Interval" in it
		if (!regex_name.test(names[i])) continue;
		if (values[i] == "Page type") continue; // Skip the Page type
		if (regex_year.test(values[i])) continue; //skips "Year of diagnosis"
		cohort_covariance_variable_names.push(values[i]);
	}
	//cohort_covariance_variable_names.pop();
	//alert (JSON.stringify(cohort_covariance_variable_names));
	//console.dir(cohort_covariance_variable_names);
	return cohort_covariance_variable_names;
}

function get_cohort_covariance_variable_values(name) {
	return control_data.VarFormatSecList[name].ItemValueInDic;
}

function find_year_of_diagnosis_row() {
	var vals = control_data.VarAllInfo.ItemValueInDic;
	for (var i=0; i< vals.length; i++) {
		if (vals[i] == "Year of diagnosis") return i;
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
	//console.warn("set_cohort_select");
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
		//console.log("Covariate is length 0.");
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
	//alert('empty covariate_sub_select');
	$("#covariate_sub_select").empty();
	//alert('Is it empty?');
	//console.warn("change_cohort_select");
	if (all_selected != null) {
		//console.warn("all_selected is not null");
		for (var i=0;i<all_selected.length;i++) {
			//console.warn("all_selected length");
			for (var j=0;j<keys.length;j++) {
				//console.warn("keys length: "+keys.length);
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

//	alert ("BigSet: " + JSON.stringify(big_set)
//		 + "\nRemoved Set: " + JSON.stringify(removed_set)
//		 + "\nNew Set: " + JSON.stringify(new_set)
//		);
	return new_set;
}

function change_covariate_select() {

	var all_selected = $("#covariate_select").val();
	var keys =  Object.keys(cohort_covariance_variables);

	$("#covariate_sub_select").empty();

	//console.log(all_selected);

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

/*
	if($('#covariate_select').val() == "None") {
		alert('Covariate Sub Select = none');
		$("#covariate_sub_select").empty();
	} else {
		alert('Covariate Sub Select = '+ $('#covariate_select').val());
		//add_cohort_covariance_variable_select2();
		add_cohort_covariance_variable_select($("#covariate_sub_select"), "val_"+i, keys[j], cohort_covariance_variables[keys[j]]);
/*
		for (var i=0;i<all_selected.length;i++) {
			for (var j=0;j<keys.length;j++) {
				if (all_selected[i] == keys[j])
					add_cohort_covariance_variable_select($("#covariate_sub_select"), "val_"+i, keys[j], cohort_covariance_variables[keys[j]]);
			}
		}
*/

/*
	for (var i=0;i<all_selected.length;i++) {
		for (var j=0;j<keys.length;j++) {
			if (all_selected[i] == keys[j])
				add_cohort_covariance_variable_select($("#covariate_sub_select"), "val_"+i, keys[j], cohort_covariance_variables[keys[j]]);
		}
	}
*/
	//
	//Just clear for now....
	//
	//$("#covariate_sub_select").empty();
}

function add_cohort_covariance_variable_select(field, variable_name, variable_title, values) {
	/*
	console.log("ATTEMPTING TO ADD COHORT COVARIANCE VARIABLE SELECT");
	console.log(field);
	console.log(variable_name);
	console.log(variable_title);
	console.log(values);
	*/
	//alert(field.attr('id'));

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


function jpsurvRest(action, params) {
	//console.log('jpsurvRest');
	//console.info(params);
	//console.log(params);
	/*
	if(params.search("\+")>0){
		alert("Plus was found");
	}

jpsurvData={"file":
{"dictionary":"Breast_RelativeSurvival.dic",
"data":"Breast_RelativeSurvival.txt",
"form":"form-639053.json"},
"calculate":
{"form":
{"yearOfDiagnosisRange":[1975,2011],
"cohortVars":["Age groups"],
"cohortValues":["\"65{plus}\""], <<<==== THIS SHOULD BE TURNED INTO A PLUS
"covariateVars":"\"\"",  <<<==== THIS SHOULD BE NULL
"joinPoints":1},
"static":
{"yearOfDiagnosisTitle":"Year of diagnosis 1975{plus}", <<<<==== ANOTHER ONE HERE.
"years":["1975","1976","1977","1978","1979","1980","1981","1982","1983","1984","1985","1986","1987","1988","1989","1990","1991","1992","1993","1994","1995","1996","1997","1998","1999","2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011"],"yearOfDiagnosisVarName":"Year_of_diagnosis_1975","seerFilePrefix":"Breast_RelativeSurvival","allVars":["Age groups","Breast stage","Year_of_diagnosis_1975"]}},"plot":{"form":{},"static":{"imageId":0}},"tokenId":"639053","status":"uploaded"}

	*/
	//Make sure to code for null.
	// If \"\" then replace with null

	var json = (function () {
		var json = null;
		//var url = '/jpsurvRest/'+action+'?'+params+'&jpsurvData='+JSON.stringify(jpsurvData);

		var url = '/jpsurvRest/'+action+'?'+encodeURI(params);
		//console.warn("jpsurvRest url=");
		//console.log(url);

		$.ajax({
			'async': false,
			'global': false,
			'url': url,
			'dataType': "json",
			'success': function (data) {
				json = data;
			},
			'error' : function(jqXHR, textStatus, errorThrown) {
				//alert(errorThrown);
				console.log(errorThrown);
				var id = 'jpsurv';
				console.warn("header: " + jqXHR
					+ "\ntextStatus: " + textStatus
					+ "\nerrorThrown: " + errorThrown);
				//alert('Communication problem: ' + textStatus);
				// ERROR
				if(errorThrown == "INTERNAL SERVER ERROR") {
					message = 'Internal Server Error: ' + textStatus + "<br>";
					message += "A variable value such as 'None' may have caused an internal error during calculation.<br>";
					message_type = 'warning';
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
	//console.log("Print json");
	//console.log(json);
	if(typeof json === 'object') {
		//console.log("It is already json");
		//console.dir(json);
	}

	return json;
}

function showMessage(id, message, message_type) {

/* Example:
<div class="row">
	<div class="col-sm-7 col-sm-offset-2" id="jpsurv-message-container">
	  <div class="panel panel-danger">
	    <div class="panel-heading">Error</div>
	    <div class="panel-body" id="jpsurv-message-content"></div>
	  </div>
	</div>
</div>
*/

	//
	//	Display either a warning an error.
	//
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
	//console.log(filename);
	var json = (function () {
		var json = null;
		var url = '/jpsurv/tmp/'+filename;
		$.ajax({
		      'async': false,
		      'global': false,
		      'url': url,
		      'dataType': "json",
		      'success': function (data) {
		        json = data;
		      },
			 'fail'	: function(jqXHR, textStatus) {
			 	alert('Fail on load_ajax');
			 }
		    });
		    return json;
		})();
	return json;
}

function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++)
    {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam)
        {
            return sParameterName[1];
        }
    }
}

function inspect(object) {
	console.log(typeof object);
	console.dir(object);

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
	//console.log(typeof(find));
	//console.log(typeof(replace));
	//console.log(typeof(str));

  	return str.replace(new RegExp(find, 'g'), replace);
}

function round(x, round, trim) {
	return parseFloat(x) ? parseFloat(x.toFixed(round)).toPrecision(trim) : x;
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

    	$("#slideout").animate({
    		transform: 'translate(-400px, 0px)',
		}, 300);

    	setTimeout(function(){
    		$("#right_panel").animate({
    		width: '100%'
			}, 300);
		}, 600);
    }
    else if($("#icon").hasClass("fa fa-caret-right fa-2x")||action=='show')
  	{
    	 $('#icon').removeClass("fa fa-caret-right fa-2x");
    	 $('#icon').addClass("fa fa-caret-left fa-2x");
    	 $("#slideoutForm").fadeIn(500);
    	 $("#icon").animate({
    		marginLeft: '31%'
		}, 20);

    	 $("#right_panel").animate({
    		width: '66.66%'
			}, 10);
	}
}

function Slide_menu_Vert(Id,action){
	//console.log("slide_menu_vert");
	//console.log("%s :%s", Id, action);
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
    		height: "300px",
    		opacity:1
			}, 300);
    }
}

function decimalPlaces(num) {

	//console.log(decimalPlaces);

	var match = (''+num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
	if (!match) { 
		return 0;
	}

	console.dir(match);

	var answer = Math.max(0,
       // Number of digits right of decimal point.
       (match[1] ? match[1].length : 0)
       // Adjust for scientific notation.
       - (match[2] ? +match[2] : 0));
	return answer;
}

function displayCommFail(id, jqXHR, textStatus) {
	console.log(id);
	console.log(textStatus);
	console.dir(jqXHR);

	console.warn("CommFail\n"+"Status: "+textStatus);
	var message = jqXHR.responseText;
	message += "<p>code: "+jqXHR.status+" - "+textStatus+"</p>";
	$('#' + id + '-message').show();
	$('#' + id + '-message-content').empty().append(message);
	$('#' + id + '-progress').hide();
	$('#' + id+ '-results-container').hide();
	//hide loading icon
	$('#'+id+"-loading").hide();

}

function displayError(id, data) {
	// Display error or warning if available.
	console.dir(data);

	var error = false;
	if (data.traceback) {
		console.warn("traceback");
		console.warn(data.traceback);
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

	console.log("getRestServerStatus");

	//$("#upload-form").submit();
	//return;

// Assign handlers immediately after making the request,
// and remember the jqXHR object for this request
/*
	var jqxhr = $.ajax( url ).done(function() {
		$("#calculating-spinner").modal('show');
		$("#upload-form").submit();
		$("#calculating-spinner").modal('hide');
	})
	.fail(function(jqXHR, textStatus) {
		console.warn("header: "
			+ jqXHR
			+ "\n"
			+ "Status: "
			+ textStatus
			+ "\n\nThe server is temporarily unable to service your request due to maintenance downtime or capacity problems. Please try again later.");
		//alert('Communication problem: ' + textStatus);
		// ERROR
		message = 'Service Unavailable: ' + textStatus + "<br>";
		message += "The server is temporarily unable to service your request due to maintenance downtime or capacity problems. Please try again later.<br>";
		showMessage(id, message, 'error');
	});
*/

	var url = restServerUrl + "/status";
	var ajaxRequest = $.ajax({
		url : url,
		contentType : 'application/json' // JSON
	});
	ajaxRequest.success(function(data) {
		//data is returned as a string representation of JSON instead of JSON obj
		//console.log("ajaxRequetst.success");
		//console.dir(data);
		$("#"+id+"-message-container").hide();
		if (displayError(id, data) == false) {
			//$("#calculating-spinner").modal('show');
			//alert("Submitting... Page should reload with new data");
			$("#upload-form").submit();
		}
	});
	ajaxRequest.fail(function(jqXHR, textStatus) {
		console.log("ajaxRequetst.fail");
		console.dir(jqXHR);
		console.log(textStatus);
		displayCommFail(id, jqXHR, textStatus);
	});
	ajaxRequest.always(function() {
		$("#calculating-spinner").modal('hide');
	});
}

function certifyResults() {
	$.each(jpsurvData.results.RelSurIntData, function(index, value) {
		//console.log(index+" : "+value);
		//console.log(index.substring(0,1));
		if(index.substring(0,1) == "X" ) {
			console.log("jpsurvData.results.RelSurIntData look corrupt:");
			console.dir(jpsurvData.results.RelSurIntData);
			alert("RelSurIntData is corrupt:\n"+JSON.stringify(jpsurvData.results.RelSurIntData));
			return false;
		}
	});

	return true;
}

function renewTokenId() {
	var tokenId = Math.floor(Math.random() * (999999 - 100000 + 1));

	return tokenId.toString();
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

