
var gURLs       = [];
var gDepths     = [];
var gRefURL     = "";
var gShowDetail = false;
var gResName    = "";
var gResIdx     = 0;
var gReferItem  = null;
var gOption     = {};
var gFile2URL   = {};
var gURL2Name   = {};
var gPreset     = [];
var gContext    = "";




function SB_trace(aMessage)
{
	document.getElementById("sbCaptureTextbox").value = aMessage;
}


function SB_initCapture()
{
	var myURLs  = window.arguments[0];
	gRefURL     = window.arguments[1];
	gShowDetail = window.arguments[2];
	gResName    = window.arguments[3];
	gResIdx     = window.arguments[4];
	gReferItem  = window.arguments[5];
	gOption     = window.arguments[6];
	gFile2URL   = window.arguments[7];
	gPreset     = window.arguments[8];
	if ( gReferItem )
	{
		gContext = "indepth";
		gURL2Name[unescape(gReferItem.source)] = "index";
	}
	else if ( gPreset )
	{
		gContext = gPreset[1] == "index" ? "capture-again" : "capture-again-deep";
		if ( gContext == "capture-again-deep" )
		{
			var contDir = ScrapBookUtils.getContentDir(gPreset[0]);
			var file = contDir.clone();
			file.append("sb-file2url.txt");
			if ( !file.exists() ) { ScrapBookUtils.alert("ERROR: Could not find 'sb-file2url.txt'."); window.close(); }
			var lines = ScrapBookUtils.readFile(file).split("\n");
			for ( var i = 0; i < lines.length; i++ )
			{
				var arr = lines[i].split("\t");
				if ( arr.length == 2 ) gFile2URL[arr[0]] = arr[1];
			}
			file = ScrapBookUtils.getContentDir(gPreset[0]).clone();
			file.append("sb-url2name.txt");
			if ( !file.exists() ) { ScrapBookUtils.alert("ERROR: Could not find 'sb-url2name.txt'."); window.close(); }
			lines = ScrapBookUtils.readFile(file).split("\n");
			for ( i = 0; i < lines.length; i++ )
			{
				var arr = lines[i].split("\t");
				if ( arr.length == 2 )
				{
					gURL2Name[arr[0]] = arr[1];
					if ( arr[1] == gPreset[1] ) myURLs = [arr[0]];
				}
			}
			gPreset[3] = gFile2URL;
			if ( !myURLs[0] ) { ScrapBookUtils.alert("ERROR: Could not find the source URL for " + gPreset[1] + ".html."); window.close(); }
		}
	}
	else gContext = "link";
	if ( !gOption ) gOption = {};
	if ( !("script" in gOption ) ) gOption["script"] = false;
	if ( !("images" in gOption ) ) gOption["images"] = true;
	sbInvisibleBrowser.init();
	sbCaptureTask.init(myURLs);
	gURLs.length == 1 ? sbCaptureTask.start() : sbCaptureTask.countDown();
}


function SB_splitByAnchor(aURL)
{
	var pos = 0;
	return ( (pos = aURL.indexOf("#")) < 0 ) ? [aURL, ""] : [aURL.substring(0, pos), aURL.substring(pos, aURL.length)];
}


function SB_suggestName(aURL)
{
	var baseName = ScrapBookUtils.validateFileName(ScrapBookUtils.splitFileName(ScrapBookUtils.getFileName(aURL))[0]);
	baseName = baseName.toLowerCase();
	if ( baseName == "index" ) baseName = "default";
	if ( !baseName ) baseName = "default";
	var name = baseName + ".html";
	var seq = 0;
	while ( gFile2URL[name] ) name = baseName + "_" + sbContentSaver.leftZeroPad3(++seq) + ".html";
	name = ScrapBookUtils.splitFileName(name)[0];
	gFile2URL[name + ".html"] = aURL;
	gFile2URL[name + ".css"]  = true;
	return name;
}


function SB_fireNotification(aItem)
{
	ScrapBookUtils.getBrowserWindow().sbCaptureObserverCallback.onCaptureComplete(aItem);
}




