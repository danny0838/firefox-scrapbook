
var sbp2CaptureSaver = {

	//Die globale Definition dieser Variablen vereinfacht die Handhabung
	scsDirectoryDst		: null,
	scsFrameList		: [],
	scsFrameListNr		: 0,
	scsEmbeddedImages	: false,
	scsEmbeddedScript	: false,
	scsEmbeddedStyles	: false,
	scsLinkedArchives	: false,
	scsLinkedAudio		: false,
	scsLinkedCustom		: false,
	scsLinkedImages		: false,
	scsLinkedMovies		: false,
	scsIcon				: null,

	scsURL				: [],
	scsURLHash			: {},
	scsURLDownloadStatus: [],
	scsURLFilename		: [],

	scsURLObj			: null,

	scsFxVer18			: null,

	buildURL : function(buURLPath, buString)
	{
//wird von sbp2CaptureSaver.downSaveFile aufgerufen
		//Bestimmung, ob vollständige URI, absolute Pfadangabe oder relative Pfadangabe vorliegen.
		//Die URI wird je nach Situation aufbereitet. An die aufrufende Funktion wird immer eine
		//vollständige URI zurückgegeben.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Adresse extrahieren
		//3. Analyse der URI
		//3.1 vollständige URI gefunden und zurückgeben
		//-
		//3.2 weitergehende Analyse der URI
		//3.2.1 absolute Pfadangabe gefunden
		//-
		//3.2.2 relative Pfadangabe gefunden
		//4.

		//1. Variablen initialisieren
		//2. Adresse extrahieren
		var buSplit = buString.match(/(url\().*?(\))/);
		var buStart = buSplit[1].length;
		var buEnd = buSplit[0].length-buSplit[2].length;
		if ( buSplit[0].substring(buStart, buStart+1) == "'" ) buStart++;
		if ( buSplit[0].substring(buEnd-1, buEnd) == "'" ) buEnd--;
		buSplit[0] = buSplit[0].substring(buStart, buEnd);
		//3. Adresse vervollständigen
//		buSplit[0] = buURLPath.resolve(buSplit[0]);
		//3. Analyse der URI
		if ( buSplit[0].indexOf("http") == 0 ) {
			//3.1 vollständige URI gefunden und zurückgeben -> nichts tun
		} else {
			//3.2 weitergehende Analyse der URI
			if ( buSplit[0].substring(0,1) == "\/" ) {
				//3.2.1 absolute Pfadangabe gefunden
				if ( buURLPath.substring(buURLPath.length-1, buURLPath.length) == "\/" ) {
					buSplit[0] = buURLPath.substring(0,buURLPath.length-1) + buString;
				} else {
					buSplit[0] = buURLPath + buString;
				}
			} else {
//alert("relative Pfadangabe");
				//relative Pfadangabe gefunden
				var buLevels = buSplit[0].split("\/");
				var buHasDirectoryBack = 0;
				var buHasDirectoryCurrent = false;
				buSplit[0] = buURLPath + "\/" + buSplit[0];
				if ( buLevels[0] == "\.\." ) {
//alert("eventuell zurueck in buURLPath");
					while ( buLevels[buHasDirectoryBack] == "\.\." ) {
						buHasDirectoryBack++;
					}
				} else if ( buLevels[0] == "\." ) {
//alert("Ausgang buURLPath");
					buHasDirectoryCurrent = true;
				}
				if ( buHasDirectoryBack>0 ) {
//alert("zurueck in buURLPath - anpassen Path");
					//buURLPath muss verkürzt werden
					var buURLPathSplit = buURLPath.split("\/");
					var buNr = buURLPathSplit.length - buHasDirectoryBack;
					if ( buURLPath.lastIndexOf("\/") == buURLPath.length-1 ) buNr--;
					buURLPath = buURLPathSplit[0];
					for ( var buI=1; buI<buNr; buI++ )
					{
						buURLPath = buURLPath + "\/" + buURLPathSplit[buI];
					}
				}
				var buNr = 0;
				if ( buHasDirectoryCurrent ) {
					buNr = 1;
				} else if ( buHasDirectoryBack > 0 ) {
					buNr = buHasDirectoryBack;
				}
				//
//alert(buURLPath+"\n---\n"+buLevels+"\n---\n"+buNr);
				for ( var buI=buNr; buI<buLevels.length; buI++ )
				{
					buURLPath = buURLPath + "\/" + buLevels[buI];
				}
				buSplit[0] = buURLPath;
			}
		}
		//4.
//alert(buSplit);
		return buSplit;
	},

	capture : function(cRootWindow, cFilename, cNewID, ctOptions)
	{
//wird von sbp2Common.captureTab aufgerufen
		//Archiviert den Inhalt des selektierten Tab (cRootWindow)
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Liste mit Frames erstellen
		//3. Inhalte archivieren
		//4. Falls in Schritt 3 kein Icon gefunden wurde, wird jetzt versucht, eines zu bestimmen
		//5. Dateiname vom Icon zurück an aufrufende Funktion

		//1. Variablen initialisieren
		this.scsFrameList = [];
		this.scsFrameListNr = 0;
		this.scsEmbeddedImages = ctOptions.embeddedImages;
		this.scsEmbeddedScript = ctOptions.embeddedScript;
		this.scsEmbeddedStyles = ctOptions.embeddedStyles;
		this.scsLinkedArchives = ctOptions.linkedArchives;
		this.scsLinkedAudio = ctOptions.linkedAudio;
		this.scsLinkedCustom = ctOptions.linkedCustom;
		this.scsLinkedImages = ctOptions.linkedImages;
		this.scsLinkedMovies = ctOptions.linkedMovies;
		this.scsIcon = null;
		this.scsURL = [];
		this.scsURLHash = {};
		this.scsURLDownloadStatus= [];
		this.scsURLFilename = [];
		this.scsDirectoryDst = sbp2Common.getBuchVZ();
		this.scsDirectoryDst.append("data");
		this.scsDirectoryDst.append(cNewID);
		if ( this.scsFxVer18 == null )
		{
			var cAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
			var cVerComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
			this.scsFxVer18 = cVerComparator.compare(cAppInfo.version, "18.0")>=0;
		}
		//2. Liste mit Frames erstellen
		this.scsFrameList = sbp2Common.getFrameList(cRootWindow);
		//3. Inhalte archivieren
		this.saveDocumentInternal(cRootWindow.document, cFilename);
		//4. Falls in Schritt 3 kein Icon gefunden wurde, wird jetzt versucht, eines zu bestimmen
		//(nsIFaviconService funktioniert nicht, wenn Firefox im Private Modus läuft. Daher dieser Weg.)
		if ( this.scsIcon == null ) {
			var cMainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
							  .getInterface(Components.interfaces.nsIWebNavigation)
							  .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
							  .rootTreeItem
							  .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
							  .getInterface(Components.interfaces.nsIDOMWindow);
			var cURL = cMainWindow.gBrowser.selectedTab.getAttribute("image");
			if ( cURL != "" ) {
				this.scsIcon = this.downSaveFile(cMainWindow.gBrowser.selectedTab.getAttribute("image"), true);
			} else {
				this.scsIcon = "";
			}
		}
		//5. Dateiname vom Icon zurück an aufrufende Funktion
		return this.scsIcon;
	},

	convertURLToObject : function(cutoURLString)
	{
//wird momentan von this.saveDocumentInternal aufgerufen
		var cutoURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
		cutoURL.spec = cutoURLString;
		return cutoURL;
	},

	saveDocumentInternal : function(sdiDocument, sdiFilename)
	{
//wird momentan von this.capture und this.inspectNode aufgerufen
		//Erstellt eine Kopie der Seite im Speicher und modifiziert den Inhalt der Kopie so, dass die Seite lokal abrufbar ist, ohne Daten aus dem Internet nachladen zu müssen.
		//Stylesheets werden normalerweise übernommen, JavaScript-Code entfernt. Beides ist über den "Capture As"-Dialog auch steuerbar.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Kopie der geladenen Seite im Speicher erstellen
		//3. Verweise anpassen
		//4. HTML-Code zusammenstellen
		//5. Schreiben der finalen Datei

		//1. Variablen initialisieren
		var sdiHTML			= "";
		var sdiNodeList		= [];
		this.scsURLObj		= this.convertURLToObject(sdiDocument.URL);
		//2. Kopie der geladenen Seite im Speicher erstellen
		sdiNodeList.unshift(sdiDocument.body.cloneNode(true));			//Sinn unklar!
		var sdiRootNode = sdiDocument.getElementsByTagName("html")[0].cloneNode(false);
		var sdiHeadNode = sdiDocument.getElementsByTagName("head")[0].cloneNode(true);
		sdiRootNode.appendChild(sdiHeadNode);
		sdiRootNode.appendChild(sdiDocument.createTextNode("\n"));
		sdiRootNode.appendChild(sdiNodeList[0]);
		sdiRootNode.appendChild(sdiDocument.createTextNode("\n"));
		//3. Verweise anpassen
		this.processDOMRecursively(sdiRootNode, sdiFilename);
		//4. HTML-Code zusammenstellen
		var sdiHTML = this.addHTMLTag(sdiRootNode, sdiRootNode.innerHTML);
		if ( sdiDocument.doctype ) sdiHTML = this.addHTMLDocType(sdiDocument.doctype) + sdiHTML;
		//5. Schreiben der finalen Datei
		var sdiFileDst = this.scsDirectoryDst.clone();
		sdiFileDst.append(sdiFilename);
		sbp2Common.fileWrite(sdiFileDst, sdiHTML, sdiDocument.characterSet);
	},

	processDOMRecursively : function(pdrRootNode, pdrFilename)
	{
//wird momentan nur von this.saveDocumentInternal aufgerufen
		for ( var pdrCurNode=pdrRootNode.firstChild; pdrCurNode!=null; pdrCurNode=pdrCurNode.nextSibling )
		{
			if ( pdrCurNode.nodeName == "#text" || pdrCurNode.nodeName == "#comment" ) continue;
			pdrCurNode = this.inspectNode(pdrCurNode);
			this.processDOMRecursively(pdrCurNode, pdrFilename);
		}
	},

	fileGetExtension : function(fgeFileString)
	{
//wird momentan nur von this.fileGetExtension aufgerufen
		var fgePos = fgeFileString.lastIndexOf(".");
		var fgeReturnCode = null;
		if ( fgePos > -1 ) fgeReturnCode = fgeFileString.substring(fgePos+1,fgeFileString.length);
		return fgeReturnCode;
	},

	inspectNode : function(inCurNode, inFilename)
	{
//wird momentan nur von this.processDOMRecursively aufgerufen
		switch ( inCurNode.nodeName.toUpperCase() )
		{
			case "A":
				//Verweis vervollständigen
				if ( !inCurNode.hasAttribute("href") ) break;
				if ( inCurNode.getAttribute("href").charAt(0) == "#" ) break;
				if ( inCurNode.hasAttribute("style") ) {
					if ( this.scsEmbeddedStyles ) {
//alert("a style - "+inCurNode);
					} else {
//						return this.removeNodeFromParent(inCurNode);
						inCurNode = this.removeNodeFromParent(inCurNode);
					}
				}
				if ( this.scsLinkedImages ) {
					var inFileExtension = this.fileGetExtension(inCurNode.href).toLowerCase();
					var inDownload = false;
					switch ( inFileExtension )
					{
						case "jpg" : case "jpeg" : case "png" : case "gif" : case "tiff" : inDownload = this.scsLinkedImages; break;
						case "mp3" : case "wav"  : case "ram" : case "rm"  : case "wma"  : inDownload = this.scsLinkedAudio; break;
						case "mpg" : case "mpeg" : case "avi" : case "mov" : case "wmv"  : inDownload = this.scsLinkedMovies; break;
						case "zip" : case "lzh"  : case "rar" : case "jar" : case "xpi"  : inDownload = this.scsLinkedArchives; break;
					}
					if ( inDownload ) {
						var inFileDst = this.downSaveFile(inCurNode.href, false);
						inCurNode.setAttribute("href", inFileDst);
					}
				} else {
					inCurNode.setAttribute("href", inCurNode.href);
				}
				break;
			case "FORM":
/*
				//Vervollständigen der Adresse des Attributes "action"
				if ( inCurNode.action.match(/^http:\/\//) ) {
					inCurNode.setAttribute("action", inCurNode.action);
				} else {
					alert("sbp2CaptureSaver.inspectNode\n---\n\nURL is incomplete -- "+inCurNode.action+". Contact the developer.");
				}
*/
		try {
			var aBaseURL = this.scsURLObj.spec;
			var aRelURL = inCurNode.action;
			var baseURLObj = this.convertURLToObject(aBaseURL);
			//" entfernen aus aRelURL
			aRelURL = aRelURL.replace(/\"/g, "");
			inCurNode.setAttribute("action", baseURLObj.resolve(aRelURL));
		} catch(ex) {
			dump("*** ScrapBook Plus ERROR: Failed to resolve URL: " + aBaseURL + "\t" + aRelURL + "\n");
		}
				break;
			case "FRAME":
			case "IFRAME":
				var inFileString = this.url2filestring(inCurNode.src);
				this.scsFrameListNr++;
				this.saveDocumentInternal(this.scsFrameList[this.scsFrameListNr].document, inFileString);
				inCurNode.src = inFileString;
				break;
			case "IMG":
				//Bild herunterladen oder ganz entfernen
				if ( this.scsEmbeddedImages ) {
					var inURL = inCurNode.src;
					var inFileDst = this.downSaveImage(inURL);
					if ( inFileDst ) {
						inCurNode.setAttribute("src", inFileDst);
					} else {
						inCurNode.setAttribute("src", inURL);
					}
				} else {
//					return this.removeNodeFromParent(inCurNode);
					inCurNode = this.removeNodeFromParent(inCurNode);
				}
				break;
			case "LINK":
				if ( inCurNode.rel.toLowerCase() == "stylesheet" ) {
					if ( this.scsEmbeddedStyles ) {
						var inURL = inCurNode.href;
						var inFileDst = this.downSaveFile(inURL, true);
						if ( inFileDst ) {
							inCurNode.setAttribute("href", inFileDst);
						} else {
							inCurNode.setAttribute("href", inURL);
						}
					} else {
//						return this.removeNodeFromParent(inCurNode);
						inCurNode = this.removeNodeFromParent(inCurNode);
					}
				} else if ( inCurNode.rel.toLowerCase() == "shortcut icon" ) {
					var inURL = inCurNode.href;
					var inFileDst = this.downSaveFile(inURL);
					if ( inFileDst ) {
						inCurNode.setAttribute("href", inFileDst);
						this.scsIcon = inFileDst;
					} else {
						inCurNode.setAttribute("href", inCurNode.href);
					}
				} else {
					inCurNode.setAttribute("href", inCurNode.href);
				}
				break;
			case "SCRIPT":
			case "NOSCRIPT":
				if ( this.scsEmbeddedScript ) {
				} else {
//					return this.removeNodeFromParent(inCurNode);
					inCurNode = this.removeNodeFromParent(inCurNode);
				}
				break;
			case "STYLE":
				if ( this.scsEmbeddedStyles ) {
//alert("style");
				} else {
//					return this.removeNodeFromParent(inCurNode);
					inCurNode = this.removeNodeFromParent(inCurNode);
				}
				break;
			default:
				dump(inCurNode.nodeName+"\n");
				break;
		}
		return inCurNode;
	},

	downSaveFile : function(dsfURLSpec, dsfIsStyleSheet)
	{
		//Läd das Dokument hinter dsfURLSpec herunter und speichert es unverändert nach dsfDirectory als dsfFileString
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. dsfURLPath bestimmen
		//3. Falls URL bekannt ist, vorhandene Informationen prüfen und passenden Dateinamen zurück an aufrufende Funktion geben
		//4. Dateiinhalt herunterladen
		//5. Datei schreiben
		//6. Dateiname an aufrufende Funktion zurückgeben

if ( !dsfURLSpec ) {
	alert("sbp2CaptureSaver.downSaveFile\n---\ndsfURLSpec nicht angegeben.");
	return;
}
		//1. Variablen initialisieren
		var dsfData = "";
		var dsfFileString = "";
		var dsfURLPath = "";
		//2. dsfURLPath bestimmen (eventuell werden nicht alle Fälle abgedeckt, ist aber schneller als die alte Version)
		var dsfLastPosition = dsfURLSpec.lastIndexOf("\/");
		dsfURLPath = dsfURLSpec.substring(0,dsfLastPosition);
		//3. Falls URL bekannt ist, vorhandene Informationen prüfen und passenden Dateinamen zurück an aufrufende Funktion geben
		if ( this.scsURLHash[dsfURLSpec] ) {
			switch ( this.scsURLDownloadStatus[this.scsURLHash[dsfURLSpec]] )
			{
				case -1:
					//Datei konnte nicht heruntergeladen werden -> Originaladresse muss eingetragen werden im Code
					return "";
					break;
				case 0:
					alert("sbp2CaptureSaver.downSaveFile\n---\nungültiger Wert für scsURLDownloadStatus - 0");
					break;
				case 1:
					//Datei konnte heruntergeladen werden -> Dateiname ist schon bekannt und kann eingetragen werden im Code
					return this.scsURLFilename[this.scsURLHash[dsfURLSpec]];
					break;
				default:
					alert("sbp2CaptureSaver.downSaveFile\n---\nungültiger Wert für scsURLDownloadStatus - "+this.scsURLDownloadStatus[this.scsURLHash[dsfURLSpec]]);
					break;
			}
		}
		//4. Dateiinhalt herunterladen
		var dsfStatus = 1;
		//4.2 Daten vom Server holen
		//4.2.1 Verbindung zum Server aufbauen
		var dsfioserv = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		var dsfChannel = dsfioserv.newChannel(dsfURLSpec, 0, null);
		var dsfStream = null;
		try {
			dsfStream = dsfChannel.open();
		} catch(dsfEx) {
dump("sbp2CaptureSaver.downSaveFile\n---\n"+dsfURLSpec+" konnte nicht geoeffnet werden.");
			dsfStatus = -1;
		}
		//4.2.2 Serverantwort überprüfen
		if ( dsfStatus == 1 ) {
			if ( dsfChannel instanceof Components.interfaces.nsIHttpChannel ) {
				try {
					if ( dsfChannel.responseStatus != 200 ) return "";
				} catch(dsfEx) {
					dsfStatus = -1;
				}
			}
		}
		//4.2.3 Daten in Speicher holen
		if ( dsfStatus == 1 ) {
			//4.2.3.1 Daten laden
			var dsfBStream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
			dsfBStream.setInputStream(dsfStream);
			var dsfSize = 0;
//Syntax so korrekt = anstatt == ???
			while ( dsfSize = dsfBStream.available() )
			{
				dsfData += dsfBStream.readBytes(dsfSize);
			}
			//4.2.3.2 Der Inhalt eines StyleSheet muß geprüft werden auf verlinkte Dateien (i.d.R. Bilder)
			if ( dsfIsStyleSheet ) {
				//verlinkte Dateien suchen
				var dsfLinks = dsfData.match(/url\(.*?\)/gi);
				if ( dsfLinks ) {
					//doppelte Links und chrome://... entfernen
					var dsfHash = {};
					for ( var dsfI=0; dsfI<dsfLinks.length; dsfI++ )
					{
						dsfHash[dsfLinks[dsfI]] = 0;
					}
					dsfLinks = [];
					for ( var dsfItem in dsfHash )
					{
						if ( dsfItem.indexOf("chrome:\/\/") > -1 ) continue;
						dsfLinks.push(dsfItem);
					}
					//alle verbliebenen Links durcharbeiten
					for ( var dsfI=0; dsfI<dsfLinks.length; dsfI++ )
					{
						var dsfURLImage = dsfLinks[dsfI];
						var dsfSplit = this.buildURL(dsfURLPath, dsfURLImage);
						var dsfFile = this.downSaveFile(dsfSplit[0]);
						//Gefundenes Tag im Code austauschen
						if ( dsfFile != "" ) {
							dsfURLImage = dsfURLImage.replace(/\(/g, "\\(");
							dsfURLImage = dsfURLImage.replace(/\)/g, "\\)");
							dsfURLImage = dsfURLImage.replace(/\?/g, "\\?");
							var dsfSearchterm = new RegExp(dsfURLImage, "g");
							dsfData = dsfData.replace(dsfSearchterm,dsfSplit[1]+dsfFile+dsfSplit[2]);
						}
					}
				}
			}
			//5. Datei schreiben
			//5.1 lokalen Dateinamen bestimmen
			dsfFileString = this.url2filestring(dsfURLSpec);
			//5.2 neue Datei auf den Datenträger schreiben
			var dsfDirectory = this.scsDirectoryDst.clone();
			dsfDirectory.append(dsfFileString);
			var dsffoStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
			dsffoStream.init(dsfDirectory, 0x02 | 0x08 | 0x20, parseInt("0666", 8), 0);
			dsffoStream.write(dsfData, dsfData.length);
			dsffoStream.close();
			//5.3 Daten in Speicher aufnehmen
			var dsfArrayPos = sbp2CaptureSaver.scsURL.length;
			sbp2CaptureSaver.scsURL.push(dsfURLSpec);
			sbp2CaptureSaver.scsURLFilename.push(dsfFileString);
			sbp2CaptureSaver.scsURLDownloadStatus.push(1);
			sbp2CaptureSaver.scsURLHash[dsfURLSpec] = dsfArrayPos;
		}
		//6. Dateiname an aufrufende Funktion zurückgeben
		return dsfFileString;
	},

	downSaveImage : function(dsiURLSpec)
	{
		//Ablauf:
		//1. Falls URL bekannt ist, vorhandene Informationen prüfen und passenden Dateinamen zurück an aufrufende Funktion geben
		//2. Falls URL noch unbekannt ist, Bild herunterladen
		//3. Dateiname des Bildes zurück an aufrufende Funktion geben

		//1. Falls URL bekannt ist, vorhandene Informationen prüfen und passenden Dateinamen zurück an aufrufende Funktion geben
		if ( this.scsURLHash[dsiURLSpec] ) {
			switch ( this.scsURLDownloadStatus[this.scsURLHash[dsiURLSpec]] ) {
				case -1:
					//Datei konnte nicht heruntergeladen werden -> Originaladresse muss eingetragen werden im Code
					return "";
					break;
				case 0:
					alert("sbp2CaptureSaver.downSaveImage\n---\nungültiger Wert für scsURLDownloadStatus - 0");
					break;
				case 1:
					//Datei konnte heruntergeladen werden -> Dateiname ist schon bekannt und kann eingetragen werden in Code
					return this.scsURLFilename[this.scsURLHash[dsiURLSpec]];
					break;
				default:
					alert("sbp2CaptureSaver.downSaveImage\n---\nungültiger Wert für scsURLDownloadStatus - "+this.scsURLDownloadStatus[this.scsURLHash[dsiURLSpec]]);
					break;
			}
		}
		//2. Falls URL noch unbekannt ist, Bild herunterladen
		var dsiURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
		try {
			dsiURL.spec = dsiURLSpec;
		} catch(ex) {
			alert("sbp2CaptureSaver.downSaveImage\n---\nBild konnte nicht heruntergeladen werden "+dsiURLSpec);
			return "";
		}
		var dsiFileString = this.url2filestring(dsiURLSpec);
		var dsiFile = this.scsDirectoryDst.clone();
		dsiFile.append(dsiFileString);
		if ( dsiURL.schemeIs("http") || dsiURL.schemeIs("https") || dsiURL.schemeIs("ftp") ) {
			try {
				//Bild herunterladen
				var WBP = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);
				WBP.persistFlags |= WBP.PERSIST_FLAGS_FROM_CACHE;
				WBP.persistFlags |= WBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
				if ( this.scsFxVer18 ) {
					WBP.saveURI(dsiURL, null, null, null, null, dsiFile, null);
				} else {
					WBP.saveURI(dsiURL, null, null, null, null, dsiFile);
				}
				//Daten in Speicher aufnehmen
				var dsiArrayPos = sbp2CaptureSaver.scsURL.length;
				sbp2CaptureSaver.scsURL.push(dsiURLSpec);
				sbp2CaptureSaver.scsURLFilename.push(dsiFileString);
				sbp2CaptureSaver.scsURLDownloadStatus.push(1);
				sbp2CaptureSaver.scsURLHash[dsiURLSpec] = dsiArrayPos;
			} catch(dsiEx) {
				alert(dsiEx);
			}
		} else {
			alert("sbp2CaptureSaver.downSaveImage\n---\nunbekannter URL-Typ - "+dsiURLSpec);
		}
		//3. Dateiname des Bildes zurück an aufrufende Funktion geben
		return dsiFileString;
	},

	addHTMLDocType : function(ahdtDocType)
	{
//wird nur von this.capture aufgerufen
		//Erstellt eine Zeile mit Angaben zum Dokumenttyp
		var ahdtLine = "<!DOCTYPE " + ahdtDocType.name.toUpperCase();
		if ( ahdtDocType.publicId ) ahdtLine += " PUBLIC \"" + ahdtDocType.publicId + "\"";
		if ( ahdtDocType.systemId ) ahdtLine += " \""        + ahdtDocType.systemId + "\"";
		ahdtLine += ">\n";
		return ahdtLine;
	},

	addHTMLTag : function(ahtNode, ahtContent)
	{
//wird nur von this.capture aufgerufen
		//Fügt das HTML-Tag ein und ergänzt dabei zusätzliche Attribute, falls vorhanden
		var ahtTag = "<" + ahtNode.nodeName.toLowerCase();
		for ( var ahtI=0; ahtI<ahtNode.attributes.length; ahtI++ )
		{
			ahtTag += ' ' + ahtNode.attributes[ahtI].name + '="' + ahtNode.attributes[ahtI].value + '"';
		}
		ahtTag += ">\n";
		return ahtTag + ahtContent + "</" + ahtNode.nodeName.toLowerCase() + ">\n";
	},

	removeNodeFromParent : function(rnfpNode)
	{
//wird nur von this.inspectNode aufgerufen
		//Ersetzt die Node rnfpNode durch "nichts"
		var rnfpNodeNew = rnfpNode.ownerDocument.createTextNode("");
		rnfpNode.parentNode.replaceChild(rnfpNodeNew, rnfpNode);
		rnfpNode = rnfpNodeNew;
		return rnfpNode;
	},

	url2filestring : function(u2fFileString)
	{
//wird momentan nur von this.downSaveFile, this.downSaveImage und this.inspectNode aufgerufen
		//Bestimmt anhand der übergebenen Adresse einen sinnvollen Dateinamen und gibt diesen an die aufrufende Funktion zurück.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Zeichenkette nach dem letzten / bestimmen
		//3. Zeichenkette vor dem ersten ? bestimmen
		//4. Dateinamen an aufrufende Funktion zurückliefern
/*
		u2fFileString = u2fFileString.substring(u2fFileString.lastIndexOf("/")+1, u2fFileString.length);
		if ( u2fFileString.substring(u2fFileString.length-1, u2fFileString.length).match(/\//) )
			u2fFileString = u2fFileString.substring(0, u2fFileString.length-1);
		if ( u2fFileString.search(/\?/)>0 ) {
			u2fFileString = u2fFileString.substring(0, u2fFileString.search(/\?/));
		} else if ( u2fFileString.search(/\?/)==0 ) {
			u2fFileString = u2fFileString.substring(1, u2fFileString.length);
		}
		u2fFileString = u2fFileString.replace(/:/g, "-");
		u2fFileString = u2fFileString.replace(/%20/g, " ");
		var u2fFileStringSplit = u2fFileString.split(".");
		var u2fCount = 0;
		var u2fExtension = "";
		var u2fContinue = 1;
		//Warnung wegen ungültiger Referenz lässt sich so umgehen
		while ( u2fContinue==1 )
		{
			if ( sbpCapture.scFilenameHash[u2fFileString]==undefined ) {
				u2fContinue = 0;
			} else {
				u2fCount++;
				u2fFileString = u2fFileStringSplit[0]+"_"+u2fCount+"."+u2fFileStringSplit[1];
			}
		}
*/
		//1. Variablen initialisieren
		var u2fPos = -2;
		//2. Zeichenkette nach dem letzten / bestimmen
		u2fFileString = u2fFileString.substring(u2fFileString.lastIndexOf("/")+1, u2fFileString.length);
		//3. Zeichenkette vor dem ersten ? bestimmen
		u2fPos = u2fFileString.search(/\?/);
		if ( u2fPos > -1 ) {
			u2fFileString = u2fFileString.substring(0, u2fPos);
		}
		//4. Dateinamen an aufrufende Funktion zurückliefern
		return u2fFileString;
	},

}