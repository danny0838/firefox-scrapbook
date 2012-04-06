
var sbCaptureOptions = {

	get CUSTOM_UI() { return document.getElementById("sbDetailCustom"); },
	get WARNING_UI(){ return document.getElementById("sbDetailWarnAboutScript"); },

	param : null,
	inDepth : 0,

	init : function()
	{
		if ( !window.arguments || !("sbContentSaver" in window.opener) ) window.close();
		this.param = window.arguments[0];
		this.toggleCustomUI();
		this.CUSTOM_UI.nextSibling.value = ScrapBookUtils.getPref("detail.custom");
		if ( this.param.context == "bookmark" )
		{
			document.title = "ScrapBook - " + window.opener.document.getElementById("ScrapBookContextMenuB").label.replace("...","");
		}
		else
		{
			document.documentElement.getButton("accept").label = ScrapBookUtils.getLocaleString("SAVE_OK_BUTTON");
			document.documentElement.getButton("accept").accesskey = "C";
		}
		this.fillTitleList();
		if ( this.param.item.source.indexOf("://mail.google.com/") > 0 )
		{
			document.getElementById("sbDetailOptionScript").disabled = true;
		}
		var offset = this.WARNING_UI.boxObject.height || 32;
		this.WARNING_UI.setAttribute("offset", offset);
		this.WARNING_UI.hidden = true;
		if ( this.param.context == "bookmark" )
		{
			var elts = document.getElementsByAttribute("group", "capture-options");
			for ( var i = 0; i < elts.length; i++ ) elts[i].collapsed = true;
		}
		else if ( this.param.context == "capture-again" || this.param.context == "capture-again-deep" )
		{
			document.getElementById("sbDetailFolderRow").collapsed = true;
			document.getElementById("sbDetailWarnAboutRenew").hidden = false;
			document.getElementById("sbDetailComment").collapsed = true;
			if ( this.param.context == "capture-again-deep" )
			{
				document.getElementById("sbDetailInDepthBox").collapsed = true;
			}
			return;
		}
		setTimeout(function(){ sbFolderSelector.init(); }, 100);
		document.getElementById("sbDetailComment").value = this.param.item.comment.replace(/ __BR__ /g, "\n");
	},

	toggleCustomUI : function()
	{
		this.CUSTOM_UI.nextSibling.disabled = !this.CUSTOM_UI.checked;
	},

	toggleWarningUI : function()
	{
		var offset = parseInt(this.WARNING_UI.getAttribute("offset"), 10);
		this.WARNING_UI.hidden = !this.WARNING_UI.hidden;
		this.WARNING_UI.hidden ? window.outerHeight -= offset : window.outerHeight += offset;
	},

	fillTitleList : function()
	{
		var isPartial = this.param.titles.length > 1;
		var list = document.getElementById("sbDetailTitle");
		if ( this.param.context == "capture-again" )
		{
			var res = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + this.param.item.id);
			list.appendItem(ScrapBookData.getProperty(res, "title"));
		}
		for ( var i = 0; i < this.param.titles.length; i++ )
		{
			list.appendItem(this.param.titles[i]);
			if ( i == 0 && this.param.titles.length > 1 ) list.firstChild.appendChild(document.createElement("menuseparator"));
		}
		list.selectedIndex = isPartial ? 2 : 0;
	},

	promptInDepth : function()
	{
		var ret = window.prompt(
			document.getElementById("sbDetailInDepthLabel").value, this.inDepth, document.getElementById("sbDetailInDepthBox").firstChild.label
		);
		if ( ret && !isNaN(ret) && ret >= 0 && ret < 100 )
		{
			this.inDepth = parseInt(ret, 10);
			if ( this.inDepth <= 3 )
				document.getElementById("sbDetailInDepthRadioGroup").selectedIndex = this.inDepth;
			else
				document.getElementById("sbDetailInDepthRadioGroup").selectedItem.setAttribute("selected", false);
		}
	},

	accept : function()
	{
		this.param.item.comment      = ScrapBookUtils.escapeComment(document.getElementById("sbDetailComment").value);
		this.param.item.title        = document.getElementById("sbDetailTitle").value;
		this.param.option["images"]  = document.getElementById("sbDetailOptionImages").checked;
		this.param.option["styles"]  = document.getElementById("sbDetailOptionStyles").checked;
		this.param.option["script"]  = document.getElementById("sbDetailOptionScript").checked;
		this.param.option["dlimg"]   = document.getElementById("sbDetailImage").checked;
		this.param.option["dlsnd"]   = document.getElementById("sbDetailSound").checked;
		this.param.option["dlmov"]   = document.getElementById("sbDetailMovie").checked;
		this.param.option["dlarc"]   = document.getElementById("sbDetailArchive").checked;
		this.param.option["inDepth"] = this.inDepth;
		this.param.option["custom"] = "";
		if ( this.CUSTOM_UI.checked )
		{
			this.param.option["custom"] = this.CUSTOM_UI.nextSibling.value.replace(/[^0-9a-zA-Z,\|]/g, "").replace(/[,\|]/g, ", ");
			ScrapBookUtils.setPref("detail.custom", this.param.option["custom"]);
		}
		if ( this.param.context == "capture-again" )
		{
			var res = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + this.param.item.id);
			ScrapBookData.setProperty(res, "title", document.getElementById("sbDetailTitle").value);
		}
	},

	cancel : function()
	{
		this.param.result = 0;
	},

};




