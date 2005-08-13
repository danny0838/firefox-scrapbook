/**************************************************
// editor.js
// Implementation file for overlay.xul
// 
// Description: 
// Author: Gomita
// Contributors: Bob Chao
// 
// Version: 
// License: see LICENSE.txt
**************************************************/


var sbEditor = {

	get COMMENT() { return document.getElementById("ScrapBookEditComment"); },
	get STRING()  { return document.getElementById("ScrapBookEditString"); },

	item : { id : "" },
	resource : null,
	changed1 : false,
	changed2 : false,
	multiline  : false,
	frameList     : [],
	focusedWindow : null,
	findMe : false,

	showHeader : function()
	{
		var id = sbBrowserOverlay.getID();
		if ( !id ) return;
		var res = SBservice.RDF.GetResource("urn:scrapbook:item" + id);
		var msg = gBrowser.mCurrentBrowser.previousSibling;
		msg.setAttribute("type", "scrapbook");
		msg.text = SBRDF.getProperty("source", res);
		msg._textElement.onclick = function(aEvent) { SBcommon.loadURL(msg.text, aEvent.button == 1); };
		msg.image = "";
		msg.buttonText = "";
		msg.hidden = false;
	},

	init : function()
	{
		var id = sbBrowserOverlay.getID();
		if ( !id ) return;
		this.findMe = false;
		this.changed1 = false;
		this.changed2 = false;
		this.resource = SBservice.RDF.GetResource("urn:scrapbook:item" + id);
		this.item = new ScrapBookItem(id);
		for ( var prop in this.item )
		{
			this.item[prop] = SBRDF.getProperty(prop, this.resource);
		}
		this.disable(!this.item.id);
		document.getElementById("ScrapBookEditTitle").value = SBRDF.getProperty("title", this.resource);
		document.getElementById("ScrapBookEditIcon").src    = this.item.icon ? this.item.icon : SBcommon.getDefaultIcon();
		this.COMMENT.value = this.item.comment.replace(/ __BR__ /g, this.multiline ? "\n" : "\t");
		document.getElementById("ScrapBookEditorBox").hidden = false;
		document.getElementById("ScrapBookEditEraser").checked = false;
		sbDOMEraser.toggle(false);
		this.frameList = [window._content];
		this.getFrameList(window._content);
		for ( var i = 0; i < this.frameList.length; i++ )
		{
			this.frameList[i].onclick = sbBlockComment.onClick;
		}
		window._content.onunload = function(aEvent){ sbEditor.confirmSave(); };
	},

	toggleComment : function()
	{
		this.multiline = !this.multiline;
		var val = this.COMMENT.value;
		this.COMMENT.setAttribute("multiline", this.multiline);
		this.COMMENT.setAttribute("style", this.multiline ? "height:100px;" : "padding:2px;");
		if ( this.multiline ) {
			document.getElementById("ScrapBookEditorBox").appendChild(this.COMMENT);
			val = val.replace(/\t/g, "\n");
		} else {
			document.getElementById("ScrapBookEditor").insertBefore(this.COMMENT, document.getElementById("ScrapBookEditMarker"));
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
		this.focusedWindow = document.commandDispatcher.focusedWindow;
		if ( !this.focusedWindow || this.focusedWindow == window ) this.focusedWindow = window._content;
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
		sel.deleteFromDocument();
		this.changed1 = true;
		sbDOMEraser.allowUndo(false);
	},

	marker : function(bgcol, idx)
	{
		if ( !bgcol )
		{
			idx = document.getElementById("ScrapBookEditMarker").getAttribute("color");
			if ( !idx ) idx = 4;
			bgcol = document.getElementById("ScrapBookEditMarker" + idx).style.backgroundColor;
		}
		document.getElementById("ScrapBookEditMarker").setAttribute("color", idx);
		var sel = this.getSelection();
		if ( !sel ) return;
		sbSetMarker(this.focusedWindow, sel, "linemarker-marked-line", "background-color: " + bgcol + "; color: #000000;");
		this.changed1 = true;
		sbDOMEraser.allowUndo(false);
	},

	markerTrans : function()
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
					node.removeAttribute("class");
					node.removeAttribute("style");
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
					elems[j].removeAttribute("style");
					elems[j].removeAttribute("class");
					elems[j].removeAttribute("title");
				}
			}
		}
		this.changed1 = true;
		sbDOMEraser.allowUndo(false);
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
				SBcapture.removeNodeFromParent(elems[j]);
			}
			shouldSave = true;
		}
		if ( shouldSave )
		{
			this.changed1 = true;
			sbDOMEraser.allowUndo(false);
		}
	},

	restore : function()
	{
		window.sbBrowserOverlay.lastLocation = "";
		window._content.location.reload();
	},

	exit : function()
	{
		if ( this.confirmSave() == 1 ) this.restore();
		if ( sbDOMEraser.enabled ) sbDOMEraser.toggle(false);
		document.getElementById("ScrapBookEditorBox").hidden = true;
	},

	confirmSave : function()
	{
		if ( this.changed2 ) this.save2();
		if ( !this.changed1 ) return 0;
		const PROMPT = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
		var button = PROMPT.BUTTON_TITLE_SAVE * PROMPT.BUTTON_POS_0 + PROMPT.BUTTON_TITLE_DONT_SAVE * PROMPT.BUTTON_POS_1;
		var res = PROMPT.confirmEx(window, "ScrapBook", this.STRING.getFormattedString("EDIT_SAVE_CHANGES", [this.item.title]), button, null, null, null, null, {});
		if ( res == 0 ) this.save1();
		this.changed1 = false;
		return res;
	},

	save1 : function()
	{
		if ( !SBRDF.exists(this.resource) ) { this.disable(true); return; }
		var curURL = window._content.location.href;
		if ( !curURL.match(/^file/) || !curURL.match(/\/data\/(\d{14})\/index\.html$/) || RegExp.$1 != this.item.id )
		{
			alert("ScrapBook ERROR: Failed to save.");
			return;
		}
		this.frameList = [window._content];
		this.getFrameList(window._content);
		this.disable(true);
		sbEditStyle.removeAll();
		for ( var i = 0; i < this.frameList.length; i++ )
		{
			var doc = this.frameList[i].document;
			var rootNode  = doc.getElementsByTagName("html")[0];
			var src = "";
			src = SBcapture.surroundByTags(rootNode, rootNode.innerHTML);
			src = SBcapture.doctypeToString(doc.doctype) + src;
			src = src.replace(/ -moz-background-clip: initial; -moz-background-origin: initial; -moz-background-inline-policy: initial;\">/g, '">');
			src = src.replace(/<span>([^<]*)<\/span>/gm, "$1");
			src = src.replace(/<span style=\"\">([^<]*)<\/span>/gm, "$1");
			var file = SBcommon.getContentDir(this.item.id).clone();
			file.append(SBcommon.getFileName(doc.location.href));
			SBcommon.writeFile(file, src, doc.characterSet);
		}
		this.changed1 = false;
		window.setTimeout(function() { window._content.stop(); sbEditor.disable(false); }, 500);
	},

	save2 : function()
	{
		if ( !SBRDF.exists(this.resource) ) { this.disable(true); return; }
		var newTitle   = document.getElementById("ScrapBookEditTitle").value;
		var newComment = this.COMMENT.value.replace(/\t|\n/g, " __BR__ ");
		if ( newTitle != this.item.title || newComment != this.item.comment )
		{
			this.disableTemporary(500);
			SBRDF.updateItem(this.resource, "title",   newTitle);
			SBRDF.updateItem(this.resource, "comment", newComment);
			SBRDF.flush();
			this.item.title   = newTitle;
			this.item.comment = newComment;
			SBcommon.writeIndexDat(this.item);
		}
		this.changed2 = false;
	},

	disableTemporary : function(msec)
	{
		window.setTimeout(function() { sbEditor.disable(true);  }, 0);
		window.setTimeout(function() { sbEditor.disable(false); }, msec);
	},

	disable : function(aBool)
	{
		var elems = document.getElementById("ScrapBookEditor").childNodes;
		for ( var i = 0; i < elems.length; i++ ) elems[i].disabled = aBool;
		this.COMMENT.disabled = aBool;
	},

	findAndSelect : function()
	{
		if ( !SBRDF.exists(this.resource) ) { this.disable(true); return; }
		if ( document.getElementById("viewScrapBookSidebar").getAttribute("checked") )
		{
			document.getElementById("sidebar").contentWindow.SB_findAndSelect(this.resource);
		}
		else
		{
			this.findMe = true;
			toggleSidebar("viewScrapBookSidebar");
		}
	},

};



var sbDOMEraser = {

	parent   : null,
	child    : null,
	refChild : null,
	enabled  : false,

	toggle : function(aEnable)
	{
		this.enabled = aEnable;
		sbEditor.frameList = [window._content];
		sbEditor.getFrameList(window._content);
		for ( var i = 0; i < sbEditor.frameList.length; i++ )
		{
			sbEditor.frameList[i].document.onmouseover = aEnable ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			sbEditor.frameList[i].document.onmouseout  = aEnable ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			sbEditor.frameList[i].document.onclick     = aEnable ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			sbEditor.frameList[i].document.onkeypress  = aEnable ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
		}
		if ( aEnable ) {
			sbEditStyle.apply("scrapbook-eraser-style", "* { cursor: crosshair; }");
		} else {
			sbEditStyle.remove("scrapbook-eraser-style");
		}
		document.getElementById("ScrapBookEditBlock").disabled  = this.enabled;
		document.getElementById("ScrapBookEditMarker").disabled = this.enabled;
		document.getElementById("ScrapBookEditCutter").disabled = this.enabled;
		this.allowUndo(false);
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
				if ( tagName == "TABLE" || tagName == "TD" || tagName == "TH" ) {
					elem.style.backgroundColor = "#FFCCCC";
				} else {
					elem.style.MozOutline = "2px solid " + (onMarker ? "#0000FF" : "#FF0000");
				}
				var base = document.getElementById("content");
				document.getElementById("ScrapBookEditTooltip").hidden = false;
				document.getElementById("ScrapBookEditTooltip").label = onMarker ? sbEditor.STRING.getString("EDIT_REMOVE_HIGHLIGHT") : elem.localName;
				document.getElementById("ScrapBookEditTooltip").showPopup(base, aEvent.clientX + base.boxObject.screenX - 30, aEvent.clientY + base.boxObject.screenY - 30);
				break;
			case "mouseout" :
			case "click" :
				if ( tagName == "TABLE" || tagName == "TD" || tagName == "TH" ) {
					elem.style.backgroundColor = "";
				} else {
					elem.style.MozOutline = "";
				}
				if ( aEvent.type == "mouseout" ) break;
				if ( aEvent.button != 0 ) return;
				if ( tagName == "TABLE" || tagName == "TD" || tagName == "TH" ) {
					elem.style.backgroundColor = "";
				} else {
					elem.style.MozOutline = "";
				}
				if ( onMarker ) {
					elem.removeAttribute("class");
					elem.removeAttribute("style");
				} else {
					this.parent   = elem.parentNode;
					this.refChild = elem.nextSibling;
					this.child    = this.parent.removeChild(elem);
				}
				this.allowUndo(!onMarker);
				sbEditor.changed1 = true;
				break;
			case "keypress" :
				this.undo();
				break;
		}
	},

	allowUndo : function(aBool)
	{
		document.getElementById("ScrapBookEditUndo").hidden = !aBool;
		document.getElementById("ScrapBookEditRestore").hidden = aBool;
	},

	undo : function()
	{
		this.parent.insertBefore(this.child, this.refChild);
		this.allowUndo(false);
		document.getElementById("ScrapBookEditTooltip").hidden = true;
	},

};



