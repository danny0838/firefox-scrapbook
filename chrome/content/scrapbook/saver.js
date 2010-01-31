
var sbContentSaver = {


	name         : "",
	item         : null,
	contentDir   : null,
	httpTask     : {},
	file2URL     : {},
	option       : {},
	plusoption   : {},
	refURLObj    : null,
	favicon      : null,
	frameList    : [],
	frameNumber  : 0,
	selection    : null,
	linkURLs     : [],

	//CSS-Verarbeitung
	CSSURL       : [],
	CSSFilename  : [],
	CSSLocalFilename : [],
	CSSCache     : [],
	CSSCacheURL  : [],

	//Bild-Verarbeitung
	IMGURL       : [],
	IMGFilename  : [],
	IMGLocalFilename : [],
	IMGCache     : [],
	IMGCacheURL  : [],
	IMGCacheAufr : [],

	//Frame-Verarbeitung
	FrameURL     : [],
	FrameFilename: [],
	FrameLocalFilename : [],

	//sonstige Dateien
	allURL       : [],
	allFilename  : [],
	allLocalFilename : [],


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
		this.item = sbCommonUtils.newItem(sbDataSource.identify(sbCommonUtils.getTimeStamp()));
		this.name = "index";
		this.favicon = null;
		this.file2URL = { "index.html" : true, "index.css" : true, "index.dat" : true, "index.png" : true, "sitemap.xml" : true, "sb-file2url.txt" : true, "sb-url2name.txt" : true, };
		this.option   = { "dlimg" : false, "dlsnd" : false, "dlmov" : false, "dlarc" : false, "custom" : "", "inDepth" : 0, "isPartial" : false, "images" : true, "styles" : true, "script" : false };
		this.plusoption = { "method" : "SB", "timeout" : "0", "charset" : "UTF-8" }
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

	captureWindow : function(aRootWindow, aIsPartial, aShowDetail, aResName, aResIndex, aPresetData, aContext, aTitle)
	{
		if ( !sbDataSource.data ) sbDataSource.init();
		this.init(aPresetData);
		this.item.chars  = aRootWindow.document.characterSet;
		this.item.source = aRootWindow.location.href;
		//Favicon der angezeigten Seite bestimmen (Unterscheidung zwischen FF2 und FF3 notwendig!)
		if ( "gBrowser" in window && aRootWindow == gBrowser.contentWindow )
		{
			var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
			if (appInfo.name.match(/^Firefox/))
			{
				if (appInfo.version.match(/^3/))
				{
					//FF3 gefunden
					var faviconService = Components.classes["@mozilla.org/browser/favicon-service;1"].getService(Components.interfaces.nsIFaviconService);
					var myURI = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
					myURI.spec = aRootWindow.document.URL;
					try
					{
						var myImage = faviconService.getFaviconForPage(myURI);
						this.item.icon = myImage.spec;
					} catch(ex)
					{
						this.item.icon = null;
					}
				}
				if (appInfo.version.match(/^2/))
				{
					//FF2 gefunden
					this.item.icon = gBrowser.mCurrentBrowser.mIconURL;
				}
			}
		}
		this.frameList = this.flattenFrames(aRootWindow);
		var titles = aRootWindow.document.title ? [aRootWindow.document.title] : [this.item.source];
		if ( aTitle ) titles[0] = aTitle;
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
			this.item.comment = sbCommonUtils.escapeComment(sbPageEditor.COMMENT.value);
			for ( var i = 0; i < this.frameList.length; i++ ) { sbPageEditor.removeAllStyles(this.frameList[i]); }
		}
		if ( aShowDetail )
		{
			var ret = this.showDetailDialog(titles, aResName, aContext);
			if ( ret.result == 0 ) { return null; }
			if ( ret.result == 2 ) { aResName = ret.resURI; aResIndex = 0; }
		}
		this.contentDir = sbCommonUtils.getContentDir(this.item.id);
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
		return [this.name, this.file2URL];
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
		this.contentDir = sbCommonUtils.getContentDir(this.item.id);
		this.refURLObj  = sbCommonUtils.convertURLToObject(aReferURL);
		this.saveFileInternal(aSourceURL, this.name, aType);
		this.addResource(aResName, aResIndex);
		return [this.name, this.file2URL];
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
		if ( !aDocument.body || !aDocument.contentType.match(/html|xml/i) )
		{
			var captureType = (aDocument.contentType.substring(0,5) == "image") ? "image" : "file";
			if ( this.frameNumber == 0 ) this.item.type = captureType;
			var newLeafName = this.saveFileInternal(aDocument.location.href, aFileKey, captureType);
			return newLeafName;
		}
		this.refURLObj = sbCommonUtils.convertURLToObject(aDocument.location.href);
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
				myCSS += this.processCSSRecursively(myStyleSheets[i]);
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
		sbCommonUtils.writeFile(myHTMLFile, myHTML, this.item.chars);
		if ( myCSS )
		{
			var myCSSFile = this.contentDir.clone();
			myCSSFile.append(aFileKey + ".css");
			sbCommonUtils.writeFile(myCSSFile, myCSS, this.item.chars);
		}
		return myHTMLFile.leafName;
	},

	baueURL : function(buURLPath, buString)
	{
		var buParts = [];
		var buURL = "";
		var buRWert = [];
//alert("baueURL - "+buURLPath+" - "+buString);
		buParts = buString.match(/(href=|src=|background=|background-image|\/).*?(\.css|\.htm|\.html|\.gif|\.jpg|\.jpeg|\.png|\.tiff|\.tif).*?(\"|\'|>)/gi);
//alert("buString - "+buString+"\n\nbuParts - "+buParts);
		if ( buParts )
		{
			buURL = buParts[0].replace(/(href=|src=|background=|background-image:url\()/gi, "");
		} else
		{
			buURL = buString.replace(/(href=|src=|background=|background-image:url\()/gi, "");
		}
		buURL = buURL.replace(/(\"|\'|>|\)|background-image: url\(|\);)/gi, "");
		//part1 und part2 bestimmen
		buParts = buString.split(buURL);
//alert("buString - "+buString+"\n\nbuURL - "+buURL+"\n\nbuParts - "+buParts);
		//Die nächste Verarbeitung findet nur statt, wenn die URL unvollständig ist!
		if ( !buURL.match(/^http\:\/\//i) )
		{
			//root aufteilen
			var buEbenen = buURLPath.split("/");
//alert("buEbenen - "+buEbenen);
			//Wie viele Verzeichnisse muss ausgehend von buURLPath zurückgegangen werden?
//alert("buURL - "+buURL);
			var buVerzeichnisse = buURL.split("/");
			var buVerzeichnisseZurueck = 0;
			for ( var buI=0; buI<buVerzeichnisse.length; buI++ )
			{
				if ( buVerzeichnisse[buI].match(/\.\./) | buVerzeichnisse[buI] == "" ) buVerzeichnisseZurueck++;
			}
//alert("buVerzeichnisseZurueck - "+buVerzeichnisseZurueck);
			//neuen buURLPath bestimmen
			if ( buEbenen.length > 3 )
			{
				//Der Bau in zwei Schritten ist notwendig, da auf manchen Seite zu viele Ebenen zurückgegangen wird!
				buURLPath = "";
				for ( var buI=0; buI<3; buI++ )
				{
					buURLPath += buEbenen[buI].concat("\/");
				}
				if ( buEbenen.length-1-buVerzeichnisseZurueck > 3 )
				{
					for ( var buI=3; buI<buEbenen.length-1-buVerzeichnisseZurueck; buI++ )
					{
						if ( !(buEbenen[buI]=="") ) buURLPath += buEbenen[buI].concat("\/");
					}
				}
			}
//alert("buURLPath - "+buURLPath);
			//Neue URL bauen
			var buVersuch = buURLPath;
			for ( var buI=buVerzeichnisseZurueck; buI<buVerzeichnisse.length; buI++ )
			{
				buVersuch += buVerzeichnisse[buI].concat("\/");
			}
			buVersuch = buVersuch.substring(0,buVersuch.length-1);
//alert("buURL - "+buURL+"\n\nbuParts - "+buParts+"\n\nbuURLPath - "+buURLPath+"\n\nbuVersuch - "+buVersuch+"\nbuVerzeichnisseZurueck - "+buVerzeichnisseZurueck);
			buRWert.push(buVersuch);
		} else
		{
			buRWert.push(buURL);
		}
//alert("buURLPath - "+buURLPath+"\nbuString - "+buString+"\nbuURL - "+buURL+"\nbuParts[0] - "+buParts[0]+"\nbuParts[1] - "+buParts[1]);
		//Rückgabewert zusammenstellen
		if ( buParts )
		{
			buRWert.push(buParts[0]);
			if ( buParts.length > 2 )
			{
				var buZeile = ""
				for ( var buI=1; buI<buParts.length; buI++ )
				{
					buZeile += buParts[buI];
					if ( buI<buParts.length-1 ) buZeile += buURL;
				}
				buRWert.push(buZeile);
			} else
			{
				buRWert.push(buParts[1]);
			}
		}
		//Erstellte URL zurückgeben
//alert(buRWert);
		return buRWert;
	},

	downSaveFile : function(dsfFileURL, dsfDestination, dsfDownloadInternalFiles)
	{
		//Prüfung, ob URL schon im Cache vorhanden ist
			//Dateityp bestimmen
		var dsfDateityp = "";
		var dsfCSSGefunden = 0;
		var dsfIMGGefunden = 0;
		if ( dsfFileURL.match(/(\.gif|\.jpg|\.jpeg|\.png|\.tiff|\.tif)/i) )
		{
			dsfDateityp = "img";
		} else
		{
			if ( dsfFileURL.match(/\.css/i) )
			{
				dsfDateityp = "css";
			} else
			{
				alert("Unbekannter Dateityp - "+dsfFileURL);
			}
		}
//alert("dsfFileURL - "+dsfFileURL+"\nDateityp - "+dsfDateityp);
			//Cache durchsuchen!
		if ( dsfDateityp == "img" )
		{
//alert("Bild suchen");
			for ( var dsfI=0; dsfI<this.IMGCacheURL.length; dsfI++ )
			{
				if ( dsfFileURL == this.IMGCacheURL[dsfI] )
				{
//alert("img gefunden");
					dsfIMGGefunden = dsfI;
					dsfI = this.IMGCacheURL.length;
				}
			}
		} else
		{
			if ( dsfDateityp == "css" )
			{
//alert("Style suchen");
				for ( var dsfI=0; dsfI<this.CSSCacheURL.length; dsfI++ )
				{
					if ( dsfFileURL == this.CSSCacheURL[dsfI] )
					{
//alert("css gefunden");
						dsfCSSGefunden = dsfI;
						dsfI = this.CSSCacheURL.length;
					}
				}
			}
		}
//alert("dsfCSSGefunden - "+dsfCSSGefunden+"\ndsfIMGGefunden - "+dsfIMGGefunden);
		//Datei aus dem Internet herunterladen, wenn nicht im Cache vorhanden
		if ( dsfCSSGefunden==0 && dsfIMGGefunden==0 )
		{
			//Laed dsfFileURL und speichert die Daten unter dsfDestination ab
			var dsfioserv = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
			var dsfchannel = dsfioserv.newChannel(dsfFileURL, 0, null);
			var dsfstream = dsfchannel.open();
			if (dsfchannel instanceof Components.interfaces.nsIHttpChannel && dsfchannel.responseStatus != 200)
			{
//alert(dsfchannel.responseStatus);
				return "";
			}

			var dsfbstream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
			dsfbstream.setInputStream(dsfstream);
			var dsfsize = 0;
			var dsffile_data = "";
			while(dsfsize = dsfbstream.available())
			{
				dsffile_data += dsfbstream.readBytes(dsfsize);
			}
			//Daten werden im unveraenderten Zustand gesichert, um sicherzustellen, das enthaltene Verweise korrekt verarbeitet werden
//alert(dsfDateityp+" -- "+dsfFileURL);
			if ( dsfDateityp == "img" )
			{
				//Es werden maximal 100 Bilder im Cache vorgehalten. Ist die Grenze erreicht, wird das Bild mit den niedrigsten Aufrufen überschrieben
				if ( this.IMGCache.length == 100 )
				{
					var dsfRaus = [];
					dsfRaus[0] = -1;
					dsfRaus[1] = 1000;
					for ( var dsfI=0; dsfI<100; dsfI++ )
					{
						if ( dsfRaus[1] > this.IMGCacheAufr[dsfI] )
						{
							dsfRaus[0] = dsfI;
							dsfRaus[1] = this.IMGCacheAufr[dsfI];
						}
					}
//alert("Entferne "+dsfRaus[0]+". Eintrag "+this.IMGCacheURL[dsfRaus[0]]+" mit "+this.IMGCacheAufr[dsfRaus[0]]+" Anfragen.");
					this.IMGCache.splice(dsfRaus[0],dsfRaus[0]+1);
					this.IMGCacheURL.splice(dsfRaus[0],dsfRaus[0]+1);
					this.IMGCacheAufr.splice(dsfRaus[0],dsfRaus[0]+1);
				}
				this.IMGCache.push(dsffile_data);
				this.IMGCacheURL.push(dsfFileURL);
				this.IMGCacheAufr.push(1);
			} else
			{
				this.CSSCache.push(dsffile_data);
				this.CSSCacheURL.push(dsfFileURL);
			}
		} else
		{
			//Datei wird aus dem Cache bezogen
			var dsffile_data = "";
			if ( dsfCSSGefunden > 0 )
			{
				dsffile_data = this.CSSCache[dsfCSSGefunden];
			} else
			{
				dsffile_data = this.IMGCache[dsfIMGGefunden];
				this.IMGCacheAufr[dsfIMGGefunden]++;
			}
		}
//alert("Bestanden");
			//Falls erwuenscht, werden enthaltene Verweise auf andere Dateien ebenfalls heruntergeladen und die Datei angepasst
			if ( dsfDownloadInternalFiles )
			{
				var dsfLinks = dsffile_data.match(/url.*?\)/gi);
				if ( dsfLinks )
				{
					//Variablen deklarieren
					var dsfIMGURL = [];		//enthält die komplette URL des Bildes
					var dsfIMGTag = [];		//enthält String im HTML-Code
					var dsfIMGFile = [];	//enthält den Original Dateinamen
					var dsfIMGDestination = null;
					var dsfAnzahl = 0;
					var dsfVorhanden = 0;
					var dsfLocalFilenameNr = 0;
					var dsfNeu = 0;
					var dsfURLPath = "";
					var dsfParts = dsfFileURL.split("\/");
					for ( var dsfI=0; dsfI<dsfParts.length-1; dsfI++ )
					{
						if ( !(dsfParts[dsfI].length == 0) ) dsfURLPath += dsfParts[dsfI]+"\/";
					}
//alert("dsfURLPath - "+dsfURLPath);
					for ( var dsfI=0; dsfI<dsfLinks.length; dsfI++ )
					{
						var dsfURL = dsfLinks[dsfI].replace(/url/, "");
						dsfURL = dsfURL.replace(/\(/, "");
						dsfURL = dsfURL.replace(/\)/, "");
//alert("dsfURL - "+dsfURL);
						//URL der zu speichernden Datei wird bestimmt
						var dsfKompletteURL = this.baueURL(dsfURLPath,dsfURL);
//alert("dsfURLPath - "+dsfURLPath+" und dsfURL - "+dsfURL+" wird zu\n\ndsfKompletteURL - "+dsfKompletteURL);
						//URL wander in Speicher
						dsfIMGURL.push(dsfKompletteURL[0]);
						//Original Dateinamen bestimmen
						var dsfEinzelteile = dsfIMGURL[dsfI].split("/");
						if ( dsfEinzelteile )
						{
							dsfIMGFile.push(dsfEinzelteile[dsfEinzelteile.length-1]);
						} else
						{
							dsfIMGFile.push(dsfIMGURL[dsfI]);
						}
						//Überprüfen,  ob URL schon bekannt ist
						dsfAnzahl = 0;
						dsfVorhanden = 0;
						dsfLocalFilenameNr = 0;
						dsfNeu = 0;
						for ( var dsfJ=0; dsfJ<this.IMGURL.length; dsfJ++ )
						{
							if ( this.IMGURL[dsfJ].match(dsfIMGURL[dsfI]))
							{
								dsfVorhanden = 1;
								dsfLocalFilenameNr = dsfJ;
								dsfJ = this.IMGURL.length;
							}
						}
//alert("dsfVorhanden - "+dsfVorhanden);
						//Lokalen Dateinamen bestimmen
						if ( dsfVorhanden == 0 )
						{
							for ( var dsfJ=0; dsfJ<this.IMGURL.length; dsfJ++ )
							{
								if ( this.IMGFilename[dsfJ].match(dsfIMGFile[dsfI]) ) dsfAnzahl++;
							}
							//Daten hinzufügen, da es sich um eine neue Datei handelt
							this.IMGURL.push(dsfIMGURL[dsfI]);
							this.IMGFilename.push(dsfIMGFile[dsfI]);
							if ( dsfAnzahl == 0 )
							{
								this.IMGLocalFilename.push(dsfIMGFile[dsfI]);
							} else
							{
								var dsfTemp = "";
								dsfTemp = dsfIMGFile[dsfI].substring(0,dsfIMGFile[dsfI].length-4).concat("_" + anzahl).concat(dsfIMGFile[dsfI].substring(dsfIMGFile[dsfI].length-4,dsfIMGFile[dsfI].length));
								this.IMGLocalFilename.push(dsfTemp);
							}
							//dsfLocalFilenameNr bestimmen
							dsfLocalFilenameNr = this.IMGLocalFilename.length-1;
							dsfNeu = 1;
						}
//alert("Dateiname - "+this.IMGLocalFilename[dsfLocalFilenameNr]);
						//Verweise in dsffile_data aktualisieren
						var dsfNeuerTag = dsfKompletteURL[1]+this.IMGLocalFilename[dsfLocalFilenameNr];
						for ( var dsfJ=2; dsfJ<dsfKompletteURL.length; dsfJ++ )
						{
							dsfNeuerTag += dsfKompletteURL[dsfJ];
						}
							//regulaeren Suchbegriff zusammensetzen
						var dsfSchritt1 = dsfURL;
						dsfSchritt1 = dsfSchritt1.replace(/\//g, "\\/");
						dsfSchritt1 = dsfSchritt1.replace(/\"/g, "\\\"");
						dsfSchritt1 = dsfSchritt1.replace(/\'/g, "\\\'");
						dsfSchritt1 = dsfSchritt1.replace(/\./g, "\\.");
						dsfSchritt1 = dsfSchritt1.replace(/\(/g, "\\(");
						dsfSchritt1 = dsfSchritt1.replace(/\)/g, "\\)");
						dsfSchritt1 = dsfSchritt1.replace(/\?/g, "\\?");
						dsfSchritt1 = dsfSchritt1.replace(/\&/g, "\\&");
						dsfSchritt1 = dsfSchritt1.replace(/\r/g, "\\r&");
						dsfSchritt1 = dsfSchritt1.replace(/\n/g, "\\n");
						var dsfSuchbegriff = new RegExp(dsfSchritt1, "gi");
//alert("dsfNeuerTag - "+dsfNeuerTag+"\n\ndsfSuchbegriff - "+dsfSuchbegriff);
						dsffile_data = dsffile_data.replace(dsfSuchbegriff, dsfNeuerTag);
						//Datei herunterladen, falls erforderlich
						if ( dsfNeu == 1 )
						{
							dsfIMGDestination = this.contentDir.clone();
							dsfIMGDestination.append(this.IMGLocalFilename[dsfLocalFilenameNr]);
//alert("Speichere "+dsfKompletteURL[0]+" nach "+dsfIMGDestination.target);
							this.downSaveFile(dsfKompletteURL[0],dsfIMGDestination.target,false);
						}
					}
				}
			}
		//geladene Daten auf Datenträger schreiben
		var dsfFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		dsfFile.initWithPath( dsfDestination );
		// use 0x02 | 0x10 to open file for appending.
		var dsffoStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
		dsffoStream.init(dsfFile, 0x02 | 0x08 | 0x20, 0666, 0); 
		// write, create, truncate
		// In a c file operation, we have no need to set file mode with or operation,
		// directly using "r" or "w" usually.
		dsffoStream.write(dsffile_data, dsffile_data.length);
		dsffoStream.close();
	},

	saveFileInternal : function(aFileURL, aFileKey, aCaptureType)
	{
		if ( !aFileKey ) aFileKey = "file" + Math.random().toString();
		if ( !this.refURLObj ) this.refURLObj = sbCommonUtils.convertURLToObject(aFileURL);
		if ( this.frameNumber == 0 )
		{
			this.item.icon  = "moz-icon://" + sbCommonUtils.getFileName(aFileURL) + "?size=16";
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
				var ext = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(aNode.href))[1].toLowerCase();
				var dateiname = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(aNode.href))[0].toLowerCase();
				if (dateiname.search(":") >= 0)	ext = ext.toUpperCase();
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
				aNode.setAttribute("action", sbCommonUtils.resolveURL(this.refURLObj.spec, aNode.action));
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
		}
		else if ( aNode.style && aNode.style.cssText )
		{
			var newCSStext = this.inspectCSSText(aNode.style.cssText, this.refURLObj.spec);
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

	processCSSRecursively : function(aCSS)
	{
		var content = "";
		if ( !aCSS || aCSS.disabled ) return "";
		var medium = aCSS.media.mediaText;
		if ( medium != "" && medium.indexOf("screen") < 0 && medium.indexOf("all") < 0 )
		{
			return "";
		}
		if ( aCSS.href && aCSS.href.indexOf("chrome") == 0 ) return "";
		var flag = false;
		for ( var i=0; i<aCSS.cssRules.length; i++ )
		{
			if ( aCSS.cssRules[i].type == 1 || aCSS.cssRules[i].type == 4 || aCSS.cssRules[i].type == 5 )
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
			alert("ScrapBook Plus ERROR: Failed to download: " + aURLSpec);
			return;
		}
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
		if ( aURL.schemeIs("http") || aURL.schemeIs("https") || aURL.schemeIs("ftp") )
		{
			var targetFile = this.contentDir.clone();
			targetFile.append(newFileName);
//Der Try-Catch-Block wird auch bei einem alert innerhalb des Blocks weitergefuehrt!
			try {
				var WBP = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);
				WBP.persistFlags |= WBP.PERSIST_FLAGS_FROM_CACHE;
				WBP.persistFlags |= WBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
				WBP.saveURI(aURL, null, this.refURLObj, null, null, targetFile);
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
				var orgFile = sbCommonUtils.convertURLToFile(aURLSpec);
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

	trace : function(aText)
	{
		try {
			document.getElementById("statusbar-display").label = aText;
		} catch(ex) {
		}
	},

	onDownloadComplete : function(aItem)
	{
		this.trace(this.getString("CAPTURE") + "... (" + sbContentSaver.httpTask[aItem.id] + ") " + aItem.title);
	},

	onAllDownloadsComplete : function(aItem)
	{
		this.trace(this.getString("CAPTURE_COMPLETE") + ": " + aItem.title);
		this.onCaptureComplete(aItem);
	},

	onDownloadProgress : function(aItem, aFileName, aProgress)
	{
		this.trace(this.getString("TRANSFER_DATA") + "... (" + aProgress + ") " + aFileName);
	},

	onCaptureComplete : function(aItem)
	{
		if ( aItem && sbDataSource.getProperty(sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + aItem.id), "type") == "marked" ) return;
		if ( sbCommonUtils.getBoolPref("scrapbook.notifyOnComplete", true) )
		{
			window.openDialog("chrome://scrapbook/content/notify.xul", "", "chrome,dialog=yes,titlebar=no,popup=yes", aItem);
		}
		if ( aItem && aItem.id in sbContentSaver.httpTask ) delete sbContentSaver.httpTask[aItem.id];
	},

};