var sbFolderSelector = {

	get MENU_LIST()  { return document.getElementById("sbFolderList"); },
	get MENU_POPUP() { return document.getElementById("sbFolderPopup"); },

	nest : 0,

	init : function()
	{
		if ( !sbCaptureOptions.param.resURI ) sbCaptureOptions.param.resURI = "urn:scrapbook:root";
		this.refresh(sbCaptureOptions.param.resURI);
	},

	refresh : function(aResID)
	{
		if ( document.getElementById(aResID) == null )
		{
			this.nest = 0;
			this.clear();
			this.processRecent();
			this.processRoot();
			this.processRecursive(ScrapBookUtils.RDF.GetResource("urn:scrapbook:root"));
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
		item.setAttribute("nest", this.nest);
		item.setAttribute("class", "menuitem-iconic folder-icon");
		item.setAttribute("style", "padding-left:" + (20 * this.nest + 3) + "px;");
		this.MENU_POPUP.appendChild(item);
	},

	processRoot : function()
	{
		this.fill("urn:scrapbook:root", ScrapBookUtils.getLocaleString("ROOT_FOLDER"));
		this.MENU_POPUP.appendChild(document.createElement("menuseparator"));
	},

	processRecent: function()
	{
		var ids = ScrapBookUtils.getPref("ui.folderList", "");
		ids = ids ? ids.split("|") : [];
		var shownItems = 0;
		var maxEntries = ScrapBookUtils.getPref("ui.folderList.maxEntries");
		for (var i = 0; i < ids.length && shownItems < maxEntries; i++)
		{
			if (ids[i].length != 14)
				continue;
			var res = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + ids[i]);
			if (!ScrapBookData.exists(res))
				continue;
			this.fill(res.Value, ScrapBookData.getProperty(res, "title"));
			shownItems++;
		}
		if (shownItems > 0)
			this.MENU_POPUP.appendChild(document.createElement("menuseparator"));
	},

	processRecursive : function(aContRes)
	{
		this.nest++;
		var resList = ScrapBookData.flattenResources(aContRes, 1, false);
		resList.shift();
		for ( var i = 0; i < resList.length; i++ )
		{
			var res = resList[i];
			this.fill(res.Value, ScrapBookData.getProperty(res, "title"));
			this.processRecursive(res);
		}
		this.nest--;
	},

	createFolder : function()
	{
		var newItem = ScrapBookData.newItem();
		newItem.title = ScrapBookUtils.getLocaleString("DEFAULT_FOLDER");
		newItem.type = "folder";
		var tarResName = this.MENU_LIST.selectedItem.getAttribute("nest") > 0 ? this.MENU_LIST.selectedItem.id : "urn:scrapbook:root";
		var newRes = ScrapBookData.addItem(newItem, tarResName, 0);
		ScrapBookData.createEmptySeq(newRes.Value);
		var result = {};
		window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome", newItem.id, result);
		if ( !result.accept )
		{
			ScrapBookData.deleteItemDescending(newRes, ScrapBookUtils.RDF.GetResource(tarResName));
		}
		else
		{
			this.refresh(newRes.Value);
			this.onChange(newRes.Value);
		}
	},

	onChange : function(aResURI)
	{
		sbCaptureOptions.param.resURI = aResURI;
		sbCaptureOptions.param.result = 2;
	},

	onMiddleClick : function()
	{
		this.MENU_LIST.selectedIndex = 0;
		this.onChange(this.MENU_LIST.selectedItem.id);
	},

	pick : function()
	{
		var ret = {};
		window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes', ret, sbCaptureOptions.param.resURI);
		if ( ret.resource )
		{
			this.refresh(ret.resource.Value);
			this.onChange(ret.resource.Value);
		}
	},

};



