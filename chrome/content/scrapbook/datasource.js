
var sbDataSource = {


	data : null,
	file : null,
	unshifting : false,



	init : function(aQuietWarning)
	{
		try {
			this.file = sbCommonUtils.getScrapBookDir();
			this.file.append("scrapbook.rdf");
			if ( !this.file.exists() )
			{
				this.file.create(this.file.NORMAL_FILE_TYPE, 0666);
				var fileURL = sbCommonUtils.IO.newFileURI(this.file).spec;
				this.data = sbCommonUtils.RDF.GetDataSourceBlocking(fileURL);
				this.createEmptySeq("urn:scrapbook:root");
				this.flush();
			}
			else
			{
				var fileURL = sbCommonUtils.IO.newFileURI(this.file).spec;
				this.data = sbCommonUtils.RDF.GetDataSourceBlocking(fileURL);
			}
		}
		catch(ex) {
			if ( !aQuietWarning ) alert("ScrapBook ERROR: Failed to initialize datasource.\n\n" + ex);
		}
		this.unshifting = sbCommonUtils.getBoolPref("scrapbook.tree.unshift", false);
	},

	backup : function()
	{
		var bDir = sbCommonUtils.getScrapBookDir();
		bDir.append("backup");
		if ( !bDir.exists() ) bDir.create(bDir.DIRECTORY_TYPE, 0700);
		var bFileName = "scrapbook_" + sbCommonUtils.getTimeStamp().substring(0,8) + ".rdf";
		try {
			this.file.copyTo(bDir, bFileName);
			setTimeout(function(){ sbDataSource.cleanUpBackups(bDir); }, 1000);
		} catch(ex) {
		}
	},

	cleanUpBackups : function(bDir)
	{
		var max = 5;
		var today = (new Date()).getTime();
		var dirEnum = bDir.directoryEntries;
		while ( dirEnum.hasMoreElements() )
		{
			var entry = dirEnum.getNext().QueryInterface(Components.interfaces.nsILocalFile);
			if ( !entry.leafName.match(/^scrapbook_(\d{4})(\d{2})(\d{2})\.rdf$/) ) continue;
			var lifeTime = new Date(parseInt(RegExp.$1), parseInt(RegExp.$2)-1, parseInt(RegExp.$3));
			lifeTime = Math.round((today - lifeTime) / (1000 * 60 * 60 * 24));
			if ( lifeTime > 30 && --max >= 0 )
			{
				entry.remove(false);
			}
		}
	},

	flush : function()
	{
		this.data.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
	},

	unregister : function()
	{
		sbCommonUtils.RDF.UnregisterDataSource(this.data);
	},



	sanitize : function(aVal)
	{
		return aVal.replace(/[\x00-\x1F\x7F]/g, " ");
	},

	addItem : function(aSBitem, aParName, aIdx)
	{
		aSBitem.title   = this.sanitize(aSBitem.title);
		aSBitem.comment = this.sanitize(aSBitem.comment);
		aSBitem.icon    = this.sanitize(aSBitem.icon);
		aSBitem.source  = this.sanitize(aSBitem.source);
		try {
			var cont = this.getContainer(aParName, false);
			if ( !cont )
			{
				cont = this.getContainer("urn:scrapbook:root", false);
				aIdx = 0;
			}
			var newRes = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + aSBitem.id);
			this.data.Assert(newRes, sbCommonUtils.RDF.GetResource(NS_SCRAPBOOK + "id"),      sbCommonUtils.RDF.GetLiteral(aSBitem.id),      true);
			this.data.Assert(newRes, sbCommonUtils.RDF.GetResource(NS_SCRAPBOOK + "type"),    sbCommonUtils.RDF.GetLiteral(aSBitem.type),    true);
			this.data.Assert(newRes, sbCommonUtils.RDF.GetResource(NS_SCRAPBOOK + "title"),   sbCommonUtils.RDF.GetLiteral(aSBitem.title),   true);
			this.data.Assert(newRes, sbCommonUtils.RDF.GetResource(NS_SCRAPBOOK + "chars"),   sbCommonUtils.RDF.GetLiteral(aSBitem.chars),   true);
			this.data.Assert(newRes, sbCommonUtils.RDF.GetResource(NS_SCRAPBOOK + "comment"), sbCommonUtils.RDF.GetLiteral(aSBitem.comment), true);
			this.data.Assert(newRes, sbCommonUtils.RDF.GetResource(NS_SCRAPBOOK + "icon"),    sbCommonUtils.RDF.GetLiteral(aSBitem.icon),    true);
			this.data.Assert(newRes, sbCommonUtils.RDF.GetResource(NS_SCRAPBOOK + "source"),  sbCommonUtils.RDF.GetLiteral(aSBitem.source),  true);
			if ( this.unshifting )
			{
				if ( aIdx == 0 || aIdx == -1 ) aIdx = 1;
			}
			if ( 0 < aIdx && aIdx < cont.GetCount() ) {
				cont.InsertElementAt(newRes, aIdx, true);
			} else {
				cont.AppendElement(newRes);
			}
			this.flush();
			return newRes;
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to add resource to datasource.\n\n" + ex);
			return false;
		}
	},

	moveItem : function(curRes, curPar, tarPar, tarRelIdx)
	{
		try {
			sbCommonUtils.RDFC.Init(this.data, curPar);
			sbCommonUtils.RDFC.RemoveElement(curRes, true);
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to move element at datasource (1).\n\n" + ex);
			return;
		}
		if ( this.unshifting )
		{
			if ( tarRelIdx == 0 || tarRelIdx == -1 ) tarRelIdx = 1;
		}
		try {
			sbCommonUtils.RDFC.Init(this.data, tarPar);
			if ( tarRelIdx > 0 ) {
				sbCommonUtils.RDFC.InsertElementAt(curRes, tarRelIdx, true);
			} else {
				sbCommonUtils.RDFC.AppendElement(curRes);
			}
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to move element at datasource (2).\n\n" + ex);
			sbCommonUtils.RDFC.Init(this.data, sbCommonUtils.RDF.GetResource("urn:scrapbook:root"));
			sbCommonUtils.RDFC.AppendElement(curRes, true);
		}
	},

	createEmptySeq : function(aResName)
	{
		sbCommonUtils.RDFCU.MakeSeq(this.data, sbCommonUtils.RDF.GetResource(aResName));
	},

	deleteItemDescending : function(aRes, aParRes)
	{
		sbCommonUtils.RDFC.Init(this.data, aParRes);
		sbCommonUtils.RDFC.RemoveElement(aRes, true);
		var rmIDs = addIDs = [];
		var depth = 0;
		do {
			addIDs = this.cleanUpIsolation();
			rmIDs = rmIDs.concat(addIDs);
		}
		while( addIDs.length > 0 && ++depth < 100 );
		return rmIDs;
	},

	cleanUpIsolation : function()
	{
		var rmIDs = [];
		try {
			var resEnum = this.data.GetAllResources();
			while ( resEnum.hasMoreElements() )
			{
				var aRes = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				if ( aRes.Value != "urn:scrapbook:root" && aRes.Value != "urn:scrapbook:search" && !this.data.ArcLabelsIn(aRes).hasMoreElements() )
				{
					rmIDs.push( this.removeResource(aRes) );
				}
			}
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to clean up datasource.\n" + ex);
		}
		return rmIDs;
	},

	removeResource : function(aRes)
	{
		var names = this.data.ArcLabelsOut(aRes);
		var rmID = this.getProperty(aRes, "id");
		while ( names.hasMoreElements() )
		{
			try {
				var name  = names.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				var value = this.data.GetTarget(aRes, name, true);
				this.data.Unassert(aRes, name, value);
			} catch(ex) {
			}
		}
		return rmID;
	},



	getContainer : function(aResID, force)
	{
		var aCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		try {
			aCont.Init(this.data, sbCommonUtils.RDF.GetResource(aResID));
		} catch(ex) {
			return force ? sbCommonUtils.RDFCU.MakeSeq(this.data, sbCommonUtils.RDF.GetResource(aResID)) : null;
		}
		return aCont;
	},

	clearContainer : function(aResID)
	{
		var aCont = this.getContainer(aResID, true);
		while( aCont.GetCount() )
		{
			aCont.RemoveElementAt(1, true);
		}
	},

	removeFromContainer : function(aResID, aRes)
	{
		var aCont = this.getContainer(aResID, true);
		if ( aCont ) aCont.RemoveElement(aRes, true);
	},



	getProperty : function(aRes, aProp)
	{
		if ( aRes.Value == "urn:scrapbook:root" ) return "";
		try {
			var retVal = this.data.GetTarget(aRes, sbCommonUtils.RDF.GetResource(NS_SCRAPBOOK + aProp), true);
			return retVal.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
		} catch(ex) {
			return "";
		}
	},

	setProperty : function(aRes, aProp, newVal)
	{
		newVal = this.sanitize(newVal);
		aProp = sbCommonUtils.RDF.GetResource(NS_SCRAPBOOK + aProp);
		try {
			var oldVal = this.data.GetTarget(aRes, aProp, true);
			oldVal = oldVal.QueryInterface(Components.interfaces.nsIRDFLiteral);
			newVal = sbCommonUtils.RDF.GetLiteral(newVal);
			this.data.Change(aRes, aProp, oldVal, newVal);
		} catch(ex) {
		}
	},

	getURL : function(aRes)
	{
		var id = aRes.Value.substring(18);
		switch ( this.getProperty(aRes, "type") )
		{
			case "folder"   : return "chrome://scrapbook/content/view.xul?id=" + id; break;
			case "note"     : return "chrome://scrapbook/content/note.xul?id=" + id; break;
			case "bookmark" : return this.getProperty(aRes, "source"); break;
			default         : return sbCommonUtils.getBaseHref(this.data.URI) + "data/" + id + "/index.html";
		}
	},

	exists : function(aRes)
	{
		return this.data.ArcLabelsOut(aRes).hasMoreElements();
	},

	isContainer : function(aRes)
	{
		return sbCommonUtils.RDFCU.IsContainer(this.data, aRes);
	},

	identify : function(aID)
	{
		var i = 0;
		while ( this.exists(sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + aID)) && i < 100 )
		{
			aID = sbCommonUtils.getTimeStamp(--i);
		}
		return aID;
	},

	getRelativeIndex : function(aParRes, aRes)
	{
		return sbCommonUtils.RDFCU.indexOf(this.data, aParRes, aRes);
	},

	flattenResources : function(aContRes, aRule, aRecursive)
	{
		var resList = [];
		if ( aRule != 2 ) resList.push(aContRes);
		sbCommonUtils.RDFC.Init(this.data, aContRes);
		var resEnum = sbCommonUtils.RDFC.GetElements();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( this.isContainer(res) ) {
				if ( aRecursive )
					resList = resList.concat(this.flattenResources(res, aRule, aRecursive));
				else
					if ( aRule != 2 ) resList.push(res);
			} else {
				if ( aRule != 1 ) resList.push(res);
			}
		}
		return resList;
	},

	findParentResource : function(aRes)
	{
		var resEnum = this.data.GetAllResources();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( !this.isContainer(res) ) continue;
			if ( res.Value == "urn:scrapbook:search" ) continue;
			if ( sbCommonUtils.RDFCU.indexOf(this.data, res, aRes) != -1 ) return res;
		}
	},

};


