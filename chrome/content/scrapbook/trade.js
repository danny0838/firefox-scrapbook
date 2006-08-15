
function SB_trace(aStr, aColor, aBold)
{
	sbMainService.trace(aStr, 2000);
	var listBox = document.getElementById("sbTradeLog");
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
	if ( window.location.href.match(/\?res=(.*)$/) )
	{
		var resURI = RegExp.$1;
		document.getElementById("sbTradeOuter").collapsed = true;
		document.getElementById("sbTradeSplitter").collapsed = true;
		document.getElementById("sbTradeLog").collapsed = true;
		document.getElementById("status-bar").collapsed = true;
		document.getElementById("sbStatusBox").hidden = false;
		window.sizeToContent();
		document.title = document.getElementById("sbTradeExportButton").label;
		setTimeout(function(){ sbExportService.execQuickly(resURI); }, 0);
	}
	else
	{
		window.resizeTo(720,540);
		setTimeout(SB_delayedInitTrade, 0);
	}
}


function SB_delayedInitTrade()
{
	document.getElementById("sbPopupOpenTab").setAttribute("disabled", "true");
	document.getElementById("sbPopupNewNote").setAttribute("disabled", "true");
	document.getElementById("sbPopupManage").setAttribute("disabled",  "true");
	document.getElementById("sbPopupListView").setAttribute("disabled","true");
	sbMultiBookService.showButton();
	sbDataSource.init();
	sbTreeHandler.init(false);
	sbTreeDNDHandler.init();
	sbMainService.baseURL = sbCommonUtils.getBaseHref(sbDataSource.data.URI);
	sbMainService.initPrefs();
	sbTreeDNDHandler.dragDropObserver.getSupportedFlavours = function()
	{
		var flavours = new FlavourSet();
		flavours.appendFlavour("moz/rdfitem");
		flavours.appendFlavour("sb/tradeitem");
		return flavours;
	};
	sbTreeDNDHandler.builderObserver.onDrop = function(row, orient)
	{
		try {
			var XferDataSet  = nsTransferable.get(sbTreeDNDHandler.dragDropObserver.getSupportedFlavours(), nsDragAndDrop.getDragData, true);
			var XferData     = XferDataSet.first.first;
			var XferDataType = XferData.flavour.contentType;
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to get contentType of XferData.");
		}
		switch ( XferDataType )
		{
			case "moz/rdfitem"  : sbTreeDNDHandler.move(row, orient); break;
			case "sb/tradeitem" : sbImportService.exec(row, orient); break;
		}
		sbController.rebuildLocal();
	};
	sbTrader.init(false);
}




