
var sbTreeHandler = {

    get TREE() { return document.getElementById("sbTree"); },

    get resource() {
        if ( this.TREE.view.selection.count < 1 ) {
            return null;
        } else {
            return this.TREE.builderView.getResourceAtIndex(this.TREE.currentIndex);
        }
    },

    autoCollapse: false,

    init: function(aFoldersOnly) {
        this.TREE.database.AddDataSource(sbDataSource.data);
        this.autoCollapse = sbCommonUtils.getPref("tree.autoCollapse", false);
        if (aFoldersOnly) {
            document.getElementById("sbTreeRule").setAttribute("iscontainer", true);
        }
        if (this.TREE.getAttribute("data-seltype") == "single") {
            var selType = sbCommonUtils.getPref("ui.sidebarManage", false) ? "multiple" : "single";
            this.TREE.setAttribute("seltype", selType);
        }
        this.TREE.builder.rebuild();
        if (!aFoldersOnly) {
            this.enableDragDrop(true);
        }
    },

    uninit: function() {
        this.enableDragDrop(false);
        var dsEnum = this.TREE.database.GetDataSources();
        while ( dsEnum.hasMoreElements() ) {
            var ds = dsEnum.getNext().QueryInterface(Components.interfaces.nsIRDFDataSource);
            this.TREE.database.RemoveDataSource(ds);
        }
    },

    enableDragDrop: function(aEnable) {
        try {
            this.TREE.builderView.removeObserver(sbTreeDNDObserver);
        }
        catch(ex) {}
        if (aEnable) {
            this.TREE.builderView.addObserver(sbTreeDNDObserver);
        }
    },

    // aType: 0 = folderPicker.xul, 1 = manage.xul, 2 = scrapbook.xul
    onClick: function(aEvent, aType) {
        if ( aEvent.button != 0 && aEvent.button != 1 ) return;
        // "twisty" is the small arrow at the side of a container item
        // click on it toggles the container natively
        var obj = {};
        this.TREE.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, {}, {}, obj);
        if ( !obj.value || obj.value == "twisty" ) return;

        var curIdx = this.TREE.currentIndex;
        var shortcut = sbShortcut.fromEvent(aEvent);
        if (aType == 2 && !sbCommonUtils.getPref("ui.sidebarManage", false)) {
            // non-manage window:
            // simple click to open item; mid-, ctrl-, and shift-click to open in new tab
            // for folders, click or mid-click to toggle
            if (sbDataSource.getProperty(this.resource, "type") != "folder") {
                sbController.open(this.resource, aEvent.button == 1 || shortcut.accelKey || shortcut.shiftKey);
            } else {
                this.toggleFolder(curIdx);
            }
        } else {
            // manage window: mid-click to open in new tab
            if (aEvent.button == 1 && sbDataSource.getProperty(this.resource, "type") != "folder") {
                sbController.open(this.resource, true);
            }
        }
    },

    // simple Enter on container: toggle container (natively)
    onKeyDown: function(aEvent, aType) {
        var shortcut = sbShortcut.fromEvent(aEvent);
        switch (shortcut.keyName) {
            case "Return":
                // Enter to open item; Ctrl/Shift+Enter to open in new tab
                // Enter for non-folder containers will toggle natively
                if ( sbDataSource.getProperty(this.resource, "type") != "folder" ) {
                    sbController.open(this.resource, shortcut.accelKey || shortcut.shiftKey);
                }
                break;
            case "Space":
                // non-manage window:
                // Space to open item; Ctrl/Shift+Space to open in new tab
                if (aType == 2 && !sbCommonUtils.getPref("ui.sidebarManage", false)) {
                    if (sbDataSource.getProperty(this.resource, "type") != "folder") {
                        sbController.open(this.resource, shortcut.accelKey || shortcut.shiftKey);
                    }
                }
                break;
            case "Delete":
                this.remove();
                break;
            case "F2":
                sbController.forward(this.resource, "P");
                break;
        }
    },

    // double click (any button) on container: toggle container (natively)
    onDblClick: function(aEvent, aType) {
        if ( aEvent.originalTarget.localName != "treechildren" || aEvent.button != 0 ) return;
        if ( !(aType < 2 || sbCommonUtils.getPref("ui.sidebarManage", false)) ) return;
        if ( this.TREE.view.isContainer(this.TREE.currentIndex) ) return;
        var shortcut = sbShortcut.fromEvent(aEvent);
        sbController.open(this.resource, shortcut.accelKey || shortcut.shiftKey);
    },

    onDragStart: function(event) {
        if (event.originalTarget.localName != "treechildren") {
            return;
        }
        var idx = this.TREE.currentIndex;
        var res = this.TREE.builderView.getResourceAtIndex(idx);
        var dataTransfer = event.dataTransfer;
        dataTransfer.setData("moz/rdfitem", res.Value);
        if (sbDataSource.getProperty(res, "type") != "separator")
            dataTransfer.setData("text/x-moz-url", sbDataSource.getURL(res));
        dataTransfer.effectAllowed = "copy,move,link";
    },

    onDragOver: function(event) {
        var dataTransfer = event.dataTransfer;
        // drags items from tree
        if (
            dataTransfer.types.contains("moz/rdfitem") || 
            dataTransfer.types.contains("sb/tradeitem") || 
            dataTransfer.types.contains("application/x-moz-tabbrowser-tab") || 
            dataTransfer.types.contains("text/x-moz-url") || 
            dataTransfer.types.contains("text/_moz_htmlcontext")
        ) {
            event.preventDefault();
            var shortcut = sbShortcut.fromEvent(event);
            if (shortcut.accelKey || shortcut.shiftKey) {
                dataTransfer.dropEffect = "copy";
            } else if (shortcut.altKey) {
                dataTransfer.dropEffect = "link";
            }
        } else {
            dataTransfer.dropEffect = "none";
        }
    },

    onDrop: function(row, orient, dataTransfer) {
        // drags items from tree
        if (dataTransfer.types.contains("moz/rdfitem")) {
            this._DropMove(row, orient);
            return;
        // drags items from the exported item tree
        } else if (dataTransfer.types.contains("sb/tradeitem")) {
            this._DropImportData(row, orient);
            return;
        }
        var ip = this._DropGetTargets(row, orient); // insert point
        var showDetail = sbCommonUtils.getPref("showDetailOnDrop", false) || dataTransfer.dropEffect == "copy";
        // drags a tab from Firefox
        // => if it's the current tab, capture/bookmark it
        if (dataTransfer.types.contains("application/x-moz-tabbrowser-tab")) {
            var tab = dataTransfer.mozGetDataAt("application/x-moz-tabbrowser-tab", 0);
            if (tab instanceof XULElement && tab.localName == "tab" && 
                tab.ownerDocument.defaultView instanceof ChromeWindow && 
                tab == window.top.gBrowser.mCurrentTab) {
                if (dataTransfer.dropEffect == "link") {
                    this._bookmarkInternal(ip, { title: tab.label, source: tab.linkedBrowser.currentURI.spec });
                } else {
                    this._captureInternal(ip, showDetail, false);
                }
            }
        // drags something containing url
        } else if (dataTransfer.types.contains("text/x-moz-url")) {
            var url = dataTransfer.getData("URL");
            // drags a link from the web page content
            // => capture/bookmark it, using the link text as title
            if (dataTransfer.types.contains("text/x-moz-url-desc")) {
                var url = dataTransfer.getData("text/x-moz-url-data");
                var title = dataTransfer.getData("text/x-moz-url-desc");
                if (dataTransfer.dropEffect == "link") {
                    this._bookmarkInternal(ip, { title: title, source: url });
                } else {
                    this._captureLinkInternal(ip, showDetail, url, title);
                }
            // drags Firefox address bar icon
            // => if it's the current tab, capture/bookmark it
            } else if (url == window.top.content.location.href) {
                if (dataTransfer.dropEffect == "link") {
                    this._bookmarkInternal(ip);
                } else {
                    this._captureInternal(ip, showDetail, false);
                }
            // drags files
            // => capture the first file
            } else if (dataTransfer.types.contains("Files")) {
                this._captureFileInternal(ip, showDetail, dataTransfer.getData("text/x-moz-url"));
            // unknown behavior
            // => show error
            } else {
                sbCommonUtils.error(sbCommonUtils.lang("ERROR_INVALID_URL", url));
            }
        // drags rich text from Firefox web page content
        // => capture selection for the current tab
        // @TODO: prevent drag -> switch tab -> drop?
        // => Seems Firefox forbids natively (a drag becomes undroppable if switched tab)
        } else if (dataTransfer.types.contains("text/_moz_htmlcontext")) {
            this._captureInternal(ip, showDetail, true);
        }
    },


    send: function() {
        if ( this.TREE.view.selection.count == 0 ) return;
        var idxList = this.getSelection(false, 0), resList = [], parList = [];
        for ( var i = 0, I = idxList.length; i < I; i++ ) {
            var curRes = this.TREE.builderView.getResourceAtIndex(idxList[i]);
            var parRes = this.getParentResource(idxList[i]);
            if ( parRes.Value == "urn:scrapbook:search" ) {
                parRes = sbDataSource.findParentResource(curRes);
                if (!parRes) { sbCommonUtils.alert(sbCommonUtils.lang("ERR_FAIL_SEND")); return; }
            }
            resList.push(curRes);
            parList.push(parRes);
        }
        sbController.sendInternal(resList, parList);
    },


    copy: function() {
        if ( this.TREE.view.selection.count == 0 ) return;
        var idxList = this.getSelection(false, 0), resList = [], parList = [];
        for ( var i = 0, I = idxList.length; i < I; i++ ) {
            var curRes = this.TREE.builderView.getResourceAtIndex(idxList[i]);
            var parRes = this.getParentResource(idxList[i]);
            if ( parRes.Value == "urn:scrapbook:search" ) {
                parRes = sbDataSource.findParentResource(curRes);
                if (!parRes) { sbCommonUtils.alert(sbCommonUtils.lang("ERR_FAIL_SEND")); return; }
            }
            resList.push(curRes);
            parList.push(parRes);
        }
        sbController.copyInternal(resList, parList);
    },


    remove: function() {
        if ( this.TREE.view.selection.count == 0 ) return;
        var idxList = this.getSelection(false, 0), resList = [], parList = [];
        for ( var i = 0, I = idxList.length; i < I; i++ ) {
            resList.push( this.TREE.builderView.getResourceAtIndex(idxList[i]) );
            parList.push( this.getParentResource(idxList[i]) );
        }
        if ( !sbController.confirmRemovingFor(resList) ) return;
        var rmIDs = sbController.removeInternal(resList, parList, false);
        if ( rmIDs ) {
            sbMainService.trace(sbCommonUtils.lang("ITEMS_REMOVED", rmIDs.length));
            if ( "sbNoteService" in window && sbNoteService.resource && sbNoteService.resource.Value.substring(18,32) == rmIDs[0] ) sbNoteService.exit(false);
        }
    },

    locateInternal: function(aRes) {
        var i = 0;
        var resList = [];
        while ( aRes && aRes.Value != this.TREE.ref && ++i < 32 ) {
            resList.unshift(aRes);
            aRes = sbDataSource.findParentResource(aRes);
        }
        for ( i = 0; i < resList.length; i++ ) {
            var idx = this.TREE.builderView.getIndexOfResource(resList[i]);
            if ( idx != -1 && !this.TREE.view.isContainerOpen(idx) ) this.TREE.view.toggleOpenState(idx);
        }
        this.TREE.treeBoxObject.ensureRowIsVisible(idx);
        this.TREE.view.selection.select(idx);
        this.TREE.focus();
    },


    getParentResource: function(aIdx) {
        var parIdx = this.TREE.builderView.getParentIndex(aIdx);
        if ( parIdx == -1 ) {
            return this.TREE.resource;
        } else {
            return this.TREE.builderView.getResourceAtIndex(parIdx);
        }
    },

    getSelection: function(idx2res, rule) {
        var ret = [];
        for ( var rc = 0; rc < this.TREE.view.selection.getRangeCount(); rc++ ) {
            var start = {}, end = {};
            this.TREE.view.selection.getRangeAt(rc, start, end);
            for ( var i = start.value; i <= end.value; i++ ) {
                if ( rule == 1 && !this.TREE.view.isContainer(i) ) continue;
                if ( rule == 2 && this.TREE.view.isContainer(i) ) continue;
                ret.push( idx2res ? this.TREE.builderView.getResourceAtIndex(i) : i );
            }
        }
        return ret;
    },


    toggleFolder: function(aIdx) {
        if ( !aIdx ) aIdx = this.TREE.currentIndex;
        this.TREE.view.toggleOpenState(aIdx);
        if ( this.autoCollapse ) this.collapseFoldersBut(aIdx);
    },

    toggleAllFolders: function(forceClose) {
        var willOpen = true;
        for ( var i = 0; i < this.TREE.view.rowCount; i++ ) {
            if ( !this.TREE.view.isContainer(i) ) continue;
            if ( this.TREE.view.isContainerOpen(i) ) { willOpen = false; break; }
        }
        if ( forceClose ) willOpen = false;
        if ( willOpen ) {
            for ( var i = 0; i < this.TREE.view.rowCount; i++ ) {
                if ( this.TREE.view.isContainer(i) && !this.TREE.view.isContainerOpen(i) ) this.TREE.view.toggleOpenState(i);
            }
        } else {
            for ( var i = this.TREE.view.rowCount - 1; i >= 0; i-- ) {
                if ( this.TREE.view.isContainer(i) && this.TREE.view.isContainerOpen(i) ) this.TREE.view.toggleOpenState(i);
            }
        }
    },

    collapseFoldersBut: function(curIdx) {
        var ascIdxList = {};
        ascIdxList[curIdx] = true;
        while ( curIdx >= 0 ) {
            curIdx = this.TREE.builderView.getParentIndex(curIdx);
            ascIdxList[curIdx] = true;
        }
        for ( var i = this.TREE.view.rowCount - 1; i >= 0; i-- ) {
            if ( !ascIdxList[i] && this.TREE.view.isContainer(i) && this.TREE.view.isContainerOpen(i) ) {
                this.TREE.view.toggleOpenState(i);
            }
        }
    },
    
    // orient: -1 = drop before; 0 = drop on; 1 = drop after
    _DropMove: function(row, orient) {
        if ( row == -1 ) return;
        var curResList = this.getSelection(true, 0);
        if (orient == 1) curResList.reverse();
        var tarRes = this.TREE.builderView.getResourceAtIndex(row);
        var tarPar = (orient == 0) ? tarRes : this.getParentResource(row);
        if (orient == 1 &&
            this.TREE.view.isContainer(row) &&
            this.TREE.view.isContainerOpen(row) &&
            this.TREE.view.isContainerEmpty(row) == false) {
            tarPar = tarRes;
        }
        curResList.forEach(function(curRes){
            var curAbsIdx = this.TREE.builderView.getIndexOfResource(curRes);
            if (curAbsIdx == -1) {
                // This is somehow dirty but for some reason we might be unable to get the right index
                // rebuilding the tree solves the problem
                // mostly happen when selecting A/B/C, A/B, A, D together and moving them to E
                this.TREE.builder.rebuild();
                curAbsIdx = this.TREE.builderView.getIndexOfResource(curRes);
            }
            var curPar = this.getParentResource(curAbsIdx);
            var curRelIdx = sbDataSource.getRelativeIndex(curPar, curRes);
            var tarRelIdx = sbDataSource.getRelativeIndex(tarPar, tarRes);
            if (curRes.Value == tarRes.Value) return;
            if (orient == 1) {
                (tarRelIdx == -1) ? tarRelIdx = 1 : tarRelIdx++;
            }
            if (orient == -1 || orient == 1) {
                if (curPar.Value == tarPar.Value && tarRelIdx > curRelIdx)
                    tarRelIdx--;
                if (curPar.Value == tarPar.Value && curRelIdx == tarRelIdx)
                    return;
            }
            if (this.TREE.view.isContainer(curAbsIdx)) {
                var tmpRes = tarRes;
                var tmpIdx = this.TREE.builderView.getIndexOfResource(tmpRes);
                while (tmpRes.Value != this.TREE.ref && tmpIdx != -1) {
                    tmpRes = this.getParentResource(tmpIdx);
                    tmpIdx = this.TREE.builderView.getIndexOfResource(tmpRes);
                    if (tmpRes.Value == curRes.Value) {
                        return;
                    }
                }
            }
            sbDataSource.moveItem(curRes, curPar, tarPar, tarRelIdx);
        }, this);
        sbCommonUtils.rebuildGlobal();
    },

    _DropImportData: function(aRow, aOrient) {
        if (!window.sbManageService) {
            return;
        }
        var win = window.top.document.getElementById("sbRightPaneBrowser").contentWindow;
        win.sbImportService.exec(aRow, aOrient);
    },

    _DropGetTargets: function(aRow, aOrient) {
        if (aRow == -1 || aRow == -128) {
            return [this.TREE.ref, 0];
        }
        var tarRes = this.TREE.builderView.getResourceAtIndex(aRow);
        var tarPar = (aOrient == 0) ? tarRes : this.getParentResource(aRow);
        var tarRelIdx = sbDataSource.getRelativeIndex(tarPar, tarRes);
        if (aOrient == 1)
            tarRelIdx++;
        if (aOrient == 1 &&
            this.TREE.view.isContainer(aRow) &&
            this.TREE.view.isContainerOpen(aRow) &&
            this.TREE.view.isContainerEmpty(aRow) == false) {
            sbMainService.trace("drop after open container");
            tarPar = tarRes; tarRelIdx = 1;
        }
        return [tarPar.Value, tarRelIdx];
    },

    _captureInternal: function(ip, showDetail, partial) {
        var targetWindow = partial ? sbCommonUtils.getFocusedWindow() : window.top.content;
        window.top.sbContentSaver.captureWindow(
            targetWindow, partial, showDetail, ip[0], ip[1], null
        );
    },

    _captureFileInternal: function(ip, showDetail, url) {
        window.top.sbContentSaver.captureFile(
            url, "file://", "file", showDetail, ip[0], ip[1], null, "link"
        );
    },

    _captureLinkInternal: function(ip, showDetail, url, title) {
        var win = sbCommonUtils.getFocusedWindow();
        var data = {
            urls: [url],
            refUrl: win.location.href,
            showDetail: showDetail,
            resName: ip[0],
            resIdx: ip[1],
            referItem: null,
            option: null,
            file2Url: null,
            preset: null,
            titles: [title],
            context: "link",
        };
        window.top.openDialog(
            "chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
            data
        );
    },

    _bookmarkInternal: function(ip, preset) {
        window.top.sbBrowserOverlay.bookmark(ip[0], ip[1], preset);
    },
};

var sbTreeDNDObserver = {
    canDrop: function(row, orient, dataTransfer) {
        return true;
    },

    onDrop: function(row, orient, dataTransfer) {
        return sbTreeHandler.onDrop(row, orient, dataTransfer);
    },

    onToggleOpenState: function(index) {},
    onCycleHeader: function(colID, elt) {},
    onCycleCell: function(row, colID) {},
    onSelectionChanged: function() {},
    onPerformAction: function(action) {},
    onPerformActionOnRow: function(action, row) {},
    onPerformActionOnCell: function(action, row, colID) {},
};
