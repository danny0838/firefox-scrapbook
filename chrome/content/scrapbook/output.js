
let sbOutputService = {

    depth: 0,
    content: "",
    isAuto: false,
    optionAll: true,
    optionFrame: false,
    optionOpen: true,

    /**
     * window.arguments[0]: true means is auto mode
     */
    init: function() {
        if (window.arguments && window.arguments[0]) this.isAuto = true;
        document.documentElement.getButton("accept").label = sbCommonUtils.lang("START_BUTTON");
        sbTreeHandler.init(true);
        this.selectAllFolders();
        if ( this.isAuto ) this.start();
    },

    selectAllFolders: function() {
        if ( document.getElementById('ScrapBookOutputOptionA').checked ) {
            sbTreeHandler.toggleAllFolders(true);
            sbTreeHandler.TREE.view.selection.selectAll();
            sbTreeHandler.TREE.treeBoxObject.focused = true;
        }
    },

    toggleAllSelection: function() {
        document.getElementById("ScrapBookOutputOptionA").checked = false;
    },

    start: function() {
        this.optionAll = document.getElementById("ScrapBookOutputOptionA").checked;
        this.optionFrame = document.getElementById("ScrapBookOutputOptionF").checked;
        this.optionOpen = document.getElementById("ScrapBookOutputOptionO").checked;
        if ( this.isAuto ) {
            this.optionOpen = false;
        }
        this.optionAll ? this.execAll() : this.exec();
        sbTreeHandler.toggleAllFolders(true);
        if ( this.isAuto ) window.close();
    },

    execAll: function() {
        this.content = this.getHTMLHead();
        this.processRescursively(sbTreeHandler.TREE.resource);
        this.finalize();
    },

    exec: function() {
        this.content = this.getHTMLHead();
        let selResList = sbTreeHandler.getSelection(true, 1);
        this.content += '<ul id="container-root">\n';
        for ( let i = 0; i < selResList.length; i++ ) {
            this.content += '<li class="depth' + String(this.depth) + '">';
            this.content += this.getHTMLBody(selResList[i]);
            this.processRescursively(selResList[i]);
            this.content += "</li>\n";
        }
        this.content += "</ul>\n";
        this.finalize();
    },

    finalize: function() {
        let dir = sbCommonUtils.getScrapBookDir().clone();
        dir.append("tree");
        if ( !dir.exists() ) dir.create(dir.DIRECTORY_TYPE, 0700);
        let urlHash = {
            "chrome://scrapbook/skin/treeitem.png": "treeitem.png",
            "chrome://scrapbook/skin/treenote.png": "treenote.png",
            "chrome://scrapbook/skin/treenotex.png": "treenotex.png",
            "chrome://scrapbook/skin/treefolder.png": "treefolder.png",
            "chrome://scrapbook/skin/toolbar_toggle.png": "toggle.png",
            "chrome://scrapbook/skin/search_all.png": "search.png",
        };
        for ( let url in urlHash ) {
            let destFile = dir.clone();
            destFile.append(urlHash[url]);
            sbCommonUtils.saveTemplateFile(url, destFile);
        }
        let frameFile = dir.clone();
        frameFile.append("frame.html");
        sbCommonUtils.writeFile(frameFile, this.getHTMLFrame(), "UTF-8");
        let indexFile = dir.clone();
        indexFile.append("index.html");
        this.content += this.getHTMLFoot();
        sbCommonUtils.writeFile(indexFile, this.content, "UTF-8");
        let searchFile = dir.parent;
        searchFile.append("search.html");
        sbCommonUtils.writeFile(searchFile, this.getHTMLSearch(), "UTF-8");
        let indexCSS = dir.clone();
        indexCSS.append('index.css');
        sbCommonUtils.saveTemplateFile("chrome://scrapbook/skin/output.css", indexCSS, true);
        sbDataSource.outputTreeAutoDone();
        if ( this.optionOpen ) {
            let fileName = this.optionFrame ? "frame.html" : "index.html";
            sbCommonUtils.loadURL(sbCommonUtils.convertFileToURL(dir) + fileName, true);
        }
    },

    processRescursively: function(aContRes) {
        this.depth++;
        let id = sbDataSource.getProperty(aContRes, "id") || "root";
        this.content += '<ul id="container-' + id + '">\n';
        let resList = sbDataSource.flattenResources(aContRes, 0, false);
        for (var i = 1; i < resList.length; i++) {
            this.content += '<li class="depth' + String(this.depth) + '">';
            this.content += this.getHTMLBody(resList[i]);
            if (sbDataSource.isContainer(resList[i]))
                this.processRescursively(resList[i]);
            this.content += "</li>\n";
        }
        this.content += "</ul>\n";
        this.depth--;
    },

    getHTMLTitle: function() {
        let dataPath = sbCommonUtils.getPref("data.path", "");
        let dataTitle = sbCommonUtils.getPref("data.title", "");
        let title = ((dataPath && dataTitle) ? dataTitle + " - " : "") + "ScrapBook";
        return sbCommonUtils.escapeHTMLWithSpace(title, true);
    },

    getHTMLHead: function() {
        let HTML = '<!DOCTYPE html>\n'
            + '<html id="scrapbook-index">\n\n'
            + '<head>\n'
            + '<meta charset="UTF-8">\n'
            + '<title>' + this.getHTMLTitle() + '</title>\n'
            + '<meta name="viewport" content="width=device-width">\n'
            + '<link rel="stylesheet" type="text/css" href="index.css" media="all">\n'
            + '<link rel="stylesheet" type="text/css" href="custom.css" media="all">\n'
            + '<script>\n'
            + 'function init() {\n'
            + '    toggleAll(false);\n'
            + '    try {\n'
            + '        initLoadHash();\n'
            + '    } catch(ex) {\n'
            + '        if (console && console.error) console.error(ex);\n'
            + '    }\n'
            + '    initEvents();\n'
            + '}\n'
            + 'function initLoadHash() {\n'
            + '    let hash = top.location.hash, hashTargetUrl, hashTargetItem;\n'
            + '    if (hash) {\n'
            + '        hashTargetUrl = hash.substring(1);\n'
            + '        let mainPage = hashTargetUrl.replace(/^(\\.\\.\\/data\\/\\d{14})\\/.*/, "$1/index.html");\n'
            + '        let elems = document.getElementById("container-root").getElementsByTagName("A");\n'
            + '        for ( let i = 0, I = elems.length; i < I; i++ ) {\n'
            + '            if (elems[i].getAttribute("href") == mainPage) {\n'
            + '                hashTargetItem = elems[i];\n'
            + '                break;\n'
            + '            }\n'
            + '        }\n'
            + '    }\n'
            + '    if (hashTargetUrl) {\n'
            + '        if (self != top) top.frames["main"].location = hashTargetUrl;\n'
            + '    }\n'
            + '    if (hashTargetItem) {\n'
            + '        if (self != top && hashTargetItem.title) top.document.title = hashTargetItem.title;\n'
            + '        let ancs = hashTargetItem;\n'
            + '        while (ancs) { \n'
            + '            if (ancs.nodeName == "UL") toggleElem(ancs, true);\n' 
            + '            ancs = ancs.parentNode;\n'
            + '        }\n'
            + '        hashTargetItem.focus();\n'
            + '    }\n'
            + '}\n'
            + 'function initEvents() {\n'
            + '    document.getElementById("toggle-all").onclick = function () {\n'
            + '        toggleAll();\n'
            + '        return false;\n'
            + '    }\n'
            + '    let elems = document.getElementById("container-root").getElementsByTagName("A");\n'
            + '    for ( let i = 0, I = elems.length; i < I; i++ ) {\n'
            + '        if (elems[i].className == "container") {\n'
            + '            elems[i].onclick = onClickContainer;\n'
            + '        } else if (elems[i].className == "folder") {\n'
            + '            elems[i].onclick = onClickFolder;\n'
            + '        } else {\n'
            + '            elems[i].onclick = onClickItem;\n'
            + '        }\n'
            + '    }\n'
            + '}\n'
            + 'function onClickContainer() {\n'
            + '    let ulElem = document.getElementById(this.id.replace(/^item-/, "container-"));\n'
            + '    if (ulElem) toggleElem(ulElem);\n'
            + '    return false;\n'
            + '}\n'
            + 'function onClickFolder() {\n'
            + '    let cElem = this.previousSibling;\n'
            + '    cElem.focus();\n'
            + '    cElem.click();\n'
            + '    return false;\n'
            + '}\n'
            + 'function onClickItem() {\n'
            + '    if (self == top) return;\n'
            + '    let hash = "#" + this.getAttribute("href");\n'
            + '    let title = this.childNodes[1].nodeValue;\n'
            + '    try {\n'
            + '        if (history && history.pushState) top.history.pushState("", title, hash);\n'
            + '        else top.location.hash = hash;\n'
            + '        top.document.title = title;\n'
            + '    } catch(ex) {\n'
            + '        if (console && console.error) console.error(ex);\n'
            + '    }\n'
            + '}\n'
            + 'function toggleElem(elem, willOpen) {\n'
            + '    let iElem = document.getElementById(elem.id.replace(/^container-/, "item-"));\n'
            + '    if (!iElem) return;\n'
            + '    if (typeof willOpen === "undefined") willOpen = (elem.style.display == "none");\n'
            + '    if (willOpen) {\n'
            + '        elem.style.display = "block";\n'
            + '        iElem.textContent = "▽";\n'
            + '    }\n'
            + '    else {\n'
            + '        elem.style.display = "none";\n'
            + '        iElem.textContent = "▷";\n'
            + '    }\n'
            + '}\n'
            + 'function toggleAll(willOpen) {\n'
            + '    let ulElems = document.getElementsByTagName("UL");\n'
            + '    if (typeof willOpen === "undefined") {\n'
            + '        willOpen = false;\n'
            + '        for ( let i = 1; i < ulElems.length; i++ ) {\n'
            + '            if (ulElems[i].style.display == "none") { willOpen = true; break; }\n'
            + '        }\n'
            + '    }\n'
            + '    for ( let i = 1; i < ulElems.length; i++ ) {\n'
            + '        toggleElem(ulElems[i], willOpen);\n'
            + '    }\n'
            + '}\n'
            + '</script>\n'
            + '<script src="custom.js"></script>\n'
            + '</head>\n\n'
            + '<body>\n'
            + '<div id="header"><a id="toggle-all" title="Toggle all folders" href="#"><img src="toggle.png" alt="">ScrapBook</a> <a id="search" href="../search.html"><img src="search.png" alt=""></a></div>\n'
        return HTML;
    },

    getHTMLBody: function(aRes) {
        let id = sbDataSource.getProperty(aRes, "id");
        let type = sbDataSource.getProperty(aRes, "type");
        let icon = sbDataSource.getProperty(aRes, "icon");
        let title = sbDataSource.getProperty(aRes, "title");
        let source = sbDataSource.getProperty(aRes, "source");
        // fix icon path to fit tree output
        if (icon) {
            icon = icon.replace(/^resource:\/\/scrapbook\//, "../");
        } else {
            icon = sbCommonUtils.getDefaultIcon(type).replace(/^chrome:\/\/scrapbook\/skin\//, "");
        }
        // escape paths for HTML safe
        icon = sbCommonUtils.escapeHTML(icon);
        title = sbCommonUtils.escapeHTMLWithSpace(title);
        source = sbCommonUtils.escapeHTML(source);
        // generate HTML output
        let ret = "";
        if (sbDataSource.isContainer(aRes)) {
            ret += '<a id="item-' + id + '" class="container" title="Toggle" href="#">▷</a>';
        }
        switch (type) {
            case "separator": 
                ret += '<fieldset class="separator" title="' + title + '"><legend>&nbsp;' + title + '&nbsp;</legend></fieldset>';
                break;
            case "bookmark": 
                ret += '<a class="' + type + '" title="' + title + '" href="' + source + '" target="_blank">'
                    + '<img src="' + icon + '" alt="">' + title + '</a>';
                break;
            default: 
                if (type != "folder") {
                    let href = sbCommonUtils.escapeHTML("../data/" + id + "/index.html");
                    let target = this.optionFrame ? ' target="main"' : "";
                    let hrefTarget = ' href="' + href + '"' + target;
                } else {
                    let hrefTarget = '';
                }
                ret += '<a class="' + type + '" title="' + title + '"' + hrefTarget + '>'
                    + '<img src="' + icon + '" alt="">' + title + '</a>';
                if (!source) break;
                ret += ' <a class="bookmark" title="Source" href="' + source + '" target="_blank">➤</a>';
                break;
        }
        return ret;
    },

    getHTMLFoot: function() {
        let HTML = ''
                + '<script>init();</script>\n'
                + '</body>\n'
                + '\n'
                + '</html>\n';
        return HTML;
    },

    getHTMLFrame: function() {
        let HTML = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">\n'
            + '<html id="scrapbook-frame">\n'
            + '<head>\n'
            + '<meta charset="UTF-8">\n'
            + '<title>' + this.getHTMLTitle() + '</title>\n'
            + '<script src="custom.js"></script>\n'
            + '</head>\n'
            + '<frameset cols="200,*">\n'
            + '<frame name="side" src="index.html">\n'
            + '<frame name="main">\n'
            + '</frameset>\n'
            + '</html>\n';
        return HTML;
    },

    getHTMLSearch: function() {
        let HTML = '<!DOCTYPE html>\n'
            + '<html id="scrapbook-search">\n'
            + '<head>\n'
            + '<meta charset="UTF-8">\n'
            + '<title>Search - ScrapBook</title>\n'
            + '<meta name="viewport" content="width=device-width">\n'
            + '<link rel="stylesheet" type="text/css" href="tree/index.css" media="all">\n'
            + '<link rel="stylesheet" type="text/css" href="tree/custom.css" media="all">\n'
            + '<script>\n'
            + 'var scrapbooks = [\n'
            + '    { name: "", path: "." }\n'
            + '];\n'
            + '\n'
            + 'var searchEngine = {\n'
            + '\n'
            + '    config: {\n'
            + '        "default_search": "",    // the constant string to add before the input keyword\n'
            + '        "default_field": "tcc",  // the field to search for bare key terms\n'
            + '        "list_bullet": "◉",      // the symbol for the list bullet\n'
            + '        "allow_http": 0          // whether to load rdf cache from the http? -1: deny, 0: ask; 1: allow\n'
            + '    },\n'
            + '\n'
            + '    init: function () {\n'
            + '        let that = this;\n'
            + '\n'
            + '        // load rdf files\n'
            + '        let loading_done = 0, loading_errors = 0;\n'
            + '        for (var scrapbooks_index = 0, scrapbooks_len = scrapbooks.length; scrapbooks_index < scrapbooks_len; scrapbooks_index++) {\n'
            + '            (function(){\n'
            + '                let scrapbook = scrapbooks[scrapbooks_index];\n'
            + '                let type = "cache.rdf";\n'
            + '                let path = scrapbook.path + "/" + type;\n'
            + '                that.loadXMLDoc(path, function(xml){\n'
            + '                    // some mobile browsers (e.g. Dolphin) do not support xmlDoc.getElementsByTagName\n'
            + '                    let items = xml.documentElement.childNodes, data = [];\n'
            + '                    for (var i = 0, len = items.length; i < len; i++) {\n'
            + '                        let item = items[i];\n'
            + '                        if (item.nodeName != "RDF:Description") continue;\n'
            + '                        let id_path = item.getAttribute("RDF:about").match(/^urn:scrapbook:item(\\d{14})#(.*?)$/);\n'
            + '                        data.push({\n'
            + '                            "id": id_path[1],\n'
            + '                            "path": id_path[2],\n'
            + '                            "content": item.getAttribute("NS1:content")\n'
            + '                        });\n'
            + '                    }\n'
            + '                    scrapbook.cache = data;\n'
            + '                    loading_done++;\n'
            + '                    checkLoad();\n'
            + '                }, function(){\n'
            + '                    that.addMsg("Unable to load database: " + path);\n'
            + '                    loading_errors++;\n'
            + '                    loading_done++;\n'
            + '                    checkLoad();\n'
            + '                });\n'
            + '            })();\n'
            + '            (function(){\n'
            + '                let scrapbook = scrapbooks[scrapbooks_index];\n'
            + '                let type = "scrapbook.rdf";\n'
            + '                let path = scrapbook.path + "/" + type;\n'
            + '                that.loadXMLDoc(path, function(xml){\n'
            + '                    // some mobile browsers (e.g. Dolphin) do not support xmlDoc.getElementsByTagName\n'
            + '                    let items = xml.documentElement.childNodes, data = [];\n'
            + '                    for (var i = 0, len = items.length; i < len; i++) {\n'
            + '                        let item = items[i];\n'
            + '                        if (item.nodeName != "RDF:Description") continue;\n'
            + '                        let id = item.getAttribute("NS1:id");\n'
            + '                        data[id] = {\n'
            + '                            "id": id,\n'
            + '                            "type": item.getAttribute("NS1:type"),\n'
            + '                            "title": item.getAttribute("NS1:title"),\n'
            + '                            "source": item.getAttribute("NS1:source"),\n'
            + '                            "comment": item.getAttribute("NS1:comment"),\n'
            + '                            "create": item.getAttribute("NS1:create"),\n'
            + '                            "modify": item.getAttribute("NS1:modify")\n'
            + '                        };\n'
            + '                    }\n'
            + '                    scrapbook.data = data;\n'
            + '                    loading_done++;\n'
            + '                    checkLoad();\n'
            + '                }, function(){\n'
            + '                    that.addMsg("Unable to load database: " + path);\n'
            + '                    loading_errors++;\n'
            + '                    loading_done++;\n'
            + '                    checkLoad();\n'
            + '                });\n'
            + '            })();\n'
            + '        }\n'
            + '\n'
            + '        function checkLoad() {\n'
            + '            // if all fail, show message for possibly no AJAX support\n'
            + '            if (loading_errors == scrapbooks_len * 2) {\n'
            + '                that.addMsg("Error: Unable to load any database. Maybe your browser doesn\'t support AJAX connection?");\n'
            + '                return;\n'
            + '            }\n'
            + '            // if all success?\n'
            + '            for (var i = 0, I = scrapbooks.length; i < I; i++) {\n'
            + '                let scrapbook = scrapbooks[i];\n'
            + '                if (!(scrapbook.data && scrapbook.cache)) return;\n'
            + '            }\n'
            + '            // enable the search button\n'
            + '            document.getElementById("search").removeAttribute("disabled");\n'
            + '        }\n'
            + '    },\n'
            + '\n'
            + '    loadXMLDoc: function(url, callback, error_handler) {\n'
            + '        try {\n'
            + '            let that = this;\n'
            + '            checkHttp(url);\n'
            + '            let xmlhttp;\n'
            + '            if (window.XMLHttpRequest) {  // code for IE7+, Firefox, Chrome, Opera, Safari\n'
            + '                xmlhttp = new XMLHttpRequest();\n'
            + '            }\n'
            + '            else {  // code for IE6, IE5\n'
            + '                xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");\n'
            + '            }\n'
            + '            xmlhttp.onreadystatechange = function() {\n'
            + '                if (xmlhttp.readyState != 4) return;\n'
            + '                if (xmlhttp.status == 200 || (xmlhttp.status == 0 && xmlhttp.responseXML)) {\n'
            + '                    callback.call(that, xmlhttp.responseXML);\n'
            + '                }\n'
            + '                else {\n'
            + '                    error_handler.call(that);\n'
            + '                }\n'
            + '            }\n'
            + '            xmlhttp.open("GET", url, true);\n'
            + '            xmlhttp.send();\n'
            + '            return xmlhttp;\n'
            + '        }\n'
            + '        catch (ex) {\n'
            + '            error_handler.call(that);\n'
            + '            return null;\n'
            + '        }\n'
            + '\n'
            + '        function checkHttp(url) {\n'
            + '            if (that.config.allow_http == 1) return;\n'
            + '            if (location.protocol.match(/https?/) || url.match(/^https?/)) {\n'
            + '                if (that.config.allow_http == -1) {\n'
            + '                    throw "HTTP traffic is not allowed";\n'
            + '                }\n'
            + '                else if (confirm("Loading search database from the web could produce large network flow. Continue?")) {\n'
            + '                    that.config.allow_http = 1;\n'
            + '                }\n'
            + '                else {\n'
            + '                    that.config.allow_http = -1;\n'
            + '                    throw "HTTP traffic is not allowed";\n'
            + '                }\n'
            + '            }\n'
            + '        }\n'
            + '    },\n'
            + '\n'
            + '    search: function() {\n'
            + '        this.clearResult();\n'
            + '        try {\n'
            + '            // parse key\n'
            + '            let keyStr = document.getElementById("keyword").value;\n'
            + '            if (this.config["default_search"]) keyStr = this.config["default_search"] + " " + keyStr;\n'
            + '            let key = this.parseQuery(keyStr);\n'
            + '            if (key.error.length) {\n'
            + '                for (var i = 0, len = key.error.length; i < len; i++) {\n'
            + '                    this.addMsg(key.error[i]);\n'
            + '                }\n'
            + '                return;\n'
            + '            }\n'
            + '            // get result\n'
            + '            for (var scrapbooks_index = 0, scrapbooks_len = scrapbooks.length; scrapbooks_index < scrapbooks_len; scrapbooks_index++) {\n'
            + '                let scrapbook = scrapbooks[scrapbooks_index];\n'
            + '                let result = [];\n'
            + '                for (var i = 0, len = scrapbook.cache.length; i < len; i++) {\n'
            + '                    let item = scrapbook.cache[i];\n'
            + '                    let data = {\n'
            + '                        "cache": item,\n'
            + '                        "item": scrapbook.data[item.id]\n'
            + '                    };\n'
            + '                    if (this.matchResult(data, key)) {\n'
            + '                        result.push(data);\n'
            + '                    }\n'
            + '                }\n'
            + '                // sort result\n'
            + '                for (var i = 0, len = key.sort.length; i < len; i++) {\n'
            + '                    let sortKey = key.sort[i];\n'
            + '                    result.sort(function(a, b){\n'
            + '                        a = a[sortKey[0]][sortKey[1]];\n'
            + '                        b = b[sortKey[0]][sortKey[1]];\n'
            + '                        if (a > b) return sortKey[2];\n'
            + '                        if (a < b) return -sortKey[2];\n'
            + '                        return 0;\n'
            + '                    });\n'
            + '                }\n'
            + '                // display result\n'
            + '                let scrapbook_name = scrapbook.name ? "(" + scrapbook.name + ") " : "";\n'
            + '                this.addMsg(scrapbook_name + "Found " + result.length + " results:");\n'
            + '                for (var i = 0, len = result.length; i < len; i++) {\n'
            + '                    this.addResult(result[i], scrapbook);\n'
            + '                }\n'
            + '            }\n'
            + '        }\n'
            + '        catch (ex) {\n'
            + '            alert("Script error: \\n" + ex.name + ": " + ex.message);\n'
            + '            throw ex;\n'
            + '        }\n'
            + '    },\n'
            + '\n'
            + '    parseQuery: function(keyStr) {\n'
            + '        let that = this;\n'
            + '        let key = {\n'
            + '            "error": [],\n'
            + '            "rule": [],\n'
            + '            "sort": [],\n'
            + '            "mc": false,\n'
            + '            "re": false,\n'
            + '            "default": this.config["default_field"]\n'
            + '        };\n'
            + '        keyStr.replace(/(-?[A-Za-z]+:|-)(?:"((?:""|[^"])*)"|([^"\\s]*))|(?:"((?:""|[^"])*)"|([^"\\s]+))/g, function(match, cmd, qterm, term, qterm2, term2){\n'
            + '            if (cmd) {\n'
            + '                let term = (qterm !== undefined) ? qterm.replace(/""/g, \'"\') : term;\n'
            + '            }\n'
            + '            else {\n'
            + '                let term = (qterm2 !== undefined) ? qterm2.replace(/""/g, \'"\') : term2;\n'
            + '            }\n'
            + '            switch (cmd) {\n'
            + '                case "mc:":\n'
            + '                    key.mc = true;\n'
            + '                    break;\n'
            + '                case "-mc:":\n'
            + '                    key.mc = false;\n'
            + '                    break;\n'
            + '                case "re:":\n'
            + '                    key.re = true;\n'
            + '                    break;\n'
            + '                case "-re:":\n'
            + '                    key.re = false;\n'
            + '                    break;\n'
            + '                case "sort:":\n'
            + '                    addSort(term, 1);\n'
            + '                    break;\n'
            + '                case "-sort:":\n'
            + '                    addSort(term, -1);\n'
            + '                    break;\n'
            + '                case "type:":\n'
            + '                    addRule("type", "include", parseStr(term, true));\n'
            + '                    break;\n'
            + '                case "-type:":\n'
            + '                    addRule("type", "exclude", parseStr(term, true));\n'
            + '                    break;\n'
            + '                case "id:":\n'
            + '                    addRule("id", "include", parseStr(term));\n'
            + '                    break;\n'
            + '                case "-id:":\n'
            + '                    addRule("id", "exclude", parseStr(term));\n'
            + '                    break;\n'
            + '                case "file:":\n'
            + '                    addRule("file", "include", parseStr(term));\n'
            + '                    break;\n'
            + '                case "-file:":\n'
            + '                    addRule("file", "exclude", parseStr(term));\n'
            + '                    break;\n'
            + '                case "source:":\n'
            + '                    addRule("source", "include", parseStr(term));\n'
            + '                    break;\n'
            + '                case "-source:":\n'
            + '                    addRule("source", "exclude", parseStr(term));\n'
            + '                    break;\n'
            + '                case "tcc:":\n'
            + '                    addRule("tcc", "include", parseStr(term));\n'
            + '                    break;\n'
            + '                case "-tcc:":\n'
            + '                    addRule("tcc", "exclude", parseStr(term));\n'
            + '                    break;\n'
            + '                case "title:":\n'
            + '                    addRule("title", "include", parseStr(term));\n'
            + '                    break;\n'
            + '                case "-title:":\n'
            + '                    addRule("title", "exclude", parseStr(term));\n'
            + '                    break;\n'
            + '                case "comment:":\n'
            + '                    addRule("comment", "include", parseStr(term));\n'
            + '                    break;\n'
            + '                case "-comment:":\n'
            + '                    addRule("comment", "exclude", parseStr(term));\n'
            + '                    break;\n'
            + '                case "content:":\n'
            + '                    addRule("content", "include", parseStr(term));\n'
            + '                    break;\n'
            + '                case "-content:":\n'
            + '                    addRule("content", "exclude", parseStr(term));\n'
            + '                    break;\n'
            + '                case "create:":\n'
            + '                    addRule("create", "include", parseDate(term));\n'
            + '                    break;\n'
            + '                case "-create:":\n'
            + '                    addRule("create", "exclude", parseDate(term));\n'
            + '                    break;\n'
            + '                case "modify:":\n'
            + '                    addRule("modify", "include", parseDate(term));\n'
            + '                    break;\n'
            + '                case "-modify:":\n'
            + '                    addRule("modify", "exclude", parseDate(term));\n'
            + '                    break;\n'
            + '                case "-":\n'
            + '                    addRule(key["default"], "exclude", parseStr(term));\n'
            + '                    break;\n'
            + '                default:\n'
            + '                    addRule(key["default"], "include", parseStr(term));\n'
            + '                    break;\n'
            + '            }\n'
            + '            return "";\n'
            + '\n'
            + '            function addRule(name, type, value) {\n'
            + '                if (key.rule[name] === undefined) key.rule[name] = { "include": [], "exclude": [] };\n'
            + '                key.rule[name][type].push(value);\n'
            + '            }\n'
            + '\n'
            + '            function addSort(field, order) {\n'
            + '                if (["path", "content"].indexOf(field) >= 0) {\n'
            + '                    key.sort.push(["cache", field, order]);\n'
            + '                    return;\n'
            + '                }\n'
            + '                key.sort.push(["item", field, order]);\n'
            + '            }\n'
            + '\n'
            + '            function addError(msg) {\n'
            + '                key.error.push(msg);\n'
            + '            }\n'
            + '\n'
            + '            function parseStr(term, exactMatch) {\n'
            + '                let options = key.mc ? "m" : "im";\n'
            + '                if (key.re) {\n'
            + '                    try {\n'
            + '                        let regex = new RegExp(term, options);\n'
            + '                    } catch(ex) {\n'
            + '                        addError("Invalid RegExp: " + term);\n'
            + '                        return null;\n'
            + '                    }\n'
            + '                }\n'
            + '                else {\n'
            + '                    let q = that.escapeRegExp(term);\n'
            + '                    if (exactMatch) q = "^" + q + "$";\n'
            + '                    let regex = new RegExp(q, options);\n'
            + '                }\n'
            + '                return regex;\n'
            + '            }\n'
            + '\n'
            + '            function parseDate(term) {\n'
            + '                let match = term.match(/^(\\d{0,14})-?(\\d{0,14})$/);\n'
            + '                if (!match) {\n'
            + '                    addError("Invalid date format: " + term);\n'
            + '                    return null;\n'
            + '                }\n'
            + '                let since = match[1] ? pad(match[1], 14) : pad(match[1], 14);\n'
            + '                let until = match[2] ? pad(match[2], 14) : pad(match[2], 14, "9");\n'
            + '                return [parseInt(since, 10), parseInt(until, 10)];\n'
            + '            }\n'
            + '\n'
            + '            function pad(n, width, z) {\n'
            + '                z = z || "0";\n'
            + '                n = n + "";\n'
            + '                return n.length >= width ? n : n + new Array(width - n.length + 1).join(z);\n'
            + '            }\n'
            + '        });\n'
            + '        return key;\n'
            + '    },\n'
            + '\n'
            + '    matchResult: function(data, key) {\n'
            + '        if (!data.item) {\n'
            + '            return false;\n'
            + '        }\n'
            + '        for (var i in key.rule) {\n'
            + '            if (!this["_match_"+i](key.rule[i], data)) return false;\n'
            + '        }\n'
            + '        return true;\n'
            + '    },\n'
            + '\n'
            + '    _match_tcc: function(keyitem, data) {\n'
            + '        return this.matchText(keyitem, [data.item.title, data.item.comment, data.cache.content].join("\\n"));\n'
            + '    },\n'
            + '\n'
            + '    _match_content: function(keyitem, data) {\n'
            + '        return this.matchText(keyitem, data.cache.content);\n'
            + '    },\n'
            + '\n'
            + '    _match_id: function(keyitem, data) {\n'
            + '        return this.matchText(keyitem, data.item.id);\n'
            + '    },\n'
            + '\n'
            + '    _match_file: function(keyitem, data) {\n'
            + '        return this.matchText(keyitem, data.cache.path);\n'
            + '    },\n'
            + '\n'
            + '    _match_title: function(keyitem, data) {\n'
            + '        return this.matchText(keyitem, data.item.title);\n'
            + '    },\n'
            + '\n'
            + '    _match_comment: function(keyitem, data) {\n'
            + '        return this.matchText(keyitem, data.item.comment);\n'
            + '    },\n'
            + '\n'
            + '    _match_source: function(keyitem, data) {\n'
            + '        return this.matchText(keyitem, data.item.source);\n'
            + '    },\n'
            + '\n'
            + '    _match_type: function(keyitem, data) {\n'
            + '        let text = data.item.type;\n'
            + '        for (var i=0, len=keyitem.exclude.length; i<len; i++) {\n'
            + '            if (keyitem.exclude[i].test(text)) {\n'
            + '                return false;\n'
            + '            }\n'
            + '        }\n'
            + '        // uses "or" clause\n'
            + '        if (!keyitem.include.length) return true;\n'
            + '        for (var i=0, len=keyitem.include.length; i<len; i++) {\n'
            + '            if (keyitem.include[i].test(text)) {\n'
            + '                return true;\n'
            + '            }\n'
            + '        }\n'
            + '        return false;\n'
            + '    },\n'
            + '\n'
            + '    _match_create: function(keyitem, data) {\n'
            + '        return this.matchDate(keyitem, data.item.create);\n'
            + '    },\n'
            + '\n'
            + '    _match_modify: function(keyitem, data) {\n'
            + '        return this.matchDate(keyitem, data.item.modify);\n'
            + '    },\n'
            + '\n'
            + '    matchText: function(keyitem, text) {\n'
            + '        for (var i=0, len=keyitem.exclude.length; i<len; i++) {\n'
            + '            if (keyitem.exclude[i].test(text)) {\n'
            + '                return false;\n'
            + '            }\n'
            + '        }\n'
            + '        for (var i=0, len=keyitem.include.length; i<len; i++) {\n'
            + '            if (!keyitem.include[i].test(text)) {\n'
            + '                return false;\n'
            + '            }\n'
            + '        }\n'
            + '        return true;\n'
            + '    },\n'
            + '\n'
            + '    matchDate: function(keyitem, date) {\n'
            + '        if (!date) return false;\n'
            + '        let date = parseInt(date, 10);\n'
            + '        for (var i=0, len=keyitem.exclude.length; i<len; i++) {\n'
            + '            if (keyitem.exclude[i][0] <= date && date <= keyitem.exclude[i][1]) {\n'
            + '                return false;\n'
            + '            }\n'
            + '        }\n'
            + '        for (var i=0, len=keyitem.include.length; i<len; i++) {\n'
            + '            if (!(keyitem.include[i][0] <= date && date <= keyitem.include[i][1])) {\n'
            + '                return false;\n'
            + '            }\n'
            + '        }\n'
            + '        return true;\n'
            + '    },\n'
            + '\n'
            + '    addResult: function(data, scrapbook) {\n'
            + '        let cache = data.cache;\n'
            + '        let item = data.item;\n'
            + '        let wrapper = document.getElementById("result");\n'
            + '        let result = document.createElement("li");\n'
            + '        let subpath = "data/" + item.id + "/" + cache.path.replace(/[^\\/]+/g, function(m){return encodeURIComponent(m);});\n'
            + '        let bullet = this.config["list_bullet"] + " ";\n'
            + '        let text = item.type == "bookmark" ?\n'
            + '            bullet + item.title:\n'
            + '            item.title + ((cache.path != "index.html") ? (" (" + cache.path + ")") : "");\n'
            + '        if (item.type != "bookmark") {\n'
            + '            let href = scrapbook.path + "/" + "tree/frame.html#../" + subpath;\n'
            + '            let link = document.createElement("a");\n'
            + '            link.setAttribute("href", href);\n'
            + '            link.setAttribute("target", "_blank");\n'
            + '            link.setAttribute("class", "bookmark");\n'
            + '            link.setAttribute("title", "View In Frame");\n'
            + '            link.appendChild(document.createTextNode(bullet));\n'
            + '            result.appendChild(link);\n'
            + '        }\n'
            + '        let href = (item.type == "bookmark") ? item.source : scrapbook.path + "/" + subpath;\n'
            + '        let target = (item.type == "bookmark") ? "_blank" : "main";\n'
            + '        let link = document.createElement("a");\n'
            + '        link.setAttribute("href", href);\n'
            + '        link.setAttribute("target", target);\n'
            + '        link.setAttribute("class", item.type);\n'
            + '        link.setAttribute("title", item.title);\n'
            + '        link.appendChild(document.createTextNode(text));\n'
            + '        result.appendChild(link);\n'
            + '        wrapper.appendChild(result);\n'
            + '    },\n'
            + '\n'
            + '    clearResult: function() {\n'
            + '        let result = document.getElementById("result"), child;\n'
            + '        while ((child = result.firstChild)) result.removeChild(child);\n'
            + '    },\n'
            + '\n'
            + '    addMsg: function(msg) {\n'
            + '        let wrapper = document.getElementById("result");\n'
            + '        let result = document.createElement("li");\n'
            + '        result.appendChild(document.createTextNode(msg));\n'
            + '        wrapper.appendChild(result);\n'
            + '    },\n'
            + '\n'
            + '    escapeRegExp: function(str) {\n'
            + '        return str.replace(/([\\*\\+\\?\\.\\^\\/\\$\\\\\\|\\[\\]\\{\\}\\(\\)])/g, "\\\\$1");\n'
            + '    },\n'
            + '\n'
            + '    helperFill: function() {\n'
            + '        let helper = document.getElementById("helper");\n'
            + '        let keyword = document.getElementById("keyword");\n'
            + '        keyword.value = keyword.value + (keyword.value == "" ? "" : " ") + helper.value;\n'
            + '        helper.selectedIndex = 0;\n'
            + '        keyword.focus();\n'
            + '        keyword.setSelectionRange(keyword.value.length, keyword.value.length);\n'
            + '    }\n'
            + '};\n'
            + '</script>\n'
            + '<script src="tree/custom.js"></script>\n'
            + '</head>\n'
            + '<body onload="searchEngine.init();">\n'
            + '<form action="javascript:searchEngine.search();">\n'
            + '    <input id="keyword" type="text">\n'
            + '    <select id="helper" onchange="searchEngine.helperFill();" style="width: 2em;">\n'
            + '        <option value="" selected="selected"></option>\n'
            + '        <option value="id:">id:</option>\n'
            + '        <option value="title:">title:</option>\n'
            + '        <option value="comment:">comment:</option>\n'
            + '        <option value="content:">content:</option>\n'
            + '        <option value="tcc:">tcc:</option>\n'
            + '        <option value="source:">source:</option>\n'
            + '        <option value="type:">type:</option>\n'
            + '        <option value="create:">create:</option>\n'
            + '        <option value="modify:">modify:</option>\n'
            + '        <option value="re:">re:</option>\n'
            + '        <option value="mc:">mc:</option>\n'
            + '        <option value="file:">file:</option>\n'
            + '        <option value="sort:">sort:</option>\n'
            + '        <option value="-sort:modify">Last Modified</option>\n'
            + '        <option value="-sort:create">Last Created</option>\n'
            + '        <option value="sort:title">Title Ascending</option>\n'
            + '        <option value="-sort:title">Title Descending</option>\n'
            + '        <option value="sort:id">ID Sort</option>\n'
            + '    </select>\n'
            + '    <input id="search" type="submit" value="go" disabled="disabled" autocomplete="off">\n'
            + '</form>\n'
            + '<div><ul id="result"></ul></div>\n'
            + '</body>\n'
            + '</html>\n'
            + '';
        return HTML;
    }
};



