
var sbMainService = {

	get STRING() { return document.getElementById("sbMainString"); },

	baseURL: "",
	prefs  : {},


	init: function()
	{
		sbMultiBookService.showButton();
		sbDataSource.init();
		sbTreeHandler.init(false);
		sbTreeDNDHandler.init();
		sbListHandler.restoreLastState();
		this.baseURL = sbCommonUtils.getBaseHref(sbDataSource.data.URI);
		this.initPrefs();
		sbSearchService.init();
		setTimeout(function() { sbMainService.delayedInit(); }, 0);
	},

	delayedInit: function()
	{
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
	},

	refresh: function()
	{
		sbListHandler.quit();
		sbListHandler.exit();
		sbTreeHandler.exit();
		sbTreeDNDHandler.quit();
		this.init();
	},

	done: function()
	{
		sbNoteService.save();
	},


	toggleHeader: function(aWillShow, aLabel)
	{
		document.getElementById("sbHeader").hidden = !aWillShow;
		document.getElementById("sbHeader").firstChild.value = aLabel;
	},

	trace: function(aText, aMillisec)
	{
		var status = top.window.document.getElementById("statusbar-display");
		status.label = aText;
		var callback = function() {
			if (status.label == aText)
				status.label = "";
			status = null;
		};
		window.setTimeout(callback, aMillisec || 5000);
	},


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
	},

	createFolder: function()
	{
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
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
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
		var result = {};
		window.openDialog(
			"chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome",
			newItem.id, result
		);
		if (!result.accept) {
			sbDataSource.deleteItemDescending(newRes, sbCommonUtils.RDF.GetResource(tarResName));
			sbDataSource.flush();
			return false;
		}
		return true;
	},

	createSeparator: function()
	{
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
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
			tarResName = sbTreeHandler.TREE.ref;
			tarRelIdx  = 0;
			isRootPos  = true;
		}
		var newRes = sbDataSource.addItem(newItem, tarResName, tarRelIdx);
		sbTreeHandler.TREE.builder.rebuild();
		sbTreeHandler.TREE.view.selection.clearSelection();
		var idx = sbTreeHandler.TREE.builderView.getIndexOfResource(newRes);
		sbTreeHandler.TREE.treeBoxObject.ensureRowIsVisible(idx);
	},

	createNote: function(aInTab)
	{
		sbSearchService.exit();
		sbListHandler.quit();
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = sbTreeHandler.TREE.currentIndex;
			var curRes = sbTreeHandler.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = sbTreeHandler.getParentResource(curIdx);
			var curRelIdx = sbDataSource.getRelativeIndex(curPar, curRes);
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
			tarResName = sbTreeHandler.TREE.ref;
			tarRelIdx  = 0;
			isRootPos  = true;
		}
		sbNoteService.create(tarResName, tarRelIdx, aInTab);
		sbController.rebuildLocal();
		var idx = sbTreeHandler.TREE.builderView.getIndexOfResource(sbNoteService.resource);
		sbTreeHandler.TREE.view.selection.select(idx);
		if (isRootPos)
			sbTreeHandler.TREE.treeBoxObject.scrollByLines(sbTreeHandler.TREE.view.rowCount);
	},

	openPrefWindow : function()
	{
		var instantApply = sbCommonUtils.getBoolPref("browser.preferences.instantApply", false);
		window.top.openDialog(
			"chrome://scrapbook/content/prefs.xul", "ScrapBook:Options",
			"chrome,titlebar,toolbar,centerscreen," + (instantApply ? "dialog=no" : "modal")
		);
	},

};




