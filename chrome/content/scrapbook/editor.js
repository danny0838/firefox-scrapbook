
var sbPageEditor = {

	get TOOLBAR() { return document.getElementById("ScrapBookEditor"); },
	get COMMENT() { return document.getElementById("ScrapBookEditComment"); },

	enabled : true,
	item : {},
	multiline : false,

	init : function(aID)
	{
		// check if the given ID is valid
		if ( aID ) {
			if ( aID != sbBrowserOverlay.getID() ) return;
			if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.disable(true); return; }
		}

		// record item and resource
		if ( aID ) {
			this.item = sbCommonUtils.newItem(aID);
			for ( var prop in this.item ) this.item[prop] = sbDataSource.getProperty(sbBrowserOverlay.resource, prop);
		}
		else {
			this.item = null;
			sbBrowserOverlay.resource = null;
		}

		// Update highlighter previewers
		var idx = document.getElementById("ScrapBookHighlighter").getAttribute("color") || 8;
		var cssText = sbCommonUtils.getPref("highlighter.style." + idx, sbHighlighter.PRESET_STYLES[idx]);
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
		if ( aID ) {
			try {
				// if the current page is the index page of the id, use the item title and item icon
				var mainFile = sbCommonUtils.getContentDir(this.item.id); mainFile.append("index.html");
				var curFile = sbCommonUtils.convertURLToFile(gBrowser.currentURI.spec);
				if (mainFile.equals(curFile)) {
					this.documentLoad(window.content.document, function(doc){
						var that = this;
						setTimeout(function(){
							gBrowser.selectedTab.label = that.item.title;
							gBrowser.selectedTab.setAttribute("image", that.item.icon || sbCommonUtils.getDefaultIcon(that.item.type));
						}, 0);
					}, this);
				}
			} catch(ex) {
				sbCommonUtils.error(ex);
			}
		}
		// -- icon --> link to folder
		var icon = document.getElementById("ScrapBookEditIcon");
		if (aID) {
			icon.src = this.item.icon || sbCommonUtils.getDefaultIcon(this.item.type);
			var url = sbCommonUtils.convertFilePathToURL(sbCommonUtils.getContentDir(aID).path);
			icon.onclick = function(aEvent){ sbCommonUtils.loadURL(url, aEvent.button == 1); };
		}
		else {
			icon.src = gBrowser.selectedTab.getAttribute("image");
		}
		// -- title
		document.getElementById("ScrapBookEditTitle").value =  aID ? this.item.title : gBrowser.selectedTab.label;
		try { document.getElementById("ScrapBookEditTitle").editor.transactionManager.clear(); } catch(ex) {}
		// -- comment
		this.COMMENT.value = aID ? this.item.comment.replace(/ __BR__ /g, this.multiline ? "\n" : "\t") : "";
		var restoredComment = sbCommonUtils.documentData(window.content.document, "comment");
		if (restoredComment) this.COMMENT.value = restoredComment;
		try { this.COMMENT.editor.transactionManager.clear(); } catch(ex) {}
		// -- inner link and attach file button
		document.getElementById("ScrapBookEditAnnotation").firstChild.childNodes[1].disabled = (aID == null);
		document.getElementById("ScrapBookEditAnnotation").firstChild.childNodes[2].disabled = (aID == null);
		// -- refresh the toolbar
		if ( aID && this.item.lock == "true" ) {
			// locked items cannot be edited, simply show a disabled toolbar
			// sbDOMEraser.init(0);  // included in disable(true)
			sbHtmlEditor.init(null, 0);
			this.disable(true);
		}
		else {
			sbDOMEraser.init(0);
			// sbHtmlEditor.init(null, 2);  // included in disable(false)
			this.disable(false);
		}
		this.showHide(true);

		// settings for the page, only if it's first load
		if ( !sbCommonUtils.documentData(window.content.document, "inited") ) {
			sbCommonUtils.documentData(window.content.document, "inited", true);
			if ( aID ) {
				try { window.content.removeEventListener("beforeunload", this.handleUnloadEvent, true); } catch(ex){}
				window.content.addEventListener("beforeunload", this.handleUnloadEvent, true);
			}
			sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
				sbAnnotationService.initEvent(win, 1);
				this.initEvent(win, 1);
				this.documentLoad(win.document, function(doc){
					sbPageEditor.documentBeforeEdit(doc);
				}, this);
			}, this);
			if (this.item && this.item.lock != "true" && this.item.type == "notex" && sbCommonUtils.getPref("edit.autoEditNoteX", true)) {
				this.documentLoad(window.content.document, function(doc){
					// check document type and make sure it's a file
					if (doc.contentType != "text/html") return;
					// turn on HTMLEditor, without marking as changed
					var _changed = sbCommonUtils.documentData(doc, "changed");
					sbHtmlEditor.init(window.content.document, 1);
					if (!_changed) sbCommonUtils.documentData(doc, "changed", false);
				}, this);
			}
		}
	},

	uninit : function()
	{
		sbHtmlEditor.init(null, 0);
		this.disable(true);
	},

	documentLoad : function(aDoc, aCallback, aThisArg)
	{
		if (aDoc.readyState === 'complete') {
			aCallback.call(aThisArg, aDoc);
			return;
		}
		aDoc.defaultView.addEventListener("load", function(aEvent){
			var doc = aEvent.originalTarget;
			aCallback.call(aThisArg, doc);
		}, true);
	},

	// aStateFlag
	//   0: disable
	//   1: enable
	initEvent : function(aWindow, aStateFlag)
	{
		try { aWindow.document.removeEventListener("keydown", this.handleKeyEvent, true); } catch(ex){}
		if (aStateFlag == 1) {
			aWindow.document.addEventListener("keydown", this.handleKeyEvent, true);
		}
	},

	handleKeyEvent : function(aEvent)
	{
		if (!sbPageEditor.enabled || sbHtmlEditor.enabled || sbDOMEraser.enabled) return;
		// F9
		if (aEvent.keyCode == aEvent.DOM_VK_F9 &&
			!aEvent.altKey && !aEvent.ctrlKey && !aEvent.shiftKey && !aEvent.metaKey) {
			sbDOMEraser.init(1);
			aEvent.preventDefault();
			return;
		}
		// F10
		if (aEvent.keyCode == aEvent.DOM_VK_F10 &&
			!aEvent.altKey && !aEvent.ctrlKey && !aEvent.shiftKey && !aEvent.metaKey) {
			sbHtmlEditor.init(null, 1);
			aEvent.preventDefault();
			return;
		}
		// 1-8 or Alt + 1-8
		var idx = aEvent.keyCode - (aEvent.DOM_VK_1 - 1);
		if ((idx >= 1) && (idx <= 8) &&
			!aEvent.ctrlKey && !aEvent.shiftKey && !aEvent.metaKey) {
			sbPageEditor.highlight(idx);
			return;
		}
	},

	handleUnloadEvent : function(aEvent)
	{
		if (sbPageEditor.checkModify()) {
			// The message only work for Firefox 3.*
			// Else it only fires a default prompt to confirm whether to exit
			aEvent.returnValue = sbCommonUtils.lang("overlay", "EDIT_SAVE_CHANGES");
		}
	},

	toggleComment : function()
	{
		this.multiline = !this.multiline;
		var val = this.COMMENT.value;
		this.COMMENT.setAttribute("multiline", this.multiline);
		this.COMMENT.setAttribute("style", this.multiline ? "height:100px;" : "padding:2px;");
		if ( this.multiline ) {
			document.getElementById("ScrapBookToggleComment").setAttribute("tooltiptext", sbCommonUtils.lang("overlay", "MIN_COMMENT"));
			document.getElementById("ScrapBookToolbox").appendChild(this.COMMENT);
			val = val.replace(/\t/g, "\n");
		} else {
			document.getElementById("ScrapBookToggleComment").setAttribute("tooltiptext", sbCommonUtils.lang("overlay", "MAX_COMMENT"));
			this.TOOLBAR.insertBefore(this.COMMENT, document.getElementById("ScrapBookHighlighterPreview"));
			val = val.replace(/\n/g, "\t");
		}
		document.getElementById("ScrapBookEditSpacer").setAttribute("flex", this.multiline ? 1 : 0);
		this.COMMENT.value = val;
		this.COMMENT.focus();
	},

	onInputComment: function(aValue)
	{
		sbCommonUtils.documentData(window.content.document, "comment", aValue);
		sbCommonUtils.documentData(window.content.document, "propertyChanged", true);
	},

	getSelection : function(aWindow)
	{
		var selText = aWindow.getSelection();
		var sel = selText.QueryInterface(Components.interfaces.nsISelectionPrivate);
		var isSelected = false;
		try {
			isSelected = ( sel.anchorNode == sel.focusNode && sel.anchorOffset == sel.focusOffset ) ? false : true;
		} catch(ex) {
			isSelected = false;
		}
		return isSelected ? sel : false;
	},

	getSelectionHTML : function(aSelection)
	{
		var range = aSelection.getRangeAt(0);
		var content = range.cloneContents();
		var elem = aSelection.anchorNode.ownerDocument.createElement("DIV");
		elem.appendChild(content);
		return elem.innerHTML;
	},

	cutter : function()
	{
		var win = sbCommonUtils.getFocusedWindow();
		var sel = this.getSelection(win);
		if ( !sel ) return;
		this.allowUndo(win.document);
		sel.deleteFromDocument();
	},

	highlight : function(idx)
	{
		if ( !idx ) idx = document.getElementById("ScrapBookHighlighter").getAttribute("color") || 8;	//DropDownList
		document.getElementById("ScrapBookHighlighter").setAttribute("color", idx);
		var attr = {};
		attr["style"] = sbCommonUtils.getPref("highlighter.style." + idx, sbHighlighter.PRESET_STYLES[idx]);	//DropDownList
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighterPreview"), attr["style"]);	//DropDownList
		var win = sbCommonUtils.getFocusedWindow();
		var sel = this.getSelection(win);
		if ( !sel ) return;
		this.allowUndo(win.document);
		attr["data-sb-obj"] = "linemarker";
		attr["class"] = "linemarker-marked-line";
		sbHighlighter.set(win, sel, "span", attr);
	},

	removeSbObjectsSelected : function()
	{
		var win = sbCommonUtils.getFocusedWindow();
		var sel = this.getSelection(win);
		if ( !sel ) return;
		this.allowUndo(win.document);
		var selRange  = sel.getRangeAt(0);
		var node = selRange.startContainer;
		if ( node.nodeName == "#text" ) node = node.parentNode;
		var nodeRange = win.document.createRange();
		var nodeToDel = [];
		traceTree : while ( true )
		{
			nodeRange.selectNode(node);
			if ( nodeRange.compareBoundaryPoints(Range.START_TO_END, selRange) > -1 )
			{
				if ( nodeRange.compareBoundaryPoints(Range.END_TO_START, selRange) > 0 ) break;
				else if ( node.nodeType === 1 && sbCommonUtils.getSbObjectRemoveType(node) != 0 )
				{
					nodeToDel.push(node);
				}
			}
			if ( node.hasChildNodes() ) node = node.firstChild;
			else
			{
				while ( !node.nextSibling ) { node = node.parentNode; if ( !node ) break traceTree; }
				node = node.nextSibling;
			}
		}
		for ( var i = 0, len = nodeToDel.length; i < len; ++i ) this.removeSbObj(nodeToDel[i]);
	},

	removeSbObjects : function()
	{
		var nodeToDel = [];
		sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
			var doc = win.document;
			this.allowUndo(doc);
			var elems = doc.getElementsByTagName("*");
			for ( var i = 0; i < elems.length; i++ ) {
				if ( sbCommonUtils.getSbObjectRemoveType(elems[i]) != 0 ) nodeToDel.push(elems[i]);
			}
		}, this);
		for ( var i = 0, len = nodeToDel.length; i < len; ++i ) this.removeSbObj(nodeToDel[i]);
	},

	removeElementsByTagName : function(aTagName)
	{
		sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
			var doc = win.document;
			this.allowUndo(doc);
			var elems = doc.getElementsByTagName(aTagName), todo = [];
			for ( var i = 0; i < elems.length; i++ ) {
				sbContentSaver.removeNodeFromParent(elems[i]);
			}
		}, this);
	},

	removeSbObj : function(aNode)
	{
		switch (sbCommonUtils.getSbObjectRemoveType(aNode)) {
			case 1:
				aNode.parentNode.removeChild(aNode);
				break;
			case 2:
				this.unwrapNode(aNode);
				break;
		}
	},

	unwrapNode : function(aNode)
	{
		var childs = aNode.childNodes;
		var parent = aNode.parentNode;
		while ( childs.length ) parent.insertBefore(childs[0], aNode);
		parent.removeChild(aNode);
		parent.normalize();
	},

	selection2Title : function(aElement)
	{
		var win = sbCommonUtils.getFocusedWindow();
		var sel = this.getSelection(win);
		if ( !sel ) return;
		aElement.value = sbCommonUtils.crop(sel.toString().replace(/[\r\n\t\s]+/g, " "), 100);
		sel.removeAllRanges();
		sbCommonUtils.documentData(window.content.document, "propertyChanged", true);
	},

	restore : function()
	{
		window.sbBrowserOverlay.lastLocation = "";
		// this will then fire the beforeunload event and enter the event handler
		window.content.location.reload();
	},

	exit : function()
	{
		if ( sbDOMEraser.enabled ) sbDOMEraser.init(0);
		this.showHide(false);
		this.uninit();
	},

	allowUndo : function(aDoc)
	{
		aDoc = aDoc || sbCommonUtils.getFocusedWindow().document;
		var histories = sbCommonUtils.documentData(aDoc, "histories");
		if (!histories) sbCommonUtils.documentData(aDoc, "histories", histories = []);
		if (aDoc.body) {
			histories.push(aDoc.body.cloneNode(true));
			sbCommonUtils.documentData(aDoc, "changed", true);
		}
	},

	undo : function(aDoc)
	{
		aDoc = aDoc || sbCommonUtils.getFocusedWindow().document;
		var histories = sbCommonUtils.documentData(aDoc, "histories");
		if (!histories) sbCommonUtils.documentData(aDoc, "histories", histories = []);
		while ( histories.length ) {
			var prevBody = histories.pop();
			if (!sbCommonUtils.isDeadObject(prevBody)) {
				sbCommonUtils.documentData(aDoc, "changed", true);
				aDoc.body.parentNode.replaceChild(prevBody, aDoc.body);
				return true;
			}
		}
		sbCommonUtils.alert( sbCommonUtils.lang("overlay", "EDIT_UNDO_LAST") );
		return false;
	},

	checkModify : function()
	{
		if ( sbCommonUtils.documentData(window.content.document, "propertyChanged") ) this.saveResource();
		var changed = false;
		sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
			if (sbCommonUtils.documentData(win.document, "changed")) changed = true;
		}, this);
		return changed;
	},

	saveOrCapture : function(aBypassDialog)
	{
		if ( sbBrowserOverlay.getID() ) {
			this.savePage();
			this.saveResource();
		}
		else {
			sbDOMEraser.init(0);
			sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
				this.documentBeforeSave(win.document);
			}, this);
			var ret = sbBrowserOverlay.execCapture(0, null, !aBypassDialog, "urn:scrapbook:root");
			if ( ret ) {
				this.exit();
				return;
			}
			sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
				this.documentAfterSave(win.document);
			}, this);
		}
	},

	savePage : function()
	{
		// if for some reason the item no longer exists, abort
		if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.disable(true); return; }
		// acquires the id from current uri and check again for safe
		var curURL = window.content.location.href;
		if (sbBrowserOverlay.getID(curURL) != this.item.id) {
			sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_SAVE_FILE", [curURL]));
			return;
		}
		// Do not allow locked items be saved
		// use the newest value from datesource since the user could change it after loading this page
		if (sbDataSource.getProperty(sbBrowserOverlay.resource, "lock") == "true") {
			sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "MSG_CANT_SAVE_LOCKED"));
			return;
		}
		// check pass, exec the saving
		sbDOMEraser.init(0);
		this.disable(true);
		sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
			var doc = win.document;
			if ( doc.contentType != "text/html" ) {
			    sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "MSG_CANT_MODIFY", [doc.contentType]));
				return;
			}
			var charset = doc.characterSet;
			if (charset != "UTF-8") {
			    sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "MSG_NOT_UTF8", [doc.location.href]));
			}
			this.documentBeforeSave(doc);
			var rootNode = doc.getElementsByTagName("html")[0];
			var src = sbContentSaver.doctypeToString(doc.doctype) + sbCommonUtils.getOuterHTML(rootNode, true);
			var file = sbCommonUtils.convertURLToFile(doc.location.href);
			sbCommonUtils.writeFile(file, src, charset);
			this.documentAfterSave(doc);
			sbCommonUtils.documentData(doc, "changed", false);
		}, this);
		window.setTimeout(function() { window.content.stop(); sbPageEditor.disable(false); }, 500);
	},

	saveResource : function()
	{
		if ( !this.item ) return;
		if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.disable(true); return; }
		var newTitle   = document.getElementById("ScrapBookEditTitle").value;
		var newComment = sbCommonUtils.escapeComment(this.COMMENT.value);
		if ( newTitle != this.item.title || newComment != this.item.comment )
		{
			sbDataSource.setProperty(sbBrowserOverlay.resource, "title",   newTitle);
			sbDataSource.setProperty(sbBrowserOverlay.resource, "comment", newComment);
			this.item.title   = newTitle;
			this.item.comment = newComment;
			sbCommonUtils.writeIndexDat(this.item);
		}
		sbCommonUtils.documentData(window.content.document, "comment", null);
		sbCommonUtils.documentData(window.content.document, "propertyChanged", false);
	},

	// Currently we have 3 functions dealing with the toolbar state
	//   1. disable
	//   2. DOMEraser
	//   3. HTMLEditor
	// To prevent conflict:
	//   - we should turn off DOMEraser before disable or it's effect will persist
	//   - we should refresh HTMLEditor after since it may be on and should not get all disabled
	disable : function(aBool)
	{
		this.enabled = !aBool;
		if (aBool) sbDOMEraser.init(0);
		var elems = this.TOOLBAR.childNodes;
		for ( var i = 0; i < elems.length; i++ ) elems[i].disabled = aBool;
		if (!aBool) sbHtmlEditor.init(null, 2);
	},

	toggle : function()
	{
		var id = sbBrowserOverlay.getID();
		if ( !id ) return;
		this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
		sbBrowserOverlay.editMode = this.TOOLBAR.hidden;
		this.TOOLBAR.hidden ? this.init(id) : this.exit();
	},

	showHide : function(willShow)
	{
		this.COMMENT.hidden = !willShow;
		this.TOOLBAR.hidden = !willShow;
		willShow ? this.TOOLBAR.setAttribute("moz-collapsed", "false") : this.TOOLBAR.removeAttribute("moz-collapsed");
		sbInfoViewer.optimize();
	},


	applyStyle : function(aWindow, aID, aString)
	{
		if ( aWindow.document.getElementById(aID) )
		{
			return;
		}
		var newNode = aWindow.document.createElement("style");
		newNode.setAttribute("data-sb-obj", "stylesheet");
		newNode.setAttribute("media", "screen");
		newNode.setAttribute("type", "text/css");
		newNode.setAttribute("id", aID);
		newNode.appendChild(aWindow.document.createTextNode(aString));
		var headNode = aWindow.document.getElementsByTagName("head")[0];
		if ( headNode ) headNode.appendChild(newNode);
	},

	removeStyle : function(aWindow, aID)
	{
		try { sbContentSaver.removeNodeFromParent(aWindow.document.getElementById(aID)); } catch(ex) {}
	},

	documentBeforeEdit : function(aDoc)
	{
		if (this.item && document.getElementById("ScrapBookStatusPopupD").getAttribute("checked") && 
			this.item.type != "notex") {
			sbInfoViewer.indicateLinks(aDoc.defaultView);
		}
	},

	documentBeforeSave : function(aDoc)
	{
		// save all sticky
		var nodes = aDoc.getElementsByTagName("div");
		for ( var i = nodes.length - 1; i >= 0 ; i-- ) {
			var node = nodes[i];
			if ( sbCommonUtils.getSbObjectType(node) == "sticky" && node.getAttribute("data-sb-active")) {
				sbAnnotationService.saveSticky(node);
			}
		}
		// remove all scrapbook inserted styles
		var nodes = aDoc.getElementsByTagName("style");
		for ( var i = nodes.length - 1; i >= 0 ; i-- ) {
			var node = nodes[i];
			if ( sbCommonUtils.getSbObjectType(node) == "stylesheet") {
				sbContentSaver.removeNodeFromParent(node);
			}
		}
		// record the status of todo form elements
		var nodes = aDoc.getElementsByTagName("input");
		for ( var i = nodes.length - 1; i >= 0 ; i-- ) {
			var node = nodes[i];
			if ( sbCommonUtils.getSbObjectType(node) == "todo") {
				switch (node.type.toLowerCase()) {
					case "checkbox":
					case "radio":
						if (node.checked)
							node.setAttribute("checked", "checked");
						else
							node.removeAttribute("checked");
						break;
					case "text":
						node.setAttribute("value", node.value);
						break;
				}
			}
		}
		var nodes = aDoc.getElementsByTagName("textarea");
		for ( var i = nodes.length - 1; i >= 0 ; i-- ) {
			var node = nodes[i];
			if ( sbCommonUtils.getSbObjectType(node) == "todo") {
				node.innerHTML = sbCommonUtils.escapeHTML(node.value, true);
			}
		}
	},

	documentAfterSave : function(aDoc)
	{
		this.documentBeforeEdit(aDoc);
	},
};



