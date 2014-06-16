
var sbContentSaver = {


	name         : "",
	item         : null,
	contentDir   : null,
	httpTask     : {},
	file2URL     : {},
	file2Doc     : {},
	option       : {},
	plusoption   : {},
	refURLObj    : null,
	favicon      : null,
	frameList    : [],
	frames      : [],
	isMainFrame  : true,
	selection    : null,
	linkURLs     : [],
	_fxVer35     : null,
	_fxVer18     : null,



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
		if ( this._fxVer35 == null )
		{
			var iAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
			var iVerComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
			this._fxVer35 = iVerComparator.compare(iAppInfo.version, "3.5")>=0;
			this._fxVer18 = iVerComparator.compare(iAppInfo.version, "18.0")>=0;
		}
		this.item = sbCommonUtils.newItem(sbDataSource.identify(sbCommonUtils.getTimeStamp()));
		this.name = "index";
		this.favicon = null;
		this.file2URL = { "index.dat" : true, "index.png" : true, "sitemap.xml" : true, "sb-file2url.txt" : true, "sb-url2name.txt" : true, };
		this.option   = { "dlimg" : false, "dlsnd" : false, "dlmov" : false, "dlarc" : false, "custom" : "", "inDepth" : 0, "isPartial" : false, "images" : true, "styles" : true, "script" : false };
		this.plusoption = { "method" : "SB", "timeout" : "0", "charset" : "UTF-8" }
		this.linkURLs = [];
		this.frameList = [];
		this.frames = [];
		this.isMainFrame = true;
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
<<<<<<< HEAD
		var titles = aRootWindow.document.title ? [aRootWindow.document.title] : [this.item.source];
		if ( aTitle ) titles[0] = aTitle;
=======
		var titles = aRootWindow.document.title ? [aRootWindow.document.title] : [decodeURI(this.item.source)];
>>>>>>> master
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
			for ( var i = 0; i < this.frameList.length; i++ ) { sbPageEditor.removeAllStyles(this.frameList[i]); }
=======
			this.item.comment = ScrapBookUtils.escapeComment(sbPageEditor.COMMENT.value);
>>>>>>> master
		}
		if ( aShowDetail )
		{
			var ret = this.showDetailDialog(titles, aResName, aContext);
			if ( ret.result == 0 ) { return null; }
			if ( ret.result == 2 ) { aResName = ret.resURI; aResIndex = 0; }
		}
<<<<<<< HEAD
		this.contentDir = sbCommonUtils.getContentDir(this.item.id);
		this.saveDocumentInternal(aRootWindow.document, this.name);
=======
		this.contentDir = ScrapBookUtils.getContentDir(this.item.id);
		var newName = this.saveDocumentInternal(aRootWindow.document, this.name);
>>>>>>> master
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
					this.item, this.option, this.file2URL, null, this.plusoption["method"], this.plusoption["charset"], this.plusoption["timeout"]
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
		return [this.name, this.file2URL];
=======
		return [ScrapBookUtils.splitFileName(newName)[0], this.file2URL];
