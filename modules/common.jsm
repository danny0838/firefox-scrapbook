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

	get _fxVer3_5() {
		delete this._fxVer3_5;
		return this._fxVer3_5 = (this.checkFirefoxVersion("3.5") >=0);
	},
	get _fxVer3_6() {
		delete this._fxVer3_6;
		return this._fxVer3_6 = (this.checkFirefoxVersion("3.6") >=0);
	},
	get _fxVer4() {
		delete this._fxVer4;
		return this._fxVer4 = (this.checkFirefoxVersion("4.0") >=0);
	},
	get _fxVer9() {
		delete this._fxVer9;
		return this._fxVer9 = (this.checkFirefoxVersion("9.0") >=0);
	},
	get _fxVer11() {
		delete this._fxVer11;
		return this._fxVer11 = (this.checkFirefoxVersion("11.0") >=0);
	},
	get _fxVer18() {
		delete this._fxVer18;
		return this._fxVer18 = (this.checkFirefoxVersion("18.0") >=0);
	},
	get _fxVer22() {
		delete this._fxVer22;
		return this._fxVer22 = (this.checkFirefoxVersion("22.0") >=0);
	},
	get _fxVer30() {
		delete this._fxVer30;
		return this._fxVer30 = (this.checkFirefoxVersion("30.0") >=0);
	},

	/**
	 * return >= 0 if current version >= given version
	 */
	checkFirefoxVersion : function(ver) {
		var iVerComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
		var iAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
		return iVerComparator.compare(iAppInfo.version, ver);
	},

	newItem : function(aID)
	{
		return { id : aID || "", create : aID || "", modify : aID || "", type : "", title : "", chars : "", icon : "", source : "", comment : "", lock : "" };
	},

	getScrapBookDir : function()
	{
		var dir;
		try {
			var isDefault = sbCommonUtils.getPref("data.default", true);
			dir = sbCommonUtils.getPref("data.path", "");
			dir = this.convertPathToFile(dir);
		} catch(ex) {
			isDefault = true;
		}
		if ( isDefault )
		{
			dir = this.DIR.get("ProfD", Components.interfaces.nsIFile);
			dir.append("ScrapBook");
		}
		if ( !dir.exists() )
		{
			dir.create(dir.DIRECTORY_TYPE, 0700);
		}
		return dir;
	},

	getContentDir : function(aID, aSuppressCreate)
	{
		if ( !aID || aID.length != 14 )
		{
			this.alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_GET_DIR", [aID]));
			return null;
		}
		var dir = this.getScrapBookDir().clone();
		dir.append("data");
		if ( !dir.exists() ) dir.create(dir.DIRECTORY_TYPE, 0700);
		dir.append(aID);
		if ( !dir.exists() )
		{
			if ( aSuppressCreate )
			{
				return null;
			}
			dir.create(dir.DIRECTORY_TYPE, 0700);
		}
		return dir;
	},

	removeDirSafety : function(aDir, check)
	{
		var curFile;
		try {
			if ( check && !aDir.leafName.match(/^\d{14}$/) ) return;
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

	loadURL : function(aURL, tabbed)
	{
		var win = this.WINDOW.getMostRecentWindow("navigator:browser");
		if ( !win ) return;
		var browser = win.gBrowser;
		if ( tabbed ) {
			browser.selectedTab = browser.addTab(aURL);
		} else {
			browser.loadURI(aURL);
		}
	},

	rebuildGlobal : function()
	{
		this._refresh(false);
	},

	refreshGlobal: function()
	{
		this._refresh(true);
	},

	_refresh: function(aDSChanged)
	{
		var sidebarId = this.getSidebarId("sidebar");
		var winEnum = this.WINDOW.getEnumerator("navigator:browser");
		// refresh/rebuild main browser windows and their sidebars
		while (winEnum.hasMoreElements()) {
			var win = winEnum.getNext();
			aDSChanged ? win.sbBrowserOverlay.refresh() : win.sbBrowserOverlay.rebuild();
			var win = win.document.getElementById(sidebarId).contentWindow;
			if (win.sbMainService) {
				aDSChanged ? win.sbMainService.refresh() : win.sbMainService.rebuild();
			}
		}
		// refresh/rebuild other scrapbook windows
		var winEnum = this.WINDOW.getEnumerator("scrapbook");
		while (winEnum.hasMoreElements()) {
			var win = winEnum.getNext();
			if (win.sbMainService) {
				aDSChanged ? win.sbMainService.refresh() : win.sbMainService.rebuild();
			}
		}
	},

	getTimeStamp : function(aDate)
	{
		var dd = aDate || new Date();
		var y = dd.getFullYear();
		var m = dd.getMonth() + 1; if ( m < 10 ) m = "0" + m;
		var d = dd.getDate();      if ( d < 10 ) d = "0" + d;
		var h = dd.getHours();     if ( h < 10 ) h = "0" + h;
		var i = dd.getMinutes();   if ( i < 10 ) i = "0" + i;
		var s = dd.getSeconds();   if ( s < 10 ) s = "0" + s;
		return y.toString() + m.toString() + d.toString() + h.toString() + i.toString() + s.toString();
	},

	getRootHref : function(aURLSpec)
	{
		var url = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
		url.spec = aURLSpec;
		return url.scheme + "://" + url.host + "/";
	},

	getBaseHref : function(sURI)
	{
		var pos, base;
		base = ( (pos = sURI.indexOf("?")) != -1 ) ? sURI.substring(0, pos) : sURI;
		base = ( (pos = base.indexOf("#")) != -1 ) ? base.substring(0, pos) : base;
		base = ( (pos = base.lastIndexOf("/")) != -1 ) ? base.substring(0, ++pos) : base;
		return base;
	},

	getFileName : function(aURI)
	{
		var pos, name;
		name = ( (pos = aURI.indexOf("?")) != -1 ) ? aURI.substring(0, pos) : aURI;
		name = ( (pos = name.indexOf("#")) != -1 ) ? name.substring(0, pos) : name;
		name = ( (pos = name.lastIndexOf("/")) != -1 ) ? name.substring(++pos) : name;
		return decodeURIComponent(name);
	},

	splitFileName : function(aFileName)
	{
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
	validateFileName : function(aFileName)
	{
		aFileName = aFileName.replace(/[\x00-\x1F\x7F]+|^ +/g, "");
		aFileName = aFileName.replace(/[\"\?\*\\\/\|\:]/g, "_");
		aFileName = aFileName.replace(/[\<]/g, "(");
		aFileName = aFileName.replace(/[\>]/g, ")");
		return aFileName;
	},

	resolveURL : function(aBaseURL, aRelURL)
	{
		try {
			// URLObj.spec is encoded and usable URI
			var baseURLObj = this.convertURLToObject(aBaseURL);
			var resolved = baseURLObj.resolve(aRelURL);
			return this.convertURLToObject(resolved).spec;
		} catch(ex) {
			sbCommonUtils.error(sbCommonUtils.lang("scrapbook", "ERR_FAIL_RESOLVE_URL", [aBaseURL, aRelURL]));
		}
	},

	crop : function(aString, aMaxLength)
	{
		return aString.length > aMaxLength ? aString.substr(0, aMaxLength) + "..." : aString;
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
	forEachFile : function(aFolder, aCallback, aThisArg, aArgs)
	{
		var dirs = [aFolder], ret;
		all:
		for (var i=0; i<dirs.length; i++) {
			if (aCallback.call(aThisArg, dirs[i], aArgs) === 0) continue;
			var files = dirs[i].directoryEntries;
			while (files.hasMoreElements()) {
				var file = files.getNext().QueryInterface(Components.interfaces.nsIFile);
				if (file.isDirectory()) {
					dirs.push(file);
				}
				else {
					ret = aCallback.call(aThisArg, file, aArgs);
					if (ret === 1) break;
					else if (ret === 2) break all;
				}
			}
		}
	},

	getFileMime : function(aFile)
	{
		try {
			return this.MIME.getTypeFromFile(aFile);
		}
		catch(ex) {}
		return false;
	},

	readFile : function(aFile)
	{
		try {
			var istream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
			istream.init(aFile, 1, 0, false);
			var sstream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
			sstream.init(istream);
			var content = sstream.read(sstream.available());
			sstream.close();
			istream.close();
			return content;
		}
		catch(ex)
		{
			return false;
		}
	},

	writeFile : function(aFile, aContent, aChars, aNoCatch)
	{
		if ( aFile.exists() ) aFile.remove(false);
		try {
			aFile.create(aFile.NORMAL_FILE_TYPE, 0666);
			this.UNICODE.charset = aChars;
			aContent = this.UNICODE.ConvertFromUnicode(aContent);
			var ostream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
			ostream.init(aFile, 2, 0x200, false);
			ostream.write(aContent, aContent.length);
			ostream.close();
		}
		catch(ex) {
			if (aNoCatch) throw ex;
			else this.alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_WRITE_FILE", [aFile.path, ex]));
		}
	},

	writeIndexDat : function(aItem, aFile)
	{
		if ( !aFile )
		{
			aFile = this.getContentDir(aItem.id).clone();
			aFile.append("index.dat");
		}
		var content = "";
		for ( var prop in aItem )
		{
			content += prop + "\t" + aItem[prop] + "\n";
		}
		this.writeFile(aFile, content, "UTF-8");
	},

	saveTemplateFile : function(aURISpec, aFile)
	{
		if ( aFile.exists() ) return;
		var uri = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
		uri.spec = aURISpec;
		var WBP = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);
		if ( this._fxVer18 ) {
			WBP.saveURI(uri, null, null, null, null, aFile, null);
		} else {
			WBP.saveURI(uri, null, null, null, null, aFile);
		}
	},

	convertToUnicode : function(aString, aCharset)
	{
		if ( !aString ) return "";
		try {
			this.UNICODE.charset = aCharset;
			aString = this.UNICODE.ConvertToUnicode(aString);
		} catch(ex) {
		}
		return aString;
	},



	convertPathToFile : function(aPath)
	{
		var aFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		aFile.initWithPath(aPath);
		return aFile;
	},

	convertFilePathToURL : function(aFilePath)
	{
		var tmpFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		tmpFile.initWithPath(aFilePath);
		return this.IO.newFileURI(tmpFile).spec;
	},

	convertURLToObject : function(aURLString)
	{
		var aURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
		aURL.spec = aURLString;
		return aURL;
	},

	convertURLToFile : function(aURLString)
	{
		var aURL = this.convertURLToObject(aURLString);
		if ( !aURL.schemeIs("file") ) return;
		try {
			var fileHandler = this.IO.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
			return fileHandler.getFileFromURLSpec(aURLString);
		} catch(ex) {
		}
	},

	convertURLToId : function(aURL)
	{
		var file = sbCommonUtils.convertURLToFile(aURL);
		if (!file || !file.exists() || !file.isFile()) return null;
		var aURL = sbCommonUtils.convertFilePathToURL(file.path);
		var sbDir = sbCommonUtils.convertFilePathToURL(sbCommonUtils.getScrapBookDir().path);
		var sbPath = new RegExp("^" + sbCommonUtils.escapeRegExp(sbDir) + "data/(\\d{14})/");
		return aURL.match(sbPath) ? RegExp.$1 : null;
	},
	
	splitURLByAnchor : function(aURL)
	{
		var pos = 0;
		return ( (pos = aURL.indexOf("#")) < 0 ) ? [aURL, ""] : [aURL.substring(0, pos), aURL.substring(pos, aURL.length)];
	},

	execProgram : function(aExecFilePath, args)
	{
		var execfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		var process  = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
		try {
			execfile.initWithPath(aExecFilePath);
			if ( !execfile.exists() ) {
				this.alert(sbCommonUtils.lang("scrapbook", "ERR_FILE_NOT_EXIST", [aExecFilePath]));
				return;
			}
			process.init(execfile);
			process.run(false, args, args.length);
		} catch (ex) {
			this.alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_EXEC_FILE", [aExecFilePath]));
		}
	},

	getFocusedWindow : function()
	{
		var window = this.WINDOW.getMostRecentWindow("navigator:browser");
		var win = window.document.commandDispatcher.focusedWindow;
		if ( !win || win == window || win instanceof Components.interfaces.nsIDOMChromeWindow ) win = window.content;
		return win;
	},

	flattenFrames : function(aWindow)
	{
		var ret = [aWindow];
		for ( var i = 0; i < aWindow.frames.length; i++ )
		{
			ret = ret.concat(this.flattenFrames(aWindow.frames[i]));
		}
		return ret;
	},
	
	getSidebarId : function(id)
	{
		// Need this or MultiSidebar can cause errors
		var rgPosition = sbCommonUtils.getPref("extensions.multisidebar.viewScrapBookSidebar", 1, true);
		if ( rgPosition > 1)
		{
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

	getDefaultIcon : function(type)
	{
		switch ( type )
		{
			case "folder" : return "chrome://scrapbook/skin/treefolder.png"; break;
			case "note"   : return "chrome://scrapbook/skin/treenote.png";   break;
			case "notex"  : return "chrome://scrapbook/skin/treenotex.png";  break;
			default       : return "chrome://scrapbook/skin/treeitem.png";   break;
		}
	},

	/**
	 * Preference handling
	 */
	get prefBranch()
	{
		delete this.prefBranch;
		// must specify a branch or we get an error on setting a pref
		return this.prefBranch = Components.classes["@mozilla.org/preferences-service;1"].
			getService(Components.interfaces.nsIPrefService).
			getBranch("");
	},

	getLocalPref: function (aName)
	{
		return "extensions.scrapbook." + aName;
	},
	
	getPrefType: function (aName, aDefaultValue, isGlobal)
	{
		if (!isGlobal) aName = this.getLocalPref(aName);
		try {
			switch (typeof aDefaultValue) {
				case "boolean":
					return "boolean";
				case "number":
					return "number";
				case "string":
					return "string";
			}
			switch (this.prefBranch.getPrefType(aName)) {
				case this.prefBranch.PREF_BOOL: 
					return "boolean";
				case this.prefBranch.PREF_INT: 
					return "number";
				case this.prefBranch.PREF_STRING: 
					return "string";
			}
		}
		catch (ex) {
			return "undefined";
		}
		return "undefined";
	},

	getPref: function (aName, aDefaultValue, isGlobal)
	{
		if (!isGlobal) aName = this.getLocalPref(aName);
		try {
			switch (this.getPrefType(aName, aDefaultValue, true)) {
				case "boolean": 
					return this.prefBranch.getBoolPref(aName);
				case "number": 
					return this.prefBranch.getIntPref(aName);
				case "string": 
					// using getCharPref may meet encoding problems
					return this.prefBranch.getComplexValue(aName, Components.interfaces.nsISupportsString).data;
				default: 
					throw null;
			}
		}
		catch (ex) {
			return aDefaultValue != undefined ? aDefaultValue : null;
		}
	},

	setPref: function (aName, aValue, isGlobal)
	{
		if (!isGlobal) aName = this.getLocalPref(aName);
		try {
			switch (this.getPrefType(aName, aValue, true)) {
				case "boolean": 
					this.prefBranch.setBoolPref(aName, aValue);
					break;
				case "number": 
					this.prefBranch.setIntPref(aName, aValue);
					break;
				case "string":
					// using getCharPref may meet encoding problems
					var str = Components.classes["@mozilla.org/supports-string;1"].
					          createInstance(Components.interfaces.nsISupportsString);
					str.data = aValue;
					this.prefBranch.setComplexValue(aName, Components.interfaces.nsISupportsString, str);
					break;
				default: 
					throw null;
			}
		}
		catch (ex) {
			sbCommonUtils.error(sbCommonUtils.lang("scrapbook", "ERR_FAIL_SET_PREF", [aName]));
		}
	},

	// deprecated, use getPref instead (left for downward compatibility with addons)
	getBoolPref : function(aName, aDefVal)
	{
		return this.getPref(aName, aDefVal, true);
	},

	// deprecated, use getPref instead (left for downward compatibility with addons)
	copyUnicharPref : function(aPrefName, aDefVal)
	{
		return this.getPref(aName, aDefVal, true);
	},

	// deprecated, use setPref instead (left for downward compatibility with addons)
	setBoolPref : function(aPrefName, aPrefValue)
	{
		return this.setPref(aName, aPrefValue, true);
	},

	// deprecated, use setPref instead (left for downward compatibility with addons)
	setUnicharPref : function(aPrefName, aPrefValue)
	{
		return this.setPref(aName, aPrefValue, true);
	},

	/**
	 * String handling
	 */
	lang : function(aBundle, aName, aArgs)
	{
		var bundle = this._stringBundles[aBundle];
		if (!bundle) {
			var uri = "chrome://scrapbook/locale/%s.properties".replace("%s", aBundle);
			bundle = this._stringBundles[aBundle] = this.BUNDLE.createBundle(uri);
		}
		try {
			if (!aArgs)
				return bundle.GetStringFromName(aName);
			else
			    return bundle.formatStringFromName(aName, aArgs, aArgs.length);
		}
		catch (ex) {
		}
		return aName;
	},

	escapeComment : function(aStr)
	{
		if ( aStr.length > 10000 ) this.alert(sbCommonUtils.lang("scrapbook", "MSG_LARGE_COMMENT"));
		return aStr.replace(/\r|\n|\t/g, " __BR__ ");
	},

	escapeHTML : function(aStr, aNoDoubleQuotes, aSingleQuotes, aNoAmp)
	{
		if (!aNoAmp) aStr = aStr.replace(/&/g, "&amp;");
		aStr = aStr.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		if (!aNoDoubleQuotes) aStr = aStr.replace(/"/g, "&quot;");
		if (aSingleQuotes) aStr = aStr.replace(/'/g, "&apos;");
		return aStr;
	},

	escapeRegExp : function(aString)
	{
		return aString.replace(/([\*\+\?\.\^\/\$\\\|\[\]\{\}\(\)])/g, "\\$1");
	},

	// escape valid filename characters that are misleading in the URI
	// preserve other chars for beauty
	// see also: validateFilename
	escapeFileName : function(aString)
	{
		return aString.replace(/[#]+|(?:%[0-9A-Fa-f]{2})+/g, function(m){return encodeURIComponent(m);});
	},

	stringTemplate : function(aString, aTplArray, aTplRegExp)
	{
		var ret = aString.replace(aTplRegExp, function(match, label){
			if (aTplArray[label]) return aTplArray[label];
			return "";
		});
		return ret;
	},
		
	pad : function(n, width, z)
	{
		z = z || '0';
		n = n + '';
		return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
	},

	/**
	 * Window daemon
	 */
	openManageWindow : function(aRes, aModEltID)
	{
		var window = this.WINDOW.getMostRecentWindow("navigator:browser");
		window.openDialog("chrome://scrapbook/content/manage.xul", "ScrapBook:Manage", "chrome,centerscreen,all,resizable,dialog=no", aRes, aModEltID);
	},

	alert: function(aText) {
		this.PROMPT.alert(null, "[ScrapBook]", aText);
	},

	log : function(aMsg)
	{
		if (this._fxVer30) {
			// Support started since Firefox 4.0
			// However, older versions may not see the message.
			// The least version known work is Firefox 30.0
			var window = this.WINDOW.getMostRecentWindow("navigator:browser");
			window.console.log(aMsg);
		}
		else {
			// does not record the script line and is not suitable for tracing...
			this.CONSOLE.logStringMessage(aMsg);
		}
	},

	warn : function(aMsg)
	{
		if (this._fxVer30) {
			// Support started since Firefox 4.0
			// However, older versions may not see the message.
			// The least version known work is Firefox 30.0
			var window = this.WINDOW.getMostRecentWindow("navigator:browser");
			window.console.warn(aMsg);
		}
		else {
			// set javascript.options.showInConsole to true in the about:config to see it
			// default true since Firefox 4.0
			Components.utils.reportError(aMsg);
		}
	},

	error : function(aMsg)
	{
		if (this._fxVer30) {
			// Support started since Firefox 4.0
			// However, older versions may not see the message.
			// The least version known work is Firefox 30.0
			var window = this.WINDOW.getMostRecentWindow("navigator:browser");
			window.console.error(aMsg);
		}
		else {
			// set javascript.options.showInConsole to true in the about:config to see it
			// default true since Firefox 4.0
			Components.utils.reportError(aMsg);
		}
	},


	/**
	 * DOM elements handling
	 */

	getOuterHTML : function(aNode, aAddBr)
	{
		if (!aAddBr && this._fxVer11) return aNode.outerHTML;
		var br = aAddBr ? "\n" : "";
		var tag = "<" + aNode.nodeName.toLowerCase();
		for ( var i=0; i<aNode.attributes.length; i++ ) {
			tag += ' ' + aNode.attributes[i].name + '="' + this.escapeHTML(aNode.attributes[i].value) + '"';
		}
		tag += ">" + br;
		return tag + aNode.innerHTML + "</" + aNode.nodeName.toLowerCase() + ">" + br;
	},

	/**
	 * DOM elements considered as ScrapBook additional
	 *
	 * linemarker (span)
	 * inline (span)
	 * link-url (a)
	 * link-file (a)
	 * sticky (div)
	 * sticky-header
	 * sticky-footer
	 * sticky-save
	 * sticky-delete
	 * block-comment (?)
	 *
	 * title (*)
	 * title-src (*)
	 * stylesheet (link, style)
	 * todo (input, textarea)
	 */
	getSbObjectType : function(aNode)
	{
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
	 *   0: not removable
	 *   1: should remove
	 *   2: should unwrap
	 */
	getSbObjectRemoveType : function(aNode)
	{
		var type = this.getSbObjectType(aNode);
		if (!type || ["title", "title-src", "todo"].indexOf(type) != -1) return 0;
		if (["linemarker", "inline", "link-url", "link-inner", "link-file"].indexOf(type) != -1) return 2;
		return 1;
	},

	/**
	 * Data Store
	 */
	_getDocumentIndex : function(aDocument)
	{
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

	documentData : function(aDocument, aKey, aValue)
	{
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
	isDeadObject : function(aObject)
	{
		try {
			var x = aObject.body;
		}
		catch(ex) {
			return true;
		}
		return false;
	},

	/**
	 * Object handling
	 */
	extendObject : function(aObject1, aObject2)
	{
		for (var i in aObject2) {
			aObject1[i] = aObject2[i];
		}
		return aObject1;
	},

	getKeys : function(aObject)
	{
		var ret = [];
		for (var i in aObject) ret.push(i);
		return ret;
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
