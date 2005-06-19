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
var SBheader;
var gEditingMode;

var SBdropObserver = {};
var SBdragObserver = {};
var SBbuilderObserver = {};



function SB_init()
{
	SBstring = document.getElementById("ScrapBookString");
	SBheader = document.getElementById("ScrapBookHeader");

	SBRDF.init();
	SBstatus.init();
	SBsearch.init();
	SBnote.init();
	SBtreeUtil.init("ScrapBookTree", false);
	SB_initObservers();

	SBpref.init();
	gEditingMode = document.getElementById("ScrapBookEditingMode").getAttribute("checked");

	setTimeout(function(){ SBstatus.getHttpTask(); }, 0);
}


function SB_initObservers()
{
	SBdragObserver = 
	{
		onDragStart : function(event, transferData, action)
		{
			var curRes = SBtree.builderView.getResourceAtIndex(SBtree.currentIndex);
			transferData.data = new TransferData();
			transferData.data.addDataForFlavour("moz/rdfitem", curRes.Value);
			transferData.data.addDataForFlavour("text/x-moz-url", "chrome://scrapbook/content/view.xul?id=" + SBRDF.getProperty("id", curRes));
		},
		onDrop     : function(event, transferData, session) {},
		onDragExit : function(event, session) {}
	};

	SBdropObserver = 
	{
		getSupportedFlavours : function()
		{
			var flavours = new FlavourSet();
			flavours.appendFlavour("moz/rdfitem");
			flavours.appendFlavour("text/x-moz-url");
			flavours.appendFlavour("text/html");
			return flavours;
		},
		onDrop     : function(event, transferData, session) {},
		onDragOver : function(event, flavour, session) {},
		onDragExit : function(event, session) {}
	};

	SBbuilderObserver = 
	{
		canDropOn : function(index)
		{
			return true;
		},
		canDropBeforeAfter : function(index, before)
		{
			return true;
		},
		canDrop : function(index, orient)
		{
			SBstatus.change("canDrop: " + index + "/" + orient);
			SBdropUtil.DROP_BEFORE = -1;
			SBdropUtil.DROP_ON     = 0;
			SBdropUtil.DROP_AFTER  = 1;
			if ( index != -1 && !SBtree.view.isContainer(index) && orient == 0 ) return false;
			return true;
		},
		onDrop : function(row, orient)
		{
			try {
				var XferDataSet  = nsTransferable.get(SBdropObserver.getSupportedFlavours(), nsDragAndDrop.getDragData, true);
				var XferData     = XferDataSet.first.first;
				var XferDataType = XferData.flavour.contentType;
			} catch(ex) {
				dump("*** ScrapBook Exception: Failed to get contentType of XferData.\n");
			}
			( XferDataType == "moz/rdfitem" ) ? SBdropUtil.move(row, orient) : SBdropUtil.capture(XferData.data, row, orient);
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
		onPerformActionOnCell	: function(action, index, colID){},
	};
	SBtree.builderView.addObserver(SBbuilderObserver);
}


function SB_finalize()
{
	SBnote.save();
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
	document.getElementById("ScrapBookTreePopupZ").setAttribute("hidden", !isFolder);
	document.getElementById("ScrapBookTreePopupM").setAttribute("hidden", !isFolder);
	document.getElementById("ScrapBookTreePopup1").setAttribute("hidden", !isFolder);
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
		if ( SBpref.singleExpand ) SBtreeUtil.collapseOtherFolders(curIdx);
		return;
	}
	if ( SBRDF.getProperty("type", curRes) == "note" )
	{
		SBnote.open(curRes, tabbed || SBpref.usetabNote );
		return;
	}
	if ( SBpref.usetabOpen ) tabbed = true;
	var myDir = SBcommon.getContentDir(myID);
	var myDirPath = SBservice.IO.newFileURI(myDir).spec;
	if ( gEditingMode ) {
		if ( !tabbed ) {
			try {
				top.document.getElementById("content").contentDocument.getElementById("ScrapBookBrowser").setAttribute("src", myDirPath + "index.html");
				return;
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
	if ( SBtree.view.selection.count > 1 ) { SB_deleteMultiple(); return; }
	var curIdx = SBtree.currentIndex;
	if ( curIdx == -1 ) return;
	var curRes = SBtree.builderView.getResourceAtIndex(curIdx);
	var parRes = SB_getParentResourceAtIndex(curIdx);
	if ( !SBpref.quickDelete || SBtree.view.isContainer(curIdx) )
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
	SBRDF.flush();
	for ( var i = 0; i < rmIDs.length; i++ )
	{
		if ( rmIDs[i].length == 14 ) SBcommon.removeDirSafety( SBcommon.getContentDir(rmIDs[i]) );
	}
	SBstatus.trace("Removed: " + rmIDs.length + " items");
	if ( SBnote.curRes && rmIDs[0] == SBnote.curRes.Value.substring(18,32) ) SBnote.exit(false);
}


function SB_transmit(flag)
{
	var curRes = SBtree.builderView.getResourceAtIndex(SBtree.currentIndex);
	var myID = SBRDF.getProperty("id", curRes);
	if ( !myID ) return;
	switch ( flag )
	{
		case "P"  : window.openDialog("chrome://scrapbook/content/property.xul", "", "chrome,centerscreen,modal" , myID); break;
		case "M"  : window.openDialog("chrome://scrapbook/content/manage.xul", "", "chrome,centerscreen,all,resizable,dialog=no", curRes.Value); break;
		case "C"  : SBcommon.loadURL("chrome://scrapbook/content/view.xul?id=" + SBRDF.getProperty("id", curRes), SBpref.usetabCombine); break;
		case "S"  : SBcommon.loadURL(SBRDF.getProperty("source", curRes), SBpref.usetabSource); break;
		case "L"  : SBcommon.launchDirectory(SBcommon.getContentDir(myID)); break;
	}
}




var SBdropUtil = {

	DROP_BEFORE : 0,
	DROP_ON     : 1,
	DROP_AFTER  : 2,
	row    : 0,
	orient : 0,

	init : function(aRow, aOrient)
	{
		this.row = aRow;
		this.orient = aOrient;
	},

	move : function(aRow, aOrient)
	{
		this.init(aRow, aOrient);
		( SBtree.view.selection.count == 1 ) ? this.moveSingle() : this.moveMultiple();
	},

	moveSingle : function()
	{
		var curIdx = SBtree.currentIndex;
		var curRes = SBtree.builderView.getResourceAtIndex(curIdx);
		var curPar = SB_getParentResourceAtIndex(curIdx);
		var tarRes = SBtree.builderView.getResourceAtIndex(this.row);
		var tarPar = ( this.orient == this.DROP_ON ) ? tarRes : SB_getParentResourceAtIndex(this.row);
		this.moveCurrentToTarget(curRes, curPar, tarRes, tarPar);
		SBRDF.flush();
	},

	moveMultiple : function()
	{
		return;
	},

	moveCurrentToTarget : function(curRes, curPar, tarRes, tarPar)
	{
		var curAbsIdx = SBtree.builderView.getIndexOfResource(curRes);
		var curRelIdx = SBRDF.getRelativeIndex(curPar, curRes);
		var tarRelIdx = SBRDF.getRelativeIndex(tarPar, tarRes);

		if ( this.orient == this.DROP_ON )
		{
			if ( curAbsIdx == this.row ) { SBstatus.trace("can't drop folder on itself"); return; }
		}
		else
		{
			if ( this.orient == this.DROP_AFTER ) tarRelIdx++;
			if ( curPar.Value == tarPar.Value && tarRelIdx > curRelIdx ) tarRelIdx--;
			if ( this.orient == this.DROP_AFTER &&
			     SBtree.view.isContainer(this.row) &&
			     SBtree.view.isContainerOpen(this.row) &&
			     SBtree.view.isContainerEmpty(this.row) == false )
			{
				if ( curAbsIdx == this.row )
				{
					SBstatus.trace("can't drop folder after open container");
					return;
				}
				SBstatus.trace("drop after open container");
				tarPar = tarRes;
				tarRes = SBtree.builderView.getResourceAtIndex(this.row + 1);
				tarRelIdx = 1;
			}
			if ( curPar.Value == tarPar.Value && curRelIdx == tarRelIdx ) return;
		}
		if ( SBtree.view.isContainer(curAbsIdx) )
		{
			var tmpIdx = this.row;
			var tmpRes = tarRes;
			while ( tmpRes.Value != SBtree.ref && tmpIdx != -1 )
			{
				tmpRes = SB_getParentResourceAtIndex(tmpIdx);
				tmpIdx = SBtree.builderView.getIndexOfResource(tmpRes);
				if ( tmpRes.Value == curRes.Value ) { SBstatus.trace("can't move folder into descendant level"); return; }
			}
		}
		SBRDF.moveItem(curRes, curPar, tarPar, tarRelIdx);
	},

	capture : function(XferString, aRow, aOrient)
	{
		this.init(aRow, aOrient);
		XferString = XferString.split("\n")[0];

		var myWindow = SBcommon.getFocusedWindow();
		try {
			var mySelection = myWindow.getSelection();
		} catch(ex) {
			alert(ex);
			return;
		}
		var isSelected = false;
		try {
			isSelected = ( mySelection.anchorNode.isSameNode(mySelection.focusNode) && mySelection.anchorOffset == mySelection.focusOffset ) ? false : true;
		} catch(ex) {
		}
		var isEntire = (XferString == top.window._content.document.location.href);

		var ResArray = ( this.row == -1 ) ? [SBtree.ref, 0] : this.getTarget();

		if ( isSelected || isEntire )
		{
			var targetWindow = isEntire ? top.window._content : myWindow;
			top.window.SBcapture.doCaptureDocument(targetWindow, !isEntire, SBpref.captureDetail, ResArray[0], ResArray[1]);
		}
		else
		{
			if ( XferString.substring(0,7) == "http://" || XferString.substring(0,8) == "https://" )
			{
				top.window.openDialog(
					"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
					[XferString], myWindow.location.href, SBpref.captureDetail, false, ResArray[0], ResArray[1]
				);
			}
			else if ( XferString.substring(0,7) == "file://" )
			{
				top.window.SBcapture.doCaptureFile(XferString, "file", "file://", SBpref.captureDetail, ResArray[0], ResArray[1]);
			}
			else
			{
				alert("ScrapBook ERROR: Unrecognizable URL.\n" + XferString);
			}
		}
	},

	getTarget : function()
	{
		var tarRes = SBtree.builderView.getResourceAtIndex(this.row);
		var tarPar = ( this.orient == this.DROP_ON ) ? tarRes : SB_getParentResourceAtIndex(this.row);
		var tarRelIdx = SBRDF.getRelativeIndex(tarPar, tarRes);
		if ( this.orient == this.DROP_AFTER ) tarRelIdx++;
		if ( this.orient == this.DROP_AFTER &&
		     SBtree.view.isContainer(this.row) &&
		     SBtree.view.isContainerOpen(this.row) &&
		     SBtree.view.isContainerEmpty(this.row) == false )
		{
			SBstatus.trace("drop after open container");
			tarPar = tarRes; tarRelIdx = 1;
		}
		return [tarPar.Value, tarRelIdx];
	},

};


function SB_getParentResourceAtIndex(aIdx)
{
	var parIdx = SBtree.builderView.getParentIndex(aIdx);
	if ( parIdx == -1 ) {
		return SBservice.RDF.GetResource(SBtree.ref);
	} else {
		return SBtree.builderView.getResourceAtIndex(parIdx);
	}
}



function SB_createFolder()
{
	var newID = SBRDF.identify(SBcommon.getTimeStamp());
	var newItem = new ScrapBookItem(newID);
	newItem.title = SBstring.getString("DEFAULT_FOLDER");
	newItem.type = "folder";

	var tarResName, tarRelIdx, isRootPos;
	try {
		var curIdx = SBtree.currentIndex;
		var curRes = SBtree.builderView.getResourceAtIndex(curIdx);
		var curPar = SB_getParentResourceAtIndex(curIdx);
		var curRelIdx = SBRDF.getRelativeIndex(curPar, curRes);
		tarResName = curPar.Value;
		tarRelIdx  = curRelIdx;
		isRootPos  = false;
	} catch(ex) {
		tarResName = SBtree.ref;
		tarRelIdx  = 1;
		isRootPos  = true;
	}
	var newRes = SBRDF.addItem(newItem, tarResName, tarRelIdx);
	SBtree.builder.rebuild();
	SBRDF.createEmptySeq(newRes.Value);
	SB_rebuildAllTree();
	if ( isRootPos ) SBtree.treeBoxObject.scrollToRow(0);
	SBtree.view.selection.select(SBtree.builderView.getIndexOfResource(newRes));
	SBtree.focus();

	var result = {};
	window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome", newItem.id, result);
	if ( !result.accept )
	{
		SBRDF.deleteItemDescending(newRes, SBservice.RDF.GetResource(tarResName));
		SBRDF.flush();
		return false;
	}
	return true;
}


function SB_createNote()
{
	var tarResName, tarRelIdx, isRootPos;
	try {
		var curIdx = SBtree.currentIndex;
		var curRes = SBtree.builderView.getResourceAtIndex(curIdx);
		var curPar = SB_getParentResourceAtIndex(curIdx);
		var curRelIdx = SBRDF.getRelativeIndex(curPar, curRes);
		tarResName = curPar.Value;
		tarRelIdx  = curRelIdx;
		isRootPos  = false;
	} catch(ex) {
		tarResName = SBtree.ref;
		tarRelIdx  = 0;
		isRootPos  = true;
	}
	SBnote.add(tarResName, tarRelIdx);
	SB_rebuildAllTree();
	SBtree.view.selection.select(SBtree.builderView.getIndexOfResource(SBnote.curRes));
	if ( isRootPos ) SBtree.treeBoxObject.scrollByLines(SBtree.view.rowCount);
}


function SB_rebuildAllTree()
{
	SBtree.builder.rebuild();

	var navList = SBservice.WM.getEnumerator("navigator:browser");
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

	trace : function(msg, msec)
	{
		this.label.value = msg;
		setTimeout(function(){ if ( !SBstatus.image.hasAttribute("src") ) SBstatus.change(""); }, msec ? msec : 5000);
	},

	getHttpTask : function()
	{
		try { var httpTask = top.window.SBcapture.httpTask; } catch(ex) { return; }
		for ( var i in httpTask ) { if ( httpTask[i] > 0 ) return; }
		this.reset();
	},

	httpBusy : function(count, title)
	{
		this.label.value = (count ? "(" + count + ") " : "") + title;
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

	enter : function(myInput)
	{
		if ( myInput.match(/^[a-z]$/i) || !myInput )
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
			if ( this.FORM_HISTORY ) this.FORM_HISTORY.addEntry("ScrapBookSearchHistory", this.query);
			if ( this.type == "fulltext" ) {
				this.execFT();
		 
			} else {
				var regex1 = this.re ? this.query : this.query.replace(/([\*\+\?\.\|\[\]\{\}\^\/\$\\])/g, "\\$1");
				var regex2 = this.cs ? "m" : "mi";
				this.regex = new RegExp(regex1, regex2)
				this.exec(false);
			}
		}
	},

	execFT : function()
	{
		var cache = SBcommon.getScrapBookDir().clone();
		cache.append("cache.rdf");
		var shouldBuild = false;
		if ( !cache.exists() || cache.fileSize < 1024 * 32 ) {
			shouldBuild = true;
		} else {
			var modTime = cache.lastModifiedTime;
			if ( modTime && (new Date().getTime() - modTime) > 1000 * 60 * 60 * 24 * 5 ) shouldBuild = true;
		}
		var resURL   = "chrome://scrapbook/content/result.xul";
		var resQuery = "?q=" + this.query + "&re=" + this.re.toString() + "&cs=" + this.cs.toString();
		if ( shouldBuild ) {
			this.buildFT(resURL + resQuery);
		} else {
			var tabbed = (top.window._content.location.href.substring(0,37) == resURL) ? false : SBpref.usetabSearch;
			SBcommon.loadURL(resURL + resQuery, tabbed);
		}
	},

	buildFT : function(resURL)
	{
		window.openDialog('chrome://scrapbook/content/cache.xul','','chrome,dialog=no', resURL);
	},

	exec : function(forceTitle)
	{
		SBRDF.clearContainer("urn:scrapbook:search");
		var rootCont   = SBRDF.getContainer("urn:scrapbook:root", true);
		this.container = SBRDF.getContainer("urn:scrapbook:search", true);
		this.count = 0;
		this.processRDFRecursively(rootCont);
		var prop = ( this.type == "all" || forceTitle ) ? "title" : this.type;
		document.getElementById("ScrapBookTreeItem").setAttribute("label", "rdf:" + NS_SCRAPBOOK + prop);
		SBtree.setAttribute("ref", "urn:scrapbook:search");
		SBtree.builder.rebuild();
		SBtree.builderView.removeObserver(SBbuilderObserver);
		SBheader.hidden = false;
		SBheader.firstChild.value = SBstring.getFormattedString("SEARCH_RESULTS_FOUND", [this.count]);
	},

	processRDFRecursively : function(aContRes)
	{
		var ResSet = aContRes.GetElements();
		while ( ResSet.hasMoreElements() )
		{
			var aRes = ResSet.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			var aValue = "";
			if ( this.type != "all" )
				aValue = SBRDF.getProperty(this.type, aRes);
			else
				aValue = [SBRDF.getProperty("title", aRes), SBRDF.getProperty("comment", aRes), SBRDF.getProperty("source", aRes), SBRDF.getProperty("id", aRes)].join("\n");
			if ( SBservice.RDFCU.IsContainer(SBRDF.data, aRes) )
			{
				this.processRDFRecursively( SBRDF.getContainer(aRes.Value, false) );
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
		SBheader.hidden = true;
		document.getElementById("ScrapBookTreeItem").setAttribute("label", "rdf:" + NS_SCRAPBOOK + "title");
		document.getElementById("ScrapBookSearchTextbox").value = "";
		SBtree.setAttribute("ref", "urn:scrapbook:root");
		SBtree.builder.rebuild();
		SBtree.builderView.removeObserver(SBbuilderObserver);
		SBtree.builderView.addObserver(SBbuilderObserver);
		SBRDF.clearContainer("urn:scrapbook:search");
	},

	clearFormHistory : function()
	{
		if ( this.FORM_HISTORY ) this.FORM_HISTORY.removeEntriesForName("ScrapBookSearchHistory");
	}

};




var SBsort = {

	key : "",
	ascending : false,
	recursive : false,

	exec : function(treeSort, aSortKey, isAscending)
	{
		this.key = aSortKey;
		this.ascending = isAscending;
		this.recursive = treeSort ? true : document.getElementById("ScrapBookSortRecursive").getAttribute("checked");
		if ( treeSort ) {
			var rootRes = SBservice.RDF.GetResource("urn:scrapbook:root");
		} else {
			var curIdx = SBtree.currentIndex;
			if ( curIdx == -1 || !SBtree.view.isContainer(curIdx) ) return;
			var rootRes = SBtree.builderView.getResourceAtIndex(curIdx);
			if ( SBtree.view.isContainerOpen(curIdx) ) SBtree.view.toggleOpenState(curIdx);
		}
		this.process(rootRes);
		if ( !treeSort ) SBtree.view.toggleOpenState(curIdx);
		SBRDF.flush();
	},

	process : function(aContRes)
	{
		var ResListF = [], ResListI = [], ResListN = [];
		var aRDFCont = SBRDF.getContainer(aContRes.Value, false);
		var ResSet = aRDFCont.GetElements();
		while ( ResSet.hasMoreElements() )
		{
			var aRes = ResSet.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( SBservice.RDFCU.IsContainer(SBRDF.data, aRes) )
			{
				ResListF.push(aRes);
				if ( this.recursive ) SBsort.process(aRes);
			}
			else
			{
				( SBRDF.getProperty("type", aRes) == "note" ? ResListN : ResListI ).push(aRes);
			}
		}
		ResListF.sort(this.compare); if ( !this.ascending ) ResListF.reverse();
		ResListI.sort(this.compare); if ( !this.ascending ) ResListI.reverse();
		ResListN.sort(this.compare); if ( !this.ascending ) ResListN.reverse();
		ResListF = ResListF.concat(ResListI).concat(ResListN); 
		for ( var i = 0; i < ResListF.length; i++ )
		{
			aRDFCont.RemoveElement(ResListF[i], true);
			aRDFCont.AppendElement(ResListF[i]);
		}
	},

	compare : function(resA, resB)
	{
		var a = SBRDF.getProperty(SBsort.key, resA).toUpperCase();
		var b = SBRDF.getProperty(SBsort.key, resB).toUpperCase();
		if ( a > b ) return 1;
		if ( a < b ) return -1;
		return 0;
	},

};




var SBpref = {

	singleExpand  : false,
	captureDetail : false,
	hideFavicon   : false,
	quickDelete   : false,
	usetabOpen    : false,
	usetabSource  : false,
	usetabSearch  : false,
	usetabCombine : false,
	usetabNote    : false,

	init : function()
	{
		this.captureDetail = SBcommon.getBoolPref("scrapbook.capture.detail", false);
		this.singleExpand  = SBcommon.getBoolPref("scrapbook.tree.singleexpand", false);
		this.hideFavicon   = SBcommon.getBoolPref("scrapbook.tree.hidefavicon", false);
		this.quickDelete   = SBcommon.getBoolPref("scrapbook.tree.quickdelete", false);
		this.usetabOpen    = SBcommon.getBoolPref("scrapbook.usetab.open", false);
		this.usetabSource  = SBcommon.getBoolPref("scrapbook.usetab.source", false);
		this.usetabSearch  = SBcommon.getBoolPref("scrapbook.usetab.search", false);
		this.usetabCombine = SBcommon.getBoolPref("scrapbook.usetab.combine", false);
		this.usetabNote    = SBcommon.getBoolPref("scrapbook.usetab.note", false);
	},
};


