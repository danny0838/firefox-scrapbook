
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
		document.getElementById("sbDetailOptionScript").disabled = true;
	}
	sbDetailWarnService.init();
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
	document.getElementById("sbDetailComment").value = window.opener.sbContentSaver.item.comment.replace(/ __BR__ /g, "\n");
}


function SB_toggleLinkedCustom()
{
	gCustomCheckbox.nextSibling.disabled = !gCustomCheckbox.checked;
}


var sbDetailWarnService = {

	get ELEMENT(){ return document.getElementById("sbDetailWarnAboutScript"); },
	offset : 0,

	init : function()
	{
		this.offset = this.ELEMENT.boxObject.height;
		if ( !this.offset ) this.offset = 32;
		this.ELEMENT.hidden = true;
	},

	toggle : function ()
	{
		this.ELEMENT.hidden = !this.ELEMENT.hidden;
		this.ELEMENT.hidden ? window.outerHeight -= this.offset : window.outerHeight += this.offset;
	},
};


function SB_promptForDepth()
{
	var depth = window.prompt(
		document.getElementById("sbDetailInDepthLabel").value, gInDepthLevel, document.getElementById("sbDetailInDepthBox").firstChild.label
	);
	if ( depth && !isNaN(depth) && depth >= 0 && depth < 100 )
	{
		gInDepthLevel = parseInt(depth, 10);
		if ( gInDepthLevel <= 3 )
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
	window.opener.sbContentSaver.option["images"]  = document.getElementById("sbDetailOptionImages").checked;
	window.opener.sbContentSaver.option["styles"]  = document.getElementById("sbDetailOptionStyles").checked;
	window.opener.sbContentSaver.option["script"]  = document.getElementById("sbDetailOptionScript").checked;
	window.opener.sbContentSaver.option["dlimg"]   = document.getElementById("sbDetailImage").checked;
	window.opener.sbContentSaver.option["dlsnd"]   = document.getElementById("sbDetailSound").checked;
	window.opener.sbContentSaver.option["dlmov"]   = document.getElementById("sbDetailMovie").checked;
	window.opener.sbContentSaver.option["dlarc"]   = document.getElementById("sbDetailArchive").checked;
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
			this.clear();
			this.processRecent();
			this.processRoot();
			this.processRecursive(sbCommonUtils.RDF.GetResource("urn:scrapbook:root"));
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
		var ids = nsPreferences.copyUnicharPref("scrapbook.tree.folderList", "");
		ids = ids ? ids.split("|") : [];
		var flag = false;
		for ( var i = 0; i < ids.length; i++ )
		{
			if ( ids[i].length != 14 ) continue;
			var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + ids[i]);
			if ( !sbDataSource.exists(res) ) continue;
			flag = true;
			this.fill(res.Value, sbDataSource.getProperty(res, "title"));
		}
		if ( flag ) this.MENU_POPUP.appendChild(document.createElement("menuseparator"));
	},

	processRecursive : function(aContRes)
	{
		this.depth++;
		var resList = sbDataSource.flattenResources(aContRes, 1, false);
		resList.shift();
		for ( var i = 0; i < resList.length; i++ )
		{
			var res = resList[i];
			this.fill(res.Value, sbDataSource.getProperty(res, "title"));
			this.processRecursive(res);
		}
		this.depth--;
	},

	createFolder : function()
	{
		var newID = sbDataSource.identify(sbCommonUtils.getTimeStamp());
		var newItem = sbCommonUtils.newItem(newID);
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

	onSelect : function(aResID)
	{
		gArguments.resName = aResID;
		gArguments.change  = true;
	},

	selectTop : function()
	{
		this.MENU_LIST.selectedIndex = 0;
		this.onSelect(this.MENU_LIST.selectedItem.id);
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



