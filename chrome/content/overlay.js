/**************************************************
// overlay.js
// Implementation file for overlay.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



function SBcapture_initContextMenu()
{
	var myWindow = document.commandDispatcher.focusedWindow;
	if ( !myWindow || myWindow == window ) myWindow = window._content;
	var mySelection = myWindow.__proto__.getSelection.call(myWindow);
	var isSelected;
	try {
		isSelected = ( mySelection.anchorNode.isSameNode(mySelection.focusNode) && mySelection.anchorOffset == mySelection.focusOffset ) ? false : true;
	} catch(err) {
		isSelected = false;
	}
	document.getElementById("ScrapBookContextMenu1").hidden = !isSelected;
	document.getElementById("ScrapBookContextMenu2").hidden = !isSelected;
	document.getElementById("ScrapBookContextMenu3").hidden = isSelected;
	document.getElementById("ScrapBookContextMenu4").hidden = isSelected;
}


function SBcapture_onPopupShowing()
{
	document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", SBcapture_initContextMenu, true);
	document.getElementById("contentAreaContextMenu").addEventListener("popupshowing",    SBcapture_initContextMenu, true);
}


window.removeEventListener("load",   SBcapture_onPopupShowing, true);
window.removeEventListener("unload", SBcapture_onPopupShowing, true);
window.addEventListener("load",   SBcapture_onPopupShowing, true);
window.addEventListener("unload", SBcapture_onPopupShowing, true);



var SB_lastFocusedURL = "";

function SB_initStatusbarPanel()
{
	try {
		var curURL = window._content.location.href;
	} catch(ex) {
		return;
	}
	if ( curURL != SB_lastFocusedURL ) {
		var isEditable = ( curURL.match(/^file/) && curURL.match(/\/data\/\d{14}\/index\.html$/) );
		document.getElementById("ScrapBookStatusPanel").src    = isEditable ? "chrome://scrapbook/skin/status_edit.png" : "";
		document.getElementById("ScrapBookStatusPanel").hidden = !isEditable;
		SB_lastFocusedURL = curURL;
	}
}


window.removeEventListener("load" , SB_initStatusbarPanel, true);
window.removeEventListener("focus", SB_initStatusbarPanel, true);
window.addEventListener("load" , SB_initStatusbarPanel, true);
window.addEventListener("focus", SB_initStatusbarPanel, true);



var SBcapture = {


	item       : {},
	linked     : {},
	resource   : {},
	exchange   : {},
	fileList   : {},
	httpTask   : {},
	contentDir : null,
	referrer   : null,
	partial    : false,


	doCaptureDocument : function(SELECTION_ONLY, DETAIL_DIALOG, RESOURCE_NAME, RESOURCE_INDEX)
	{
		this.item = new ScrapBookItem(SBcommon.getTimeStamp());
		this.contentDir = null;
		this.referrer = null;
		this.fileList = { 'index.html' : true, 'index.css' : true, 'index.txt' : true };
		this.linked   = { img : false, snd : false, mov : false, arc : false, all : false };
		this.resource = { name : RESOURCE_NAME, index : RESOURCE_INDEX };
		this.exchange = { cancel : false, htmltitle : null };
		this.partial  = SELECTION_ONLY;

		SBRDF.init();

		var myWindow = document.commandDispatcher.focusedWindow;
		if ( !myWindow || myWindow == window ) myWindow = window._content;
		var mySelection = myWindow.__proto__.getSelection.call(myWindow);

		this.item.chars  = myWindow.document.characterSet;
		this.item.source = myWindow.document.location.href;
		try {
			this.item.icon = document.getElementById("content").selectedTab.getAttribute("image");
		} catch(err) {
		}

		if ( SELECTION_ONLY )
		{
			try {
				this.item.title = mySelection.toString().split("\n")[0].replace(/\r|\n|\t/gm, "");
				if ( !this.item.title || this.item.title.length < 3 ) this.item.title = mySelection.toString().split("\n")[1].replace(/\r|\n|\t/gm, "");
				if ( !this.item.title || this.item.title.length < 3 ) this.item.title = mySelection.toString().split("\n")[2].replace(/\r|\n|\t/gm, "");
				if ( this.item.title.length > 50 ) this.item.title = this.item.title.substring(0,50) + "...";
			} catch(err) {
				this.item.title = myWindow.document.title;
				if ( !this.item.title ) this.item.title = this.item.source;
			}
		}
		else
		{
			this.item.title = myWindow.document.title;
			if ( !this.item.title ) this.item.title = this.item.source;
		}


		if ( DETAIL_DIALOG )
		{
			this.exchange.htmltitle = myWindow.document.title;
			window.openDialog('chrome://scrapbook/content/detail.xul','','modal,centerscreen,chrome');
			if ( this.exchange.cancel ) return;
			if ( this.resource.name != RESOURCE_NAME ) this.resource.index = 0;
		}

		if ( myWindow.document.contentType.substring(0,5) == "image" ) { this.doCaptureImage(); return; }


		if ( SELECTION_ONLY )
		{
			var myRange = mySelection.getRangeAt(0);
			var myDocFrag = myRange.cloneContents();
			var curNode = myRange.commonAncestorContainer;
			if ( curNode.nodeName == "#text" ) curNode = curNode.parentNode;
		}

		var tmpNodeList = [];
		if ( SELECTION_ONLY )
		{
			do {
				tmpNodeList.unshift(curNode.cloneNode(false));
				curNode = curNode.parentNode;
			}
			while ( curNode.nodeName.toLowerCase() != "html" );
		}
		else
		{
			try {
				tmpNodeList.unshift(myWindow.document.getElementsByTagName("body")[0].cloneNode(true));
			} catch(err) {
				alert("ScrapBook ERROR: Failed to get focused frame.");
				return;
			}
		}

		var rootNode = myWindow.document.getElementsByTagName("html")[0].cloneNode(false);
		var headNode = myWindow.document.getElementsByTagName("head")[0].cloneNode(true);

		rootNode.appendChild(headNode);
		rootNode.appendChild(document.createTextNode("\n"));

		rootNode.appendChild(tmpNodeList[0]);
		rootNode.appendChild(document.createTextNode("\n"));
		for ( var n = 0; n < tmpNodeList.length-1; n++ )
		{
			tmpNodeList[n].appendChild(document.createTextNode("\n"));
			tmpNodeList[n].appendChild(tmpNodeList[n+1]);
			tmpNodeList[n].appendChild(document.createTextNode("\n"));
		}

		if ( SELECTION_ONLY )
		{
			this.addCommentTag(tmpNodeList[tmpNodeList.length-1], "DOCUMENT_FRAGMENT");
			tmpNodeList[tmpNodeList.length-1].appendChild(myDocFrag);
			this.addCommentTag(tmpNodeList[tmpNodeList.length-1], "/DOCUMENT_FRAGMENT");
		}



		this.contentDir = SBcommon.getContentDir(this.item.id);
		this.referrer   = SBcommon.convertURLToObject(this.item.source);
		this.httpTask[this.item.id] = 0;

		var localIconURL;
		if ( this.item.icon )
		{
			var iconFileName = this.saveURLtoFile(this.item.icon);
			localIconURL = SBservice.IO.newFileURI(this.contentDir).spec + iconFileName;
		}

		this.processDOMRecursively(rootNode);


		var myCSScontent = "/* THIS FILE IS AUTOMATICALLY GENERATED BY SCRAPBOOK */\n";
		var myCSS = myWindow.document.styleSheets;
		for ( var i=0; i<myCSS.length; i++ )
		{
			myCSScontent += this.processCSSRecursively(myCSS[i]);
		}

		var newLinkNode = document.createElement("link");
		newLinkNode.setAttribute("media", "all");
		newLinkNode.setAttribute("href", "index.css");
		newLinkNode.setAttribute("type", "text/css");
		newLinkNode.setAttribute("rel", "stylesheet");
		rootNode.firstChild.appendChild(document.createTextNode("\n"));
		rootNode.firstChild.appendChild(newLinkNode);
		rootNode.firstChild.appendChild(document.createTextNode("\n"));


		if ( nsPreferences.getBoolPref("scrapbook.utf8encode", true) )
		{
			this.item.chars = "UTF-8";
			var newMetaNode = document.createElement("meta");
			newMetaNode.setAttribute("content", myWindow.document.contentType + "; charset=" + this.item.chars);
			newMetaNode.setAttribute("http-equiv", "Content-Type");
			rootNode.firstChild.insertBefore(newMetaNode, rootNode.firstChild.firstChild);
			rootNode.firstChild.insertBefore(document.createTextNode("\n"), rootNode.firstChild.firstChild);
		}


		if ( this.httpTask[this.item.id] == 0 ) this.notifyOnComplete(this.item.id, this.item.title, this.item.icon);

		this.item.content = this.surroundByTags(rootNode, rootNode.innerHTML);
		this.item.content = this.doctypeToString(myWindow.document.doctype) + this.item.content;
		this.item.content = this.item.content.replace(/\x00/g, " ");

		var myFile = this.contentDir.clone();
		myFile.append("index.html");
		SBcommon.writeFile(myFile, this.item.content, this.item.chars);

		var myCSSfile = this.contentDir.clone();
		myCSSfile.append("index.css");
		SBcommon.writeFile(myCSSfile, myCSScontent, this.item.chars);

		var myRes = SBRDF.addItem(this.item, this.resource.name, this.resource.index);

		if ( localIconURL ) setTimeout(function() { SBRDF.updateItem(myRes, "icon", localIconURL); }, 300);

		return true;
	},


	doCaptureImage : function()
	{
		this.contentDir = SBcommon.getContentDir(this.item.id);
		this.httpTask[this.item.id] = 0;
		var imgFileName = this.saveURLtoFile(this.item.source);
		this.item.title = imgFileName;
		this.item.content = "<html><body><img src=\"" + imgFileName + "\"/></body></html>\n";
		var myFile = this.contentDir.clone();
		myFile.append("index.html");
		SBcommon.writeFile(myFile, this.item.content, this.item.chars);
		var myRes = SBRDF.addItem(this.item, this.resource.name, this.resource.index);
		return true;
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
				var aFileName = this.saveURLtoFile(aNode.src);
				if (aFileName) aNode.setAttribute("src", aFileName);
				break;

			case "object" : 
				var aFileName = this.saveURLtoFile(aNode.data);
				if (aFileName) aNode.setAttribute("data", aFileName);
				break;

			case "body" : 
			case "table" : 
			case "td" : 
				var aFileName = this.saveURLtoFile(aNode.getAttribute("background"));
				if (aFileName) aNode.setAttribute("background", aFileName);
				break;

			case "input" : 
				if ( aNode.type.toLowerCase() == "image" ) {
					var aFileName = this.saveURLtoFile(aNode.src);
					if (aFileName) aNode.setAttribute("src", aFileName);
				}
				break;

			case "link" : 
				if ( aNode.rel.toLowerCase() == "stylesheet" ) {
					aNode = this.removeNodeFromParent(aNode);
					return aNode;
				} else if ( aNode.rel.toLowerCase() == "shortcut icon" ) {
					var aFileName = this.saveURLtoFile(aNode.href);
					if (aFileName) aNode.setAttribute("href", aFileName);
				} else {
					aNode.setAttribute("href", aNode.href);
				}
				break;

			case "base" : 
			case "style" : 
			case "script" : 
			case "noscript" : 
				aNode = this.removeNodeFromParent(aNode);
				return aNode;
				break;

			case "a" : 
			case "area" : 
				if ( !aNode.hasAttribute("href") ) return aNode;
				if ( !this.partial && aNode.getAttribute("href").charAt(0) == "#" ) return aNode;
				var ext = SBcommon.splitFileName(SBcommon.getFileName(aNode.href))[1];
				var flag = false;
				switch ( ext.toLowerCase() ) {
					case "jpg" : case "jpeg" : case "png" : case "gif" :	flag = this.linked.img; break;
					case "mp3" : case "wav"  : case "ram" : 				flag = this.linked.snd; break;
					case "mpg" : case "mpeg" : case "avi" : 
					case "ram" : case "rm"   : case "mov" : case "wmv" :	flag = this.linked.mov; break;
					case "zip" : case "lzh"  : case "rar" :	case "xpi" :	flag = this.linked.arc; break;
				}
				if ( flag || this.linked.all ) {
					var aFileName = this.saveURLtoFile(aNode.href);
					if (aFileName) aNode.setAttribute("href", aFileName);
				} else {
					aNode.setAttribute("href", aNode.href);
				}
				break;

			case "iframe" : 
				aNode.setAttribute("src", aNode.src);
				break;

			case "form" : 
				aNode.setAttribute("action", SBcommon.resolveURL(this.item.source, aNode.action));
				break;

			case "meta" : 
				if ( nsPreferences.getBoolPref("scrapbook.utf8encode", true) )
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

		}

		var newCSStext = this.inspectCSSText(aNode.style.cssText, this.item.source);
		if ( newCSStext ) aNode.setAttribute("style", newCSStext);

		aNode.removeAttribute("onmouseover");
		aNode.removeAttribute("onmouseout");

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
			var imgFile = this.saveURLtoFile(imgURL);
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
		}
		return aCSStext;
	},


	saveURLtoFile : function(aURLString)
	{
		if ( !aURLString ) return;

		aURLString = SBcommon.resolveURL(this.item.source, aURLString);

		try {
			var aURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
			aURL.spec = aURLString;
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to save " + aURLString);
			return;
		}
		var newFileName = aURL.fileName;

		if ( !newFileName ) newFileName = "untitled";
		newFileName = SBcommon.validateFileName(newFileName);

		if ( this.fileList[newFileName] == undefined )
		{
		}
		else if ( this.fileList[newFileName] != aURLString )
		{
			var seq = 1;
			var fileLR = SBcommon.splitFileName(newFileName);
			while ( this.fileList[ fileLR[0] + "_" + SBcommon.leftZeroPad3(seq) + "." + fileLR[1] ] != undefined ) { seq++; }
			newFileName = fileLR[0] + "_" + SBcommon.leftZeroPad3(seq) + "." + fileLR[1];
		}
		else
		{
			return newFileName;
		}

		if ( aURL.schemeIs("http") || aURL.schemeIs("https") )
		{
			var targetFile = this.contentDir.clone();
			targetFile.append(newFileName);
			try
			{
				var WBP = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);
				WBP.persistFlags |= WBP.PERSIST_FLAGS_FROM_CACHE;
				WBP.saveURI(aURL, null, this.referrer, null, null, targetFile);
				this.httpTask[this.item.id]++;
				WBP.progressListener = 
				{
					id    : this.item.id,
					title : this.item.title,
					icon  : this.item.icon,
					onStateChange : function()
					{
						if ( WBP.currentState == WBP.PERSIST_STATE_FINISHED )
						{
							try {
								top.window.document.getElementById("sidebar").contentWindow.SBstatus.httpBusy(SBcapture.httpTask[this.id], this.title);
							} catch(ex) {
							}
							if ( --SBcapture.httpTask[this.id] == 0 )
							{
								try {
									top.window.document.getElementById("sidebar").contentWindow.SBstatus.httpComplete(this.title);
								} catch(ex) {
								}
								SBcapture.notifyOnComplete(this.id, this.title, this.icon);
							}
						}
					},
					onProgressChange : function() {},
					onStatusChange   : function() {},
					onLocationChange : function() {},
					onSecurityChange : function() {}
				};
				this.fileList[newFileName] = aURLString;
				return newFileName;
			}
			catch(ex)
			{
				dump("*** SCRAPBOOK_PERSIST_FAILURE: " + aURLString + "\n");
				this.httpTask[this.item.id]--;
				return "";
			}
		}
		else if ( aURL.schemeIs("file") )
		{
			var targetDir = this.contentDir.clone();
			try
			{
				var orgFile = SBcommon.convertURLToFile(aURLString);
				if ( !orgFile.isFile() ) return;
				orgFile.copyTo(targetDir, newFileName);
				this.fileList[newFileName] = aURLString;
				return newFileName;
			}
			catch(err)
			{
				dump("*** SCRAPBOOK_COPY_FAILURE: " + aURLString + "\n");
				return "";
			}
		}
	},


	notifyOnComplete : function(aID, aTitle, aIcon)
	{
		if ( nsPreferences.getBoolPref("scrapbook.notification", false) == false ) return;
		window.openDialog(
			"chrome://scrapbook/content/notify.xul", "", "alwaysRaised,dependent,titlebar=no",
			aID, aIcon, ( aTitle.length > 40 ) ? aTitle.substring(0,40) + "..." : aTitle
		);
	}


};


