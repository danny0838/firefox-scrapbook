
var sbMultiBookService = {

	enabled : false,
	file : null,

	showButton : function()
	{
		this.enabled = nsPreferences.getBoolPref("scrapbook.multibook.enabled", false);
		document.getElementById("mbToolbarButton").hidden = !this.enabled;
	},

	showTitle : function()
	{
		if ( "sbMultiBookOverlay" in window ) alert("Since ScrapBook 0.18.4, 'Multi-ScrapBook' feature was merged to ScrapBook.\n'Multi-ScrapBook' is no longer valid. Please uninstall it.");
		if ( !this.enabled ) return;
		var win = "sbBrowserOverlay" in window.top ? window.top : sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
		var title = win.sbBrowserOverlay.dataTitle;
		if ( !title )
		{
			title = nsPreferences.copyUnicharPref("scrapbook.data.title", "");
			win.sbBrowserOverlay.dataTitle = title;
		}
		if ( title ) win.document.getElementById("sidebar-title").value = "ScrapBook [" + title + "]";
	},

	initMenu : function()
	{
		var isDefault = nsPreferences.getBoolPref("scrapbook.data.default", true);
		var dataPath  = nsPreferences.copyUnicharPref("scrapbook.data.path", "");
		var popup = document.getElementById("mbMenuPopup");
		if ( !this.file )
		{
			var items = this.initFile();
			for ( var i = items.length - 1; i >= 0; i-- )
			{
				var elem = document.getElementById("mbMenuItem").cloneNode(false);
				elem.removeAttribute("id");
				elem.setAttribute("hidden", false);
				elem.setAttribute("label", items[i][0]);
				elem.setAttribute("path",  items[i][1]);
				popup.insertBefore(elem, popup.firstChild);
			}
		}
		var nodes = popup.childNodes;
		for ( var i = 0; i < nodes.length; i++ )
		{
			if ( !isDefault && nodes[i].getAttribute("path") == dataPath ) return nodes[i].setAttribute("checked", true);
		}
		if ( isDefault ) document.getElementById("mbMenuItemDefault").setAttribute("checked", true);
	},

	initFile : function()
	{
		this.file = sbCommonUtils.DIR.get("ProfD", Components.interfaces.nsIFile).clone();
		this.file.append("ScrapBook");
		this.file.append("multibook.txt");
		if ( !this.file.exists() )
		{
			this.file.create(this.file.NORMAL_FILE_TYPE, 0666);
			var path = nsPreferences.copyUnicharPref("scrapbook.data.path", "");
			if ( path ) sbCommonUtils.writeFile(this.file, "My ScrapBook\t" + path + "\n", "UTF-8");
		}
		var ret = [];
		var lines = sbCommonUtils.convertToUnicode(sbCommonUtils.readFile(this.file), "UTF-8").split("\n");
		for ( var i = 0; i < lines.length; i++ )
		{
			var item = lines[i].replace(/\r|\n/g, "").split("\t");
			if ( item.length == 2 ) ret.push(item);
		}
		return ret;
	},

	change : function(aItem)
	{
		if ( !this.validateRefresh() ) return;
		aItem.setAttribute("checked", true);
		var path = aItem.getAttribute("path");
		nsPreferences.setBoolPref("scrapbook.data.default", path == "");
		if ( path != "" ) nsPreferences.setUnicharPref("scrapbook.data.path", path);
		nsPreferences.setUnicharPref("scrapbook.data.title", aItem.label);
		try {
			var refWin = "sbBrowserOverlay" in window.top ? window.top : window.opener.top;
			refWin.sbBrowserOverlay.dataTitle = aItem.label;
		} catch(ex) {
		}
		this.refreshGlobal();
		sbMainService.refresh();
	},


	validateRefresh : function(aQuietWarning)
	{
		var winEnum = sbCommonUtils.WINDOW.getEnumerator("scrapbook");
		while ( winEnum.hasMoreElements() )
		{
			var win = winEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			if ( win != window )
			{
				if ( !aQuietWarning ) alert(document.getElementById("sbMainString").getString("MB_CLOSE_WINDOW") + "\n[" + win.title + "]");
				return false;
			}
		}
		return true;
	},

	refreshGlobal : function()
	{
		var winEnum = sbCommonUtils.WINDOW.getEnumerator("navigator:browser");
		while ( winEnum.hasMoreElements() )
		{
			var win = winEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			try {
				win.sbBrowserOverlay.refresh();
				win.sbBrowserOverlay.onLocationChange(win.gBrowser.currentURI.spec);
				win.document.getElementById("sidebar").contentWindow.sbMainService.refresh();
			} catch(ex) {
			}
		}
	},

	config : function()
	{
		window.openDialog('chrome://scrapbook/content/mbConfig.xul','','chrome,centerscreen,modal,all,resizable,dialog=no');
	},

};


