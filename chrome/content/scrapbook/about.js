
const kVERSION = "1.0.4";
const kBUILD_TEXT = " (Build ID 20060514)";
const kUPDATE_URL = "http://amb.vis.ne.jp/mozilla/scrapbook/update.rdf";

var gAboutString;
var gUpdateImage;
var gUpdateLabel;



function SB_initAbout()
{
	gAboutString = document.getElementById("sbAboutString");
	gUpdateImage = document.getElementById("sbUpdateImage");
	gUpdateLabel = document.getElementById("sbUpdateLabel");
	document.getElementById("sbAboutVersion").value = "Version " + kVERSION + kBUILD_TEXT;
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
			const VER_COMP = Components.classes['@mozilla.org/xpcom/version-comparator;1'].getService(Components.interfaces.nsIVersionComparator);
			if ( VER_COMP.compare(latestVer, kVERSION) > 0 ) {
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


function SB_removeUpdateImage()
{
	gUpdateImage.removeAttribute("src");
	gUpdateImage.removeAttribute("style");
}


