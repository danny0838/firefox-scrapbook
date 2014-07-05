
var sbMainService = {

	baseURL: "",
	prefs  : {},


	init: function()
	{
		sbMultiBookService.showButton();
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
		this.prefs.showDetailOnDrop = sbCommonUtils.getPref("showDetailOnDrop",  false);
		this.prefs.confirmDelete    = sbCommonUtils.getPref("confirmDelete",     true);
		this.prefs.tabsOpen         = sbCommonUtils.getPref("tabs.open",         false);
		this.prefs.tabsOpenSource   = sbCommonUtils.getPref("tabs.openSource",   false);
		this.prefs.tabsSearchResult = sbCommonUtils.getPref("tabs.searchResult", true);
		this.prefs.tabsCombinedView = sbCommonUtils.getPref("tabs.combinedView", true);
		this.prefs.tabsNote         = sbCommonUtils.getPref("tabs.note",         false);
	},

	rebuild: function()
	{
		sbTreeHandler.TREE.builder.rebuild();
		sbListHandler.LIST.builder.rebuild();
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
		if ( !status ) return;
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
		newItem.title = sbCommonUtils.lang("scrapbook", "DEFAULT_FOLDER");
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
		sbDataSource.createEmptySeq(newRes.Value);
		sbCommonUtils.rebuildGlobal();
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
		var idx = sbTreeHandler.TREE.builderView.getIndexOfResource(sbNoteService.resource);
		sbTreeHandler.TREE.view.selection.select(idx);
		if (isRootPos)
			sbTreeHandler.TREE.treeBoxObject.scrollByLines(sbTreeHandler.TREE.view.rowCount);
	},

	createNoteX: function()
	{
		sbSearchService.exit();
		sbListHandler.quit();
		var newID = sbDataSource.identify(sbCommonUtils.getTimeStamp());
		var newItem = sbCommonUtils.newItem(newID);
		newItem.title = sbCommonUtils.lang("scrapbook", "DEFAULT_NOTEX");
		newItem.type = "notex";
		newItem.chars = "UTF-8";
		// check the template file, create one if not exist
		var template = sbCommonUtils.getScrapBookDir().clone();
		template.append("notex_template.html");
		if ( !template.exists() ) sbCommonUtils.saveTemplateFile("chrome://scrapbook/content/notex_template.html", template);
		// create content
		var dir = sbCommonUtils.getContentDir(newID);
		var html = dir.clone();
		html.append("index.html");
		var content = sbCommonUtils.readFile(template);
		content = sbCommonUtils.convertToUnicode(content, "UTF-8");
		sbCommonUtils.writeFile(html, content, newItem.chars);
		sbCommonUtils.writeIndexDat(newItem);
		// add resource
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
		var idx = sbTreeHandler.TREE.builderView.getIndexOfResource(newRes);
		sbTreeHandler.TREE.view.selection.select(idx);
		sbController.open(newRes, false);
	},

	openPrefWindow : function()
	{
		var instantApply = sbCommonUtils.getPref("browser.preferences.instantApply", false, true);
		window.top.openDialog(
			"chrome://scrapbook/content/prefs.xul", "ScrapBook:Options",
			"chrome,titlebar,toolbar,centerscreen," + (instantApply ? "dialog=no" : "modal")
		);
	},

};




