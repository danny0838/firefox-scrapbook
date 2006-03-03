
var sbSortService = {

	get STRING()      { return document.getElementById("sbMainString"); },
	get WIZARD()      { return document.getElementById("sbSortWizard"); },
	get RADIO_GROUP() { return document.getElementById("sbSortRadioGroup"); },

	key : "",
	ascending : false,
	recursive : false,
	rootResource : null,
	waitTime : 0,

	init : function()
	{
		this.WIZARD.getButton("back").hidden = true;
		this.WIZARD.getButton("finish").onclick = function(){ sbSortService.exec(); };
		this.WIZARD.getButton("finish").disabled = true;
		this.RADIO_GROUP.selectedIndex = this.RADIO_GROUP.getAttribute("sortIndex");
		sbDataSource.init();
		if ( window.arguments ) {
			this.rootResource = window.arguments[0];
			this.waitTime = 2;
		} else {
			this.rootResource = sbCommonUtils.RDF.GetResource("urn:scrapbook:root");
			this.waitTime = 6;
		}
		sbSortService.countDown();
	},

	countDown : function()
	{
		sbSortService.WIZARD.getButton("finish").label = sbSortService.STRING.getString("START_BUTTON") + (this.waitTime > 0 ? " (" + this.waitTime + ")" : "");
		sbSortService.WIZARD.getButton("finish").disabled = this.waitTime > 0;
		if ( this.waitTime-- ) setTimeout(function(){ sbSortService.countDown() }, 500);
	},

	exec : function()
	{
		switch ( this.RADIO_GROUP.selectedIndex )
		{
			case 0 : this.startReverse(this.rootResource); break;
			case 1 : this.startProcess(this.rootResource, "title", true);  break;
			case 2 : this.startProcess(this.rootResource, "title", false); break;
			case 3 : this.startProcess(this.rootResource, "id",    true);  break;
			case 4 : this.startProcess(this.rootResource, "id",    false); break;
		}
		this.RADIO_GROUP.setAttribute("sortIndex", this.RADIO_GROUP.selectedIndex);
		window.close();
	},

	startReverse : function(aRootRes)
	{
		this.recursive = document.getElementById("sbSortRecursive").getAttribute("checked");
		this.reverse(aRootRes);
		sbDataSource.flush();
	},

	startProcess : function(aRootRes, aSortKey, isAscending)
	{
		this.key = aSortKey;
		this.ascending = isAscending;
		this.recursive = document.getElementById("sbSortRecursive").getAttribute("checked");
		this.process(aRootRes);
		sbDataSource.flush();
	},

	reverse : function(aContRes)
	{
		var resList = [];
		var rdfCont = sbDataSource.getContainer(aContRes.Value, false);
		var resEnum = rdfCont.GetElements();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( sbDataSource.isContainer(res) )
			{
				if ( this.recursive ) this.reverse(res);
			}
			resList.push(res);
		}
		resList.reverse();
		for ( var i = 0; i < resList.length; i++ )
		{
			rdfCont.RemoveElement(resList[i], true);
			rdfCont.AppendElement(resList[i]);
		}
	},

	process : function(aContRes)
	{
		var resListF = [], resListI = [], resListN = [];
		var rdfCont = sbDataSource.getContainer(aContRes.Value, false);
		var resEnum = rdfCont.GetElements();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( sbCommonUtils.RDFCU.IsContainer(sbDataSource.data, res) )
			{
				resListF.push(res);
				if ( this.recursive ) this.process(res);
			}
			else
			{
				( sbDataSource.getProperty(res, "type") == "note" ? resListN : resListI ).push(res);
			}
		}
		resListF.sort(this.compare); if ( !this.ascending ) resListF.reverse();
		resListI.sort(this.compare); if ( !this.ascending ) resListI.reverse();
		resListN.sort(this.compare); if ( !this.ascending ) resListN.reverse();
		resListF = resListF.concat(resListI).concat(resListN);
		for ( var i = 0; i < resListF.length; i++ )
		{
			rdfCont.RemoveElement(resListF[i], true);
			rdfCont.AppendElement(resListF[i]);
		}
	},

	compare : function(resA, resB)
	{
		var a = sbDataSource.getProperty(resA, sbSortService.key).toUpperCase();
		var b = sbDataSource.getProperty(resB, sbSortService.key).toUpperCase();
		if ( a > b ) return 1;
		if ( a < b ) return -1;
		return 0;
	},

};



