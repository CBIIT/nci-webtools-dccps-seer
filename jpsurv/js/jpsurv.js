var control_data;
var cohort_covariance_variables;
var jpsurvData = {"file":{"dictionary":"Breast.dic","data":"something.txt", "form":"form-983832.json"}, "calculate":{"form": {"yearOfDiagnosisRange":[]}, "static":{}}, "plot":{"form": {}, "static":{"imageId":0} }, "additional":{"headerJoinPoints":0,"yearOfDiagnosis":null,"intervals":[1,4]}, "tokenId":"unknown", "status":"unknown", "stage2completed":0};

var DEBUG = true;

if(getUrlParameter('tokenId')) {
	jpsurvData.tokenId = getUrlParameter('tokenId');
}
if(getUrlParameter('status')) {
	jpsurvData.status = getUrlParameter('status');
}

function checkEmail(email) {
	var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	var result = re.test(email);

	return result;
}

function validateEmail() {
	var id = "e-mail";
    var errorMsg = "Please enter a valid email address.";;
    var email = $("#"+id).val();
    //var pattern = new RegExp('^' + $(this).attr('pattern') + '$');
    var pattern = new RegExp('^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$');
    //console.log(email);
    // check each line of text

    var hasError = !checkEmail(email);
    console.log("hasError: "+hasError);

    if (typeof $("#"+id).setCustomValidity === 'function') {
		//console.log("setting error message: "+errorMsg);
		$("#"+id).setCustomValidity(hasError ? errorMsg : '');
    } else {
        // Not supported by the browser, fallback to manual error display...
        $("#"+id).toggleClass('error', !!hasError);
        $("#"+id).toggleClass('ok', !hasError);
        if (hasError) {
            $("#"+id).attr('title', errorMsg);
            $("#calculate").prop('disabled', true);
        } else {
            $("#"+id).removeAttr('title');
            $("#calculate").prop('disabled', false);
        }
    }
    if (hasError) {
    	console.log("hasError");
        $("#calculate").prop('disabled', true);
    } else {
    	console.log("Does not hasError");
        $("#calculate").prop('disabled', false);
    }
    //$("#calculate").prop('disabled', false);
  
    return !hasError;
}

function addEventListeners() {

	var maxJP = (DEBUG ? -1 : 2);

	$('#e-mail').keyup(validateEmail);

	$("#max_join_point_select").on('change', function(e){
		if(parseInt($("#max_join_point_select").val())>maxJP) {
			$("#e-mail").parent().fadeIn();
			$("#calculate").val("Submit");
			validateEmail();
		} else {
			$("#e-mail").parent().fadeOut();
			$("#calculate").val("Calculate");
			$("#calculate").prop("disabled", false);
		}
	});
	$("#trends-tab-anchor").click(function(e) {
		//console.warn("You clicked on trends-tab-anchor");
		//Need to figure out this variable...
		if(jpsurvData.stage2completed == 1 && jpsurvData.recentTrends == 0) {
			calculateTrend(jpsurvData.tokenId);
		}
	});
	
	$("#icon").on('click', slideToggle);

	$("#covariate_select").on("change", onChange_covariate); 
	$("#max_join_point_select").on("change", onChange_joints); 
	//Select Joinpoint
	$(document).on('click', '#model-selection-table tbody tr', function(e) {
		e.stopPropagation();
		$(this).addClass('info').siblings().removeClass('info'); 
		if(jpsurvData.additional.headerJoinPoints == this.rowIndex - 1) {
			return;
		}
		jpsurvData.additional.headerJoinPoints = this.rowIndex - 1;
		console.log("headerJoinPoints: "+jpsurvData.additional.headerJoinPoints);
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
		jpsurvData.stage2completed = 0;
		setCalculateData();
	});

	$("#plot").on("click", setPlotData);
	//$("#calculate").on("click", show_graph_temp);
	$("#file_data").on("change", checkInputFiles);
	$("#file_control").on("change", checkInputFiles);
	//$("#parameters").on("change", checkPlotStatus);
	//$("#plot").on("click", showPlot);
	//Checking Plot parameters
//	$("#covariate_value_select").on("change", checkPlotParameters);
	$("#plot_intervals").on("change", checkPlotParameters);
	$("#covariate-fieldset").on("click", "#covariate_value_select", checkPlotParameters);
	//$("#data-set").on("click", getDownloadOutput);

}

