////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Solace Corporation Messaging SDK for JavaScript
// Copyright 2010-2017 Solace Systems Inc. All rights reserved.
// http://www.SolaceSystems.com
//
//                              * solUIHelper *
//
// This file contains methods help painting the UI, and methods to aapend inputs to the log text area
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function download() {
	//download source
	window.location = "./soldemosrc.zip";
}

function aboutSolace() {
	//About Solace
	window.open("http://www.solacesystems.com");
}

function readme() {
	//New window with documentation
	window.open("./readme.html");
}

function topics_doc() {
	//New window with documentation
	window.open("./topics.html");
}
function documentation() {
	//New window with documentation
	window.open("./api/index.html");
}

function padLeft(str, padChar, length) {
	str = str + "";
	while (str.length < length) {
		str = padChar + str;
	}
	return str;
}

function getDateInDDMONFormat(str) {
	//str=2017-10-30 yyyy-mm-dd
	//alert(str);
    var depDate = str.substring(8,10);
    var depMonth = str.substring(5,7);
	var caseMonth;
	
	//alert(depMonth);
   	switch (eval(depMonth)) {

		case 01:
			caseMonth = "JAN";
			break;
		case 02:
			caseMonth = "FEB";
			break;
		case 03:
			caseMonth = "MAR";
			break;
		case 04:
			caseMonth = "APR";
			break;
		case 05:
			caseMonth = "MAY";
			break;
		case 06:
			caseMonth = "JUN";
		case 07:
			caseMonth = "JUL";
			break;
		case 08:
			caseMonth = "AUG";
			break;
		case 09:
			caseMonth = "SEP";
			break;
		case 10:
			caseMonth = "OCT";
			break;
		case 11:
			caseMonth = "NOV";
			break;
		case 12:
			caseMonth = "DEC";        
	}
	
  	var depDateFormatted = depDate + "-" + caseMonth;
    
    return depDateFormatted;
	
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function endsWithEven(str) {
    if(eval(str.substring(str.length-1)) %2 >0) 
    	return false;
    else
    	return true;  	
}

function utils_currentTime() {
	var currentTime = new Date();
	return padLeft(currentTime.getHours(), '0', 2) + ":" +
			padLeft(currentTime.getMinutes(), '0', 2) + ":" +
			padLeft(currentTime.getSeconds(), '0', 2) + "." +
			padLeft(currentTime.getMilliseconds(), '0', 3);
}

function logUtil(line) {
	var message = utils_currentTime() + ":" + line + "\n";
	//alert(message);
	//var txtarea = document.getElementById("txaConsoleLog");
	//txtarea.value = message + txtarea.value;
}
