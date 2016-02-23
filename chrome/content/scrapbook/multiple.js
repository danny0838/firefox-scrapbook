
var sbMultipleService = {

    get FILTER()  { return document.getElementById("sbFilter"); },
    get STATUS()  { return document.getElementById("sbStatus"); },
    get TEXTBOX() { return document.getElementById("ScrapBookTextbox"); },

    vorhLinks : [],
    allURLs : [],
    allTitles : [],
    selURLs : [],
    selTitles : [],
    currentID : null,
    lastID : null,

    init : function() {
        document.documentElement.buttons = "accept,cancel,extra2";
        document.documentElement.getButton("accept").label = sbCommonUtils.lang("scrapbook", "CAPTURE_OK_BUTTON");
        document.documentElement.getButton("accept").accesskey = "C";
        this.TEXTBOX.focus();
        sbFolderSelector2.init();
        setTimeout(function(){ sbMultipleService.pasteClipboardURL(); }, 0);
    },

    done : function() {
        var allURLs = [];
        var urlList = [];
        var namList = [];
        var urlHash = {};
        var lines = this.TEXTBOX.value.split("\n");
        var charset = document.getElementById("sbCharset").value;
        var timeout = parseInt("0" + document.getElementById("sbTimeout").value, 10);
        for ( var i = 0; i < lines.length; i++ ) {
            if ( lines[i].length > 5 ) urlHash[lines[i]] = true;
        }
        for ( var url in urlHash ) { allURLs.push(url); }
        if ( allURLs.length < 1 ) return;
        //Verbliebene Links trennen
        for ( var i = 0; i < allURLs.length; i++ ) {
            lines = allURLs[i].split("  ");
            urlList[i] = lines.shift();
            if ( lines.length ) {
                namList[i] = lines.join("  ");
            } else {
                namList[i] = "";
            }
        }
        var data = {
            urls: urlList,
            refUrl: "",
            showDetail: false,
            resName: sbFolderSelector2.resURI,
            resIdx: 0,
            referItem: null,
            option: null,
            file2Url: null,
            preset: null,
            charset: charset,
            timeout: timeout,
            titles: (document.getElementById("sbLinktitle").value == "ScrapBook") ? null : namList,
            context: "link",
        };
        window.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no", data);
    },

    addURL : function(auAllHash, auExclude) {
        var auAll = "";
        var auSelected = 0;
        var auCount = 0;
        var auFilter = this.FILTER.value;
        if ( auExclude == null ) {
            auExclude = document.getElementById("sbpExcludeExistingAddresses").checked;
        }
        for ( var auURL in auAllHash ) {
            auCount++;
            this.allURLs.push(auURL);
            this.allTitles.push(auAllHash[auURL]);
        }
        if ( auCount > 0 ) {
            //Vergleichen mit Ausschlußliste und Co
            this.currentID = sbFolderSelector2.resURI;
            if ( this.currentID != this.lastID ) this.detectExistingLinks();
            for ( var auI=0; auI<this.allURLs.length; auI++ ) {
                if ( this.allURLs[auI].match(auFilter) ) {
                    //Abgleich mit Ausschlussliste
                    var auDoppelt = 0;
                    if ( auExclude ) {
                        for ( var auJ = 0; auJ < this.vorhLinks.length; auJ++) {
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
            document.getElementById("sbpCounter").setAttribute("value", auSelected+" \/ "+auCount);
        } else {
            document.getElementById("sbpCounter").setAttribute("value", "");
        }
        this.TEXTBOX.value = auAll;
    },

    clear : function() {
        this.TEXTBOX.value = "";
    },

    pasteClipboardURL : function() {
        var pcuAllHash = {};
        var pcuLines = [];
        this.allURLs = [];
        this.allTitles = [];
        try {
            var clip  = Components.classes['@mozilla.org/widget/clipboard;1'].createInstance(Components.interfaces.nsIClipboard);
            if ( !clip ) return false;
            var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
            if ( !trans ) return false;
            if ( 'init' in trans ) {
                var loadContext = document.defaultView.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebNavigation).QueryInterface(Components.interfaces.nsILoadContext);
                trans.init(loadContext);
            }
            trans.addDataFlavor("text/unicode");
            clip.getData(trans, clip.kGlobalClipboard);
            var str = new Object();
            var len = new Object();
            trans.getTransferData("text/unicode", str, len);
            if ( str ) {
                str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
                pcuLines = str.toString().split("\n");
                for ( var i = 0; i < pcuLines.length; i++ ) {
                    if ( pcuLines[i].match(/^(http|https|ftp|file):\/\//) ) {
                        var pcuGetrennt = pcuLines[i].split("\;");
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

    detectURLsOfTabs : function() {
        this.clear();
        var duotURL = "";
        var duotAllHash = {};
        var nodes = window.opener.gBrowser.mTabContainer.childNodes;
        this.allURLs = [];
        this.allTitles = [];
        for ( var i = 0; i < nodes.length; i++ ) {
            duotURL = window.opener.gBrowser.getBrowserForTab(nodes[i]).contentDocument.location.href;
            if ( duotURL.match(/^(http|https|ftp|file):\/\//) ) {
                duotAllHash[duotURL] = "";
            }
        }
        this.addURL(duotAllHash);
    },

    detectURLsInPage : function() {
        this.clear();
        var duipURL = "";
        var duipAllHash = {};
        var node = window.opener.top.content.document.body;
        this.allURLs = [];
        this.allTitles = [];
        traceTree : while ( true ) {
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

    detectURLsInSelection : function() {
        this.clear();
        var duisURL = "";
        var duisAllHash = {};
        var sel = window.opener.top.sbPageEditor.getSelection(sbCommonUtils.getFocusedWindow());
        if ( !sel ) {
            document.getElementById("sbpCounter").setAttribute("value", "");
            return;
        }
        this.allURLs = [];
        for (var i=0, I=sel.rangeCount; i<I; i++) {
            var selRange  = sel.getRangeAt(i);
            var node = selRange.startContainer;
            if ( node.nodeName == "#text" ) node = node.parentNode;
            var nodeRange = window.opener.top.content.document.createRange();
            traceTree : while ( true ) {
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

    detectExistingLinks : function() {
        //Funktion ermittelt die Links der vorhandenen Einträge im aktuell gewählten Zielverzeichnis
        var delResource = null;
        var delRDFCont = null;
        var delResEnum = [];
        this.vorhLinks = [];
        this.lastID = this.currentID;
        delResource = sbCommonUtils.RDF.GetResource(this.currentID);
        delRDFCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
        delRDFCont.Init(sbDataSource.data, delResource);
        delResEnum = delRDFCont.GetElements();
        while ( delResEnum.hasMoreElements() ) {
            var delRes = delResEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
            if ( !sbDataSource.isContainer(delRes) ) {
                this.vorhLinks.push(sbDataSource.getProperty(delRes, "source"));
            }
        }
    },

    updateSelection : function(usEvent) {
        //Funktion aktualisiert den Inhalt der aktuellen Auswahl
        var usCount = this.allURLs.length;
        var usAllHash = {};
        var usExclude = true;
        usExclude = document.getElementById("sbpExcludeExistingAddresses").checked;
        if ( usEvent ) {
            if ( usEvent.button == 0 ) {
                if ( usExclude ) {
                    usExclude = false;
                } else {
                    usExclude = true;
                }
            }
        }
        for ( var i=0; i<usCount; i++ ) {
            usAllHash[this.allURLs[i]] = this.allTitles[i];
        }
        this.allURLs = [];
        this.allTitles = [];
        this.addURL(usAllHash, usExclude);
    },

    toggleMethod : function() {
        //Funktion aktiviert bzw. deaktiviert die Zeichensatzauswahl
        var tmMethod = document.getElementById("sbMethod").value;
        if ( tmMethod == "SB" ) {
            document.getElementById("sbCharset").disabled = false;
        } else {
            document.getElementById("sbCharset").disabled = true;
        }
    },

};




var sbURLDetector1 = {

    index : 0,

    run : function() {
        this.index = 0;
        var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
        FP.init(window, "", FP.modeGetFolder);
        var answer = FP.show();
        if ( answer == FP.returnOK ) {
            sbMultipleService.clear();
            this.inspectDirectory(FP.file, 0);
        }
    },

    inspectDirectory : function(aDir, curIdx) {
        sbMultipleService.STATUS.value = sbCommonUtils.lang("scrapbook", "SCANNING_DIR", [curIdx, this.index, aDir.path]);
        var entries = aDir.directoryEntries;
        while ( entries.hasMoreElements() ) {
            var entry = entries.getNext().QueryInterface(Components.interfaces.nsILocalFile);
            if ( entry.isDirectory() ) {
                this.inspectDirectoryWithDelay(entry, ++this.index);
            } else {
                if ( entry.leafName.match(/\.(html|htm)$/i) ) {
                    var hash = {};
                    hash[sbCommonUtils.convertFilePathToURL(entry.path)] = "";
                    sbMultipleService.addURL(hash);
                }
            }
        }
        if ( curIdx == this.index ) sbMultipleService.STATUS.value = "";
    },

    inspectDirectoryWithDelay : function(aDir, aIndex) {
        setTimeout(function(){ sbURLDetector1.inspectDirectory(aDir, aIndex); }, 200 * aIndex);
    },

};


var sbURLDetector2 = {

    type   : "",
    index  : 0,
    lines  : [],
    result : "",
    weboxBaseURL : "",

    run : function(aType) {
        this.type = aType;
        this.index = 0;
        this.lines = [];
        this.result = "";
        this.weboxBaseURL = "";
        var theFile ;
        if ( this.type == "W" ) {
            var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
            FP.init(window, "Select default.html of WeBoX.", FP.modeOpen);
            FP.appendFilters(FP.filterHTML);
            var answer = FP.show();
            if ( answer == FP.returnOK ) {
                theFile = FP.file;
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
        this.lines = sbCommonUtils.readFile(theFile).split("\n");
        this.inspect();
    },

    inspect : function() {
        sbMultipleService.STATUS.value = sbCommonUtils.lang("scrapbook", "SCANNING", [this.index, (this.lines.length-1)]);
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