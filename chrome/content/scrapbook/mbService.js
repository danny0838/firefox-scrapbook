
var sbMultiBookService = {

	enabled: false,
	file: null,

	showButton: function()
	{
		this.enabled = sbCommonUtils.getBoolPref("scrapbook.multibook.enabled", false);
		document.getElementById("mbToolbarButton").hidden = !this.enabled;
	},

	showTitle: function()
	{
		if (!this.enabled)
			return;
		var win = "sbBrowserOverlay" in window.top ? window.top : sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
		var title = win.sbBrowserOverlay.dataTitle;
		if (!title) {
			title = sbCommonUtils.copyUnicharPref("scrapbook.data.title", "");
			win.sbBrowserOverlay.dataTitle = title;
		}
		if (title)
			win.document.getElementById("sidebar-title").value = "ScrapBook [" + title + "]";
	},

	initMenu : function()
	{
		var isDefault = sbCommonUtils.getBoolPref("scrapbook.data.default", true);
		var dataPath  = sbCommonUtils.copyUnicharPref("scrapbook.data.path", "");
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
			var path = sbCommonUtils.copyUnicharPref("scrapbook.data.path", "");
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
		sbCommonUtils.setBoolPref("scrapbook.data.default", path == "");
		if (path != "")
			sbCommonUtils.setUnicharPref("scrapbook.data.path", path);
		sbCommonUtils.setUnicharPref("scrapbook.data.title", aItem.label);
		try {
			var refWin = "sbBrowserOverlay" in window.top ? window.top : window.opener.top;
			refWin.sbBrowserOverlay.dataTitle = aItem.label;
		} catch(ex) {
		}
		this.refreshGlobal();
		sbMainService.refresh();
	},


	validateRefresh: function(aQuietWarning)
	{
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		var winEnum = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator)
		              .getEnumerator("scrapbook");
		while (winEnum.hasMoreElements()) {
			var win = winEnum.getNext().QueryInterface(Ci.nsIDOMWindow);
			if (win != window) {
				if (!aQuietWarning)
					alert(document.getElementById("sbMainString").getString("MB_CLOSE_WINDOW") + "\n[" + win.title + "]");
				return false;
			}
		}
		return true;
	},

	refreshGlobal: function()
	{
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		var winEnum = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator)
		              .getEnumerator("navigator:browser");
		while (winEnum.hasMoreElements()) {
			var win = winEnum.getNext().QueryInterface(Ci.nsIDOMWindow);
			try {
				win.sbBrowserOverlay.refresh();
				win.sbBrowserOverlay.onLocationChange(win.gBrowser.currentURI.spec);
				win.document.getElementById("sidebar").contentWindow.sbMainService.refresh();
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


