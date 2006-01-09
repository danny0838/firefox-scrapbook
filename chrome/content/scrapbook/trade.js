
function SB_trace(aStr, aColor, aBold)
{
	SBstatus.trace(aStr, 2000);
	var listBox = document.getElementById("ScrapBookTradeLog");
	var listItem = listBox.appendItem(aStr);
	listBox.ensureIndexIsVisible(listBox.getRowCount() - 1);
	switch ( aColor )
	{
		case "R" : aColor = "#FF0000;"; break;
		case "G" : aColor = "#00AA33;"; break;
		case "B" : aColor = "#0000FF;"; break;
	}
	if ( aColor ) listItem.style.color = aColor;
	if ( aBold  ) listItem.style.fontWeight = "bold";
}


function SB_initTrade()
{
	SBstring   = document.getElementById("ScrapBookString");
	sbMultiBookService.showButton();
	sbDataSource.init();
	sbTreeHandler.init(false);
	SB_initObservers();
	SBbaseURL = sbCommonUtils.IO.newFileURI(sbCommonUtils.getScrapBookDir()).spec;
	SB_disablePopupMenus();
	SBdragDropObserver.getSupportedFlavours = function()
	{
		var flavours = new FlavourSet();
		flavours.appendFlavour("moz/rdfitem");
		flavours.appendFlavour("sb/tradeitem");
		return flavours;
	};
	SBbuilderObserver.onDrop = function(row, orient)
	{
		try {
			var XferDataSet  = nsTransferable.get(SBdragDropObserver.getSupportedFlavours(), nsDragAndDrop.getDragData, true);
			var XferData     = XferDataSet.first.first;
			var XferDataType = XferData.flavour.contentType;
		} catch(ex) {
			alert("ScrapBook Exception: Failed to get contentType of XferData.");
		}
		switch ( XferDataType )
		{
			case "moz/rdfitem"  : SBdropUtil.move(row, orient); break;
			case "sb/tradeitem" : sbImportService.exec(row, orient); break;
		}
		SB_rebuildAllTree();
	};
	sbTrader.init();
}




