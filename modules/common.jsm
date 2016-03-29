var sbCommonUtils = {

    _stringBundles : [],
    _documentArray : [],
    _documentDataArray : [],

    get namespace() { return "http://amb.vis.ne.jp/mozilla/scrapbook-rdf#"; },

    /**
     * Frequently used objects
     */
    get RDF() {
        delete this.RDF;
        return this.RDF = Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(Components.interfaces.nsIRDFService);
    },
    get RDFC() {
        delete this.RDFC;
        return this.RDFC = Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer);
    },
    get RDFCU() {
        delete this.RDFCU;
        return this.RDFCU = Components.classes['@mozilla.org/rdf/container-utils;1'].getService(Components.interfaces.nsIRDFContainerUtils);
    },
    get DIR() {
        delete this.DIR;
        return this.DIR = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties);
    },
    get MIME() {
        delete this.MIME;
        return this.MIME = Components.classes["@mozilla.org/mime;1"].getService(Components.interfaces.nsIMIMEService);
    },
    get IO() {
        delete this.IO;
        return this.IO = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
    },
    get UNICODE() {
        delete this.UNICODE;
        return this.UNICODE = Components.classes['@mozilla.org/intl/scriptableunicodeconverter'].getService(Components.interfaces.nsIScriptableUnicodeConverter);
    },
    get WINDOW() {
        delete this.WINDOW;
        return this.WINDOW = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
    },
    get CONSOLE() {
        delete this.CONSOLE;
        return this.CONSOLE = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
    },
    get PROMPT() {
        delete this.PROMPT;
        return this.PROMPT = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
    },
    get BUNDLE() {
        delete this.BUNDLE;
        return this.BUNDLE = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
    },

    get _fxVer30_consoleLog() {
        // Firefox >= 30.0: window.console.log for addons can be seen; has window.console.count
        // Firefox >=  4.0: has window.console.log, but addon logs do not show; no window.console.count
        // Firefox <   4.0: no window.console.log
        var window = this.WINDOW.getMostRecentWindow("navigator:browser");
        var result = (window.console && window.console.count) ? true : false;
        delete this._fxVer30_consoleLog;
        return this._fxVer30_consoleLog = result;
    },

    get _fxVer36_saveURI() {
        // Firefox >= 36: nsIWebBrowserPersist.saveURI takes 8 arguments
        // Firefox < 36: nsIWebBrowserPersist.saveURI takes 7 arguments
        var result;
        try {
            var WBP = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);
            WBP.saveURI(null, null, null, null, null, null, null);
        } catch(ex) {
            result = (ex.name === "NS_ERROR_XPC_NOT_ENOUGH_ARGS") ? true : false;
        }
        delete this._fxVer36_saveURI;
        return this._fxVer36_saveURI = result;
    },

    /**
     * return (1, 0, -1) if ver1 (>, =, <) ver2
     */
    checkVersion : function(ver1, ver2) {
        var iVerComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
        return iVerComparator.compare(ver1, ver2);
    },

    newItem : function(aID) {
        aID = aID || "";
        return { id : aID, create : aID, modify : aID, type : "", title : "", chars : "", icon : "", source : "", comment : "", lock : "" };
    },

    getScrapBookDir : function() {
        var dir;
        try {
            var isDefault = sbCommonUtils.getPref("data.default", true);
            dir = sbCommonUtils.getPref("data.path", "");
            dir = this.convertPathToFile(dir);
        } catch(ex) {
            isDefault = true;
        }
        if ( isDefault ) {
            dir = this.DIR.get("ProfD", Components.interfaces.nsIFile);
            dir.append("ScrapBook");
        }
        if ( !dir.exists() ) {
            dir.create(dir.DIRECTORY_TYPE, 0700);
        }
        return dir;
    },

    getContentDir : function(aID, aSuppressCreate, aSkipIdCheck) {
        if ( !aSkipIdCheck && !this.validateID(aID) ) {
            this.alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_GET_DIR", [aID]));
            return null;
        }
        var dir = this.getScrapBookDir().clone();
        dir.append("data");
        if ( !dir.exists() ) dir.create(dir.DIRECTORY_TYPE, 0700);
        dir.append(aID);
        if ( !dir.exists() ) {
            if ( aSuppressCreate ) {
                return null;
            }
            dir.create(dir.DIRECTORY_TYPE, 0700);
        }
        return dir;
    },

    removeDirSafety : function(aDir, check) {
        var curFile;
        try {
            if ( check && !this.validateID(aDir.leafName) ) return;
            this.forEachFile(aDir, function(file) {
                curFile = file;
                if (!curFile.isDirectory()) curFile.remove(false);
            }, true);
            curFile = aDir;
            curFile.remove(true);
            return true;
        } catch(ex) {
            this.alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_REMOVE_FILE", [curFile ? curFile.path : "", ex]));
            return false;
        }
    },

    loadURL : function(aURL, tabbed) {
        var win = this.WINDOW.getMostRecentWindow("navigator:browser");
        if ( !win ) return;
        var browser = win.gBrowser;
        if ( tabbed ) {
            browser.selectedTab = browser.addTab(aURL);
        } else {
            browser.loadURI(aURL);
        }
    },

    rebuildGlobal : function() {
        this._refresh(false);
    },

    refreshGlobal: function() {
        this._refresh(true);
    },

    _refresh: function(aDSChanged) {
        var cur = this.WINDOW.getMostRecentWindow(null);
        var curDone = false;
        var sidebarId = this.getSidebarId("sidebar");
        // refresh/rebuild main browser windows and their sidebars
        var winEnum = this.WINDOW.getEnumerator("navigator:browser");
        while (winEnum.hasMoreElements()) {
            var win = winEnum.getNext();
            if (cur === win) curDone = true;
            aDSChanged ? win.sbBrowserOverlay.refresh() : win.sbBrowserOverlay.rebuild();
            var win = win.document.getElementById(sidebarId).contentWindow;
            if (cur === win) curDone = true;
            if (win.sbMainService) {
                aDSChanged ? win.sbMainService.refresh() : win.sbMainService.rebuild();
            }
        }
        // refresh/rebuild other scrapbook windows
        var winEnum = this.WINDOW.getEnumerator("scrapbook");
        while (winEnum.hasMoreElements()) {
            var win = winEnum.getNext();
            if (cur === win) curDone = true;
            if (win.sbMainService && win.sbTreeHandler) {
                aDSChanged ? win.sbMainService.refresh() : win.sbMainService.rebuild();
            }
        }
        // refresh/rebuild the current window if not included
        if (!curDone) {
            win = cur;
            if (win.sbMainService) {
                aDSChanged ? win.sbMainService.refresh() : win.sbMainService.rebuild();
            }
        }
    },

    getTimeStamp : function(aDate) {
        var dd = aDate || new Date();
        var y = dd.getFullYear();
        var m = dd.getMonth() + 1; if ( m < 10 ) m = "0" + m;
        var d = dd.getDate();      if ( d < 10 ) d = "0" + d;
        var h = dd.getHours();     if ( h < 10 ) h = "0" + h;
        var i = dd.getMinutes();   if ( i < 10 ) i = "0" + i;
        var s = dd.getSeconds();   if ( s < 10 ) s = "0" + s;
        return y.toString() + m.toString() + d.toString() + h.toString() + i.toString() + s.toString();
    },

    getRootHref : function(aURLSpec) {
        var url = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
        url.spec = aURLSpec;
        return url.scheme + "://" + url.host + "/";
    },

    getBaseHref : function(sURI) {
        var pos, base;
        base = ( (pos = sURI.indexOf("?")) != -1 ) ? sURI.substring(0, pos) : sURI;
        base = ( (pos = base.indexOf("#")) != -1 ) ? base.substring(0, pos) : base;
        base = ( (pos = base.lastIndexOf("/")) != -1 ) ? base.substring(0, ++pos) : base;
        return base;
    },

    getFileName : function(aURI) {
        var pos, name;
        name = ( (pos = aURI.indexOf("?")) != -1 ) ? aURI.substring(0, pos) : aURI;
        name = ( (pos = name.indexOf("#")) != -1 ) ? name.substring(0, pos) : name;
        name = ( (pos = name.lastIndexOf("/")) != -1 ) ? name.substring(++pos) : name;
        // decode %xx%xx%xx only if it's UTF-8 encoded
        try {
            return decodeURIComponent(name);
        } catch(ex) {
            return name;
        }
    },

    splitFileName : function(aFileName) {
        var pos = aFileName.lastIndexOf(".");
        var ret = [];
        if ( pos != -1 ) {
            ret[0] = aFileName.substring(0, pos);
            ret[1] = aFileName.substring(pos + 1, aFileName.length);
        } else {
            ret[0] = aFileName;
            ret[1] = "";
        }
        return ret;
    },

    // process filename to make safe
    // see also: escapeFileName
    validateFileName : function(aFileName) {
        aFileName = aFileName.replace(/[\x00-\x1F\x7F]+|^ +/g, "");
        aFileName = aFileName.replace(/[\"\?\*\\\/\|\:]/g, "_");
        aFileName = aFileName.replace(/[\<]/g, "(");
        aFileName = aFileName.replace(/[\>]/g, ")");
        if (sbCommonUtils.getPref("asciiFilename", false)) {
            aFileName = aFileName.replace(/[^\x00-\x7F]+/g, function(m){
                return encodeURI(m);
            });
        }
        return aFileName;
    },

    resolveURL : function(aBaseURL, aRelURL) {
        try {
            // URLObj.spec is encoded and usable URI
            var baseURLObj = this.convertURLToObject(aBaseURL);
            var resolved = baseURLObj.resolve(aRelURL);
            return this.convertURLToObject(resolved).spec;
        } catch(ex) {
            sbCommonUtils.error(sbCommonUtils.lang("scrapbook", "ERR_FAIL_RESOLVE_URL", [aBaseURL, aRelURL]));
        }
    },

    validateID : function(aID) {
        return typeof(aID) == "string" && /^\d{14}$/.test(aID);
    },

    // aByBytes: true to crop texts according to bytes under UTF-8 encoding
    //           false to crop according to UTF-16 chars
    // aEllipsis: text for ellipsis
    crop : function(aString, aMaxLength, aByBytes, aEllipsis) {
        if (typeof(aEllipsis) == "undefined") aEllipsis = "...";
        if (aByBytes) {
            var bytes= toBytesUTF8(aString);
            if (bytes.length <= aMaxLength) return aString;
            bytes = bytes.substring(0, aMaxLength - toBytesUTF8(aEllipsis).length);
            while (true) {
                try {
                    return fromBytesUTF8(bytes) + aEllipsis;
                } catch(e) {};
                bytes= bytes.substring(0, bytes.length-1);
            }
        } else {
            return (aString.length > aMaxLength) ? aString.substr(0, aMaxLength - aEllipsis.length) + aEllipsis : aString;
        }

        function toBytesUTF8(chars) {
            return unescape(encodeURIComponent(chars));
        }
        function fromBytesUTF8(bytes) {
            return decodeURIComponent(escape(bytes));
        }
    },


    /**
     * Walk over a folder and run a callback for each file or folder
     * Run order: level 1 files => level 1 folders => level 2 files, ...
     *
     * return values of the callback function:
     *   undefined: no function
     *   0: skip look in the folder
     *   1: skip look other files in the same folder level
     *   2: skip look all files
     */
    forEachFile : function(aFolder, aCallback, aThisArg, aArgs) {
        var dirs = [aFolder], ret;
        all:
        for (var i=0; i<dirs.length; i++) {
            if (aCallback.call(aThisArg, dirs[i], aArgs) === 0) continue;
            var files = dirs[i].directoryEntries;
            while (files.hasMoreElements()) {
                var file = files.getNext().QueryInterface(Components.interfaces.nsIFile);
                if (file.isDirectory()) {
                    dirs.push(file);
                } else {
                    ret = aCallback.call(aThisArg, file, aArgs);
                    if (ret === 1) {
                        break;
                    } else if (ret === 2) {
                        break all;
                    }
                }
            }
        }
    },

    getFileMime : function(aFile) {
        try {
            return this.MIME.getTypeFromFile(aFile);
        } catch(ex) {}
        return false;
    },

    getMimePrimaryExtension : function(aString, aExtension) {
        try {
            return this.MIME.getPrimaryExtension(aString, aExtension);
        } catch(ex) {}
        return false;
    },

    readFile : function(aFile) {
        try {
            var istream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
            istream.init(aFile, 1, 0, false);
            var sstream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
            sstream.init(istream);
            var content = sstream.read(sstream.available());
            sstream.close();
            istream.close();
            return content;
        } catch(ex) {
            return false;
        }
    },

    writeFile : function(aFile, aContent, aChars, aNoCatch) {
        try {
            var ostream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
            ostream.init(aFile, -1, 0666, 0);
            if (aChars == "UTF-8" || !aChars) {
                // quick way to preocess UTF-8 conversion
                // UTF-16 => UTF-8 should be no unsupported chars
                var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
                converter.init(ostream, "UTF-8", 4096, 0x0000);
                converter.writeString(aContent);
                converter.close();
            } else {
                // loop over all chars and encode the unsupported ones
                this.UNICODE.charset = aChars;
                var output = [];
                for (var i=0, I=aContent.length; i<I; i++) {
                    var code = aContent.charCodeAt(i);
                    var oldchar = aContent[i];
                    // special process for a UTF-16 surrogate pair
                    if (0xD800 <= code && code <= 0xDBFF) {
                        var high = code, low = aContent.charCodeAt(i+1);
                        code = ((high - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;
                        oldchar += aContent[i+1];
                        i++;
                    }
                    // an unsupported char in the target charset may cause:
                    // 1. an error
                    // 2. results ""
                    // 3. results "?" (or "??" for a surrogate pair)
                    try {
                        var newchar = this.UNICODE.ConvertFromUnicode(oldchar);
                        if (!newchar || (newchar[0] == "?" && oldchar != "?")) throw "unsupported char";
                        output.push(newchar);
                    } catch(ex) {
                        output.push("&#" + code.toString(10) + ";");
                    }
                }
                output = output.join("");
                ostream.write(output, output.length);
            }
            ostream.close();
        } catch(ex) {
            if (aNoCatch) {
                throw ex;
            } else {
                this.alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_WRITE_FILE", [aFile.path, ex]));
            }
        }
    },

    writeIndexDat : function(aItem, aFile) {
        if ( !aFile ) {
            aFile = this.getContentDir(aItem.id).clone();
            aFile.append("index.dat");
        }
        var content = "";
        for ( var prop in aItem ) {
            content += prop + "\t" + aItem[prop] + "\n";
        }
        this.writeFile(aFile, content, "UTF-8");
    },

    saveTemplateFile : function(aURISpec, aFile, aOverwrite) {
        if ( aFile.exists() && !aOverwrite ) return;
        var istream = this.IO.newChannelFromURI(this.convertURLToObject(aURISpec)).open();
        var bistream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
        bistream.setInputStream(istream);
        var ostream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
        ostream.init(aFile, -1, 0666, 0);
        var bostream = Components.classes["@mozilla.org/binaryoutputstream;1"].createInstance(Components.interfaces.nsIBinaryOutputStream);
        bostream.setOutputStream(ostream);
        var size = 0;
        while (size = bistream.available()) {
            bostream.writeBytes(bistream.readBytes(size), size);
        }
        bostream.close();
    },

    convertToUnicode : function(aString, aCharset) {
        if ( !aString ) return "";
        try {
            this.UNICODE.charset = aCharset;
            aString = this.UNICODE.ConvertToUnicode(aString);
        } catch(ex) {
        }
        return aString;
    },



    convertPathToFile : function(aPath) {
        var aFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
        aFile.initWithPath(aPath);
        return aFile;
    },

    convertFilePathToURL : function(aFilePath) {
        var tmpFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
        tmpFile.initWithPath(aFilePath);
        return this.IO.newFileURI(tmpFile).spec;
    },

    convertFileToResURL : function(aFile) {
        var pathFull = this.convertFilePathToURL(aFile.path);
        var pathBase = this.convertFilePathToURL(this.getScrapBookDir().path);
        return "resource://scrapbook/" + pathFull.substring(pathBase.length);
    },

    convertResURLToURL : function(aResURL, aRelative) {
        if (aResURL.indexOf("resource://scrapbook/") != 0) return aResURL;
        var subPath = aResURL.substring("resource://scrapbook/".length);
        // if relative, return the subpath under the ScrapBook directory
        if ( aRelative ) return subPath;
        // else return the full path
        var pathBase = this.convertFilePathToURL(this.getScrapBookDir().path);
        return pathBase + subPath;
    },

    convertURLToObject : function(aURLString) {
        var aURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
        aURL.spec = aURLString;
        return aURL;
    },

    convertURLToFile : function(aURLString) {
        var aURL = this.convertURLToObject(aURLString);
        if ( !aURL.schemeIs("file") ) return;
        try {
            var fileHandler = this.IO.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
            return fileHandler.getFileFromURLSpec(aURLString);
        } catch(ex) {
        }
    },

    convertURLToId : function(aURL) {
        var file = sbCommonUtils.convertURLToFile(aURL);
        if (!file || !file.exists() || !file.isFile()) return null;
        var aURL = sbCommonUtils.convertFilePathToURL(file.path);
        var sbDir = sbCommonUtils.convertFilePathToURL(sbCommonUtils.getScrapBookDir().path);
        var sbPath = new RegExp("^" + sbCommonUtils.escapeRegExp(sbDir) + "data/(\\d{14})/");
        return aURL.match(sbPath) ? RegExp.$1 : null;
    },

    splitURLByAnchor : function(aURL) {
        var pos = 0;
        return ( (pos = aURL.indexOf("#")) < 0 ) ? [aURL, ""] : [aURL.substring(0, pos), aURL.substring(pos, aURL.length)];
    },

    getFocusedWindow : function() {
        var window = this.WINDOW.getMostRecentWindow("navigator:browser");
        var win = window.document.commandDispatcher.focusedWindow;
        if ( !win || win == window || win instanceof Components.interfaces.nsIDOMChromeWindow ) win = window.content;
        return win;
    },

    flattenFrames : function(aWindow) {
        var ret = [aWindow];
        for ( var i = 0; i < aWindow.frames.length; i++ ) {
            ret = ret.concat(this.flattenFrames(aWindow.frames[i]));
        }
        return ret;
    },
    
    getSidebarId : function(id) {
        // Need this or MultiSidebar can cause errors
        var rgPosition = sbCommonUtils.getPref("extensions.multisidebar.viewScrapBookSidebar", 1, true);
        if ( rgPosition > 1) {
            switch (id) {
                case "sidebar" :
                    return "sidebar-" + rgPosition;
                case "sidebar-title" :
                    return "sidebar-" + rgPosition + "-title";
                case "sidebar-splitter" :
                    return "sidebar-" + rgPosition + "-splitter";
                case "sidebar-box" :
                    return "sidebar-" + rgPosition + "-box";
            }
        }
        return id;
    },

    getDefaultIcon : function(type) {
        switch ( type ) {
            case "folder" : return "chrome://scrapbook/skin/treefolder.png"; break;
            case "note"   : return "chrome://scrapbook/skin/treenote.png";   break;
            case "notex"  : return "chrome://scrapbook/skin/treenotex.png";  break;
            default       : return "chrome://scrapbook/skin/treeitem.png";   break;
        }
    },

    /**
     * Preference handling
     */
    get prefBranch() {
        delete this.prefBranch;
        return this.prefBranch = Components.classes["@mozilla.org/preferences-service;1"].
            getService(Components.interfaces.nsIPrefService).
            getBranch("extensions.scrapbook.");
    },

    get prefBranchGlobal() {
        delete this.prefBranchGlobal;
        // must specify a branch or we get an error on setting a pref
        return this.prefBranchGlobal = Components.classes["@mozilla.org/preferences-service;1"].
            getService(Components.interfaces.nsIPrefService).
            getBranch("");
    },
    
    getPrefType: function (aName, aDefaultValue, isGlobal) {
        var branch = isGlobal ? this.prefBranchGlobal : this.prefBranch;
        try {
            switch (typeof aDefaultValue) {
                case "boolean":
                    return "boolean";
                case "number":
                    return "number";
                case "string":
                    return "string";
            }
            switch (branch.getPrefType(aName)) {
                case branch.PREF_BOOL: 
                    return "boolean";
                case branch.PREF_INT: 
                    return "number";
                case branch.PREF_STRING: 
                    return "string";
            }
        } catch (ex) {
            return "undefined";
        }
        return "undefined";
    },

    getPref: function (aName, aDefaultValue, isGlobal) {
        var branch = isGlobal ? this.prefBranchGlobal : this.prefBranch;
        try {
            switch (this.getPrefType(aName, aDefaultValue, isGlobal)) {
                case "boolean": 
                    return branch.getBoolPref(aName);
                case "number": 
                    return branch.getIntPref(aName);
                case "string": 
                    // using getCharPref may meet encoding problems
                    return branch.getComplexValue(aName, Components.interfaces.nsISupportsString).data;
                default: 
                    throw null;
            }
        } catch (ex) {
            return aDefaultValue != undefined ? aDefaultValue : null;
        }
    },

    setPref: function (aName, aValue, isGlobal) {
        var branch = isGlobal ? this.prefBranchGlobal : this.prefBranch;
        try {
            switch (this.getPrefType(aName, aValue, isGlobal)) {
                case "boolean": 
                    branch.setBoolPref(aName, aValue);
                    break;
                case "number": 
                    branch.setIntPref(aName, aValue);
                    break;
                case "string":
                    // using getCharPref may meet encoding problems
                    var str = Components.classes["@mozilla.org/supports-string;1"].
                              createInstance(Components.interfaces.nsISupportsString);
                    str.data = aValue;
                    branch.setComplexValue(aName, Components.interfaces.nsISupportsString, str);
                    break;
                default: 
                    throw null;
            }
        } catch (ex) {
            sbCommonUtils.error(sbCommonUtils.lang("scrapbook", "ERR_FAIL_SET_PREF", [aName]));
        }
    },

    getPrefKeys: function () {
        return this.prefBranch.getChildList("", {});
    },

    resetPrefs: function () {
        var list = this.getPrefKeys();
        for (var i=0, I=list.length; i<I; ++i) {
            this.prefBranch.clearUserPref(list[i]);
        }
    },

    // deprecated, use getPref instead (left for downward compatibility with addons)
    getBoolPref : function(aName, aDefVal) {
        return this.getPref(aName, aDefVal, true);
    },

    // deprecated, use getPref instead (left for downward compatibility with addons)
    copyUnicharPref : function(aName, aDefVal) {
        return this.getPref(aName, aDefVal, true);
    },

    // deprecated, use setPref instead (left for downward compatibility with addons)
    setBoolPref : function(aName, aPrefValue) {
        return this.setPref(aName, aPrefValue, true);
    },

    // deprecated, use setPref instead (left for downward compatibility with addons)
    setUnicharPref : function(aName, aPrefValue) {
        return this.setPref(aName, aPrefValue, true);
    },

    /**
     * String handling
     */
    lang : function(aBundle, aName, aArgs) {
        var bundle = this._stringBundles[aBundle];
        if (!bundle) {
            var uri = "chrome://scrapbook/locale/%s.properties".replace("%s", aBundle);
            bundle = this._stringBundles[aBundle] = this.BUNDLE.createBundle(uri);
        }
        try {
            if (!aArgs) {
                return bundle.GetStringFromName(aName);
            } else {
                return bundle.formatStringFromName(aName, aArgs, aArgs.length);
            }
        } catch (ex) {}
        return aName;
    },

    escapeComment : function(aStr) {
        if ( aStr.length > 10000 ) this.alert(sbCommonUtils.lang("scrapbook", "MSG_LARGE_COMMENT"));
        return aStr.replace(/\r|\n|\t/g, " __BR__ ");
    },

    escapeHTML : function(aStr, aNoDoubleQuotes, aSingleQuotes, aNoAmp) {
        var list = {"&": (aNoAmp ? "&" : "&amp;"), "<": "&lt;", ">": "&gt;", '"': (aNoDoubleQuotes ? '"' : "&quot;"), "'": (aSingleQuotes ? "&#39;" : "'") };
        return aStr.replace(/[&<>"']/g, function(m){ return list[m]; });
    },

    escapeHTMLWithSpace : function(aStr, aNoDoubleQuotes, aSingleQuotes, aNoAmp) {
        var list = {"&": (aNoAmp ? "&" : "&amp;"), "<": "&lt;", ">": "&gt;", '"': (aNoDoubleQuotes ? '"' : "&quot;"), "'": (aSingleQuotes ? "&#39;" : "'"), " ": "&nbsp;" };
        return aStr.replace(/[&<>"']| (?= )/g, function(m){ return list[m]; });
    },

    escapeRegExp : function(aString) {
        return aString.replace(/([\*\+\?\.\^\/\$\\\|\[\]\{\}\(\)])/g, "\\$1");
    },

    // escape valid filename characters that are misleading in the URI
    // preserve other chars for beauty
    // see also: validateFilename
    escapeFileName : function(aString) {
        return aString.replace(/[#]+|(?:%[0-9A-Fa-f]{2})+/g, function(m){return encodeURIComponent(m);});
    },

    // aTplRegExp is a RegExp with label name in the frist parenthesis, eg. /{([\w_]+)}/g
    stringTemplate : function(aString, aTplRegExp, aTplArray) {
        return aString.replace(aTplRegExp, function(match, label){
            if (label in aTplArray) return aTplArray[label];
            return "";
        });
    },
        
    pad : function(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    },

    parseURLQuery : function(aStr) {
        var query = {};
        var a = aStr.split('&');
        for (var i in a) {
            var b = a[i].split('=');
            query[decodeURIComponent(b[0])] = decodeURIComponent(b[1]);
        }
        return query;
    },

    /**
     * Window daemon
     */
    openManageWindow : function(aRes, aModEltID) {
        var window = this.WINDOW.getMostRecentWindow("navigator:browser");
        window.openDialog("chrome://scrapbook/content/manage.xul", "ScrapBook:Manage", "chrome,centerscreen,all,resizable,dialog=no", aRes, aModEltID);
    },

    alert: function(aText) {
        this.PROMPT.alert(null, "[ScrapBook]", aText);
    },

    log : function(aMsg) {
        if (this._fxVer30_consoleLog) {
            var window = this.WINDOW.getMostRecentWindow("navigator:browser");
            window.console.log(aMsg);
        } else {
            // does not record the script line and is not suitable for tracing...
            this.CONSOLE.logStringMessage(aMsg);
        }
    },

    warn : function(aMsg) {
        if (this._fxVer30_consoleLog) {
            var window = this.WINDOW.getMostRecentWindow("navigator:browser");
            window.console.warn(aMsg);
        } else {
            // set javascript.options.showInConsole to true in the about:config to see it
            // default true since Firefox 4.0
            Components.utils.reportError(aMsg);
        }
    },

    error : function(aMsg) {
        if (this._fxVer30_consoleLog) {
            var window = this.WINDOW.getMostRecentWindow("navigator:browser");
            window.console.error(aMsg);
        } else {
            // set javascript.options.showInConsole to true in the about:config to see it
            // default true since Firefox 4.0
            Components.utils.reportError(aMsg);
        }
    },


    /**
     * DOM elements handling
     */

    getOuterHTML : function(aNode) {
        var outer = aNode.outerHTML;
        if (typeof(outer) != "undefined") return outer;
        // older versions without native outerHTML
        var wrapper = aNode.ownerDocument.createElement("DIV");
        wrapper.appendChild(aNode.cloneNode(true));
        return wrapper.innerHTML;
    },

    surroundByTags : function(aNode, aContent) {
        var tag = "<" + aNode.nodeName.toLowerCase();
        for ( var i=0; i<aNode.attributes.length; i++ ) {
            tag += ' ' + aNode.attributes[i].name + '="' + this.escapeHTML(aNode.attributes[i].value) + '"';
        }
        tag += ">\n";
        return tag + aContent + "</" + aNode.nodeName.toLowerCase() + ">\n";
    },

    /**
     * DOM elements considered as ScrapBook additional
     *
     * linemarker (span)
     * inline (span)
     * annotation (span) (for downward compatibility with SBX 1.12.0a - 1.12.0a45)
     * link-url (a)
     * link-inner (a)
     * link-file (a)
     * freenote (div)
     * freenote-header
     * freenote-body
     * freenote-footer
     * freenote-save
     * freenote-delete
     * sticky (div) (for downward compatibility with SBX <= 1.12.0a34)
     * sticky-header
     * sticky-footer
     * sticky-save
     * sticky-delete
     * block-comment (div) (for downward compatibility with SB <= 0.17.0)
     *
     * title (*)
     * title-src (*)
     * stylesheet (link, style)
     * stylesheet-temp (link, style)
     * todo (input, textarea)
     * fulltext
     *
     * custom (*) (custom objects to be removed by the eraser)
     * custom-wrapper (*) (custom objects to be unwrapped by the eraser)
     */
    getSbObjectType : function(aNode) {
        if (aNode.nodeType != 1) return false;
        var type = aNode.getAttribute("data-sb-obj");
        if (type) return type;
        // below is for downward compatibility
        switch (aNode.className) {
            case "linemarker-marked-line":
                return "linemarker";
            case "scrapbook-inline":
                return "inline";
            case "scrapbook-sticky":
            case "scrapbook-sticky scrapbook-sticky-relative":
                return "sticky";
            case "scrapbook-sticky-header":
                return "sticky-header";
            case "scrapbook-sticky-footer":
                return "sticky-footer";
            case "scrapbook-block-comment":
                return "block-comment";
        }
        if (aNode.id == "scrapbook-sticky-css") {
            return "stylesheet";
        }
        return false;
    },

    /**
     * return value:
     *  -1: not an SbObject
     *   0: not removable
     *   1: should remove
     *   2: should unwrap
     */
    getSbObjectRemoveType : function(aNode) {
        var type = this.getSbObjectType(aNode);
        if (!type) return -1;
        if (["title", "title-src", "stylesheet", "stylesheet-temp", "todo"].indexOf(type) != -1) return 0;
        if (["linemarker", "inline", "link-url", "link-inner", "link-file", "custom-wrapper"].indexOf(type) != -1) return 2;
        return 1;
    },

    /**
     * if aRefNode has "data-sb-id" attribute, get all nodes with same data-sb-id
     * else return [aRefNode]
     */
    getSbObjectsById : function(aRefNode) {
        var id = aRefNode.getAttribute("data-sb-id");
        if (!id) return [aRefNode];
        var doc = aRefNode.ownerDocument;
        if (doc.querySelectorAll) {
            return doc.querySelectorAll('[data-sb-id="' + id.replace(/"/g, '\\"') + '"]');
        } else {
            // workaround for older Firefox versions that don't support
            var ret = [];
            var els = doc.getElementsByTagName("*");
            for (var i=0, I=els.length; i<I; ++i) {
                if (els[i].getAttribute("data-sb-id") == id) ret.push(els[i]);
            }
            return ret;
        }
    },

    /**
     * Data Store
     */
    _getDocumentIndex : function(aDocument) {
        // try to lookup the index of the specific document
        var idx = false;
        var firstEmptyIdx = false;
        for (var i=0, len=this._documentArray.length; i<len ; i++) {
            if (this.isDeadObject(this._documentArray[i])) {
                if (firstEmptyIdx === false) firstEmptyIdx = i;
                continue;
            }
            if (this._documentArray[i] == aDocument) {
                idx = i;
                break;
            }
        }
        // if the document is not in index, add one
        // if there is an index left empty, use it
        if (idx === false) {
            idx = (firstEmptyIdx !== false) ? firstEmptyIdx : this._documentArray.length;
            this._documentArray[idx] = aDocument;
            this._documentDataArray[idx] = {};
        }
        return idx;
    },

    documentData : function(aDocument, aKey, aValue) {
        var idx = this._getDocumentIndex(aDocument);
        // if given a new value, set it
        if (aValue !== undefined) {
            this._documentDataArray[idx][aKey] = aValue;
            return;
        }
        // else return the current value
        return this._documentDataArray[idx][aKey];
    },

    // check if an object is dead (eg. window/document closed)
    isDeadObject : function(aObject) {
        try {
            var x = aObject.body;
        } catch(ex) {
            return true;
        }
        return false;
    },

    /**
     * Object handling
     */
    extendObject : function(aObject1, aObject2) {
        for (var i in aObject2) {
            aObject1[i] = aObject2[i];
        }
        return aObject1;
    },
};

/**
 * Shortcut object
 */

const keyCodeToNameMap = {};
const keyNameToCodeMap = {};

(function(){
    var keys = Components.interfaces.nsIDOMKeyEvent;
    for (var name in keys) {
        if (name.match(/^DOM_VK_/)) {
            var keyName = RegExp.rightContext.toLowerCase().replace(/(^|_)([a-z])/g, function(){
                return arguments[1] + arguments[2].toUpperCase();
            });
            var keyCode = keys[name];
            keyCodeToNameMap[keyCode] = keyName;
            keyNameToCodeMap[keyName] = keyCode;
        }
    }
})();

function Shortcut(data) {
    this.keyCode = data.keyCode;
    this.modifiers = [];
    // unify the order
    if (data.modifiers.indexOf("Meta") !== -1) this.modifiers.push("Meta");
    if (data.modifiers.indexOf("Ctrl") !== -1) this.modifiers.push("Ctrl");
    if (data.modifiers.indexOf("Alt") !== -1) this.modifiers.push("Alt");
    if (data.modifiers.indexOf("Shift") !== -1) this.modifiers.push("Shift");
}

Shortcut.prototype.toString = function () {
    var parts = [];
    var keyName = keyCodeToNameMap[this.keyCode];

    // if the key is not registered, return null
    if (!keyName) return null;

    parts = parts.concat(this.modifiers);
    parts.push(keyName);

    return parts.join("+");
}

Shortcut.fromString = function (str) {
    var data = {}
    var parts = str.split("+");
    data.keyCode = keyNameToCodeMap[parts.pop()];
    data.modifiers = [].concat(parts);
    return new Shortcut(data);
}

Shortcut.fromEvent = function (event) {
    var data = {};

    data.keyCode = event.keyCode;

    var modifiers = [];
    if (event.metaKey) modifiers.push("Meta");
    if (event.ctrlKey) modifiers.push("Ctrl");
    if (event.altKey) modifiers.push("Alt");
    if (event.shiftKey) modifiers.push("Shift");
    data.modifiers = modifiers;

    return new Shortcut(data);
}

var EXPORTED_SYMBOLS = ["sbCommonUtils", "Shortcut"];