>>>>>>> master
	},

	captureFile : function(aSourceURL, aReferURL, aType, aShowDetail, aResName, aResIndex, aPresetData, aContext)
	{
		if ( !sbDataSource.data ) sbDataSource.init();
		this.init(aPresetData);
		this.item.title  = sbCommonUtils.getFileName(aSourceURL);
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
		this.saveFileInternal(aSourceURL, this.name, aType);
=======
		this.contentDir = ScrapBookUtils.getContentDir(this.item.id);
		this.refURLObj  = ScrapBookUtils.convertURLToObject(aReferURL);
		var newName = this.saveFileInternal(aSourceURL, this.name, aType);
>>>>>>> master
		this.addResource(aResName, aResIndex);
		return [ScrapBookUtils.splitFileName(newName)[0], this.file2URL];
	},

	showDetailDialog : function(aTitles, aResURI, aContext)
	{
		var ret = {
			item    : this.item,
			option  : this.option,
			poption : this.plusoption,
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
		// non-HTML document: process as file saving
		if ( !aDocument.body || !aDocument.contentType.match(/html|xml/i) )
		{
			var captureType = (aDocument.contentType.substring(0,5) == "image") ? "image" : "file";
			if ( this.isMainFrame ) this.item.type = captureType;
			var newLeafName = this.saveFileInternal(aDocument.location.href, aFileKey, captureType);
			return newLeafName;
		}
<<<<<<< HEAD
		this.refURLObj = sbCommonUtils.convertURLToObject(aDocument.location.href);
=======

		// HTML document: save the current DOM
		this.refURLObj = ScrapBookUtils.convertURLToObject(aDocument.location.href);

		var arr = this.getUniqueFileName(aFileKey + ".html", this.refURLObj.spec, aDocument);
		var myHTMLFileName = arr[0];
		var myHTMLFileDone = arr[1];
		if (myHTMLFileDone) return myHTMLFileName;

		var arr = this.getUniqueFileName(aFileKey + ".css", this.refURLObj.spec, aDocument);
		var myCSSFileName = arr[0];

		// construct the tree, especially for capture of partial selection
>>>>>>> master
		if ( this.selection )
		{
			var myRange = this.selection.getRangeAt(0);
			var myDocFrag = myRange.cloneContents();
			var curNode = myRange.commonAncestorContainer;
			if ( curNode.nodeName == "#text" ) curNode = curNode.parentNode;
		}
		// cloned frames has contentDocument = null
		// give all frames an unique id for later retrieving
		var htmlNode = aDocument.getElementsByTagName("html")[0];
		var frames = htmlNode.getElementsByTagName("frame");
		for (var i=0, len=frames.length; i<len; i++) {
			var frame = frames[i];
			var idx = this.frames.length;
			this.frames[idx] = frame;
			frame.setAttribute("data-sb-frame-id", idx);
			if (frame.src == this.refURLObj.spec) frame.setAttribute("data-sb-frame-id", idx);
		}
		var frames = htmlNode.getElementsByTagName("iframe");
		for (var i=0, len=frames.length; i<len; i++) {
			var frame = frames[i];
			var idx = this.frames.length;
			this.frames[idx] = frame;
			frame.setAttribute("data-sb-frame-id", idx);
			if (frame.src == this.refURLObj.spec) frame.setAttribute("data-sb-frame-id", idx);
		}
		// now make the clone
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
		var rootNode = htmlNode.cloneNode(false);
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

		// process HTML DOM
		this.processDOMRecursively(rootNode);

		// process all inline and link CSS, will merge them into index.css later
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
				newLinkNode.setAttribute("href", myCSSFileName);
				newLinkNode.setAttribute("type", "text/css");
				newLinkNode.setAttribute("rel", "stylesheet");
				rootNode.firstChild.appendChild(aDocument.createTextNode("\n"));
				rootNode.firstChild.appendChild(newLinkNode);
				rootNode.firstChild.appendChild(aDocument.createTextNode("\n"));
			}
		}

		// change the charset to UTF-8
		// also change the meta tag; generate one if none found
		this.item.chars = "UTF-8";
		var metas = rootNode.getElementsByTagName("meta"), meta, hasmeta = false;
		for (var i=0, len=metas.length; i<len; ++i) {
			meta = metas[i];
			if (meta.hasAttribute("http-equiv") && meta.hasAttribute("content") &&
				meta.getAttribute("http-equiv").toLowerCase() == "content-type" && 
				meta.getAttribute("content").match(/^[^;]*;\s*charset=(.*)$/i) )
			{
				hasmeta = true;
				meta.setAttribute("content", "text/html; charset=UTF-8");
			}
			else if ( meta.hasAttribute("charset") )
			{
				hasmeta = true;
				meta.setAttribute("charset", "UTF-8");
			}
		}
		if (!hasmeta) {
			// use older version for better compatibility
			var metaNode = aDocument.createElement("meta");
			metaNode.setAttribute("content", aDocument.contentType + "; charset=" + this.item.chars);
			metaNode.setAttribute("http-equiv", "Content-Type");
			rootNode.firstChild.insertBefore(aDocument.createTextNode("\n"), rootNode.firstChild.firstChild);
			rootNode.firstChild.insertBefore(metaNode, rootNode.firstChild.firstChild);
			rootNode.firstChild.insertBefore(aDocument.createTextNode("\n"), rootNode.firstChild.firstChild);
		}

		// generate the HTML and CSS file and save
		var myHTML = this.doctypeToString(aDocument.doctype) + rootNode.outerHTML;
		var myHTMLFile = this.contentDir.clone();
