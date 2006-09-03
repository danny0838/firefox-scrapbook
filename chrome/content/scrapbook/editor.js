
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
			if ( aID != sbBrowserOverlay.getID() ) return;
			if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.disable(true); return; }
		}
		this.changed1 = false;
		this.changed2 = false;
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
		sbPageEditor.allowUndo();
		sbDOMEraser.init(0);
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window._content);
		for ( var i = 0; i < sbContentSaver.frameList.length; i++ )
		{
			sbContentSaver.frameList[i].onmousedown = function(aEvent){ sbAnnotationService.handleMouseDown(aEvent); };
			sbContentSaver.frameList[i].onkeypress  = function(aEvent){ sbPageEditor.handleKeypress(aEvent); };
			if ( aID && document.getElementById("ScrapBookStatusPopupD").getAttribute("checked") ) sbInfoViewer.indicateLinks(sbContentSaver.frameList[i]);
		}
		if ( aID ) window._content.onbeforeunload = function(){ sbPageEditor.confirmSave(); };
	},

	handleKeypress : function(aEvent)
	{
		if ( aEvent.altKey || aEvent.shiftKey || aEvent.ctrlKey || aEvent.metaKey ) return;
		if ( "gFindBar" in window ? gFindBar.isFindBarVisible() : window.isFindBarVisible() ) return;
		var idx = 0;
		switch ( aEvent.charCode )
		{
			case aEvent.DOM_VK_1 : idx = 1; break;
			case aEvent.DOM_VK_2 : idx = 2; break;
			case aEvent.DOM_VK_3 : idx = 3; break;
			case aEvent.DOM_VK_4 : idx = 4; break;
			default : break;
		}
		if ( idx > 0 ) this.highlight(idx);
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

	getSelection : function()
	{
		this.focusedWindow = sbCommonUtils.getFocusedWindow();
		var selText = this.focusedWindow.getSelection();
		var sel = selText.QueryInterface(Components.interfaces.nsISelectionPrivate);
		var isSelected = false;
		try {
			isSelected = ( sel.anchorNode.isSameNode(sel.focusNode) && sel.anchorOffset == sel.focusOffset ) ? false : true;
		} catch(ex) {
			isSelected = false;
		}
		return isSelected ? sel : false;
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
		attr["class"] = "linemarker-marked-line";
		attr["style"] = nsPreferences.copyUnicharPref("scrapbook.highlighter.style." + idx, sbHighlighter.PRESET_STYLES[idx]);
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
		var nodeRange = window._content.document.createRange();
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
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window._content);
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
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window._content);
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
		aElement.value = sbCommonUtils.crop(sel.toString().replace(/[\r\n\t\s]+/g, " "), 100);
		sel.removeAllRanges();
		this.changed2 = true;
	},

	restore : function()
	{
		window.sbBrowserOverlay.lastLocation = "";
		window._content.location.reload();
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
		var button = sbCommonUtils.PROMPT.BUTTON_TITLE_SAVE * sbCommonUtils.PROMPT.BUTTON_POS_0 + sbCommonUtils.PROMPT.BUTTON_TITLE_DONT_SAVE * sbCommonUtils.PROMPT.BUTTON_POS_1;
		var ret = sbCommonUtils.PROMPT.confirmEx(window, "ScrapBook", sbBrowserOverlay.STRING.getFormattedString("EDIT_SAVE_CHANGES", [sbCommonUtils.crop(this.item.title, 32)]), button, null, null, null, null, {});
		if ( ret == 0 ) this.savePage();
		this.changed1 = false;
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
		var curURL = window._content.location.href;
		if ( curURL.indexOf("file://") != 0 || !curURL.match(/\/data\/(\d{14})\/(.+)$/) || RegExp.$1 != this.item.id || RegExp.$2 == "index.dat" || RegExp.$2 == "sitemap.xml" )
		{
			alert("ScrapBook ERROR: Cannot save file '" + RegExp.$2 + "'.");
			return;
		}
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window._content);
		this.disable(true);
		sbDOMEraser.init(2);
		for ( var i = 0; i < sbContentSaver.frameList.length; i++ )
		{
			this.removeAllStyles(sbContentSaver.frameList[i]);
			var doc = sbContentSaver.frameList[i].document;
			if ( doc.contentType != "text/html" )
			{
				alert("ScrapBook ERROR: Cannot modify " + doc.contentType + " content.");
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
				sbDataSource.setProperty(sbBrowserOverlay.resource, "chars", "UTF-8");
				src = src.replace(/ charset=[^\"]+\">/i, ' charset=UTF-8">');
				charset = "UTF-8";
			}
			var file = sbCommonUtils.getContentDir(this.item.id).clone();
			file.append(sbCommonUtils.getFileName(doc.location.href));
			sbCommonUtils.writeFile(file, src, charset);
			if ( document.getElementById("ScrapBookStatusPopupD").getAttribute("checked") )
			{
				sbInfoViewer.indicateLinks(sbContentSaver.frameList[i]);
			}
		}
		this.changed1 = false;
		window.setTimeout(function() { window._content.stop(); sbPageEditor.disable(false); }, 500);
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
		document.getElementById("ScrapBookHighlighter").disabled = this.enabled;
		document.getElementById("ScrapBookEditAnnotation").disabled = this.enabled;
		document.getElementById("ScrapBookEditCutter").disabled  = this.enabled;
		sbContentSaver.frameList = sbContentSaver.flattenFrames(window._content);
		for ( var i = 0; i < sbContentSaver.frameList.length; i++ )
		{
			sbContentSaver.frameList[i].document.onmouseover = this.enabled ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			sbContentSaver.frameList[i].document.onmousemove = this.enabled ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			sbContentSaver.frameList[i].document.onmouseout  = this.enabled ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			sbContentSaver.frameList[i].document.onclick     = this.enabled ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
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
			if ( aEvent.type == "mousemove" && ++this.verbose % 3 != 0 ) return;
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
					tooltip.textContent = sbBrowserOverlay.STRING.getString("EDIT_REMOVE_HIGHLIGHT");
				} else {
					tooltip.textContent = elem.localName;
					if ( elem.id ) tooltip.textContent += ' id="' + elem.id + '"';
					if ( elem.className ) tooltip.textContent += ' class="' + elem.className + '"';
				}
				elem.style.MozOutline = onMarker ? "2px dashed #0000FF" : "2px solid #FF0000";
			}
		}
		else if ( aEvent.type == "mouseout" || aEvent.type == "click" )
		{
			var tooltip = elem.ownerDocument.getElementById("scrapbook-eraser-tooltip");
			if ( tooltip ) elem.ownerDocument.body.removeChild(tooltip);
			elem.style.MozOutline = "";
			if ( !elem.getAttribute("style") ) elem.removeAttribute("style");
			if ( aEvent.type == "click" )
			{
				sbPageEditor.allowUndo(elem.ownerDocument);
				if ( aEvent.shiftKey || aEvent.button == 2 )
				{
					this.isolateNode(elem);
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
	startX : 0,
	startY : 0,

	handleMouseDown : function(aEvent)
	{
		if ( sbDOMEraser.enabled ) return;
		switch ( aEvent.originalTarget.getAttribute("class") )
		{
			case "scrapbook-sticky" :
			case "scrapbook-sticky scrapbook-sticky-relative" :
				if ( aEvent.originalTarget.childNodes.length != 4 )
					this.editSticky(aEvent.originalTarget);
				break;
			case "scrapbook-block-comment" :
				this.createSticky([aEvent.originalTarget.previousSibling, aEvent.originalTarget.firstChild.data]);
				aEvent.originalTarget.parentNode.removeChild(aEvent.originalTarget);
				break;
			case "scrapbook-inline" : case "scrapbook-inline-comment" :
				this.editInline(aEvent.originalTarget);
				break;
			case "scrapbook-sticky-header" :
				this.startDrag(aEvent.originalTarget.parentNode, aEvent, "move");
				break;
			case "scrapbook-sticky-resizer" :
				this.startDrag(aEvent.originalTarget.parentNode, aEvent, "resize");
				break;
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
		var newElem = this.duplicateElement(!(oldElem.parentNode instanceof HTMLBodyElement), true, parseInt(oldElem.style.left, 10), parseInt(oldElem.style.top, 10), parseInt(oldElem.style.width, 10), parseInt(oldElem.style.height, 10));
		newElem.firstChild.nextSibling.appendChild(document.createTextNode(oldElem.lastChild.data || ""));
		oldElem.parentNode.replaceChild(newElem, oldElem);
		this.adjustTextArea(newElem);
		setTimeout(function(){ newElem.firstChild.nextSibling.focus(); }, 100);
		sbPageEditor.changed1 = true;
	},

	startDrag : function(aTargetDiv, aEvent, aAction)
	{
		this.escape(aEvent);
		aEvent.view.onmousemove = function(aEvent){ sbAnnotationService.onDragGesture(aTargetDiv, aEvent, aAction); };
		aEvent.view.onmouseup   = function(aEvent){ aEvent.view.onmousemove = null; };
	},

	onDragGesture : function(aTargetDiv, aEvent, aAction)
	{
		if ( aAction == "move" )
		{
			var x = parseInt(aTargetDiv.style.left || 0, 10) + (aEvent.clientX - this.startX); if ( x < 0 ) x = 0;
			var y = parseInt(aTargetDiv.style.top  || 0, 10)  + (aEvent.clientY - this.startY); if ( y < 0 ) y = 0;
			aTargetDiv.style.left = x + "px";
			aTargetDiv.style.top  = y + "px";
		}
		else if ( aAction == "resize" )
		{
			var x = parseInt(aTargetDiv.style.width  || 0, 10) + (aEvent.clientX - this.startX); if ( x < 100 ) x = 100;
			var y = parseInt(aTargetDiv.style.height || 0, 10) + (aEvent.clientY - this.startY); if ( y < 32 ) y = 32;
			aTargetDiv.style.width  = x + "px";
			aTargetDiv.style.height = y + "px";
			if ( aTargetDiv.firstChild.nextSibling instanceof HTMLTextAreaElement ) this.adjustTextArea(aTargetDiv);
		}
		sbPageEditor.changed1 = true;
		this.escape(aEvent);
	},

	adjustTextArea : function(aDivElem)
	{
		var h = parseInt(aDivElem.style.height, 10) - 10 - 16;
		aDivElem.firstChild.nextSibling.style.height = (h > 32 ? h : 32) + "px";
	},

	escape : function(aEvent)
	{
		this.startX = aEvent.clientX;
		this.startY = aEvent.clientY;
	},

	duplicateElement : function(isRelative, isEditable, aLeft, aTop, aWidth, aHeight)
	{
		var mainDiv = window._content.document.createElement("DIV");
		var headDiv = window._content.document.createElement("DIV");
		var resizer = window._content.document.createElement("DIV");
		headDiv.onmousedown = function(aEvent){ sbAnnotationService.startDrag(mainDiv, aEvent, "move"); };
		resizer.onmousedown = function(aEvent){ sbAnnotationService.startDrag(mainDiv, aEvent, "resize"); };
		headDiv.setAttribute("class", "scrapbook-sticky-header");
		resizer.setAttribute("class", "scrapbook-sticky-resizer");
		mainDiv.appendChild(headDiv);
		if ( isEditable )
		{
			var textArea = window._content.document.createElement("TEXTAREA");
			var footDiv  = window._content.document.createElement("DIV");
			var button1  = window._content.document.createElement("INPUT");
			var button2  = window._content.document.createElement("INPUT");
			button1.setAttribute("type", "image"); button1.setAttribute("src", "chrome://scrapbook/skin/sticky_save.png");
			button2.setAttribute("type", "image"); button2.setAttribute("src", "chrome://scrapbook/skin/sticky_delete.png");
			button1.setAttribute("onclick", "this.parentNode.parentNode.appendChild(document.createTextNode(this.parentNode.previousSibling.value));this.parentNode.parentNode.removeChild(this.parentNode.previousSibling);this.parentNode.parentNode.removeChild(this.parentNode);");
			button2.setAttribute("onclick", "this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode);");
			footDiv.setAttribute("class", "scrapbook-sticky-footer");
			footDiv.appendChild(button1); footDiv.appendChild(button2);
			mainDiv.appendChild(textArea); mainDiv.appendChild(footDiv);
			if ( isRelative ) footDiv.onmousedown = function(aEvent){ sbAnnotationService.startDrag(mainDiv, aEvent, "resize"); };
		}
		mainDiv.appendChild(resizer);
		if ( !isRelative )
		{
			mainDiv.style.left = aLeft + "px";
			mainDiv.style.top  = aTop  + "px";
			mainDiv.style.position = "absolute";
		}
		mainDiv.style.width  = (aWidth  || this.DEFAULT_WIDTH)  + "px";
		mainDiv.style.height = (aHeight || this.DEFAULT_HEIGHT) + "px";
		mainDiv.setAttribute("class" , "scrapbook-sticky" + (isRelative ? " scrapbook-sticky-relative" : ""));
		return mainDiv;
	},


	addInline : function()
	{
		var sel = sbPageEditor.getSelection();
		if ( !sel ) return;
		sbPageEditor.allowUndo(sbPageEditor.focusedWindow.document);
		var ret = {};
		if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", sbBrowserOverlay.STRING.getFormattedString("EDIT_INLINE", [sbCommonUtils.crop(sel.toString(), 32)]), ret, null, {}) ) return;
		if ( !ret.value ) return;
		var attr = {};
		attr["style"] = "border-bottom: 2px dotted #FF3333; cursor: help;"
		attr["class"] = "scrapbook-inline";
		attr["title"] = ret.value;
		sbHighlighter.set(sbPageEditor.focusedWindow, sel, "span", attr);
		sbPageEditor.changed1 = true;
	},

	editInline : function(aElement)
	{
		var ret = { value : aElement.getAttribute("title") };
		if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", sbBrowserOverlay.STRING.getFormattedString("EDIT_INLINE", [sbCommonUtils.crop(aElement.textContent, 32)]), ret, null, {}) ) return;
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
			if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook - " + aLabel, "URL:", ret, null, {}) ) return;
			if ( !ret.value ) return;
			attr["href"] = ret.value;
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
		}
		sbHighlighter.set(sbPageEditor.focusedWindow, sel, "a", attr);
		sbPageEditor.changed1 = true;
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
		var fileName = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(window._content.location.href))[0];
		var source = fileName == "index" ? sbDataSource.getProperty(sbBrowserOverlay.resource, "source") : "";
		top.window.openDialog(
			"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[source], null, showDetail, null, 0, null, null, {}, [id, fileName, null, null, 0]
		);
	},

	openSourceURL : function(tabbed)
	{
		if ( !sbBrowserOverlay.getID() ) return;
		sbCommonUtils.loadURL(sbDataSource.getProperty(sbBrowserOverlay.resource, "source"), tabbed);
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



