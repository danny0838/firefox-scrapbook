let gCacheStatus;
let gCacheFile;



// window.arguments[0]: an url to load when the CACHE process is finished
function SB_initFT(type) {
    gCacheStatus = document.getElementById("sbCacheStatus");
    gCacheFile = sbCommonUtils.getScrapBookDir().clone();
    gCacheFile.append("cache.rdf");
    sbCacheSource.init();
    switch ( type ) {
        case 'SEARCH': sbSearchResult.exec(); break;
        case 'CACHE': setTimeout(function() { sbCacheService.build(); }, 0); break;
    }
}


let sbSearchResult = {
    get TREE() {
        delete this.TREE;
        return this.TREE = document.getElementById("sbTree");
    },
    get CURRENT_TREEITEM() {
        return this.treeItems[this.TREE.currentIndex];
    },

    index: 0,
    count: 0,
    hit: 0,
    query: null,
    queryKey: null,
    resEnum: null,
    treeItems: [],
    targetFolders: [],

    exec: function() {
        this.query = sbCommonUtils.parseURLQuery(document.location.search.substring(1));
        ['q', 're', 'cs', 'ref'].forEach(function(key){
            this.query[key] = this.query[key] || "";
        }, this);
        // set target folder
        if ( this.query['ref'] && this.query['ref'].startsWith("urn:scrapbook:item") ) {
            let refRes = sbCommonUtils.RDF.GetResource(this.query['ref']);
            let elt = document.getElementById("sbResultHeaderLoc");
            elt.value += sbDataSource.getProperty(refRes, "title");
            elt.hidden = false;
            this.targetFolders = sbDataSource.flattenResources(refRes, 1, true);
            for ( let i = 0; i < this.targetFolders.length; i++ ) {
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

    next: function() {
        if ( this.resEnum.hasMoreElements() ) {
            if ( ++this.index % 100 == 0 ) {
                setTimeout(function(){ sbSearchResult.process(); }, 0);
                let msg = sbCommonUtils.lang("SCANNING_TREE", Math.round(this.index / this.count * 100) + "%");
                document.title = document.getElementById("sbResultHeaderMsg").value = msg;
            } else {
                this.process();
            }
        } else this.finalize();
    },

    process: function() {
        let res = this.resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
        if ( res.ValueUTF8 == "urn:scrapbook:cache" ) return this.next();
        let folder = sbCacheSource.getProperty(res, "folder");
        if ( this.targetFolders.length > 0 ) {
            if ( this.targetFolders.indexOf(folder) < 0 ) return this.next();
        }
        let content = sbCacheSource.getProperty(res, "content");
        let [resURI, name] = sbCommonUtils.splitURLByAnchor(res.ValueUTF8);
        name = name.substring(1) || "index.html";
        res = sbCommonUtils.RDF.GetResource(resURI);
        if ( !sbDataSource.exists(res) ) return this.next();
        let hits = sbSearchQueryHandler.match(this.queryKey, res, content, name);
        if ( hits ) {
            let comment = sbDataSource.getProperty(res, "comment");
            let type = sbDataSource.getProperty(res, "type");
            let icon = sbDataSource.getProperty(res, "icon") || sbCommonUtils.getDefaultIcon(type);
            if ( folder.startsWith("urn:scrapbook:") ) folder = sbDataSource.getProperty(sbCommonUtils.RDF.GetResource(folder), "title");
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

    finalize: function() {
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
        let headerLabel1 = sbCommonUtils.lang("RESULTS_FOUND", this.hit);
        let headerLabel2 = this.query['q'];
        document.title = document.getElementById("sbResultHeaderMsg").value = headerLabel1 + " : " + headerLabel2;
    },

    initTree: function() {
        let colIDs = [
            "sbTreeColTitle",
            "sbTreeColContent",
            "sbTreeColComment",
            "sbTreeColFolder",
            "sbTreeColName",
            "sbTreeColId",
        ];
        let treeView = new sbCustomTreeView(colIDs, this.treeItems);
        treeView.getImageSrc = function(row, col) {
            if ( col.index == 0 ) return this._items[row][7];
        };
        treeView.getCellProperties = function(row, col, properties) {
            if ( col.index != 0 ) return "";
            let val = this._items[row][6];
            // Gecko >= 22 (Firefox >= 22): do not take properties and requires a return value
            if (properties) {
                properties.AppendElement(sbCommonUtils.ATOM.getAtom(val));
            } else {
                return val;
            }
        };
        treeView.cycleHeader = function(col) {
            sbCustomTreeUtil.sortItems(sbSearchResult, col.element);
        };
        this.TREE.view = treeView;
    },

    extractRightContext: function(aString, aIndex) {
        aString = aString.substr(aIndex || 0, 100);
        aString = aString.replace(/\r|\n|\t/g, " ");
        return aString;
    },

    forward: function(key) {
        if ( !this.CURRENT_TREEITEM ) return;
        let id = this.CURRENT_TREEITEM[5];
        let res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
        if (!sbDataSource.exists(res)) return;
        switch ( key ) {
            case "O": 
                sbCommonUtils.loadURL(getURL(), false);
                break;
            case "T": 
                sbCommonUtils.loadURL(getURL(), true);
                break;
            case "P": 
                window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome", id);
                break;
            case "L": 
                sbCommonUtils.getBrowserWindow().sbBrowserOverlay.execLocate(res);
                break;
            default: 
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

    resPathToURL: function(aID, aSubPath) {
        let parts = aSubPath.split("/").map(function(part){return encodeURIComponent(part);});
        return sbCommonUtils.getBaseHref(sbDataSource.data.URI) + "data/" + aID + "/" + parts.join("/");
    },

    onDocumentLoad: function(aEvent) {
        aEvent.stopPropagation();
        aEvent.preventDefault();
        if (!this.queryKey) return;
        let colors = ["#FFFF33", "#66FFFF", "#90FF90", "#FF9999", "#FF99FF"];
        let keys = [], i = 0;
        if (this.queryKey.rule['tcc']) keys = keys.concat(this.queryKey.rule['tcc']['include']);
        if (this.queryKey.rule['content']) keys = keys.concat(this.queryKey.rule['content']['include']);
        keys.forEach(function(key){
            this.highlightKeyWords(colors[i++ % colors.length], key);
        }, this);
    },

    highlightKeyWords: function(color, key) {
        let skipTags = /mark|title|meta|style|script|textarea|input|i?frame/i;
        let baseNode;
        sbCommonUtils.flattenFrames(document.getElementById("sbBrowser").contentWindow).forEach(function(win) {
            let doc = win.document;
            let body = doc.body;
            if ( !body ) return;
            baseNode = doc.createElement("mark");
            baseNode.setAttribute("data-sb-obj", "fulltext");
            baseNode.style.backgroundColor = color;
            baseNode.style.color = "#333";
            highlightNode(body, key);
        }, this);

        function highlightNode(node, regex) {
            let list = [node];
            let i = 0;
            do {
                node = list[i];
                if (node.nodeType === 3) {
                    let nextNode = highlightTextNode(node, regex);
                    if (nextNode) list[i++] = nextNode;
                } else if (node.nodeType === 1) {
                    let nodename = node.nodeName.toLowerCase();
                    if (node.childNodes && !skipTags.test(nodename)) {
                        let childs = node.childNodes, j = childs.length;
                        while(j) { list[i++] = childs[--j]; }
                    }
                }
            } while (i--);
        }

        function highlightTextNode(node, regex) {
            let s = node.data, m = s.match(regex), nextNode = null;
            regex.lastIndex = 0;
            while (regex.test(s)) {
                let replaceLen = RegExp.lastMatch.length;
                if (!replaceLen) continue;
                let replaceEnd = regex.lastIndex;
                let replaceStart = replaceEnd - replaceLen;
                let wordNode = node.splitText(replaceStart);
                if (wordNode.data.length > replaceLen) nextNode = wordNode.splitText(replaceLen);
                let newNode = baseNode.cloneNode(false);
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




let sbCacheService = {

    index: 0,
    dataDir: null,
    resList: [],
    folders: [],
    uriHash: {},
    skipFiles: {},

    build: function() {
        document.title = sbCommonUtils.lang("BUILD_CACHE") + " - ScrapBook";
        gCacheStatus.firstChild.value = sbCommonUtils.lang("BUILD_CACHE_INIT");
        sbCacheSource.refreshEntries();
        this.dataDir = sbCommonUtils.getScrapBookDir().clone();
        this.dataDir.append("data");
        let contResList = sbDataSource.flattenResources(sbCommonUtils.RDF.GetResource("urn:scrapbook:root"), 1, true);
        for ( let i = 0; i < contResList.length; i++ ) {
            let resList = sbDataSource.flattenResources(contResList[i], 0, false);
            resList.shift(); // remove container itself
            for ( let j = 0; j < resList.length; j++ ) {
                let type = sbDataSource.getProperty(resList[j], "type");
                if ( type == "folder" || type == "separator" ) continue;
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

    processAsync: function() {
        let res = this.resList[this.index];
        // update trace message
        document.title = sbDataSource.getProperty(sbCommonUtils.RDF.GetResource(this.folders[this.index]), "title") || sbCommonUtils.lang("BUILD_CACHE");
        gCacheStatus.firstChild.value = sbCommonUtils.lang("BUILD_CACHE_UPDATE", sbDataSource.getProperty(res, "title"));
        gCacheStatus.lastChild.value = Math.round((this.index + 1) / this.resList.length * 100);
        // inspect the data and do the cache
        let id = sbDataSource.getProperty(res, "id");
        let dir = this.dataDir.clone();
        dir.append(id);
        let type = sbDataSource.getProperty(res, "type");
        switch ( type ) {
            case "":
            case "marked":
                let file = dir.clone();
                file.append("index.html");
                if (!file.exists()) break;
                // if the file is rather small, check for a possible meta refresh to the real html file
                if (file.fileSize <= 512) {
                    let redirectFile = sbCommonUtils.readMetaRefresh(file);
                    if (redirectFile) {
                        // found meta refresh, check further
                        if (!redirectFile.exists()) break;
                        let mime = sbCommonUtils.getFileMime(redirectFile);
                        if ( !mime || ["text/html", "application/xhtml+xml"].indexOf(mime) < 0 ) break;
                        let basePathCut = dir.path.length + 1;
                        sbCacheService.inspectFile(redirectFile, redirectFile.path.substring(basePathCut).replace(/\\/g, "/"), "html");
                        break;
                    }
                }
                // cache the file
                sbCacheService.inspectFile(file, "index.html", "html");
                break;
            case "site":
                let file = dir.clone(); file.append("index.html");
                if (!file.exists()) break;
                sbCacheService.inspectFile(file, "index.html", "html");
                let url2name = dir.clone(); url2name.append("sb-url2name.txt");
                if (url2name.exists()) {
                    url2name = sbCommonUtils.readFile(url2name, "UTF-8").split("\n");
                    let limit = sbCommonUtils.getPref("fulltext.sitePagesLimit", 0);
                    for (var i = 0; i < url2name.length; i++) {
                        if (limit >= 0 && i > limit) break; // prevent too large cache
                        let line = url2name[i].split("\t");
                        if (!line[1] || line[1] == "index") continue;
                        let subpath = line[1] + ".html";
                        let file = dir.clone(); file.append(subpath);
                        if (!file.exists()) break;
                        this.inspectFile(file, subpath, "html");
                    }
                }
                break;
            case "combine":
            case "note":
                let file = dir.clone();
                file.append("index.html");
                if (!file.exists()) break;
                sbCacheService.inspectFile(file, "index.html", "html");
                break;
            case "notex":
                let basePathCut = dir.path.length + 1;
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
                let file = dir.clone();
                file.append("index.html");
                if (!file.exists()) break;
                // use a simple heuristic match for meta tag refresh generated by ScrapBook
                // other arbitrary is not guaranteed
                let redirectFile = sbCommonUtils.readMetaRefresh(file);
                if (redirectFile && redirectFile.exists()) {
                    let mime = sbCommonUtils.getFileMime(redirectFile);
                    let basePathCut = dir.path.length + 1;
                    if ( mime && mime.startsWith("text/") ) {
                        sbCacheService.inspectFile(redirectFile, redirectFile.path.substring(basePathCut).replace(/\\/g, "/"), "text");
                    } else {
                        sbCacheService.inspectFile(redirectFile, redirectFile.path.substring(basePathCut).replace(/\\/g, "/"), "none");
                    }
                    break;
                }
                break;
            case "bookmark":
                sbCacheService.inspectFile(null, "index.html", "none");
                break;
            default:
                sbCommonUtils.error(sbCommonUtils.lang("ERR_UNKNOWN_DATA_TYPE", type));
                break;
        }
        // next one
        if ( ++this.index < this.resList.length ) {
            setTimeout(function(){ sbCacheService.processAsync(); }, 0);
        } else {
            setTimeout(function(){ sbCacheService.finalize(); }, 0);
        }
    },

    inspectFile: function(aFile, aSubPath, mode) {
        let resource = sbCommonUtils.RDF.GetResource(this.resList[this.index].ValueUTF8 + "#" + aSubPath);
        let charset = sbDataSource.getProperty(sbCacheService.resList[sbCacheService.index], "chars");
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
            let contents = [];
            addContent(aFile);
            if (mode == "html") sbCacheService.checkFrameFiles(aFile, addContent);
            contents = contents.join("\t").replace(/[\x00-\x1F\x7F\uFFFE\uFFFF]/g, " ").replace(/\s+/g, " ");
        } else {
            let contents = "";
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
                    let content = sbCommonUtils.readFile(aFile, charset);
                    contents.push(sbCommonUtils.convertHTMLtoText(content));
                    break;
                case "text":
                    if (charset) {
                        let content = sbCommonUtils.readFile(aFile, charset);
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
    
    cacheFilter: function(aFile) {
        // only process normal files
        if ( !aFile.isFile() ) return false;
        // only process files with html extension
        if ( !aFile.leafName.match(/\.x?html?$/i) ) return false;
        // skip unreadable or hidden files
        if ( !aFile.isReadable() || aFile.leafName.charAt(0) === "." || aFile.isHidden() ) return false;
        return true;
    },

    checkFrameFiles: function(aFile, aCallback) {
        let dir = aFile.parent;
        if (!dir) return;
        let fileLR = sbCommonUtils.splitFileName(aFile.leafName);
        // index.html => index_#.html  (ScrapBook style)
        let i = 1;
        while (true) {
            let file1 = dir.clone();
            file1.append(fileLR[0] + "_" + i + "." + fileLR[1]);
            if (!file1.exists()) break;
            sbCacheService.skipFiles[file1.path] = true;
            aCallback(file1);
            i++;
        }
        // index.html => index.files/*  (IE archive style)
        let dir1 = dir.clone();
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
        let dir1 = dir.clone();
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

    finalize: function() {
        document.title = sbCommonUtils.lang("BUILD_CACHE");
        let toRemove = [];
        for ( let uri in this.uriHash ) {
            if ( !this.uriHash[uri] && uri != "urn:scrapbook:cache" ) {
                toRemove.push(uri);
            }
        }
        (function () {
            let uri = toRemove.shift();
            if (uri) {
                // next
                gCacheStatus.firstChild.value = sbCommonUtils.lang("BUILD_CACHE_REMOVE", uri);
                sbCacheSource.removeEntry(sbCommonUtils.RDF.GetResource(uri));
                setTimeout(arguments.callee, 0);
            } else {
                // done
                gCacheStatus.firstChild.value = sbCommonUtils.lang("BUILD_CACHE_UPDATE", "cache.rdf");
                sbCacheSource.flush();
                try {
                    if ( window.arguments[0] ) {
                        let win = sbCommonUtils.getBrowserWindow();
                        let inTab = (win.content.location.href.startsWith("chrome://scrapbook/content/result.xul")) ? false : sbCommonUtils.getPref("tabs.searchResult", false);
                        sbCommonUtils.loadURL(window.arguments[0], inTab);
                    }
                } catch(ex) {
                }
                window.close();
            }
        })();
    },

};




let sbCacheSource = {

    dataSource: null,
    container: null,

    init: function() {
        this.dataSource = sbCommonUtils.getRDFDataSource(gCacheFile, "urn:scrapbook:cache");
        this.container = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
        try {
            this.container.Init(this.dataSource, sbCommonUtils.RDF.GetResource("urn:scrapbook:cache"));
        } catch(ex) {
            this.container = sbCommonUtils.RDFCU.MakeSeq(this.dataSource, sbCommonUtils.RDF.GetResource("urn:scrapbook:cache"));
        }
    },

    refreshEntries: function() {
        let resEnum = this.dataSource.GetAllResources();
        while ( resEnum.hasMoreElements() ) {
            let res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
            if ( res.ValueUTF8.indexOf("#") == -1 && res.ValueUTF8 != "urn:scrapbook:cache" ) {
                this.removeEntry(res);
            } else {
                sbCacheService.uriHash[res.ValueUTF8] = false;
            }
        }
        this.container = sbCommonUtils.RDFCU.MakeSeq(this.dataSource, sbCommonUtils.RDF.GetResource("urn:scrapbook:cache"));
    },

    addEntry: function(aRes, aFolder, aCharset, aContent) {
        this.container.AppendElement(aRes);
        this.updateEntry(aRes, "folder", aFolder);
        this.updateEntry(aRes, "charset", aCharset);
        this.updateEntry(aRes, "content", aContent);
    },

    updateEntry: function(aRes, aProp, newVal) {
        newVal = sbDataSource.sanitize(newVal);
        aProp = sbCommonUtils.RDF.GetResource(sbCommonUtils.namespace + aProp);
        let oldVal = this.dataSource.GetTarget(aRes, aProp, true);
        if (oldVal == sbCommonUtils.RDF.NS_RDF_NO_VALUE) {
            this.dataSource.Assert(aRes, aProp, sbCommonUtils.RDF.GetLiteral(newVal), true);
        } else {
            oldVal = oldVal.QueryInterface(Components.interfaces.nsIRDFLiteral);
            newVal = sbCommonUtils.RDF.GetLiteral(newVal);
            this.dataSource.Change(aRes, aProp, oldVal, newVal);
        }
    },

    removeEntry: function(aRes) {
        this.container.RemoveElement(aRes, true);
        let names = this.dataSource.ArcLabelsOut(aRes);
        while ( names.hasMoreElements() ) {
            let name = names.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
            let value = this.dataSource.GetTarget(aRes, name, true);
            this.dataSource.Unassert(aRes, name, value);
        }
    },

    getProperty: function(aRes, aProp) {
        try {
            let retVal = this.dataSource.GetTarget(aRes, sbCommonUtils.RDF.GetResource(sbCommonUtils.namespace + aProp), true);
            return retVal.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
        } catch(ex) {
            return "";
        }
    },

    exists: function(aRes) {
        return (this.dataSource.ArcLabelsOut(aRes).hasMoreElements() && this.container.IndexOf(aRes) != -1);
    },

    flush: function() {
        this.dataSource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
    }

};