var sbController = {

	get isTreeContext()
	{
		return document.popupNode.nodeName == "treechildren";
	},

	onPopupShowing : function(aEvent)
	{
		if (aEvent.originalTarget.localName != "popup")
			return;
		var res = this.isTreeContext ? sbTreeHandler.resource : sbListHandler.resource;
		if (!res) {
			aEvent.preventDefault();
			return;
		}
		var isNote = false;
		var isFolder = false;
		var isBookmark = false;
		var isSeparator = false;
		switch (sbDataSource.getProperty(res, "type")) {
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
		getElement("sbPopupListView").hidden     = !isFolder || isSeparator;
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
				);
				break;
			case "separator": 
				return;
			default :
				sbCommonUtils.loadURL(
					sbMainService.baseURL + "data/" + id + "/index.html",
					aInTab || sbMainService.prefs.tabsOpen
				);
		}
	},

	openAllInTabs: function(aRes)
	{
		if (!aRes)
			aRes = this.isTreeContext ? sbTreeHandler.resource : sbListHandler.resource;
		if (!aRes)
			return;
		var resList = sbDataSource.flattenResources(aRes, 2, false);
		resList.forEach(function(res) {
			sbCommonUtils.loadURL(sbDataSource.getURL(res), true);
		});
	},

	renew: function(aRes, aShowDetail)
	{
		if (!aRes)
			aRes = this.isTreeContext ? sbTreeHandler.resource : sbListHandler.resource;
		if (!aRes)
			return;
		var preset = [
			sbDataSource.getProperty(aRes, "id"),
			"index",
			null,
			null,
			0,
			sbDataSource.getProperty(aRes, "type") == "bookmark"
		];
		window.top.openDialog(
			"chrome://scrapbook/content/capture.xul", "",
			"chrome,centerscreen,all,resizable,dialog=no",
			[sbDataSource.getProperty(aRes, "source")], null,
			aShowDetail, null, 0, null, null, null, preset
		);
	},

	forward: function(aRes, aCommand, aParam)
	{
		if (!aRes)
			aRes = this.isTreeContext ? sbTreeHandler.resource : sbListHandler.resource;
		if (!aRes)
			return;
		var id = sbDataSource.getProperty(aRes, "id");
		if (!id)
			return;
		switch (aCommand) {
			case "P": 
				window.openDialog("chrome://scrapbook/content/property.xul", "", "chrome,centerscreen,modal", id);
				break;
			case "M": 
				sbCommonUtils.openManageWindow(aRes, null);
				break;
			case "Z": 
				window.openDialog('chrome://scrapbook/content/sort.xul','','chrome,centerscreen,modal', aRes);
				break;
			case "C": 
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
			sbDataSource.moveItem(aResList[i], aParResList[i], tarRes, -1);
		}
		if (sbDataSource.unshifting)
			this.rebuildLocal();
		sbDataSource.flush();
	},

	removeInternal: function(aResList, aParResList, aBypassConfirm)
	{
		var rmIDs = [];
		for (var i = 0; i < aResList.length; i++) {
			if (aParResList[i].Value == "urn:scrapbook:search") {
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

};




var sbTreeDNDHandler = {

	row      : 0,
	orient   : 0,
	modAlt   : false,
	modShift : false,

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
			try {
				var XferDataSet  = nsTransferable.get(
					sbTreeDNDHandler.dragDropObserver.getSupportedFlavours(),
					nsDragAndDrop.getDragData,
					true
				);
				var XferData     = XferDataSet.first.first;
				var XferDataType = XferData.flavour.contentType;
			}
			catch(ex) {}
			if (XferDataType == "moz/rdfitem")
				sbTreeDNDHandler.move(row, orient);
			else if (XferDataType == "sb/tradeitem")
				sbTreeDNDHandler.importData(row, orient);
			else
				sbTreeDNDHandler.capture(XferData.data, row, orient);
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
		if (this.orient == 1) {
			for (i = idxList.length - 1; i >= 0 ; i--)
				this.moveAfterChecking(curResList[i], curParList[i], tarResList[i], tarParList[i]);
		}
		else {
			for (i = 0; i < idxList.length; i++)
				this.moveAfterChecking(curResList[i], curParList[i], tarResList[i], tarParList[i]);
		}
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
			isSelected = !(sel.anchorNode.isSameNode(sel.focusNode) && sel.anchorOffset == sel.focusOffset);
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
				res[0], res[1], null, null, null
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
		}
		else {
			var modTime = cache.lastModifiedTime;
			if (modTime && ((new Date()).getTime() - modTime) > 1000 * 60 * 60 * 24 * 5)
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
			win.focus();
		}
	},

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

};



