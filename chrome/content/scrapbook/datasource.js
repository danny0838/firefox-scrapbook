
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
				var iDS = Components.classes["@mozilla.org/rdf/datasource;1?name=xml-datasource"].createInstance(Components.interfaces.nsIRDFDataSource);
				sbCommonUtils.RDFCU.MakeSeq(iDS, sbCommonUtils.RDF.GetResource("urn:scrapbook:root"));
				var iFileUrl = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newFileURI(this.file);
				iDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).FlushTo(iFileUrl.spec);
			}
			var fileURL = sbCommonUtils.IO.newFileURI(this.file).spec;
			this.data = sbCommonUtils.RDF.GetDataSourceBlocking(fileURL);
		}
		catch(ex) {
			if ( !aQuietWarning ) alert("ScrapBook ERROR: Failed to initialize datasource.\n\n" + ex);
		}
		this.unshifting = sbCommonUtils.getPref("tree.unshift", false);
	},

	backup : function()
	{
		var bDir = sbCommonUtils.getScrapBookDir();
		bDir.append("backup");
		if ( !bDir.exists() ) bDir.create(bDir.DIRECTORY_TYPE, parseInt("0700", 8));
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
			var lifeTime = (new Date(parseInt(RegExp.$1, 10), parseInt(RegExp.$2, 10) - 1, parseInt(RegExp.$3, 10))).getTime();
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
		if ( !aVal ) return "";
		return aVal.replace(/[\x00-\x1F\x7F]/g, " ");
	},

	validateURI : function(aURI)
	{
		if ( aURI == "urn:scrapbook:root" || aURI == "urn:scrapbook:search" || aURI.match(/^urn:scrapbook:item\d{14}$/) ) {
			return true;
		} else {
			return false;
		}
	},

	addItem : function(aSBitem, aParName, aIdx)
	{
		if ( !this.validateURI("urn:scrapbook:item" + aSBitem.id) ) return;
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
			if (aSBitem.type == "separator") {
				const RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
				const NC_NS  = "http://home.netscape.com/NC-rdf#";
				this.data.Assert(
					newRes,
					sbCommonUtils.RDF.GetResource(RDF_NS + "type"),
					sbCommonUtils.RDF.GetResource(NC_NS + "BookmarkSeparator"),
					true
				);
			}
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
			alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_ADD_RESOURCE", [ex]));
			return false;
		}
	},

	moveItem : function(curRes, curPar, tarPar, tarRelIdx)
	{
		try {
			sbCommonUtils.RDFC.Init(this.data, curPar);
			sbCommonUtils.RDFC.RemoveElement(curRes, true);
		} catch(ex) {
			alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_ADD_RESOURCE1", [ex]));
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
			alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_ADD_RESOURCE2", [ex]));
			sbCommonUtils.RDFC.Init(this.data, sbCommonUtils.RDF.GetResource("urn:scrapbook:root"));
			sbCommonUtils.RDFC.AppendElement(curRes, true);
		}
	},

	createEmptySeq : function(aResName)
	{
		if ( !this.validateURI(aResName) ) return;
		sbCommonUtils.RDFCU.MakeSeq(this.data, sbCommonUtils.RDF.GetResource(aResName));
	},

	deleteItemDescending : function(aRes, aParRes)
	{
		sbCommonUtils.RDFC.Init(this.data, aParRes);
		sbCommonUtils.RDFC.RemoveElement(aRes, true);
		var addIDs = [];
		var rmIDs = [];
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
			alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_CLEAN_DATASOURCE", [ex]));
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



	getContainer : function(aResURI, force)
	{
		var cont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		try {
			cont.Init(this.data, sbCommonUtils.RDF.GetResource(aResURI));
		} catch(ex) {
			if ( force ) {
				if ( !this.validateURI(aResURI) ) return null;
				return sbCommonUtils.RDFCU.MakeSeq(this.data, sbCommonUtils.RDF.GetResource(aResURI));
			} else {
				return null;
			}
		}
		return cont;
	},

	clearContainer : function(ccResURI)
	{
		var ccCont = this.getContainer(ccResURI, true);
		var ccCount = ccCont.GetCount();
		for ( var ccI=ccCount; ccI>0; ccI-- )
		{
			ccCont.RemoveElementAt(ccI, true);
		}
	},

	removeFromContainer : function(aResURI, aRes)
	{
		var cont = this.getContainer(aResURI, true);
		if ( cont ) cont.RemoveElement(aRes, true);
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
		if ( typeof(aRes) == "string" )
		{
			aRes = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + aRes);
		}
		return this.data.ArcLabelsOut(aRes).hasMoreElements();
	},

	isContainer : function(aRes)
	{
		return sbCommonUtils.RDFCU.IsContainer(this.data, aRes);
	},

	identify : function(aID)
	{
		var i = 0;
		while ( this.exists(aID) && i < 100 )
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
		return null;
	},

};


