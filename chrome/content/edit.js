/**************************************************
// edit.js
// Implementation file for edit.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



const NS_XHTML = "http://www.w3.org/1999/xhtml";

var gID;
var gResource;
var gDocument;
var gChanged;
var SBstring;
var SBbrowser;
var SBcomment;
var SBcommentML;
var SBcommentIL;



function SB_initEdit()
{
	SBstring    = document.getElementById("ScrapBookString");
	SBbrowser   = document.getElementById("ScrapBookBrowser");
	SBcommentIL = document.getElementById("ScrapBookInlineTextbox");
	SBRDF.init();
	gID = document.location.href.match(/\?id\=(\d{14})$/);
	gID = RegExp.$1;
	SB_initBrowser();
	gChanged = false;
	window.setInterval(SB_autoSave, 60000);
	if ( nsPreferences.copyUnicharPref("app.id") != "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}" )
	{
		document.getElementById("ScrapBookEditorMarker").removeAttribute("type");
		document.getElementById("ScrapBookEditorCutter").removeAttribute("type");
	}
}


function SB_initBrowser()
{
	if ( !gID ) return;
	var myDir = SBcommon.getContentDir(gID);
	var myDirPath = SBservice.IO.newFileURI(myDir).spec;
	SBbrowser.setAttribute("src", myDirPath + "index.html");
}


function SB_browserOnload(aEvent)
{
	aEvent.preventBubble();
	aEvent.stopPropagation();
	gDocument = document.getElementById("ScrapBookBrowser").contentDocument;
	for ( var i=0; i<gDocument.links.length; i++ ) gDocument.links[i].setAttribute("target", "_top");
	for ( var i=0; i<gDocument.forms.length; i++ ) gDocument.forms[i].setAttribute("target", "_top");
	var theURL = gDocument.location.href;
	if ( theURL.match(/^file:/) && theURL.match(/\/data\/(\d{14})\/index\.html$/) )
	{
		gID = RegExp.$1;
		SBeditor.disable(false);
		SBeditor.init(gID);
	}
	else
	{
		SBeditor.disable(true);
	}
	gChanged = false;

	SBeditStyle.add("scrapbook-inline-comment-style", "");

	gDocument.removeEventListener("click", SBinline.clickToEdit, true);
	gDocument.addEventListener("click"   , SBinline.clickToEdit, true);
}


function SB_switchNormalMode()
{
	SB_autoSave();
	window.location.href = gDocument.location.href;
}


function SB_autoSave()
{
	if ( gChanged ) SB_confirmSave();
	gChanged = false;
}


function SB_confirmSave()
{
	const PROMPT = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
	var target = SBRDF.getProperty("title", SBeditor.res);
	var button = PROMPT.BUTTON_TITLE_SAVE      * PROMPT.BUTTON_POS_0
	           + PROMPT.BUTTON_TITLE_DONT_SAVE * PROMPT.BUTTON_POS_1;
	var result = PROMPT.confirmEx(window, "ScrapBook", "'" + target + "' " + SBstring.getString("SAVE_CHANGES"), button, null, null, null, null, {});
	if ( result == 0 ) SBeditor.save();
}



function SB_getSelection()
{
	var myWindow = document.commandDispatcher.focusedWindow;
	if ( !myWindow || myWindow == window ) myWindow = window._content;
	var selectedText = myWindow.__proto__.getSelection.call(myWindow);
	var mySelection = selectedText.QueryInterface(Components.interfaces.nsISelectionPrivate);
	var isSelected = false;
	try {
		isSelected = ( mySelection.anchorNode.isSameNode(mySelection.focusNode) && mySelection.anchorOffset == mySelection.focusOffset ) ? false : true;
	} catch(ex) {
		isSelected = false;
	}
	if ( !isSelected ) {
		return false;
	} else {
		return mySelection;
	}
}


function SB_editorCutter(aEvent)
{
	var mySelection = SB_getSelection();
	if ( !mySelection ) return;
	mySelection.deleteFromDocument();
	gChanged = true;
}


function SB_editorMarker(bgcol)
{
	if ( !bgcol ) bgcol = nsPreferences.copyUnicharPref("scrapbook.editor.marker", "#FFFF00");
	nsPreferences.setUnicharPref("scrapbook.editor.marker", bgcol);
	var mySelection = SB_getSelection();
	if ( !mySelection ) return;
	lmSetMarker(mySelection, "linemarker-marked-line", "background-color: " + bgcol + "; color: #000000;");
	gChanged = true;
}


function SB_editorMarkerInit()
{
	var col = nsPreferences.copyUnicharPref("scrapbook.editor.marker", "#FFFF00");
	var colList = { "#FFFF00" : "Y", "#90EE90" : "G", "#ADD8E6" : "B", "#FFB6C1" : "P" };
	document.getElementById("ScrapBookEditorMarker" + colList[col]).setAttribute("checked", true);
}


function SB_editorRemoveAllSpan(aClass)
{
	var spanElems = gDocument.getElementsByTagName("span");
	for ( var i = 0; i < spanElems.length; i++ )
	{
		if ( spanElems[i].getAttribute("class") == aClass )
		{
			spanElems[i].removeAttribute("style");
			spanElems[i].removeAttribute("class");
			spanElems[i].removeAttribute("title");
		}
	}
	gChanged = true;
}


var SBeditDocument = {

	tagName : "",

	removeElements : function(aTagName)
	{
		this.tagName = aTagName;
		this.processRecursively(gDocument.body);
		gChanged = true;
	},

	processRecursively : function(rootNode)
	{
		for ( var curNode = rootNode.firstChild; curNode != null; curNode = curNode.nextSibling )
		{
			if ( curNode.nodeName.toUpperCase() == this.tagName ) curNode = SBhtmlDoc.removeNodeFromParent(curNode);
			this.processRecursively(curNode);
		}
	}
};



var DOM_FLASHER;
try {
	DOM_FLASHER = Components.classes['@mozilla.org/inspector/flasher;1'].getService(Components.interfaces.inIFlasher);
	DOM_FLASHER.thickness = 2;
} catch(ex) {
}


var SB_mouseEventListener = {

	handleEvent : function(aEvent)
	{
		var targetElement = aEvent.originalTarget;
		var tagName = targetElement.localName.toUpperCase();
		document.getElementById("ScrapBookEditorFlasher").value = tagName;
		if ( tagName == "HTML" || tagName == "BODY" ) return;
		var onMarkerLine = ( tagName == "SPAN" && targetElement.getAttribute("class") == "linemarker-marked-line" );

		switch ( aEvent.type )
		{
			case "mouseover" :
				document.getElementById("ScrapBookTooltip").label = onMarkerLine ? "Click to remove this highlight." : tagName;
				document.getElementById("ScrapBookTooltip").showPopup(SBbrowser, aEvent.clientX + SBbrowser.boxObject.screenX, aEvent.clientY + SBbrowser.boxObject.screenY);
				DOM_FLASHER.color = onMarkerLine ? "#3333FF" : "#FF3333";
				DOM_FLASHER.drawElementOutline(targetElement);
				break;
			case "mouseout" :
				DOM_FLASHER.repaintElement(targetElement);
				break;
			case "click" :
				aEvent.preventDefault();
				if ( aEvent.button == 0 )
				{
					if ( tagName == "SPAN" && targetElement.getAttribute("class") == "linemarker-marked-line" ) {
						targetElement.removeAttribute("class");
						targetElement.removeAttribute("style");
					} else {
						targetElement.parentNode.removeChild(targetElement);
					}
					gChanged = true;
				}
				break;
		}
	}
};



var SBeditor = {

	id   : "",
	res  : null,
	eraser  : false,
	comment : false,

	init : function(aID)
	{
		if ( !SBcomment ) return;
		this.id = aID;
		this.res = gResource = SBservice.RDF.GetResource("urn:scrapbook:item" + aID);
		var iconURL = SBRDF.getProperty("icon", this.res);
		if ( !iconURL ) iconURL = SBcommon.getDefaultIcon(SBRDF.getProperty("type", this.res));
		document.getElementById("ScrapBookEditorIcon").src        = iconURL;
		document.getElementById("ScrapBookEditorTitle").value     = SBRDF.getProperty("title", this.res);
		document.getElementById("ScrapBookEditorEraser").checked  = false;
		document.getElementById("ScrapBookEditorFlasher").value   = "";
		SBcomment.value   = SBRDF.getProperty("comment", this.res).replace(/ __BR__ /g, "\t");
		SBcommentML.value = SBRDF.getProperty("comment", this.res).replace(/ __BR__ /g, "\n");
		this.eraser = false;
		if ( !DOM_FLASHER ) document.getElementById("ScrapBookEditorEraser").hidden = true;
		SB_editorMarkerInit();
	},

	toggleEraser : function()
	{
		this.eraser = !this.eraser;
		gDocument.removeEventListener("mouseover", SB_mouseEventListener, true);
		gDocument.removeEventListener("mouseout" , SB_mouseEventListener, true);
		gDocument.removeEventListener("click"    , SB_mouseEventListener, true);
		SBeditStyle.remove("scrapbook-eraser-style");
		if ( this.eraser ) {
			gDocument.addEventListener("mouseover", SB_mouseEventListener, true);
			gDocument.addEventListener("mouseout" , SB_mouseEventListener, true);
			gDocument.addEventListener("click"    , SB_mouseEventListener, true);
			SBeditStyle.add("scrapbook-eraser-style", "* { cursor: crosshair; }");
		}
		document.getElementById("ScrapBookEditorMarker").disabled = this.eraser;
		document.getElementById("ScrapBookEditorCutter").disabled = this.eraser;
		document.getElementById("ScrapBookEditorInline").disabled = this.eraser;
		document.getElementById("ScrapBookEditorFlasher").value = "";
	},

	toggleCommentXUL : function(inverse)
	{
		this.comment = inverse ? !this.comment : nsPreferences.getBoolPref("scrapbook.editor.comment", false);
		SBcomment.disabled = this.comment;
		SBcommentML.hidden = !this.comment;
		SBcomment.setAttribute("style", this.comment ? "visibility:hidden;" : "height:1.7em;");
		SBcomment.value = this.comment ? SBcomment.value.replace(/\t/g, "\n") : SBcommentML.value.replace(/\n/g, "\t");
		(this.comment ? SBcommentML : SBcomment).focus();
		nsPreferences.setBoolPref("scrapbook.editor.comment", this.comment);
	},



	undo : function()
	{
		document.getElementById("ScrapBookBrowser").removeAttribute("src");
		SB_initBrowser();
	},

	save : function()
	{
		SBeditor.disable(true);

		for ( var i=0; i<gDocument.links.length; i++ ) gDocument.links[i].removeAttribute("target");
		for ( var i=0; i<gDocument.forms.length; i++ ) gDocument.forms[i].removeAttribute("target");

		SBeditStyle.removeAll();

		var rootNode  = gDocument.getElementsByTagName("html")[0];
		var mySrc = "";
		mySrc = SBhtmlDoc.surroundByTags(rootNode, rootNode.innerHTML);
		mySrc = SBhtmlDoc.doctypeToString(gDocument.doctype) + mySrc;

		mySrc = mySrc.replace(/ -moz-background-clip: initial; -moz-background-origin: initial; -moz-background-inline-policy: initial;\">/g, '">');
		mySrc = mySrc.replace(/<span>([^<]*)<\/span>/gm, "$1");

		var myFile = SBcommon.getContentDir(SBRDF.getProperty("id", this.res)).clone();
		myFile.append("index.html");
		SBcommon.writeFile(myFile, mySrc, gDocument.characterSet);

		SBeditor.saveResource();
		SBeditor.init(gID);
		SBbrowser.reload();
		setTimeout(function() { SBbrowser.stop(); SBeditor.disable(false); }, 500);
	},

	saveResource : function()
	{
		var newTitle   = document.getElementById("ScrapBookEditorTitle").value;
		var newComment = (this.comment ? SBcommentML : SBcomment).value.replace(/\t|\n/g, " __BR__ ");
		if ( newTitle != SBRDF.getProperty("title", this.res) || newComment != SBRDF.getProperty("comment", this.res) )
		{
			SBRDF.updateItem(this.res, "title",   newTitle);
			SBRDF.updateItem(this.res, "comment", newComment);
			this.disableTemporary(500);
		}
	},

	disableTemporary : function(msec)
	{
		setTimeout(function() { SBeditor.disable(true);  }, 0);
		setTimeout(function() { SBeditor.disable(false); }, msec);
	},

	disable : function(aBool)
	{
		var editorXULs = document.getElementById("ScrapBookEditor").childNodes;
		for ( var i = 0; i < editorXULs.length; i++ ) editorXULs[i].disabled = aBool;
		SBcommentML.disabled = aBool;
	}

};



var SBinline = {

	selection  : null,
	targetSpan : null,

	init : function(target)
	{
		if ( !target ) this.selection = SB_getSelection();
		if ( !target && !this.selection ) return;
		this.targetSpan = target ? target : null;
		if ( SBeditor.comment ) SBcommentML.hidden = true;
		document.getElementById("ScrapBookEditor").hidden = true;
		document.getElementById("ScrapBookInline").hidden = false;
		document.getElementById("ScrapBookResult").hidden = false;
		SBcommentIL.value = target ? target.getAttribute("title") : "";
		SBcommentIL.select();
		var label = target ? target.innerHTML : this.selection.toString();
		label = label.length > 72 ? label.substring(0,72) + "..." : label;
		document.getElementById("ScrapBookResult").firstChild.value = "Edit inline comment for '" + label + "'";
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
		this.exit();
	},

	exit : function()
	{
		if ( SBeditor.comment ) SBcommentML.hidden = false;
		document.getElementById("ScrapBookEditor").hidden = false;
		document.getElementById("ScrapBookInline").hidden = true;
		document.getElementById("ScrapBookResult").hidden = true;
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
		var targetElement = aEvent.originalTarget;
		if ( targetElement.localName.toUpperCase() != "SPAN" ) return;
		if ( targetElement.getAttribute("class") != "scrapbook-inline-comment" ) return;
		SBinline.init(targetElement);
	},

};


var SBhtmlDoc = {

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

	add : function(aID, aContent)
	{
		var newStyleNode = document.createElementNS(NS_XHTML, "style");
		newStyleNode.setAttribute("media", "screen");
		newStyleNode.setAttribute("type", "text/css");
		newStyleNode.setAttribute("id", aID);
		newStyleNode.appendChild(document.createTextNode(aContent));
		var headNode = gDocument.getElementsByTagName("head")[0];
		headNode.appendChild(newStyleNode);
	},

	remove : function(aID)
	{
		try {
			SBhtmlDoc.removeNodeFromParent(gDocument.getElementById(aID));
		} catch(ex) {
		}
	},

	removeAll : function()
	{
		var styleNodes = gDocument.getElementsByTagName("style");
		for ( var i = styleNodes.length - 1; i >= 0 ; i-- )
		{
			if ( styleNodes[i].id.substring(0,10) == "scrapbook-" ) SBhtmlDoc.removeNodeFromParent(styleNodes[i]);
		}
	},

};


