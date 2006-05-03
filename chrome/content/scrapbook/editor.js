
var sbPageEditor = {

	get STRING()  { return document.getElementById("ScrapBookEditString"); },
	get TOOLBAR() { return document.getElementById("ScrapBookEditor"); },
	get COMMENT() { return document.getElementById("ScrapBookEditComment"); },

	item : null,
	changed1 : false,
	changed2 : false,
	multiline : false,
	frameList : [],
	focusedWindow : null,
	savedBody : null,

	init : function()
	{
		if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.disable(true); return; }
		this.disable(false);
		this.changed1 = false;
		this.changed2 = false;
		this.item = new ScrapBookItem(sbDataSource.getProperty(sbBrowserOverlay.resource, "id"));
		for ( var prop in this.item )
		{
			this.item[prop] = sbDataSource.getProperty(sbBrowserOverlay.resource, prop);
		}
		document.getElementById("ScrapBookEditTitle").value = this.item.title;
		document.getElementById("ScrapBookEditIcon").src    = this.item.icon ? this.item.icon : sbCommonUtils.getDefaultIcon();
		this.COMMENT.value = "";
		this.showHide(true);
		setTimeout(function(){ sbPageEditor.delayedInit(); }, 100);
	},

	delayedInit : function()
	{
		sbPageEditor.allowUndo(null);
		this.COMMENT.value = this.item.comment.replace(/ __BR__ /g, this.multiline ? "\n" : "\t");
		if ( gBrowser.currentURI.spec.indexOf("index.html") > 0 )
		{
			gBrowser.selectedTab.label = this.item.title;
			gBrowser.selectedTab.setAttribute("image", this.item.icon);
		}
		document.getElementById("ScrapBookEditEraser").checked = false;
		sbDOMEraser.init(0);
		this.frameList = [window._content];
		this.getFrameList(window._content);
		for ( var i = 0; i < this.frameList.length; i++ )
		{
			this.frameList[i].onmousedown = function(aEvent){ sbAnnotationService.handleMouseDown(aEvent); };
			this.frameList[i].onkeypress  = function(aEvent){ sbPageEditor.handleKeypress(aEvent); };
			if ( this.item.type == "site" && document.getElementById("ScrapBookInfoPopupI").getAttribute("checked") )
			{
				sbInfoViewer.indicateLinks(this.frameList[i]);
			}
		}
		window._content.onbeforeunload = function(){ sbPageEditor.confirmSave(); };
	},

	handleKeypress : function(aEvent)
	{
		if ( aEvent.altKey || aEvent.shiftKey || aEvent.ctrlKey || aEvent.metaKey ) return;
		if ( isFindBarVisible() ) return;
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

	getFrameList : function(aWindow)
	{
		for ( var i = 0; i < aWindow.frames.length; i++ )
		{
			this.frameList.push(aWindow.frames[i]);
			this.getFrameList(aWindow.frames[i]);
		}
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
		this.frameList = [window._content];
		this.getFrameList(window._content);
		for ( var i = 0; i < this.frameList.length; i++ )
		{
			var elems = this.frameList[i].document.getElementsByTagName("span");
			for ( var j = 0; j < elems.length; j++ )
			{
				if ( elems[j].getAttribute("class") == aClassName )
				{
					this.stripAttributes(elems[j]);
				}
			}
		}
		this.changed1 = true;
		this.allowUndo(null);
	},

	removeElementsByTagName : function(aTagName)
	{
		this.frameList = [window._content];
		this.getFrameList(window._content);
		var shouldSave = false;
		for ( var i = this.frameList.length - 1; i >= 0; i-- )
		{
			var elems = this.frameList[i].document.getElementsByTagName(aTagName);
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
			this.allowUndo(null);
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
		aElement.value = sbCommonUtils.crop(this.getSelection().toString().replace(/[\r\n\t\s]+/g, " "), 100);
		this.changed2 = true;
	},

	restore : function()
	{
		window.sbBrowserOverlay.lastLocation = "";
		window._content.location.reload();
	},

	exit : function()
	{
		if ( this.confirmSave() == 1 ) this.restore();
		if ( sbDOMEraser.enabled ) sbDOMEraser.init(2);
		this.showHide(false);
	},

	allowUndo : function(aTargetDocument)
	{
		document.getElementById("ScrapBookEditUndo").hidden    = aTargetDocument ? false : true;
		document.getElementById("ScrapBookEditRestore").hidden = aTargetDocument ? true  : false;
		if ( aTargetDocument ) this.savedBody = aTargetDocument.body.cloneNode(true);
	},

	undo : function()
	{
		this.savedBody.ownerDocument.body.parentNode.replaceChild(this.savedBody, this.savedBody.ownerDocument.body);
		document.getElementById("ScrapBookEditTooltip").hidden = true;
		this.allowUndo(null);
	},

	confirmSave : function()
	{
		if ( this.changed2 ) this.save2();
		if ( !this.changed1 ) return 0;
		var button = sbCommonUtils.PROMPT.BUTTON_TITLE_SAVE * sbCommonUtils.PROMPT.BUTTON_POS_0 + sbCommonUtils.PROMPT.BUTTON_TITLE_DONT_SAVE * sbCommonUtils.PROMPT.BUTTON_POS_1;
		var res = sbCommonUtils.PROMPT.confirmEx(window, "ScrapBook", this.STRING.getFormattedString("EDIT_SAVE_CHANGES", [sbCommonUtils.crop(this.item.title, 32)]), button, null, null, null, null, {});
		if ( res == 0 ) this.save1();
		this.changed1 = false;
		return res;
	},

	save1 : function()
	{
		if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { this.disable(true); return; }
		var curURL = window._content.location.href;
		if ( curURL.indexOf("file://") != 0 || !curURL.match(/\/data\/(\d{14})\/(.+)$/) || RegExp.$1 != this.item.id || RegExp.$2 == "index.dat" || RegExp.$2 == "sitemap.xml" )
		{
			alert("ScrapBook ERROR: Failed to save the file '" + RegExp.$2 + "'.");
			return;
		}
		this.frameList = [window._content];
		this.getFrameList(window._content);
		this.disable(true);
		document.getElementById("ScrapBookEditEraser").checked = false;
		sbDOMEraser.init(2);
		for ( var i = 0; i < this.frameList.length; i++ )
		{
			this.removeAllStyles(this.frameList[i]);
			var doc = this.frameList[i].document;
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
			if ( this.item.type == "site" && document.getElementById("ScrapBookInfoPopupI").getAttribute("checked") )
			{
				sbInfoViewer.indicateLinks(this.frameList[i]);
			}
		}
		this.changed1 = false;
		window.setTimeout(function() { window._content.stop(); sbPageEditor.disable(false); }, 500);
	},

	save2 : function()
	{
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
		if ( !sbBrowserOverlay.getID() ) return;
		this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
		sbBrowserOverlay.editMode = this.TOOLBAR.hidden;
		this.TOOLBAR.hidden ? this.init() : this.exit();
	},

	showHide : function(willShow)
	{
		this.COMMENT.hidden = !willShow;
		this.TOOLBAR.hidden = !willShow;
		sbInfoViewer.optimize();
	},


	applyStyle : function(aWindow, aID, aString)
	{
		var newNode = aWindow.document.createElement("style");
		newNode.setAttribute("media", "screen");
		newNode.setAttribute("type", "text/css");
		newNode.setAttribute("id", aID);
		newNode.appendChild(aWindow.document.createTextNode(aString));
		var headNode = aWindow.document.getElementsByTagName("head")[0];
		headNode.appendChild(newNode);
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

	init : function(aStateFlag)
	{
		this.enabled = (aStateFlag == 1);
		document.getElementById("ScrapBookHighlighter").disabled = this.enabled;
		document.getElementById("ScrapBookEditAnnotation").disabled = this.enabled;
		document.getElementById("ScrapBookEditCutter").disabled  = this.enabled;
		if ( aStateFlag == 0 ) return;
		sbPageEditor.frameList = [window._content];
		sbPageEditor.getFrameList(window._content);
		for ( var i = 0; i < sbPageEditor.frameList.length; i++ )
		{
			sbPageEditor.frameList[i].document.onmouseover = this.enabled ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			sbPageEditor.frameList[i].document.onmouseout  = this.enabled ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			sbPageEditor.frameList[i].document.onclick     = this.enabled ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			sbPageEditor.frameList[i].document.onkeypress  = this.enabled ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			if ( this.enabled ) {
				sbPageEditor.applyStyle(sbPageEditor.frameList[i], "scrapbook-eraser-style", "* { cursor: crosshair; }");
			} else {
				sbPageEditor.removeStyle(sbPageEditor.frameList[i], "scrapbook-eraser-style");
			}
		}
	},

	handleEvent : function(aEvent)
	{
		aEvent.preventDefault();
		var elem = aEvent.target;
		var tagName = elem.localName.toUpperCase();
		if ( aEvent.type != "keypress" && (tagName == "SCROLLBAR" || tagName == "HTML" || tagName == "BODY") ) return;
		var onMarker = (tagName == "SPAN" && elem.getAttribute("class") == "linemarker-marked-line");
		switch ( aEvent.type )
		{
			case "mouseover" :
				elem.style.MozOutline = onMarker ? "2px dashed #0000FF" : "2px solid #FF0000";
				document.getElementById("ScrapBookEditTooltip").hidden = false;
				document.getElementById("ScrapBookEditTooltip").label = onMarker ? sbPageEditor.STRING.getString("EDIT_REMOVE_HIGHLIGHT") : elem.localName;
				document.getElementById("ScrapBookEditTooltip").showPopup(gBrowser, aEvent.clientX + gBrowser.boxObject.screenX + 50, aEvent.clientY + gBrowser.boxObject.screenY + 50);
				break;
			case "mouseout" :
			case "click" :
				elem.style.MozOutline = "";
				if ( !elem.getAttribute("style") ) elem.removeAttribute("style");
				if ( aEvent.type == "click" )
				{
					sbPageEditor.allowUndo(elem.ownerDocument);
					if ( aEvent.button == 0 )
					{
						if ( onMarker ) {
							sbPageEditor.stripAttributes(elem);
						} else {
							elem.parentNode.removeChild(elem);
						}
					}
					else if ( aEvent.button == 2 )
					{
						aEvent.currentTarget.body.insertBefore(elem, aEvent.currentTarget.body.firstChild);
						for ( var i = elem.parentNode.childNodes.length - 1; i > 0; i-- )
						{
							elem.parentNode.removeChild(elem.parentNode.childNodes[i]);
						}
					}
					sbPageEditor.changed1 = true;
				}
				break;
			case "keypress" :
				this.undo();
				break;
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
		var newElem = this.duplicateElement(!(oldElem.parentNode instanceof HTMLBodyElement), true, parseInt(oldElem.style.left), parseInt(oldElem.style.top), parseInt(oldElem.style.width), parseInt(oldElem.style.height));
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
			var x = parseInt(aTargetDiv.style.left || 0) + (aEvent.clientX - this.startX); if ( x < 0 ) x = 0;
			var y = parseInt(aTargetDiv.style.top  || 0)  + (aEvent.clientY - this.startY); if ( y < 0 ) y = 0;
			aTargetDiv.style.left = x + "px";
			aTargetDiv.style.top  = y + "px";
		}
		else if ( aAction == "resize" )
		{
			var x = parseInt(aTargetDiv.style.width  || 0) + (aEvent.clientX - this.startX); if ( x < 100 ) x = 100;
			var y = parseInt(aTargetDiv.style.height || 0) + (aEvent.clientY - this.startY); if ( y < 32 ) y = 32;
			aTargetDiv.style.width  = x + "px";
			aTargetDiv.style.height = y + "px";
			if ( aTargetDiv.firstChild.nextSibling instanceof HTMLTextAreaElement ) this.adjustTextArea(aTargetDiv);
		}
		sbPageEditor.changed1 = true;
		this.escape(aEvent);
	},

	adjustTextArea : function(aDivElem)
	{
		var h = parseInt(aDivElem.style.height) - 10 - 16;
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
		if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", sbPageEditor.STRING.getFormattedString("EDIT_INLINE", [sbCommonUtils.crop(sel.toString(), 32)]), ret, null, {}) ) return;
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
		if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", sbPageEditor.STRING.getFormattedString("EDIT_INLINE", [sbCommonUtils.crop(aElement.textContent, 32)]), ret, null, {}) ) return;
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
			try {
				FP.file.copyTo(sbCommonUtils.getContentDir(sbPageEditor.item.id), FP.file.leafName);
			} catch(ex) {
				alert("ScrapBook ERROR: The file '" + FP.file.leafName + "' already exists.");
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
		if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) { aEvent.preventDefault(); return; }
		document.getElementById("ScrapBookInfoPopupT").setAttribute("checked",  sbBrowserOverlay.infoMode);
		document.getElementById("ScrapBookInfoPopupM").setAttribute("disabled", sbDataSource.getProperty(sbBrowserOverlay.resource, "type") != "site");
	},

	init : function()
	{
		if ( !sbDataSource.exists(sbBrowserOverlay.resource) ) return;
		this.TOOLBAR.hidden = false;
		var isSite = (sbDataSource.getProperty(sbBrowserOverlay.resource, "type") == "site");
		document.getElementById("ScrapBookInfoHome").disabled = !isSite;
		document.getElementById("ScrapBookInfoSite").disabled = !isSite;
		document.getElementById("ScrapBookInfoHome").setAttribute("image", "chrome://scrapbook/skin/info_home" + (isSite ? "1" : "0") +  ".png");
		document.getElementById("ScrapBookInfoSite").setAttribute("image", "chrome://scrapbook/skin/info_link" + (isSite ? "1" : "0") +  ".png");
		var srcLabel = document.getElementById("ScrapBookInfoSource");
		srcLabel.value = sbDataSource.getProperty(sbBrowserOverlay.resource, "source");
		srcLabel.onclick = function(aEvent){ sbCommonUtils.loadURL(srcLabel.value, aEvent.button == 1); };
	},

	toggle : function()
	{
		if ( !sbBrowserOverlay.getID() ) return;
		this.TOOLBAR.setAttribute("autoshow", this.TOOLBAR.hidden);
		sbBrowserOverlay.infoMode = this.TOOLBAR.hidden;
		this.TOOLBAR.hidden ? this.init() : this.TOOLBAR.hidden = true;
		this.optimize();
	},

	toggleIndicator : function(willEnable)
	{
		for ( var i = 0; i < sbPageEditor.frameList.length; i++ )
		{
			if ( willEnable )
				this.indicateLinks(sbPageEditor.frameList[i]);
			else
				sbPageEditor.removeStyle(sbPageEditor.frameList[i], "scrapbook-indicator-style");
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
		sbCommonUtils.loadURL(sbDataSource.getProperty(sbBrowserOverlay.resource, "source"), tabbed);
	},

	load : function(aFileName)
	{
		gBrowser.loadURI(gBrowser.currentURI.resolve(aFileName), null, null);
	},

	optimize : function()
	{
		this.TOOLBAR.style.borderBottom = sbPageEditor.TOOLBAR.hidden ? "1px solid ThreeDShadow" : "none";
	},

};