var sbCaptureTask = {

	get INTERVAL() { return 1; },
	get LISTBOX()  { return document.getElementById("sbCaptureListbox"); },
	get STRING()   { return document.getElementById("sbCaptureString"); },
	get URL()      { return gURLs[this.index]; },

	index       : 0,
	contentType : "",
	isDocument  : false,
	canRefresh  : true,
	sniffer     : null,
	seconds     : 5,
	timerID     : 0,
	forceExit   : 0,

	init : function(myURLs)
	{
		if ( gContext != "indepth" && myURLs.length == 1 )
		{
			this.LISTBOX.collapsed = true;
			this.LISTBOX.setAttribute("class", "plain");
			document.getElementById("sbCaptureSkipButton").hidden = true;
		}
		else
		{
			this.LISTBOX.setAttribute("rows", 10);
		}
		if ( gContext == "indepth" )
		{
			var button = document.getElementById("sbCaptureFilterButton");
			button.hidden = false;
			button.nextSibling.hidden = false;
			button.firstChild.firstChild.label += " (" + ScrapBookUtils.getRootHref(gReferItem.source) + ")" ;
			button.firstChild.firstChild.nextSibling.label += " (" + ScrapBookUtils.getBaseHref(gReferItem.source) + ")";
		}
		for ( var i = 0; i < myURLs.length; i++ ) this.add(myURLs[i], 1);
	},

	add : function(aURL, aDepth)
	{
		if ( gURLs.length > 10000 ) return;
		if ( !aURL.match(/^(http|https|ftp|file):\/\//i) ) return;
		if ( gContext == "indepth" )
		{
			if ( aDepth > gOption["inDepth"] ) {
				return;
			}
			aURL = SB_splitByAnchor(aURL)[0];
			if ( !gOption["isPartial"] && aURL == gReferItem.source ) return;
			if ( gURLs.indexOf(aURL) != -1 ) return;
		}
		gURLs.push(aURL);
		gDepths.push(aDepth);
		var listitem = document.createElement("listitem");
		listitem.setAttribute("label", aDepth + " [" + (gURLs.length - 1) + "] " + aURL);
		listitem.setAttribute("type", "checkbox");
		listitem.setAttribute("checked", this.filter(gURLs.length - 1));
		this.LISTBOX.appendChild(listitem);
	},

	start : function(aOverriddenURL)
	{
		this.seconds = -1;
		this.toggleStartPause(true);
		this.toggleSkipButton(true);
		this.LISTBOX.getItemAtIndex(this.index).setAttribute("indicated", true);
		if ( this.index > 0 ) this.LISTBOX.getItemAtIndex(this.index - 1).removeAttribute("indicated");
		this.LISTBOX.ensureIndexIsVisible(this.index);
		var listitem = this.LISTBOX.getItemAtIndex(this.index);
		listitem.setAttribute("disabled", true);
		if ( !listitem.checked )
		{
			this.next(true);
			return;
		}
		this.contentType = "";
		this.isDocument = true;
		this.canRefresh = true;
		var url = aOverriddenURL || gURLs[this.index];
		SB_trace(this.STRING.getString("CONNECT") + "... " + url);
		if ( url.indexOf("file://") == 0 ) {
			sbInvisibleBrowser.load(url);
		} else {
			this.sniffer = new sbHeaderSniffer(url, gRefURL);
			this.sniffer.httpHead();
		}
	},

	succeed : function()
	{
		this.LISTBOX.getItemAtIndex(this.index).setAttribute("status", "succeed");
		this.next(false);
	},

	fail : function(aErrorMsg)
	{
		if ( aErrorMsg ) SB_trace(aErrorMsg);
		var listitem = this.LISTBOX.getItemAtIndex(this.index);
		listitem.setAttribute("label", gDepths[this.index] + " [" + this.index + "] " + aErrorMsg);
		listitem.setAttribute("status", "failure");
		if ( gURLs.length > 1 ) {
			this.next(true);
		} else {
			this.toggleStartPause(false);
		}
	},

	next : function(quickly)
	{
		this.toggleStartPause(true);
		this.toggleSkipButton(false);
		this.LISTBOX.getItemAtIndex(this.index).setAttribute("disabled", true);
		this.LISTBOX.getItemAtIndex(this.index).removeAttribute("indicated");
		if ( this.sniffer ) this.sniffer.onHttpSuccess = function(){};
		sbInvisibleBrowser.ELEMENT.stop();
		if ( ++this.index >= gURLs.length ) {
			this.finalize();
		} else {
			if ( quickly || gURLs[this.index].indexOf("file://") == 0 ) {
				window.setTimeout(function(){ sbCaptureTask.start(); }, 0);
			} else {
				this.seconds = this.INTERVAL;
				sbCaptureTask.countDown();
			}
		}
	},

	countDown : function()
	{
		SB_trace(this.STRING.getFormattedString("WAITING", [sbCaptureTask.seconds]) + "...");
		if ( --this.seconds > 0 )
			this.timerID = window.setTimeout(function(){ sbCaptureTask.countDown(); }, 1000);
		else
			this.timerID = window.setTimeout(function(){ sbCaptureTask.start(); }, 1000);
	},

	finalize : function()
	{
		if ( gContext == "indepth" )
		{
			sbCrossLinker.invoke();
		}
		else
		{
			if ( gURLs.length > 1 ) SB_fireNotification(null);
			window.setTimeout(function(){ window.close(); }, 1000);
		}
	},

	activate : function()
	{
		this.toggleStartPause(true);
		if ( this.seconds < 0 )
			sbCaptureTask.start();
		else
			this.countDown();
	},

	pause : function()
	{
		this.toggleStartPause(false);
		if ( this.seconds < 0 ) {
			sbInvisibleBrowser.ELEMENT.stop();
		} else {
			this.seconds++;
			window.clearTimeout(this.timerID);
		}
	},

	abort : function()
	{
		if ( gContext != "indepth" ) window.close();
		if ( ++this.forceExit > 2 ) window.close();
		if ( this.index < gURLs.length - 1 ) { this.index = gURLs.length - 1; this.next(); }
	},

	toggleStartPause : function(allowPause)
	{
		document.getElementById("sbCapturePauseButton").disabled = false;
		document.getElementById("sbCapturePauseButton").hidden = !allowPause;
		document.getElementById("sbCaptureStartButton").hidden =  allowPause;
		document.getElementById("sbCaptureTextbox").disabled   = !allowPause;
	},

	toggleSkipButton : function(willEnable)
	{
		document.getElementById("sbCaptureSkipButton").disabled = !willEnable;
	},

	filter : function(i)
	{
		return true;
	},

	applyFilter : function(type)
	{
		switch ( type )
		{
			case "D" : var ref = ScrapBookUtils.getRootHref(gReferItem.source).toLowerCase(); this.filter = function(i){ return gURLs[i].toLowerCase().indexOf(ref) == 0; }; break;
			case "L" : var ref = ScrapBookUtils.getBaseHref(gReferItem.source).toLowerCase(); this.filter = function(i){ return gURLs[i].toLowerCase().indexOf(ref) == 0; }; break;
			case "S" : 
				var ret = { value : "" };
				if ( !ScrapBookUtils.PROMPT.prompt(window, "[ScrapBook]", this.STRING.getString("FILTER_BY_STRING"), ret, null, {}) ) return;
				if ( ret.value ) this.filter = function(i){ return gURLs[i].toLowerCase().indexOf(ret.value.toLowerCase()) != -1; };
				break;
			case "N" : this.filter = function(i){ return true;  }; break;
			case "F" : this.filter = function(i){ return false; }; break;
			case "I" : this.filter = function(i){ return !sbCaptureTask.LISTBOX.getItemAtIndex(i).checked; }; break;
			default  : return;
		}
		for ( var i = this.index; i < gURLs.length; i++ )
		{
			this.LISTBOX.getItemAtIndex(i).checked = this.filter(i);
		}
	},

};




var sbInvisibleBrowser = {

	get ELEMENT() { return document.getElementById("sbCaptureBrowser"); },

	fileCount : 0,
	onload    : null,

	init : function()
	{
		this.ELEMENT.webProgress.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_ALL);
		this.loading = false;
		this.onload = function(){
			// onload may be fired many times when a document is loaded
			// (loading of a frame may fire)
			// we need this check to allow only the desired url and only fire once...
			if (sbInvisibleBrowser.ELEMENT.currentURI.spec !== sbInvisibleBrowser.loading) return;
			sbInvisibleBrowser.loading = false;
			sbInvisibleBrowser.execCapture();
		};
		this.ELEMENT.addEventListener("load", sbInvisibleBrowser.onload, true);
	},

	refreshEvent : function(aEvent)
	{
		this.ELEMENT.removeEventListener("load", this.onload, true);
		this.onload = aEvent;
		this.ELEMENT.addEventListener("load", this.onload, true);
	},

	load : function(aURL)
	{
		this.fileCount = 0;
		this.ELEMENT.docShell.allowJavascript = gOption["script"];
		this.ELEMENT.docShell.allowImages     = gOption["images"];
		this.ELEMENT.docShell.allowMetaRedirects = false;
		if (Ci.nsIDocShellHistory)
			this.ELEMENT.docShell.QueryInterface(Ci.nsIDocShellHistory).useGlobalHistory = false;
		else
			this.ELEMENT.docShell.useGlobalHistory = false;
		this.loading = aURL;
		this.ELEMENT.loadURI(aURL, null, null);
	},

	execCapture : function()
	{
		SB_trace(sbCaptureTask.STRING.getString("SAVE_START"));
		document.getElementById("sbCapturePauseButton").disabled = true;
		sbCaptureTask.toggleSkipButton(false);
		var ret = null;
		var preset = gReferItem ? [gReferItem.id, SB_suggestName(sbCaptureTask.URL), gOption, gFile2URL, gDepths[sbCaptureTask.index]] : null;
		if ( gPreset ) preset = gPreset;
		if ( this.ELEMENT.contentDocument.body && sbCaptureTask.isDocument )
		{
			var metaElems = this.ELEMENT.contentDocument.getElementsByTagName("meta");
			for ( var i = 0; i < metaElems.length; i++ )
			{
				if ( metaElems[i].hasAttribute("http-equiv") && metaElems[i].hasAttribute("content") &&
				     metaElems[i].getAttribute("http-equiv").toLowerCase() == "refresh" && 
				     metaElems[i].getAttribute("content").match(/URL\=(.*)$/i) )
				{
					var newURL = ScrapBookUtils.resolveURL(sbCaptureTask.URL, RegExp.$1);
					if ( newURL != sbCaptureTask.URL && sbCaptureTask.canRefresh )
					{
						gURLs[sbCaptureTask.index] = newURL;
						sbCaptureTask.canRefresh = false;
						this.ELEMENT.loadURI(newURL, null, null);
						return;
					}
				}
			}
			ret = sbContentSaver.captureWindow(this.ELEMENT.contentWindow, false, gShowDetail, gResName, gResIdx, preset, gContext);
		}
		else
		{
			var type = sbCaptureTask.contentType.match(/image/i) ? "image" : "file";
			ret = sbContentSaver.captureFile(sbCaptureTask.URL, gRefURL ? gRefURL : sbCaptureTask.URL, type, gShowDetail, gResName, gResIdx, preset, gContext);
		}
		if ( ret )
		{
			if ( gContext == "indepth" )
			{
				gURL2Name[unescape(sbCaptureTask.URL)] = ret[0];
				gFile2URL = ret[1];
			}
			else if ( gContext == "capture-again-deep" )
			{
				gFile2URL = ret[1];
				var contDir = ScrapBookUtils.getContentDir(gPreset[0]);
				var txtFile = contDir.clone();
				txtFile.append("sb-file2url.txt");
				var txt = "";
				for ( var f in gFile2URL ) txt += f + "\t" + gFile2URL[f] + "\n";
				ScrapBookUtils.writeFile(txtFile, txt, "UTF-8");
			}
		}
		else
		{
			if ( gShowDetail ) window.close();
			SB_trace(sbCaptureTask.STRING.getString("SAVE_ABORT"));
			sbCaptureTask.fail("");
		}
	},

	QueryInterface : function(aIID)
	{
		if (aIID.equals(Ci.nsIWebProgressListener) ||
			aIID.equals(Ci.nsISupportsWeakReference) ||
			aIID.equals(Ci.nsIXULBrowserWindow) ||
			aIID.equals(Ci.nsISupports))
			return this;
		throw Components.results.NS_NOINTERFACE;
	},

	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
		if ( aStateFlags & Ci.nsIWebProgressListener.STATE_START )
		{
			SB_trace(sbCaptureTask.STRING.getString("LOADING") + "... " + (++this.fileCount) + " " + (sbCaptureTask.URL ? sbCaptureTask.URL : this.ELEMENT.contentDocument.title));
		}
	},

	onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
	{
		if ( aCurTotalProgress != aMaxTotalProgress )
		{
			SB_trace(sbCaptureObserverCallback.getString("TRANSFER_DATA") + "... (" + aCurTotalProgress + " Bytes)");
		}
	},

	onStatusChange   : function() {},
	onLocationChange : function() {},
	onSecurityChange : function() {},

};




