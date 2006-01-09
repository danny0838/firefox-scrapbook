
const SB_VERSION = "0.18.4";
const SB_BUILDID = "Build ID 20051218";
const UPDATE_URL = "http://amb.vis.ne.jp/mozilla/scrapbook/update.rdf?ver=" + SB_VERSION;

var SBstring;
var SBupdateImage;
var SBupdateLabel;



function SB_initAbout()
{
	SBstring = document.getElementById("ScrapBookString");
	var SBversion = document.getElementById("ScrapBookAboutVersion");
	SBversion.setAttribute("value", "Version " + SB_VERSION + " (" + SB_BUILDID + ")");
	SBupdateImage = document.getElementById("ScrapBookUpdateImage");
	SBupdateLabel = document.getElementById("ScrapBookUpdateLabel");
	SBupdateImage.setAttribute("src", "chrome://scrapbook/skin/status_busy.gif");
	SBupdateLabel.setAttribute("value", SBstring.getString("CHECKING"));
	setTimeout(SB_setUpdateInfo, 500);
}


function SB_visit(aXUL)
{
	sbCommonUtils.loadURL(aXUL.getAttribute("href"), true);
}


function SB_mailto(aXUL)
{
	sbCommonUtils.loadURL('mailto:' + aXUL.getAttribute('href'), false);
}


function SB_secret()
{
	window.opener.SBstatus.httpBusy(5, "32% : product-mozilla-screen");
	window.opener.top.document.getElementById("sidebar-box").width = 190;
	setTimeout(function() { window.opener.top.document.getElementById("statusbar-display").label = "Transferring data from www.mozilla.org..."; }, 0);
}


function SB_setUpdateInfo()
{
	var httpReq = new XMLHttpRequest();
	httpReq.parent = this;
	httpReq.open("GET", UPDATE_URL);

	httpReq.onerror = function(aEvent)
	{
		SBupdateLabel.setAttribute("value", SBstring.getString("CHECK_FAILURE"));
		SB_removeUpdateImage();
	};
	httpReq.onload = function(aEvent)
	{
		try {
			var LATEST_VER = httpReq.responseXML.getElementsByTagNameNS("http://www.mozilla.org/2004/em-rdf#", "version")[0].textContent;
			var CV = SB_parseVersion(SB_VERSION);
			var LV = SB_parseVersion(LATEST_VER);
			if ( CV > 0 && LV > 0 && LV > CV ) {
				SBupdateLabel.setAttribute("value", SBstring.getFormattedString("NEW_VERSION_AVAILABLE", [LATEST_VER]));
				SBupdateLabel.setAttribute("class", "link");
				SBupdateLabel.setAttribute("style", "font-weight:bold;");
			} else {
				SBupdateLabel.setAttribute("value", SBstring.getString("NO_UPDATES_FOUND"));
			}
		}
		catch(ex)
		{
			SBupdateLabel.setAttribute("value", SBstring.getString("CHECK_FAILURE"));
		}
		SB_removeUpdateImage();
	};

	try {
		httpReq.setRequestHeader("User-Agent", "Scrapbook Ver." + SB_VERSION);
		httpReq.overrideMimeType("application/xml");
		httpReq.send(null);
	} catch(err) {
		httpReq.abort();
		SBupdateLabel.setAttribute("value", SBstring.getString("CHECK_FAILURE"));
		SB_removeUpdateImage();
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


function SB_removeUpdateImage()
{
	SBupdateImage.removeAttribute("src");
	SBupdateImage.removeAttribute("style");
}


