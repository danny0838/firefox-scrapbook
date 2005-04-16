/**************************************************
// scrapcapture.js
// Implementation file for overlay.xul, capture.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBcapture = {


	item         : null,
	contentDir   : null,
	httpTask     : {},
	file2URL     : {},
	linked       : {},
	refURLObj    : null,
	favicon      : null,
	frameList    : null,
	frameNumber  : 0,
	selection    : null,
	linkURLs     : [],


	getFrameList : function(aWindow)
	{
		for ( var f=0; f<aWindow.frames.length; f++ )
		{
			this.frameList.push(aWindow.frames[f]);
			this.getFrameList(aWindow.frames[f]);
		}
	},

	init : function()
	{
		this.favicon = null;
		this.httpTask[this.item.id] = 0;
		this.file2URL = { 'index.html' : true, 'index.css' : true, 'index.dat' : true };
		this.linked   = { img : false, snd : false, mov : false, arc : false, all : false, seq : false };
		this.linkURLs = [];
		this.frameList   = [];
		this.frameNumber = 0;
	},

	doCaptureDocument : function(ROOT_WINDOW, SELECTION_ONLY, DETAIL_DIALOG, RESOURCE_NAME, RESOURCE_INDEX)
	{
		SBRDF.init();
		var myID = SBRDF.identify(SBcommon.getTimeStamp());

		this.item = new ScrapBookItem(myID);
		this.item.chars  = ROOT_WINDOW.document.characterSet;
		this.item.source = ROOT_WINDOW.location.href;
		this.init();
		try {
			this.item.icon = document.getElementById("content").selectedTab.getAttribute("image");
		} catch(ex) {
		}

		this.getFrameList(ROOT_WINDOW);

		var titleList = ROOT_WINDOW.document.title ? [ROOT_WINDOW.document.title] : [this.item.source];
		if ( SELECTION_ONLY )
		{
			try {
				this.selection = ROOT_WINDOW.getSelection();
			} catch(ex) {
				alert(ex);
				return;
			}
			var lines = this.selection.toString().split("\n");
			for ( var i = 0; i < lines.length; i++ )
			{
				lines[i] = lines[i].replace(/\r|\n|\t/g, "");
				if ( lines[i].length > 0 ) titleList.push(lines[i].substring(0,72));
				if ( titleList.length > 4 ) break;
			}
			this.item.title = ( titleList.length > 0 ) ? titleList[1] : titleList[0];
		}
		else
		{
			this.selection = null;
			this.item.title = titleList[0];
		}

		if ( DETAIL_DIALOG )
		{
			var ret = this.showDetailDialog(titleList, RESOURCE_NAME);
			if ( ret.change ) { RESOURCE_NAME = ret.resName; RESOURCE_INDEX = 0; }
			if ( ret.cancel ) { return; }
		}

		this.contentDir = SBcommon.getContentDir(this.item.id);

		this.saveDocument(ROOT_WINDOW.document, "index");

		if ( this.item.icon && this.item.type != "image" && this.item.type != "file" )
		{
			var iconFileName = this.download(this.item.icon);
			this.favicon = iconFileName;
		}

		if ( this.httpTask[this.item.id] == 0 ) this.notifyOnComplete(this.item.id, this.item.icon, this.item.title);

		this.addResource(RESOURCE_NAME, RESOURCE_INDEX);

		if ( this.linked.seq && this.linkURLs.length > 0 )
		{
			var newID = SBRDF.identify(SBcommon.getTimeStamp());
			var newItem = new ScrapBookItem(newID);
			newItem.title = this.item.title;
			newItem.type = "folder";
			var newRes = SBRDF.addItem(newItem, RESOURCE_NAME, RESOURCE_INDEX > 0 ? RESOURCE_INDEX + 1 : RESOURCE_INDEX);
			SBRDF.createEmptySeq(newRes.Value);
			try {
				(window.opener ? window.opener : window).top.document.getElementById("sidebar").contentWindow.SB_rebuildAllTree();
			} catch(ex) {
			}
			window.openDialog(
				"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
				this.linkURLs, this.refURLObj.spec, false, true, newRes.Value, 0
			);
		}

		return true;
	},


	doCaptureLinkedDocument : function(ROOT_WINDOW, FILE_KEY)
	{
		this.item.chars = ROOT_WINDOW.document.characterSet;
		this.init();
		this.getFrameList(ROOT_WINDOW);
		this.saveDocument(ROOT_WINDOW.document, FILE_KEY);
		return true;
	},


	doCaptureFile : function(TARGET_URL, CAPTURE_TYPE, REFER_URL, DETAIL_DIALOG, RESOURCE_NAME, RESOURCE_INDEX)
	{
		SBRDF.init();
		var myID = SBRDF.identify(SBcommon.getTimeStamp());
		this.item = new ScrapBookItem(myID);
		this.item.title  = SBcommon.getFileName(TARGET_URL);
		this.item.icon   = "moz-icon://" + this.item.title + "?size=16";
		this.item.source = TARGET_URL;
		this.item.type   = CAPTURE_TYPE;
		this.init();
		if ( DETAIL_DIALOG )
		{
			var ret = this.showDetailDialog([this.item.title], RESOURCE_NAME);
			if ( ret.change ) { RESOURCE_NAME = ret.resName; RESOURCE_INDEX = 0; }
			if ( ret.cancel ) { return; }
		}
		this.contentDir = SBcommon.getContentDir(this.item.id);
		this.refURLObj  = SBcommon.convertURLToObject(REFER_URL);
		this.saveFile(TARGET_URL, "index", CAPTURE_TYPE);
		this.addResource(RESOURCE_NAME, RESOURCE_INDEX);
		return true;
	},


	showDetailDialog : function(aTitleList, aResName)
	{
		var ret = {
			titleList : aTitleList,
			resName   : aResName,
			cancel    : false,
			change    : false
		};
		window.openDialog('chrome://scrapbook/content/detail.xul' + (window.opener ? "?capture" : ""), "", "chrome,modal,centerscreen,resizable", ret);
		return ret;
	},


	saveDocument : function(aDocument, aFileKey)
	{
		if ( !aDocument.body || !aDocument.contentType.match(/text|html|xml/i) )
		{
			var captureType = (aDocument.contentType.substring(0,5) == "image") ? "image" : "file";
			if ( this.frameNumber == 0 ) this.item.type = captureType;
			var newLeafName = this.saveFile(aDocument.location.href, aFileKey, captureType);
			return newLeafName;
		}

		this.refURLObj = SBcommon.convertURLToObject(aDocument.location.href);

		dump("ScrapBook::saveDocument\t" + this.item.id + " [" + this.frameNumber + "] " + aFileKey + " " + aDocument.location.href + "\n");

		if ( this.selection )
		{
			var myRange = this.selection.getRangeAt(0);
			var myDocFrag = myRange.cloneContents();
			var curNode = myRange.commonAncestorContainer;
			if ( curNode.nodeName == "#text" ) curNode = curNode.parentNode;
		}

		var tmpNodeList = [];
		if ( this.selection )
		{
			do {
				tmpNodeList.unshift(curNode.cloneNode(false));
				curNode = curNode.parentNode;
			}
			while ( curNode.nodeName.toUpperCase() != "HTML" );
		}
		else
		{
			tmpNodeList.unshift(aDocument.body.cloneNode(true));
		}

		var rootNode = aDocument.getElementsByTagName("html")[0].cloneNode(false);

		try {
			var headNode = aDocument.getElementsByTagName("head")[0].cloneNode(true);
			rootNode.appendChild(headNode);
			rootNode.appendChild(document.createTextNode("\n"));
		} catch(ex) {
		}

		rootNode.appendChild(tmpNodeList[0]);
		rootNode.appendChild(document.createTextNode("\n"));
		for ( var n = 0; n < tmpNodeList.length-1; n++ )
		{
			tmpNodeList[n].appendChild(document.createTextNode("\n"));
			tmpNodeList[n].appendChild(tmpNodeList[n+1]);
			tmpNodeList[n].appendChild(document.createTextNode("\n"));
		}

		if ( this.selection )
		{
			this.addCommentTag(tmpNodeList[tmpNodeList.length-1], "DOCUMENT_FRAGMENT");
			tmpNodeList[tmpNodeList.length-1].appendChild(myDocFrag);
			this.addCommentTag(tmpNodeList[tmpNodeList.length-1], "/DOCUMENT_FRAGMENT");
		}


		this.processDOMRecursively(rootNode);


		var myCSS = "";
		var myStyleSheets = aDocument.styleSheets;
		for ( var i=0; i<myStyleSheets.length; i++ )
		{
			myCSS += this.processCSSRecursively(myStyleSheets[i]);
		}

		if ( myCSS )
		{
			var newLinkNode = document.createElement("link");
			newLinkNode.setAttribute("media", "all");
			newLinkNode.setAttribute("href", aFileKey + ".css");
			newLinkNode.setAttribute("type", "text/css");
			newLinkNode.setAttribute("rel", "stylesheet");
			rootNode.firstChild.appendChild(document.createTextNode("\n"));
			rootNode.firstChild.appendChild(newLinkNode);
			rootNode.firstChild.appendChild(document.createTextNode("\n"));
		}


		if ( SBcommon.getBoolPref("scrapbook.capture.utf8encode", true) )
		{
			this.item.chars = "UTF-8";
			var newMetaNode = document.createElement("meta");
			newMetaNode.setAttribute("content", aDocument.contentType + "; charset=" + this.item.chars);
			newMetaNode.setAttribute("http-equiv", "Content-Type");
			rootNode.firstChild.insertBefore(newMetaNode, rootNode.firstChild.firstChild);
			rootNode.firstChild.insertBefore(document.createTextNode("\n"), rootNode.firstChild.firstChild);
		}


		var myHTML;
		myHTML = this.surroundByTags(rootNode, rootNode.innerHTML);
		myHTML = this.doctypeToString(aDocument.doctype) + myHTML;
		myHTML = myHTML.replace(/\x00/g, " ");

		var myHTMLFile = this.contentDir.clone();
		myHTMLFile.append(aFileKey + ".html");
		SBcommon.writeFile(myHTMLFile, myHTML, this.item.chars);

		if ( myCSS )
		{
			var myCSSFile = this.contentDir.clone();
			myCSSFile.append(aFileKey + ".css");
			SBcommon.writeFile(myCSSFile, myCSS, this.item.chars);
		}

		return myHTMLFile.leafName;
	},


	saveFile : function(aFileURL, aFileKey, aCaptureType)
	{
		if ( !aFileKey ) aFileKey = "file" + Math.random().toString();

		if ( !this.refURLObj ) this.refURLObj = SBcommon.convertURLToObject(aFileURL);

		dump("ScrapBook::saveFile\t" + this.item.id + " [" + this.frameNumber + "] " + aFileKey + " (" + aCaptureType + ") " + aFileURL + "\n");

		if ( this.frameNumber == 0 )
		{
			this.item.icon  = "moz-icon://" + SBcommon.getFileName(aFileURL) + "?size=16";
			this.item.type  = aCaptureType;
			this.item.chars = "";
		}

		var newFileName = this.download(aFileURL);

		if ( aCaptureType == "image" ) {
			var myHTML = '<html><body><img src="' + newFileName + '"></body></html>';
		} else {
			var myHTML = '<html><head><meta http-equiv="refresh" content="0;URL=./' + newFileName + '"></head><body></body></html>';
		}
		var myHTMLFile = this.contentDir.clone();
		myHTMLFile.append(aFileKey + ".html");
		SBcommon.writeFile(myHTMLFile, myHTML, "UTF-8");

		return myHTMLFile.leafName;
	},


	addResource : function(aResName, aResIndex)
	{
		var myRes = SBRDF.addItem(this.item, aResName, aResIndex);
		try {
			(window.opener ? window.opener : window).top.document.getElementById("sidebar").contentWindow.SB_rebuildAllTree();
		} catch(ex) {
		}
		if ( this.favicon )
		{
			var faviconURL = SBservice.IO.newFileURI(this.contentDir).spec + this.favicon;
			(window.opener ? window.opener : window).setTimeout(function() { SBRDF.updateItem(myRes, "icon", faviconURL); SBRDF.flush(); }, 500);
			this.item.icon = this.favicon;
		}
		SBcommon.writeIndexDat(this.item);
	},



	surroundByTags : function(aNode, aContent)
	{
		var tag = "<" + aNode.nodeName.toLowerCase();
		for ( var i=0; i<aNode.attributes.length; i++ )
		{
			tag += ' ' + aNode.attributes[i].name + '="' + aNode.attributes[i].value + '"';
		}
		tag += ">\n";
		return tag + aContent + "</" + aNode.nodeName.toLowerCase() + ">\n";
	},


	addCommentTag : function(targetNode, aComment)
	{
		targetNode.appendChild(document.createTextNode("\n"));
		targetNode.appendChild(document.createComment(aComment));
		targetNode.appendChild(document.createTextNode("\n"));
	},


	removeNodeFromParent : function(aNode)
	{
		var newNode = document.createTextNode("");
		aNode.parentNode.replaceChild(newNode, aNode);
		aNode = newNode;
		return aNode;
	},


	doctypeToString : function(aDoctype)
	{
		if ( !aDoctype ) return "";
		var ret = "<!DOCTYPE " + aDoctype.name;
		if ( aDoctype.publicId ) ret += ' PUBLIC "' + aDoctype.publicId + '"';
		if ( aDoctype.systemId ) ret += ' "'        + aDoctype.systemId + '"';
		ret += ">\n";
		return ret;
	},



	processDOMRecursively : function(rootNode)
	{
		for ( var curNode = rootNode.firstChild; curNode != null; curNode = curNode.nextSibling )
		{
			if ( curNode.nodeName == "#text" || curNode.nodeName == "#comment" ) continue;
			curNode = this.inspectNode(curNode);
			this.processDOMRecursively(curNode);
		}
	},


	inspectNode : function(aNode)
	{
		switch ( aNode.nodeName.toLowerCase() )
		{
			case "img" : 
			case "embed" : 
				if ( aNode.hasAttribute("onclick") ) aNode = this.convertJavaScriptLink(aNode, "onclick");
				var aFileName = this.download(aNode.src);
				if (aFileName) aNode.setAttribute("src", aFileName);
				break;

			case "object" : 
				var aFileName = this.download(aNode.data);
				if (aFileName) aNode.setAttribute("data", aFileName);
				break;

			case "body" : 
			case "table" : 
			case "td" : 
				var aFileName = this.download(aNode.getAttribute("background"));
				if (aFileName) aNode.setAttribute("background", aFileName);
				break;

			case "input" : 
				if ( aNode.type.toLowerCase() == "image" ) {
					var aFileName = this.download(aNode.src);
					if (aFileName) aNode.setAttribute("src", aFileName);
				}
				break;

			case "link" : 
				if ( aNode.rel.toLowerCase() == "stylesheet" ) {
					aNode = this.removeNodeFromParent(aNode);
					return aNode;
				} else if ( aNode.rel.toLowerCase() == "shortcut icon" || aNode.rel.toLowerCase() == "icon" ) {
					var aFileName = this.download(aNode.href);
					if (aFileName) aNode.setAttribute("href", aFileName);
					if ( this.frameNumber == 0 && !this.favicon ) this.favicon = aFileName;
				} else {
					aNode.setAttribute("href", aNode.href);
				}
				break;

			case "base" : 
			case "style" : 
				aNode = this.removeNodeFromParent(aNode);
				return aNode;
				break;

			case "script" : 
			case "noscript" : 
				if ( SBcommon.getBoolPref("scrapbook.capture.removescript", true) )
				{
					aNode = this.removeNodeFromParent(aNode);
					return aNode;
				}
				else
				{
					if ( aNode.hasAttribute("src") ) {
						var aFileName = this.download(aNode.src);
						if (aFileName) aNode.setAttribute("src", aFileName);
					}
				}
				break;

			case "a" : 
			case "area" : 
				if ( aNode.hasAttribute("onclick") ) aNode = this.convertJavaScriptLink(aNode, "onclick");
				if ( !aNode.hasAttribute("href") ) return aNode;
				if ( aNode.href.match(/^javascript:/i) ) aNode = this.convertJavaScriptLink(aNode, "href");
				if ( !this.selection && aNode.getAttribute("href").charAt(0) == "#" ) return aNode;
				var ext = SBcommon.splitFileName(SBcommon.getFileName(aNode.href))[1];
				var flag = false;
				switch ( ext.toLowerCase() ) {
					case "jpg" : case "jpeg" : case "png" : case "gif" : flag = this.linked.img; break;
					case "mp3" : case "wav"  : case "ram" : case "rm"  : flag = this.linked.snd; break;
					case "mpg" : case "mpeg" : case "avi" : 
					case "ram" : case "rm"   : case "mov" : case "wmv" : flag = this.linked.mov; break;
					case "zip" : case "lzh"  : case "rar" :	case "xpi" : flag = this.linked.arc; break;
					default : if ( this.linked.seq ) this.linkURLs.push(aNode.href);
				}
				if ( flag || this.linked.all ) {
					var aFileName = this.download(aNode.href);
					if (aFileName) aNode.setAttribute("href", aFileName);
				} else {
					aNode.setAttribute("href", aNode.href);
				}
				break;

			case "form" : 
				aNode.setAttribute("action", SBcommon.resolveURL(this.refURLObj.spec, aNode.action));
				break;

			case "meta" : 
				if ( SBcommon.getBoolPref("scrapbook.capture.utf8encode", true) )
				{
					if ( aNode.hasAttribute("http-equiv") && aNode.hasAttribute("content") &&
					     aNode.getAttribute("http-equiv").toLowerCase() == "content-type" && 
					     aNode.getAttribute("content").match(/charset\=/i) )
					{
						aNode = this.removeNodeFromParent(aNode);
						return aNode;
					}
				}
				break;

			case "frame"  : 
			case "iframe" : 
				if ( this.selection ) {
					aNode.setAttribute("src", aNode.src);
					break;
				}
				try {
					var newFileName = this.saveDocument(this.frameList[this.frameNumber++].document, "index" + this.frameNumber);
					aNode.setAttribute("src", newFileName);
				} catch(ex) {
					alert("ScrapBook ERROR: Failed to get document in a frame.");
				}
				break;

		}

		var newCSStext = this.inspectCSSText(aNode.style.cssText, this.refURLObj.spec);
		if ( newCSStext ) aNode.setAttribute("style", newCSStext);

		if ( SBcommon.getBoolPref("scrapbook.capture.removescript", true) )
		{
			aNode.removeAttribute("onmouseover");
			aNode.removeAttribute("onmouseout");
			aNode.removeAttribute("onload");
		}

		return aNode;
	},


	processCSSRecursively : function(aCSS)
	{
		var content = "";

		if ( aCSS.disabled ) return "";
		var medium = aCSS.media.mediaText;
		if ( !medium.match("screen|all", "i") && medium != "" )
		{
			return "";
		}

		var flag = false;
		for ( var i=0; i<aCSS.cssRules.length; i++ )
		{
			if ( aCSS.cssRules[i].type == 1 || aCSS.cssRules[i].type == 4 )
			{
				if ( !flag ) { content += "\n/* ::::: " + aCSS.href + " ::::: */\n\n"; flag = true; }
				content += this.inspectCSSText(aCSS.cssRules[i].cssText, aCSS.href) + "\n";
			}
			else if ( aCSS.cssRules[i].type == 3 )
			{
				content += this.processCSSRecursively(aCSS.cssRules[i].styleSheet);
			}
		}
		return content;
	},


	inspectCSSText : function(aCSStext, aCSShref)
	{
		if ( !aCSStext ) return;
		var RE = new RegExp(/ url\(([^\'\)]+)\)/);
		var i = 0;
		while ( aCSStext.match(RE) )
		{
			if ( ++i > 10 ) break;
			var imgURL  = SBcommon.resolveURL(aCSShref, RegExp.$1);
			var imgFile = this.download(imgURL);
			aCSStext = aCSStext.replace(RE, " url('" + imgFile + "')");
		}
		aCSStext = aCSStext.replace(/([^\{\}])(\r|\n)/g, "$1\\A");
		RE = new RegExp(/ content: [\"\'](.*?)[\"\']; /);
		if ( aCSStext.match(RE) )
		{
			var innerQuote = RegExp.$1;
			innerQuote = innerQuote.replace(/\"/g, '\\"');
			innerQuote = innerQuote.replace(/\\[\"\'] attr\(([^\)]+)\) \\[\"\']/g, '" attr($1) "');
			aCSStext = aCSStext.replace(RE, ' content: "' + innerQuote + '"; ');
		}
		aCSStext = aCSStext.replace(/ quotes: [^;]+; /g, " ");
		if ( aCSStext.match(/ background: /i) )
		{
			aCSStext = aCSStext.replace(/ -moz-background-[^:]+: initial;/g, "");
			aCSStext = aCSStext.replace(/ scroll 0%/, "");
			aCSStext = aCSStext.replace(/ no-repeat scroll 0px;/g, " no-repeat 0px 0px;");
		}
		return aCSStext;
	},


	download : function(aURLSpec)
	{
		if ( !aURLSpec ) return;

		aURLSpec = SBcommon.resolveURL(this.refURLObj.spec, aURLSpec);

		try {
			var aURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
			aURL.spec = aURLSpec;
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to download: " + aURLSpec);
			return;
		}
		var newFileName = aURL.fileName;

		if ( !newFileName ) newFileName = "untitled";
		newFileName = SBcommon.validateFileName(newFileName);

		if ( this.file2URL[newFileName] == undefined )
		{
		}
		else if ( this.file2URL[newFileName] != aURLSpec )
		{
			var seq = 1;
			var fileLR = SBcommon.splitFileName(newFileName);
			while ( this.file2URL[ fileLR[0] + "_" + SBcommon.leftZeroPad3(seq) + "." + fileLR[1] ] != undefined ) { seq++; }
			newFileName = fileLR[0] + "_" + SBcommon.leftZeroPad3(seq) + "." + fileLR[1];
		}
		else
		{
			return newFileName;
		}

		if ( aURL.schemeIs("http") || aURL.schemeIs("https") || aURL.schemeIs("ftp") )
		{
			var targetFile = this.contentDir.clone();
			targetFile.append(newFileName);
			try {
				var WBP = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);
				WBP.persistFlags |= WBP.PERSIST_FLAGS_FROM_CACHE;
				WBP.saveURI(aURL, null, this.refURLObj, null, null, targetFile);
				this.httpTask[this.item.id]++;
				WBP.progressListener = new SBdownloadListener(this.item, newFileName);
				this.file2URL[newFileName] = aURLSpec;
				return newFileName;
			}
			catch(ex) {
				dump("*** SCRAPBOOK_PERSIST_FAILURE: " + aURLSpec + "\n" + ex + "\n");
				this.httpTask[this.item.id]--;
				return "";
			}
		}
		else if ( aURL.schemeIs("file") )
		{
			var targetDir = this.contentDir.clone();
			try {
				var orgFile = SBcommon.convertURLToFile(aURLSpec);
				if ( !orgFile.isFile() ) return;
				orgFile.copyTo(targetDir, newFileName);
				this.file2URL[newFileName] = aURLSpec;
				return newFileName;
			}
			catch(ex) {
				dump("*** SCRAPBOOK_COPY_FAILURE: " + aURLSpec + "\n" + ex + "\n");
				return "";
			}
		}
	},


	convertJavaScriptLink : function(aNode, aAttr)
	{
		var val = aNode.getAttribute(aAttr);
		if ( !val.match(/\(\'([^\']+)\'/) ) return aNode;
		val = RegExp.$1;
		if ( val.indexOf("/") == -1 && val.indexOf(".") == -1 ) return aNode;
		val = SBcommon.resolveURL(this.refURLObj.spec, val);
		if ( aNode.nodeName.toLowerCase() == "img" )
		{
			if ( aNode.parentNode.nodeName.toLowerCase() == "a" ) {
				aNode.parentNode.setAttribute("href", val);
				aNode.removeAttribute("onclick");
			} else {
				val = "window.open('" + val + "');";
				aNode.setAttribute(aAttr, val);
			}
		}
		else
		{
			aNode.setAttribute("href", val);
			aNode.removeAttribute("onclick");
		}
		return aNode;
	},


	notifyOnComplete : function(aID, aIcon, aTitle)
	{
		if ( SBcommon.getBoolPref("scrapbook.capture.notify", false) )
		{
			window.openDialog(
				"chrome://scrapbook/content/notify.xul", "", "alwaysRaised,dependent,titlebar=no",
				aID, aIcon, ( aTitle.length > 40 ) ? aTitle.substring(0,40) + "..." : aTitle
			);
		}
	}


};



function SBdownloadListener(aSBitem, aFileName)
{
	this.item     = { id : aSBitem.id, icon : aSBitem.icon, title : aSBitem.title };
	this.fileName = aFileName;
	this.callback = SBdownloadListenerCallback;
}

SBdownloadListener.prototype = {

	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
		if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP )
		{
			if ( --SBcapture.httpTask[this.item.id] == 0 ) {
				this.callback.onCompleteAllDownloads(this.item);
			} else {
				this.callback.onCompleteDownload(this.item);
			}
		}
	},
	onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
	{
		if ( aCurTotalProgress == aMaxTotalProgress ) return;
		var progress = (aMaxSelfProgress > 0) ? Math.round(aCurSelfProgress / aMaxSelfProgress * 100) + "%" : aCurSelfProgress + "Bytes";
		this.callback.onProgressDownload(this.item, this.fileName, progress);
	},
	onStatusChange   : function() {},
	onLocationChange : function() {},
	onSecurityChange : function() {},
};


var SBdownloadListenerCallback = {

	onCompleteDownload : function(aItem)
	{
		try {
			top.window.document.getElementById("sidebar").contentWindow.SBstatus.httpBusy(SBcapture.httpTask[aItem.id], aItem.title);
		} catch(ex) {
		}
	},
	onCompleteAllDownloads : function(aItem)
	{
		try {
			top.window.document.getElementById("sidebar").contentWindow.SBstatus.httpComplete(aItem.title);
		} catch(ex) {
		}
		SBcapture.notifyOnComplete(aItem.id, aItem.icon, aItem.title);
	},
	onProgressDownload : function(aItem, aFileName, aProgress)
	{
		try {
			top.window.document.getElementById("sidebar").contentWindow.SBstatus.httpBusy(SBcapture.httpTask[aItem.id], aProgress + " : " + aFileName);
		} catch(ex) {
		}
	},
};


