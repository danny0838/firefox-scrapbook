
const kVERSION = "1.2.0.5";
const kBUILD_TEXT = " (Build ID 20060922)";
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
	gUpdateImage.src = "chrome://scrapbook/skin/status_busy.gif";
	try {
		gUpdateLabel.value = gAboutString.getFormattedString("updatingMessage", ["ScrapBook"]);
	} catch(ex) {
		gUpdateLabel.value = gAboutString.getString("updatingMsg");
	}
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
	window.opener.top.document.getElementById("sidebar-box").width = window.opener.top.outerWidth < 800 ? 190 : 200;
	setTimeout(function() { window.opener.top.document.getElementById("statusbar-display").label = "Transferring data from www.mozilla.org..."; }, 0);
}


function SB_setUpdateInfo()
{
	var req = new XMLHttpRequest();
	req.open("GET", kUPDATE_URL + "?ver=" + kVERSION);
	req.onload = function(aEvent)
	{
		try {
			var latestVer = req.responseXML.getElementsByTagNameNS("http://www.mozilla.org/2004/em-rdf#", "version")[0].textContent;
			const VER_COMP = Components.classes['@mozilla.org/xpcom/version-comparator;1'].getService(Components.interfaces.nsIVersionComparator);
			if ( VER_COMP.compare(latestVer, kVERSION) > 0 ) {
				try {
					gUpdateLabel.value = gAboutString.getFormattedString("updateAvailableMessage", [latestVer, kVERSION]);
				} catch(ex) {
					gUpdateLabel.value = gAboutString.getFormattedString("updateAvailableMsg", [latestVer]);
				}
				gUpdateLabel.className = "link";
				gUpdateLabel.style.fontWeight = "bold";
				gUpdateLabel.onclick = function(){ sbCommonUtils.loadURL("http://amb.vis.ne.jp/mozilla/scrapbook/"); window.close(); };
			} else {
				try {
					gUpdateLabel.setAttribute("value", gAboutString.getFormattedString("updateNoUpdateMessage", ["ScrapBook"]));
				} catch(ex) {
					gUpdateLabel.setAttribute("value", gAboutString.getString("updateNoUpdateMsg"));
				}
			}
		} catch(ex) {
			SB_onUpdateError();
		}
		gUpdateImage.src = "";
	};
	try {
		req.setRequestHeader("User-Agent", "ScrapBook/" + kVERSION);
		req.overrideMimeType("application/xml");
		req.send(null);
	} catch(ex) {
		req.abort();
		SB_onUpdateError();
	}
}


function SB_onUpdateError()
{
	gUpdateLabel.value = gAboutString.getString("updateErrorMessage");
	gUpdateImage.src = "";
}


