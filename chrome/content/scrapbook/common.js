
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
	get PREF()    { return Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch); },

	_fxVer18 : null,


	newItem : function(aID)
	{
		return { id : aID || "", type : "", title : "", chars : "", icon : "", source : "", comment : "" };
	},

	getScrapBookDir : function()
	{
		var dir;
		try {
			var isDefault = this.PREF.getBoolPref("scrapbook.data.default");
			dir = this.PREF.getComplexValue("scrapbook.data.path", Components.interfaces.nsIPrefLocalizedString).data;
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
		var rgPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		var rgPosition;

		if ( rgPrefs.prefHasUserValue("extensions.multisidebar.viewScrapBookSidebar") )
		{
			rgPosition = rgPrefs.getIntPref("extensions.multisidebar.viewScrapBookSidebar");
		} else
		{
			rgPosition = 1;
		}
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
			dump("*** ScrapBook ERROR: Failed to resolve URL: " + aBaseURL + "\t" + aRelURL + "\n");
		}
	},

	crop : function(aString, aMaxLength)
	{
		return aString.length > aMaxLength ? aString.substr(0, aMaxLength) + "..." : aString;
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

	getBoolPref : function(aName, aDefVal)
	{
		try {
			return this.PREF.getBoolPref(aName);
		}
		catch(ex) {
			return aDefVal;
		}
	},

	setBoolPref: function(aPrefName, aPrefValue)
	{
		try {
			this.PREF.setBoolPref(aPrefName, aPrefValue);
			var sbpPrefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
			sbpPrefService.savePrefFile(null);
		}
		catch (ex) {}
	},

	setUnicharPref: function (aPrefName, aPrefValue)
	{
		try {
			var str = Components.classes["@mozilla.org/supports-string;1"]
			          .createInstance(Components.interfaces.nsISupportsString);
			str.data = aPrefValue;
			this.PREF.setComplexValue(aPrefName, Components.interfaces.nsISupportsString, str);
			var supPrefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
			supPrefService.savePrefFile(null);
		}
		catch (ex) {}
	},

	copyUnicharPref: function (aPrefName, aDefVal)
	{
		try {
			return this.PREF.getComplexValue(aPrefName, Components.interfaces.nsISupportsString).data;
		}
		catch (ex) {
			return aDefVal != undefined ? aDefVal : null;
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


};
