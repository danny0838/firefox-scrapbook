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

var STdragObserver = {};
var STdropObserver = {};



function SB_trace(aStr, aKey)
{
	SBstatus.trace(aStr, 2000);
	var listItem = SBlog.appendItem(aStr);
	SBlog.ensureIndexIsVisible(SBlog.getRowCount() - 1);
	var style;
	switch ( aKey )
	{
		case "R" : style = "color:#FF0000;font-weight:bold;"; break;
		case "G" : style = "color:#00AA33;"; break;
		case "B" : style = "color:#0000FF;"; break;
	}
	if ( aKey ) listItem.setAttribute("style", style);
}


function SB_initTrade()
{
	SBlog      = document.getElementById("ScrapBookTradeLog");
	SBlist     = document.getElementById("ScrapBookTradeList");
	SBstring   = document.getElementById("ScrapBookString");
	STstring   = document.getElementById("ScrapBookTradeString");
	SBprogress = document.getElementById("ScrapBookTradeProgress");
	SBbaseURL = SBservice.IO.newFileURI(SBcommon.getScrapBookDir()).spec;
	SB_disablePopupMenus();
	sbDataSource.init();
	SBtreeUtil.init("ScrapBookTree", false);
	SB_initObservers();
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
	count  : 0,

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
		for ( this.count = 0; this.count < this.resList.length; this.count++ )
		{
			this.copyFromDataDir(this.resList[this.count]);
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
			SBitem[prop] = sbDataSource.getProperty(prop, aRes);
		}
		SBitem.icon = SBitem.icon.match(/\d{14}\/([^\/]+)$/) ? RegExp.$1 : "";
		SBcommon.writeIndexDat(SBitem);
		var progRate = " (" + (this.count + 1) + "/" + this.resList.length + ") ";
		var num = 0;
		var destDir = SBtradeDir.clone();
		var dirName = SBcommon.validateFileName(SBitem.title).substring(0,64);
		destDir.append(dirName);
		while ( destDir.exists() && num < 256 )
		{
			destDir = SBtradeDir.clone();
			dirName = SBcommon.validateFileName(SBitem.title).substring(0,60) + "-" + ++num
			destDir.append(dirName)
		}
		var srcDir = SBcommon.getContentDir(SBitem.id).clone();
		try {
			srcDir.copyTo(SBtradeDir, dirName);
		} catch(ex) {
			try {
				srcDir.copyTo(SBtradeDir, SBitem.id);
			} catch(ex) {
				SB_trace(STstring.getString("EXPORT_FAILURE") + progRate + SBitem.title, "R");
				return;
			}
		}
		SB_trace(STstring.getString("EXPORT_SUCCESS") + progRate + SBitem.title, "B");
		SBprogress.value = Math.round( this.count / this.resList.length * 100);
	},

	getChildResourcesRecursively : function(aContRes)
	{
		var aRDFCont = sbDataSource.getContainer(aContRes.Value, false);
		var ResSet = aRDFCont.GetElements();
		while ( ResSet.hasMoreElements() )
		{
			var myRes = ResSet.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( SBservice.RDFCU.IsContainer(sbDataSource.data, myRes) ) {
				this.getChildResourcesRecursively(myRes);
			} else {
				this.resList.push(myRes);
			}
		}
	},

};




var SBimport = {

	selItems : [],
	count   : 0,

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
			for ( this.count = 0; this.count < this.selItems.length; this.count++ )
			{
				this.copyToDataDir(this.selItems[this.count], contResArray);
			}
		}
		else
		{
			for ( this.count = this.selItems.length - 1; this.count >= 0; this.count-- )
			{
				this.copyToDataDir(this.selItems[this.count], contResArray);
			}
		}
		SB_trace(STstring.getString("IMPORT_COMPLETE"));
		SBprogress.hidden = true;
	},

	copyToDataDir : function(aListItem, contResArray)
	{
		var srcDir = SBtradeDir.clone();
		srcDir.append(aListItem.getAttribute("dirName"));
		var datFile = srcDir.clone();
		datFile.append("index.dat");
		if ( !datFile.exists() )
		{
			alert("ScrapBook ERROR: cannot find 'index.dat'.");
			return;
		}
		var dat = SBcommon.readFile(datFile);
		var SBitem = SB_parseIndexDat(dat);
		if ( !SBitem.id || SBitem.id.length != 14 ) return;
		var destDir = SBcommon.getScrapBookDir().clone();
		destDir.append("data");
		if  ( SBitem.icon ) {
			SBitem.icon = SBcommon.convertFilePathToURL(destDir.path) + SBitem.id + "/" + SBitem.icon;
		} else {
			SBitem.icon = SBcommon.getDefaultIcon(SBitem.type);
		}
		SBitem.title   = SBcommon.convertStringToUTF8(SBitem.title);
		SBitem.comment = SBcommon.convertStringToUTF8(SBitem.comment);
		var num  = SBdropUtil.orient == SBdropUtil.DROP_ON ? this.count + 1 : this.selItems.length - this.count;
		var rate = " (" + num + "/" + this.selItems.length + ") ";
		try {
			srcDir.copyTo(destDir, SBitem.id);
		} catch(ex) {
			SB_trace(STstring.getString("IMPORT_FAILURE") + rate + SBitem.title + STstring.getString("SAME_ID"), "R");
			return;
		}
		sbDataSource.addItem(SBitem, contResArray[0], contResArray[1]);
		SB_trace(STstring.getString("IMPORT_SUCCESS") + rate + SBitem.title, "B");
		SBprogress.value = Math.round( num / this.selItems.length * 100);
	},

};




