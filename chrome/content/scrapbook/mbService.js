
var sbMultiBookService = {

	enabled: false,
	file: null,

	showButton: function()
	{
		this.enabled = sbCommonUtils.getPref("multibook.enabled", false);
		document.getElementById("mbToolbarButton").hidden = !this.enabled;
	},

	showTitle: function()
	{
//Hier werden Änderungen fällig
		//Dieser Block ist notwendig, da MultiSidebar verwendet Fehler verursachen würde
		var stSidebarId = "sidebar";
		var stSidebarTitleId = "sidebar-title";
		var stSidebarSplitterId = "sidebar-splitter";
		var stSidebarBoxId = "sidebar-box";
		var stPosition = sbCommonUtils.getPref("extensions.multisidebar.viewScrapBookSidebar", 1, true);

		if ( stPosition > 1)
		{
			stSidebarId = "sidebar-" + stPosition;
			stSidebarTitleId = "sidebar-" + stPosition + "-title";
			stSidebarSplitterId = "sidebar-" + stPosition + "-splitter";
			stSidebarBoxId = "sidebar-" + stPosition + "-box";
		}
		//Ende Block
		var win = "sbBrowserOverlay" in window.top ? window.top : sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
		if (!this.enabled)
		{
			win.document.getElementById("sidebar-title").value = "ScrapBook X";
		} else
		{
			var title = win.sbBrowserOverlay.dataTitle;
			if (!title) {
				title = sbCommonUtils.getPref("data.title", "");
				win.sbBrowserOverlay.dataTitle = title;
			}
			if (title)
				win.document.getElementById(stSidebarTitleId).value = "ScrapBook X [" + title + "]";
		}
	},

	initMenu : function()
	{
		var isDefault = sbCommonUtils.getPref("data.default", true);
		var dataPath  = sbCommonUtils.getPref("data.path", "");
		var popup = document.getElementById("mbMenuPopup");
		if (!this.file) {
			var items = this.initFile();
			for (var i = items.length - 1; i >= 0; i--) {
				var elt = document.getElementById("mbMenuItem").cloneNode(false);
				popup.insertBefore(elt, popup.firstChild);
				elt.removeAttribute("id");
				elt.removeAttribute("hidden");
				elt.setAttribute("label", items[i][0]);
				elt.setAttribute("path",  items[i][1]);
			}
		}
		var nodes = popup.childNodes;
		for (var i = 0; i < nodes.length; i++) {
			if (!isDefault && nodes[i].getAttribute("path") == dataPath)
				return nodes[i].setAttribute("checked", true);
		}
		if (isDefault)
			document.getElementById("mbMenuItemDefault").setAttribute("checked", true);
	},

	initFile : function()
	{
		this.file = sbCommonUtils.DIR.get("ProfD", Components.interfaces.nsIFile).clone();
		this.file.append("ScrapBook");
		this.file.append("multibook.txt");
		if (!this.file.exists()) {
			this.file.create(this.file.NORMAL_FILE_TYPE, parseInt("0666", 8));
			var path = sbCommonUtils.getPref("data.path", "");
			if (path)
				sbCommonUtils.writeFile(this.file, "My ScrapBook\t" + path + "\n", "UTF-8");
		}
		var ret = [];
		var lines = sbCommonUtils.convertToUnicode(sbCommonUtils.readFile(this.file), "UTF-8").split("\n");
		for (var i = 0; i < lines.length; i++) {
			var item = lines[i].replace(/\r|\n/g, "").split("\t");
			if (item.length == 2)
				ret.push(item);
		}
		return ret;
	},

	change: function(aItem)
	{
		if (!this.validateRefresh())
			return;
		aItem.setAttribute("checked", true);
		var path = aItem.getAttribute("path");
		sbCommonUtils.setPref("data.default", path == "");
		if (path != "")
			sbCommonUtils.setPref("data.path", path);
		sbCommonUtils.setPref("data.title", aItem.label);
		try {
			var refWin = "sbBrowserOverlay" in window.top ? window.top : window.opener.top;
			refWin.sbBrowserOverlay.dataTitle = aItem.label;
		} catch(ex) {
		}
		sbDataSource.init();
		this.refreshGlobal();
		sbMainService.refresh();
	},


	validateRefresh: function(aQuietWarning)
	{
		var winEnum = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator)
		              .getEnumerator("scrapbook");
		while (winEnum.hasMoreElements()) {
			var win = winEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			if (win != window) {
				if (!aQuietWarning)
					alert(sbCommonUtils.lang("scrapbook", "MB_CLOSE_WINDOW", [win.title]));
				return false;
			}
		}
		return true;
	},

	refreshGlobal: function()
	{
//Hier werden Änderungen fällig
		//Dieser Block ist notwendig, da MultiSidebar verwendet Fehler verursachen würde
		var rgSidebarId = "sidebar";
		var rgSidebarTitleId = "sidebar-title";
		var rgSidebarSplitterId = "sidebar-splitter";
		var rgSidebarBoxId = "sidebar-box";
		var rgPosition = sbCommonUtils.getPref("extensions.multisidebar.viewScrapBookSidebar", 1, true);

		if ( rgPosition > 1)
		{
			rgSidebarId = "sidebar-" + rgPosition;
			rgSidebarTitleId = "sidebar-" + rgPosition + "-title";
			rgSidebarSplitterId = "sidebar-" + rgPosition + "-splitter";
			rgSidebarBoxId = "sidebar-" + rgPosition + "-box";
		}
		//Ende Block
		var winEnum = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator)
		              .getEnumerator("navigator:browser");
		while (winEnum.hasMoreElements()) {
			var win = winEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			try {
				win.sbBrowserOverlay.refresh();
				win.sbBrowserOverlay.onLocationChange(win.gBrowser.currentURI.spec);
				win.document.getElementById(rgSidebarId).contentWindow.sbMainService.refresh();
			}
			catch (ex) {
			}
		}
	},

	config: function()
	{
		window.openDialog(
			"chrome://scrapbook/content/mbManage.xul", "",
			"chrome,centerscreen,modal,resizable"
		);
	},

};


