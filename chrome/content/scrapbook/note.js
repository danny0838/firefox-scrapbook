
var sbNoteService2 = {

	get BROWSER(){ return document.getElementById("sbNoteBrowser"); },

	fontSize : 16,
	enabledHTMLView : false,

	init : function()
	{
		window.location.search.match(/\?id\=(\d{14})$/);
		var id = RegExp.$1;
		sbNoteService.sidebarContext = false;
<<<<<<< HEAD
		sbDataSource.init();
		var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
		if ( !sbDataSource.exists(res) ) return window.location.href = "about:blank";
		sbNoteService.edit(res);
		sbNoteTemplate.init();
		this.initFontSize();
		if ( sbCommonUtils.getBoolPref("scrapbook.note.linefeed", true) )
		{
			document.getElementById("sbNoteToolbarL").setAttribute("checked", true);
		}
		if ( sbCommonUtils.getBoolPref("scrapbook.note.preview", false) ) this.initHTMLView();
=======
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
>>>>>>> release-1.6.0.a1
	},

	refreshTab : function()
	{
<<<<<<< HEAD
		var icon = sbCommonUtils.getDefaultIcon("note");
		document.getElementById("sbNoteImage").setAttribute("src", icon);
		var win = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
		if ( win.content.location.href.indexOf(sbNoteService.resource.Value.substring(18)) > 0 )
		{
			win.gBrowser.selectedTab.label = sbDataSource.getProperty(sbNoteService.resource, "title");
=======
		var icon = ScrapBookUtils.getDefaultIcon("note");
		document.getElementById("sbNoteImage").setAttribute("src", icon);
		var win = ScrapBookUtils.getBrowserWindow();
		if ( win.content.location.href.indexOf(sbNoteService.resource.Value.substring(18)) > 0 )
		{
			win.gBrowser.selectedTab.label = ScrapBookData.getProperty(sbNoteService.resource, "title");
>>>>>>> release-1.6.0.a1
			win.gBrowser.selectedTab.setAttribute("image", icon);
		}
	},

	finalize : function(exit)
	{
		window.onunload = null;
		sbNoteService.save(window);
<<<<<<< HEAD
		sbCommonUtils.setBoolPref("scrapbook.note.preview",  this.enabledHTMLView);
		sbCommonUtils.setBoolPref("scrapbook.note.linefeed", document.getElementById("sbNoteToolbarL").getAttribute("checked") ? true : false);
		sbCommonUtils.PREF.setIntPref("scrapbook.note.fontsize",  this.fontSize);
		if ( exit )
		{
			var browser = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser").getBrowser();
			browser.mTabContainer.childNodes.length > 1 ? window.close() : browser.loadURI("about:blank");
		}
=======
		ScrapBookUtils.setPref("note.preview",  this.enabledHTMLView);
		ScrapBookUtils.setPref("note.linefeed", document.getElementById("sbNoteToolbarL").getAttribute("checked") ? true : false);
		ScrapBookUtils.setPref("note.fontsize",  this.fontSize);
		if ( exit )
			ScrapBookUtils.getBrowserWindow().gBrowser.removeCurrentTab();
>>>>>>> release-1.6.0.a1
	},

	initFontSize : function()
	{
<<<<<<< HEAD
		try {
			this.fontSize = sbCommonUtils.PREF.getIntPref("scrapbook.note.fontsize");
		}
		catch (ex) {
			this.fontSize = 16;
		}
=======
		this.fontSize = ScrapBookUtils.getPref("note.fontsize");
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		var htmlFile = sbCommonUtils.getScrapBookDir().clone();
		htmlFile.append("note.html");
		sbCommonUtils.writeFile(htmlFile, source, "UTF-8");
		this.toggleHTMLView(true);
		this.BROWSER.loadURI(sbCommonUtils.convertFilePathToURL(htmlFile.path));
=======
		var htmlFile = ScrapBookUtils.getScrapBookDir().clone();
		htmlFile.append("note.html");
		ScrapBookUtils.writeFile(htmlFile, source, "UTF-8");
		this.toggleHTMLView(true);
		this.BROWSER.loadURI(ScrapBookUtils.convertFilePathToURL(htmlFile.path));
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		this.file = sbCommonUtils.getScrapBookDir().clone();
		this.file.append("note_template.html");
		if ( !this.file.exists() ) sbCommonUtils.saveTemplateFile("chrome://scrapbook/content/template.html", this.file);
=======
		this.file = ScrapBookUtils.getScrapBookDir().clone();
		this.file.append("note_template.html");
		if ( !this.file.exists() ) ScrapBookUtils.saveTemplateFile("chrome://scrapbook/content/template.html", this.file);
>>>>>>> release-1.6.0.a1
	},

	show : function(willShow)
	{
		document.getElementById("sbNoteTemplate").collapsed = !willShow;
		document.getElementById("sbNoteEditor").collapsed   = willShow;
		this.enabled = willShow;
	},

	getTemplate : function()
	{
<<<<<<< HEAD
		var template = sbCommonUtils.readFile(this.file);
		template = sbCommonUtils.convertToUnicode(template, "UTF-8");
=======
		var template = ScrapBookUtils.readFile(this.file);
		template = ScrapBookUtils.convertToUnicode(template, "UTF-8");
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		var myCSS = sbCommonUtils.getScrapBookDir().clone();
		myCSS.append("note_template.html");
		sbCommonUtils.writeFile(myCSS, this.TEXTBOX.value, "UTF-8");
=======
		var myCSS = ScrapBookUtils.getScrapBookDir().clone();
		myCSS.append("note_template.html");
		ScrapBookUtils.writeFile(myCSS, this.TEXTBOX.value, "UTF-8");
>>>>>>> release-1.6.0.a1
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