var sbTrader = {

	get TREE()     { return document.getElementById("sbTradeTree"); },
	get STRING()   { return document.getElementById("sbTradeString"); },
	get STATUS2()  { return document.getElementById("sbStatusText"); },

	locked    : false,
	context   : "import",
	treeItems : [],
	leftDir   : null,
	rightDir  : null,

	dragDropObserver : 
	{
		onDragStart : function(event, transferData, action)
		{
			if ( event.originalTarget.localName != "treechildren" ) return;
			transferData.data = new TransferData();
			transferData.data.addDataForFlavour("sb/tradeitem", sbTrader.TREE.view.selection);
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

	init : function(isQuickMode)
	{
		var dirPath = nsPreferences.copyUnicharPref("scrapbook.trade.path", "");
		if ( !dirPath ) { this.selectPath(); this.toggleLocking(true); return; }
		this.leftDir  = sbCommonUtils.getScrapBookDir();
		this.leftDir.append("data");
		this.rightDir = this.validateDirectory(dirPath);
		if ( !this.rightDir )
		{
			if ( !isQuickMode )
				this.toggleLocking(true);
			else
				window.close();
		}
		if ( !isQuickMode )
		{
			document.getElementById("sbTradePath").value = dirPath;
			document.getElementById("sbTradeIcon").src = "moz-icon://" + sbCommonUtils.convertFilePathToURL(dirPath) + "?size=16";
			sbTrader.refresh();
		}
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
			var item = this.parseIndexDat(sbCommonUtils.convertToUnicode(sbCommonUtils.readFile(file), "UTF-8"));
			if ( item.icon && !item.icon.match(/^http|moz-icon|chrome/) )
			{
				var icon = this.rightDir.clone();
				icon.append(dirName);
				item.icon = sbCommonUtils.convertFilePathToURL(icon.path) + sbCommonUtils.getFileName(item.icon);
			}
			if ( !item.icon ) item.icon = sbCommonUtils.getDefaultIcon(item.type);
			this.treeItems.push([
				item.title,
				this.formatMilliSeconds(file.lastModifiedTime),
				item.folder,
				item.id,
				item.icon,
				file.lastModifiedTime,
				dirName,
				item.type
			]);
		}
		sbCustomTreeUtil.heapSort(this.treeItems, 5);
		this.initTree();
		SB_trace(sbTrader.STRING.getFormattedString("DETECT", [this.treeItems.length, this.rightDir.path]), "G");
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
			if ( col.index == 0 ) return this._items[row][4];
		};
		treeView.getCellProperties = function(row, col, properties)
		{
			if ( col.index == 0 ) properties.AppendElement(ATOM_SERVICE.getAtom(this._items[row][7]));
		};
		treeView.cycleHeader = function(col)
		{
			sbCustomTreeUtil.sortItems(sbTrader, col.element);
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
		} else {
			window.close();
		}
	},

	validateDirectory : function(aPath)
	{
		if ( !aPath ) return false;
		var aFileObj = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		try {
			aFileObj.initWithPath(aPath);
		} catch(ex) {
			alert(this.STRING.getString("ERROR_INVALID_FILEPATH") + "\n" + aPath);
			return false;
		}
		if ( !aFileObj.exists() || !aFileObj.isDirectory() ) {
			alert(this.STRING.getString("ERROR_INVALID_FILEPATH") + "\n" + aPath);
			return false;
		}
		return aFileObj;
	},

	toggleLocking : function(willLock)
	{
		this.locked = willLock;
		sbTreeHandler.TREE.setAttribute("disabled", willLock);
		sbTrader.TREE.setAttribute("disabled", willLock);
		var elems = document.getElementById("sbTradeToolbar").childNodes;
		for ( var i = 0; i < elems.length; i++ ) elems[i].setAttribute("disabled", willLock);
	},

	toggleProgress : function(aShowHide)
	{
		document.getElementById("statusbar-progresspanel").collapsed = !aShowHide;
	},


	getCurrentDirName : function()
	{
		var curIdx = sbCustomTreeUtil.getSelection(this.TREE)[0];
		return this.treeItems[curIdx][6];
	},

	open : function(aEvent, tabbed)
	{
		if ( this.treeItems[sbCustomTreeUtil.getSelection(this.TREE)[0]][7] == "bookmark" ) return;
		sbCommonUtils.loadURL(sbCommonUtils.convertFilePathToURL(this.rightDir.path) + this.getCurrentDirName() + "/index.html", tabbed);
	},

	showFiles : function()
	{
		var dir = this.rightDir.clone();
		dir.append(this.getCurrentDirName());
		sbController.launch(dir);
	},

	deleteDir : function()
	{
		var idxList = sbCustomTreeUtil.getSelection(this.TREE);
		if ( idxList.length < 1 ) return;
		if ( !nsPreferences.getBoolPref("scrapbook.tree.quickdelete", false) )
		{
			if ( !window.confirm( sbMainService.STRING.getString("CONFIRM_DELETE") ) ) return;
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
		var item = this.parseIndexDat(sbCommonUtils.convertToUnicode(sbCommonUtils.readFile(datFile), "UTF-8"));
		var content = "";
		for ( var prop in item )
		{
			content += prop + " : " + item[prop] + "\n";
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
				if ( keyVal.length == 2 )
					item[keyVal[0]] = keyVal[1];
				else
					item[keyVal.shift()] = keyVal.join("\t");
			}
		} catch(ex) {
		}
		return item;
	},

	formatMilliSeconds : function(msec)
	{
		var dd = new Date(msec);
		return dd.toLocaleString();
	},

};




