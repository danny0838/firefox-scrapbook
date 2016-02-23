var gCacheStatus;
var gCacheFile;



// window.arguments[0]: an url to load when the CACHE process is finished
function SB_initFT(type) {
    gCacheStatus = document.getElementById("sbCacheStatus");
    gCacheFile = sbCommonUtils.getScrapBookDir().clone();
    gCacheFile.append("cache.rdf");
    sbCacheSource.init();
    switch ( type ) {
        case 'SEARCH' : sbSearchResult.exec(); break;
        case 'CACHE'  : setTimeout(function() { sbCacheService.build(); }, 0); break;
    }
}


var sbSearchResult = {
    get TREE() {
        delete this.TREE;
        return this.TREE = document.getElementById("sbTree");
    },
    get CURRENT_TREEITEM() {
        return this.treeItems[this.TREE.currentIndex];
    },

    index : 0,
    count : 0,
    hit : 0,
    query : null,
    queryKey : null,
    resEnum : null,
    treeItems : [],
    targetFolders : [],

    exec : function() {
        this.query = sbCommonUtils.parseURLQuery(document.location.search.substring(1));
        ['q', 're', 'cs', 'ref'].forEach(function(key){
            this.query[key] = this.query[key] || "";
        }, this);
        // set target folder
        if ( this.query['ref'] && this.query['ref'].indexOf("urn:scrapbook:item") == 0 ) {
            var refRes = sbCommonUtils.RDF.GetResource(this.query['ref']);
            var elt = document.getElementById("sbResultHeaderLoc");
            elt.value += sbDataSource.getProperty(refRes, "title");
            elt.hidden = false;
            this.targetFolders = sbDataSource.flattenResources(refRes, 1, true);
            for ( var i = 0; i < this.targetFolders.length; i++ ) {
                this.targetFolders[i] = this.targetFolders[i].ValueUTF8;
            }
        }
        // parse keywords
        this.queryKey = sbSearchQueryHandler.parse(this.query['q'], {'re': this.query['re'], 'mc': this.query['cs'], 'default': 'tcc'});
        if (this.queryKey.error.length) {
            document.getElementById("sbResultHeaderNotice").value = this.queryKey.error[0];
            document.getElementById("sbResultHeaderNotice").hidden = false;
            document.getElementById("sbResultHeaderMsg").hidden = true;
            return;
        }
        // start search process
        this.resEnum = sbCacheSource.container.GetElements();
        this.count = sbCacheSource.container.GetCount();
        setTimeout(function(){ sbSearchResult.next(); }, 10);
    },

    next : function() {
        if ( this.resEnum.hasMoreElements() ) {
            if ( ++this.index % 100 == 0 ) {
                setTimeout(function(){ sbSearchResult.process(); }, 0);
                var msg = sbCommonUtils.lang("fulltext", "SCANNING", [Math.round(this.index / this.count * 100) + " %"]);
                document.title = document.getElementById("sbResultHeaderMsg").value = msg;
            } else {
                this.process();
            }
        } else this.finalize();
    },

    process : function() {
        var res = this.resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
        if ( res.ValueUTF8 == "urn:scrapbook:cache" ) return this.next();
        var folder  = sbCacheSource.getProperty(res, "folder");
        if ( this.targetFolders.length > 0 ) {
            if ( folder && folder.indexOf("urn:scrapbook:item") != 0 ) {
                try {
                    var target = sbCommonUtils.RDF.GetLiteral(folder);
                    var prop   = sbDataSource.data.ArcLabelsIn(target).getNext().QueryInterface(Components.interfaces.nsIRDFResource);
                    var source = sbDataSource.data.GetSource(prop, target, true);
                    folder = source.ValueUTF8;
                } catch(ex) {
                }
            }
            if ( this.targetFolders.indexOf(folder) < 0 ) return this.next();
        }
        var content = sbCacheSource.getProperty(res, "content");
        var nameLR = sbCommonUtils.splitURLByAnchor(res.ValueUTF8);
        var resURI = nameLR[0], name = nameLR[1].substring(1) || "index.html";
        res = sbCommonUtils.RDF.GetResource(resURI);
        if ( !sbDataSource.exists(res) ) return this.next();
        var hits = sbSearchQueryHandler.match(this.queryKey, res, content, name);
        if ( hits ) {
            var comment = sbDataSource.getProperty(res, "comment");
            var type = sbDataSource.getProperty(res, "type");
            var icon = sbDataSource.getProperty(res, "icon") || sbCommonUtils.getDefaultIcon(type);
            if ( folder.indexOf("urn:scrapbook:") == 0 ) folder = sbDataSource.getProperty(sbCommonUtils.RDF.GetResource(folder), "title");
            sbSearchResult.treeItems.push([
                sbDataSource.getProperty(res, "title"),
                this.extractRightContext(content, hits['content']),
                this.extractRightContext(comment, hits['comment']).replace(/ __BR__ /g, " "),
                folder,
                name,
                resURI.substring(18),
                type,
                icon,
                res,
            ]);
            this.hit++;
        }
        return this.next();
    },

    finalize : function() {
        this.queryKey.sort.forEach(function(sortKey){
            sbSearchResult.treeItems.sort(function(a, b){
                a = sbDataSource.getProperty(a[8], sortKey[0]);
                b = sbDataSource.getProperty(b[8], sortKey[0]);
                if (a > b) return sortKey[1];
                if (a < b) return -sortKey[1];
                return 0;
            });
        }, this);
        this.initTree();
        var headerLabel1 = sbCommonUtils.lang("fulltext", "RESULTS_FOUND", [this.hit] );
        var headerLabel2 = this.query['q'];
        document.title = document.getElementById("sbResultHeaderMsg").value = headerLabel1 + " : " + headerLabel2;
    },

    initTree : function() {
        var colIDs = [
            "sbTreeColTitle",
            "sbTreeColContent",
            "sbTreeColComment",
            "sbTreeColFolder",
            "sbTreeColName",
            "sbTreeColId",
        ];
        var treeView = new sbCustomTreeView(colIDs, this.treeItems);
        treeView.getImageSrc = function(row, col) {
            if ( col.index == 0 ) return this._items[row][7];
        };
        treeView.getCellProperties = function(row, col, properties) {
            if ( col.index != 0 ) return "";
            var val = this._items[row][6];
            // Gecko >= 22 (Firefox >= 22): do not take properties and requires a return value
            if (properties) {
                properties.AppendElement(ATOM_SERVICE.getAtom(val));
            } else {
                return val;
            }
        };
        treeView.cycleHeader = function(col) {
            sbCustomTreeUtil.sortItems(sbSearchResult, col.element);
        };
        this.TREE.view = treeView;
    },

    extractRightContext : function(aString, aIndex) {
        aString = aString.substr(aIndex || 0, 100);
        aString = aString.replace(/\r|\n|\t/g, " ");
        return aString;
    },

    localizedQuotation : function(aString) {
        return sbCommonUtils.lang("fulltext", "QUOTATION", [aString]);
    },

    forward : function(key) {
        if ( !this.CURRENT_TREEITEM ) return;
        var id = this.CURRENT_TREEITEM[5];
        var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
        if (!sbDataSource.exists(res)) return;
        switch ( key ) {
            case "O" : 
                sbCommonUtils.loadURL(getURL(), false);
                break;
            case "T" : 
                sbCommonUtils.loadURL(getURL(), true);
                break;
            case "P" : 
                window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome", id);
                break;
            case "L" : 
                sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser").sbBrowserOverlay.execLocate(res);
                break;
            default  : 
                document.getElementById("sbBrowser").loadURI(getURL());
                break;
        }
        
        function getURL() {
            switch (sbSearchResult.CURRENT_TREEITEM[6]) {
                case "note":
                    return "chrome://scrapbook/content/note.xul?id=" + id;
                case "bookmark":
                    return sbDataSource.getProperty(res, "source");
                default:
                    return sbSearchResult.resPathToURL(id, sbSearchResult.CURRENT_TREEITEM[4]);
            }
        }
    },

    resPathToURL : function(aID, aSubPath) {
        var parts = aSubPath.split("/").map(function(part){return encodeURIComponent(part);});
        return sbCommonUtils.getBaseHref(sbDataSource.data.URI) + "data/" + aID + "/" + parts.join("/");
    },

    onDocumentLoad : function(aEvent) {
        aEvent.stopPropagation();
        aEvent.preventDefault();
        if (!this.queryKey) return;
        var colors = ["#FFFF33", "#66FFFF", "#90FF90", "#FF9999", "#FF99FF"];
        var keys = [], i = 0;
        if (this.queryKey.rule['tcc']) keys = keys.concat(this.queryKey.rule['tcc']['include']);
        if (this.queryKey.rule['content']) keys = keys.concat(this.queryKey.rule['content']['include']);
        keys.forEach(function(key){
            this.highlightKeyWords(colors[i++ % colors.length], key);
        }, this);
    },

    highlightKeyWords : function(color, key) {
        var skipTags = /mark|title|meta|style|script|textarea|input|i?frame/i;
        var baseNode;
        sbCommonUtils.flattenFrames(document.getElementById("sbBrowser").contentWindow).forEach(function(win) {
            var doc = win.document;
            var body = doc.body;
            if ( !body ) return;
            baseNode = doc.createElement("mark");
            baseNode.setAttribute("data-sb-obj", "fulltext");
            baseNode.style.backgroundColor = color;
            baseNode.style.color = "#333";
            highlightNode(body, key);
        }, this);

        function highlightNode(node, regex) {
            var list = [node];
            var i = 0;
            do {
                node = list[i];
                if (node.nodeType === 3) {
                    var nextNode = highlightTextNode(node, regex);
                    if (nextNode) list[i++] = nextNode;
                } else if (node.nodeType === 1) {
                    var nodename = node.nodeName.toLowerCase();
                    if (node.childNodes && !skipTags.test(nodename)) {
                        var childs = node.childNodes, j = childs.length;
                        while(j) { list[i++] = childs[--j]; }
                    }
                }
            } while (i--);
        }

        function highlightTextNode(node, regex) {
            var s = node.data, m = s.match(regex), nextNode = null;
            regex.lastIndex = 0;
            while (regex.test(s)) {
                var replaceLen = RegExp.lastMatch.length;
                if (!replaceLen) continue;
                var replaceEnd = regex.lastIndex;
                var replaceStart = replaceEnd - replaceLen;
                var wordNode = node.splitText(replaceStart);
                if (wordNode.data.length > replaceLen) nextNode = wordNode.splitText(replaceLen);
                var newNode = baseNode.cloneNode(false);
                wordNode.parentNode.insertBefore(newNode, wordNode);
                newNode.appendChild(wordNode);
                break;
            }
            return nextNode;
        }
    },

};


