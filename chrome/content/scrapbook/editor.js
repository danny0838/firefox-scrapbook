
let sbPageEditor = {

    get TOOLBAR() { return document.getElementById("ScrapBookEditor"); },
    get COMMENT() { return document.getElementById("ScrapBookEditComment"); },

    enabled: true,
    item: {},
    multiline: false,
    isMainPage: false,

    init: function(aID) {
        // check if the given ID is valid
        if ( aID ) {
            if ( aID != sbBrowserOverlay.getID() ) return;
            if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.disable(true); return; }
        }

        // record item and resource
        if ( aID ) {
            this.item = sbDataSource.getItem(sbBrowserOverlay.resource);
        } else {
            this.item = null;
            sbBrowserOverlay.resource = null;
        }

        // Update highlighter previewers
        let idx = document.getElementById("ScrapBookHighlighter").getAttribute("color") || 8;
        let cssText = sbCommonUtils.getPref("highlighter.style." + idx, sbHighlighter.PRESET_STYLES[idx]);
        sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighterPreview"), cssText);

        // show and enable the edit toolbar, with several settings
        // -- edit before
        if ( !aID ) {
            // if not a ScrapBook item, init is called by clicking "Edit Before"
            // show the whole toolbox
            document.getElementById("ScrapBookToolbox").hidden = false;
            sbInfoViewer.TOOLBAR.hidden = true;
        }
        // -- current browser tab
        this.isMainPage = false;
        if ( aID ) {
            try {
                let mainFile = sbCommonUtils.getContentDir(aID); mainFile.append("index.html");
                let curFile = sbCommonUtils.convertURLToFile(gBrowser.currentURI.spec);
                // if the current page is the index page of the id, use the item title and item icon
                if (mainFile.equals(curFile)) {
                    this.isMainPage = true;
                    this.documentLoad(window.content.document, function(doc){
                        let that = this;
                        setTimeout(function(){
                            gBrowser.selectedTab.label = that.item.title;
                            gBrowser.selectedTab.setAttribute("image", that.item.icon || sbCommonUtils.getDefaultIcon(that.item.type));
                        }, 0);
                    }, this);
                }
                // auto renew the date data
                if (!this.item.create) {
                    this.item.create = aID;
                    sbDataSource.setProperty(sbBrowserOverlay.resource, "create", this.item.create);
                }
                if (!this.item.modify) {
                    this.item.modify = this.item.create;
                    sbDataSource.setProperty(sbBrowserOverlay.resource, "modify", this.item.modify);
                }
                let curFileTime = sbCommonUtils.getTimeStamp(new Date(curFile.lastModifiedTime));
                if (curFileTime > this.item.modify) {
                    this.item.modify = curFileTime;
                    sbDataSource.setProperty(sbBrowserOverlay.resource, "modify", curFileTime);
                }
            } catch(ex) {
                sbCommonUtils.error(ex);
            }
        }
        // -- icon --> link to parent folder
        let icon = document.getElementById("ScrapBookEditIcon");
        if (aID) {
            icon.src = this.item.icon || sbCommonUtils.getDefaultIcon(this.item.type);
            try {
                let curFile = sbCommonUtils.convertURLToFile(gBrowser.currentURI.spec);
                let url = sbCommonUtils.convertFileToURL(curFile.parent);
                icon.onclick = function(aEvent){ sbCommonUtils.loadURL(url, aEvent.button == 1); };
            } catch(ex) {
                sbCommonUtils.error(ex);
            }
        } else {
            icon.src = gBrowser.selectedTab.getAttribute("image");
        }
        // -- title
        document.getElementById("ScrapBookEditTitle").value =  aID ? this.item.title : gBrowser.selectedTab.label;
        try { document.getElementById("ScrapBookEditTitle").editor.transactionManager.clear(); } catch(ex) {}
        // -- comment
        this.COMMENT.value = aID ? this.item.comment.replace(/ __BR__ /g, this.multiline ? "\n" : "\t") : "";
        let restoredComment = sbCommonUtils.documentData(window.content.document, "comment");
        if (restoredComment) this.COMMENT.value = restoredComment;
        try { this.COMMENT.editor.transactionManager.clear(); } catch(ex) {}
        // -- inner link and attach file button
        document.getElementById("ScrapBookEditAnnotation").firstChild.childNodes[1].disabled = (aID == null);
        document.getElementById("ScrapBookEditAnnotation").firstChild.childNodes[2].disabled = (aID == null);
        // -- refresh the toolbar
        if ( aID && (this.item.lock == "true" || sbCommonUtils.convertURLToFile(gBrowser.currentURI.spec).leafName.match(/^\./)) ) {
            // locked items and hidden (history) HTML pages cannot be edited, simply show a disabled toolbar
            this.disable(true);
        } else {
            this.disable(false);
        }
        this.showHide(true);

        // settings for the page, only if it's first load
        if ( !sbCommonUtils.documentData(window.content.document, "inited") ) {
            sbCommonUtils.documentData(window.content.document, "inited", true);
            if ( aID ) {
                try { window.content.removeEventListener("beforeunload", this.handleUnloadEvent, true); } catch(ex) {} // could get an error in Firefox 3.0
                window.content.addEventListener("beforeunload", this.handleUnloadEvent, true);
            }
            sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
                sbAnnotationService.initEvent(win);
                this.initEvent(win);
                this.documentLoad(win.document, function(doc){
                    sbPageEditor.documentBeforeEdit(doc);
                }, this);
            }, this);
            if (this.enabled && this.item && this.item.lock != "true" && this.item.type == "notex" && 
                sbCommonUtils.getPref("edit.autoEditNoteX", true) && sbCommonUtils.getPref("edit.autoEditNoteX.active", true)) {
                this.documentLoad(window.content.document, function(doc){
                    // check document type and make sure it's a file
                    if (doc.contentType != "text/html") return;
                    // turn on HTMLEditor, without marking as changed
                    let _changed = sbCommonUtils.documentData(doc, "changed");
                    sbHtmlEditor.init(window.content.document, 1);
                    if (!_changed) sbCommonUtils.documentData(doc, "changed", false);
                }, this);
            }
        }
    },

    uninit: function() {
        this.item = null;
        this.disable(true);
    },

    documentLoad: function(aDoc, aCallback, aThisArg) {
        if (aDoc.readyState === 'complete') {
            aCallback.call(aThisArg, aDoc);
            return;
        }
        aDoc.defaultView.addEventListener("load", function(aEvent){
            let doc = aEvent.originalTarget;
            aCallback.call(aThisArg, doc);
        }, true);
    },

    initEvent: function(aWindow) {
        aWindow.document.removeEventListener("keydown", this.handleKeyEvent, true);
        aWindow.document.addEventListener("keydown", this.handleKeyEvent, true);
    },

    handleKeyEvent: function(aEvent) {
        if (!sbPageEditor.enabled || sbHtmlEditor.enabled || sbDOMEraser.enabled) return;
        // cache frequently used variables
        if (!arguments.callee.cached) {
            arguments.callee.cached = true;
            arguments.callee.domEraserToggle = sbCommonUtils.getPref("key.domEraser.quit2", "");
            arguments.callee.htmlEditorToggle = sbCommonUtils.getPref("key.htmlEditor.quit", "");
        }
        let shortcut = sbShortcut.fromEvent(aEvent);
        // F9
        if (arguments.callee.domEraserToggle && shortcut.toString() == arguments.callee.domEraserToggle) {
            sbDOMEraser.init(1);
            aEvent.preventDefault();
            try {
                // event.stopImmediatePropagation is supported since Firefox 10
                aEvent.stopImmediatePropagation();
            } catch (ex) {
                aEvent.stopPropagation();
            }
            return;
        }
        // F10
        if (arguments.callee.htmlEditorToggle && shortcut.toString() == arguments.callee.htmlEditorToggle) {
            sbHtmlEditor.init(null, 1);
            aEvent.preventDefault();
            try {
                // event.stopImmediatePropagation is supported since Firefox 10
                aEvent.stopImmediatePropagation();
            } catch (ex) {
                aEvent.stopPropagation();
            }
            return;
        }
        // 1-8 or Alt + 1-8
        if (/^(?:Alt\+)?([1-8])$/.test(shortcut.toString())) {
            let idx = parseInt(RegExp.$1, 10);
            sbPageEditor.highlight(idx);
            return;
        }
    },

    handleUnloadEvent: function(aEvent) {
        if (sbPageEditor.checkModify()) {
            // The message only work for Firefox 3.*
            // Else it only fires a default prompt to confirm whether to exit
            aEvent.returnValue = sbCommonUtils.lang("EDIT_SAVE_CHANGES");
        }
    },

    toggleComment: function() {
        this.multiline = !this.multiline;
        let val = this.COMMENT.value;
        this.COMMENT.setAttribute("multiline", this.multiline);
        this.COMMENT.setAttribute("style", this.multiline ? "height:100px;" : "padding:2px;");
        if ( this.multiline ) {
            document.getElementById("ScrapBookToggleComment").setAttribute("tooltiptext", sbCommonUtils.lang("MIN_COMMENT"));
            document.getElementById("ScrapBookToolbox").appendChild(this.COMMENT);
            val = val.replace(/\t/g, "\n");
        } else {
            document.getElementById("ScrapBookToggleComment").setAttribute("tooltiptext", sbCommonUtils.lang("MAX_COMMENT"));
            this.TOOLBAR.insertBefore(this.COMMENT, document.getElementById("ScrapBookHighlighterPreview"));
            val = val.replace(/\n/g, "\t");
        }
        document.getElementById("ScrapBookEditSpacer").setAttribute("flex", this.multiline ? 1 : 0);
        this.COMMENT.value = val;
        this.COMMENT.focus();
    },

    onInputComment: function(aValue) {
        sbCommonUtils.documentData(window.content.document, "comment", aValue);
        sbCommonUtils.documentData(window.content.document, "propertyChanged", true);
    },

    getSelection: function(aWindow) {
        let sel = aWindow.getSelection();
        return !sel.isCollapsed ? sel : false;
    },

    getSelectionHTML: function(aSelection) {
        let range = aSelection.getRangeAt(0);
        let content = range.cloneContents();
        let elem = aSelection.anchorNode.ownerDocument.createElement("div");
        elem.appendChild(content);
        return elem.innerHTML;
    },

    cutter: function() {
        let win = sbCommonUtils.getFocusedWindow();
        let sel = this.getSelection(win);
        if ( !sel ) return;
        this.allowUndo(win.document);
        sel.deleteFromDocument();
    },

    highlight: function(idx) {
        // update the dropdown list
        if ( !idx ) idx = document.getElementById("ScrapBookHighlighter").getAttribute("color") || 8;
        document.getElementById("ScrapBookHighlighter").setAttribute("color", idx);
        let style = sbCommonUtils.getPref("highlighter.style." + idx, sbHighlighter.PRESET_STYLES[idx]);
        sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighterPreview"), style);
        // check and get selection
        let win = sbCommonUtils.getFocusedWindow();
        let sel = this.getSelection(win);
        if ( !sel ) return;
        // apply
        this.allowUndo(win.document);
        let attr = {
            "data-sb-id": (new Date()).valueOf(),
            "data-sb-obj": "linemarker",
            "class": "linemarker-marked-line", // for downward compatibility with ScrapBook / ScrapBook Plus
            "style": style,
        };
        sbHighlighter.set(win, sel, "span", attr);
    },

    removeSbObjectsSelected: function() {
        let win = sbCommonUtils.getFocusedWindow();
        let sel = this.getSelection(win);
        if ( !sel ) return;
        this.allowUndo(win.document);
        let selRange = sel.getRangeAt(0);
        let node = selRange.startContainer;
        if ( node.nodeName == "#text" ) node = node.parentNode;
        let nodeRange = win.document.createRange();
        let nodeToDel = [];
        traceTree: while ( true ) {
            nodeRange.selectNode(node);
            if ( nodeRange.compareBoundaryPoints(Range.START_TO_END, selRange) > -1 ) {
                if ( nodeRange.compareBoundaryPoints(Range.END_TO_START, selRange) > 0 ) {
                    break;
                } else if ( node.nodeType === 1 ) {
                    nodeToDel.push(node);
                }
            }
            if ( node.hasChildNodes() ) {
                node = node.firstChild;
            } else {
                while ( !node.nextSibling ) { node = node.parentNode; if ( !node ) break traceTree; }
                node = node.nextSibling;
            }
        }
        for ( let i = 0, len = nodeToDel.length; i < len; ++i ) this.removeSbObj(nodeToDel[i]);
    },

    removeSbObjects: function() {
        let nodeToDel = [];
        sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
            let doc = win.document;
            this.allowUndo(doc);
            let elems = doc.getElementsByTagName("*");
            for ( let i = 0; i < elems.length; i++ ) nodeToDel.push(elems[i]);
        }, this);
        for ( let i = 0, len = nodeToDel.length; i < len; ++i ) this.removeSbObj(nodeToDel[i]);
    },

    removeElementsByTagName: function(aTagName) {
        sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
            let doc = win.document;
            this.allowUndo(doc);
            let elems = doc.getElementsByTagName(aTagName), toRemove = [];
            for ( let i = 0; i < elems.length; i++ ) {
                toRemove.push(elems[i]);
            }
            toRemove.forEach(function(elem){
                elem.parentNode.removeChild(elem);
            }, this);
        }, this);
    },

    removeSbObj: function(aNode) {
        try {
            // not in the DOM tree, skip
            if (!aNode.parentNode) return -1;
        } catch(ex) {
            // not an element or a dead object, skip
            return -1;
        }
        let type = sbCommonUtils.getSbObjectRemoveType(aNode);
        switch (type) {
            case 1:
                let els = sbCommonUtils.getSbObjectsById(aNode);
                for (var i=0, len=els.length; i<len; ++i) {
                    els[i].parentNode.removeChild(els[i]);
                }
                break;
            case 2:
                let els = sbCommonUtils.getSbObjectsById(aNode);
                for (var i=0, len=els.length; i<len; ++i) {
                    this.unwrapNode(els[i]);
                }
                break;
        }
        return type;
    },

    unwrapNode: function(aNode) {
        let childs = aNode.childNodes;
        let parent = aNode.parentNode;
        while ( childs.length ) parent.insertBefore(childs[0], aNode);
        parent.removeChild(aNode);
        parent.normalize();
    },

    selection2Title: function(aElement) {
        let win = sbCommonUtils.getFocusedWindow();
        let sel = this.getSelection(win);
        if ( !sel ) return;
        aElement.value = sbCommonUtils.crop(sel.toString().replace(/[\r\n\t\s]+/g, " "), 150, 180);
        sel.removeAllRanges();
        sbCommonUtils.documentData(window.content.document, "propertyChanged", true);
    },

    restore: function() {
        window.sbBrowserOverlay.lastLocation = "";
        // this will then fire the beforeunload event and enter the event handler
        window.content.location.reload();
    },

    exit: function() {
        if ( sbDOMEraser.enabled ) sbDOMEraser.init(0);
        this.showHide(false);
        this.uninit();
    },

    allowUndo: function(aDoc) {
        aDoc = aDoc || sbCommonUtils.getFocusedWindow().document;
        let histories = sbCommonUtils.documentData(aDoc, "histories");
        if (!histories) sbCommonUtils.documentData(aDoc, "histories", histories = []);
        if (aDoc.body) {
            histories.push(aDoc.body.cloneNode(true));
            sbCommonUtils.documentData(aDoc, "changed", true);
        }
    },

    undo: function(aDoc) {
        aDoc = aDoc || sbCommonUtils.getFocusedWindow().document;
        let histories = sbCommonUtils.documentData(aDoc, "histories");
        if (!histories) sbCommonUtils.documentData(aDoc, "histories", histories = []);
        while ( histories.length ) {
            let prevBody = histories.pop();
            if (!sbCommonUtils.isDeadObject(prevBody)) {
                sbCommonUtils.documentData(aDoc, "changed", true);
                aDoc.body.parentNode.replaceChild(prevBody, aDoc.body);
                return true;
            }
        }
        sbCommonUtils.alert( sbCommonUtils.lang("EDIT_UNDO_LAST") );
        return false;
    },

    checkModify: function() {
        if ( sbCommonUtils.documentData(window.content.document, "propertyChanged") ) this.saveResource();
        let changed = false;
        sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
            if (sbCommonUtils.documentData(win.document, "changed")) changed = true;
        }, this);
        return changed;
    },

    saveOrCapture: function(aBypassDialog) {
        if ( sbBrowserOverlay.getID() ) {
            this.saveResource();
            this.savePage();
        } else {
            sbDOMEraser.init(0);
            sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
                this.documentBeforeSave(win.document);
            }, this);
            let ret = sbBrowserOverlay.execCapture(0, null, !aBypassDialog, "urn:scrapbook:root");
            if ( ret ) {
                this.exit();
                return;
            }
            sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
                this.documentAfterSave(win.document);
            }, this);
        }
    },

    savePage: function() {
        // if for some reason the item no longer exists, abort
        if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.disable(true); return; }
        // acquires the id from current uri and check again for safe
        let curURL = window.content.location.href;
        if (sbBrowserOverlay.getID(curURL) != this.item.id) {
            sbCommonUtils.alert(sbCommonUtils.lang("ERR_FAIL_SAVE_FILE", curURL));
            return;
        }
        // Do not allow locked items be saved
        // use the newest value from datesource since the user could change it after loading this page
        if (sbDataSource.getProperty(sbBrowserOverlay.resource, "lock") == "true") {
            sbCommonUtils.alert(sbCommonUtils.lang("MSG_CANT_SAVE_LOCKED"));
            return;
        }
        // check pass, exec the saving
        this.disable(true, true);
        sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
            let doc = win.document;
            if ( ["text/html", "application/xhtml+xml"].indexOf(doc.contentType) < 0 ) {
                sbCommonUtils.alert(sbCommonUtils.lang("MSG_CANT_MODIFY", doc.contentType));
                return;
            }
            let charset = doc.characterSet;
            if (charset != "UTF-8") {
                sbCommonUtils.alert(sbCommonUtils.lang("MSG_NOT_UTF8", doc.location.href));
            }
            this.documentBeforeSave(doc);
            let rootNode = doc.getElementsByTagName("html")[0];
            let src = sbCommonUtils.doctypeToString(doc.doctype) + sbCommonUtils.surroundByTags(rootNode, rootNode.innerHTML);
            let file = sbCommonUtils.convertURLToFile(doc.location.href);
            sbCommonUtils.writeFile(file, src, charset);
            this.documentAfterSave(doc);
            sbCommonUtils.documentData(doc, "changed", false);
        }, this);
        window.setTimeout(function() { window.content.stop(); sbPageEditor.disable(false, true); }, 500);
    },

    saveResource: function() {
        if ( !this.item ) return;
        if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.disable(true); return; }
        let newTitle = document.getElementById("ScrapBookEditTitle").value;
        let newComment = sbCommonUtils.escapeComment(this.COMMENT.value);
        let newModify = sbCommonUtils.getTimeStamp();
        sbDataSource.setProperty(sbBrowserOverlay.resource, "title",   newTitle);
        sbDataSource.setProperty(sbBrowserOverlay.resource, "comment", newComment);
        sbDataSource.setProperty(sbBrowserOverlay.resource, "modify", newModify);
        this.item.title = newTitle;
        this.item.comment = newComment;
        this.item.modify = newModify;
        sbCommonUtils.writeIndexDat(this.item);
        sbCommonUtils.documentData(window.content.document, "comment", null);
        sbCommonUtils.documentData(window.content.document, "propertyChanged", false);
    },

    // Currently we have 3 functions dealing with the toolbar state
    //   1. disable
    //   2. DOMEraser
    //   3. HTMLEditor
    // To prevent conflict:
    //   - we should turn off DOMEraser before disable or it's effect will persist
    //   - we should turn off HTMLEditor before disable if it's permanent
    //     HTMLEditor keeps enabled in a temp disable. However the undo history will be broken if
    //     disabled and enabled; let it go since temp disable is merely a UI matter currently.
    //   - we should refresh HTMLEditor after since it may be on and should not get all disabled
    disable: function(isDisable, isTemp) {
        this.enabled = !isDisable;
        sbDOMEraser.init(0);
        if (isDisable && !isTemp) sbHtmlEditor.init(null, 0);
        let elems = this.TOOLBAR.childNodes;
        for ( let i = 0; i < elems.length; i++ ) elems[i].disabled = isDisable;
        if (!isDisable) sbHtmlEditor.init(null, 2);
    },

    toggle: function() {
        let id = sbBrowserOverlay.getID();
        if ( !id ) return;
        this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
        sbBrowserOverlay.editMode = this.TOOLBAR.hidden;
        this.TOOLBAR.hidden ? this.init(id) : this.exit();
    },

    showHide: function(willShow) {
        this.COMMENT.hidden = !willShow;
        this.TOOLBAR.hidden = !willShow;
        willShow ? this.TOOLBAR.setAttribute("moz-collapsed", "false") : this.TOOLBAR.removeAttribute("moz-collapsed");
        sbInfoViewer.optimize();
    },


    applyStyle: function(aWindow, aID, aString) {
        if ( aWindow.document.getElementById(aID) ) {
            return;
        }
        let newNode = aWindow.document.createElement("style");
        newNode.setAttribute("data-sb-obj", "stylesheet-temp");
        newNode.setAttribute("media", "screen");
        newNode.setAttribute("type", "text/css");
        newNode.setAttribute("id", aID);
        newNode.appendChild(aWindow.document.createTextNode(aString));
        let headNode = aWindow.document.getElementsByTagName("head")[0];
        if ( headNode ) headNode.appendChild(newNode);
    },

    removeStyle: function(aWindow, aID) {
        try { sbCommonUtils.removeNode(aWindow.document.getElementById(aID)); } catch(ex) {}
    },

    documentBeforeEdit: function(aDoc) {
        if (this.item && this.item.type != "notex") {
            let indicate = document.getElementById("ScrapBookStatusPopupD");
            indicate = indicate ? indicate.getAttribute("checked") : false;
            if (indicate) sbInfoViewer.toggleIndicator(true);
        }
    },

    documentBeforeSave: function(aDoc) {
        // save all freenotes
        let nodes = aDoc.getElementsByTagName("div");
        for ( let i = nodes.length - 1; i >= 0 ; i-- ) {
            let node = nodes[i];
            if ( sbCommonUtils.getSbObjectType(node) == "freenote" && node.getAttribute("data-sb-active")) {
                sbAnnotationService.saveFreenote(node);
            }
        }
        // remove temp styles
        let nodes = aDoc.getElementsByTagName("style");
        for ( let i = nodes.length - 1; i >= 0 ; i-- ) {
            let node = nodes[i];
            if ( sbCommonUtils.getSbObjectType(node) == "stylesheet-temp") {
                sbCommonUtils.removeNode(node);
            }
        }
        // record the status of todo form elements
        let nodes = aDoc.getElementsByTagName("input");
        for ( let i = nodes.length - 1; i >= 0 ; i-- ) {
            let node = nodes[i];
            if ( sbCommonUtils.getSbObjectType(node) == "todo") {
                switch (node.type.toLowerCase()) {
                    case "checkbox":
                    case "radio":
                        if (node.checked) {
                            node.setAttribute("checked", "checked");
                        } else {
                            node.removeAttribute("checked");
                        }
                        break;
                    case "text":
                        node.setAttribute("value", node.value);
                        break;
                }
            }
        }
        let nodes = aDoc.getElementsByTagName("textarea");
        for ( let i = nodes.length - 1; i >= 0 ; i-- ) {
            let node = nodes[i];
            if ( sbCommonUtils.getSbObjectType(node) == "todo") {
                node.textContent = node.value;
            }
        }
        // flush title for the main page if it's notex
        if (this.item && this.item.type == "notex") {
            let title = this.isMainPage ? this.item.title : gBrowser.selectedTab.label;
            let titleNodes = [];
            let titleSrcNodes = [];
            let nodes = aDoc.getElementsByTagName("*");
            for ( let i = 0; i < nodes.length; i++ ) {
                let node = nodes[i];
                switch (sbCommonUtils.getSbObjectType(node)) {
                    case "title": titleNodes.push(node); break;
                    case "title-src": titleSrcNodes.push(node); break;
                }
            }
            if (titleSrcNodes.length) {
                titleSrcNodes.forEach(function(node){
                    let text = node.textContent;
                    if (text) title = text;
                });
            }
            titleNodes.forEach(function(node){
                if (node.textContent != title) node.textContent = title;
            });
            titleSrcNodes.forEach(function(node){
                if (node.textContent != title) node.textContent = title;
            });
            if (this.isMainPage && title != this.item.title) {
                sbDataSource.setProperty(sbBrowserOverlay.resource, "title", title);
                this.item.title = title;
            }
        }
    },

    documentAfterSave: function(aDoc) {
        this.documentBeforeEdit(aDoc);
    },
};



