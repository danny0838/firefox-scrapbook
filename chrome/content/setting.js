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



var SBdataBack;
var SBdataPathBack;
var SBcheckList = {
	'ScrapBookFolderClick'	: false,
	'ScrapBookDetailDialog'	: false,
	'ScrapBookNotification'	: false,
	'ScrapBookHideFavicon'	: false,
	'ScrapBookQuickDelete'	: false,
	'ScrapBookUTF8Encode'	: true,
	'ScrapBookUseTabO'		: false,
	'ScrapBookUseTabS'		: false,
	'ScrapBookUseTabV'		: false,
	'ScrapBookUseTabR'		: false,
	'ScrapBookUseTabX'		: false,
	'ScrapBookUseTabH'		: false,
};




function SB_initSetting()
{
	for ( var eCheck in SBcheckList )
	{
		var eCheckXUL = document.getElementById(eCheck);
		eCheckXUL.checked = nsPreferences.getBoolPref(eCheckXUL.getAttribute("prefstring"), SBcheckList[eCheck]);
	}
	document.getElementById("ScrapBookFilerCheckbox").checked = nsPreferences.getBoolPref("scrapbook.filer.default", true);
	document.getElementById("ScrapBookFilerTextbox").value = nsPreferences.copyUnicharPref("scrapbook.filer.path", "");
	SB_onCommandFilerCheckbox();
	SBdataBack     = document.getElementById("ScrapBookDataCheckbox").checked = nsPreferences.getBoolPref("scrapbook.data.default", true);
	SBdataPathBack = document.getElementById("ScrapBookDataTextbox").value = nsPreferences.copyUnicharPref("scrapbook.data.path", "");
	SB_onCommandDataCheckbox();
}


function SB_acceptSetting()
{
	for ( var eCheck in SBcheckList )
	{
		var eCheckXUL = document.getElementById(eCheck);
		nsPreferences.setBoolPref(eCheckXUL.getAttribute("prefstring"), eCheckXUL.checked);
	}
	nsPreferences.setBoolPref("scrapbook.filer.default", document.getElementById("ScrapBookFilerCheckbox").checked);
	nsPreferences.setUnicharPref("scrapbook.filer.path", document.getElementById("ScrapBookFilerTextbox").value);
	nsPreferences.setBoolPref("scrapbook.data.default", document.getElementById("ScrapBookDataCheckbox").checked);
	nsPreferences.setUnicharPref("scrapbook.data.path", document.getElementById("ScrapBookDataTextbox").value);
	if ( SBdataBack     != document.getElementById("ScrapBookDataCheckbox").checked || 
	     SBdataPathBack != document.getElementById("ScrapBookDataTextbox").value )
	{
		document.getElementById("ScrapBookSettingTabpanels").selectedIndex = 2;
		SB_reconstructRDF();
		window.opener.location.reload();
	}
}


function SB_onCommandFilerCheckbox()
{
	document.getElementById("ScrapBookFilerTextbox").disabled = document.getElementById("ScrapBookFilerCheckbox").checked;
	document.getElementById("ScrapBookFilerButton").disabled  = document.getElementById("ScrapBookFilerCheckbox").checked;
}


function SB_onCommandFilerButton()
{
	var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
	FP.init(window, "Program for 'Browse Files' Menu", FP.modeOpen);
	FP.appendFilters(FP.filterApps);
	var answer = FP.show();
	if ( answer == FP.returnOK )
	{
		var theFile = FP.file;
		document.getElementById("ScrapBookFilerTextbox").value = theFile.path;
	}
}


function SB_onCommandDataCheckbox()
{
	document.getElementById("ScrapBookDataTextbox").disabled = document.getElementById("ScrapBookDataCheckbox").checked;
	document.getElementById("ScrapBookDataButton").disabled  = document.getElementById("ScrapBookDataCheckbox").checked;
}


function SB_onCommandDataButton()
{
	var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
	FP.init(window, "Select the 'ScrapBook' folder where to store collected data.", FP.modeGetFolder);
	var answer = FP.show();
	if ( answer == FP.returnOK )
	{
		var theFile = FP.file;
		document.getElementById("ScrapBookDataTextbox").value = theFile.path;
	}
}


function SB_reconstructRDF()
{
	SBRDF.init();

	var dataDir = SBcommon.getScrapBookDir().clone();
	dataDir.append("data");
	var dataDirURL = SBcommon.convertFilePathToURL(dataDir.path);

	var ResList = SBRDF.data.GetAllResources();
	while ( ResList.hasMoreElements() )
	{
		var myRes = ResList.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
		var mySBitem = new ScrapBookItem(SBRDF.getProperty("id", myRes));
		mySBitem.icon = SBRDF.getProperty("icon",  myRes);
		if ( mySBitem.icon.match(/\/data\/(\d{14}\/.*$)/) )
		{
			var newIconURL = dataDirURL + RegExp.$1;
			SBRDF.updateItem(myRes, "icon", newIconURL);
			document.getElementById("ScrapBookDataNotify").value = "scanning..." + myRes.Value;
		}
	}
}


