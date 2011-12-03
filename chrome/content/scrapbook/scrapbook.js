
var sbMainUI = {


	init: function()
	{
		sbMultiBookUI.showButton();
		sbTreeUI.init(false);
		sbTreeUI.enableDragDrop(true);
		sbSearchUI.init();
		setTimeout(function(self) { self.delayedInit(); }, 0, this);
	},

	delayedInit: function()
	{
		if ("ScrapBookBrowserOverlay" in window.top == false)
			return;
		sbMultiBookUI.showSidebarTitle();
		if (window.top.ScrapBookBrowserOverlay.locateMe)
			this.locate(null);
	},

	rebuild: function()
	{
		sbTreeUI.TREE.builder.rebuild();
	},

	refresh: function()
	{
		sbTreeUI.uninit();
		this.init();
	},

	done: function()
	{
		sbNoteService.save();
		sbSearchUI.uninit();
		sbTreeUI.uninit();
		if (this._traceTimer)
			window.clearTimeout(this._traceTimer)
	},

	trace: function(aText, aMillisec)
	{
		var status = top.window.document.getElementById("statusbar-display");
		if (!status)
			return;
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
			aRes = window.top.ScrapBookBrowserOverlay.locateMe;
		if ("ScrapBookBrowserOverlay" in window.top)
			window.top.ScrapBookBrowserOverlay.locateMe = null;
		if (aRes.Value == "urn:scrapbook:root")
			return;
		sbSearchUI.reset();
		sbTreeUI.locateInternal(aRes);
	},

	createFolder: function()
	{
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
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
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
		var result = {};
		window.openDialog(
			"chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome",
			newItem.id, result
		);
		if (!result.accept) {
			ScrapBookData.deleteItemDescending(newRes, ScrapBookUtils.RDF.GetResource(tarResName));
			return false;
		}
		return true;
	},

	createSeparator: function()
	{
		sbSearchUI.reset();
		var newItem = ScrapBookData.newItem();
		newItem.type = "separator";
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = sbTreeUI.TREE.currentIndex;
			var curRes = sbTreeUI.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = sbTreeUI.getParentResource(curIdx);
			var curRelIdx = ScrapBookData.getRelativeIndex(curPar, curRes);
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
			tarResName = sbTreeUI.TREE.ref;
			tarRelIdx  = 0;
			isRootPos  = true;
		}
		var newRes = ScrapBookData.addItem(newItem, tarResName, tarRelIdx);
		ScrapBookUtils.refreshGlobal(false);
		sbTreeUI.TREE.view.selection.clearSelection();
		var idx = sbTreeUI.TREE.builderView.getIndexOfResource(newRes);
		sbTreeUI.TREE.treeBoxObject.ensureRowIsVisible(idx);
	},

	createNote: function(aInTab)
	{
		sbSearchUI.reset();
		var tarResName, tarRelIdx, isRootPos;
		try {
			var curIdx = sbTreeUI.TREE.currentIndex;
			var curRes = sbTreeUI.TREE.builderView.getResourceAtIndex(curIdx);
			var curPar = sbTreeUI.getParentResource(curIdx);
			var curRelIdx = ScrapBookData.getRelativeIndex(curPar, curRes);
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
			isRootPos  = false;
		}
		catch(ex) {
			tarResName = sbTreeUI.TREE.ref;
			tarRelIdx  = 0;
			isRootPos  = true;
		}
		sbNoteService.create(tarResName, tarRelIdx, aInTab);
		var idx = sbTreeUI.TREE.builderView.getIndexOfResource(sbNoteService.resource);
		sbTreeUI.TREE.view.selection.select(idx);
		if (isRootPos)
			sbTreeUI.TREE.treeBoxObject.scrollByLines(sbTreeUI.TREE.view.rowCount);
	},

	openPrefWindow : function()
	{
		var instantApply = window.top.gPrefService.getBoolPref("browser.preferences.instantApply");
		window.top.openDialog(
			"chrome://scrapbook/content/prefs.xul", "ScrapBook:Options",
			"chrome,titlebar,toolbar,centerscreen," + (instantApply ? "dialog=no" : "modal")
		);
	},

};




var sbController = {

	onPopupShowing : function(aEvent)
	{
		if (aEvent.originalTarget.id != "sbPopup")
			return;
		var res = sbTreeUI.resource;
		if (!res) {
			aEvent.preventDefault();
			return;
		}
		var isNote = false;
		var isFolder = false;
		var isBookmark = false;
		var isSeparator = false;
		switch (ScrapBookData.getProperty(res, "type")) {
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
				);
				break;
			case "separator": 
				return;
			default :
				ScrapBookUtils.loadURL(
					ScrapBookData.getURL(aRes),
					aInTab || ScrapBookUtils.getPref("tabs.open")
				);
		}
	},

	openAllInTabs: function(aRes)
	{
		if (!aRes)
			aRes = sbTreeUI.resource;
		if (!aRes)
			return;
		var resList = ScrapBookData.flattenResources(aRes, 2, false);
		resList.forEach(function(res) {
			ScrapBookUtils.loadURL(ScrapBookData.getURL(res), true);
		});
	},

	renew: function(aRes, aShowDetail)
	{
		if (!aRes)
			aRes = sbTreeUI.resource;
		if (!aRes)
			return;
		var preset = [
			ScrapBookData.getProperty(aRes, "id"),
			"index",
			null,
			null,
			0,
			ScrapBookData.getProperty(aRes, "type") == "bookmark"
		];
		window.top.openDialog(
			"chrome://scrapbook/content/capture.xul", "",
			"chrome,centerscreen,all,resizable,dialog=no",
			[ScrapBookData.getProperty(aRes, "source")], null,
			aShowDetail, null, 0, null, null, null, preset
		);
	},

	forward: function(aRes, aCommand, aParam)
	{
		if (!aRes)
			aRes = sbTreeUI.resource;
		if (!aRes)
			return;
		var id = ScrapBookData.getProperty(aRes, "id");
		if (!id)
			return;
		switch (aCommand) {
			case "P": 
				window.openDialog("chrome://scrapbook/content/property.xul", "", "chrome,centerscreen,modal", id);
				break;
			case "M": 
				ScrapBookUtils.openManageWindow(aRes, null);
				break;
			case "Z": 
				window.openDialog('chrome://scrapbook/content/sort.xul','','chrome,centerscreen,modal', aRes);
				break;
			case "C": 
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
		aDir = aDir.QueryInterface(Ci.nsILocalFile);
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
			ScrapBookData.moveItem(aResList[i], aParResList[i], tarRes, -1);
		}
		ScrapBookUtils.refreshGlobal(false);
	},

	removeInternal: function(aResList, aParResList, aBypassConfirm)
	{
		var rmIDs = [];
		for (var i = 0; i < aResList.length; i++) {
			if (aParResList[i].Value == "urn:scrapbook:search") {
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

};




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
		if (event.keyCode != event.DOM_VK_RETURN)
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
		}
		else {
			var modTime = cache.lastModifiedTime;
			if (modTime && ((new Date()).getTime() - modTime) > 1000 * 60 * 60 * 24 * 5)
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
			win.focus();
		}
	},

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

};



