
var snGlobal  ={

	fontSize : 16,

	init : function()
	{
		window.location.href.match(/\?id\=(\d{14})$/);
		var id = RegExp.$1;
		SBnote.sidebar = false;
		sbDataSource.init();
		SBnote.edit(sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id));
		snTemplate.init();
		this.initFontSize();
		if ( nsPreferences.getBoolPref("scrapbook.note.linefeed", true) )
		{
			document.getElementById("ScrapNoteToolbarL").setAttribute("checked", true);
		}
		if ( nsPreferences.getBoolPref("scrapbook.note.preview", false) ) snPreview.show();
	},

	refresh : function()
	{
		var icon = sbCommonUtils.getDefaultIcon("note");
		document.getElementById("ScrapNoteImage").setAttribute("src", icon);
		if ( !document.getElementById("ScrapNoteBrowser").hidden ) snPreview.show();
		var browser = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser").getBrowser();
		try {
			if ( browser.selectedBrowser.contentWindow.SBnote.curRes.Value == SBnote.curRes.Value )
			{
				browser.selectedTab.label = sbDataSource.getProperty("title", SBnote.curRes);
				browser.selectedTab.setAttribute("image", icon);
			}
		} catch(ex) {
		}
	},

	finalize : function(exit)
	{
		window.onunload = "";
		SBnote.save(window);
		nsPreferences.setBoolPref("scrapbook.note.preview",  snPreview.state);
		nsPreferences.setIntPref("scrapbook.note.fontsize",  this.fontSize);
		nsPreferences.setBoolPref("scrapbook.note.linefeed", document.getElementById("ScrapNoteToolbarL").getAttribute("checked") ? true : false);
		if ( exit ) window.location.href = "about:blank";
	},

	initFontSize : function()
	{
		this.fontSize = nsPreferences.getIntPref("scrapbook.note.fontsize", 16);
		this.changeFontSize(this.fontSize);
		document.getElementById("ScrapNoteToolbarF" + this.fontSize).setAttribute("checked", true)
	},

	changeFontSize : function(aPixel)
	{
		this.fontSize = aPixel;
		var newStyle = "font-size: " + aPixel + "px; font-family: monospace;";
		SBnote.TEXTBOX.setAttribute("style", newStyle);
		snTemplate.TEXTBOX.setAttribute("style", newStyle);
	},

};


var snPreview = {

	state : false,

	show : function()
	{
		SBnote.save();
		snTemplate.save();
		var source = snTemplate.getTemplate();
		if ( SBnote.TEXTBOX.value.match(/\n/) ) {
			var title   = RegExp.leftContext;
			var content = RegExp.rightContext;
		} else {
			var title   = SBnote.TEXTBOX.value;
			var content = "";
		}
		title = title.replace(/</g, "&lt;");
		title = title.replace(/>/g, "&gt;");
		title = title.replace(/\"/g, "&quot;");
		if ( document.getElementById("ScrapNoteToolbarL").getAttribute("checked") ) content = content.replace(/([^>])$/mg, "$1<br>");
		source = source.replace(/<%NOTE_TITLE%>/g,   title);
		source = source.replace(/<%NOTE_CONTENT%>/g, content);
		var htmlFile = sbCommonUtils.getScrapBookDir().clone();
		htmlFile.append("note.html");
		sbCommonUtils.writeFile(htmlFile, source, "UTF-8");
		this.toggle(true);
		document.getElementById("ScrapNoteBrowser").removeAttribute("src");
		document.getElementById("ScrapNoteBrowser").setAttribute("src", sbCommonUtils.convertFilePathToURL(htmlFile.path));
		this.state = true;
	},

	toggle : function(toShow)
	{
		document.getElementById("ScrapNoteSplitter").hidden = !toShow;
		document.getElementById("ScrapNoteBrowser").hidden  = !toShow;
		document.getElementById("ScrapNoteHeader").lastChild.hidden = !toShow;
		document.getElementById("ScrapNoteToolbarQ").disabled = !toShow;
		this.state = toShow;
	},

};


var snTemplate = {

	get TEXTBOX() { return document.getElementById("ScrapNoteTemplateTextbox"); },

	enable : false,
	toSave : false,
	file   : null,

	init : function()
	{
		this.file = sbCommonUtils.getScrapBookDir().clone();
		this.file.append("note_template.html");
		if ( !this.file.exists() ) sbCommonUtils.saveTemplateFile("chrome://scrapbook/content/template.html", this.file);
	},

	show : function(willShow)
	{
		document.getElementById("ScrapNoteTemplate").hidden = !willShow;
		document.getElementById("ScrapNoteEditor").hidden   = willShow;
		this.enable = willShow;
	},

	getTemplate : function()
	{
		var template = sbCommonUtils.readFile(this.file);
		template = sbCommonUtils.convertStringToUTF8(template);
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
		if ( !this.toSave ) return;
		var myCSS = sbCommonUtils.getScrapBookDir().clone();
		myCSS.append("note_template.html");
		sbCommonUtils.writeFile(myCSS, this.TEXTBOX.value, "UTF-8");
		this.change(false);
	},

	exit : function(checkOff)
	{
		this.save();
		this.show(false);
		if ( checkOff ) document.getElementById("ScrapNoteToolbarT").setAttribute("checked", false);
	},

	change : function(bool)
	{
		this.toSave = bool;
		document.getElementById("ScrapNoteToolbarS").disabled = !bool;
	},

};


