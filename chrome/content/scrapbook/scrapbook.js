
<<<<<<< HEAD
var sbMainService = {

	get STRING() { return document.getElementById("sbMainString"); },

	baseURL: "",
	prefs  : {},
=======
var sbMainUI = {
>>>>>>> release-1.6.0.a1


	init: function()
	{
<<<<<<< HEAD
		sbMultiBookService.showButton();
		sbDataSource.init();
		sbTreeHandler.init(false);
		sbTreeDNDHandler.init();
		sbListHandler.restoreLastState();
		this.baseURL = sbCommonUtils.getBaseHref(sbDataSource.data.URI);
		this.initPrefs();
		sbSearchService.init();
		setTimeout(function() { sbMainService.delayedInit(); }, 0);
=======
		sbMultiBookUI.showButton();
		sbTreeUI.init(false);
		sbTreeUI.enableDragDrop(true);
		sbSearchUI.init();
		setTimeout(function(self) { self.delayedInit(); }, 0, this);
>>>>>>> release-1.6.0.a1
	},

	delayedInit: function()
	{
<<<<<<< HEAD
		sbMultiBookService.showTitle();
		if ("sbBrowserOverlay" in window.top && window.top.sbBrowserOverlay.locateMe)
			this.locate(null);
	},

	initPrefs: function()
	{
		this.prefs.showDetailOnDrop = sbCommonUtils.getBoolPref("scrapbook.showDetailOnDrop",  false);
		this.prefs.confirmDelete    = sbCommonUtils.getBoolPref("scrapbook.confirmDelete",     true);
		this.prefs.tabsOpen         = sbCommonUtils.getBoolPref("scrapbook.tabs.open",         false);
		this.prefs.tabsOpenSource   = sbCommonUtils.getBoolPref("scrapbook.tabs.openSource",   false);
		this.prefs.tabsSearchResult = sbCommonUtils.getBoolPref("scrapbook.tabs.searchResult", true);
		this.prefs.tabsCombinedView = sbCommonUtils.getBoolPref("scrapbook.tabs.combinedView", true);
		this.prefs.tabsNote         = sbCommonUtils.getBoolPref("scrapbook.tabs.note",         false);
=======
		if ("ScrapBookBrowserOverlay" in window.top == false)
			return;
		sbMultiBookUI.showSidebarTitle();
		if (window.top.ScrapBookBrowserOverlay.locateMe)
			this.locate(null);
		if (!document.getElementById("sbAddOnsPopup").firstChild)
			document.getElementById("sbAddOns").hidden = true;
	},

	rebuild: function()
	{
		sbTreeUI.TREE.builder.rebuild();
>>>>>>> release-1.6.0.a1
	},

	refresh: function()
	{
<<<<<<< HEAD
		sbListHandler.quit();
		sbListHandler.exit();
		sbTreeHandler.exit();
		sbTreeDNDHandler.quit();
=======
		sbTreeUI.uninit();
>>>>>>> release-1.6.0.a1
		this.init();
	},

	done: function()
	{
		sbNoteService.save();
<<<<<<< HEAD
	},


	toggleHeader: function(aWillShow, aLabel)
	{
		document.getElementById("sbHeader").hidden = !aWillShow;
		document.getElementById("sbHeader").firstChild.value = aLabel;
=======
		sbSearchUI.uninit();
		sbTreeUI.uninit();
		if (this._traceTimer)
			window.clearTimeout(this._traceTimer)
>>>>>>> release-1.6.0.a1
	},

	trace: function(aText, aMillisec)
	{
		var status = top.window.document.getElementById("statusbar-display");
<<<<<<< HEAD
		if ( !status ) return;
=======
		if (!status)
			return;
>>>>>>> release-1.6.0.a1
		status.label = aText;
		var callback = function(self) {
			self._traceTimer = null;
			if (status.label == aText)
				status.label = "";
			status = null;
		};
		this._traceTimer = window.setTimeout(callback, aMillisec || 5000, this);
	},

	_traceTimer: null,

<<<<<<< HEAD
	locate: function(aRes)
	{
		if (!aRes)
			aRes = window.top.sbBrowserOverlay.locateMe;
		if ("sbBrowserOverlay" in window.top)
			window.top.sbBrowserOverlay.locateMe = null;
		if (aRes.Value == "urn:scrapbook:root")
			return;
		sbSearchService.exit();
		if (!sbDataSource.isContainer(aRes))
			sbListHandler.quit();
		sbTreeHandler.locateInternal(aRes);
=======

	locate: function(aRes)
	{
		if (!aRes)
			aRes = window.top.ScrapBookBrowserOverlay.locateMe;
		if ("ScrapBookBrowserOverlay" in window.top)
			window.top.ScrapBookBrowserOverlay.locateMe = null;
		if (aRes.Value == "urn:scrapbook:root")
			return;
		sbSearchUI.reset();
		sbTreeUI.locateInternal(aRes);
>>>>>>> release-1.6.0.a1
	},

	createFolder: function()
	{
<<<<<<< HEAD
		sbSearchService.exit();
		sbListHandler.quit();
		var newID = sbDataSource.identify(sbCommonUtils.getTimeStamp());
		var newItem = sbCommonUtils.newItem(newID);
		newItem.title = this.STRING.getString("DEFAULT_FOLDER");
		newItem.type = "folder";
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = sbTreeHandler.TREE.currentIndex;
			var curRes = sbTreeHandler.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = sbTreeHandler.getParentResource(curIdx);
			var curRelIdx = sbDataSource.getRelativeIndex(curPar, curRes);
=======
		sbSearchUI.reset();
		var newItem = ScrapBookData.newItem();
		newItem.title = ScrapBookUtils.getLocaleString("DEFAULT_FOLDER");
		newItem.type = "folder";
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = sbTreeUI.TREE.currentIndex;
			var curRes = sbTreeUI.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = sbTreeUI.getParentResource(curIdx);
			var curRelIdx = ScrapBookData.getRelativeIndex(curPar, curRes);
>>>>>>> release-1.6.0.a1
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
<<<<<<< HEAD
			tarResName = sbTreeHandler.TREE.ref;
			tarRelIdx  = 1;
			isRootPos  = true;
		}
		var newRes = sbDataSource.addItem(newItem, tarResName, tarRelIdx);
		sbTreeHandler.TREE.builder.rebuild();
		sbDataSource.createEmptySeq(newRes.Value);
		sbController.rebuildLocal();
		if (isRootPos)
			sbTreeHandler.TREE.treeBoxObject.scrollToRow(0);
		var idx = sbTreeHandler.TREE.builderView.getIndexOfResource(newRes);
		sbTreeHandler.TREE.view.selection.select(idx);
		sbTreeHandler.TREE.focus();
=======
			tarResName = sbTreeUI.TREE.ref;
			tarRelIdx  = 1;
			isRootPos  = true;
		}
		var newRes = ScrapBookData.addItem(newItem, tarResName, tarRelIdx);
		ScrapBookData.createEmptySeq(newRes.Value);
		ScrapBookUtils.refreshGlobal(false);
		sbMainUI.rebuild();
		if (isRootPos)
			sbTreeUI.TREE.treeBoxObject.scrollToRow(0);
		var idx = sbTreeUI.TREE.builderView.getIndexOfResource(newRes);
		sbTreeUI.TREE.view.selection.select(idx);
		sbTreeUI.TREE.focus();
>>>>>>> release-1.6.0.a1
		var result = {};
		window.openDialog(
			"chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome",
			newItem.id, result
		);
		if (!result.accept) {
<<<<<<< HEAD
			sbDataSource.deleteItemDescending(newRes, sbCommonUtils.RDF.GetResource(tarResName));
			sbDataSource.flush();
=======
			ScrapBookData.deleteItemDescending(newRes, ScrapBookUtils.RDF.GetResource(tarResName));
>>>>>>> release-1.6.0.a1
			return false;
		}
		return true;
	},

	createSeparator: function()
	{
<<<<<<< HEAD
		sbSearchService.exit();
		sbListHandler.quit();
		var newID = sbDataSource.identify(sbCommonUtils.getTimeStamp());
		var newItem = sbCommonUtils.newItem(newID);
		newItem.type = "separator";
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = sbTreeHandler.TREE.currentIndex;
			var curRes = sbTreeHandler.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = sbTreeHandler.getParentResource(curIdx);
			var curRelIdx = sbDataSource.getRelativeIndex(curPar, curRes);
=======
		sbSearchUI.reset();
		var newItem = ScrapBookData.newItem();
		newItem.type = "separator";
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = sbTreeUI.TREE.currentIndex;
			var curRes = sbTreeUI.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = sbTreeUI.getParentResource(curIdx);
			var curRelIdx = ScrapBookData.getRelativeIndex(curPar, curRes);
>>>>>>> release-1.6.0.a1
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
<<<<<<< HEAD
			tarResName = sbTreeHandler.TREE.ref;
			tarRelIdx  = 0;
			isRootPos  = true;
		}
		var newRes = sbDataSource.addItem(newItem, tarResName, tarRelIdx);
		sbTreeHandler.TREE.builder.rebuild();
		sbTreeHandler.TREE.view.selection.clearSelection();
		var idx = sbTreeHandler.TREE.builderView.getIndexOfResource(newRes);
		sbTreeHandler.TREE.treeBoxObject.ensureRowIsVisible(idx);
=======
			tarResName = sbTreeUI.TREE.ref;
			tarRelIdx  = 0;
			isRootPos  = true;
		}
		var newRes = ScrapBookData.addItem(newItem, tarResName, tarRelIdx);
		ScrapBookUtils.refreshGlobal(false);
		sbTreeUI.TREE.view.selection.clearSelection();
		var idx = sbTreeUI.TREE.builderView.getIndexOfResource(newRes);
		sbTreeUI.TREE.treeBoxObject.ensureRowIsVisible(idx);
