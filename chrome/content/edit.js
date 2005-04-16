/**************************************************
// edit.js
// Implementation file for edit.xul
// 
// Description: 
// Author: Gomita
// Contributors: Bob Chao
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



const DEFAULT_INTERVAL = 3;

var gID;
var gRes;
var gWindow;
var gFrames;
var gChanged;
var gTimerID;
var gShowHeader;
var SBstring;
var SBheader;
var SBbrowser;
var SBcomment;
var SBcommentML;
var SBcommentIL;

var IFLASHER;
try {
	IFLASHER = Components.classes['@mozilla.org/inspector/flasher;1'].getService(Components.interfaces.inIFlasher);
	IFLASHER.thickness = 2;
} catch(ex) {
}



function SB_initEdit()
{
	SBstring    = document.getElementById("ScrapBookString");
	SBbrowser   = document.getElementById("ScrapBookBrowser");
	SBcommentIL = document.getElementById("ScrapBookInlineTextbox");
	gShowHeader = nsPreferences.getBoolPref("scrapbook.edit.showheader", false);
	if ( gShowHeader ) SBheader.hidden = false;
	SBRDF.init();
	gID = document.location.href.match(/\?id\=(\d{14})$/);
	gID = RegExp.$1;
	SB_initBrowser();
	gChanged = false;
	SB_setIntervalConfirmSave();
}


function SB_setIntervalConfirmSave()
{
	var sec = nsPreferences.getIntPref("scrapbook.edit.confirmsave", DEFAULT_INTERVAL);
	if ( sec > 0 ) gTimerID = window.setInterval(SB_checkShouldConfirmSave, sec * 1000 * 60);
}


function SB_initBrowser()
{
	if ( !gID ) return;
	var myDir = SBcommon.getContentDir(gID);
	var myDirPath = SBservice.IO.newFileURI(myDir).spec;
	SBbrowser.setAttribute("src", myDirPath + "index.html");
}


function SB_getFrameList(aWindow)
{
	for ( var f=0; f<aWindow.frames.length; f++ )
	{
		gFrames.push(aWindow.frames[f]);
		SB_getFrameList(aWindow.frames[f]);
	}
}


function SB_browserOnload(aEvent)
{
	aEvent.preventBubble();
	aEvent.stopPropagation();
	gWindow = document.getElementById("ScrapBookBrowser").contentWindow;
	if ( gWindow.location.href == "about:blank" ) return;
	gFrames = [gWindow];
	SB_getFrameList(gWindow);

	if ( gWindow.location.href.match(/^file:/) && gWindow.location.href.match(/\/data\/(\d{14})\/index\.html$/) )
	{
		gID = RegExp.$1;
		SBeditor.disable(false);
		SBeditor.init(gID);
	}
	else
	{
		window.location.href = gWindow.location.href;
	}
	gChanged = false;

	SBeditStyle.apply("scrapbook-inline-comment-style", "");
	for ( var f=0; f<gFrames.length; f++ )
	{
		var aDocument = gFrames[f].document;
		aDocument.removeEventListener("click", SBinlineComment.clickToEdit, true);
		aDocument.addEventListener("click"   , SBinlineComment.clickToEdit, true);
	}
	document.getElementById("ScrapBookBlockHide").setAttribute("checked", false); 

	var myBrowser = SBservice.WM.getMostRecentWindow("navigator:browser").getBrowser();
	if ( myBrowser.selectedBrowser.contentWindow.gID == gID )
	{
		myBrowser.selectedTab.label = SBeditor.item.title;
		myBrowser.selectedTab.setAttribute("image", SBeditor.item.icon);
	}
}


function SB_exitEditingMode()
{
	if ( SBeditor.eraser ) SBeditor.toggleEraser();
	SB_checkShouldConfirmSave();
	window.location.href = gWindow.location.href;
}


function SB_checkShouldConfirmSave()
{
	if ( gChanged ) SB_confirmSave();
	gChanged = false;
}


function SB_confirmSave()
{
	const PROMPT = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
	var target = SBeditor.item.title;
	var button = PROMPT.BUTTON_TITLE_SAVE      * PROMPT.BUTTON_POS_0
	           + PROMPT.BUTTON_TITLE_DONT_SAVE * PROMPT.BUTTON_POS_1;
	var result = PROMPT.confirmEx(window, "ScrapBook", SBstring.getFormattedString("EDIT_SAVE_CHANGES", [target]), button, null, null, null, null, {});
	if ( result == 0 ) SBeditor.save();
}



function SE_getSelection()
{
	var myWindow = document.commandDispatcher.focusedWindow;
	if ( !myWindow || myWindow == window ) myWindow = window._content;
	var selectedText = myWindow.getSelection();
	var mySelection = selectedText.QueryInterface(Components.interfaces.nsISelectionPrivate);
	var isSelected = false;
	try {
		isSelected = ( mySelection.anchorNode.isSameNode(mySelection.focusNode) && mySelection.anchorOffset == mySelection.focusOffset ) ? false : true;
	} catch(ex) {
		isSelected = false;
	}
	return isSelected ? mySelection : false;
}


function SE_cutter(aEvent)
{
	var mySelection = SE_getSelection();
	if ( !mySelection ) return;
	mySelection.deleteFromDocument();
	gChanged = true;
	SBeditDOMEraser.allowUndo(false);
}


function SE_initMarker()
{
	var col = nsPreferences.copyUnicharPref("scrapbook.editor.marker", "#FFFF00");
	var colList = { "#FFFF00" : "Y", "#90EE90" : "G", "#ADD8E6" : "B", "#FFB6C1" : "P" };
	document.getElementById("ScrapEditorMarker" + colList[col]).setAttribute("checked", true);
}


function SE_marker(bgcol)
{
	if ( !bgcol ) bgcol = nsPreferences.copyUnicharPref("scrapbook.editor.marker", "#FFFF00");
	nsPreferences.setUnicharPref("scrapbook.editor.marker", bgcol);
	var mySelection = SE_getSelection();
	if ( !mySelection ) return;
	lmSetMarker(mySelection, "linemarker-marked-line", "background-color: " + bgcol + "; color: #000000;");
	gChanged = true;
	SBeditDOMEraser.allowUndo(false);
}


function SE_removeAllSpan(aClass)
{
	for ( var f=0; f<gFrames.length; f++ )
	{
		var spanElems = gFrames[f].document.getElementsByTagName("span");
		for ( var i = 0; i < spanElems.length; i++ )
		{
			if ( spanElems[i].getAttribute("class") == aClass )
			{
				spanElems[i].removeAttribute("style");
				spanElems[i].removeAttribute("class");
				spanElems[i].removeAttribute("title");
			}
		}
	}
	gChanged = true;
	SBeditDOMEraser.allowUndo(false);
}


function SE_removeElementsByTagName(aTag)
{
	var shouldSave = false;
	for ( var f = gFrames.length - 1; f >= 0; f-- )
	{
		var elems = gFrames[f].document.getElementsByTagName(aTag);
		if ( elems.length < 1 ) continue;
		for ( var i = elems.length - 1; i >= 0; i-- )
		{
			SBhtmlDocUtil.removeNodeFromParent(elems[i]);
		}
		shouldSave = true;
	}
	if ( shouldSave )
	{
		gChanged = true;
		SBeditDOMEraser.allowUndo(false);
		SB_confirmSave();
	}
}




var SBeditDOMEraser = {

	parent   : null,
	child    : null,
	refChild : null,

	handleEvent : function(aEvent)
	{
		aEvent.preventDefault();
		var targetElement = aEvent.originalTarget;
		var tagName = targetElement.localName.toUpperCase();
		try {
			document.getElementById("ScrapEditorFlasher").value = tagName;
		} catch(ex) {}
		if ( aEvent.type != "keypress" && (tagName == "HTML" || tagName == "BODY") ) return;
		var onMarkerLine = ( tagName == "SPAN" && targetElement.getAttribute("class") == "linemarker-marked-line" );

		switch ( aEvent.type )
		{
			case "mouseover" :
				document.getElementById("ScrapBookTooltip").label = onMarkerLine ? SBstring.getString("EDIT_REMOVE_HIGHLIGHT") : tagName;
				document.getElementById("ScrapBookTooltip").showPopup(SBbrowser, aEvent.clientX + SBbrowser.boxObject.screenX, aEvent.clientY + SBbrowser.boxObject.screenY);
				if ( IFLASHER ) {
					IFLASHER.color = onMarkerLine ? "#3333FF" : "#FF3333";
					IFLASHER.drawElementOutline(targetElement);
				}
				break;
			case "mouseout" :
				if ( IFLASHER ) {
					IFLASHER.repaintElement(targetElement);
				}
				break;
			case "click" :
				if ( aEvent.button == 0 )
				{
					if ( tagName == "SPAN" && targetElement.getAttribute("class") == "linemarker-marked-line" ) {
						targetElement.removeAttribute("class");
						targetElement.removeAttribute("style");
						this.allowUndo(false);
					} else {
						this.parent   = targetElement.parentNode;
						this.refChild = targetElement.nextSibling;
						this.child    = this.parent.removeChild(targetElement);
						this.allowUndo(true);
					}
					gChanged = true;
				}
				break;
			case "keypress" :
				this.undo();
				break;
		}
	},

	allowUndo : function(aBool)
	{
		SBundoButton.hidden = !aBool;
		document.getElementById("ScrapEditorRestore").hidden = aBool;
	},

	undo : function()
	{
		this.parent.insertBefore(this.child, this.refChild);
		this.allowUndo(false);
	},

};



var SBeditor = {

	id   : "",
	res  : null,
	item : null,
	eraser  : false,
	comment : false,

	init : function(aID)
	{
		if ( !SBcomment ) return;
		this.id   = aID;
		this.res  = gRes = SBservice.RDF.GetResource("urn:scrapbook:item" + aID);
		this.item = new ScrapBookItem(aID);
		for ( var prop in this.item )
		{
			this.item[prop] = SBRDF.getProperty(prop, this.res);
		}
		document.getElementById("ScrapEditorIcon").src       = this.item.icon ? this.item.icon : SBcommon.getDefaultIcon(this.item.type);
		document.getElementById("ScrapEditorTitle").value    = this.item.title;
		document.getElementById("ScrapEditorEraser").checked = false;
		document.getElementById("ScrapEditorFlasher").value  = "";
		SBcomment.value   = this.item.comment.replace(/ __BR__ /g, "\t");
		SBcommentML.value = this.item.comment.replace(/ __BR__ /g, "\n");
		this.eraser = false;
		SBeditDOMEraser.allowUndo(false);
		SE_initMarker();
		if ( gShowHeader ) SBheader.firstChild.value  = this.item.source;
	},

	toggleEraser : function()
	{
		this.eraser = !this.eraser;
		gFrames = [gWindow];
		SB_getFrameList(gWindow);
		for ( var f=0; f<gFrames.length; f++ )
		{
			gFrames[f].document.removeEventListener("mouseover", SBeditDOMEraser, true);
			gFrames[f].document.removeEventListener("mouseout" , SBeditDOMEraser, true);
			gFrames[f].document.removeEventListener("click"    , SBeditDOMEraser, true);
			gFrames[f].document.removeEventListener("keypress" , SBeditDOMEraser, true);
		}
		SBeditStyle.remove("scrapbook-eraser-style");
		if ( this.eraser ) {
			for ( var f=0; f<gFrames.length; f++ )
			{
				gFrames[f].document.addEventListener("mouseover", SBeditDOMEraser, true);
				gFrames[f].document.addEventListener("mouseout" , SBeditDOMEraser, true);
				gFrames[f].document.addEventListener("click"    , SBeditDOMEraser, true);
				gFrames[f].document.addEventListener("keypress" , SBeditDOMEraser, true);
			}
			SBeditStyle.apply("scrapbook-eraser-style", "* { cursor: crosshair; }");
		}
		document.getElementById("ScrapEditorInline").disabled = this.eraser;
		document.getElementById("ScrapEditorCutter").disabled = this.eraser;
		document.getElementById("ScrapEditorMarker").disabled = this.eraser;
		document.getElementById("ScrapEditorFlasher").value = "";
	},

	toggleCommentXUL : function(inverse)
	{
		this.comment = inverse ? !this.comment : nsPreferences.getBoolPref("scrapbook.edit.multilines", false);
		SBcomment.disabled = this.comment;
		SBcommentML.hidden = !this.comment;
		SBcomment.setAttribute("style", this.comment ? "visibility:hidden;" : "padding:2px;");
		SBcomment.value = this.comment ? SBcomment.value.replace(/\t/g, "\n") : SBcommentML.value.replace(/\n/g, "\t");
		(this.comment ? SBcommentML : SBcomment).focus();
		nsPreferences.setBoolPref("scrapbook.edit.multilines", this.comment);
	},



	restore : function()
	{
		document.getElementById("ScrapBookBrowser").removeAttribute("src");
		SB_initBrowser();
	},

	save : function()
	{
		gFrames = [gWindow];
		SB_getFrameList(gWindow);

		SBeditor.disable(true);

		SBeditStyle.removeAll();

		for ( var f=0; f<gFrames.length; f++ )
		{
			var aDocument = gFrames[f].document;

			var rootNode  = aDocument.getElementsByTagName("html")[0];
			var mySrc = "";
			mySrc = SBhtmlDocUtil.surroundByTags(rootNode, rootNode.innerHTML);
			mySrc = SBhtmlDocUtil.doctypeToString(aDocument.doctype) + mySrc;

			mySrc = mySrc.replace(/ -moz-background-clip: initial; -moz-background-origin: initial; -moz-background-inline-policy: initial;\">/g, '">');
			mySrc = mySrc.replace(/<span>([^<]*)<\/span>/gm, "$1");

			var myFile = SBcommon.getContentDir(this.item.id).clone();
			myFile.append(SBcommon.getFileName(aDocument.location.href));
			SBcommon.writeFile(myFile, mySrc, aDocument.characterSet);
		}

		SBeditor.saveResource();
		SBbrowser.reload();
		gChanged = false;
		window.setTimeout(function() { SBbrowser.stop(); SBeditor.disable(false); }, 500);
	},

	saveResource : function()
	{
		var newTitle   = document.getElementById("ScrapEditorTitle").value;
		var newComment = (this.comment ? SBcommentML : SBcomment).value.replace(/\t|\n/g, " __BR__ ");
		if ( newTitle != this.item.title || newComment != this.item.comment )
		{
			SBRDF.updateItem(this.res, "title",   newTitle);
			SBRDF.updateItem(this.res, "comment", newComment);
			SBRDF.flush();
			this.item.title   = newTitle;
			this.item.comment = newComment;
			SBcommon.writeIndexDat(this.item);
			this.disableTemporary(500);
		}
	},

	disableTemporary : function(msec)
	{
		window.setTimeout(function() { SBeditor.disable(true);  }, 0);
		window.setTimeout(function() { SBeditor.disable(false); }, msec);
	},

	disable : function(aBool)
	{
		var editorXULs = document.getElementById("ScrapEditor").childNodes;
		for ( var i = 0; i < editorXULs.length; i++ )
		{
			if ( editorXULs[i].id != "ScrapEditorUndo" ) editorXULs[i].disabled = aBool;
		}
		SBcommentML.disabled = aBool;
	}

};



var SBinlineComment = {

	selection  : null,
	targetSpan : null,

	showXUL : function(show)
	{
		if ( SBeditor.comment ) SBcommentML.hidden = show;
		document.getElementById("ScrapEditor").hidden = show;
		document.getElementById("ScrapBookInline").hidden = !show;
		document.getElementById("ScrapBookInlineHeader").hidden = !show;
	},

	init : function(target)
	{
		if ( !target ) this.selection = SE_getSelection();
		if ( !target && !this.selection ) return;
		this.targetSpan = target ? target : null;
		this.showXUL(true);
		SBcommentIL.value = target ? target.getAttribute("title") : "";
		SBcommentIL.select();
		var label = target ? target.innerHTML : this.selection.toString();
		label = label.length > 72 ? label.substring(0,72) + "..." : label;
		document.getElementById("ScrapBookInlineHeader").firstChild.value = SBstring.getFormattedString("EDIT_INLINE_COMMENT", [label]);
	},

	save : function()
	{
		if ( this.targetSpan )
		{
			if ( !SBcommentIL.value ) {
				this.targetSpan.removeAttribute("class");
				this.targetSpan.removeAttribute("style");
				this.targetSpan.removeAttribute("title");
			} else {
				this.targetSpan.setAttribute("title", SBcommentIL.value);
			}
		}
		else
		{
			if ( !SBcommentIL.value ) return;
			lmSetMarker(
				this.selection,
				"scrapbook-inline-comment",
				"border-bottom: 2px dotted #FF3333; cursor: help;",
				SBcommentIL.value
			);
		}
		gChanged = true;
		this.exit();
	},

	exit : function()
	{
		this.showXUL(false);
	},

	remove : function ()
	{
		SBcommentIL.value = "";
		this.save();
	},

	keypress : function(aEvent)
	{
		if      ( aEvent.keyCode == 13 ) this.save();
		else if ( aEvent.keyCode == 27 ) this.exit();
	},

	clickToEdit : function(aEvent)
	{
		var tName  = aEvent.originalTarget.localName.toUpperCase();
		var tClass = aEvent.originalTarget.getAttribute("class");
		if      ( tName == "SPAN" && tClass == "scrapbook-inline-comment" ) SBinlineComment.init(aEvent.originalTarget);
		else if ( tName == "DIV"  && tClass == "scrapbook-block-comment"  ) SBblockComment.edit(aEvent.originalTarget);
	},

};


var SBblockComment = {

	get DEFAULT_STYLE()
	{
		return "font-size: 0.9em !important; font-weight: normal !important;\n"
		     + "text-decoration: none !important;\n"
		     + "line-height: 1.5em !important;\n"
		     + "color: #000000 !important;\n\n"
		     + "border: 1px solid #0FA9E5 !important;\n"
		     + "background-color: #E7F4FC !important;\n\n"
		     + "margin: 10px !important;\n"
		     + "padding: 10px !important;\n\n"
		     + "white-space:normal !important;\n"
		     + "cursor: pointer !important;\n"
		     + "";
	},

	add : function()
	{
		var myWindow = SBcommon.getFocusedWindow();
		if ( !myWindow.location.href.match(/^file:\/\//) ) return;
		var selectedText = myWindow.getSelection();
		var mySelection = selectedText.QueryInterface(Components.interfaces.nsISelectionPrivate);
		var targetNode = mySelection.anchorNode;
		if ( !targetNode ) return;
		if ( targetNode.nodeName == "#text" ) targetNode = targetNode.parentNode;
		targetNode.appendChild(this.duplicate());
		targetNode.lastChild.firstChild.firstChild.focus();
		this.change();
	},

	edit : function(oldElement)
	{
		var newElement = this.duplicate();
		newElement.firstChild.firstChild.appendChild(document.createTextNode(oldElement.firstChild.data));
		oldElement.parentNode.replaceChild(newElement, oldElement);
		newElement.firstChild.firstChild.focus();
		this.change();
	},

	duplicate : function()
	{
		var divElement = document.getElementById("ScrapBookBlock").cloneNode(true);
		divElement.setAttribute("style", nsPreferences.copyUnicharPref("scrapbook.editor.blockstyle", this.DEFAULT_STYLE));
		divElement.removeAttribute("id");
		return divElement;
	},

	customizeCSS : function(init)
	{
		if ( SBeditor.comment ) SBcommentML.hidden = init;
		document.getElementById("ScrapEditor").hidden = init;
		document.getElementById("ScrapBookBlockStyle").hidden = !init;
		document.getElementById("ScrapBookBlockHeader").hidden = !init;
		if ( init ) {
			document.getElementById("ScrapBookBlockStyle").value = nsPreferences.copyUnicharPref("scrapbook.editor.blockstyle", this.DEFAULT_STYLE);
			document.getElementById("ScrapBookBlockStyle").focus();
		} else {
			nsPreferences.setUnicharPref("scrapbook.editor.blockstyle", document.getElementById("ScrapBookBlockStyle").value);
		}
	},

	toggleHide : function()
	{
		if ( document.getElementById("ScrapBookBlockHide").getAttribute("checked") ) {
			SBeditStyle.apply("scrapbook-hide-block-comment", ".scrapbook-block-comment { display: none; }");
		} else {
			SBeditStyle.remove("scrapbook-hide-block-comment");
		}
	},

	change : function()
	{
		gChanged = true;
		SBeditDOMEraser.allowUndo(false);
	},

};


var SBhtmlDocUtil = {

	removeNodeFromParent : function(aNode)
	{
		var newNode = document.createTextNode("");
		aNode.parentNode.replaceChild(newNode, aNode);
		aNode = newNode;
		return aNode;
	},
	surroundByTags : function(aNode, aContent)
	{
		var tag = "<" + aNode.nodeName.toLowerCase();
		for ( var i=0; i<aNode.attributes.length; i++ )
		{
			tag += ' ' + aNode.attributes[i].name + '="' + aNode.attributes[i].value + '"';
		}
		tag += ">\n";
		return tag + aContent + "</" + aNode.nodeName.toLowerCase() + ">\n";
	},
	doctypeToString : function(aDoctype)
	{
		if ( !aDoctype ) return "";
		var ret = "<!DOCTYPE " + aDoctype.name;
		if ( aDoctype.publicId ) ret += ' PUBLIC "' + aDoctype.publicId + '"';
		if ( aDoctype.systemId ) ret += ' "'        + aDoctype.systemId + '"';
		ret += ">\n";
		return ret;
	},
};




var SBeditStyle = {

	apply : function(aStyleID, aStyleString)
	{
		for ( var f=0; f<gFrames.length; f++ )
		{
			var newStyleNode = gFrames[f].document.createElement("style");
			newStyleNode.setAttribute("media", "screen");
			newStyleNode.setAttribute("type", "text/css");
			newStyleNode.setAttribute("id", aStyleID);
			newStyleNode.appendChild(gFrames[f].document.createTextNode(aStyleString));
			var headNode = gFrames[f].document.getElementsByTagName("head")[0];
			headNode.appendChild(newStyleNode);
		}
	},

	remove : function(aStyleID)
	{
		for ( var f=0; f<gFrames.length; f++ )
		{
			try {
				SBhtmlDocUtil.removeNodeFromParent(gFrames[f].document.getElementById(aStyleID));
			} catch(ex) {
			}
		}
	},

	removeAll : function()
	{
		for ( var f=0; f<gFrames.length; f++ )
		{
			try {
				var styleNodes = gFrames[f].document.getElementsByTagName("style");
			} catch(ex) {
			}
			for ( var i = styleNodes.length - 1; i >= 0 ; i-- )
			{
				if ( styleNodes[i].id.substring(0,10) == "scrapbook-" ) SBhtmlDocUtil.removeNodeFromParent(styleNodes[i]);
			}
		}
	},

};


