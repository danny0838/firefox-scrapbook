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



function SBcapture_branchContextMenu()
{
	document.getElementById("ScrapBookContextMenu1").hidden = !gContextMenu.isTextSelected;
	document.getElementById("ScrapBookContextMenu2").hidden = !gContextMenu.isTextSelected;
	document.getElementById("ScrapBookContextMenu3").hidden = gContextMenu.isTextSelected;
	document.getElementById("ScrapBookContextMenu4").hidden = gContextMenu.isTextSelected;
	document.getElementById("ScrapBookContextMenu5").hidden = (!gContextMenu.inFrame || gContextMenu.isTextSelected);
	document.getElementById("ScrapBookContextMenu6").hidden = (!gContextMenu.inFrame || gContextMenu.isTextSelected);
	document.getElementById("ScrapBookContextMenu7").hidden = (!gContextMenu.onLink || gContextMenu.onMailtoLink);
	document.getElementById("ScrapBookContextMenu8").hidden = (!gContextMenu.onLink || gContextMenu.onMailtoLink);
}


function SBcapture_initContextMenu()
{
	document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", SBcapture_branchContextMenu, true);
	document.getElementById("contentAreaContextMenu").addEventListener("popupshowing",    SBcapture_branchContextMenu, true);
	if ( SBcommon.getBoolPref("scrapbook.browser.submenu", false) )
	{
		document.getElementById("ScrapBookContextSubmenu").hidden = false;
		for ( var i = 1; i <= 8; i++ )
		{
			document.getElementById("ScrapBookContextSubmenu").firstChild.appendChild(document.getElementById("ScrapBookContextMenu" + i));
		}
	}
}


window.removeEventListener("load", SBcapture_initContextMenu, true);
window.addEventListener("load",    SBcapture_initContextMenu, true);




var SB_lastFocusedURL = "";

function SB_initStatusbarPanel()
{
	try {
		var curURL = window._content.location.href;
	} catch(ex) {
		return;
	}
	if ( curURL != SB_lastFocusedURL )
	{
		var isEditable = ( curURL.match(/^file/) && curURL.match(/\/data\/\d{14}\/index\.html$/) );
		document.getElementById("ScrapBookStatusPanel").src    = isEditable ? "chrome://scrapbook/skin/status_edit.png" : "";
		document.getElementById("ScrapBookStatusPanel").hidden = !isEditable;
		SB_lastFocusedURL = curURL;
	}
}


window.removeEventListener("load" , SB_initStatusbarPanel, true);
window.removeEventListener("focus", SB_initStatusbarPanel, true);
window.addEventListener("load" , SB_initStatusbarPanel, true);
window.addEventListener("focus", SB_initStatusbarPanel, true);



function SBcommand_captureWindow(frameOnly, selectionOnly, showDetail)
{
	var targetWindow = frameOnly ? SBcommon.getFocusedWindow() : window._content;
	SBcapture.doCaptureDocument(targetWindow, selectionOnly, showDetail, "urn:scrapbook:root", 0);
}


function SBcommand_captureTarget(showDetail)
{
	var linkURL = gContextMenu.linkURL();
	if ( !linkURL ) return;
	window.openDialog(
		"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
		[linkURL], document.popupNode.ownerDocument.location.href, showDetail, false, "urn:scrapbook:root", 0
	);
}



function SB_enterEditingMode()
{
	var curURL = window._content.location.href;
	if ( curURL.match(/^file/) && curURL.match(/\/data\/(\d{14})\/index\.html$/) )
	{
		SBcommon.loadURL("chrome://scrapbook/content/edit.xul?id=" + RegExp.$1, false);
	}
}