>>>>>>> release-1.6.0.a1
	},

	createNote: function(aInTab)
	{
<<<<<<< HEAD
		sbSearchService.exit();
		sbListHandler.quit();
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = sbTreeHandler.TREE.currentIndex;
			var curRes = sbTreeHandler.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = sbTreeHandler.getParentResource(curIdx);
			var curRelIdx = sbDataSource.getRelativeIndex(curPar, curRes);
=======
		sbSearchUI.reset();
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = sbTreeUI.TREE.currentIndex;
			var curRes = sbTreeUI.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = sbTreeUI.getParentResource(curIdx);
			var curRelIdx = ScrapBookData.getRelativeIndex(curPar, curRes);
>>>>>>> release-1.6.0.a1
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
<<<<<<< HEAD
			tarResName = sbTreeHandler.TREE.ref;
=======
			tarResName = sbTreeUI.TREE.ref;
>>>>>>> release-1.6.0.a1
			tarRelIdx  = 0;
			isRootPos  = true;
		}
		sbNoteService.create(tarResName, tarRelIdx, aInTab);
<<<<<<< HEAD
		sbController.rebuildLocal();
		var idx = sbTreeHandler.TREE.builderView.getIndexOfResource(sbNoteService.resource);
		sbTreeHandler.TREE.view.selection.select(idx);
		if (isRootPos)
			sbTreeHandler.TREE.treeBoxObject.scrollByLines(sbTreeHandler.TREE.view.rowCount);
=======
		var idx = sbTreeUI.TREE.builderView.getIndexOfResource(sbNoteService.resource);
		sbTreeUI.TREE.view.selection.select(idx);
		if (isRootPos)
			sbTreeUI.TREE.treeBoxObject.scrollByLines(sbTreeUI.TREE.view.rowCount);
>>>>>>> release-1.6.0.a1
	},

	openPrefWindow : function()
	{
<<<<<<< HEAD
		var instantApply = sbCommonUtils.getBoolPref("browser.preferences.instantApply", false);
=======
		var instantApply = window.top.gPrefService.getBoolPref("browser.preferences.instantApply");
>>>>>>> release-1.6.0.a1
		window.top.openDialog(
			"chrome://scrapbook/content/prefs.xul", "ScrapBook:Options",
			"chrome,titlebar,toolbar,centerscreen," + (instantApply ? "dialog=no" : "modal")
		);
	},

};




