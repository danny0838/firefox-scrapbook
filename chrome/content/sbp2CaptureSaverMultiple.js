
Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

//wird schon in sbp2CaptureSaverInDepth angelegt
//const STATE_STOP = Components.interfaces.nsIWebProgressListener.STATE_STOP;

var sbp2CaptureSaverMultiple = {

	//Die globale Definition dieser Variablen vereinfacht die Handhabung
	scsmItem			: { id: "", type: "", title: "", chars: "", icon: "", source: "", comment: "" },
	scsmResDestination	: { position: null, resCont: null },

	scsmOptions			: {	directoryDst: null, depthMax: -1, timeout: 0, mode: -1, fxVer18: null, fxVer36: null, embeddedImages: false, embeddedScript: false, embeddedStyles: false, linkedArchives: false, linkedAudio: false, linkedCustom: false, linkedImages: false, linkedMovies: false },

	scsmStyleSheetFilename : [],	//enthält die Dateinamen der StyleSheets im Verzeichnis des Eintrags
	scsmStyleSheetRules	: [],	//enthält Platz für alle verfügbaren Regeln eines StyleSheets; mit Text vorhanden sind aber nur die tatsächlich genutzten Regeln

	scsmWindowURLSource	: null,	//wird für PrivacyMode in downSaveFile benötigt

	scsmCaptureRunning	: 0,
	scsmDLProgress		: [0, 0],	//1. Zahl: fertig verarbeitete Dateien, 2. Zahl: Dateien insgesamt

	scsmArrayURL		: [],	//enthält alle Adressen, die gefunden und bearbeitet wurden
	scsmArrayURLDepth	: [],	//Ebene der Adresse
	scsmArrayURLFilename: [],	//enthält den Dateinamen, unter dem die scsmArrayURL gespeichert werden soll
	scsmArrayURLFiletype: [],	//Dateityp (0=unbekannt, 1=HTML, 2=Bild, 3=Audio, 4=Film, 5=Archiv, 6=benutzerdefiniert)
	scsmArrayURLLinks	: [],	//enthält die Nummern aller URLs, auf die verwiesen wird, als Zeichenkette (durch Komma getrennt)
	scsmArrayURLLinksSt	: [],	//enthält den Status für jeden Link als Zeichenkette (durch Komma getrennt)
	scsmArrayURLSelected: [],	//gibt an, ob vorgesehen ist, die Datei herunterzuladen oder nicht (0=nein, 1=ja)
	scsmArrayURLState	: [],	//enthält den Zustand der Datei (0=noch nicht gespeichert/fehlgeschlagen, 1=gespeichert (kein Redirect), 2=gespeichert (Redirect))

	//Die folgenden vier *Frame*-Variablen werden für die Bearbeitung der Seite im Browser verwendet.
	//Sie müssen bei jedem Aufruf der Funktion "capture" initialisiert werden
	scsmArrayFrame		: [],	//enthält für jedes Frame das Window-/Frame-Objekt
	scsmArrayFrameBase	: [],	//enthält für jedes Frame das URL-Objekt mit der base
	scsmArrayFrameNr	: 0,	//Nummer des Frames, das gerade bearbeitet wird
	scsmArrayFrameStyles: [],	//Wert gibt an, wie viele Style-Blöcke in der aktuellen HTML-Seite schon bearbeitet worden sind; Startwert ist immer 0

	scsmHashURL			: {},	//Hash-Bereich für Web-Adressen (HTLM, Bilder, sonstiges)							-- nur Nummer zu scsmArrayURL
	scsmHashFilename	: {},	//Hash-Bereich für Dateinamen														-- nur Nummer zu scsmArrayURL

	/* wird für inDepthCapture benötigt */
	scsmLinks			: [],	//enthält die Verweise einer Seite. Wird benötigt, da sbp2Capture.js nicht immer vorhanden ist.

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
		//3. Analyse der URI
		if ( buSplit[0].indexOf("http") == 0 ) {
			//3.1 vollständige URI gefunden und zurückgeben -> nichts tun
		} else {
			//3.2 resolve erforderlich
			var buURLObj = this.convertURLToObject(buURLPath);
			buSplit[0] = buURLObj.resolve(buSplit[0]);
/*			//3.2 weitergehende Analyse der URI
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
					if ( buURLPathSplit[buURLPathSplit.length-1].length == 0 ) {
						buNr--;
					} else {
						buNr--;
					}
					if ( buNr < 3 ) buNr = 3;
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
			}*/
		}
		//4.
		return buSplit;
	},

	capture : function(cRootWindow, cFilename, cDepthCur)
	{
//wird von this.initNormal aufgerufen
		//Archiviert den Inhalt des selektierten Tab (cRootWindow)
		//
		//Ablauf:
		//0. Funktion verlassen, falls schon eine Archivierung läuft
		//1. Variablen initialisieren
		//2. Liste mit Frames erstellen
		//3. Seiteninhalt archivieren
		//4. Falls in Schritt 3 kein Icon gefunden wurde, wird jetzt versucht, eines zu bestimmen
		//5. Ende Verarbeitung erreicht

		//0. Verzeichnis anlegen und ID festlegen
		this.scsmItem.id = sbp2Common.directoryCreate();
		this.scsmOptions.directoryDst.append(this.scsmItem.id);
		//1. Variablen initialisieren
		this.scsmArrayFrame			= [];
		this.scsmArrayFrameBase		= [];
		this.scsmArrayFrameNr		= 0;
		this.scsmArrayFrameStyles	= [];
		this.scsmItem.title			= sbp2InvisibleBrowser.ELEMENT.contentDocument.title;
		this.scsmItem.chars			= sbp2InvisibleBrowser.ELEMENT.contentDocument.characterSet;
		this.scsmLinks				= [];
		this.scsmWindowURLSource	= cRootWindow;
/*
		if ( this.scsmHashURL[cRootWindow.document.URL] ) {
			cFilename = this.scsmArrayURLFilename[this.scsmHashURL[cRootWindow.document.URL]];
		} else {
			if ( cFilename == null ) {
				cFilename = this.getFilenameFromURL(cRootWindow.document.URL, null);
			}
			this.scsmHashFilename[cFilename] = -1;
		}
*/
		//2. Liste mit Frames erstellen
		this.scsmArrayFrame = sbp2Common.getFrameList(cRootWindow);
		for ( var cI=0; cI<this.scsmArrayFrame.length; cI++ )
		{
			this.scsmArrayFrameBase.push(null);
			this.scsmArrayFrameStyles.push(1);
		}
		//3. Seiteninhalt archivieren
		this.saveDocumentInternal(cRootWindow.document, cRootWindow.document.URL, this.scsmArrayFrameNr, cFilename, cDepthCur);
		//4. Falls in Schritt 3 kein Icon gefunden wurde, wird jetzt versucht, eines zu bestimmen
		//(nsIFaviconService funktioniert nicht, wenn Firefox im Private Modus läuft. Daher dieser Weg.)
		if ( this.scsmItem.icon == null ) {
			var cMainWindow = document.getElementById("sbp2CaptureBrowser");
			var cURLIcon = cMainWindow.getAttribute("image");
			if ( cURLIcon != "" ) {
				this.scsmItem.icon = this.downSaveFile(cMainWindow.gBrowser.selectedTab.getAttribute("image"), cDepthCur, 2);
			} else {
				this.scsmItem.icon = "";
			}
		}
		//5. Ende Verarbeitung erreicht
		this.captureCompleteCheck();
	},

	captureComplete : function()
	{
//wird von this.captureCompleteCheck aufgerufen
		//Führt die Abschlussarbeiten durch:
		//- CSS-Dateien erstellen
		//- sbp2-link.txt erstellen
		//- sbp2-capset.txt erstellen
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. CSS-Seiten schreiben, falls dies gewünscht ist
		//3. Verweise korrigieren
		//4. sbp2-links.txt erstellen
		//5. sbp2-capset.txt erstellen
		//6. modusabhängige End-Aktion durchführen

		//5. sbp2-links.txt erstellen
		var cfData = "";
		for ( var cI=0; cI<this.scsmArrayURL.length; cI++ )
		{
			if ( this.scsmArrayURLLinks[cI].substr(this.scsmArrayURLLinks[cI].length-1, 1) == "," ) {
				this.scsmArrayURLLinks[cI] = this.scsmArrayURLLinks[cI].substring(0, this.scsmArrayURLLinks[cI].length-1);
				this.scsmArrayURLLinksSt[cI] = this.scsmArrayURLLinksSt[cI].substring(0, this.scsmArrayURLLinksSt[cI].length-1);
			}
			cfData = cfData + this.scsmArrayURL[cI] + "\n" +
							this.scsmArrayURLDepth[cI] + "\n" +
							this.scsmArrayURLFilename[cI] + "\n" +
							this.scsmArrayURLFiletype[cI] + "\n" +
							this.scsmArrayURLLinks[cI] + "\n" +
							this.scsmArrayURLLinksSt[cI] + "\n" +
							this.scsmArrayURLState[cI] + "\n";
		}
		var cfFile = this.scsmOptions.directoryDst.clone();
		cfFile.append("sbp2-links_org.txt");
		sbp2Common.fileWrite(cfFile, cfData, "UTF-8");
//wird von this.captureCompleteCheck aufgerufen
		//1. Variablen initialisieren
		var cDataNeu = null;
		var cFile = null;
		var cFileDst = null;
		var cNr = -1;
		//2. CSS-Seiten schreiben, falls dies gewünscht ist
		if ( this.scsmOptions.embeddedStyles ) {
			cDataNeu = "";
			for ( var cI=0; cI<this.scsmStyleSheetFilename.length; cI++ )
			{
				if ( this.scsmStyleSheetFilename[cI] > -1 ) {
					cDataNeu = "";
					//genutzte Rules zusammenstellen
					for ( var cJ=0; cJ<this.scsmStyleSheetRules[cI].length; cJ++ )
					{
						if ( this.scsmStyleSheetRules[cI][cJ].length > 0 ) {
							cDataNeu = cDataNeu + "\n" + this.scsmStyleSheetRules[cI][cJ] + "\n";
						}
					}
					//Datei erstellen oder aktualisieren, falls Daten vorhanden sind
					if ( cDataNeu.length>0 ) {
						cNr = this.scsmStyleSheetFilename[cI];
						cFileDst = this.scsmOptions.directoryDst.clone();
						cFileDst.append(this.scsmArrayURLFilename[cNr]);
						if ( this.scsmArrayURLState[cNr] == 0 ) {
							sbp2Common.fileWrite(cFileDst, cDataNeu, "UTF-8");
							this.scsmArrayURLState[cNr] = 1;
						} else {
							var cAltLen = 0;
							var cAltPos = 1;
							var cFound = 0;
							var cKlammerOffen = 0;
							var cKlammerAnzahl = 0;
							var cNeuBeg = 1;
							var cNeuLen = 0;
							//bestehende Datei aktualisieren
							var cDataAlt = sbp2Common.fileRead(cFileDst);
							var cAltLen = cDataAlt.length;
							var cNeuLen = cDataNeu.length;
							for ( var cNeuPos = 1; cNeuPos < cNeuLen; cNeuPos++ )
							{
								cFound = 0;
								cKlammerOffen = 0;
								cKlammerAnzahl = 0;
								cNeuBeg = cNeuPos;
								for ( cAltPos = 1; cAltPos < cAltLen; cAltPos++ )
								{
									if ( cDataAlt[cAltPos] == cDataNeu[cNeuPos] ) {
										if ( cDataAlt[cAltPos] == "{" ) {
											cKlammerOffen++;
											cKlammerAnzahl++;
										} else if ( cDataAlt[cAltPos] == "}" ) {
											cKlammerOffen--;
											if ( cKlammerOffen == 0 && cKlammerAnzahl > 0 ) {
												cFound = 1;
												cAltPos = cAltLen;
												cNeuPos++;
											}
										}
										cNeuPos++;
									} else {
										//alte Regel überspringen, da keine Übereinstimmung mit neuer Regel
										cAltPos--;
										while ( cFound == 0 )
										{
											cAltPos++;
											if ( cDataAlt[cAltPos] == "{" ) {
												cKlammerOffen++;
												cKlammerAnzahl++;
											} else if ( cDataAlt[cAltPos] == "}" ) {
												cKlammerOffen--;
												if ( cKlammerOffen == 0 && cKlammerAnzahl > 0 ) {
													cFound = 1;
												}
											}
										}
										cAltPos = cAltPos + 2;
										cNeuPos = cNeuBeg;
										cFound = 0;
									}
								}
								if ( cFound == 0 ) {
									//css-Rule aufnehmen
									cKlammerOffen = 0;
									cKlammerAnzahl = 0;
									var cEnde = 0;
									var cJ = 0;
									cDataAlt = cDataAlt + "\n";
									while ( cEnde == 0 )
									{
										cDataAlt = cDataAlt + cDataNeu[cNeuPos];
										cJ++;
										cNeuPos++;
										if ( cDataNeu[cNeuPos] == "{" ) {
											cKlammerOffen++;
											cKlammerAnzahl++;
										} else if ( cDataNeu[cNeuPos] == "}" ) {
											cKlammerOffen--;
											if ( cKlammerOffen == 0 && cKlammerAnzahl > 0 ) {
												cEnde = 1;
											}
										}
									}
									//Die nächsten beiden Zeilenumbrüche werden übernommen
									cDataAlt = cDataAlt + cDataNeu[cNeuPos];
									cJ++;
									cNeuPos++;
									cDataAlt = cDataAlt + cDataNeu[cNeuPos];
									cJ++;
									cNeuPos++;
								}
							}
							sbp2Common.fileWrite(cFileDst, cDataAlt, "UTF-8");
						}
					}
				}
			}
		}
		//3. Verweise korrigieren
		var cData = null;
		var cDoc = null;
		var cDocChanged = null;
		cFileDst = null;
		var cLinks = null;
		var cNoHref = 0;
		cNr = -1;
		var cParser = null;
		for ( var cI=0; cI<this.scsmArrayURL.length; cI++ )
		{
			//Nur Seiten prüfen, die auch Verweise enthalten
			if ( this.scsmArrayURLFiletype[cI] == 1 ) {
				if ( this.scsmArrayURLLinks[cI].length > 0 ) {
					//Komma am Ende des Text abschneiden
					if ( this.scsmArrayURLLinks[cI].substr(this.scsmArrayURLLinks[cI].length-1, 1) == "," ) {
						this.scsmArrayURLLinks[cI] = this.scsmArrayURLLinks[cI].substring(0, this.scsmArrayURLLinks[cI].length-1);
						this.scsmArrayURLLinksSt[cI] = this.scsmArrayURLLinksSt[cI].substring(0, this.scsmArrayURLLinksSt[cI].length-1);
					}
					//Variablen initialisieren
					cData = null;
					cDoc = null;
					cDocChanged = 0;
					cLinks = [];
					var cSplitLinks = this.scsmArrayURLLinks[cI].split(",");
					var cSplitState = this.scsmArrayURLLinksSt[cI].split(",");
/*
var cAusgabe = "";
for ( var cJ=0; cJ<cSplitLinks.length; cJ++ )
{
	var cNr = cSplitLinks[cJ];
	cAusgabe = cAusgabe + cNr + " -  " +  this.scsmArrayURL[cNr] + " - " + this.scsmArrayURLState[cNr] + " - " + cSplitState[cJ] + "\n";
}
alert(cAusgabe);
*/
					//Verweise einzeln prüfen
					var cAnker = "";
					var cPos = -1;
					for ( var cJ=0; cJ<cSplitLinks.length; cJ++ )
					{
						cNr = cSplitLinks[cJ];
						if ( cDocChanged == 1 ) {
							while ( !cLinks[cJ+cNoHref].hasAttribute("href") ) {
								cNoHref++;
							}
						}
						if ( this.scsmArrayURLState[cNr] != cSplitState[cJ] ) {
							//Inhalt der Webseite in den Speicher holen und parsen, falls dies noch nicht geschehen ist
							if ( cDocChanged == 0 ) {
								cFileDst = this.scsmOptions.directoryDst.clone();
								cFileDst.append(this.scsmArrayURLFilename[cI]);
								//Seitencode einlesen
								cData = sbp2Common.fileRead(cFileDst);
								//Document mittels Parser erstellen
								cParser = new DOMParser();
								cDoc = cParser.parseFromString(cData, "text/html");
								//Verweise extrahieren
								var cTemp = cDoc.getElementsByTagName("a");
								//ungültige Verweise entfernen
								for ( var cK=0; cK<cTemp.length; cK++ )
								{
									if ( cTemp[cK].hasAttribute("href") ) {
										if ( cTemp[cK].getAttribute("href").charAt(0) != "#" ) {
											cLinks.push(cTemp[cK]);
										}
									}
								}
								//Verweise ohne href-Attribut bis zum aktuellen Wert von cJ prüfen
								for ( var cK=0; cK<=cJ; cK++ )
								{
									if ( !cLinks[cK+cNoHref].hasAttribute("href") ) {
										cNoHref++;
									}
								}
								//Datei wird nur geladen, falls Unterschiede bestehen. Daher kann diese Aktion schon hier erfolgen.
								cDocChanged = 1;
							}
							cPos = cLinks[cJ+cNoHref].href.indexOf("#");
							if ( cPos > -1 ) {
								cAnker = cLinks[cJ+cNoHref].href.substring(cPos, cLinks[cJ+cNoHref].href.length);
							} else {
								cAnker = "";
							}
							if ( this.scsmArrayURLState[cNr] == 0 ) {
								//Dateiname durch URL ersetzen
								cLinks[cJ+cNoHref].setAttribute("href", this.scsmArrayURL[cNr]+cAnker);
								cSplitState[cJ] = 0;
							} else {
								//URL durch Dateiname ersetzen
								cLinks[cJ+cNoHref].setAttribute("href", this.scsmArrayURLFilename[cNr]+cAnker);
								cSplitState[cJ] = 1;
							}
						}
					}
					//Webseite und this.scsmArrayURLLinksSt[cI] aktualisieren, falls zuvor Verweise geändert wurden
					if ( cDocChanged == 1 ) {
						//Document aufbereiten
						var cNodeList = [];
						cNodeList.unshift(cDoc.body.cloneNode(true));			//Sinn unklar!
						var cRootNode = cDoc.getElementsByTagName("html")[0].cloneNode(false);
						var cHeadNode = cDoc.getElementsByTagName("head")[0].cloneNode(true);
						cRootNode.appendChild(cHeadNode);
						cRootNode.appendChild(cDoc.createTextNode("\n"));
						cRootNode.appendChild(cNodeList[0]);
						cRootNode.appendChild(cDoc.createTextNode("\n"));
						//HTML-Code zusammenstellen
						var cHTML = this.addHTMLTag(cRootNode, cRootNode.innerHTML);
						if ( cDoc.doctype ) cHTML = this.addHTMLDocType(cDoc.doctype) + cHTML;
						//Webseite neu schreiben (Charakter-Set wird jetzt bestimmt anhand meta-Tag)
						var cMeta = cRootNode.getElementsByTagName("meta");
						cMeta[0].getAttribute("content").match(/charset\=(\S+)/i);
						cFileDst = this.scsmOptions.directoryDst.clone();
						cFileDst.append(this.scsmArrayURLFilename[cI]);
//						sbp2Common.fileWrite(cFileDst, cHTML, RegExp.$1);
						sbp2Common.fileWrite(cFileDst, cHTML, null);
						//Status der Verweise aktualisieren
						this.scsmArrayURLLinksSt[cI] = cSplitState[0];
						for ( var cJ=1; cJ<cSplitState.length; cJ++ )
						{
							this.scsmArrayURLLinksSt[cI] = this.scsmArrayURLLinksSt[cI] + "," + cSplitState[cJ];
						}
					}
				}
			}
		}
		//4. sbp2-links.txt erstellen
		cData = "";
		for ( var cI=0; cI<this.scsmArrayURL.length; cI++ )
		{
			cData = cData + this.scsmArrayURL[cI] + "\n" +
							this.scsmArrayURLDepth[cI] + "\n" +
							this.scsmArrayURLFilename[cI] + "\n" +
							this.scsmArrayURLFiletype[cI] + "\n" +
							this.scsmArrayURLLinks[cI] + "\n" +
							this.scsmArrayURLLinksSt[cI] + "\n" +
							this.scsmArrayURLState[cI] + "\n";
		}
		cFile = this.scsmOptions.directoryDst.clone();
		cFile.append("sbp2-links.txt");
		sbp2Common.fileWrite(cFile, cData, "UTF-8");
		//5. sbp2-capset.txt erstellen
		cData = "";
		cData += sbp2CaptureSaverMultiple.scsmOptions.embeddedImages + "\n";
		cData += sbp2CaptureSaverMultiple.scsmOptions.embeddedStyles + "\n";
		cData += sbp2CaptureSaverMultiple.scsmOptions.embeddedScript + "\n";
		cData += sbp2CaptureSaverMultiple.scsmOptions.linkedImages + "\n";
		cData += sbp2CaptureSaverMultiple.scsmOptions.linkedAudio + "\n";
		cData += sbp2CaptureSaverMultiple.scsmOptions.linkedMovies + "\n";
		cData += sbp2CaptureSaverMultiple.scsmOptions.linkedArchives + "\n";
		cData += sbp2CaptureSaverMultiple.scsmOptions.linkedCustom + "\n";
		cData += sbp2CaptureSaverMultiple.scsmOptions.depthMax + "\n";
		cData += sbp2CaptureSaverMultiple.scsmOptions.timeout + "\n";
		cFile = this.scsmOptions.directoryDst.clone();
		cFile.append("sbp2-capset.txt");
		sbp2Common.fileWrite(cFile, cData, "UTF-8");
		//6. modusabhängige End-Aktion durchführen
		this.scsmCaptureRunning = 0;
		if ( this.scsmOptions.mode == 10 ) {
			//6.1 Variablen initialisieren
			var ctfData = sbp2DataSource.dbData;
			//6.2 index.dat erstellen
			var ctfFile = this.scsmOptions.directoryDst.clone();
			ctfFile.append("index.dat");
			sbp2Common.fileWriteIndexDat(ctfFile.path, this.scsmItem);
			//6.3 Eintrag im Tree erstellen
			sbp2DataSource.itemAdd(ctfData, this.scsmItem, this.scsmResDestination.resCont, this.scsmResDestination.position);
			//6.4 Aktualisieren der Ansicht
			var ctfTree = document.getElementById("sbp2Tree");
			if ( ctfTree ) ctfTree.builder.rebuild();
			//6.5 RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
			sbp2DataSource.dsFlush(ctfData);
			sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCacheUpdate);
		} else {
alert("sbp2CaptureSaverMultiple.captureComplete - Unbekannter Modus -> "+this.scsmOptions.mode);
		}
	},

	captureCompleteCheck : function()
	{
		//Hier wird geprüft, ob alle zu speichernden Dateien schon auf der Platte liegen. (HTML und asynchrone Downloads)
		//
		//Ablauf:
		//1. Anzahl abgeschlossener Downloads um 1 erhöhen
		//2. Prüfen, ob alle Arbeiten abgeschlossen sind -> this.captureComplete aufrufen

		//1. Anzahl abgeschlossener Downloads um 1 erhöhen
		this.scsmDLProgress[0]++;
		//2. Prüfen, ob alle Arbeiten abgeschlossen sind -> this.captureComplete aufrufen
		if ( this.scsmDLProgress[0] == this.scsmDLProgress[1] ) {
			//2.1 Archivierung abschließen
			this.captureComplete();
		}
	},

	captureInitNormal : function(cinRootWindow, cinOptions)
	{
//wird von sbp2Common.captureTab aufgerufen
		//
		//Ablauf:
		//1. Funktion verlassen, falls schon eine Archivierung läuft
		//2. Variablen initialisieren
		//3. Seite archivieren

		//1. Funktion verlassen, falls schon eine Archivierung läuft
		if ( this.scsmCaptureRunning == 1 ) return null;
		//2. Variablen initialisieren
		this.scsmArrayURL = [];
		this.scsmArrayURLDepth = [];
		this.scsmArrayURLFilename = [];
		this.scsmArrayURLFiletype = [];
		this.scsmArrayURLLinks = [];
		this.scsmArrayURLLinksSt = [];
		this.scsmArrayURLSelected = [];
		this.scsmArrayURLState = [];

		this.scsmCaptureRunning = 1;

		this.scsmDLProgress[0] = 0;
		this.scsmDLProgress[1] = 0;

		this.scsmHashURL = {};
		this.scsmHashFilename = {};

		this.scsmItem.id = cinOptions.id;
		this.scsmItem.type = cinOptions.type;
		this.scsmItem.title = cinOptions.title;
		this.scsmItem.chars = cinOptions.charset;
		this.scsmItem.icon = cinOptions.icon;
		this.scsmItem.source = cinOptions.source;
		this.scsmItem.comment = cinOptions.comment;

		this.scsmOptions.depthMax = cinOptions.depthMax;
		this.scsmOptions.mode = cinOptions.mode;
		this.scsmOptions.timeout = cinOptions.timeout;
		this.scsmOptions.embeddedImages = cinOptions.embeddedImages;
		this.scsmOptions.embeddedScript = cinOptions.embeddedScript;
		this.scsmOptions.embeddedStyles = cinOptions.embeddedStyles;
		this.scsmOptions.linkedArchives = cinOptions.linkedArchives;
		this.scsmOptions.linkedAudio = cinOptions.linkedAudio;
		this.scsmOptions.linkedCustom = cinOptions.linkedCustom;
		this.scsmOptions.linkedImages = cinOptions.linkedImages;
		this.scsmOptions.linkedMovies = cinOptions.linkedMovies;
		this.scsmOptions.directoryDst = sbp2Common.getBuchVZ();
		this.scsmOptions.directoryDst.append("data");					//Verzeichnisname wird es in capture-Funktion vervollständigt, da ID noch nicht bekannt ist.
		if ( this.scsmOptions.fxVer18 == null )
		{
			var cAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
			var cVerComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
			this.scsmOptions.fxVer18 = cVerComparator.compare(cAppInfo.version, "18.0")>=0;
			this.scsmOptions.fxVer36 = cVerComparator.compare(cAppInfo.version, "36.0")>=0;
		}

		this.scsmResDestination.position = cinOptions.position;
		this.scsmResDestination.resCont = cinOptions.resCont;

		this.scsmStyleSheetFilename = [];
		this.scsmStyleSheetRules = [];

		//3. Seite archivieren
//		this.capture(cinRootWindow, "index.html", 0);
	},

	convertURLToObject : function(cutoURLString)
	{
//wird von this.inspectNode aufgerufen
		var cutoURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
		cutoURL.spec = cutoURLString;
		return cutoURL;
	},

	saveDocumentInternal : function(sdiDocument, sdiDocumentSrcURL, sdiDocumentNr, sdiFilename, sdiDepthCur)
	{
//wird von this.capture und this.inspectNode aufgerufen
		//Erstellt eine Kopie der Seite im Speicher und modifiziert den Inhalt der Kopie so, dass die Seite lokal abrufbar ist, ohne Daten aus dem Internet nachladen zu müssen.
		//Stylesheets werden normalerweise übernommen, JavaScript-Code entfernt. Beides ist über den "Capture As"-Dialog auch steuerbar.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Adresse des Fensters/Frames aufnehmen
		//3. Weiteren Download vermerken
		//4. Seite archivieren, falls sie noch nicht archiviert wurde
		//4.1 Variablen initialisieren
		//4.2 Kopie der geladenen Seite im Speicher erstellen
		//4.3 Inhalt prüfen und gegebenenfalls anpassen
		//4.4 HTML-Code zusammenstellen
		//4.5 HTML-Code in Datei ablegen
		//4.6 (Redirect-)Seite erfolgreich gespeichert -> Status ändern
		//5. Seite erfolgreich gespeichert -> Status ändern
		//6. Dateiname zurück an aufrufende Funktion

		//1. Variablen initialisieren
		var sdiFileString = "";
		var sdiPosR = -1;
		var sdiPosT = -1;
		var sdiURLR = sdiDocument.URL;
		var sdiURLT = sdiDocumentSrcURL;
		//2. Adresse des Fensters/Frames aufnehmen
		if ( this.scsmHashURL[sdiURLR] ) {
			sdiPosR = this.scsmHashURL[sdiURLR];
			sdiFileString = this.scsmArrayURLFilename[sdiPosR];
		} else {
			sdiPosR = this.scsmArrayURL.length;
			if ( sdiFilename.length > 0 ) {
				sdiFileString = sdiFilename;
			} else {
				sdiFileString = this.getFilenameFromURL(sdiURLR, null);
			}
			this.scsmArrayURL.push(sdiURLR);
			this.scsmArrayURLDepth.push(sdiDepthCur);
			this.scsmArrayURLFilename.push(sdiFileString);
			this.scsmArrayURLFiletype.push(1);
			this.scsmArrayURLLinks.push("");
			this.scsmArrayURLLinksSt.push("");
			this.scsmArrayURLSelected.push(1);
			this.scsmArrayURLState.push(0);
			this.scsmHashURL[sdiURLR] = sdiPosR;
			this.scsmHashFilename[sdiFileString] = sdiPosR;
		}
		if ( sdiURLT == sdiURLR ) {
			sdiPosT = sdiPosR;
		} else {
			if ( this.scsmHashURL[sdiURLT] ) {
				sdiPosT = this.scsmHashURL[sdiURLT];
				this.scsmArrayURLFilename[sdiPosT] = sdiFileString;
			} else {
				sdiPosT = this.scsmArrayURL.length;
				this.scsmArrayURL.push(sdiURLT);
				this.scsmArrayURLDepth.push(sdiDepthCur);
				this.scsmArrayURLFilename.push(sdiFileString);
				this.scsmArrayURLFiletype.push(1);
				this.scsmArrayURLLinks.push("");
				this.scsmArrayURLLinksSt.push("");
				this.scsmArrayURLSelected.push(1);
				this.scsmArrayURLState.push(0);
				this.scsmHashURL[sdiURLT] = sdiPosT;
			}
		}
//alert("sdiURLT - "+sdiURLT+"\nsdiURLR - "+sdiURLR+"\nsdiPosT - "+sdiPosT+"\nsdiPosR - "+sdiPosR+"\nsdiFilename - "+sdiFilename+"\nsdiFileString - "+sdiFileString+"\n"+this.scsmHashURL[sdiURLR]);
		//3. Weiteren Download vermerken
		this.scsmDLProgress[1]++;
		//4. Seite archivieren, falls sie noch nicht archiviert wurde
		if ( this.scsmArrayURLState[sdiPosR] == 0 ) {
			//4.1 Variablen initialisieren
			var sdiHTML = "";
			var sdiNodeList = [];
			var sdiURLNr = null;
			if ( sdiDocument.baseURI == null ) alert("baseURI ist null");
			if ( sdiDocument.baseURI == undefined ) alert("baseURI ist undefined");
			if ( sdiDocument.baseURI.length == 0 ) alert("baseURI enthält keine Stellen");
			this.scsmArrayFrameBase[sdiDocumentNr] = this.convertURLToObject(sdiDocument.baseURI);
			//4.2 Kopie der geladenen Seite im Speicher erstellen
sdiNodeList.unshift(sdiDocument.body.cloneNode(true));			//Sinn unklar!
			var sdiRootNode = sdiDocument.getElementsByTagName("html")[0].cloneNode(false);
			var sdiHeadNode = sdiDocument.getElementsByTagName("head")[0].cloneNode(true);
			sdiRootNode.appendChild(sdiHeadNode);
			sdiRootNode.appendChild(sdiDocument.createTextNode("\n"));
			sdiRootNode.appendChild(sdiNodeList[0]);
			sdiRootNode.appendChild(sdiDocument.createTextNode("\n"));
			//4.3 Inhalt prüfen und gegebenenfalls anpassen
			this.processDOMRecursively(sdiRootNode, sdiPosR, sdiDepthCur);
			//4.4 HTML-Code zusammenstellen
var sdiMeta = sdiDocument.createElement("meta");
sdiMeta.setAttribute("content", sdiDocument.contentType + "; charset=" + sdiDocument.characterSet);
sdiMeta.setAttribute("http-equiv", "content-type");
sdiRootNode.firstChild.insertBefore(sdiDocument.createTextNode("\n"), sdiRootNode.firstChild.firstChild);
sdiRootNode.firstChild.insertBefore(sdiMeta, sdiRootNode.firstChild.firstChild);
sdiRootNode.firstChild.insertBefore(sdiDocument.createTextNode("\n"), sdiRootNode.firstChild.firstChild);
			var sdiHTML = this.addHTMLTag(sdiRootNode, sdiRootNode.innerHTML);
			if ( sdiDocument.doctype ) sdiHTML = this.addHTMLDocType(sdiDocument.doctype) + sdiHTML;
			//4.5 HTML-Code in Datei ablegen
			var sdiFileDst = this.scsmOptions.directoryDst.clone();
			sdiFileDst.append(sdiFileString);
			sbp2Common.fileWrite(sdiFileDst, sdiHTML, sdiDocument.characterSet);
			//4.6 (Redirect-)Seite erfolgreich gespeichert -> Status ändern
			this.scsmArrayURLState[sdiPosR] = 1;
		}
		//5. Seite erfolgreich gespeichert -> Status ändern
		if ( sdiPosR != sdiPosT ) this.scsmArrayURLState[sdiPosT] = 2;
		//6. Dateiname zurück an aufrufende Funktion
		return sdiFileString;
	},

	processDOMRecursively : function(pdrRootNode, pdrURLNr, pdrDepthCur)
	{
//wird von this.saveDocumentInternal aufgerufen
		for ( var pdrCurNode=pdrRootNode.firstChild; pdrCurNode!=null; pdrCurNode=pdrCurNode.nextSibling )
		{
			if ( pdrCurNode.nodeName == "#text" || pdrCurNode.nodeName == "#comment" ) continue;
			pdrCurNode = this.inspectNode(pdrCurNode, pdrURLNr, pdrDepthCur);
			this.processDOMRecursively(pdrCurNode, pdrURLNr, pdrDepthCur);
		}
	},

	fileGetExtension : function(fgeFileString)
	{
//wird von this.inspectNode und this.getFilenameFromURL aufgerufen
		var fgePos = fgeFileString.lastIndexOf(".");
		var fgeReturnCode = "";
		if ( fgePos > -1 ) fgeReturnCode = fgeFileString.substring(fgePos+1,fgeFileString.length);
		return fgeReturnCode;
	},

	inspectNode : function(inCurNode, inURLNr, inDepthCur)
	{
//wird von this.processDOMRecursively aufgerufen
		switch ( inCurNode.nodeName.toUpperCase() )
		{
			case "A":
				//Verweis vervollständigen
				if ( !inCurNode.hasAttribute("href") ) break;
				if ( inCurNode.getAttribute("href").charAt(0) == "#" ) break;
				if ( inCurNode.hasAttribute("style") ) {
					if ( this.scsmOptions.embeddedStyles ) {
//Hier fehlt noch Code
//alert("a style - "+inCurNode);
					} else {
						inCurNode = this.removeNodeFromParent(inCurNode);
					}
				} else {
//dump(inCurNode.href+"\n");
//dump(inCurNode.href.match(/\.html(?:#.*)?$/)+"\n");
					var inAnker = "";
					var inDownloadNow = null;
					var inHref = inCurNode.href;
					var inPHP = "";
					var inPosAnker = inHref.indexOf("#");
					if ( inPosAnker > -1 ) {
						inAnker = inHref.substring(inPosAnker, inHref.length);
						inHref = inHref.substring(0, inPosAnker);
					}
					var inPosPHP = inHref.indexOf("?");
					if ( inPosPHP > -1 ) {
						inPHP = inHref.substring(inPosPHP, inHref.length);
						inHref = inHref.substring(0, inPosPHP);
					}
					var inFileExtension = this.fileGetExtension(inHref).toLowerCase();
					var inFiletype = 0;
					switch ( inFileExtension )
					{
						case "jpg" : case "jpeg" : case "png" : case "gif" : case "tiff" : inDownloadNow = this.scsmOptions.linkedImages;   inFiletype = 2; break;
						case "mp3" : case "wav"  : case "ram" : case "rm"  : case "wma"  : inDownloadNow = this.scsmOptions.linkedAudio;    inFiletype = 3; break;
						case "mpg" : case "mpeg" : case "avi" : case "mov" : case "wmv"  : inDownloadNow = this.scsmOptions.linkedMovies;   inFiletype = 4; break;
						case "zip" : case "lzh"  : case "rar" : case "jar" : case "xpi"  : inDownloadNow = this.scsmOptions.linkedArchives; inFiletype = 5; break;
					}
					var inHref = inHref + inPHP;
					if ( inDownloadNow == null ) {
						//Link verarbeiten
						var inFilename = null;
						var inURLNr2 = -1;
						if ( this.scsmHashURL[inHref] == undefined ) {
							//Link nur aufnehmen, falls dieser noch unbekannt, InDepth aktiv ist und die Ebene noch unterhalb der Obergrenze liegt
							if ( inDepthCur < this.scsmOptions.depthMax ) {
								var inFound = 0;
								for ( var inI=0; inI<this.scsmLinks.length; inI++ )
								{
									if ( this.scsmLinks[inI] == inHref ) {
										inFound = 1;
										inI = this.scsmLinks.length;
									}
								}
								if ( inFound == 0 ) this.scsmLinks.push(inHref);
							}
							//da verlinkte Seite unbekannt ist, Angaben dazu speichern
							inURLNr2 = this.scsmArrayURL.length;
							inFilename = this.getFilenameFromURL(inHref, null);
							this.scsmArrayURL.push(inHref);
							this.scsmArrayURLDepth.push(inDepthCur+1);
							this.scsmArrayURLFilename.push(inFilename);
							this.scsmArrayURLFiletype.push(0);
							this.scsmArrayURLLinks.push("");
							this.scsmArrayURLLinksSt.push("");
							this.scsmArrayURLSelected.push(1);
							this.scsmArrayURLState.push(0);
							this.scsmHashURL[inHref] = inURLNr2;
							this.scsmHashFilename[inFilename] = inURLNr2;
							//DLProgress[1] hier nicht erhöhen, da sonst sbp2Capture.xul nicht aufgerufen wird
							//Verweise für weitere Verarbeitung zwischenspeichern, falls inDepthCapture aktiv ist
							if ( inDepthCur < this.scsmOptions.depthMax ) {
								//URL durch Dateinamen ersetzen
								inCurNode.setAttribute("href", inFilename+inAnker);
							} else {
								//vermerken, dass verlinkte Seite nicht heruntergeladen wird
								this.scsmArrayURLSelected[inURLNr2] = 0;
								//komplette URL eintragen
								inCurNode.setAttribute("href", inCurNode.href);
							}
						} else {
							//da verlinkte Seite schon bekannt ist, nichts tun
							inURLNr2 = this.scsmHashURL[inHref];
							//URL auf verlinkte Seite passend ersetzen
							if ( this.scsmArrayURLSelected[inURLNr2] == 1 ) {
								//URL durch Dateinamen ersetzen
								inCurNode.setAttribute("href", this.scsmArrayURLFilename[inURLNr2]+inAnker);
							} else {
								//komplette URL eintragen
								inCurNode.setAttribute("href", inCurNode.href);
							}
						}
						//Verweis für Mutterseite vermerken
						this.scsmArrayURLLinks[inURLNr] += inURLNr2 + ",";
						this.scsmArrayURLLinksSt[inURLNr] += this.scsmArrayURLSelected[inURLNr2] + ",";
						//vermerken, dass Mutterseite Verweise enthält und es sich daher um eine HTML-Seite handeln muss
						this.scsmArrayURLFiletype[inURLNr] = 1;
					} else if ( inDownloadNow == true ) {
						//Datei herunterladen
						var inFileDst = this.downSaveFile(inCurNode.href, inDepthCur, inFiletype);
						//Nummer für verlinkte Seite bestimmen
						inURLNr2 = this.scsmHashURL[inHref];
						//Verweis für Mutterseite vermerken
						this.scsmArrayURLLinks[inURLNr] += inURLNr2 + ",";
						this.scsmArrayURLLinksSt[inURLNr] += this.scsmArrayURLSelected[inURLNr2] + ",";
						//vermerken, dass Mutterseite Verweise enthält und es sich daher um eine HTML-Seite handeln muss
						this.scsmArrayURLFiletype[inURLNr] = 1;
						//lokalen Dateinamen eintragen
						inCurNode.setAttribute("href", inFileDst+inAnker);
					} else {
						if ( this.scsmHashURL[inHref] == undefined ) {
							//verlinkte Seite unbekannt
							inURLNr2 = this.scsmArrayURL.length;
							inFilename = this.getFilenameFromURL(inHref, null);
							this.scsmArrayURL.push(inHref);
							this.scsmArrayURLDepth.push(inDepthCur+1);
							this.scsmArrayURLFilename.push(inFilename);
							this.scsmArrayURLFiletype.push(inFiletype);
							this.scsmArrayURLLinks.push("");
							this.scsmArrayURLLinksSt.push("");
							this.scsmArrayURLSelected.push(1);
							this.scsmArrayURLState.push(0);
							this.scsmHashURL[inHref] = inURLNr2;
							this.scsmHashFilename[inFilename] = inURLNr2;
						} else {
							//verlinkte Seite bekannt
							inURLNr2 = this.scsmHashURL[inHref];
						}
						//Verweis für Mutterseite vermerken
						this.scsmArrayURLLinks[inURLNr] += inURLNr2 + ",";
						this.scsmArrayURLLinksSt[inURLNr] += this.scsmArrayURLSelected[inURLNr2] + ",";
						//vermerken, dass Mutterseite Verweise enthält und es sich daher um eine HTML-Seite handeln muss
						this.scsmArrayURLFiletype[inURLNr] = 1;
						//vollständig qualifizierten Verweis eintragen
						inCurNode.setAttribute("href", inCurNode.href);
					}
				}
				break;
			case "BASE":
				inCurNode = this.removeNodeFromParent(inCurNode);
				break;
			case "FORM":
/*
				//Vervollständigen der Adresse des Attributes "action"
				if ( inCurNode.action.match(/^http:\/\//) ) {
					inCurNode.setAttribute("action", inCurNode.action);
				} else {
					alert("sbp2CaptureSaverMultiple.inspectNode\n---\n\nURL is incomplete -- "+inCurNode.action+". Contact the developer.");
				}
*/
				try {
					var inURLBase = this.scsmArrayFrameBase[this.scsmArrayFrameNr].spec;
					var inURLObj = this.scsmArrayFrameBase[this.scsmArrayFrameNr];
					var inURLRel = inCurNode.action;
					//" entfernen aus inURLRel
					inURLRel = inURLRel.replace(/\"/g, "");
					inCurNode.setAttribute("action", inURLObj.resolve(inURLRel));
				} catch(ex) {
					dump("sbp2CaptureSaverMultiple.inspectNode\n---\nFailed to resolve URL: " + inURLBase + "\t" + inURLRel + "\n");
				}
				break;
			case "FRAME":
			case "IFRAME":
				this.scsmArrayFrameNr++;
//				inCurNode.src = this.scsmArrayFrame[this.scsmArrayFrameNr].location.href;
//				var inFileString = "";
//				if ( this.scsmHashURL[inCurNode.src] ) {
//					inFileString = this.scsmArrayURLFilename[this.scsmHashURL[inCurNode.src]];
//				} else {
//					inFileString = this.getFilenameFromURL(inCurNode.src, null);
//				}
//alert(inCurNode.src+" - "+inFileString);
//if ( inCurNode.src != this.scsmArrayFrame[this.scsmArrayFrameNr].location.href ) {
//	alert(inCurNode.src+" != "+this.scsmArrayFrame[this.scsmArrayFrameNr].location.href);
//}
				var inFileString = this.saveDocumentInternal(this.scsmArrayFrame[this.scsmArrayFrameNr].document, inCurNode.src, this.scsmArrayFrameNr, "", inDepthCur);
				inCurNode.src = inFileString;
				this.scsmDLProgress[0]++;
				break;
			case "IMG":
				//Bild herunterladen oder ganz entfernen
				if ( this.scsmOptions.embeddedImages ) {
					if ( inCurNode.hasAttribute("src") ) {
						var inFileDst = this.downSaveFile(inCurNode.src, inDepthCur, 2);
						if ( inFileDst ) {
							inCurNode.setAttribute("src", inFileDst);
						} else {
							inCurNode.setAttribute("src", inCurNode.src);
						}
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
					if ( this.scsmOptions.embeddedStyles ) {
						var inFileDst = this.inspectStyleSheet(inCurNode, inDepthCur, inCurNode.href, 2);
						if ( inFileDst ) {
							inCurNode.setAttribute("href", inFileDst);
						} else {
							inCurNode.setAttribute("href", inCurNode.href);
						}
					} else {
//						return this.removeNodeFromParent(inCurNode);
						inCurNode = this.removeNodeFromParent(inCurNode);
					}
				} else if ( inCurNode.rel.toLowerCase() == "icon" || inCurNode.rel.toLowerCase() == "shortcut icon" ) {
					var inFileDst = this.downSaveFile(inCurNode.href, inDepthCur, 2);
					if ( inFileDst ) {
						inCurNode.setAttribute("href", inFileDst);
						this.scsmItem.icon = inFileDst;
					} else {
						inCurNode.setAttribute("href", inCurNode.href);
					}
				} else {
					inCurNode.setAttribute("href", inCurNode.href);
				}
				break;
			case "META":
				//Angaben zum Dateiinhalt wird geloescht, da diese Information vor dem Schreiben eingefuegt wird
				if ( inCurNode.hasAttribute("http-equiv") && inCurNode.hasAttribute("content") &&
					 inCurNode.getAttribute("http-equiv").toLowerCase() == "content-type" &&
					 inCurNode.getAttribute("content").match(/charset/i) ) {
					inCurNode = this.removeNodeFromParent(inCurNode);
				}
				break;
			case "SCRIPT":
			case "NOSCRIPT":
				if ( this.scsmOptions.embeddedScript ) {
					if ( inCurNode.hasAttribute("src") ) {
						var inFileDst = this.downSaveFile(inCurNode.src, inDepthCur, 0);
						if ( inFileDst ) {
							inCurNode.setAttribute("src", inFileDst);
						} else {
							inCurNode.setAttribute("src", inCurNode.src);
						}
					}
				} else {
//					return this.removeNodeFromParent(inCurNode);
					inCurNode = this.removeNodeFromParent(inCurNode);
				}
				break;
			case "STYLE":
				if ( this.scsmOptions.embeddedStyles ) {
					inCurNode = this.inspectStyleSheet(inCurNode, inDepthCur, this.scsmArrayFrameBase[this.scsmArrayFrameNr].spec, 1);
				} else {
//					return this.removeNodeFromParent(inCurNode);
					inCurNode = this.removeNodeFromParent(inCurNode);
				}
				break;
			default:
//				dump(inCurNode.nodeName+"\n");
				break;
		}
		//Style-Attribut verarbeiten
		if ( this.scsmOptions.embeddedStyles ) {
			if ( inCurNode.style && inCurNode.style.cssText ) {
				var inCSSText = this.inspectStyleRules(inCurNode, inDepthCur);
				inCurNode.setAttribute("style", inCSSText);
			}
		} else {
			if ( inCurNode.style ) {
				inCurNode.removeAttribute("style");
			}
		}
		return inCurNode;
	},

	inspectStyleRules : function(isrNode, isrDepthCur)
	{
//wird von this.inspectNode aufgerufen
		//Verarbeitet die url-Angaben des Style-Attributes von Elementen.
		//An die aufrufende Funktion wird der überarbeitete cssText zurückgegeben.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. cssText nach Verweisen durchsuchen
		//3. Verweise verarbeiten
		//4. ueberarbeitetes cssText zurueck an aufrufende Funktion

		//1. Variablen initialisieren
		var isrCSSText = isrNode.getAttribute("style");
		var isrURLBase = this.scsmArrayFrameBase[this.scsmArrayFrameNr].spec;
		var isrPosPoint = isrURLBase.lastIndexOf(".");
		var isrPosSlash = isrURLBase.lastIndexOf("/");
		if ( isrPosSlash > 6 && isrPosPoint > isrPosSlash ) {
			isrURLBase = isrURLBase.substring(0, isrPosSlash);
		}
		//2. cssText nach Verweisen durchsuchen
		var isrLinks = isrCSSText.match(/url\(.*?\)/gi);
		//3. Verweise verarbeiten
		if ( isrLinks ) {
			for ( var isrI=0; isrI<isrLinks.length; isrI++ )
			{
				var isrURLImage = isrLinks[isrI];
				var isrSplit = this.buildURL(isrURLBase, isrURLImage);
				var isrFile = "";
				if ( isrSplit[0].substring(0, 5) == "data:" ) {
					isrFile = isrSplit[0];
				} else {
					isrFile = this.downSaveFile(isrSplit[0], isrDepthCur, 0);
				}
				//Gefundenes Tag im Code austauschen
				if ( isrFile != "" ) {
					isrURLImage = isrURLImage.replace(/\(/g, "\\(");
					isrURLImage = isrURLImage.replace(/\)/g, "\\)");
					isrURLImage = isrURLImage.replace(/\?/g, "\\?");
					isrURLImage = isrURLImage.replace(/\+/g, "\\+");
					isrURLImage = isrURLImage.replace(/\//g, "\\/");
					var isrSearchterm = new RegExp(isrURLImage, "g");
					isrCSSText = isrCSSText.replace(isrSearchterm,isrSplit[1]+isrFile+isrSplit[2]);
				}
			}
		}
		//4. ueberarbeitetes cssText zurueck an aufrufende Funktion
		return isrCSSText;
	},

	inspectStyleSheet : function(issNode, issDepthCur, issBaseURL, issMode)
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
		//3.1 Regeltyp bestimmen
		//3.2 Länge der zu prüfenden Zeichenkette bestimmen (ist dies 0, gibt es nichts zu übernehmen und auch nichts zu prüfen)
		//3.3 Regel übernehmen (bei Typ 1 und 7 erfolgt eine Prüfung, ob die Regel tatsächlich verwendet wird)
		//3.3.1 Regel nach verlinkter Datei durchsuchen und diese herunterladen
		//4. issNode.cssText aktualisieren oder Dateiname zurückgeben
		//
		//		issMode = 1		=> eingebettete Styles
		//		issMode = 2		=> externes StyleSheet
		//		issMode = 3		=> CSSImportRule

		//1. Variablen initialisieren
		var issCSS = null;
		var issDocument = issNode.ownerDocument;
		var issStyleSheet = null;
		var issStyleSheetNr = 0;					//Zugriff auf issDocument.styleSheets[?]
		var issStyleSheetANr = -1;					//Zugriff auf this.scsmStyleSheet*
		//2. StyleSheet-Nummer suchen
		if ( issMode == 1 ) {
			//passende Listen-Nummer suchen
			var issI=0;
			issStyleSheetNr = -1;
			while ( issI < this.scsmArrayFrameStyles[this.scsmArrayFrameNr] )
			{
				issStyleSheetNr++;
				if ( issDocument.styleSheets[issStyleSheetNr].href == null ) {
					issI++;
				}
			}
			//Dateiname bestimmen
			this.scsmStyleSheetFilename.push(-1);
			issStyleSheetANr = this.scsmStyleSheetFilename.length-1;
			//Platzhalter für Regeln des aktuellen StyleSheet in this.scsmStyleSheetRules erstellen
			var issRules = [];
			for ( var issI=0; issI<issDocument.styleSheets[issStyleSheetNr].cssRules.length; issI++ )
			{
				issRules[issI] = "";
			}
			this.scsmStyleSheetRules.push(issRules);
			//vermerken, dass ein Style-Block in der aktuellen HTML-Seite bearbeitet worden ist
			this.scsmArrayFrameStyles[this.scsmArrayFrameNr]++;
			//Objekt mit den Regeln festlegen
			issCSS = issDocument.styleSheets[issStyleSheetNr];
		} else if ( issMode == 3 ) {
			//Objekt mit den Regeln festlegen
			issCSS = issNode.styleSheet;
			//Dateiname bestimmen, falls das StyleSheet zuvor noch nicht bearbeitet worden ist.
			if ( this.scsmHashURL[issCSS.href] ) {
				var issURLNr = this.scsmHashURL[issCSS.href];
				this.scsmStyleSheetFilename.push(issURLNr);
				issStyleSheetANr = this.scsmStyleSheetFilename.length-1;
				//Platzhalter für Regeln des aktuellen StyleSheet in this.scsmStyleSheetRules erstellen
				var issRules = [];
				for ( var issI=0; issI<issCSS.cssRules.length; issI++ )
				{
					issRules[issI] = "";
				}
				this.scsmStyleSheetRules.push(issRules);
//alert("issStyleSheetNr - "+issStyleSheetNr+"\nissCSS.href - "+issCSS.href+"\n"+this.scsmHashURL[issCSS.href]+"\nthis.scsmStyleSheetFilename.length - "+this.scsmStyleSheetFilename.length);
				if ( issStyleSheetANr == -1 ) {
					this.scsmStyleSheetFilename.push(issURLNr);
					issStyleSheetANr = this.scsmStyleSheetFilename.length-1;
					//Platzhalter für Regeln des aktuellen StyleSheet in this.scsmStyleSheetRules erstellen
					var issRules = [];
					for ( var issI=0; issI<issCSS.cssRules.length; issI++ )
					{
						issRules[issI] = "";
					}
					this.scsmStyleSheetRules.push(issRules);
				}
			} else {
				//Neue CSS-Datei gefunden
				//lokalen Dateinamen bestimmen
				var issFilename = this.getFilenameFromURL(issCSS.href, null);
				var issURLNr = this.scsmArrayURL.length;
				this.scsmArrayURL.push(issCSS.href);
				this.scsmArrayURLDepth.push(issDepthCur);
				this.scsmArrayURLFilename.push(issFilename);
				this.scsmArrayURLFiletype.push(0);
				this.scsmArrayURLLinks.push("");
				this.scsmArrayURLLinksSt.push("");
				this.scsmArrayURLSelected.push(1);
				this.scsmArrayURLState.push(0);
				this.scsmHashURL[issCSS.href] = issURLNr;
				this.scsmHashFilename[issFilename] = issURLNr;
				this.scsmStyleSheetFilename.push(issURLNr);
				issStyleSheetANr = this.scsmStyleSheetFilename.length-1;
				//Platzhalter für Regeln des aktuellen StyleSheet in this.scsmStyleSheetRules erstellen
				var issRules = [];
				for ( var issI=0; issI<issCSS.cssRules.length; issI++ )
				{
					issRules[issI] = "";
				}
				this.scsmStyleSheetRules.push(issRules);
			}
		} else {
			//passende Listen-Nummer suchen
			while ( issDocument.styleSheets[issStyleSheetNr].href != issNode.href )
			{
				issStyleSheetNr++;
			}
			//Dateiname bestimmen, falls das StyleSheet zuvor noch nicht bearbeitet worden ist.
			if ( this.scsmHashURL[issNode.href] ) {
				var issURLNr = this.scsmHashURL[issNode.href];
				this.scsmStyleSheetFilename.push(issURLNr);
				issStyleSheetANr = this.scsmStyleSheetFilename.length-1;
				//Platzhalter für Regeln des aktuellen StyleSheet in this.scsmStyleSheetRules erstellen
				var issRules = [];
				for ( var issI=0; issI<issDocument.styleSheets[issStyleSheetNr].cssRules.length; issI++ )
				{
					issRules[issI] = "";
				}
				this.scsmStyleSheetRules.push(issRules);
//alert("issStyleSheetNr - "+issStyleSheetNr+"\nissNode.href - "+issNode.href+"\n"+this.scsmHashURL[issNode.href]+"\nthis.scsmStyleSheetFilename.length - "+this.scsmStyleSheetFilename.length);
				if ( issStyleSheetANr == -1 ) {
					this.scsmStyleSheetFilename.push(issURLNr);
					issStyleSheetANr = this.scsmStyleSheetFilename.length-1;
					//Platzhalter für Regeln des aktuellen StyleSheet in this.scsmStyleSheetRules erstellen
					var issRules = [];
					for ( var issI=0; issI<issDocument.styleSheets[issStyleSheetNr].cssRules.length; issI++ )
					{
						issRules[issI] = "";
					}
					this.scsmStyleSheetRules.push(issRules);
				}
			} else {
				//Neue CSS-Datei gefunden
				//lokalen Dateinamen bestimmen
				var issFilename = this.getFilenameFromURL(issNode.href, null);
				var issURLNr = this.scsmArrayURL.length;
				this.scsmArrayURL.push(issNode.href);
				this.scsmArrayURLDepth.push(issDepthCur);
				this.scsmArrayURLFilename.push(issFilename);
				this.scsmArrayURLFiletype.push(0);
				this.scsmArrayURLLinks.push("");
				this.scsmArrayURLLinksSt.push("");
				this.scsmArrayURLSelected.push(1);
				this.scsmArrayURLState.push(0);
				this.scsmHashURL[issNode.href] = issURLNr;
				this.scsmHashFilename[issFilename] = issURLNr;
				this.scsmStyleSheetFilename.push(issURLNr);
				issStyleSheetANr = this.scsmStyleSheetFilename.length-1;
				//Platzhalter für Regeln des aktuellen StyleSheet in this.scsmStyleSheetRules erstellen
				var issRules = [];
				for ( var issI=0; issI<issDocument.styleSheets[issStyleSheetNr].cssRules.length; issI++ )
				{
					issRules[issI] = "";
				}
				this.scsmStyleSheetRules.push(issRules);
			}
			//Objekt mit den Regeln festlegen
			issCSS = issDocument.styleSheets[issStyleSheetNr];
		}
		//3. nur Regeln übernehmen, die auch in Verwendung sind
		var issCSSSelector = "";
		var issRuleType = -1;
		var issCSSText = "";
		var issCSSTextLen = -1;
		for ( var issI=0; issI<issCSS.cssRules.length; issI++ ) {
			if ( this.scsmStyleSheetRules[issStyleSheetANr][issI] == "" ) {
				//3.1 Regeltyp bestimmen
				issRuleType = issCSS.cssRules[issI].type;
				//3.2 Länge der zu prüfenden Zeichenkette bestimmen (ist dies 0, gibt es nichts zu übernehmen und auch nichts zu prüfen)
				if ( issRuleType == 1 ) {
					issCSSText = issCSS.cssRules[issI].selectorText;
					if ( issCSSText.match(/:[a-z-]+/g) ) {
						issCSSText = issCSSText.replace(/:+[0-9a-zA-Z-+\.\(\[\)\]]+/g, "");
						if ( issCSSText.substring(issCSSText.length-2, issCSSText.length) == "> ") {
							issCSSText = issCSSText.substring(0, issCSSText.length-2);
						}
					}
					issCSSTextLen = issCSSText.length;
				} else if ( issRuleType== 3 ) {
					//CSSImportRule bearbeiten
					var issFilename = this.inspectStyleSheet(issCSS.cssRules[issI], issDepthCur, issBaseURL, 3);
					this.scsmStyleSheetRules[issStyleSheetANr][issI] = issCSS.cssRules[issI].cssText.replace(/(url\([ '"]+)(.*?)([ '"]+\))/g, '$1'+issFilename+'$3');
					//Verhindern, das Regel erneut bearbeitet wird
					issCSSTextLen = 0;
				} else if ( issRuleType== 4 || issRuleType == 5 ) {
					issCSSTextLen = issCSS.cssRules[issI].cssText.length;
				} else {
					dump("bisher nicht beruecksichtigter Regeltyp -> "+issCSS.cssRules[issI].type+"\n");
//				issCSSTextLen = issCSS.cssRules[issI].cssText.length;
					issCSSTextLen = 0;
				}
				//3.3 Regel übernehmen (bei Typ 1 und 7 erfolgt eine Prüfung, ob die Regel tatsächlich verwendet wird)
				if ( issCSSTextLen > 0 ) {
					if ( issRuleType == 1 || issRuleType == 7 ) {
						try
						{
							if ( issDocument.querySelector(issCSSText) ) {
								this.scsmStyleSheetRules[issStyleSheetANr][issI] = issCSS.cssRules[issI].selectorText + " { " +
																				  issCSS.cssRules[issI].style.cssText + " }";
							}
						} catch (issException)
						{
							this.scsmStyleSheetRules[issStyleSheetANr][issI] = issCSS.cssRules[issI].cssText;
						}
					} else {
						this.scsmStyleSheetRules[issStyleSheetANr][issI] = issCSS.cssRules[issI].cssText;
					}
					//3.3.1 Regel nach verlinkter Datei durchsuchen und diese herunterladen
					var issLinks = this.scsmStyleSheetRules[issStyleSheetANr][issI].match(/url\(.*?\)/gi);
//dump(this.scsmStyleSheetRules[issStyleSheetANr][issI]+"\n---\n");
//dump(issLinks+"\n");
					if ( issLinks ) {
//					var issURLPath = issNode.href;
//					var issURLPath = this.scsmArrayFrameBase[this.scsmArrayFrameNr];
//dump("issNode.href - "+issNode.href+"\nthis.scsmArrayFrameBase[this.scsmArrayFrameNr] - "+this.scsmArrayFrameBase[this.scsmArrayFrameNr]+"\n");
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
							var issSplit = this.buildURL(issBaseURL, issURLImage);
							var issFile = "";
							if ( issSplit[0].substring(0, 5) == "data:" ) {
								issFile = issSplit[0];
							} else {
								issFile = this.downSaveFile(issSplit[0], issDepthCur, 0);
							}
							//Gefundenes Tag im Code austauschen
							if ( issFile != "" ) {
								issURLImage = issURLImage.replace(/\(/g, "\\(");
								issURLImage = issURLImage.replace(/\)/g, "\\)");
								issURLImage = issURLImage.replace(/\?/g, "\\?");
								issURLImage = issURLImage.replace(/\+/g, "\\+");
								issURLImage = issURLImage.replace(/\//g, "\\/");
								var issSearchterm = new RegExp(issURLImage, "g");
								this.scsmStyleSheetRules[issStyleSheetANr][issI] = this.scsmStyleSheetRules[issStyleSheetANr][issI].replace(issSearchterm,issSplit[1]+issFile+issSplit[2]);
							}
						}
					}
				}
			}
		}
		//4. issNode.cssText aktualisieren oder Dateiname zurückgeben
		if ( issMode == 1 ) {
			//issNode.cssText aktualisieren
			var cssData = "";
			for ( var issI=0; issI<this.scsmStyleSheetRules[issStyleSheetANr].length; issI++ )
			{
				if ( this.scsmStyleSheetRules[issStyleSheetANr][issI].length>0 ) {
					cssData = cssData + "\n" + this.scsmStyleSheetRules[issStyleSheetANr][issI];
				}
			}
			var issNodeNew = document.createElement("STYLE");
			issNodeNew.appendChild(document.createTextNode(cssData+"\n"));
			issNode.parentNode.replaceChild(issNodeNew, issNode);
			//neuen Node zurückgeben, damit der TreeWalker einen Fortsetzungspunkt hat (alte Node existiert nicht mehr)
			return issNodeNew;
		} else {
			//Dateiname zurückgeben
			return this.scsmArrayURLFilename[this.scsmStyleSheetFilename[issStyleSheetANr]];
		}
	},

	downSaveFile : function(dsfURLSpec, dsfDepthCur, dsfFiletype)
	{
//wird von this.capture und inspectNode aufgerufen
		//Läd das Dokument hinter dsfURLSpec herunter und speichert es unverändert nach this.scsmOptions.directoryDst als dsfFileString.
		//
		//Ablauf:
		//1. Prüfen, ob Datei schon heruntergeladen wird
		//2. Weiteren Download vermerken
		//3. lokalen Dateinamen bestimmen
		//4. wichtige Informationen im globalen Speicherbereich merken
		//5. Datei herunterladen
		//6. Dateiname zurück an aufrufende Funktion

		//1. Prüfen, ob Datei schon heruntergeladen wird
		if ( this.scsmHashURL[dsfURLSpec] ) {
			//Datei wurde schon heruntergeladen -> Dateiname zurückgeben
			return this.scsmArrayURLFilename[this.scsmHashURL[dsfURLSpec]];
		}
		//2. Weiteren Download vermerken
		this.scsmDLProgress[1]++;
		//3. lokalen Dateinamen bestimmen
		var dsfFileString = this.getFilenameFromURL(dsfURLSpec, null);
		//4. wichtige Informationen im globalen Speicherbereich merken
		var dsfNr = this.scsmArrayURL.length;
		this.scsmArrayURL.push(dsfURLSpec);
		this.scsmArrayURLDepth.push(dsfDepthCur);
		this.scsmArrayURLFilename.push(dsfFileString);
		this.scsmArrayURLFiletype.push(dsfFiletype);
		this.scsmArrayURLLinks.push("");
		this.scsmArrayURLLinksSt.push("");
		this.scsmArrayURLSelected.push(1);
		this.scsmArrayURLState.push(0);
		this.scsmHashURL[dsfURLSpec] = dsfNr;
		this.scsmHashFilename[dsfFileString] = dsfNr;
		//5. Datei herunterladen
		var dsfFile = this.scsmOptions.directoryDst.clone();
		dsfFile.append(dsfFileString);
		var dsfURIObj = sbp2Common.IO.newURI(dsfURLSpec, null, null);
		var dsfWBP = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);;
		dsfWBP.persistFlags |= dsfWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
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
					sbp2CaptureSaverMultiple.captureCompleteCheck();
				}
			}
		}
		if ( this.scsmOptions.fxVer36 ) {
			var dsfPrivacy = PrivateBrowsingUtils.privacyContextFromWindow(this.scsmWindowURLSource);
			dsfWBP.saveURI(dsfURIObj, null, this.scsmArrayFrameBase[this.scsmArrayFrameNr], Components.interfaces.nsIHttpChannel.REFERRER_POLICY_NO_REFERRER_WHEN_DOWNGRADE, null, "", dsfFile, dsfPrivacy);
		} else if ( this.scsmOptions.fxVer18 ) {
			var dsfPrivacy = PrivateBrowsingUtils.privacyContextFromWindow(this.scsmWindowURLSource);
			dsfWBP.saveURI(dsfURIObj, null, this.scsmArrayFrameBase[this.scsmArrayFrameNr], null, "", dsfFile, dsfPrivacy);
		} else {
			dsfWBP.saveURI(dsfURIObj, null, this.scsmArrayFrameBase[this.scsmArrayFrameNr], null, "", dsfFile);
		}
		//6. Seite erfolgreich gespeichert -> Status ändern
		this.scsmArrayURLState[dsfNr] = 1;
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

	getFilenameFromURL : function(gffuURLString, gffuCharset)
	{
		//Bestimmt anhand der übergebenen Adresse den Dateinamen, unter dem der Inhalt der Seite abgespeichert wird.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Dateinamen bestimmen
		//3. Dateiname in Kleinbuchstaben konvertieren, da Windows nicht zwischen Groß-/Kleinschreibung unterscheidet
		//4. Nicht erlaubte Zeichen im Dateinamen ersetzen
		//5. Sicherstellen, dass Dateiname einmalig ist
		//6. Dateiname in Hash aufnehmen
		//7. Dateinamen an aufrufende Funktion zurückliefern

		//1. Variablen initialisieren
		let gffuFilename = "";
		let gffuURI = null;
		//2. Dateinamen bestimmen
		try
		{
			gffuURI = sbp2Common.IO.newURI(gffuURLString, gffuCharset, null);
		} catch(gffuErr) {
			gffuURI = sbp2Common.IO.newURI("http://unknown", gffuCharset, null);
		}
		try
		{
			let gffuURL = gffuURI.QueryInterface(Components.interfaces.nsIURL);
			if ( gffuURL.fileName != "" ) {
				let gffuTextToSubURI = Components.classes["@mozilla.org/intl/texttosuburi;1"].getService(Components.interfaces.nsITextToSubURI);
				gffuFilename = gffuTextToSubURI.unEscapeURIForUI(gffuURL.originCharset || "UTF-8", gffuURL.fileName);
			}
		} catch (gffuErr) {
		}
		if ( gffuFilename == "" ) {
			gffuFilename = gffuURI.path.match(/\/([^\/]+)\/$/);
			if ( gffuFilename && gffuFilename.length > 1 ) {
				gffuFilename = gffuFilename[1];
			} else {
				gffuFilename = "unknown";
			}
		}
		//3. Dateiname in Kleinbuchstaben konvertieren, da Windows nicht zwischen Groß-/Kleinschreibung unterscheidet
		gffuFilename = gffuFilename.toLowerCase();
		//4. Nicht erlaubte Zeichen im Dateinamen ersetzen
		gffuFilename = gffuFilename.replace(/[\"]+/g, "'");
		gffuFilename = gffuFilename.replace(/[\*\:\?\|]+/g, "_");
		gffuFilename = gffuFilename.replace(/[\<]+/g, "(");
		gffuFilename = gffuFilename.replace(/[\>]+/g, ")");
		//5. Sicherstellen, dass Dateiname einmalig ist
		if ( this.scsmHashFilename[gffuFilename] != undefined ) {
			if ( this.scsmHashFilename[gffuFilename] > -1 ) {
				var gffuCounter = 0;
				var gffuExtension = this.fileGetExtension(gffuFilename);
				var gffuName = "";
				if ( gffuExtension.length > 0 ) {
					gffuName = gffuFilename.substring(0, gffuFilename.length-gffuExtension.length-1);
				} else {
					gffuName = gffuFilename;
				}
				while ( this.scsmHashFilename[gffuFilename] != undefined )
				{
					gffuCounter++;
					if ( gffuCounter<10) {
						gffuFilename = gffuName+"_00"+gffuCounter;
					} else if ( gffuCounter<100) {
						gffuFilename = gffuName+"_0"+gffuCounter;
					} else {
						gffuFilename = gffuName+"_"+gffuCounter;
					}
					if ( gffuExtension.length > 0 ) gffuFilename = gffuFilename+"."+gffuExtension;
				}
			}
		}
		//6. Dateiname in Hash aufnehmen
		this.scsmHashFilename[gffuFilename] = -1;
		//7. Dateinamen an aufrufende Funktion zurückliefern
		return gffuFilename;
	},

}