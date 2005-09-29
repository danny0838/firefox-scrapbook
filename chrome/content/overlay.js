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
	syncWithMe : null,
	editMode : false,
	infoMode : false,

	init : function()
	{
		dump("sbBrowserOverlay::init\n");
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", function(){ sbBrowserOverlay.onContextMenuShowing(); }, true);
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
		dump("sbBrowserOverlay::refresh\n");
		this.lastLocation = "";
		this.editMode = SBcommon.getBoolPref("scrapbook.view.editor",  true);
		this.infoMode = SBcommon.getBoolPref("scrapbook.view.infobar", false);
		sbDataSource.init(true);
		sbDataSource.backup();
	},

	onContextMenuShowing : function()
	{
		try {
			document.getElementById("ScrapBookContextMenu1").hidden = !window.gContextMenu.isTextSelected;
			document.getElementById("ScrapBookContextMenu2").hidden = !window.gContextMenu.isTextSelected;
			document.getElementById("ScrapBookContextMenu3").hidden =  window.gContextMenu.isTextSelected;
			document.getElementById("ScrapBookContextMenu4").hidden =  window.gContextMenu.isTextSelected;
			document.getElementById("ScrapBookContextMenu5").hidden = (!window.gContextMenu.inFrame || window.gContextMenu.isTextSelected);
			document.getElementById("ScrapBookContextMenu6").hidden = (!window.gContextMenu.inFrame || window.gContextMenu.isTextSelected);
			document.getElementById("ScrapBookContextMenu7").hidden = (!window.gContextMenu.onLink  || window.gContextMenu.onMailtoLink);
			document.getElementById("ScrapBookContextMenu8").hidden = (!window.gContextMenu.onLink  || window.gContextMenu.onMailtoLink);
		} catch(ex) {
			alert("ScrapBook ERROR: gContextMenu is not defined.\nlocation: " + window.location.href + "\nthis: " + this + "\nexception: " + ex);
		}
	},

	getID : function()
	{
		var curURL = window._content.location.href;
		var isEditable = ( curURL.indexOf("file") == 0 && curURL.match(/\/data\/(\d{14})\//) );
		return isEditable ? RegExp.$1 : null;
	},

	onLocationChange : function()
	{
		var curURL = window._content.location.href;
		if ( curURL == this.lastLocation ) return;
		var id = this.getID();
		document.getElementById("ScrapBookToolbox").hidden         = id ? false : true;
		document.getElementById("ScrapBookEditStatusPanel").hidden = id ? false : true;
		document.getElementById("ScrapBookInfoStatusPanel").hidden = id ? false : true;
		if ( id )
		{
			if ( this.editMode )
				setTimeout(function(){ sbPageEditor.init(); }, 0);
			else
				sbPageEditor.showHide(false);
			if ( this.infoMode )
				setTimeout(function(){ sbInfoViewer.init(); }, 50);
			else
				document.getElementById("ScrapBookInfobar").hidden = true;
		}
		this.syncWithMe = null;
		this.lastLocation = curURL;
	},

	execCapture : function(frameOnly, selectionOnly, showDetail)
	{
		var targetWindow = frameOnly ? SBcommon.getFocusedWindow() : window._content;
		sbContentSaver.captureWindow(targetWindow, selectionOnly, showDetail, "urn:scrapbook:root", 0, null);
	},

	execCaptureTarget : function(showDetail)
	{
		var linkURL;
		try {
			linkURL = gContextMenu.linkURL();
		} catch(ex) {
			linkURL = gContextMenu.getLinkURL();
		}
		if ( !linkURL ) return;
		window.openDialog(
			"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[linkURL], document.popupNode.ownerDocument.location.href, showDetail, "urn:scrapbook:root", 0, null, null, null
		);
	},

	synchronize : function(aResource)
	{
		if ( !sbDataSource.exists(aResource) ) { sbPageEditor.disable(true); return; }
		if ( document.getElementById("viewScrapBookSidebar").getAttribute("checked") )
		{
			document.getElementById("sidebar").contentWindow.SB_synchronize(aResource);
		}
		else
		{
			this.syncWithMe = aResource;
			toggleSidebar("viewScrapBookSidebar");
		}
	},

};


window.addEventListener("load", function(){ sbBrowserOverlay.init(); }, false);


window.addEventListener("load", function(){ sbBrowserOverlay.onLocationChange(); }, true);



