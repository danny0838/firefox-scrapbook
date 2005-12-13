
var sbPrefService = {

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
			document.getElementById("sbPrefTabs").selectedIndex = 4;
			document.getElementById("sbPrefDataAlert").hidden = false;
		}
		this.toggleDefaultData();
		if ( window.arguments && window.arguments[0] == "e" ) document.getElementById("sbPrefTabs").selectedIndex = 3;
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
			if ( window.opener.location.href.indexOf("scrapbook") > 0 )
				window.opener.location.reload();
			else
				this.shouldRefresh = true;
		} catch(ex) {
			this.shouldRefresh = true;
		}
		if ( this.shouldRefresh )
		{
			dump("sbPrefService::accept REFRESH_ALL_WINDOWS\n");
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
		FP.init(window, document.getElementById("sbPrefDataExplain").value, FP.modeGetFolder);
		var answer = FP.show();
		if ( answer == FP.returnOK )
		{
			var theFile = FP.file;
			document.getElementById("sbPrefDataTextbox").value = theFile.path;
			this.shouldRefresh = true;
		}
	},

};


var hlPrefService = {

	initFlag : false,
	shouldUpdate : false,

	init : function()
	{
		if ( this.initFlag ) return;
		this.initFlag = true;
		var node = document.getElementById("hlPrefBox");
		for ( var idx = 1; idx <= 4; idx++ )
		{
			var newNode = node.cloneNode(true);
			newNode.hidden = false;
			newNode.firstChild.value += idx + ":";
			newNode.firstChild.nextSibling.id = "hlPrefLabel" + idx;
			newNode.lastChild.setAttribute("color", idx);
			node.parentNode.insertBefore(newNode, node);
		}
		window.sizeToContent();
		this.update();
	},

	update : function()
	{
		this.shouldUpdate = false;
		for ( idx = 4; idx > 0; idx-- )
		{
			var cssText = nsPreferences.copyUnicharPref("scrapbook.highlighter.style." + idx, sbHighlighter.PRESET_STYLES[idx]);
			sbHighlighter.decorateElement(document.getElementById("hlPrefLabel" + idx), cssText);
		}
	},

	openDialog : function(idx)
	{
		window.openDialog('chrome://scrapbook/content/hlCustom.xul', '', 'modal,centerscreen,chrome',idx);
		if ( this.shouldUpdate ) this.update();
	},

	customizeBlockStyle : function()
	{
		var file = SBcommon.getScrapBookDir().clone();
		file.append("block.css");
		if ( !file.exists() )
		{
			SBcommon.saveTemplateFile("chrome://scrapbook/skin/block.css", file);
			setTimeout(function(){ hlPrefService.customizeBlockStyle(); }, 1000);
			return;
		}
		file.QueryInterface(Components.interfaces.nsILocalFile).launch();
	},

};


