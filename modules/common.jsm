/********************************************************************
 *
 * Shared module utils for most scripts.
 *
 * @public {class} sbCommonUtils
 *
 *******************************************************************/

let EXPORTED_SYMBOLS = ["sbCommonUtils"];

const { lang } = Components.utils.import("resource://scrapbook-modules/lang.jsm", {});
const { console } = Components.utils.import("resource://scrapbook-modules/console.jsm", {});
const { jsSHA } = Components.utils.import("resource://scrapbook-modules/lib/jsSHA.jsm", {});

let sbCommonUtils = {

    _documentArray: [],
    _documentDataArray: [],

    get namespace() { return "http://amb.vis.ne.jp/mozilla/scrapbook-rdf#"; },


    /****************************************************************
     * Frequently used objects
     ***************************************************************/

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
    get ALERT() {
        delete this.ALERT;
        return this.ALERT = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
    },
    get ATOM() {
        delete this.ATOM;
        return this.ATOM = Components.classes['@mozilla.org/atom-service;1'].getService(Components.interfaces.nsIAtomService);
    },


    /****************************************************************
     * Version specific handling
     ***************************************************************/

    /**
     * return (1, 0, -1) if ver1 (>, =, <) ver2
     */
    checkVersion: function(ver1, ver2) {
        let iVerComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
        return iVerComparator.compare(ver1, ver2);
    },


    /****************************************************************
     * ScrapBook language pack handling
     ***************************************************************/

    lang: function () {
        return lang.apply(lang, arguments);
    },


    /****************************************************************
     * Scrapbook Preference handling
     ***************************************************************/

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
        let branch = isGlobal ? this.prefBranchGlobal : this.prefBranch;
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
        let branch = isGlobal ? this.prefBranchGlobal : this.prefBranch;
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
            return (aDefaultValue !== undefined) ? aDefaultValue : null;
        }
    },

    setPref: function (aName, aValue, isGlobal) {
        let branch = isGlobal ? this.prefBranchGlobal : this.prefBranch;
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
                    let str = Components.classes["@mozilla.org/supports-string;1"].
                              createInstance(Components.interfaces.nsISupportsString);
                    str.data = aValue;
                    branch.setComplexValue(aName, Components.interfaces.nsISupportsString, str);
                    break;
                default: 
                    throw null;
            }
        } catch (ex) {
            console.error(lang("ERR_FAIL_SET_PREF", aName));
        }
    },

    resetPref: function (aName, isGlobal) {
        let branch = isGlobal ? this.prefBranchGlobal : this.prefBranch;
        branch.clearUserPref(aName);
    },

    getPrefKeys: function () {
        return this.prefBranch.getChildList("", {});
    },

    resetPrefs: function () {
        let list = this.getPrefKeys();
        for (var i=0, I=list.length; i<I; ++i) {
            this.prefBranch.clearUserPref(list[i]);
        }
    },

    // deprecated, use getPref instead (left for downward compatibility with addons)
    getBoolPref: function(aName, aDefVal) {
        return this.getPref(aName, aDefVal, true);
    },

    // deprecated, use getPref instead (left for downward compatibility with addons)
    copyUnicharPref: function(aName, aDefVal) {
        return this.getPref(aName, aDefVal, true);
    },

    // deprecated, use setPref instead (left for downward compatibility with addons)
    setBoolPref: function(aName, aPrefValue) {
        return this.setPref(aName, aPrefValue, true);
    },

    // deprecated, use setPref instead (left for downward compatibility with addons)
    setUnicharPref: function(aName, aPrefValue) {
        return this.setPref(aName, aPrefValue, true);
    },


    /****************************************************************
     * ScrapBook related path/file/string/etc handling
     ***************************************************************/

    newItem: function(aID) {
        aID = aID || "";
        return { id: aID, create: aID, modify: aID, type: "", title: "", chars: "", icon: "", source: "", comment: "", lock: "" };
    },

    getScrapBookDir: function(aRenew) {
        if (!arguments.callee.newScrapBookDir) {
            let that = this;
            arguments.callee.newScrapBookDir = function() {
                let dataPath = that.getPref("data.path", ""), dir;
                if (dataPath) {
                    try {
                        // if dataPath is absolute
                        dir = that.convertPathToFile(dataPath);
                    } catch(ex) {
                        try {
                            // if data.path is relative (to Firefox profile directory)
                            let profileDir = that.DIR.get("ProfD", Components.interfaces.nsIFile);
                            let path = that.convertFileToURL(profileDir) + dataPath.split(/[\/\\]/).map(function(part){return encodeURIComponent(part);}).join("/");
                            dir = that.convertURLToFile(path);
                        } catch(ex) {}
                    }
                }
                if ( !dir ) {
                    dir = that.DIR.get("ProfD", Components.interfaces.nsIFile);
                    dir.append("ScrapBook");
                }
                return dir;
            };
        }
        if (!arguments.callee.currentDir || aRenew) {
            arguments.callee.currentDir = arguments.callee.newScrapBookDir();
        }
        let dir = arguments.callee.currentDir.clone();
        if ( !dir.exists() ) {
            try {
                dir.create(dir.DIRECTORY_TYPE, 0700);
            } catch (ex) {
                this.alert(lang("ERR_FAIL_INIT_SCRAPBOOKDIR", dir.path));
                this.resetPref("data.path");
                arguments.callee.currentDir = arguments.callee.newScrapBookDir();
                dir = arguments.callee.currentDir.clone();
                if ( !dir.exists() ) {
                    dir.create(dir.DIRECTORY_TYPE, 0700);
                }
            }
        }
        return dir;
    },

    getContentDir: function(aID, aSuppressCreate, aSkipIdCheck) {
        if ( !aSkipIdCheck && !this.validateID(aID) ) {
            this.alert(lang("ERR_FAIL_GET_DIR", aID));
            return null;
        }
        let dir = this.getScrapBookDir().clone();
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

    writeIndexDat: function(aItem, aFile) {
        if ( !aFile ) {
            aFile = this.getContentDir(aItem.id).clone();
            aFile.append("index.dat");
        }
        let content = "";
        for ( let prop in aItem ) {
            content += prop + "\t" + aItem[prop] + "\n";
        }
        this.writeFile(aFile, content, "UTF-8");
    },

    getTimeStamp: function(aDate) {
        let dd = aDate || new Date();
        let y = dd.getFullYear();
        let m = dd.getMonth() + 1; if ( m < 10 ) m = "0" + m;
        let d = dd.getDate();      if ( d < 10 ) d = "0" + d;
        let h = dd.getHours();     if ( h < 10 ) h = "0" + h;
        let i = dd.getMinutes();   if ( i < 10 ) i = "0" + i;
        let s = dd.getSeconds();   if ( s < 10 ) s = "0" + s;
        return y.toString() + m.toString() + d.toString() + h.toString() + i.toString() + s.toString();
    },

    getDefaultIcon: function(type) {
        switch ( type ) {
            case "folder": return "chrome://scrapbook/skin/treefolder.png"; break;
            case "note": return "chrome://scrapbook/skin/treenote.png"; break;
            case "notex": return "chrome://scrapbook/skin/treenotex.png"; break;
            default: return "chrome://scrapbook/skin/treeitem.png"; break;
        }
    },
    
    getSidebarId: function(id) {
        // Need this or MultiSidebar can cause errors
        let rgPosition = this.getPref("extensions.multisidebar.viewScrapBookSidebar", 1, true);
        if ( rgPosition > 1) {
            switch (id) {
                case "sidebar":
                    return "sidebar-" + rgPosition;
                case "sidebar-title":
                    return "sidebar-" + rgPosition + "-title";
                case "sidebar-splitter":
                    return "sidebar-" + rgPosition + "-splitter";
                case "sidebar-box":
                    return "sidebar-" + rgPosition + "-box";
            }
        }
        return id;
    },

    rebuildGlobal: function() {
        this._refresh(false);
    },

    refreshGlobal: function() {
        this._refresh(true);
    },

    _refresh: function(aDSChanged) {
        let cur = this.WINDOW.getMostRecentWindow(null);
        let curDone = false;
        let sidebarId = this.getSidebarId("sidebar");
        // refresh/rebuild main browser windows and their sidebars
        let winEnum = this.WINDOW.getEnumerator("navigator:browser");
        while (winEnum.hasMoreElements()) {
            let win = winEnum.getNext();
            if (cur === win) curDone = true;
            aDSChanged ? win.sbBrowserOverlay.refresh() : win.sbBrowserOverlay.rebuild();
            let win = win.document.getElementById(sidebarId).contentWindow;
            if (cur === win) curDone = true;
            if (win.sbMainService) {
                aDSChanged ? win.sbMainService.refresh() : win.sbMainService.rebuild();
            }
        }
        // refresh/rebuild other scrapbook windows
        let winEnum = this.WINDOW.getEnumerator("scrapbook");
        while (winEnum.hasMoreElements()) {
            let win = winEnum.getNext();
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

    convertURLToId: function(aURL) {
        let file = this.convertURLToFile(aURL);
        if (!file || !file.exists() || !file.isFile()) return null;
        let aURL = this.convertFileToURL(file);
        let sbDir = this.convertFileToURL(this.getScrapBookDir());
        let sbPath = new RegExp("^" + this.escapeRegExp(sbDir) + "data/(\\d{14})/");
        return aURL.match(sbPath) ? RegExp.$1 : null;
    },

    validateID: function(aID) {
        return typeof(aID) == "string" && /^\d{14}$/.test(aID);
    },


    /****************************************************************
     * RDF utilities
     ***************************************************************/

    // get the datasource from an .rdf file
    // if the .rdf file does not exist, create one using the default root name
    getRDFDataSource: function(aDataFile, aDefaultRootName) {
        let fileURL = this.convertFileToURL(aDataFile);
        if (!aDataFile.exists()) {
            let iDS = Components.classes["@mozilla.org/rdf/datasource;1?name=xml-datasource"].createInstance(Components.interfaces.nsIRDFDataSource);
            this.RDFCU.MakeSeq(iDS, this.RDF.GetResource(aDefaultRootName));
            iDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).FlushTo(fileURL);
        }
        return this.RDF.GetDataSourceBlocking(fileURL);
    },


    /****************************************************************
     * File and IO utilities
     ***************************************************************/

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
    forEachFile: function(aFolder, aCallback, aThisArg, aArgs) {
        let dirs = [aFolder], ret;
        all:
        for (var i=0; i<dirs.length; i++) {
            if (aCallback.call(aThisArg, dirs[i], aArgs) === 0) continue;
            let files = dirs[i].directoryEntries;
            while (files.hasMoreElements()) {
                let file = files.getNext().QueryInterface(Components.interfaces.nsIFile);
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

    readFile: function(aFile, aCharset) {
        let file = (typeof aFile === "string") ? this.convertPathToFile(aFile) : aFile;
        try {
            let istream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
            istream.init(file, 1, 0, false);
            let bistream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
            bistream.setInputStream(istream);
            let data = bistream.readBytes(bistream.available());
            bistream.close();
            istream.close();
            if (aCharset) {
                data = this.convertToUnicode(data, aCharset);
            }
            return data;
        } catch(ex) {
            return false;
        }
    },

    writeFile: function(aFile, aContent, aChars, aNoCatch) {
        try {
            let ostream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
            ostream.init(aFile, -1, 0666, 0);
            if (aChars == "UTF-8" || !aChars) {
                // quick way to process UTF-8 conversion
                // UTF-16 => UTF-8 should be no unsupported chars
                let converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
                converter.init(ostream, "UTF-8", 4096, 0x0000);
                converter.writeString(aContent);
                converter.close();
            } else {
                // loop over all chars and encode the unsupported ones
                this.UNICODE.charset = aChars;
                let output = [];
                for (var i=0, I=aContent.length; i<I; i++) {
                    let code = aContent.charCodeAt(i);
                    let oldchar = aContent[i];
                    // special process for a UTF-16 surrogate pair
                    if (0xD800 <= code && code <= 0xDBFF) {
                        let high = code, low = aContent.charCodeAt(i+1);
                        code = ((high - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;
                        oldchar += aContent[i+1];
                        i++;
                    }
                    // an unsupported char in the target charset may cause:
                    // 1. an error
                    // 2. results ""
                    // 3. results "?" (or "??" for a surrogate pair)
                    try {
                        let newchar = this.UNICODE.ConvertFromUnicode(oldchar);
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
                this.alert(lang("ERR_FAIL_WRITE_FILE", aFile.path, ex));
            }
        }
    },

    writeFileBytes: function (aFile, aBytes) {
        let ostream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
        ostream.init(aFile, -1, 0666, 0);
        ostream.write(aBytes, aBytes.length);
        ostream.close();
    },

    // check if two files are identical
    compareFiles: function(aFile1, aFile2) {
        // quick check for difference and to prevent an error
        if (!(aFile1.exists() && aFile2.exists() && aFile1.isFile() && aFile2.isFile() && aFile1.fileSize == aFile2.fileSize)) {
            return false;
        }
        return (this.readFile(aFile1) === this.readFile(aFile2));
    },

    // reads an url synchronously, should only be used for local data
    readTemplateURL: function(aURISpec) {
        let istream = this.newChannel(aURISpec).open();
        let bistream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
        bistream.setInputStream(istream);
        let data = bistream.readBytes(bistream.available());
        bistream.close();
        istream.close();
        return data;
    },

    saveTemplateFile: function(aURISpec, aFile, aOverwrite) {
        if ( aFile.exists() && !aOverwrite ) return;
        let istream = this.newChannel(aURISpec).open();
        let bistream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
        bistream.setInputStream(istream);
        let ostream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
        ostream.init(aFile, -1, 0666, 0);
        let bostream = Components.classes["@mozilla.org/binaryoutputstream;1"].createInstance(Components.interfaces.nsIBinaryOutputStream);
        bostream.setOutputStream(ostream);
        let size = 0;
        while (size = bistream.available()) {
            bostream.writeBytes(bistream.readBytes(size), size);
        }
        bostream.close();
    },

    removeDirSafety: function(aDir, check) {
        let curFile;
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
            this.alert(lang("ERR_FAIL_REMOVE_FILE", curFile ? curFile.path : "", ex));
            return false;
        }
    },

    execProgram: function(aExecFilePath, args) {
        try {
            let execFile = this.convertPathToFile(aExecFilePath);
            if ( !execFile.exists() ) {
                this.alert(lang("ERR_FILE_NOT_EXIST", [aExecFilePath]));
                return;
            }
            let process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
            process.init(execFile);
            process.run(false, args, args.length);
        } catch (ex) {
            this.alert(lang("ERR_FAIL_EXEC_FILE", [aExecFilePath]));
        }
    },

    convertToUnicode: function(aString, aCharset) {
        if ( !aString ) return "";
        try {
            this.UNICODE.charset = aCharset;
            aString = this.UNICODE.ConvertToUnicode(aString);
        } catch(ex) {
        }
        return aString;
    },

    // This is a simple heuristic match for meta refresh tags generated by ScrapBook.
    // It may not work for more general cases.
    readMetaRefresh: function(aDocFile) {
        if (this.readFile(aDocFile).match(/\s*content="\d+;URL=([^"]+)"/i)) {
            let relURL = this.convertToUnicode(RegExp.$1, "UTF-8");
            let URI1 = this.convertFileToURL(aDocFile);
            let URI2 = this.resolveURL(URI1, relURL);
            let file2 = this.convertURLToFile(URI2);
            return file2;
        }
        return false;
    },


    /****************************************************************
     * MIME utilities
     ***************************************************************/

    getFileMime: function(aFile) {
        try {
            return this.MIME.getTypeFromFile(aFile);
        } catch(ex) {}
        return false;
    },

    getMimePrimaryExtension: function(aString, aExtension) {
        try {
            return this.MIME.getPrimaryExtension(aString, aExtension);
        } catch(ex) {}
        return false;
    },


    /****************************************************************
     * File/URI path and interface objects handling
     ***************************************************************/

    getRootHref: function(aURLSpec) {
        let url = this.convertURLToObject(aURLSpec);
        return url.scheme + "://" + url.host + "/";
    },

    getBaseHref: function(sURI) {
        let base = sURI, pos;
        if ((pos = base.indexOf("?")) != -1) { base = base.substring(0, pos); }
        if ((pos = base.indexOf("#")) != -1) { base = base.substring(0, pos); }
        if ((pos = base.lastIndexOf("/")) != -1) { base = base.substring(0, pos + 1); }
        return base;
    },

    getFileName: function(aURI) {
        let name = aURI, pos;
        if ((pos = name.indexOf("?")) !== -1) { name = name.substring(0, pos); }
        if ((pos = name.indexOf("#")) !== -1) { name = name.substring(0, pos); }
        if ((pos = name.lastIndexOf("/")) !== -1) { name = name.substring(pos + 1); }
        // decode %xx%xx%xx only if it's UTF-8 encoded
        try {
            // A URL containing non-encoded single % causes a malformed URI sequence error.
            // Replace it with encoded %25 so that the decoding works right
            return decodeURIComponent(name.replace(/%(?![0-9A-F]{2})/gi, "%25"));
        } catch(ex) {
            return name;
        }
    },

    // This ensures normalizeURI("http://abc/?����!def%#1234") == normalizeURI("http://ab%63/?%E4%B8%AD%E6%96%87%21def%")
    // Mainly to recover an overencode issue that !'()~ be saved encoded for xhtml files.
    normalizeURI: function(aURI) {
        let [URI] = this.splitURLByAnchor(aURI);
        try {
            return URI.replace(/((?!%[0-9A-F]{2}).)+|(%[0-9A-F]{2})+/gi, function (m, u, e) {
                // unencoded part => encode as it's safe
                if (u) return encodeURI(m);
                // encoded part => decode-encode so that overencoded chars are recovered
                return encodeURIComponent(decodeURIComponent(m));
            });
        } catch(ex) {}
        // This URI is not encoded as UTF-8.
        // Keep it unchanged since we cannot confidently decode it without breaking functional URI chars
        return URI;
    },

    splitFileName: function(aFileName) {
        let pos = aFileName.lastIndexOf(".");
        return (pos != -1) ? [aFileName.substring(0, pos), aFileName.substring(pos + 1)] : [aFileName, ""];
    },

    splitURLByAnchor: function(aURL) {
        let pos = aURL.indexOf("#");
        return (pos == -1) ? [aURL, ""] : [aURL.substring(0, pos), aURL.substring(pos)];
    },

    resolveURL: function(aBaseURL, aRelURL) {
        try {
            // URLObj.spec is encoded and usable URI
            let baseURLObj = this.convertURLToObject(aBaseURL);
            let resolved = baseURLObj.resolve(aRelURL);
            return this.convertURLToObject(resolved).spec;
        } catch(ex) {}
        return aRelURL;
    },

    convertPathToFile: function(aPath) {
        let aFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
        aFile.initWithPath(aPath);
        return aFile;
    },

    convertFileToURL: function(aFile) {
        return this.IO.newFileURI(aFile).spec;
    },

    convertFilePathToURL: function(aFilePath) {
        return this.convertFileToURL(this.convertPathToFile(aFilePath));
    },

    convertFileToResURL: function(aFile) {
        let pathFull = this.convertFileToURL(aFile);
        let pathBase = this.convertFileToURL(this.getScrapBookDir());
        return "resource://scrapbook/" + pathFull.substring(pathBase.length);
    },

    convertResURLToURL: function(aResURL, aRelative) {
        if (aResURL.indexOf("resource://scrapbook/") != 0) return aResURL;
        let subPath = aResURL.substring("resource://scrapbook/".length);
        // if relative, return the subpath under the ScrapBook directory
        if ( aRelative ) return subPath;
        // else return the full path
        let pathBase = this.convertFileToURL(this.getScrapBookDir());
        return pathBase + subPath;
    },

    convertURLToObject: function(aURLString) {
        let aURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
        aURL.spec = aURLString;
        return aURL;
    },

    convertURLToFile: function(aURLString) {
        let aURL = this.convertURLToObject(aURLString);
        if ( !aURL.schemeIs("file") ) return;
        try {
            let fileHandler = this.IO.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
            return fileHandler.getFileFromURLSpec(aURLString);
        } catch(ex) {
        }
    },

    // Create a channel from a URL string or URL object.
    //
    // Although nsIIOService.newChannel and nsIIOService.newChannelFromURI are deprecated
    // nsIIOService.newChannel2 and nsIIOService.newChannelFromURI2 has an issue of not setting loadinfo,
    // which currently seems to not causing a real issue besides producing an error log,
    // but for error-proof, we stick to newChannel and newChannelFromURI as it's still available.
    newChannel: function(aURI) {
        if (typeof aURI == "string") {
            if (typeof this.IO.newChannel != "undefined") {
                return this.IO.newChannel(aURI, null, null);
            } else if (typeof this.IO.newChannel2 != "undefined") {
                return this.IO.newChannel2(aURI, null, null, null, null, null,
                    Components.interfaces.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,
                    Components.interfaces.nsIContentPolicy.TYPE_OTHER);
            }
        } else {
            if (typeof this.IO.newChannelFromURI != "undefined") {
                return this.IO.newChannelFromURI(aURI);
            } else if (typeof this.IO.newChannelFromURI2 != "undefined") {
                return this.IO.newChannelFromURI2(aURI, null, null, null,
                    Components.interfaces.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,
                    Components.interfaces.nsIContentPolicy.TYPE_OTHER);
            }
        }
        return null;
    },

    parseURLQuery: function(aStr) {
        let query = {};
        let a = aStr.split('&');
        for (var i in a) {
            let b = a[i].split('=');
            query[decodeURIComponent(b[0])] = decodeURIComponent(b[1]);
        }
        return query;
    },

    parseDataURI: function (aDataURI) {
        let match = aDataURI.match(/^data:(?:\/\/)?([^;]*)(?:;charset=([^;,]*))?(?:;(base64))?,([\s\S]*)$/i);
        if (match) {
            return {
                mime: match[1],
                charset: match[2],
                base64: !!match[3],
                data: match[4],
            };
        }
        return null;
    },


    /****************************************************************
     * Javascript object utilies
     ***************************************************************/

    extendObject: function(aObject1, aObject2) {
        for (var i in aObject2) {
            aObject1[i] = aObject2[i];
        }
        return aObject1;
    },


    /****************************************************************
     * String utilies
     ***************************************************************/

    unicodeToUtf8: function (chars) {
        return unescape(encodeURIComponent(chars));
    },

    utf8ToUnicode: function (bytes) {
        return decodeURIComponent(escape(bytes));
    },

    // supported data types: "B64", "BYTES", "TEXT", "ARRAYBUFFER"
    sha1: function (data, type) {
        let shaObj = new jsSHA("SHA-1", type);
        shaObj.update(data);
        return shaObj.getHash("HEX");
    },

    escapeQuotes: function(aStr) {
        return aStr.replace(/[\\"]/g, "\\$&");
    },

    escapeComment: function(aStr) {
        if ( aStr.length > 10000 ) this.alert(lang("MSG_LARGE_COMMENT"));
        return aStr.replace(/\r|\n|\t/g, " __BR__ ");
    },

    escapeHTML: function(aStr, aNoDoubleQuotes, aSingleQuotes) {
        let list = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': (aNoDoubleQuotes ? '"' : "&quot;"), "'": (aSingleQuotes ? "&#39;" : "'") };
        return aStr.replace(/[&<>"']/g, function(m){ return list[m]; });
    },

    escapeHTMLWithSpace: function(aStr, aNoDoubleQuotes, aSingleQuotes) {
        let list = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': (aNoDoubleQuotes ? '"' : "&quot;"), "'": (aSingleQuotes ? "&#39;" : "'"), " ": "&nbsp;" };
        return aStr.replace(/[&<>"']| (?= )/g, function(m){ return list[m]; });
    },

    unescapeHTML: function(aStr) {
        let list = {
            "&amp;": "&",
            "&lt;": "<",
            "&gt;" : ">",
            "&quot;" : '"',
            "&apos;" : "'",
            "&nbsp;" : " "
        };

        return aStr.replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:(\d+)|x([0-9A-Fa-f]+));/g, function(entity, dec, hex) {
            if (dec) return String.fromCharCode(parseInt(dec, 10));
            if (hex) return String.fromCharCode(parseInt(hex, 16));
            return list[entity];
        });
    },

    // add a thin space between "--" in the comment to prevent exploits
    escapeHTMLComment: function(aStr) {
        return aStr.replace(/--/g, "-\u2009-");
    },

    escapeRegExp: function(aString) {
        return aString.replace(/([\*\+\?\.\^\/\$\\\|\[\]\{\}\(\)])/g, "\\$1");
    },

    unescapeCss: function(aStr) {
        let that = arguments.callee;
        if (!that.replaceRegex) {
            that.replaceRegex = /\\([0-9A-Fa-f]{1,6}) ?|\\(.)/g;
            that.getCodes = function (n) {
                if (n < 0x10000) return [n];
                n -= 0x10000;
                return [0xD800+(n>>10), 0xDC00+(n&0x3FF)];
            };
            that.replaceFunc = function (m, u, c) {
                if (c) return c;
                if (u) return String.fromCharCode.apply(null, that.getCodes(parseInt(u, 16)));
            };
        }
        return aStr.replace(that.replaceRegex, that.replaceFunc);
    },

    // escape valid filename characters that are misleading in the URI
    // preserve other chars for beauty
    // see also: validateFilename
    escapeFileName: function(aString) {
        // " ": breaks srcset
        // "#": as the demarcation of main location and hash
        return aString.replace(/[ %#]+/g, function(m){return encodeURIComponent(m);});
    },

    // Tidy chars that may not be valid in a filename on a platform.
    // see also: escapeFileName
    validateFileName: function(aFileName) {
        aFileName = aFileName.replace(/[\x00-\x1F\x7F]+|^ +/g, "");
        aFileName = aFileName.replace(/^\./, "_.").replace(/^ +/, "").replace(/[. ]+$/, ""); // leading/trailing spaces and dots are not allowed in Windows
        aFileName = aFileName.replace(/[\"\?\*\\\/\|\:]/g, "_");
        aFileName = aFileName.replace(/[\<]/g, "(");
        aFileName = aFileName.replace(/[\>]/g, ")");
        if (this.getPref("asciiFilename", false)) {
            aFileName = aFileName.replace(/[^\x00-\x7F]+/g, function(m){
                return encodeURI(m);
            });
        }
        return aFileName;
    },

    convertHTMLtoText: function(aStr) {
        let converter = Components.classes['@mozilla.org/widget/htmlformatconverter;1'].createInstance(Components.interfaces.nsIFormatConverter);
        let fromStr = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString);
        fromStr.data = aStr;
        let toStr = { value: null };
        try {
            converter.convert("text/html", fromStr, aStr.length, "text/unicode", toStr, {});
            toStr = toStr.value.QueryInterface(Components.interfaces.nsISupportsString);
            return toStr.toString();
        } catch(ex) {}
        return aStr;
    },

    // aTplRegExp is a RegExp with label name in the frist parenthesis, eg. /{([\w_]+)}/g
    stringTemplate: function(aString, aTplRegExp, aTplArray) {
        return aString.replace(aTplRegExp, function(match, label){
            if (label in aTplArray) return aTplArray[label];
            return "";
        });
    },
 
    // aCharLimit: UTF-16 chars limit, beyond which will be cropped. 0 means no crop.
    // aByteLimit: UTF-8 bytes limit, beyond which will be cropped. 0 means no crop.
    // aEllipsis: text for ellipsis
    crop: function(aString, aCharLimit, aByteLimit, aEllipsis) {
        let str = aString;
        let ellipsis = (typeof aEllipsis != "undefined") ? aEllipsis : "...";
        if (aCharLimit) {
            if (str.length > aCharLimit) {
                str = str.substring(0, aCharLimit - ellipsis.length) + ellipsis;
            }
        }
        if (aByteLimit) {
            let bytes = this.unicodeToUtf8(str);
            if (bytes.length > aByteLimit) {
                bytes = bytes.substring(0, aByteLimit - this.unicodeToUtf8(ellipsis).length);
                while (true) {
                    try {
                        return this.utf8ToUnicode(bytes) + ellipsis;
                    } catch(e) {};
                    bytes = bytes.substring(0, bytes.length-1);
                }
            }
        }
        return str;
    },
        
    pad: function(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    },

    getUUID: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    },
    
    formatFileSize: function (bytes, si) {
        let thresh = si ? 1000 : 1024;
        let units = si
            ? ['B', 'kB','MB','GB','TB','PB','EB','ZB','YB']
            : ['B', 'KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
        let e = Math.log(bytes) / Math.log(thresh) | 0;
        let n = bytes / Math.pow(thresh, e);
        return n.toFixed((e >= 1 && n < 10) ? 1 : 0) + ' ' + units[e];
    },


    /****************************************************************
     * Interface object utilies
     ***************************************************************/

    alert: function(aText) {
        this.PROMPT.alert(null, "[ScrapBook]", aText);
    },

    log: console.log,

    warn: console.warn,

    error: console.error,

    // get the main browser window which is the backend of the current window
    getBrowserWindow: function() {
        return this.WINDOW.getMostRecentWindow("navigator:browser");
    },
 
    getFocusedWindow: function() {
        let window = this.getBrowserWindow();
        let win = window.document.commandDispatcher.focusedWindow;
        if ( !win || win == window || win instanceof Components.interfaces.nsIDOMChromeWindow ) win = window.content;
        return win;
    },

    openManageWindow: function(aRes, aModEltID) {
        let window = this.getBrowserWindow();
        window.openDialog("chrome://scrapbook/content/manage.xul", "ScrapBook:Manage", "chrome,centerscreen,all,resizable,dialog=no", aRes, aModEltID);
    },

    loadURL: function(aURL, tabbed) {
        let win = this.getBrowserWindow();
        if ( !win ) return;
        let browser = win.gBrowser;
        if ( tabbed ) {
            browser.selectedTab = browser.addTab(aURL);
        } else {
            browser.loadURI(aURL);
        }
    },

    // aOptions.mode:
    //   modeOpen         0  Load a file.
    //   modeSave         1  Save a file.
    //   modeGetFolder    2  Select a folder/directory.
    //   modeOpenMultiple 3  Load multiple files.
    showFilePicker: function(aOptions) {
        aOptions = aOptions || {};
        let FP = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
        FP.init(aOptions.window, aOptions.title || "", aOptions.mode || 0);
        if (aOptions.dir) FP.displayDirectory = aOptions.dir;
        if (aOptions.filename) FP.defaultString = aOptions.filename;
        if (aOptions.ext) FP.defaultExtension = aOptions.ext;
        if (aOptions.filters) {
            aOptions.filters.forEach(function(filter){
                if (typeof filter == "number") {
                    FP.appendFilters(filter);
                } else {
                    let [title, filter] = filter;
                    FP.appendFilter(title, filter);
                }
            });
        }
        if (FP.show() !== FP.returnCancel) {
            return FP.file;
        }
        return null;
    },


    /****************************************************************
     * DOM elements handling
     ***************************************************************/

    flattenFrames: function(aWindow) {
        let ret = [aWindow];
        for ( let i = 0; i < aWindow.frames.length; i++ ) {
            ret = ret.concat(this.flattenFrames(aWindow.frames[i]));
        }
        return ret;
    },

    getOuterHTML: function(aNode) {
        let outer = aNode.outerHTML;
        if (typeof(outer) != "undefined") return outer;
        // older versions without native outerHTML
        let wrapper = aNode.ownerDocument.createElement("div");
        wrapper.appendChild(aNode.cloneNode(true));
        return wrapper.innerHTML;
    },

    surroundByTags: function(aNode, aContent) {
        let tag = "<" + aNode.nodeName.toLowerCase();
        for ( let i=0; i<aNode.attributes.length; i++ ) {
            tag += ' ' + aNode.attributes[i].name + '="' + this.escapeHTML(aNode.attributes[i].value) + '"';
        }
        tag += ">\n";
        return tag + aContent + "</" + aNode.nodeName.toLowerCase() + ">\n";
    },

    // Node.remove() is supported since Firefox >= 23.0
    removeNode: function(aNode) {
        return aNode.parentNode.removeChild(aNode);
    },

    doctypeToString: function(aDoctype) {
        if ( !aDoctype ) return "";
        let ret = "<!DOCTYPE " + aDoctype.name;
        if ( aDoctype.publicId ) ret += ' PUBLIC "' + aDoctype.publicId + '"';
        if ( aDoctype.systemId ) ret += ' "'        + aDoctype.systemId + '"';
        ret += ">\n";
        return ret;
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
    getSbObjectType: function(aNode) {
        if (aNode.nodeType != 1) return false;
        let type = aNode.getAttribute("data-sb-obj");
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
    getSbObjectRemoveType: function(aNode) {
        let type = this.getSbObjectType(aNode);
        if (!type) return -1;
        if (["title", "title-src", "stylesheet", "stylesheet-temp", "todo"].indexOf(type) != -1) return 0;
        if (["linemarker", "inline", "link-url", "link-inner", "link-file", "custom-wrapper"].indexOf(type) != -1) return 2;
        return 1;
    },

    /**
     * if aRefNode has "data-sb-id" attribute, get all nodes with same data-sb-id
     * else return [aRefNode]
     */
    getSbObjectsById: function(aRefNode) {
        let id = aRefNode.getAttribute("data-sb-id");
        if (!id) return [aRefNode];
        let doc = aRefNode.ownerDocument;
        if (doc.querySelectorAll) {
            return doc.querySelectorAll('[data-sb-id="' + id.replace(/"/g, '\\"') + '"]');
        } else {
            // workaround for older Firefox versions that don't support
            let ret = [];
            let els = doc.getElementsByTagName("*");
            for (var i=0, I=els.length; i<I; ++i) {
                if (els[i].getAttribute("data-sb-id") == id) ret.push(els[i]);
            }
            return ret;
        }
    },

    /**
     * Data Store
     */
    _getDocumentIndex: function(aDocument) {
        // try to lookup the index of the specific document
        let idx = false;
        let firstEmptyIdx = false;
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

    documentData: function(aDocument, aKey, aValue) {
        let idx = this._getDocumentIndex(aDocument);
        // if given a new value, set it
        if (aValue !== undefined) {
            this._documentDataArray[idx][aKey] = aValue;
            return;
        }
        // else return the current value
        return this._documentDataArray[idx][aKey];
    },

    // check if an object is dead (eg. window/document closed)
    isDeadObject: function(aObject) {
        try {
            let x = aObject.body;
        } catch(ex) {
            return true;
        }
        return false;
    },
};
