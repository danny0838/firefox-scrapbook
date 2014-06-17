
var sbPageEditor = {

	get TOOLBAR() { return document.getElementById("ScrapBookEditor"); },
	get COMMENT() { return document.getElementById("ScrapBookEditComment"); },

	item : {},
	multiline : false,
	focusedWindow : null,

	documentDataArray : {
		document : [],
		histories : [],
		changed1 : [],
		changed2 : [],
	},

	get STRING() {
		if (!this._stringBundle)
			this._stringBundle = document.getElementById("ScrapBookOverlayString");
		return this._stringBundle;
	},
	_stringBundle: null,

	init : function(aID)
	{
		//Vorschau für Hervorhebungsstufe aktualisieren
			//fuer Auswahlliste
		var idx = document.getElementById("ScrapBookHighlighter").getAttribute("color") || 6;
		var cssText = sbCommonUtils.copyUnicharPref("extensions.scrapbook.highlighter.style." + idx, sbHighlighter.PRESET_STYLES[idx]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighterPreview"), cssText);
			//fuer Knoepfe
		var cssText = "";
		cssText = sbCommonUtils.copyUnicharPref("extensions.scrapbook.highlighter.style.1", sbHighlighter.PRESET_STYLES[1]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighter1"), cssText);
		cssText = sbCommonUtils.copyUnicharPref("extensions.scrapbook.highlighter.style.2", sbHighlighter.PRESET_STYLES[2]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighter2"), cssText);
		cssText = sbCommonUtils.copyUnicharPref("extensions.scrapbook.highlighter.style.3", sbHighlighter.PRESET_STYLES[3]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighter3"), cssText);
		cssText = sbCommonUtils.copyUnicharPref("extensions.scrapbook.highlighter.style.4", sbHighlighter.PRESET_STYLES[4]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighter4"), cssText);
		cssText = sbCommonUtils.copyUnicharPref("extensions.scrapbook.highlighter.style.5", sbHighlighter.PRESET_STYLES[5]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighter5"), cssText);
		cssText = sbCommonUtils.copyUnicharPref("extensions.scrapbook.highlighter.style.6", sbHighlighter.PRESET_STYLES[6]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighter6"), cssText);
			//
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		prefs = prefs.getBranch("extensions.scrapbook.");
		var value = prefs.getBoolPref("useDropDownList");
		if ( value == false )
		{
			document.getElementById("ScrapBookHighlighterPreview").hidden = true;
			document.getElementById("ScrapBookHighlighter").hidden = true;
			document.getElementById("ScrapBookHighlighter1").hidden = false;
			document.getElementById("ScrapBookHighlighter2").hidden = false;
			document.getElementById("ScrapBookHighlighter3").hidden = false;
			document.getElementById("ScrapBookHighlighter4").hidden = false;
			document.getElementById("ScrapBookHighlighter5").hidden = false;
			document.getElementById("ScrapBookHighlighter6").hidden = false;
		} else
		{
			document.getElementById("ScrapBookHighlighterPreview").hidden = false;
			document.getElementById("ScrapBookHighlighter").hidden = false;
			document.getElementById("ScrapBookHighlighter1").hidden = true;
			document.getElementById("ScrapBookHighlighter2").hidden = true;
			document.getElementById("ScrapBookHighlighter3").hidden = true;
			document.getElementById("ScrapBookHighlighter4").hidden = true;
			document.getElementById("ScrapBookHighlighter5").hidden = true;
			document.getElementById("ScrapBookHighlighter6").hidden = true;
		}
		//Ende
		if ( aID )
		{
			if ( aID != sbBrowserOverlay.getID() ) return;
			if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.disable(true); return; }
		}
		if ( aID ) {
			this.item = sbCommonUtils.newItem(aID);
			for ( var prop in this.item ) this.item[prop] = sbDataSource.getProperty(sbBrowserOverlay.resource, prop);
		} else {
			this.item = null;
			sbBrowserOverlay.resource = null;
		}
		this.disable(false);
		this.showHide(true);
		if ( !aID )
		{
			document.getElementById("ScrapBookToolbox").hidden = false;
			sbInfoViewer.TOOLBAR.hidden = true;
		}
		document.getElementById("ScrapBookEditTitle").value =  aID ? this.item.title : gBrowser.selectedTab.label;
		document.getElementById("ScrapBookEditIcon").src    = (aID ? this.item.icon  : gBrowser.selectedTab.getAttribute("image")) || sbCommonUtils.getDefaultIcon();
		try { document.getElementById("ScrapBookEditTitle").editor.transactionManager.clear(); } catch(ex) {}
		this.COMMENT.value = aID ? this.item.comment.replace(/ __BR__ /g, this.multiline ? "\n" : "\t") : "";
		try { this.COMMENT.editor.transactionManager.clear(); } catch(ex) {}
		if ( aID && gBrowser.currentURI.spec.indexOf("index.html") > 0 )
		{
			gBrowser.selectedTab.label = this.item.title;
			gBrowser.selectedTab.setAttribute("image", this.item.icon);
		}
		sbDOMEraser.init(0);
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window.content);
		for ( var i = 0; i < sbContentSaver.frameList.length; i++ )
		{
			try
			{
				sbContentSaver.frameList[i].document.removeEventListener("mousedown", sbAnnotationService.handleEvent, true);
			} catch(ex) {}
			sbContentSaver.frameList[i].document.addEventListener("mousedown",    sbAnnotationService.handleEvent, true);
			sbContentSaver.frameList[i].document.removeEventListener("click", sbAnnotationService.handleEvent, true);
			sbContentSaver.frameList[i].document.addEventListener("click",    sbAnnotationService.handleEvent, true);
			sbContentSaver.frameList[i].document.removeEventListener("keypress", this.handleEvent, true);
			sbContentSaver.frameList[i].document.addEventListener("keypress",    this.handleEvent, true);
/*
			try
			{
				sbContentSaver.frameList[i].document.removeEventListener("mousedown", sbAnnotationService.handleEvent, true);
			} catch (ex) {}
			try
			{
				sbContentSaver.frameList[i].document.addEventListener("mousedown",    sbAnnotationService.handleEvent, true);
			} catch (ex) {}
			try
			{
				sbContentSaver.frameList[i].document.removeEventListener("keypress", this.handleEvent, true);
			} catch (ex) {}
			try
			{
				sbContentSaver.frameList[i].document.addEventListener("keypress",    this.handleEvent, true);
			} catch (ex) {}
*/
			if ( aID && document.getElementById("ScrapBookStatusPopupD").getAttribute("checked") ) sbInfoViewer.indicateLinks(sbContentSaver.frameList[i]);
		}
		if ( aID )
		{
			try {
				window.content.removeEventListener("beforeunload", this.handleEvent, true);
			}
			catch (ex) {}
			window.content.addEventListener("beforeunload", this.handleEvent, true);
		}
		var ss = Cc["@mozilla.org/browser/sessionstore;1"].getService(Ci.nsISessionStore);
		var restoredComment = ss.getTabValue(gBrowser.mCurrentTab, "scrapbook-comment");
		if (restoredComment)
			document.getElementById("ScrapBookEditComment").value = restoredComment;
	},

	handleEvent : function(aEvent)
	{
		if ( aEvent.type == "keypress" )
		{
			if ( aEvent.altKey || aEvent.shiftKey || aEvent.ctrlKey || aEvent.metaKey ) return;
			var idx = 0;
			switch ( aEvent.charCode )
			{
				case aEvent.DOM_VK_1 : idx = 1; break;
				case aEvent.DOM_VK_2 : idx = 2; break;
				case aEvent.DOM_VK_3 : idx = 3; break;
				case aEvent.DOM_VK_4 : idx = 4; break;
				default : return;
			}
			if ( idx > 0 ) sbPageEditor.highlight(idx);
		}
		else if ( aEvent.type == "beforeunload" )
		{
			// sbCommonUtils.getFocusedWindow() could be null in some situation
			try {
				if (aEvent.target == sbCommonUtils.getFocusedWindow().document) {
					sbPageEditor.confirmSave();
				}
			}
			catch(ex) {
			}
		}
	},

	toggleComment : function()
	{
		this.multiline = !this.multiline;
		var val = this.COMMENT.value;
		this.COMMENT.setAttribute("multiline", this.multiline);
		this.COMMENT.setAttribute("style", this.multiline ? "height:100px;" : "padding:2px;");
		if ( this.multiline ) {
			document.getElementById("ScrapBookToggleComment").setAttribute("tooltiptext", this.STRING.getString("MIN_COMMENT"));
			document.getElementById("ScrapBookToolbox").appendChild(this.COMMENT);
			val = val.replace(/\t/g, "\n");
		} else {
			document.getElementById("ScrapBookToggleComment").setAttribute("tooltiptext", this.STRING.getString("MAX_COMMENT"));
			this.TOOLBAR.insertBefore(this.COMMENT, document.getElementById("ScrapBookHighlighterPreview"));
			val = val.replace(/\n/g, "\t");
		}
		document.getElementById("ScrapBookEditSpacer").setAttribute("flex", this.multiline ? 1 : 0);
		this.COMMENT.value = val;
		this.COMMENT.focus();
	},

	onInputComment: function(aValue)
	{
		var ss = Cc["@mozilla.org/browser/sessionstore;1"].getService(Ci.nsISessionStore);
		ss.setTabValue(gBrowser.mCurrentTab, "scrapbook-comment", aValue);
		this._dataChanged2(true);
	},

	getSelection : function()
	{
		this.focusedWindow = sbCommonUtils.getFocusedWindow();
		var selText = this.focusedWindow.getSelection();
		var sel = selText.QueryInterface(Components.interfaces.nsISelectionPrivate);
		var isSelected = false;
		try {
			isSelected = ( sel.anchorNode == sel.focusNode && sel.anchorOffset == sel.focusOffset ) ? false : true;
		} catch(ex) {
			isSelected = false;
		}
		return isSelected ? sel : false;
	},

	cutter : function()
	{
		var sel = this.getSelection();
		if ( !sel ) return;
		this.allowUndo();
		sel.deleteFromDocument();
	},

	highlight : function(idx)
	{
		if ( !idx ) idx = document.getElementById("ScrapBookHighlighter").getAttribute("color") || 6;	//DropDownList
		document.getElementById("ScrapBookHighlighter").setAttribute("color", idx);
		var attr = {};
		attr["style"] = sbCommonUtils.copyUnicharPref("extensions.scrapbook.highlighter.style." + idx, sbHighlighter.PRESET_STYLES[idx]);	//DropDownList
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighterPreview"), attr["style"]);	//DropDownList
		var sel = this.getSelection();
		if ( !sel ) return;
		this.allowUndo();
		attr["data-sb-obj"] = "linemarker";
		attr["class"] = "linemarker-marked-line";
		sbHighlighter.set(this.focusedWindow, sel, "span", attr);
	},

	removeSbObjectsSelected : function()
	{
		var sel = this.getSelection();
		if ( !sel ) return;
		this.allowUndo();
		var selRange  = sel.getRangeAt(0);
		var node = selRange.startContainer;
		if ( node.nodeName == "#text" ) node = node.parentNode;
		var nodeRange = window.content.document.createRange();
		var nodeToDel = [];
		traceTree : while ( true )
		{
			nodeRange.selectNode(node);
			if ( nodeRange.compareBoundaryPoints(Range.START_TO_END, selRange) > -1 )
			{
				if ( nodeRange.compareBoundaryPoints(Range.END_TO_START, selRange) > 0 ) break;
				else if ( node.nodeType === 1 && this._getSbObjectType(node) )
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
		this.changed1 = true;
	},

	removeSbObjects : function()
	{
		this.allowUndo();
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window.content);
		for ( var i = 0; i < sbContentSaver.frameList.length; i++ )
		{
			var elems = sbContentSaver.frameList[i].document.getElementsByTagName("*");
			for ( var j = 0; j < elems.length; j++ )
			{
				if ( this._getSbObjectType(elems[j]) )
				{
					// elems gets shortened when elems[j] is removed, minus j afterwards to prevent skipping
					this.removeSbObj(elems[j]);
					j--;
				}
			}
		}
		this.changed1 = true;
	},

	removeElementsByTagName : function(aTagName)
	{
		this.allowUndo();
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window.content);
		var shouldSave = false;
		for ( var i = sbContentSaver.frameList.length - 1; i >= 0; i-- )
		{
			var elems = sbContentSaver.frameList[i].document.getElementsByTagName(aTagName);
			if ( elems.length < 1 ) continue;
			for ( var j = elems.length - 1; j >= 0; j-- )
			{
				sbContentSaver.removeNodeFromParent(elems[j]);
			}
			shouldSave = true;
		}
		if ( shouldSave )
		{
			this.changed1 = true;
		}
	},

	removeSbObj : function(aNode)
	{
		switch (this._getSbObjectType(aNode)) {
			case "linemarker" :
			case "inline" :
			case "link-url" :
			case "link-file" :
				this.unwrapNode(aNode);
				break;
			case "sticky" :
			case "stylesheet" :
			default:
				aNode.parentNode.removeChild(aNode);
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
		var sel = this.getSelection();
		if ( !sel ) return;
		aElement.value = sbCommonUtils.crop(sel.toString().replace(/[\r\n\t\s]+/g, " "), 100);
		sel.removeAllRanges();
		this._dataChanged2(true);
	},

	restore : function()
	{
		window.sbBrowserOverlay.lastLocation = "";
		window.content.location.reload();
	},

	exit : function(forceExit)
	{
		if ( !forceExit && this.confirmSave() == 1 ) this.restore();
		if ( sbDOMEraser.enabled ) sbDOMEraser.init(2);
		this.showHide(false);
	},

	allowUndo : function()
	{
		var doc = sbCommonUtils.getFocusedWindow().document;
		var histories = this._documentData(doc, "histories");
		histories.push(doc.body.cloneNode(true));
		this._documentData(doc, "histories", histories);
		this._dataChanged1(true);
	},

	undo : function()
	{
		var doc = sbCommonUtils.getFocusedWindow().document;
		var histories = this._documentData(doc, "histories");
		while ( histories.length ) {
			var prevBody = histories.pop();
			if (!this._isDeadObject(prevBody)) {
				this._dataChanged1(true);
				prevBody.ownerDocument.body.parentNode.replaceChild(prevBody, prevBody.ownerDocument.body);
				return true;
			}
		}
		this._documentData(doc, "histories", histories);
		alert( sbBrowserOverlay.STRING.getString("EDIT_UNDO_LAST") );
		return false;
	},

	confirmSave : function()
	{
		if ( this._dataChanged2() ) this.saveResource();
		if ( !this._dataChanged1() ) return 0;
		var button = sbCommonUtils.PROMPT.BUTTON_TITLE_SAVE      * sbCommonUtils.PROMPT.BUTTON_POS_0
		           + sbCommonUtils.PROMPT.BUTTON_TITLE_DONT_SAVE * sbCommonUtils.PROMPT.BUTTON_POS_1;
		var text = sbBrowserOverlay.STRING.getFormattedString("EDIT_SAVE_CHANGES", [sbCommonUtils.crop(this.item.title, 32)]);
		var ret = sbCommonUtils.PROMPT.confirmEx(window, "[ScrapBook]", text, button, null, null, null, null, {});
		if ( ret == 0 ) this.savePage();
		return ret;
	},

	saveOrCapture : function(aBypassDialog)
	{
		if ( sbBrowserOverlay.getID() ) {
			this.savePage();
			this.saveResource();
		} else {
			sbDOMEraser.init(2);
			var ret = sbBrowserOverlay.execCapture(0, null, !aBypassDialog, "urn:scrapbook:root");
			if ( ret ) this.exit(true);
		}
	},

	savePage : function()
	{
		if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.disable(true); return; }
		var curURL = window.content.location.href;
		if ( curURL.indexOf("file://") != 0 || !curURL.match(/\/data\/(\d{14})\/(.+)$/) || RegExp.$1 != this.item.id || RegExp.$2 == "index.dat" || RegExp.$2 == "sitemap.xml" )
		{
			alert("ScrapBook ERROR: Cannot save file '" + RegExp.$2 + "'.");
			return;
		}
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window.content);
		this.disable(true);
		sbDOMEraser.init(2);
		for ( var i = 0; i < sbContentSaver.frameList.length; i++ )
		{
			this.saveAllSticky(sbContentSaver.frameList[i]);
			var doc = sbContentSaver.frameList[i].document;
			if ( doc.contentType != "text/html" )
			{
				alert("ScrapBook ERROR: Cannot modify " + doc.contentType + " content.");
				continue;
			}
			var charset = doc.characterSet;
			if (charset != "UTF-8") {
				alert("NOTICE: '" + doc.location.href + "' is not UTF-8 encoded, some content may lose.");
			}
			var rootNode = doc.getElementsByTagName("html")[0];
			var src = sbContentSaver.doctypeToString(doc.doctype) + rootNode.outerHTML;
			var file = sbCommonUtilsBookUtils.getContentDir(this.item.id).clone();
			file.append(sbCommonUtils.getFileName(doc.location.href));
			sbCommonUtils.writeFile(file, src, charset);
			if ( document.getElementById("ScrapBookStatusPopupD").getAttribute("checked") )
			{
				sbInfoViewer.indicateLinks(sbContentSaver.frameList[i]);
			}
		}
		this._dataChanged1(false);
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
			this.disableTemporary(500);
			sbDataSource.setProperty(sbBrowserOverlay.resource, "title",   newTitle);
			sbDataSource.setProperty(sbBrowserOverlay.resource, "comment", newComment);
			sbDataSource.flush();
			this.item.title   = newTitle;
			this.item.comment = newComment;
			sbCommonUtils.writeIndexDat(this.item);
		}
		var aValue = document.getElementById("ScrapBookEditComment").value;
		if ( aValue )
		{
			var ss = Cc['@mozilla.org/browser/sessionstore;1'].getService(Ci.nsISessionStore);
			ss.setTabValue(gBrowser.mCurrentTab, "scrapbook-comment", aValue);
			ss.deleteTabValue(gBrowser.mCurrentTab, "scrapbook-comment");
		}
		this._dataChanged2(false);
	},

	disableTemporary : function(msec)
	{
		window.setTimeout(function() { sbPageEditor.disable(true);  }, 0);
		window.setTimeout(function() { sbPageEditor.disable(false); }, msec);
		//Verhindert das Zurückbleiben von "ZombieCompartments"
		sbContentSaver.frameList = null;
		this.focusedWindow = null;
		this.savedBody = null;
	},

	disable : function(aBool)
	{
		var elems = this.TOOLBAR.childNodes;
		for ( var i = 0; i < elems.length; i++ ) elems[i].disabled = aBool;
		this.COMMENT.disabled = aBool;
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
		//Verhindert das Zurückbleiben von "ZombieCompartments"
		sbContentSaver.frameList = null;
		this.focusedWindow = null;
		this.savedBody = null;
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

	saveAllSticky : function(aWindow)
	{
		var nodes = aWindow.document.getElementsByTagName("div");
		for ( var i = nodes.length - 1; i >= 0 ; i-- )
		{
			var node = nodes[i];
			if (sbPageEditor._getSbObjectType(node) == "sticky" && node.getAttribute("data-sb-active")) {
				sbAnnotationService.saveSticky(node);
			}
		}
	},

	_dataChanged1 : function(aNewValue) {
		return this._documentData( sbCommonUtils.getFocusedWindow().document, "changed1", aNewValue );
	},

	_dataChanged2 : function(aNewValue) {
		return this._documentData( sbCommonUtils.getFocusedWindow().document, "changed2", aNewValue );
	},

	_documentData : function(aDocument, aKey, aNewValue)
	{
		var hash = this.documentDataArray;
		// try to lookup the index of the specific document
		var idx = false;
		var firstEmptyIdx = false;
		for (var i=0, len=hash.document.length; i<len ; i++) {
			if (this._isDeadObject(hash.document[i])) {
				if (firstEmptyIdx === false) firstEmptyIdx = i;
				continue;
			}
			if (hash.document[i] == aDocument) { idx = i; break; }
		}
		// if the document is not in index, add one
		// if there is an index left empty, use it
		if (idx === false) {
			if (firstEmptyIdx !== false) idx = firstEmptyIdx;
			else idx = hash.document.length;
			hash.document[idx] = aDocument;
			hash.histories[idx] = [];
			hash.changed1[idx] = false;
			hash.changed2[idx] = false;
		}
		// if given a new value, set it
		if (aNewValue !== undefined) {
			hash[aKey][idx] = aNewValue;
			return;
		}
		return hash[aKey][idx];
	},

	// check if an object is dead (eg. closed window)
	_isDeadObject : function(aObject)
	{
		var dead = false;
		try { var x = aObject.__proto__; }
		catch(ex) { dead = true; }
		return dead;
	},

	_getSbObjectType : function(aNode)
	{
		/**
		 * defined types:
		 *
		 * linemarker (span)
		 * inline (span)
		 * link-url (a)
		 * link-file (a)
		 * sticky (div)
		 * sticky-header
		 * sticky-footer
		 * sticky-save
		 * sticky-delete
		 * block-comment (?)
		 * stylesheet
		 */
		var type = aNode.getAttribute("data-sb-obj");
		if (type) return type;
		// className is for compatibility
		switch (aNode.className) {
			case "linemarker-marked-line":
				return "linemarker";
			case "scrapbook-inline":
				return "inline";
			case "scrapbook-sticky":
			case "scrapbook-sticky scrapbook-sticky-relative":
				return "sticky";
			case "scrapbook-block-comment":
				return "block-comment";
		}
		return false;
	},
	
};




var sbDOMEraser = {

	enabled : false,
	verbose : 0,

	init : function(aStateFlag)
	{
		this.verbose = 0;
		this.enabled = (aStateFlag == 1);
		document.getElementById("ScrapBookEditEraser").checked = this.enabled;
		if ( aStateFlag == 0 ) return;
		document.getElementById("ScrapBookHighlighter").disabled = this.enabled;	//DropDownList
		document.getElementById("ScrapBookHighlighter1").disabled = this.enabled;
		document.getElementById("ScrapBookHighlighter2").disabled = this.enabled;
		document.getElementById("ScrapBookHighlighter3").disabled = this.enabled;
		document.getElementById("ScrapBookHighlighter4").disabled = this.enabled;
		document.getElementById("ScrapBookHighlighter5").disabled = this.enabled;
		document.getElementById("ScrapBookHighlighter6").disabled = this.enabled;
		document.getElementById("ScrapBookEditAnnotation").disabled = this.enabled;
		document.getElementById("ScrapBookEditCutter").disabled  = this.enabled;
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window.content);
		for ( var i = 0; i < sbContentSaver.frameList.length; i++ )
		{
			sbContentSaver.frameList[i].document.removeEventListener("mouseover", this.handleEvent, true);
			sbContentSaver.frameList[i].document.removeEventListener("mousemove", this.handleEvent, true);
			sbContentSaver.frameList[i].document.removeEventListener("mouseout",  this.handleEvent, true);
			sbContentSaver.frameList[i].document.removeEventListener("click",     this.handleEvent, true);
			if ( this.enabled ) {
				sbContentSaver.frameList[i].document.addEventListener("mouseover", this.handleEvent, true);
				sbContentSaver.frameList[i].document.addEventListener("mousemove", this.handleEvent, true);
				sbContentSaver.frameList[i].document.addEventListener("mouseout",  this.handleEvent, true);
				sbContentSaver.frameList[i].document.addEventListener("click",     this.handleEvent, true);
			}
			if ( this.enabled ) {
				var estyle = "* { cursor: crosshair; }\n"
				           + "#scrapbook-eraser-tooltip { -moz-appearance: tooltip;"
				           + " position: absolute; z-index: 10000; margin-top: 32px; padding: 2px 3px; max-width: 40em;"
				           + " border: 1px solid InfoText; background-color: InfoBackground; color: InfoText; font: message-box; }";
				sbPageEditor.applyStyle(sbContentSaver.frameList[i], "scrapbook-eraser-style", estyle);
			} else {
				sbPageEditor.removeStyle(sbContentSaver.frameList[i], "scrapbook-eraser-style");
			}
		}
	},

	handleEvent : function(aEvent)
	{
		aEvent.preventDefault();
		var elem = aEvent.target;
		var tagName = elem.localName.toUpperCase();
		if ( aEvent.type != "keypress" && ["SCROLLBAR","HTML","BODY","FRAME","FRAMESET"].indexOf(tagName) >= 0 ) return;
		var onSbObj = sbPageEditor._getSbObjectType(elem);
		if ( aEvent.type == "mouseover" || aEvent.type == "mousemove" )
		{
			if ( aEvent.type == "mousemove" && ++sbDOMEraser.verbose % 3 != 0 ) return;
			var tooltip = elem.ownerDocument.getElementById("scrapbook-eraser-tooltip");
			if ( !tooltip )
			{
				tooltip = elem.ownerDocument.createElement("DIV");
				tooltip.id = "scrapbook-eraser-tooltip";
				elem.ownerDocument.body.appendChild(tooltip);
			}
			tooltip.style.left = aEvent.pageX + "px";
			tooltip.style.top  = aEvent.pageY + "px";
			if ( aEvent.type == "mouseover" )
			{
				if ( onSbObj ) {
					tooltip.textContent = sbBrowserOverlay.STRING.getString("EDIT_REMOVE_HIGHLIGHT");
					sbDOMEraser._setOutline(elem, "2px dashed #0000FF");
				} else {
					tooltip.textContent = elem.localName;
					if ( elem.id ) tooltip.textContent += ' id="' + elem.id + '"';
					if ( elem.className ) tooltip.textContent += ' class="' + elem.className + '"';
					sbDOMEraser._setOutline(elem, "2px solid #FF0000");
				}
			}
		}
		else if ( aEvent.type == "mouseout" || aEvent.type == "click" )
		{
			var tooltip = elem.ownerDocument.getElementById("scrapbook-eraser-tooltip");
			if ( tooltip ) elem.ownerDocument.body.removeChild(tooltip);
			sbDOMEraser._clearOutline(elem);
			if ( aEvent.type == "click" )
			{
				sbPageEditor.allowUndo();
				if ( aEvent.shiftKey || aEvent.button == 2 )
				{
					sbDOMEraser.isolateNode(elem);
				}
				else
				{
					if ( onSbObj )
						sbPageEditor.removeSbObj(elem);
					else
						elem.parentNode.removeChild(elem);
				}
			}
		}
	},

	isolateNode : function(aNode)
	{
		if ( !aNode || !aNode.ownerDocument.body ) return;
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

	_setOutline : function(aElement, outline)
	{
		aElement.setAttribute("data-sb-old-outline", aElement.style.outline);
		aElement.style.outline = outline;
	},

	_clearOutline : function(aElement)
	{
		aElement.style.outline = aElement.getAttribute("data-sb-old-outline");
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

	handleEvent : function(aEvent)
	{
		if ( sbDOMEraser.enabled ) return;
		if ( aEvent.type == "mousedown" )
		{
			switch ( sbPageEditor._getSbObjectType(aEvent.originalTarget) )
			{
				case "sticky" :
					if ( aEvent.originalTarget.childNodes.length != 2 ) return;
					sbAnnotationService.editSticky(aEvent.originalTarget);
					break;
				case "sticky-header" :
				case "sticky-footer" :
					var sticky = aEvent.originalTarget.parentNode;
					if (sticky.getAttribute("data-sb-active")==="1") {
						sbAnnotationService.startDrag(aEvent);
					}
					break;
				case "inline" :
					sbAnnotationService.editInline(aEvent.originalTarget);
					break;
				case "block-comment" :
					sbAnnotationService.createSticky([aEvent.originalTarget.previousSibling, aEvent.originalTarget.firstChild.data]);
					aEvent.originalTarget.parentNode.removeChild(aEvent.originalTarget);
					break;
			}
		}
		else if ( aEvent.type == "mousemove" ) sbAnnotationService.onDrag(aEvent);
		else if ( aEvent.type == "mouseup"   ) sbAnnotationService.stopDrag(aEvent);
		else if ( aEvent.type == "click" )
		{
			switch ( sbPageEditor._getSbObjectType(aEvent.originalTarget) )
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
		sbPageEditor.allowUndo();
		var targetNode;
		if ( aPreset ) {
			targetNode = aPreset[0];
		} else {
			var sel = win.getSelection().QueryInterface(Components.interfaces.nsISelectionPrivate);
			targetNode = sel.toString() ? sel.anchorNode : win.document.body;
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
		sbPageEditor.allowUndo();
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

	startDrag : function(aEvent)
	{
		this.target = aEvent.originalTarget.parentNode;
		this.isMove = aEvent.originalTarget.className == "scrapbook-sticky-header";
		this.offsetX = aEvent.clientX - parseInt(this.target.style[this.isMove ? "left" : "width" ], 10);
		this.offsetY = aEvent.clientY - parseInt(this.target.style[this.isMove ? "top"  : "height"], 10);
		aEvent.view.document.addEventListener("mousemove", this.handleEvent, true);
		aEvent.view.document.addEventListener("mouseup",   this.handleEvent, true);
	},

	onDrag : function(aEvent)
	{
		if ( !this.target || this.target.className.indexOf("scrapbook-sticky") < 0 ) return;
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
		var sel = sbPageEditor.getSelection();
		if ( !sel ) return;
		sbPageEditor.allowUndo();
		var ret = {};
		if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", sbBrowserOverlay.STRING.getFormattedString("EDIT_INLINE", [sbCommonUtils.crop(sel.toString(), 32)]), ret, null, {}) ) return;
		if ( !ret.value ) return;
		var attr = { style : "border-bottom: 2px dotted #FF3333; cursor: help;", "data-sb-obj" : "inline" , class : "scrapbook-inline", title : ret.value };
		sbHighlighter.set(sbPageEditor.focusedWindow, sel, "span", attr);
	},

	editInline : function(aElement)
	{
		sbPageEditor.allowUndo();
		var ret = { value : aElement.getAttribute("title") };
		if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", sbBrowserOverlay.STRING.getFormattedString("EDIT_INLINE", [sbCommonUtils.crop(aElement.textContent, 32)]), ret, null, {}) ) return;
		if ( ret.value )
			aElement.setAttribute("title", ret.value);
		else
			sbPageEditor.removeSbObj(aElement);
	},


	attach : function(aFlag, aLabel)
	{
		var sel = sbPageEditor.getSelection();
		if ( !sel ) return;
		sbPageEditor.allowUndo();
		var attr = {};
		if ( aFlag == "L" )
		{
			var ret = {};
			if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook - " + aLabel, sbPageEditor.STRING.getString("ADDRESS")+":", ret, null, {}) ) return;
			if ( !ret.value ) return;
			attr["href"] = ret.value;
			attr["data-sb-obj"] = "link-url";
		}
		else
		{
			var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
			FP.init(window, aLabel, FP.modeOpen);
			var ret = FP.show();
			if ( ret != FP.returnOK ) return;
			var destFile = sbCommonUtils.getContentDir(sbPageEditor.item.id).clone();
			destFile.append(FP.file.leafName);
			if ( destFile.exists() && destFile.isFile() ) {
				if ( !sbCommonUtils.PROMPT.confirm(window, "ScrapBook", "Would you like to overwrite the file '" + FP.file.leafName + "'?") ) return;
				destFile.remove(false);
			}
			try {
				FP.file.copyTo(destFile.parent, FP.file.leafName);
			} catch(ex) {
				return;
			}
			attr["href"] = sbCommonUtils.getFileName(sbCommonUtils.IO.newFileURI(FP.file).spec);
			attr["data-sb-obj"] = "link-file";
		}
		sbHighlighter.set(sbPageEditor.focusedWindow, sel, "a", attr);
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
		} else {
			aEvent.originalTarget.lastChild.setAttribute("checked", !(sbPageEditor.TOOLBAR.hidden || document.getElementById("ScrapBookToolbox").hidden));
		}
	},

	init : function(aID)
	{
		if ( aID != sbBrowserOverlay.getID() ) return;
		if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.TOOLBAR.hidden = true; return; }
		this.TOOLBAR.hidden = false;
		var isTypeSite = (sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "site");
		document.getElementById("ScrapBookInfoHome").disabled = !isTypeSite;
		document.getElementById("ScrapBookInfoSite").disabled = !isTypeSite;
		document.getElementById("ScrapBookInfoHome").setAttribute("image", "chrome://scrapbook/skin/info_home" + (isTypeSite ? "1" : "0") +  ".png");
		document.getElementById("ScrapBookInfoSite").setAttribute("image", "chrome://scrapbook/skin/info_link" + (isTypeSite ? "1" : "0") +  ".png");
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
		for ( var i = 0; i < sbContentSaver.frameList.length; i++ )
		{
			if ( willEnable )
				this.indicateLinks(sbContentSaver.frameList[i]);
			else
				sbPageEditor.removeStyle(sbContentSaver.frameList[i], "scrapbook-indicator-style");
		}
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
		top.window.openDialog(
			"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[source], null, showDetail, null, 0, null, null, {}, [id, fileName, null, null, 0], "SB"
		);
	},

	openSourceURL : function(tabbed)
	{
		if ( !sbBrowserOverlay.getID() ) return;
		sbCommonUtils.loadURL(sbDataSource.getProperty(sbBrowserOverlay.resource, "source"), tabbed);
	},

	loadFile : function(aFileName)
	{
		var lfURL = gBrowser.currentURI.resolve(aFileName);
		var lfFileSitemapXml = sbCommonUtils.convertURLToFile(lfURL);
		//data-Verzeichnis des ScrapBook bestimmen
		var lfFolderString = "";
		var lfID = "";
		var lfSplit = lfFileSitemapXml.path.split("\\");
		for ( var lfI=0; lfI<lfSplit.length-4; lfI++ )
		{
			lfFolderString += lfSplit[lfI]+"\\";
		}
		lfFolderString += lfSplit[lfSplit.length-4];
		lfID = lfSplit[lfSplit.length-2];
		//nach sitemap.xsl im Ordner des Eintrags suchen (ist die Datei nicht vorhanden, muss sitemap.xml gepatcht werden)
		var lfFileSitemapXsl = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		lfFileSitemapXsl.initWithPath(lfFolderString);
		lfFileSitemapXsl.append("data");
		lfFileSitemapXsl.append(lfID);
		lfFileSitemapXsl.append("sitemap.xsl");
		if ( !lfFileSitemapXsl.exists() )
		{
			var lfData = sbCommonUtils.readFile(lfFileSitemapXml);
			lfData = sbCommonUtils.convertToUnicode(lfData, "UTF-8");
			lfData = lfData.replace(/"\.\.\/\.\.\/sitemap.xsl"/, "\"sitemap.xsl\"");
			lfFileSitemapXml.remove(false);
			sbCommonUtils.writeFile(lfFileSitemapXml, lfData, "UTF-8");
		} else
		{
			lfFileSitemapXsl.remove(false);
		}
		//sitemap.xsl von übergeordnetem Verzeichnis kopieren
		lfFileSitemapXsl = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		lfFileSitemapXsl.initWithPath(lfFolderString);
		lfFileSitemapXsl.append("sitemap.xsl");
		lfFileSitemapXsl.copyTo(lfFileSitemapXml.parent, "sitemap.xsl");
		//gepatchte sitemap.xml laden
		gBrowser.loadURI(gBrowser.currentURI.resolve(aFileName), null, null);
	},

	optimize : function()
	{
		this.TOOLBAR.style.borderBottom = sbPageEditor.TOOLBAR.hidden ? "1px solid ThreeDShadow" : "none";
	},

};



