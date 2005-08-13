/**************************************************
// setting.js
// Implementation file for setting.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBstring;
var SBshouldRefresh;
var SBcheckElems = {
	'ScrapBookBrowserSubmenu'  		: false,
	'ScrapBookTreeSingleExpand'		: false,
	'ScrapBookTreeQuickDelete'		: false,
	'ScrapBookViewHeader'			: false,
	'ScrapBookCaptureDetail'		: false,
	'ScrapBookCaptureNotify'		: false,
	'ScrapBookCaptureUTF8Encode'	: true,
	'ScrapBookCaptureRemoveScript'	: true,
	'ScrapBookUseTabO'	: false,
	'ScrapBookUseTabS'	: false,
	'ScrapBookUseTabC'	: false,
	'ScrapBookUseTabR'	: false,
	'ScrapBookUseTabP'	: false,
	'ScrapBookUseTabN'	: false,
};



function SB_initSetting()
{
	SBstring = document.getElementById("ScrapBookString");
	SBshouldRefresh = false;
	for ( var elem in SBcheckElems )
	{
		var elem = document.getElementById(elem);
		elem.checked = nsPreferences.getBoolPref(elem.getAttribute("prefstring"), SBcheckElems[elem]);
	}
	var iShowEditor = nsPreferences.getBoolPref("scrapbook.view.editor", false) ? 0 : 1;
	document.getElementById("ScrapBookViewEditor" + iShowEditor).setAttribute("selected", true);
	document.getElementById("ScrapBookProgramFilerCheckbox").checked = nsPreferences.getBoolPref("scrapbook.filer.default", true);
	document.getElementById("ScrapBookProgramFilerTextbox").value = nsPreferences.copyUnicharPref("scrapbook.filer.path", "");
	SB_toggleDefaultProgramFiler();
	document.getElementById("ScrapBookDataCheckbox").checked = nsPreferences.getBoolPref("scrapbook.data.default", true);
	document.getElementById("ScrapBookDataTextbox").value = nsPreferences.copyUnicharPref("scrapbook.data.path", "");
	SB_toggleDefaultDestination();
}


function SB_acceptSetting()
{
	for ( var elem in SBcheckElems )
	{
		var elem = document.getElementById(elem);
		nsPreferences.setBoolPref(elem.getAttribute("prefstring"), elem.checked);
	}
	var bShowEditor = document.getElementById("ScrapBookViewEditor0").selected;
	nsPreferences.setBoolPref("scrapbook.view.editor", bShowEditor);
	nsPreferences.setBoolPref("scrapbook.filer.default", document.getElementById("ScrapBookProgramFilerCheckbox").checked);
	nsPreferences.setUnicharPref("scrapbook.filer.path", document.getElementById("ScrapBookProgramFilerTextbox").value);
	nsPreferences.setBoolPref("scrapbook.data.default", document.getElementById("ScrapBookDataCheckbox").checked);
	nsPreferences.setUnicharPref("scrapbook.data.path", document.getElementById("ScrapBookDataTextbox").value);

	try {
		window.opener.top.sbBrowserOverlay.refresh();
		window.opener.location.reload();
	} catch(ex) {
		SBshouldRefresh = true;
	}

	if ( SBshouldRefresh )
	{
		var navEnum = SBservice.WM.getEnumerator("navigator:browser");
		while ( navEnum.hasMoreElements() )
		{
			var nav = navEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			try {
				nav.sbBrowserOverlay.refresh();
				nav.document.getElementById("sidebar").contentDocument.location.reload();
			} catch(ex) {
			}
		}
	}
}


function SB_toggleDefaultProgramFiler()
{
	document.getElementById("ScrapBookProgramFilerTextbox").disabled = document.getElementById("ScrapBookProgramFilerCheckbox").checked;
	document.getElementById("ScrapBookProgramFilerButton").disabled  = document.getElementById("ScrapBookProgramFilerCheckbox").checked;
}


function SB_selectProgramFiler()
{
	var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
	FP.init(window, SBstring.getString("SELECT_FILER"), FP.modeOpen);
	FP.appendFilters(FP.filterApps);
	var answer = FP.show();
	if ( answer == FP.returnOK )
	{
		var theFile = FP.file;
		document.getElementById("ScrapBookProgramFilerTextbox").value = theFile.path;
	}
}


function SB_toggleDefaultDestination()
{
	document.getElementById("ScrapBookDataTextbox").disabled = document.getElementById("ScrapBookDataCheckbox").checked;
	document.getElementById("ScrapBookDataButton").disabled  = document.getElementById("ScrapBookDataCheckbox").checked;
}


function SB_selectDestination()
{
	var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
	FP.init(window, SBstring.getString("SELECT_DESTINATION"), FP.modeGetFolder);
	var answer = FP.show();
	if ( answer == FP.returnOK )
	{
		var theFile = FP.file;
		document.getElementById("ScrapBookDataTextbox").value = theFile.path;
		SBchangeDestination = true;
	}
}


