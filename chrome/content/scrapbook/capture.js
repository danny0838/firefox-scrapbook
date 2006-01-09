

var SBstring;

var gURLs       = [];
var gDepths     = [];
var gRefURL     = "";
var gShowDetail = false;
var gResName    = "";
var gResIdx     = 0;
var gReferItem  = null;
var gLinked     = {};
var gFile2URL   = {};
var gURL2Name   = {};




function SB_trace(aMessage)
{
	document.getElementById("ScrapBookCaptureTextbox").value = aMessage;
}


function SB_initCapture()
{
	SBstring  = document.getElementById("ScrapBookString");
	var myURLs  = window.arguments[0];
	gRefURL     = window.arguments[1];
	gShowDetail = window.arguments[2];
	gResName    = window.arguments[3];
	gResIdx     = window.arguments[4];
	gReferItem  = window.arguments[5];
	gLinked     = window.arguments[6];
	gFile2URL   = window.arguments[7];
	if ( gReferItem ) gURL2Name[unescape(gReferItem.source)] = "index";
	sbInvisibleBrowser.init();
	sbCaptureTask.init(myURLs);
	if ( gURLs.length == 1 )
		sbCaptureTask.start();
	else
		sbCaptureTask.countDown();
}


function SB_splitByAnchor(aURL)
{
	var pos = 0;
	return ( (pos = aURL.indexOf("#")) < 0 ) ? [aURL, ""] : [aURL.substring(0, pos), aURL.substring(pos, aURL.length)];
}


function SB_suggestName(aURL)
{
	var baseName = sbCommonUtils.validateFileName(sbCommonUtils.splitFileName(sbCommonUtils.getFileName(aURL))[0]);
	if ( baseName == "index" ) baseName = "default";
	if ( !baseName ) baseName = "default";
	var name = baseName + ".html";
	var seq = 0;
	while ( gFile2URL[name] ) name = baseName + "_" + sbContentSaver.leftZeroPad3(++seq) + ".html";
	name = sbCommonUtils.splitFileName(name)[0];
	gFile2URL[name + ".html"] = aURL;
	gFile2URL[name + ".css"]  = true;
	return name;
}


function SB_fireNotification(aItem)
{
	try {
		window.opener.sbContentSaver.onCaptureComplete(aItem);
	} catch(ex) {
		try {
			window.opener.opener.sbContentSaver.onCaptureComplete(aItem);
		} catch(ex) {
			try {
				window.opener.top.sbContentSaver.onCaptureComplete(aItem);
			} catch(ex) {
				dump("scrapbook::showNotify GIVE_UP_TO_FIND_WINDOW: " + ex + "\n");
			}
		}
	}
}




