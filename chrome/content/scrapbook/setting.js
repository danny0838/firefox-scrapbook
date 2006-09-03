
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
		if ( !sbMultiBookService.validateRefresh(true) )
		{
			var idList = ["sbPrefDataDefault", "sbPrefDataPath", "sbPrefDataButton", "sbPrefMultiBookEnabled"];
			idList.forEach(function(eltId){ document.getElementById(eltId).disabled = true; });
		}
		if ( !window.arguments && (new Date()).getSeconds() % 10 == 0 )
		{
			setTimeout(function(){ sbPrefService.clearUnusedPrefs(); }, 100);
		}
	},

	clearUnusedPrefs : function()
	{
		var oldPrefNames = [
			"capture.detail",
			"capture.notify",
			"tree.singleexpand",
			"tree.quickdelete",
			"usetab.open",
			"usetab.source",
			"usetab.view",
			"usetab.combine",
			"usetab.search",
			"usetab.output",
			"usetab.home",
			"usetab.export",
			"usetab.note",
			"filer.default",
			"filer.path",
			"detaildialog",
			"notification",
			"hidefavicon",
			"folderclick",
			"quickdelete",
			"utf8encode",
			"editor.comment",
			"editor.marker",
			"editor.blockstyle",
			"edit.multilines",
			"edit.confirmsave",
			"edit.showheader",
			"view.header",
			"view.editor",
			"view.infobar",
			"detail.recentfolder",
			"capture.utf8encode",
			"capture.removescript",
		];
		oldPrefNames.forEach(function(aPrefName)
		{
			try {
				sbCommonUtils.PREF.clearUserPref("scrapbook." + aPrefName);
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

	selectData : function(aTitle)
	{
		var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		FP.init(window, aTitle, FP.modeGetFolder);
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