$(document).ready(function() {
	addEventListeners();

/*
	$('#jpsurv-tabs').on('click', 'a', function(e) {
		console.warn("You clicked a tab");
		console.info("Check for an attribute called data-url");
		//If data-url use that.
		var currentTab = e.target.id.substr(0, e.target.id.search('-'));
		alert(currentTab);
		if("")
	});
*/
	$("#cohort-variables").on('click', ".cohort", function(e) {
		$("."+this.classList.item(1)).attr('checked', false);
		$(this).prop('checked', true);
	});

	$('[data-toggle="tooltip"]').tooltip({container: 'body'});

	loadHelp();

	var status = getUrlParameter('status');
	if(status == "uploaded") {
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

		$('#upload_file_submit_container').remove();
		//console.log(file_control_output	);
		//var file_data_output = load_ajax(getUrlParameter('file_data_filename'));
		setUploadData();
		//console.log(jpsurvData.file.form);
		var output_file = load_ajax("form-" + jpsurvData.tokenId + ".json");
		control_data = output_file;
		load_form();
	} else {
		$("table").hide();
	}

	if(DEBUG) {
		console.warn("%cDEBUG is on", "color:white; background-color:red");
		$("#year_of_diagnosis_start").val("2000");
	}
});

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
	$("#help").load("help.html");
}
/*
function getDownloadOutput(event) {

	event.preventDefault();
	var params = 'jpsurvData='+JSON.stringify(jpsurvData);
	var download_json = JSON.parse(jpsurvRest('stage4_link', params));
	//alert(download_json.link);
	window.open('../jpsurv/tmp/'+download_json.link, 'jpsurv_data_window');

  	return false;
//	$('#data-set').attr('href', '../jpsurv/tmp/output-' +jpsurvData.tokenId+'.rds');
//	alert("You clicked go go go");
}
*/
/*
function showPlot() {
	//alert("hide plot instructions");
	$('#plot-instructions').hide();
}
function checkPlotStatus() {

	if ( $('#plot-form').css('display') != 'none' ){
//		alert('You changed something.  And plot-form is not none');
		$('#plot-form').hide();
		$('#plot').attr('disabled', 'true');
		$('#plot-instructions').hide();
		$('#apc-container').hide();
		$('#plot-container').hide();
		$('#calculate-instructions').show();
	}

}
*/

function checkPlotParameters() {
	//If both files are filed out then enable the Upload Files Button
	var covariate_value = $("#covariate_value_select");
	var plot_intervals = $("#plot_intervals");

	//console.log('checkPlotParameters');

	if(!!covariate_value.val()) {
		if(!!plot_intervals.val()) {
			$("#plot").removeAttr('disabled');
		} else {
			$("#plot").attr('disabled', true);
		}
	} else {
		$("#plot").attr('disabled', true);
	}
	/*
	if(covariate_value.length !=0){
		if(plot_intervals.length !=0) {
			$("#plot").removeAttr('disabled');
		} else {
			$("#plot").attr('disabled', true);
		}
	} else { 
		$("#plot").attr('disabled', true);
	}
	*/
	/*
	if(covariate_value_select.length > 0 && plot_intervals.length > 0) {
		$("#plot").removeAttr('disabled');
	} else {
		$("#plot").attr('disabled', true);
	}
	*/
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
		console.warn("jpsurvData.results.SelectedModel is NA.  Changing to 0");
		jpsurvData.results.SelectedModel = 1;
	}
	console.log("SelectedModel:%s, headerJP:%s, stage2completed:%s",
		jpsurvData.results.SelectedModel, 
		jpsurvData.additional.headerJoinPoints,
		jpsurvData.stage2completed);

	jpsurvData.additional.headerJoinPoints = jpsurvData.results.SelectedModel-1;

}

