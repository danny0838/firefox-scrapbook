
Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

const STATE_STOP = Components.interfaces.nsIWebProgressListener.STATE_STOP;

var sbp2CaptureSaver = {

	//Die globale Definition dieser Variablen vereinfacht die Handhabung
	scsItem				: { id: "", type: "", title: "", chars: "", icon: "", source: "", comment: "" },
	scsPosition			: null,
	scsResCont			: null,

	scsDirectoryDst		: null,
	scsEmbeddedImages	: false,
	scsEmbeddedScript	: false,
	scsEmbeddedStyles	: false,
	scsLinkedArchives	: false,
	scsLinkedAudio		: false,
	scsLinkedCustom		: false,
	scsLinkedImages		: false,
	scsLinkedMovies		: false,
	scsURL				: [],	//enthält für jedes Frame die baseURL

	scsStyleSheetFilename : [],	//enthält die Dateinamen der StyleSheets im Verzeichnis des Eintrags
	scsStyleSheetRules	: [],	//enthält Platz für alle verfügbaren Regeln eines StyleSheets; mit Text vorhanden sind aber nur die tatsächlich genutzten Regeln

	scsWindowURLSource	: null,	//wird für PrivacyMode in downSaveFile benötigt

	scsCaptureRunning	: 0,
	scsDLProgress		: [0, 0],	//1. Zahl: fertig verarbeitete Dateien, 2. Zahl: Dateien insgesamt

	scsDLAsyncProjectNr	: [],
	scsDLAsyncURL		: [],
	scsDLAsyncFilename	: [],
	scsDLAsyncStatus	: [],

	scsArrayURL			: [],	//enthält Dateiname
	scsArrayURLHTML		: [],	//enthält Dateiname
	scsArrayURLHTMLStyles	: [],	//Wert gibt an, wie viele Style-Blöcke in der aktuellen HTML-Seite schon bearbeitet worden sind
	scsArrayURLHTMLNr	: 0,
	scsHashURL			: {},	//enthält Dateiname
	scsHashURLHTML		: {},	//enthält Dateiname
	scsHashFilename		: {},	//enthält 0

	scsFxVer18			: null,

	buildURL : function(buURLPath, buString)
	{
//wird von this.downSaveFile aufgerufen
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
		if ( buSplit[0].substring(buStart, buStart+1) == "\"" ) buStart++;
		if ( buSplit[0].substring(buEnd-1, buEnd) == "'" ) buEnd--;
		if ( buSplit[0].substring(buEnd-1, buEnd) == "\"" ) buEnd--;
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
				//relative Pfadangabe gefunden
				var buLevels = buSplit[0].split("\/");
				var buHasDirectoryBack = 0;
				var buHasDirectoryCurrent = false;
				buSplit[0] = buURLPath + "\/" + buSplit[0];
				if ( buLevels[0] == "\.\." ) {
					while ( buLevels[buHasDirectoryBack] == "\.\." ) {
						buHasDirectoryBack++;
					}
				} else if ( buLevels[0] == "\." ) {
					buHasDirectoryCurrent = true;
				}
				if ( buHasDirectoryBack>0 ) {
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
				for ( var buI=buNr; buI<buLevels.length; buI++ )
				{
					buURLPath = buURLPath + "\/" + buLevels[buI];
				}
				buSplit[0] = buURLPath;
			}
		}
		//4.
		return buSplit;
	},

	capture : function(cRootWindow, cFilename, cOptions)
	{
//wird von sbp2Common.captureTab aufgerufen
		//Archiviert den Inhalt des selektierten Tab (cRootWindow)
		//
		//Ablauf:
		//0. Funktion verlassen, falls schon eine Archivierung läuft
		//1. Variablen initialisieren
		//2. Liste mit Frames erstellen
		//3. Seiteninhalt archivieren
		//4. URL der Seite merken, damit diese in sbp2-url2filename.txt ohne zusätzliche Arbeiten abgelegt werden kann
		//5. CSS-Seiten schreiben, falls dies gewünscht ist
		//6. Falls in Schritt 3 kein Icon gefunden wurde, wird jetzt versucht, eines zu bestimmen
		//7. erstellen von sbp2-html2filename.txt und sbp2.url2filename.txt
		//8. Ende Verarbeitung erreicht

		//0. Funktion verlassen, falls schon eine Archivierung läuft
		if ( this.scsCaptureRunning == 1 ) return null;
		//1. Variablen initialisieren
		this.scsItem.id = cOptions.id;
		this.scsItem.type = cOptions.type;
		this.scsItem.title = cOptions.title;
		this.scsItem.chars = cOptions.charset;
		this.scsItem.icon = cOptions.icon;
		this.scsItem.source = cOptions.source;
		this.scsItem.comment = cOptions.comment;
		this.scsPosition = cOptions.position;
		this.scsResCont = cOptions.resCont;

		this.scsWindowURLSource = cRootWindow;

		this.scsCaptureRunning = 1;
		this.scsArrayURL = [];
		this.scsArrayURLHTML = [];
		this.scsArrayURLHTMLStyles = [];
		this.scsArrayURLHTMLNr = 0;
		this.scsEmbeddedImages = cOptions.embeddedImages;
		this.scsEmbeddedScript = cOptions.embeddedScript;
		this.scsEmbeddedStyles = cOptions.embeddedStyles;
		this.scsLinkedArchives = cOptions.linkedArchives;
		this.scsLinkedAudio = cOptions.linkedAudio;
		this.scsLinkedCustom = cOptions.linkedCustom;
		this.scsLinkedImages = cOptions.linkedImages;
		this.scsLinkedMovies = cOptions.linkedMovies;
		this.scsURL = [];
		this.scsHashURL = {};
		this.scsHashURLHTML = {};
		this.scsHashFilename = {};
		this.scsStyleSheetFilename = [];
		this.scsStyleSheetRules = [];

		this.scsDLProgress[0] = 0;
		this.scsDLProgress[1] = 0;
		this.scsDLAsyncProjectNr = [];
		this.scsDLAsyncURL = [];
		this.scsDLAsyncFilename = [];
		this.scsDLAsyncStatus = [];

		this.scsDirectoryDst = sbp2Common.getBuchVZ();
		this.scsDirectoryDst.append("data");
		this.scsDirectoryDst.append(cOptions.id);
		if ( this.scsFxVer18 == null )
		{
			var cAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
			var cVerComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
			this.scsFxVer18 = cVerComparator.compare(cAppInfo.version, "18.0")>=0;
		}
		//2. Liste mit Frames erstellen
		this.scsArrayURLHTML = sbp2Common.getFrameList(cRootWindow);
		for ( var cI=0; cI<this.scsArrayURLHTML.length; cI++ )
		{
			this.scsArrayURLHTMLStyles.push(1);
		}
		this.scsDLProgress[1] = this.scsArrayURLHTML.length;
		//3. Seiteninhalt archivieren
		this.saveDocumentInternal(cRootWindow.document, cFilename);
		//4. URL der Seite merken, damit diese in sbp2-url2filename.txt ohne zusätzliche Arbeiten abgelegt werden kann
		this.scsHashURLHTML[cRootWindow.location.href] = cFilename;
		//5. CSS-Seiten schreiben, falls dies gewünscht ist
		if ( this.scsEmbeddedStyles ) {
			var cData = "";
			for ( var cI=0; cI<this.scsStyleSheetFilename.length; cI++ )
			{
				if ( this.scsStyleSheetFilename[cI].length > 0 ) {
					cData = "";
					//genutzte Rules zusammenstellen
					for ( var cJ=0; cJ<this.scsStyleSheetRules[cI].length; cJ++ )
					{
						if ( this.scsStyleSheetRules[cI][cJ].length > 0 ) {
							cData = cData + "\n" + this.scsStyleSheetRules[cI][cJ] + "\n";
						}
					}
					//Datei erstellen, falls Daten vorhanden sind
					if ( cData.length>0 ) {
						var cFileDst = this.scsDirectoryDst.clone();
						cFileDst.append(this.scsStyleSheetFilename[cI]);
						sbp2Common.fileWrite(cFileDst, cData, "UTF-8");
					}
				}
			}
		}
		//6. Falls in Schritt 3 kein Icon gefunden wurde, wird jetzt versucht, eines zu bestimmen
		//(nsIFaviconService funktioniert nicht, wenn Firefox im Private Modus läuft. Daher dieser Weg.)
		if ( this.scsItem.icon == null ) {
			var cMainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
							  .getInterface(Components.interfaces.nsIWebNavigation)
							  .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
							  .rootTreeItem
							  .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
							  .getInterface(Components.interfaces.nsIDOMWindow);
			var cURL = cMainWindow.gBrowser.selectedTab.getAttribute("image");
			if ( cURL != "" ) {
				this.scsItem.icon = this.downSaveFile(cMainWindow.gBrowser.selectedTab.getAttribute("image"), false);
			} else {
				this.scsItem.icon = "";
			}
		}
		//7. erstellen von sbp2-html2filename.txt und sbp2.url2filename.txt
		//(stellt ein Abbild des Hash dar und wird für this.captureAddWebsite verwendet)
		var cData = "";
		var cFile = sbp2CaptureSaver.scsDirectoryDst.clone();
		cFile.append("sbp2-html2filename.txt");
		for ( var u in this.scsHashURLHTML ) cData += u + "\t" + this.scsHashURLHTML[u] + "\n";
		sbp2Common.fileWrite(cFile, cData, "UTF-8");
		cData = "";
		cFile = sbp2CaptureSaver.scsDirectoryDst.clone();
		cFile.append("sbp2-url2filename.txt");
		for ( var u in this.scsHashURL ) cData += u + "\t" + this.scsHashURL[u] + "\n";
		sbp2Common.fileWrite(cFile, cData, "UTF-8");
		//8. Ende Verarbeitung erreicht
		this.captureCompleteCheck();
	},

	captureAddWebsite : function(cawRootWindow, cawFilename, cawNewID, cawOptions)
	{
alert("sbp2CaptureSaver.captureAddWebsite - Out of order.");
	},

	captureCompleteCheck : function()
	{
		//Hier wird geprüft, ob alle zu speichernden Dateien schon auf der Platte liegen. (HTML und asynchrone Downloads)
		//
		//Ablauf:
		//1. Anzahl abgeschlossener Downloads um 1 erhöhen
		//2. Prüfen, ob alle Arbeiten abgeschlossen sind -> sbp2Common.captureTabFinish aufrufen

		//1. Anzahl abgeschlossener Downloads um 1 erhöhen
		this.scsDLProgress[0]++;
		//2. Prüfen, ob alle Arbeiten abgeschlossen sind -> sbp2Common.captureTabFinish aufrufen
		if ( this.scsDLProgress[0] == this.scsDLProgress[1] ) {
			sbp2Common.captureTabFinish(this.scsItem, this.scsResCont, this.scsPosition);
		}
	},

	convertURLToObject : function(cutoURLString)
	{
//wird von this.inspectNode aufgerufen
		var cutoURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
		cutoURL.spec = cutoURLString;
		return cutoURL;
	},

	saveDocumentInternal : function(sdiDocument, sdiFilename)
	{
//wird von this.capture und this.inspectNode aufgerufen
		//Erstellt eine Kopie der Seite im Speicher und modifiziert den Inhalt der Kopie so, dass die Seite lokal abrufbar ist, ohne Daten aus dem Internet nachladen zu müssen.
		//Stylesheets werden normalerweise übernommen, JavaScript-Code entfernt. Beides ist über den "Capture As"-Dialog auch steuerbar.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Kopie der geladenen Seite im Speicher erstellen
		//3. Inhalt prüfen und gegebenenfalls anpassen
		//4. HTML-Code zusammenstellen
		//5. HTML-Code in Datei ablegen

		//1. Variablen initialisieren
		var sdiHTML = "";
		var sdiNodeList = [];
		this.scsURL.push(sdiDocument.URL);
		//2. Kopie der geladenen Seite im Speicher erstellen
		sdiNodeList.unshift(sdiDocument.body.cloneNode(true));			//Sinn unklar!
		var sdiRootNode = sdiDocument.getElementsByTagName("html")[0].cloneNode(false);
		var sdiHeadNode = sdiDocument.getElementsByTagName("head")[0].cloneNode(true);
		sdiRootNode.appendChild(sdiHeadNode);
		sdiRootNode.appendChild(sdiDocument.createTextNode("\n"));
		sdiRootNode.appendChild(sdiNodeList[0]);
		sdiRootNode.appendChild(sdiDocument.createTextNode("\n"));
		//3. Inhalt prüfen und gegebenenfalls anpassen
		this.processDOMRecursively(sdiRootNode, sdiFilename);
		//4. HTML-Code zusammenstellen
		var sdiHTML = this.addHTMLTag(sdiRootNode, sdiRootNode.innerHTML);
		if ( sdiDocument.doctype ) sdiHTML = this.addHTMLDocType(sdiDocument.doctype) + sdiHTML;
		//5. HTML-Code in Datei ablegen
		var sdiFileDst = this.scsDirectoryDst.clone();
		sdiFileDst.append(sdiFilename);
		sbp2Common.fileWrite(sdiFileDst, sdiHTML, sdiDocument.characterSet);
	},

	processDOMRecursively : function(pdrRootNode, pdrFilename)
	{
//wird von this.saveDocumentInternal aufgerufen
		for ( var pdrCurNode=pdrRootNode.firstChild; pdrCurNode!=null; pdrCurNode=pdrCurNode.nextSibling )
		{
			if ( pdrCurNode.nodeName == "#text" || pdrCurNode.nodeName == "#comment" ) continue;
			pdrCurNode = this.inspectNode(pdrCurNode);
			this.processDOMRecursively(pdrCurNode, pdrFilename);
		}
	},

	fileGetExtension : function(fgeFileString)
	{
//wird von this.inspectNode und this.url2filestring aufgerufen
		var fgePos = fgeFileString.lastIndexOf(".");
		var fgeReturnCode = "";
		if ( fgePos > -1 ) fgeReturnCode = fgeFileString.substring(fgePos+1,fgeFileString.length);
		return fgeReturnCode;
	},

	inspectNode : function(inCurNode, inFilename)
	{
//wird von this.processDOMRecursively aufgerufen
		switch ( inCurNode.nodeName.toUpperCase() )
		{
			case "A":
				//Verweis vervollständigen
				if ( !inCurNode.hasAttribute("href") ) break;
				if ( inCurNode.getAttribute("href").charAt(0) == "#" ) break;
				if ( inCurNode.hasAttribute("style") ) {
					if ( this.scsEmbeddedStyles ) {
//Hier fehlt noch Code
alert("a style - "+inCurNode);
					} else {
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
						var inFileDst = this.downSaveFile(inCurNode.href);
						inCurNode.setAttribute("href", inFileDst);
					}
				} else {
					inCurNode.setAttribute("href", inCurNode.href);
				}
				break;
			case "BASE":
alert("BASE found. Contact the developer.");
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
					var inURLBase = this.scsURL[this.scsArrayURLHTMLNr];
					var inURLObj = this.convertURLToObject(inURLBase);
					var inURLRel = inCurNode.action;
					//" entfernen aus inURLRel
					inURLRel = inURLRel.replace(/\"/g, "");
					inCurNode.setAttribute("action", inURLObj.resolve(inURLRel));
				} catch(ex) {
					dump("sbp2CaptureSaver.inspectNode\n---\nFailed to resolve URL: " + inURLBase + "\t" + inURLRel + "\n");
				}
				break;
			case "FRAME":
			case "IFRAME":
				var inFileString = this.url2filestring(inCurNode.src);
				this.scsArrayURLHTMLNr++;
				this.saveDocumentInternal(this.scsArrayURLHTML[this.scsArrayURLHTMLNr].document, inFileString);
				this.scsHashURLHTML[this.scsArrayURLHTML[this.scsArrayURLHTMLNr].document.location.href] = inFileString;
				inCurNode.src = inFileString;
				this.scsDLProgress[0]++;
				break;
			case "IMG":
				//Bild herunterladen oder ganz entfernen
				if ( this.scsEmbeddedImages ) {
					var inFileDst = this.downSaveFile(inCurNode.src);
					if ( inFileDst ) {
						inCurNode.setAttribute("src", inFileDst);
					} else {
						inCurNode.setAttribute("src", inCurNode.src);
					}
				} else {
//					return this.removeNodeFromParent(inCurNode);
					inCurNode = this.removeNodeFromParent(inCurNode);
				}
				break;
			case "INPUT" : 
				if ( inCurNode.type.toLowerCase() ) {
					inCurNode.setAttribute("value", inCurNode.value);
				}
				break;
			case "LINK":
				if ( inCurNode.rel.toLowerCase() == "stylesheet" ) {
					if ( this.scsEmbeddedStyles ) {
						var inFileDst = this.inspectStyleSheet(inCurNode, 2);
						if ( inFileDst ) {
							inCurNode.setAttribute("href", inFileDst);
						} else {
							inCurNode.setAttribute("href", inCurNode.href);
						}
					} else {
//						return this.removeNodeFromParent(inCurNode);
						inCurNode = this.removeNodeFromParent(inCurNode);
					}
				} else if ( inCurNode.rel.toLowerCase() == "shortcut icon" ) {
					var inFileDst = this.downSaveFile(inCurNode.href);
					if ( inFileDst ) {
						inCurNode.setAttribute("href", inFileDst);
						this.scsItem.icon = inFileDst;
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
					this.inspectStyleSheet(inCurNode, 1);
				} else {
//					return this.removeNodeFromParent(inCurNode);
					inCurNode = this.removeNodeFromParent(inCurNode);
				}
				break;
			default:
//				dump(inCurNode.nodeName+"\n");
				break;
		}
		return inCurNode;
	},

	inspectStyleSheet : function(issNode, issMode)
	{
//wird von this.inspectNode aufgerufen
		//Erstellt eine Zeichenkette, die die tatsächlich genutzten cssRules enthält.
		//Die Überprüfung erfolgt mit querySelector.
		//Ist issNode ein style-tag aus der Website, wird issNode.cssText aktualisiert.
		//Ist issNode ein link-tag aus der Website, wird eine lokale Datei erzeugt.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. StyleSheet-Nummer suchen
		//3. nur Regeln übernehmen, die auch in Verwendung sind
		//4. verlinkte Dateien suchen und herunterladen
		//5. issNode.cssText aktualisieren oder issNode.href schreiben
		//
		//		issMode = 1		=> eingebettete Styles
		//		issMode = 2		=> externes StyleSheet

		//1. Variablen initialisieren
		var issDocument = issNode.ownerDocument;
		var issStyleSheet = null;
		var issStyleSheetNr = 0;
		var issStyleSheetANr = -1;
		//2. StyleSheet-Nummer suchen
		if ( issMode == 1 ) {
			//passende Listen-Nummer suchen
			var issI=0;
			issStyleSheetNr = -1;
			while ( issI < this.scsArrayURLHTMLStyles[this.scsArrayURLHTMLNr] )
			{
				issStyleSheetNr++;
				if ( issDocument.styleSheets[issStyleSheetNr].href == null ) {
					issI++;
				}
			}
			//Dateiname bestimmen
			this.scsStyleSheetFilename.push("");
			issStyleSheetANr = this.scsStyleSheetFilename.length-1;
			//Platzhalter für Regeln des aktuellen StyleSheet in this.scsStyleSheetRules erstellen
			var issRules = [];
			for ( var issI=0; issI<issDocument.styleSheets[issStyleSheetNr].cssRules.length; issI++ )
			{
				issRules[issI] = "";
			}
			this.scsStyleSheetRules.push(issRules);
			//vermerken, dass ein Style-Block in der aktuellen HTML-Seite bearbeitet worden ist
			this.scsArrayURLHTMLStyles[this.scsArrayURLHTMLNr]++;
		} else {
			//passende Listen-Nummer suchen
			while ( issDocument.styleSheets[issStyleSheetNr].href != issNode.href )
			{
				issStyleSheetNr++;
			}
			//Dateiname bestimmen, falls das StyleSheet zuvor noch nicht bearbeitet worden ist.
			if ( this.scsHashURL[issNode.href] ) {
				for ( var issI=0; issI<this.scsStyleSheetFilename.length; issI++ )
				{
					if ( this.scsHashURL[issNode.href] == this.scsStyleSheetFilename[issI] ) {
						issStyleSheetANr = issI;
						issI = this.scsStyleSheetFilename.length;
					}
				}
			} else {
				var issFileString = this.url2filestring(issNode.href);
				this.scsStyleSheetFilename.push(issFileString);
				issStyleSheetANr = this.scsStyleSheetFilename.length-1;
				//Platzhalter für Regeln des aktuellen StyleSheet in this.scsStyleSheetRules erstellen
				var issRules = [];
				for ( var issI=0; issI<issDocument.styleSheets[issStyleSheetNr].cssRules.length; issI++ )
				{
					issRules[issI] = "";
				}
				this.scsStyleSheetRules.push(issRules);
			}
		}
		//5. nur Regeln übernehmen, die auch in Verwendung sind
		for ( var issI=0; issI<issDocument.styleSheets[issStyleSheetNr].cssRules.length; issI++ ) {
			if ( issDocument.styleSheets[issStyleSheetNr].cssRules[0].type == 1 ) {
				if ( issDocument.querySelector(issDocument.styleSheets[issStyleSheetNr].cssRules[issI].selectorText) ) {
					//5.1 Regel übernehmen
					this.scsStyleSheetRules[issStyleSheetANr][issI] = issDocument.styleSheets[issStyleSheetNr].cssRules[issI].selectorText + " { " +
																	  issDocument.styleSheets[issStyleSheetNr].cssRules[issI].style.cssText + " }";
					//5.2 Regel nach verlinkter Datei durchsuchen und diese herunterladen
					var issLinks = this.scsStyleSheetRules[issStyleSheetANr][issI].match(/url\(.*?\)/gi);
					if ( issLinks ) {
						var issURLPath = this.scsURL[this.scsArrayURLHTMLNr].substring(0, this.scsURL[this.scsArrayURLHTMLNr].lastIndexOf("\/"));
						//doppelte Links und chrome://... entfernen
						var issHash = {};
						for ( var issJ=0; issJ<issLinks.length; issJ++ )
						{
							issHash[issLinks[issJ]] = 0;
						}
						issLinks = [];
						for ( var issItem in issHash )
						{
							if ( issItem.indexOf("chrome:\/\/") > -1 ) continue;
							issLinks.push(issItem);
						}
						//alle verbliebenen Links durcharbeiten
						for ( var issJ=0; issJ<issLinks.length; issJ++ )
						{
							var issURLImage = issLinks[issJ];
							var issSplit = this.buildURL(issURLPath, issURLImage);
							var issFile = this.downSaveFile(issSplit[0]);
							//Gefundenes Tag im Code austauschen
							if ( issFile != "" ) {
								this.scsHashURL[issURLPath] = issFile;
								issURLImage = issURLImage.replace(/\(/g, "\\(");
								issURLImage = issURLImage.replace(/\)/g, "\\)");
								issURLImage = issURLImage.replace(/\?/g, "\\?");
								var issSearchterm = new RegExp(issURLImage, "g");
								this.scsStyleSheetRules[issStyleSheetANr][issI] = this.scsStyleSheetRules[issStyleSheetANr][issI].replace(issSearchterm,issSplit[1]+issFile+issSplit[2]);
							}
						}
					}
				}
			} else {
				//Alle Regeln abgesehen vom Typ STYLE_RULE werden unbesehen übernommen
				this.scsStyleSheetRules[issStyleSheetANr][issI] = issDocument.styleSheets[issStyleSheetNr].cssRules[issI].cssText;
			}
		}
		//7. issNode.cssText aktualisieren oder Dateiname zurückgeben
		if ( issMode == 1 ) {
			//issNode.cssText aktualisieren
			var cssData = "";
			for ( var issI=0; issI<this.scsStyleSheetRules[issStyleSheetANr].length; issI++ )
			{
				if ( this.scsStyleSheetRules[issStyleSheetANr][issI].length>0 ) {
					cssData = cssData + "\n" + this.scsStyleSheetRules[issStyleSheetANr][issI];
				}
			}
			issNode.innerHTML = cssData + "\n";
		} else {
			//5.3 Daten in Speicher aufnehmen
			this.scsArrayURL.push(issNode.href);
			this.scsHashURL[issNode.href] = this.scsStyleSheetFilename[issStyleSheetANr];
			//Dateiname zurückgeben
			return this.scsStyleSheetFilename[issStyleSheetANr];
		}
	},

	downSaveFile : function(dsfURLSpec)
	{
//wird von this.capture und inspectNode
		//Läd das Dokument hinter dsfURLSpec herunter und speichert es unverändert nach this.scsDirectoryDs als dsfFileString.
		//
		//Ablauf:
		//1. Prüfen, ob Datei schon heruntergeladen wird
		//2. Variablen initialisieren/anpassen
		//3. lokalen Dateinamen bestimmen
		//4. Datei herunterladen
		//5. wichtige Informationen im globalen Speicherbereich merken
		//6. Dateiname zurück an aufrufende Funktion

if ( !dsfURLSpec ) {
	alert("sbp2CaptureSaver.downSaveFile\n---\ndsfURLSpec nicht angegeben.");
	return;
}
		//1. Prüfen, ob Datei schon heruntergeladen wird
		if ( this.scsHashURL[dsfURLSpec] ) {
			//Datei wurde schon heruntergeladen -> Dateiname zurückgeben
			return this.scsHashURL[dsfURLSpec];
		}
		//2. Variablen initialisieren/anpassen
		this.scsDLProgress[1]++;
		//3. lokalen Dateinamen bestimmen
		var dsfFileString = this.url2filestring(dsfURLSpec);
		//4. Datei herunterladen
		var dsfFile = this.scsDirectoryDst.clone();
		dsfFile.append(dsfFileString);
		var dsfURIObj = sbp2Common.IO.newURI(dsfURLSpec, null, null);
		var dsfWBP = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);;
		dsfWBP.progressListener = {
			onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
//				var dsfPercentComplete = Math.round((aCurTotalProgress / aMaxTotalProgress) * 100);
			},
			onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus) {
//				if ( aStateFlags & STATE_START ) {
//					// This fires when the load event is initiated
//					alert("start");
//				} else if ( aStateFlags & STATE_STOP ) {
				if ( aStateFlags & STATE_STOP ) {
					// This fires when the load finishes
					sbp2CaptureSaver.captureCompleteCheck();
				}
			}
		}
		if ( this.scsFxVer18 ) {
			var dsfPrivacy = PrivateBrowsingUtils.privacyContextFromWindow(this.scsWindowURLSource);
			dsfWBP.saveURI(dsfURIObj, null, null, null, "", dsfFile, dsfPrivacy);
		} else {
			dsfWBP.saveURI(dsfURIObj, null, null, null, "", dsfFile);
		}
		//5. wichtige Informationen im globalen Speicherbereich merken
		this.scsHashURL[dsfURLSpec] = dsfFileString;
		//6. Dateiname zurück an aufrufende Funktion
		return dsfFileString;
	},

	addHTMLDocType : function(ahdtDocType)
	{
//wird von this.capture aufgerufen
		//Erstellt eine Zeile mit Angaben zum Dokumenttyp
		var ahdtLine = "<!DOCTYPE " + ahdtDocType.name.toUpperCase();
		if ( ahdtDocType.publicId ) ahdtLine += " PUBLIC \"" + ahdtDocType.publicId + "\"";
		if ( ahdtDocType.systemId ) ahdtLine += " \""        + ahdtDocType.systemId + "\"";
		ahdtLine += ">\n";
		return ahdtLine;
	},

	addHTMLTag : function(ahtNode, ahtContent)
	{
//wird von this.capture aufgerufen
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
//wird von this.inspectNode aufgerufen
		//Ersetzt die Node rnfpNode durch "nichts"
		var rnfpNodeNew = rnfpNode.ownerDocument.createTextNode("");
		rnfpNode.parentNode.replaceChild(rnfpNodeNew, rnfpNode);
		rnfpNode = rnfpNodeNew;
		return rnfpNode;
	},

	url2filestring : function(u2fFileString)
	{
//wird von this.downSaveFile, this.inspectNode und this.inspectStyleSheet aufgerufen
		//Bestimmt anhand der übergebenen Adresse einen sinnvollen Dateinamen und gibt diesen an die aufrufende Funktion zurück.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Zeichenkette nach dem letzten / bestimmen
		//3. Zeichenkette vor dem ersten ? bestimmen
		//4. Nächster gültiger Dateiname suchen
		//5. Dateiname in Hash aufnehmen
		//6. Dateinamen an aufrufende Funktion zurückliefern

		//1. Variablen initialisieren
		var u2fPos = -2;
		//2. Zeichenkette nach dem letzten / bestimmen
		u2fFileString = u2fFileString.substring(u2fFileString.lastIndexOf("/")+1, u2fFileString.length);
		//3. Zeichenkette vor dem ersten ? bestimmen
		u2fPos = u2fFileString.search(/\?/);
		if ( u2fPos > -1 ) {
			u2fFileString = u2fFileString.substring(0, u2fPos);
		}
		//4. Nächster gültiger Dateiname suchen
		if ( this.scsHashFilename[u2fFileString] != undefined ) {
			if ( this.scsHashFilename[u2fFileString] == 0 ) {
				var u2fCounter = 0;
				var u2fExtension = this.fileGetExtension(u2fFileString);
				var u2fName = u2fFileString.substring(0, u2fFileString.length-u2fExtension.length-1);
				while ( this.scsHashFilename[u2fFileString] == 0 )
				{
					u2fCounter++;
					if ( u2fCounter>10) {
						u2fFileString = u2fName+"_0"+u2fCounter+"."+u2fExtension;
					} else {
						u2fFileString = u2fName+"_0"+u2fCounter+"."+u2fExtension;
					}
				}
			}
		}
		//5. Dateiname in Hash aufnehmen
		this.scsHashFilename[u2fFileString] = 0;
		//6. Dateinamen an aufrufende Funktion zurückliefern
		return u2fFileString;
	},

}