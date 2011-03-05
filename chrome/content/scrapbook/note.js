
var sbNoteService2 = {

	get BROWSER(){ return document.getElementById("sbNoteBrowser"); },

	fontSize : 16,
	enabledHTMLView : false,

	init : function()
	{
		window.location.search.match(/\?id\=(\d{14})$/);
		var id = RegExp.$1;
		sbNoteService.sidebarContext = false;
		var res = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + id);
		if ( !ScrapBookData.exists(res) ) return window.location.href = "about:blank";
		sbNoteService.edit(res);
		sbNoteTemplate.init();
		this.initFontSize();
		if ( ScrapBookUtils.getPref("note.linefeed") )
		{
			document.getElementById("sbNoteToolbarL").setAttribute("checked", true);
		}
		if ( ScrapBookUtils.getPref("note.preview") ) this.initHTMLView();
	},

	refreshTab : function()
	{
		var icon = ScrapBookUtils.getDefaultIcon("note");
		document.getElementById("sbNoteImage").setAttribute("src", icon);
		var win = ScrapBookUtils.getBrowserWindow();
		if ( win.content.location.href.indexOf(sbNoteService.resource.Value.substring(18)) > 0 )
		{
			win.gBrowser.selectedTab.label = ScrapBookData.getProperty(sbNoteService.resource, "title");
			win.gBrowser.selectedTab.setAttribute("image", icon);
		}
	},

	finalize : function(exit)
	{
		window.onunload = null;
		sbNoteService.save(window);
		ScrapBookUtils.setPref("note.preview",  this.enabledHTMLView);
		ScrapBookUtils.setPref("note.linefeed", document.getElementById("sbNoteToolbarL").getAttribute("checked") ? true : false);
		ScrapBookUtils.setPref("note.fontsize",  this.fontSize);
		if ( exit )
			ScrapBookUtils.getBrowserWindow().gBrowser.removeCurrentTab();
	},

	initFontSize : function()
	{
		this.fontSize = ScrapBookUtils.getPref("note.fontsize");
		this.changeFontSize(this.fontSize);
		document.getElementById("sbNoteToolbarF" + this.fontSize).setAttribute("checked", true)
	},

	changeFontSize : function(aPixel)
	{
		this.fontSize = aPixel;
		var newStyle = "font-size: " + aPixel + "px; font-family: monospace;";
		sbNoteService.TEXTBOX.setAttribute("style", newStyle);
		sbNoteTemplate.TEXTBOX.setAttribute("style", newStyle);
	},


	initHTMLView : function()
	{
		sbNoteService.save();
		sbNoteTemplate.save();
		var source = sbNoteTemplate.getTemplate();
		var title, content;
		if ( sbNoteService.TEXTBOX.value.match(/\n/) ) {
			title   = RegExp.leftContext;
			content = RegExp.rightContext;
		} else {
			title   = sbNoteService.TEXTBOX.value;
			content = "";
		}
		title = title.replace(/</g, "&lt;");
		title = title.replace(/>/g, "&gt;");
		title = title.replace(/\"/g, "&quot;");
		if ( document.getElementById("sbNoteToolbarL").getAttribute("checked") ) content = content.replace(/([^>])$/mg, "$1<br>");
		source = source.replace(/<%NOTE_TITLE%>/g,   title);
		source = source.replace(/<%NOTE_CONTENT%>/g, content);
		var htmlFile = ScrapBookUtils.getScrapBookDir().clone();
		htmlFile.append("note.html");
		ScrapBookUtils.writeFile(htmlFile, source, "UTF-8");
		this.toggleHTMLView(true);
		this.BROWSER.loadURI(ScrapBookUtils.convertFilePathToURL(htmlFile.path));
		this.enabledHTMLView = true;
	},

	toggleHTMLView : function(willShow)
	{
		this.BROWSER.collapsed  = !willShow;
		document.getElementById("sbSplitter").collapsed = !willShow;
		document.getElementById("sbNoteHeader").lastChild.collapsed = !willShow;
		document.getElementById("sbNoteToolbarN").disabled = !willShow;
		this.enabledHTMLView = willShow;
	},

};


var sbNoteTemplate = {

	get TEXTBOX() { return document.getElementById("sbNoteTemplateTextbox"); },

	enabled    : false,
	shouldSave : false,
	file       : null,

	init : function()
	{
		this.file = ScrapBookUtils.getScrapBookDir().clone();
		this.file.append("note_template.html");
		if ( !this.file.exists() ) ScrapBookUtils.saveTemplateFile("chrome://scrapbook/content/template.html", this.file);
	},

	show : function(willShow)
	{
		document.getElementById("sbNoteTemplate").collapsed = !willShow;
		document.getElementById("sbNoteEditor").collapsed   = willShow;
		this.enabled = willShow;
	},

	getTemplate : function()
	{
		var template = ScrapBookUtils.readFile(this.file);
		template = ScrapBookUtils.convertToUnicode(template, "UTF-8");
		return template;
	},

	load : function()
	{
		this.save();
		this.show(true);
		this.TEXTBOX.value = this.getTemplate();
		this.TEXTBOX.focus();
	},

	save : function()
	{
		if ( !this.shouldSave ) return;
		var myCSS = ScrapBookUtils.getScrapBookDir().clone();
		myCSS.append("note_template.html");
		ScrapBookUtils.writeFile(myCSS, this.TEXTBOX.value, "UTF-8");
		this.change(false);
	},

	exit : function(checkOff)
	{
		this.save();
		this.show(false);
		if ( checkOff ) document.getElementById("sbNoteToolbarT").setAttribute("checked", false);
	},

	change : function(bool)
	{
		this.shouldSave = bool;
		document.getElementById("sbNoteToolbarS").disabled = !bool;
	},

};


