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
var gTypeFolder = false;
var gTypeNote   = false;
var gTypeFile   = false;



function SB_initProp()
{
	SBstring = document.getElementById("ScrapBookString");

	try {
		gID = window.arguments[0];
	} catch(ex) {
		document.location.href.match(/\?id\=(.*)$/);
		gID = RegExp.$1;
	}
	if ( !gID ) return;

	SBRDF.init();
	gSBitem = new ScrapBookItem();
	gRes = SBservice.RDF.GetResource("urn:scrapbook:item" + gID);
	for ( var prop in gSBitem )
	{
		gSBitem[prop] = SBRDF.getProperty(prop, gRes);
	}

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
	document.getElementById("ScrapBookPropComment").value = gSBitem.comment.replace(/ __BR__ /g, "\n");
	document.getElementById("ScrapBookPropIcon").src      = gSBitem.icon ? gSBitem.icon : SBcommon.getDefaultIcon(gSBitem.type);
	document.getElementById("ScrapBookPropIcon").setAttribute("tooltiptext", gSBitem.icon);
	document.getElementById("ScrapBookPropMark").setAttribute("checked", gSBitem.type == "marked");
	document.getElementById("ScrapBookPropertyDialog").setAttribute("title", gSBitem.title);
	document.title = gSBitem.title;

	if ( SBservice.RDFCU.IsContainer(SBRDF.data, gRes) ) gSBitem.type = "folder";

	switch ( gSBitem.type )
	{
		case "folder" :	
			gTypeFolder = true;
			document.getElementById("ScrapBookPropIconRow").setAttribute("hidden", true);
			document.getElementById("ScrapBookPropSizeRow").setAttribute("hidden", true);
			break;
		case "file" : 
		case "image" : 
			gTypeFile = true;
			break;
		case "note" : 
			gTypeNote = true;
			document.getElementById("ScrapBookPropTitle").removeAttribute("editable");
			break;
	}
	document.getElementById("ScrapBookPropSourceRow").setAttribute("hidden", gTypeFolder || gTypeNote);
	document.getElementById("ScrapBookPropCharsRow").setAttribute("hidden",  gTypeFolder || gTypeFile);
	document.getElementById("ScrapBookPropIconMenu").setAttribute("hidden",  gTypeNote   || gTypeFile);
	document.getElementById("ScrapBookPropMark").setAttribute("hidden", gTypeFolder || gTypeNote || gTypeFile);

	SB_changeCommentTab(gSBitem.comment);

	setTimeout(SB_showFileSize, 0);
}


function SB_showFileSize()
{
	var mySizeText = ( gSBitem.type == "folder" ) ? "" : SB_formatFileSize( SB_getTotalFileSize(gID), "FILES_COUNT" );
	document.getElementById("ScrapBookPropSize").value = mySizeText;
}


function SB_acceptProp()
{
	var newVals = {
		title   : document.getElementById("ScrapBookPropTitle").value,
		source  : document.getElementById("ScrapBookPropSource").value,
		comment : document.getElementById("ScrapBookPropComment").value.replace(/\r|\n/g, " __BR__ "),
		type    : gSBitem.type,
		icon    : SB_getIconURL()
	};
	if ( !document.getElementById("ScrapBookPropMark").hidden )
	{
		newVals.type = document.getElementById("ScrapBookPropMark").checked ? "marked" : "";
	}
	var change = false;
	var props = ["title","source","comment","type","icon"];
	for ( var i = 0; i < props.length; i++ )
	{
		if ( gSBitem[props[i]] != newVals[props[i]] ) { gSBitem[props[i]] = newVals[props[i]]; change = true; }
	}
	if ( change )
	{
		for ( var prop in gSBitem ) 
		{
			SBRDF.updateItem(gRes, prop, gSBitem[prop]);
		}
		if ( !gTypeFolder ) SBcommon.writeIndexDat(gSBitem);
		SBRDF.flush();
	}
	if ( window.arguments[1] ) window.arguments[1].accept = true;
}


