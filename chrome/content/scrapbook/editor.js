
var sbPageEditor = {

	get TOOLBAR() { return document.getElementById("ScrapBookEditor"); },
	get COMMENT() { return document.getElementById("ScrapBookEditComment"); },

	item : {},
	changed1 : false,
	changed2 : false,
	multiline : false,
	focusedWindow : null,
	savedBody : null,

	init : function(aID)
	{
		if ( aID )
		{
			if ( aID != ScrapBookBrowserOverlay.getID() ) return;
			if ( !ScrapBookData.exists(ScrapBookBrowserOverlay.resource) ) { this.disable(true); return; }
		}
		this.changed1 = false;
		this.changed2 = false;
		if ( aID ) {
			this.item = ScrapBookData.newItem(aID);
			for ( var prop in this.item ) this.item[prop] = ScrapBookData.getProperty(ScrapBookBrowserOverlay.resource, prop);
		} else {
			this.item = null;
			ScrapBookBrowserOverlay.resource = null;
		}
		this.disable(false);
		this.showHide(true);
		if ( !aID )
		{
			document.getElementById("ScrapBookToolbox").hidden = false;
			sbInfoViewer.TOOLBAR.hidden = true;
		}
		document.getElementById("ScrapBookEditTitle").value =  aID ? this.item.title : gBrowser.selectedTab.label;
		document.getElementById("ScrapBookEditIcon").src    = (aID ? this.item.icon  : gBrowser.selectedTab.getAttribute("image")) || ScrapBookUtils.getDefaultIcon();
		try { document.getElementById("ScrapBookEditTitle").editor.transactionManager.clear(); } catch(ex) {}
		this.COMMENT.value = aID ? this.item.comment.replace(/ __BR__ /g, this.multiline ? "\n" : "\t") : "";
		this.refreshUndo();
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
			sbContentSaver.frameList[i].document.removeEventListener("mousedown", sbAnnotationService.handleEvent, true);
			sbContentSaver.frameList[i].document.addEventListener("mousedown",    sbAnnotationService.handleEvent, true);
			sbContentSaver.frameList[i].document.removeEventListener("keypress", this.handleEvent, true);
			sbContentSaver.frameList[i].document.addEventListener("keypress",    this.handleEvent, true);
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
			document.getElementById("ScrapBookToolbox").appendChild(this.COMMENT);
			val = val.replace(/\t/g, "\n");
		} else {
			this.TOOLBAR.insertBefore(this.COMMENT, document.getElementById("ScrapBookHighlighter"));
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
		this.focusedWindow = ScrapBookUtils.getFocusedWindow();
		var sel = this.focusedWindow.getSelection().QueryInterface(Ci.nsISelectionPrivate);
		var selected = sel.anchorNode !== sel.focusNode || sel.anchorOffset != sel.focusOffset;
		return selected ? sel : null;
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
		if ( !idx ) idx = document.getElementById("ScrapBookHighlighter").getAttribute("color") || 4;
		document.getElementById("ScrapBookHighlighter").setAttribute("color", idx);
		var sel = this.getSelection();
		if ( !sel ) return;
		this.allowUndo(this.focusedWindow.document);
		var attr = {};
		attr["data-sb-obj"] = "linemarker";
		attr["class"] = "linemarker-marked-line";
		attr["style"] = ScrapBookUtils.getPref("highlighter.style." + idx, sbHighlighter.PRESET_STYLES[idx]);
		sbHighlighter.set(this.focusedWindow, sel, "span", attr);
		this.changed1 = true;
	},

	removeHighlights : function()
	{
		var sel = this.getSelection();
		if ( !sel ) return;
		this.allowUndo(this.focusedWindow.document);
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
				else if ( node.nodeName.toUpperCase() == "SPAN" && this._getSbObjectType(node) == "linemarker" )
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
		this.allowUndo(this.focusedWindow.document);
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window.content);
		for ( var i = 0; i < sbContentSaver.frameList.length; i++ )
		{
			var elems = sbContentSaver.frameList[i].document.getElementsByTagName("*");
			for ( var j = 0; j < elems.length; j++ )
			{
				if ( this._getSbObjectType(elems[j]) !== false )
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
		this.allowUndo(this.focusedWindow.document);
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
		aElement.value = ScrapBookUtils.crop(sel.toString().replace(/[\r\n\t\s]+/g, " "), 100);
		sel.removeAllRanges();
		this.changed2 = true;
	},

	restore : function()
	{
		window.ScrapBookBrowserOverlay.lastLocation = "";
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
		{
			if (!this.savedBody) this.savedBody = [];
			this.savedBody.push(aTargetDocument.body.cloneNode(true));
		}
		this.refreshUndo();
	},

	undo : function()
	{
		if ( this.savedBody && this.savedBody.length ) {
			var prevBody = this.savedBody.pop();
			prevBody.ownerDocument.body.parentNode.replaceChild(prevBody, prevBody.ownerDocument.body);
		}
		this.refreshUndo();
	},

	refreshUndo : function()
	{
		if ( this.savedBody && this.savedBody.length ) {
			document.getElementById("ScrapBookEditUndo").disabled = false;
			document.getElementById("ScrapBookEditUndo").image = "chrome://scrapbook/skin/edit_undo.png";
		}
		else {
			document.getElementById("ScrapBookEditUndo").disabled = true;
			document.getElementById("ScrapBookEditUndo").image = "chrome://scrapbook/skin/edit_undo_disable.png";
		}
	},

	confirmSave : function()
	{
		if ( this.changed2 ) this.saveResource();
		if ( !this.changed1 ) return 0;
		var button = ScrapBookUtils.PROMPT.BUTTON_TITLE_SAVE      * ScrapBookUtils.PROMPT.BUTTON_POS_0
		           + ScrapBookUtils.PROMPT.BUTTON_TITLE_DONT_SAVE * ScrapBookUtils.PROMPT.BUTTON_POS_1;
		var text = ScrapBookBrowserOverlay.STRING.getFormattedString("EDIT_SAVE_CHANGES", [ScrapBookUtils.crop(this.item.title, 32)]);
		var ret = ScrapBookUtils.PROMPT.confirmEx(window, "[ScrapBook]", text, button, null, null, null, null, {});
		if ( ret == 0 ) this.savePage();
		this.changed1 = false;
		return ret;
	},

	saveOrCapture : function(aBypassDialog)
	{
		if ( ScrapBookBrowserOverlay.getID() ) {
			this.savePage();
			this.saveResource();
		} else {
			sbDOMEraser.init(2);
			var ret = ScrapBookBrowserOverlay.execCapture(0, null, !aBypassDialog, "urn:scrapbook:root");
			if ( ret ) this.exit(true);
		}
	},

	savePage : function()
	{
		if ( !ScrapBookData.exists(ScrapBookBrowserOverlay.resource) ) { this.disable(true); return; }
		var curURL = window.content.location.href;
		if ( curURL.indexOf("file://") != 0 || !curURL.match(/\/data\/(\d{14})\/(.+)$/) || RegExp.$1 != this.item.id || RegExp.$2 == "index.dat" || RegExp.$2 == "sitemap.xml" )
		{
			ScrapBookUtils.alert("ERROR: Cannot save file '" + RegExp.$2 + "'.");
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
				ScrapBookUtils.alert("ERROR: Cannot modify " + doc.contentType + " content.");
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
				ScrapBookData.setProperty(ScrapBookBrowserOverlay.resource, "chars", "UTF-8");
				src = src.replace(/ charset=[^\"]+\">/i, ' charset=UTF-8">');
				charset = "UTF-8";
			}
			var file = ScrapBookUtils.getContentDir(this.item.id).clone();
			file.append(ScrapBookUtils.getFileName(doc.location.href));
			ScrapBookUtils.writeFile(file, src, charset);
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
		this.changed2 = false;
	},

	disableTemporary : function(msec)
	{
		window.setTimeout(function() { sbPageEditor.disable(true);  }, 0);
		window.setTimeout(function() { sbPageEditor.disable(false); }, msec);
	},

	disable : function(aBool)
	{
		var elems = this.TOOLBAR.childNodes;
		for ( var i = 0; i < elems.length; i++ ) elems[i].disabled = aBool;
		this.COMMENT.disabled = aBool;
	},

	toggle : function()
	{
		var id = ScrapBookBrowserOverlay.getID();
		if ( !id ) return;
		this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
		ScrapBookBrowserOverlay.editMode = this.TOOLBAR.hidden;
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

	removeAllStyles : function(aWindow)
	{
		var nodes = aWindow.document.getElementsByTagName("style");
		for ( var i = nodes.length - 1; i >= 0 ; i-- )
		{
			if ( nodes[i].id.indexOf("scrapbook-") == 0 ) sbContentSaver.removeNodeFromParent(nodes[i]);
		}
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

	_isSbObject : function(aNode)
	{
		return (_getSbObjectType(aNode) !== false);
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
		document.getElementById("ScrapBookHighlighter").disabled = this.enabled;
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
					tooltip.textContent = ScrapBookBrowserOverlay.STRING.getString("EDIT_REMOVE_HIGHLIGHT");
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
				sbPageEditor.allowUndo(elem.ownerDocument);
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
				case "inline" :
					sbAnnotationService.editInline(aEvent.originalTarget);
					break;
				case "block-comment" :
					sbAnnotationService.createSticky([aEvent.originalTarget.previousSibling, aEvent.originalTarget.firstChild.data]);
					aEvent.originalTarget.parentNode.removeChild(aEvent.originalTarget);
					break;
				default :
					var cName = aEvent.originalTarget.className;
					if (cName == 'scrapbook-sticky-header' || cName == 'scrapbook-sticky-footer') {
						sbAnnotationService.startDrag(aEvent);
					}
			}
		}
		else if ( aEvent.type == "mousemove" ) sbAnnotationService.onDrag(aEvent);
		else if ( aEvent.type == "mouseup"   ) sbAnnotationService.stopDrag(aEvent);
	},

	createSticky : function(aPreset)
	{
		var win = ScrapBookUtils.getFocusedWindow();
		if ( win.document.body instanceof HTMLFrameSetElement ) win = win.frames[0];
		sbPageEditor.allowUndo(win.document);
		var targetNode;
		if ( aPreset ) {
			targetNode = aPreset[0];
		} else {
			var sel = win.getSelection().QueryInterface(Ci.nsISelectionPrivate);
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
		sbPageEditor.changed1 = true;
		sbPageEditor.disableTemporary(500);
	},

	editSticky : function(oldElem)
	{
		sbPageEditor.allowUndo(sbPageEditor.focusedWindow.document);
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
		sbPageEditor.changed1 = true;
	},

	startDrag : function(aEvent)
	{
		sbPageEditor.allowUndo(sbPageEditor.focusedWindow.document);
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
		mainDiv.setAttribute("data-sb-obj", "sticky");
		mainDiv.className = "scrapbook-sticky" + (isRelative ? " scrapbook-sticky-relative" : "");  // for compatibility
		return mainDiv;
	},


	addInline : function()
	{
		var sel = sbPageEditor.getSelection();
		if ( !sel ) return;
		sbPageEditor.allowUndo(sbPageEditor.focusedWindow.document);
		var ret = {};
		if ( !ScrapBookUtils.PROMPT.prompt(window, "[ScrapBook]", ScrapBookBrowserOverlay.STRING.getFormattedString("EDIT_INLINE", [ScrapBookUtils.crop(sel.toString(), 32)]), ret, null, {}) ) return;
		if ( !ret.value ) return;
		var attr = { style : "border-bottom: 2px dotted #FF3333; cursor: help;", "data-sb-obj" : "inline" , class : "scrapbook-inline", title : ret.value };
		sbHighlighter.set(sbPageEditor.focusedWindow, sel, "span", attr);
		sbPageEditor.changed1 = true;
	},

	editInline : function(aElement)
	{
		sbPageEditor.allowUndo(sbPageEditor.focusedWindow.document);
		var ret = { value : aElement.getAttribute("title") };
		if ( !ScrapBookUtils.PROMPT.prompt(window, "[ScrapBook]", ScrapBookBrowserOverlay.STRING.getFormattedString("EDIT_INLINE", [ScrapBookUtils.crop(aElement.textContent, 32)]), ret, null, {}) ) return;
		if ( ret.value )
			aElement.setAttribute("title", ret.value);
		else
			sbPageEditor.removeSbObj(aElement);
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
			var text = ScrapBookUtils.getLocaleString("URL") + ":";
			if ( !ScrapBookUtils.PROMPT.prompt(window, "[ScrapBook]", text, ret, null, {}) ) return;
			if ( !ret.value ) return;
			attr["href"] = ret.value;
			attr["data-sb-obj"] = "link-url";
		}
		else
		{
			var FP = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
			FP.init(window, aLabel, FP.modeOpen);
			var ret = FP.show();
			if ( ret != FP.returnOK ) return;
			var destFile = ScrapBookUtils.getContentDir(sbPageEditor.item.id).clone();
			destFile.append(FP.file.leafName);
			if ( destFile.exists() && destFile.isFile() ) {
				var text = "Would you like to overwrite the file '" + FP.file.leafName + "'?";
				if ( !ScrapBookUtils.PROMPT.confirm(window, "[ScrapBook]", text) ) return;
				destFile.remove(false);
			}
			try {
				FP.file.copyTo(destFile.parent, FP.file.leafName);
			} catch(ex) {
				return;
			}
			attr["href"] = ScrapBookUtils.getFileName(ScrapBookUtils.IO.newFileURI(FP.file).spec);
			attr["data-sb-obj"] = "link-file";
		}
		sbHighlighter.set(sbPageEditor.focusedWindow, sel, "a", attr);
		sbPageEditor.changed1 = true;
	},

};




var sbInfoViewer = {

	get TOOLBAR() { return document.getElementById("ScrapBookInfobar"); },

	onPopupShowing : function(aEvent)
	{
		var id = ScrapBookBrowserOverlay.getID();
		var elems = aEvent.originalTarget.childNodes;
		for ( var i = 0; i < elems.length - 2; i++ ) elems[i].setAttribute("disabled", id ? "false" : "true");
		for ( i; i < elems.length; i++ ) elems[i].hidden = id;
		if ( id ) {
			if ( !ScrapBookData.exists(ScrapBookBrowserOverlay.resource) ) { aEvent.preventDefault(); return; }
			document.getElementById("ScrapBookStatusPopupE").setAttribute("checked",  ScrapBookBrowserOverlay.editMode);
			document.getElementById("ScrapBookStatusPopupI").setAttribute("checked",  ScrapBookBrowserOverlay.infoMode);
		} else {
			aEvent.originalTarget.lastChild.setAttribute("checked", !(sbPageEditor.TOOLBAR.hidden || document.getElementById("ScrapBookToolbox").hidden));
		}
	},

	init : function(aID)
	{
		if ( aID != ScrapBookBrowserOverlay.getID() ) return;
		if ( !ScrapBookData.exists(ScrapBookBrowserOverlay.resource) ) { this.TOOLBAR.hidden = true; return; }
		this.TOOLBAR.hidden = false;
		var isTypeSite = (ScrapBookData.getProperty(ScrapBookBrowserOverlay.resource, "type") == "site");
		document.getElementById("ScrapBookInfoHome").disabled = !isTypeSite;
		document.getElementById("ScrapBookInfoSite").disabled = !isTypeSite;
		document.getElementById("ScrapBookInfoHome").setAttribute("image", "chrome://scrapbook/skin/info_home" + (isTypeSite ? "1" : "0") +  ".png");
		document.getElementById("ScrapBookInfoSite").setAttribute("image", "chrome://scrapbook/skin/info_link" + (isTypeSite ? "1" : "0") +  ".png");
		var srcLabel = document.getElementById("ScrapBookInfoSource");
		srcLabel.value = ScrapBookData.getProperty(ScrapBookBrowserOverlay.resource, "source");
		srcLabel.onclick = function(aEvent){ ScrapBookUtils.loadURL(srcLabel.value, aEvent.button == 1); };
	},

	toggle : function()
	{
		var id = ScrapBookBrowserOverlay.getID();
		if ( !id ) return;
		this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
		ScrapBookBrowserOverlay.infoMode = this.TOOLBAR.hidden;
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
		var id = ScrapBookBrowserOverlay.getID();
		if ( !id ) return;
		var fileName = ScrapBookUtils.splitFileName(ScrapBookUtils.getFileName(window.content.location.href))[0];
		var source = fileName == "index" ? ScrapBookData.getProperty(ScrapBookBrowserOverlay.resource, "source") : "";
		top.window.openDialog(
			"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[source], null, showDetail, null, 0, null, null, {}, [id, fileName, null, null, 0]
		);
	},

	openSourceURL : function(tabbed)
	{
		if ( !ScrapBookBrowserOverlay.getID() ) return;
		ScrapBookUtils.loadURL(ScrapBookData.getProperty(ScrapBookBrowserOverlay.resource, "source"), tabbed);
	},

	loadFile : function(aFileName)
	{
		gBrowser.loadURI(gBrowser.currentURI.resolve(aFileName), null, null);
	},

	optimize : function()
	{
		this.TOOLBAR.style.borderBottom = sbPageEditor.TOOLBAR.hidden ? "1px solid ThreeDShadow" : "none";
	},

};



