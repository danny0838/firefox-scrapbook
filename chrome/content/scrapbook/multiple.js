
let sbMultipleService = {

    get FILTER()  { return document.getElementById("sbFilter"); },
    get STATUS()  { return document.getElementById("sbStatus"); },
    get TEXTBOX() { return document.getElementById("ScrapBookTextbox"); },

    vorhLinks: [],
    allURLs: [],
    allTitles: [],
    selURLs: [],
    selTitles: [],
    currentID: null,
    lastID: null,

    init: function() {
        document.documentElement.buttons = "accept,cancel,extra2";
        document.documentElement.getButton("accept").label = sbCommonUtils.lang("SAVE_OK_BUTTON");
        document.documentElement.getButton("accept").accesskey = "C";
        this.TEXTBOX.focus();
        sbFolderSelector2.init();
        setTimeout(function(){ sbMultipleService.pasteClipboardURL(); }, 0);
    },

    done: function() {
        let allURLs = [];
        let urlList = [];
        let namList = [];
        let urlHash = {};
        let lines = this.TEXTBOX.value.split("\n");
        for ( let i = 0; i < lines.length; i++ ) {
            if ( lines[i].length > 5 ) urlHash[lines[i]] = true;
        }
        for ( let url in urlHash ) { allURLs.push(url); }
        if ( allURLs.length < 1 ) return;
        //Verbliebene Links trennen
        for ( let i = 0; i < allURLs.length; i++ ) {
            lines = allURLs[i].split("  ");
            urlList[i] = lines.shift();
            if ( lines.length ) {
                namList[i] = lines.join("  ");
            } else {
                namList[i] = "";
            }
        }
        let data = {
            urls: urlList,
            showDetail: false,
            resName: sbFolderSelector2.resURI,
            titles: (document.getElementById("sbLinktitle").value == "ScrapBook") ? null : namList,
            context: "link",
        };
        window.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no", data);
    },

    addURL: function(auAllHash, auExclude) {
        let auAll = "";
        let auSelected = 0;
        let auCount = 0;
        let auFilter = this.FILTER.value;
        if ( auExclude == null ) {
            auExclude = document.getElementById("sbExcludeExistingAddresses").checked;
        }
        for ( let auURL in auAllHash ) {
            auCount++;
            this.allURLs.push(auURL);
            this.allTitles.push(auAllHash[auURL]);
        }
        if ( auCount > 0 ) {
            //Vergleichen mit Ausschlußliste und Co
            this.currentID = sbFolderSelector2.resURI;
            if ( this.currentID != this.lastID ) this.detectExistingLinks();
            for ( let auI=0; auI<this.allURLs.length; auI++ ) {
                if ( this.allURLs[auI].match(auFilter) ) {
                    //Abgleich mit Ausschlussliste
                    let auDoppelt = 0;
                    if ( auExclude ) {
                        for ( let auJ = 0; auJ < this.vorhLinks.length; auJ++) {
                            if ( this.vorhLinks[auJ] == this.allURLs[auI] ) {
                                auDoppelt = 1;
                                auJ = this.vorhLinks.length;
                            }
                        }
                    }
                    if ( auDoppelt == 0 ) {
                        auSelected++;
                        this.selURLs.push(this.allURLs[auI]);
                        this.selTitles.push(this.allTitles[auI]);
                        auAll += this.allURLs[auI]+"  "+this.allTitles[auI]+"\n";
                    }
                }
            }
            document.getElementById("sbCounter").setAttribute("value", auSelected+" \/ "+auCount);
        } else {
            document.getElementById("sbCounter").setAttribute("value", "");
        }
        this.TEXTBOX.value = auAll;
    },

    clear: function() {
        this.TEXTBOX.value = "";
    },

    pasteClipboardURL: function() {
        let pcuAllHash = {};
        let pcuLines = [];
        this.allURLs = [];
        this.allTitles = [];
        try {
            let clip = Components.classes['@mozilla.org/widget/clipboard;1'].createInstance(Components.interfaces.nsIClipboard);
            if ( !clip ) return false;
            let trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
            if ( !trans ) return false;
            if ( 'init' in trans ) {
                let loadContext = document.defaultView.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebNavigation).QueryInterface(Components.interfaces.nsILoadContext);
                trans.init(loadContext);
            }
            trans.addDataFlavor("text/unicode");
            clip.getData(trans, clip.kGlobalClipboard);
            let str = new Object();
            let len = new Object();
            trans.getTransferData("text/unicode", str, len);
            if ( str ) {
                str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
                pcuLines = str.toString().split("\n");
                for ( let i = 0; i < pcuLines.length; i++ ) {
                    if ( pcuLines[i].match(/^(http|https|ftp|file):\/\//) ) {
                        let pcuGetrennt = pcuLines[i].split("\;");
                        if ( pcuGetrennt.length > 1 ) {
                            pcuAllHash[pcuGetrennt[0]] = pcuGetrennt[1];
                        } else {
                            pcuAllHash[pcuGetrennt[0]] = "";
                        }
                    }
                }
                this.addURL(pcuAllHash);
            }
        } catch(ex) {
        }
    },

    detectURLsOfTabs: function() {
        this.clear();
        let duotURL = "";
        let duotAllHash = {};
        let nodes = window.opener.gBrowser.mTabContainer.childNodes;
        this.allURLs = [];
        this.allTitles = [];
        for ( let i = 0; i < nodes.length; i++ ) {
            duotURL = window.opener.gBrowser.getBrowserForTab(nodes[i]).contentDocument.location.href;
            if ( duotURL.match(/^(http|https|ftp|file):\/\//) ) {
                duotAllHash[duotURL] = "";
            }
        }
        this.addURL(duotAllHash);
    },

    detectURLsInPage: function() {
        this.clear();
        let duipURL = "";
        let duipAllHash = {};
        let node = window.opener.top.content.document.body;
        this.allURLs = [];
        this.allTitles = [];
        traceTree: while ( true ) {
            if ( node instanceof HTMLAnchorElement || node instanceof HTMLAreaElement ) {
                duipURL = node.href;
                if ( duipURL.match(/^(http|https|ftp|file):\/\//) ) {
                    duipAllHash[duipURL] = node.text.replace(/^\s+/, '').replace(/\s+$/, '').replace(/\n/, ' ');
                }
            }
            if ( node.hasChildNodes() ) {
                node = node.firstChild;
            } else {
                while ( !node.nextSibling ) { node = node.parentNode; if ( !node ) break traceTree; }
                node = node.nextSibling;
            }
        }
        this.addURL(duipAllHash);
    },

    detectURLsInSelection: function() {
        this.clear();
        let duisURL = "";
        let duisAllHash = {};
        let sel = window.opener.top.sbPageEditor.getSelection(sbCommonUtils.getFocusedWindow());
        if ( !sel ) {
            document.getElementById("sbCounter").setAttribute("value", "");
            return;
        }
        this.allURLs = [];
        for (var i=0, I=sel.rangeCount; i<I; i++) {
            let selRange = sel.getRangeAt(i);
            let node = selRange.startContainer;
            if ( node.nodeName == "#text" ) node = node.parentNode;
            let nodeRange = window.opener.top.content.document.createRange();
            traceTree: while ( true ) {
                nodeRange.selectNode(node);
                if ( nodeRange.compareBoundaryPoints(Range.START_TO_END, selRange) > -1 ) {
                    if ( nodeRange.compareBoundaryPoints(Range.END_TO_START, selRange) > 0 ) {
                        break;
                    } else if ( node instanceof HTMLAnchorElement || node instanceof HTMLAreaElement ) {
                        duisURL = node.href;
                        if ( duisURL.match(/^(http|https|ftp|file):\/\//) ) {
                            duisAllHash[duisURL] = node.text.replace(/^\s+/, '').replace(/\s+$/, '').replace(/\n/, ' ');
                        }
                    }
                }
                if ( node.hasChildNodes() ) {
                    node = node.firstChild;
                } else {
                    while ( !node.nextSibling ) { node = node.parentNode; if ( !node ) break traceTree; }
                    node = node.nextSibling;
                }
            }
        }
        this.addURL(duisAllHash);
    },

    detectExistingLinks: function() {
        //Funktion ermittelt die Links der vorhandenen Einträge im aktuell gewählten Zielverzeichnis
        let delResource = null;
        let delRDFCont = null;
        let delResEnum = [];
        this.vorhLinks = [];
        this.lastID = this.currentID;
        delResource = sbCommonUtils.RDF.GetResource(this.currentID);
        delRDFCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
        delRDFCont.Init(sbDataSource.data, delResource);
        delResEnum = delRDFCont.GetElements();
        while ( delResEnum.hasMoreElements() ) {
            let delRes = delResEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
            if ( !sbDataSource.isContainer(delRes) ) {
                this.vorhLinks.push(sbDataSource.getProperty(delRes, "source"));
            }
        }
    },

    updateSelection: function(usEvent) {
        //Funktion aktualisiert den Inhalt der aktuellen Auswahl
        let usCount = this.allURLs.length;
        let usAllHash = {};
        let usExclude = true;
        usExclude = document.getElementById("sbExcludeExistingAddresses").checked;
        if ( usEvent ) {
            if ( usEvent.button == 0 ) {
                if ( usExclude ) {
                    usExclude = false;
                } else {
                    usExclude = true;
                }
            }
        }
        for ( let i=0; i<usCount; i++ ) {
            usAllHash[this.allURLs[i]] = this.allTitles[i];
        }
        this.allURLs = [];
        this.allTitles = [];
        this.addURL(usAllHash, usExclude);
    },

    toggleMethod: function() {
        //Funktion aktiviert bzw. deaktiviert die Zeichensatzauswahl
        let tmMethod = document.getElementById("sbMethod").value;
        if ( tmMethod == "SB" ) {
            document.getElementById("sbCharset").disabled = false;
        } else {
            document.getElementById("sbCharset").disabled = true;
        }
    },

};




let sbURLDetector1 = {

    index: 0,

    run: function() {
        this.index = 0;
        let pickedDir = sbCommonUtils.showFilePicker({
            window: window,
            title: "",
            mode: 2, // modeGetFolder
        });
        if (pickedDir) {
            sbMultipleService.clear();
            this.inspectDirectory(pickedDir, 0);
        }
    },

    inspectDirectory: function(aDir, curIdx) {
        sbMultipleService.STATUS.value = sbCommonUtils.lang("SCANNING_DIR", curIdx, this.index, aDir.path);
        let entries = aDir.directoryEntries;
        while ( entries.hasMoreElements() ) {
            let entry = entries.getNext().QueryInterface(Components.interfaces.nsILocalFile);
            if ( entry.isDirectory() ) {
                this.inspectDirectoryWithDelay(entry, ++this.index);
            } else {
                if ( entry.leafName.match(/\.(html|htm)$/i) ) {
                    let hash = {};
                    hash[sbCommonUtils.convertFileToURL(entry)] = "";
                    sbMultipleService.addURL(hash);
                }
            }
        }
        if ( curIdx == this.index ) sbMultipleService.STATUS.value = "";
    },

    inspectDirectoryWithDelay: function(aDir, aIndex) {
        setTimeout(function(){ sbURLDetector1.inspectDirectory(aDir, aIndex); }, 200 * aIndex);
    },

};


let sbURLDetector2 = {

    type: "",
    index: 0,
    lines: [],
    result: "",
    weboxBaseURL: "",

    run: function(aType) {
        this.type = aType;
        this.index = 0;
        this.lines = [];
        this.result = "";
        this.weboxBaseURL = "";
        let theFile ;
        if ( this.type == "W" ) {
            let pickedFile = sbCommonUtils.showFilePicker({
                window: window,
                title: "Select default.html of WeBoX.",
                mode: 0, // modeOpen
                filters: [
                    2, // nsIFilePicker.filterHTML
                ]
            });
            if (pickedFile) {
                theFile = pickedFile;
            } else {
                return;
            }
            this.weboxBaseURL = theFile.parent.path + '\\Data\\';
        } else {
            theFile = sbCommonUtils.DIR.get("ProfD", Components.interfaces.nsIFile);
            theFile.append("bookmarks.html");
            if ( !theFile.exists() ) return;
        }
        sbMultipleService.clear();
        this.lines = sbCommonUtils.readFile(theFile, "UTF-8").split("\n");
        this.inspect();
    },

    inspect: function() {
        sbMultipleService.STATUS.value = sbCommonUtils.lang("SCANNING_FILE", this.index, (this.lines.length-1));
        this.result += "\n";
        if ( this.type == "W" ) {
            if ( this.lines[this.index].match(/ LOCALFILE\=\"([^\"]+)\" /) )
                this.result += sbCommonUtils.convertFilePathToURL(this.weboxBaseURL + RegExp.$1);
        } else {
            if ( this.lines[this.index].match(/ HREF\=\"([^\"]+)\" /) )
                this.result += RegExp.$1;
        }
        if ( ++this.index < this.lines.length ) {
            setTimeout(function(){ sbURLDetector2.inspect(); }, 0);
        } else {
            this.result = this.result.replace(/\n\n+/g, "\n\n");
            this.result = this.result.replace(/^\n+/, "");
            sbMultipleService.TEXTBOX.value = this.result;
            sbMultipleService.STATUS.value = "";
        }
    },

};
