
var sbTreeUI = {

	get resource() {
		if (this.TREE.view.selection.count < 1)
			return null;
		else
			return this.TREE.builderView.getResourceAtIndex(this.TREE.currentIndex);
	},

	TREE: null,

	autoCollapse : false,

	init: function(aFoldersOnly) {
		this.TREE = document.getElementById("sbTree");
		this.TREE.database.AddDataSource(ScrapBookData.dataSource);
		this.autoCollapse = ScrapBookUtils.getPref("tree.autoCollapse", false);
		if (aFoldersOnly)
			document.getElementById("sbTreeRule").setAttribute("iscontainer", "true");
		this.TREE.builder.rebuild();
		if (!aFoldersOnly)
			this.enableDragDrop(true);
	},

	uninit: function()
	{
		this.enableDragDrop(false);
		var dataSources = this.TREE.database.GetDataSources();
		while (dataSources.hasMoreElements()) {
			var dataSource = dataSources.getNext().QueryInterface(Ci.nsIRDFDataSource);
			this.TREE.database.RemoveDataSource(dataSource);
		}
		this.TREE = null;
	},

	enableDragDrop: function(aEnable) {
		try {
			this.TREE.builderView.removeObserver(this);
		}
		catch(ex) {
		}
		if (aEnable)
			this.TREE.builderView.addObserver(this);
	},


	onClick : function(aEvent, aType)
	{
		if ( aEvent.button != 0 && aEvent.button != 1 ) return;  // skip right click
		if (aEvent.ctrlKey || aEvent.shiftKey) return;  // skip if ctrl or shift key is pressed (for multiple selection)
		var obj = {};
		this.TREE.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, {}, {}, obj);
		if ( !obj.value || obj.value == "twisty" ) return;
		var curIdx = this.TREE.currentIndex;
		if ( this.TREE.view.isContainer(curIdx) )
		{
			this.toggleFolder(curIdx);
		}
		else
		{
			if ( aType < 2 && aEvent.button != 1 ) return;
			sbController.open(this.resource, aEvent.button == 1);
		}
	},

	onKeyPress : function(aEvent)
	{
		switch ( aEvent.keyCode )
		{
			case aEvent.DOM_VK_RETURN : 
				if ( this.TREE.view.isContainer(this.TREE.currentIndex) ) return;
				sbController.open(this.resource, aEvent.ctrlKey || aEvent.shiftKey);
				break;
			case aEvent.DOM_VK_DELETE : this.remove(); break;
			case aEvent.DOM_VK_F2 : sbController.forward(this.resource, "P"); break;
		}
	},

	onDblClick : function(aEvent)
	{
		if ( aEvent.originalTarget.localName != "treechildren" || aEvent.button != 0 ) return;
		if ( this.TREE.view.isContainer(this.TREE.currentIndex) ) return;
		sbController.open(this.resource, aEvent.ctrlKey || aEvent.shiftKey);
	},

	onDragStart: function(event) {
		if (event.originalTarget.localName != "treechildren")
			return;
		var dataTransfer = event.dataTransfer;
		var idx = this.TREE.currentIndex;
		var res = this.TREE.builderView.getResourceAtIndex(idx);
		dataTransfer.setData("moz/rdfitem", res.Value);
		if (ScrapBookData.getProperty(res, "type") != "separator")
			dataTransfer.setData("text/x-moz-url", ScrapBookData.getURL(res));
		dataTransfer.effectAllowed = "copy,move,link";
	},

	onDragOver: function(event) {
		var dataTransfer = event.dataTransfer;
		if (dataTransfer.types.contains("moz/rdfitem") || 
		    dataTransfer.types.contains("sb/tradeitem") || 
		    dataTransfer.types.contains("text/x-moz-url") || 
		    dataTransfer.types.contains("text/html") || 
		    dataTransfer.types.contains("application/x-moz-tabbrowser-tab")) {
			event.preventDefault();
			if (event.ctrlKey || event.shiftKey)
				dataTransfer.dropEffect = "copy";
			else if (event.altKey)
				dataTransfer.dropEffect = "link";
		}
	},


	send : function()
	{
		var idxList = this.getSelection(false, 2);
		if ( idxList.length < 1 ) return;
		if ( this.validateMultipleSelection(idxList) == false ) return;
		var i = 0;
		var resList = [];
		var parList = [];
		for ( i = 0; i < idxList.length; i++ )
		{
			var curRes = this.TREE.builderView.getResourceAtIndex(idxList[i]);
			var parRes = this.getParentResource(idxList[i]);
			if ( parRes.Value == "urn:scrapbook:search" )
			{
				parRes = ScrapBookData.findParentResource(curRes);
				if ( ScrapBookUtils.RDFCU.indexOf(ScrapBookData.dataSource, parRes, curRes) == -1 ) {
					ScrapBookUtils.alert("FATAL ERROR");
					return;
				}
			}
			resList.push(curRes);
			parList.push(parRes);
		}
		sbController.sendInternal(resList, parList);
	},

	remove : function()
	{
		if ( this.TREE.view.selection.count == 0 ) return;
		if ( !sbController.confirmBeforeRemoving(this.resource) ) return;
		var resList = [];
		var parList = [];
		if ( this.TREE.view.selection.count > 1 )
		{
			var idxList = this.getSelection(false, null);
			for ( var i = 0; i < idxList.length; i++ )
			{
				resList.push( this.TREE.builderView.getResourceAtIndex(idxList[i]) );
				parList.push( this.getParentResource(idxList[i]) );
			}
		}
		else
		{
			var curIdx = this.TREE.currentIndex;
			var curRes = this.TREE.builderView.getResourceAtIndex(curIdx);
			var parRes = this.getParentResource(curIdx);
			resList.push(curRes);
			parList.push(parRes);
		}
		var rmIDs = sbController.removeInternal(resList, parList, false);
		if ( rmIDs )
		{
			sbMainUI.trace(ScrapBookUtils.getLocaleString("ITEMS_REMOVED", [rmIDs.length]));
			if ( "sbNoteService" in window && sbNoteService.resource && sbNoteService.resource.Value.substring(18,32) == rmIDs[0] ) sbNoteService.exit(false);
		}
	},

	locateInternal : function(aRes)
	{
		var i = 0;
		var resList = [];
		while ( aRes && aRes.Value != this.TREE.ref && ++i < 32 )
		{
			resList.unshift(aRes);
			aRes = ScrapBookData.findParentResource(aRes);
		}
		for ( i = 0; i < resList.length; i++ )
		{
			var idx = this.TREE.builderView.getIndexOfResource(resList[i]);
			if ( idx != -1 && !this.TREE.view.isContainerOpen(idx) ) this.TREE.view.toggleOpenState(idx);
		}
		this.TREE.treeBoxObject.ensureRowIsVisible(idx);
		this.TREE.view.selection.select(idx);
		this.TREE.focus();
	},


	getParentResource : function(aIdx)
	{
		var parIdx = this.TREE.builderView.getParentIndex(aIdx);
		if ( parIdx == -1 )
			return this.TREE.resource;
		else
			return this.TREE.builderView.getResourceAtIndex(parIdx);
	},

	getSelection : function(idx2res, rule)
	{
		var ret = [];
		for ( var rc = 0; rc < this.TREE.view.selection.getRangeCount(); rc++ )
		{
			var start = {}, end = {};
			this.TREE.view.selection.getRangeAt(rc, start, end);
			for ( var i = start.value; i <= end.value; i++ )
			{
				if ( rule == 1 && !this.TREE.view.isContainer(i) ) continue;
				if ( rule == 2 && this.TREE.view.isContainer(i) ) continue;
				ret.push( idx2res ? this.TREE.builderView.getResourceAtIndex(i) : i );
			}
		}
		return ret;
	},

	toggleFolder : function(aIdx)
	{
		if ( !aIdx ) aIdx = this.TREE.currentIndex;
		this.TREE.view.toggleOpenState(aIdx);
		if ( this.autoCollapse ) this.collapseFoldersBut(aIdx);
	},

	toggleAllFolders : function(forceClose)
	{
		var willOpen = true;
		for ( var i = 0; i < this.TREE.view.rowCount; i++ )
		{
			if ( !this.TREE.view.isContainer(i) ) continue;
			if ( this.TREE.view.isContainerOpen(i) ) { willOpen = false; break; }
		}
		if ( forceClose ) willOpen = false;
		if ( willOpen ) {
			for ( var i = 0; i < this.TREE.view.rowCount; i++ )
			{
				if ( this.TREE.view.isContainer(i) && !this.TREE.view.isContainerOpen(i) ) this.TREE.view.toggleOpenState(i);
			}
		} else {
			for ( var i = this.TREE.view.rowCount - 1; i >= 0; i-- )
			{
				if ( this.TREE.view.isContainer(i) && this.TREE.view.isContainerOpen(i) ) this.TREE.view.toggleOpenState(i);
			}
		}
	},

	collapseFoldersBut : function(curIdx)
	{
		var ascIdxList = {};
		ascIdxList[curIdx] = true;
		while ( curIdx >= 0 )
		{
			curIdx = this.TREE.builderView.getParentIndex(curIdx);
			ascIdxList[curIdx] = true;
		}
		for ( var i = this.TREE.view.rowCount - 1; i >= 0; i-- )
		{
			if ( !ascIdxList[i] && this.TREE.view.isContainer(i) && this.TREE.view.isContainerOpen(i) ) {
				this.TREE.view.toggleOpenState(i);
			}
		}
	},


	canDrop: function(row, orient, dataTransfer) {
		if (!dataTransfer.types.contains("moz/rdfitem"))
			return true;
		var idxs = this.getSelection(false, 0);
		for (var i = 0; i < idxs.length; i++) {
			var idx = idxs[i];
			if (idx == row)
				return false;
			if (this.TREE.view.isContainer(idx) && 
			    this.TREE.view.isContainerOpen(idx) && 
			    !this.TREE.view.isContainerEmpty(idx)) {
				var tmpRow = row;
				while (tmpRow >= 0) {
					if (tmpRow == idx) {
						return false;
					}
					tmpRow = this.TREE.builderView.getParentIndex(tmpRow);
				}
			}
		}
		return true;
	},

	onDrop: function(row, orient, dataTransfer) {
		if (!this.canDrop(row, orient, dataTransfer))
			return;
		if (dataTransfer.types.contains("moz/rdfitem")) {
			this._moveInternal(row, orient);
			return;
		}
		else if (dataTransfer.types.contains("sb/tradeitem")) {
			if (!window.sbManageUI)
				return;
			var win = window.top.document.getElementById("sbRightPaneBrowser").contentWindow;
			win.sbImportService.exec(row, orient);
			return;
		}
		var ip = this._getInsertionPoint(row, orient);
		var showDetail = ScrapBookUtils.getPref("showDetailOnDrop") || dataTransfer.dropEffect == "copy";
		if (dataTransfer.types.contains("text/x-moz-url")) {
			var url = dataTransfer.getData("URL");
			if (dataTransfer.types.contains("text/x-moz-url-desc")) {
				if (dataTransfer.dropEffect == "link")
					this._bookmarkInternal(
						ip, { title: dataTransfer.getData("text/x-moz-url-desc"), source: url }
					);
				else
					this._captureLinkInternal(ip, showDetail, url);
			}
			else if (url == window.top.content.location.href) {
				if (dataTransfer.dropEffect == "link")
					this._bookmarkInternal(ip);
				else
					this._captureInternal(ip, showDetail, false);
			}
			else if (dataTransfer.types.contains("Files")) {
				this._captureFileInternal(ip, showDetail, dataTransfer.getData("text/x-moz-url"));
			}
			else {
				ScrapBookUtils.alert(ScrapBookUtils.getLocaleString("ERROR_INVALID_URL") + "\n" + url);
			}
		}
		else if (dataTransfer.types.contains("text/html")) {
			this._captureInternal(ip, showDetail, true);
		}
		else if (dataTransfer.types.contains("application/x-moz-tabbrowser-tab")) {
			var tab = dataTransfer.mozGetDataAt("application/x-moz-tabbrowser-tab", 0);
			if (tab instanceof XULElement && tab.localName == "tab" && 
			    tab.ownerDocument.defaultView instanceof ChromeWindow && 
			    tab == window.top.gBrowser.mCurrentTab) {
				if (dataTransfer.dropEffect == "link")
					this._bookmarkInternal(ip, { title: tab.label, source: tab.linkedBrowser.currentURI.spec });
				else
					this._captureInternal(ip, showDetail, false);
			}
		}
	},

	onToggleOpenState    : function(index) {},
	onCycleHeader        : function(colID, elt) {},
	onCycleCell          : function(row, colID) {},
	onSelectionChanged   : function() {},
	onPerformAction      : function(action) {},
	onPerformActionOnRow : function(action, row) {},
	onPerformActionOnCell: function(action, row, colID) {},


	_moveInternal: function(row, orient) {
		const TBO = Ci.nsIXULTreeBuilderObserver;
		var idxs = this.getSelection(false, 0);
		if (orient == TBO.DROP_AFTER)
			idxs.reverse();
		var curResList = [], curParList = [];
		idxs.forEach(function(idx) {
			curResList.push(this.TREE.builderView.getResourceAtIndex(idx));
			curParList.push(this.getParentResource(idx));
		}, this);
		var tarRes = this.TREE.builderView.getResourceAtIndex(row);
		var tarPar = (orient == TBO.DROP_ON) ? tarRes : this.getParentResource(row);
		if (orient == TBO.DROP_AFTER &&
		    this.TREE.view.isContainer(row) &&
		    this.TREE.view.isContainerOpen(row) &&
		    this.TREE.view.isContainerEmpty(row) == false) {
			tarPar = this.TREE.builderView.getResourceAtIndex(row);
			tarRes = this.TREE.builderView.getResourceAtIndex(row + 1);
			tarRelIdx = 1;
		}
		for (var i = 0; i < idxs.length; i++) {
			var curRes = curResList[i];
			var curPar = curParList[i];
			var curAbsIdx = this.TREE.builderView.getIndexOfResource(curRes);
			if (curAbsIdx == row)
				return;
			var curRelIdx = ScrapBookData.getRelativeIndex(curPar, curRes);
			var tarRelIdx = ScrapBookData.getRelativeIndex(tarPar, tarRes);
			if (orient == TBO.DROP_AFTER)
				tarRelIdx++;
			if (orient == TBO.DROP_BEFORE || orient == TBO.DROP_AFTER) {
				if (curPar.Value == tarPar.Value && tarRelIdx > curRelIdx)
					tarRelIdx--;
				if (curPar.Value == tarPar.Value && curRelIdx == tarRelIdx)
					return;
			}
			if (this.TREE.view.isContainer(curAbsIdx)) {
				var tmpIdx = row;
				var tmpRes = tarRes;
				while (tmpRes.Value != this.TREE.ref && tmpIdx != -1) {
					tmpRes = this.getParentResource(tmpIdx);
					tmpIdx = this.TREE.builderView.getIndexOfResource(tmpRes);
					if (tmpRes.Value == curRes.Value) {
						return;
					}
				}
			}
			ScrapBookData.moveItem(curRes, curPar, tarPar, tarRelIdx);
		}
		ScrapBookUtils.refreshGlobal(false);
		this.TREE.view.selection.clearSelection();
		curResList.forEach(function(res) {
			var idx = this.TREE.builderView.getIndexOfResource(res);
			this.TREE.view.selection.toggleSelect(idx);
		}, this);
	},

	_captureInternal: function(ip, showDetail, partial) {
		var win = partial ? ScrapBookUtils.getFocusedWindow() : window.top.content;
		window.top.sbContentSaver.captureWindow(
			win, partial, showDetail, ip[0], ip[1], null
		);
	},

	_captureFileInternal: function(ip, showDetail, url) {
		window.top.sbContentSaver.captureFile(
			url, "file://", "file", showDetail, ip[0], ip[1], null
		);
	},

	_captureLinkInternal: function(ip, showDetail, url) {
		var win = ScrapBookUtils.getFocusedWindow();
		window.top.openDialog(
			"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[url], win.location.href, showDetail, ip[0], ip[1], null, null, null
		);
	},

	_bookmarkInternal: function(ip, preset) {
		window.top.ScrapBookBrowserOverlay.bookmark(ip[0], ip[1], preset);
	},

	_getInsertionPoint: function(row, orient) {
		if (row == -1 || row == -128)
			return [this.TREE.ref, 0];
		var tarRes = this.TREE.builderView.getResourceAtIndex(row);
		var tarPar = (orient == 0) ? tarRes : this.getParentResource(row);
		var tarRelIdx = ScrapBookData.getRelativeIndex(tarPar, tarRes);
		if (orient == 1)
			tarRelIdx++;
		if (orient == 1 &&
		    this.TREE.view.isContainer(row) &&
		    this.TREE.view.isContainerOpen(row) &&
		    this.TREE.view.isContainerEmpty(row) == false) {
			sbMainUI.trace("drop after open container");
			tarPar = tarRes; tarRelIdx = 1;
		}
		return [tarPar.Value, tarRelIdx];
	},

};



