
var gCurrentHeight = 0;
var gFinalHeight = 50;
var gSlideIncrement = 1;
var gSlideTime = 10;
var gOpenTime = 3000;
var gID;



function onNotifierLoad()
{
	if ( window.arguments[0] )
	{
		gID       = window.arguments[0].id;
		var icon  = window.arguments[0].icon;
		var title = window.arguments[0].title;
		if ( !icon ) icon = sbCommonUtils.getDefaultIcon();
		if ( icon.indexOf("://") < 0 ) icon = "resource://scrapbook/data/" + gID + "/" + icon;
		document.getElementById("sbNotifierIcon").src   = icon;
		document.getElementById("sbNotifierText").value = sbCommonUtils.crop(title, 40);
	}
	else
	{
		document.getElementById("sbNotifierText").hidden  = true;
		document.getElementById("sbNotifierTextAll").hidden = false;
	}
	window.sizeToContent();
	if ( screen.availWidth > 0 && navigator.platform == "Win32" )
	{
		gFinalHeight = window.outerHeight;
		window.outerHeight = 0;
		window.moveTo( (screen.availLeft + screen.availWidth - window.outerWidth) - 10, screen.availTop + screen.availHeight - window.outerHeight);
		setTimeout(animateNotifier, gSlideTime);
	}
	else
	{
		window.moveTo(
			window.opener.screenX + window.opener.outerWidth - window.outerWidth,
			window.opener.screenY + window.opener.outerHeight - window.outerHeight
		);
		setTimeout(function(){ window.close(); }, gOpenTime * 2);
	}
}

function animateNotifier()
{
	if ( gCurrentHeight < gFinalHeight ) {
		gCurrentHeight += gSlideIncrement;
		window.screenY -= gSlideIncrement;
		window.outerHeight += gSlideIncrement;
		setTimeout(animateNotifier, gSlideTime);
	} else {
		setTimeout(closeNotifier, gOpenTime);
	}
}

function closeNotifier()
{
	if ( gCurrentHeight ) {
		gCurrentHeight -= gSlideIncrement;
		window.screenY += gSlideIncrement;
		window.outerHeight -= gSlideIncrement;
		setTimeout(closeNotifier, gSlideTime);
	} else {
		window.close();
	}
}

function onNotifierClick()
{
	sbCommonUtils.loadURL("chrome://scrapbook/content/view.xul?id=" + gID, true);
	window.close();
}


