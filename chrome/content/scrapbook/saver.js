
var sbContentSaver = {


	name         : "",
	item         : null,
	contentDir   : null,
	httpTask     : {},
	file2URL     : {},
	option       : {},
<<<<<<< HEAD
	plusoption   : {},
=======
>>>>>>> release-1.6.0.a1
	refURLObj    : null,
	favicon      : null,
	frameList    : [],
	frameNumber  : 0,
	selection    : null,
	linkURLs     : [],
<<<<<<< HEAD
	_fxVer35     : null,
	_fxVer18     : null,
=======
>>>>>>> release-1.6.0.a1



	flattenFrames : function(aWindow)
	{
		var ret = [aWindow];
		for ( var i = 0; i < aWindow.frames.length; i++ )
		{
			ret = ret.concat(this.flattenFrames(aWindow.frames[i]));
		}
		return ret;
	},

	init : function(aPresetData)
	{
<<<<<<< HEAD
		if ( this._fxVer35 == null )
		{
			var iAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
			var iVerComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
			this._fxVer35 = iVerComparator.compare(iAppInfo.version, "3.5")>=0;
			this._fxVer18 = iVerComparator.compare(iAppInfo.version, "18.0")>=0;
		}
		this.item = sbCommonUtils.newItem(sbDataSource.identify(sbCommonUtils.getTimeStamp()));
=======
		this.item = ScrapBookData.newItem();
>>>>>>> release-1.6.0.a1
		this.name = "index";
		this.favicon = null;
		this.file2URL = { "index.html" : true, "index.css" : true, "index.dat" : true, "index.png" : true, "sitemap.xml" : true, "sb-file2url.txt" : true, "sb-url2name.txt" : true, };
		this.option   = { "dlimg" : false, "dlsnd" : false, "dlmov" : false, "dlarc" : false, "custom" : "", "inDepth" : 0, "isPartial" : false, "images" : true, "styles" : true, "script" : false };
<<<<<<< HEAD
		this.plusoption = { "method" : "SB", "timeout" : "0", "charset" : "UTF-8" }
=======
>>>>>>> release-1.6.0.a1
		this.linkURLs = [];
		this.frameList = [];
		this.frameNumber = 0;
		if ( aPresetData )
		{
			if ( aPresetData[0] ) this.item.id  = aPresetData[0];
			if ( aPresetData[1] ) this.name     = aPresetData[1];
			if ( aPresetData[2] ) this.option   = aPresetData[2];
			if ( aPresetData[3] ) this.file2URL = aPresetData[3];
			if ( aPresetData[4] >= this.option["inDepth"] ) this.option["inDepth"] = 0;
		}
		this.httpTask[this.item.id] = 0;
	},

<<<<<<< HEAD
	captureWindow : function(aRootWindow, aIsPartial, aShowDetail, aResName, aResIndex, aPresetData, aContext, aTitle)
	{
		if ( !sbDataSource.data ) sbDataSource.init();
		this.init(aPresetData);
		this.item.chars  = aRootWindow.document.characterSet;
		this.item.source = aRootWindow.location.href;
		//Favicon der angezeigten Seite bestimmen (Unterscheidung zwischen FF2 und FF3 notwendig!)
		if ( "gBrowser" in window && aRootWindow == gBrowser.contentWindow )
		{
			this.item.icon = gBrowser.mCurrentBrowser.mIconURL;
		}
		this.frameList = this.flattenFrames(aRootWindow);
		var titles = aRootWindow.document.title ? [aRootWindow.document.title] : [this.item.source];
		if ( aTitle ) titles[0] = aTitle;
=======
	captureWindow : function(aRootWindow, aIsPartial, aShowDetail, aResName, aResIndex, aPresetData, aContext)
	{
		this.init(aPresetData);
		this.item.chars  = aRootWindow.document.characterSet;
		this.item.source = aRootWindow.location.href;
		if ( "gBrowser" in window && aRootWindow == gBrowser.contentWindow )
		{
			this.item.icon = gBrowser.mCurrentTab.image;
		}
		this.frameList = this.flattenFrames(aRootWindow);
		var titles = aRootWindow.document.title ? [aRootWindow.document.title] : [this.item.source];
>>>>>>> release-1.6.0.a1
		if ( aIsPartial )
		{
			this.selection = aRootWindow.getSelection();
			var lines = this.selection.toString().split("\n");
			for ( var i = 0; i < lines.length; i++ )
			{
				lines[i] = lines[i].replace(/\r|\n|\t/g, "");
				if ( lines[i].length > 0 ) titles.push(lines[i].substring(0,72));
				if ( titles.length > 4 ) break;
			}
			this.item.title = ( titles.length > 0 ) ? titles[1] : titles[0];
		}
		else
		{
			this.selection = null;
			this.item.title = titles[0];
		}
		if ( document.getElementById("ScrapBookToolbox") && !document.getElementById("ScrapBookToolbox").hidden )
		{
			var modTitle = document.getElementById("ScrapBookEditTitle").value;
			if ( titles.indexOf(modTitle) < 0 )
			{
				titles.splice(1, 0, modTitle);
				this.item.title = modTitle;
			}
<<<<<<< HEAD
			this.item.comment = sbCommonUtils.escapeComment(sbPageEditor.COMMENT.value);
=======
			this.item.comment = ScrapBookUtils.escapeComment(sbPageEditor.COMMENT.value);
>>>>>>> release-1.6.0.a1
			for ( var i = 0; i < this.frameList.length; i++ ) { sbPageEditor.removeAllStyles(this.frameList[i]); }
		}
		if ( aShowDetail )
		{
			var ret = this.showDetailDialog(titles, aResName, aContext);
			if ( ret.result == 0 ) { return null; }
			if ( ret.result == 2 ) { aResName = ret.resURI; aResIndex = 0; }
		}
<<<<<<< HEAD
		this.contentDir = sbCommonUtils.getContentDir(this.item.id);
=======
		this.contentDir = ScrapBookUtils.getContentDir(this.item.id);
>>>>>>> release-1.6.0.a1
		this.saveDocumentInternal(aRootWindow.document, this.name);
		if ( this.item.icon && this.item.type != "image" && this.item.type != "file" )
		{
			var iconFileName = this.download(this.item.icon);
			this.favicon = iconFileName;
		}
		if ( this.httpTask[this.item.id] == 0 )
		{
			setTimeout(function(){ sbCaptureObserverCallback.onCaptureComplete(sbContentSaver.item); }, 100);
		}
		if ( this.option["inDepth"] > 0 && this.linkURLs.length > 0 )
		{
			if ( !aPresetData || aContext == "capture-again" )
			{
				this.item.type = "marked";
				this.option["isPartial"] = aIsPartial;
				window.openDialog(
					"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,dialog=no",
					this.linkURLs, this.refURLObj.spec,
					false, null, 0,
<<<<<<< HEAD
					this.item, this.option, this.file2URL, null, this.plusoption["method"], this.plusoption["charset"], this.plusoption["timeout"]
=======
					this.item, this.option, this.file2URL
>>>>>>> release-1.6.0.a1
				);
			}
			else
			{
				for ( var i = 0; i < this.linkURLs.length; i++ )
				{
					sbCaptureTask.add(this.linkURLs[i], aPresetData[4] + 1);
				}
			}
		}
		this.addResource(aResName, aResIndex);
<<<<<<< HEAD
		this.frameList = null;
=======
>>>>>>> release-1.6.0.a1
		return [this.name, this.file2URL];
	},

	captureFile : function(aSourceURL, aReferURL, aType, aShowDetail, aResName, aResIndex, aPresetData, aContext)
	{
<<<<<<< HEAD
		if ( !sbDataSource.data ) sbDataSource.init();
		this.init(aPresetData);
		this.item.title  = sbCommonUtils.getFileName(aSourceURL);
=======
		this.init(aPresetData);
		this.item.title  = ScrapBookUtils.getFileName(aSourceURL);
>>>>>>> release-1.6.0.a1
		this.item.icon   = "moz-icon://" + this.item.title + "?size=16";
		this.item.source = aSourceURL;
		this.item.type   = aType;
		if ( aShowDetail )
		{
			var ret = this.showDetailDialog(null, aResName, aContext);
			if ( ret.result == 0 ) { return null; }
			if ( ret.result == 2 ) { aResName = ret.resURI; aResIndex = 0; }
		}
<<<<<<< HEAD
		this.contentDir = sbCommonUtils.getContentDir(this.item.id);
		this.refURLObj  = sbCommonUtils.convertURLToObject(aReferURL);
=======
		this.contentDir = ScrapBookUtils.getContentDir(this.item.id);
		this.refURLObj  = ScrapBookUtils.convertURLToObject(aReferURL);
>>>>>>> release-1.6.0.a1
		this.saveFileInternal(aSourceURL, this.name, aType);
		this.addResource(aResName, aResIndex);
		return [this.name, this.file2URL];
	},

	showDetailDialog : function(aTitles, aResURI, aContext)
	{
		var ret = {
			item    : this.item,
			option  : this.option,
<<<<<<< HEAD
			poption : this.plusoption,
=======
>>>>>>> release-1.6.0.a1
			titles  : aTitles || [this.item.title],
			resURI  : aResURI,
			result  : 1,
			context : aContext || "capture"
		};
		window.openDialog("chrome://scrapbook/content/detail.xul" + (aContext ? "?capture" : ""), "", "chrome,modal,centerscreen,resizable", ret);
		return ret;
	},

	saveDocumentInternal : function(aDocument, aFileKey)
	{
		if ( !aDocument.body || !aDocument.contentType.match(/html|xml/i) )
		{
			var captureType = (aDocument.contentType.substring(0,5) == "image") ? "image" : "file";
			if ( this.frameNumber == 0 ) this.item.type = captureType;
			var newLeafName = this.saveFileInternal(aDocument.location.href, aFileKey, captureType);
			return newLeafName;
		}
<<<<<<< HEAD
		this.refURLObj = sbCommonUtils.convertURLToObject(aDocument.location.href);
=======
		this.refURLObj = ScrapBookUtils.convertURLToObject(aDocument.location.href);
>>>>>>> release-1.6.0.a1
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
			rootNode.appendChild(aDocument.createTextNode("\n"));
		} catch(ex) {
		}
		rootNode.appendChild(tmpNodeList[0]);
		rootNode.appendChild(aDocument.createTextNode("\n"));
		for ( var n = 0; n < tmpNodeList.length-1; n++ )
		{
			tmpNodeList[n].appendChild(aDocument.createTextNode("\n"));
			tmpNodeList[n].appendChild(tmpNodeList[n+1]);
			tmpNodeList[n].appendChild(aDocument.createTextNode("\n"));
		}
		if ( this.selection )
		{
			this.addCommentTag(tmpNodeList[tmpNodeList.length-1], "DOCUMENT_FRAGMENT");
			tmpNodeList[tmpNodeList.length-1].appendChild(myDocFrag);
			this.addCommentTag(tmpNodeList[tmpNodeList.length-1], "/DOCUMENT_FRAGMENT");
		}


		this.processDOMRecursively(rootNode);


		var myCSS = "";
		if ( this.option["styles"] )
		{
			var myStyleSheets = aDocument.styleSheets;
			for ( var i=0; i<myStyleSheets.length; i++ )
			{
				myCSS += this.processCSSRecursively(myStyleSheets[i], aDocument);
			}
			if ( myCSS )
			{
				var newLinkNode = aDocument.createElement("link");
				newLinkNode.setAttribute("media", "all");
				newLinkNode.setAttribute("href", aFileKey + ".css");
				newLinkNode.setAttribute("type", "text/css");
				newLinkNode.setAttribute("rel", "stylesheet");
				rootNode.firstChild.appendChild(aDocument.createTextNode("\n"));
				rootNode.firstChild.appendChild(newLinkNode);
				rootNode.firstChild.appendChild(aDocument.createTextNode("\n"));
				myCSS = myCSS.replace(/\*\|/g, "");
			}
		}


		this.item.chars = "UTF-8";
		var metaNode = aDocument.createElement("meta");
		metaNode.setAttribute("content", aDocument.contentType + "; charset=" + this.item.chars);
		metaNode.setAttribute("http-equiv", "Content-Type");
		rootNode.firstChild.insertBefore(aDocument.createTextNode("\n"), rootNode.firstChild.firstChild);
		rootNode.firstChild.insertBefore(metaNode, rootNode.firstChild.firstChild);
		rootNode.firstChild.insertBefore(aDocument.createTextNode("\n"), rootNode.firstChild.firstChild);


		var myHTML;
		myHTML = this.surroundByTags(rootNode, rootNode.innerHTML);
		myHTML = this.doctypeToString(aDocument.doctype) + myHTML;
		myHTML = myHTML.replace(/\x00/g, " ");
		var myHTMLFile = this.contentDir.clone();
		myHTMLFile.append(aFileKey + ".html");
<<<<<<< HEAD
		sbCommonUtils.writeFile(myHTMLFile, myHTML, this.item.chars);
=======
		ScrapBookUtils.writeFile(myHTMLFile, myHTML, this.item.chars);
>>>>>>> release-1.6.0.a1
		if ( myCSS )
		{
			var myCSSFile = this.contentDir.clone();
			myCSSFile.append(aFileKey + ".css");
<<<<<<< HEAD
			sbCommonUtils.writeFile(myCSSFile, myCSS, this.item.chars);
=======
			ScrapBookUtils.writeFile(myCSSFile, myCSS, this.item.chars);
>>>>>>> release-1.6.0.a1
		}
		return myHTMLFile.leafName;
	},

	saveFileInternal : function(aFileURL, aFileKey, aCaptureType)
	{
		if ( !aFileKey ) aFileKey = "file" + Math.random().toString();
<<<<<<< HEAD
		if ( !this.refURLObj ) this.refURLObj = sbCommonUtils.convertURLToObject(aFileURL);
		if ( this.frameNumber == 0 )
		{
			this.item.icon  = "moz-icon://" + sbCommonUtils.getFileName(aFileURL) + "?size=16";
=======
		if ( !this.refURLObj ) this.refURLObj = ScrapBookUtils.convertURLToObject(aFileURL);
		if ( this.frameNumber == 0 )
		{
			this.item.icon  = "moz-icon://" + ScrapBookUtils.getFileName(aFileURL) + "?size=16";
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		sbCommonUtils.writeFile(myHTMLFile, myHTML, "UTF-8");
=======
		ScrapBookUtils.writeFile(myHTMLFile, myHTML, "UTF-8");
>>>>>>> release-1.6.0.a1
		return myHTMLFile.leafName;
	},

	addResource : function(aResName, aResIndex)
	{
		if ( !aResName ) return;
<<<<<<< HEAD
		var res = sbDataSource.addItem(this.item, aResName, aResIndex);
		sbCommonUtils.rebuildGlobal();
=======
		var res = ScrapBookData.addItem(this.item, aResName, aResIndex);
		ScrapBookUtils.refreshGlobal(false);
>>>>>>> release-1.6.0.a1
		if ( this.favicon )
		{
			var iconURL = "resource://scrapbook/data/" + this.item.id + "/" + this.favicon;
			setTimeout(function(){
<<<<<<< HEAD
				sbDataSource.setProperty(res, "icon", iconURL); sbDataSource.flush();
			}, 500);
			this.item.icon = this.favicon;
		}
		sbCommonUtils.writeIndexDat(this.item);
		if ( "sbBrowserOverlay" in window ) sbBrowserOverlay.updateFolderPref(aResName);
=======
				ScrapBookData.setProperty(res, "icon", iconURL);
			}, 500);
			this.item.icon = this.favicon;
		}
		ScrapBookUtils.writeIndexDat(this.item);
		if ( "ScrapBookBrowserOverlay" in window ) ScrapBookBrowserOverlay.updateFolderPref(aResName);
>>>>>>> release-1.6.0.a1
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
		targetNode.appendChild(targetNode.ownerDocument.createTextNode("\n"));
		targetNode.appendChild(targetNode.ownerDocument.createComment(aComment));
		targetNode.appendChild(targetNode.ownerDocument.createTextNode("\n"));
	},

	removeNodeFromParent : function(aNode)
	{
		var newNode = aNode.ownerDocument.createTextNode("");
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
				if ( this.option["images"] ) {
					if ( aNode.hasAttribute("onclick") ) aNode = this.normalizeJSLink(aNode, "onclick");
					var aFileName = this.download(aNode.src);
					if (aFileName) aNode.setAttribute("src", aFileName);
					aNode.removeAttribute("livesrc");
				} else {
					return this.removeNodeFromParent(aNode);
				}
				break;
			case "object" : 
				if ( this.option["images"] ) {
					var aFileName = this.download(aNode.data);
					if (aFileName) aNode.setAttribute("data", aFileName);
				} else {
					return this.removeNodeFromParent(aNode);
				}
				break;
			case "body" : 
				if ( this.option["images"] ) {
					var aFileName = this.download(aNode.background);
					if (aFileName) aNode.setAttribute("background", aFileName);
				} else {
					aNode.removeAttribute("background");
					aNode.removeAttribute("bgcolor");
					aNode.removeAttribute("text");
				}
				break;
			case "table" : 
			case "tr" : 
			case "th" : 
			case "td" : 
				if ( this.option["images"] ) {
					var aFileName = this.download(aNode.getAttribute("background"));
					if (aFileName) aNode.setAttribute("background", aFileName);
				} else {
					aNode.removeAttribute("background");
					aNode.removeAttribute("bgcolor");
				}
				break;
			case "input" : 
				switch (aNode.type.toLowerCase()) {
					case "image": 
						if (this.option["images"]) {
							var aFileName = this.download(aNode.src);
							if (aFileName) aNode.setAttribute("src", aFileName);
						}
						else {
							aNode.removeAttribute("src");
							aNode.setAttribute("type", "button");
							if (aNode.hasAttribute("alt"))
								aNode.setAttribute("value", aNode.getAttribute("alt"));
						}
						break;
					case "text": 
						aNode.setAttribute("value", aNode.value);
						break;
					case "checkbox": 
					case "radio": 
						if (aNode.checked)
							aNode.setAttribute("checked", "checked");
						else
							aNode.removeAttribute("checked");
						break;
					default:
				}
				break;
			case "link" : 
				if ( aNode.rel.toLowerCase() == "stylesheet" && (aNode.href.indexOf("chrome") != 0 || !this.option["styles"]) ) {
					return this.removeNodeFromParent(aNode);
				} else if ( aNode.rel.toLowerCase() == "shortcut icon" || aNode.rel.toLowerCase() == "icon" ) {
					var aFileName = this.download(aNode.href);
					if (aFileName) aNode.setAttribute("href", aFileName);
					if ( this.frameNumber == 0 && !this.favicon ) this.favicon = aFileName;
				} else {
					aNode.setAttribute("href", aNode.href);
				}
				break;
			case "base" : 
				aNode.removeAttribute("href");
				if ( !aNode.hasAttribute("target") ) return this.removeNodeFromParent(aNode);
				break;
			case "style" : 
				return this.removeNodeFromParent(aNode);
				break;
			case "script" : 
			case "noscript" : 
				if ( this.option["script"] ) {
					if ( aNode.hasAttribute("src") ) {
						var aFileName = this.download(aNode.src);
						if (aFileName) aNode.setAttribute("src", aFileName);
					}
				} else {
					return this.removeNodeFromParent(aNode);
				}
				break;
			case "a" : 
			case "area" : 
				if ( aNode.hasAttribute("onclick") ) aNode = this.normalizeJSLink(aNode, "onclick");
				if ( !aNode.hasAttribute("href") ) return aNode;
				if ( aNode.target == "_blank" ) aNode.setAttribute("target", "_top");
				if ( aNode.href.match(/^javascript:/i) ) aNode = this.normalizeJSLink(aNode, "href");
				if ( !this.selection && aNode.getAttribute("href").charAt(0) == "#" ) return aNode;
<<<<<<< HEAD
				var ext = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(aNode.href))[1].toLowerCase();
				var dateiname = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(aNode.href))[0].toLowerCase();
				if (dateiname.search(":") >= 0)	ext = ext.toUpperCase();
