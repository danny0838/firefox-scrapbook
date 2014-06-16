
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
<<<<<<< HEAD
		this.CUSTOM_UI.nextSibling.value = sbCommonUtils.copyUnicharPref("scrapbook.detail.custom", "pdf, doc");
=======
		this.CUSTOM_UI.nextSibling.value = ScrapBookUtils.getPref("detail.custom");
>>>>>>> release-1.6.0.a1
		if ( this.param.context == "bookmark" )
		{
			document.title = "ScrapBook - " + window.opener.document.getElementById("ScrapBookContextMenuB").label.replace("...","");
		}
		else
		{
<<<<<<< HEAD
			document.documentElement.getButton("accept").label = document.getElementById("sbMainString").getString("CAPTURE_OK_BUTTON");
=======
			document.documentElement.getButton("accept").label = ScrapBookUtils.getLocaleString("SAVE_OK_BUTTON");
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
			document.getElementById("sbDetailTabComment").hidden = true;
=======
			document.getElementById("sbDetailComment").collapsed = true;
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
			sbDataSource.init();
			var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + this.param.item.id);
			list.appendItem(sbDataSource.getProperty(res, "title"));
=======
			var res = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + this.param.item.id);
			list.appendItem(ScrapBookData.getProperty(res, "title"));
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		this.param.item.comment      = sbCommonUtils.escapeComment(document.getElementById("sbDetailComment").value);
=======
		this.param.item.comment      = ScrapBookUtils.escapeComment(document.getElementById("sbDetailComment").value);
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		this.param.poption["timeout"]= document.getElementById("sbDetailTimeoutRadioGroup").selectedItem.label;
		this.param.poption["charset"]= document.getElementById("sbDetailCharsetRadioGroup").selectedItem.label;
		if ( this.CUSTOM_UI.checked )
		{
			this.param.option["custom"] = this.CUSTOM_UI.nextSibling.value.replace(/[^0-9a-zA-Z,\|]/g, "").replace(/[,\|]/g, ", ");
			sbCommonUtils.setUnicharPref("scrapbook.detail.custom", this.param.option["custom"]);
		}
		if ( this.param.context == "capture-again" )
		{
			var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + this.param.item.id);
			sbDataSource.setProperty(res, "title", document.getElementById("sbDetailTitle").value);
=======
		if ( this.CUSTOM_UI.checked )
		{
			this.param.option["custom"] = this.CUSTOM_UI.nextSibling.value.replace(/[^0-9a-zA-Z,\|]/g, "").replace(/[,\|]/g, ", ");
			ScrapBookUtils.setPref("detail.custom", this.param.option["custom"]);
		}
		if ( this.param.context == "capture-again" )
		{
			var res = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + this.param.item.id);
			ScrapBookData.setProperty(res, "title", document.getElementById("sbDetailTitle").value);
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		if ( !sbDataSource.data ) sbDataSource.init();
=======
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
			this.processRecursive(sbCommonUtils.RDF.GetResource("urn:scrapbook:root"));
=======
			this.processRecursive(ScrapBookUtils.RDF.GetResource("urn:scrapbook:root"));
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		this.fill("urn:scrapbook:root", document.getElementById("sbMainString").getString("ROOT_FOLDER"));
=======
		this.fill("urn:scrapbook:root", ScrapBookUtils.getLocaleString("ROOT_FOLDER"));
>>>>>>> release-1.6.0.a1
		this.MENU_POPUP.appendChild(document.createElement("menuseparator"));
	},

	processRecent: function()
	{
<<<<<<< HEAD
		var ids = sbCommonUtils.copyUnicharPref("scrapbook.ui.folderList", "");
		ids = ids ? ids.split("|") : [];
		var shownItems = 0;
		var maxEntries = sbCommonUtils.PREF.getIntPref("scrapbook.ui.folderList.maxEntries");
=======
		var ids = ScrapBookUtils.getPref("ui.folderList", "");
		ids = ids ? ids.split("|") : [];
		var shownItems = 0;
		var maxEntries = ScrapBookUtils.getPref("ui.folderList.maxEntries");
>>>>>>> release-1.6.0.a1
		for (var i = 0; i < ids.length && shownItems < maxEntries; i++)
		{
			if (ids[i].length != 14)
				continue;
<<<<<<< HEAD
			var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + ids[i]);
			if (!sbDataSource.exists(res))
				continue;
			this.fill(res.Value, sbDataSource.getProperty(res, "title"));
=======
			var res = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + ids[i]);
			if (!ScrapBookData.exists(res))
				continue;
			this.fill(res.Value, ScrapBookData.getProperty(res, "title"));
>>>>>>> release-1.6.0.a1
			shownItems++;
		}
		if (shownItems > 0)
			this.MENU_POPUP.appendChild(document.createElement("menuseparator"));
	},

	processRecursive : function(aContRes)
	{
		this.nest++;
<<<<<<< HEAD
		var resList = sbDataSource.flattenResources(aContRes, 1, false);
=======
		var resList = ScrapBookData.flattenResources(aContRes, 1, false);
>>>>>>> release-1.6.0.a1
		resList.shift();
		for ( var i = 0; i < resList.length; i++ )
		{
			var res = resList[i];
<<<<<<< HEAD
			this.fill(res.Value, sbDataSource.getProperty(res, "title"));
=======
			this.fill(res.Value, ScrapBookData.getProperty(res, "title"));
>>>>>>> release-1.6.0.a1
			this.processRecursive(res);
		}
		this.nest--;
	},

	createFolder : function()
	{
<<<<<<< HEAD
		var newID = sbDataSource.identify(sbCommonUtils.getTimeStamp());
		var newItem = sbCommonUtils.newItem(newID);
		newItem.title = document.getElementById("sbMainString").getString("DEFAULT_FOLDER");
		newItem.type = "folder";
		var tarResName = this.MENU_LIST.selectedItem.getAttribute("nest") > 0 ? this.MENU_LIST.selectedItem.id : "urn:scrapbook:root";
		var newRes = sbDataSource.addItem(newItem, tarResName, 0);
		sbDataSource.createEmptySeq(newRes.Value);
=======
		var newItem = ScrapBookData.newItem();
		newItem.title = ScrapBookUtils.getLocaleString("DEFAULT_FOLDER");
		newItem.type = "folder";
		var tarResName = this.MENU_LIST.selectedItem.getAttribute("nest") > 0 ? this.MENU_LIST.selectedItem.id : "urn:scrapbook:root";
		var newRes = ScrapBookData.addItem(newItem, tarResName, 0);
		ScrapBookData.createEmptySeq(newRes.Value);
>>>>>>> release-1.6.0.a1
		var result = {};
		window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome", newItem.id, result);
		if ( !result.accept )
		{
<<<<<<< HEAD
			sbDataSource.deleteItemDescending(newRes, sbCommonUtils.RDF.GetResource(tarResName));
			sbDataSource.flush();
=======
			ScrapBookData.deleteItemDescending(newRes, ScrapBookUtils.RDF.GetResource(tarResName));
>>>>>>> release-1.6.0.a1
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



