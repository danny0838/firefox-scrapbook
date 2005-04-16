/**************************************************
// trade.js
// Implementation file for trade.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBlog;
var SBlist;
var SBstring;
var STstring;
var SBprogress;

var SBtradeDir;

var STdropObserver = {};



function SB_trace(aStr, aKey)
{
	SBstatus.trace(aStr, 2000);
	var listItem = SBlog.appendItem(aStr);
	SBlog.ensureIndexIsVisible(SBlog.getRowCount() - 1);
	switch ( aKey )
	{
		case "R" : col = "#FF0000"; break;
		case "G" : col = "#00AA33"; break;
		case "B" : col = "#0000FF"; break;
	}
	if ( aKey ) listItem.setAttribute("style", "color:" + col + ";");
}


function SB_initTrade()
{
	SBlog      = document.getElementById("ScrapBookTradeLog");
	SBlist     = document.getElementById("ScrapBookTradeList");
	SBstring   = document.getElementById("ScrapBookString");
	STstring   = document.getElementById("ScrapBookTradeString");
	SBprogress = document.getElementById("ScrapBookTradeProgress");
	SBRDF.init();
	SBtreeUtil.init("ScrapBookTree", false);
	SB_initObservers();
	SBstatus.init();
	SBtrade.init();
	SBtrade.refresh();
	STdragObserver = 
	{
		onDragStart : function(event, transferData, action)
		{
			var curID = SBlist.currentItem.id;
			transferData.data = new TransferData();
			transferData.data.addDataForFlavour("sb/tradeitem", curID);
		},
		onDrop     : function(event, transferData, session) {},
		onDragExit : function(event, session) {}
	};
	STdropObserver = 
	{
		getSupportedFlavours : function()
		{
			var flavours = new FlavourSet();
			flavours.appendFlavour("moz/rdfitem");
			return flavours;
		},
		onDrop : function(event, transferData, session)
		{
			SBexport.exec();
		},
		onDragOver : function(event, flavour, session) {},
		onDragExit : function(event, session) {}
	};
	SBdropObserver.getSupportedFlavours = function()
	{
		var flavours = new FlavourSet();
		flavours.appendFlavour("moz/rdfitem");
		flavours.appendFlavour("sb/tradeitem");
		return flavours;
	};
	SBbuilderObserver.onDrop = function(row, orient)
	{
		try {
			var XferDataSet  = nsTransferable.get(SBdropObserver.getSupportedFlavours(), nsDragAndDrop.getDragData, true);
			var XferData     = XferDataSet.first.first;
			var XferDataType = XferData.flavour.contentType;
		} catch(ex) {
			alert("ScrapBook Exception: Failed to get contentType of XferData.");
		}
		switch ( XferDataType )
		{
			case "moz/rdfitem"  : SBdropUtil.move(row, orient); break;
			case "sb/tradeitem" : SBimport.exec(row, orient); break;
		}
		SB_rebuildAllTree();
	};
}




var SBexport = {

	resList : [],
	number  : 0,

	exec : function()
	{
		if ( SBtree.view.isContainer(SBtree.currentIndex) && SBtree.view.selection.count == 1 )
		{
			var curRes = SBtree.builderView.getResourceAtIndex(SBtree.currentIndex);
			this.resList = [];
			this.getChildResourcesRecursively(curRes);
		}
		else
		{
			this.resList = SBtreeUtil.getSelection(true, 2);
		}
		if ( this.resList.length < 1 ) return;
		SB_trace(STstring.getString("EXPORT"));
		SBprogress.hidden = false;
		for ( this.number = 0; this.number < this.resList.length; this.number++ )
		{
			this.copyFromDataDir(this.resList[this.number]);
		}
		SB_trace(STstring.getString("EXPORT_COMPLETE"));
		SBprogress.hidden = true;
		SBtrade.refresh();
	},

	copyFromDataDir : function(aRes)
	{
		var SBitem = new ScrapBookItem();
		for ( var prop in SBitem )
		{
			SBitem[prop] = SBRDF.getProperty(prop, aRes);
		}
		SBitem.icon = SBitem.icon.match(/\d{14}\/([^\/]+)$/) ? RegExp.$1 : "";
		SBcommon.writeIndexDat(SBitem);
		var progRate = " (" + (this.number + 1) + "/" + this.resList.length + ") ";
		try {
			var myContDir = SBcommon.getContentDir(SBitem.id).clone();
			myContDir.copyTo(SBtradeDir, SBitem.id);
		} catch(ex) {
			SB_trace(STstring.getString("EXPORT_FAILURE") + progRate + SBitem.title + STstring.getString("SAME_ID"), "R");
			return;
		}
		SB_trace(STstring.getString("EXPORT_SUCCESS") + progRate + SBitem.title, "B");
		SBprogress.value = Math.round( this.number / this.resList.length * 100);
	},

	getChildResourcesRecursively : function(aContRes)
	{
		var aRDFCont = SBRDF.getContainer(aContRes.Value, false);
		var ResSet = aRDFCont.GetElements();
		while ( ResSet.hasMoreElements() )
		{
			var myRes = ResSet.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( SBservice.RDFCU.IsContainer(SBRDF.data, myRes) ) {
				this.getChildResourcesRecursively(myRes);
			} else {
				this.resList.push(myRes);
			}
		}
	},

};




var SBimport = {

	selItems : [],
	number   : 0,

	exec : function(aRow, aOrient)
	{
		if ( SBlist.selectedCount < 1 ) return;
		SBdropUtil.init(aRow, aOrient);
		var contResArray = ( aRow == -1 ) ? [SBtree.ref, 0] : SBdropUtil.getTarget();
		SB_trace(STstring.getString("IMPORT"));
		SBprogress.hidden = false;
		this.selItems = SBlist.selectedItems;
		if ( SBdropUtil.orient == SBdropUtil.DROP_ON )
		{
			for ( this.number = 0; this.number < this.selItems.length; this.number++ )
			{
				this.copyToDataDir(this.selItems[this.number].id, contResArray);
			}
		}
		else
		{
			for ( this.number = this.selItems.length - 1; this.number >= 0; this.number-- )
			{
				this.copyToDataDir(this.selItems[this.number].id, contResArray);
			}
		}
		SB_trace(STstring.getString("IMPORT_COMPLETE"));
		SBprogress.hidden = true;
	},

	copyToDataDir : function(aID, contResArray)
	{
		var myContDir = SBtradeDir.clone();
		myContDir.append(aID);
		var myDATFile = myContDir.clone();
		myDATFile.append("index.dat");
		if ( !myDATFile.exists() )
		{
			alert("ScrapBook ERROR: cannot find 'index.dat'.");
			return;
		}
		var myDAT = SBcommon.readFile(myDATFile, myDAT, "UTF-8");
		var SBitem = SB_parseIndexDat(myDAT);
		if ( !SBitem["id"] || SBitem["id"].length != 14 ) return;
		var dataDir = SBcommon.getScrapBookDir().clone();
		dataDir.append("data");
		if  ( SBitem.icon ) {
			SBitem.icon = SBcommon.convertFilePathToURL(dataDir.path) + SBitem.id + "/" + SBitem.icon;
		} else {
			SBitem.icon = SBcommon.getDefaultIcon(SBitem.type);
		}
		SBitem.title   = SBcommon.convertStringToUTF8(SBitem.title);
		SBitem.comment = SBcommon.convertStringToUTF8(SBitem.comment);
		var progNum = SBdropUtil.orient == SBdropUtil.DROP_ON ? this.number + 1 : this.selItems.length - this.number;
		var progRate = " (" + progNum + "/" + this.selItems.length + ") ";
		try {
			myContDir.copyTo(dataDir, SBitem.id);
		} catch(ex) {
			SB_trace(STstring.getString("IMPORT_FAILURE") + progRate + SBitem.title + STstring.getString("SAME_ID"), "R");
			return;
		}
		SBRDF.addItem(SBitem, contResArray[0], contResArray[1]);
		SB_trace(STstring.getString("IMPORT_SUCCESS") + progRate + SBitem.title, "B");
		SBprogress.value = Math.round( progNum / this.selItems.length * 100);
	},

};




var SBtrade = {

	init : function()
	{
		var dirPath = nsPreferences.copyUnicharPref("scrapbook.trade.path", "");
		SBtradeDir = this.validateDirectory(dirPath);
		this.initPath(dirPath);
	},

	initPath : function(aPath)
	{
		document.getElementById("ScrapBookTradePath").value = aPath;
		document.getElementById("ScrapBookTradeIcon").src = "moz-icon://" + SBcommon.convertFilePathToURL(aPath) + "?size=16";
	},

	selectPath : function()
	{
		var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		FP.init(window, STstring.getString("SELECT_PATH"), FP.modeGetFolder);
		if ( SBtradeDir ) FP.displayDirectory = SBtradeDir;
		var answer = FP.show();
		if ( answer == FP.returnOK )
		{
			var theFile = FP.file;
			if ( theFile.leafName == "data" ) { alert(STstring.getString("SELECT_PATH_ALERT")); return; }
			this.initPath(theFile.path);
			nsPreferences.setUnicharPref("scrapbook.trade.path", theFile.path);
			window.location.reload();
		}
		return false;
	},

	refresh : function()
	{
		var IDList = [], ID2Msec = {}, ID2SBitem = {};
		var contDirList = SBtradeDir.directoryEntries;
		while ( contDirList.hasMoreElements() )
		{
			var aDATFile, aID, aMsec = 0;
			aDATFile = contDirList.getNext().QueryInterface(Components.interfaces.nsIFile);
			var aID = aDATFile.leafName;
			if ( !aID.match(/^\d{14}$/) ) continue;
			aDATFile.append("index.dat");
			if ( !aDATFile.exists() ) continue;
			try {
				aMsec = aDATFile.lastModifiedTime;
			} catch(ex) {
			}
			IDList.push(aID);
			ID2Msec[aID] = aMsec;
			ID2SBitem[aID] = SB_parseIndexDat(SBcommon.readFile(aDATFile));
			SBstatus.trace(SBstring.getString("SCANNING") + "... " + aID, 1000);
		}
		IDList.sort( function(a,b){ return(ID2Msec[a] - ID2Msec[b]); });
		var oldListItems = SBlist.childNodes;
		for ( var i = oldListItems.length - 1; i > 1 ; i-- )
		{
			SBlist.removeChild(oldListItems[i]);
		}
		for ( var i = 0; i < IDList.length; i++ )
		{
			var myID = IDList[i];
			var myIcon = ID2SBitem[myID].icon;
			myIcon = myIcon ? SBcommon.convertFilePathToURL(SBtradeDir.path) + myID + "/" + myIcon : SBcommon.getDefaultIcon(ID2SBitem[myID].type);
			dump(myIcon + "\n");
			var listItem  = document.createElement("listitem");
			var listCell1 = document.createElement("listcell");
			var listCell2 = document.createElement("listcell");
			listItem.setAttribute("id", myID);
			listCell1.setAttribute("class", "listcell-iconic");
			listCell1.setAttribute("label", SBcommon.convertStringToUTF8(ID2SBitem[myID].title));
			listCell1.setAttribute("image", myIcon);
			listCell2.setAttribute("label", this.formateMilliSeconds(ID2Msec[myID]));
			listItem.appendChild(listCell1);
			listItem.appendChild(listCell2);
			SBlist.appendChild(listItem);
		}
		SB_trace(STstring.getFormattedString("DETECT", [IDList.length, SBtradeDir.path]), "G");
	},

	validateDirectory : function(aPath)
	{
		if ( !aPath ) return false;
		var aFileObj = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		try {
			aFileObj.initWithPath(aPath);
		} catch(ex) {
			alert("ScrapBook ERROR: Unrecognized path:\n" + aPath);
			return false;
		}
		if ( !aFileObj.exists() || !aFileObj.isDirectory() ) {
			alert("ScrapBook ERROR: Directory doesn't exist:\n" + aPath);
			return false;
		}
		return aFileObj;
	},

	formateMilliSeconds : function(msec)
	{
		var dd = new Date(msec);
		var y = dd.getFullYear();
		var m = dd.getMonth() + 1; if ( m < 10 ) m = "0" + m;
		var d = dd.getDate();      if ( d < 10 ) d = "0" + d;
		var h = dd.getHours();     if ( h < 10 ) h = "0" + h;
		var i = dd.getMinutes();   if ( i < 10 ) i = "0" + i;
		return [y.toString(),m.toString(),d.toString()].join("/") + " " + [h.toString(),i.toString()].join(":");
	},

	showFolder : function()
	{
		SBcommon.launchDirectory(SBtradeDir);
	},

};


function SB_parseIndexDat(aDAT)
{
	var SBitem = new ScrapBookItem();
	try {
		var lines = aDAT.split("\n");
		for ( var i = 0; i < lines.length; i++ )
		{
			if ( !lines[i].match(/\t/) ) continue;
			var keyVal = lines[i].split("\t");
			SBitem[keyVal[0]] = keyVal[1];
		}
	} catch(ex) {
	}
	return SBitem;
}




var SBtradeContext = {

	open : function(tabbed)
	{
		var myID   = SBlist.currentItem.id;
		var myType = SBlist.currentItem.getAttribute("type");
		var myURL  = SBservice.IO.newFileURI(SBtradeDir).spec + myID + "/index.html";
		SBcommon.loadURL(myURL, tabbed);
	},

	showFiles : function()
	{
		var myContDir = SBtradeDir.clone();
		myContDir.append(SBlist.currentItem.id);
		SBcommon.launchDirectory(myContDir);
	},

	deleteDir : function()
	{
		if ( SBlist.selectedCount < 1 ) return;
		if ( !SBcommon.getBoolPref("scrapbook.tree.quickdelete", false) )
		{
			if ( !window.confirm( SBstring.getString("CONFIRM_DELETE") ) ) return;
		}
		var selItems = SBlist.selectedItems;
		for ( var i = selItems.length - 1; i >= 0; i-- )
		{
			var myID = selItems[i].id;
			var myContDir = SBtradeDir.clone();
			myContDir.append(myID);
			if ( !myContDir.exists() ) continue;
			if ( myID.length == 14 ) SBcommon.removeDirSafety(myContDir);
			SBlist.removeItemAt( SBlist.getIndexOfItem(selItems[i]) + 2 );
		}
	},

	showIndexDat : function()
	{
		var myDAT = SBtradeDir.clone();
		myDAT.append(SBlist.currentItem.id);
		myDAT.append("index.dat");
		if ( !myDAT.exists() ) return;
		var SBitem = SB_parseIndexDat(SBcommon.readFile(myDAT));
		var content = "";
		for ( var prop in SBitem )
		{
			content += prop + " : " + SBcommon.convertStringToUTF8(SBitem[prop]) + "\n";
		}
		alert(content);
	},

};