=======
				var ext = ScrapBookUtils.splitFileName(ScrapBookUtils.getFileName(aNode.href))[1].toLowerCase();
>>>>>>> release-1.6.0.a1
				var flag = false;
				switch ( ext )
				{
					case "jpg" : case "jpeg" : case "png" : case "gif" : case "tiff" : flag = this.option["dlimg"]; break;
					case "mp3" : case "wav"  : case "ram" : case "rm"  : case "wma"  : flag = this.option["dlsnd"]; break;
					case "mpg" : case "mpeg" : case "avi" : case "mov" : case "wmv"  : flag = this.option["dlmov"]; break;
					case "zip" : case "lzh"  : case "rar" : case "jar" : case "xpi"  : flag = this.option["dlarc"]; break;
					default : if ( this.option["inDepth"] > 0 ) this.linkURLs.push(aNode.href);
				}
				if ( !flag && ext && this.option["custom"] )
				{
					if ( (", " + this.option["custom"] + ", ").indexOf(", " + ext + ", ") != -1 ) flag = true;
				}
				if ( aNode.href.indexOf("file://") == 0 && !aNode.href.match(/\.html(?:#.*)?$/) ) flag = true;
				if ( flag ) {
					var aFileName = this.download(aNode.href);
					if (aFileName) aNode.setAttribute("href", aFileName);
				} else {
					aNode.setAttribute("href", aNode.href);
				}
				break;
			case "form" : 
<<<<<<< HEAD
				aNode.setAttribute("action", sbCommonUtils.resolveURL(this.refURLObj.spec, aNode.action));
=======
				aNode.setAttribute("action", ScrapBookUtils.resolveURL(this.refURLObj.spec, aNode.action));
>>>>>>> release-1.6.0.a1
				break;
			case "meta" : 
				if ( aNode.hasAttribute("http-equiv") && aNode.hasAttribute("content") &&
				     aNode.getAttribute("http-equiv").toLowerCase() == "content-type" && 
				     aNode.getAttribute("content").match(/charset\=/i) )
				{
					return this.removeNodeFromParent(aNode);
				}
				break;
			case "frame"  : 
			case "iframe" : 
				if ( this.selection ) {
					this.selection = null;
					for ( var fn = this.frameNumber; fn < this.frameList.length; fn++ )
					{
						if ( aNode.src == this.frameList[fn].location.href ) { this.frameNumber = fn; break; }
					}
					this.frameNumber--;
				}
				var tmpRefURL = this.refURLObj;
				this.frameNumber++
				try {
					var newFileName = this.saveDocumentInternal(this.frameList[this.frameNumber].document, this.name + "_" + this.frameNumber);
					aNode.setAttribute("src", newFileName);
				} catch(ex) {
				}
				this.refURLObj = tmpRefURL;
				break;
			case "xmp" : 
<<<<<<< HEAD
				if ( aNode.firstChild )
				{
					var pre = aNode.ownerDocument.createElement("pre");
					pre.appendChild(aNode.firstChild);
					aNode.parentNode.replaceChild(pre, aNode);
				}
=======
				var pre = aNode.ownerDocument.createElement("pre");
				pre.appendChild(aNode.firstChild);
				aNode.parentNode.replaceChild(pre, aNode);
				break;
			case "source": 
				if (aNode.src)
					aNode.setAttribute("src", aNode.src);
>>>>>>> release-1.6.0.a1
				break;
		}
		if ( !this.option["styles"] )
		{
			aNode.removeAttribute("style");
		}
		else if ( aNode.style && aNode.style.cssText )
		{
			var newCSStext = this.inspectCSSText(aNode.style.cssText, this.refURLObj.spec, aNode.ownerDocument);
			if ( newCSStext ) aNode.setAttribute("style", newCSStext);
		}
		if ( !this.option["script"] )
		{
			aNode.removeAttribute("onmouseover");
			aNode.removeAttribute("onmouseout");
			aNode.removeAttribute("onload");
		}
		if (aNode.hasAttribute("_base_href")) {
			aNode.removeAttribute("_base_href");
		}
		return aNode;
	},

	processCSSRecursively : function(aCSS, aDocument)
	{
		var content = "";
<<<<<<< HEAD
		if ( !aCSS || aCSS.disabled ) return "";
		var medium = aCSS.media.mediaText;
		if ( medium != "" && medium.indexOf("screen") < 0 && medium.indexOf("all") < 0 ) return "";
		if ( aCSS.href && aCSS.href.indexOf("chrome") == 0 ) return "";
		if ( aCSS.href ) { content += (content ? "\n" : "") + "/* ::::: " + aCSS.href + " ::::: */\n\n"; }
		for ( var i=0; i<aCSS.cssRules.length; i++ )
		{
			if ( aCSS.cssRules[i].type == 1 || aCSS.cssRules[i].type == 4 || aCSS.cssRules[i].type == 5 )
			{
				var cssText = this.inspectCSSText(aCSS.cssRules[i].cssText, aCSS.href, aDocument);
				if ( cssText ) content += cssText+"\n";
			}
			else if ( aCSS.cssRules[i].type == 3 )
			{
				content += this.processCSSRecursively(aCSS.cssRules[i].styleSheet, aDocument);
			}
		}
=======
		if (!aCSS || aCSS.disabled) {
			return "";
		}
		var cssMedia = aCSS.media.mediaText;
		if (cssMedia && cssMedia.indexOf("screen") < 0 && cssMedia.indexOf("all") < 0) {
			return "";
		}
		if (aCSS.href && aCSS.href.indexOf("chrome://") == 0) {
			return "";
		}
		if (aCSS.href)
			content += (content ? "\n" : "") + "/* ::::: " + aCSS.href + " ::::: */\n\n";
		Array.forEach(aCSS.cssRules, function(cssRule) {
			switch (cssRule.type) {
				case Ci.nsIDOMCSSRule.STYLE_RULE: 
					var cssText = this.inspectCSSText(cssRule.cssText, aCSS.href, aDocument);
					if (cssText)
						content += cssText + "\n";
					break;
				case Ci.nsIDOMCSSRule.IMPORT_RULE: 
					content += this.processCSSRecursively(cssRule.styleSheet, aDocument);
					break;
				case Ci.nsIDOMCSSRule.MEDIA_RULE: 
					if (/^@media ([^\{]+) \{/.test(cssRule.cssText)) {
						var media = RegExp.$1;
						if (media.indexOf("screen") < 0 && media.indexOf("all") < 0) {
							break;
						}
					}
					cssRule.cssText.split("\n").forEach(function(cssText) {
						if (cssText.indexOf("@media ") == 0 || cssText == "}") {
							content += cssText + "\n";
						}
						else {
							cssText = cssText.replace(/^\s+|\s+$/g, "");
							cssText = this.inspectCSSText(cssText, aCSS.href, aDocument);
							if (cssText)
								content += "\t" + cssText + "\n";
						}
					}, this);
					break;
				case Ci.nsIDOMCSSRule.FONT_FACE_RULE: 
					cssRule.cssText.split("\n").forEach(function(cssText) {
						if (cssText == "@font-face {" || cssText == "}") {
							content += cssText + "\n";
						}
						else {
							cssText = cssText.replace(/^\s+|\s+$/g, "");
							cssText = this.inspectCSSText(cssText, aCSS.href, aDocument);
							if (cssText)
								content += "\t" + cssText + "\n";
						}
					}, this);
					break;
				default: 
			}
		}, this);
>>>>>>> release-1.6.0.a1
		return content;
	},

	inspectCSSText : function(aCSStext, aCSShref, aDocument)
	{
<<<<<<< HEAD
		if ( aCSStext.match(/webchunks/i) )
		{
			//Der Inhalt von Zeilen, die "webchunks" enthalten, muss geloescht werden, um Fehler nach dem Entfernen von Webchunks zu vermeiden
			return "";
		} else
		{
			if (!aCSShref) {
				aCSShref = this.refURLObj.spec;
			}
			if ( !aCSStext ) return "";
			if ( this._fxVer35 )
			{
				if ( aCSStext.indexOf("{")>-1 )
				{
					var selectors = aCSStext.substring(0,aCSStext.indexOf("{")).trim();
					selectors = selectors.replace(/:[a-z-]+/g, "");
					try
					{
						if ( !aDocument.querySelector(selectors) ) return "";
					} catch (ex)
					{
					}
				}
			}
			var re = new RegExp(/ url\(([^\'\)\s]+)\)/);
			var i = 0;
			while ( aCSStext.match(re) )
			{
				if ( ++i > 10 ) break;
				var imgURL  = sbCommonUtils.resolveURL(aCSShref, RegExp.$1);
				var imgFile = this.option["images"] ? this.download(imgURL) : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAIBTAA7";
				aCSStext = aCSStext.replace(re, " url('" + imgFile + "')");
			}
//			aCSStext = aCSStext.replace(/([^\{\}])(\r|\n)/g, "$1\\A");
			aCSStext = aCSStext.replace(/([^\{\}])(\r|\n)/g, "$1");
			re = new RegExp(/ content: \"(.*?)\"; /);
			if ( aCSStext.match(re) )
			{
				var innerQuote = RegExp.$1;
				innerQuote = innerQuote.replace(/\"/g, '\\"');
				innerQuote = innerQuote.replace(/\\\" attr\(([^\)]+)\) \\\"/g, '" attr($1) "');
				aCSStext = aCSStext.replace(re, ' content: "' + innerQuote + '"; ');
			}
			if ( aCSStext.match(/ (quotes|voice-family): \"/) )
			{
				return "";
			}
			if ( aCSStext.indexOf(" background: ") >= 0 )
			{
				aCSStext = aCSStext.replace(/ -moz-background-[^:]+: -moz-[^;]+;/g, "");
				aCSStext = aCSStext.replace(/ scroll 0(?:pt|px|%);/g, ";");
			}
			if ( aCSStext.indexOf(" background-position: 0") >= 0 )
			{
				aCSStext = aCSStext.replace(/ background-position: 0(?:pt|px|%);/, " background-position: 0 0;");
			}
			return aCSStext;
		}
=======
		if (!aCSShref) {
			aCSShref = this.refURLObj.spec;
		}
		if ( !aCSStext ) return;
		if (/^([^\{]+)\s+\{/.test(aCSStext)) {
			var selectors = RegExp.$1.trim();
			selectors = selectors.replace(/:[a-z-]+/g, "");
			try {
				if (!aDocument.querySelector(selectors))
					return;
			}
			catch (ex) {}
		}
		var re = new RegExp(/ url\(([^\'\)\s]+)\)/);
		var i = 0;
		while ( aCSStext.match(re) )
		{
			if ( ++i > 10 ) break;
			var imgURL  = RegExp.$1;
			if (/^[\'\"]([^\'\"]+)[\'\"]$/.test(imgURL))
				imgURL = RegExp.$1;
			imgURL  = ScrapBookUtils.resolveURL(aCSShref, imgURL);
			var imgFile = this.option["images"] ? this.download(imgURL) : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAIBTAA7";
			aCSStext = aCSStext.replace(re, " url('" + imgFile + "')");
		}
		aCSStext = aCSStext.replace(/([^\{\}])(\r|\n)/g, "$1\\A");
		re = new RegExp(/ content: \"(.*?)\"; /);
		if ( aCSStext.match(re) )
		{
			var innerQuote = RegExp.$1;
			innerQuote = innerQuote.replace(/\"/g, '\\"');
			innerQuote = innerQuote.replace(/\\\" attr\(([^\)]+)\) \\\"/g, '" attr($1) "');
			aCSStext = aCSStext.replace(re, ' content: "' + innerQuote + '"; ');
		}
		if ( aCSStext.match(/ (quotes|voice-family): \"/) )
		{
			return;
		}
		if ( aCSStext.indexOf(" background: ") >= 0 )
		{
			aCSStext = aCSStext.replace(/ -moz-background-[^:]+: -moz-[^;]+;/g, "");
			aCSStext = aCSStext.replace(/ scroll 0(?:pt|px|%);/g, ";");
		}
		if ( aCSStext.indexOf(" background-position: 0") >= 0 )
		{
			aCSStext = aCSStext.replace(/ background-position: 0(?:pt|px|%);/, " background-position: 0 0;");
		}
		return aCSStext;
>>>>>>> release-1.6.0.a1
	},

	download : function(aURLSpec)
	{
		if ( !aURLSpec ) return;
		if ( aURLSpec.indexOf("://") < 0 )
		{
<<<<<<< HEAD
			aURLSpec = sbCommonUtils.resolveURL(this.refURLObj.spec, aURLSpec);
		}
		try {
			var aURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
			aURL.spec = aURLSpec;
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to download: " + aURLSpec);
=======
			aURLSpec = ScrapBookUtils.resolveURL(this.refURLObj.spec, aURLSpec);
		}
		try {
			var aURL = Cc['@mozilla.org/network/standard-url;1'].createInstance(Ci.nsIURL);
			aURL.spec = aURLSpec;
		} catch(ex) {
			ScrapBookUtils.alert("ERROR: Failed to download: " + aURLSpec);
>>>>>>> release-1.6.0.a1
			return;
		}
		var newFileName = aURL.fileName.toLowerCase();
		if ( !newFileName ) newFileName = "untitled";
<<<<<<< HEAD
		newFileName = sbCommonUtils.validateFileName(newFileName);
=======
		newFileName = ScrapBookUtils.validateFileName(newFileName);
>>>>>>> release-1.6.0.a1
		if ( this.file2URL[newFileName] == undefined )
		{
		}
		else if ( this.file2URL[newFileName] != aURLSpec )
		{
			var seq = 1;
<<<<<<< HEAD
			var fileLR = sbCommonUtils.splitFileName(newFileName);
=======
			var fileLR = ScrapBookUtils.splitFileName(newFileName);
>>>>>>> release-1.6.0.a1
			if ( !fileLR[1] ) fileLR[1] = "dat";
			newFileName = fileLR[0] + "_" + this.leftZeroPad3(seq) + "." + fileLR[1];
			while ( this.file2URL[newFileName] != undefined )
			{
				if ( this.file2URL[newFileName] == aURLSpec )
				{
					return newFileName;
				}
				newFileName = fileLR[0] + "_" + this.leftZeroPad3(++seq) + "." + fileLR[1];
			}
		}
		else
		{
			return newFileName;
		}
		if ( aURL.schemeIs("http") || aURL.schemeIs("https") || aURL.schemeIs("ftp") )
		{
			var targetFile = this.contentDir.clone();
			targetFile.append(newFileName);
<<<<<<< HEAD
//Der Try-Catch-Block wird auch bei einem alert innerhalb des Blocks weitergefuehrt!
			try {
				var WBP = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);
				WBP.persistFlags |= WBP.PERSIST_FLAGS_FROM_CACHE;
				WBP.persistFlags |= WBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
				if ( this._fxVer18 ) {
					WBP.saveURI(aURL, null, this.refURLObj, null, null, targetFile, null);
				} else {
					WBP.saveURI(aURL, null, this.refURLObj, null, null, targetFile);
				}
=======
			var refURL = this.refURLObj.schemeIs("http") || this.refURLObj.schemeIs("https") ? this.refURLObj : null;
			try {
				var WBP = Cc['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Ci.nsIWebBrowserPersist);
				WBP.persistFlags |= WBP.PERSIST_FLAGS_FROM_CACHE;
				WBP.persistFlags |= WBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
				WBP.saveURI(aURL, null, refURL, null, null, targetFile, null);
>>>>>>> release-1.6.0.a1
				this.httpTask[this.item.id]++;
				WBP.progressListener = new sbCaptureObserver(this.item, newFileName);
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
<<<<<<< HEAD
				var orgFile = sbCommonUtils.convertURLToFile(aURLSpec);
=======
				var orgFile = ScrapBookUtils.convertURLToFile(aURLSpec);
>>>>>>> release-1.6.0.a1
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

	leftZeroPad3 : function(num)
	{
		if ( num < 10 ) { return "00" + num; } else if ( num < 100 ) { return "0" + num; } else { return num; }
	},

	normalizeJSLink : function(aNode, aAttr)
	{
		var val = aNode.getAttribute(aAttr);
		if ( !val.match(/\(\'([^\']+)\'/) ) return aNode;
		val = RegExp.$1;
		if ( val.indexOf("/") == -1 && val.indexOf(".") == -1 ) return aNode;
<<<<<<< HEAD
		val = sbCommonUtils.resolveURL(this.refURLObj.spec, val);
=======
		val = ScrapBookUtils.resolveURL(this.refURLObj.spec, val);
>>>>>>> release-1.6.0.a1
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
			if ( aNode.hasAttribute("href") && aNode.getAttribute("href").indexOf("http://") != 0 )
			{
				aNode.setAttribute("href", val);
				aNode.removeAttribute("onclick");
			}
		}
		return aNode;
	},

};



function sbCaptureObserver(aSBitem, aFileName)
{
	this.item     = aSBitem;
	this.fileName = aFileName;
	this.callback = sbCaptureObserverCallback;
}

sbCaptureObserver.prototype = {

	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
<<<<<<< HEAD
		if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP )
=======
		if ( aStateFlags & Ci.nsIWebProgressListener.STATE_STOP )
>>>>>>> release-1.6.0.a1
		{
			if ( --sbContentSaver.httpTask[this.item.id] == 0 ) {
				this.callback.onAllDownloadsComplete(this.item);
			} else {
				this.callback.onDownloadComplete(this.item);
			}
		}
	},
	onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
	{
		if ( aCurTotalProgress == aMaxTotalProgress ) return;
		var progress = (aMaxSelfProgress > 0) ? Math.round(aCurSelfProgress / aMaxSelfProgress * 100) + "%" : aCurSelfProgress + "Bytes";
		this.callback.onDownloadProgress(this.item, this.fileName, progress);
	},
	onStatusChange   : function() {},
	onLocationChange : function() {},
	onSecurityChange : function() {},
};


var sbCaptureObserverCallback = {

<<<<<<< HEAD
	getString : function(aBundleName){ return sbBrowserOverlay.STRING.getString(aBundleName); },

	trace : function(aText, aMillisec)
	{
		var status = top.window.document.getElementById("statusbar-display");
		if ( !status ) return;
		status.label = aText;
		if ( aMillisec>0 ) {
			var callback = function() {
				if ( status.label == aText) status.label = "";
			};
			window.setTimeout(callback, aMillisec);
		}
=======
	getString : function(aBundleName){ return ScrapBookBrowserOverlay.STRING.getString(aBundleName); },

	trace : function(aText)
	{
		if (document.getElementById("statusbar-display"))
			document.getElementById("statusbar-display").label = aText;
>>>>>>> release-1.6.0.a1
	},

	onDownloadComplete : function(aItem)
	{
<<<<<<< HEAD
		this.trace(this.getString("CAPTURE") + "... (" + sbContentSaver.httpTask[aItem.id] + ") " + aItem.title, 0);
=======
		this.trace(this.getString("SAVE") + "... (" + sbContentSaver.httpTask[aItem.id] + ") " + aItem.title);
>>>>>>> release-1.6.0.a1
	},

	onAllDownloadsComplete : function(aItem)
	{
<<<<<<< HEAD
		this.trace(this.getString("CAPTURE_COMPLETE") + ": " + aItem.title, 5000);
=======
		this.trace(this.getString("SAVE_COMPLETE") + ": " + aItem.title);
>>>>>>> release-1.6.0.a1
		this.onCaptureComplete(aItem);
	},

	onDownloadProgress : function(aItem, aFileName, aProgress)
	{
<<<<<<< HEAD
		this.trace(this.getString("TRANSFER_DATA") + "... (" + aProgress + ") " + aFileName, 0);
=======
		this.trace(this.getString("TRANSFER_DATA") + "... (" + aProgress + ") " + aFileName);
>>>>>>> release-1.6.0.a1
	},

	onCaptureComplete : function(aItem)
	{
<<<<<<< HEAD
		if ( aItem && sbDataSource.getProperty(sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + aItem.id), "type") == "marked" ) return;
		if ( sbCommonUtils.getBoolPref("scrapbook.notifyOnComplete", true) )
		{
			window.openDialog("chrome://scrapbook/content/notify.xul", "", "chrome,dialog=yes,titlebar=no,popup=yes", aItem);
=======
		if ( aItem && ScrapBookData.getProperty(ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + aItem.id), "type") == "marked" ) return;
		if ( ScrapBookUtils.getPref("notifyOnComplete", true) )
		{
			var icon = aItem.icon ? "resource://scrapbook/data/" + aItem.id + "/" + aItem.icon
			         : ScrapBookUtils.getDefaultIcon();
			var title = "ScrapBook: " + this.getString("SAVE_COMPLETE");
			var text = ScrapBookUtils.crop(aItem.title, 40);
			var listener = {
				observe: function(subject, topic, data) {
					if (topic == "alertclickcallback")
						ScrapBookUtils.loadURL("chrome://scrapbook/content/view.xul?id=" + data, true);
				}
			};
			var alertsSvc = Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService);
			alertsSvc.showAlertNotification(icon, title, text, true, aItem.id, listener);
>>>>>>> release-1.6.0.a1
		}
		if ( aItem && aItem.id in sbContentSaver.httpTask ) delete sbContentSaver.httpTask[aItem.id];
	},

};


