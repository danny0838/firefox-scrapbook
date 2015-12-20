
var sbNoteService2 = {

    get BROWSER(){ return document.getElementById("sbNoteBrowser"); },

    fontSize : 16,
    enabledHTMLView : false,

    init : function() {
        var id = sbCommonUtils.parseURLQuery(window.location.search.substring(1))['id'];
        sbNoteService.sidebarContext = false;
        var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
        if ( !sbDataSource.exists(res) ) return window.location.href = "about:blank";
        sbNoteService.edit(res);
        sbNoteTemplate.init();
        this.initFontSize();
        if ( sbCommonUtils.getPref("note.linefeed", true) ) {
            document.getElementById("sbNoteToolbarL").setAttribute("checked", true);
        }
        if ( sbCommonUtils.getPref("note.preview", false) ) this.initHTMLView();
    },

    refreshTab : function() {
        var icon = sbCommonUtils.getDefaultIcon("note");
        document.getElementById("sbNoteImage").setAttribute("src", icon);
        var win = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
        if ( win.content.location.href.indexOf(sbNoteService.resource.Value.substring(18)) > 0 ) {
            win.gBrowser.selectedTab.label = sbDataSource.getProperty(sbNoteService.resource, "title");
            win.gBrowser.selectedTab.setAttribute("image", icon);
        }
    },

    finalize : function(exit) {
        window.onunload = null;
        sbNoteService.save(window);
        sbCommonUtils.setPref("note.preview",  this.enabledHTMLView);
        sbCommonUtils.setPref("note.linefeed", document.getElementById("sbNoteToolbarL").getAttribute("checked") ? true : false);
        sbCommonUtils.setPref("note.fontsize",  this.fontSize);
        if ( exit ) {
            var browser = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser").getBrowser();
            browser.mTabContainer.childNodes.length > 1 ? window.close() : browser.loadURI("about:blank");
        }
    },

    initFontSize : function() {
        this.fontSize = sbCommonUtils.getPref("note.fontsize", 16);
        this.changeFontSize(this.fontSize);
        document.getElementById("sbNoteToolbarF" + this.fontSize).setAttribute("checked", true)
    },

    changeFontSize : function(aPixel) {
        this.fontSize = aPixel;
        var newStyle = "font-size: " + aPixel + "px; font-family: monospace;";
        sbNoteService.TEXTBOX.setAttribute("style", newStyle);
        sbNoteTemplate.TEXTBOX.setAttribute("style", newStyle);
    },


    initHTMLView : function() {
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
        title = sbCommonUtils.escapeHTMLWithSpace(title, false, true, true);
        if ( document.getElementById("sbNoteToolbarL").getAttribute("checked") ) content = content.replace(/([^>])$/mg, "$1<br>");
        source = source.replace(/<%NOTE_TITLE%>/g,   title);
        source = source.replace(/<%NOTE_CONTENT%>/g, content);
        var htmlFile = sbCommonUtils.getScrapBookDir().clone();
        htmlFile.append("note.html");
        sbCommonUtils.writeFile(htmlFile, source, "UTF-8");
        this.toggleHTMLView(true);
        this.BROWSER.loadURI(sbCommonUtils.convertFilePathToURL(htmlFile.path));
        this.enabledHTMLView = true;
    },

    toggleHTMLView : function(willShow) {
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

    init : function() {
        this.file = sbCommonUtils.getScrapBookDir().clone();
        this.file.append("note_template.html");
        if ( !this.file.exists() ) sbCommonUtils.saveTemplateFile("chrome://scrapbook/content/note_template.html", this.file);
    },

    show : function(willShow) {
        document.getElementById("sbNoteTemplate").collapsed = !willShow;
        document.getElementById("sbNoteEditor").collapsed   = willShow;
        this.enabled = willShow;
    },

    getTemplate : function() {
        var template = sbCommonUtils.readFile(this.file);
        template = sbCommonUtils.convertToUnicode(template, "UTF-8");
        return template;
    },

    load : function() {
        this.save();
        this.show(true);
        this.TEXTBOX.value = this.getTemplate();
        this.TEXTBOX.focus();
    },

    save : function() {
        if ( !this.shouldSave ) return;
        var myCSS = sbCommonUtils.getScrapBookDir().clone();
        myCSS.append("note_template.html");
        sbCommonUtils.writeFile(myCSS, this.TEXTBOX.value, "UTF-8");
        this.change(false);
    },

    exit : function(checkOff) {
        this.save();
        this.show(false);
        if ( checkOff ) document.getElementById("sbNoteToolbarT").setAttribute("checked", false);
    },

    change : function(bool) {
        this.shouldSave = bool;
        document.getElementById("sbNoteToolbarS").disabled = !bool;
    },

};


