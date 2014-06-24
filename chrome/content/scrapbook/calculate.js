
var sbCalcService = {

	get TREE()     { return document.getElementById("sbTree"); },
	get STATUS()   { return document.getElementById("sbCalcMessage"); },
	get PROGRESS() { return document.getElementById("sbCalcProgress"); },

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
			if ( !sbDataSource.isContainer(res) ) this.total++;
		}
		var dataDir = sbCommonUtils.getScrapBookDir().clone();
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
		if ( dir.isDirectory() )
		{
			var id = dir.leafName;
			var bytes = sbPropService.getTotalFileSize(id)[0];
			this.grandSum += bytes;
			var res   = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
			var valid = sbDataSource.exists(res);
			var icon  = sbDataSource.getProperty(res, "icon");
			if ( !icon ) icon = sbCommonUtils.getDefaultIcon(sbDataSource.getProperty(res, "type"));
			this.treeItems.push([
				id,
				sbDataSource.getProperty(res, "type"),
				sbDataSource.getProperty(res, "title"),
				icon,
				bytes,
				sbPropService.formatFileSize(bytes),
				valid,
			]);
			if ( !valid ) this.invalidCount++;
			this.STATUS.label   = sbCommonUtils.lang("property", "CALCULATING") + "... (" + this.count + "/" + this.total + ")";
			this.PROGRESS.value = Math.round(this.count / this.total * 100);
		}
		setTimeout(function() { sbCalcService.processAsync(); }, 0);
	},

	finish : function()
	{
		sbCustomTreeUtil.heapSort(this.treeItems, 4);
		this.treeItems.reverse();
		this.initTree();
		this.STATUS.label = "";
		this.PROGRESS.hidden = true;
		var msg = sbPropService.formatFileSize(this.grandSum);
		msg += "  " + sbCommonUtils.lang("property", "ITEMS_COUNT", [this.count]);
		document.getElementById("sbCalcTotalSize").value = msg;
		msg = ( this.invalidCount == 0 ) ? sbCommonUtils.lang("property", "DIAGNOSIS_OK") : sbCommonUtils.lang("property", "DIAGNOSIS_NG", [this.invalidCount]);
		document.getElementById("sbCalcDiagnosis").value = msg;
		this.checkDoubleEntries();
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
			switch ( col.index )
			{
				case 0 : return this._items[row][2]; break;
				case 1 : return this._items[row][5]; break;
				case 2 : return this._items[row][6] ? "" : sbCommonUtils.lang("property", "INVALID"); break;
			}
		};
		treeView.getImageSrc = function(row, col)
		{
			if ( col.index == 0 ) return this._items[row][3];
		};
		treeView.getCellProperties = function(row, col, properties)
		{
			if ( this._items[row][6] && col.index != 0 ) return "";
			var val = !this._items[row][6] ? "invalid" : this._items[row][1];
			if (sbCommonUtils._fxVer22) return val;
			else properties.AppendElement(ATOM_SERVICE.getAtom(val));
		};
		treeView.cycleHeader = function(col)
		{
			sbCustomTreeUtil.sortItems(sbCalcService, col.element);
		};
		this.TREE.view = treeView;
	},

	checkDoubleEntries : function()
	{
		var hashTable = {};
		var resList = sbDataSource.flattenResources(sbCommonUtils.RDF.GetResource("urn:scrapbook:root"), 0, true);
		for ( var i = 0; i < resList.length; i++ )
		{
			if ( resList[i].Value in hashTable )
			{
				alert(sbCommonUtils.lang("scrapbook", "WARN_DOUBLE_ENTRY", [sbDataSource.getProperty(resList[i], "title")]));
				var parRes = sbDataSource.findParentResource(resList[i]);
				if ( parRes ) sbDataSource.removeFromContainer(parRes.Value, resList[i]);
			}
			hashTable[resList[i].Value] = true;
		}
	},

};




var sbCalcController = {

	get CURRENT_TREEITEM()
	{
		return sbCalcService.treeItems[sbCalcService.TREE.currentIndex];
	},

	createPopupMenu : function(aEvent)
	{
		var valid = this.CURRENT_TREEITEM[6];
		document.getElementById("sbPopupRemove").setAttribute("disabled", valid);
		document.getElementById("sbPopupProperty").setAttribute("disabled", !valid);
	},

	onDblClick : function(aEvent)
	{
		if ( aEvent.button == 0 && aEvent.originalTarget.localName == "treechildren" ) this.open(false);
	},

	open : function(tabbed)
	{
		var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + this.CURRENT_TREEITEM[0]);
		sbCommonUtils.loadURL(sbDataSource.getURL(res), tabbed);
	},

	remove : function()
	{
		if ( this.CURRENT_TREEITEM[6] ) return;
		var id = this.CURRENT_TREEITEM[0];
		if ( id.length != 14 ) return;
		if ( sbCommonUtils.removeDirSafety(sbCommonUtils.getContentDir(id), true) )
		{
			sbCalcService.treeItems.splice(sbCalcService.TREE.currentIndex, 1);
			sbCalcService.initTree();
		}
	},

	forward : function(aCommand)
	{
		var id = this.CURRENT_TREEITEM[0];
		switch ( aCommand )
		{
			case "P" : window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome" ,id); break;
			case "L" : sbController.launch(sbCommonUtils.getContentDir(id));
			default  : break;
		}
	},

};