<<<<<<< HEAD
		myHTMLFile.append(aFileKey + ".html");
		sbCommonUtils.writeFile(myHTMLFile, myHTML, this.item.chars);
		if ( myCSS )
		{
			var myCSSFile = this.contentDir.clone();
			myCSSFile.append(aFileKey + ".css");
			sbCommonUtils.writeFile(myCSSFile, myCSS, this.item.chars);
=======
		myHTMLFile.append(myHTMLFileName);
		ScrapBookUtils.writeFile(myHTMLFile, myHTML, this.item.chars);
		if ( myCSS )
		{
			var myCSSFile = this.contentDir.clone();
			myCSSFile.append(myCSSFileName);
			ScrapBookUtils.writeFile(myCSSFile, myCSS, this.item.chars);
>>>>>>> master
		}
		return myHTMLFile.leafName;
	},

	saveFileInternal : function(aFileURL, aFileKey, aCaptureType)
	{
		if ( !aFileKey ) aFileKey = "file" + Math.random().toString();
<<<<<<< HEAD
		if ( !this.refURLObj ) this.refURLObj = sbCommonUtils.convertURLToObject(aFileURL);
		if ( this.frameNumber == 0 )
=======
		if ( !this.refURLObj ) this.refURLObj = ScrapBookUtils.convertURLToObject(aFileURL);
		if ( this.isMainFrame )
>>>>>>> master
		{
			this.item.icon  = "moz-icon://" + sbCommonUtils.getFileName(aFileURL) + "?size=16";
			this.item.type  = aCaptureType;
			this.item.chars = "";
		}
		var newFileName = this.download(aFileURL);
		if ( aCaptureType == "image" ) {
			var myHTML = '<html><head><meta http-equiv="Content-Type" content="text/html; Charset=UTF-8"></head><body><img src="' + newFileName + '"></body></html>';
		} else {
			var myHTML = '<html><head><meta http-equiv="Content-Type" content="text/html; Charset=UTF-8"><meta http-equiv="refresh" content="0;URL=./' + newFileName + '"></head><body></body></html>';
		}
		var myHTMLFile = this.contentDir.clone();
		myHTMLFile.append(aFileKey + ".html");
		sbCommonUtils.writeFile(myHTMLFile, myHTML, "UTF-8");
		return myHTMLFile.leafName;
	},

	addResource : function(aResName, aResIndex)
	{
		if ( !aResName ) return;
		var res = sbDataSource.addItem(this.item, aResName, aResIndex);
		sbCommonUtils.rebuildGlobal();
		if ( this.favicon )
		{
			var iconURL = "resource://scrapbook/data/" + this.item.id + "/" + this.favicon;
			setTimeout(function(){
				sbDataSource.setProperty(res, "icon", iconURL); sbDataSource.flush();
			}, 500);
			this.item.icon = this.favicon;
		}
		sbCommonUtils.writeIndexDat(this.item);
		if ( "sbBrowserOverlay" in window ) sbBrowserOverlay.updateFolderPref(aResName);
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
			case "source":  // in <audio> and <vedio>
				if ( aNode.hasAttribute("src") ) {
					if ( this.option["images"] ) {
						var aFileName = this.download(aNode.src);
						if (aFileName) aNode.setAttribute("src", aFileName);
					} else {
						aNode.setAttribute("src", aNode.src);
					}
				}
				break;
			case "object" : 
				if ( aNode.hasAttribute("data") ) {
					if ( this.option["images"] ) {
						var aFileName = this.download(aNode.data);
						if (aFileName) aNode.setAttribute("data", aFileName);
					} else {
						aNode.setAttribute("data", aNode.src);
					}
				}
				break;
			case "track" :  // in <audio> and <vedio>
				if ( aNode.hasAttribute("src") ) {
					aNode.setAttribute("src", aNode.src);
				}
				break;
			case "body" : 
			case "table" : 
			case "tr" : 
			case "th" : 
			case "td" : 
				// handle "background" attribute (HTML5 deprecated)
				if ( aNode.hasAttribute("background") ) {
					var url = ScrapBookUtils.resolveURL(this.refURLObj.spec, aNode.getAttribute("background"));
					if ( this.option["images"] ) {
						var aFileName = this.download(url);
						if (aFileName) aNode.setAttribute("background", aFileName);
					} else {
						aNode.setAttribute("background", url);
					}
				}
				break;
			case "input" : 
				switch (aNode.type.toLowerCase()) {
					case "image": 
						if ( aNode.hasAttribute("src") ) {
							if ( this.option["images"] ) {
								var aFileName = this.download(aNode.src);
								if (aFileName) aNode.setAttribute("src", aFileName);
							} else {
								aNode.setAttribute("src", aNode.src);
							}
						}
						break;
				}
				break;
			case "link" : 
				// gets "" if rel attribute not defined
				switch ( aNode.rel.toLowerCase() ) {
					case "stylesheet" :
						if ( aNode.href.indexOf("chrome://") != 0 || !this.option["styles"] ) {
							return this.removeNodeFromParent(aNode);
						}
						break;
					case "shortcut icon" :
					case "icon" :
						if ( aNode.hasAttribute("href") ) {
							var aFileName = this.download(aNode.href);
							if (aFileName) {
								aNode.setAttribute("href", aFileName);
								if ( this.isMainFrame && !this.favicon ) this.favicon = aFileName;
							}
						}
						break;
					default :
						if ( aNode.hasAttribute("href") ) {
							aNode.setAttribute("href", aNode.href);
						}
						break;
				}
				break;
			case "base" : 
				if ( aNode.hasAttribute("href") ) {
					aNode.setAttribute("href", "");
				}
				break;
			case "style" : 
				// CSS in the page will be handled in another way, so remove them here
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
<<<<<<< HEAD
				if ( aNode.hasAttribute("onclick") ) aNode = this.normalizeJSLink(aNode, "onclick");
				if ( !aNode.hasAttribute("href") ) return aNode;
				if ( aNode.target == "_blank" ) aNode.setAttribute("target", "_top");
				if ( aNode.href.match(/^javascript:/i) ) aNode = this.normalizeJSLink(aNode, "href");
				if ( !this.selection && aNode.getAttribute("href").charAt(0) == "#" ) return aNode;
				var ext = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(aNode.href))[1].toLowerCase();
				var dateiname = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(aNode.href))[0].toLowerCase();
				if (dateiname.search(":") >= 0)	ext = ext.toUpperCase();
