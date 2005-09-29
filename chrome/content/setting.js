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


var sbPrefService = {

	get STRING() { return document.getElementById("ScrapBookString"); },

	defaultValues : {
		"sbPrefBrowserSubmenu"  	: false,
		"sbPrefTreeSingleExpand"	: false,
		"sbPrefTreeQuickDelete"		: false,
		"sbPrefCaptureDetail"		: false,
		"sbPrefCaptureNotify"		: false,
		"sbPrefCaptureUTF8Encode"	: true,
		"sbPrefCaptureRemoveScript"	: true,
		"sbPrefUseTabOpen"			: false,
		"sbPrefUseTabSource"		: false,
		"sbPrefUseTabCombine"		: false,
		"sbPrefUseTabSearch"		: false,
		"sbPrefUseTabOutput"		: false,
		"sbPrefUseTabNote"			: false,
	},

	shouldRefresh : false,

	init : function()
	{
		for ( var elemID in this.defaultValues )
		{
			var elem = document.getElementById(elemID);
			elem.checked = nsPreferences.getBoolPref(elem.getAttribute("prefstring"), this.defaultValues[elemID]);
		}
		document.getElementById("sbPrefFilerCheckbox").checked = nsPreferences.getBoolPref("scrapbook.filer.default", true);
		document.getElementById("sbPrefFilerTextbox").value = nsPreferences.copyUnicharPref("scrapbook.filer.path", "");
		this.toggleDefaultFiler();
		document.getElementById("sbPrefDataCheckbox").checked = nsPreferences.getBoolPref("scrapbook.data.default", true);
		document.getElementById("sbPrefDataTextbox").value = nsPreferences.copyUnicharPref("scrapbook.data.path", "");
		if ( document.getElementById("sbPrefDataCheckbox").checked )
		{
			document.getElementById("sbPrefTabs").selectedIndex = 3;
			document.getElementById("sbPrefDataAlert").hidden = false;
		}
		this.toggleDefaultData();
	},

	accept : function()
	{
		for ( var elemID in this.defaultValues )
		{
			var elem = document.getElementById(elemID);
			nsPreferences.setBoolPref(elem.getAttribute("prefstring"), elem.checked);
		}
		nsPreferences.setBoolPref("scrapbook.filer.default", document.getElementById("sbPrefFilerCheckbox").checked);
		nsPreferences.setUnicharPref("scrapbook.filer.path", document.getElementById("sbPrefFilerTextbox").value);
		nsPreferences.setBoolPref("scrapbook.data.default", document.getElementById("sbPrefDataCheckbox").checked);
		nsPreferences.setUnicharPref("scrapbook.data.path", document.getElementById("sbPrefDataTextbox").value);
		try {
			window.opener.top.sbBrowserOverlay.refresh();
			window.opener.location.reload();
		} catch(ex) {
			this.shouldRefresh = true;
			dump("sbPrefService::accept OPENED_FROM_EXTENSION_MANAGER\n");
		}
		if ( this.shouldRefresh )
		{
			dump("sbPrefService::accept shouldRefresh = true\n");
			var navEnum = SBservice.WINDOW.getEnumerator("navigator:browser");
			while ( navEnum.hasMoreElements() )
			{
				var nav = navEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
				try {
					nav.sbBrowserOverlay.refresh();
					nav.document.getElementById("sidebar").contentWindow.location.reload();
				} catch(ex) {
				}
			}
		}
	},

	toggleDefaultFiler : function()
	{
		document.getElementById("sbPrefFilerTextbox").disabled = document.getElementById("sbPrefFilerCheckbox").checked;
		document.getElementById("sbPrefFilerButton").disabled  = document.getElementById("sbPrefFilerCheckbox").checked;
	},

	selectFiler : function()
	{
		var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		FP.init(window, document.getElementById("sbPrefFilerCaption").label, FP.modeOpen);
		FP.appendFilters(FP.filterApps);
		var answer = FP.show();
		if ( answer == FP.returnOK )
		{
			var theFile = FP.file;
			document.getElementById("sbPrefFilerTextbox").value = theFile.path;
		}
	},

	toggleDefaultData : function()
	{
		document.getElementById("sbPrefDataTextbox").disabled = document.getElementById("sbPrefDataCheckbox").checked;
		document.getElementById("sbPrefDataButton").disabled  = document.getElementById("sbPrefDataCheckbox").checked;
	},

	selectData : function()
	{
		var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		FP.init(window, this.STRING.getString("SELECT_DESTINATION"), FP.modeGetFolder);
		var answer = FP.show();
		if ( answer == FP.returnOK )
		{
			var theFile = FP.file;
			document.getElementById("sbPrefDataTextbox").value = theFile.path;
			this.shouldRefresh = true;
		}
	},

};