var sbController = {

	isTreeContext : function(itcEvent)
	{
		if ( !sbCommonUtils._fxVer4 ) {
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
		if (!res) {
			aEvent.preventDefault();
			return;
		}
		var isNote = false;
		var isNotex = false;
		var isNotexl = false;
		var isFolder = false;
		var isBookmark = false;
		var isSeparator = false;
		switch (sbDataSource.getProperty(res, "type")) {
			case "note"     : isNote      = true; break;
			case "notex"    : isNotex     = true; break;
			case "notexl"   : isNotexl    = true; break;
			case "folder"   : isFolder    = true; break;
			case "bookmark" : isBookmark  = true; break;
			case "separator": isSeparator = true; break;
		}
		var getElement = function(aID) {
			return document.getElementById(aID);
		};
		getElement("sbPopupOpen").hidden                       = isFolder  || isSeparator;
		getElement("sbPopupOpenTab").hidden                    = !isNote   || isSeparator;
		getElement("sbPopupOpenNewTab").hidden                 = isFolder  || isNote || isSeparator;
		getElement("sbPopupOpenSource").hidden                 = isFolder  || isNote || isSeparator;
		getElement("sbPopupListView").hidden                   = !isFolder || isSeparator;
		getElement("sbPopupCombinedView").hidden               = !isFolder || isSeparator;
		getElement("sbPopupOpenAllItems").hidden               = !isFolder || isSeparator;
		getElement("sbPopupOpenAllItems").nextSibling.hidden   = !isFolder || isSeparator;
		getElement("sbPopupSort").hidden                       = !isFolder || isSeparator;
		getElement("sbPopupManage").hidden                     = !isFolder || isSeparator;
		getElement("sbPopupNewFolder").previousSibling.hidden  = isSeparator;
		getElement("sbPopupTools").hidden                      = isFolder || isSeparator;
		getElement("sbPopupRenew").disabled                    = isNote || isNotex || isNotexl;
		getElement("sbPopupInternalize").hidden                = !isNotex && !isNotexl;
		getElement("sbPopupInternalize").disabled              = !isNotex;
		getElement("sbPopupShowFiles").disabled                = isBookmark;
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
		var data = {
			urls: [sbDataSource.getProperty(aRes, "source")],
			refUrl: null,
			showDetail: aShowDetail,
			resName: null,
			resIdx: 0,
			referItem: null,
			option: null,
			file2Url: null,
			preset: preset,
			charset: null,
			timeout: null,
			titles: null,
			context: "capture-again",
		};
		window.top.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no", data);
	},

	internalize: function(aRes)
	{
		if (!aRes)
			aRes = this.isTreeContext ? sbTreeHandler.resource : sbListHandler.resource;
		if (!aRes)
			return;
		var id = sbDataSource.getProperty(aRes, "id");
		var refFile = sbCommonUtils.getContentDir(id); refFile.append("index.html");
		var refDir = refFile.parent;

		// pre-fill files in the same folder to prevent overwrite
		var file2Url = {};
		sbCommonUtils.forEachFile(refDir, function(file){
			if (file.isDirectory() && file.equals(refDir)) return;
			file2Url[file.leafName] = true;
			return 0;
		}, this);

		var options = {
			"isPartial" : false,
			"images" : true,
			"media" : true,
			"styles" : true,
			"script" : true,
			"textAsHtml" : false,
			"forceUtf8" : false,
			"rewriteStyles" : false,
			"internalize" : refFile,
		};
		var preset = [
			id,
			"index",
			options,
			file2Url,
			0,
			false
		];
		var data = {
			urls: [sbMainService.baseURL + "data/" + id + "/index.html"],
			refUrl: null,
			showDetail: false,
			resName: null,
			resIdx: 0,
			referItem: null,
			option: options,
			file2Url: file2Url,
			preset: preset,
			charset: null,
			timeout: null,
			titles: [sbDataSource.getProperty(aRes, "title")],
			context: "internalize",
		};
		window.top.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no", data);
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
		aDir = aDir.QueryInterface(Components.interfaces.nsILocalFile);
		aDir.launch();
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
		sbCommonUtils.rebuildGlobal();
	},

	copyInternal: function(aResList, aParResList)
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
			sbDataSource.copyItem(aResList[i], tarRes, -1);
		}
		sbCommonUtils.rebuildGlobal();
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
			if (!sbDataSource.exists(aResList[i])) {
				continue;
			}
			else if (sbDataSource.getRelativeIndex(aParResList[i], aResList[i]) < 0) {
				alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_REMOVE_RESOURCE", [aResList[i].Value]));
				continue;
			}
			rmIDs = rmIDs.concat(sbDataSource.deleteItemDescending(aResList[i], aParResList[i]));
		}
		for (var i = 0; i < rmIDs.length; i++) {
			var myDir = sbCommonUtils.getContentDir(rmIDs[i], true);
			if (myDir && rmIDs[i].length == 14)
				sbCommonUtils.removeDirSafety(myDir, true);
		}
		return rmIDs;
	},

	confirmRemovingFor: function(aResList)
	{
		if (sbMainService.prefs.confirmDelete) {
			return this.confirmRemovingPrompt();
		}
		for ( var i = 0; i < aResList.length; i++ ) {
			if ( sbDataSource.isContainer(aResList[i]) ) {
				return this.confirmRemovingPrompt();
			}
		}
		return true;
	},

	confirmRemovingPrompt: function() {
		var button = sbCommonUtils.PROMPT.STD_YES_NO_BUTTONS + sbCommonUtils.PROMPT.BUTTON_POS_1_DEFAULT;
		var text = sbCommonUtils.lang("scrapbook", "CONFIRM_DELETE");
		// pressing default button or closing the prompt returns 1
		// reverse it to mean "no" by default
		return !sbCommonUtils.PROMPT.confirmEx(null, "[ScrapBook]", text, button, null, null, null, null, {});
	},

};




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
			if (sbCommonUtils._fxVer3_5 &&
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
			sbCommonUtils.rebuildGlobal();
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
	},

	moveMultiple: function()
	{
		var idxList = sbTreeHandler.getSelection(false, 2);
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
		mmDatei.append("extensions.scrapbook.rdf");
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
			var data = {
				urls: [url],
				refUrl: win.location.href,
				showDetail: sbMainService.prefs.showDetailOnDrop || this.modShift,
				resName: res[0],
				resIdx: res[1],
				referItem: null,
				option: null,
				file2Url: null,
				preset: null,
				charset: null,
				timeout: null,
				titles: null,
			};
			top.window.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no", data);
		}
		else if (url.indexOf("file://") == 0) {
			top.window.sbContentSaver.captureFile(
				url, "file://", "file", sbMainService.prefs.showDetailOnDrop,
				res[0], res[1], null
			);
		}
		else {
			alert(sbCommonUtils.lang("scrapbook", "ERROR_INVALID_URL", [url]));
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
		resList.forEach(function(res) {
			var val;
			if (this.type != "all")
				val = sbDataSource.getProperty(res, this.type);
			else
				var val = ["title", "comment", "source", "id"].map(function(prop) {
					return sbDataSource.getProperty(res, prop);
				}).join("\n");
			if (val && val.match(this.regex))
				this.container.AppendElement(res);
		}, this);
		sbListHandler.quit();
		sbTreeHandler.TREE.ref = "urn:scrapbook:search";
		sbTreeHandler.TREE.builder.rebuild();
		sbTreeDNDHandler.quit();
		sbMainService.toggleHeader(
			true,
			sbCommonUtils.lang("scrapbook", "SEARCH_RESULTS_FOUND", [this.container.GetCount()])
		);
	},

	filterByDays : function()
	{
		var ret = { value: "1" };
		var title = sbCommonUtils.lang("scrapbook", "FILTER_BY_DAYS");
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