function SB_exitResult() {
    window.location.href = document.getElementById("sbBrowser").currentURI.spec;
}




var sbCacheService = {

    index : 0,
    dataDir : null,
    resList : [],
    folders : [],
    uriHash : {},
    skipFiles : {},

    build : function() {
        document.title = sbCommonUtils.lang("fulltext", "BUILD_CACHE") + " - ScrapBook";
        gCacheStatus.firstChild.value = sbCommonUtils.lang("fulltext", "BUILD_CACHE_INIT");
        sbCacheSource.refreshEntries();
        this.dataDir = sbCommonUtils.getScrapBookDir().clone();
        this.dataDir.append("data");
        var contResList = sbDataSource.flattenResources(sbCommonUtils.RDF.GetResource("urn:scrapbook:root"), 1, true);
        for ( var i = 0; i < contResList.length; i++ ) {
            var resList = sbDataSource.flattenResources(contResList[i], 2, false);
            for ( var j = 0; j < resList.length; j++ ) {
                var type = sbDataSource.getProperty(resList[j], "type");
                if ( type == "separator" ) continue;
                this.resList.push(resList[j]);
                this.folders.push(contResList[i].ValueUTF8);
            }
        }
        if ( this.resList.length>0 ) {
            this.processAsync();
        } else {
            sbCacheService.finalize();
        }
    },

    processAsync : function() {
        var res = this.resList[this.index];
        // update trace message
        document.title = sbDataSource.getProperty(sbCommonUtils.RDF.GetResource(this.folders[this.index]), "title") || sbCommonUtils.lang("fulltext", "BUILD_CACHE");
        gCacheStatus.firstChild.value = sbCommonUtils.lang("fulltext", "BUILD_CACHE_UPDATE", [sbDataSource.getProperty(res, "title")]);
        gCacheStatus.lastChild.value  = Math.round((this.index + 1) / this.resList.length * 100);
        // inspect the data and do the cache
        var id  = sbDataSource.getProperty(res, "id");
        var dir = this.dataDir.clone();
        dir.append(id);
        var type = sbDataSource.getProperty(res, "type");
        switch ( type ) {
            case "":
            case "marked":
                var file = dir.clone();
                file.append("index.html");
                if (!file.exists()) break;
                // if the file is rather small, check for a possible meta refresh to the real html file
                if (file.fileSize <= 512) {
                    // use a simple heuristic match for meta tag refresh
                    // should be enough for most cases
                    if (sbCommonUtils.readFile(file).match(/\s*content="\d+;URL=([^"]+)"/i)) {
                        // found meta refresh, check further
                        var relURL = sbCommonUtils.convertToUnicode(RegExp.$1, "UTF-8");
                        var URI1 = sbCommonUtils.convertFilePathToURL(file.path);
                        var URI2 = sbCommonUtils.resolveURL(URI1, relURL);
                        var file2 = sbCommonUtils.convertURLToFile(URI2);
                        if (!file2.exists()) break;
                        var mime = sbCommonUtils.getFileMime(file2);
                        if ( !mime || ["text/html", "application/xhtml+xml"].indexOf(mime) < 0 ) break;
                        var basePathCut = dir.path.length + 1;
                        sbCacheService.inspectFile(file2, file2.path.substring(basePathCut).replace(/\\/g, "/"), "html");
                        break;
                    }
                }
                // cache the file
                sbCacheService.inspectFile(file, "index.html", "html");
                break;
            case "combine":
            case "note":
                var file = dir.clone();
                file.append("index.html");
                if (!file.exists()) break;
                sbCacheService.inspectFile(file, "index.html", "html");
                break;
            case "notex":
            case "site":
                var basePathCut = dir.path.length + 1;
                sbCommonUtils.forEachFile(dir, function(file){
                    // do not look in skipped files or folders
                    if ( sbCacheService.skipFiles[file.path] ) return 0;
                    // filter with common filter
                    if ( !sbCacheService.cacheFilter(file) ) return;
                    // cache this file
                    sbCacheService.inspectFile(file, file.path.substring(basePathCut).replace(/\\/g, "/"), "html");
                }, this);
                break;
            case "file":
            case "image":
                var file = dir.clone();
                file.append("index.html");
                if (!file.exists()) break;
                // use a simple heuristic match for meta tag refresh generated by ScrapBook
                // other arbitrary is not guaranteed
                if (sbCommonUtils.readFile(file).match(/\s*content="\d+;URL=([^"]+)"/i)) {
                    var relURL = sbCommonUtils.convertToUnicode(RegExp.$1, "UTF-8");
                    var URI1 = sbCommonUtils.convertFilePathToURL(file.path);
                    var URI2 = sbCommonUtils.resolveURL(URI1, relURL);
                    var file2 = sbCommonUtils.convertURLToFile(URI2);
                    if (!file2.exists()) break;
                    var mime = sbCommonUtils.getFileMime(file2);
                    var basePathCut = dir.path.length + 1;
                    if ( mime && mime.indexOf("text/") == 0 ) {
                        sbCacheService.inspectFile(file2, file2.path.substring(basePathCut).replace(/\\/g, "/"), "text");
                    } else {
                        sbCacheService.inspectFile(file2, file2.path.substring(basePathCut).replace(/\\/g, "/"), "none");
                    }
                }
                break;
            case "bookmark":
                sbCacheService.inspectFile(null, "index.html", "none");
                break;
            default:
                sbCommonUtils.error(sbCommonUtils.lang("scrapbook", "ERR_UNKNOWN_DATA_TYPE", [type]));
                break;
        }
        // next one
        if ( ++this.index < this.resList.length ) {
            setTimeout(function(){ sbCacheService.processAsync(); }, 0);
        } else {
            setTimeout(function(){ sbCacheService.finalize(); }, 0);
        }
    },

    inspectFile : function(aFile, aSubPath, mode) {
        var resource = sbCommonUtils.RDF.GetResource(this.resList[this.index].ValueUTF8 + "#" + aSubPath);
        var charset = sbDataSource.getProperty(sbCacheService.resList[sbCacheService.index], "chars");
        if (aFile) {
            // if cache is newer, skip caching this file and its frames
            // (only check update of the main page)
            if ( sbCacheSource.exists(resource) ) {
                if ( gCacheFile.lastModifiedTime > aFile.lastModifiedTime && charset == sbCacheSource.getProperty(resource, "charset") ) {
                    if (mode == "html") sbCacheService.checkFrameFiles(aFile, function(){return 0;});
                    this.uriHash[resource.ValueUTF8] = true;
                    sbCacheSource.updateEntry(resource, "folder",  this.folders[this.index]);
                    return;
                }
            }
            // cache text in the file and its frames
            var contents = [];
            addContent(aFile);
            if (mode == "html") sbCacheService.checkFrameFiles(aFile, addContent);
            contents = contents.join("\t").replace(/[\x00-\x1F\x7F\uFFFE\uFFFF]/g, " ").replace(/\s+/g, " ");
        } else {
            var contents = "";
        }
        // update cache data
        if ( sbCacheSource.exists(resource) ) {
            sbCacheSource.updateEntry(resource, "folder",  this.folders[this.index]);
            sbCacheSource.updateEntry(resource, "charset", charset);
            sbCacheSource.updateEntry(resource, "content", contents);
        } else {
            sbCacheSource.addEntry(resource, this.folders[this.index], charset, contents);
        }
        this.uriHash[resource.ValueUTF8] = true;

        function addContent(aFile) {
            switch (mode) {
                case "html":
                    var content = sbCommonUtils.readFile(aFile);
                    content = sbCommonUtils.convertToUnicode(content, charset);
                    contents.push(sbCacheService.convertHTML2Text(content));
                    break;
                case "text":
                    if (charset) {
                        var content = sbCommonUtils.readFile(aFile);
                        content = sbCommonUtils.convertToUnicode(content, charset);
                        contents.push(content);
                    } else {
                        contents.push("");
                    }
                    break;
                case "none":
                    contents.push("");
                    break;
            }
        }
    },
    
    cacheFilter : function(aFile) {
        // only process normal files
        if ( !aFile.isFile() ) return false;
        // only process files with html extension
        if ( !aFile.leafName.match(/\.x?html?$/i) ) return false;
        // skip unreadable or hidden files
        if ( !aFile.isReadable() || aFile.leafName.charAt(0) === "." || aFile.isHidden() ) return false;
        return true;
    },

    checkFrameFiles : function(aFile, aCallback) {
        var dir = aFile.parent;
        if (!dir) return;
        var fileLR = sbCommonUtils.splitFileName(aFile.leafName);
        // index.html => index_#.html  (ScrapBook style)
        var i = 1;
        while (true) {
            var file1 = dir.clone();
            file1.append(fileLR[0] + "_" + i + "." + fileLR[1]);
            if (!file1.exists()) break;
            sbCacheService.skipFiles[file1.path] = true;
            aCallback(file1);
            i++;
        }
        // index.html => index.files/*  (IE archive style)
        var dir1 = dir.clone();
        dir1.append(fileLR[0] + ".files");
        if (dir1.exists()) {
            sbCacheService.skipFiles[dir1.path] = true;
            sbCommonUtils.forEachFile(dir1, function(file){
                if ( !sbCacheService.cacheFilter(file) ) return;
                sbCacheService.skipFiles[file.path] = true;
                aCallback(file);
            }, this);
        }
        // index.html => index_files/*  (Firefox archive style)
        var dir1 = dir.clone();
        dir1.append(fileLR[0] + "_files");
        if (dir1.exists()) {
            sbCacheService.skipFiles[dir1.path] = true;
            sbCommonUtils.forEachFile(dir1, function(file){
                if ( !sbCacheService.cacheFilter(file) ) return;
                sbCacheService.skipFiles[file.path] = true;
                aCallback(file);
            }, this);
        }
    },

    finalize : function() {
        document.title = sbCommonUtils.lang("fulltext", "BUILD_CACHE");
        var toRemove = [];
        for ( var uri in this.uriHash ) {
            if ( !this.uriHash[uri] && uri != "urn:scrapbook:cache" ) {
                toRemove.push(uri);
            }
        }
        (function () {
            var uri = toRemove.shift();
            if (uri) {
                // next
                gCacheStatus.firstChild.value = sbCommonUtils.lang("fulltext", "BUILD_CACHE_REMOVE", [uri]);
                sbCacheSource.removeEntry(sbCommonUtils.RDF.GetResource(uri));
                setTimeout(arguments.callee, 0);
            } else {
                // done
                gCacheStatus.firstChild.value = sbCommonUtils.lang("fulltext", "BUILD_CACHE_UPDATE", ["cache.rdf"]);
                sbCacheSource.flush();
                try {
                    if ( window.arguments[0] ) {
                        var win = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
                        var inTab = (win.content.location.href.indexOf("chrome://scrapbook/content/result.xul") == 0) ? false : sbCommonUtils.getPref("tabs.searchResult", false);
                        sbCommonUtils.loadURL(window.arguments[0], inTab);
                    }
                } catch(ex) {
                }
                window.close();
            }
        })();
    },

    convertHTML2Text : function(aStr) {
        var FORMAT_CONVERTER = Components.classes['@mozilla.org/widget/htmlformatconverter;1'].createInstance(Components.interfaces.nsIFormatConverter);
        var fromStr = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString);
        var toStr   = { value: null };
        fromStr.data = aStr;
        try {
            FORMAT_CONVERTER.convert("text/html", fromStr, fromStr.toString().length, "text/unicode", toStr, {});
            toStr = toStr.value.QueryInterface(Components.interfaces.nsISupportsString);
            return toStr.toString();
        } catch(ex) {
            return aStr;
        }
    },

};




