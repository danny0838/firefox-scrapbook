
var sbPrefService = {

	shouldCheck : false,

	init : function()
	{
		if ( document.getElementById("sbPrefDataDefault").checked )
		{
			document.getElementById("sbPrefDataAlert").hidden = false;
			document.getElementById("sbPrefTabs").selectedIndex = 4;
		}
		this.toggleDefaultData();
		this.toggleDefaultFileViewer();
		if ( !sbMultiBookService.validateRefresh(true) ) document.getElementById("sbPrefDataGroupbox").hidden = true;
		if ( window.arguments && window.arguments[0] == "e" )
		{
			document.getElementById("sbPrefTabs").selectedIndex = 3;
			document.getElementById("sbPrefDataGroupbox").hidden = true;
		}
		if ( !window.arguments && (new Date()).getSeconds() % 10 == 0 )
		{
			setTimeout(function(){ sbPrefService.clearUnusedPrefs(); }, 100);
		}
	},

	clearUnusedPrefs : function()
	{
		var oldPrefNames = [
			"scrapbook.capture.detail",
			"scrapbook.capture.notify",
			"scrapbook.tree.singleexpand",
			"scrapbook.tree.quickdelete",
			"scrapbook.usetab.open",
			"scrapbook.usetab.source",
			"scrapbook.usetab.view",
			"scrapbook.usetab.combine",
			"scrapbook.usetab.search",
			"scrapbook.usetab.output",
			"scrapbook.usetab.home",
			"scrapbook.usetab.export",
			"scrapbook.usetab.note",
			"scrapbook.filer.default",
			"scrapbook.filer.path",
			"scrapbook.detaildialog",
			"scrapbook.notification",
			"scrapbook.hidefavicon",
			"scrapbook.folderclick",
			"scrapbook.quickdelete",
			"scrapbook.utf8encode",
			"scrapbook.editor.comment",
			"scrapbook.editor.marker",
			"scrapbook.editor.blockstyle",
			"scrapbook.edit.multilines",
			"scrapbook.edit.confirmsave",
			"scrapbook.edit.showheader",
			"scrapbook.view.header",
			"scrapbook.view.editor",
			"scrapbook.view.infobar",
			"scrapbook.detail.recentfolder",
			"scrapbook.capture.utf8encode",
			"scrapbook.capture.removescript",
		];
		oldPrefNames.forEach(function(aPrefName)
		{
			try {
				sbCommonUtils.PREF.clearUserPref(aPrefName);
			} catch(ex) {
			}
		});
	},

	done : function()
	{
		if ( this.changed )
		{
			sbMultiBookService.refreshGlobal();
		}
	},

	toggleDefaultData : function()
	{
		var isDefault = document.getElementById("sbPrefDataDefault").checked;
		var mbEnabled = document.getElementById("sbPrefMultiBookEnabled").checked;
		document.getElementById("sbPrefDataDefault").disabled = mbEnabled;
		document.getElementById("sbPrefDataPath").disabled    = isDefault || mbEnabled;
		document.getElementById("sbPrefDataButton").disabled  = isDefault || mbEnabled;
	},

	toggleDefaultFileViewer : function()
	{
		var isDefault = document.getElementById("sbPrefFileViewerDefault").checked;
		document.getElementById("sbPrefFileViewerPath").disabled   = isDefault;
		document.getElementById("sbPrefFileViewerButton").disabled = isDefault;
	},

	selectData : function()
	{
		var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		FP.init(window, document.getElementById("sbPrefDataButton").getAttribute("tooltiptext"), FP.modeGetFolder);
		if ( FP.show() == FP.returnOK )
		{
			document.getElementById("sbPrefDataPath").value = FP.file.path;
			document.getElementById("scrapbook.data.path").value = FP.file.path;
		}
	},

	selectFileViewer : function()
	{
		var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		FP.init(window, document.getElementById("sbPrefFileViewerCaption").label, FP.modeOpen);
		FP.appendFilters(FP.filterApps);
		if ( FP.show() == FP.returnOK )
		{
			document.getElementById("sbPrefFileViewerPath").value = FP.file.path;
			document.getElementById("scrapbook.fileViewer.path").value = FP.file.path;
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

};


