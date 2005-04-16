/**************************************************
// calculate.js
// Implementation file for calculate.xul
// 
// Description:
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBwizard;
var SBstring;
var SBlist;

const NS_XUL = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';



function SB_initList()
{
	SBstring = document.getElementById("ScrapBookString");
	SBlist   = document.getElementById("ScrapBookCalcList");
	SBwizard = document.getElementById("ScrapBookCalcWizard");
	SBwizard.getButton("cancel").hidden = true;
	SBwizard.getButton("back").disabled = false;
	SBwizard.getButton("back").label = SBstring.getString("START_CALCULATION");
	SBwizard.getButton("back").addEventListener("click", SB_calculate, false);
}


function SB_calculate()
{
	var IDList = [];
	var IDtoSize = {};
	var TotalCount = [0,0];
	var TotalSize = 0;
	var ResIDs = {};
	var DirIDs = {};

	var SBlistItems = SBlist.childNodes;
	for ( var i = SBlistItems.length - 1; i > 1 ; i-- )
	{
		SBlist.removeChild(SBlistItems[i]);
		document.getElementById("ScrapBookMessage").value  = SBstring.getString("INITIALIZING") + "... " + (i-2);
	}

	SBRDF.init();

	var ResList = SBRDF.data.GetAllResources();
	while ( ResList.hasMoreElements() )
	{
		var aRes = ResList.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
		if ( SBRDF.getProperty("type", aRes) == "folder" ) continue;
		if ( aRes.Value != "urn:scrapbook:root" && aRes.Value != "urn:scrapbook:search" )
		{
			ResIDs[SBRDF.getProperty("id", aRes)] = true;
			TotalCount[0]++;
		}
	}

	var dataDir = SBcommon.getScrapBookDir().clone();
	dataDir.append("data");
	var dataDirList = dataDir.directoryEntries;
	while ( dataDirList.hasMoreElements() )
	{
		var aDir = dataDirList.getNext().QueryInterface(Components.interfaces.nsIFile);
		var aID = aDir.leafName;
		DirIDs[aID] = true;
		var aSize = SB_getTotalFileSize(aID)[0];
		IDList.push(aID);
		IDtoSize[aID] = aSize;
		TotalSize += aSize;
		TotalCount[1]++;
		document.getElementById("ScrapBookMessage").value  = SBstring.getString("CALCULATING") + "... " + aID;
		document.getElementById("ScrapBookProgress").value = Math.round( TotalCount[1] / TotalCount[0] * 100 );
	}

	IDList.sort( function(a, b){ return(IDtoSize[b] - IDtoSize[a]); });

	for ( var i = 0; i < IDList.length; i++ )
	{
		var mySize = IDtoSize[IDList[i]];
		var myRes   = SBservice.RDF.GetResource("urn:scrapbook:item" + IDList[i]);
		var myTitle = SBRDF.getProperty("title", myRes);
		var myImage = SBRDF.getProperty("icon",  myRes);
		var myType  = SBRDF.getProperty("type",  myRes);
		if ( !myTitle ) myTitle = IDList[i] + " (" + SBstring.getString("INVALID") + ")";
		if ( !myImage ) myImage = SBcommon.getDefaultIcon(myType);
		var listItem  = document.createElement("listitem");
		var listCell1 = document.createElement("listcell");
		var listCell2 = document.createElement("listcell");
		listItem.setAttribute("id", IDList[i]);
		listItem.setAttribute("type", myType);
		listCell1.setAttribute("class", "listcell-iconic");
		listCell1.setAttribute("image", myImage);
		listCell1.setAttribute("label", myTitle);
		listCell2.setAttribute("class", "text-right");
		listCell2.setAttribute("label", SB_formatFileSize([mySize, false], null));
		if ( !ResIDs[IDList[i]] )
		{
			listCell1.setAttribute("style", "color:#FF0000;font-weight:bold;");
			listCell2.setAttribute("style", "color:#FF0000;font-weight:bold;");
			listItem.setAttribute("invalid", "true");
		}
		listItem.appendChild(listCell1);
		listItem.appendChild(listCell2);
		SBlist.appendChild(listItem);
	}

	document.getElementById("ScrapBookMessage").value  = "";
	document.getElementById("ScrapBookProgress").value = "0";

	var LackIDs  = [];
	for ( var aID in ResIDs )
	{
		if ( !DirIDs[aID] ) LackIDs.push(aID);
	}

	var SurpIDs = [];
	for ( var aID in DirIDs )
	{
		if ( !ResIDs[aID] ) SurpIDs.push(aID);
	}

	document.getElementById("ScrapBookTotalSize").value  = SB_formatFileSize([TotalSize, TotalCount[1]], "ITEMS_COUNT");

	var msg = ( SurpIDs.length == 0 ) ? SBstring.getString("DIAGNOSIS_OK") : SBstring.getFormattedString("DIAGNOSIS_NG", [SurpIDs.length]);
	if ( LackIDs.length > 0 ) msg += " (" + LackIDs + ")";
	document.getElementById("ScrapBookDiagnosis").value = msg;
}



function SB_createPopupMenuList(aEvent)
{
	var isValid = ( SBlist.currentItem.getAttribute("invalid") != "true");
	document.getElementById("ScrapBookTreePopupD").setAttribute("disabled", isValid);
	document.getElementById("ScrapBookTreePopupP").setAttribute("disabled", !isValid);
}


function SB_openList(aEvent, tabbed)
{
	if ( aEvent.originalTarget.localName != "listitem" && aEvent.originalTarget.localName != "menuitem" ) return;
	var myID   = SBlist.currentItem.id;
	var myType = SBlist.currentItem.getAttribute("type");
	SBcommon.loadURL(SBcommon.getURL(myID, myType), tabbed);
}


function SB_transmitList(flag)
{
	var myID = SBlist.currentItem.id;
	if ( !myID ) return;
	switch ( flag )
	{
		case "P" : window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome" ,myID); break;
		case "L" : SBcommon.launchDirectory(SBcommon.getContentDir(myID));
		default  : break;
	}
}


function SB_deleteList()
{
	var myID = SBlist.currentItem.id;
	if ( myID.length == 14 ) SBcommon.removeDirSafety( SBcommon.getContentDir(myID) );
	SBlist.removeItemAt(SBlist.selectedIndex + 2);
}