var sbCrossLinker = {

	get ELEMENT(){ return document.getElementById("sbCaptureBrowser"); },

	index    : -1,
	baseURL  : "",
	nameList : [],

	XML      : null,
	rootNode : null,
	nodeHash : {},

	invoke : function()
	{
		ScrapBookData.setProperty(ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + gReferItem.id), "type", "site");
		sbInvisibleBrowser.refreshEvent(function(){ sbCrossLinker.exec(); });
		this.ELEMENT.docShell.allowImages = false;
		sbInvisibleBrowser.onStateChange = function(aWebProgress, aRequest, aStateFlags, aStatus)
		{
			if ( aStateFlags & Ci.nsIWebProgressListener.STATE_START )
			{
				SB_trace(sbCaptureTask.STRING.getFormattedString("REBUILD_LINKS", [sbCrossLinker.index + 1, sbCrossLinker.nameList.length]) + "... "
					+ ++sbInvisibleBrowser.fileCount + " : " + sbCrossLinker.nameList[sbCrossLinker.index] + ".html");
			}
		};
		this.baseURL = ScrapBookUtils.IO.newFileURI(ScrapBookUtils.getContentDir(gReferItem.id)).spec;
		this.nameList.push("index");
		for ( var url in gURL2Name )
		{
			this.nameList.push(gURL2Name[url]);
		}
		this.XML = document.implementation.createDocument("", "", null);
		this.rootNode = this.XML.createElement("site");
		this.start();
	},

	start : function()
	{
		if ( ++this.index < this.nameList.length )
		{
			sbInvisibleBrowser.fileCount = 0;
			this.ELEMENT.loadURI(this.baseURL + this.nameList[this.index] + ".html", null, null);
		}
		else
		{
			SB_trace(sbCaptureTask.STRING.getString("REBUILD_LINKS_COMPLETE"));
			this.flushXML();
			SB_fireNotification(gReferItem);
			window.setTimeout(function(){ window.close(); }, 1000);
		}
	},

	exec : function()
	{
		if ( this.ELEMENT.currentURI.scheme != "file" )
		{
			return;
		}
		sbContentSaver.frameList = sbContentSaver.flattenFrames(this.ELEMENT.contentWindow);
		if ( !this.nodeHash[this.nameList[this.index]] )
		{
			this.nodeHash[this.nameList[this.index]] = this.createNode(this.nameList[this.index], gReferItem.title);
			this.nodeHash[this.nameList[this.index]].setAttribute("title", ScrapBookData.sanitize(this.ELEMENT.contentTitle));
		}
		else
		{
			this.nodeHash[this.nameList[this.index]].setAttribute("title", ScrapBookData.sanitize(this.ELEMENT.contentTitle));
		}
		for ( var f = 0; f < sbContentSaver.frameList.length; f++ )
		{
			var doc = sbContentSaver.frameList[f].document;
			if ( !doc.links ) continue;
			var shouldSave = false;
			var linkList = doc.links;
			for ( var i = 0; i < linkList.length; i++ )
			{
				var urlLR = SB_splitByAnchor(unescape(linkList[i].href));
				if ( gURL2Name[urlLR[0]] )
				{
					var name = gURL2Name[urlLR[0]];
					linkList[i].href = name + ".html" + urlLR[1];
					linkList[i].setAttribute("indepth", "true");
					if ( !this.nodeHash[name] )
					{
						var text = linkList[i].text ? linkList[i].text.replace(/\r|\n|\t/g, " ") : "";
						if ( text.replace(/\s/g, "") == "" ) text = "";
						this.nodeHash[name] = this.createNode(name, text);
						if ( !this.nodeHash[name] ) this.nodeHash[name] = name;
						this.nodeHash[this.nameList[this.index]].appendChild(this.nodeHash[name]);
					}
					shouldSave = true;
				}
			}
			if ( shouldSave )
			{
				var rootNode = doc.getElementsByTagName("html")[0];
				var src = "";
				src = sbContentSaver.surroundByTags(rootNode, rootNode.innerHTML);
				src = sbContentSaver.doctypeToString(doc.doctype) + src;
				var file = ScrapBookUtils.getContentDir(gReferItem.id);
				file.append(ScrapBookUtils.getFileName(doc.location.href));
				ScrapBookUtils.writeFile(file, src, doc.characterSet);
			}
		}
		this.forceReloading(gReferItem.id, this.nameList[this.index]);
		this.start();
	},

	createNode : function(aName, aText)
	{
		aText = ScrapBookUtils.crop(aText, 100);
		var node = this.XML.createElement("page");
		node.setAttribute("file", aName + ".html");
		node.setAttribute("text", ScrapBookData.sanitize(aText));
		return node;
	},

	flushXML : function()
	{
		this.rootNode.appendChild(this.nodeHash["index"]);
		this.XML.appendChild(this.rootNode);
		var src = "";
		src += '<?xml version="1.0" encoding="UTF-8"?>\n';
		src += '<?xml-stylesheet href="../../sitemap.xsl" type="text/xsl" media="all"?>\n';
		src += (new XMLSerializer()).serializeToString(this.XML).replace(/></g, ">\n<");
		src += '\n';
		var xslFile = ScrapBookUtils.getScrapBookDir().clone();
		xslFile.append("sitemap.xsl");
		if ( !xslFile.exists() ) ScrapBookUtils.saveTemplateFile("chrome://scrapbook/skin/sitemap.xsl", xslFile);
		var contDir = ScrapBookUtils.getContentDir(gReferItem.id);
		var xmlFile = contDir.clone();
		xmlFile.append("sitemap.xml");
		ScrapBookUtils.writeFile(xmlFile, src, "UTF-8");
		var txt = "";
		var txtFile1 = contDir.clone();
		txtFile1.append("sb-file2url.txt");
		for ( var f in gFile2URL ) txt += f + "\t" + gFile2URL[f] + "\n";
		ScrapBookUtils.writeFile(txtFile1, txt, "UTF-8");
		txt = "";
		var txtFile2 = contDir.clone();
		txtFile2.append("sb-url2name.txt");
		for ( var u in gURL2Name ) txt += u + "\t" + gURL2Name[u] + "\n";
		ScrapBookUtils.writeFile(txtFile2, txt, "UTF-8");
	},

	forceReloading : function(aID, aName)
	{
		try {
			var win = ScrapBookUtils.getBrowserWindow();
			var nodes = win.gBrowser.mTabContainer.childNodes;
			for ( var i = 0; i < nodes.length; i++ )
			{
				var uri = win.gBrowser.getBrowserForTab(nodes[i]).currentURI.spec;
				if ( uri.indexOf("/data/" + aID + "/" + aName + ".html") > 0 )
				{
					win.gBrowser.getBrowserForTab(nodes[i]).reload();
				}
			}
		} catch(ex) {
		}
	},

};




