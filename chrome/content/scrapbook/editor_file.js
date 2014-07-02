var gData;

function init() {
	if ( !window.arguments) window.close();
	gData = window.arguments[0];
}

function accept() {
	gData.file = document.getElementById("sbFilePath").value;
	gData.format = document.getElementById("sbFileFormat").value;
	gData.result = gData.file ? 1 : 0;
}

function pickFile() {
	var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
	FP.init(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_TITLE"), FP.modeOpen);
	var ret = FP.show();
	if ( ret != FP.returnOK ) return;
	document.getElementById("sbFilePath").label = FP.file.path;
	document.getElementById("sbFilePath").value = FP.file;
}