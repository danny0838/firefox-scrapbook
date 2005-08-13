/**************************************************
// overlay.js
// Implementation file for overlay.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/


var sbBrowserOverlay = {

	lastLocation : "",
	prefShowHeader : false,
	prefShowEditor : false,

	init : function()
	{
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", sbBrowserOverlay.onContextMenuShowing, true);
		if ( SBcommon.getBoolPref("scrapbook.browser.submenu", false) )
		{
			document.getElementById("ScrapBookContextSubmenu").hidden = false;
			for ( var i = 1; i <= 8; i++ )
			{
				document.getElementById("ScrapBookContextSubmenu").firstChild.appendChild(document.getElementById("ScrapBookContextMenu" + i));
			}
		}
		this.refresh();
		gBrowser.mTabBox.addEventListener("select", function(){ sbBrowserOverlay.onLocationChange(); }, false);
	},

	refresh : function()
	{
		this.lastLocation = "";
		this.prefShowHeader = SBcommon.getBoolPref("scrapbook.view.header", false);
		this.prefShowEditor = SBcommon.getBoolPref("scrapbook.view.editor", false);
		SBRDF.init();
	},

	onContextMenuShowing : function()
	{
		document.getElementById("ScrapBookContextMenu1").hidden = !gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu2").hidden = !gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu3").hidden = gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu4").hidden = gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu5").hidden = (!gContextMenu.inFrame || gContextMenu.isTextSelected);
		document.getElementById("ScrapBookContextMenu6").hidden = (!gContextMenu.inFrame || gContextMenu.isTextSelected);
		document.getElementById("ScrapBookContextMenu7").hidden = (!gContextMenu.onLink || gContextMenu.onMailtoLink);
		document.getElementById("ScrapBookContextMenu8").hidden = (!gContextMenu.onLink || gContextMenu.onMailtoLink);
	},

	getID : function()
	{
		var curURL = window._content.location.href;
		var isEditable = ( curURL.match(/^file/) && curURL.match(/\/data\/(\d{14})\/index\.html/) );
		return isEditable ? RegExp.$1 : null;
	},

	onLocationChange : function()
	{
		var curURL = window._content.location.href;
		if ( curURL == this.lastLocation ) return;
		var id = this.getID();
		document.getElementById("ScrapBookStatusPanel").src    = id ? "chrome://scrapbook/skin/status_edit.png" : "";
		document.getElementById("ScrapBookStatusPanel").hidden = id ? false : true;
		if ( id )
		{
			if ( this.prefShowHeader ) sbEditor.showHeader();
			if ( this.prefShowEditor )
				setTimeout(function(){ sbEditor.init(); }, 0);
			else
				document.getElementById("ScrapBookEditorBox").hidden = true;
		}
		else
		{
			document.getElementById("ScrapBookEditorBox").hidden = true;
		}
		this.lastLocation = curURL;
	},

	toggleEditor : function()
	{
		if ( !this.getID() ) return;
		if ( document.getElementById("ScrapBookEditorBox").hidden )
			sbEditor.init();
		else
			sbEditor.exit();
	},

	captureWindow : function(frameOnly, selectionOnly, showDetail)
	{
		var targetWindow = frameOnly ? SBcommon.getFocusedWindow() : window._content;
		SBcapture.doCaptureDocument(targetWindow, selectionOnly, showDetail, "urn:scrapbook:root", 0);
	},

	captureTarget : function(showDetail)
	{
		var linkURL = gContextMenu.linkURL();
		if ( !linkURL ) return;
		window.openDialog(
			"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[linkURL], document.popupNode.ownerDocument.location.href, showDetail, false, "urn:scrapbook:root", 0, false
		);
	},

};


window.addEventListener("load", function(){ sbBrowserOverlay.init(); }, false);


window.addEventListener("load", function(){ sbBrowserOverlay.onLocationChange(); }, true);