var sbCaptureTask = {

	get INTERVAL() { return 3; },
	get LISTBOX()  { return document.getElementById("ScrapBookCaptureListbox"); },
	get URL()      { return gURLs[this.index]; },

	index       : 0,
	contentType : "",
	isDocument  : false,
	canRefresh  : true,
	sniffer     : null,
	seconds     : 3,
	timerID     : 0,
	forceExit   : 0,

	init : function(myURLs)
	{
		dump("sbCaptureTask::init\n");
		if ( !gReferItem && myURLs.length == 1 )
		{
			this.LISTBOX.collapsed = true;
			this.LISTBOX.setAttribute("class", "plain");
			document.getElementById("ScrapBookCaptureSkipButton").hidden = true;
		}
		else
		{
			this.LISTBOX.setAttribute("rows", 10);
		}
		if ( gReferItem )
		{
			var button = document.getElementById("ScrapBookCaptureFilterButton");
			button.hidden = false;
			button.nextSibling.hidden = false;
			button.firstChild.firstChild.label += " (" + sbCommonUtils.getRootHref(gReferItem.source) + ")" ;
			button.firstChild.firstChild.nextSibling.label += " (" + sbCommonUtils.getBaseHref(gReferItem.source) + ")";
		}
		for ( var i = 0; i < myURLs.length; i++ ) this.add(myURLs[i], 1);
	},

	add : function(aURL, aDepth)
	{
		if ( gURLs.length > 1000 ) return;
		if ( !aURL.match(/^(http|https|ftp|file):\/\//i) ) return;
		if ( gReferItem )
		{
			if ( aDepth > gLinked.depth ) {
				dump("sbCaptureTask::add PREVENT_INVALID_DEPTH\n");
				return;
			}
			aURL = SB_splitByAnchor(aURL)[0];
			if ( !gLinked.isPartial && aURL == gReferItem.source ) return;
			for ( var i = 0; i < gURLs.length; i++ ) if ( aURL == gURLs[i] ) return;
		}
		dump("sbCaptureTask::add(DEPTH=" + aDepth + ", URL=" + aURL + ")\n");
		gURLs.push(aURL);
		gDepths.push(aDepth);
		var listitem = document.createElement("listitem");
		listitem.setAttribute("label", aDepth + " [" + (gURLs.length - 1) + "] " + aURL);
		listitem.setAttribute("type", "checkbox");
		listitem.setAttribute("checked", this.filter(gURLs.length - 1));
		this.LISTBOX.appendChild(listitem);
	},

	start : function()
	{
		dump("sbCaptureTask::start\t[" + this.index + "]\n");
		this.seconds = -1;
		this.toggleStartPause(true);
		this.toggleSkipButton(true);
		this.LISTBOX.getItemAtIndex(this.index).setAttribute("indicated", true);
		if ( this.index > 0  ) this.LISTBOX.getItemAtIndex(this.index - 1).removeAttribute("indicated");
		this.LISTBOX.ensureIndexIsVisible(this.index);
		var listitem = this.LISTBOX.getItemAtIndex(this.index);
		listitem.setAttribute("disabled", true);
		if ( !listitem.checked )
		{
			dump("sbCaptureTask::start SKIP_UNCHECKED [" + this.index + "]\n");
			this.next(true);
			return;
		}
		this.contentType = "";
		this.isDocument = true;
		this.canRefresh = true;
		SB_trace(SBstring.getString("CONNECT") + "... " + gURLs[this.index]);
		if ( gURLs[this.index].substring(0,7) == "file://" ) {
			sbInvisibleBrowser.load(gURLs[this.index]);
		} else {
			this.sniffer = new sbHeaderSniffer(gURLs[this.index], gRefURL);
			this.sniffer.httpHead();
		}
	},

	succeed : function()
	{
		dump("sbCaptureTask::succeed\t[" + this.index + "]\n");
		this.LISTBOX.getItemAtIndex(this.index).setAttribute("status", "succeed");
		this.next(false);
	},

	fail : function(aErrorMsg)
	{
		dump("sbCaptureTask::fail\t[" + this.index + "]\n");
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
		dump("sbCaptureTask::next\t[" + this.index + "]\n");
		this.toggleStartPause(true);
		this.toggleSkipButton(false);
		this.LISTBOX.getItemAtIndex(this.index).setAttribute("disabled", true);
		this.LISTBOX.getItemAtIndex(this.index).removeAttribute("indicated");
		if ( this.sniffer ) this.sniffer.onHttpSuccess = function(){};
		sbInvisibleBrowser.ELEMENT.stop();
		if ( ++this.index >= gURLs.length ) {
			this.finalize();
		} else {
			if ( quickly ) {
				window.setTimeout(function(){ sbCaptureTask.start(); }, 0);
			} else {
				this.seconds = this.INTERVAL;
				sbCaptureTask.countDown();
			}
		}
	},

	countDown : function()
	{
		dump("sbCaptureTask::countDown " + this.seconds + "\n");
		SB_trace(SBstring.getFormattedString("WAITING", [sbCaptureTask.seconds]) + "...");
		if ( --this.seconds > 0 )
			this.timerID = window.setTimeout(function(){ sbCaptureTask.countDown(); }, 1000);
		else
			this.timerID = window.setTimeout(function(){ sbCaptureTask.start(); }, 1000);
	},

	finalize : function()
	{
		dump("sbCaptureTask::finalize\n");
		if ( !gReferItem )
		{
			if ( gURLs.length > 1 ) SB_fireNotification(null);
			window.setTimeout(function(){ window.close(); }, 1000);
		}
		else
		{
			sbCrossLinker.invoke();
		}
	},

	activate : function()
	{
		dump("sbCaptureTask::activate\n");
		this.toggleStartPause(true);
		if ( this.seconds < 0 ) {
			sbInvisibleBrowser.fileCount = 0;
			sbInvisibleBrowser.ELEMENT.reload();
		} else {
			this.countDown();
		}
	},

	pause : function()
	{
		dump("sbCaptureTask::pause " + this.seconds + "\n");
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
		dump("sbCaptureTask::abort\n");
		if ( !gReferItem ) window.close();
		if ( ++this.forceExit > 2 ) window.close();
		if ( this.index < gURLs.length - 1 ) { this.index = gURLs.length - 1; this.next(); }
	},

	toggleStartPause : function(allowPause)
	{
		document.getElementById("ScrapBookCapturePauseButton").disabled = false;
		document.getElementById("ScrapBookCapturePauseButton").hidden = !allowPause;
		document.getElementById("ScrapBookCaptureStartButton").hidden =  allowPause;
		document.getElementById("ScrapBookCaptureTextbox").disabled   = !allowPause;
	},

	toggleSkipButton : function(willEnable)
	{
		document.getElementById("ScrapBookCaptureSkipButton").disabled = !willEnable;
	},

	filter : function(i)
	{
		return true;
	},

	applyFilter : function(type)
	{
		switch ( type )
		{
			case "D" : var ref = sbCommonUtils.getRootHref(gReferItem.source).toLowerCase(); this.filter = function(i){ return gURLs[i].toLowerCase().indexOf(ref) == 0; }; break;
			case "L" : var ref = sbCommonUtils.getBaseHref(gReferItem.source).toLowerCase(); this.filter = function(i){ return gURLs[i].toLowerCase().indexOf(ref) == 0; }; break;
			case "S" : 
				var ret = { value : "" };
				if ( !sbCommonUtils.PROMPT.prompt(window, "ScrapBook", SBstring.getString("FILTER_BY_STRING"), ret, null, {}) ) return;
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

	get ELEMENT() { return document.getElementById("ScrapBookCaptureBrowser"); },

	fileCount : 0,
	onload    : null,

	init : function()
	{
		dump("sbInvisibleBrowser::init\n");
		this.ELEMENT.webProgress.addProgressListener(this, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
		this.onload = function(){ sbInvisibleBrowser.execCapture(); };
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
		dump("sbInvisibleBrowser::load\t" + aURL + "\n");
		this.fileCount = 0;
		this.ELEMENT.docShell.allowJavascript = false;
		this.ELEMENT.docShell.allowMetaRedirects = false;
		this.ELEMENT.docShell.QueryInterface(Components.interfaces.nsIDocShellHistory).useGlobalHistory = false;
		this.ELEMENT.loadURI(aURL, null, null);
	},

	execCapture : function()
	{
		dump("sbInvisibleBrowser::execCapture\n");
		SB_trace(SBstring.getString("CAPTURE_START"));
		document.getElementById("ScrapBookCapturePauseButton").disabled = true;
		sbCaptureTask.toggleSkipButton(false);
		var ret = null;
		var preset = gReferItem ? [gReferItem.id, SB_suggestName(sbCaptureTask.URL), gLinked, gFile2URL, gDepths[sbCaptureTask.index]] : null;
		if ( this.ELEMENT.contentDocument.body && sbCaptureTask.isDocument )
		{
			var metaElems = this.ELEMENT.contentDocument.getElementsByTagName("meta");
			for ( var i = 0; i < metaElems.length; i++ )
			{
				if ( metaElems[i].hasAttribute("http-equiv") && metaElems[i].hasAttribute("content") &&
				     metaElems[i].getAttribute("http-equiv").toLowerCase() == "refresh" && 
				     metaElems[i].getAttribute("content").match(/URL\=(.*)$/i) )
				{
					var newURL = sbCommonUtils.resolveURL(sbCaptureTask.URL, RegExp.$1);
					if ( newURL != sbCaptureTask.URL && sbCaptureTask.canRefresh )
					{
						gURLs[sbCaptureTask.index] = newURL;
						sbCaptureTask.canRefresh = false;
						this.ELEMENT.loadURI(newURL, null, null);
						return;
					}
				}
			}
			ret = sbContentSaver.captureWindow(this.ELEMENT.contentWindow, false, gShowDetail, gResName, gResIdx, preset);
		}
		else
		{
			var type = sbCaptureTask.contentType.match(/image/i) ? "image" : "file";
			ret = sbContentSaver.captureFile(sbCaptureTask.URL, gRefURL ? gRefURL : sbCaptureTask.URL, type, gShowDetail, gResName, gResIdx, preset);
		}
		if ( ret )
		{
			dump("sbInvisibleBrowser::execCapture SUCCESS\n");
			if ( gReferItem )
			{
				gURL2Name[unescape(sbCaptureTask.URL)] = ret[0];
				gFile2URL = ret[1];
			}
		}
		else
		{
			dump("sbInvisibleBrowser::execCapture FAILURE\n");
			SB_trace(SBstring.getString("CAPTURE_ABORT"));
			sbCaptureTask.fail("");
		}
	},

	QueryInterface : function(aIID)
	{
		if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
			aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
			aIID.equals(Components.interfaces.nsIXULBrowserWindow) ||
			aIID.equals(Components.interfaces.nsISupports))
			return this;
		throw Components.results.NS_NOINTERFACE;
	},

	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
		if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START )
		{
			SB_trace(SBstring.getString("LOADING") + "... " + (++this.fileCount) + " " + sbCaptureTask.URL);
		}
	},

	onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
	{
		if ( aCurTotalProgress != aMaxTotalProgress )
		{
			SB_trace(SBstring.getString("TRANSFER_DATA") + "... (" + aCurTotalProgress + " Bytes)");
		}
	},

	onStatusChange   : function() {},
	onLocationChange : function() {},
	onSecurityChange : function() {},

};




var sbCrossLinker = {

	get ELEMENT(){ return document.getElementById("ScrapBookCaptureBrowser"); },

	index    : -1,
	baseURL  : "",
	nameList : [],

	XML      : null,
	rootNode : null,
	nodeHash : {},

	invoke : function()
	{
		if ( !sbDataSource.data ) sbDataSource.init();
		sbDataSource.updateItem(sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + gReferItem.id), "type", "site");
		sbDataSource.flush();
		sbInvisibleBrowser.refreshEvent(function(){ sbCrossLinker.exec(); });
		this.ELEMENT.docShell.allowImages = false;
		sbInvisibleBrowser.onStateChange = function(aWebProgress, aRequest, aStateFlags, aStatus)
		{
			if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START )
			{
				SB_trace(SBstring.getFormattedString("REBUILD_LINKS", [sbCrossLinker.index + 1, sbCrossLinker.nameList.length]) + "... "
					+ ++sbInvisibleBrowser.fileCount + " : " + sbCrossLinker.nameList[sbCrossLinker.index] + ".html");
			}
		};
		this.baseURL = sbCommonUtils.IO.newFileURI(sbCommonUtils.getContentDir(gReferItem.id)).spec;
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
			SB_trace(SBstring.getString("REBUILD_LINKS_COMPLETE"));
			this.flushXML();
			SB_fireNotification(gReferItem);
			window.setTimeout(function(){ window.close(); }, 1000);
		}
	},

	exec : function()
	{
		if ( this.ELEMENT.currentURI.spec.indexOf("file://") != 0 )
		{
			return;
		}
		sbContentSaver.frameList = [this.ELEMENT.contentWindow];
		sbContentSaver.getFrameList(this.ELEMENT.contentWindow);
		if ( !this.nodeHash[this.nameList[this.index]] )
		{
			this.nodeHash[this.nameList[this.index]] = this.createNode(this.nameList[this.index], gReferItem.title);
			this.nodeHash[this.nameList[this.index]].setAttribute("title", sbDataSource.sanitize(this.ELEMENT.contentTitle));
		}
		else
		{
			this.nodeHash[this.nameList[this.index]].setAttribute("title", sbDataSource.sanitize(this.ELEMENT.contentTitle));
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
				var file = sbCommonUtils.getContentDir(gReferItem.id);
				file.append(sbCommonUtils.getFileName(doc.location.href));
				sbCommonUtils.writeFile(file, src, doc.characterSet);
			}
		}
		try {
			var nodes = window.opener.gBrowser.mTabContainer.childNodes;
			for ( var i = 0; i < nodes.length; i++ )
			{
				var curURI = window.opener.gBrowser.getBrowserForTab(nodes[i]).currentURI.spec;
				if ( curURI.match(gReferItem.id) && curURI.match(this.nameList[this.index] + ".html") )
				{
					window.opener.gBrowser.getBrowserForTab(nodes[i]).reload();
				}
			}
		} catch(ex) {
		}
		this.start();
	},

	createNode : function(aName, aText)
	{
		if ( aText.length > 100 ) aText = aText.substring(0,100) + "...";
		var node = this.XML.createElement("page");
		node.setAttribute("file", aName + ".html");
		node.setAttribute("text", sbDataSource.sanitize(aText));
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
		var xslFile = sbCommonUtils.getScrapBookDir().clone();
		xslFile.append("sitemap.xsl");
		if ( !xslFile.exists() ) sbCommonUtils.saveTemplateFile("chrome://scrapbook/skin/sitemap.xsl", xslFile);
		var contDir = sbCommonUtils.getContentDir(gReferItem.id);
		var xmlFile = contDir.clone();
		xmlFile.append("sitemap.xml");
		sbCommonUtils.writeFile(xmlFile, src, "UTF-8");
		var txt = "";
		var txtFile1 = contDir.clone();
		txtFile1.append("sb-file2url.txt");
		for ( var f in gFile2URL ) txt += f + "\t" + gFile2URL[f] + "\n";
		sbCommonUtils.writeFile(txtFile1, txt, "UTF-8");
		txt = "";
		var txtFile2 = contDir.clone();
		txtFile2.append("sb-url2name.txt");
		for ( var u in gURL2Name ) txt += u + "\t" + gURL2Name[u] + "\n";
		sbCommonUtils.writeFile(txtFile2, txt, "UTF-8");
	},

};




