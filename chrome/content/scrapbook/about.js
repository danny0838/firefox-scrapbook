
const kVERSION = "0.22.11";
const kBUILD_TEXT = "Final Beta Version (Build ID 20060308)";
const kUPDATE_URL = "http://amb.vis.ne.jp/mozilla/scrapbook/update.rdf";

var gAboutString;
var gUpdateImage;
var gUpdateLabel;



function SB_initAbout()
{
	gAboutString = document.getElementById("sbAboutString");
	gUpdateImage = document.getElementById("sbUpdateImage");
	gUpdateLabel = document.getElementById("sbUpdateLabel");
	document.getElementById("sbAboutVersion").value = kBUILD_TEXT;
	gUpdateImage.setAttribute("src", "chrome://scrapbook/skin/status_busy.gif");
	gUpdateLabel.setAttribute("value", gAboutString.getString("CHECKING"));
	setTimeout(SB_setUpdateInfo, 500);
}


function SB_visit(aElem)
{
	var href = aElem.getAttribute("href");
	if ( href.indexOf("@") > 0 )
		sbCommonUtils.loadURL("mailto:" + href, false);
	else
		sbCommonUtils.loadURL(href, true);
	window.close();
}


function SB_secret()
{
	window.opener.sbStatusHandler.httpBusy(5, "32% : product-mozilla-screen");
	window.opener.top.document.getElementById("sidebar-box").width = window.opener.top.outerWidth < 800 ? 190 : 200;
	setTimeout(function() { window.opener.top.document.getElementById("statusbar-display").label = "Transferring data from www.mozilla.org..."; }, 0);
}


function SB_setUpdateInfo()
{
	var httpReq = new XMLHttpRequest();
	httpReq.parent = this;
	httpReq.open("GET", kUPDATE_URL + "?ver=" + kVERSION);

	httpReq.onerror = function(aEvent)
	{
		gUpdateLabel.setAttribute("value", gAboutString.getString("CHECK_FAILURE"));
		SB_removeUpdateImage();
	};
	httpReq.onload = function(aEvent)
	{
		try {
			var latestVer = httpReq.responseXML.getElementsByTagNameNS("http://www.mozilla.org/2004/em-rdf#", "version")[0].textContent;
			var cv = SB_parseVersion(kVERSION);
			var lv = SB_parseVersion(latestVer);
			if ( cv > 0 && lv > 0 && lv > cv ) {
				gUpdateLabel.setAttribute("value", gAboutString.getFormattedString("NEW_VERSION_AVAILABLE", [latestVer]));
				gUpdateLabel.setAttribute("class", "link");
				gUpdateLabel.setAttribute("style", "font-weight:bold;");
			} else {
				gUpdateLabel.setAttribute("value", gAboutString.getString("NO_UPDATES_FOUND"));
			}
		} catch(ex) {
			gUpdateLabel.setAttribute("value", gAboutString.getString("CHECK_FAILURE"));
		}
		SB_removeUpdateImage();
	};

	try {
		httpReq.setRequestHeader("User-Agent", "ScrapBook/" + kVERSION);
		httpReq.overrideMimeType("application/xml");
		httpReq.send(null);
	} catch(ex) {
		httpReq.abort();
		gUpdateLabel.setAttribute("value", gAboutString.getString("CHECK_FAILURE"));
		SB_removeUpdateImage();
	}
}


function SB_parseVersion(aVerStr)
{
	var verArr = [];
	if ( aVerStr.match(/^(\d+)\.(\d+)\.(\d+)$/) ) {
		verArr[0] = parseInt(RegExp.$1); verArr[1] = parseInt(RegExp.$2); verArr[2] = parseInt(RegExp.$3);
		return verArr[0] * 10000 + verArr[1] * 100 + verArr[2];
	} else {
		return 0;
	}
}


function SB_removeUpdateImage()
{
	gUpdateImage.removeAttribute("src");
	gUpdateImage.removeAttribute("style");
}


