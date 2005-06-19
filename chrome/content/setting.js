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
var SBdataBack;
var SBdataPathBack;
var SBcheckList = {
	'ScrapBookBrowserSubmenu'  		: false,
	'ScrapBookCaptureDetail'		: false,
	'ScrapBookCaptureNotify'		: false,
	'ScrapBookTreeSingleExpand'		: false,
	'ScrapBookTreeQuickDelete'		: false,
	'ScrapBookCaptureUTF8Encode'	: true,
	'ScrapBookCaptureRemoveScript'	: true,
	'ScrapBookEditShowHeader'		: true,
	'ScrapBookEditMultilines'		: false,
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
	for ( var aCheck in SBcheckList )
	{
		var aCheckXUL = document.getElementById(aCheck);
		aCheckXUL.checked = nsPreferences.getBoolPref(aCheckXUL.getAttribute("prefstring"), SBcheckList[aCheck]);
	}
	document.getElementById("ScrapBookProgramFilerCheckbox").checked = nsPreferences.getBoolPref("scrapbook.filer.default", true);
	document.getElementById("ScrapBookProgramFilerTextbox").value = nsPreferences.copyUnicharPref("scrapbook.filer.path", "");
	SB_toggleDefaultProgramFiler();
	SBdataBack     = document.getElementById("ScrapBookDataCheckbox").checked = nsPreferences.getBoolPref("scrapbook.data.default", true);
	SBdataPathBack = document.getElementById("ScrapBookDataTextbox").value = nsPreferences.copyUnicharPref("scrapbook.data.path", "");
	SB_toggleDefaultDestination();
	document.getElementById("ScrapBookEditConfirmSave").value = nsPreferences.getIntPref("scrapbook.edit.confirmsave", 3);
}


function SB_acceptSetting()
{
	for ( var aCheck in SBcheckList )
	{
		var aCheckXUL = document.getElementById(aCheck);
		nsPreferences.setBoolPref(aCheckXUL.getAttribute("prefstring"), aCheckXUL.checked);
	}
	nsPreferences.setIntPref("scrapbook.edit.confirmsave", parseInt(document.getElementById("ScrapBookEditConfirmSave").value));
	nsPreferences.setBoolPref("scrapbook.filer.default", document.getElementById("ScrapBookProgramFilerCheckbox").checked);
	nsPreferences.setUnicharPref("scrapbook.filer.path", document.getElementById("ScrapBookProgramFilerTextbox").value);
	nsPreferences.setBoolPref("scrapbook.data.default", document.getElementById("ScrapBookDataCheckbox").checked);
	nsPreferences.setUnicharPref("scrapbook.data.path", document.getElementById("ScrapBookDataTextbox").value);
	if ( SBdataBack     != document.getElementById("ScrapBookDataCheckbox").checked || 
	     SBdataPathBack != document.getElementById("ScrapBookDataTextbox").value )
	{
		document.getElementById("ScrapBookSettingTabpanels").selectedIndex = 4;
		SB_resolveIconURL(false);
	}
	window.opener.location.reload();
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
	}
}


function SB_resolveIconURL(verbose)
{
	var tmp = document.getElementById("ScrapBookDataTextbox").value;

	SBRDF.init();

	var dataDir = SBcommon.getScrapBookDir().clone();
	dataDir.append("data");
	var dataDirURL = SBcommon.convertFilePathToURL(dataDir.path);

	if ( dataDirURL.charAt(dataDirURL.length - 1) != "/" ) dataDirURL = dataDirURL + "/";

	var shouldFlush = false;
	var ResSet = SBRDF.data.GetAllResources();
	while ( ResSet.hasMoreElements() )
	{
		var myRes = ResSet.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
		var myID   = SBRDF.getProperty("id", myRes);
		var myIcon = SBRDF.getProperty("icon", myRes);
		if ( verbose ) document.getElementById("ScrapBookDataTextbox").value = SBstring.getString("RESOLVE_ICON_URL") + myID;
		if ( myIcon.match(/(\d{14}\/.*$)/) )
		{
			var newIcon = dataDirURL + RegExp.$1;
			if ( myIcon != newIcon )
			{
				dump("*** resolve icon URL: " + newIcon + "\n");
				SBRDF.updateItem(myRes, "icon", newIcon);
				document.getElementById("ScrapBookDataTextbox").value = SBstring.getString("RESOLVE_ICON_URL") + myRes.Value;
				shouldFlush = true;
			}
		}
	}
	if ( shouldFlush ) SBRDF.flush();

	document.getElementById("ScrapBookDataTextbox").value = tmp;
}