function createModelSelection() {

	setupModel();

	console.warn("updateModel");
	console.log("SELECTED MODEL = "+jpsurvData.results.SelectedModel);

	var ModelSelection = JSON.parse(jpsurvData.results.ModelSelection);
	console.info("Triforce");
	console.info("jpsurvData.stage2completed is "+jpsurvData.stage2completed);
	console.info("headerJoinPoints is "+jpsurvData.additional.headerJoinPoints);
	console.info("stage2completed is "+jpsurvData.stage2completed);

	$("#model-selection-table > tbody").empty();
	var jp = 0;
	var title = "Click row to change Number of Joinpoints to "
	$.each(ModelSelection, function( index, value ) {
		console.log( index + ": " + value);
		row = '<tr  id="jp_'+jp+'" title="'+title+jp.toString()+'">';
		row += '"<td class="model-number">'+(jp+1)+'</td>';
		row += "<td>"+jp+"</td>";
		row += formatCell(value.bic);
		row += formatCell(value.aic);
		row += formatCell(value.ll);
		row += "<td>"+value.converged+"</td></tr>/n";
		$("#model-selection-table > tbody").append(row);
		jp++;
	});
	$("#jp_"+jpsurvData.additional.headerJoinPoints).addClass('info').siblings().removeClass('info'); 
	$("#jp_"+(jpsurvData.results.SelectedModel-1)).find('td.model-number').text(jpsurvData.results.SelectedModel+" (final selected model)");

	console.log("SelectedModel:%s, headerJP:%s, stage2completed:%s",
		jpsurvData.results.SelectedModel, 
		jpsurvData.additional.headerJoinPoints,
		jpsurvData.stage2completed);


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

	//console.log("updateGraph");
	//console.dir(jpsurvData);

	//Populate graph-year
	$("#graph-year-tab").find( "img" ).show();
	$("#graph-year-tab").find( "img" ).attr("src", "tmp/plot_Year-"+token_id+"-"+jpsurvData.plot.static.imageId+".png");
	$("#graph-year-table > tbody").empty();
	$("#graph-year-table > tbody").append('<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>');

	//Populate time-year
	$("#graph-time-tab").find( "img" ).show();
	$("#graph-time-tab").find( "img" ).attr("src", "tmp/plot_Int-"+token_id+"-"+jpsurvData.plot.static.imageId+".png");

	//console.log("RelSurIntData");
	//console.dir(jpsurvData.results.RelSurIntData);
	//console.log("Year_of_diagnosis_"+year);
	
	//console.dir(jpsurvData.results.RelSurIntData["Year_of_diagnosis_"+year]);
	var row;
	var yod = jpsurvData.results["RelSurvYearData."+jpsurvData.calculate.static.yearOfDiagnosisVarName];
	//console.info("About to make the table");
	//console.dir(jpsurvData.calculate.form);
	var numvars = jpsurvData.calculate.form.cohortVars.length;

	var vars = ["Interval", "Died", "Alive_at_Start", "Lost_to_Followup", "Expected_Survival_Interval", "Relative_Survival_Cum", "pred_int", "pred_cum", "pred_int_se", "pred_cum_se"];
	vars.unshift(jpsurvData.calculate.static.yearOfDiagnosisVarName);
	//console.warn("vars");
	//console.dir(vars);

	var header = [];
	$.each(jpsurvData.calculate.form.cohortVars, function(index, value) {
		header.push(value);
	});

	header.push.apply(header, vars);
	//console.warn("Header");
	//console.dir(header);
	$("#graph-year-table > thead").empty();
	row = "<tr>";
	$.each(header, function( index, value ) {
		row += "<th>"+value.replace(/_/g, " ")+"</th>";
	});
	row += "</tr>/n";
	$("#graph-year-table > thead").append(row);

	$("#graph-year-table > tbody").empty();
	$.each(yod, function( index, value ) {
		row = "<tr>";
		$.each(jpsurvData.calculate.form.cohortValues, function(index, value) {
			row += "<td>"+value.replace(/"/g, "")+"</td>";
		});
		$.each(vars, function( index2, value2 ) {
			row += formatCell(jpsurvData.results["RelSurvYearData."+value2][index]);
		});
		row += "</tr>/n";
		$("#graph-year-table > tbody").append(row);
	});

	yod = jpsurvData.results.RelSurIntData[jpsurvData.calculate.static.yearOfDiagnosisVarName];

	$("#graph-time-table > tbody").empty();
	$.each(yod, function( index, value ) {
		row = "<tr><td>"+value+"</td>";
		row += formatCell(jpsurvData.results.RelSurIntData.Interval[index]);
		row += formatCell(jpsurvData.results.RelSurIntData.Relative_Survival_Cum[index]);
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
	row += "<td>Converged</td><td>"+jpsurvData.results.converged.toUpperCase()+"</td></tr>/n";
	$("#estimates-jp > tbody").append(row);
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
	updateEstimates(tokenId);
	//updateTrend(tokenId);
	updateGraphLinks(tokenId);
	updateSelections(tokenId);
	//Change the precision of all the floats.
	changePrecision();
	var trend_selected = $("#jpsurv-tabs").find("a[href='#trends-tab']").parent().hasClass("active");
	if(trend_selected) {
		calculateTrend(tokenId);
	}
}

function calculateTrend(tokenId) {


	//console.log("calculateTrend");
	var params = getParams();

	//
	$("#calculating-spinner").modal('show');
	var comm_results = JSON.parse(jpsurvRest('stage4_trends_calculate', params));
	$("#calculating-spinner").modal('hide');

	//console.warn("calcuateTrend called");
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

function roundup(num, dec){
	//console.warn("RoundUp: "+num+", "+dec);
    dec = dec || 0;
    var myFloat = parseFloat(num);
    myFloat = myFloat.toFixed(dec+1);
    var s = myFloat.toString();
    console.log("s before: "+s);
    s = s.replace(/5$/, '6');
    console.log("s after: "+s);
    return Number((+s).toFixed(dec));
 }

function changePrecision() {

	var precision = $("#precision").val();;
	//$("#model-selection-table > tbody > tr > td[data-float]").each(function(index,element) {
	$("td[data-float]").each(function(index,element) {
		var number = $(element).attr("data-float");
		var myFloat = parseFloat(number);
		var myInt = parseInt(number);
		if(myInt == myFloat) {
			//Set the int part
			//$(element).css("color", "red");
			$(element).text(myInt);
		} else {
			//Set the float part
			//$(element).css("color", "blue");
			//$(element).text(myFloat.toFixed(precision));
			$(element).text(myFloat.toPrecision(precision));
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

//Set Data after STAGE 2
function setCalculateData() {
	//Old stuff below....
	/*
	var joints=parseInt($("#max_join_point_select option:selected").text());
	if(joints>=3)
	{
		Slide_menu_Vert('email_fields','show')
	}
	else{
	*/
		//$('#calculate-instructions').hide();
		$("#calculating-spinner").modal('show');
		updateCohortDisplay();
		jpsurvData.queue = {};
		jpsurvData.queue.email = $("#e-mail").val();
		jpsurvData.queue.url = window.location.href;
		console.info("QUEUE");
		console.dir(jpsurvData.queue);
		//Set static data
		var inputAnswers;
		// = $('#parameters').serialize();
	  //var yearOfDiagnosisVarName="Year_of_diagnosis_1975";  //HARD CODED...Why?
	  //Remove + from title
		var yearOfDiagnosisVarName = jpsurvData.calculate.static.yearOfDiagnosisTitle.replace('+', '');
		yearOfDiagnosisVarName = yearOfDiagnosisVarName.replace(new RegExp(" ", 'g'), "_");

	  //Remove spaces and replace with underscore
		jpsurvData.calculate.static.yearOfDiagnosisVarName = yearOfDiagnosisVarName;
		jpsurvData.calculate.static.seerFilePrefix = jpsurvData.file.dictionary.substring(0, jpsurvData.file.dictionary.indexOf("."));

		jpsurvData.calculate.static.allVars = get_cohort_covariance_variable_names();
		jpsurvData.calculate.static.allVars.push(yearOfDiagnosisVarName);
		//dynamic form data
		// cohort
		/*
		jpsurvData.calculate.form.cohortVars = $.map($("#cohort_select option:selected"), function(elem){
			return $(elem).text();
		});
		*/
		/*
		jpsurvData.calculate.form.cohortValues = [];

		$.each(jpsurvData.calculate.form.cohortVars, function( index, value ) {
			jpsurvData.calculate.form.cohortValues.push('"'+$('#cohort_value_'+index+'_select').val()+'"');
		});
		*/
		// covariate
		/*
		jpsurvData.calculate.form.covariateVars = $('#covariate_select').val();
		if(jpsurvData.calculate.form.covariateVars == "None") {
			jpsurvData.calculate.form.covariateVars = "";
		}
		*/
		jpsurvData.calculate.form.covariateVars = "";
		// range
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

		//
		// Get Additional Variables
		//
		/*
		for (i=jpsurvData.calculate.form.yearOfDiagnosisRange[0];i<jpsurvData.calculate.form.yearOfDiagnosisRange[1]-jpsurvData.calculate.form.yearOfDiagnosisRange[0];i++) {
			$("#year-of-diagnosis").append("<OPTION>"+i+"</OPTION>");
		}
		*/

		//jpsurvData.additional = {};

		//jpsurvData.additional.headerJoinPoints = parseInt($("#header-join-points").val());
		jpsurvData.additional.yearOfDiagnosis = parseInt($("#year-of-diagnosis").val());
		/*
		jpsurvData.additional.intervals = $.map($("#interval-years:selected"), function(elem){
			return $(elem).text();
		});
		*/
		console.log("setCalculateData()");
		console.info("jpsurvData - (ie. input variable json");
		console.log(jpsurvData);
		console.log(JSON.stringify(jpsurvData));

		//Append the plot intervals
		//Old stuff below
		//append_plot_intervals(jpsurvData.calculate.form.yearOfDiagnosisRange[1] - jpsurvData.calculate.form.yearOfDiagnosisRange[0]);
		//$("#spinner").show();
		$("#calculating-spinner").modal('show');
		if(jpsurvData.stage2completed == 1) {
			stage3();  // This is a recalculation.
			retrieveResults();
		} else {
			stage2(); // This is the initial calculation and setup.
			retrieveResults();
		}

		//$("#spinner").hide();
		$("#calculating-spinner").modal('hide');
		//getApcTable();
	//}

}

function setPlotData() {
	//console.log("setPlotData() - after STAGE 3");
	//console.dir(jpsurvData);
	$('#jpsurv-message-container').hide();

	jpsurvData.plot.form.intervals = $('#plot_intervals').val();
	jpsurvData.plot.form.covariateVars = $('#covariate_value_select').val();
	jpsurvData.plot.static.imageId++;
	// Create a unique image id.
	get_plot();
	$('#plot-image').attr('src', '../jpsurv/tmp/plot-'+jpsurvData.tokenId+'-'+jpsurvData.plot.static.imageId+'.png')
}

function file_submit(event) {
	event.preventDefault();
	//set tokenId
	$("#calculating-spinner").modal('show');
	jpsurvData.tokenId = parseInt(Math.random()*1000000);
	$("#upload-form").attr('action', '/jpsurvRest/stage1_upload?tokenId='+jpsurvData.tokenId);
	getRestServerStatus();
	$("#calculating-spinner").modal('hide');

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
		var tokenId = jpsurvData.tokenId;
		//console.log("jpsurvData");
		//console.log(JSON.stringify(jpsurvData));
		//console.dir(jpsurvData);
		if(jpsurvData.stage2completed == 0) {
			createModelSelection();
		}
		updateTabs(tokenId);
		//Change stage2completed HERE.  After retrieving file.
		jpsurvData.stage2completed = 1;
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

function stage2() {

	$("#jpsurv-message-container").hide();

	//console.log("STAGE 2");
	jpsurvData.recentTrends = 0;

	//Run initial calculation with setup.
	incrementImageId();

	//console.log(JSON.stringify(jpsurvData));
	//console.dir(jpsurvData);

	jpsurvData.additional.yearOfDiagnosis = jpsurvData.calculate.form.yearOfDiagnosisRange[0].toString();
	//jpsurvData.additional.yearOfDiagnosis = "1988";

	//alert(JSON.stringify(jpsurvData.additional));

	var params = getParams();
	var comm_results = JSON.parse(jpsurvRest('stage2_calculate', params));

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

	console.warn("STAGE 3");
	//alert("stage 3");
	console.info("HERE ARE the new values for re-calculate purposes.");
	//alert($("#year-of-diagnosis").val());

	//
	// SET START YEAR
	//
	//jpsurvData.calculate.form.yearOfDiagnosisRange[0] = parseInt($("#year-of-diagnosis").val());
	//jpsurvData.calculate.static.yearOfDiagnosisTitle = "Year of diagnosis "+$("#year-of-diagnosis").val()+"+";
	$("#year_of_diagnosis_start").val(jpsurvData.calculate.form.yearOfDiagnosisRange[0]);

	//jpsurvData.additional.headerJoinPoints = 1;

	console.log("INTERVALS");
	var intervals = $("#interval-years").val();
	//
	// SET INTERVALS
	//
	jpsurvData.additional.intervals = [];
	$.each(intervals, function( index, value ) {
		jpsurvData.additional.intervals[index] = parseInt(value);
	});

//	jpsurvData.calculate.static.yearOfDiagnosisVarName = "Year_of_diagnosis_"+$("#year-of-diagnosis").val();
//	jpsurvData.calculate.static.yearOfDiagnosisVarName = "Year_of_diagnosis_1975+";

	//console.info("calculate.form.yearOfDiagnosisRange");
	//console.dir(jpsurvData.calculate.form.yearOfDiagnosisRange);
	//console.info("calculate.static.yearOfDiagnosisVarName");
	//console.log(jpsurvData.calculate.static.yearOfDiagnosisVarName);


	incrementImageId();
	//console.warn("STRINGIFY inputs");
	delete jpsurvData.results;
	//console.log(JSON.stringify(jpsurvData));

	var params = getParams();
	var comm_results = JSON.parse(jpsurvRest('stage3_recalculate', params));
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
	  build_parameter_column();
	  // The following is for demo purpose only.
	  //Temp change a title
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

	//reader.readAsText(file_control, "UTF-8");
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

function get_cohort_covariance_variable_names() {
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
				$('#spinner').hide();
				$('#spinner-plotting').hide();
				$('#apc-container').hide();
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
	//alert("Show Message");
	var css_class = "";
	var header = "";
	var container_id = id+"-message-container";

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

function getRestServerStatus() {

	var url = '/jpsurvRest/status';
	//console.log("getRestServerStatus");

// Assign handlers immediately after making the request,
// and remember the jqXHR object for this request
	var jqxhr = $.ajax( url )
	.done(function() {
		$("#upload-form").submit();
	})
	.fail(function(jqXHR, textStatus) {
		var id = 'jpsurv';
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
		$('#upload-instructions').hide();
	});
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

function onChange_covariate() {
	alert("This is never called.");
	var $this = $(this);
	if ($("#covariate_select option:selected").text()=="None") {
		$('#covariate_select').popover('destroy');
	} 
	if($("#covariate_select option:selected").text()!="None") {
		Makepopup('covariate_select',"Warning",'left',$this);
	}
}

function onChange_joints() {
	var $this = $(this);
	var joints = parseInt($("#max_join_point_select option:selected").text());
	if(joints>=3){
		Makepopup('max_join_point_select',"Warning",'top',$this);
	}
    update_join_point_limit(joints);
}

function Makepopup(id,title,loc,$this) {
	    var $e = $(this.target);
		    $("#"+id).popover({
		        trigger: 'manual',
		        placement: loc,
		        title: title,
		        content: $this.children('option:selected').attr("data-info") //this
		    }).popover('show');
		     $('.popover-title').append('<button type="button" class="close">&times;</button>');
		     $('.close').click(function(e){
	                $(this).parents('.popover').remove();
	            });
    setTimeout(function(){
    	$("#"+id).popover('destroy');
	}, 4000);
}

function update_join_point_limit(limit) {
	//console.log('called update' + limit);

	var options = "";
	for (var i = 1; i <= limit; i ++) {
		//console.log(i);		
		options += "<option>" + i + "</option>";
	}

	$("#header-join-points").html(options);
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
    		width: '66.666666%'
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

	console.log(decimalPlaces);

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

 
