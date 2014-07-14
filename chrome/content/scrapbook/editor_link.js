var gData;

function init() {
	if ( !window.arguments) window.close();
	gData = window.arguments[0];
	if (gData.url) document.getElementById("sbLinkURL").value = gData.url;
	if (gData.id) document.getElementById("sbLinkID").value = gData.id;
	if (!gData.item) {
		document.getElementById("sbLinkIDUse").disabled = true;
		document.getElementById("sbLinkID").disabled = true;
	}
	pick( sbCommonUtils.getPref("edit.link.lastType", "sbLinkURLUse") );
	if (document.getElementById("sbLinkURLUse").selected) {
		document.getElementById("sbLinkURL").focus();
	}
	else {
		document.getElementById("sbLinkID").focus();
	}
	var lastFormat = sbCommonUtils.getPref("edit.link.lastFormat", "");
	if (lastFormat) document.getElementById("sbLinkFormat").value = lastFormat;
}

function accept() {
	gData.url_use = document.getElementById("sbLinkURLUse").selected;
	gData.id_use = document.getElementById("sbLinkIDUse").selected;
	gData.url = document.getElementById("sbLinkURL").value;
	gData.id = document.getElementById("sbLinkID").value;
	gData.format = document.getElementById("sbLinkFormat").value;
	gData.result = ((gData.url_use && gData.url) || (gData.id_use && gData.id)) ? 1 : 0;
	sbCommonUtils.setPref("edit.link.lastType", gData.url_use ? "sbLinkURLUse" : "sbLinkIDUse");
	sbCommonUtils.setPref("edit.link.lastFormat", gData.format);
}

function pick(aIDToCheck) {
	document.getElementById("sbLinkSelector").selectedItem = document.getElementById(aIDToCheck);
}