
var sbPageEditor = {

	get TOOLBAR() { return document.getElementById("ScrapBookEditor"); },
	get COMMENT() { return document.getElementById("ScrapBookEditComment"); },

	item : {},
	changed1 : false,
	changed2 : false,
	multiline : false,
	focusedWindow : null,
	savedBody : null,

<<<<<<< HEAD
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
		var cssText = sbCommonUtils.copyUnicharPref("scrapbook.highlighter.style." + idx, sbHighlighter.PRESET_STYLES[idx]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighterPreview"), cssText);
			//fuer Knoepfe
		var cssText = "";
		cssText = sbCommonUtils.copyUnicharPref("scrapbook.highlighter.style.1", sbHighlighter.PRESET_STYLES[1]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighter1"), cssText);
		cssText = sbCommonUtils.copyUnicharPref("scrapbook.highlighter.style.2", sbHighlighter.PRESET_STYLES[2]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighter2"), cssText);
		cssText = sbCommonUtils.copyUnicharPref("scrapbook.highlighter.style.3", sbHighlighter.PRESET_STYLES[3]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighter3"), cssText);
		cssText = sbCommonUtils.copyUnicharPref("scrapbook.highlighter.style.4", sbHighlighter.PRESET_STYLES[4]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighter4"), cssText);
		cssText = sbCommonUtils.copyUnicharPref("scrapbook.highlighter.style.5", sbHighlighter.PRESET_STYLES[5]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighter5"), cssText);
		cssText = sbCommonUtils.copyUnicharPref("scrapbook.highlighter.style.6", sbHighlighter.PRESET_STYLES[6]);
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighter6"), cssText);
			//
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		prefs = prefs.getBranch("extensions.scrapbookplus.");
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
=======
	init : function(aID)
	{
		if ( aID )
		{
			if ( aID != ScrapBookBrowserOverlay.getID() ) return;
			if ( !ScrapBookData.exists(ScrapBookBrowserOverlay.resource) ) { this.disable(true); return; }
>>>>>>> release-1.6.0.a1
		}
		this.changed1 = false;
		this.changed2 = false;
		if ( aID ) {
<<<<<<< HEAD
			this.item = sbCommonUtils.newItem(aID);
			for ( var prop in this.item ) this.item[prop] = sbDataSource.getProperty(sbBrowserOverlay.resource, prop);
		} else {
			this.item = null;
			sbBrowserOverlay.resource = null;
=======
			this.item = ScrapBookData.newItem(aID);
			for ( var prop in this.item ) this.item[prop] = ScrapBookData.getProperty(ScrapBookBrowserOverlay.resource, prop);
		} else {
			this.item = null;
			ScrapBookBrowserOverlay.resource = null;
>>>>>>> release-1.6.0.a1
		}
		this.disable(false);
		this.showHide(true);
		if ( !aID )
		{
			document.getElementById("ScrapBookToolbox").hidden = false;
			sbInfoViewer.TOOLBAR.hidden = true;
		}
		document.getElementById("ScrapBookEditTitle").value =  aID ? this.item.title : gBrowser.selectedTab.label;
<<<<<<< HEAD
		document.getElementById("ScrapBookEditIcon").src    = (aID ? this.item.icon  : gBrowser.selectedTab.getAttribute("image")) || sbCommonUtils.getDefaultIcon();
=======
		document.getElementById("ScrapBookEditIcon").src    = (aID ? this.item.icon  : gBrowser.selectedTab.getAttribute("image")) || ScrapBookUtils.getDefaultIcon();
>>>>>>> release-1.6.0.a1
		try { document.getElementById("ScrapBookEditTitle").editor.transactionManager.clear(); } catch(ex) {}
		this.COMMENT.value = aID ? this.item.comment.replace(/ __BR__ /g, this.multiline ? "\n" : "\t") : "";
		try { this.COMMENT.editor.transactionManager.clear(); } catch(ex) {}
		if ( aID && gBrowser.currentURI.spec.indexOf("index.html") > 0 )
		{
			gBrowser.selectedTab.label = this.item.title;
			gBrowser.selectedTab.setAttribute("image", this.item.icon);
		}
		sbPageEditor.allowUndo();
		sbDOMEraser.init(0);
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window.content);
		for ( var i = 0; i < sbContentSaver.frameList.length; i++ )
		{
<<<<<<< HEAD
			try
			{
				sbContentSaver.frameList[i].document.removeEventListener("mousedown", sbAnnotationService.handleEvent, true);
			} catch(ex) {}
			sbContentSaver.frameList[i].document.addEventListener("mousedown",    sbAnnotationService.handleEvent, true);
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
=======
			sbContentSaver.frameList[i].document.removeEventListener("mousedown", sbAnnotationService.handleEvent, true);
			sbContentSaver.frameList[i].document.addEventListener("mousedown",    sbAnnotationService.handleEvent, true);
			sbContentSaver.frameList[i].document.removeEventListener("keypress", this.handleEvent, true);
			sbContentSaver.frameList[i].document.addEventListener("keypress",    this.handleEvent, true);
>>>>>>> release-1.6.0.a1
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
			sbPageEditor.confirmSave();
		}
	},

	toggleComment : function()
	{
		this.multiline = !this.multiline;
		var val = this.COMMENT.value;
		this.COMMENT.setAttribute("multiline", this.multiline);
		this.COMMENT.setAttribute("style", this.multiline ? "height:100px;" : "padding:2px;");
		if ( this.multiline ) {
<<<<<<< HEAD
			document.getElementById("ScrapBookToggleComment").setAttribute("tooltiptext", this.STRING.getString("MIN_COMMENT"));
			document.getElementById("ScrapBookToolbox").appendChild(this.COMMENT);
			val = val.replace(/\t/g, "\n");
		} else {
			document.getElementById("ScrapBookToggleComment").setAttribute("tooltiptext", this.STRING.getString("MAX_COMMENT"));
			this.TOOLBAR.insertBefore(this.COMMENT, document.getElementById("ScrapBookHighlighterPreview"));
=======
			document.getElementById("ScrapBookToolbox").appendChild(this.COMMENT);
			val = val.replace(/\t/g, "\n");
		} else {
			this.TOOLBAR.insertBefore(this.COMMENT, document.getElementById("ScrapBookHighlighter"));
>>>>>>> release-1.6.0.a1
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
		this.changed2 = true; 
	},

	getSelection : function()
	{
<<<<<<< HEAD
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
=======
		this.focusedWindow = ScrapBookUtils.getFocusedWindow();
		var sel = this.focusedWindow.getSelection().QueryInterface(Ci.nsISelectionPrivate);
		var selected = sel.anchorNode !== sel.focusNode || sel.anchorOffset != sel.focusOffset;
		return selected ? sel : null;
>>>>>>> release-1.6.0.a1
	},

	cutter : function()
	{
		var sel = this.getSelection();
		if ( !sel ) return;
		this.allowUndo(this.focusedWindow.document);
		sel.deleteFromDocument();
		this.changed1 = true;
	},

	highlight : function(idx)
	{
<<<<<<< HEAD
		if ( !idx ) idx = document.getElementById("ScrapBookHighlighter").getAttribute("color") || 6;	//DropDownList
		document.getElementById("ScrapBookHighlighter").setAttribute("color", idx);
		var attr = {};
		attr["style"] = sbCommonUtils.copyUnicharPref("scrapbook.highlighter.style." + idx, sbHighlighter.PRESET_STYLES[idx]);	//DropDownList
		sbHighlighter.decorateElement(document.getElementById("ScrapBookHighlighterPreview"), attr["style"]);	//DropDownList
		var sel = this.getSelection();
		if ( !sel ) return;
		this.allowUndo(this.focusedWindow.document);
		attr["class"] = "linemarker-marked-line";
=======
		if ( !idx ) idx = document.getElementById("ScrapBookHighlighter").getAttribute("color") || 4;
		document.getElementById("ScrapBookHighlighter").setAttribute("color", idx);
		var sel = this.getSelection();
		if ( !sel ) return;
		this.allowUndo(this.focusedWindow.document);
		var attr = {};
		attr["class"] = "linemarker-marked-line";
		attr["style"] = ScrapBookUtils.getPref("highlighter.style." + idx, sbHighlighter.PRESET_STYLES[idx]);
>>>>>>> release-1.6.0.a1
		sbHighlighter.set(this.focusedWindow, sel, "span", attr);
		this.changed1 = true;
	},

	removeHighlights : function()
	{
		var sel = this.getSelection();
		if ( !sel ) return;
		var selRange  = sel.getRangeAt(0);
		var node = selRange.startContainer;
		if ( node.nodeName == "#text" ) node = node.parentNode;
		var nodeRange = window.content.document.createRange();
		traceTree : while ( true )
		{
			nodeRange.selectNode(node);
			if ( nodeRange.compareBoundaryPoints(Range.START_TO_END, selRange) > -1 )
			{
				if ( nodeRange.compareBoundaryPoints(Range.END_TO_START, selRange) > 0 ) break;
				else if ( node.nodeName.toUpperCase() == "SPAN" && node.getAttribute("class") == "linemarker-marked-line" )
				{
					this.stripAttributes(node);
				}
			}
			if ( node.hasChildNodes() ) node = node.firstChild;
			else
			{
				while ( !node.nextSibling ) { node = node.parentNode; if ( !node ) break traceTree; }
				node = node.nextSibling;
			}
		}
		this.changed1 = true;
	},

	removeAllSpan : function(aClassName)
	{
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window.content);
		for ( var i = 0; i < sbContentSaver.frameList.length; i++ )
		{
			var elems = sbContentSaver.frameList[i].document.getElementsByTagName("span");
			for ( var j = 0; j < elems.length; j++ )
			{
				if ( elems[j].getAttribute("class") == aClassName )
				{
					this.stripAttributes(elems[j]);
				}
			}
		}
		this.changed1 = true;
		this.allowUndo();
	},

	removeElementsByTagName : function(aTagName)
	{
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
			this.allowUndo();
		}
	},

	stripAttributes : function(aElement)
	{
		aElement.removeAttribute("style");
		aElement.removeAttribute("class");
		aElement.removeAttribute("title");
	},

	selection2Title : function(aElement)
	{
		var sel = this.getSelection();
		if ( !sel ) return;
<<<<<<< HEAD
		aElement.value = sbCommonUtils.crop(sel.toString().replace(/[\r\n\t\s]+/g, " "), 100);
=======
		aElement.value = ScrapBookUtils.crop(sel.toString().replace(/[\r\n\t\s]+/g, " "), 100);
>>>>>>> release-1.6.0.a1
		sel.removeAllRanges();
		this.changed2 = true;
	},

	restore : function()
	{
<<<<<<< HEAD
		window.sbBrowserOverlay.lastLocation = "";
=======
		window.ScrapBookBrowserOverlay.lastLocation = "";
>>>>>>> release-1.6.0.a1
		window.content.location.reload();
	},

	exit : function(forceExit)
	{
		if ( !forceExit && this.confirmSave() == 1 ) this.restore();
		if ( sbDOMEraser.enabled ) sbDOMEraser.init(2);
		this.showHide(false);
	},

	allowUndo : function(aTargetDocument)
	{
		if ( aTargetDocument )
			this.savedBody = aTargetDocument.body.cloneNode(true);
		else
			delete this.savedBody;
	},

	undo : function()
	{
		if ( this.savedBody ) {
			this.savedBody.ownerDocument.body.parentNode.replaceChild(this.savedBody, this.savedBody.ownerDocument.body);
			this.allowUndo();
		} else {
			this.restore();
		}
	},

	confirmSave : function()
	{
		if ( this.changed2 ) this.saveResource();
		if ( !this.changed1 ) return 0;
<<<<<<< HEAD
		var button = sbCommonUtils.PROMPT.BUTTON_TITLE_SAVE * sbCommonUtils.PROMPT.BUTTON_POS_0 + sbCommonUtils.PROMPT.BUTTON_TITLE_DONT_SAVE * sbCommonUtils.PROMPT.BUTTON_POS_1;
		var ret = sbCommonUtils.PROMPT.confirmEx(window, "ScrapBook", sbBrowserOverlay.STRING.getFormattedString("EDIT_SAVE_CHANGES", [sbCommonUtils.crop(this.item.title, 32)]), button, null, null, null, null, {});
=======
		var button = ScrapBookUtils.PROMPT.BUTTON_TITLE_SAVE      * ScrapBookUtils.PROMPT.BUTTON_POS_0
		           + ScrapBookUtils.PROMPT.BUTTON_TITLE_DONT_SAVE * ScrapBookUtils.PROMPT.BUTTON_POS_1;
		var text = ScrapBookBrowserOverlay.STRING.getFormattedString("EDIT_SAVE_CHANGES", [ScrapBookUtils.crop(this.item.title, 32)]);
		var ret = ScrapBookUtils.PROMPT.confirmEx(window, "[ScrapBook]", text, button, null, null, null, null, {});
>>>>>>> release-1.6.0.a1
		if ( ret == 0 ) this.savePage();
		this.changed1 = false;
		return ret;
	},

	saveOrCapture : function(aBypassDialog)
	{
<<<<<<< HEAD
		if ( sbBrowserOverlay.getID() ) {
=======
		if ( ScrapBookBrowserOverlay.getID() ) {
>>>>>>> release-1.6.0.a1
			this.savePage();
			this.saveResource();
		} else {
			sbDOMEraser.init(2);
<<<<<<< HEAD
			var ret = sbBrowserOverlay.execCapture(0, null, !aBypassDialog, "urn:scrapbook:root");
=======
			var ret = ScrapBookBrowserOverlay.execCapture(0, null, !aBypassDialog, "urn:scrapbook:root");
>>>>>>> release-1.6.0.a1
			if ( ret ) this.exit(true);
		}
	},

	savePage : function()
	{
<<<<<<< HEAD
		if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.disable(true); return; }
		var curURL = window.content.location.href;
		if ( curURL.indexOf("file://") != 0 || !curURL.match(/\/data\/(\d{14})\/(.+)$/) || RegExp.$1 != this.item.id || RegExp.$2 == "index.dat" || RegExp.$2 == "sitemap.xml" )
		{
			alert("ScrapBook ERROR: Cannot save file '" + RegExp.$2 + "'.");
=======
		if ( !ScrapBookData.exists(ScrapBookBrowserOverlay.resource) ) { this.disable(true); return; }
		var curURL = window.content.location.href;
		if ( curURL.indexOf("file://") != 0 || !curURL.match(/\/data\/(\d{14})\/(.+)$/) || RegExp.$1 != this.item.id || RegExp.$2 == "index.dat" || RegExp.$2 == "sitemap.xml" )
		{
			ScrapBookUtils.alert("ERROR: Cannot save file '" + RegExp.$2 + "'.");
>>>>>>> release-1.6.0.a1
			return;
		}
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window.content);
		this.disable(true);
		sbDOMEraser.init(2);
		for ( var i = 0; i < sbContentSaver.frameList.length; i++ )
		{
			this.removeAllStyles(sbContentSaver.frameList[i]);
			var doc = sbContentSaver.frameList[i].document;
			if ( doc.contentType != "text/html" )
			{
<<<<<<< HEAD
				alert("ScrapBook ERROR: Cannot modify " + doc.contentType + " content.");
=======
				ScrapBookUtils.alert("ERROR: Cannot modify " + doc.contentType + " content.");
>>>>>>> release-1.6.0.a1
				continue;
			}
			var rootNode = doc.getElementsByTagName("html")[0];
			var src = "";
			src = sbContentSaver.surroundByTags(rootNode, rootNode.innerHTML);
			src = sbContentSaver.doctypeToString(doc.doctype) + src;
			src = src.replace(/ -moz-background-clip: initial; -moz-background-origin: initial; -moz-background-inline-policy: initial;\">/g, '">');
			src = src.replace(/<span>([^<]*)<\/span>/g, "$1");
			src = src.replace(/<head>\n+/, "<head>\n");
			var charset = doc.characterSet;
			if ( src.indexOf("scrapbook-sticky") > 0 && charset != "UTF-8" )
			{
<<<<<<< HEAD
				sbDataSource.setProperty(sbBrowserOverlay.resource, "chars", "UTF-8");
				src = src.replace(/ charset=[^\"]+\">/i, ' charset=UTF-8">');
				charset = "UTF-8";
			}
			var file = sbCommonUtils.getContentDir(this.item.id).clone();
			file.append(sbCommonUtils.getFileName(doc.location.href));
			sbCommonUtils.writeFile(file, src, charset);
=======
				ScrapBookData.setProperty(ScrapBookBrowserOverlay.resource, "chars", "UTF-8");
				src = src.replace(/ charset=[^\"]+\">/i, ' charset=UTF-8">');
				charset = "UTF-8";
			}
			var file = ScrapBookUtils.getContentDir(this.item.id).clone();
			file.append(ScrapBookUtils.getFileName(doc.location.href));
			ScrapBookUtils.writeFile(file, src, charset);
>>>>>>> release-1.6.0.a1
			if ( document.getElementById("ScrapBookStatusPopupD").getAttribute("checked") )
			{
				sbInfoViewer.indicateLinks(sbContentSaver.frameList[i]);
			}
		}
		this.changed1 = false;
		window.setTimeout(function() { window.content.stop(); sbPageEditor.disable(false); }, 500);
	},

	saveResource : function()
	{
		if ( !this.item ) return;
<<<<<<< HEAD
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
=======
		if ( !ScrapBookData.exists(ScrapBookBrowserOverlay.resource) ) { this.disable(true); return; }
		var newTitle   = document.getElementById("ScrapBookEditTitle").value;
		var newComment = ScrapBookUtils.escapeComment(this.COMMENT.value);
		if ( newTitle != this.item.title || newComment != this.item.comment )
		{
			this.disableTemporary(500);
			ScrapBookData.setProperty(ScrapBookBrowserOverlay.resource, "title",   newTitle);
			ScrapBookData.setProperty(ScrapBookBrowserOverlay.resource, "comment", newComment);
			this.item.title   = newTitle;
			this.item.comment = newComment;
			ScrapBookUtils.writeIndexDat(this.item);
		}
		var ss = Cc['@mozilla.org/browser/sessionstore;1']
			.getService(Ci.nsISessionStore);
		ss.deleteTabValue(gBrowser.mCurrentTab, "scrapbook-comment");
>>>>>>> release-1.6.0.a1
		this.changed2 = false;
	},

	disableTemporary : function(msec)
	{
		window.setTimeout(function() { sbPageEditor.disable(true);  }, 0);
		window.setTimeout(function() { sbPageEditor.disable(false); }, msec);
<<<<<<< HEAD
		//Verhindert das Zurückbleiben von "ZombieCompartments"
		sbContentSaver.frameList = null;
		this.focusedWindow = null;
		this.savedBody = null;
=======
>>>>>>> release-1.6.0.a1
	},

	disable : function(aBool)
	{
		var elems = this.TOOLBAR.childNodes;
		for ( var i = 0; i < elems.length; i++ ) elems[i].disabled = aBool;
		this.COMMENT.disabled = aBool;
	},

	toggle : function()
	{
<<<<<<< HEAD
		var id = sbBrowserOverlay.getID();
		if ( !id ) return;
		this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
		sbBrowserOverlay.editMode = this.TOOLBAR.hidden;
=======
		var id = ScrapBookBrowserOverlay.getID();
		if ( !id ) return;
		this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
		ScrapBookBrowserOverlay.editMode = this.TOOLBAR.hidden;
>>>>>>> release-1.6.0.a1
		this.TOOLBAR.hidden ? this.init(id) : this.exit();
	},

	showHide : function(willShow)
	{
		this.COMMENT.hidden = !willShow;
		this.TOOLBAR.hidden = !willShow;
		willShow ? this.TOOLBAR.setAttribute("moz-collapsed", "false") : this.TOOLBAR.removeAttribute("moz-collapsed");
		sbInfoViewer.optimize();
<<<<<<< HEAD
		//Verhindert das Zurückbleiben von "ZombieCompartments"
		sbContentSaver.frameList = null;
		this.focusedWindow = null;
		this.savedBody = null;
=======
>>>>>>> release-1.6.0.a1
	},


	applyStyle : function(aWindow, aID, aString)
	{
		if ( aWindow.document.getElementById(aID) )
		{
			return;
		}
		var newNode = aWindow.document.createElement("style");
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

	removeAllStyles : function(aWindow)
	{
		var nodes = aWindow.document.getElementsByTagName("style");
		for ( var i = nodes.length - 1; i >= 0 ; i-- )
		{
			if ( nodes[i].id.indexOf("scrapbook-") == 0 ) sbContentSaver.removeNodeFromParent(nodes[i]);
		}
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
<<<<<<< HEAD
		document.getElementById("ScrapBookHighlighter").disabled = this.enabled;	//DropDownList
		document.getElementById("ScrapBookHighlighter1").disabled = this.enabled;
		document.getElementById("ScrapBookHighlighter2").disabled = this.enabled;
		document.getElementById("ScrapBookHighlighter3").disabled = this.enabled;
		document.getElementById("ScrapBookHighlighter4").disabled = this.enabled;
		document.getElementById("ScrapBookHighlighter5").disabled = this.enabled;
		document.getElementById("ScrapBookHighlighter6").disabled = this.enabled;
=======
		document.getElementById("ScrapBookHighlighter").disabled = this.enabled;
>>>>>>> release-1.6.0.a1
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
		var onMarker = (tagName == "SPAN" && elem.getAttribute("class") == "linemarker-marked-line");
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
				if ( onMarker ) {
<<<<<<< HEAD
					tooltip.textContent = sbBrowserOverlay.STRING.getString("EDIT_REMOVE_HIGHLIGHT");
=======
					tooltip.textContent = ScrapBookBrowserOverlay.STRING.getString("EDIT_REMOVE_HIGHLIGHT");
>>>>>>> release-1.6.0.a1
				} else {
					tooltip.textContent = elem.localName;
					if ( elem.id ) tooltip.textContent += ' id="' + elem.id + '"';
					if ( elem.className ) tooltip.textContent += ' class="' + elem.className + '"';
				}
				elem.style.outline = onMarker ? "2px dashed #0000FF" : "2px solid #FF0000";
			}
		}
		else if ( aEvent.type == "mouseout" || aEvent.type == "click" )
		{
			var tooltip = elem.ownerDocument.getElementById("scrapbook-eraser-tooltip");
			if ( tooltip ) elem.ownerDocument.body.removeChild(tooltip);
			elem.style.outline = "";
			if ( !elem.getAttribute("style") ) elem.removeAttribute("style");
			if ( aEvent.type == "click" )
			{
				sbPageEditor.allowUndo(elem.ownerDocument);
				if ( aEvent.shiftKey || aEvent.button == 2 )
				{
					sbDOMEraser.isolateNode(elem);
				}
				else
				{
					if ( onMarker )
						sbPageEditor.stripAttributes(elem);
					else
						elem.parentNode.removeChild(elem);
				}
				sbPageEditor.changed1 = true;
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
			switch ( aEvent.originalTarget.className )
			{
				case "scrapbook-sticky" : case "scrapbook-sticky scrapbook-sticky-relative" :
					if ( aEvent.originalTarget.childNodes.length != 2 ) return;
					sbAnnotationService.editSticky(aEvent.originalTarget);
					break;
				case "scrapbook-block-comment" :
					sbAnnotationService.createSticky([aEvent.originalTarget.previousSibling, aEvent.originalTarget.firstChild.data]);
					aEvent.originalTarget.parentNode.removeChild(aEvent.originalTarget);
					break;
				case "scrapbook-inline" : case "scrapbook-inline-comment" :
					sbAnnotationService.editInline(aEvent.originalTarget);
					break;
				case "scrapbook-sticky-header" : case "scrapbook-sticky-footer" :
					sbAnnotationService.startDrag(aEvent);
					break;
			}
		}
		else if ( aEvent.type == "mousemove" ) sbAnnotationService.onDrag(aEvent);
		else if ( aEvent.type == "mouseup"   ) sbAnnotationService.stopDrag(aEvent);
	},

	createSticky : function(aPreset)
	{
<<<<<<< HEAD
		var win = sbCommonUtils.getFocusedWindow();
=======
		var win = ScrapBookUtils.getFocusedWindow();
>>>>>>> release-1.6.0.a1
		if ( win.document.body instanceof HTMLFrameSetElement ) win = win.frames[0];
		sbPageEditor.allowUndo(win.document);
		var targetNode;
		if ( aPreset ) {
			targetNode = aPreset[0];
		} else {
<<<<<<< HEAD
			var sel = win.getSelection().QueryInterface(Components.interfaces.nsISelectionPrivate);
=======
			var sel = win.getSelection().QueryInterface(Ci.nsISelectionPrivate);
>>>>>>> release-1.6.0.a1
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
		this.editSticky(div);
		sbPageEditor.changed1 = true;
		sbPageEditor.disableTemporary(500);
	},

	editSticky : function(oldElem)
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
		sbPageEditor.changed1 = true;
	},

	startDrag : function(aEvent)
	{
		this.target = aEvent.originalTarget.parentNode;
		this.isMove = aEvent.originalTarget.className == "scrapbook-sticky-header";
		this.offsetX = aEvent.clientX - parseInt(this.target.style[this.isMove ? "left" : "width" ], 10);
		this.offsetY = aEvent.clientY - parseInt(this.target.style[this.isMove ? "top"  : "height"], 10);
		aEvent.view.document.addEventListener("mousemove", this.handleEvent, true);
		aEvent.view.document.addEventListener("mouseup",   this.handleEvent, true);
		sbPageEditor.changed1 = true;
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
		mainDiv.appendChild(headDiv);
		if ( isEditable )
		{
			var textArea = window.content.document.createElement("TEXTAREA");
			var footDiv  = window.content.document.createElement("DIV");
			var button1  = window.content.document.createElement("INPUT");
			var button2  = window.content.document.createElement("INPUT");
			button1.setAttribute("type", "image"); button1.setAttribute("src", "chrome://scrapbook/skin/sticky_save.png");
			button2.setAttribute("type", "image"); button2.setAttribute("src", "chrome://scrapbook/skin/sticky_delete.png");
			button1.setAttribute("onclick", "this.parentNode.parentNode.appendChild(document.createTextNode(this.parentNode.previousSibling.value));this.parentNode.parentNode.removeChild(this.parentNode.previousSibling);this.parentNode.parentNode.removeChild(this.parentNode);");
			button2.setAttribute("onclick", "this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode);");
			footDiv.className = "scrapbook-sticky-footer";
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
		mainDiv.className = "scrapbook-sticky" + (isRelative ? " scrapbook-sticky-relative" : "");
		return mainDiv;
	},


	addInline : function()
	{
		var sel = sbPageEditor.getSelection();
		if ( !sel ) return;
		sbPageEditor.allowUndo(sbPageEditor.focusedWindow.document);
		var ret = {};
<<<<<<< HEAD
		if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", sbBrowserOverlay.STRING.getFormattedString("EDIT_INLINE", [sbCommonUtils.crop(sel.toString(), 32)]), ret, null, {}) ) return;
=======
		if ( !ScrapBookUtils.PROMPT.prompt(window, "[ScrapBook]", ScrapBookBrowserOverlay.STRING.getFormattedString("EDIT_INLINE", [ScrapBookUtils.crop(sel.toString(), 32)]), ret, null, {}) ) return;
>>>>>>> release-1.6.0.a1
		if ( !ret.value ) return;
		var attr = { style : "border-bottom: 2px dotted #FF3333; cursor: help;", class : "scrapbook-inline", title : ret.value };
		sbHighlighter.set(sbPageEditor.focusedWindow, sel, "span", attr);
		sbPageEditor.changed1 = true;
	},

	editInline : function(aElement)
	{
		var ret = { value : aElement.getAttribute("title") };
<<<<<<< HEAD
		if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", sbBrowserOverlay.STRING.getFormattedString("EDIT_INLINE", [sbCommonUtils.crop(aElement.textContent, 32)]), ret, null, {}) ) return;
=======
		if ( !ScrapBookUtils.PROMPT.prompt(window, "[ScrapBook]", ScrapBookBrowserOverlay.STRING.getFormattedString("EDIT_INLINE", [ScrapBookUtils.crop(aElement.textContent, 32)]), ret, null, {}) ) return;
>>>>>>> release-1.6.0.a1
		if ( ret.value )
			aElement.setAttribute("title", ret.value);
		else
			sbPageEditor.stripAttributes(aElement);
		sbPageEditor.changed1 = true;
	},


	attach : function(aFlag, aLabel)
	{
		var sel = sbPageEditor.getSelection();
		if ( !sel ) return;
		sbPageEditor.allowUndo(sbPageEditor.focusedWindow.document);
		var attr = {};
		if ( aFlag == "L" )
		{
			var ret = {};
<<<<<<< HEAD
			if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook - " + aLabel, sbPageEditor.STRING.getString("ADDRESS")+":", ret, null, {}) ) return;
=======
			var text = ScrapBookUtils.getLocaleString("URL") + ":";
			if ( !ScrapBookUtils.PROMPT.prompt(window, "[ScrapBook]", text, ret, null, {}) ) return;
>>>>>>> release-1.6.0.a1
			if ( !ret.value ) return;
			attr["href"] = ret.value;
		}
		else
		{
<<<<<<< HEAD
			var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
			FP.init(window, aLabel, FP.modeOpen);
			var ret = FP.show();
			if ( ret != FP.returnOK ) return;
			var destFile = sbCommonUtils.getContentDir(sbPageEditor.item.id).clone();
			destFile.append(FP.file.leafName);
			if ( destFile.exists() && destFile.isFile() ) {
				if ( !sbCommonUtils.PROMPT.confirm(window, "ScrapBook", "Would you like to overwrite the file '" + FP.file.leafName + "'?") ) return;
=======
			var FP = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
			FP.init(window, aLabel, FP.modeOpen);
			var ret = FP.show();
			if ( ret != FP.returnOK ) return;
			var destFile = ScrapBookUtils.getContentDir(sbPageEditor.item.id).clone();
			destFile.append(FP.file.leafName);
			if ( destFile.exists() && destFile.isFile() ) {
				var text = "Would you like to overwrite the file '" + FP.file.leafName + "'?";
				if ( !ScrapBookUtils.PROMPT.confirm(window, "[ScrapBook]", text) ) return;
>>>>>>> release-1.6.0.a1
				destFile.remove(false);
			}
			try {
				FP.file.copyTo(destFile.parent, FP.file.leafName);
			} catch(ex) {
				return;
			}
<<<<<<< HEAD
			attr["href"] = sbCommonUtils.getFileName(sbCommonUtils.IO.newFileURI(FP.file).spec);
=======
			attr["href"] = ScrapBookUtils.getFileName(ScrapBookUtils.IO.newFileURI(FP.file).spec);
>>>>>>> release-1.6.0.a1
		}
		sbHighlighter.set(sbPageEditor.focusedWindow, sel, "a", attr);
		sbPageEditor.changed1 = true;
	},

};




var sbInfoViewer = {

	get TOOLBAR() { return document.getElementById("ScrapBookInfobar"); },

	onPopupShowing : function(aEvent)
	{
<<<<<<< HEAD
		var id = sbBrowserOverlay.getID();
=======
		var id = ScrapBookBrowserOverlay.getID();
>>>>>>> release-1.6.0.a1
		var elems = aEvent.originalTarget.childNodes;
		for ( var i = 0; i < elems.length - 2; i++ ) elems[i].setAttribute("disabled", id ? "false" : "true");
		for ( i; i < elems.length; i++ ) elems[i].hidden = id;
		if ( id ) {
<<<<<<< HEAD
			if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { aEvent.preventDefault(); return; }
			document.getElementById("ScrapBookStatusPopupE").setAttribute("checked",  sbBrowserOverlay.editMode);
			document.getElementById("ScrapBookStatusPopupI").setAttribute("checked",  sbBrowserOverlay.infoMode);
			document.getElementById("ScrapBookStatusPopupM").setAttribute("disabled", sbDataSource.getProperty(sbBrowserOverlay.resource, "type") != "site");
=======
			if ( !ScrapBookData.exists(ScrapBookBrowserOverlay.resource) ) { aEvent.preventDefault(); return; }
			document.getElementById("ScrapBookStatusPopupE").setAttribute("checked",  ScrapBookBrowserOverlay.editMode);
			document.getElementById("ScrapBookStatusPopupI").setAttribute("checked",  ScrapBookBrowserOverlay.infoMode);
>>>>>>> release-1.6.0.a1
		} else {
			aEvent.originalTarget.lastChild.setAttribute("checked", !(sbPageEditor.TOOLBAR.hidden || document.getElementById("ScrapBookToolbox").hidden));
		}
	},

	init : function(aID)
	{
<<<<<<< HEAD
		if ( aID != sbBrowserOverlay.getID() ) return;
		if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.TOOLBAR.hidden = true; return; }
		this.TOOLBAR.hidden = false;
		var isTypeSite = (sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "site");
=======
		if ( aID != ScrapBookBrowserOverlay.getID() ) return;
		if ( !ScrapBookData.exists(ScrapBookBrowserOverlay.resource) ) { this.TOOLBAR.hidden = true; return; }
		this.TOOLBAR.hidden = false;
		var isTypeSite = (ScrapBookData.getProperty(ScrapBookBrowserOverlay.resource, "type") == "site");
>>>>>>> release-1.6.0.a1
		document.getElementById("ScrapBookInfoHome").disabled = !isTypeSite;
		document.getElementById("ScrapBookInfoSite").disabled = !isTypeSite;
		document.getElementById("ScrapBookInfoHome").setAttribute("image", "chrome://scrapbook/skin/info_home" + (isTypeSite ? "1" : "0") +  ".png");
		document.getElementById("ScrapBookInfoSite").setAttribute("image", "chrome://scrapbook/skin/info_link" + (isTypeSite ? "1" : "0") +  ".png");
		var srcLabel = document.getElementById("ScrapBookInfoSource");
<<<<<<< HEAD
		srcLabel.value = sbDataSource.getProperty(sbBrowserOverlay.resource, "source");
		srcLabel.onclick = function(aEvent){ sbCommonUtils.loadURL(srcLabel.value, aEvent.button == 1); };
=======
		srcLabel.value = ScrapBookData.getProperty(ScrapBookBrowserOverlay.resource, "source");
		srcLabel.onclick = function(aEvent){ ScrapBookUtils.loadURL(srcLabel.value, aEvent.button == 1); };
>>>>>>> release-1.6.0.a1
	},

	toggle : function()
	{
<<<<<<< HEAD
		var id = sbBrowserOverlay.getID();
		if ( !id ) return;
		this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
		sbBrowserOverlay.infoMode = this.TOOLBAR.hidden;
=======
		var id = ScrapBookBrowserOverlay.getID();
		if ( !id ) return;
		this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
		ScrapBookBrowserOverlay.infoMode = this.TOOLBAR.hidden;
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		var id = sbBrowserOverlay.getID();
		if ( !id ) return;
		var fileName = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(window.content.location.href))[0];
		var source = fileName == "index" ? sbDataSource.getProperty(sbBrowserOverlay.resource, "source") : "";
		top.window.openDialog(
			"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[source], null, showDetail, null, 0, null, null, {}, [id, fileName, null, null, 0], "SB"
=======
		var id = ScrapBookBrowserOverlay.getID();
		if ( !id ) return;
		var fileName = ScrapBookUtils.splitFileName(ScrapBookUtils.getFileName(window.content.location.href))[0];
		var source = fileName == "index" ? ScrapBookData.getProperty(ScrapBookBrowserOverlay.resource, "source") : "";
		top.window.openDialog(
			"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[source], null, showDetail, null, 0, null, null, {}, [id, fileName, null, null, 0]
>>>>>>> release-1.6.0.a1
		);
	},

	openSourceURL : function(tabbed)
	{
<<<<<<< HEAD
		if ( !sbBrowserOverlay.getID() ) return;
		sbCommonUtils.loadURL(sbDataSource.getProperty(sbBrowserOverlay.resource, "source"), tabbed);
=======
		if ( !ScrapBookBrowserOverlay.getID() ) return;
		ScrapBookUtils.loadURL(ScrapBookData.getProperty(ScrapBookBrowserOverlay.resource, "source"), tabbed);
>>>>>>> release-1.6.0.a1
	},

	loadFile : function(aFileName)
	{
<<<<<<< HEAD
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
=======
>>>>>>> release-1.6.0.a1
		gBrowser.loadURI(gBrowser.currentURI.resolve(aFileName), null, null);
	},

	optimize : function()
	{
		this.TOOLBAR.style.borderBottom = sbPageEditor.TOOLBAR.hidden ? "1px solid ThreeDShadow" : "none";
	},

};