var sbHtmlEditor = {

	enabled : false,
	_shortcut_table : {
		"F10" : "quit",
		"Ctrl+S" : "save",

		"Ctrl+K" : "removeFormat",
		"Ctrl+B" : "bold",
		"Ctrl+I" : "italic",
		"Ctrl+U" : "underline",
		"Ctrl+T" : "strikeThrough",
		"Ctrl+E" : "setColor",
		"Alt+Up" : "increaseFontSize",
		"Alt+Down" : "decreaseFontSize",
		"Alt+K" : "superscript",
		"Alt+J" : "subscript",

		"Alt+0" : "formatblock_p",
		"Alt+1" : "formatblock_h1",
		"Alt+2" : "formatblock_h2",
		"Alt+3" : "formatblock_h3",
		"Alt+4" : "formatblock_h4",
		"Alt+5" : "formatblock_h5",
		"Alt+6" : "formatblock_h6",
		"Alt+7" : "formatblock_blockquote",
		"Alt+8" : "formatblock_pre",

		"Alt+U" : "insertUnorderedList",
		"Alt+O" : "insertOrderedList",
		"Alt+Open_Bracket" : "outdent",
		"Alt+Close_Bracket" : "indent",
		"Alt+Comma" : "justifyLeft",
		"Alt+Period" : "justifyRight",
		"Alt+M" : "justifyCenter",

		"Ctrl+Shift+K" : "unlink",
		"Ctrl+L" : "attachLink",
		"Alt+I" : "attachFile",

		"Alt+H" : "horizontalLine",
		"Alt+D" : "insertDate",
		"Ctrl+Shift+C" : "insertTodoBox",
		"Ctrl+Alt+Shift+C" : "insertTodoBoxDone",
		"Ctrl+Alt+1" : "wrapHTML1",
		"Ctrl+Alt+2" : "wrapHTML2",
		"Ctrl+Alt+3" : "wrapHTML3",
		"Ctrl+Alt+4" : "wrapHTML4",
		"Ctrl+Alt+5" : "wrapHTML5",
		"Ctrl+Alt+6" : "wrapHTML6",
		"Ctrl+Alt+7" : "wrapHTML7",
		"Ctrl+Alt+8" : "wrapHTML8",
		"Ctrl+Alt+9" : "wrapHTML9",
		"Ctrl+Alt+0" : "wrapHTML0",
		"Ctrl+Alt+I" : "insertSource",
	},

	currentDocument : function(aMainDoc)
	{
		if (!aMainDoc) aMainDoc = window.content.document;
		return sbCommonUtils.documentData(aMainDoc, "sbHtmlEditor.document");
	},

	// aStateFlag
	//   0: disable (for all window documents)
	//   1: enable  (for a specific window document)
	//   2: refresh (updates toolbar)
	init : function(aDoc, aStateFlag)
	{
		aDoc = aDoc || sbCommonUtils.getFocusedWindow().document;
		var enabled = sbCommonUtils.documentData(window.content.document, "sbHtmlEditor.enabled") || false;
		if ( aStateFlag === undefined ) aStateFlag = enabled ? 0 : 1;
		this.enabled = enabled = (aStateFlag === 2) ? enabled : (aStateFlag == 1);
		document.getElementById("ScrapBookEditHTML").checked = enabled;
		document.getElementById("ScrapBookHighlighter").disabled = enabled;
		document.getElementById("ScrapBookEditAnnotation").disabled = enabled;
		document.getElementById("ScrapBookEditCutter").disabled = enabled;
		document.getElementById("ScrapBookEditEraser").disabled = enabled;
		document.getElementById("ScrapBookEditUndo").disabled = enabled;
		if ( aStateFlag == 1 ) {
			sbCommonUtils.documentData(window.content.document, "sbHtmlEditor.enabled", true);
			sbCommonUtils.documentData(window.content.document, "sbHtmlEditor.document", aDoc);
			sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
				if ( win.document.designMode != "off" && win.document != aDoc ) {
					win.document.designMode = "off";
				}
				this.initEvent(win, 1);
				sbAnnotationService.initEvent(win, 0);
			}, this);
			if ( aDoc.designMode != "on" ) {
				var sel = aDoc.defaultView.getSelection();
				// backup original selection ranges
				var ranges = [];
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
				var sel = aDoc.defaultView.getSelection();
				sel.removeAllRanges();
				for (var i=0, len=ranges.length; i<len; i++) {
					sel.addRange(ranges[i]);
				}
			}
		}
		else if ( aStateFlag == 0 ) {
			sbCommonUtils.documentData(window.content.document, "sbHtmlEditor.enabled", false);
			sbCommonUtils.documentData(window.content.document, "sbHtmlEditor.document", null);
			sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
				if ( win.document.designMode != "off" ) {
					win.document.designMode = "off";
				}
				this.initEvent(win, 0);
				sbAnnotationService.initEvent(win, 1);
			}, this);
		}
	},

	initEvent : function(aWindow, aStateFlag)
	{
		aWindow.document.removeEventListener("keydown", this.handleKeyEvent, true);
		aWindow.document.removeEventListener("input", this.handleInputEvent, true);
		if (aStateFlag == 1) {
			aWindow.document.addEventListener("keydown", this.handleKeyEvent, true);
			aWindow.document.addEventListener("input", this.handleInputEvent, true);
		}
	},

	handleInputEvent : function(aEvent)
	{
		var doc = aEvent.originalTarget.ownerDocument;
		sbCommonUtils.documentData(doc, "changed", true);
	},

	handleKeyEvent : function(aEvent)
	{
		// set variables and check whether it's a defined hotkey combination
		var shortcut = Shortcut.fromEvent(aEvent);
		var key = shortcut.toString();
		var callback_name = sbHtmlEditor._shortcut_table[key];
		if (!callback_name) return;

		// now we are sure we have the hotkey
		var callback = sbHtmlEditor[callback_name];
		aEvent.preventDefault();

		// check the document is editable and set
		var doc = sbHtmlEditor.currentDocument();
		if (!doc.body || doc.designMode != "on") return;

		// The original key effect could not be blocked completely
		// if the command has a prompt or modal window that blocks.
		// Therefore we call the callback command using an async workaround.
		setTimeout(function(){
			callback.call(sbHtmlEditor, doc);
		}, 0);
	},

	quit : function(aDoc)
	{
		sbHtmlEditor.init(null, 0);
	},

	save : function(aDoc)
	{
		sbPageEditor.saveOrCapture();
	},

	removeFormat : function(aDoc)
	{
		aDoc.execCommand("removeFormat", false, null);
	},

	bold : function(aDoc)
	{
		aDoc.execCommand("bold", false, null);
	},

	italic : function(aDoc)
	{
		aDoc.execCommand("italic", false, null);
	},

	underline : function(aDoc)
	{
		aDoc.execCommand("underline", false, null);
	},

	strikeThrough : function(aDoc)
	{
		aDoc.execCommand("strikeThrough", false, null);
	},

	setColor : function(aDoc)
	{
		var data = {};
		// prompt the dialog for user input
		var accepted = window.top.openDialog("chrome://scrapbook/content/editor_color.xul", "ScrapBook:PickColor", "chrome,modal,centerscreen", data);
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

	increaseFontSize : function(aDoc)
	{
		aDoc.execCommand("increaseFontSize", false, null);
	},

	decreaseFontSize : function(aDoc)
	{
		aDoc.execCommand("decreaseFontSize", false, null);
	},

	superscript : function(aDoc)
	{
		aDoc.execCommand("superscript", false, null);
	},

	subscript : function(aDoc)
	{
		aDoc.execCommand("subscript", false, null);
	},

	formatblock_p : function(aDoc)
	{
		aDoc.execCommand("formatblock", false, "p");
	},

	formatblock_h1 : function(aDoc)
	{
		aDoc.execCommand("formatblock", false, "h1");
	},

	formatblock_h2 : function(aDoc)
	{
		aDoc.execCommand("formatblock", false, "h2");
	},

	formatblock_h3 : function(aDoc)
	{
		aDoc.execCommand("formatblock", false, "h3");
	},

	formatblock_h4 : function(aDoc)
	{
		aDoc.execCommand("formatblock", false, "h4");
	},

	formatblock_h5 : function(aDoc)
	{
		aDoc.execCommand("formatblock", false, "h5");
	},

	formatblock_h6 : function(aDoc)
	{
		aDoc.execCommand("formatblock", false, "h6");
	},

	formatblock_blockquote : function(aDoc)
	{
		aDoc.execCommand("formatblock", false, "blockquote");
	},

	formatblock_pre : function(aDoc)
	{
		aDoc.execCommand("formatblock", false, "pre");
	},

	insertUnorderedList : function(aDoc)
	{
		aDoc.execCommand("insertUnorderedList", false, null);
	},

	insertOrderedList : function(aDoc)
	{
		aDoc.execCommand("insertOrderedList", false, null);
	},

	outdent : function(aDoc)
	{
		aDoc.execCommand("outdent", false, null);
	},

	indent : function(aDoc)
	{
		aDoc.execCommand("indent", false, null);
	},

	justifyLeft : function(aDoc)
	{
		aDoc.execCommand("justifyLeft", false, null);
	},

	justifyRight : function(aDoc)
	{
		aDoc.execCommand("justifyRight", false, null);
	},

	justifyCenter : function(aDoc)
	{
		aDoc.execCommand("justifyCenter", false, null);
	},

	unlink : function(aDoc)
	{
		aDoc.execCommand("unlink", false, null);
	},

	attachLink : function(aDoc)
	{
		var sel = aDoc.defaultView.getSelection();
		// fill the selection it looks like an URL
		// use a very wide standard, which allows as many cases as may be used
		var selText = sel.toString();
		if (selText && selText.match(/^(\w+:[^\t\n\r\v\f]*)/i)) {
			var url = RegExp.$1;
		}
		// retrieve selected id from sidebar
		// -- if the sidebar is closed, we may get an error
		try {
			var sidebarId = sbCommonUtils.getSidebarId("sidebar");
			var res = document.getElementById(sidebarId).contentWindow.sbTreeHandler.getSelection(true, 2);
		}
		catch (ex) {
		}
		// -- check the selected resource
		if (res && res.length) {
			res = res[0];
			var type = sbDataSource.getProperty(res, "type");
			if ( ["folder", "separator"].indexOf(type) === -1 ) {
				var id = sbDataSource.getProperty(res, "id");
			}
		}
		// prompt the dialog for user input
		var data = {
			id: id,
			url: url,
			item: sbPageEditor.item,
		};
		var accepted = window.top.openDialog("chrome://scrapbook/content/editor_link.xul", "ScrapBook:AttachLink", "chrome,modal,centerscreen,resizable", data);
		if (data.result != 1) return;
		// insert link?
		if (data.url_use) {
			// attach the link
			if (data.format) {
				var URL = data.url;
				var THIS = sel.isCollapsed ? URL : sbPageEditor.getSelectionHTML(sel);
				var TITLE = "";
				var html = data.format.replace(/{(TITLE|URL|THIS)}/g, function(){
					switch (arguments[1]) {
						case "TITLE": return TITLE;
						case "URL": return URL;
						case "THIS": return THIS;
					}
					return "";
				});
				aDoc.execCommand("insertHTML", false, html);
			}
		}
		// insert inner link?
		else if (data.id_use) {
			// we can construct inner link only for those with valid id
			if (!sbPageEditor.item) return;
			var id = data.id;
			// check the specified id
			var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
			if ( sbDataSource.exists(res) ) {
				var type = sbDataSource.getProperty(res, "type");
				if ( ["folder", "separator"].indexOf(type) !== -1 ) {
					res = null;
				}
			}
			else res = null;
			// if it's invalid, alert and quit
			if (!res) {
				sbCommonUtils.PROMPT.alert(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_INNERLINK_TITLE"), sbCommonUtils.lang("overlay", "EDIT_ATTACH_INNERLINK_INVALID", [id]));
				return;
			}
			// attach the link
			if (data.format) {
				var TITLE = sbDataSource.getProperty(res, "title");
				var URL = (type == "bookmark") ? sbDataSource.getProperty(res, "source") : makeRelativeLink(aDoc.location.href, sbPageEditor.item.id, id);
				var THIS = sel.isCollapsed ? TITLE : sbPageEditor.getSelectionHTML(sel);
				var html = data.format.replace(/{(TITLE|URL|THIS)}/g, function(){
					switch (arguments[1]) {
						case "TITLE": return TITLE;
						case "URL": return URL;
						case "THIS": return THIS;
					}
					return "";
				});
				aDoc.execCommand("insertHTML", false, html);
			}
		}
		
		function makeRelativeLink(aBaseURL, aBaseId, aTargetId) {
			var result = "";
			var contDir = sbCommonUtils.getContentDir(aBaseId);
			var checkFile = sbCommonUtils.convertURLToFile(aBaseURL);
			while (!checkFile.equals(contDir)){
				result += "../";
				checkFile = checkFile.parent;
			}
			return result = result + aTargetId + "/index.html";
		}
	},

	attachFile : function(aDoc)
	{
		// we can upload file only for those with valid id
		if (!sbPageEditor.item) return;
		// check if the current page is local and get its path
		var htmlFile = sbCommonUtils.convertURLToFile(aDoc.location.href);
		if (!htmlFile) return;
		// init
		var sel = aDoc.defaultView.getSelection();
		// prompt the dialog for user input
		var data = {};
		var accepted = window.top.openDialog("chrome://scrapbook/content/editor_file.xul", "ScrapBook:AttachFile", "chrome,modal,centerscreen", data);
		if (data.result != 1) return;
		// insert file ?
		if (data.file_use) {
			// copy the selected file
			var destFile = htmlFile.parent.clone();
			destFile.append(data.file.leafName);
			if ( destFile.exists() && destFile.isFile() ) {
				if ( !sbCommonUtils.PROMPT.confirm(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_OVERWRITE", [data.file.leafName])) ) return;
				destFile.remove(false);
			}
			try {
				data.file.copyTo(destFile.parent, data.file.leafName);
			} catch(ex) {
				sbCommonUtils.PROMPT.alert(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_INVALID", [data.file.leafName]));
				return;
			}
			// insert to the document
			if (data.format) {
				var FILE = data.file.leafName;
				var THIS = sel.isCollapsed ? FILE : sbPageEditor.getSelectionHTML(sel);
				var html = data.format.replace(/{(FILE|THIS)}/g, function(){
					switch (arguments[1]) {
						case "FILE": return FILE;
						case "THIS": return THIS;
					}
					return "";
				});
				aDoc.execCommand("insertHTML", false, html);
			}
		}
		// insert html ?
		else if (data.html_use) {
			var filename = data.html + ".html";
			var destFile = htmlFile.parent.clone();
			destFile.append(filename);
			if ( destFile.exists() && destFile.isFile() && filename != "index.html" ) {
				if ( !sbCommonUtils.PROMPT.confirm(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_OVERWRITE", [filename])) ) return;
				destFile.remove(false);
			}
			// check the template file, create one if not exist
			var template = sbCommonUtils.getScrapBookDir().clone();
			template.append("notex_template.html");
			if ( !template.exists() ) sbCommonUtils.saveTemplateFile("chrome://scrapbook/content/notex_template.html", template);
			// create content
			var content = sbCommonUtils.readFile(template);
			content = sbCommonUtils.convertToUnicode(content, "UTF-8");
			try {
				if (filename == "index.html") throw "";  // do not allow to overwrite index page
				sbCommonUtils.writeFile(destFile, content, "UTF-8");
			} catch(ex) {
				sbCommonUtils.PROMPT.alert(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_INVALID", [filename]));
				return;
			}
			// insert to the document
			if (data.format) {
				var FILE = filename;
				var THIS = sel.isCollapsed ? FILE : sbPageEditor.getSelectionHTML(sel);
				var html = data.format.replace(/{(FILE|THIS)}/g, function(){
					switch (arguments[1]) {
						case "FILE": return FILE;
						case "THIS": return THIS;
					}
					return "";
				});
				aDoc.execCommand("insertHTML", false, html);
			}
		}
	},

	horizontalLine : function(aDoc)
	{
		var html = '<hr/>';
		aDoc.execCommand("insertHTML", false, html);
	},

	insertDate : function(aDoc)
	{
        var d = new Date();
		var fmt = sbCommonUtils.getPref("edit.insertDateFormat", "") || "%Y-%m-%d %H:%M:%S";
		aDoc.execCommand("insertHTML", false, d.strftime(fmt));
	},

	insertTodoBox : function(aDoc)
	{
		var html = '<input type="checkbox" data-sb-obj="todo" />';
		aDoc.execCommand("insertHTML", false, html);
	},

	insertTodoBoxDone : function(aDoc)
	{
		var html = '<input type="checkbox" data-sb-obj="todo" checked="checked" />';
		aDoc.execCommand("insertHTML", false, html);
	},

	wrapHTML1 : function(aDoc)
	{
		this._wrapHTML(aDoc, 1);
	},

	wrapHTML2 : function(aDoc)
	{
		this._wrapHTML(aDoc, 2);
	},

	wrapHTML3 : function(aDoc)
	{
		this._wrapHTML(aDoc, 3);
	},

	wrapHTML4 : function(aDoc)
	{
		this._wrapHTML(aDoc, 4);
	},

	wrapHTML5 : function(aDoc)
	{
		this._wrapHTML(aDoc, 5);
	},

	wrapHTML6 : function(aDoc)
	{
		this._wrapHTML(aDoc, 6);
	},

	wrapHTML7 : function(aDoc)
	{
		this._wrapHTML(aDoc, 7);
	},

	wrapHTML8 : function(aDoc)
	{
		this._wrapHTML(aDoc, 8);
	},

	wrapHTML9 : function(aDoc)
	{
		this._wrapHTML(aDoc, 9);
	},

	wrapHTML0 : function(aDoc)
	{
		this._wrapHTML(aDoc, 0);
	},

	_wrapHTML : function(aDoc, aIdx)
	{
		var sel = aDoc.defaultView.getSelection();
		var html = sel.isCollapsed ? "{THIS}" : sbPageEditor.getSelectionHTML(sel);
		var wrapper = sbCommonUtils.getPref("edit.wrapperFormat." + aIdx, "") || "<code>{THIS}</code>";
		html = wrapper.replace(/{THIS}/g, html);
		aDoc.execCommand("insertHTML", false, html);
	},
	
	insertSource : function(aDoc)
	{
		var sel = aDoc.defaultView.getSelection();
		var collapsed = sel.isCollapsed;
		var data = {value:""};
		if (!collapsed) {
			// backup original selection ranges
			var ranges = [];
			for (var i=0, len=sel.rangeCount; i<len; i++) {
				ranges.push(sel.getRangeAt(i))
			}
			// get selection area to edit
			if (sbCommonUtils.getPref("edit.extendSourceEdit", true)) {
				// reset selection to the common ancestor container of the first range
				var node = ranges[0].commonAncestorContainer;
				if (node.nodeName == "#text") node = node.parentNode;
				var range = aDoc.createRange();
				range.selectNodeContents(node);
				sel.removeAllRanges();
				sel.addRange(range);			
				// set data
				data.value = node.innerHTML;
			}
			else {
				// reset selection to the first range
				sel.removeAllRanges();
				sel.addRange(ranges[0]);
				// set data
				data.value = sbPageEditor.getSelectionHTML(sel);
			}
		}
		// prompt the dialog for user input
		window.top.openDialog("chrome://scrapbook/content/editor_source.xul", "ScrapBook:EditSource", "chrome,modal,centerscreen,resizable", data);
		// accepted, do the modify
		if (data.result) {
			aDoc.execCommand("insertHTML", false, data.value);
		}
		// cancled, restore the original selection if previously modified
		else if (!collapsed) {
			sel.removeAllRanges();
			for (var i=0, len=ranges.length; i<len; i++) {
				sel.addRange(ranges[i]);
			}
		}
	},

};



var sbDOMEraser = {

	enabled : false,
	verbose : 0,
	lastX : 0,
	lastY : 0,
	lastTarget : null,
	mouseTarget : null,
	widerStack : null,
	lastWindow : null,

	_shortcut_table : {
		"F9" : "quit",
		"Escape" : "quit",
		"Return" : "remove",
		"Space" : "remove",
		"Shift+Return" : "isolate",
		"Shift+Space" : "isolate",
		"Add" : "wider",
		"Subtract" : "narrower",
		"Shift+Equals" : "wider",
		"Hyphen_Minus" : "narrower",
		"W" : "wider",
		"N" : "narrower",
		"R" : "remove",
		"I" : "isolate",
		"B" : "blackOnWhite",
		"D" : "deWidthify",
		"U" : "undo",
		"Q" : "quit",
	},

	// aStateFlag
	//   0: disable
	//   1: enable
	init : function(aStateFlag)
	{
		var wasEnabled = this.enabled;
		this.enabled = (aStateFlag == 1);
		if (this.enabled == wasEnabled) return;
		document.getElementById("ScrapBookEditEraser").checked = this.enabled;
		document.getElementById("ScrapBookHighlighter").disabled = this.enabled;
		document.getElementById("ScrapBookEditAnnotation").disabled = this.enabled;
		document.getElementById("ScrapBookEditHTML").disabled  = this.enabled;
		document.getElementById("ScrapBookEditCutter").disabled  = this.enabled;

		if (aStateFlag == 0) {
			// revert last selected target
			if (this.lastTarget) {
				this._deselectNode();
				this.lastTarget = null;
			}
			// revert settings of the last window
			if (this.lastWindow) {
				sbCommonUtils.flattenFrames(this.lastWindow).forEach(function(win) {
					this.initEvent(win, 0);
					this.initStyle(win, 0);
					sbAnnotationService.initEvent(win, 1);
				}, this);
			}
		}
		else if (aStateFlag == 1) {
			this.lastWindow = window.content;
			this.verbose = 0;
			// apply settings to the current window
			sbCommonUtils.flattenFrames(this.lastWindow).forEach(function(win) {
				this.initEvent(win, 1);
				this.initStyle(win, 1);
				sbAnnotationService.initEvent(win, 0);
			}, this);
		}
	},

	initEvent : function(aWindow, aStateFlag)
	{
		aWindow.document.removeEventListener("mouseover", this.handleEvent, true);
		aWindow.document.removeEventListener("mousemove", this.handleEvent, true);
		aWindow.document.removeEventListener("mouseout",  this.handleEvent, true);
		aWindow.document.removeEventListener("click",     this.handleEvent, true);
		aWindow.document.removeEventListener("keydown",   this.handleKeyEvent, true);
		if ( aStateFlag == 1 ) {
			aWindow.document.addEventListener("mouseover", this.handleEvent, true);
			aWindow.document.addEventListener("mousemove", this.handleEvent, true);
			aWindow.document.addEventListener("mouseout",  this.handleEvent, true);
			aWindow.document.addEventListener("click",     this.handleEvent, true);
			aWindow.document.addEventListener("keydown",   this.handleKeyEvent, true);
		}
	},

	initStyle : function(aWindow, aStateFlag)
	{
		if ( aStateFlag == 1 ) {
			var estyle = "* { cursor: crosshair; }\n"
					   + "#scrapbook-eraser-tooltip { -moz-appearance: tooltip;"
					   + " position: absolute; z-index: 10000; margin-top: 32px; padding: 2px 3px; max-width: 40em;"
					   + " border: 1px solid InfoText; background-color: InfoBackground; color: InfoText; font: message-box; }";
			sbPageEditor.applyStyle(aWindow, "scrapbook-eraser-style", estyle);
		}
		else {
			sbPageEditor.removeStyle(aWindow, "scrapbook-eraser-style");
		}
	},

	handleKeyEvent : function(aEvent)
	{
		// set variables and check whether it's a defined hotkey combination
		var shortcut = Shortcut.fromEvent(aEvent);
		var key = shortcut.toString();
		var callback_name = sbDOMEraser._shortcut_table[key];
		if (!callback_name) return;

		// now we are sure we have the hotkey
		var callback = sbDOMEraser[callback_name];
		aEvent.preventDefault();

		// The original key effect could not be blocked completely
		// if the command has a prompt or modal window that blocks.
		// Therefore we call the callback command using an async workaround.
		setTimeout(function(){
			callback.call(sbDOMEraser, sbDOMEraser.lastTarget);
		}, 0);
	},

	handleEvent : function(aEvent)
	{
		aEvent.preventDefault();
		var elem = aEvent.target;
		var tagName = elem.nodeName.toLowerCase();
		if ( ["#document","scrollbar","html","body","frame","frameset"].indexOf(tagName) >= 0 ) return;
		sbDOMEraser.lastX = aEvent.pageX;
		sbDOMEraser.lastY = aEvent.pageY;
		if ( aEvent.type == "mouseover" ) {
			sbDOMEraser.mouseTarget = elem;
			if (sbDOMEraser.lastTarget != elem) {
				sbDOMEraser.widerStack = null;
				sbDOMEraser._selectNode(elem);
			}
			else {
				sbDOMEraser._updateTooltip(elem);
			}
		}
		else if ( aEvent.type == "mousemove" ) {
			sbDOMEraser.mouseTarget = elem;
			if ( ++sbDOMEraser.verbose % 3 != 0 ) return;
			if (sbDOMEraser.lastTarget != elem) {
				sbDOMEraser.widerStack = null;
				sbDOMEraser._selectNode(elem);
			}
			else {
				sbDOMEraser._updateTooltip(elem);
			}
		}
		else if ( aEvent.type == "mouseout" ) {
			sbDOMEraser.mouseTarget = null;
			sbDOMEraser._deselectNode();
		}
		else if ( aEvent.type == "click" ) {
			sbDOMEraser.mouseTarget = elem;
			var elem = sbDOMEraser.lastTarget;
			if (elem) {
				if ( aEvent.shiftKey || aEvent.button == 2 ){
					sbDOMEraser.isolate(elem);
				}
				else {
					sbDOMEraser.remove(elem);
				}
			}
		}
	},

	quit : function(aNode)
	{
		this.init(0);
	},

	wider : function(aNode)
	{
		if (!aNode) return false;
		var parent = aNode.parentNode;
		if ( !parent ) return false;
		if ( parent == aNode.ownerDocument.body ) {
			parent = this._getParentFrameNode(aNode);
			if (!parent) return false;
		}
		if (!this.widerStack) this.widerStack = [];
		this.widerStack.push(aNode);
		this._selectNode(parent);
	},

	narrower : function(aNode)
	{
		if (!aNode) return false;
		if (!this.widerStack || !this.widerStack.length) return false;
		var child = this.widerStack.pop();
		this._selectNode(child);
	},

	remove : function(aNode)
	{
		if (!aNode) return false;
		this._deselectNode();
		sbPageEditor.allowUndo(aNode.ownerDocument);
		if ( sbCommonUtils.getSbObjectRemoveType(aNode) != 0 ) {
			sbPageEditor.removeSbObj(aNode);
		}
		else {
			aNode.parentNode.removeChild(aNode);
		}
	},

	isolate : function(aNode)
	{
		if ( !aNode || !aNode.ownerDocument.body ) return false;
		this._deselectNode();
		sbPageEditor.allowUndo(aNode.ownerDocument);
		var i = 0;
		while ( aNode != aNode.ownerDocument.body && ++i < 64 )
		{
			var parent = aNode.parentNode;
			var child = parent.lastChild;
			var j = 0;
			while ( child && ++j < 1024 )
			{
				var prevChild = child.previousSibling;
				if ( child != aNode ) parent.removeChild(child);
				child = prevChild;
			}
			aNode = parent;
		}
	},

	blackOnWhite : function(aNode)
	{
		if (!aNode) return false;
		this._deselectNode();
		sbPageEditor.allowUndo(aNode.ownerDocument);
		this._selectNode(aNode);
		aNode.style.color = "#000";
		aNode.style.backgroundColor = "#FFF";
		aNode.style.backgroundImage = "";
	},

	deWidthify : function(aNode)
	{
		if (!aNode) return false;
		this._deselectNode();
		sbPageEditor.allowUndo(aNode.ownerDocument);
		this._selectNode(aNode);
		removeWidth(aNode);

		function removeWidth(aNode) {
			if (aNode.nodeType != 1) return;
			if (aNode.width) aNode.width = null;
			if (aNode.style) aNode.style.width = 'auto';
			var childs = aNode.childNodes;
			for (var i=0; i<childs.length; i++) {
				removeWidth(childs[i]);
			}
		}
	},

	undo : function(aNode)
	{
		sbPageEditor.undo();
	},

	_getParentFrameNode : function(aNode)
	{
		var parentWindow = aNode.ownerDocument.defaultView.parent;
		if (!parentWindow) return null;
		var frames = parentWindow.document.getElementsByTagName("IFRAME");
		for (var i=0; i<frames.length; i++) {
			if (frames[i].contentDocument == aNode.ownerDocument) {
				return frames[i];
			}
		}
		var frames = parentWindow.document.getElementsByTagName("FRAME");
		for (var i=0; i<frames.length; i++) {
			if (frames[i].contentDocument == aNode.ownerDocument) {
				return frames[i];
			}
		}
		return null;
	},

	_selectNode : function(aNode)
	{
		if (this.lastTarget) this._deselectNode();
		this._addTooltip(aNode);
		this.lastTarget = aNode;
	},

	_deselectNode : function()
	{
		if (!sbCommonUtils.isDeadObject(this.lastTarget)) this._removeTooltip(this.lastTarget);
		this.lastTarget = null;
	},

	_addTooltip : function(aNode)
	{
		var doc = (this.mouseTarget) ? this.mouseTarget.ownerDocument : aNode.ownerDocument;
		var tooltip = doc.getElementById("scrapbook-eraser-tooltip");
		if ( !tooltip ) {
			var newtooltip = true;
			tooltip = doc.createElement("DIV");
			tooltip.id = "scrapbook-eraser-tooltip";
			doc.body.appendChild(tooltip);
		}
		tooltip.style.left = this.lastX + "px";
		tooltip.style.top  = this.lastY + "px";
		if ( sbCommonUtils.getSbObjectRemoveType(aNode) != 0 ) {
			tooltip.textContent = sbCommonUtils.lang("overlay", "EDIT_REMOVE_HIGHLIGHT");
			sbDOMEraser._setOutline(aNode, "2px dashed #0000FF");
		}
		else {
			var text = aNode.nodeName.toLowerCase();
			if ( aNode.id ) text += ' id="' + aNode.id + '"';
			if ( aNode.className ) text += ' class="' + aNode.className + '"';
			tooltip.textContent = text;
			sbDOMEraser._setOutline(aNode, "2px solid #FF0000");
		}
	},
	
	_updateTooltip : function(aNode)
	{
		var tooltip = aNode.ownerDocument.getElementById("scrapbook-eraser-tooltip");
		if ( tooltip ) {
			tooltip.style.left = this.lastX + "px";
			tooltip.style.top  = this.lastY + "px";
		}
	},
	
	_removeTooltip : function(aNode)
	{
		var tooltip = aNode.ownerDocument.getElementById("scrapbook-eraser-tooltip");
		if ( tooltip ) aNode.ownerDocument.body.removeChild(tooltip);
		this._clearOutline(aNode);
	},

	_setOutline : function(aElement, outline)
	{
		aElement.setAttribute("data-sb-old-outline", aElement.style.outline);
		aElement.style.outline = outline;
	},

	_clearOutline : function(aElement)
	{
		aElement.style.outline = aElement.getAttribute("data-sb-old-outline") || "";
		if ( !aElement.getAttribute("style") ) aElement.removeAttribute("style");
		aElement.removeAttribute("data-sb-old-outline");
	}
};



var sbAnnotationService = {

	DEFAULT_WIDTH  : 250,
	DEFAULT_HEIGHT : 100,
	offsetX : 0,
	offsetY : 0,
	isMove  : true,
	target  : null,

	// aStateFlag
	//  0: disable
	//  1: enable
	initEvent : function(aWindow, aStateFlag)
	{
		aWindow.document.removeEventListener("mousedown", this.handleEvent, true);
		aWindow.document.removeEventListener("click", this.handleEvent, true);
		if (aStateFlag == 1) {
			aWindow.document.addEventListener("mousedown", this.handleEvent, true);
			aWindow.document.addEventListener("click", this.handleEvent, true);
		}
		else {
			aWindow.document.removeEventListener("mousemove", this.handleEvent, true);
			aWindow.document.removeEventListener("mouseup",   this.handleEvent, true);
		}
	},

	handleEvent : function(aEvent)
	{
		if ( aEvent.type == "mousedown" )
		{
			switch ( sbCommonUtils.getSbObjectType(aEvent.originalTarget) )
			{
				case "sticky" :
					var sticky = aEvent.originalTarget;
					if (!sticky.hasAttribute("data-sb-active")) {
						sbAnnotationService.editSticky(sticky);
					}
					// for downward compatibility
					else if ( sticky.childNodes.length == 2 ) {
						sbAnnotationService.editSticky(sticky);
					}
					break;
				case "sticky-header" :
					var sticky = aEvent.originalTarget.parentNode;
					if (sticky.getAttribute("data-sb-active")==="1") {
						sbAnnotationService.startDrag(aEvent, true);
					}
					break;
				case "sticky-footer" :
					var sticky = aEvent.originalTarget.parentNode;
					if (sticky.getAttribute("data-sb-active")==="1") {
						sbAnnotationService.startDrag(aEvent, false);
					}
					break;
				case "inline" :
					sbAnnotationService.editInline(aEvent.originalTarget);
					break;
				case "annotation" :
					sbAnnotationService.editAnnotation(aEvent.originalTarget);
					break;
				case "block-comment" :
					sbAnnotationService.createSticky([aEvent.originalTarget.previousSibling, aEvent.originalTarget.firstChild.data]);
					aEvent.originalTarget.parentNode.removeChild(aEvent.originalTarget);
					break;
			}
		}
		else if ( aEvent.type == "mousemove" )
		{
			if ( sbAnnotationService.target ) sbAnnotationService.onDrag(aEvent);
		}
		else if ( aEvent.type == "mouseup"   )
		{
			if ( sbAnnotationService.target ) sbAnnotationService.stopDrag(aEvent);
		}
		else if ( aEvent.type == "click" )
		{
			switch ( sbCommonUtils.getSbObjectType(aEvent.originalTarget) )
			{
				case "sticky-save" :
					sbAnnotationService.saveSticky(aEvent.originalTarget.parentNode.parentNode);
					break;
				case "sticky-delete" :
					sbAnnotationService.deleteSticky(aEvent.originalTarget.parentNode.parentNode);
					break;
			}
		}
	},

	createSticky : function(aPreset)
	{
		var win = sbCommonUtils.getFocusedWindow();
		if ( win.document.body instanceof HTMLFrameSetElement ) win = win.frames[0];
		sbPageEditor.allowUndo(win.document);
		var targetNode;
		if ( aPreset ) {
			targetNode = aPreset[0];
		}
		else {
			var sel = sbPageEditor.getSelection(win);
			targetNode = sel ? sel.anchorNode : win.document.body;
		}
		if ( targetNode instanceof Text ) targetNode = targetNode.parentNode;
		if ( targetNode instanceof HTMLAnchorElement ) targetNode = targetNode.parentNode;
		var div = this.duplicateElement(targetNode != win.document.body, false,
			win.scrollX + Math.round((win.innerWidth  - this.DEFAULT_WIDTH ) / 2),
			win.scrollY + Math.round((win.innerHeight - this.DEFAULT_HEIGHT) / 2),
			this.DEFAULT_WIDTH, this.DEFAULT_HEIGHT
		);
		if ( aPreset ) div.appendChild(win.document.createTextNode(aPreset[1]));
		targetNode.appendChild(div);
		targetNode.appendChild(win.document.createTextNode("\n"));
		if ( !win.document.getElementById("scrapbook-sticky-css") )
		{
			var linkNode = win.document.createElement("link");
			linkNode.setAttribute("data-sb-obj", "stylesheet");
			linkNode.setAttribute("media", "all");
			linkNode.setAttribute("href", "chrome://scrapbook/skin/annotation.css");
			linkNode.setAttribute("type", "text/css");
			linkNode.setAttribute("id", "scrapbook-sticky-css");
			linkNode.setAttribute("rel", "stylesheet");
			var headNode = win.document.getElementsByTagName("head")[0];
			if ( !headNode ) return;
			headNode.appendChild(win.document.createTextNode("\n"));
			headNode.appendChild(linkNode);
			headNode.appendChild(win.document.createTextNode("\n"));
		}
		this._editSticky(div);
		sbPageEditor.disableTemporary(500);
	},

	editSticky : function(oldElem)
	{
		sbPageEditor.allowUndo(oldElem.ownerDocument);
		this._editSticky(oldElem);
	},

	_editSticky : function(oldElem)
	{
		var newElem = this.duplicateElement(
			!(oldElem.parentNode instanceof HTMLBodyElement), true, 
			parseInt(oldElem.style.left, 10), parseInt(oldElem.style.top, 10), 
			parseInt(oldElem.style.width, 10), parseInt(oldElem.style.height, 10)
		);
		newElem.firstChild.nextSibling.appendChild(
			newElem.ownerDocument.createTextNode(oldElem.lastChild.data || "")
		);
		oldElem.parentNode.replaceChild(newElem, oldElem);
		this.adjustTextArea(newElem);
		setTimeout(function(){ newElem.firstChild.nextSibling.focus(); }, 100);
	},

	saveSticky : function(sticky)
	{
		var header = sticky.firstChild;
		var textarea = header.nextSibling;
		var footer = sticky.lastChild;
		sticky.replaceChild(sticky.ownerDocument.createTextNode(textarea.value), textarea);
		sticky.removeChild(footer);
		sticky.removeAttribute("data-sb-active");
		header.removeAttribute("data-sb-active");
	},

	deleteSticky : function(sticky)
	{
		sticky.parentNode.removeChild(sticky);
	},

	startDrag : function(aEvent, isMove)
	{
		this.target = aEvent.originalTarget.parentNode;
		this.isMove = isMove;
		this.offsetX = aEvent.clientX - parseInt(this.target.style[this.isMove ? "left" : "width" ], 10);
		this.offsetY = aEvent.clientY - parseInt(this.target.style[this.isMove ? "top"  : "height"], 10);
		aEvent.view.document.addEventListener("mousemove", this.handleEvent, true);
		aEvent.view.document.addEventListener("mouseup",   this.handleEvent, true);
	},

	onDrag : function(aEvent)
	{
		var x = aEvent.clientX - this.offsetX; if ( x < 0 ) x = 0; this.target.style[this.isMove ? "left" : "width" ] = x + "px";
		var y = aEvent.clientY - this.offsetY; if ( y < 0 ) y = 0; this.target.style[this.isMove ? "top"  : "height"] = y + "px";
		if ( !this.isMove && this.target.firstChild.nextSibling instanceof HTMLTextAreaElement ) this.adjustTextArea(this.target);
	},

	stopDrag : function(aEvent)
	{
		this.target = null;
		aEvent.view.document.removeEventListener("mousemove", this.handleEvent, true);
		aEvent.view.document.removeEventListener("mouseup",   this.handleEvent, true);
	},

	adjustTextArea : function(aTarget)
	{
		var h = parseInt(aTarget.style.height, 10) - 10 - 16; if ( h < 0 ) h = 0;
		aTarget.firstChild.nextSibling.style.height = h + "px";
	},

	duplicateElement : function(isRelative, isEditable, aLeft, aTop, aWidth, aHeight)
	{
		var mainDiv = window.content.document.createElement("DIV");
		var headDiv = window.content.document.createElement("DIV");
		headDiv.className = "scrapbook-sticky-header";
		headDiv.setAttribute("data-sb-obj", "sticky-header");
		mainDiv.appendChild(headDiv);
		if ( isEditable )
		{
			mainDiv.setAttribute("data-sb-active", "1");
			if ( !isRelative ) headDiv.setAttribute("data-sb-active", "1");
			var textArea = window.content.document.createElement("TEXTAREA");
			var footDiv  = window.content.document.createElement("DIV");
			var button1  = window.content.document.createElement("INPUT");
			var button2  = window.content.document.createElement("INPUT");
			button1.setAttribute("type", "image"); button1.setAttribute("src", "chrome://scrapbook/skin/sticky_save.png");
			button1.setAttribute("data-sb-obj", "sticky-save");
			button2.setAttribute("type", "image"); button2.setAttribute("src", "chrome://scrapbook/skin/sticky_delete.png");
			button2.setAttribute("data-sb-obj", "sticky-delete");
			footDiv.className = "scrapbook-sticky-footer";
			footDiv.setAttribute("data-sb-obj", "sticky-footer");
			footDiv.setAttribute("data-sb-active", "1");
			footDiv.appendChild(button1); footDiv.appendChild(button2);
			mainDiv.appendChild(textArea); mainDiv.appendChild(footDiv);
		}
		if ( !isRelative )
		{
			mainDiv.style.left = aLeft + "px";
			mainDiv.style.top  = aTop  + "px";
			mainDiv.style.position = "absolute";
		}
		mainDiv.style.width  = (aWidth  || this.DEFAULT_WIDTH)  + "px";
		mainDiv.style.height = (aHeight || this.DEFAULT_HEIGHT) + "px";
		mainDiv.setAttribute("data-sb-obj", "sticky");
		mainDiv.className = "scrapbook-sticky" + (isRelative ? " scrapbook-sticky-relative" : "");  // for compatibility
		return mainDiv;
	},


	addInline : function()
	{
		var win = sbCommonUtils.getFocusedWindow();
		var sel = sbPageEditor.getSelection(win);
		if ( !sel ) return;
		sbPageEditor.allowUndo(win.document);
		var ret = {};
		if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", sbCommonUtils.lang("overlay", "EDIT_INLINE", [sbCommonUtils.crop(sel.toString(), 32)]), ret, null, {}) ) return;
		if ( !ret.value ) return;
		var attr = { style : "border-bottom: 2px dotted #FF3333; cursor: help;", "data-sb-obj" : "inline" , class : "scrapbook-inline", title : ret.value };
		sbHighlighter.set(win, sel, "span", attr);
	},

	editInline : function(aElement)
	{
		var doc = aElement.ownerDocument;
		sbPageEditor.allowUndo(doc);
		var ret = { value : aElement.getAttribute("title") };
		if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", sbCommonUtils.lang("overlay", "EDIT_INLINE", [sbCommonUtils.crop(aElement.textContent, 32)]), ret, null, {}) ) return;
		if ( ret.value )
			aElement.setAttribute("title", ret.value);
		else
			sbPageEditor.removeSbObj(aElement);
	},


	addAnnotation : function()
	{
		var win = sbCommonUtils.getFocusedWindow();
		var sel = sbPageEditor.getSelection(win);
		if ( !sel ) return;
		sbPageEditor.allowUndo(win.document);
		var ret = {};
		if ( !sbCommonUtils.PROMPT.prompt(window, "[ScrapBook]", sbCommonUtils.lang("overlay", "EDIT_ANNOTATION"), ret, null, {}) ) return;
		if ( !ret.value ) return;
		var range = sel.getRangeAt(0);
		var endC = range.endContainer;
		var eOffset	= range.endOffset;
		if (eOffset < endC.length - 1) endC.splitText( eOffset );
		var annote = endC.ownerDocument.createElement("span");
		annote.style = "font-size: small; border-bottom: 1px solid #FF3333; background: linen; cursor: help;";
		annote.setAttribute("data-sb-obj", "annotation");
		annote.innerHTML = ret.value;
		endC.parentNode.insertBefore(annote, endC);
		endC.parentNode.insertBefore(endC, annote);
	},

	editAnnotation : function(aElement)
	{
		var doc = aElement.ownerDocument;
		sbPageEditor.allowUndo(doc);
		var ret = { value : aElement.textContent };
		if ( !sbCommonUtils.PROMPT.prompt(window, "[ScrapBook]", sbCommonUtils.lang("overlay", "EDIT_ANNOTATION"), ret, null, {}) ) return;
		if ( ret.value )
			aElement.innerHTML = ret.value;
		else
			sbPageEditor.removeSbObj(aElement);
	},


	attach : function(aFlag)
	{
		var win = sbCommonUtils.getFocusedWindow();
		var sel = sbPageEditor.getSelection(win);
		if ( !sel ) return;
		var attr = {};
		if ( aFlag == "L" )
		{
			// fill the selection it looks like an URL
			// use a very wide standard, which allows as many cases as may be used
			var selText = sel.toString();
			if (selText && selText.match(/^(\w+:[^\t\n\r\v\f]*)/i)) {
				var url = RegExp.$1;
			}
			var ret = { value: url || "" };
			if ( !sbCommonUtils.PROMPT.prompt(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_LINK_TITLE"), sbCommonUtils.lang("overlay", "ADDRESS"), ret, null, {}) ) return;
			if ( !ret.value ) return;
			attr["href"] = ret.value;
			attr["data-sb-obj"] = "link-url";
		}
		else if ( aFlag == "I" )
		{
			// we can construct inner link only for those with valid id
			if (!sbPageEditor.item) return;
			// if the sidebar is closed, we may get an error
			try {
				var sidebarId = sbCommonUtils.getSidebarId("sidebar");
				var res = document.getElementById(sidebarId).contentWindow.sbTreeHandler.getSelection(true, 2);
			}
			catch (ex) {
			}
			// check the selected resource
			if (res && res.length) {
				res = res[0];
				var type = sbDataSource.getProperty(res, "type");
				if ( ["folder", "separator"].indexOf(type) === -1 ) {
					var id = sbDataSource.getProperty(res, "id");
				}
			}
			// if unavailable, let the user input an id
			var ret = {value: id || ""};
			if ( !sbCommonUtils.PROMPT.prompt(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_INNERLINK_TITLE"), sbCommonUtils.lang("overlay", "EDIT_ATTACH_INNERLINK_ENTER"), ret, null, {}) ) return;
			var id = ret.value;
			var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
			if ( sbDataSource.exists(res) ) {
				var type = sbDataSource.getProperty(res, "type");
				if ( ["folder", "separator"].indexOf(type) !== -1 ) {
					res = null;
				}
			}
			else res = null;
			// if it's invalid, alert and quit
			if (!res) {
				sbCommonUtils.PROMPT.alert(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_INNERLINK_TITLE"), sbCommonUtils.lang("overlay", "EDIT_ATTACH_INNERLINK_INVALID", [id]));
				return;
			}
			// attach the link
			var title = sbDataSource.getProperty(res, "title");
			attr["href"] = (type == "bookmark") ? sbDataSource.getProperty(res, "source") : makeRelativeLink(win.location.href, sbPageEditor.item.id, id);
			attr["title"] = title;
			attr["data-sb-obj"] = "link-inner";
		}
		else
		{
			// we can upload file only for those with valid id
			if (!sbPageEditor.item) return;
			// check if the page is local and get its path
			var htmlFile = sbCommonUtils.convertURLToFile(win.location.href);
			if (!htmlFile) return;
			// prompt a window to select file
			var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
			FP.init(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_TITLE"), FP.modeOpen);
			var ret = FP.show();
			if ( ret != FP.returnOK ) return;
			// upload the file
			var destFile = htmlFile.parent.clone();
			destFile.append(FP.file.leafName);
			if ( destFile.exists() && destFile.isFile() ) {
				if ( !sbCommonUtils.PROMPT.confirm(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_TITLE"), sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_OVERWRITE", [FP.file.leafName])) ) return;
				destFile.remove(false);
			}
			try {
				FP.file.copyTo(destFile.parent, FP.file.leafName);
			} catch(ex) {
				return;
			}
			// attach the link
			attr["href"] = sbCommonUtils.getFileName(sbCommonUtils.IO.newFileURI(FP.file).spec);
			attr["title"] = FP.file.leafName;
			attr["data-sb-obj"] = "link-file";
		}
		sbPageEditor.allowUndo(win.document);
		sbHighlighter.set(win, sel, "a", attr);
		
		function makeRelativeLink(aBaseURL, aBaseId, aTargetId) {
			var result = "";
			var contDir = sbCommonUtils.getContentDir(aBaseId);
			var checkFile = sbCommonUtils.convertURLToFile(aBaseURL);
			while (!checkFile.equals(contDir)){
				result += "../";
				checkFile = checkFile.parent;
			}
			return result = result + aTargetId + "/index.html";
		}
	},

};




var sbInfoViewer = {

	get TOOLBAR() { return document.getElementById("ScrapBookInfobar"); },

	onPopupShowing : function(aEvent)
	{
		var id = sbBrowserOverlay.getID();
		var elems = aEvent.originalTarget.childNodes;
		for ( var i = 0; i < elems.length - 2; i++ ) elems[i].setAttribute("disabled", id ? "false" : "true");
		for ( i; i < elems.length; i++ ) elems[i].hidden = id;
		if ( id ) {
			if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { aEvent.preventDefault(); return; }
			document.getElementById("ScrapBookStatusPopupE").setAttribute("checked",  sbBrowserOverlay.editMode);
			document.getElementById("ScrapBookStatusPopupI").setAttribute("checked",  sbBrowserOverlay.infoMode);
			document.getElementById("ScrapBookStatusPopupM").setAttribute("disabled", sbDataSource.getProperty(sbBrowserOverlay.resource, "type") != "site");
			document.getElementById("ScrapBookStatusPopupR").setAttribute("disabled", sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "notex");
			document.getElementById("ScrapBookStatusPopupD").setAttribute("disabled", sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "notex");
			document.getElementById("ScrapBookStatusPopupI").setAttribute("disabled", sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "notex");
			document.getElementById("ScrapBookStatusPopupT").setAttribute("hidden", sbDataSource.getProperty(sbBrowserOverlay.resource, "type") != "notex");
		} else {
			aEvent.originalTarget.lastChild.setAttribute("checked", !(sbPageEditor.TOOLBAR.hidden || document.getElementById("ScrapBookToolbox").hidden));
		}
	},

	init : function(aID)
	{
		if ( aID != sbBrowserOverlay.getID() ) return;
		if (!sbDataSource.exists(sbBrowserOverlay.resource) || 
			sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "notex") {
			this.TOOLBAR.hidden = true;
			return;
		}
		this.TOOLBAR.hidden = false;
		var isTypeSite = (sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "site");
		document.getElementById("ScrapBookInfoHome").disabled = !isTypeSite;
		document.getElementById("ScrapBookInfoSite").disabled = !isTypeSite;
		document.getElementById("ScrapBookInfoHome").setAttribute("image", "chrome://scrapbook/skin/info_home" + (isTypeSite ? "1" : "0") +  ".png");
		document.getElementById("ScrapBookInfoSite").setAttribute("image", "chrome://scrapbook/skin/info_link" + (isTypeSite ? "1" : "0") +  ".png");
		// source image --> link to content directory
		var url = sbCommonUtils.convertFilePathToURL(sbCommonUtils.getContentDir(aID).path);
		var srcImage = document.getElementById("ScrapBookInfobar").firstChild;
		srcImage.onclick = function(aEvent){ sbCommonUtils.loadURL(url, aEvent.button == 1); };
		// source label --> link to source
		var srcLabel = document.getElementById("ScrapBookInfoSource");
		srcLabel.value = sbDataSource.getProperty(sbBrowserOverlay.resource, "source");
		srcLabel.onclick = function(aEvent){ sbCommonUtils.loadURL(srcLabel.value, aEvent.button == 1); };
	},

	toggle : function()
	{
		var id = sbBrowserOverlay.getID();
		if ( !id ) return;
		this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
		sbBrowserOverlay.infoMode = this.TOOLBAR.hidden;
		this.TOOLBAR.hidden ? this.init(id) : this.TOOLBAR.hidden = true;
		this.optimize();
	},

	toggleIndicator : function(willEnable)
	{
		sbCommonUtils.flattenFrames(window.content).forEach(function(win) {
			if ( willEnable )
				this.indicateLinks(win);
			else
				sbPageEditor.removeStyle(win, "scrapbook-indicator-style");
		}, this);
	},

	indicateLinks : function(aWindow)
	{
		sbPageEditor.applyStyle(aWindow, "scrapbook-indicator-style", "a[href]:not([href^=\"http\"]):not([href^=\"javascript\"]):not([href^=\"mailto\"]):before { content:url('chrome://scrapbook/skin/info_link1.png'); }");
	},

	renew : function(showDetail)
	{
		var id = sbBrowserOverlay.getID();
		if ( !id ) return;
		var fileName = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(window.content.location.href))[0];
		var source = fileName == "index" ? sbDataSource.getProperty(sbBrowserOverlay.resource, "source") : "";
		var data = {
			urls: [source],
			refUrl: null,
			showDetail: showDetail,
			resName: null,
			resIdx: 0,
			referItem: null,
			option: null,
			file2Url: {},
			preset: [id, fileName, null, null, 0],
			charset: null,
			timeout: null,
			titles: null,
			context: (fileName == "index") ? "capture-again" : "capture-again-deep",
		};
		top.window.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no", data);
	},

	internalize : function()
	{
		var id = sbBrowserOverlay.getID();
		if ( !id ) return;
		if (window.content.document.contentType != "text/html") {
			sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_NOT_INTERNALIZE_TYPE"));
			return;
		}
		var refFile = sbCommonUtils.convertURLToFile(window.content.location.href);
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
			refFile.leafName,
			options,
			file2Url,
			0,
			false
		];
		var data = {
			urls: [window.content.location.href],
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
			titles: null,
			context: "internalize",
		};
		top.window.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no", data);
	},

	openSourceURL : function(tabbed)
	{
		if ( !sbBrowserOverlay.getID() ) return;
		sbCommonUtils.loadURL(sbDataSource.getProperty(sbBrowserOverlay.resource, "source"), tabbed);
	},

	loadFile : function(aFileName)
	{
		var file = sbCommonUtils.getContentDir(sbPageEditor.item.id); file.append(aFileName);
		var url = sbCommonUtils.convertFilePathToURL(file.path);
		var dataXml = sbCommonUtils.convertURLToFile(url);
		// later Firefox version doesn't allow loading .xsl in the upper directory
		// if it's requested, patch it
		if (dataXml.leafName == "sitemap.xml" && dataXml.exists()) {
			var dataDir = dataXml.parent;
			var dataXsl = dataDir.clone(); dataXsl.append("sitemap.xsl");
			var dataU2N = dataDir.clone(); dataU2N.append("sb-url2name.txt");
			var bookXsl = dataDir.parent.parent; bookXsl.append("sitemap.xsl");

			// dataXml is flushed earlier than dataU2N in a new capture
			// if it has newer lastModifiedTime, treat as already patched
			if ( !dataU2N.exists() || dataXml.lastModifiedTime <= dataU2N.lastModifiedTime ) {
				var lfData = sbCommonUtils.readFile(dataXml);
				lfData = sbCommonUtils.convertToUnicode(lfData, "UTF-8");
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

	optimize : function()
	{
		this.TOOLBAR.style.borderBottom = sbPageEditor.TOOLBAR.hidden ? "1px solid ThreeDShadow" : "none";
	},

};