function SB_cancelProp()
{
	if ( window.arguments[1] ) window.arguments[1].accept = false;
}



function SB_fillHTMLTitle(popupXUL)
{
	if ( gTypeFolder || gTypeNote || gTypeFile ) return;
	if ( !popupXUL.hasChildNodes() ) popupXUL.parentNode.appendItem( SB_getHTMLTitle(gID, gSBitem.chars) );
}


function SB_setDefaultIcon()
{
	document.getElementById("ScrapBookPropIcon").src = SBcommon.getDefaultIcon(gSBitem.type);
}


function SB_enterIconURL()
{
	const PS = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
	var ret = { value : SB_getIconURL() };
	PS.prompt(window, SBstring.getString("ENTER_ICON_URL"), SBstring.getString("ENTER_ICON_URL"), ret, null, {});
	var newIcon = ret.value;
	if ( newIcon == null ) return;
	if ( !newIcon ) newIcon = SBcommon.getDefaultIcon(gSBitem.type);
	document.getElementById("ScrapBookPropIcon").src = newIcon;
}


function SB_getIconURL()
{
	var iconURL = document.getElementById("ScrapBookPropIcon").src;
	return ( iconURL.substring(0,24) == "chrome://scrapbook/skin/" ) ? "" : iconURL;
}


function SB_pickupIcon(flag)
{
	if ( flag == "FAVICON" )
	{
		var strName = "SELECT_FAVICON";
		var dispDir = SBcommon.getContentDir(gSBitem.id);
	}
	else
	{
		var strName = "SELECT_CUSTOM";
		var dispDir = SBcommon.getScrapBookDir().clone();
		dispDir.append("icon");
		if ( !dispDir.exists() ) dispDir.create(dispDir.DIRECTORY_TYPE, 0700);
	}
	var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
	FP.init(window, SBstring.getString(strName), FP.modeOpen);
	FP.displayDirectory = dispDir;
	FP.appendFilters(FP.filterImages);
	var answer = FP.show();
	if ( answer == FP.returnOK )
	{
		document.getElementById("ScrapBookPropIcon").src = SBcommon.convertFilePathToURL(FP.file.path);
	}
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



function SB_getHTMLTitle(aID, aChars)
{
	var myFile  = SBcommon.getContentDir(aID);
	myFile.append("index.html");
	var myContent = SBcommon.readFile(myFile);
	try {
		SBservice.UC.charset = aChars;
		myContent = SBservice.UC.ConvertToUnicode(myContent);
		var isMatch = myContent.match(/<title>([^<]+?)<\/title>/im);
		if ( isMatch ) return RegExp.$1;
	} catch(ex) {
		return "";
	}
}


function SB_getTotalFileSize(aID)
{
	var totalSize = 0;
	var totalFile = 0;
	var aDir = SBcommon.getContentDir(aID);
	if ( !aDir.isDirectory() ) return [0, 0];
	var aFileList = aDir.directoryEntries;
	while ( aFileList.hasMoreElements() )
	{
		var aFile = aFileList.getNext().QueryInterface(Components.interfaces.nsIFile);
		totalSize += aFile.fileSize;
		totalFile++;
	}
	return [totalSize, totalFile];
}


function SB_formatFileSize(aSizeAndCount, aBundleName)
{
	var aSize  = aSizeAndCount[0];
	var aCount = aSizeAndCount[1];
	var sCount = (aCount && aBundleName) ? SBstring.getFormattedString(aBundleName, [aCount]) : "";
	var ret;
	if ( aSize > 1000 * 1000 ) {
		return SB_divideBy100( Math.round( aSize / 1024 / 1024 * 100 ) ) + " MB  " + sCount;
	} else {
		return Math.round( aSize / 1024 ) + " KB  " + sCount;
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


