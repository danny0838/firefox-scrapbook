/**************************************************
// property.js
// Implementation file for property.xul
// 
// Description: JavaScript for property.xul
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBstring;

var gID;
var gRes;
var gSBitem;



function SB_initProp()
{
	SBstring = document.getElementById("ScrapBookString");

	try {
		gID = window.arguments[0];
	} catch(err) {
		document.location.href.match(/\?id\=(.*)$/);
		gID = RegExp.$1;
	}
	if ( !gID ) return;

	SBRDF.init();
	gSBitem = new ScrapBookItem(gID);
	gRes = SBservice.RDF.GetResource("urn:scrapbook:item" + gID);
	gSBitem.type    = SBRDF.getProperty("type", gRes);
	gSBitem.title   = SBRDF.getProperty("title", gRes);
	gSBitem.chars   = SBRDF.getProperty("chars", gRes);
	gSBitem.icon    = SBRDF.getProperty("icon", gRes);
	gSBitem.source  = SBRDF.getProperty("source", gRes);
	gSBitem.comment = SBRDF.getProperty("comment", gRes);

	gID.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
	try {
		const SDF = Components.classes['@mozilla.org/intl/scriptabledateformat;1'].getService(Components.interfaces.nsIScriptableDateFormat);
		var myDateTime = SDF.FormatDateTime("", SDF.dateFormatLong, SDF.timeFormatSeconds, RegExp.$1, RegExp.$2, RegExp.$3, RegExp.$4, RegExp.$5, RegExp.$6);
	} catch(ex) {
		var myDateTime = [RegExp.$1, RegExp.$2, RegExp.$3].join("/") + " " + [RegExp.$4, RegExp.$5, RegExp.$6].join(":");
	}

	document.getElementById("ScrapBookPropTitle").value   = gSBitem.title;
	document.getElementById("ScrapBookPropSource").value  = gSBitem.source;
	document.getElementById("ScrapBookPropDate").value    = myDateTime;
	document.getElementById("ScrapBookPropChars").value   = gSBitem.chars;
	document.getElementById("ScrapBookPropIcon").src      = gSBitem.icon ? gSBitem.icon : SBcommon.getDefaultIcon(gSBitem.type);
	document.getElementById("ScrapBookPropComment").value = gSBitem.comment.replace(/ __BR__ /g, "\n");

	if ( gSBitem.type == "folder" || gSBitem.type == "note" )
	{
		document.getElementById("ScrapBookPropTitleButton").setAttribute("hidden", true);
		document.getElementById("ScrapBookPropSourceRow").setAttribute("hidden", true);
	}
	if ( gSBitem.type == "folder" )
	{
		document.getElementById("ScrapBookPropIconRow").setAttribute("hidden", true);
		document.getElementById("ScrapBookPropCharsRow").setAttribute("hidden", true);
		document.getElementById("ScrapBookPropSizeRow").setAttribute("hidden", true);
	}
	else if ( gSBitem.type == "note" )
	{
		document.getElementById("ScrapBookPropTitle").setAttribute("readonly", true);
	}
	SB_changeCommentTab(gSBitem.comment);

	setTimeout(SB_showFileSize, 0);
}


function SB_showFileSize()
{
	var mySizeText = ( gSBitem.type == "folder" ) ? "" : SB_formatFileSize( SB_getTotalFileSize(gID) );
	document.getElementById("ScrapBookPropSize").value = mySizeText;
}


function SB_acceptProp()
{
	SBRDF.updateItem(gRes, "title",   document.getElementById("ScrapBookPropTitle").value);
	SBRDF.updateItem(gRes, "comment", document.getElementById("ScrapBookPropComment").value.replace(/\r|\n/g, " __BR__ "));
	SBRDF.updateItem(gRes, "icon",    SB_getIconURL());
	if ( window.arguments[1] ) window.arguments[1].accept = true;
}


function SB_cancelProp()
{
	if ( window.arguments[1] ) window.arguments[1].accept = false;
}



function SB_getTitle()
{
	document.getElementById("ScrapBookPropTitle").value = SB_getHtmlTitle(gID, gSBitem.chars);
}


function SB_changeIcon()
{
	var newIcon = window.prompt( SBstring.getString("PROMPT_NEW_ICON_1"), SB_getIconURL(), SBstring.getString("PROMPT_NEW_ICON_2") );
	if ( newIcon == null ) return;
	if ( !newIcon ) newIcon = SBcommon.getDefaultIcon(gSBitem.type);
	document.getElementById("ScrapBookPropIcon").src = newIcon;
}


function SB_getIconURL()
{
	var iconURL = document.getElementById("ScrapBookPropIcon").src;
	return ( iconURL.substring(0,24) == "chrome://scrapbook/skin/" ) ? "" : iconURL;
}


function SB_changeCommentTab(comment)
{
	var commentTab = document.getElementById("ScrapBookPropCommentTab");
	if ( comment ) {
		commentTab.setAttribute("image", "chrome://scrapbook/skin/edit_comment.png");
	} else {
		commentTab.removeAttribute("image");
	}
}



function SB_getHtmlTitle(aID, aChars)
{
	var myFile  = SBcommon.getContentDir(aID);
	myFile.append("index.html");
	var myContent = SBcommon.readFile(myFile);
	try {
		SBservice.UC.charset = aChars;
		myContent = SBservice.UC.ConvertToUnicode(myContent);
		var isMatch = myContent.match(/<title>([^<]+?)<\/title>/im);
		if ( isMatch ) return RegExp.$1;
	} catch(err) {
		return "";
	}
}


function SB_getTotalFileSize(aID)
{
	var totalSize = 0;
	var totalFile = 0;
	var aDir = SBcommon.getContentDir(aID);
	var aFileList = aDir.directoryEntries;
	while ( aFileList.hasMoreElements() )
	{
		var aFile = aFileList.getNext().QueryInterface(Components.interfaces.nsIFile);
		totalSize += aFile.fileSize;
		totalFile++;
	}
	return [totalSize, totalFile];
}


function SB_formatFileSize(aSizeAndCount)
{
	var aSize  = aSizeAndCount[0];
	var aCount = aSizeAndCount[1];
	var sCount = aCount ? "  (" + aCount + " Files)" : "";
	var ret;
	if ( aSize > 1000 * 1000 ) {
		return SB_divideBy100( Math.round( aSize / 1024 / 1024 * 100 ) ) + " MB" + sCount;
	} else {
		return Math.round( aSize / 1024 ) + " KB" + sCount;
	}
}


function SB_divideBy100(aInt)
{
	if ( aInt % 100 == 0 ) {
		return aInt / 100 + ".00";
	} else if ( aInt % 10 == 0 ) {
		return aInt / 100 + "0";
	} else {
		return aInt / 100;
	}
}


