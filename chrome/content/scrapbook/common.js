
const NS_SCRAPBOOK = "http://amb.vis.ne.jp/mozilla/scrapbook-rdf#";

function ScrapBookItem(aID)
{
	this.id      = aID;
	this.type    = "";
	this.title   = "";
	this.chars   = "";
	this.icon    = "";
	this.source  = "";
	this.comment = "";
}


var sbCommonUtils = {


	get RDF()     { return Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(Components.interfaces.nsIRDFService); },
	get RDFC()    { return Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer); },
	get RDFCU()   { return Components.classes['@mozilla.org/rdf/container-utils;1'].getService(Components.interfaces.nsIRDFContainerUtils); },
	get DIR()     { return Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties); },
	get IO()      { return Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService); },
	get UNICODE() { return Components.classes['@mozilla.org/intl/scriptableunicodeconverter'].getService(Components.interfaces.nsIScriptableUnicodeConverter); },
	get WINDOW()  { return Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator); },
	get PROMPT()  { return Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService); },

	_fxVer18 : null,


	newItem : function(aID)
	{
		return { id : aID || "", type : "", title : "", chars : "", icon : "", source : "", comment : "" };
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
			dir.create(dir.DIRECTORY_TYPE, parseInt("0700", 8));
		}
		return dir;
	},

	getContentDir : function(aID, aSuppressCreate)
	{
		if ( !aID || aID.length != 14 )
		{
			alert("ScrapBook FATAL ERROR: Failed to get directory '" + aID + "'.");
			return null;
		}
		var dir = this.getScrapBookDir().clone();
		dir.append("data");
		if ( !dir.exists() ) dir.create(dir.DIRECTORY_TYPE, parseInt("0700", 8));
		dir.append(aID);
		if ( !dir.exists() )
		{
			if ( aSuppressCreate )
			{
				return null;
			}
			dir.create(dir.DIRECTORY_TYPE, parseInt("0700", 8));
		}
		return dir;
	},

	removeDirSafety : function(aDir, check)
	{
		var file;
		try {
			if ( check && !aDir.leafName.match(/^\d{14}$/) ) return;
			var fileEnum = aDir.directoryEntries;
			while ( fileEnum.hasMoreElements() )
			{
				file = fileEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
				file.remove(true);
			}
			if ( aDir.isDirectory() ) aDir.remove(false);
			return true;
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to remove file '" + file.leafName + "'.\n" + ex);
			return false;
		}
	},

	loadURL : function(aURL, tabbed)
	{
		var win = this.WINDOW.getMostRecentWindow("navigator:browser");
		if ( !win ) return;
		var browser = win.document.getElementById("content");
		if ( tabbed ) {
			browser.selectedTab = browser.addTab(aURL);
		} else {
			browser.loadURI(aURL);
		}
	},

	rebuildGlobal : function()
	{
//Hier werden Änderungen fällig
		//Dieser Block ist notwendig, da MultiSidebar verwendet Fehler verursachen würde
		var rgSidebarId = "sidebar";
		var rgSidebarTitleId = "sidebar-title";
		var rgSidebarSplitterId = "sidebar-splitter";
		var rgSidebarBoxId = "sidebar-box";
		var rgPosition = sbCommonUtils.getPref("extensions.multisidebar.viewScrapBookSidebar", 1, true);

		if ( rgPosition > 1)
		{
			rgSidebarId = "sidebar-" + rgPosition;
			rgSidebarTitleId = "sidebar-" + rgPosition + "-title";
			rgSidebarSplitterId = "sidebar-" + rgPosition + "-splitter";
			rgSidebarBoxId = "sidebar-" + rgPosition + "-box";
		}
		//Ende Block
		var winEnum = this.WINDOW.getEnumerator("navigator:browser");
		while ( winEnum.hasMoreElements() )
		{
			var win = winEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			try {
				win.sbMenuHandler.shouldRebuild = true;
				win.document.getElementById(rgSidebarId).contentWindow.sbTreeHandler.TREE.builder.rebuild();
				win.document.getElementById(rgSidebarId).contentWindow.sbListHandler.LIST.builder.rebuild();
			} catch(ex) {
			}
		}
	},

	getTimeStamp : function(advance)
	{
		var dd = new Date;
		if ( advance ) dd.setTime(dd.getTime() + 1000 * advance);
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
		return decodeURI(name);
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

	validateFileName : function(aFileName)
	{
		aFileName = aFileName.replace(/[\"\?!~`]+/g, "");
		aFileName = aFileName.replace(/[\*\&]/g, "+");
		aFileName = aFileName.replace(/[\\\/\|\:;]/g, "-");
		aFileName = aFileName.replace(/[\<]/g, "(");
		aFileName = aFileName.replace(/[\>]/g, ")");
		aFileName = aFileName.replace(/[\s]/g, "_");
		aFileName = aFileName.replace(/[%]/g, "@");
		return aFileName;
	},

	resolveURL : function(aBaseURL, aRelURL)
	{
		try {
			var baseURLObj = this.convertURLToObject(aBaseURL);
			//" entfernen aus aRelURL
			aRelURL = aRelURL.replace(/\"/g, "");
			return baseURLObj.resolve(aRelURL);
		} catch(ex) {
			console.error("*** ScrapBook ERROR: Failed to resolve URL: " + aBaseURL + "\t" + aRelURL + "\n");
		}
	},

	crop : function(aString, aMaxLength)
	{
		return aString.length > aMaxLength ? aString.substr(0, aMaxLength) + "..." : aString;
	},


	forFile : function(aFolder, aCallback, aArgs)
	{
		var files = aFolder.directoryEntries;
		while (files.hasMoreElements()) {
			var file = files.getNext().QueryInterface(Components.interfaces.nsIFile);
			if (!file.isDirectory()) {
				aCallback.apply(file, aArgs);
			}
		}
	},

	forEachFile : function(aFolder, aCallback, aArgs)
	{
		var files = aFolder.directoryEntries;
		while (files.hasMoreElements()) {
			var file = files.getNext().QueryInterface(Components.interfaces.nsIFile);
			if (file.isDirectory()) {
				this.forEachFile(file, aCallback, aArgs);
			}
			else {
				aCallback.apply(file, aArgs);
			}
		}
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

	writeFile : function(aFile, aContent, aChars)
	{
		if ( aFile.exists() ) aFile.remove(false);
		try {
			aFile.create(aFile.NORMAL_FILE_TYPE, parseInt("0666", 8));
			this.UNICODE.charset = aChars;
			aContent = this.UNICODE.ConvertFromUnicode(aContent);
			var ostream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
			ostream.init(aFile, 2, 0x200, false);
			ostream.write(aContent, aContent.length);
			ostream.close();
		}
		catch(ex)
		{
			alert("ScrapBook ERROR: Failed to write file: " + aFile.leafName);
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
		if ( this._fxVer18 == null )
		{
			var iAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
			var iVerComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
			this._fxVer18 = iVerComparator.compare(iAppInfo.version, "18.0")>=0;
		}
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

	execProgram : function(aExecFilePath, args)
	{
		var execfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		var process  = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
		try {
			execfile.initWithPath(aExecFilePath);
			if ( !execfile.exists() ) {
				alert("ScrapBook ERROR: File does not exist.\n" + aExecFilePath);
				return;
			}
			process.init(execfile);
			process.run(false, args, args.length);
		} catch (ex) {
			alert("ScrapBook ERROR: File is not executable.\n" + aExecFilePath);
		}
	},

	getFocusedWindow : function()
	{
		var win = document.commandDispatcher.focusedWindow;
		if ( !win || win == window || win instanceof Components.interfaces.nsIDOMChromeWindow ) win = window.content;
		return win;
	},

	getDefaultIcon : function(type)
	{
		switch ( type )
		{
			case "folder" : return "chrome://scrapbook/skin/treefolder.png"; break;
			case "note"   : return "chrome://scrapbook/skin/treenote.png";   break;
			default       : return "chrome://scrapbook/skin/treeitem.png";   break;
		}
	},

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
			console.error("ERROR: unable to set a pref: " + aName);
		}
	},

	escapeComment : function(aStr)
	{
		if ( aStr.length > 10000 ) alert("NOTICE: Too long comment makes ScrapBook slow.");
		return aStr.replace(/\r|\n|\t/g, " __BR__ ");
	},

	openManageWindow : function(aRes, aModEltID)
	{
		window.openDialog("chrome://scrapbook/content/manage.xul", "ScrapBook:Manage", "chrome,centerscreen,all,resizable,dialog=no", aRes, aModEltID);
	},

	log : function(aMsg, aOpen)
	{
		const CONSOLE = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
		CONSOLE.logStringMessage(aMsg);
	},


	/**
	 * DOM elements handling
	 */

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
	 * stylesheet
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

};
