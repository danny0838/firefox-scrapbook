/**************************************************
// capture.js
// Implementation file for capture.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBstring;
var SBbrowser;
var SBmessage;
var SBlistbox;

var gURLs = [];
var gRefURL = "";
var gShowDetail   = false;
var gDocumentOnly = false;
var gContResName = "";
var gContResIdx  = 0;
var gInterval    = 5;



function SB_trace(aMessage)
{
	SBmessage.value = aMessage;
}


function SB_initCapture()
{
	SBstring  = document.getElementById("ScrapBookString");
	SBbrowser = document.getElementById("ScrapBookCaptureBrowser");
	SBmessage = document.getElementById("ScrapBookCaptureTextbox");
	SBlistbox = document.getElementById("ScrapBookCaptureListbox");
	gURLs         = window.arguments[0];
	gRefURL       = window.arguments[1];
	gShowDetail   = window.arguments[2];
	gDocumentOnly = window.arguments[3];
	gContResName  = window.arguments[4];
	gContResIdx   = window.arguments[5];
	if ( gURLs.length < 1 ) {
		return;
	} else if ( gURLs.length == 1 ) {
		SBlistbox.hidden = true;
	} else if ( gURLs.length < 10 ) {
		SBlistbox.setAttribute("rows", gURLs.length + 2);
	} else {
		SBlistbox.setAttribute("rows", 10);
	}
	gURLs = SB_checkDuplicatedURL(gURLs);
	SBbrowser.webProgress.addProgressListener(SBdocumentLoadListener, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
	SBtask.init();
	SBtask.start();
}


function SB_checkDuplicatedURL(aURLs){

	var URLhash = {};
	for ( var i = 0; i < aURLs.length; i++ )
	{
		if ( !aURLs[i].match(/^(file|http|https):\/\//i) ) continue;
		aURLs[i] = ( (pos = aURLs[i].indexOf("#")) != -1 ) ? aURLs[i].substring(0, pos) : aURLs[i];
		URLhash[aURLs[i]] = true;
	}
	aURLs = [];
	for ( var aURL in URLhash ) aURLs.push(aURL);
	return aURLs;
}




var SBtask = {

	index : 0,

	URL         : "",
	contentType : "",
	isDocument  : false,
	canRefresh  : true,

	init : function()
	{
		this.index = 0;
		for ( var i = 0; i < gURLs.length; i++ )
		{
			SBlistbox.appendItem("[" + i + "] " + gURLs[i]);
		}
	},

	start : function()
	{
		this.URL = gURLs[this.index];
		this.contentType = "";
		this.isDocument = true;
		this.canRefresh = true;
		SBlistbox.focus();
		SBlistbox.ensureIndexIsVisible(this.index);
		SBlistbox.selectedIndex = this.index;
		SB_trace(SBstring.getString("CONNECT") + "... " + this.URL);
		if ( this.URL.substring(0,7) == "file://" ) {
			SB_loadDocument();
		} else {
			var sniffer = new SBheaderSniffer(this.URL, gRefURL);
			sniffer.httpHead();
		}
	},

	toggleShowButtons : function(willShow)
	{
		document.getElementById("ScrapBookCaptureRetryButton").hidden = !willShow;
		if ( this.index == gURLs.length - 1 ) willShow = false;
		document.getElementById("ScrapBookCaptureSkipButton").hidden = !willShow;
	},

	succeed : function()
	{
		if ( gURLs.length > 1 ) SBlistbox.getItemAtIndex(this.index).setAttribute("style", "color:#33CC33;");
		this.skip(false);
	},

	fail : function(aErrorMsg)
	{
		if ( aErrorMsg ) SB_trace(aErrorMsg);
		if ( gURLs.length > 1 ) SBlistbox.getItemAtIndex(this.index).setAttribute("style", "color:#FF0000;font-weight:bold;");
		this.toggleShowButtons(true);
	},

	skip : function(quickly)
	{
		if ( ++this.index >= gURLs.length ) {
			this.finalize();
		} else {
			SB_trace(SBstring.getFormattedString("WAITING", [gInterval]) + "...");
			window.setTimeout(function(){ SBtask.start(); }, quickly ? 0 : gInterval * 1000);
		}
	},

	finalize : function()
	{
		try {
			if ( gURLs.length > 1 ) window.opener.SBcapture.notifyOnComplete(false, false, false);
		} catch(ex) {
		}
		window.setTimeout(function(){ window.close(); }, 1500);
	},

};




function SBheaderSniffer(aURLSpec, aRefURLSpec)
{
	this.URLSpec    = aURLSpec;
	this.refURLSpec = aRefURLSpec;
}


SBheaderSniffer.prototype = {

	_URL     : Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL),
	_channel : null,
	_headers : null,

	httpHead : function()
	{
		this._channel = null;
		this._headers = {};
		try {
			this._URL.spec = this.URLSpec;
			this._channel = SBservice.IO.newChannelFromURI(this._URL).QueryInterface(Components.interfaces.nsIHttpChannel);
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
		SBtask.contentType = this.getHeader("Content-Type");
		var httpStatus = this.getStatus();
		SB_trace(SBstring.getString("CONNECT_SUCCESS") + " (Content-Type: " + SBtask.contentType + ")");
		switch ( httpStatus )
		{
			case 404 : SBtask.fail(SBstring.getString("HTTP_STATUS_404") + " (404 Not Found)"); return;
			case 403 : SBtask.fail(SBstring.getString("HTTP_STATUS_403") + " (403 Forbidden)"); return;
			case 500 : SBtask.fail("500 Internal Server Error"); return;
		}
		if ( !SBtask.contentType )
		{
			SBtask.fail(SBstring.getString("CONTENT_TYPE_FAILURE")); return;
		}
		if ( SBtask.contentType.match(/(text|html|xml)/i) )
		{
			SBtask.isDocument = true;
			SB_loadDocument();
		}
		else
		{
			SBtask.isDocument = false;
			gDocumentOnly ? SBtask.skip(true) : SB_execCapture();
		}
	},
	onHttpError : function(aErrorMsg)
	{
		SBtask.fail(SBstring.getString("CONNECT_FAILURE") + " (" + aErrorMsg + ")");
	},
};


function SB_loadDocument()
{
	SBbrowser.docShell.allowJavascript = false;
	SBbrowser.docShell.allowMetaRedirects = false;
	SBbrowser.docShell.QueryInterface(Components.interfaces.nsIDocShellHistory).useGlobalHistory = false;
	SBbrowser.removeEventListener("load", SB_execCapture, true);
	SBbrowser.addEventListener("load", SB_execCapture, true);
	SBbrowser.contentWindow.location.href = SBtask.URL;
	SBdocumentLoadListener.init();
}


var SBdocumentLoadListener = {

	fileCount : 0,

	init : function()
	{
		this.fileCount = 0;
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
			SB_trace(SBstring.getString("LOADING") + "... " + ++this.fileCount + " " + SBtask.URL);
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
}


function SB_execCapture()
{
	SB_trace(SBstring.getString("CAPTURE_START"));
	if ( SBbrowser.contentDocument.body && SBtask.isDocument )
	{
		var metaElems = SBbrowser.contentDocument.getElementsByTagName("meta");
		for ( var i=0; i<metaElems.length; i++ )
		{
			if ( metaElems[i].hasAttribute("http-equiv") && metaElems[i].hasAttribute("content") &&
			     metaElems[i].getAttribute("http-equiv").toLowerCase() == "refresh" && 
			     metaElems[i].getAttribute("content").match(/URL\=(.*)$/i) )
			{
				var newURL = SBcommon.resolveURL(SBtask.URL, RegExp.$1);
				if ( newURL != SBtask.URL && SBtask.canRefresh )
				{
					SBtask.URL = newURL;
					SBtask.canRefresh = false;
					SBbrowser.contentWindow.location.href = SBtask.URL;
					return;
				}
			}
		}
		var success = SBcapture.doCaptureDocument(SBbrowser.contentWindow, false, gShowDetail, gContResName, gContResIdx);
	}
	else
	{
		var myType = SBtask.contentType.match(/image/i) ? "image" : "file";
		var success = SBcapture.doCaptureFile(SBtask.URL, myType, gRefURL ? gRefURL : SBtask.URL, gShowDetail, gContResName, gContResIdx);
	}
	if ( !success )
	{
		SB_trace(SBstring.getString("CAPTURE_ABORT"));
		SBtask.fail();
	}
}



SBcapture.notifyOnComplete = function(aID, aIcon, aTitle)
{
	if ( gURLs.length == 1 )
	{
		window.opener.SBcapture.notifyOnComplete(aID, aIcon, aTitle);
	}
	SBtask.succeed();
}


SBdownloadListenerCallback = {

	onCompleteDownload : function(aItem)
	{
		SB_trace(SBstring.getString("CAPTURE") + "... (" + SBcapture.httpTask[aItem.id] + ") " + aItem.title);
	},
	onCompleteAllDownloads : function(aItem)
	{
		SB_trace(SBstring.getString("CAPTURE_COMPLETE") + " : " + aItem.title);
		SBcapture.notifyOnComplete(aItem.id, aItem.icon, aItem.title);
	},
	onProgressDownload : function(aItem, aFileName, aProgress)
	{
		SB_trace(SBstring.getString("TRANSFER_DATA") + "... (" + SBcapture.httpTask[aItem.id] + ") " + aProgress + " : " + aFileName);
	},
};