function sbHeaderSniffer(aURLSpec, aRefURLSpec)
{
	this.URLSpec    = aURLSpec;
	this.refURLSpec = aRefURLSpec;
}


sbHeaderSniffer.prototype = {

	_URL     : Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL),
	_channel : null,
	_headers : null,

	httpHead : function()
	{
		dump("sbHeaderSniffer::httpHead\t" + this.URLSpec + "\n");
		this._channel = null;
		this._headers = {};
		try {
			this._URL.spec = this.URLSpec;
			this._channel = sbCommonUtils.IO.newChannelFromURI(this._URL).QueryInterface(Components.interfaces.nsIHttpChannel);
			this._channel.loadFlags = this._channel.LOAD_BYPASS_CACHE;
			this._channel.setRequestHeader("User-Agent", navigator.userAgent, false);
			if ( this.refURLSpec ) this._channel.setRequestHeader("Referer", this.refURLSpec, false);
		}
		catch(ex) {
			this.onHttpError("Invalid URL");
		}
		try {
			this._channel.requestMethod = "HEAD";
			this._channel.asyncOpen(this, this);
		}
		catch(ex) {
			this.onHttpError(ex);
		}
	},

	getHeader : function(aHeader)
	{
	 	try { return this._channel.getResponseHeader(aHeader); } catch(ex) {}
		return "";
	},

	getStatus : function()
	{
		try { return this._channel.responseStatus; } catch(ex) {}
		return "";
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
		dump("sbHeaderSniffer::onHttpSuccess CONTENT_TYPE = " + sbCaptureTask.contentType + "\n");
		dump("sbHeaderSniffer::onHttpSuccess HTTP_STATUS  = " + httpStatus + "\n");
		SB_trace(SBstring.getString("CONNECT_SUCCESS") + " (Content-Type: " + sbCaptureTask.contentType + ")");
		switch ( httpStatus )
		{
			case 404 : sbCaptureTask.fail(SBstring.getString("HTTP_STATUS_404") + " (404 Not Found)"); return;
			case 403 : sbCaptureTask.fail(SBstring.getString("HTTP_STATUS_403") + " (403 Forbidden)"); return;
			case 500 : sbCaptureTask.fail("500 Internal Server Error"); return;
		}
		if ( !sbCaptureTask.contentType )
		{
			dump("sbHeaderSniffer::onHttpSuccess\tCONTENT_TYPE_UNKNOWN\n");
			sbCaptureTask.fail(SBstring.getString("CONTENT_TYPE_FAILURE")); return;
		}
		if ( sbCaptureTask.contentType.match(/(text|html|xml)/i) )
		{
			dump("sbHeaderSniffer::onHttpSuccess\t" + this.URLSpec + " [PAGE]\n");
			sbCaptureTask.isDocument = true;
			sbInvisibleBrowser.load(this.URLSpec);
		}
		else
		{
			dump("sbHeaderSniffer::onHttpSuccess\t" + this.URLSpec + " [FILE]\n");
			sbCaptureTask.isDocument = false;
			if ( gReferItem ) {
				dump("sbHeaderSniffer::onHttpSuccess\tLIMIT_TO_WEB_PAGE\n");
				sbCaptureTask.next(true);
			} else {
				sbInvisibleBrowser.execCapture();
			}
		}
	},

	onHttpError : function(aErrorMsg)
	{
		dump("sbHeaderSniffer::onHttpError\n");
		sbCaptureTask.fail(SBstring.getString("CONNECT_FAILURE") + " (" + aErrorMsg + ")");
	},

};




sbContentSaver.onCaptureComplete = function(aItem)
{
	dump("sbContentSaver::onCaptureComplete(" + (aItem ? aItem.id : "") + ") [OVERRIDE capture.js]\n");
	SB_trace(SBstring.getString("CAPTURE_COMPLETE") + " : " + aItem.title);
	if ( !gReferItem && gURLs.length == 1 ) SB_fireNotification(aItem);
	sbCaptureTask.succeed();
}


sbDownloadProgressCallback = {

	onDownloadComplete : function(aItem)
	{
		SB_trace(SBstring.getString("CAPTURE") + "... (" + sbContentSaver.httpTask[aItem.id] + ") " + aItem.title);
	},
	onAllDownloadsComplete : function(aItem)
	{
		sbContentSaver.onCaptureComplete(aItem);
	},
	onDownloadProgress : function(aItem, aFileName, aProgress)
	{
		SB_trace(SBstring.getString("TRANSFER_DATA") + "... (" + sbContentSaver.httpTask[aItem.id] + ") " + aProgress + " : " + aFileName);
	},
};


