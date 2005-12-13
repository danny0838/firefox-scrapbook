
var SBnote = {

	get TEXTBOX()   { return document.getElementById("ScrapNoteTextbox"); },
	get HTML_HEAD() { return '<html><head><meta http-equiv="Content-Type" content="text/html;Charset=UTF-8"></head><body><pre>\n'; },
	get HTML_FOOT() { return '\n</pre></body></html>'; },

	curRes  : null,
	curFile : null,
	toSave  : false,
	sidebar : true,
	lock    : false,
	flag    : false,

	add : function(tarResName, tarRelIdx)
	{
		if ( this.lock ) return;
		this.lock = true;
		setTimeout(function(){ SBnote.lock = false; }, 1000);
		this.save();
		var newID = sbDataSource.identify(SBcommon.getTimeStamp());
		var newItem = new ScrapBookItem(newID);
		newItem.type  = "note";
		newItem.chars = "UTF-8";
		this.curRes = sbDataSource.addItem(newItem, tarResName, tarRelIdx);
		this.curFile = SBcommon.getContentDir(sbDataSource.getProperty("id", this.curRes)).clone();
		this.curFile.append("index.html");
		SBcommon.writeFile(this.curFile, "", "UTF-8");
		SBpref.usetabNote ? this.open(this.curRes, true) : this.edit(this.curRes);
	},

	edit : function(aRes)
	{
		if ( !this.flag )
		{
			this.flag = true;
			this.TEXTBOX.addEventListener("dragdrop", function(){ SBnote.change(true); }, true);
		}
		this.save();
		if ( !sbDataSource.exists(aRes) ) sbDataSource.init();
		this.curRes = aRes;
		this.toSave = false;
		if ( this.sidebar )
		{
			document.getElementById("ScrapBookSplitter").hidden = false;
			document.getElementById("ScrapNote").hidden = false;
		}
		this.curFile = SBcommon.getContentDir(sbDataSource.getProperty("id", this.curRes)).clone();
		this.curFile.append("index.html");
		var content = SBcommon.readFile(this.curFile);
		content = SBcommon.convertStringToUTF8(content);
		content = content.replace(this.HTML_HEAD, "");
		content = content.replace(this.HTML_FOOT, "");
		this.TEXTBOX.value = content;
		try {
			this.TEXTBOX.mInputField.focus();
		} catch(ex) {
			this.TEXTBOX.focus();
		}
		document.getElementById("ScrapNoteLabel").value = sbDataSource.getProperty("title", this.curRes);
		if ( !this.sidebar ) snGlobal.refresh();
	},

	save : function()
	{
		if ( !this.toSave ) return;
		if ( !sbDataSource.exists(this.curRes) ) return;
		SBcommon.writeFile(this.curFile, this.HTML_HEAD + this.TEXTBOX.value + this.HTML_FOOT, "UTF-8");
		this.saveResource();
		this.change(false);
	},

	saveResource : function()
	{
		var title = this.TEXTBOX.value.split("\n")[0].replace(/\t/g, " ");
		if ( title.length > 50 ) title = title.substring(0,50) + "...";
		sbDataSource.updateItem(this.curRes, "title", title);
		sbDataSource.flush();
	},

	exit : function()
	{
		this.save();
		this.curRes  = null;
		this.curFile = null;
		this.change(false);
		if ( this.sidebar ) {
			document.getElementById("ScrapBookSplitter").hidden = true;
			document.getElementById("ScrapNote").hidden = true;
		}
	},

	open : function(aRes, tabbed)
	{
		if ( top.document.getElementById("content").contentWindow.SBnote )
		{
			top.document.getElementById("content").contentWindow.SBnote.edit(aRes);
		}
		else
		{
			if ( tabbed ) {
				if ( top.gBrowser.currentURI.spec == "about:blank" ) tabbed = false;
				SBcommon.loadURL("chrome://scrapbook/content/note.xul?id=" + sbDataSource.getProperty("id", aRes), tabbed);
			} else {
				SBnote.edit(aRes);
			}
		}
	},

	expand : function()
	{
		this.open(this.curRes, true);
		this.exit();
	},

	change : function(aBool)
	{
		this.toSave = aBool;
		if ( !this.sidebar ) document.getElementById("ScrapNoteToolbarS").disabled = !aBool;
	},

	insertTab : function(aEvent)
	{
		if ( aEvent.keyCode == aEvent.DOM_VK_ESCAPE && this.sidebar ) { SBnote.exit(); return; }
		if ( ( aEvent.keyCode != aEvent.DOM_VK_TAB) || aEvent.ctrlKey || aEvent.altKey || aEvent.shiftKey ) return;
		aEvent.preventDefault();
		var command = "cmd_insertText";
		try {
			var controller = document.commandDispatcher.getControllerForCommand(command);
			if (controller && controller.isCommandEnabled(command))
			{
				controller = controller.QueryInterface(Components.interfaces.nsICommandController);
				var params = Components.classes["@mozilla.org/embedcomp/command-params;1"];
				params = params.createInstance(Components.interfaces.nsICommandParams);
				params.setStringValue("state_data", "\t");
				controller.doCommandWithParams(command, params);
			}
		}
		catch(ex) {
		}
	},

};