var sbController = {

<<<<<<< HEAD
	isTreeContext : function(itcEvent)
	{
		var itcAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
		var itcVerComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
		if ( itcVerComparator.compare(itcAppInfo.version, "4.0")<0 ) {
			return document.popupNode.nodeName == "treechildren";
		}else {
			return itcEvent.originalTarget.triggerNode.nodeName == "treechildren";
		}
	},

	onPopupShowing : function(aEvent)
	{
		if (aEvent.originalTarget.localName != "menupopup")
			return;
		var res = this.isTreeContext(aEvent) ? sbTreeHandler.resource : sbListHandler.resource;
=======
	onPopupShowing : function(aEvent)
	{
		if (aEvent.originalTarget.id != "sbPopup")
			return;
		var res = sbTreeUI.resource;
>>>>>>> release-1.6.0.a1
		if (!res) {
			aEvent.preventDefault();
			return;
		}
		var isNote = false;
		var isFolder = false;
		var isBookmark = false;
		var isSeparator = false;
<<<<<<< HEAD
		switch (sbDataSource.getProperty(res, "type")) {
=======
		switch (ScrapBookData.getProperty(res, "type")) {
>>>>>>> release-1.6.0.a1
			case "note"     : isNote      = true; break;
			case "folder"   : isFolder    = true; break;
			case "bookmark" : isBookmark  = true; break;
			case "separator": isSeparator = true; break;
		}
		var getElement = function(aID) {
			return document.getElementById(aID);
		};
		getElement("sbPopupOpen").hidden         = isFolder  || isSeparator;
		getElement("sbPopupOpenTab").hidden      = !isNote   || isSeparator;
		getElement("sbPopupOpenNewTab").hidden   = isFolder  || isNote || isSeparator;
		getElement("sbPopupOpenSource").hidden   = isFolder  || isNote || isSeparator;
<<<<<<< HEAD
		getElement("sbPopupListView").hidden     = !isFolder || isSeparator;
=======
>>>>>>> release-1.6.0.a1
		getElement("sbPopupCombinedView").hidden = !isFolder || isSeparator;
		getElement("sbPopupOpenAllItems").hidden = !isFolder || isSeparator;
		getElement("sbPopupOpenAllItems").nextSibling.hidden = !isFolder || isSeparator;
		getElement("sbPopupSort").hidden   = !isFolder || isSeparator;
		getElement("sbPopupManage").hidden = !isFolder || isSeparator;
		getElement("sbPopupNewFolder").previousSibling.hidden = isSeparator;
		getElement("sbPopupTools").hidden   = isFolder || isSeparator;
		getElement("sbPopupRenew").setAttribute("disabled", isNote.toString());
		getElement("sbPopupShowFiles").setAttribute("disabled", isBookmark.toString());
	},

	open: function(aRes, aInTab)
	{
		if (!aRes)
<<<<<<< HEAD
			aRes = this.isTreeContext ? sbTreeHandler.resource : sbListHandler.resource;
		if (!aRes)
			return;
		var id = sbDataSource.getProperty(aRes, "id");
		if (!id)
			return;
		switch (sbDataSource.getProperty(aRes, "type")) {
			case "note" :
				sbNoteService.open(aRes, aInTab || sbMainService.prefs.tabsNote);
				break;
			case "bookmark" :
				sbCommonUtils.loadURL(
					sbDataSource.getProperty(aRes, "source"),
					aInTab || sbMainService.prefs.tabsOpen
=======
			aRes = sbTreeUI.resource;
		if (!aRes)
			return;
		var id = ScrapBookData.getProperty(aRes, "id");
		if (!id)
			return;
		switch (ScrapBookData.getProperty(aRes, "type")) {
			case "note" :
				sbNoteService.open(aRes, aInTab || ScrapBookUtils.getPref("tabs.note"));
				break;
			case "bookmark" :
				ScrapBookUtils.loadURL(
					ScrapBookData.getProperty(aRes, "source"),
					aInTab || ScrapBookUtils.getPref("tabs.open")
>>>>>>> release-1.6.0.a1
				);
				break;
			case "separator": 
				return;
			default :
<<<<<<< HEAD
				sbCommonUtils.loadURL(
					sbMainService.baseURL + "data/" + id + "/index.html",
					aInTab || sbMainService.prefs.tabsOpen
=======
				ScrapBookUtils.loadURL(
					ScrapBookData.getURL(aRes),
					aInTab || ScrapBookUtils.getPref("tabs.open")
>>>>>>> release-1.6.0.a1
				);
		}
	},

	openAllInTabs: function(aRes)
	{
		if (!aRes)
<<<<<<< HEAD
			aRes = this.isTreeContext ? sbTreeHandler.resource : sbListHandler.resource;
		if (!aRes)
			return;
		var resList = sbDataSource.flattenResources(aRes, 2, false);
		resList.forEach(function(res) {
			sbCommonUtils.loadURL(sbDataSource.getURL(res), true);
=======
			aRes = sbTreeUI.resource;
		if (!aRes)
			return;
		var resList = ScrapBookData.flattenResources(aRes, 2, false);
		resList.forEach(function(res) {
			ScrapBookUtils.loadURL(ScrapBookData.getURL(res), true);
>>>>>>> release-1.6.0.a1
		});
	},

	renew: function(aRes, aShowDetail)
	{
		if (!aRes)
<<<<<<< HEAD
			aRes = this.isTreeContext ? sbTreeHandler.resource : sbListHandler.resource;
		if (!aRes)
			return;
		var preset = [
			sbDataSource.getProperty(aRes, "id"),
=======
			aRes = sbTreeUI.resource;
		if (!aRes)
			return;
		var preset = [
			ScrapBookData.getProperty(aRes, "id"),
>>>>>>> release-1.6.0.a1
			"index",
			null,
			null,
			0,
<<<<<<< HEAD
			sbDataSource.getProperty(aRes, "type") == "bookmark"
=======
			ScrapBookData.getProperty(aRes, "type") == "bookmark"
>>>>>>> release-1.6.0.a1
		];
		window.top.openDialog(
			"chrome://scrapbook/content/capture.xul", "",
			"chrome,centerscreen,all,resizable,dialog=no",
<<<<<<< HEAD
			[sbDataSource.getProperty(aRes, "source")], null,
			aShowDetail, null, 0, null, null, null, preset, "SB"
=======
			[ScrapBookData.getProperty(aRes, "source")], null,
			aShowDetail, null, 0, null, null, null, preset
>>>>>>> release-1.6.0.a1
		);
	},

	forward: function(aRes, aCommand, aParam)
	{
		if (!aRes)
<<<<<<< HEAD
			aRes = this.isTreeContext ? sbTreeHandler.resource : sbListHandler.resource;
		if (!aRes)
			return;
		var id = sbDataSource.getProperty(aRes, "id");
=======
			aRes = sbTreeUI.resource;
		if (!aRes)
			return;
		var id = ScrapBookData.getProperty(aRes, "id");
>>>>>>> release-1.6.0.a1
		if (!id)
			return;
		switch (aCommand) {
			case "P": 
				window.openDialog("chrome://scrapbook/content/property.xul", "", "chrome,centerscreen,modal", id);
				break;
			case "M": 
<<<<<<< HEAD
				sbCommonUtils.openManageWindow(aRes, null);
=======
				ScrapBookUtils.openManageWindow(aRes, null);
>>>>>>> release-1.6.0.a1
				break;
			case "Z": 
				window.openDialog('chrome://scrapbook/content/sort.xul','','chrome,centerscreen,modal', aRes);
				break;
			case "C": 
<<<<<<< HEAD
				sbCommonUtils.loadURL(
					"chrome://scrapbook/content/view.xul?id=" + sbDataSource.getProperty(aRes, "id"),
					sbMainService.prefs.tabsCombinedView
				);
				break;
			case "S": 
				sbCommonUtils.loadURL(
					sbDataSource.getProperty(aRes, "source"),
					sbMainService.prefs.tabsOpenSource || aParam
				);
				break;
			case "L": 
				this.launch(sbCommonUtils.getContentDir(id));
=======
				ScrapBookUtils.loadURL(
					"chrome://scrapbook/content/view.xul?id=" + ScrapBookData.getProperty(aRes, "id"),
					ScrapBookUtils.getPref("tabs.combinedView")
				);
				break;
			case "S": 
				ScrapBookUtils.loadURL(
					ScrapBookData.getProperty(aRes, "source"),
					ScrapBookUtils.getPref("tabs.openSource") || aParam
				);
				break;
			case "L": 
				this.launch(ScrapBookUtils.getContentDir(id));
>>>>>>> release-1.6.0.a1
				break;
			case "E": 
				window.openDialog(
					"chrome://scrapbook/content/trade.xul", "",
					"chrome,centerscreen,all,resizable,dialog=no",
					aRes
				);
				break;
		}
	},

	launch: function(aDir)
	{
<<<<<<< HEAD
		const Ci = Components.interfaces;
		if (sbCommonUtils.getBoolPref("scrapbook.fileViewer.default", true)) {
			try {
				aDir = aDir.QueryInterface(Ci.nsILocalFile);
				aDir.launch();
			}
			catch (ex) {
				sbCommonUtils.loadURL(sbCommonUtils.convertFilePathToURL(aDir.path), false);
			}
		}
		else {
			try {
				var path = sbCommonUtils.PREF.getComplexValue(
					"scrapbook.fileViewer.path", Ci.nsIPrefLocalizedString
				).data;
				sbCommonUtils.execProgram(path, [aDir.path]);
			}
			catch (ex) {
				alert("ScrapBook ERROR: Failed to execute program.\n" + ex);
			}
		}
=======
		aDir = aDir.QueryInterface(Ci.nsILocalFile);
		aDir.launch();
>>>>>>> release-1.6.0.a1
	},

	sendInternal: function(aResList, aParResList)
	{
		var result = {};
		var preset = aParResList[0];
		window.openDialog(
			"chrome://scrapbook/content/folderPicker.xul", "",
			"modal,chrome,centerscreen,resizable=yes", result, preset
		);
		if (!result.resource)
			return;
		var tarRes = result.resource;
		for (var i = 0; i < aResList.length; i++)  {
<<<<<<< HEAD
			sbDataSource.moveItem(aResList[i], aParResList[i], tarRes, -1);
		}
		if (sbDataSource.unshifting)
			this.rebuildLocal();
		sbDataSource.flush();
=======
			ScrapBookData.moveItem(aResList[i], aParResList[i], tarRes, -1);
		}
		ScrapBookUtils.refreshGlobal(false);
>>>>>>> release-1.6.0.a1
	},

	removeInternal: function(aResList, aParResList, aBypassConfirm)
	{
		var rmIDs = [];
		for (var i = 0; i < aResList.length; i++) {
			if (aParResList[i].Value == "urn:scrapbook:search") {
<<<<<<< HEAD
				aParResList[i] = sbDataSource.findParentResource(aResList[i]);
				if (!aParResList[i])
					continue;
				sbDataSource.removeFromContainer("urn:scrapbook:search", aResList[i]);
			}
			if (!sbDataSource.exists(aResList[i]) || 
			    sbDataSource.getRelativeIndex(aParResList[i], aResList[i]) < 0) {
				alert("ScrapBook ERROR: Failed to remove resource.\n" + aResList[i].Value);
				continue;
			}
			rmIDs = rmIDs.concat(sbDataSource.deleteItemDescending(aResList[i], aParResList[i]));
		}
		sbDataSource.flush();
		for (var i = 0; i < rmIDs.length; i++) {
			var myDir = sbCommonUtils.getContentDir(rmIDs[i], true);
			if (myDir && rmIDs[i].length == 14)
				sbCommonUtils.removeDirSafety(myDir, true);
		}
		return rmIDs;
	},

	confirmRemovingFor: function(aRes)
	{
		if (sbDataSource.isContainer(aRes) || sbMainService.prefs.confirmDelete)
			return window.confirm( sbMainService.STRING.getString("CONFIRM_DELETE") );
		return true;
	},


	rebuildLocal: function()
	{
		sbTreeHandler.TREE.builder.rebuild();
		if (sbListHandler.LIST)
			sbListHandler.LIST.builder.rebuild();
		sbCommonUtils.rebuildGlobal();
	},

=======
				aParResList[i] = ScrapBookData.findParentResource(aResList[i]);
				if (!aParResList[i])
					continue;
				ScrapBookData.removeFromContainer("urn:scrapbook:search", aResList[i]);
			}
			if (!ScrapBookData.exists(aResList[i]) || 
			    ScrapBookData.getRelativeIndex(aParResList[i], aResList[i]) < 0) {
				ScrapBookUtils.alert("ERROR: Failed to remove resource.\n" + aResList[i].Value);
				continue;
			}
			rmIDs = rmIDs.concat(ScrapBookData.deleteItemDescending(aResList[i], aParResList[i]));
		}
		for (var i = 0; i < rmIDs.length; i++) {
			var myDir = ScrapBookUtils.getContentDir(rmIDs[i], true);
			if (myDir && rmIDs[i].length == 14)
				ScrapBookUtils.removeDirSafety(myDir, true);
		}
		ScrapBookUtils.refreshGlobal(false);
		return rmIDs;
	},

	confirmBeforeRemoving: function(aRes)
	{
		if (ScrapBookData.isContainer(aRes) || ScrapBookUtils.getPref("confirmDelete")) {
			var text = ScrapBookUtils.getLocaleString("CONFIRM_DELETE");
			var ok = ScrapBookUtils.PROMPT.confirm(window, "[ScrapBook]", text);
			if (!ok)
				return false;
		}
		return true;
	},

>>>>>>> release-1.6.0.a1
};




<<<<<<< HEAD
var sbTreeDNDHandler = {

	row      : 0,
	orient   : 0,
	modAlt   : false,
	modShift : false,
	currentDataTransfer : null,

	dragDropObserver: 
	{
		onDragStart: function(event, transferData, action) {
			if (event.originalTarget.localName != "treechildren")
				return;
			var idx = sbTreeHandler.TREE.currentIndex;
			var res = sbTreeHandler.TREE.builderView.getResourceAtIndex(idx);
			transferData.data = new TransferData();
			transferData.data.addDataForFlavour("moz/rdfitem", res.Value);
			if (sbDataSource.getProperty(res, "type") != "separator")
				transferData.data.addDataForFlavour("text/x-moz-url", sbDataSource.getURL(res));
		},
		getSupportedFlavours: function() {
			var flavours = new FlavourSet();
			flavours.appendFlavour("application/x-moz-tabbrowser-tab");
			flavours.appendFlavour("moz/rdfitem");
			flavours.appendFlavour("text/x-moz-url");
			flavours.appendFlavour("text/html");
			flavours.appendFlavour("sb/tradeitem");
			return flavours;
		},
		onDragOver: function() {},
		onDragExit: function() {},
		onDrop    : function() {},
	},

	builderObserver: 
	{
		canDrop: function(targetIndex, orientation) {
			return true;
		},
		onDrop: function(row, orient) {
			var XferData, XferType;
			var odAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
			var odVerComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
			if (odVerComparator.compare(odAppInfo.version, "3.5")>=0 &&
			    (sbTreeDNDHandler.currentDataTransfer.mozTypesAt(0).item(0) == "application/x-moz-tabbrowser-tab" ||
				 sbTreeDNDHandler.currentDataTransfer.mozTypesAt(0).item(0) == "sb/tradeitem"))
			{
				switch (sbTreeDNDHandler.currentDataTransfer.mozTypesAt(0).item(0))
				{
					case "application/x-moz-tabbrowser-tab":
					{
						XferData = sbTreeDNDHandler.currentDataTransfer.getData(sbTreeDNDHandler.currentDataTransfer.mozTypesAt(0).item(1))+"\n"+document.commandDispatcher.focusedWindow.document.title;
						break;
					}
					case "sb/tradeitem":
					{
						XferType = "sb/tradeitem";
						break;
					}
					default:
						alert("Unsupported XferType:\n---\n"+sbTreeDNDHandler.currentDataTransfer.mozTypesAt(0).item(0));
				}
			} else
			{
				var XferDataSet  = nsTransferable.get(
					sbTreeDNDHandler.dragDropObserver.getSupportedFlavours(),
					nsDragAndDrop.getDragData || this.getDragData,
					true
				);
				XferData = XferDataSet.first.first.data;
				XferType = XferDataSet.first.first.flavour.contentType;
			}
			if (XferType == "moz/rdfitem")
				sbTreeDNDHandler.move(row, orient);
			else if (XferType == "sb/tradeitem")
				sbTreeDNDHandler.importData(row, orient);
			else
				sbTreeDNDHandler.capture(XferData, row, orient);
			sbController.rebuildLocal();
		},
		onToggleOpenState    : function() {},
		onCycleHeader        : function() {},
		onSelectionChanged   : function() {},
		onCycleCell          : function() {},
		isEditable           : function() {},
		onSetCellText        : function() {},
		onPerformAction      : function() {},
		onPerformActionOnRow : function() {},
		onPerformActionOnCell: function() {},
		getDragData: function (aFlavourSet) {
			var supportsArray = Components.classes["@mozilla.org/supports-array;1"].
			                    createInstance(Components.interfaces.nsISupportsArray);
			for (var i = 0; i < nsDragAndDrop.mDragSession.numDropItems; ++i) {
				var trans = nsTransferable.createTransferable();
				for (var j = 0; j < aFlavourSet.flavours.length; ++j)
				trans.addDataFlavor(aFlavourSet.flavours[j].contentType);
				nsDragAndDrop.mDragSession.getData(trans, i);
				supportsArray.AppendElement(trans);
			}
			return supportsArray;
		},
	},

	getModifiers: function(aEvent)
	{
		this.modAlt   = aEvent.altKey;
		this.modShift = aEvent.ctrlKey || aEvent.shiftKey;
	},

	init: function()
	{
		sbTreeHandler.TREE.builderView.addObserver(this.builderObserver);
	},

	quit: function()
	{
		try {
			sbTreeHandler.TREE.builderView.removeObserver(this.builderObserver);
		}
		catch(ex) {
		}
	},

	move: function(aRow, aOrient)
	{
		this.row = aRow;
		this.orient = aOrient;
		if (sbTreeHandler.TREE.view.selection.count == 1)
			this.moveSingle()
		else
			this.moveMultiple();
	},

	moveSingle: function()
	{
		//Für Firefox 3.5 notwendig, da sonst ein Fehler ausgegeben wird
		if ( this.row == -1 ) return;
		var curIdx = sbTreeHandler.TREE.currentIndex;
		var curRes = sbTreeHandler.TREE.builderView.getResourceAtIndex(curIdx);
		var curPar = sbTreeHandler.getParentResource(curIdx);
		var tarRes = sbTreeHandler.TREE.builderView.getResourceAtIndex(this.row);
		var tarPar = (this.orient == 0) ? tarRes : sbTreeHandler.getParentResource(this.row);
		this.moveAfterChecking(curRes, curPar, tarRes, tarPar);
		sbDataSource.flush();
	},

	moveMultiple: function()
	{
		var idxList = sbTreeHandler.getSelection(false, 2);
		if ( sbTreeHandler.validateMultipleSelection(idxList) == false ) return;
		var i = 0;
		var curResList = []; var curParList = [];
		var tarResList = []; var tarParList = [];
		for (i = 0; i < idxList.length; i++) {
			curResList.push(sbTreeHandler.TREE.builderView.getResourceAtIndex(idxList[i]));
			curParList.push(sbTreeHandler.getParentResource(idxList[i]));
			tarResList.push(sbTreeHandler.TREE.builderView.getResourceAtIndex(this.row));
			tarParList.push((this.orient == 0) ? tarResList[i] : sbTreeHandler.getParentResource(this.row));
		}
		//RDF-Datenquelle vom tree entfernen
		var mmDatei = sbCommonUtils.getScrapBookDir();
		mmDatei.append("scrapbook.rdf");
		var mmDateiURL = sbCommonUtils.IO.newFileURI(mmDatei).spec;
		var mmDaten = sbCommonUtils.RDF.GetDataSourceBlocking(mmDateiURL);
		var mmSidebarTreeObj = window.opener.document.getElementById("sbTree");
		if ( mmSidebarTreeObj ) mmSidebarTreeObj.database.RemoveDataSource(mmDaten);
		var mmTreeObj = document.getElementById("sbTree");
		mmTreeObj.database.RemoveDataSource(mmDaten);
		if (this.orient == 1) {
			for (i = idxList.length - 1; i >= 0 ; i--)
				this.moveAfterChecking(curResList[i], curParList[i], tarResList[i], tarParList[i]);
		}
		else {
			for (i = 0; i < idxList.length; i++)
				this.moveAfterChecking(curResList[i], curParList[i], tarResList[i], tarParList[i]);
		}
		//RDF-Datenquelle dem tree hinzufügen
		if ( mmSidebarTreeObj ) mmSidebarTreeObj.database.AddDataSource(mmDaten);
		mmTreeObj.database.AddDataSource(mmDaten);
		sbDataSource.flush();
	},

	moveAfterChecking: function(curRes, curPar, tarRes, tarPar)
	{
		var curAbsIdx = sbTreeHandler.TREE.builderView.getIndexOfResource(curRes);
		var curRelIdx = sbDataSource.getRelativeIndex(curPar, curRes);
		var tarRelIdx = sbDataSource.getRelativeIndex(tarPar, tarRes);
		if (curAbsIdx == this.row)
			return;
		if (this.orient != 0) {
			if (this.orient == 1)
				tarRelIdx++;
			if (curPar.Value == tarPar.Value && tarRelIdx > curRelIdx)
				tarRelIdx--;
			if (this.orient == 1 &&
			    sbTreeHandler.TREE.view.isContainer(this.row) &&
			    sbTreeHandler.TREE.view.isContainerOpen(this.row) &&
			    sbTreeHandler.TREE.view.isContainerEmpty(this.row) == false) {
				if (curAbsIdx == this.row) {
					sbMainService.trace("can't drop folder after open container");
					return;
				}
				sbMainService.trace("drop after open container");
				tarPar = tarRes;
				tarRes = sbTreeHandler.TREE.builderView.getResourceAtIndex(this.row + 1);
				tarRelIdx = 1;
			}
			if (curPar.Value == tarPar.Value && curRelIdx == tarRelIdx)
				return;
		}
		if (sbTreeHandler.TREE.view.isContainer(curAbsIdx)) {
			var tmpIdx = this.row;
			var tmpRes = tarRes;
			while (tmpRes.Value != sbTreeHandler.TREE.ref && tmpIdx != -1) {
				tmpRes = sbTreeHandler.getParentResource(tmpIdx);
				tmpIdx = sbTreeHandler.TREE.builderView.getIndexOfResource(tmpRes);
				if (tmpRes.Value == curRes.Value) {
					sbMainService.trace("can't move folder into descendant level");
					return;
				}
			}
		}
		sbDataSource.moveItem(curRes, curPar, tarPar, tarRelIdx);
	},

	capture: function(aXferString, aRow, aOrient)
	{
		var url = aXferString.split("\n")[0];
		var win = sbCommonUtils.getFocusedWindow();
		var sel = win.getSelection();
		var isSelected = false;
		try {
			isSelected = !(sel.anchorNode == sel.focusNode && sel.anchorOffset == sel.focusOffset);
		}
		catch (ex) {
		}
		var isEntire = (url == top.window.content.location.href);
		var res = (aRow == -1) ? [sbTreeHandler.TREE.ref, 0] : this.getTarget(aRow, aOrient);
		if (this.modAlt && !isSelected) {
			if (isEntire) {
				top.window.sbBrowserOverlay.bookmark(res[0], res[1]);
			}
			else {
				var arg = { title : aXferString.split("\n")[1], source : url };
				top.window.sbBrowserOverlay.bookmark(res[0], res[1], arg);
			}
		}
		else if (isSelected || isEntire) {
			var targetWindow = isEntire ? top.window.content : win;
			top.window.sbContentSaver.captureWindow(
				targetWindow, !isEntire,
				sbMainService.prefs.showDetailOnDrop || this.modShift,
				res[0], res[1], null
			);
		}
		else if (url.indexOf("http://") == 0 || url.indexOf("https://") == 0) {
			top.window.openDialog(
				"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
				[url], win.location.href,
				sbMainService.prefs.showDetailOnDrop || this.modShift,
				res[0], res[1], null, null, null, null, "SB"
			);
		}
		else if (url.indexOf("file://") == 0) {
			top.window.sbContentSaver.captureFile(
				url, "file://", "file", sbMainService.prefs.showDetailOnDrop,
				res[0], res[1], null
			);
		}
		else {
			alert(sbMainService.STRING.getString("ERROR_INVALID_URL") + "\n" + url);
		}
	},

	importData: function(aRow, aOrient)
	{
		throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
	},

	getTarget: function(aRow, aOrient)
	{
		var tarRes = sbTreeHandler.TREE.builderView.getResourceAtIndex(aRow);
		var tarPar = (aOrient == 0) ? tarRes : sbTreeHandler.getParentResource(aRow);
		var tarRelIdx = sbDataSource.getRelativeIndex(tarPar, tarRes);
		if (aOrient == 1)
			tarRelIdx++;
		if (aOrient == 1 &&
		    sbTreeHandler.TREE.view.isContainer(aRow) &&
		    sbTreeHandler.TREE.view.isContainerOpen(aRow) &&
		    sbTreeHandler.TREE.view.isContainerEmpty(aRow) == false) {
			sbMainService.trace("drop after open container");
			tarPar = tarRes; tarRelIdx = 1;
		}
		return [tarPar.Value, tarRelIdx];
	},

};




var sbSearchService = {

	get ELEMENT() { return document.getElementById("sbSearchImage"); },
	get FORM_HISTORY()
	{
		return Components.classes["@mozilla.org/satchel/form-history;1"]
		       .getService(Components.interfaces.nsIFormHistory2 || Components.interfaces.nsIFormHistory);
	},

	type      : "",
	query     : "",
	regex     : null,
	optionRE  : false,
	optionCS  : false,
	container : null,
	treeRef   : "urn:scrapbook:root",

	init: function()
	{
		this.type = this.ELEMENT.getAttribute("searchtype");
		if (["fulltext","title","comment","source","id","all"].indexOf(this.type) < 0)
			this.type = "fulltext";
		this.ELEMENT.src = "chrome://scrapbook/skin/search_" + this.type + ".png";
		this.exit();
	},

	change: function(aType)
	{
		this.ELEMENT.setAttribute("searchtype", aType);
		this.init();
	},

	populatePopup: function()
	{
		var c = this.type.charAt(0).toUpperCase();
		["F", "T", "C", "S", "I", "A"].forEach(function(elt) {
			document.getElementById("sbSearchPopup" + elt).setAttribute("checked", elt == c);
		});
	},

	enter: function(aInput)
	{
		if (aInput.match(/^[a-z]$/i) || !aInput) {
			var table = {
				"F": "fulltext",
				"T": "title",
				"C": "comment",
				"U": "source",
				"I": "id",
				"A": "all"
			};
			if (aInput.toUpperCase() in table)
				this.change(table[aInput.toUpperCase()]);
			else
				this.exit();
			document.getElementById("sbSearchTextbox").value = "";
		}
		else {
			this.query = aInput;
			this.optionRE = document.getElementById("sbSearchPopupOptionRE").getAttribute("checked");
			this.optionCS = document.getElementById("sbSearchPopupOptionCS").getAttribute("checked");
			this.FORM_HISTORY.addEntry("sbSearchHistory", this.query);
			if (this.type == "fulltext") {
				this.execFT();
			}
		 
			else {
				var regex1 = this.optionRE ? 
				             this.query : this.query.replace(/([\*\+\?\.\|\[\]\{\}\^\/\$\\])/g, "\\$1");
				var regex2 = this.optionCS ? "m" : "mi";
				this.regex = new RegExp(regex1, regex2)
				this.exec(false);
			}
		}
	},

	execFT: function()
	{
		var cache = sbCommonUtils.getScrapBookDir().clone();
		cache.append("cache.rdf");
		var shouldBuild = false;
		if (!cache.exists() || cache.fileSize < 1024 * 32) {
			shouldBuild = true;
=======
var sbSearchUI = {

	get validTypes() { return ["fulltext", "title", "comment", "source", "id", "all"]; },

	_searchImage: null,

	_searchType: null,

	_treeRef: null,


	init: function() {
		this._treeRef = sbTreeUI.TREE.ref;
		this._searchImage = document.getElementById("sbSearchImage");
		this.changeType(this._searchImage.getAttribute("searchtype"));
	},

	uninit: function() {
		this._searchImage = null;
		this._searchType = null;
		this._treeRef = null;
	},

	onPopupShowing: function(event) {
		if (event.target.id != "sbSearchPopup")
			return;
		Array.forEach(event.target.childNodes, function(elt) {
			var type = elt.getAttribute("searchtype");
			if (!type)
				return;
			elt.setAttribute("checked", (type == this._searchType).toString());
		}, this);
	},

	changeType: function(aType) {
		if (this.validTypes.indexOf(aType) < 0)
			aType = "fulltext";
		this._searchType = aType;
		this._searchImage.setAttribute("searchtype", aType);
		this._searchImage.src = "chrome://scrapbook/skin/search_" + aType + ".png";
		var textbox = document.getElementById("sbSearchTextbox");
		textbox.setAttribute("searchbutton", (aType == "fulltext").toString());
		var elt = document.getElementById("sbSearchPopup").querySelector("[searchtype=" + aType + "]");
		textbox.emptyText   = elt.getAttribute("label");
		textbox.placeholder = elt.getAttribute("label");
		textbox.focus();
	},

	onKeyPress: function(event) {
		var ctrl  = event.ctrlKey;
		var meta  = event.metaKey;
		var shift = event.shiftKey;
		var alt   = event.altKey;
		var code  = event.keyCode;
		if ((ctrl || meta) && !shift && !alt && code == event.DOM_VK_UP) {
			var num = this.validTypes.indexOf(this._searchType);
			num = Math.max(--num, 0);
			this.changeType(this.validTypes[num]);
			return;
		}
		if ((ctrl || meta) && !shift && !alt && code == event.DOM_VK_DOWN) {
			var num = this.validTypes.indexOf(this._searchType);
			num = Math.min(++num, this.validTypes.length - 1);
			this.changeType(this.validTypes[num]);
			return;
		}
		if (!ctrl && !meta && !shift && alt && code == event.DOM_VK_DOWN) {
			var popup = document.getElementById("sbSearchPopup");
			popup.openPopup(this._searchImage, "after_start", 0, 0, false, false);
		}
		if (code != event.DOM_VK_RETURN)
			return;
		var val = event.target.value;
		if (val.length != 1)
			return;
		val = val.toLowerCase().replace("u", "s");
			this.validTypes.forEach(function(type) {
			if (type.charAt(0) == val) {
					this.changeType(type);
				this.reset();
			}
		}, this);
	},

	onCommand: function(aValue) {
		if (!aValue) {
			this.reset();
			return;
		}
		else if (/^\w$/.test(aValue)) {
			return;
		}
		else if (this._searchType == "fulltext") {
			this._doFullTextSearch(aValue);
		}
		else if (/^days:(\d+)$/i.test(aValue)) {
			aValue = parseInt(RegExp.$1, 10);
			var ymdList = [];
			var date = new Date();
			do {
				var y = date.getFullYear().toString();
				var m = ("0" + (date.getMonth() + 1).toString()).slice(-2);
				var d = ("0" +  date.getDate()      .toString()).slice(-2);
				ymdList.push(y + m + d);
				date.setTime(date.getTime() - 1000 * 60 * 60 * 24);
			}
			while (--aValue > 0);
			var tmpType = this._searchType;
			this._searchType = "id";
			this._doFilteringSearch(new RegExp("^(?:" + ymdList.join("|") + ")"));
			this._searchType = tmpType;
		}
		else {
			var re = document.getElementById("sbSearchPopupOptionRE").getAttribute("checked");
			var cs = document.getElementById("sbSearchPopupOptionCS").getAttribute("checked");
			this._doFilteringSearch(new RegExp(
				re == "true" ? aValue : aValue.replace(/([\*\+\?\.\|\[\]\{\}\^\/\$\\])/g, "\\$1"), 
				cs == "true" ? "m" : "mi"
			));
		}
	},

	reset: function() {
		if (!document.getElementById("sbMainToolbar"))
			return;
		document.getElementById("sbMainToolbar").hidden = false;
		document.getElementById("sbSearchTextbox").value = "";
		if (sbTreeUI.TREE.ref != "urn:scrapbook:search")
			return;
		sbTreeUI.TREE.ref = this._treeRef;
		sbTreeUI.TREE.builder.rebuild();
		sbTreeUI.enableDragDrop(true);
		ScrapBookData.clearContainer("urn:scrapbook:search");
	},

	promptForDaysFilter: function() {
		var ret = { value: null };
		var title = ScrapBookUtils.getLocaleString("FILTER_BY_DAYS");
		if (!ScrapBookUtils.PROMPT.prompt(window, "[ScrapBook]", title, ret, null, {}))
			return;
		var days = ret.value;
		if (isNaN(days) || days <= 0)
			return;
		var textbox = document.getElementById("sbSearchTextbox");
		textbox.focus();
		textbox.value = "days:" + days.toString();
		textbox.doCommand();
	},

	updateCache: function(aRefURL) {
		window.openDialog(
			"chrome://scrapbook/content/cache.xul", "ScrapBook:Cache", "chrome,dialog=no", aRefURL
		);
	},


	_doFullTextSearch: function(aValue) {
		var cache = ScrapBookUtils.getScrapBookDir().clone();
		cache.append("cache.rdf");
		var shouldRebuild = false;
		if (!cache.exists() || cache.fileSize < 1024 * 32) {
			shouldRebuild = true;
>>>>>>> release-1.6.0.a1
		}
		else {
			var modTime = cache.lastModifiedTime;
			if (modTime && ((new Date()).getTime() - modTime) > 1000 * 60 * 60 * 24 * 5)
<<<<<<< HEAD
				shouldBuild = true;
		}
		var uri = "chrome://scrapbook/content/result.xul";
		var query = "?q=" + this.query + "&re=" + this.optionRE.toString() + "&cs=" + this.optionCS.toString();
		if (this.treeRef != "urn:scrapbook:root")
			query += "&ref=" + this.treeRef;
		if (shouldBuild) {
			this.buildFT(uri + query);
		}
		else {
			var win = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
			var inTab = (win.content.location.href.indexOf(uri) == 0) ? false : sbMainService.prefs.tabsSearchResult;
			sbCommonUtils.loadURL(uri + query, inTab);
=======
				shouldRebuild = true;
		}
		var url = "chrome://scrapbook/content/result.xul";
		var query = "?q=" + aValue;
		if (document.getElementById("sbSearchPopupOptionRE").getAttribute("checked") == "true")
			query += "&re=true";
		if (document.getElementById("sbSearchPopupOptionRE").getAttribute("checked") == "true")
			query += "&cs=true";
		if (this._treeRef != "urn:scrapbook:root")
			query += "&ref=" + this._treeRef;
		if (shouldRebuild) {
			this.updateCache(url + query);
		}
		else {
			var win = ScrapBookUtils.getBrowserWindow();
			for (var i = 0; i < win.gBrowser.browsers.length; i++) {
				var browser = win.gBrowser.browsers[i];
				if (browser.currentURI.spec.indexOf(url) == 0) {
					win.focus();
					win.gBrowser.tabContainer.selectedIndex = i;
					win.gBrowser.loadURI(url + query);
					return;
				}
			}
			ScrapBookUtils.loadURL(url + query, ScrapBookUtils.getPref("tabs.searchResult"));
>>>>>>> release-1.6.0.a1
			win.focus();
		}
	},

<<<<<<< HEAD
	buildFT: function(aResURI)
	{
		window.openDialog('chrome://scrapbook/content/cache.xul','ScrapBook:Cache','chrome,dialog=no', aResURI);
	},

	exec: function()
	{
		sbDataSource.clearContainer("urn:scrapbook:search");
		this.container = sbDataSource.getContainer("urn:scrapbook:search", true);
		var resList = sbDataSource.flattenResources(sbCommonUtils.RDF.GetResource(this.treeRef), 2, true);
		for (var i = 0; i < resList.length; i++) {
			var val, res = resList[i];
			if (this.type != "all")
				val = sbDataSource.getProperty(res, this.type);
			else
				val = [
					sbDataSource.getProperty(res, "title"),
					sbDataSource.getProperty(res, "comment"),
					sbDataSource.getProperty(res, "source"),
					sbDataSource.getProperty(res, "id")
				].join("\n");
			if (val && val.match(this.regex))
				this.container.AppendElement(res);
		}
		sbListHandler.quit();
		sbTreeHandler.TREE.ref = "urn:scrapbook:search";
		sbTreeHandler.TREE.builder.rebuild();
		sbTreeDNDHandler.quit();
		sbMainService.toggleHeader(
			true,
			sbMainService.STRING.getFormattedString("SEARCH_RESULTS_FOUND", [this.container.GetCount()])
		);
	},

	filterByDays : function()
	{
		var ret = { value: "1" };
		var title = sbMainService.STRING.getString("FILTER_BY_DAYS");
		if (!sbCommonUtils.PROMPT.prompt(window, "ScrapBook", title, ret, null, {}))
			return;
		var days = ret.value;
		if (isNaN(days) || days <= 0)
			return;
		var ymdList = [];
		var dd = new Date;
		do {
			var y = dd.getFullYear();
			var m = dd.getMonth() + 1; if ( m < 10 ) m = "0" + m;
			var d = dd.getDate();      if ( d < 10 ) d = "0" + d;
			ymdList.push(y.toString() + m.toString() + d.toString());
			dd.setTime(dd.getTime() - 1000 * 60 * 60 * 24);
		}
		while (--days > 0);
		var tmpType = this.type;
		this.type = "id";
		this.regex = new RegExp("^(" + ymdList.join("|") + ")", "");
		this.exec(true);
		this.type = tmpType;
	},

	exit: function()
	{
		if (sbTreeHandler.TREE.ref != "urn:scrapbook:search")
			return;
		sbMainService.toggleHeader(false, "");
		document.getElementById("sbSearchTextbox").value = "";
		sbTreeHandler.TREE.ref = this.treeRef;
		sbTreeHandler.TREE.builder.rebuild();
		sbTreeDNDHandler.quit();
		sbTreeDNDHandler.init();
		sbDataSource.clearContainer("urn:scrapbook:search");
	},

	clearFormHistory: function()
	{
		this.FORM_HISTORY.removeEntriesForName("sbSearchHistory");
	}

=======
	_doFilteringSearch: function(aRegex) {
		ScrapBookData.clearContainer("urn:scrapbook:search");
		var container = ScrapBookData.getContainer("urn:scrapbook:search", true);
		var rootRes = ScrapBookUtils.RDF.GetResource(this._treeRef);
		var resList = ScrapBookData.flattenResources(rootRes, 2, true);
		resList.forEach(function(res) {
			if (ScrapBookData.getProperty(res, "type") == "separator")
				return;
			var val;
			if (this._searchType != "all")
				val = ScrapBookData.getProperty(res, this._searchType);
			else
				var val = ["title", "comment", "source", "id"].map(function(prop) {
					return ScrapBookData.getProperty(res, prop);
				}).join("\n");
			if (val && aRegex.test(val))
				container.AppendElement(res);
		}, this);
		sbTreeUI.TREE.ref = "urn:scrapbook:search";
		sbTreeUI.TREE.builder.rebuild();
		sbTreeUI.enableDragDrop(false);
		document.getElementById("sbMainToolbar").hidden = true;
	},

>>>>>>> release-1.6.0.a1
};



