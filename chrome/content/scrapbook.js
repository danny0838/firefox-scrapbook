/**************************************************
// scrapbook.js
// Implementation file for scrapbook.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBstring;
var SBtree;
var SBedit;

var dropObserver = {};
var dragObserver = {};
var builderObserver = {};
var SBprefListener = {};



function SB_init()
{
	SBstring = document.getElementById("ScrapBookString");
	SBtree   = document.getElementById("ScrapBookTree");

	SBpref.init();
	SB_toggleShowFavicon();
	SB_toggleEditingMode();

	SBprefListener = 
	{
		domain  : "scrapbook",
		observe : function(aSubject, aTopic, aPrefString)
		{
			if ( aTopic == "nsPref:changed" ) {
				SBpref.init();
				if ( aPrefString == "scrapbook.hidefavicon" ) SB_toggleShowFavicon();
			}
		}
	};
	SBpref.removeListener(SBprefListener);
	SBpref.addListener(SBprefListener);

	SBstatus.init();
	SBsearch.init();
	SBnote.init();
	SB_initTree();
	setTimeout(function(){ SBstatus.getHttpTask(); }, 0);
}


function SB_initTree()
{
	SBRDF.init();
	SBtree.database.AddDataSource(SBRDF.data);
	SBtree.builder.rebuild();

	dragObserver = 
	{
		onDragStart : function(event, transferData, action)
		{
			var curRes = SBtree.builderView.getResourceAtIndex(SBtree.currentIndex);
			transferData.data = new TransferData();
			transferData.data.addDataForFlavour("moz/rdfitem", curRes.Value);
			transferData.data.addDataForFlavour("text/unicode", "chrome://scrapbook/content/view.xul?id=" + SBRDF.getProperty("id", curRes));
		},
		onDrop     : function(event, transferData, session) {},
		onDragExit : function(event, session) {}
	};

	dropObserver = 
	{
		getSupportedFlavours : function()
		{
			var flavours = new FlavourSet();
			flavours.appendFlavour("moz/rdfitem");
			flavours.appendFlavour("text/html");
			return flavours;
		},
		onDrop     : function(event, transferData, session) {},
		onDragOver : function(event, flavour, session) {},
		onDragExit : function(event, session) {}
	};

	builderObserver = 
	{
		canDropOn : function(index)
		{
			return true;
		},
		canDropBeforeAfter : function(index, before)
		{
			return true;
		},
		onDrop : function(row, orient)
		{
			try
			{
				var XferDataSet  = nsTransferable.get(dropObserver.getSupportedFlavours(), nsDragAndDrop.getDragData, true);
				var XferData     = XferDataSet.first.first;
				var XferDataType = XferData.flavour.contentType;
			}
			catch(ex)
			{
				dump("*** SCRAPBOOK: Failed to get contentType of XferData.\n");
			}
			if ( XferDataType == "moz/rdfitem" )
			{
				SB_moveItemOnDrop(row, orient);
			}
			else
			{
				var curLink1 = '<a href="' + top.window.content.document.location.href + '">' + top.window.content.document.location.href + '</a>';
				var curLink2 = '<a href="' + top.window.content.document.location.href + '">' + top.window.content.document.title + '</a>';
				var isEntire = ( XferData.data == curLink1 || XferData.data == curLink2 );
				var ResArray = ( row == -1 ) ? ['urn:scrapbook:root', 0] : SB_getContainerOnDrop(row, orient);
				top.window.SBcapture.doCaptureDocument(!isEntire, SBpref.detaildialog, ResArray[0], ResArray[1]);
			}
			SB_rebuildAllTree();
		},
		onToggleOpenState		: function(row)					{},
		onCycleHeader			: function(colID, header)		{},
		onSelectionChanged		: function()					{},
		onCycleCell				: function(index, colID)		{},
		isEditable				: function(index, colID)		{},
		onSetCellText			: function(index, colID, val)	{},
		onPerformAction			: function(action)				{},
		onPerformActionOnRow	: function(action, index)		{},
		onPerformActionOnCell	: function(action, index, colID){}
	};
	SBtree.builderView.addObserver(builderObserver);
}


function SB_finalize()
{
	SBpref.removeListener(SBprefListener);
	SBnote.save();
}



function SB_toggleShowFavicon()
{
	if ( SBpref.hidefavicon ) {
		document.getElementById("ScrapBookTreeItem").removeAttribute("src");
	} else {
		document.getElementById("ScrapBookTreeItem").setAttribute("src", "rdf:http://amb.vis.ne.jp/mozilla/scrapbook-rdf#icon");
	}
	SB_rebuildAllTree();
}


function SB_toggleEditingMode()
{
	SBedit = document.getElementById("ScrapBookEditingMode").getAttribute("checked");
}



function SB_onKeyPressItem(aEvent)
{
	switch ( aEvent.keyCode )
	{
		case 13  : SB_open(false, false);	break;
		case 46  : SB_delete();				break;
		case 113 : SB_transmit("P");		break;
	}
}


function SB_onClickItem(aEvent)
{
	if ( aEvent != null && ( aEvent.button == 0 || aEvent.button == 1 ) )
	{
		var obj = {};
		SBtree.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, {}, {}, obj);
		if ( !obj.value || obj.value == "twisty" ) return;
	}

	switch ( aEvent.button )
	{
		case 0 : SB_open(aEvent.ctrlKey || aEvent.shiftKey, true); break;
		case 1 : SB_open(true,  true); break;
		default : break;
	}
}


function SB_createPopupMenu()
{
	var curIdx = SBtree.currentIndex;
	if ( curIdx == -1 ) return;
	var isFolder = SBtree.builderView.isContainer(curIdx);
	var isNote   = ( SBRDF.getProperty("type", SBtree.builderView.getResourceAtIndex(curIdx)) == "note" );
	document.getElementById("ScrapBookTreePopupO").setAttribute("hidden",  isFolder);
	document.getElementById("ScrapBookTreePopupT").setAttribute("hidden",  isFolder || isNote);
	document.getElementById("ScrapBookTreePopupS").setAttribute("hidden",  isFolder || isNote);
	document.getElementById("ScrapBookTreePopupE").setAttribute("hidden", !isNote);
	document.getElementById("ScrapBookTreePopupL").setAttribute("hidden",  isFolder);
	document.getElementById("ScrapBookTreePopupF").setAttribute("hidden", !isFolder);
	document.getElementById("ScrapBookTreePopupF").setAttribute("default", isFolder);
	document.getElementById("ScrapBookTreePopupA").setAttribute("hidden", !isFolder);
	document.getElementById("ScrapBookTreePopupV").setAttribute("hidden", !isFolder);
	document.getElementById("ScrapBookTreePopupM").setAttribute("hidden", !isFolder);
	return isFolder;
}



function SB_open(tabbed, folderOpen)
{
	var curIdx = SBtree.currentIndex;
	var curRes = SBtree.builderView.getResourceAtIndex(curIdx);
	var myID = SBRDF.getProperty("id", curRes);
	if ( !myID ) return;
	if ( SBtree.view.isContainer(curIdx) )
	{
		if ( folderOpen == true ) SBtree.view.toggleOpenState(curIdx);
		if ( SBpref.folderclick ) SB_collapseOtherFolders(curIdx);
		return;
	}
	if ( SBRDF.getProperty("type", curRes) == "note" )
	{
		SBnote.open(curRes, tabbed);
		return;
	}
	if ( SBpref.usetabopen ) tabbed = true;
	var myDir = SBcommon.getContentDir(myID);
	var myDirPath = SBservice.IO.newFileURI(myDir).spec;
	if ( SBedit ) {
		if ( !tabbed ) {
			try {
				top.document.getElementById("content").contentDocument.getElementById("ScrapBookBrowser").setAttribute("src", myDirPath + "index.html"); return;
			} catch(ex) {
			}
		}
		SBcommon.loadURL("chrome://scrapbook/content/edit.xul?id=" + myID, tabbed);
	} else {
		SBcommon.loadURL(myDirPath + "index.html", tabbed);
	}
}


function SB_openAllInTabs()
{
	var curIdx = SBtree.currentIndex;
	var curRes = SBtree.builderView.getResourceAtIndex(curIdx);
	SBservice.RDFC.Init(SBRDF.data, curRes);
	var ResList = SBservice.RDFC.GetElements();
	while ( ResList.hasMoreElements() )
	{
		var aRes = ResList.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
		if ( SBservice.RDFCU.IsContainer(SBRDF.data, aRes) ) continue;
		var myID   = SBRDF.getProperty("id", aRes);
		var myType = SBRDF.getProperty("type", aRes);
		SBcommon.loadURL(SBcommon.getURL(myID, myType), true);
	}
}


function SB_delete()
{
	var curIdx = SBtree.currentIndex;
	if ( curIdx == -1 ) return;
	var curRes = SBtree.builderView.getResourceAtIndex(curIdx);
	var parRes = SB_getContainerOfIndex(curIdx);
	if ( !SBpref.quickdelete )
	{
		if ( !window.confirm( SBstring.getString("CONFIRM_DELETE") ) ) return;
	}
	if ( parRes.Value == "urn:scrapbook:search" )
	{
		SBRDF.removeElementFromContainer("urn:scrapbook:search", curRes);
		parRes = SBRDF.findContainerRes(curRes);
		if ( SBservice.RDFCU.indexOf(SBRDF.data, parRes, curRes) == -1 ) { alert("ScrapBook FATAL ERROR."); return; }
	}
	var rmIDs = SBRDF.deleteItemDescending(curRes, parRes);
	for ( var i = 0; i < rmIDs.length; i++ )
	{
		if ( rmIDs[i].length == 14 ) SBcommon.removeDirSafety( SBcommon.getContentDir(rmIDs[i]) );
	}
	SBstatus.trace(rmIDs.length + " items removed");
	if ( SBnote.curRes && rmIDs[0] == SBnote.curRes.Value.substring(18,32) ) SBnote.exit(false);
}


function SB_transmit(flag)
{
	var curRes = SBtree.builderView.getResourceAtIndex(SBtree.currentIndex);
	var myID = SBRDF.getProperty("id", curRes);
	if ( !myID ) return;
	switch ( flag )
	{
		case "P"  : window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome" , myID); break;
		case "M"  : window.openDialog("chrome://scrapbook/content/manage.xul"  , "", "chrome,all,dialog=no", curRes.Value); break;
		case "V"  : SBcommon.loadURL("chrome://scrapbook/content/view.xul?id=" + SBRDF.getProperty("id", curRes), SBpref.usetabview); break;
		case "S"  : SBcommon.loadURL(SBRDF.getProperty("source", curRes), SBpref.usetabsource); break;
		case "L"  : SBcommon.launchDirectory(myID); break;
		default   : break;
	}
}


function SB_transmitURL(aURL, aPrefString)
{
	SBcommon.loadURL(aURL, nsPreferences.getBoolPref(aPrefString, false));
}




function SB_moveItemOnDrop(tarRow, orient)
{
	var curIdx = SBtree.currentIndex;
	var curRes = SBtree.builderView.getResourceAtIndex(curIdx);
	var curPar = SB_getContainerOfIndex(curIdx);
	var tarRes = SBtree.builderView.getResourceAtIndex(tarRow);
	var tarPar = ( orient == 1 ) ? tarRes : SB_getContainerOfIndex(tarRow);
	var curRelIdx = SBRDF.getRelativeIndex(curPar, curRes);
	var tarRelIdx = SBRDF.getRelativeIndex(tarPar, tarRes);

	if ( orient == 1 )
	{
		if ( curIdx == tarRow ) { SBstatus.trace("can't drop folder on itself"); return; }
	}
	else
	{
		if ( orient == 2 ) tarRelIdx++;
		if ( curPar.Value == tarPar.Value && tarRelIdx > curRelIdx ) tarRelIdx--;
		if ( orient == 2 &&
		     SBtree.view.isContainer(tarRow) &&
		     SBtree.view.isContainerOpen(tarRow) &&
		     SBtree.view.isContainerEmpty(tarRow) == false )
		{
			SBstatus.trace("drop after open container");
			tarPar = tarRes;
			tarRes = SBtree.builderView.getResourceAtIndex(++tarRow);
			tarRelIdx = 1;
		}
		if ( curPar.Value == tarPar.Value && curRelIdx == tarRelIdx ) return;
	}

	if ( SBtree.view.isContainer(curIdx) )
	{
		var tmpIdx = tarRow;
		var tmpRes = tarRes;
		while ( tmpRes.Value != SBtree.ref && tmpIdx != -1 )
		{
			tmpRes = SB_getContainerOfIndex(tmpIdx);
			tmpIdx = SBtree.builderView.getIndexOfResource(tmpRes);
			if ( tmpRes.Value == curRes.Value ) { SBstatus.trace("can't move folder into descendant"); return; }
		}
	}

	SBRDF.moveItem(curRes, curPar, tarPar, tarRelIdx);
}


function SB_getContainerOnDrop(tarRow, orient)
{
	var tarRes = SBtree.builderView.getResourceAtIndex(tarRow);
	var tarPar = ( orient == 1 ) ? tarRes : SB_getContainerOfIndex(tarRow);
	var tarRelIdx = SBRDF.getRelativeIndex(tarPar, tarRes);
	if ( orient == 2 ) tarRelIdx++;
	if ( orient == 2 &&
	     SBtree.view.isContainer(tarRow) &&
	     SBtree.view.isContainerOpen(tarRow) &&
	     SBtree.view.isContainerEmpty(tarRow) == false )
	{
		SBstatus.trace("drop after open container");
		tarPar = tarRes; tarRelIdx = 1;
	}
	return [tarPar.Value, tarRelIdx];
}


function SB_getContainerOfIndex(aIdx)
{
	var parIdx = SBtree.builderView.getParentIndex(aIdx);
	if ( parIdx == -1 ) {
		return SBservice.RDF.GetResource(SBtree.ref);
	} else {
		return SBtree.builderView.getResourceAtIndex(parIdx);
	}
}



function SB_createFolder(rootPosition)
{
	var newSBitem = new ScrapBookItem(SBcommon.getTimeStamp());
	newSBitem.title = SBstring.getString("DEFAULT_FOLDER");
	newSBitem.type = "folder";

	var tarResName = SBtree.ref;
	var tarRelIdx  = 1;
	if ( !rootPosition )
	{
		try {
			var curIdx = SBtree.currentIndex;
			var curRes = SBtree.builderView.getResourceAtIndex(curIdx);
			var curPar = SB_getContainerOfIndex(curIdx);
			var curRelIdx = SBRDF.getRelativeIndex(curPar, curRes);
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
		} catch(ex) {
		}
	}
	var newRes = SBRDF.addItem(newSBitem, tarResName, tarRelIdx);
	SBtree.builder.rebuild();
	SBRDF.createEmptySeq(newRes.Value);
	SB_rebuildAllTree();
	if ( rootPosition ) SBtree.treeBoxObject.scrollToRow(0);

	var result = {};
	window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome", newSBitem.id, result);
	if ( !result.accept ) SBRDF.deleteItemDescending(newRes, SBservice.RDF.GetResource(tarResName));
}


function SB_createNote(rootPosition)
{
	var tarResName = SBtree.ref;
	var tarRelIdx  = 0;
	if ( !rootPosition )
	{
		try {
			var curIdx = SBtree.currentIndex;
			var curRes = SBtree.builderView.getResourceAtIndex(curIdx);
			var curPar = SB_getContainerOfIndex(curIdx);
			var curRelIdx = SBRDF.getRelativeIndex(curPar, curRes);
			tarResName = curPar.Value;
			tarRelIdx  = curRelIdx;
		} catch(ex) {
		}
	}
	SBnote.add(tarResName, tarRelIdx);
	SB_rebuildAllTree();
	SBtree.view.selection.select(SBtree.builderView.getIndexOfResource(SBnote.curRes));
	if ( rootPosition ) SBtree.treeBoxObject.scrollByLines(SBtree.view.rowCount);
}


function SB_toggleAllFolder()
{
	var willOpen = true;
	for ( var i = 0; i < SBtree.view.rowCount; i++ )
	{
		if ( !SBtree.view.isContainer(i) ) continue;
		if ( SBtree.view.isContainerOpen(i) ) { willOpen = false; break; }
	}
	if ( willOpen ) {
		for ( var i = 0; i < SBtree.view.rowCount; i++ )
		{
			if ( SBtree.view.isContainer(i) && !SBtree.view.isContainerOpen(i) ) {
				SBtree.view.toggleOpenState(i);
			}
		}
	} else {
		for ( var i = SBtree.view.rowCount - 1; i >= 0; i-- )
		{
			if ( SBtree.view.isContainer(i) && SBtree.view.isContainerOpen(i) ) {
				SBtree.view.toggleOpenState(i);
			}
		}
	}
}


function SB_collapseOtherFolders(curIdx)
{
	var ascIdxList = {};
	ascIdxList[curIdx] = true;
	while ( curIdx >= 0 )
	{
		curIdx = SBtree.builderView.getParentIndex(curIdx);
		ascIdxList[curIdx] = true;
	}
	for ( var i = SBtree.view.rowCount - 1; i >= 0; i-- )
	{
		if ( !ascIdxList[i] && SBtree.view.isContainer(i) && SBtree.view.isContainerOpen(i) ) {
			SBtree.view.toggleOpenState(i);
		}
	}
}


function SB_rebuildAllTree()
{
	SBtree.builder.rebuild();

	var navList = SBservice.WM.getEnumerator('navigator:browser');
	while ( navList.hasMoreElements() )
	{
		var nav = navList.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
		try {
			nav.document.getElementById("sidebar").contentDocument.getElementById("ScrapBookTree").builder.rebuild();
		} catch(ex) {
		}
	}
}



var SBstatus = {

	label : null,
	image : null,

	init : function()
	{
		this.label = document.getElementById("ScrapBookStatusLabel");
		this.image = document.getElementById("ScrapBookStatusImage");
	},

	change : function(msg)
	{
		this.label.value = msg;
	},

	trace : function(msg, sec)
	{
		this.label.value = msg;
		setTimeout(function(){ SBstatus.change(""); }, sec ? sec : 5000);
	},

	getHttpTask : function()
	{
		try { var httpTask = top.window.SBcapture.httpTask; } catch(ex) { return; }
		for ( var i in httpTask )
		{
			if (httpTask[i] > 0) {
				this.httpBusy(httpTask[i], SBRDF.getProperty("title", SBservice.RDF.GetResource("urn:scrapbook:item" + i)));
				return;
			}
		}
		this.reset();
	},

	httpBusy : function(count, title)
	{
		this.label.value = "HTTP (" + count + ") " + title;
		this.image.setAttribute("src", "chrome://scrapbook/skin/status_busy.gif");
	},

	httpComplete : function(title)
	{
		this.label.value = "Complete: " + title;
		this.image.removeAttribute("src");
	},

	reset : function()
	{
		this.label.value = "";
		this.image.removeAttribute("src");
		top.window.SBcapture.httpTask = {};
	}
};



var SBsearch = {

	type      : "",
	query     : "",
	re        : false,
	cs        : false,
	regex     : null,
	count     : 0,
	container : null,
	xulSearch : null,
	xulResult : null,

	get FORM_HISTORY()
	{
		try {
			return Components.classes['@mozilla.org/satchel/form-history;1'].getService(Components.interfaces.nsIFormHistory);
		} catch(ex) {
			return null;
		}
	},

	init : function()
	{
		this.xulSearch = document.getElementById("ScrapBookSearch");
		this.xulResult = document.getElementById("ScrapBookResult");
		this.type = document.getElementById("ScrapBookSearch").getAttribute("searchtype");
		var targetID = "ScrapBookSearch" + this.type.charAt(0).toUpperCase();
		document.getElementById(targetID).setAttribute("checked", "true");
		this.xulSearch.src = "chrome://scrapbook/skin/search_" + this.type + ".png";
	},

	change : function(aType)
	{
		this.type = aType;
		this.xulSearch.setAttribute("searchtype", aType);
		this.xulSearch.src = "chrome://scrapbook/skin/search_" + this.type + ".png";
	},

	press : function(myInput)
	{
		if ( nsPreferences.copyUnicharPref("app.id", "") != "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}" )
			this.enter(myInput);
	},

	enter : function(myInput)
	{
		if ( myInput.length < 2 )
		{
			switch ( myInput.toLowerCase() )
			{
				case "f" : this.change("fulltext"); break;
				case "t" : this.change("title"); break;
				case "c" : this.change("comment"); break;
				case "u" : this.change("source"); break;
				case "i" : this.change("id"); break;
				case "a" : this.change("all"); break;
				default  : this.exit(); break;
			}
			document.getElementById("ScrapBookSearchTextbox").value = "";
		}
		else
		{
			this.query = myInput;
			this.re = document.getElementById("ScrapBookSearchOptionRE").getAttribute("checked");
			this.cs = document.getElementById("ScrapBookSearchOptionCS").getAttribute("checked");
			if ( this.FORM_HISTORY )
			{
				this.FORM_HISTORY.addEntry("ScrapBookSearchHistory", this.query);
			}

			if ( this.type == "fulltext" )
			{
				SBcommon.loadURL("chrome://scrapbook/content/result.xul?q=" + this.query + "&re=" + this.re.toString() + "&cs=" + this.cs.toString(), SBpref.usetabsearch);
			}
			else 
			{
				var regex1 = this.re ? this.query : this.query.replace(/([\*\+\?\.\|\[\]\{\}\^\/\$\\])/g, "\\$1");
				var regex2 = this.cs ? "m" : "mi";
				this.regex = new RegExp(regex1, regex2)
				this.exec(false);
			}
		}
	},

	exec : function(forceTitle)
	{
		SBRDF.clearContainer("urn:scrapbook:search");
		var rootCont   = SBRDF.getContainer("urn:scrapbook:root");
		this.container = SBRDF.getContainer("urn:scrapbook:search");
		this.count = 0;
		this.processRDFRecursively(rootCont);
		var prop = ( this.type == "all" || forceTitle ) ? "title" : this.type;
		document.getElementById("ScrapBookTreeItem").setAttribute("label", "rdf:" + NS_SCRAPBOOK + prop);
		SBtree.setAttribute("ref", "urn:scrapbook:search");
		SBtree.builder.rebuild();
		SBtree.builderView.removeObserver(builderObserver);
		this.xulResult.hidden = false;
		this.xulResult.firstChild.value = this.count + " Results Found.";
	},

	processRDFRecursively : function(aContRes)
	{
		var ResSet = aContRes.GetElements();
		while ( ResSet.hasMoreElements() )
		{
			var aRes = ResSet.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			var aValue = "";
			if ( this.type != "all" ) {
				aValue = SBRDF.getProperty(this.type, aRes);
			} else {
				aValue = [SBRDF.getProperty("title", aRes), SBRDF.getProperty("comment", aRes), SBRDF.getProperty("source", aRes), SBRDF.getProperty("id", aRes)].join("\n");
			}
			if ( SBservice.RDFCU.IsContainer(SBRDF.data, aRes) )
			{
				this.processRDFRecursively( SBRDF.getContainer(aRes.Value) );
			}
			else if ( aValue && aValue.match(this.regex) )
			{
				this.container.AppendElement(aRes);
				this.count++;
			}
		}
	},

	filterByDays : function(days)
	{
		var ymdList = [];
		var dd = new Date;
		do {
			var y = dd.getFullYear();
			var m = dd.getMonth() + 1; if ( m < 10 ) m = "0" + m;
			var d = dd.getDate();      if ( d < 10 ) d = "0" + d;
			ymdList.push(y.toString() + m.toString() + d.toString());
			dd.setTime( dd.getTime() - 1000 * 60 * 60 * 24 );
		}
		while ( --days > 0 );
		var tmpType = this.type;
		this.change("id");
		this.regex = new RegExp("^(" + ymdList.join("|") + ")", "");
		this.exec(true);
		this.change(tmpType);
	},

	exit : function()
	{
		this.xulResult.hidden = true;
		document.getElementById("ScrapBookTreeItem").setAttribute("label", "rdf:" + NS_SCRAPBOOK + "title");
		document.getElementById("ScrapBookSearchTextbox").value = "";
		SBtree.setAttribute("ref", "urn:scrapbook:root");
		SBtree.builder.rebuild();
		SBtree.builderView.removeObserver(builderObserver);
		SBtree.builderView.addObserver(builderObserver);
		SBRDF.clearContainer("urn:scrapbook:search");
	},

	clearFormHistory : function()
	{
		if ( this.FORM_HISTORY ) this.FORM_HISTORY.removeEntriesForName("ScrapBookSearchHistory");
	}

};




var SBpref = {

	folderclick  : null,
	detaildialog : null,
	hidefavicon  : null,
	quickdelete  : null,
	usetabopen   : null,
	usetabsource : null,
	usetabsearch : null,
	usetabview   : null,

	init : function()
	{
		this.folderclick  = nsPreferences.getBoolPref("scrapbook.folderclick", false);
		this.detaildialog = nsPreferences.getBoolPref("scrapbook.detaildialog", false);
		this.hidefavicon  = nsPreferences.getBoolPref("scrapbook.hidefavicon", false);
		this.quickdelete  = nsPreferences.getBoolPref("scrapbook.quickdelete", false);
		this.usetabopen   = nsPreferences.getBoolPref("scrapbook.usetab.open", false);
		this.usetabsource = nsPreferences.getBoolPref("scrapbook.usetab.source", false);
		this.usetabsearch = nsPreferences.getBoolPref("scrapbook.usetab.search", false);
		this.usetabview   = nsPreferences.getBoolPref("scrapbook.usetab.view", false);
	},
	addListener : function(aListener)
	{
		try {
			SBservice.PBI.addObserver(aListener.domain, aListener, false);
		} catch(ex) {
		}
	},
	removeListener : function(aListener)
	{
		try {
			SBservice.PBI.removeObserver(aListener.domain, aListener);
		} catch(ex) {
		}
	}
};


