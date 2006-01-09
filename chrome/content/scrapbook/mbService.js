
var sbMultiBookService = {

	enabled : false,
	file : null,
	flag : false,

	showButton : function()
	{
		this.enabled = nsPreferences.getBoolPref("scrapbook.multibook.enabled", false);
		document.getElementById("mbToolbarButton").hidden = !this.enabled;
	},

	showTitle : function()
	{
		if ( "sbMultiBookOverlay" in window )
		{
			alert(SBstring.getString("MB_UNINSTALL"));
			nsPreferences.setBoolPref("scrapbook.multibook.enabled", true);
		}
		if ( !this.enabled ) return;
		var refWin = "sbPageEditor" in window.top ? window.top : window.opener.top;
		var title = refWin.sbPageEditor.dataTitle;
		if ( !title )
		{
			title = nsPreferences.copyUnicharPref("scrapbook.data.title", "");
			refWin.sbPageEditor.dataTitle = title;
		}
		if ( title ) refWin.document.getElementById("sidebar-title").value = "ScrapBook [" + title + "]";
	},

	initMenu : function()
	{
		if ( this.flag ) return;
		this.flag = true;
		this.initFile();
		var isDefault = nsPreferences.getBoolPref("scrapbook.data.default", true);
		var dataPath  = nsPreferences.copyUnicharPref("scrapbook.data.path", "");
		var popup = document.getElementById("mbMenuPopup");
		var items = this.getListFromFile();
		for ( var i = items.length - 1; i >= 0; i-- )
		{
			var elem = document.getElementById("mbMenuItem").cloneNode(false);
			elem.removeAttribute("id");
			elem.setAttribute("hidden", false);
			elem.setAttribute("label", items[i][0]);
			elem.setAttribute("path",  items[i][1]);
			if ( !isDefault && items[i][1] == dataPath ) elem.setAttribute("checked", true);
			popup.insertBefore(elem, popup.firstChild);
		}
		if ( isDefault ) document.getElementById("mbMenuItemDefault").setAttribute("checked", true);
	},

	initFile : function()
	{
		var profDir = sbCommonUtils.DIR.get("ProfD", Components.interfaces.nsIFile);
		this.file = profDir.clone();
		this.file.append("ScrapBook");
		this.file.append("multibook.txt");
		if ( !this.file.exists() )
		{
			var oldFile = profDir.clone();
			oldFile.append("ScrapBookPlus");
			oldFile.append("multibook.dat");
			if ( oldFile.exists() )
			{
				var newFile = profDir.clone();
				newFile.append("ScrapBook");
				oldFile.moveTo(newFile, "multibook.txt");
				newFile.append("multibook.dat");
				this.file = newFile;
			}
			else
				this.file.create(this.file.NORMAL_FILE_TYPE, 0666);
		}
	},

	getListFromFile : function()
	{
		var ret = [];
		var lines = sbCommonUtils.convertStringToUTF8(sbCommonUtils.readFile(this.file)).split("\n");
		for ( var i = 0; i < lines.length; i++ )
		{
			var item = lines[i].replace(/\r|\n/g, "").split("\t");
			if ( item.length != 2 ) continue;
			ret.push(item);
		}
		return ret;
	},

	change : function(aItem, isDefault)
	{
		var winEnum = sbCommonUtils.WINDOW.getEnumerator("scrapbook");
		while ( winEnum.hasMoreElements() )
		{
			var win = winEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			if ( win != window )
			{
				alert(SBstring.getString("MB_CLOSE_WINDOW") + "\n" + win.title);
				return;
			}
		}
		var file, prefVal;
		try {
			file = sbCommonUtils.getScrapBookDir().clone();
			file.append("folders.txt");
			prefVal = nsPreferences.copyUnicharPref("scrapbook.detail.recentfolder", "");
			if ( prefVal ) sbCommonUtils.writeFile(file, prefVal, "UTF-8");
		} catch(ex) {
		}
		nsPreferences.setBoolPref("scrapbook.data.default", isDefault);
		if ( !isDefault ) nsPreferences.setUnicharPref("scrapbook.data.path", aItem.getAttribute("path"));
		try {
			file = sbCommonUtils.getScrapBookDir().clone();
			file.append("folders.txt");
			prefVal = sbCommonUtils.readFile(file);
			if ( prefVal ) nsPreferences.setUnicharPref("scrapbook.detail.recentfolder", prefVal);
		} catch(ex) {
		}
		nsPreferences.setUnicharPref("scrapbook.data.title", aItem.label);
		try {
			var refWin = "sbPageEditor" in window.top ? window.top : window.opener.top;
			refWin.sbPageEditor.dataTitle = aItem.label;
		} catch(ex) {
		}
		winEnum = sbCommonUtils.WINDOW.getEnumerator("navigator:browser");
		while ( winEnum.hasMoreElements() )
		{
			var win = winEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			try {
				win.document.getElementById("sidebar").contentDocument.location.reload();
				win.sbBrowserOverlay.refresh();
			} catch(ex) {
			}
		}
		window.location.reload();
	},

	config : function()
	{
		window.openDialog('chrome://scrapbook/content/mbConfig.xul','','chrome,centerscreen,modal,all,resizable,dialog=no');
	},

};


