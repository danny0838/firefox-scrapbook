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



var sbPageEditor = {

	get STRING()  { return document.getElementById("ScrapBookEditString"); },
	get TOOLBAR() { return document.getElementById("ScrapBookEditor"); },
	get COMMENT() { return document.getElementById("ScrapBookEditComment"); },

	item : { id : "" },
	resource : null,
	changed1 : false,
	changed2 : false,
	multiline : false,
	frameList : [],
	focusedWindow : null,

	init : function()
	{
		var id = sbBrowserOverlay.getID();
		if ( !id ) return;
		this.changed1 = false;
		this.changed2 = false;
		this.resource = SBservice.RDF.GetResource("urn:scrapbook:item" + id);
		this.item = new ScrapBookItem(id);
		for ( var prop in this.item )
		{
			this.item[prop] = sbDataSource.getProperty(prop, this.resource);
		}
		this.disable(!this.item.id);
		document.getElementById("ScrapBookEditTitle").value = sbDataSource.getProperty("title", this.resource);
		document.getElementById("ScrapBookEditIcon").src    = this.item.icon ? this.item.icon : SBcommon.getDefaultIcon();
		this.COMMENT.value = "";
		this.showHide(true);
		setTimeout(function(){ sbPageEditor.delayedInit(); }, 100);
	},

	delayedInit : function()
	{
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
			this.frameList[i].onclick = sbBlockComment.onClick;
		}
		window._content.onbeforeunload = function(){ sbPageEditor.confirmSave(); };
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
			this.TOOLBAR.insertBefore(this.COMMENT, document.getElementById("ScrapBookEditMarker"));
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
		var attr = {};
		attr["class"] = "linemarker-marked-line";
		attr["style"] = "background-color: " + bgcol + "; color: #000000;";
		sbLineMarker.set(this.focusedWindow, sel, "span", attr);
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
				sbContentSaver.removeNodeFromParent(elems[j]);
			}
			shouldSave = true;
		}
		if ( shouldSave )
		{
			this.changed1 = true;
			sbDOMEraser.allowUndo(false);
		}
	},

	stripAttributes : function(aElement)
	{
		aElement.removeAttribute("style");
		aElement.removeAttribute("class");
		aElement.removeAttribute("title");
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

	confirmSave : function()
	{
		if ( this.changed2 ) this.save2();
		if ( !this.changed1 ) return 0;
		var button = SBservice.PROMPT.BUTTON_TITLE_SAVE * SBservice.PROMPT.BUTTON_POS_0 + SBservice.PROMPT.BUTTON_TITLE_DONT_SAVE * SBservice.PROMPT.BUTTON_POS_1;
		var res = SBservice.PROMPT.confirmEx(window, "ScrapBook", this.STRING.getFormattedString("EDIT_SAVE_CHANGES", [this.item.title]), button, null, null, null, null, {});
		if ( res == 0 ) this.save1();
		this.changed1 = false;
		return res;
	},

	save1 : function()
	{
		if ( !sbDataSource.exists(this.resource) ) { this.disable(true); return; }
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
		this.removeAllStyles();
		for ( var i = 0; i < this.frameList.length; i++ )
		{
			var doc = this.frameList[i].document;
			var rootNode = doc.getElementsByTagName("html")[0];
			var src = "";
			src = sbContentSaver.surroundByTags(rootNode, rootNode.innerHTML);
			src = sbContentSaver.doctypeToString(doc.doctype) + src;
			src = src.replace(/ -moz-background-clip: initial; -moz-background-origin: initial; -moz-background-inline-policy: initial;\">/g, '">');
			src = src.replace(/<span>([^<]*)<\/span>/g, "$1");
			var file = SBcommon.getContentDir(this.item.id).clone();
			file.append(SBcommon.getFileName(doc.location.href));
			SBcommon.writeFile(file, src, doc.characterSet);
		}
		this.changed1 = false;
		window.setTimeout(function() { window._content.stop(); sbPageEditor.disable(false); }, 500);
	},

	save2 : function()
	{
		if ( !sbDataSource.exists(this.resource) ) { this.disable(true); return; }
		var newTitle   = document.getElementById("ScrapBookEditTitle").value;
		var newComment = SBcommon.escapeComment(this.COMMENT.value);
		if ( newTitle != this.item.title || newComment != this.item.comment )
		{
			this.disableTemporary(500);
			sbDataSource.updateItem(this.resource, "title",   newTitle);
			sbDataSource.updateItem(this.resource, "comment", newComment);
			sbDataSource.flush();
			this.item.title   = newTitle;
			this.item.comment = newComment;
			SBcommon.writeIndexDat(this.item);
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
		try { SBservice.PREF.setBoolPref("scrapbook.view.editor", this.TOOLBAR.hidden); } catch(ex) {}
		sbBrowserOverlay.editMode = this.TOOLBAR.hidden;
		if ( this.TOOLBAR.hidden )
			this.init();
		else
			this.exit();
	},

	showHide : function(willShow)
	{
		this.COMMENT.hidden = !willShow;
		this.TOOLBAR.hidden = !willShow;
		sbInfoViewer.optimize();
	},


	applyStyle : function(aID, aString)
	{
		for ( var f = 0; f < sbPageEditor.frameList.length; f++ )
		{
			var newNode = sbPageEditor.frameList[f].document.createElement("style");
			newNode.setAttribute("media", "screen");
			newNode.setAttribute("type", "text/css");
			newNode.setAttribute("id", aID);
			newNode.appendChild(sbPageEditor.frameList[f].document.createTextNode(aString));
			var headNode = sbPageEditor.frameList[f].document.getElementsByTagName("head")[0];
			headNode.appendChild(newNode);
		}
	},

	removeStyle : function(aID)
	{
		for ( var f = 0; f < sbPageEditor.frameList.length; f++ )
		{
			try { sbContentSaver.removeNodeFromParent(sbPageEditor.frameList[f].document.getElementById(aID)); } catch(ex) {}
		}
	},

	removeAllStyles : function()
	{
		for ( var f = 0; f < sbPageEditor.frameList.length; f++ )
		{
			var nodes = sbPageEditor.frameList[f].document.getElementsByTagName("style");
			for ( var i = nodes.length - 1; i >= 0 ; i-- )
			{
				if ( nodes[i].id.indexOf("scrapbook-") == 0 ) sbContentSaver.removeNodeFromParent(nodes[i]);
			}
		}
	},

};




var sbDOMEraser = {

	parent   : null,
	child    : null,
	refChild : null,
	enabled  : false,

	init : function(aStateFlag)
	{
		this.enabled = (aStateFlag == 1);
		document.getElementById("ScrapBookEditBlock").disabled  = this.enabled;
		document.getElementById("ScrapBookEditMarker").disabled = this.enabled;
		document.getElementById("ScrapBookEditCutter").disabled = this.enabled;
		this.allowUndo(false);
		if ( aStateFlag == 0 ) return;
		sbPageEditor.frameList = [window._content];
		sbPageEditor.getFrameList(window._content);
		for ( var i = 0; i < sbPageEditor.frameList.length; i++ )
		{
			sbPageEditor.frameList[i].document.onmouseover = this.enabled ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			sbPageEditor.frameList[i].document.onmouseout  = this.enabled ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			sbPageEditor.frameList[i].document.onclick     = this.enabled ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
			sbPageEditor.frameList[i].document.onkeypress  = this.enabled ? function(aEvent){ sbDOMEraser.handleEvent(aEvent); } : null;
		}
		if ( this.enabled ) {
			sbPageEditor.applyStyle("scrapbook-eraser-style", "* { cursor: crosshair; }");
		} else {
			sbPageEditor.removeStyle("scrapbook-eraser-style");
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
				elem.style.MozOutline = "2px solid " + (onMarker ? "#0000FF" : "#FF0000");
				if ( tagName == "TABLE" || tagName == "TD" || tagName == "TH" ) elem.style.backgroundColor = "#FFCCCC";
				var base = document.getElementById("content");
				document.getElementById("ScrapBookEditTooltip").hidden = false;
				document.getElementById("ScrapBookEditTooltip").label = onMarker ? sbPageEditor.STRING.getString("EDIT_REMOVE_HIGHLIGHT") : elem.localName;
				document.getElementById("ScrapBookEditTooltip").showPopup(base, aEvent.clientX + base.boxObject.screenX - 60, aEvent.clientY + base.boxObject.screenY - 60);
				break;
			case "mouseout" :
			case "click" :
				elem.style.MozOutline = "";
				if ( tagName == "TABLE" || tagName == "TD" || tagName == "TH" ) elem.style.backgroundColor = "";
				if ( !elem.getAttribute("style") ) elem.removeAttribute("style");
				if ( aEvent.type == "click" && aEvent.button == 0 )
				{
					if ( onMarker ) {
						sbPageEditor.stripAttributes(elem);
					} else {
						this.parent   = elem.parentNode;
						this.refChild = elem.nextSibling;
						this.child    = this.parent.removeChild(elem);
					}
					this.allowUndo(!onMarker);
					sbPageEditor.changed1 = true;
				}
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
		var file = SBcommon.getScrapBookDir();
		file.append("block.css");
		if ( !file.exists() )
		{
			SBcommon.saveTemplateFile("chrome://scrapbook/skin/block.css", file);
			setTimeout(function(){ sbBlockComment.add(); }, 1000);
			return;
		}
		var style = SBcommon.readFile(file).replace(/\r|\n/g, " ");
		var win = SBcommon.getFocusedWindow();
		var sel = win.getSelection().QueryInterface(Components.interfaces.nsISelectionPrivate);
		var node = sel.anchorNode;
		if ( !node ) return;
		if ( node instanceof Text ) node = node.parentNode;
		if ( node instanceof HTMLAnchorElement ) node = node.parentNode;
		node.appendChild(this.duplicate(style));
		node.lastChild.firstChild.firstChild.focus();
		this.change();
	},

	edit : function(aEvent)
	{
		var oldElem = aEvent.originalTarget;
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
		input1.setAttribute("value", sbPageEditor.STRING.getString("EDIT_BLOCK_COMMENT_ENTER"));
		input2.setAttribute("value", sbPageEditor.STRING.getString("EDIT_BLOCK_COMMENT_DELETE"));
		input1.onclick = function(){ div1.appendChild(document.createTextNode(textarea.value)); div1.removeChild(form); div1.removeAttribute("status"); };
		input2.onclick = function(){ div1.parentNode.removeChild(div1); };
		div2.appendChild(input1);
		div2.appendChild(input2);
		form.appendChild(textarea);
		form.appendChild(div2);
		div1.appendChild(form);
		div1.setAttribute("style" , style);
		div1.setAttribute("status", "edit");
		div1.setAttribute("class" , "scrapbook-block-comment");
		return div1;
	},

	toggle : function(aBool)
	{
		if ( aBool ) {
			sbPageEditor.applyStyle("scrapbook-hide-block-comment", ".scrapbook-block-comment { display: none; }");
		} else {
			sbPageEditor.removeStyle("scrapbook-hide-block-comment");
		}
	},

	change : function()
	{
		sbPageEditor.changed1 = true;
		sbDOMEraser.allowUndo(false);
	},

	onClick : function(aEvent)
	{
		if ( aEvent.originalTarget.getAttribute("status") == "edit" ) return;
		if ( aEvent.originalTarget.getAttribute("class") == "scrapbook-block-comment" )
			sbBlockComment.edit(aEvent);
		else if ( aEvent.originalTarget.getAttribute("class") == "scrapbook-inline-comment" )
			sbBlockComment.editInline(aEvent.originalTarget);
	},

	customize : function()
	{
		var file = SBcommon.getScrapBookDir().clone();
		file.append("block.css");
		file.QueryInterface(Components.interfaces.nsILocalFile).launch();
	},


	addInline : function()
	{
		var sel = sbPageEditor.getSelection();
		if ( !sel ) return;
		var ret = {};
		if ( !SBservice.PROMPT.prompt(window, "ScrapBook", sbPageEditor.STRING.getFormattedString("EDIT_INLINE_COMMENT", [sel.toString()]), ret, null, {}) ) return;
		if ( !ret.value ) return;
		var attr = {};
		attr["class"] = "scrapbook-inline-comment";
		attr["style"] = "border-bottom: 2px dotted #FF3333; cursor: help;";
		attr["title"] = ret.value;
		sbLineMarker.set(sbPageEditor.focusedWindow, sel, "span", attr);
		sbPageEditor.changed1 = true;
	},

	editInline : function(aElement)
	{
		var ret = { value : aElement.getAttribute("title") };
		if ( !SBservice.PROMPT.prompt(window, "ScrapBook", sbPageEditor.STRING.getFormattedString("EDIT_INLINE_COMMENT", [aElement.textContent]), ret, null, {}) ) return;
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
		var attr = {};
		if ( aFlag == "L" )
		{
			var ret = {};
			if ( !SBservice.PROMPT.prompt(window, "ScrapBook - " + aLabel, "URL:", ret, null, {}) ) return;
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
				FP.file.copyTo(SBcommon.getContentDir(sbPageEditor.item.id), FP.file.leafName);
			} catch(ex) {
				alert("ScrapBook ERROR: The file '" + FP.file.leafName + "' already exists.");
				return;
			}
			attr["href"] = SBcommon.getFileName(SBservice.IO.newFileURI(FP.file).spec);
		}
		sbLineMarker.set(sbPageEditor.focusedWindow, sel, "a", attr);
		sbPageEditor.changed1 = true;
	},

};




var sbInfoViewer = {

	get TOOLBAR() { return document.getElementById("ScrapBookInfobar"); },

	resource : null,

	init : function()
	{
		var id = sbBrowserOverlay.getID();
		if ( !id ) return;
		this.resource = SBservice.RDF.GetResource("urn:scrapbook:item" + id);
		if ( !sbDataSource.exists(this.resource) ) return;
		this.TOOLBAR.hidden = false;
		var isSite = (sbDataSource.getProperty("type", this.resource) == "site");
		document.getElementById("ScrapBookInfoHome").disabled = !isSite;
		document.getElementById("ScrapBookInfoSite").disabled = !isSite;
		document.getElementById("ScrapBookInfoHome").setAttribute("image", "chrome://scrapbook/skin/info_home" + (isSite ? "1" : "0") +  ".png");
		document.getElementById("ScrapBookInfoSite").setAttribute("image", "chrome://scrapbook/skin/info_link" + (isSite ? "1" : "0") +  ".png");
		var srcLabel = document.getElementById("ScrapBookInfoSource");
		srcLabel.value = sbDataSource.getProperty("source", this.resource);
		srcLabel.onclick = function(aEvent){ SBcommon.loadURL(srcLabel.value, aEvent.button == 1); };
	},

	optimize : function()
	{
		this.TOOLBAR.style.borderBottom = sbPageEditor.TOOLBAR.hidden ? "1px solid ThreeDShadow" : "none";
	},

	toggle : function()
	{
		if ( !sbBrowserOverlay.getID() ) return;
		try { SBservice.PREF.setBoolPref("scrapbook.view.infobar", this.TOOLBAR.hidden); } catch(ex) {}
		sbBrowserOverlay.infoMode = this.TOOLBAR.hidden;
		if ( this.TOOLBAR.hidden )
			this.init();
		else
			this.TOOLBAR.hidden = true;
		this.optimize();
	},

	load : function(aFileName)
	{
		gBrowser.loadURI(gBrowser.currentURI.resolve(aFileName), null, null);
	},

};



