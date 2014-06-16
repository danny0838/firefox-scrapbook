
var sbNoteService = {

	get TEXTBOX()   { return document.getElementById("sbNoteTextbox"); },
	get HTML_HEAD() { return '<html><head><meta http-equiv="Content-Type" content="text/html;Charset=UTF-8"></head><body><pre>\n'; },
	get HTML_FOOT() { return '\n</pre></body></html>'; },

	resource : null,
	notefile : null,
	changed  : false,
	locked   : false,
	initFlag : false,
	sidebarContext : true,

	create : function(aTarResURI, aTarRelIdx, aForceTabbed)
	{
		if ( this.locked ) return;
		this.locked = true;
		setTimeout(function(){ sbNoteService.locked = false; }, 1000);
		this.save();
<<<<<<< HEAD
		var newID = sbDataSource.identify(sbCommonUtils.getTimeStamp());
		var newItem = sbCommonUtils.newItem(newID);
		newItem.type  = "note";
		newItem.chars = "UTF-8";
		this.resource = sbDataSource.addItem(newItem, aTarResURI, aTarRelIdx);
		this.notefile = sbCommonUtils.getContentDir(sbDataSource.getProperty(this.resource, "id")).clone();
		this.notefile.append("index.html");
		sbCommonUtils.writeFile(this.notefile, "", "UTF-8");
		if ( !("gBrowser" in window.top) ) aForceTabbed = true;
		(sbMainService.prefs.tabsNote || aForceTabbed) ? this.open(this.resource, true) : this.edit(this.resource);
=======
		var newItem = ScrapBookData.newItem();
		newItem.type  = "note";
		newItem.chars = "UTF-8";
		this.resource = ScrapBookData.addItem(newItem, aTarResURI, aTarRelIdx);
		this.notefile = ScrapBookUtils.getContentDir(ScrapBookData.getProperty(this.resource, "id")).clone();
		this.notefile.append("index.html");
		ScrapBookUtils.writeFile(this.notefile, "", "UTF-8");
		if ( !("gBrowser" in window.top) ) aForceTabbed = true;
		(ScrapBookUtils.getPref("tabs.note") || aForceTabbed) ? this.open(this.resource, true) : this.edit(this.resource);
>>>>>>> release-1.6.0.a1
	},

	edit : function(aRes)
	{
		if ( !this.initFlag )
		{
			this.initFlag = true;
			this.TEXTBOX.addEventListener("dragdrop", function(){ sbNoteService.change(true); }, true);
		}
		this.save();
<<<<<<< HEAD
		if ( !sbDataSource.exists(aRes) )
		{
			sbDataSource.init();
			if ( !sbDataSource.exists(aRes) ) return;
=======
		if ( !ScrapBookData.exists(aRes) )
		{
			if ( !ScrapBookData.exists(aRes) ) return;
>>>>>>> release-1.6.0.a1
		}
		this.resource = aRes;
		this.changed = false;
		if ( this.sidebarContext )
		{
			document.getElementById("sbNoteSplitter").hidden = false;
			document.getElementById("sbNoteOuter").hidden = false;
		}
<<<<<<< HEAD
		this.notefile = sbCommonUtils.getContentDir(sbDataSource.getProperty(this.resource, "id")).clone();
=======
		this.notefile = ScrapBookUtils.getContentDir(ScrapBookData.getProperty(this.resource, "id")).clone();
>>>>>>> release-1.6.0.a1
		this.notefile.append("index.html");
		this.TEXTBOX.value = "";
		this.TEXTBOX.value = this.getContentFromFile(this.notefile);
		this.TEXTBOX.mInputField.focus();
		try { this.TEXTBOX.editor.transactionManager.clear(); } catch(ex) {}
<<<<<<< HEAD
		document.getElementById("sbNoteLabel").value = sbDataSource.getProperty(this.resource, "title");
=======
		document.getElementById("sbNoteLabel").value = ScrapBookData.getProperty(this.resource, "title");
>>>>>>> release-1.6.0.a1
		if ( !this.sidebarContext ) setTimeout(function(){ sbNoteService2.refreshTab(); }, 0);
	},

	save : function()
	{
		if ( !this.changed ) return;
<<<<<<< HEAD
		if ( !sbDataSource.exists(this.resource) ) return;
		sbCommonUtils.writeFile(this.notefile, this.HTML_HEAD + this.TEXTBOX.value + this.HTML_FOOT, "UTF-8");
=======
		if ( !ScrapBookData.exists(this.resource) ) return;
		ScrapBookUtils.writeFile(this.notefile, this.HTML_HEAD + this.TEXTBOX.value + this.HTML_FOOT, "UTF-8");
>>>>>>> release-1.6.0.a1
		this.saveResource();
		this.change(false);
	},

	saveResource : function()
	{
<<<<<<< HEAD
		var title = sbCommonUtils.crop(this.TEXTBOX.value.split("\n")[0].replace(/\t/g, " "), 50);
		sbDataSource.setProperty(this.resource, "title", title);
		sbDataSource.flush();
=======
		var title = ScrapBookUtils.crop(this.TEXTBOX.value.split("\n")[0].replace(/\t/g, " "), 50);
		ScrapBookData.setProperty(this.resource, "title", title);
>>>>>>> release-1.6.0.a1
	},

	exit : function()
	{
		this.save();
		this.resource  = null;
		this.notefile = null;
		this.change(false);
		if ( this.sidebarContext ) {
			document.getElementById("sbNoteSplitter").hidden = true;
			document.getElementById("sbNoteOuter").hidden = true;
		}
	},

	open : function(aRes, aTabbed)
	{
		if ( !("gBrowser" in window.top) ) aTabbed = true;
		if ( !aTabbed && window.top.content.sbNoteService )
		{
			window.top.content.sbNoteService.edit(aRes);
		}
		else
		{
			if ( aTabbed ) {
				if ( top.gBrowser && top.gBrowser.currentURI.spec == "about:blank" ) aTabbed = false;
<<<<<<< HEAD
				sbCommonUtils.loadURL("chrome://scrapbook/content/note.xul?id=" + sbDataSource.getProperty(aRes, "id"), aTabbed);
=======
				ScrapBookUtils.loadURL("chrome://scrapbook/content/note.xul?id=" + ScrapBookData.getProperty(aRes, "id"), aTabbed);
>>>>>>> release-1.6.0.a1
			} else {
				sbNoteService.edit(aRes);
			}
		}
	},

	getContentFromFile : function(aFile)
	{
<<<<<<< HEAD
		var content = sbCommonUtils.readFile(aFile);
		content = sbCommonUtils.convertToUnicode(content, "UTF-8");
=======
		var content = ScrapBookUtils.readFile(aFile);
		content = ScrapBookUtils.convertToUnicode(content, "UTF-8");
>>>>>>> release-1.6.0.a1
		content = content.replace(this.HTML_HEAD, "");
		content = content.replace(this.HTML_FOOT, "");
		return content;
	},

	expand : function()
	{
		this.open(this.resource, true);
		this.exit();
	},

	change : function(aBool)
	{
		this.changed = aBool;
		if ( !this.sidebarContext ) document.getElementById("sbNoteToolbarS").disabled = !aBool;
	},

	insertString : function(aEvent)
	{
		if ( aEvent.keyCode == aEvent.DOM_VK_ESCAPE && this.sidebarContext ) { sbNoteService.exit(); return; }
		if ( aEvent.ctrlKey || aEvent.altKey || aEvent.shiftKey ) return;
		var str = "";
		switch ( aEvent.keyCode )
		{
			case aEvent.DOM_VK_TAB : str = "\t"; break;
			case aEvent.DOM_VK_F5  : str = (new Date()).toLocaleString(); break;
			default : return;
		}
		aEvent.preventDefault();
		var command = "cmd_insertText";
		try {
			var controller = document.commandDispatcher.getControllerForCommand(command);
			if ( controller && controller.isCommandEnabled(command) )
			{
<<<<<<< HEAD
				controller = controller.QueryInterface(Components.interfaces.nsICommandController);
				var params = Components.classes['@mozilla.org/embedcomp/command-params;1'].createInstance(Components.interfaces.nsICommandParams);
=======
				controller = controller.QueryInterface(Ci.nsICommandController);
				var params = Cc['@mozilla.org/embedcomp/command-params;1'].createInstance(Ci.nsICommandParams);
>>>>>>> release-1.6.0.a1
				params.setStringValue("state_data", str);
				controller.doCommandWithParams(command, params);
			}
		} catch(ex) {
		}
	},

};