function sbHeaderSniffer(aURLSpec, aRefURLSpec)
{
	this.URLSpec    = aURLSpec;
	this.refURLSpec = aRefURLSpec;
}


sbHeaderSniffer.prototype = {

	_URL     : Cc['@mozilla.org/network/standard-url;1'].createInstance(Ci.nsIURL),
	_channel : null,
	_headers : null,

	httpHead : function()
	{
		this._channel = null;
		this._headers = {};
		try {
			this._URL.spec = this.URLSpec;
			this._channel = ScrapBookUtils.IO.newChannelFromURI(this._URL).QueryInterface(Ci.nsIHttpChannel);
			this._channel.loadFlags = this._channel.LOAD_BYPASS_CACHE;
			this._channel.setRequestHeader("User-Agent", navigator.userAgent, false);
			if (this.refURLSpec && this.refURLSpec.indexOf("http") == 0)
				this._channel.setRequestHeader("Referer", this.refURLSpec, false);
		} catch(ex) {
			this.onHttpError("Invalid URL");
		}
		try {
			this._channel.requestMethod = "HEAD";
			this._channel.asyncOpen(this, this);
		} catch(ex) {
			this.onHttpError(ex);
		}
	},

	getHeader : function(aHeader)
	{
	 	try { return this._channel.getResponseHeader(aHeader); } catch(ex) { return ""; }
	},

	getStatus : function()
	{
		try { return this._channel.responseStatus; } catch(ex) { return ""; }
	},

	visitHeader : function(aHeader, aValue)
	{
		this._headers[aHeader] = aValue;
	},

	onDataAvailable : function(aRequest, aContext, aInputStream, aOffset, aCount) {},
	onStartRequest  : function(aRequest, aContext) {},
	onStopRequest   : function(aRequest, aContext, aStatus) { this.onHttpSuccess(); },

	onHttpSuccess : function()
	{
		sbCaptureTask.contentType = this.getHeader("Content-Type");
		var httpStatus = this.getStatus();
		SB_trace(sbCaptureTask.STRING.getString("CONNECT_SUCCESS") + " (Content-Type: " + sbCaptureTask.contentType + ")");
		switch ( httpStatus )
		{
			case 404 : sbCaptureTask.fail(sbCaptureTask.STRING.getString("HTTP_STATUS_404") + " (404 Not Found)"); return;
			case 403 : sbCaptureTask.fail(sbCaptureTask.STRING.getString("HTTP_STATUS_403") + " (403 Forbidden)"); return;
			case 500 : sbCaptureTask.fail("500 Internal Server Error"); return;
		}
		var redirectURL = this.getHeader("Location");
		if ( redirectURL )
		{
			if ( redirectURL.indexOf("http") != 0 ) redirectURL = this._URL.resolve(redirectURL);
			sbCaptureTask.start(redirectURL);
			return;
		}
		if ( !sbCaptureTask.contentType )
		{
			sbCaptureTask.contentType = "text/html";
		}
		var func = function(val) { return sbCaptureTask.contentType.indexOf(val) >= 0; };
		sbCaptureTask.isDocument = ["text/plain", "html", "xml"].some(func);
		if (sbCaptureTask.isDocument) {
			sbInvisibleBrowser.load(this.URLSpec);
		}
		else {
			if ( gContext == "indepth" ) {
				sbCaptureTask.next(true);
			} else {
				sbInvisibleBrowser.execCapture();
			}
		}
	},

	onHttpError : function(aErrorMsg)
	{
		sbCaptureTask.fail(sbCaptureTask.STRING.getString("CONNECT_FAILURE") + " (" + aErrorMsg + ")");
	},

};




sbCaptureObserverCallback.getString = function(aBundleName)
{
	return document.getElementById("sbOverlayString").getString(aBundleName);
},

sbCaptureObserverCallback.trace = function(aText)
{
	SB_trace(aText);
};

sbCaptureObserverCallback.onCaptureComplete = function(aItem)
{
	if ( gContext != "indepth" && gURLs.length == 1 ) SB_fireNotification(aItem);
	if ( gContext == "capture-again" || gContext == "capture-again-deep" )
	{
		sbCrossLinker.forceReloading(gPreset[0], gPreset[1]);
		var res = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + gPreset[0]);
		ScrapBookData.setProperty(res, "chars", aItem.chars);
		if ( gPreset[5] ) ScrapBookData.setProperty(res, "type", "");
	}
	sbCaptureTask.succeed();
};


