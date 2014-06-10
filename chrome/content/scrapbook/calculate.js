
var sbCalcService = {

	get TREE()     { return document.getElementById("sbTree"); },
	get STRING()   { return document.getElementById("sbPropString"); },
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
		var resEnum = ScrapBookData.dataSource.GetAllResources();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext();
			if ( !ScrapBookData.isContainer(res) ) this.total++;
		}
		var dataDir = ScrapBookUtils.getScrapBookDir().clone();
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
		var dir = this.dirEnum.getNext().QueryInterface(Ci.nsIFile);
		if ( dir.isDirectory() )
		{
			var id = dir.leafName;
			var bytes = sbPropService.getTotalFileSize(id)[0];
			this.grandSum += bytes;
			var res   = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + id);
			var valid = ScrapBookData.exists(res);
			var icon  = ScrapBookData.getProperty(res, "icon");
			if ( !icon ) icon = ScrapBookUtils.getDefaultIcon(ScrapBookData.getProperty(res, "type"));
			this.treeItems.push([
				id,
				ScrapBookData.getProperty(res, "type"),
				ScrapBookData.getProperty(res, "title"),
				icon,
				bytes,
				sbPropService.formatFileSize(bytes),
				valid,
			]);
			if ( !valid ) this.invalidCount++;
			this.STATUS.label   = this.STRING.getString("CALCULATING") + "... (" + this.count + "/" + this.total + ")";
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
		msg += "  " + this.STRING.getFormattedString("ITEMS_COUNT", [this.count]);
		document.getElementById("sbCalcTotalSize").value = msg;
		msg = ( this.invalidCount == 0 ) ? this.STRING.getString("DIAGNOSIS_OK") : this.STRING.getFormattedString("DIAGNOSIS_NG", [this.invalidCount]);
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
				case 2 : return this._items[row][6] ? "" : sbCalcService.STRING.getString("INVALID"); break;
			}
		};
		treeView.getImageSrc = function(row, col)
		{
			if ( col.index == 0 ) return this._items[row][3];
		};
		treeView.getCellProperties = function(row, col)
		{
			if ( this._items[row][6] && col.index != 0 ) return;
			return !this._items[row][6] ? "invalid" : this._items[row][1];
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
		var resList = ScrapBookData.flattenResources(ScrapBookUtils.RDF.GetResource("urn:scrapbook:root"), 0, true);
		for ( var i = 0; i < resList.length; i++ )
		{
			if ( resList[i].Value in hashTable )
			{
				ScrapBookUtils.alert("WARNING: Found double entries.\n" + ScrapBookData.getProperty(resList[i], "title"));
				var parRes = ScrapBookData.findParentResource(resList[i]);
				if ( parRes ) ScrapBookData.removeFromContainer(parRes.Value, resList[i]);
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
		var res = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + this.CURRENT_TREEITEM[0]);
		ScrapBookUtils.loadURL(ScrapBookData.getURL(res), tabbed);
	},

	remove : function()
	{
		if ( this.CURRENT_TREEITEM[6] ) return;
		var id = this.CURRENT_TREEITEM[0];
		if ( id.length != 14 ) return;
		if ( ScrapBookUtils.removeDirSafety(ScrapBookUtils.getContentDir(id), true) )
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
			case "L" : sbController.launch(ScrapBookUtils.getContentDir(id));
			default  : break;
		}
	},

};


