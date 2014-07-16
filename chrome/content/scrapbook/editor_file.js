var gData;

function init() {
	if ( !window.arguments) window.close();
	gData = window.arguments[0];
	if (gData.url) document.getElementById("sbFileHTML").value = gData.url;
	document.getElementById("sbFileInsert").checked = sbCommonUtils.getPref("edit.file.lastInsert", true);
	var lastFormat = sbCommonUtils.getPref("edit.file.lastFormat", "");
	if (lastFormat) document.getElementById("sbFileFormat").value = lastFormat;

	// pick the last picked type and focus the corresponding field
	pick( sbCommonUtils.getPref("edit.file.lastType", "sbFileFileUse") );
	if (document.getElementById("sbFileFileUse").selected) {
		document.getElementById("sbFilePicker").focus();
	}
	else if (document.getElementById("sbFileHTMLUse").selected) {
		document.getElementById("sbFileHTML").focus();
	}
	else if (document.getElementById("sbFileHistHTMLUse").selected) {
		document.getElementById("sbFileHistHTML").focus();
	}
}

function accept() {
	gData.file_use = document.getElementById("sbFileFileUse").selected;
	gData.html_use = document.getElementById("sbFileHTMLUse").selected;
	gData.hist_html_use = document.getElementById("sbFileHistHTMLUse").selected;
	gData.file = document.getElementById("sbFilePath").value;
	gData.html = document.getElementById("sbFileHTML").value;
	gData.hist_html = document.getElementById("sbFileHistHTML").value;
	gData.insert = document.getElementById("sbFileInsert").checked;
	gData.format = document.getElementById("sbFileFormat").value;
	gData.result = ((gData.file_use && gData.file) || (gData.html_use && gData.html) || (gData.hist_html_use)) ? 1 : 0;
	sbCommonUtils.setPref("edit.file.lastType", document.getElementById("sbFileSelector").selectedItem.id);
	sbCommonUtils.setPref("edit.file.lastInsert", gData.insert);
	sbCommonUtils.setPref("edit.file.lastFormat", gData.format);
}

function pickFile() {
	var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
	FP.init(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_TITLE"), FP.modeOpen);
	var ret = FP.show();
	if ( ret != FP.returnOK ) return false;
	document.getElementById("sbFilePath").label = FP.file.path;
	document.getElementById("sbFilePath").value = FP.file;
	return true;
}

function pick(aIDToCheck) {
	document.getElementById("sbFileSelector").selectedItem = document.getElementById(aIDToCheck);
}