var sbBlockComment = {

	add : function()
	{
		var file = SBcommon.getScrapBookDir().clone();
		file.append("blockcomment.css");
		if ( !file.exists() )
		{
			SBcommon.saveTemplateFile("chrome://scrapbook/skin/blockcomment.css", file);
			setTimeout(function(){ sbBlockComment.add(); }, 1000);
			return;
		}
		var style = SBcommon.readFile(file).replace(/\r|\n/g, " ");
		var win = SBcommon.getFocusedWindow();
		var selText = win.getSelection();
		var sel = selText.QueryInterface(Components.interfaces.nsISelectionPrivate);
		var node = sel.anchorNode;
		if ( !node ) return;
		if ( node.nodeName == "#text" ) node = node.parentNode;
		node.appendChild(this.duplicate(style));
		node.lastChild.firstChild.firstChild.focus();
		this.change();
	},

	edit : function(oldElem)
	{
		var newElem = this.duplicate(oldElem.style.cssText);
		newElem.firstChild.firstChild.appendChild(document.createTextNode(oldElem.firstChild.data));
		oldElem.parentNode.replaceChild(newElem, oldElem);
		newElem.firstChild.firstChild.focus();
		this.change();
	},

	duplicate : function(style)
	{
		var div1     = window._content.document.createElement("DIV");
		var div2     = window._content.document.createElement("DIV");
		var input1   = window._content.document.createElement("INPUT");
		var input2   = window._content.document.createElement("INPUT");
		var form     = window._content.document.createElement("FORM");
		var textarea = window._content.document.createElement("TEXTAREA");
		form.setAttribute("style", "margin:none !important;padding:none !important;");
		textarea.setAttribute("style", "width:100%;height:100px;");
		div2.setAttribute("style","text-align:right;");
		input1.setAttribute("type", "button");
		input2.setAttribute("type", "button");
		input1.setAttribute("value", "Enter");
		input2.setAttribute("value", "Delete");
		input1.setAttribute("onclick", "this.parentNode.parentNode.parentNode.appendChild(document.createTextNode(this.parentNode.parentNode.firstChild.value));this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode);");
		input2.setAttribute("onclick", "this.parentNode.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode.parentNode);");
		div2.appendChild(input1);
		div2.appendChild(input2);
		form.appendChild(textarea);
		form.appendChild(div2);
		div1.appendChild(form);
		div1.setAttribute("style", style);
		div1.setAttribute("class", "scrapbook-block-comment");
		return div1;
	},

	toggle : function(aBool)
	{
		if ( aBool ) {
			sbEditStyle.apply("scrapbook-hide-block-comment", ".scrapbook-block-comment { display: none; }");
		} else {
			sbEditStyle.remove("scrapbook-hide-block-comment");
		}
	},

	change : function()
	{
		sbEditor.changed1 = true;
		sbDOMEraser.allowUndo(false);
	},

	onClick : function(aEvent)
	{
		if ( aEvent.originalTarget.getAttribute("class") == "scrapbook-block-comment" )
		{
			sbBlockComment.edit(aEvent.originalTarget);
		}
	},

	customize : function()
	{
		var file = SBcommon.getScrapBookDir().clone();
		file.append("blockcomment.css");
		file.QueryInterface(Components.interfaces.nsILocalFile).launch();
	},

};