var sbCacheSource = {

    dataSource : null,
    container  : null,

    init : function() {
        if ( !gCacheFile.exists() ) {
            var iDS = Components.classes["@mozilla.org/rdf/datasource;1?name=xml-datasource"].createInstance(Components.interfaces.nsIRDFDataSource);
            sbCommonUtils.RDFCU.MakeSeq(iDS, sbCommonUtils.RDF.GetResource("urn:scrapbook:cache"));
            var iFileUrl = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newFileURI(gCacheFile);
            iDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).FlushTo(iFileUrl.spec);
        }
        var filePath = sbCommonUtils.IO.newFileURI(gCacheFile).spec;
        this.dataSource = sbCommonUtils.RDF.GetDataSourceBlocking(filePath);
        this.container = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
        try {
            this.container.Init(this.dataSource, sbCommonUtils.RDF.GetResource("urn:scrapbook:cache"));
        } catch(ex) {
            this.container = sbCommonUtils.RDFCU.MakeSeq(this.dataSource, sbCommonUtils.RDF.GetResource("urn:scrapbook:cache"));
        }
    },

    refreshEntries : function() {
        var resEnum = this.dataSource.GetAllResources();
        while ( resEnum.hasMoreElements() ) {
            var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
            if ( res.ValueUTF8.indexOf("#") == -1 && res.ValueUTF8 != "urn:scrapbook:cache" ) {
                this.removeEntry(res);
            } else {
                sbCacheService.uriHash[res.ValueUTF8] = false;
            }
        }
        this.container = sbCommonUtils.RDFCU.MakeSeq(this.dataSource, sbCommonUtils.RDF.GetResource("urn:scrapbook:cache"));
    },

    addEntry : function(aRes, aFolder, aCharset, aContent) {
        this.container.AppendElement(aRes);
        this.updateEntry(aRes, "folder", aFolder);
        this.updateEntry(aRes, "charset", aCharset);
        this.updateEntry(aRes, "content", aContent);
    },

    updateEntry : function(aRes, aProp, newVal) {
        newVal = sbDataSource.sanitize(newVal);
        aProp = sbCommonUtils.RDF.GetResource(sbCommonUtils.namespace + aProp);
        var oldVal = this.dataSource.GetTarget(aRes, aProp, true);
        if (oldVal == sbCommonUtils.RDF.NS_RDF_NO_VALUE) {
            this.dataSource.Assert(aRes, aProp, sbCommonUtils.RDF.GetLiteral(newVal), true);
        } else {
            oldVal = oldVal.QueryInterface(Components.interfaces.nsIRDFLiteral);
            newVal = sbCommonUtils.RDF.GetLiteral(newVal);
            this.dataSource.Change(aRes, aProp, oldVal, newVal);
        }
    },

    removeEntry : function(aRes) {
        this.container.RemoveElement(aRes, true);
        var names = this.dataSource.ArcLabelsOut(aRes);
        while ( names.hasMoreElements() ) {
            var name  = names.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
            var value = this.dataSource.GetTarget(aRes, name, true);
            this.dataSource.Unassert(aRes, name, value);
        }
    },

    getProperty : function(aRes, aProp) {
        try {
            var retVal = this.dataSource.GetTarget(aRes, sbCommonUtils.RDF.GetResource(sbCommonUtils.namespace + aProp), true);
            return retVal.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
        } catch(ex) {
            return "";
        }
    },

    exists : function(aRes) {
        return (this.dataSource.ArcLabelsOut(aRes).hasMoreElements() && this.container.IndexOf(aRes) != -1);
    },

    flush : function() {
        this.dataSource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
    }

};
