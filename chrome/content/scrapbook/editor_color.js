var gData;
var gColorType;
var gColorTextChecker;
var gColorTextPicker;
var gColorBgChecker;
var gColorBgPicker;

function init() {
	if ( !window.arguments) window.close();
	gData = window.arguments[0];
	// check if the HTML5 <input type="color" /> is supported
	// if not supported, this returns "text"
	if ( document.getElementById("sbColorTextPicker").type == "color" ) {
		// supported, use HTML5
		gColorType = "value";
		gColorTextPicker = document.getElementById("sbColorTextPicker");
		gColorBgPicker = document.getElementById("sbColorBgPicker");
	}
	else {
		// not supported, use colorpicker
		gColorType = "color";
		gColorTextPicker = document.getElementById("sbColorTextPicker2");
		gColorBgPicker = document.getElementById("sbColorBgPicker2");
		gColorTextPicker.hidden = false;
		gColorBgPicker.hidden = false;
		document.getElementById("sbColorTextPicker").hidden = true;
		document.getElementById("sbColorBgPicker").hidden = true;
	}
	gColorTextChecker = document.getElementById("sbColorText");
	gColorBgChecker = document.getElementById("sbColorBg");
	// restore last picked color
	gColorTextPicker[gColorType] = sbCommonUtils.getPref("edit.lastPickedTextColor", "#000000");
	gColorBgPicker[gColorType] = sbCommonUtils.getPref("edit.lastPickedBgColor", "#FFFFFF");
}

function accept() {
	gData.result = (gColorTextChecker.checked || gColorBgChecker.checked) ? 1 : 0;
	gData.textColor = gColorTextChecker.checked ? gColorTextPicker[gColorType] : null;
	gData.bgColor = gColorBgChecker.checked ? gColorBgPicker[gColorType] : null;
}

function pick(aElem, aIDToCheck) {
	if (aElem == gColorTextPicker) {
		sbCommonUtils.setPref("edit.lastPickedTextColor", aElem[gColorType]);
	}
	else if (aElem == gColorBgPicker) {
		sbCommonUtils.setPref("edit.lastPickedBgColor", aElem[gColorType]);
	}
	document.getElementById(aIDToCheck).checked = true;
}