let sbHtmlEditor = {

    get strftime() {
        let { strftime } = Components.utils.import("resource://scrapbook-modules/lib/strftime.jsm", {});
        delete this.strftime;
        return this.strftime = strftime;
    },

    enabled: false,
    _shortcutMap: {},

    _firstInit: function() {
        if (arguments.callee.done) return;
        arguments.callee.done = true;

        let that = this;

        // init shortkey table
        [
            "quit",
            "save",
            "removeFormat",
            "unlink",
            "insertSource",
            "bold",
            "italic",
            "underline",
            "strikeThrough",
            "setColor",
            "increaseFontSize",
            "decreaseFontSize",
            "superscript",
            "subscript",
            "formatblock_p",
            "formatblock_h1",
            "formatblock_h2",
            "formatblock_h3",
            "formatblock_h4",
            "formatblock_h5",
            "formatblock_h6",
            "formatblock_div",
            "formatblock_pre",
            "insertUnorderedList",
            "insertOrderedList",
            "outdent",
            "indent",
            "justifyLeft",
            "justifyRight",
            "justifyCenter",
            "justifyFull",
            "attachLink",
            "attachFile",
            "backupFile",
            "horizontalLine",
            "insertDate",
            "insertTodoBox",
            "insertTodoBoxDone",
            "wrapHTML1",
            "wrapHTML2",
            "wrapHTML3",
            "wrapHTML4",
            "wrapHTML5",
            "wrapHTML6",
            "wrapHTML7",
            "wrapHTML8",
            "wrapHTML9",
            "wrapHTML0",
        ].forEach(function(cmd){
            let key = sbCommonUtils.getPref("key.htmlEditor." + cmd, "");
            if (key) {
                that._shortcutMap[key] = cmd;
            }
        });

        // update hotkey text
        Array.prototype.forEach.call(document.getElementById("ScrapBookContextMenu10").getElementsByTagName("menuitem"), function(elem){
            for (var i in that._shortcutMap) {
                if (elem.value == that._shortcutMap[i]) {
                    let shortcut = sbShortcut.fromString(i);
                    elem.setAttribute("acceltext", shortcut.getUIString());
                    return;
                }
            }
        });
    },

    currentDocument: function(aMainDoc) {
        if (!aMainDoc) aMainDoc = window.content.document;
        return sbCommonUtils.documentData(aMainDoc, "sbHtmlEditor.document");
    },

    // aStateFlag
    //   0: disable (for all window documents)
    //   1: enable  (for a specific window document)
    //   2: refresh (updates toolbar)
    init: function(aDoc, aStateFlag) {
        this._firstInit();
        aDoc = aDoc || sbCommonUtils.getFocusedWindow().document;
        let wasEnabled = sbCommonUtils.documentData(window.content.document, "sbHtmlEditor.enabled") || false;
        if ( aStateFlag === undefined ) aStateFlag = wasEnabled ? 0 : 1;
        let toEnable = this.enabled = (aStateFlag === 2) ? wasEnabled : (aStateFlag == 1);
        document.getElementById("ScrapBookEditHTML").checked = toEnable;
        document.getElementById("ScrapBookHighlighter").disabled = toEnable;
        document.getElementById("ScrapBookEditAnnotation").disabled = toEnable;
        document.getElementById("ScrapBookEditCutter").disabled = toEnable;
        document.getElementById("ScrapBookEditEraser").disabled = toEnable;
        document.getElementById("ScrapBookEditUndo").disabled = toEnable;
        if ( aStateFlag == 1 ) {
            sbCommonUtils.documentData(window.content.document, "sbHtmlEditor.enabled", true);
            sbCommonUtils.documentData(window.content.document, "sbHtmlEditor.document", aDoc);
            if (sbPageEditor.enabled && sbPageEditor.item && sbPageEditor.item.type == "notex") {
                sbCommonUtils.setPref("edit.autoEditNoteX.active", true);
            }
            sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
                if ( win.document.designMode != "off" && win.document != aDoc ) {
                    win.document.designMode = "off";
                }
                this.initEvent(win, 1);
            }, this);
            if ( aDoc.designMode != "on" ) {
                let sel = aDoc.defaultView.getSelection();
                // backup original selection ranges
                let ranges = [];
                for (var i=0, len=sel.rangeCount; i<len; i++) {
                    ranges.push(sel.getRangeAt(i))
                }
                // backup and switch design mode on (will clear select)
                sbPageEditor.allowUndo(aDoc);
                // we sometimes get an error doing this but the designMode is still turned on
                // catch the error to prevent subsequent script skipping
                try {
                    aDoc.designMode = "on";
                } catch (ex) {}    
                // restore the selection
                let sel = aDoc.defaultView.getSelection();
                sel.removeAllRanges();
                for (var i=0, len=ranges.length; i<len; i++) {
                    sel.addRange(ranges[i]);
                }
            }
        } else if ( aStateFlag == 0 ) {
            sbCommonUtils.documentData(window.content.document, "sbHtmlEditor.enabled", false);
            sbCommonUtils.documentData(window.content.document, "sbHtmlEditor.document", null);
            if (wasEnabled) {
                if (sbPageEditor.enabled && sbPageEditor.item && sbPageEditor.item.type == "notex") {
                    sbCommonUtils.setPref("edit.autoEditNoteX.active", false);
                }
                sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
                    if ( win.document.designMode != "off" ) {
                        win.document.designMode = "off";
                    }
                    this.initEvent(win, 0);
                }, this);
            }
        }
    },

    initEvent: function(aWindow, aStateFlag) {
        aWindow.document.removeEventListener("keydown", this.handleKeyEvent, true);
        aWindow.document.removeEventListener("input", this.handleInputEvent, true);
        if (aStateFlag == 1) {
            aWindow.document.addEventListener("keydown", this.handleKeyEvent, true);
            aWindow.document.addEventListener("input", this.handleInputEvent, true);
        }
    },

    handleInputEvent: function(aEvent) {
        let doc = aEvent.originalTarget.ownerDocument;
        sbCommonUtils.documentData(doc, "changed", true);
    },

    handleKeyEvent: function(aEvent) {
        // set variables and check whether it's a defined hotkey combination
        let shortcut = sbShortcut.fromEvent(aEvent);
        let key = shortcut.toString();
        let callback_name = sbHtmlEditor._shortcutMap[key];
        if (!callback_name) return;

        // now we are sure we have the hotkey
        let callback = sbHtmlEditor["cmd_" + callback_name];
        aEvent.preventDefault();
        try {
            // event.stopImmediatePropagation is supported since Firefox 10
            aEvent.stopImmediatePropagation();
        } catch (ex) {
            aEvent.stopPropagation();
        }

        // check the document is editable and set
        let doc = sbHtmlEditor.currentDocument();
        if (!doc.body || doc.designMode != "on") return;

        // The original key effect could not be blocked completely
        // if the command has a prompt or modal window that blocks.
        // Therefore we call the callback command using an async workaround.
        setTimeout(function(){
            callback.call(sbHtmlEditor, doc);
        }, 0);
    },

    handlePopupCommand: function(aCallback) {
        let callback = sbHtmlEditor["cmd_" + aCallback];

        // check the document is editable and set
        let doc = sbHtmlEditor.currentDocument();
        if (!doc.body || doc.designMode != "on") return;

        callback.call(sbHtmlEditor, doc);
    },
    
    updatePopup: function() {
        document.getElementById("ScrapBookEditHTML_insertDate").tooltipText = sbCommonUtils.getPref("edit.insertDateFormat", "") || "%Y-%m-%d %H:%M:%S";
        document.getElementById("ScrapBookEditHTML_wrapHTML1").tooltipText = sbCommonUtils.getPref("edit.wrapperFormat.1", "") || "<code>{THIS}</code>";
        document.getElementById("ScrapBookEditHTML_wrapHTML2").tooltipText = sbCommonUtils.getPref("edit.wrapperFormat.2", "") || "<code>{THIS}</code>";
        document.getElementById("ScrapBookEditHTML_wrapHTML3").tooltipText = sbCommonUtils.getPref("edit.wrapperFormat.3", "") || "<code>{THIS}</code>";
        document.getElementById("ScrapBookEditHTML_wrapHTML4").tooltipText = sbCommonUtils.getPref("edit.wrapperFormat.4", "") || "<code>{THIS}</code>";
        document.getElementById("ScrapBookEditHTML_wrapHTML5").tooltipText = sbCommonUtils.getPref("edit.wrapperFormat.5", "") || "<code>{THIS}</code>";
        document.getElementById("ScrapBookEditHTML_wrapHTML6").tooltipText = sbCommonUtils.getPref("edit.wrapperFormat.6", "") || "<code>{THIS}</code>";
        document.getElementById("ScrapBookEditHTML_wrapHTML7").tooltipText = sbCommonUtils.getPref("edit.wrapperFormat.7", "") || "<code>{THIS}</code>";
        document.getElementById("ScrapBookEditHTML_wrapHTML8").tooltipText = sbCommonUtils.getPref("edit.wrapperFormat.8", "") || "<code>{THIS}</code>";
        document.getElementById("ScrapBookEditHTML_wrapHTML9").tooltipText = sbCommonUtils.getPref("edit.wrapperFormat.9", "") || "<code>{THIS}</code>";
        document.getElementById("ScrapBookEditHTML_wrapHTML0").tooltipText = sbCommonUtils.getPref("edit.wrapperFormat.0", "") || "<code>{THIS}</code>";
    },

    cmd_quit: function (aDoc) {
        sbHtmlEditor.init(null, 0);
    },

    cmd_save: function (aDoc) {
        sbPageEditor.saveOrCapture();
    },

    cmd_removeFormat: function (aDoc) {
        aDoc.execCommand("removeFormat", false, null);
    },

    cmd_bold: function (aDoc) {
        aDoc.execCommand("bold", false, null);
    },

    cmd_italic: function (aDoc) {
        aDoc.execCommand("italic", false, null);
    },

    cmd_underline: function (aDoc) {
        aDoc.execCommand("underline", false, null);
    },

    cmd_strikeThrough: function (aDoc) {
        aDoc.execCommand("strikeThrough", false, null);
    },

    cmd_setColor: function (aDoc) {
        let data = {};
        // prompt the dialog for user input
        let accepted = window.top.openDialog("chrome://scrapbook/content/editor_color.xul", "ScrapBook:PickColor", "chrome,modal,centerscreen", data);
        if (data.result != 1) return;
        aDoc.execCommand("styleWithCSS", false, true);
        if (data.textColor) {
            aDoc.execCommand("foreColor", false, data.textColor);
        }
        if (data.bgColor) {
            aDoc.execCommand("hiliteColor", false, data.bgColor);
        }
        aDoc.execCommand("styleWithCSS", false, false);
    },

    cmd_increaseFontSize: function (aDoc) {
        aDoc.execCommand("increaseFontSize", false, null);
    },

    cmd_decreaseFontSize: function (aDoc) {
        aDoc.execCommand("decreaseFontSize", false, null);
    },

    cmd_superscript: function (aDoc) {
        aDoc.execCommand("superscript", false, null);
    },

    cmd_subscript: function (aDoc) {
        aDoc.execCommand("subscript", false, null);
    },

    cmd_formatblock_p: function (aDoc) {
        aDoc.execCommand("formatblock", false, "p");
    },

    cmd_formatblock_h1: function (aDoc) {
        aDoc.execCommand("formatblock", false, "h1");
    },

    cmd_formatblock_h2: function (aDoc) {
        aDoc.execCommand("formatblock", false, "h2");
    },

    cmd_formatblock_h3: function (aDoc) {
        aDoc.execCommand("formatblock", false, "h3");
    },

    cmd_formatblock_h4: function (aDoc) {
        aDoc.execCommand("formatblock", false, "h4");
    },

    cmd_formatblock_h5: function (aDoc) {
        aDoc.execCommand("formatblock", false, "h5");
    },

    cmd_formatblock_h6: function (aDoc) {
        aDoc.execCommand("formatblock", false, "h6");
    },

    cmd_formatblock_div: function (aDoc) {
        aDoc.execCommand("formatblock", false, "div");
    },

    cmd_formatblock_pre: function (aDoc) {
        aDoc.execCommand("formatblock", false, "pre");
    },

    cmd_insertUnorderedList: function (aDoc) {
        aDoc.execCommand("insertUnorderedList", false, null);
    },

    cmd_insertOrderedList: function (aDoc) {
        aDoc.execCommand("insertOrderedList", false, null);
    },

    cmd_outdent: function (aDoc) {
        aDoc.execCommand("outdent", false, null);
    },

    cmd_indent: function (aDoc) {
        aDoc.execCommand("indent", false, null);
    },

    cmd_justifyLeft: function (aDoc) {
        aDoc.execCommand("justifyLeft", false, null);
    },

    cmd_justifyRight: function (aDoc) {
        aDoc.execCommand("justifyRight", false, null);
    },

    cmd_justifyCenter: function (aDoc) {
        aDoc.execCommand("justifyCenter", false, null);
    },

    cmd_justifyFull: function (aDoc) {
        aDoc.execCommand("justifyFull", false, null);
    },

    cmd_unlink: function (aDoc) {
        aDoc.execCommand("unlink", false, null);
    },

    cmd_attachLink: function (aDoc) {
        let sel = aDoc.defaultView.getSelection();
        // fill the selection it looks like an URL
        // use a very wide standard, which allows as many cases as may be used
        let selText = sel.toString();
        if (selText && selText.match(/^(\w+:[^\t\n\r\v\f]*)/i)) {
            let url = RegExp.$1;
        }
        // retrieve selected id from sidebar
        // -- if the sidebar is closed, we may get an error
        try {
            let sidebarId = sbCommonUtils.getSidebarId("sidebar");
            let res = document.getElementById(sidebarId).contentWindow.sbTreeHandler.getSelection(true, 2);
        } catch(ex) {}
        // -- check the selected resource
        if (res && res.length) {
            res = res[0];
            let type = sbDataSource.getProperty(res, "type");
            if ( ["folder", "separator"].indexOf(type) === -1 ) {
                let id = sbDataSource.getProperty(res, "id");
            }
        }
        // prompt the dialog for user input
        let data = {
            id: id,
            url: url,
            item: sbPageEditor.item,
        };
        let accepted = window.top.openDialog("chrome://scrapbook/content/editor_link.xul", "ScrapBook:AttachLink", "chrome,modal,centerscreen,resizable", data);
        if (data.result != 1) return;
        if (data.url_use) {  // insert link?
            // attach the link
            if (data.format) {
                let html = sbCommonUtils.stringTemplate(data.format, /{([\w_]+)}/g, {
                    URL: sbCommonUtils.escapeHTML(data.url, false, true),
                    TITLE: "",
                    THIS: sel.isCollapsed ? sbCommonUtils.escapeHTMLWithSpace(data.url, false, true) : sbPageEditor.getSelectionHTML(sel),
                });
                aDoc.execCommand("insertHTML", false, html);
            }
        } else if (data.id_use) {  // insert inner link?
            // we can construct inner link only for those with valid id
            if (!sbPageEditor.item) return;
            let id = data.id;
            // check the specified id
            let res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
            if ( sbDataSource.exists(res) ) {
                let type = sbDataSource.getProperty(res, "type");
                if ( ["folder", "separator"].indexOf(type) !== -1 ) {
                    res = null;
                }
            } else res = null;
            // if it's invalid, alert and quit
            if (!res) {
                sbCommonUtils.PROMPT.alert(window, sbCommonUtils.lang("EDIT_ATTACH_INNERLINK_TITLE"), sbCommonUtils.lang("EDIT_ATTACH_INNERLINK_INVALID", id));
                return;
            }
            // attach the link
            if (data.format) {
                let html = sbCommonUtils.stringTemplate(data.format, /{([\w_]+)}/g, {
                    URL: (type == "bookmark") ? sbCommonUtils.escapeHTML(sbDataSource.getProperty(res, "source"), false, true) : sbCommonUtils.escapeHTML(makeRelativeLink(aDoc.location.href, sbPageEditor.item.id, id), false, true),
                    TITLE: sbCommonUtils.escapeHTML(sbDataSource.getProperty(res, "title"), false, true),
                    THIS: sel.isCollapsed ? sbCommonUtils.escapeHTMLWithSpace(sbDataSource.getProperty(res, "title"), false, true) : sbPageEditor.getSelectionHTML(sel),
                });
                aDoc.execCommand("insertHTML", false, html);
            }
        }
        
        function makeRelativeLink(aBaseURL, aBaseId, aTargetId) {
            let result = "";
            let contDir = sbCommonUtils.getContentDir(aBaseId);
            let checkFile = sbCommonUtils.convertURLToFile(aBaseURL);
            while (!checkFile.equals(contDir)){
                result += "../";
                checkFile = checkFile.parent;
            }
            return result = result + aTargetId + "/index.html";
        }
    },

    cmd_attachFile: function (aDoc) {
        // we can upload file only for those with valid id
        if (!sbPageEditor.item) return;
        // check if the current page is local and get its path
        let htmlFile = sbCommonUtils.convertURLToFile(aDoc.location.href);
        if (!htmlFile) return;
        // init
        let sel = aDoc.defaultView.getSelection();
        let selText = sel.toString();
        if (selText && selText.match(/^([^\t\n\r\v\f]*)/i)) {
            let url = RegExp.$1;
        }
        // prompt the dialog for user input
        let data = { url: url, filename: htmlFile.leafName };
        let accepted = window.top.openDialog("chrome://scrapbook/content/editor_file.xul", "ScrapBook:AttachFile", "chrome,modal,centerscreen,resizable", data);
        if (data.result != 1) return;
        if (data.file_use) {  // insert file ?
            let filename = data.file.leafName;
            let filename2 = sbCommonUtils.validateFileName(filename);
            try {
                // copy the selected file
                let destFile = htmlFile.parent.clone();
                destFile.append(filename2);
                if ( destFile.exists() && destFile.isFile() ) {
                    if ( !sbCommonUtils.PROMPT.confirm(window, sbCommonUtils.lang("EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("EDIT_ATTACH_FILE_OVERWRITE", filename2)) ) return;
                    destFile.remove(false);
                }
                data.file.copyTo(destFile.parent, filename2);
            } catch(ex) {
                sbCommonUtils.PROMPT.alert(window, sbCommonUtils.lang("EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("EDIT_ATTACH_FILE_INVALID", filename2));
                return;
            }
            // insert to the document
            if (data.format) {
                let html = sbCommonUtils.stringTemplate(data.format, /{([\w_]+)}/g, {
                    FILE: sbCommonUtils.escapeHTML(filename, false, true),
                    FILE_E: sbCommonUtils.escapeHTML(sbCommonUtils.escapeFileName(filename2), false, true),
                    THIS: sel.isCollapsed ? sbCommonUtils.escapeHTMLWithSpace(filename, false, true) : sbPageEditor.getSelectionHTML(sel),
                });
                aDoc.execCommand("insertHTML", false, html);
            }
        } else if (data.html_use) {  // insert html ?
            let title = data.html;
            let filename = title + ".html";
            let filename2 = sbCommonUtils.validateFileName(filename);
            try {
                if (filename2 == "index.html") throw "";  // do not allow to overwrite index page
                let destFile = htmlFile.parent.clone();
                destFile.append(filename2);
                if ( destFile.exists() && destFile.isFile() ) {
                    if ( !sbCommonUtils.PROMPT.confirm(window, sbCommonUtils.lang("EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("EDIT_ATTACH_FILE_OVERWRITE", filename2)) ) return;
                }
                // check the template file, create one if not exist
                let template = sbCommonUtils.getScrapBookDir().clone();
                template.append("notex_template.html");
                if ( !template.exists() ) sbCommonUtils.saveTemplateFile("chrome://scrapbook/skin/notex_template.html", template);
                // create content
                let content = sbCommonUtils.readFile(template, "UTF-8");
                content = sbCommonUtils.stringTemplate(content, /<%([\w_]+)%>/g, {
                    NOTE_TITLE: title,
                    SCRAPBOOK_DIR: (function(aFile){
                        let result = "", checkFile = aFile.parent;
                        let sbDir = sbCommonUtils.getScrapBookDir();
                        while (!checkFile.equals(sbDir)){
                            result += "../";
                            checkFile = checkFile.parent;
                        }
                        // remove trailing "/"
                        return result.substring(0, result.length -1);
                    })(destFile),
                    DATA_DIR: (function(aFile, aID){
                        let result = "", checkFile = aFile.parent;
                        let dataDir = sbCommonUtils.getContentDir(aID);
                        while (!checkFile.equals(dataDir)){
                            result += "../";
                            checkFile = checkFile.parent;
                        }
                        // remove trailing "/", or return "." if empty
                        if (result) {
                            return result.substring(0, result.length -1);
                        } else {
                            return ".";
                        }
                    })(destFile, sbPageEditor.item.id),
                });
                sbCommonUtils.writeFile(destFile, content, "UTF-8", true);
            } catch(ex) {
                sbCommonUtils.PROMPT.alert(window, sbCommonUtils.lang("EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("EDIT_ATTACH_FILE_INVALID", filename2));
                return;
            }
            // insert to the document
            if (data.insert && data.format) {
                let html = sbCommonUtils.stringTemplate(data.format, /{([\w_]+)}/g, {
                    FILE: sbCommonUtils.escapeHTML(filename, false, true),
                    FILE_E: sbCommonUtils.escapeHTML(sbCommonUtils.escapeFileName(filename2), false, true),
                    THIS: sel.isCollapsed ? sbCommonUtils.escapeHTMLWithSpace(filename, false, true) : sbPageEditor.getSelectionHTML(sel),
                });
                aDoc.execCommand("insertHTML", false, html);
            }
        }
    },

    cmd_backupFile: function (aDoc) {
        // we can save history only for those with valid id
        if (!sbPageEditor.item) return;
        // check if the current page is local and get its path
        let htmlFile = sbCommonUtils.convertURLToFile(aDoc.location.href);
        if (!htmlFile) return;
        // check if it's an HTML file
        if (sbCommonUtils.splitFileName(htmlFile.leafName)[1] != "html") return;
        // prompt the dialog for user input
        let data = {};
        let accepted = window.top.openDialog("chrome://scrapbook/content/editor_backup.xul", "ScrapBook:backupFile", "chrome,modal,centerscreen,resizable", data);
        if (data.result != 1) return;
        // insert hist html
        let title = data.hist_html;
        let filename = "." + sbCommonUtils.splitFileName(htmlFile.leafName)[0] + "." + sbCommonUtils.getTimeStamp() + (title ? " " + title : "") + ".html";
        let filename2 = sbCommonUtils.validateFileName(filename);
        try {
            let destFile = htmlFile.parent.clone();
            destFile.append(filename2);
            if ( destFile.exists() && destFile.isFile() ) {
                if ( !sbCommonUtils.PROMPT.confirm(window, sbCommonUtils.lang("EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("EDIT_ATTACH_FILE_OVERWRITE", filename2)) ) return;
                destFile.remove(false);
            }
            // copy the page
            htmlFile.copyTo(destFile.parent, filename2);
        } catch(ex) {
            sbCommonUtils.PROMPT.alert(window, sbCommonUtils.lang("EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("EDIT_ATTACH_FILE_INVALID", filename2));
            return;
        }
    },

    cmd_horizontalLine: function (aDoc) {
        let html = '<hr/>';
        aDoc.execCommand("insertHTML", false, html);
    },

    cmd_insertDate: function (aDoc) {
        let fmt = sbCommonUtils.getPref("edit.insertDateFormat", "") || "%Y-%m-%d %H:%M:%S";
        let time = "&lt;time&gt;";
        try { time = this.strftime(fmt); } catch (ex) {}
        aDoc.execCommand("insertHTML", false, time);
    },

    cmd_insertTodoBox: function (aDoc) {
        let html = '<input type="checkbox" data-sb-obj="todo" />';
        aDoc.execCommand("insertHTML", false, html);
    },

    cmd_insertTodoBoxDone: function (aDoc) {
        let html = '<input type="checkbox" data-sb-obj="todo" checked="checked" />';
        aDoc.execCommand("insertHTML", false, html);
    },

    cmd_wrapHTML1: function (aDoc) {
        this._wrapHTML(aDoc, 1);
    },

    cmd_wrapHTML2: function (aDoc) {
        this._wrapHTML(aDoc, 2);
    },

    cmd_wrapHTML3: function (aDoc) {
        this._wrapHTML(aDoc, 3);
    },

    cmd_wrapHTML4: function (aDoc) {
        this._wrapHTML(aDoc, 4);
    },

    cmd_wrapHTML5: function (aDoc) {
        this._wrapHTML(aDoc, 5);
    },

    cmd_wrapHTML6: function (aDoc) {
        this._wrapHTML(aDoc, 6);
    },

    cmd_wrapHTML7: function (aDoc) {
        this._wrapHTML(aDoc, 7);
    },

    cmd_wrapHTML8: function (aDoc) {
        this._wrapHTML(aDoc, 8);
    },

    cmd_wrapHTML9: function (aDoc) {
        this._wrapHTML(aDoc, 9);
    },

    cmd_wrapHTML0: function (aDoc) {
        this._wrapHTML(aDoc, 0);
    },

    _wrapHTML: function (aDoc, aIdx) {
        let sel = aDoc.defaultView.getSelection();
        let html = sel.isCollapsed ? "{THIS}" : sbPageEditor.getSelectionHTML(sel);
        let wrapper = sbCommonUtils.getPref("edit.wrapperFormat." + aIdx, "") || "<code>{THIS}</code>";
        html = wrapper.replace(/{THIS}/g, html);
        aDoc.execCommand("insertHTML", false, html);
    },
    
    cmd_insertSource: function (aDoc) {
        let sel = aDoc.defaultView.getSelection();
        let collapsed = sel.isCollapsed;
        let data = {
            preTag: "",
            preContext: "",
            value: "",
            postContext: "",
            postTag: ""
        };
        if (!collapsed) {
            // get selection area to edit
            let range = sel.getRangeAt(0);
            let ac = getReplaceableNode(range.commonAncestorContainer);
            let source = sbCommonUtils.getOuterHTML(ac);
            let source_inner = ac.innerHTML;
            let istart = source.lastIndexOf(source_inner);
            let start = getOffsetInSource(ac, range.startContainer, range.startOffset);
            let end = getOffsetInSource(ac, range.endContainer, range.endOffset);
            let iend = istart + source_inner.length;
            data.preTag = source.substring(0, istart);
            data.preContext = source.substring(istart, start);
            data.value = source.substring(start, end);
            data.postContext = source.substring(end, iend);
            data.postTag = source.substring(iend);
        }
        // prompt the dialog for user input
        window.top.openDialog("chrome://scrapbook/content/editor_source.xul", "ScrapBook:EditSource", "chrome,modal,centerscreen,resizable", data);
        // accepted, do the modify
        if (data.result) {
            if (!collapsed) {
                // reset selection to the common ancestor container of the first range
                let range = aDoc.createRange();
                if (ac.nodeName != "BODY") {
                    // replace outer tag
                    let html = data.preTag + data.preContext + data.value + data.postContext + data.postTag;
                    range.setStartBefore(ac);
                    range.setEndAfter(ac);
                } else {
                    // replace inner tag
                    let html = data.preContext + data.value + data.postContext;
                    range.selectNodeContents(ac);
                }
                sel.removeAllRanges();
                sel.addRange(range);
            } else {
                let html = data.value;
            }
            aDoc.execCommand("insertHTML", false, html);
        }

        function getReplaceableNode(aNode) {
            // replacing these nodes could get a bad and not-undoable result
            let forbiddenList = ["#text", "THEAD", "TBODY", "TFOOT", "TR"];
            while (forbiddenList.indexOf(aNode.nodeName) >= 0) {
                aNode = aNode.parentNode;
            }
            return aNode;
        }

        function getOffsetInSource(aNode, aDescNode, aDescOffset) {
            let pos = 0;
            switch (aDescNode.nodeName) {
                case "#text":
                    pos += textToHtmlOffset(aDescNode, aDescOffset);
                    break;
                case "#comment":
                    pos += ("<!--").length + aDescOffset;
                    break;
                case "#cdata-section":
                    pos += ("<![CDATA[").length + aDescOffset;
                    break;
                default:
                    // in this case aDescOffset means the real desc node is the nth child of aDescNode
                    let aDescNodeParent = aDescNode;
                    aDescNode = aDescNode.childNodes[aDescOffset];
                    break;
            }
            if (aDescNode) {
                let tmpParent = aDescNode;
                let tmpSibling = aDescNode.previousSibling;
            } else {
                // no end element means that the selection ends after the last child of aDescNodeParent
                // so we walk for all elements
                let tmpSibling = aDescNodeParent.lastChild;
                let tmpParent = tmpSibling;
            }
            do {
                while (tmpSibling) {
                    switch (tmpSibling.nodeName) {
                        case "#text":
                            pos += textToHtmlOffset(tmpSibling);
                            break;
                        case "#comment":
                            pos += ("<!--" + tmpSibling.textContent + "-->").length;
                            break;
                        case "#cdata-section":
                            pos += ("<![CDATA[" + tmpSibling.textContent + "]]>").length;
                            break;
                        default:
                            pos += sbCommonUtils.getOuterHTML(tmpSibling).length;
                            break;
                    }
                    tmpSibling = tmpSibling.previousSibling;
                }
                tmpParent = tmpParent.parentNode;
                // all parent nodes are not aNode
                // in this case aDescNode is not a descendant of aNode
                if (!tmpParent) return -1;
                pos += sbCommonUtils.getOuterHTML(tmpParent).lastIndexOf(tmpParent.innerHTML);
                if (tmpParent === aNode) break;
                tmpSibling = tmpParent.previousSibling;
            } while (true)
            return pos;
        }

        function textToHtmlOffset(aNode, aOffset) {
            // if (aNode.nodeName !== "#text") return aOffset;
            let content = (typeof aOffset == "undefined") ? aNode.textContent : aNode.textContent.substring(0, aOffset);
            let span = aNode.ownerDocument.createElement("span");
            span.appendChild(aNode.ownerDocument.createTextNode(content));
            return span.innerHTML.length;
        }
    },

};



let sbDOMEraser = {

    _shortcutMap: {},

    enabled: false,
    lastX: 0,
    lastY: 0,
    lastWindow: null,
    lastMouseWindow: null,
    lastTarget: null,
    lastTargetOutline: "",
    widerStack: null,

    _firstInit: function() {
        if (arguments.callee.done) return;
        arguments.callee.done = true;

        let that = this;

        // init shortkey table
        [
           "wider",
           "narrower",
           "remove",
           "isolate",
           "blackOnWhite",
           "colorize",
           "deWrapping",
           "undo",
           "help",
           "quit",
           "quit2",
           "quit3",
           "remove2",
           "remove3",
           "isolate2",
           "isolate3",
           "wider2",
           "narrower2",
           "wider3",
           "narrower3",
        ].forEach(function(cmd){
            let key = sbCommonUtils.getPref("key.domEraser." + cmd, "");
            if (key) {
                // commands with a number suffix are alternatives
                let mainCmd = cmd.replace(/\d+$/, "");
                that._shortcutMap[key] = mainCmd;
            }
        });
    },
    
    // aStateFlag
    //   0: disable
    //   1: enable
    init: function(aStateFlag) {
        this._firstInit();
        let wasEnabled = this.enabled;
        this.enabled = (aStateFlag == 1);
        if (this.enabled == wasEnabled) return;
        document.getElementById("ScrapBookEditEraser").checked = this.enabled;
        document.getElementById("ScrapBookHighlighter").disabled = this.enabled;
        document.getElementById("ScrapBookEditAnnotation").disabled = this.enabled;
        document.getElementById("ScrapBookEditHTML").disabled = this.enabled;
        document.getElementById("ScrapBookEditCutter").disabled = this.enabled;

        this._clear();
        if (aStateFlag == 0) {
            // revert settings of the last window
            if (this.lastWindow) {
                this.initEvent(this.lastWindow, 0);
                this.initStyle(this.lastWindow, 0);
            }
        } else if (aStateFlag == 1) {
            this.lastWindow = window.content;
            // apply settings to the current window
            this.initEvent(this.lastWindow, 1);
            this.initStyle(this.lastWindow, 1);
            // show help
            this._showHelp(this.lastWindow);
        }
    },

    initEvent: function(aWindow, aStateFlag) {
        sbCommonUtils.flattenFrames(aWindow).forEach(function(win) {
            win.document.removeEventListener("mouseover", this.handleEvent, true);
            win.document.removeEventListener("mousemove", this.handleEvent, true);
            win.document.removeEventListener("click",     this.handleEvent, true);
            win.document.removeEventListener("keydown",   this.handleKeyEvent, true);
            if ( aStateFlag == 1 ) {
                win.document.addEventListener("mouseover", this.handleEvent, true);
                win.document.addEventListener("mousemove", this.handleEvent, true);
                win.document.addEventListener("click",     this.handleEvent, true);
                win.document.addEventListener("keydown",   this.handleKeyEvent, true);
            }
        }, this);
    },

    initStyle: function(aWindow, aStateFlag) {
        sbCommonUtils.flattenFrames(aWindow).forEach(function(win) {
            if ( aStateFlag == 1 ) {
                let estyle = "* { cursor: crosshair !important; }";
                sbPageEditor.applyStyle(win, "scrapbook-eraser-style", estyle);
            } else {
                sbPageEditor.removeStyle(win, "scrapbook-eraser-style");
            }
        }, this);
    },

    handleKeyEvent: function(aEvent) {
        // set variables and check whether it's a defined hotkey combination
        let shortcut = sbShortcut.fromEvent(aEvent);
        let key = shortcut.toString();
        let command = sbDOMEraser._shortcutMap[key];
        if (!command) return;

        // now we are sure we have the hotkey, skip the default key action
        aEvent.preventDefault();
        try {
            // event.stopImmediatePropagation is supported since Firefox 10
            aEvent.stopImmediatePropagation();
        } catch (ex) {
            aEvent.stopPropagation();
        }

        // The original key effect could not be blocked completely
        // if the command has a prompt or modal window that blocks.
        // Therefore we call the callback command using an async workaround.
        setTimeout(function(){
            sbDOMEraser._execCommand(sbDOMEraser.lastWindow, command, key);
        }, 0);
    },

    handleEvent: function(aEvent) {
        aEvent.preventDefault();
        try {
            // event.stopImmediatePropagation is supported since Firefox 10
            aEvent.stopImmediatePropagation();
        } catch (ex) {
            aEvent.stopPropagation();
        }
        let elem = aEvent.target;
        if ( aEvent.type == "mouseover" ) {
            if (sbDOMEraser._isNormalNode(elem)) {
                elem = sbDOMEraser._findValidElement(elem, true);
                if (elem) {
                    if (elem !== sbDOMEraser.lastTarget) {
                        sbDOMEraser.widerStack = null;
                        sbDOMEraser._selectNode(elem);
                    }
                } else {
                    sbDOMEraser.widerStack = null;
                    sbDOMEraser._deselectNode();
                }
            }
        } else if ( aEvent.type == "mousemove" ) {
            sbDOMEraser.lastX = aEvent.clientX;
            sbDOMEraser.lastY = aEvent.clientY;
            sbDOMEraser.lastMouseWindow = aEvent.target.ownerDocument.defaultView;
            sbDOMEraser._clearHelp();
        } else if ( aEvent.type == "click" ) {
            let elem = sbDOMEraser.lastTarget;
            if (elem) {
                let command = ( aEvent.shiftKey || aEvent.button == 2 ) ? "isolate" : "remove";
                sbDOMEraser._execCommand(sbDOMEraser.lastWindow, command, "");
            }
        }
    },

    cmd_quit: function (aNode) {
        this.init(0);
        return true;
    },

    cmd_wider: function (aNode) {
        if (aNode && aNode.parentNode) {
            let newNode = this._findValidElement(aNode.parentNode, true);
            if (!newNode) return false;
            if (!this.widerStack) this.widerStack = [];
            this.widerStack.push(aNode);
            this._selectNode(newNode);
            return true;
        }
        return false;
    },

    cmd_narrower: function (aNode) {
        if (!aNode) return false;
        if (!this.widerStack || !this.widerStack.length) return false;
        let child = this.widerStack.pop();
        this._selectNode(child);
        return true;
    },

    cmd_remove: function (aNode) {
        if (!aNode) return false;
        this._clear();
        sbPageEditor.allowUndo(aNode.ownerDocument);
        if ( sbPageEditor.removeSbObj(aNode) <= 0 ) {
            aNode.parentNode.removeChild(aNode);
        }
        return true;
    },

    cmd_isolate: function (aNode) {
        if ( !aNode || !aNode.ownerDocument.body ) return false;
        this._clear();
        sbPageEditor.allowUndo(aNode.ownerDocument);
        let i = 0;
        while ( aNode != aNode.ownerDocument.body && ++i < 64 ) {
            let parent = aNode.parentNode;
            let child = parent.lastChild;
            let j = 0;
            while ( child && ++j < 1024 ) {
                let prevChild = child.previousSibling;
                if ( child != aNode ) parent.removeChild(child);
                child = prevChild;
            }
            aNode = parent;
        }
        return true;
    },

    cmd_blackOnWhite: function (aNode) {
        if (!aNode) return false;
        this._clear();
        sbPageEditor.allowUndo(aNode.ownerDocument);
        this._selectNode(aNode);
        blackOnWhite(aNode);
        return true;

        function blackOnWhite(aNode) {
            if (aNode.nodeType != 1) return;
            aNode.style.color = "#000";
            aNode.style.backgroundColor = "#FFF";
            aNode.style.backgroundImage = "";
            let childs = aNode.childNodes;
            for (var i=0; i<childs.length; i++) {
                blackOnWhite(childs[i]);
            }
        }
    },

    cmd_colorize: function (aNode) {
        if (!aNode) return false;
        this._clear();
        sbPageEditor.allowUndo(aNode.ownerDocument);
        this._selectNode(aNode);
        aNode.style.backgroundColor = "#" + Math.floor(Math.random() * 17).toString(16) + Math.floor(Math.random() * 17).toString(16) + Math.floor(Math.random() * 17).toString(16);
        aNode.style.backgroundImage = "";
        return true;
    },

    cmd_deWrapping: function (aNode) {
        if (!aNode) return false;
        this.cmd_isolate(aNode);
        let next = this._findValidElement(aNode);
        while (next) {
            let cur = next;
            let next = this._findValidElement(cur.parentNode);
            sbPageEditor.unwrapNode(cur);
        }
        return true;
    },

    cmd_help: function (aNode) {
        this._showHelp(this.lastWindow);
        return true;
    },

    cmd_undo: function (aNode) {
        return sbPageEditor.undo();
    },

    _execCommand: function (win, command, key) {
        if (command != "help") this._clearHelp();
        let callback = sbDOMEraser["cmd_" + command];
        if (callback.call(sbDOMEraser, sbDOMEraser.lastTarget)) {
            sbDOMEraser._showKeybox(win, command, key);
        }
    },

    _showHelp: function (win) {
        let doc = win.document;
        let id = "scrapbook-domeraser-" + (new Date()).valueOf();  // a unique id for styling

        // clear the help if existed
        if (this.helpElem) {
            this._clearHelp();
            return;
        }

        // create new help
        let helpElem = doc.createElement("div");
        helpElem.id = id;
        helpElem.isDOMEraser = true; // mark as ours

        let content = ''
            + '<style>'
            + '#__id__, #__id__ * {'
                + 'visibility: visible;'
                + 'overflow: visible;'
                + 'margin: 0;'
                + 'border: 0;'
                + 'padding: 0;'
                + 'max-width: none;'
                + 'max-height: none;'
                + 'min-width: 0px;'
                + 'min-height: 0px;'
            + '}'
            + '#__id__ {'
                + 'background-color: #f0f0f0;'
                + 'opacity: 0.95;'
                + '-moz-box-shadow: 3px 4px 5px #888;'
                + 'box-shadow: 3px 4px 5px #888;'
                + 'margin: 0 auto;'
                + 'border: 1px solid #CCC;'
                + '-moz-border-radius: 5px;'
                + 'border-radius: 5px;'
                + 'display: block;'
                + 'position: absolute;'
                + 'z-index: 2147483647;'
                + 'color: black;'
                + 'font-size: 16px;'
                + 'line-height: 1.3em;'
                + 'font-family: sans-serif;'
                + 'text-align: left;'
            + '}'
            + '#__id__ .header {'
                + 'padding: 10px;'
                + 'text-align: center;'
                + 'font-size: 1.5em;'
                + 'background-color: #D8D7DC;'
            + '}'
            + '#__id__ .desc {'
                + 'padding: 5px 25px;'
            + '}'
            + '#__id__ .table-wrapper {'
                + 'margin: 0 auto;'
                + 'padding: 1px 10px 10px 10px;'
            + '}'
            + '#__id__ .keytable {'
                + 'float: left;'
                + 'margin: 5px 10px 0 10px;'
                + 'border-collapse: separate;'
                + 'border-spacing: 2px;'
            + '}'
            + '#__id__ .key code {'
                + 'padding: 2px 7px;'
                + 'border: 1px solid black;'
                + 'background-color: #ddd;'
                + 'font-family: monospace;'
                + 'font-weight: bold;'
            + '}'
            + '#__id__ .altkey code {'
                + 'margin: 1px 2px;'
                + 'border: 1px solid black;'
                + 'padding: 1px 3px;'
                + 'background-color: #ddd;'
                + 'font-family: monospace;'
                + 'font-weight: bold;'
            + '}'
            + '#__id__ .command {'
                + 'padding: 3px 7px;'
                + 'font-size: 14px;'
            + '}'
            + '</style>'
            + '<div class="header">ScrapBook DOM Eraser Usage</div>'
            + '<div class="desc">'
                + 'Move the mouse to select an element.<br/>'
                + 'Use the following commands to operate on.<br/>'
            + '</div>'
            + '<div class="table-wrapper">'
            + '<table class="keytable">'
            + '<tbody>'
            + '<tr>'
                + '<th colspan="2">Primary Keys</th>'
            + '</tr>'
            + '<tr>'
                + '<td class="key"><code>h</code></td>'
                + '<td class="command">help (toggle)</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="key"><code>q</code></td>'
                + '<td class="command">quit</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="key"><code>w</code></td>'
                + '<td class="command">wider</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="key"><code>n</code></td>'
                + '<td class="command">narrower</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="key"><code>r</code></td>'
                + '<td class="command">remove</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="key"><code>i</code></td>'
                + '<td class="command">isolate</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="key"><code>b</code></td>'
                + '<td class="command">black on white</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="key"><code>d</code></td>'
                + '<td class="command">de-wrapping</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="key"><code>c</code></td>'
                + '<td class="command">colorize</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="key"><code>u</code></td>'
                + '<td class="command">undo</td>'
            + '</tr>'
            + '</tbody>'
            + '</table>'
            + '<table class="keytable">'
            + '<tbody>'
            + '<tr>'
                + '<th colspan="2">Alternatives</th>'
            + '</tr>'
            + '<tr>'
                + '<td class="altkey"><code>click</code></td>'
                + '<td class="command">remove</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="altkey"><code>enter</code></td>'
                + '<td class="command">remove</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="altkey"><code>space</code></td>'
                + '<td class="command">remove</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="altkey"><code>right-click</code></td>'
                + '<td class="command">isolate</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="altkey"><code>shift</code>+<code>click</code></td>'
                + '<td class="command">isolate</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="altkey"><code>shift</code>+<code>enter</code></td>'
                + '<td class="command">isolate</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="altkey"><code>shift</code>+<code>space</code></td>'
                + '<td class="command">isolate</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="altkey"><code>+</code></td>'
                + '<td class="command">wider</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="altkey"><code>-</code></td>'
                + '<td class="command">narrower</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="altkey"><code>F9</code></td>'
                + '<td class="command">quit or start</td>'
            + '</tr>'
            + '<tr>'
                + '<td class="altkey"><code>ESC</code></td>'
                + '<td class="command">quit</td>'
            + '</tr>'
            + '</tbody>'
            + '</table>'
            + '<div style="clear: both;" />'
            + '</div>';

        helpElem.innerHTML = sbCommonUtils.stringTemplate(content, /__([\w_]+)__/g, {
            "id": sbCommonUtils.escapeHTML(id)
        });
        doc.body.appendChild(helpElem);

        // fix position
        let dims = this._getWindowDimensions(win);
        let x = dims.scrollX + (dims.width - helpElem.offsetWidth) / 2;  if (x < 0) x = 0;
        let y = dims.scrollY + (dims.height - helpElem.offsetHeight) / 2; if (y < 0) y = 0;
        helpElem.style.left = x + "px";
        helpElem.style.top = y + "px";

        // expose this variable
        this.helpElem = helpElem;
    },

    _clearHelp: function() {
        try { sbDOMEraser.helpElem.parentNode.removeChild(sbDOMEraser.helpElem); } catch(ex) {}
        sbDOMEraser.helpElem = null;
    },

    _showKeybox: function (win, command, key) {
        let doc = win.document;

        // clear previous keybox
        this._clearKeybox();

        // set content
        let content = sbCommonUtils.escapeHTML(command);
        if (key) {
            let index = command.toLowerCase().indexOf(key.toLowerCase());
            if (index >= 0) {
                let s1 = command.substring(0, index);
                let s2 = command.charAt(index);
                let s3 = command.substring(index + 1);
                content = sbCommonUtils.escapeHTML(s1) + "<b style='font-size:2em;'>" + sbCommonUtils.escapeHTML(s2) + "</b>" + sbCommonUtils.escapeHTML(s3);
            }
        }

        // create a keybox
        let dims = this._getWindowDimensions(win);
        let x = this.lastX + 10; if (x < 0) x = 0;
        let y = dims.scrollY + this.lastY + 10; if (y < 0) y = 0;

        // if in frame, add parent window offset
        let pos = sbDOMEraser._getFrameOffset(sbDOMEraser.lastMouseWindow);
        x += pos.x;
        y += pos.y;

        let keyboxElem = doc.createElement("div");
        keyboxElem.isDOMEraser = true; // mark as ours
        keyboxElem.style.backgroundColor = "#dfd";
        keyboxElem.style.border = "2px solid black";
        keyboxElem.style.fontFamily = "arial";
        keyboxElem.style.textAlign = "left";
        keyboxElem.style.color = "#000";
        keyboxElem.style.fontSize = "12px";
        keyboxElem.style.position = "absolute";
        keyboxElem.style.padding = "2px 5px 2px 5px";
        keyboxElem.style.zIndex = "2147483647";
        keyboxElem.innerHTML = content;
        doc.body.appendChild(keyboxElem);

        // adjust the label as necessary to make sure it is within screen
        if ((x + keyboxElem.offsetWidth) >= dims.scrollX + dims.width) {
            x = (dims.scrollX + dims.width) - keyboxElem.offsetWidth * 1.6;
        }
        if ((y + keyboxElem.offsetHeight) >= dims.scrollY + dims.height) {
            y = (dims.scrollY + dims.height) - keyboxElem.offsetHeight * 2;
        }
        keyboxElem.style.left = x + "px";
        keyboxElem.style.top = y + "px";

        // expose this variable
        this.keyboxElem = keyboxElem;

        // remove the keybox after a timeout
        this.keyboxTimeout = setTimeout(this._clearKeybox, 400);
    },

    _clearKeybox: function() {
        try { sbDOMEraser.keyboxElem.parentNode.removeChild(sbDOMEraser.keyboxElem); } catch(ex) {}
        try { clearTimeout(sbDOMEraser.keyboxTimeout); } catch(ex) {}
        sbDOMEraser.keyboxElem = null;
        sbDOMEraser.keyboxTimeout = null;
    },

    // verify it's not in an element specially used by DOMEraser
    _isNormalNode: function(elem) {
        // check whether it's in our special element
        let test = elem;
        while (test) {
            if (test.isDOMEraser) return false;
            test = test.parentNode;
        }
        return true;
    },

    // given an element, walk upwards to find the first
    // valid selectable element
    _findValidElement: function(elem, traceFrame) {
        while (elem) {
            if (["#document","scrollbar","html","body","frame","frameset"].indexOf(elem.nodeName.toLowerCase()) == -1) return elem;
            if (traceFrame && !elem.parentNode) {  // now elem is #document
                let win = elem.defaultView;
                let parent = win.parent;
                // if the elem is in a frame, go out to the frame element and then go up
                if (win != parent) {
                    elem = this._findFrameElement(win, parent);
                    continue;
                }
            }
            elem = elem.parentNode;
        }
        return null;
    },

    // find which element in parentWin owns the given frame
    _findFrameElement: function (frame, parentWin) {
        let elems = parentWin.document.getElementsByTagName("iframe");
        for (var i=0, I=elems.length; i<I; ++i) {
            let elem = elems[i];
            if (elem.contentDocument.defaultView === frame) {
                return elem;
            }
        }
        let elems = parentWin.document.getElementsByTagName("frame");
        for (var i=0, I=elems.length; i<I; ++i) {
            let elem = elems[i];
            if (elem.contentDocument.defaultView === frame) {
                return elem;
            }
        }
        return null;
    },

    _getPos: function (elem) {
        let pos = sbDOMEraser._getPosInWindow(elem);
        let pos2 = sbDOMEraser._getFrameOffset(elem.ownerDocument.defaultView);
        pos.x += pos2.x;
        pos.y += pos2.y;
        return pos;
    },

    // if win is a frame, get its offset relative to all parent windows
    _getFrameOffset: function(win) {
        let pos = {x: 0, y: 0};
        let parent = win.parent;
        while (win != parent) {
            let frameElem = sbDOMEraser._findFrameElement(win, parent);
            let framePos = sbDOMEraser._getPosInWindow(frameElem);
            pos.x += framePos.x;
            pos.y += framePos.y;
            win = parent;
            parent = win.parent;
        }
        return pos;
    },

    _getPosInWindow: function (elem) {
        let pos = {x: 0, y: 0};
        if (elem.offsetParent) {
            while (elem.offsetParent) {
                pos.x += elem.offsetLeft;
                pos.y += elem.offsetTop;
                elem = elem.offsetParent;
            }
        } else if (elem.x) {
            pos.x += elem.x;
            pos.y += elem.y;
        }
        return pos;
    },

    _selectNode: function(aNode) {
        this._deselectNode();
        this.lastTarget = aNode;
        this._addTooltip(aNode);
    },

    _deselectNode: function() {
        this._removeTooltip(this.lastTarget);
        this.lastTarget = null;
    },

    _addTooltip: function(aNode) {
        if ( sbCommonUtils.getSbObjectRemoveType(aNode) > 0 ) {
            let outlineStyle = "2px dashed #0000FF";
            let labelText = sbCommonUtils.escapeHTMLWithSpace(sbCommonUtils.lang("EDIT_REMOVE_HIGHLIGHT"));
        } else {
            let outlineStyle = "2px solid #FF0000";
            let labelText = "<b style='color:#000'>" + sbCommonUtils.escapeHTMLWithSpace(aNode.tagName.toLowerCase()) + "</b>" +
            (aNode.id ? ", id: " + sbCommonUtils.escapeHTMLWithSpace(aNode.id) : "") +
            (aNode.className ? ", class: " + sbCommonUtils.escapeHTMLWithSpace(aNode.className) : "");
        }
        createLabel(this.lastWindow, aNode, labelText);
        setOutline(aNode, outlineStyle);

        function createLabel(win, elem, text) {
            let doc = win.document;
            let dims = sbDOMEraser._getWindowDimensions(win);
            let pos = sbDOMEraser._getPos(elem), x = pos.x, y = pos.y;
            y += elem.offsetHeight;

            let labelElem = doc.createElement("div");
            labelElem.isDOMEraser = true; // mark as ours
            labelElem.style.backgroundColor = "#fff0cc";
            labelElem.style.border = "2px solid black";
            labelElem.style.fontFamily = "arial";
            labelElem.style.textAlign = "left";
            labelElem.style.color = "#000";
            labelElem.style.fontSize = "12px";
            labelElem.style.position = "absolute";
            labelElem.style.padding = "2px 5px 2px 5px";
            labelElem.style.MozBorderRadius = "6px";
            labelElem.style.borderRadius = "6px";
            labelElem.style.zIndex = "2147483647";
            labelElem.innerHTML = text;
            doc.body.appendChild(labelElem);

            // adjust the label as necessary to make sure it is within screen
            if ((y + labelElem.offsetHeight) >= dims.scrollY + dims.height) {
                y = (dims.scrollY + dims.height) - labelElem.offsetHeight;
            }
            labelElem.style.left = (x + 2) + "px";
            labelElem.style.top = y + "px";

            // expose this variable
            this.labelElem = labelElem;
        }

        function setOutline(aElement, outline) {
            this.lastTargetOutline = aElement.style.outline;
            aElement.style.outline = outline;
        }
    },

    _removeTooltip: function(aNode) {
        clearOutline(aNode);
        removeLabel();
        
        function removeLabel() {
            try { this.labelElem.parentNode.removeChild(this.labelElem); } catch(ex) {}
            this.labelElem = null;
        }

        function clearOutline(aNode) {
            if (aNode && !sbCommonUtils.isDeadObject(aNode)) {
                aNode.style.outline = this.lastTargetOutline;
                if ( !aNode.getAttribute("style") ) aNode.removeAttribute("style");
            }
        }
    },

    _getWindowDimensions: function (win) {
        let out = {};
        let doc = win.document;

        if (win.pageXOffset) {
            out.scrollX = win.pageXOffset;
            out.scrollY = win.pageYOffset;
        } else if (doc.documentElement) {
            out.scrollX = doc.body.scrollLeft + doc.documentElement.scrollLeft;
            out.scrollY = doc.body.scrollTop + doc.documentElement.scrollTop;
        } else if (doc.body.scrollLeft >= 0) {
            out.scrollX = doc.body.scrollLeft;
            out.scrollY = doc.body.scrollTop;
        }
        if (doc.compatMode == "BackCompat") {
            out.width = doc.body.clientWidth;
            out.height = doc.body.clientHeight;
        } else {
            out.width = doc.documentElement.clientWidth;
            out.height = doc.documentElement.clientHeight;
        }
        return out;
    },

    // clear all elements generated by DOMEraser
    // usually before making an undo history, to prevent anything being recorded
    _clear: function () {
        this._clearHelp();
        this._clearKeybox();
        this._deselectNode();
    },
};



let sbAnnotationService = {

    FREENOTE_DEFAULT_WIDTH: 250,
    FREENOTE_DEFAULT_HEIGHT: 100,
    FREENOTE_MIN_WIDTH: 100,
    FREENOTE_MIN_HEIGHT: 40,
    FREENOTE_HEADER_HEIGHT: 11,
    FREENOTE_FOOTER_HEIGHT: 18,
    offsetX: 0,
    offsetY: 0,
    isMove: true,
    target: null,

    initEvent: function(aWindow) {
        aWindow.document.removeEventListener("mousedown", this.handleEvent, true);
        aWindow.document.removeEventListener("click", this.handleEvent, true);
        aWindow.document.addEventListener("mousedown", this.handleEvent, true);
        aWindow.document.addEventListener("click", this.handleEvent, true);
    },

    handleEvent: function(aEvent) {
        if (!sbPageEditor.enabled || sbHtmlEditor.enabled || sbDOMEraser.enabled) return;
        if ( aEvent.type == "mousedown" ) {
            switch ( sbCommonUtils.getSbObjectType(aEvent.originalTarget) ) {
                case "freenote":
                    let freenote = aEvent.originalTarget;
                    if (!freenote.hasAttribute("data-sb-active")) {
                        sbAnnotationService.editFreenote(freenote);
                    }
                    break;
                case "freenote-header":
                    if (aEvent.originalTarget.style.cursor == "move") {
                        sbAnnotationService.startDrag(aEvent, true);
                    }
                    break;
                case "freenote-footer":
                    sbAnnotationService.startDrag(aEvent, false);
                    break;
                case "inline":
                    sbAnnotationService.editInline(aEvent.originalTarget);
                    break;
                case "sticky":
                case "sticky-header":
                case "sticky-footer":
                case "sticky-save":
                case "sticky-delete":
                    // for downward compatibility with ScrapBook X <= 1.12.0a34
                    // sticky annotation is created in old versions, replace it with a freenote
                    let sticky = aEvent.originalTarget;
                    while (sbCommonUtils.getSbObjectType(sticky)!="sticky") sticky = sticky.parentNode;
                    if (sticky.lastChild.nodeName == "#text") {
                        // general cases
                        let text = sticky.lastChild.data;
                    } else {
                        // SB/SBP unsaved sticky
                        let text = sticky.childNodes[1].value;
                    }
                    sbAnnotationService.createFreenote({
                        element: sticky,
                        content: sbCommonUtils.escapeHTMLWithSpace(text, true).replace("\n", "<br/>"),
                        isRelative: sticky.className.indexOf("scrapbook-sticky-relative") != -1,
                    });
                    break;
                case "block-comment":
                    // for downward compatibility with SB <= 0.17.0
                    // block-comment is created in old versions, replace it with a freenote
                    let bcomment = aEvent.originalTarget;
                    if (bcomment.firstChild.nodeName == "#text") {
                        // general cases
                        let text = bcomment.firstChild.data;
                    } else {
                        // unsaved block comment
                        let text = bcomment.firstChild.firstChild.value;
                    }
                    sbAnnotationService.createFreenote({
                        element: bcomment,
                        content: sbCommonUtils.escapeHTML(text, true),
                        isRelative: true,
                    });
                    break;
            }
        } else if ( aEvent.type == "mousemove" ) {
            if ( sbAnnotationService.target ) sbAnnotationService.onDrag(aEvent);
        } else if ( aEvent.type == "mouseup"   ) {
            if ( sbAnnotationService.target ) sbAnnotationService.stopDrag(aEvent);
        } else if ( aEvent.type == "click" ) {
            switch ( sbCommonUtils.getSbObjectType(aEvent.originalTarget) ) {
                case "freenote-save":
                    sbAnnotationService.saveFreenote(aEvent.originalTarget.parentNode.parentNode);
                    break;
                case "freenote-delete":
                    sbAnnotationService.deleteFreenote(aEvent.originalTarget.parentNode.parentNode);
                    break;
            }
        }
    },

    /**
     * @param preset { element: <object>, content: <string>, isRelative: <bool> }
     */
    createFreenote: function(preset) {
        let win = sbCommonUtils.getFocusedWindow();
        if ( win.document.body instanceof HTMLFrameSetElement ) win = win.frames[0];
        sbPageEditor.allowUndo(win.document);

        // place at the target
        if (preset) {
            let isRelative = preset.isRelative;
            let targetNode = preset.element;
        } else {
            let sel = sbPageEditor.getSelection(win);
            if (sel) {
                // relative to the target element
                let isRelative = true;
                let targetNode = findTargetNode(sel.anchorNode);
            } else {
                // absolute (in the body element)
                let isRelative = false;
            }
        }

        // create a new freenote
        let mainDiv = win.content.document.createElement("div");
        mainDiv.setAttribute("data-sb-obj", "freenote");
        mainDiv.style.cursor = "help";
        mainDiv.style.overflow = "visible";
        mainDiv.style.margin = "0px";
        mainDiv.style.border = "1px solid #CCCCCC";
        mainDiv.style.borderTopWidth = (this.FREENOTE_HEADER_HEIGHT + 1) + "px";
        mainDiv.style.background = "#FAFFFA";
        mainDiv.style.opacity = "0.95";
        mainDiv.style.padding = "0px";
        mainDiv.style.zIndex = "500000";
        mainDiv.style.textAlign = "start";
        mainDiv.style.fontSize = "small";
        mainDiv.style.lineHeight = "1.2em";
        mainDiv.style.wordWrap = "break-word";
        let width = this.FREENOTE_DEFAULT_WIDTH;
        let height = this.FREENOTE_DEFAULT_HEIGHT;
        mainDiv.style.width = width + "px";
        mainDiv.style.height = height + "px";
        if ( isRelative ) {
            mainDiv.style.position = "static";
            mainDiv.style.margin = "16px auto";
        } else {
            mainDiv.style.position = "absolute";
            if (preset) {
                mainDiv.style.left = targetNode.style.left;
                mainDiv.style.top = targetNode.style.top;
            } else {
                let left = win.scrollX + Math.round((win.innerWidth - width) / 2);
                let top = win.scrollY + Math.round((win.innerHeight - height) / 2);
                mainDiv.style.left = left + "px";
                mainDiv.style.top = top  + "px";
            }
        }
        if (preset) {
            mainDiv.innerHTML = preset.content;
        }
        
        // append the freenote
        if (isRelative) {
            if (targetNode === win.document.body) {
                targetNode.appendChild(mainDiv);
            } else if (targetNode.nextSibling) {
                targetNode.parentNode.insertBefore(mainDiv, targetNode.nextSibling);
            } else {
                targetNode.parentNode.appendChild(mainDiv);
            }
        } else {
            win.document.body.appendChild(mainDiv);
        }
        if (preset) {
            targetNode.parentNode.removeChild(targetNode);
        }

        // edit the freenote
        this._editFreenote(mainDiv);

        function findTargetNode(refNode) {
            let targetNode = refNode;
            // must be one of these block elements
            while (["body", "div", "blockquote", "pre", "p", "td", "li", "dt", "dd"].indexOf(targetNode.nodeName.toLowerCase()) == -1 || sbCommonUtils.getSbObjectType(targetNode)) {
                targetNode = targetNode.parentNode;
            }
            // if it's before a freenote, move it after
            while (targetNode.nextSibling && sbCommonUtils.getSbObjectType(targetNode.nextSibling) == "freenote")  {
                targetNode = targetNode.nextSibling;
            }
            return targetNode;
        }
    },

    editFreenote: function(mainDiv) {
        sbPageEditor.allowUndo(mainDiv.ownerDocument);
        this._editFreenote(mainDiv);
    },

    _editFreenote: function(mainDiv) {
        let doc = mainDiv.ownerDocument, child;
        let isRelative = mainDiv.style.position != "absolute";
        mainDiv.setAttribute("data-sb-active", "1");

        let headDiv = doc.createElement("div");
        headDiv.setAttribute("data-sb-obj", "freenote-header");
        headDiv.style.cursor = isRelative ? "auto" : "move";
        headDiv.style.position = "absolute";
        headDiv.style.margin = "0px";
        headDiv.style.marginTop = -this.FREENOTE_HEADER_HEIGHT + "px";
        headDiv.style.border = "none";
        headDiv.style.background = "#CCCCCC";
        headDiv.style.padding = "0px";
        headDiv.style.width = "inherit";
        headDiv.style.height = this.FREENOTE_HEADER_HEIGHT + "px";

        let bodyDiv = doc.createElement("div");
        bodyDiv.setAttribute("data-sb-obj", "freenote-body");
        bodyDiv.setAttribute("contentEditable", true);
        bodyDiv.style.cursor = "auto";
        bodyDiv.style.overflow = "auto";
        bodyDiv.style.margin = "0px";
        bodyDiv.style.border = "none";
        bodyDiv.style.background = "#FFFFFF";
        bodyDiv.style.padding = "0px";
        bodyDiv.style.fontSize = "inherit";
        bodyDiv.style.lineHeight = "inherit";
        bodyDiv.style.textAlign = "inherit";
        while ((child = mainDiv.firstChild)) bodyDiv.appendChild(child);

        let footDiv = doc.createElement("div");
        footDiv.setAttribute("data-sb-obj", "freenote-footer");
        footDiv.style.cursor = "se-resize";
        footDiv.style.margin = "0px";
        footDiv.style.border = "none";
        footDiv.style.background = "url('chrome://scrapbook/skin/freenote_resizer.png') right bottom no-repeat";
        footDiv.style.padding = "0px";
        footDiv.style.textAlign = "inherit";
        footDiv.style.height = this.FREENOTE_FOOTER_HEIGHT + "px";

        let button1 = doc.createElement("input");
        button1.setAttribute("data-sb-obj", "freenote-save");
        button1.setAttribute("type", "image");
        button1.setAttribute("src", "chrome://scrapbook/skin/freenote_save.gif");
        button1.style.margin = "1px 2px";
        button1.style.border = "none";
        button1.style.padding = "0px";
        button1.style.width = "16px";
        button1.style.height = "16px";
        button1.style.verticalAlign = "baseline";
        let button2 = doc.createElement("input");
        button2.setAttribute("data-sb-obj", "freenote-delete");
        button2.setAttribute("type", "image");
        button2.setAttribute("src", "chrome://scrapbook/skin/freenote_delete.gif");
        button2.style.margin = "1px 2px";
        button2.style.border = "none";
        button2.style.padding = "0px";
        button2.style.width = "16px";
        button2.style.height = "16px";
        button2.style.verticalAlign = "baseline";
        footDiv.appendChild(button1);
        footDiv.appendChild(button2);

        mainDiv.appendChild(headDiv);
        mainDiv.appendChild(bodyDiv);
        mainDiv.appendChild(footDiv);
        this._adjustEditArea(mainDiv);

        setTimeout(function(){ bodyDiv.focus(); }, 0);
    },

    saveFreenote: function(mainDiv) {
        mainDiv.removeAttribute("data-sb-active");
        let bodyDiv = mainDiv.childNodes[1], child;
        while ((child = mainDiv.firstChild)) mainDiv.removeChild(child);
        if (bodyDiv && sbCommonUtils.getSbObjectType(bodyDiv) == "freenote-body") {
            while ((child = bodyDiv.firstChild)) mainDiv.appendChild(child);
        }
    },

    deleteFreenote: function(mainDiv) {
        mainDiv.parentNode.removeChild(mainDiv);
    },

    _adjustEditArea: function(mainDiv) {
        let h = Math.max(parseInt(mainDiv.style.height, 10) - this.FREENOTE_FOOTER_HEIGHT, 0);
        mainDiv.childNodes[1].style.height = h + "px";
    },

    startDrag: function(aEvent, isMove) {
        aEvent.preventDefault();
        this.target = aEvent.originalTarget.parentNode;
        this.isMove = isMove;
        this.offsetX = aEvent.clientX - parseInt(this.target.style[this.isMove ? "left" : "width" ], 10);
        this.offsetY = aEvent.clientY - parseInt(this.target.style[this.isMove ? "top"  : "height"], 10);
        aEvent.view.document.addEventListener("mousemove", this.handleEvent, true);
        aEvent.view.document.addEventListener("mouseup",   this.handleEvent, true);
    },

    onDrag: function(aEvent) {
        aEvent.preventDefault();
        if (this.isMove) {
            let x = aEvent.clientX - this.offsetX;
            let y = aEvent.clientY - this.offsetY;
            this.target.style.left = x + "px";
            this.target.style.top = y + "px";
        } else {
            let x = Math.max(aEvent.clientX - this.offsetX, this.FREENOTE_MIN_WIDTH);
            let y = Math.max(aEvent.clientY - this.offsetY, this.FREENOTE_MIN_HEIGHT);
            this.target.style.width = x + "px";
            this.target.style.height = y + "px";
            this._adjustEditArea(this.target);
        }
    },

    stopDrag: function(aEvent) {
        this.target = null;
        aEvent.view.document.removeEventListener("mousemove", this.handleEvent, true);
        aEvent.view.document.removeEventListener("mouseup",   this.handleEvent, true);
    },

    addInline: function() {
        // check and get selection
        let win = sbCommonUtils.getFocusedWindow();
        let sel = sbPageEditor.getSelection(win);
        if ( !sel ) return;
        // check and get the annotation
        let ret = {};
        if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", sbCommonUtils.lang("EDIT_INLINE", sbCommonUtils.crop(sel.toString(), null, 80)), ret, null, {}) ) return;
        if ( !ret.value ) return;
        // apply
        sbPageEditor.allowUndo(win.document);
        let attr = {
            "data-sb-id": (new Date()).valueOf(),
            "data-sb-obj": "inline",
            "class": "scrapbook-inline", // for downward compatibility with ScrapBook / ScrapBook Plus
            "style": "border-bottom: 2px dotted #FF3333; cursor: help;",
            "title": ret.value,
        };
        sbHighlighter.set(win, sel, "span", attr);
    },

    editInline: function(aElement) {
        let doc = aElement.ownerDocument;
        // check and get the annotation
        let ret = { value: aElement.getAttribute("title") };
        if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", sbCommonUtils.lang("EDIT_INLINE", sbCommonUtils.crop(aElement.textContent, null, 80)), ret, null, {}) ) return;
        // apply
        sbPageEditor.allowUndo(doc);
        let els = sbCommonUtils.getSbObjectsById(aElement);
        if ( ret.value ) {
            for (var i=0, I=els.length; i<I; ++i) {
                els[i].setAttribute("title", ret.value);
            }
        } else {
            for (var i=0, I=els.length; i<I; ++i) {
                sbPageEditor.removeSbObj(els[i]);
            }
        }
    },


    attach: function(aFlag) {
        let win = sbCommonUtils.getFocusedWindow();
        let sel = sbPageEditor.getSelection(win);
        if ( !sel ) return;
        if ( aFlag == "L" ) {
            // fill the selection it looks like an URL
            // use a very wide standard, which allows as many cases as may be used
            let selText = sel.toString();
            if (selText && selText.match(/^(\w+:[^\t\n\r\v\f]*)/i)) {
                let url = RegExp.$1;
            }
            let ret = { value: url || "" };
            if ( !sbCommonUtils.PROMPT.prompt(window, sbCommonUtils.lang("EDIT_ATTACH_LINK_TITLE"), sbCommonUtils.lang("ADDRESS"), ret, null, {}) ) return;
            if ( !ret.value ) return;
            let attr = {
                "data-sb-obj": "link-url",
                "href": ret.value
            };
        } else if ( aFlag == "I" ) {
            // we can construct inner link only for those with valid id
            if (!sbPageEditor.item) return;
            // if the sidebar is closed, we may get an error
            try {
                let sidebarId = sbCommonUtils.getSidebarId("sidebar");
                let res = document.getElementById(sidebarId).contentWindow.sbTreeHandler.getSelection(true, 2);
            } catch(ex) {}
            // check the selected resource
            if (res && res.length) {
                res = res[0];
                let type = sbDataSource.getProperty(res, "type");
                if ( ["folder", "separator"].indexOf(type) === -1 ) {
                    let id = sbDataSource.getProperty(res, "id");
                }
            }
            // if unavailable, let the user input an id
            let ret = {value: id || ""};
            if ( !sbCommonUtils.PROMPT.prompt(window, sbCommonUtils.lang("EDIT_ATTACH_INNERLINK_TITLE"), sbCommonUtils.lang("EDIT_ATTACH_INNERLINK_ENTER"), ret, null, {}) ) return;
            let id = ret.value;
            let res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
            if ( sbDataSource.exists(res) ) {
                let type = sbDataSource.getProperty(res, "type");
                if ( ["folder", "separator"].indexOf(type) !== -1 ) {
                    res = null;
                }
            } else res = null;
            // if it's invalid, alert and quit
            if (!res) {
                sbCommonUtils.PROMPT.alert(window, sbCommonUtils.lang("EDIT_ATTACH_INNERLINK_TITLE"), sbCommonUtils.lang("EDIT_ATTACH_INNERLINK_INVALID", id));
                return;
            }
            // attach the link
            let title = sbDataSource.getProperty(res, "title");
            let attr = {
                "data-sb-obj": "link-inner",
                "href": (type == "bookmark") ? sbDataSource.getProperty(res, "source") : makeRelativeLink(win.location.href, sbPageEditor.item.id, id),
                "title": title
            };
        } else {
            // we can upload file only for those with valid id
            if (!sbPageEditor.item) return;
            // check if the page is local and get its path
            let htmlFile = sbCommonUtils.convertURLToFile(win.location.href);
            if (!htmlFile) return;
            // prompt a window to select file
            let pickedFile = sbCommonUtils.showFilePicker({
                window: window,
                title: sbCommonUtils.lang("EDIT_ATTACH_FILE_TITLE"),
                mode: 0, // modeOpen
            });
            if ( !pickedFile ) return;
            // upload the file
            let filename = pickedFile.leafName;
            let filename2 = sbCommonUtils.validateFileName(filename);
            try {
                let destFile = htmlFile.parent.clone();
                destFile.append(filename2);
                if ( destFile.exists() && destFile.isFile() ) {
                    if ( !sbCommonUtils.PROMPT.confirm(window, sbCommonUtils.lang("EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("EDIT_ATTACH_FILE_OVERWRITE", filename2)) ) return;
                    destFile.remove(false);
                }
                pickedFile.copyTo(destFile.parent, filename2);
            } catch(ex) {
                sbCommonUtils.PROMPT.alert(window, sbCommonUtils.lang("EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("EDIT_ATTACH_FILE_INVALID", filename2));
                return;
            }
            // attach the link
            let attr = {
                "data-sb-obj": "link-file",
                "href": sbCommonUtils.escapeFileName(filename2),
                "title": filename
            };
        }
        sbPageEditor.allowUndo(win.document);
        sbHighlighter.set(win, sel, "a", attr);
        
        function makeRelativeLink(aBaseURL, aBaseId, aTargetId) {
            let result = "";
            let contDir = sbCommonUtils.getContentDir(aBaseId);
            let checkFile = sbCommonUtils.convertURLToFile(aBaseURL);
            while (!checkFile.equals(contDir)){
                result += "../";
                checkFile = checkFile.parent;
            }
            return result = result + aTargetId + "/index.html";
        }
    },

};




let sbInfoViewer = {

    get TOOLBAR() { return document.getElementById("ScrapBookInfobar"); },

    onPopupShowing: function(aEvent) {
        let id = sbBrowserOverlay.getID();
        document.getElementById("ScrapBookStatusPopupE").setAttribute("checked", sbBrowserOverlay.editMode);
        document.getElementById("ScrapBookStatusPopupI").setAttribute("checked", sbBrowserOverlay.infoMode);
        if ( id && sbDataSource.exists(sbBrowserOverlay.resource) ) {
            document.getElementById("ScrapBookStatusPopupM").setAttribute("disabled", sbDataSource.getProperty(sbBrowserOverlay.resource, "type") != "site");
            document.getElementById("ScrapBookStatusPopupS").setAttribute("disabled", !sbDataSource.getProperty(sbBrowserOverlay.resource, "source") && sbDataSource.getProperty(sbBrowserOverlay.resource, "type") != "site");
            document.getElementById("ScrapBookStatusPopupR").setAttribute("disabled", sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "notex");
            document.getElementById("ScrapBookStatusPopupT").setAttribute("hidden", sbDataSource.getProperty(sbBrowserOverlay.resource, "type") != "notex");
            document.getElementById("ScrapBookStatusPopupD").setAttribute("disabled", sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "notex");
            document.getElementById("ScrapBookStatusPopupI").setAttribute("disabled", sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "notex");
            document.getElementById("ScrapBookStatusPopupE").setAttribute("disabled", false);
            document.getElementById("ScrapBookEditBefore").previousSibling.setAttribute("hidden", true);
            document.getElementById("ScrapBookEditBefore").setAttribute("hidden", true);
        } else {
            document.getElementById("ScrapBookStatusPopupM").setAttribute("disabled", true);
            document.getElementById("ScrapBookStatusPopupS").setAttribute("disabled", true);
            document.getElementById("ScrapBookStatusPopupR").setAttribute("disabled", true);
            document.getElementById("ScrapBookStatusPopupT").setAttribute("hidden", true);
            document.getElementById("ScrapBookStatusPopupD").setAttribute("disabled", true);
            document.getElementById("ScrapBookStatusPopupI").setAttribute("disabled", true);
            document.getElementById("ScrapBookStatusPopupE").setAttribute("disabled", true);
            document.getElementById("ScrapBookEditBefore").previousSibling.setAttribute("hidden", false);
            document.getElementById("ScrapBookEditBefore").setAttribute("hidden", false);
            document.getElementById("ScrapBookEditBefore").setAttribute("checked", !(sbPageEditor.TOOLBAR.hidden || document.getElementById("ScrapBookToolbox").hidden));
        }
    },

    init: function(aID) {
        if ( aID != sbBrowserOverlay.getID() ) return;
        if (!sbDataSource.exists(sbBrowserOverlay.resource) || 
            sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "notex") {
            this.TOOLBAR.hidden = true;
            return;
        }
        this.TOOLBAR.hidden = false;
        let isTypeSite = (sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "site");
        document.getElementById("ScrapBookInfoHome").disabled = !isTypeSite;
        document.getElementById("ScrapBookInfoSite").disabled = !isTypeSite;
        // source image --> link to parent directory
        try {
            let curFile = sbCommonUtils.convertURLToFile(gBrowser.currentURI.spec);
            let url = sbCommonUtils.convertFileToURL(curFile.parent);
            let srcImage = document.getElementById("ScrapBookInfobar").firstChild;
            srcImage.onclick = function(aEvent){ sbCommonUtils.loadURL(url, aEvent.button == 1); };
        } catch(ex) {
            sbCommonUtils.error(ex);
        }
        // source label --> link to source
        let srcLabel = document.getElementById("ScrapBookInfoSource");
        srcLabel.value = sbDataSource.getProperty(sbBrowserOverlay.resource, "source");
        srcLabel.onclick = function(aEvent){ sbCommonUtils.loadURL(srcLabel.value, aEvent.button == 1); };
    },

    toggle: function() {
        let id = sbBrowserOverlay.getID();
        if ( !id ) return;
        this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
        sbBrowserOverlay.infoMode = this.TOOLBAR.hidden;
        this.TOOLBAR.hidden ? this.init(id) : this.TOOLBAR.hidden = true;
        this.optimize();
    },

    toggleIndicator: function(willEnable) {
        sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
            if ( willEnable ) {
                this.indicateLinks(win);
            } else {
                sbPageEditor.removeStyle(win, "scrapbook-indicator-style");
            }
        }, this);
    },

    indicateLinks: function(aWindow) {
        sbPageEditor.applyStyle(aWindow, "scrapbook-indicator-style", "a[href]:not([href^=\"http\"]):not([href^=\"javascript\"]):not([href^=\"mailto\"]):before { content:url('chrome://scrapbook/skin/info_link1.png'); }");
    },

    renew: function(showDetail) {
        let id = sbBrowserOverlay.getID();
        if ( !id ) return;
        let fileName = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(window.content.location.href))[0];
        let source = fileName == "index" ? sbDataSource.getProperty(sbBrowserOverlay.resource, "source") : "";
        let data = {
            urls: [source],
            showDetail: showDetail,
            preset: [id, fileName, null, null, 0],
            context: (fileName == "index") ? "capture-again" : "capture-again-deep",
        };
        top.window.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no", data);
    },

    internalize: function() {
        let id = sbBrowserOverlay.getID();
        if ( !id ) return;
        if (window.content.document.contentType != "text/html") {
            sbCommonUtils.alert(sbCommonUtils.lang("ERR_FAIL_NOT_INTERNALIZE_TYPE"));
            return;
        }
        let refFile = sbCommonUtils.convertURLToFile(window.content.location.href);
        let refDir = refFile.parent;

        // pre-fill files in the same folder to prevent overwrite
        let file2Url = {};
        sbCommonUtils.forEachFile(refDir, function(file){
            if (file.isDirectory() && file.equals(refDir)) return;
            file2Url[file.leafName] = true;
            return 0;
        }, this);

        let options = {
            "internalize": refFile,
        };
        let preset = [
            id,
            refFile.leafName,
            options,
            file2Url,
            0,
            false
        ];
        let data = {
            urls: [window.content.location.href],
            showDetail: false,
            option: options,
            file2Url: file2Url,
            preset: preset,
            context: "internalize",
        };
        top.window.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no", data);
    },

    openSourceURL: function(tabbed) {
        let self = arguments.callee;
        if (!self.getSourceURL) {
            self.getSourceURL = function(id, res, subPath){
                if (subPath == "index.html") {
                    return sbDataSource.getProperty(res, "source") || self.getSourceURLFromUrl2Name(id, subPath);
                }
                return self.getSourceURLFromFile2Url(id, subPath) || self.getSourceURLFromUrl2Name(id, subPath);
            };
            self.getSourceURLFromFile2Url = function(id, subPath){
                // seek sb-file2url.txt for source URL of the current file
                let listfile = sbCommonUtils.getContentDir(id).clone(); listfile.append("sb-file2url.txt");
                if (listfile.exists() && listfile.isFile()) {
                    let lines = sbCommonUtils.readFile(listfile, "UTF-8").split("\n");
                    for (var i = 0, I = lines.length; i < I; i++) {
                        let [file, url] = lines[i].split("\t", 2);
                        if (file == subPath && url.indexOf(":") != -1) return url;
                    }
                }
                return null;
            };
            self.getSourceURLFromUrl2Name = function(id, subPath){
                // seek sb-url2name.txt for source URL of the current doc
                let [subPathBase] = sbCommonUtils.splitFileName(subPath);
                let listfile = sbCommonUtils.getContentDir(id).clone(); listfile.append("sb-url2name.txt");
                if (listfile.exists() && listfile.isFile()) {
                    let lines = sbCommonUtils.readFile(listfile, "UTF-8").split("\n");
                    for (var i = 0, I = lines.length; i < I; i++) {
                        let [url, name] = lines[i].split("\t", 2);
                        if (name == subPathBase) return url;
                    }
                }
                return null;
            };
        }
      
        let id = sbBrowserOverlay.getID();
        if ( !id ) return;
        let basePathCut = sbCommonUtils.getContentDir(id, true).path.length + 1;
        let subPath = sbCommonUtils.convertURLToFile(window.content.location.href).path.substring(basePathCut).replace(/\\/g, "/");
        let source = self.getSourceURL(id, sbBrowserOverlay.resource, subPath);
        if (!source) {
            sbCommonUtils.alert(sbCommonUtils.lang("ERR_NO_SOURCE_URL", subPath));
            return;
        }
        let [, hash] = sbCommonUtils.splitURLByAnchor(window.content.location.href);
        sbCommonUtils.loadURL(source + hash, tabbed);
    },

    loadFile: function(aFileName) {
        let file = sbCommonUtils.getContentDir(sbBrowserOverlay.getID()); file.append(aFileName);
        let url = sbCommonUtils.convertFileToURL(file);
        let dataXml = sbCommonUtils.convertURLToFile(url);
        // later Firefox version doesn't allow loading .xsl in the upper directory
        // if it's requested, patch it
        if (dataXml.leafName == "sitemap.xml" && dataXml.exists()) {
            let dataDir = dataXml.parent;
            let dataXsl = dataDir.clone(); dataXsl.append("sitemap.xsl");
            let dataU2N = dataDir.clone(); dataU2N.append("sb-url2name.txt");
            let bookXsl = dataDir.parent.parent; bookXsl.append("sitemap.xsl");

            // dataXml is flushed earlier than dataU2N in a new capture
            // if it has newer lastModifiedTime, treat as already patched
            if ( !dataU2N.exists() || dataXml.lastModifiedTime <= dataU2N.lastModifiedTime ) {
                let lfData = sbCommonUtils.readFile(dataXml, "UTF-8");
                lfData = lfData.replace('<?xml-stylesheet href="../../sitemap.xsl"', '<?xml-stylesheet href="sitemap.xsl"');
                dataXml.remove(false);
                sbCommonUtils.writeFile(dataXml, lfData, "UTF-8");
            }

            // copy dataXsl from the book directory whenever there's a new version
            // copy = same lastModifiedTime
            if ( bookXsl.exists() ) {
                if ( !dataXsl.exists() || dataXsl.lastModifiedTime < bookXsl.lastModifiedTime ) {
                    if (dataXsl.exists()) dataXsl.remove();
                    bookXsl.copyTo(dataDir, "sitemap.xsl");
                }
            }
        }
        // load the request URL
        gBrowser.loadURI(url, null, null);
    },

    optimize: function() {
        this.TOOLBAR.style.borderBottom = sbPageEditor.TOOLBAR.hidden ? "1px solid ThreeDShadow" : "none";
    },

};



