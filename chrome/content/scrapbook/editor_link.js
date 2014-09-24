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

	// focus the corresponding field of the selected radio
	if (document.getElementById("sbLinkURLUse").selected) {
		document.getElementById("sbLinkURL").focus();
	}
	else {
		document.getElementById("sbLinkID").focus();
	}

	// sync sbLinkFormatValue --> sbLinkFormat for persist
	document.getElementById("sbLinkFormat").value = document.getElementById("sbLinkFormatValue").getAttribute('value');
}

function accept() {
	gData.url_use = document.getElementById("sbLinkURLUse").selected;
	gData.id_use = document.getElementById("sbLinkIDUse").selected;
	gData.url = document.getElementById("sbLinkURL").value;
	gData.id = document.getElementById("sbLinkID").value;
	gData.format = document.getElementById("sbLinkFormat").value;
	gData.result = ((gData.url_use && gData.url) || (gData.id_use && gData.id)) ? 1 : 0;

	// sync sbLinkFormat --> sbLinkFormatValue for persist
	document.getElementById("sbLinkFormatValue").setAttribute('value', document.getElementById("sbLinkFormat").value);
}

function pick(aIDToCheck) {
	document.getElementById("sbLinkSelector").selectedItem = document.getElementById(aIDToCheck);
}