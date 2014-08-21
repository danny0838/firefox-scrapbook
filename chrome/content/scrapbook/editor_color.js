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
		document.getElementById("sbColorTextPicker").style.display = "none";
		document.getElementById("sbColorBgPicker").style.display = "none";
	}
	gColorTextChecker = document.getElementById("sbColorText");
	gColorBgChecker = document.getElementById("sbColorBg");
	// restore last selection
	gColorTextChecker.checked = sbCommonUtils.getPref("edit.color.lastPickedText", true);
	gColorBgChecker.checked = sbCommonUtils.getPref("edit.color.lastPickedBg", false);
	gColorTextPicker[gColorType] = sbCommonUtils.getPref("edit.color.lastPickedTextColor", "#000000");
	gColorBgPicker[gColorType] = sbCommonUtils.getPref("edit.color.lastPickedBgColor", "#FFFFFF");
}

function accept() {
	sbCommonUtils.setPref("edit.color.lastPickedText", gColorTextChecker.checked);
	sbCommonUtils.setPref("edit.color.lastPickedBg", gColorBgChecker.checked);
	gData.result = (gColorTextChecker.checked || gColorBgChecker.checked) ? 1 : 0;
	gData.textColor = gColorTextChecker.checked ? gColorTextPicker[gColorType] : null;
	gData.bgColor = gColorBgChecker.checked ? gColorBgPicker[gColorType] : null;
}

function pick(aElem, aIDToCheck) {
	if (aElem == gColorTextPicker) {
		sbCommonUtils.setPref("edit.color.lastPickedTextColor", aElem[gColorType]);
	}
	else if (aElem == gColorBgPicker) {
		sbCommonUtils.setPref("edit.color.lastPickedBgColor", aElem[gColorType]);
	}
	document.getElementById(aIDToCheck).checked = true;
}