var sbEditStyle = {

	apply : function(aStyleID, aStyleString)
	{
		for ( var f = 0; f < sbEditor.frameList.length; f++ )
		{
			var newStyleNode = sbEditor.frameList[f].document.createElement("style");
			newStyleNode.setAttribute("media", "screen");
			newStyleNode.setAttribute("type", "text/css");
			newStyleNode.setAttribute("id", aStyleID);
			newStyleNode.appendChild(sbEditor.frameList[f].document.createTextNode(aStyleString));
			var headNode = sbEditor.frameList[f].document.getElementsByTagName("head")[0];
			headNode.appendChild(newStyleNode);
		}
	},

	remove : function(aStyleID)
	{
		for ( var f = 0; f < sbEditor.frameList.length; f++ )
		{
			try {
				SBcapture.removeNodeFromParent(sbEditor.frameList[f].document.getElementById(aStyleID));
			} catch(ex) {
			}
		}
	},

	removeAll : function()
	{
		for ( var f = 0; f < sbEditor.frameList.length; f++ )
		{
			try {
				var nodes = sbEditor.frameList[f].document.getElementsByTagName("style");
			} catch(ex) {
			}
			for ( var i = nodes.length - 1; i >= 0 ; i-- )
			{
				if ( nodes[i].id.substring(0,10) == "scrapbook-" ) SBcapture.removeNodeFromParent(nodes[i]);
			}
		}
	},

};


