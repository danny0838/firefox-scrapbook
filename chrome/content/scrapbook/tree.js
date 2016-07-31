
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

    init: function(isContainer) {
        this.TREE.database.AddDataSource(sbDataSource.data);
        this.autoCollapse = sbCommonUtils.getPref("tree.autoCollapse", false);
        if ( isContainer ) document.getElementById("sbTreeRule").setAttribute("iscontainer", true);
        if (this.TREE.getAttribute("data-seltype") == "single") {
            var selType = sbCommonUtils.getPref("ui.sidebarManage", false) ? "multiple" : "single";
            this.TREE.setAttribute("seltype", selType);
        }
        this.TREE.builder.rebuild();
    },

    exit: function() {
        var dsEnum = this.TREE.database.GetDataSources();
        while ( dsEnum.hasMoreElements() ) {
            var ds = dsEnum.getNext().QueryInterface(Components.interfaces.nsIRDFDataSource);
            this.TREE.database.RemoveDataSource(ds);
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

    // simple Enter on container: toggle container (natively), no keypress event
    onKeyPress: function(aEvent, aType) {
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

};