=======
				if ( !aNode.href ) {
					break;
				}
				else if ( aNode.href.match(/^javascript:/i) && !this.option["script"] ) {
					aNode.removeAttribute("href");
					break;
				}
				// Relative links to self need not be parsed
				// If has selection (i.e. partial capture), the captured page is incomplete,
				// do the subsequent URL rewrite so that it is targeting the source page
				else if ( !this.selection && aNode.getAttribute("href").match(/^(?:#|$)/) ) {
					break;
				}
				// determine whether to download (copy) the link target file
				var ext = ScrapBookUtils.splitFileName(ScrapBookUtils.getFileName(aNode.href))[1].toLowerCase();
>>>>>>> master
				var flag = false;
				switch ( ext )
				{
					case "jpg" : case "jpeg" : case "png" : case "gif" : case "tiff" : flag = this.option["dlimg"]; break;
					case "mp3" : case "wav"  : case "ram" : case "rm"  : case "wma"  : flag = this.option["dlsnd"]; break;
					case "mpg" : case "mpeg" : case "avi" : case "mov" : case "wmv"  : flag = this.option["dlmov"]; break;
					case "zip" : case "lzh"  : case "rar" : case "jar" : case "xpi"  : flag = this.option["dlarc"]; break;
					default : 
						// copy files with custom defined extensions
						if ( ext && this.option["custom"] &&
							( (", " + this.option["custom"] + ", ").indexOf(", " + ext + ", ") != -1 ) ) {
							flag = true;
						}
						// do not copy, but add to the link list if it's a work of deep capture
						else {
							if ( this.option["inDepth"] > 0 ) this.linkURLs.push(aNode.href);
						}
				}
				// do the copy or URL rewrite
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
				if ( aNode.hasAttribute("action") ) {
					aNode.setAttribute("action", aNode.action);
				}
>>>>>>> master
				break;
			case "meta" : 
				if ( aNode.hasAttribute("property") ) {
					switch ( aNode.getAttribute("property").toLowerCase() ) {
						case "og:image" :
						case "og:image:url" :
						case "og:image:secure_url" :
						case "og:audio" :
						case "og:audio:url" :
						case "og:audio:secure_url" :
						case "og:video" :
						case "og:video:url" :
						case "og:video:secure_url" :
							if ( aNode.hasAttribute("content") ) {
								var url = ScrapBookUtils.resolveURL(this.refURLObj.spec, aNode.getAttribute("content"));
								if ( this.option["images"] ) {
									var aFileName = this.download(url);
									if (aFileName) aNode.setAttribute("content", aFileName);
								}
								else {
									aNode.setAttribute("content", url);
								}
							}
							break;
						case "og:url" :
							if ( aNode.hasAttribute("content") ) {
								var url = ScrapBookUtils.resolveURL(this.refURLObj.spec, aNode.getAttribute("content"));
								aNode.setAttribute("content", url);
							}
							break;
					}
				}
				break;
			case "frame"  : 
			case "iframe" : 
				this.isMainFrame = false;
				if ( this.selection ) this.selection = null;
				var tmpRefURL = this.refURLObj;
				// retrieve contentDocument from the corresponding real frame
				var idx = aNode.getAttribute("data-sb-frame-id");
				var newFileName = this.saveDocumentInternal(this.frames[idx].contentDocument, this.name + "_" + (parseInt(idx)+1));
				aNode.setAttribute("src", newFileName);
				aNode.removeAttribute("data-sb-frame-id");
				this.refURLObj = tmpRefURL;
				break;
			// Deprecated, like <pre> but inner contents are escaped to be plain text
			// Replace with <pre> since it breaks ScrapBook highlights
			case "xmp" : 
<<<<<<< HEAD
				if ( aNode.firstChild )
				{
					var pre = aNode.ownerDocument.createElement("pre");
					pre.appendChild(aNode.firstChild);
					aNode.parentNode.replaceChild(pre, aNode);
				}
				break;
		}
		if ( !this.option["styles"] )
		{
			aNode.removeAttribute("style");
=======
				var pre = aNode.ownerDocument.createElement("pre");
				pre.appendChild(aNode.firstChild);
				aNode.parentNode.replaceChild(pre, aNode);
				break;
>>>>>>> master
		}
		if ( aNode.style && aNode.style.cssText )
		{
			var newCSStext = this.inspectCSSText(aNode.style.cssText, this.refURLObj.spec, true);
			if ( newCSStext ) aNode.setAttribute("style", newCSStext);
		}
		if ( !this.option["script"] )
		{
			// general: remove on* attributes
			var attrs = aNode.attributes;
			for (var i = 0; i < attrs.length; i++) {
				if (attrs[i].name.toLowerCase().indexOf("on") == 0) {
					aNode.removeAttribute(attrs[i].name);
					i--;  // removing an attribute shrinks the list
				}
			}
			// other specific
			aNode.removeAttribute("contextmenu");
		}
		return aNode;
	},

	processCSSRecursively : function(aCSS, aDocument, isImport)
	{
		if (!aCSS || aCSS.disabled) return "";
		if (aCSS.href && aCSS.href.indexOf("chrome://") == 0) return "";
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
		if (aCSS.href) {
			if (isImport) {
				content += "/* ::::: " + "(import) " + aCSS.href + " ::::: */\n";
			}
			else {
				content += "/* ::::: " + aCSS.href + " ::::: */\n\n";
			}
		}
		// sometimes <link> cannot access remote css
		// and aCSS.cssRules fires an error (instead of returning undefined)...
		// we need this try block to catch that
		var skip = false;
		try {
			if (!aCSS.cssRules) skip = true;
		}
		catch(ex) {
			console.warn("Unable to access CSS from '" + aCSS.href + "' in page '" + aDocument.location.href + "' \n" + ex);
				content += "/* ERROR: Unable to access this CSS */\n\n";
			skip = true;
		}
		if (!skip) {
			Array.forEach(aCSS.cssRules, function(cssRule) {
				switch (cssRule.type) {
					case Ci.nsIDOMCSSRule.IMPORT_RULE: 
						content += this.processCSSRecursively(cssRule.styleSheet, aDocument, true);
						break;
					case Ci.nsIDOMCSSRule.FONT_FACE_RULE: 
						var cssText = this.inspectCSSText(cssRule.cssText, aCSS.href);
						if (cssText) content += cssText + "\n";
						break;
					case Ci.nsIDOMCSSRule.STYLE_RULE: 
					case Ci.nsIDOMCSSRule.MEDIA_RULE: 
					default: 
						var cssText = this.inspectCSSText(cssRule.cssText, aCSS.href, true);
						if (cssText) content += cssText + "\n";
						break;
				}
			}, this);
		}
		if (isImport) {
			content += "/* ::::: " + "(end import)" + " ::::: */\n";
		}
>>>>>>> master
		return content;
	},

	inspectCSSText : function(aCSStext, aCSShref, isImage)
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
		if (!aCSShref) aCSShref = this.refURLObj.spec;
		// CSS get by .cssText is always url("something-with-\"double-quote\"-escaped")
		// and no CSS comment is in
		// so we can parse it safely with this RegExp
		aCSStext = aCSStext.replace(/ url\(\"((?:\\.|[^"])+)\"\)/g, function() {
			var dataURL = arguments[1];
			if (dataURL.indexOf("data:") === 0) return ' url("' + dataURL + '")';
			dataURL = ScrapBookUtils.resolveURL(aCSShref, dataURL);
			if (isImage) {
				var dataFile = sbContentSaver.option["images"] ? sbContentSaver.download(dataURL) : dataURL;
			}
			else {
				var dataFile = sbContentSaver.download(dataURL);
			}
			return ' url("' + dataFile + '")';
		});
		return aCSStext;