var sbTrader = {

	get TREE()     { return document.getElementById("ScrapBookTradeTree"); },
	get STRING()   { return document.getElementById("ScrapBookTradeString"); },
	get PROGRESS() { return document.getElementById("ScrapBookTradeProgress"); },

	locked    : false,
	context   : "import",
	treeItems : [],
	leftDir   : null,
	rightDir  : null,

	dragDropObserver : 
	{
		onDragStart : function(event, transferData, action)
		{
			if ( event.originalTarget.localName != 'treechildren' ) return;
			transferData.data = new TransferData();
			transferData.data.addDataForFlavour("sb/tradeitem", "dummy");
		},
		getSupportedFlavours : function()
		{
			var flavours = new FlavourSet();
			flavours.appendFlavour("moz/rdfitem");
			return flavours;
		},
		onDragOver : function(event, flavour, session) {},
		onDragExit : function(event, session) {},
		onDrop     : function(event, transferData, session)
		{
			if ( sbTrader.locked ) return;
			sbExportService.exec();
		},
	},

	init : function()
	{
		var dirPath = nsPreferences.copyUnicharPref("scrapbook.trade.path", "");
		if ( !dirPath ) { this.selectPath(); this.toggleLocking(true); return; }
		this.leftDir  = sbCommonUtils.getScrapBookDir();
		this.leftDir.append("data");
		this.rightDir = this.validateDirectory(dirPath);
		document.getElementById("ScrapBookTradePath").value = dirPath;
		document.getElementById("ScrapBookTradeIcon").src = "moz-icon://" + sbCommonUtils.convertFilePathToURL(dirPath) + "?size=16";
		sbTrader.refresh();
	},

	refresh : function()
	{
		this.treeItems = [];
		var dirEnum = this.rightDir.directoryEntries;
		while ( dirEnum.hasMoreElements() )
		{
			var file = dirEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
			var dirName = file.leafName;
			file.append("index.dat");
			if ( !file.exists() ) continue;
			var item = this.parseIndexDat(sbCommonUtils.readFile(file));
			if ( item.icon ) {
				var icon = this.rightDir.clone();
				icon.append(dirName);
				item.icon = sbCommonUtils.convertFilePathToURL(icon.path) + "/" + item.icon;
			} else {
				item.icon = sbCommonUtils.getDefaultIcon(item.type);
			}
			this.treeItems.push([
				sbCommonUtils.convertStringToUTF8(item.title),
				this.formateMilliSeconds(file.lastModifiedTime),
				sbCommonUtils.convertStringToUTF8(item.folder),
				item.id,
				item.icon,
				file.lastModifiedTime,
				dirName,
			]);
			SBstatus.trace(SBstring.getString("SCANNING") + "... " + dirName, 1000);
		}
		sbCustomTreeUtil.heapSort(this.treeItems, 5);
		this.initTree();
		SB_trace(sbTrader.STRING.getFormattedString("DETECT", [this.treeItems.length, this.rightDir.path]), "G");
		if ( this.treeItems.length == 0 ) SB_trace(sbTrader.STRING.getString("TIPS"), "R");
	},

	initTree : function()
	{
		var colIDs = [
			"sbTradeTreeColTitle",
			"sbTradeTreeColDate",
			"sbTradeTreeColFolder",
		];
		var treeView = new sbCustomTreeView(colIDs, this.treeItems);
		treeView.getImageSrc = function(row, col)
		{
			if ( col == "sbTradeTreeColTitle" || col.index == 0 ) return this._items[row][4];
		};
		treeView.cycleHeader = function(col, elem)
		{
			sbCustomTreeUtil.sortItems(sbTrader, elem);
		};
		this.TREE.view = treeView;
	},

	selectPath : function()
	{
		var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		FP.init(window, sbTrader.STRING.getString("SELECT_PATH"), FP.modeGetFolder);
		if ( this.rightDir ) FP.displayDirectory = this.rightDir;
		var answer = FP.show();
		if ( answer == FP.returnOK )
		{
			nsPreferences.setUnicharPref("scrapbook.trade.path", FP.file.path);
			window.location.reload();
		}
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

	showFolder : function()
	{
		sbCommonUtils.launchDirectory(this.rightDir);
	},

	toggleLocking : function(willLock)
	{
		this.locked = willLock;
		SBtree.setAttribute("disabled", willLock);
		sbTrader.TREE.setAttribute("disabled", willLock);
		var elems = document.getElementById("ScrapBookTradeController").childNodes;
		for ( var i = 0; i < elems.length; i++ ) elems[i].setAttribute("disabled", willLock);
	},


	getCurrentDirName : function()
	{
		var curIdx = sbCustomTreeUtil.getSelection(this.TREE)[0];
		return this.treeItems[curIdx][6];
	},

	open : function(aEvent, tabbed)
	{
		sbCommonUtils.loadURL(sbCommonUtils.convertFilePathToURL(this.rightDir.path) + this.getCurrentDirName() + "/index.html", tabbed);
	},

	showFiles : function()
	{
		var dir = this.rightDir.clone();
		dir.append(this.getCurrentDirName());
		sbCommonUtils.launchDirectory(dir);
	},

	deleteDir : function()
	{
		var idxList = sbCustomTreeUtil.getSelection(this.TREE);
		if ( idxList.length < 1 ) return;
		if ( !nsPreferences.getBoolPref("scrapbook.tree.quickdelete", false) )
		{
			if ( !window.confirm( SBstring.getString("CONFIRM_DELETE") ) ) return;
		}
		for ( var i = 0; i < idxList.length; i++ )
		{
			var dirName = this.treeItems[idxList[i]][6];
			if ( !dirName ) return;
			var dir = this.rightDir.clone();
			dir.append(dirName);
			if ( !dir.exists() ) continue;
			sbCommonUtils.removeDirSafety(dir, false);
		}
		this.refresh();
	},

	showIndexDat : function()
	{
		var datFile = this.rightDir.clone();
		datFile.append(this.getCurrentDirName());
		datFile.append("index.dat");
		if ( !datFile.exists() ) return;
		var item = this.parseIndexDat(sbCommonUtils.readFile(datFile));
		var content = "";
		for ( var prop in item )
		{
			content += prop + " : " + sbCommonUtils.convertStringToUTF8(item[prop]) + "\n";
		}
		alert(content);
	},

	onDblClick : function(aEvent)
	{
		if ( aEvent.originalTarget.localName == "treechildren" && aEvent.button == 0 ) this.open(false);
	},

	onKeyPress : function(aEvent)
	{
		switch ( aEvent.keyCode )
		{
			case 13 : this.open(false); break;
			case 46 : this.deleteDir(); break;
			default : break;
		}
	},


	parseIndexDat : function(aDAT)
	{
		var item = new ScrapBookItem();
		try {
			var lines = aDAT.split("\n");
			for ( var i = 0; i < lines.length; i++ )
			{
				if ( !lines[i].match(/\t/) ) continue;
				var keyVal = lines[i].split("\t");
				item[keyVal[0]] = keyVal[1];
			}
		} catch(ex) {
		}
		return item;
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

};




var sbExportService = {

	count : -1,
	resList : [],
	parList : [],

	exec : function()
	{
		if ( sbTrader.locked ) return;
		if ( sbTrader.context != 'export' ) return;
		if ( SBtree.view.selection.count == 0 ) return;
		sbTrader.toggleLocking(true);
		this.count = -1;
		this.resList = [];
		this.parList = [];
		if ( SBtree.currentIndex != -1 && SBtree.view.isContainer(SBtree.currentIndex) && SBtree.view.selection.count == 1 )
		{
			var curRes = SBtree.builderView.getResourceAtIndex(SBtree.currentIndex);
			this.getResourcesRecursively(curRes);
		}
		else
		{
			this.resList = sbTreeHandler.getSelection(true, 2);
		}
		SB_trace(sbTrader.STRING.getString("EXPORT"));
		sbTrader.PROGRESS.hidden = false;
		this.next();
	},

	next : function()
	{
		if ( ++this.count < this.resList.length ) {
			this.copyLeftToRight();
			setTimeout(function(){ sbExportService.next(); }, 300);
		} else {
			this.finalize();
			return;
		}
	},

	finalize : function()
	{
		SB_trace(sbTrader.STRING.getString("EXPORT_COMPLETE"));
		sbTrader.PROGRESS.hidden = true;
		sbTrader.refresh();
		sbTrader.toggleLocking(false);
	},

	copyLeftToRight : function()
	{
		var item = new ScrapBookItem();
		for ( var prop in item )
		{
			item[prop] = sbDataSource.getProperty(prop, this.resList[this.count]);
		}
		item.folder = this.parList[this.count];
		if ( !item.folder )
		{
			var idx = SBtree.builderView.getIndexOfResource(this.resList[this.count]);
			item.folder = sbDataSource.getProperty("title", SB_getParentResourceAtIndex(idx));
		}
		if ( !item.folder ) item.folder = "";
		item.icon = item.icon.match(/\d{14}\/([^\/]+)$/) ? RegExp.$1 : "";
		var num = 0;
		var destDir = sbTrader.rightDir.clone();
		var dirName = sbCommonUtils.validateFileName(item.title).substring(0,64);
		destDir.append(dirName);
		while ( destDir.exists() && num < 256 )
		{
			destDir = sbTrader.rightDir.clone();
			dirName = sbCommonUtils.validateFileName(item.title).substring(0,60) + "-" + ++num
			destDir.append(dirName)
		}
		var srcDir = sbTrader.leftDir.clone();
		srcDir.append(item.id);
		if ( !srcDir.exists() || !srcDir.leafName.match(/^\d{14}$/) ) return;
		var rate = " (" + (this.count + 1) + "/" + this.resList.length + ") ";
		try {
			srcDir.copyTo(sbTrader.rightDir, dirName);
		} catch(ex) {
			try {
				srcDir.copyTo(sbTrader.rightDir, item.id);
			} catch(ex) {
				SB_trace(sbTrader.STRING.getString("EXPORT_FAILURE") + rate + item.title, "R" ,true);
				return;
			}
		}
		destDir.append("index.dat");
		sbCommonUtils.writeIndexDat(item, destDir);
		SB_trace(sbTrader.STRING.getString("EXPORT_SUCCESS") + rate + item.title, "B");
		sbTrader.PROGRESS.value = Math.round( this.count / this.resList.length * 100);
	},

	getResourcesRecursively : function(aContRes)
	{
		var resEnum = sbDataSource.getContainer(aContRes.Value, false).GetElements();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( sbCommonUtils.RDFCU.IsContainer(sbDataSource.data, res) ) {
				this.getResourcesRecursively(res);
			} else {
				this.resList.push(res);
				this.parList.push(sbDataSource.getProperty("title", aContRes));
			}
		}
	},

};




var sbImportService = {

	count   : -1,
	idxList : [],
	restore   : false,
	ascending : false,
	tarResArray : [],
	folderTable : {},

	exec : function(aRow, aOrient)
	{
		if ( sbTrader.locked ) return;
		if ( sbTrader.context != 'import' ) return;
		if ( sbTrader.TREE.view.selection.count == 0 ) return;
		sbTrader.toggleLocking(true);
		this.restore = ( aRow == -128 ) ? document.getElementById("ScrapBookTradeRestore").checked : false;
		SBdropUtil.init(aRow, aOrient);
		this.tarResArray = ( aRow < 0 ) ? [SBtree.ref, 0] : SBdropUtil.getTarget();
		SB_trace(sbTrader.STRING.getString("IMPORT"));
		sbTrader.PROGRESS.hidden = false;
		this.makeFolderTable();
		this.ascending = ( aRow < 0 ) ? true : (SBdropUtil.orient == SBdropUtil.DROP_ON);
		this.idxList   = sbCustomTreeUtil.getSelection(sbTrader.TREE);
		this.count     = this.ascending ? -1 : this.idxList.length;
		this.next();
	},

	next : function()
	{
		if ( this.ascending )
		{
			if ( ++this.count < this.idxList.length ) {
				this.copyRightToLeft();
			} else {
				this.finalize(); return;
			}
		}
		else
		{
			if ( --this.count >= 0 ) {
				this.copyRightToLeft();
			} else {
				this.finalize(); return;
			}
		}
		SBtree.builder.rebuild();
		setTimeout(function(){ sbImportService.next(); }, 300);
	},

	finalize : function()
	{
		SB_trace(sbTrader.STRING.getString("IMPORT_COMPLETE"));
		sbTrader.PROGRESS.hidden = true;
		SB_rebuildAllTree();
		sbTrader.toggleLocking(false);
	},

	copyRightToLeft : function()
	{
		var dirName = sbTrader.treeItems[this.idxList[this.count]][6];
		var srcDir = sbTrader.rightDir.clone();
		srcDir.append(dirName);
		if ( !srcDir.exists() ) return;
		var datFile = srcDir.clone();
		datFile.append("index.dat");
		if ( !datFile.exists() )
		{
			alert("ScrapBook ERROR: Could not find 'index.dat'.");
			return;
		}
		var dat = sbCommonUtils.readFile(datFile);
		var item = sbTrader.parseIndexDat(dat);
		if ( !item.id || item.id.length != 14 ) return;
		var destDir = sbTrader.leftDir.clone();
		if  ( item.icon )
			item.icon = sbCommonUtils.convertFilePathToURL(destDir.path) + item.id + "/" + item.icon;
		else
			item.icon = sbCommonUtils.getDefaultIcon(item.type);
		item.title   = sbCommonUtils.convertStringToUTF8(item.title);
		item.folder  = sbCommonUtils.convertStringToUTF8(item.folder);
		item.comment = sbCommonUtils.convertStringToUTF8(item.comment);
		var num  = this.ascending ? this.count + 1 : this.idxList.length - this.count;
		var rate = " (" + num + "/" + this.idxList.length + ") ";
		try {
			srcDir.copyTo(destDir, item.id);
		} catch(ex) {
			SB_trace(sbTrader.STRING.getString("IMPORT_FAILURE") + rate + item.title + sbTrader.STRING.getString("SAME_ID"), "R", true);
			return;
		}
		var folder = "";
		if ( this.restore )
		{
			if ( this.folderTable[item.folder] ) 
			{
				this.tarResArray[0] = this.folderTable[item.folder];
			}
			else
			{
				var newItem = new ScrapBookItem(sbDataSource.identify(sbCommonUtils.getTimeStamp()));
				newItem.title = item.folder;
				newItem.type = "folder";
				var newRes = sbDataSource.addItem(newItem, "urn:scrapbook:root", 0);
				sbDataSource.createEmptySeq(newRes.Value);
				SB_trace(sbTrader.STRING.getFormattedString("CREATE_FOLDER", [newItem.title]), "B", true);
				this.folderTable[item.folder] = newRes.Value;
				this.tarResArray[0] = newRes.Value;
			}
			this.tarResArray[1] = 0;
			if ( this.tarResArray[0] != SBtree.ref ) folder = " [" + item.folder + "] ";
		}
		sbDataSource.addItem(item, this.tarResArray[0], this.tarResArray[1]);
		SB_trace(sbTrader.STRING.getString("IMPORT_SUCCESS") + rate + folder + item.title, "B");
		sbTrader.PROGRESS.value = Math.round( num / this.idxList.length * 100);
	},

	makeFolderTable : function()
	{
		this.folderTable = {};
		var resEnum = sbDataSource.data.GetAllResources();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( res.Value != "urn:scrapbook:search" && sbCommonUtils.RDFCU.IsContainer(sbDataSource.data, res) )
			{
				this.folderTable[sbDataSource.getProperty("title", res)] = res.Value;
			}
		}
	},

};



