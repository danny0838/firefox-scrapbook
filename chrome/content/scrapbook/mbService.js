
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
		var sidebarTitleId = sbCommonUtils.getSidebarId("sidebar-title");
		var win = "sbBrowserOverlay" in window.top ? window.top : sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
		if (!this.enabled)
		{
			win.document.getElementById(sidebarTitleId).value = "ScrapBook X";
		} else
		{
			var title = win.sbBrowserOverlay.dataTitle;
			if (!title) {
				title = sbCommonUtils.getPref("data.title", "");
				win.sbBrowserOverlay.dataTitle = title;
			}
			if (title)
				win.document.getElementById(sidebarTitleId).value = "ScrapBook X [" + title + "]";
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
			this.file.create(this.file.NORMAL_FILE_TYPE, 0666);
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
		if (!this.validateRefresh()) return;
		// output tree requires correct pref and datasource,
		// we have to exec it before changing them
		sbDataSource.outputTreeAuto(window);
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
		sbDataSource.checkRefresh();
	},


	validateRefresh: function(aQuietWarning)
	{
		var winEnum = sbCommonUtils.WINDOW.getEnumerator("scrapbook");
		while (winEnum.hasMoreElements()) {
			var win = winEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			if (win != window) {
				if (!aQuietWarning)
					alert(sbCommonUtils.lang("scrapbook", "MB_CLOSE_WINDOW", [win.document.title]));
				return false;
			}
		}
		return true;
	},

	config: function()
	{
		window.openDialog(
			"chrome://scrapbook/content/mbManage.xul", "",
			"chrome,centerscreen,modal,resizable"
		);
	},

};


