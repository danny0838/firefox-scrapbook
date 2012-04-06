
const Cc = Components.classes;
const Ci = Components.interfaces;

const ScrapBookUtils = {

	get namespace() { return "http://amb.vis.ne.jp/mozilla/scrapbook-rdf#"; },


	getScrapBookDir: function SBU_getScrapBookDir() {
		var dir;
		try {
			var isDefault = this.getPref("data.default");
			dir = this.prefBranch.getComplexValue("data.path", Ci.nsILocalFile);
		}
		catch (ex) {
			isDefault = true;
		}
		if (isDefault) {
			dir = this.DIR.get("ProfD", Ci.nsIFile);
			dir.append("ScrapBookStorage");
		}
		if (!dir.exists()) {
			dir.create(dir.DIRECTORY_TYPE, 0700);
		}
		return dir;
	},

	getContentDir: function SBU_getContentDir(aID, aSuppressCreate) {
		if (!aID) {
			this.alert("ERROR: Failed to get directory '" + aID + "'.");
			return null;
		}
		var dir = this.getScrapBookDir().clone();
		dir.append("data");
		if (!dir.exists())
			dir.create(dir.DIRECTORY_TYPE, 0700);
		dir.append(aID);
		if (!dir.exists()) {
			if (aSuppressCreate) {
				return null;
			}
			dir.create(dir.DIRECTORY_TYPE, 0700);
		}
		return dir;
	},

	removeDirSafety: function SBU_removeDirSafety(aDir, check) {
		var file;
		try {
			if (check && !aDir.leafName.match(/^\d{14}$/))
				return;
			var fileEnum = aDir.directoryEntries;
			while (fileEnum.hasMoreElements()) {
				file = fileEnum.getNext().QueryInterface(Ci.nsIFile);
				if (file.isFile())
					file.remove(false);
			}
			file = aDir;
			if (aDir.isDirectory())
				aDir.remove(false);
			return true;
		}
		catch (ex) {
			this.alert("ERROR: Failed to remove file '" + file.leafName + "'.\n" + ex);
			return false;
		}
	},

	loadURL: function SBU_loadURL(aURL, aInNewTab) {
		var win = this.WINDOW.getMostRecentWindow("navigator:browser");
		if (!win)
			return;
		if (aInNewTab)
			win.gBrowser.selectedTab = win.gBrowser.addTab(aURL);
		else
			win.gBrowser.loadURI(aURL);
	},

	refreshGlobal: function SBU_refreshGlobal(aDSChanged) {
		var winEnum = this.WINDOW.getEnumerator("navigator:browser");
		while (winEnum.hasMoreElements()) {
			var win = winEnum.getNext();
			aDSChanged ? win.ScrapBookBrowserOverlay.refresh(): win.ScrapBookBrowserOverlay.rebuild();
			var win = win.document.getElementById("sidebar").contentWindow;
			if ("sbMainUI" in win) {
				aDSChanged ? win.sbMainUI.refresh() : win.sbMainUI.rebuild();
			}
		}
		var winEnum = this.WINDOW.getEnumerator("scrapbook");
		while (winEnum.hasMoreElements()) {
			var win = winEnum.getNext();
			if ("sbMainUI" in win) {
				aDSChanged ? win.sbMainUI.refresh() : win.sbMainUI.rebuild();
			}
		}
	},

	getTimeStamp2: function SBU_getTimeStamp(advance) {
		var date = new Date;
		if (advance)
			date.setTime(date.getTime() + 1000 * advance);
		var y = date.getFullYear().toString();
		var m = ("0" + (date.getMonth() + 1).toString()).slice(-2);
		var d = ("0" +  date.getDate()      .toString()).slice(-2);
		var h = ("0" +  date.getHours()     .toString()).slice(-2);
		var i = ("0" +  date.getMinutes()   .toString()).slice(-2);
		var s = ("0" +  date.getSeconds()   .toString()).slice(-2);
		date = y + m + d + h + i + s;
		if (date.length != 14)
			throw Components.results.NS_ERROR_UNEXPECTED;
		return date;
	},

    //todo slimx
    getTimeStamp : function(advance)
	{
        var dd = new Date;
        if (advance) dd.setTime(dd.getTime() + 1000 * advance);
        var y = dd.getFullYear();
        var m = dd.getMonth() + 1;
        if (m < 10) m = "0" + m;
        var d = dd.getDate();
        if (d < 10) d = "0" + d;
        var h = dd.getHours();
        if (h < 10) h = "0" + h;
        var i = dd.getMinutes();
        if (i < 10) i = "0" + i;
        var s = dd.getSeconds();
        if (s < 10) s = "0" + s;
        var ms = dd.getMilliseconds();
        if (ms < 10) ms = "00" + ms;
        else if (ms < 100)ms = "0" + ms;
        return y.toString() + m.toString() + d.toString() + h.toString() + i.toString() + s.toString() + ms.toString();
    },

	getRootHref: function SBU_getRootHref(aURLSpec) {
		var url = Cc["@mozilla.org/network/standard-url;1"].createInstance(Ci.nsIURL);
		url.spec = aURLSpec;
		return url.scheme + "://" + url.host + "/";
	},

	getBaseHref: function SBU_getBaseHref(aURI) {
		var pos, base;
		base = ((pos = aURI.indexOf("?"))     != -1) ? aURI.substring(0, pos)   : aURI;
		base = ((pos = base.indexOf("#"))     != -1) ? base.substring(0, pos)   : base;
		base = ((pos = base.lastIndexOf("/")) != -1) ? base.substring(0, ++pos) : base;
		return base;
	},

	getFileName: function SBU_getFileName(aURI) {
		var pos, name;
		name = ((pos = aURI.indexOf("?"))     != -1) ? aURI.substring(0, pos) : aURI;
		name = ((pos = name.indexOf("#"))     != -1) ? name.substring(0, pos) : name;
		name = ((pos = name.lastIndexOf("/")) != -1) ? name.substring(++pos)  : name;
		return name;
	},

	splitFileName: function SBU_splitFileName(aFileName) {
		var pos = aFileName.lastIndexOf(".");
		var ret = [];
		if (pos != -1) {
			ret[0] = aFileName.substring(0, pos);
			ret[1] = aFileName.substring(pos + 1, aFileName.length);
		}
		else {
			ret[0] = aFileName;
			ret[1] = "";
		}
		return ret;
	},

	validateFileName: function SBU_validateFileName(aFileName) {
		aFileName = aFileName.replace(/[\"\?!~`]+/g, "");
		aFileName = aFileName.replace(/[\*\&]+/g, "+");
		aFileName = aFileName.replace(/[\\\/\|\:;]+/g, "-");
		aFileName = aFileName.replace(/[\<]+/g, "(");
		aFileName = aFileName.replace(/[\>]+/g, ")");
		aFileName = aFileName.replace(/[\s]+/g, "_");
		aFileName = aFileName.replace(/[%]+/g, "@");
		return aFileName;
	},

	resolveURL: function SBU_resolveURL(aBaseURL, aRelURL) {
		try {
			var baseURLObj = this.convertURLToObject(aBaseURL);
			return baseURLObj.resolve(aRelURL);
		}
		catch (ex) {
		}
	},

	crop: function SBU_crop(aString, aMaxLength) {
		return aString.length > aMaxLength ? aString.substring(0, aMaxLength) + "..." : aString;
	},



	readFile: function SBU_readFile(aFile) {
		try {
			var istream = Cc["@mozilla.org/network/file-input-stream;1"].
			              createInstance(Ci.nsIFileInputStream);
			istream.init(aFile, 1, 0, false);
			var sstream = Cc["@mozilla.org/scriptableinputstream;1"].
			              createInstance(Ci.nsIScriptableInputStream);
			sstream.init(istream);
			var content = sstream.read(sstream.available());
			sstream.close();
			istream.close();
			return content;
		}
		catch (ex) {
			return false;
		}
	},

	writeFile: function SBU_writeFile(aFile, aContent, aChars) {
		if (aFile.exists())
			aFile.remove(false);
		try {
			aFile.create(aFile.NORMAL_FILE_TYPE, 0666);
			this.UNICODE.charset = aChars;
			aContent = this.UNICODE.ConvertFromUnicode(aContent);
			var ostream = Cc["@mozilla.org/network/file-output-stream;1"].
			              createInstance(Ci.nsIFileOutputStream);
			ostream.init(aFile, 2, 0x200, false);
			ostream.write(aContent, aContent.length);
			ostream.close();
		}
		catch (ex) {
			this.alert("ERROR: Failed to write file: " + aFile.leafName);
		}
	},

	writeIndexDat: function SBU_writeIndexDat(aItem, aFile) {
		if (!aFile) {
			aFile = this.getContentDir(aItem.id).clone();
			aFile.append("index.dat");
		}
		var content = "";
		for (var prop in aItem) {
			content += prop + "\t" + aItem[prop] + "\n";
		}
		this.writeFile(aFile, content, "UTF-8");
	},

	saveTemplateFile: function SBU_saveTemplateFile(aURLSpec, aFile) {
		if (aFile.exists())
			return;
		var uri = Cc["@mozilla.org/network/standard-url;1"].createInstance(Ci.nsIURL);
		uri.spec = aURLSpec;
		var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].
		              createInstance(Ci.nsIWebBrowserPersist);
		persist.saveURI(uri, null, null, null, null, aFile);
	},

	convertToUnicode: function SBU_convertToUnicode(aString, aCharset) {
		if (!aString)
			return "";
		try {
			this.UNICODE.charset = aCharset;
			aString = this.UNICODE.ConvertToUnicode(aString);
		}
		catch (ex) {
		}
		return aString;
	},



	convertPathToFile: function SBU_convertPathToFile(aPath) {
		var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
		file.initWithPath(aPath);
		return file;
	},

	convertFilePathToURL: function SBU_convertFilePathToURL(aFilePath) {
		var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
		file.initWithPath(aFilePath);
		return this.IO.newFileURI(file).spec;
	},

	convertURLToObject: function SBU_convertURLToObject(aURLSpec) {
		var uri = Cc["@mozilla.org/network/standard-url;1"].createInstance(Ci.nsIURI);
		uri.spec = aURLSpec;
		return uri;
	},

	convertURLToFile: function SBU_convertURLToFile(aURLSpec) {
		if (aURLSpec.indexOf("file://") != 0)
			return;
		try {
			var fileHandler = this.IO.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);
			return fileHandler.getFileFromURLSpec(aURLSpec);
		}
		catch (ex) {
		}
	},

	execProgram: function SBU_execProgram(aExecFilePath, args) {
		var file    = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
		var process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
		try {
			file.initWithPath(aExecFilePath);
			if (!file.exists()) {
				this.alert("ERROR: File does not exist.\n" + aExecFilePath);
				return;
			}
			process.init(file);
			process.run(false, args, args.length);
		}
		catch (ex) {
			this.alert("ERROR: File is not executable.\n" + aExecFilePath);
		}
	},

	getFocusedWindow: function SBU_getFocusedWindow() {
		var topWin = this.WINDOW.getMostRecentWindow(null);
		var win = topWin.document.commandDispatcher.focusedWindow;
		if (!win || win == topWin || win instanceof Ci.nsIDOMChromeWindow)
			win = topWin.content;
		return win;
	},

	getDefaultIcon: function SBU_getDefaultIcon(type) {
		switch (type) {
			case "folder" : return "chrome://scrapbook/skin/treefolder.png";
			case "note"   : return "chrome://scrapbook/skin/treenote.png";
			default       : return "chrome://scrapbook/skin/treeitem.png";
		}
	},


	get prefBranch() {
		delete this.prefBranch;
		return this.prefBranch = Cc["@mozilla.org/preferences-service;1"].
		                         getService(Ci.nsIPrefService).
		                         getBranch("scrapbook.");
	},

	getPref: function SBU_getPref(aName, aDefaultValue, aInterface) {
		try {
			switch (this.prefBranch.getPrefType(aName)) {
				case this.prefBranch.PREF_BOOL: 
					return this.prefBranch.getBoolPref(aName);
				case this.prefBranch.PREF_INT: 
					return this.prefBranch.getIntPref(aName);
				case this.prefBranch.PREF_STRING: 
					return this.prefBranch.getComplexValue(aName, Ci.nsISupportsString).data;
				default: 
					throw null;
			}
		}
		catch (ex) {
			return aDefaultValue;
		}
	},

	setPref: function SBU_getPref(aName, aValue) {
		try {
			switch (this.prefBranch.getPrefType(aName)) {
				case this.prefBranch.PREF_BOOL: 
					this.prefBranch.setBoolPref(aName, aValue);
					break;
				case this.prefBranch.PREF_INT: 
					this.prefBranch.setIntPref(aName, aValue);
					break;
				case this.prefBranch.PREF_STRING: 
					var str = Cc["@mozilla.org/supports-string;1"].
					          createInstance(Ci.nsISupportsString);
					str.data = aValue;
					this.prefBranch.setComplexValue(aName, Ci.nsISupportsString, str);
					break;
				default: 
					throw null;
			}
		}
		catch (ex) {
		}
	},

	escapeComment: function SBU_escapeComment(aStr) {
		if (aStr.length > 10000)
			this.alert("NOTICE: Too long comment makes ScrapBook slow.");
		return aStr.replace(/\r|\n|\t/g, " __BR__ ");
	},

	getBrowserWindow: function SBU_getBrowserWindow() {
		return this.WINDOW.getMostRecentWindow("navigator:browser");
	},

	openManageWindow: function SBU_openManageWindow(aRes, aModEltID) {
		this.getBrowserWindow().openDialog(
			"chrome://scrapbook/content/manage.xul", "ScrapBook:Manage", 
			"chrome,centerscreen,all,resizable,dialog=no", aRes, aModEltID
		);
	},

	getLocaleString: function F2U_getLocaleString(aName, aArgs) {
		if (!this._stringBundle) {
			const BUNDLE_URI = "chrome://scrapbook/locale/scrapbook.properties";
			var bundleSvc = Cc["@mozilla.org/intl/stringbundle;1"].
			                getService(Ci.nsIStringBundleService);
			this._stringBundle = bundleSvc.createBundle(BUNDLE_URI);
		}
		try {
			if (!aArgs)
				return this._stringBundle.GetStringFromName(aName);
			else
			    return this._stringBundle.formatStringFromName(aName, aArgs, aArgs.length);
		}
		catch (ex) {
			return aName;
		}
	},
	_stringBundle: null,

	alert: function SBU_alert(aText) {
		this.PROMPT.alert(null, "[ScrapBook]", aText);
	},

	log: function SBU_log(aMsg, aOpenConsole) {
		var console = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
		console.logStringMessage("ScrapBook> " + aMsg);
	},


    //------------------------------------------------------------------------------------------------------------------
    writeHtml:function(item,node)
    {
        let file = this.getScrapBookDir();
        file.append("data");

        if(ScrapBookUtils.getPref("save.format")==1)
        {
            //maf
            file.append(item.id+".maff");
        }else
        {
            //html
            file.append(item.id);
            file.append("index.html");
        }
        let path = this.IO.newFileURI(file).spec;

        Components.utils.import("resource:///modules/PlacesUtils.jsm");
        let annoObj = { name: "bookmarkProperties/description",type: 3,flags: 0,value:path ,expires: 4 };
        //aURI, aContainer, aIndex, aTitle, aKeyword,aAnnotations, aChildTransactions
        if(node)
        {
            if(node.itemId)
            {
                //?
            }
            else if(node.parentId)
            {
                let tx = new PlacesCreateBookmarkTransaction(this.url(item.source),node.parentId,0,item.title,undefined,[annoObj],undefined);
                tx.doTransaction();
            }
            else if(node.saveAsMht)
            {
                //todo?
            }
        }else
        {
            let tx = new PlacesCreateBookmarkTransaction(this.url(item.source),this.Application.storage.get("sb@in",-1),0,item.title,undefined,[annoObj],undefined);
            tx.doTransaction();
        }

    },
    url:function(spec) {
        var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        return ios.newURI(spec, null, null);
    },

    getBookmarkWin:function()
    {
        let topWin = this.WINDOW.getMostRecentWindow(null);
        let win = topWin.document.commandDispatcher.focusedWindow;
        return win;
    },

    //------------------------------------------------------------------------------------------------------------------
    inScrapbook:function(id)
    {
        var result = this._checkParent(id);
        return result;
    },
    _checkParent:function(id)
    {

        try{
        var parentFolderId = this.bmsvc.getFolderIdForItem(id);
        }catch(ex)
        {
            return;
        }
        //ScrapBookUtils.log(parentFolderId+":"+this.$root)
        if (parentFolderId == this.Application.storage.get("sb@root",-1)) return true;
        else
        {
            return this._checkParent(parentFolderId);
        }
    },


    checkContainerExist:function()
    {
        let titleRoot = "Scrapbook Storage";
        let titleIn = "@in";
        let root = this.Application.bookmarks.menu;
        let children = root.children;

        let rootId=0,inId = 0;
        aLoop:
        for each(let i in children)
        {
            if(i.title==titleRoot)
            {
                rootId = i.id;
                let children2 = i.children;
                for each(let j in children2)
                {
                    if(j.title==titleIn)
                    {
                        inId = j.id;
                        break aLoop;
                    }
                }
                if(inId==0) inId  = this.bmsvc.createFolder(rootId,titleIn,0);
                break aLoop;
            }
        }
        if(rootId==0)
        {
            rootId = this.bmsvc.createFolder(root.id,titleRoot,0);
            inId  = this.bmsvc.createFolder(rootId,titleIn,0);
        }
        this.Application.storage.set("sb@root",rootId);
        this.Application.storage.set("sb@in",inId);
        ScrapBookUtils.log(inId);
    },

    //todo slimx no gbrowser
    getTabSize:function()
    {
        try{
        var nodes = this.getBrowserWindow().gBrowser.mTabContainer.childNodes;
        let length = nodes.length;
        for (var i = 0; i < length; i++) {
            if (nodes[i].getAttribute('tabProtect') || nodes[i].getAttribute("pinned")) {
                length--;
            }
        }
        return length;
        }catch(e)
        {
            ScrapBookUtils.log(e);
            return 2;
        }
    },


    getBookmarkId:function(url)
    {

        let regexp = /\/(\d*)\/index\.html$/;

        let itemId = 0;
        if(regexp.exec(url))
            itemId = RegExp.$1;
        if(itemId=="")
        {
            regexp = /\/(\d*)\.maff$/;
            if(regexp.exec(url))
                itemId = RegExp.$1;
        }
        let id = 0;
        if(itemId!="") id = this.Application.storage.get("sbBookmark"+itemId,0);
        return id;
    },

    //通过本地地址得到item的id
    getItemId:function(url) {
        let regexp = /\/(\d*)\/index.html$/;
        let itemId = 0;
        if(regexp.exec(url)){
            itemId =  RegExp.$1;
        }
        else
        {
            regexp = /\/(\d*)\.maff$/;
            if(regexp.exec(url))
                itemId =  RegExp.$1;
        }
        return itemId;
    },

    saveBookmarkInfo:function(url,id)
    {

        let regexp = /\/(\d*)\/index\.html$/;
        let itemId = 0;
        if(regexp.exec(url))
            itemId = RegExp.$1;
        if(itemId=="")
        {
            regexp = /\/(\d*)\.maff$/;
            if(regexp.exec(url))
                itemId = RegExp.$1;
        }
        if(itemId!="")
            this.Application.storage.set("sbBookmark"+itemId,id);
    },

     getLocalFileFromNativePathOrUrl:function(aPathOrUrl)
    {
      if (aPathOrUrl.substring(0,7) == "file://") {
        // if this is a URL, get the file from that
        let ioSvc = Cc["@mozilla.org/network/io-service;1"].
                    getService(Ci.nsIIOService);

        // XXX it's possible that using a null char-set here is bad
        const fileUrl = ioSvc.newURI(aPathOrUrl, null, null).
                        QueryInterface(Ci.nsIFileURL);
        return fileUrl.file.clone().QueryInterface(Ci.nsILocalFile);
      } else {
        // if it's a pathname, create the nsILocalFile directly
        var f = new nsLocalFile(aPathOrUrl);

        return f;
      }
    },

    openParent:function(f) {
        try {
            // Show the directory containing the file and select the file
            f.reveal();
        } catch (e) {
            // If reveal fails for some reason (e.g., it's not implemented on unix or
            // the file doesn't exist), try using the parent if we have it.
            let parent = f.parent.QueryInterface(Ci.nsILocalFile);
            if (!parent)
                return;
            try {
                // "Double click" the parent directory to show where the file should be
                parent.launch();
            } catch (e) {
                // If launch also fails (probably because it's not implemented), let the
                // OS handler try to open the parent
                this.openExternal(parent);
            }
        }
    },

    openExternal:function(aFile) {
        var uri = Cc["@mozilla.org/network/io-service;1"].
                getService(Ci.nsIIOService).newFileURI(aFile);

        var protocolSvc = Cc["@mozilla.org/uriloader/external-protocol-service;1"].
                getService(Ci.nsIExternalProtocolService);
        protocolSvc.loadUrl(uri);
        return;
    },

    getType:function(file)
    {
        if (file.leafName.search(/\.html$/) > -1)
        return 0;
        else if (file.leafName.search(/\.maff$/) > -1)
        return 1;
    },

    //xml里面必须要做实体换转
    formatText:function(txt)
    {
        return txt.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
    //slimx todo it's right?
    getMainWin:function()
    {
    /*return window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                            .getInterface(Components.interfaces.nsIWebNavigation)
                            .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                            .rootTreeItem
                            .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                            .getInterface(Components.interfaces.nsIDOMWindow);*/
    return this.getBrowserWindow();
    }
    //------------------------------------------------------------------------------------------------------------------


};




Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyServiceGetter(
	ScrapBookUtils, "RDF", "@mozilla.org/rdf/rdf-service;1", "nsIRDFService"
);
XPCOMUtils.defineLazyServiceGetter(
	ScrapBookUtils, "RDFC", "@mozilla.org/rdf/container;1", "nsIRDFContainer"
);
XPCOMUtils.defineLazyServiceGetter(
	ScrapBookUtils, "RDFCU", "@mozilla.org/rdf/container-utils;1", "nsIRDFContainerUtils"
);
XPCOMUtils.defineLazyServiceGetter(
	ScrapBookUtils, "DIR", "@mozilla.org/file/directory_service;1", "nsIProperties"
);
XPCOMUtils.defineLazyServiceGetter(
	ScrapBookUtils, "IO", "@mozilla.org/network/io-service;1", "nsIIOService"
);
XPCOMUtils.defineLazyServiceGetter(
	ScrapBookUtils, "UNICODE", "@mozilla.org/intl/scriptableunicodeconverter", "nsIScriptableUnicodeConverter"
);
XPCOMUtils.defineLazyServiceGetter(
	ScrapBookUtils, "WINDOW", "@mozilla.org/appshell/window-mediator;1", "nsIWindowMediator"
);
XPCOMUtils.defineLazyServiceGetter(
	ScrapBookUtils, "PROMPT", "@mozilla.org/embedcomp/prompt-service;1", "nsIPromptService"
);

//----------------------------------------------------------------------------------------------------------------------
XPCOMUtils.defineLazyServiceGetter(
	ScrapBookUtils, "bmsvc", "@mozilla.org/browser/nav-bookmarks-service;1", "nsINavBookmarksService"
);

XPCOMUtils.defineLazyServiceGetter(
	ScrapBookUtils, "Application", "@mozilla.org/fuel/application;1", "fuelIApplication"
);


var EXPORTED_SYMBOLS = ["ScrapBookUtils"];