>>>>>>> master
	},

	download : function(aURLSpec)
	{
		if ( !aURLSpec ) return;
		if ( aURLSpec.indexOf("://") < 0 )
		{
			aURLSpec = sbCommonUtils.resolveURL(this.refURLObj.spec, aURLSpec);
		}
		try {
			var aURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
			aURL.spec = aURLSpec;
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to download: " + aURLSpec);
			return;
		}
<<<<<<< HEAD
		var newFileName = aURL.fileName.toLowerCase();
		if ( !newFileName ) newFileName = "untitled";
		newFileName = sbCommonUtils.validateFileName(newFileName);
		if ( this.file2URL[newFileName] == undefined )
		{
		}
		else if ( this.file2URL[newFileName] != aURLSpec )
		{
			var seq = 1;
			var fileLR = sbCommonUtils.splitFileName(newFileName);
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
=======

		var arr = this.getUniqueFileName(aURL.fileName.toLowerCase(), aURLSpec);
		var newFileName = arr[0];
		var hasDownloaded = arr[1];
		if (hasDownloaded) return newFileName;

>>>>>>> master
		if ( aURL.schemeIs("http") || aURL.schemeIs("https") || aURL.schemeIs("ftp") )
		{
			var targetFile = this.contentDir.clone();
			targetFile.append(newFileName);
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
				this.httpTask[this.item.id]++;
				WBP.progressListener = new sbCaptureObserver(this.item, newFileName);
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
				var orgFile = sbCommonUtils.convertURLToFile(aURLSpec);
				if ( !orgFile.isFile() ) return;
				orgFile.copyTo(targetDir, newFileName);
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

	/**
	 * @return  [(string) newFileName, (bool) isDuplicated]
	 */
	getUniqueFileName: function(newFileName, aURLSpec, aDocumentSpec)
	{
<<<<<<< HEAD
		var val = aNode.getAttribute(aAttr);
		if ( !val.match(/\(\'([^\']+)\'/) ) return aNode;
		val = RegExp.$1;
		if ( val.indexOf("/") == -1 && val.indexOf(".") == -1 ) return aNode;
		val = sbCommonUtils.resolveURL(this.refURLObj.spec, val);
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
=======
		if ( !newFileName ) newFileName = "untitled";
		newFileName = decodeURI(newFileName);
		newFileName = ScrapBookUtils.validateFileName(newFileName);
		var fileLR = ScrapBookUtils.splitFileName(newFileName);
		fileLR[0] = ScrapBookUtils.crop(fileLR[0], 100);
		if ( !fileLR[1] ) fileLR[1] = "dat";
		newFileName = fileLR[0] + "." + fileLR[1];
		var seq = 0;
		while ( this.file2URL[newFileName] != undefined ) {
			if (this.file2URL[newFileName] == aURLSpec && this.file2Doc[newFileName] == aDocumentSpec) {
				return [newFileName, true];
>>>>>>> master
			}
			newFileName = fileLR[0] + "_" + this.leftZeroPad3(++seq) + "." + fileLR[1];
		}
		this.file2URL[newFileName] = aURLSpec;
		this.file2Doc[newFileName] = aDocumentSpec;
		return [newFileName, false];
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
		if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP )
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
	},

	onDownloadComplete : function(aItem)
	{
		this.trace(this.getString("CAPTURE") + "... (" + sbContentSaver.httpTask[aItem.id] + ") " + aItem.title, 0);
	},

	onAllDownloadsComplete : function(aItem)
	{
		this.trace(this.getString("CAPTURE_COMPLETE") + ": " + aItem.title, 5000);
		this.onCaptureComplete(aItem);
	},

	onDownloadProgress : function(aItem, aFileName, aProgress)
	{
		this.trace(this.getString("TRANSFER_DATA") + "... (" + aProgress + ") " + aFileName, 0);
	},

	onCaptureComplete : function(aItem)
	{
<<<<<<< HEAD
		if ( aItem && sbDataSource.getProperty(sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + aItem.id), "type") == "marked" ) return;
		if ( sbCommonUtils.getBoolPref("scrapbook.notifyOnComplete", true) )
		{
			window.openDialog("chrome://scrapbook/content/notify.xul", "", "chrome,dialog=yes,titlebar=no,popup=yes", aItem);
=======
		if (!aItem) return;
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
>>>>>>> master
		}
		if ( aItem && aItem.id in sbContentSaver.httpTask ) delete sbContentSaver.httpTask[aItem.id];
	},

};


