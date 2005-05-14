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
	SBwizard.getButton("back").addEventListener("click", function() { SBcalculate.exec(); }, false);
	if ( document.location.href.match(/\?reload$/) ) SBcalculate.exec();
}


var SBcalculate = {

	IDList : [],
	ID2Size : {},
	ResIDs : {},
	DirIDs : {},
	DirList : [],
	index : 0,
	total : 0,
	totalSize : 0,

	exec : function()
	{
		if ( SBlist.childNodes.length > 2 ) window.location.href = "chrome://scrapbook/content/calculate.xul?reload";

		this.IDList = [];
		this.ID2Size = {};
		this.ResIDs = {};
		this.DirIDs = {};
		this.DirList = [];
		this.index = 0;
		this.total = 0;
		this.totalSize = 0;
		SBRDF.init();
		var allRes = SBRDF.data.GetAllResources();
		while ( allRes.hasMoreElements() )
		{
			var myRes = allRes.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( SBRDF.getProperty("type", myRes) == "folder" ) continue;
			if ( myRes.Value != "urn:scrapbook:root" && myRes.Value != "urn:scrapbook:search" )
			{
				this.ResIDs[SBRDF.getProperty("id", myRes)] = true;
				this.total++;
			}
		}
		var dataDir = SBcommon.getScrapBookDir().clone();
		dataDir.append("data");
		var dataDirEnum = dataDir.directoryEntries;
		while ( dataDirEnum.hasMoreElements() )
		{
			var myDir = dataDirEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
			this.DirList.push(myDir);
			document.getElementById("ScrapBookMessage").value = SBstring.getString("INITIALIZING") + "... (" + ++this.index + ")";
		}
		this.asyncProcess(this.DirList[this.index = 0]);
	},

	asyncProcess : function(aDir)
	{
		var myID = aDir.leafName;
		var mySize = SB_getTotalFileSize(myID)[0];
		this.IDList.push(myID);
		this.ID2Size[myID] = mySize;
		this.DirIDs[myID] = true;
		this.totalSize += mySize;
		this.index++;
		document.getElementById("ScrapBookMessage").value  = SBstring.getString("CALCULATING") + "... (" + this.index + "/" + this.total + ")";
		document.getElementById("ScrapBookProgress").value = Math.round( this.index / this.total * 100 );
		if ( this.index < this.DirList.length ) {
			setTimeout(function() { SBcalculate.asyncProcess(SBcalculate.DirList[SBcalculate.index]); }, 0);
		} else {
			this.finish();
		}
	},

	finish : function()
	{
		this.IDList.sort( function(a, b){ return(SBcalculate.ID2Size[b] - SBcalculate.ID2Size[a]); });

		for ( var i = 0; i < this.IDList.length; i++ )
		{
			var mySize = this.ID2Size[this.IDList[i]];
			var myRes   = SBservice.RDF.GetResource("urn:scrapbook:item" + this.IDList[i]);
			var myTitle = SBRDF.getProperty("title", myRes);
			var myImage = SBRDF.getProperty("icon",  myRes);
			var myType  = SBRDF.getProperty("type",  myRes);
			if ( !myTitle ) myTitle = this.IDList[i] + " (" + SBstring.getString("INVALID") + ")";
			if ( !myImage ) myImage = SBcommon.getDefaultIcon(myType);
			var listItem  = document.createElement("listitem");
			var listCell1 = document.createElement("listcell");
			var listCell2 = document.createElement("listcell");
			listItem.setAttribute("id", this.IDList[i]);
			listItem.setAttribute("type", myType);
			listCell1.setAttribute("class", "listcell-iconic");
			listCell1.setAttribute("image", myImage);
			listCell1.setAttribute("label", myTitle);
			listCell2.setAttribute("class", "text-right");
			listCell2.setAttribute("label", SB_formatFileSize([mySize, false], null));
			if ( !this.ResIDs[this.IDList[i]] )
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
		for ( var aID in this.ResIDs )
		{
			if ( !this.DirIDs[aID] ) LackIDs.push(aID);
		}

		var SurpIDs = [];
		for ( var aID in this.DirIDs )
		{
			if ( !this.ResIDs[aID] ) SurpIDs.push(aID);
		}

		document.getElementById("ScrapBookTotalSize").value  = SB_formatFileSize([this.totalSize, this.DirList.length], "ITEMS_COUNT");

		var msg = ( SurpIDs.length == 0 ) ? SBstring.getString("DIAGNOSIS_OK") : SBstring.getFormattedString("DIAGNOSIS_NG", [SurpIDs.length]);
		if ( LackIDs.length > 0 ) msg += " (" + LackIDs + ")";
		document.getElementById("ScrapBookDiagnosis").value = msg;

	},

};



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


