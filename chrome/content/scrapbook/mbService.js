
var sbMultiBookUI = {

	enabled: false,
	file: null,

	showButton: function()
	{
		this.enabled = ScrapBookUtils.getPref("multibook.enabled");
		document.getElementById("mbToolbarButton").hidden = !this.enabled;
	},

	showSidebarTitle: function()
	{
		var elt = window.top.document.getElementById("sidebar-title");
		if (!elt)
			return;
		elt.value = this.enabled
		          ? "ScrapBook [" + ScrapBookUtils.getPref("data.title") + "]"
		          : "ScrapBook";
	},

	initMenu : function()
	{
		var isDefault = ScrapBookUtils.getPref("data.default");
		var dataPath  = ScrapBookUtils.getPref("data.path");
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
		this.file = ScrapBookUtils.DIR.get("ProfD", Ci.nsIFile).clone();
		this.file.append("ScrapBook");
		this.file.append("multibook.txt");
		if (!this.file.exists()) {
			this.file.create(this.file.NORMAL_FILE_TYPE, 0666);
			var path = ScrapBookUtils.getPref("data.path");
			if (path)
				ScrapBookUtils.writeFile(this.file, "My ScrapBook\t" + path + "\n", "UTF-8");
		}
		var ret = [];
		var lines = ScrapBookUtils.convertToUnicode(ScrapBookUtils.readFile(this.file), "UTF-8").split("\n");
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
		ScrapBookUtils.setPref("data.default", path == "");
		if (path != "")
			ScrapBookUtils.setPref("data.path", path);
		ScrapBookUtils.setPref("data.title", aItem.label);
	},


	validateRefresh: function(aQuietWarning)
	{
		var winEnum = ScrapBookUtils.WINDOW.getEnumerator("scrapbook");
		while (winEnum.hasMoreElements()) {
			var win = winEnum.getNext().QueryInterface(Ci.nsIDOMWindow);
			if (win != window) {
				if (!aQuietWarning) {
					var text = ScrapBookUtils.getLocaleString("MB_CLOSE_WINDOW")
					         + "\n[" + win.document.title + "]";
					ScrapBookUtils.alert(text);
				}
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


