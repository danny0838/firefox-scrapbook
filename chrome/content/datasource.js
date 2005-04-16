/**************************************************
// datasource.js
// Implementation file for RDF DataSource
// 
// Description: Handles the data and tree structure
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/


var SBRDF = {


	data : null,
	file : null,



	init : function()
	{
		try {
			this.file = SBcommon.getScrapBookDir().clone();
			this.file.append("scrapbook.rdf");
			if ( !this.file.exists() )
			{
				this.file.create(this.file.NORMAL_FILE_TYPE, 0666);
				var myPath = SBservice.IO.newFileURI(this.file).spec;
				this.data = SBservice.RDF.GetDataSourceBlocking(myPath);
				this.createEmptySeq("urn:scrapbook:root");
				this.flush();
			}
			else
			{
				this.backup(8);
				var myPath = SBservice.IO.newFileURI(this.file).spec;
				this.data = SBservice.RDF.GetDataSourceBlocking(myPath);
			}
		}
		catch(ex) {
			alert("ScrapBook ERROR: Failed to initialize datasource.\n\n" + ex);
		}
	},

	backup : function(offset)
	{
		var myDir = SBcommon.getScrapBookDir().clone();
		myDir.append("backup");
		if ( !myDir.exists() ) myDir.create(myDir.DIRECTORY_TYPE, 0700);
		var backupFileName = "scrapbook_" + SBcommon.getTimeStamp().substring(0,offset) + ".rdf";
		try {
			this.file.copyTo(myDir, backupFileName);
		} catch(ex) {
		}
	},

	flush : function()
	{
		this.data.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
	},

	unregister : function()
	{
		SBservice.RDF.UnregisterDataSource(this.data);
	},



	sanitize : function(aVal)
	{
		return aVal.match(/^(<|>|&)/) ? (" " + aVal) : aVal;
	},

	addItem : function(aSBitem, aParName, aIdx)
	{
		aSBitem.title   = this.sanitize(aSBitem.title);
		aSBitem.comment = this.sanitize(aSBitem.comment);
		aSBitem.icon    = this.sanitize(aSBitem.icon);
		aSBitem.source  = this.sanitize(aSBitem.source);
		try {
			SBservice.RDFC.Init(this.data, SBservice.RDF.GetResource(aParName));
		} catch(ex) {
			if ( aParName != "urn:scrapbook:root" ) {
				this.addItem(aSBitem, "urn:scrapbook:root", 0);
			} else {
				alert("ScrapBook ERROR: Failed to initialize root container.\n\n" + ex);
				return false;
			}
		}
		try {
			var newRes = SBservice.RDF.GetResource("urn:scrapbook:item" + aSBitem.id);
			this.data.Assert(newRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "id"),      SBservice.RDF.GetLiteral(aSBitem.id),      true);
			this.data.Assert(newRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "type"),    SBservice.RDF.GetLiteral(aSBitem.type),    true);
			this.data.Assert(newRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "title"),   SBservice.RDF.GetLiteral(aSBitem.title),   true);
			this.data.Assert(newRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "chars"),   SBservice.RDF.GetLiteral(aSBitem.chars),   true);
			this.data.Assert(newRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "comment"), SBservice.RDF.GetLiteral(aSBitem.comment), true);
			this.data.Assert(newRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "icon"),    SBservice.RDF.GetLiteral(aSBitem.icon),    true);
			this.data.Assert(newRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "source"),  SBservice.RDF.GetLiteral(aSBitem.source),  true);
			if ( aIdx > 0 ) {
				SBservice.RDFC.InsertElementAt(newRes, aIdx, true);
			} else {
				SBservice.RDFC.AppendElement(newRes);
			}
			this.flush();
			return newRes;
		}
		catch(ex) {
			alert("ScrapBook ERROR: Failed to add element to datasource.\n\n" + ex);
			return false;
		}
	},

	moveItem : function(curRes, curPar, tarPar, tarRelIdx)
	{
		try {
			SBservice.RDFC.Init(this.data, curPar);
			SBservice.RDFC.RemoveElement(curRes, true);
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to move element at datasource (1).\n\n" + ex);
			return;
		}
		try {
			SBservice.RDFC.Init(this.data, tarPar);
			if ( tarRelIdx > 0 ) {
				SBservice.RDFC.InsertElementAt(curRes, tarRelIdx, true);
			} else {
				SBservice.RDFC.AppendElement(curRes);
			}
		}
		catch(ex) {
			alert("ScrapBook ERROR: Failed to move element at datasource (2).\n\n" + ex);
			SBservice.RDFC.Init(this.data, SBservice.RDF.GetResource("urn:scrapbook:root"));
			SBservice.RDFC.AppendElement(curRes, true);
		}
	},

	updateItem : function(aRes, aProp, newVal)
	{
		newVal = this.sanitize(newVal);
		try {
			aProp = SBservice.RDF.GetResource(NS_SCRAPBOOK + aProp);
			var oldVal = this.data.GetTarget(aRes, aProp, true);
			oldVal = oldVal.QueryInterface(Components.interfaces.nsIRDFLiteral);
			newVal = SBservice.RDF.GetLiteral(newVal);
			this.data.Change(aRes, aProp, oldVal, newVal);
		}
		catch(ex) {
			alert("ScrapBook ERROR: Failed to update element of datasource.\n" + ex);
		}
	},

	createEmptySeq : function(aResName)
	{
		SBservice.RDFCU.MakeSeq(this.data, SBservice.RDF.GetResource(aResName));
	},

	deleteItemDescending : function(aRes, aParRes)
	{
		SBservice.RDFC.Init(this.data, aParRes);
		SBservice.RDFC.RemoveElement(aRes, true);
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
			var ResList = this.data.GetAllResources();
			while ( ResList.hasMoreElements() )
			{
				var aRes = ResList.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				if ( aRes.Value != "urn:scrapbook:root" && aRes.Value != "urn:scrapbook:search" && !this.data.ArcLabelsIn(aRes).hasMoreElements() )
				{
					rmIDs.push( this.removeResource(aRes) );
				}
			}
		}
		catch(ex) {
			alert("ScrapBook ERROR: Failed to clean up datasource.\n" + ex);
		}
		return rmIDs;
	},

	removeResource : function(aRes)
	{
		var names = this.data.ArcLabelsOut(aRes);
		var rmID = this.getProperty("id", aRes);
		while ( names.hasMoreElements() )
		{
			try {
				var name  = names.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				var value = this.data.GetTarget(aRes, name, true);
				this.data.Unassert(aRes, name, value);
			}
			catch(ex) {
			}
		}
		return rmID;
	},



	getContainer : function(aResID, force)
	{
		var aCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		try {
			aCont.Init(this.data, SBservice.RDF.GetResource(aResID));
		} catch(ex) {
			return force ? SBservice.RDFCU.MakeSeq(this.data, SBservice.RDF.GetResource(aResID)) : null;
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

	removeElementFromContainer : function(aResID, aRes)
	{
		var aCont = this.getContainer(aResID, true);
		aCont.RemoveElement(aRes, true);
	},



	getProperty : function(aProp, aRes)
	{
		if ( aRes.Value == "urn:scrapbook:root" ) return "";
		try {
			var retVal = this.data.GetTarget(aRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + aProp), true);
			return retVal.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
		}
		catch(ex) {
			return "";
		}
	},

	identify : function(aID)
	{
		var i = 0;
		while ( this.getProperty("id", SBservice.RDF.GetResource("urn:scrapbook:item" + aID)) && i < 100 )
		{
			aID = SBcommon.getTimeStamp(--i);
			dump("*** ScrapBook IDENTIFY RESOURCE ID [" + i + "] " + aID + "\n");
		}
		return aID;
	},

	getRelativeIndex : function(aParRes, aRes)
	{
		return SBservice.RDFCU.indexOf(this.data, aParRes, aRes);
	},

	findContainerRes : function(aRes)
	{
		var ResList = this.data.GetAllResources();
		while ( ResList.hasMoreElements() )
		{
			var myRes = ResList.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( SBservice.RDFCU.IsContainer(this.data, myRes) == false ) continue;
			if ( myRes.Value == "urn:scrapbook:search" ) continue;
			if ( SBservice.RDFCU.indexOf(this.data, myRes, aRes) != -1 )
			{
				return myRes;
			}
		}
	},

};


