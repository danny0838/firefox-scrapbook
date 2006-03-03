
var gArguments;
var gCustomCheckbox;
var gInDepthLevel = 0;
var gRenewResource;



function SB_initDetail()
{
	if ( !window.arguments || !("sbContentSaver" in window.opener) ) window.close();
	gArguments = window.arguments[0];
	gCustomCheckbox = document.getElementById("sbDetailCustom");
	SB_toggleLinkedCustom();
	gCustomCheckbox.nextSibling.value = nsPreferences.copyUnicharPref("scrapbook.detail.custom", "pdf, doc");
	document.documentElement.getButton("accept").label = document.getElementById("sbMainString").getString("CAPTURE_OK_BUTTON");
	document.documentElement.getButton("accept").accesskey = "C";
	SB_fillTitleList();
	if ( window.opener.sbContentSaver.item.source.indexOf("http://mail.google.com/") == 0 )
	{
		document.getElementById("sbDetailScript").disabled = true;
	}
	if ( gArguments.context == "renew" || gArguments.context == "renew-deep" )
	{
		document.getElementById("sbDetailFolderRow").collapsed = true;
		document.getElementById("sbDetailWarnAboutRenew").hidden = false;
		if ( gArguments.context == "renew-deep" )
		{
			document.getElementById("sbDetailInDepthBox").collapsed = true;
		}
		return;
	}
	setTimeout(function(){ sbFolderSelector.init(); }, 100);
}


function SB_toggleLinkedCustom()
{
	gCustomCheckbox.nextSibling.disabled = !gCustomCheckbox.checked;
}


function SB_promptForDepth()
{
	var depth = window.prompt(
		document.getElementById("sbDetailInDepthLabel").value, gInDepthLevel, document.getElementById("sbDetailInDepthBox").firstChild.label
	);
	if ( depth && !isNaN(depth) && depth >= 0 && depth < 100 )
	{
		gInDepthLevel = parseInt(depth);
		if ( gInDepthLevel <=3 )
			document.getElementById("sbDetailInDepthRadioGroup").selectedIndex = gInDepthLevel;
		else
			document.getElementById("sbDetailInDepthRadioGroup").selectedItem.setAttribute("selected", false);
	}
}


function SB_fillTitleList()
{
	var isPartial = (gArguments.titleList.length > 1);
	var listXUL = document.getElementById("sbDetailTitle");
	if ( gArguments.context == "renew" )
	{
		sbDataSource.init();
		gRenewResource = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + window.opener.sbContentSaver.item.id);
		listXUL.appendItem(sbDataSource.getProperty(gRenewResource, "title"));
	}
	for ( var i = 0; i < gArguments.titleList.length; i++ )
	{
		listXUL.appendItem(gArguments.titleList[i]);
		if ( i == 0 && gArguments.titleList.length > 1 ) listXUL.firstChild.appendChild(document.createElement("menuseparator"));
	}
	listXUL.selectedIndex = isPartial ? 2 : 0;
}


function SB_acceptDetail()
{
	window.opener.sbContentSaver.item.comment      = sbCommonUtils.escapeComment(document.getElementById("sbDetailComment").value);
	window.opener.sbContentSaver.item.title        = document.getElementById("sbDetailTitle").value;
	window.opener.sbContentSaver.option["format"]  = document.getElementById("sbDetailFormat").checked;
	window.opener.sbContentSaver.option["script"]  = document.getElementById("sbDetailScript").checked;
	window.opener.sbContentSaver.option["image"]   = document.getElementById("sbDetailImage").checked;
	window.opener.sbContentSaver.option["sound"]   = document.getElementById("sbDetailSound").checked;
	window.opener.sbContentSaver.option["movie"]   = document.getElementById("sbDetailMovie").checked;
	window.opener.sbContentSaver.option["archive"] = document.getElementById("sbDetailArchive").checked;
	window.opener.sbContentSaver.option["inDepth"] = gInDepthLevel;
	window.opener.sbContentSaver.option["custom"] = "";
	if ( gCustomCheckbox.checked )
	{
		window.opener.sbContentSaver.option["custom"] = gCustomCheckbox.nextSibling.value.replace(/[^0-9a-zA-Z,\|]/g, "").replace(/[,\|]/g, ", ");
		nsPreferences.setUnicharPref("scrapbook.detail.custom", window.opener.sbContentSaver.option["custom"]);
	}
	if ( gArguments.context == "renew" )
	{
		sbDataSource.setProperty(gRenewResource, "title", document.getElementById("sbDetailTitle").value);
	}
	if ( gArguments.context != "renew" && gArguments.context != "renew-deep" )
	{
		sbFolderSelector.setFolderPref();
	}
}


function SB_cancelDetail()
{
	gArguments.cancel = true;
}