var SBtrade = {

	init : function()
	{
		var dirPath = nsPreferences.copyUnicharPref("scrapbook.trade.path", "");
		if ( !dirPath ) this.selectPath();
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
			this.initPath(theFile.path);
			nsPreferences.setUnicharPref("scrapbook.trade.path", theFile.path);
			window.location.reload();
		}
		return false;
	},

	refresh : function()
	{
		var listItems = [];
		var dirEnum = SBtradeDir.directoryEntries;
		while ( dirEnum.hasMoreElements() )
		{
			var file = dirEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
			var dirName = file.leafName;
			file.append("index.dat");
			if ( !file.exists() ) continue;
			var SBitem = SB_parseIndexDat(SBcommon.readFile(file));
			listItems.push([
				SBitem.id,
				SBitem.type,
				SBitem.title,
				SBitem.icon,
				dirName,
				file.lastModifiedTime,
			]);
			SBstatus.trace(SBstring.getString("SCANNING") + "... " + dirName, 1000);
		}
		sbCalc.heapSort(listItems, 5);
		var litems = SBlist.childNodes;
		for ( var i = litems.length - 1; i > 1 ; i-- )
		{
			SBlist.removeChild(litems[i]);
		}
		for ( var i = 0; i < listItems.length; i++ )
		{
			var icon = listItems[i][3];
			if ( icon ) {
				var file = SBtradeDir.clone();
				file.append(listItems[i][4]);
				file.append(icon);
				icon = SBservice.IO.newFileURI(file).spec;
			} else {
				icon = SBcommon.getDefaultIcon(listItems[i][1]);
			}
			var litem  = document.createElement("listitem");
			var lcell1 = document.createElement("listcell");
			var lcell2 = document.createElement("listcell");
			litem.setAttribute("id", listItems[i][0]);
			litem.setAttribute("dirName", listItems[i][4]);
			lcell1.setAttribute("class", "listcell-iconic");
			lcell1.setAttribute("label", SBcommon.convertStringToUTF8(listItems[i][2]));
			lcell1.setAttribute("image", icon);
			lcell2.setAttribute("label", this.formateMilliSeconds(listItems[i][5]));
			litem.appendChild(lcell1);
			litem.appendChild(lcell2);
			SBlist.appendChild(litem);
		}
		SB_trace(STstring.getFormattedString("DETECT", [listItems.length, SBtradeDir.path]), "G");
		if ( listItems.length == 0 ) SB_trace(STstring.getString("TIPS"), "R");
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
		var file = SBtradeDir.clone();
		file.append(SBlist.currentItem.getAttribute("dirName"));
		file.append("index.html");
		SBcommon.loadURL(SBservice.IO.newFileURI(file).spec, tabbed);
	},

	showFiles : function()
	{
		var dir = SBtradeDir.clone();
		dir.append(SBlist.currentItem.getAttribute("dirName"));
		SBcommon.launchDirectory(dir);
	},

	deleteDir : function()
	{
		if ( SBlist.selectedCount < 1 ) return;
		if ( !nsPreferences.getBoolPref("scrapbook.tree.quickdelete", false) )
		{
			if ( !window.confirm( SBstring.getString("CONFIRM_DELETE") ) ) return;
		}
		var shouldRefresh = false;
		var selItems = SBlist.selectedItems;
		for ( var i = 0; i < selItems.length; i++ )
		{
			var dir = SBtradeDir.clone();
			dir.append(selItems[i].getAttribute("dirName"));
			if ( !dir.exists() ) continue;
			if ( SBcommon.removeDirSafety(dir, false) )	shouldRefresh = true;
		}
		if ( shouldRefresh ) SBtrade.refresh();
	},

	showIndexDat : function()
	{
		var datFile = SBtradeDir.clone();
		datFile.append(SBlist.currentItem.getAttribute("dirName"));
		datFile.append("index.dat");
		if ( !datFile.exists() ) return;
		var SBitem = SB_parseIndexDat(SBcommon.readFile(datFile));
		var content = "";
		for ( var prop in SBitem )
		{
			content += prop + " : " + SBcommon.convertStringToUTF8(SBitem[prop]) + "\n";
		}
		alert(content);
	},

};


