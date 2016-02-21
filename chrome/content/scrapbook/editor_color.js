var gData;
var gColorType;
var gColorTextChecker;
var gColorTextPicker;
var gColorTextHidden;
var gColorBgChecker;
var gColorBgPicker;
var gColorBgHidden;

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
    } else {
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
    gColorTextHidden = document.getElementById("sbColorTextValue");
    gColorBgHidden = document.getElementById("sbColorBgValue")
    // sync values from textbox to colorpicker
    gColorTextPicker[gColorType] = gColorTextHidden.getAttribute('value');
    gColorBgPicker[gColorType] = gColorBgHidden.getAttribute('value');
}

function accept() {
    gData.result = (gColorTextChecker.checked || gColorBgChecker.checked) ? 1 : 0;
    gData.textColor = gColorTextChecker.checked ? gColorTextHidden.getAttribute('value') : null;
    gData.bgColor = gColorBgChecker.checked ? gColorBgHidden.getAttribute('value') : null;
}

function pick(aIDToCheck) {
    // sync value from colorpicker to textbox
    gColorTextHidden.setAttribute('value', gColorTextPicker[gColorType]);
    gColorBgHidden.setAttribute('value', gColorBgPicker[gColorType]);
    document.getElementById(aIDToCheck).checked = true;
}
