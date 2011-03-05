
var sbTradeService = {


	get STRING(){ return document.getElementById("sbTradeString"); },
	get TREE()  { return document.getElementById("sbTradeTree"); },


	leftDir  : null,
	rightDir : null,
	locked : false,
	treeItems : [],


	init : function()
	{
		if ( window.arguments )
		{
			document.getElementById("sbTradeHeader").collapsed = true;
			document.getElementById("sbTradeTree").collapsed = true;
			document.getElementById("sbTradeToolbar").collapsed = true;
			document.getElementById("sbTradeLog").collapsed = true;
			document.getElementById("sbTradeQuickStatus").hidden = false;
			window.sizeToContent();
			document.title = document.getElementById("sbTradeExportButton").label;
			setTimeout(function(){ sbTradeService.prepareRightDir(true); }, 100);
			return;
		}
		if ( window.top.location.href != "chrome://scrapbook/content/manage.xul" )
		{
			document.documentElement.collapsed = true;
			return;
		}
		setTimeout(function(){ sbTradeService.prepareRightDir(false); }, 100);
	},

	prepareRightDir : function(aQuickMode)
	{
		try {
			this.rightDir = ScrapBookUtils.prefBranch.getComplexValue("trade.path", Ci.nsILocalFile);
		}
		catch (ex) {
			this.lock(1);
			if (this.selectDir(aQuickMode)) {
				this.prepareRightDir(aQuickMode);
				return;
			}
			if (aQuickMode)
				window.setTimeout(function() { window.close(); }, 0);
			return;
		}
		if (!this.rightDir.exists() || !this.rightDir.isDirectory()) {
			this.lock(1);
			ScrapBookUtils.alert(this.STRING.getString("ERROR_INVALID_FILEPATH") + "\n" + this.rightDir.path);
			if (aQuickMode)
				window.setTimeout(function() { window.close(); }, 0);
			return;
		}
		if (aQuickMode) {
			sbExportService.execQuick(window.arguments[0]);
		}
		else {
			if ( this.locked ) this.lock(0);
			var fileField = document.getElementById("sbTradePath");
			fileField.file = this.rightDir;
			fileField.label = this.rightDir.path;
			this.refreshTree();
		}
	},

	selectDir : function()
	{
		var picker = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
		picker.init(window, this.STRING.getString("SELECT_PATH"), picker.modeGetFolder);
		if ( this.rightDir ) picker.displayDirectory = this.rightDir;
		var answer = picker.show();
		if ( answer == picker.returnOK ) {
			ScrapBookUtils.setPref("trade.path", picker.file.path);
			return true;
		}
		return false;
	},

	refreshTree : function()
	{
		this.treeItems = [];
		var baseURL = ScrapBookUtils.convertFilePathToURL(this.rightDir.path);
		var dirEnum = this.rightDir.directoryEntries;
		while ( dirEnum.hasMoreElements() )
		{
			var file = dirEnum.getNext().QueryInterface(Ci.nsIFile);
			var dirName = file.leafName;
			file.append("index.dat");
			if ( !file.exists() ) continue;
			var item = this.parseIndexDat(file);
			if ( item.icon && !item.icon.match(/^http|moz-icon|chrome/) )
			{
				item.icon = baseURL + dirName + "/" + item.icon;
			}
			if ( !item.icon ) item.icon = ScrapBookUtils.getDefaultIcon(item.type);
			this.treeItems.push([
				item.title,
				(new Date(file.lastModifiedTime)).toLocaleString(),
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
		this.log(this.STRING.getFormattedString("DETECT", [this.treeItems.length, this.rightDir.path]), "G");
	},

	initTree : function()
	{
		var colIDs = [
			"sbTradeTreeColTitle",
			"sbTradeTreeColDate",
			"sbTradeTreeColFolder",
		];
		var treeView = new sbCustomTreeView(colIDs, this.treeItems);
		treeView.getImageSrc = function(row, col) {
			if (this._items[row][7] == "separator")
				return;
			if (col.index == 0)
				return this._items[row][4];
		};
		treeView.getCellProperties = function(row, col, properties) {
			if (col.index == 0)
				properties.AppendElement(ATOM_SERVICE.getAtom(this._items[row][7]));
		};
		treeView.cycleHeader = function(col) {
			sbCustomTreeUtil.sortItems(sbTradeService, col.element);
		};
		treeView.isSeparator = function(row) {
			return (this._items[row][7] == "separator");
		};
		this.TREE.view = treeView;
	},

	prepareLeftDir : function()
	{
		this.leftDir = ScrapBookUtils.getScrapBookDir();
		this.leftDir.append("data");
	},


	lock : function(aLevel)
	{
		this.locked = aLevel > 0;
		var elts = document.getElementsByAttribute("group", "lockTarget");
		for ( var i = 0; i < elts.length; i++ ) elts[i].setAttribute("disabled", aLevel > 0);
		if ( window.top != window )
		{
			document.getElementById("sbTradeBrowseButton").disabled = aLevel == 2;
			window.top.document.getElementById("mbToolbarButton").disabled = aLevel == 2;
			if (window.top.document.getElementById("statusbar-progresspanel"))
				window.top.document.getElementById("statusbar-progresspanel").collapsed = aLevel != 2;
		}
	},

	log : function(aMessage, aColor, aBold)
	{
		window.top.sbMainUI.trace(aMessage, 2000);
		var listbox = document.getElementById("sbTradeLog");
		var listitem = listbox.appendItem(aMessage);
		listbox.ensureIndexIsVisible(listbox.getRowCount() - 1);
		switch ( aColor )
		{
			case "R" : aColor = "#FF0000;"; break;
			case "G" : aColor = "#00AA33;"; break;
			case "B" : aColor = "#0000FF;"; break;
		}
		if ( aColor ) listitem.style.color = aColor;
		if ( aBold  ) listitem.style.fontWeight = "bold";
	},


	parseIndexDat : function(aFile)
	{
		if ( !(aFile instanceof Ci.nsILocalFile) ) return ScrapBookUtils.alert("Invalid agurments in sbTradeService::parseIndexDat.");
		var data = ScrapBookUtils.convertToUnicode(ScrapBookUtils.readFile(aFile), "UTF-8");
		data = data.split("\n");
		if ( data.length < 2 ) return;
		var item = ScrapBookData.newItem(null);
		for ( var i = 0; i < data.length; i++ )
		{
			if ( !data[i].match(/\t/) ) continue;
			var keyVal = data[i].split("\t");
			if ( keyVal.length == 2 )
				item[keyVal[0]] = keyVal[1];
			else
				item[keyVal.shift()] = keyVal.join("\t");
		}
		return item;
	},

	getComplexTreeSelection : function()
	{
		var ret = [];
		var uriList = [];
		var selRes = window.top.sbTreeUI.getSelection(true, 0);
		for ( var i = 0; i < selRes.length; i++ )
		{
			if ( ScrapBookData.isContainer(selRes[i]) )
			{
				var childRes = ScrapBookData.flattenResources(selRes[i], 2, true);
				for ( var j = 0; j < childRes.length; j++ )
				{
					if ( uriList.indexOf(childRes[j].Value) < 0 ) { ret.push(childRes[j]); uriList.push(childRes[j].Value); }
				}
			}
			else
			{
				if ( uriList.indexOf(selRes[i].Value) < 0 ) { ret.push(selRes[i]); uriList.push(selRes[i].Value); }
			}
		}
		return ret;
	},


	getCurrentDirName : function()
	{
		var curIdx = sbCustomTreeUtil.getSelection(this.TREE)[0];
		return this.treeItems[curIdx][6];
	},

	open : function(aTabbed)
	{
		var idx = sbCustomTreeUtil.getSelection(this.TREE)[0];
		var type = this.treeItems[idx][7];
		if (type == "bookmark" || type == "separator")
			return;
		ScrapBookUtils.loadURL(
			ScrapBookUtils.convertFilePathToURL(this.rightDir.path) + this.getCurrentDirName() + "/index.html",
			aTabbed
		);
	},

	browse : function()
	{
		var dir = this.rightDir.clone();
		dir.append(this.getCurrentDirName());
		if ( dir.exists() ) window.top.sbController.launch(dir);
	},

	remove : function()
	{
		var idxList = sbCustomTreeUtil.getSelection(this.TREE);
		if ( idxList.length < 1 ) return;
		if ( !window.confirm( ScrapBookUtils.getLocaleString("CONFIRM_DELETE") ) ) return;
		for ( var i = 0; i < idxList.length; i++ )
		{
			var dirName = this.treeItems[idxList[i]][6];
			if ( !dirName ) return;
			var dir = this.rightDir.clone();
			dir.append(dirName);
			if ( !dir.exists() ) continue;
			ScrapBookUtils.removeDirSafety(dir, false);
		}
		this.refreshTree();
	},

	showProperties : function()
	{
		var datFile = this.rightDir.clone();
		datFile.append(this.getCurrentDirName());
		datFile.append("index.dat");
		if ( !datFile.exists() ) return;
		var item = this.parseIndexDat(datFile);
		var content = "";
		for ( var prop in item )
		{
			content += prop + " : " + item[prop] + "\n";
		}
		ScrapBookUtils.alert(content);
	},

	onDblClick : function(aEvent)
	{
		if ( aEvent.originalTarget.localName == "treechildren" && aEvent.button == 0 ) this.open(false);
	},

	onKeyPress : function(aEvent)
	{
		switch ( aEvent.keyCode )
		{
			case aEvent.DOM_VK_RETURN : this.open(false); break;
			case aEvent.DOM_VK_DELETE : this.remove(); break;
			default : break;
		}
	},

	onDragStart: function(event) {
		if (event.target.localName != "treechildren")
			return;
		event.dataTransfer.setData("sb/tradeitem", sbTradeService.TREE.view.selection);
		event.dataTransfer.dropEffect = "move";
	},

	onDragOver: function(event) {
		if (event.dataTransfer.types.contains("moz/rdfitem"))
			event.preventDefault();
	},

	onDrop: function(event) {
		if (sbTradeService.locked)
			return;
		sbExportService.exec();
	},

};




var sbExportService = {

	get QUICK_STATUS() { return document.getElementById("sbTradeQuickStatusText"); },

	count : -1,
	resList : [],

	exec : function()
	{
		if ( sbTradeService.locked ) return;
		if ( window.top.sbTreeUI.TREE.view.selection.count == 0 ) return;
		sbTradeService.lock(2);
		sbTradeService.prepareLeftDir();
		this.count = -1;
		this.resList = sbTradeService.getComplexTreeSelection();
		this.next();
	},

	execQuick : function(aRes)
	{
		this.QUICK_STATUS.value = document.getElementById("sbTradeExportButton").label;
		sbTradeService.prepareLeftDir();
		var title = ScrapBookData.getProperty(aRes, "title");
		try {
			this.copyLeftToRight(aRes);
		} catch(ex) {
			this.QUICK_STATUS.value = sbTradeService.STRING.getString("FAILED") + ": " + title;
			this.QUICK_STATUS.style.color = "#FF0000";
			return;
		}
		this.QUICK_STATUS.value = document.getElementById("sbTradeExportButton").label + ": " + title;
		var winEnum = ScrapBookUtils.WINDOW.getEnumerator("scrapbook");
		while ( winEnum.hasMoreElements() )
		{
			var win = winEnum.getNext().QueryInterface(Ci.nsIDOMWindow);
			if ( win.location.href != "chrome://scrapbook/content/manage.xul" ) continue;
			try {
				win.document.getElementById("sbRightPaneBrowser").contentWindow.sbTradeService.refreshTree();
			} catch(ex) {
			}
		}
		setTimeout(function(){ window.close(); }, 1500);
	},

	next : function()
	{
		if ( ++this.count < this.resList.length )
		{
			var rate = " (" + (this.count + 1) + "/" + this.resList.length + ") ";
			var title = ScrapBookData.getProperty(this.resList[this.count], "title");
			try {
				this.copyLeftToRight(this.resList[this.count]);
				sbTradeService.log(document.getElementById("sbTradeExportButton").label + rate + title, "B");
			} catch(ex) {
				sbTradeService.log(sbTradeService.STRING.getString("FAILED") + ' "' + ex + '"' + rate + title, "R", true);
			}
			window.top.document.getElementById("sbManageProgress").value = Math.round( (this.count + 1) / this.resList.length * 100);
			setTimeout(function(){ sbExportService.next(); }, 500);
		}
		else
		{
			sbTradeService.refreshTree();
			sbTradeService.lock(0);
		}
	},

	getFolderPath : function(aRes)
	{
		var ret = [];
		for ( var i = 0; i < 32; i++ )
		{
			aRes = ScrapBookData.findParentResource(aRes);
			if ( aRes.Value == "urn:scrapbook:root" ) break;
			ret.unshift(ScrapBookData.getProperty(aRes, "title"));
		}
		return ret;
	},

	copyLeftToRight : function(aRes)
	{
		if ( !ScrapBookData.exists(aRes) ) throw "Datasource changed.";
		var item = ScrapBookData.newItem();
		for ( var prop in item )
		{
			item[prop] = ScrapBookData.getProperty(aRes, prop);
		}
		item.folder = this.getFolderPath(aRes).join("\t");
		if ( item.icon && !item.icon.match(/^http|moz-icon|chrome/) )
		{
			item.icon = item.icon.match(/\d{14}\/([^\/]+)$/) ? RegExp.$1 : "";
		}
		var num = 0, destDir, dirName;
		do {
			dirName = ScrapBookUtils.validateFileName(item.title).substring(0,60) || "untitled";
			if ( num > 0 ) dirName += "-" + num;
			dirName = dirName.replace(/\./g, "");
			destDir = sbTradeService.rightDir.clone();
			destDir.append(dirName);
		}
		while ( destDir.exists() && ++num < 256 );
		var srcDir = ScrapBookUtils.getContentDir(item.id, false);
		ScrapBookUtils.writeIndexDat(item);
		if ( !srcDir.exists() || !srcDir.leafName.match(/^\d{14}$/) ) throw "Directory not found.";
		try {
			srcDir.copyTo(sbTradeService.rightDir, destDir.leafName);
		} catch(ex) {
			try {
				srcDir.copyTo(sbTradeService.rightDir, item.id);
			} catch(ex) {
				throw "Failed to copy files.";
			}
		}
		if (item.type == "bookmark" || item.type == "separator")
			ScrapBookUtils.removeDirSafety(srcDir);
	},

};




var sbImportService = {

	count   : -1,
	idxList : [],
	restoring : false,
	ascending : false,
	tarResArray : [],
	folderTable : {},
	_dataURI : "",

	exec : function(aRow, aOrient)
	{
		if ( sbTradeService.locked ) return;
		if ( sbTradeService.TREE.view.selection.count == 0 ) return;
		sbTradeService.lock(2);
		sbTradeService.prepareLeftDir();
		this._dataURI = ScrapBookData.dataSource.URI;
		this.restoring = ( aRow == -128 ) ? document.getElementById("sbTradeOptionRestore").checked : false;
		this.tarResArray = window.top.sbTreeUI._getInsertionPoint(aRow, aOrient);
		this.ascending = ( aRow < 0 ) ? true : (aOrient == 0);
		this.idxList   = sbCustomTreeUtil.getSelection(sbTradeService.TREE);
		this.count     = this.ascending ? -1 : this.idxList.length;
		this.folderTable = {};
		if ( this.restoring )
		{
			var resList = ScrapBookData.flattenResources(ScrapBookUtils.RDF.GetResource("urn:scrapbook:root"), 1, true);
			for ( var i = 1; i < resList.length; i++ )
			{
				this.folderTable[ScrapBookData.getProperty(resList[i], "title")] = resList[i].Value;
			}
		}
		this.next();
	},

	next : function()
	{
		var atEnd;
		if ( this.ascending )
			atEnd = ++this.count >= this.idxList.length;
		else
			atEnd = --this.count < 0;
		if ( !atEnd )
		{
			var num  = this.ascending ? this.count + 1 : this.idxList.length - this.count;
			var rate = " (" + num + "/" + this.idxList.length + ") ";
			var title  = sbTradeService.treeItems[this.idxList[this.count]][0];
			var folder = sbTradeService.treeItems[this.idxList[this.count]][2];
			if ( folder ) folder = " [" + folder + "] ";
			try {
				this.copyRightToLeft();
				sbTradeService.log(document.getElementById("sbTradeImportButton").label + rate + folder + title, "B");
			} catch(ex) {
				sbTradeService.log(sbTradeService.STRING.getString("FAILED") + ' "' + ex + '"' + rate + title, "R", true);
			}
			window.top.document.getElementById("sbManageProgress").value = Math.round(num / this.idxList.length * 100);
			setTimeout(function(){ sbImportService.next(); }, 500);
		}
		else
		{
			sbTradeService.refreshTree();
			sbTradeService.lock(0);
			ScrapBookUtils.refreshGlobal(false);
		}
	},

	copyRightToLeft : function()
	{
		if ( ScrapBookData.dataSource.URI != this._dataURI ) throw "Datasource changed.";
		var dirName = sbTradeService.treeItems[this.idxList[this.count]][6];
		var srcDir = sbTradeService.rightDir.clone();
		srcDir.append(dirName);
		if ( !srcDir.exists() ) throw "Directory not found.";
		var datFile = srcDir.clone();
		datFile.append("index.dat");
		if ( !datFile.exists() ) throw "index.dat not found.";
		var item = sbTradeService.parseIndexDat(datFile);
		if ( !item.id || item.id.length != 14 ) throw "Invalid ID.";
		if ( ScrapBookData.exists(item.id) ) throw sbTradeService.STRING.getString("ERROR_SAME_ID_EXISTS");
		var destDir = sbTradeService.leftDir.clone();
		if ( item.icon && !item.icon.match(/^http|moz-icon|chrome/) ) item.icon = "resource://scrapbook/data/" + item.id + "/" + item.icon;
		if ( !item.icon ) item.icon = ScrapBookUtils.getDefaultIcon(item.type);
		if ( item.type == "bookmark" || item.type == "separator" )
		{
			if ( document.getElementById("sbTradeOptionRemove").checked ) ScrapBookUtils.removeDirSafety(srcDir, false);
		}
		else
		{
			try {
				if ( document.getElementById("sbTradeOptionRemove").checked )
					srcDir.moveTo(destDir, item.id);
				else
					srcDir.copyTo(destDir, item.id);
			} catch(ex) {
				throw "Failed to copy files.";
			}
		}
		var folder = "";
		if ( this.restoring )
		{
			this.tarResArray = ["urn:scrapbook:root", 0];
			var folderList = "folder" in item ? item.folder.split("\t") : [];
			for ( var i = 0; i < folderList.length; i++ )
			{
				if ( folderList[i] == "" ) continue;
				if ( folderList[i] in this.folderTable &&
					ScrapBookData.getRelativeIndex(
						ScrapBookUtils.RDF.GetResource(this.tarResArray[0]),
						ScrapBookUtils.RDF.GetResource(this.folderTable[folderList[i]])
					) > 0 )
				{
					this.tarResArray[0] = this.folderTable[folderList[i]];
					var idx = window.top.sbTreeUI.TREE.builderView.getIndexOfResource(ScrapBookUtils.RDF.GetResource(this.tarResArray[0]));
					if ( idx >= 0 && !window.top.sbTreeUI.TREE.view.isContainerOpen(idx) ) window.top.sbTreeUI.TREE.view.toggleOpenState(idx);
				}
				else
				{
					var newItem = ScrapBookData.newItem();
					newItem.title = folderList[i];
					newItem.type = "folder";
					var newRes = ScrapBookData.addItem(newItem, this.tarResArray[0], 0);
					ScrapBookData.createEmptySeq(newRes.Value);
					var idx = window.top.sbTreeUI.TREE.builderView.getIndexOfResource(newRes);
					if ( idx >= 0 ) window.top.sbTreeUI.TREE.view.toggleOpenState(idx);
					this.folderTable[newItem.title] = newRes.Value;
					this.tarResArray[0] = newRes.Value;
					sbTradeService.log(sbTradeService.STRING.getFormattedString("CREATE_FOLDER", [newItem.title]), "B", true);
				}
			}
			if ( this.tarResArray[0] != window.top.sbTreeUI.TREE.ref ) folder = " [" + item.folder + "] ";
		}
		ScrapBookData.addItem(item, this.tarResArray[0], this.tarResArray[1]);
		ScrapBookUtils.refreshGlobal(false);
	},

};


