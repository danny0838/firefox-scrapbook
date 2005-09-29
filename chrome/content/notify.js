/**************************************************
// notify.js
// Implementation file for notify.xul
// 
// Original Code: mozilla.org code
// Initial Developer: Netscape Communications Corporation
// Contributors: Scott MacGregor <mscott@netscape.com>
// 
// Version: 
// License: NPL 1.1/GPL 2.0/LGPL 2.1
**************************************************/



var gCurrentHeight = 0;
var gFinalHeight = 50;
var gSlideIncrement = 1;
var gSlideTime = 10;
var gOpenTime = 3000;
var gID;



function SB_onNotifyLoad()
{
	if ( window.arguments[0] )
	{
		gID       = window.arguments[0].id;
		var icon  = window.arguments[0].icon;
		var title = window.arguments[0].title;
		if ( !icon ) icon = SBcommon.getDefaultIcon();
		if ( !icon.match(/:\/\//) ) icon = SBservice.IO.newFileURI(SBcommon.getContentDir(gID)).spec + icon;
		if ( title.length > 40 ) title = title.substring(0,40) + "...";
		document.getElementById("ScrapBookNotifyIcon").src   = icon;
		document.getElementById("ScrapBookNotifyText").value = title;
	}
	else
	{
		document.getElementById("ScrapBookNotifyText").hidden  = true;
		document.getElementById("ScrapBookNotifyTextA").hidden = false;
	}
	window.sizeToContent();
	if ( screen.availWidth > 0 )
	{
		gFinalHeight = window.outerHeight;
		window.outerHeight = 0;
		window.moveTo( (screen.availLeft + screen.availWidth - window.outerWidth) - 10, screen.availTop + screen.availHeight - window.outerHeight);
		setTimeout(animateNotify, gSlideTime);
	}
	else
	{
		window.moveTo(0,0);
		setTimeout(function(){ window.close(); }, gOpenTime);
	}
}

function animateNotify()
{
	if ( gCurrentHeight < gFinalHeight ) {
		gCurrentHeight += gSlideIncrement;
		window.screenY -= gSlideIncrement;
		window.outerHeight += gSlideIncrement;
		setTimeout(animateNotify, gSlideTime);
	} else {
		setTimeout(closeNotify, gOpenTime);
	}
}

function closeNotify()
{
	if ( gCurrentHeight ) {
		gCurrentHeight -= gSlideIncrement;
		window.screenY += gSlideIncrement;
		window.outerHeight -= gSlideIncrement;
		setTimeout(closeNotify, gSlideTime);
	} else {
		window.close();
	}
}

function SB_onNotifyClick()
{
	SBcommon.loadURL("chrome://scrapbook/content/view.xul?id=" + gID, true);
	window.close();
}


