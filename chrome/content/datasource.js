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



	init : function()
	{
		var myFile, myPath;
		myFile = SBcommon.getScrapBookDir().clone();
		myFile.append("scrapbook.rdf");
		if ( !myFile.exists() )
		{
			myFile.create(myFile.NORMAL_FILE_TYPE, 0666);
			myPath = SBservice.IO.newFileURI(myFile).spec;
			this.data = SBservice.RDF.GetDataSourceBlocking(myPath);
			SBRDF.createEmptySeq("urn:scrapbook:root");
		}
		else
		{
			this.backup(myFile);
			myPath = SBservice.IO.newFileURI(myFile).spec;
			this.data = SBservice.RDF.GetDataSourceBlocking(myPath);
		}
	},


	backup : function(aFile)
	{
		var myDir = SBcommon.getScrapBookDir().clone();
		var bFileName = "scrapbook_" + SBcommon.getTimeStamp().substring(0,7) + ".rdf";
		try {
			aFile.copyTo(myDir, bFileName);
		} catch(ex) {
		}
	},


	unregister : function()
	{
		SBservice.RDF.UnregisterDataSource(this.data);
	},



	addItem : function(aSBitem, aParName, aIdx)
	{
		try
		{
			SBservice.RDFC.Init(this.data, SBservice.RDF.GetResource(aParName));
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
			this.data.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
			return newRes;
		}
		catch(err)
		{
			alert("ScrapBook ERROR: Probably your scrapbook.rdf is broken.");
			return false;
		}
	},


	moveItem : function(curRes, curPar, tarPar, tarRelIdx)
	{
		try
		{
			SBservice.RDFC.Init(this.data, curPar);
			SBservice.RDFC.RemoveElement(curRes, true);
			SBservice.RDFC.Init(this.data, tarPar);
			if ( tarRelIdx > 0 ) {
				SBservice.RDFC.InsertElementAt(curRes, tarRelIdx, true);
			} else {
				SBservice.RDFC.AppendElement(curRes);
			}
			this.data.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
		}
		catch(err)
		{
			alert("ScrapBook ERROR: Failed to move element at datasource.\n" + err);
		}
	},


	updateItem : function(aRes, aProp, newVal)
	{
		try
		{
			aProp = SBservice.RDF.GetResource(NS_SCRAPBOOK + aProp);
			var oldVal = this.data.GetTarget(aRes, aProp, true);
			oldVal = oldVal.QueryInterface(Components.interfaces.nsIRDFLiteral);
			newVal = SBservice.RDF.GetLiteral(newVal);
			this.data.Change(aRes, aProp, oldVal, newVal);
			this.data.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
		}
		catch(err)
		{
			alert("ScrapBook ERROR: Failed to update element of datasource.\n" + err);
		}
	},


	createEmptySeq : function(aResName)
	{
		SBservice.RDFCU.MakeSeq(this.data, SBservice.RDF.GetResource(aResName));
		this.data.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
	},


	deleteItemDescending : function(aRes, aParRes)
	{
		SBservice.RDFC.Init(this.data, aParRes);
		SBservice.RDFC.RemoveElement(aRes, true);
		var rmIDs = addIDs = [];
		var depth = 0;
		do {
			addIDs = SBRDF.cleanUpIsolation();
			rmIDs = rmIDs.concat(addIDs);
		}
		while( addIDs.length > 0 && ++depth < 100 );
		this.data.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
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
					rmIDs.push( SBRDF.removeResource(aRes) );
				}
			}
		}
		catch(err)
		{
			alert("ScrapBook ERROR: Failed to clean up datasource.\n" + err);
		}
		return rmIDs;
	},


	removeResource : function(aRes)
	{
		var names = this.data.ArcLabelsOut(aRes);
		var rmID = SBRDF.getProperty("id", aRes);
		while ( names.hasMoreElements() )
		{
			try {
				var name  = names.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				var value = this.data.GetTarget(aRes, name, true);
				this.data.Unassert(aRes, name, value);
			}
			catch(err) {
			}
		}
		this.data.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
		return rmID;
	},



	createContainer : function(aResID)
	{
		return SBservice.RDFCU.MakeSeq(this.data, SBservice.RDF.GetResource(aResID));
	},


	getContainer : function(aResID)
	{
		var aCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		try {
			aCont.Init(this.data, SBservice.RDF.GetResource(aResID));
		} catch(ex) {
			return this.createContainer(aResID);
		}
		return aCont;
	},


	clearContainer : function(aResID)
	{
		var aCont = this.getContainer(aResID);
		while( aCont.GetCount() )
		{
			aCont.RemoveElementAt(1, true);
		}
	},


	addElementToContainer : function(aResID, aRes)
	{
		var aCont = this.getContainer(aResID);
		aCont.AppendElement(aRes);
	},


	removeElementFromContainer : function(aResID, aRes)
	{
		var aCont = this.getContainer(aResID);
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
			dump("*** SCRAPBOOK_ERROR: Failed to get value. " + aRes.Value + " " + aProp + "\n");
			return "";
		}
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
	}


};


