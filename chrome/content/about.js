/**************************************************
// about.js
// Implementation file for about.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



const CURRENT_VER = "0.12.0";
const CURRENT_BID = "Build ID 20041214";
const UPDATE_URL  = "http://amb.vis.ne.jp/mozilla/scrapbook/update.rdf?ver=" + CURRENT_VER;

var SBupdateImage;
var SBupdateLabel;



function SB_initAbout()
{
	var SBversion = document.getElementById("ScrapBookAboutVersion");
	SBversion.setAttribute("value", "Version " + CURRENT_VER + " (" + CURRENT_BID + ")");

	SBupdateImage = document.getElementById("ScrapBookUpdateImage");
	SBupdateLabel = document.getElementById("ScrapBookUpdateLabel");
	SBupdateImage.setAttribute("src", "chrome://scrapbook/skin/status_busy.gif");
	SBupdateLabel.setAttribute("value", "Now checking for updates...");
	setTimeout(SB_setUpdateInfo, 500);
}


function SB_setUpdateInfo()
{
	var httpReq = new XMLHttpRequest();
	httpReq.parent = this;
	httpReq.open("GET", UPDATE_URL);

	httpReq.onerror = function(aEvent)
	{
		SBupdateLabel.setAttribute("value", "Failed to check for updates (could not connet)");
		SBupdateImage.removeAttribute("src");
	};
	httpReq.onload = function(aEvent)
	{
		try {
			var LATEST_VER = httpReq.responseXML.getElementsByTagNameNS("http://www.mozilla.org/2004/em-rdf#", "version")[0].textContent;
			var CV = SB_parseVersion(CURRENT_VER);
			var LV = SB_parseVersion(LATEST_VER);
			if ( CV > 0 && LV > 0 && LV > CV ) {
				SBupdateLabel.setAttribute("value", "New Version " + LATEST_VER + " is Now Available.");
				SBupdateLabel.setAttribute("class", "link");
				SBupdateLabel.setAttribute("style", "font-weight:bold;");
			} else {
				SBupdateLabel.setAttribute("value", "No Updates Found.");
			}
		}
		catch(err)
		{
			SBupdateLabel.setAttribute("value", "Failed to check for updates (could not parse XML)");
		}
		SBupdateImage.removeAttribute("src");
	};

	try {
		httpReq.setRequestHeader("User-Agent", "ScrapBook Ver." + CURRENT_VER);
		httpReq.overrideMimeType("application/xml");
		httpReq.send(null);
	} catch(err) {
		httpReq.abort();
		SBupdateLabel.setAttribute("value", "Failed to check for updates (could not connet)");
		SBupdateImage.removeAttribute("src");
	}
}


function SB_parseVersion(verStr)
{
	var verArr = [];
	if ( verStr.match(/^(\d+)\.(\d+)\.(\d+)$/) ) {
		verArr[0] = parseInt(RegExp.$1); verArr[1] = parseInt(RegExp.$2); verArr[2] = parseInt(RegExp.$3);
		return verArr[0] * 10000 + verArr[1] * 100 + verArr[2];
	} else {
		return 0;
	}
}


