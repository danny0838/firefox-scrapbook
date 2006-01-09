
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



	getScrapBookDir : function()
	{
		try {
			var isDefault = this.PREF.getBoolPref("scrapbook.data.default");
			var myDir = this.PREF.getComplexValue("scrapbook.data.path", Components.interfaces.nsIPrefLocalizedString).data;
			myDir = this.convertPathToFile(myDir);
		} catch(ex) {
			isDefault = true;
		}
		if ( isDefault )
		{
			myDir = this.DIR.get("ProfD", Components.interfaces.nsIFile);
			myDir.append("ScrapBook");
		}
		if ( !myDir.exists() )
		{
			myDir.create(myDir.DIRECTORY_TYPE, 0700);
		}
		return myDir;
	},


	getContentDir : function(aID)
	{
		var myDir = this.getScrapBookDir().clone();
		myDir.append("data");
		if ( !myDir.exists() ) myDir.create(myDir.DIRECTORY_TYPE, 0700);
		myDir.append(aID);
		if ( !myDir.exists() ) myDir.create(myDir.DIRECTORY_TYPE, 0700);
		return myDir;
	},


	removeDirSafety : function(aDir, check)
	{
		try {
			if ( check && !aDir.leafName.match(/^\d{14}$/) ) return;
			var fileEnum = aDir.directoryEntries;
			while ( fileEnum.hasMoreElements() )
			{
				var eFile = fileEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
				if ( eFile.isFile() ) eFile.remove(false);
			}
			if ( aDir.isDirectory() ) aDir.remove(false);
			return true;
		}
		catch(ex) {
			alert("ScrapBook ERROR: Failed to remove files.\n" + ex);
			return false;
		}
	},


	loadURL : function(aURL, tabbed)
	{
		var win = this.WINDOW.getMostRecentWindow("navigator:browser");
		var browser = win.document.getElementById("content");
		if ( tabbed ) {
			browser.selectedTab = browser.addTab(aURL);
		} else {
			browser.loadURI(aURL);
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


	getRootHref : function(aURLString)
	{
		var aURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
		aURL.spec = aURLString;
		return aURL.scheme + "://" + aURL.host + "/";
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
		return name;
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
		aFileName = aFileName.replace(/[\*\&]+/g, "+");
		aFileName = aFileName.replace(/[\\\/\|\:;]+/g, "-");
		aFileName = aFileName.replace(/[\<]+/g, "(");
		aFileName = aFileName.replace(/[\>]+/g, ")");
		aFileName = aFileName.replace(/[\s]+/g, "_");
		aFileName = aFileName.replace(/[%]+/g, "@");
		return aFileName;
	},


	resolveURL : function(aBaseURL, aRelURL)
	{
		try {
			var aBaseURLObj = this.convertURLToObject(aBaseURL);
			return aBaseURLObj.resolve(aRelURL);
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to resolve URL.\n" + aBaseURL + "\n" + aRelURL);
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
			dump("ScrapBook ERROR: Failed to read file.\n" + aFile.path + "\n");
			return false;
		}
	},


	writeFile : function(aFile, aContent, aChars)
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
		var uri = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
		uri.spec = aURISpec;
		var WBP = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);
		WBP.saveURI(uri, null, null, null, null, aFile);
	},


	convertStringToUTF8 : function(aString)
	{
		if ( !aString ) return "";
		try {
			this.UNICODE.charset = "UTF-8";
			aString = this.UNICODE.ConvertToUnicode(aString);
		} catch(ex) {
			dump("scrapbook::convertStringToUTF8 " + ex + "\n");
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
			dump("*** ScrapBook ERROR: Failed to getFileFromURLSpec: " + aURLString + "\n");
		}
	},



	launchDirectory : function(aDir)
	{
		if ( this.getBoolPref("scrapbook.filer.default", true) )
		{
			try {
				aDir = aDir.QueryInterface(Components.interfaces.nsILocalFile);
				aDir.launch();
			} catch(ex) {
				var aDirPath = this.IO.newFileURI(aDir).spec;
				this.loadURL(aDirPath, false);
			}
		}
		else
		{
			try {
				var filerPath = this.PREF.getComplexValue("scrapbook.filer.path", Components.interfaces.nsIPrefLocalizedString).data;
				this.execProgram(filerPath, [aDir.path]);
			} catch(ex) {
				alert(ex);
			}
		}
	},


	execProgram : function(aExecFilePath, args)
	{
		var execfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		var process  = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
		try {
			execfile.initWithPath(aExecFilePath);
			if ( !execfile.exists() )
			{
				alert("ScrapBook ERROR: File does not exist.\n" + aExecFilePath);
				return;
			}
			process.init(execfile);
			process.run(false, args, args.length);
		}
		catch (ex)
		{
			alert("ScrapBook ERROR: File is not executable.\n" + aExecFilePath);
		}
	},


	getFocusedWindow : function()
	{
		var myWindow = document.commandDispatcher.focusedWindow;
		if ( !myWindow || myWindow == window ) myWindow = window._content;
		return myWindow;
	},


	getURL : function(aID, aType)
	{
		if ( aType == "note") {
			return "chrome://scrapbook/content/note.xul?id=" + aID;
		} else {
			return this.IO.newFileURI(this.getContentDir(aID)).spec + "index.html";
		}
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
		} catch(ex) {
			return aDefVal;
		}
	},


	escapeComment : function(aStr)
	{
		if ( aStr.length > 10000 ) alert("ScrapBook ALERT: Too long comment makes ScrapBook slow.");
		return aStr.replace(/\r|\n/g, " __BR__ ");
	},


};



function dumpObj(aObj)
{
	dump("\n\n----------------[DUMP_OBJECT]----------------\n\n");
	for ( var i in aObj )
	{
		try {
			dump(i + " -> " + aObj[i] + "\n");
		} catch(ex) {
			dump("XXXXXXXXXX ERROR XXXXXXXXXX\n" + ex + "\n");
		}
	}
	dump("\n\n");
}


