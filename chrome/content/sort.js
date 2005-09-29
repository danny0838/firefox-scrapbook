/**************************************************
// sort.js
// Implementation file for sort.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBsort = {

	get STRING()      { return document.getElementById("ScrapBookString"); },
	get WIZARD()      { return document.getElementById("ScrapBookSortWizard"); },
	get RADIO_GROUP() { return document.getElementById("ScrapBookSortRadioGroup"); },

	key : "",
	ascending : false,
	recursive : false,

	init : function()
	{
		this.WIZARD.getButton("cancel").hidden = true;
		this.WIZARD.getButton("back").disabled = false;
		this.WIZARD.getButton("back").label = this.STRING.getString("START_BUTTON");
		this.WIZARD.getButton("back").addEventListener("click", function(){ SBsort.exec(); }, false);
		this.RADIO_GROUP.selectedIndex = this.RADIO_GROUP.getAttribute("sortIndex");
		sbDataSource.init();
	},

	exec : function()
	{
		var rootRes;
		try {
			rootRes = window.arguments[0];
		}
		catch(ex) {
			rootRes = SBservice.RDF.GetResource("urn:scrapbook:root");;
			if ( !window.confirm(this.STRING.getString("CONFIRM_SORT")) ) return;
		}
		switch ( this.RADIO_GROUP.selectedIndex )
		{
			case 0 : this.startProcess(rootRes, 'title', true);  break;
			case 1 : this.startProcess(rootRes, 'title', false); break;
			case 2 : this.startProcess(rootRes, 'id',    true);  break;
			case 3 : this.startProcess(rootRes, 'id',    false); break;
		}
		this.RADIO_GROUP.setAttribute("sortIndex", this.RADIO_GROUP.selectedIndex);
		window.close();
	},

	startProcess : function(aRootRes, aSortKey, isAscending)
	{
		this.key = aSortKey;
		this.ascending = isAscending;
		this.recursive = document.getElementById("ScrapBookSortRecursive").getAttribute("checked");
		this.process(aRootRes);
		sbDataSource.flush();
	},

	process : function(aContRes)
	{
		var resListF = [], resListI = [], resListN = [];
		var aRDFCont = sbDataSource.getContainer(aContRes.Value, false);
		var resEnum = aRDFCont.GetElements();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( SBservice.RDFCU.IsContainer(sbDataSource.data, res) )
			{
				resListF.push(res);
				if ( this.recursive ) this.process(res);
			}
			else
			{
				( sbDataSource.getProperty("type", res) == "note" ? resListN : resListI ).push(res);
			}
		}
		resListF.sort(this.compare); if ( !this.ascending ) resListF.reverse();
		resListI.sort(this.compare); if ( !this.ascending ) resListI.reverse();
		resListN.sort(this.compare); if ( !this.ascending ) resListN.reverse();
		resListF = resListF.concat(resListI).concat(resListN); 
		for ( var i = 0; i < resListF.length; i++ )
		{
			aRDFCont.RemoveElement(resListF[i], true);
			aRDFCont.AppendElement(resListF[i]);
		}
	},

	compare : function(resA, resB)
	{
		var a = sbDataSource.getProperty(SBsort.key, resA).toUpperCase();
		var b = sbDataSource.getProperty(SBsort.key, resB).toUpperCase();
		if ( a > b ) return 1;
		if ( a < b ) return -1;
		return 0;
	},

};



