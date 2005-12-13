
var sbCalc = {

	get TREE()     { return document.getElementById("ScrapBookTree"); },
	get STRING()   { return document.getElementById("ScrapBookString"); },
	get STATUS()   { return document.getElementById("ScrapBookMessage"); },
	get PROGRESS() { return document.getElementById("ScrapBookProgress"); },

	dirEnum : null,
	treeItems : [],
	count : 0,
	total : 0,
	grandSum : 0,
	invalidCount : 0,

	exec : function()
	{
		sbDataSource.init();
		var resEnum = sbDataSource.data.GetAllResources();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext();
			if ( !SBservice.RDFCU.IsContainer(sbDataSource.data, res) ) this.total++;
		}
		var dataDir = SBcommon.getScrapBookDir().clone();
		dataDir.append("data");
		this.dirEnum = dataDir.directoryEntries;
		this.processAsync();
	},

	processAsync : function()
	{
		if ( !this.dirEnum.hasMoreElements() )
		{
			this.finish();
			return;
		}
		this.count++;
		var dir = this.dirEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
		var id = dir.leafName;
		var bytes = sbPropUtil.getTotalFileSize(id)[0];
		this.grandSum += bytes;
		var res   = SBservice.RDF.GetResource("urn:scrapbook:item" + id);
		var valid = sbDataSource.exists(res);
		var icon  = sbDataSource.getProperty("icon", res);
		if ( !icon ) icon = SBcommon.getDefaultIcon(sbDataSource.getProperty("type", res));
		this.treeItems.push([
			id,
			sbDataSource.getProperty("type",  res),
			sbDataSource.getProperty("title", res),
			icon,
			bytes,
			sbPropUtil.formatFileSize(bytes),
			valid,
		]);
		if ( !valid ) this.invalidCount++;

		this.STATUS.label   = this.STRING.getString("CALCULATING") + "... (" + this.count + "/" + this.total + ")";
		this.PROGRESS.value = Math.round(this.count / this.total * 100);
		setTimeout(function() { sbCalc.processAsync(); }, 0);
	},

	finish : function()
	{
		sbCustomTreeUtil.heapSort(this.treeItems, 4);
		this.treeItems.reverse();
		this.initTree();
		this.STATUS.label = "";
		this.PROGRESS.hidden = true;
		var msg = sbPropUtil.formatFileSize(this.grandSum);
		msg += "  " + this.STRING.getFormattedString("ITEMS_COUNT", [this.count]);
		document.getElementById("ScrapBookTotalSize").value = msg;
		msg = ( this.invalidCount == 0 ) ? this.STRING.getString("DIAGNOSIS_OK") : this.STRING.getFormattedString("DIAGNOSIS_NG", [this.invalidCount]);
		document.getElementById("ScrapBookDiagnosis").value = msg;
		setTimeout(function(){ sbCalc.checkBackup(); }, 0);
	},

	checkBackup : function()
	{
		var myDir = SBcommon.getScrapBookDir().clone();
		myDir.append("backup");
		if ( !myDir.exists() ) return;
		var count = 0;
		var fileEnum = myDir.directoryEntries;
		while ( fileEnum.hasMoreElements() ) { fileEnum.getNext(); count++; }
		if ( count > 30 )
		{
			alert(this.STRING.getString("TOO_MANY_BACKUP_FILES"));
			SBcommon.launchDirectory(myDir);
		}
	},

	initTree : function()
	{
		var colIDs = [
			"sbTreeColTitle",
			"sbTreeColSize",
			"sbTreeColState",
		];
		var treeView = new sbCustomTreeView(colIDs, this.treeItems);
		treeView.getCellText = function(row, col)
		{
			switch ( this.normalizeColumnIndex(col) )
			{
				case 0 : return this._items[row][2]; break;
				case 1 : return this._items[row][5]; break;
				case 2 : return this._items[row][6] ? "" : sbCalc.STRING.getString("INVALID"); break;
			}
		};
		treeView.getImageSrc = function(row, col)
		{
			if ( col == "sbTreeColTitle" || col.index == 0 ) return this._items[row][3];
		};
		treeView.getCellProperties = function(row, col, properties)
		{
			if ( this._items[row][6] ) return;
			const ATOM = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
			properties.AppendElement(ATOM.getAtom("markedRed"));
		};
		treeView.cycleHeader = function(col, elem)
		{
			if ( elem )
				sbCustomTreeUtil.sortItems(sbCalc, elem);
			else
				sbCustomTreeUtil.sortItems(sbCalc, col.element);
		};
		this.TREE.view = treeView;
	},

};




var sbCalcControl = {

	get CURRENT_TREEITEM()
	{
		return sbCalc.treeItems[sbCalc.TREE.currentIndex];
	},

	createPopupMenu : function(aEvent)
	{
		var valid = this.CURRENT_TREEITEM[6];
		document.getElementById("ScrapBookTreePopupD").setAttribute("disabled", valid);
		document.getElementById("ScrapBookTreePopupP").setAttribute("disabled", !valid);
	},

	onDblClick : function(aEvent)
	{
		if ( aEvent.button == 0 && aEvent.originalTarget.localName == "treechildren" ) this.open(false);
	},

	open : function(tabbed)
	{
		var id   = this.CURRENT_TREEITEM[0];
		var type = this.CURRENT_TREEITEM[1];
		SBcommon.loadURL(SBcommon.getURL(id, type), tabbed);
	},

	remove : function()
	{
		var id = this.CURRENT_TREEITEM[0];
		if ( id.length != 14 ) return;
		if ( SBcommon.removeDirSafety(SBcommon.getContentDir(id), true) )
		{
			sbCalc.treeItems.splice(sbCalc.TREE.currentIndex, 1);
			sbCalc.initTree();
		}
	},

	forward : function(key)
	{
		var id = this.CURRENT_TREEITEM[0];
		switch ( key )
		{
			case "P" : window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome" ,id); break;
			case "L" : SBcommon.launchDirectory(SBcommon.getContentDir(id));
			default  : break;
		}
	},

};