var sbFolderSelector = {

	get STRING()     { return document.getElementById("sbMainString"); },
	get MENU_LIST()  { return document.getElementById("sbFolderList"); },
	get MENU_POPUP() { return document.getElementById("sbFolderPopup"); },

	depth : 0,
	recentList : [],

	init : function()
	{
		if ( !sbDataSource.data ) sbDataSource.init();
		if ( !gArguments.resName ) gArguments.resName = "urn:scrapbook:root";
		this.refresh(gArguments.resName, true);
	},

	refresh : function(aResID, shouldUpdate)
	{
		if ( shouldUpdate )
		{
			this.depth = 0;
			this.recentList = [];
			this.clear();
			this.processRecent();
			this.processRoot();
			this.processRecursive("urn:scrapbook:root");
		}
		this.MENU_LIST.selectedItem = document.getElementById(aResID);
		this.MENU_LIST.disabled = false;
	},

	clear : function()
	{
		var oldItems = this.MENU_POPUP.childNodes;
		for ( var i = oldItems.length - 1; i >= 0; i-- )
		{
			this.MENU_POPUP.removeChild(oldItems[i]);
		}
	},

	fill : function(aID, aTitle)
	{
		var item = document.createElement("menuitem");
		item.setAttribute("id",    aID);
		item.setAttribute("label", aTitle);
		item.setAttribute("depth", this.depth);
		item.setAttribute("class", "menuitem-iconic folder-icon");
		item.setAttribute("style", "padding-left:" + (20 * this.depth + 3) + "px;");
		this.MENU_POPUP.appendChild(item);
	},

	processRoot : function()
	{
		this.fill("urn:scrapbook:root", this.STRING.getString("ROOT_FOLDER"));
		this.MENU_POPUP.appendChild(document.createElement("menuseparator"));
	},

	processRecent : function()
	{
		var arr = nsPreferences.copyUnicharPref("scrapbook.tree.folderList", "").split("|");
		var flag = false;
		for ( var i = 0; i < arr.length; i++ )
		{
			if ( arr[i].length != 14 ) continue;
			var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + arr[i]);
			if ( !sbDataSource.exists(res) ) continue;
			flag = true;
			this.fill(res.Value, sbDataSource.getProperty(res, "title"));
		}
		if ( flag ) this.MENU_POPUP.appendChild(document.createElement("menuseparator"));
		this.recentList = arr;
	},

	processRecursive : function(aResName)
	{
		this.depth++;
		sbCommonUtils.RDFC.Init(sbDataSource.data, sbCommonUtils.RDF.GetResource(aResName));
		var resEnum = sbCommonUtils.RDFC.GetElements();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( !sbCommonUtils.RDFCU.IsContainer(sbDataSource.data, res) ) continue;
			this.fill(res.Value, sbDataSource.getProperty(res, "title"));
			this.processRecursive(res.Value);
		}
		this.depth--;
	},

	createFolder : function()
	{
		var newID = sbDataSource.identify(sbCommonUtils.getTimeStamp());
		var newItem = new ScrapBookItem(newID);
		newItem.title = this.STRING.getString("DEFAULT_FOLDER");
		newItem.type = "folder";
		var tarResName = this.MENU_LIST.selectedItem.getAttribute("depth") > 0 ? this.MENU_LIST.selectedItem.id : "urn:scrapbook:root";
		var newRes = sbDataSource.addItem(newItem, tarResName, 0);
		sbDataSource.createEmptySeq(newRes.Value);
		var result = {};
		window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome", newItem.id, result);
		if ( !result.accept )
		{
			sbDataSource.deleteItemDescending(newRes, sbCommonUtils.RDF.GetResource(tarResName));
			sbDataSource.flush();
		}
		else
		{
			this.refresh(newRes.Value, true);
			this.onSelect(newRes.Value);
		}
	},

	setFolderPref : function()
	{
		if ( gArguments.resName == "urn:scrapbook:root" ) return;
		var newArr = [gArguments.resName.substring(18,32)];
		for ( var i = 0; i < this.recentList.length; i++ )
		{
			if ( this.recentList[i] != newArr[0] ) newArr.push(this.recentList[i]);
		}
		nsPreferences.setUnicharPref("scrapbook.tree.folderList", newArr.slice(0,5).join("|"));
	},

	onSelect : function(aResID)
	{
		gArguments.resName = aResID;
		gArguments.change  = true;
	},

	openFolderPicker : function()
	{
		var result = {};
		window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes',result);
		if ( result.target )
		{
			this.refresh(result.target.Value, result.shouldUpdate);
			this.onSelect(result.target.Value);
		}
	},

};




var sbFolderSelector2 = {

	get STRING()     { return document.getElementById("sbMainString"); },
	get TEXTBOX()    { return document.getElementById("sbFolderTextbox"); },
	get selection()  { return this.TEXTBOX.getAttribute("folder"); },

	init : function()
	{
		if ( !sbDataSource.data ) sbDataSource.init();
		this.TEXTBOX.value = this.STRING.getString("ROOT_FOLDER");
		this.TEXTBOX.setAttribute("folder", "urn:scrapbook:root");
	},

	openFolderPicker : function()
	{
		var result = {};
		window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes',result);
		if ( result.target )
		{
			this.TEXTBOX.value = result.target.Value == "urn:scrapbook:root" ? this.STRING.getString("ROOT_FOLDER") : sbDataSource.getProperty(result.target, "title");
			this.TEXTBOX.setAttribute("folder", result.target.Value);
		}
	},

};



