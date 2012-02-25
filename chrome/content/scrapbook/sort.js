
var sbSortService = {

	get WIZARD()      { return document.getElementById("sbSortWizard"); },
	get RADIO_GROUP() { return document.getElementById("sbSortRadioGroup"); },

	key : "",
	ascending : false,
	index : -1,
	contResList : [],
	waitTime : 0,

	init : function()
	{
		this.WIZARD.getButton("back").hidden = true;
		this.WIZARD.getButton("finish").disabled = true;
		this.WIZARD.getButton("next").removeAttribute("accesskey");
		this.WIZARD.canAdvance = false;
		this.RADIO_GROUP.selectedIndex = this.RADIO_GROUP.getAttribute("sortIndex");
		if ( window.arguments ) {
			this.contResList = [window.arguments[0]];
			this.waitTime = 2;
		} else {
			this.contResList = [ScrapBookUtils.RDF.GetResource("urn:scrapbook:root")];
			this.waitTime = 6;
		}
		sbSortService.countDown();
	},

	countDown : function()
	{
		this.WIZARD.getButton("next").label = ScrapBookUtils.getLocaleString("START_BUTTON")
		                                    + (this.waitTime > 0 ? " (" + this.waitTime + ")" : "");
		this.WIZARD.canAdvance = this.waitTime == 0;
		if ( this.waitTime-- ) setTimeout(function(){ sbSortService.countDown() }, 500);
	},

	exec : function()
	{
		this.WIZARD.getButton("cancel").hidden = true;
		if (document.getElementById("sbSortRecursive").checked)
			this.contResList = ScrapBookData.flattenResources(this.contResList[0], 1, true);
		switch ( this.RADIO_GROUP.selectedIndex )
		{
			case 0 : break;
			case 1 : this.key = "title"; this.ascending = true;  break;
			case 2 : this.key = "title"; this.ascending = false; break;
			case 3 : this.key = "id";    this.ascending = true;  break;
			case 4 : this.key = "id";    this.ascending = false; break;
		}
		this.next();
	},

	next : function()
	{
		if ( ++this.index < this.contResList.length ) {
			document.getElementById("sbSortTextbox").value = "(" + (this.index + 1) + "/" + this.contResList.length + ")... " + ScrapBookData.getProperty(this.contResList[this.index], "title");
			this.process(this.contResList[this.index]);
		} else {
			ScrapBookData.flush();
			this.RADIO_GROUP.setAttribute("sortIndex", this.RADIO_GROUP.selectedIndex);
			window.close();
		}
	},

	process : function(aContRes)
	{
		var rdfCont = Cc['@mozilla.org/rdf/container;1'].createInstance(Ci.nsIRDFContainer);
		rdfCont.Init(ScrapBookData.dataSource, aContRes);
		var resEnum = rdfCont.GetElements();
		var resListF = [], resListI = [], resListN = [];
		if ( !this.key )
		{
			while ( resEnum.hasMoreElements() )
			{
				var res = resEnum.getNext().QueryInterface(Ci.nsIRDFResource);
				resListF.push(res);
			}
			resListF.reverse();
		}
		else
		{
			while ( resEnum.hasMoreElements() )
			{
				var res = resEnum.getNext().QueryInterface(Ci.nsIRDFResource);
				if ( ScrapBookData.isContainer(res) )
					resListF.push(res);
				else
					( ScrapBookData.getProperty(res, "type") == "note" ? resListN : resListI ).push(res);
			}
			resListF.sort(this.compare); if ( !this.ascending ) resListF.reverse();
			resListI.sort(this.compare); if ( !this.ascending ) resListI.reverse();
			resListN.sort(this.compare); if ( !this.ascending ) resListN.reverse();
			resListF = resListF.concat(resListI).concat(resListN);
		}
		for ( var i = 0; i < resListF.length; i++ )
		{
			rdfCont.RemoveElement(resListF[i], true);
			rdfCont.AppendElement(resListF[i]);
		}
		setTimeout(function(){ sbSortService.next(res); }, 0);
	},

	compare : function(resA, resB)
	{
		var a = ScrapBookData.getProperty(resA, sbSortService.key).toUpperCase();
		var b = ScrapBookData.getProperty(resB, sbSortService.key).toUpperCase();
		if ( a > b ) return 1;
		if ( a < b ) return -1;
		return 0;
	},

};