var sbExportService = {

	count : -1,
	resList : [],

	exec : function()
	{
		if ( sbTrader.locked ) return;
		if ( sbTrader.context != 'export' ) return;
		if ( sbTreeHandler.TREE.view.selection.count == 0 ) return;
		sbTrader.toggleLocking(true);
		this.count = -1;
		this.resList = [];
		if ( sbTreeHandler.TREE.currentIndex != -1 && sbTreeHandler.TREE.view.isContainer(sbTreeHandler.TREE.currentIndex) && sbTreeHandler.TREE.view.selection.count == 1 )
		{
			var curRes = sbTreeHandler.TREE.builderView.getResourceAtIndex(sbTreeHandler.TREE.currentIndex);
			this.resList = sbDataSource.flattenResources(curRes, 2, true);
		}
		else
		{
			this.resList = sbTreeHandler.getSelection(true, 2);
		}
		sbTrader.toggleProgress(true);
		this.next();
	},

	execQuickly : function(aResURI)
	{
		sbTrader.STATUS2.value = document.getElementById("sbTradeExportButton").label;
		sbDataSource.init();
		sbTrader.init(true);
		var res = sbCommonUtils.RDF.GetResource(aResURI);
		var item = new ScrapBookItem();
		for ( var prop in item ) item[prop] = sbDataSource.getProperty(res, prop);
		item.folder = this.getFolderPath(res).join("\t");
		if ( this.copyLeftToRightInternal(item) ) {
			sbTrader.STATUS2.value = document.getElementById("sbTradeExportButton").label + ": " + item.title;
			setTimeout(function(){ window.close(); }, 1500);
			if ( window.opener.location.href == "chrome://scrapbook/content/trade.xul" )
				window.opener.sbTrader.refresh();
		} else {
			sbTrader.STATUS2.value = sbTrader.STRING.getString("FAILED") + ": " + item.title;
			sbTrader.STATUS2.style.color = "#FF0000";
		}
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
		sbTrader.toggleProgress(false);
		sbTrader.refresh();
		sbTrader.toggleLocking(false);
	},

	copyLeftToRight : function()
	{
		var item = new ScrapBookItem();
		for ( var prop in item )
		{
			item[prop] = sbDataSource.getProperty(this.resList[this.count], prop);
		}
		item.folder = this.getFolderPath(this.resList[this.count]).join("\t");
		var rate = " (" + (this.count + 1) + "/" + this.resList.length + ") ";
		if ( this.copyLeftToRightInternal(item) )
			SB_trace(document.getElementById("sbTradeExportButton").label + rate + item.title, "B");
		else
			SB_trace(sbTrader.STRING.getString("FAILED") + rate + item.title, "R" ,true);
		document.getElementById("sbTradeProgress").value = Math.round( this.count / this.resList.length * 100);
	},

	copyLeftToRightInternal : function(aItem)
	{
		if ( aItem.icon && !aItem.icon.match(/^http|moz-icon|chrome/) )
		{
			aItem.icon = aItem.icon.match(/\d{14}\/([^\/]+)$/) ? RegExp.$1 : "";
		}
		var num = 0, destDir, dirName;
		do {
			dirName = sbCommonUtils.validateFileName(aItem.title).substring(0,60) || "untitled";
			if ( num > 0 ) dirName += "-" + num;
			dirName = dirName.replace(/\./g, "");
			destDir = sbTrader.rightDir.clone();
			destDir.append(dirName);
		}
		while ( destDir.exists() && ++num < 256 );
		var srcDir = sbCommonUtils.getContentDir(aItem.id, false);
		sbCommonUtils.writeIndexDat(aItem);
		if ( !srcDir.exists() || !srcDir.leafName.match(/^\d{14}$/) ) return false;
		try {
			srcDir.copyTo(sbTrader.rightDir, destDir.leafName);
		} catch(ex) {
			try {
				srcDir.copyTo(sbTrader.rightDir, aItem.id);
			} catch(ex) {
				return false;
			}
		}
		if ( aItem.type == "bookmark" ) sbCommonUtils.removeDirSafety(srcDir);
		return true;
	},

	getFolderPath : function(aRes)
	{
		var ret = [];
		for ( var i = 0; i < 32; i++ )
		{
			aRes = sbDataSource.findParentResource(aRes);
			if ( aRes.Value == "urn:scrapbook:root" ) break;
			ret.unshift(sbDataSource.getProperty(aRes, "title"));
		}
		return ret;
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
		this.restore = ( aRow == -128 ) ? document.getElementById("sbTradeOptionRestore").checked : false;
		this.tarResArray = ( aRow < 0 ) ? [sbTreeHandler.TREE.ref, 0] : sbTreeDNDHandler.getTarget(aRow, aOrient);
		sbTrader.toggleProgress(true);
		this.makeFolderTable();
		this.ascending = ( aRow < 0 ) ? true : (aOrient == 0);
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
		sbTreeHandler.TREE.builder.rebuild();
		setTimeout(function(){ sbImportService.next(); }, 300);
	},

	finalize : function()
	{
		sbTrader.toggleProgress(false);
		sbTrader.refresh();
		sbController.rebuildLocal();
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
		var dat = sbCommonUtils.convertToUnicode(sbCommonUtils.readFile(datFile), "UTF-8");
		var item = sbTrader.parseIndexDat(dat);
		if ( !item.id || item.id.length != 14 ) return;
		var destDir = sbTrader.leftDir.clone();
		if ( item.icon && !item.icon.match(/^http|moz-icon|chrome/) ) item.icon = "resource://scrapbook/data/" + item.id + "/" + item.icon;
		if ( !item.icon ) item.icon = sbCommonUtils.getDefaultIcon(item.type);
		var num  = this.ascending ? this.count + 1 : this.idxList.length - this.count;
		var rate = " (" + num + "/" + this.idxList.length + ") ";
		if ( item.type == "bookmark" )
		{
			if ( sbDataSource.exists(sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + item.id)) ) return;
			if ( document.getElementById("sbTradeOptionRemove").checked ) sbCommonUtils.removeDirSafety(srcDir, false);
		}
		else
		{
			try {
				if ( document.getElementById("sbTradeOptionRemove").checked )
					srcDir.moveTo(destDir, item.id);
				else
					srcDir.copyTo(destDir, item.id);
			} catch(ex) {
				SB_trace(sbTrader.STRING.getString("FAILED") + rate + item.title + sbTrader.STRING.getString("ERROR_SAME_ID_EXISTS"), "R", true);
				return;
			}
		}
		var folder = "";
		if ( this.restore )
		{
			this.tarResArray = ["urn:scrapbook:root", 0];
			var folderList = "folder" in item ? item.folder.split("\t") : [];
			for ( var i = 0; i < folderList.length; i++ )
			{
		 		if ( folderList[i] == "" ) continue;
				if ( folderList[i] in this.folderTable &&
					sbDataSource.getRelativeIndex(
						sbCommonUtils.RDF.GetResource(this.tarResArray[0]),
						sbCommonUtils.RDF.GetResource(this.folderTable[folderList[i]])
					) > 0 )
				{
					this.tarResArray[0] = this.folderTable[folderList[i]];
					var idx = sbTreeHandler.TREE.builderView.getIndexOfResource(sbCommonUtils.RDF.GetResource(this.tarResArray[0]));
					if ( !sbTreeHandler.TREE.view.isContainerOpen(idx) ) sbTreeHandler.TREE.view.toggleOpenState(idx);
				}
				else
				{
					var newItem = new ScrapBookItem(sbDataSource.identify(sbCommonUtils.getTimeStamp()));
					newItem.title = folderList[i];
					newItem.type = "folder";
					var newRes = sbDataSource.addItem(newItem, this.tarResArray[0], 0);
					sbDataSource.createEmptySeq(newRes.Value);
					sbTreeHandler.TREE.view.toggleOpenState(sbTreeHandler.TREE.builderView.getIndexOfResource(newRes));
					this.folderTable[newItem.title] = newRes.Value;
					this.tarResArray[0] = newRes.Value;
					SB_trace(sbTrader.STRING.getFormattedString("CREATE_FOLDER", [newItem.title]), "B", true);
				}
			}
			if ( this.tarResArray[0] != sbTreeHandler.TREE.ref ) folder = " [" + item.folder + "] ";
		}
		sbDataSource.addItem(item, this.tarResArray[0], this.tarResArray[1]);
		SB_trace(document.getElementById("sbTradeImportButton").label + rate + folder + item.title, "B");
		document.getElementById("sbTradeProgress").value = Math.round( num / this.idxList.length * 100);
	},

	makeFolderTable : function()
	{
		this.folderTable = {};
		var resList = sbDataSource.flattenResources(sbCommonUtils.RDF.GetResource("urn:scrapbook:root"), 1, true);
		for ( var i = 1; i < resList.length; i++ )
		{
			this.folderTable[sbDataSource.getProperty(resList[i], "title")] = resList[i].Value;
		}
	},

};



