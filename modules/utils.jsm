
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
			dir.append("ScrapBook");
		}
		if (!dir.exists()) {
			dir.create(dir.DIRECTORY_TYPE, 0700);
		}
		return dir;
	},

	getContentDir: function SBU_getContentDir(aID, aSuppressCreate) {
		if (!aID || aID.length != 14) {
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
				file.remove(true);
			}
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

	getTimeStamp: function SBU_getTimeStamp(advance) {
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
		aFileName = aFileName.replace(/[\*\&]/g, "+");
		aFileName = aFileName.replace(/[\\\/\|\:;]/g, "-");
		aFileName = aFileName.replace(/[\<]/g, "(");
		aFileName = aFileName.replace(/[\>]/g, ")");
		aFileName = aFileName.replace(/[\s]/g, "_");
		aFileName = aFileName.replace(/[%]/g, "@");
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
		return aString.length > aMaxLength ? aString.substr(0, aMaxLength) + "..." : aString;
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
		var privacyContext = this.getBrowserWindow().QueryInterface(Ci.nsIInterfaceRequestor).
		                     getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsILoadContext);
		persist.saveURI(uri, null, null, null, null, aFile, privacyContext); 
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
		var topWin = this.WINDOW.getMostRecentWindow("navigator:browser");
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




var EXPORTED_SYMBOLS = ["ScrapBookUtils"];


