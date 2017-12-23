
let sbNoteService2 = {

    get BROWSER(){ return document.getElementById("sbNoteBrowser"); },

    fontSize: 16,
    enabledHTMLView: false,

    init: function() {
        let id = sbCommonUtils.parseURLQuery(window.location.search.substring(1))['id'];
        sbNoteService.sidebarContext = false;
        let res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
        if ( !sbDataSource.exists(res) ) return window.location.href = "about:blank";
        sbNoteService.edit(res);
        sbNoteTemplate.init();
        this.initFontSize();
        if ( sbCommonUtils.getPref("note.linefeed", true) ) {
            document.getElementById("sbNoteToolbarL").setAttribute("checked", true);
        }
        if ( sbCommonUtils.getPref("note.preview", false) ) this.initHTMLView();
    },

    refreshTab: function() {
        let icon = sbCommonUtils.getDefaultIcon("note");
        document.getElementById("sbNoteImage").setAttribute("src", icon);
        let win = sbCommonUtils.getBrowserWindow();
        if ( win.content.location.href.indexOf(sbNoteService.resource.Value.substring(18)) > 0 ) {
            win.gBrowser.selectedTab.label = sbDataSource.getProperty(sbNoteService.resource, "title");
            win.gBrowser.selectedTab.setAttribute("image", icon);
        }
    },

    finalize: function(exit) {
        window.onunload = null;
        sbNoteService.save(window);
        sbCommonUtils.setPref("note.preview",  this.enabledHTMLView);
        sbCommonUtils.setPref("note.linefeed", document.getElementById("sbNoteToolbarL").getAttribute("checked") ? true : false);
        sbCommonUtils.setPref("note.fontSize",  this.fontSize);
        if ( exit ) {
            let browser = sbCommonUtils.getBrowserWindow().getBrowser();
            browser.mTabContainer.childNodes.length > 1 ? window.close() : browser.loadURI("about:blank");
        }
    },

    initFontSize: function() {
        this.fontSize = sbCommonUtils.getPref("note.fontSize", 12);
        this.changeFontSize(this.fontSize);
        let fontSizeElem = document.getElementById("sbNoteToolbarF" + this.fontSize);
        if (fontSizeElem) fontSizeElem.setAttribute("checked", true);
    },

    changeFontSize: function(aSize) {
        this.fontSize = aSize;
        let newStyle = "font-size: " + aSize + "pt; font-family: monospace;";
        sbNoteService.TEXTBOX.setAttribute("style", newStyle);
        sbNoteTemplate.TEXTBOX.setAttribute("style", newStyle);
    },


    initHTMLView: function() {
        sbNoteService.save();
        sbNoteTemplate.save();
        let source = sbNoteTemplate.getTemplate();
        /\n|$/.test(sbNoteService.TEXTBOX.value);
        let [title, content] = [RegExp.leftContext, RegExp.rightContext];
        title = sbCommonUtils.escapeHTMLWithSpace(title, false, true);
        content = sbCommonUtils.escapeHTMLWithSpace(content, false, true);
        if ( document.getElementById("sbNoteToolbarL").getAttribute("checked") ) content = content.replace(/$/mg, "<br>");
        source = source.replace(/<%NOTE_TITLE%>/g,   title);
        source = source.replace(/<%NOTE_CONTENT%>/g, content);
        let htmlFile = sbCommonUtils.getScrapBookDir().clone();
        htmlFile.append("note.html");
        sbCommonUtils.writeFile(htmlFile, source, "UTF-8");
        this.toggleHTMLView(true);
        this.BROWSER.loadURI(sbCommonUtils.convertFileToURL(htmlFile));
        this.enabledHTMLView = true;
    },

    toggleHTMLView: function(willShow) {
        this.BROWSER.collapsed = !willShow;
        document.getElementById("sbSplitter").collapsed = !willShow;
        document.getElementById("sbNoteExpand").hidden = !willShow;
        document.getElementById("sbNoteToolbarN").disabled = !willShow;
        this.enabledHTMLView = willShow;
    },

};


let sbNoteTemplate = {

    get TEXTBOX() { return document.getElementById("sbNoteTemplateTextbox"); },

    enabled: false,
    shouldSave: false,
    file: null,

    init: function() {
        this.file = sbCommonUtils.getScrapBookDir().clone();
        this.file.append("note_template.html");
        if ( !this.file.exists() ) sbCommonUtils.saveTemplateFile("chrome://scrapbook/skin/note_template.html", this.file);
    },

    show: function(willShow) {
        document.getElementById("sbNoteTemplate").collapsed = !willShow;
        document.getElementById("sbNoteEditor").collapsed = willShow;
        this.enabled = willShow;
    },

    getTemplate: function() {
        let template = sbCommonUtils.readFile(this.file, "UTF-8");
        return template;
    },

    load: function() {
        this.save();
        this.show(true);
        this.TEXTBOX.value = this.getTemplate();
        this.TEXTBOX.focus();
    },

    save: function() {
        if ( !this.shouldSave ) return;
        let myCSS = sbCommonUtils.getScrapBookDir().clone();
        myCSS.append("note_template.html");
        sbCommonUtils.writeFile(myCSS, this.TEXTBOX.value, "UTF-8");
        this.change(false);
    },

    exit: function(checkOff) {
        this.save();
        this.show(false);
        if ( checkOff ) document.getElementById("sbNoteToolbarT").setAttribute("checked", false);
    },

    change: function(bool) {
        this.shouldSave = bool;
        document.getElementById("sbNoteToolbarS").disabled = !bool;
    },

};


