
Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

const STATE_STOP = Components.interfaces.nsIWebProgressListener.STATE_STOP;

var sbp2CaptureSaverInDepth = {

	//Die globale Definition dieser Variablen vereinfacht die Handhabung
	scsItem				: { id: "", type: "", title: "", chars: "", icon: "", source: "", comment: "" },
	scsResDestination	: { position: null, resCont: null },

	scsOptions			: {	directoryDst: null, depthMax: -1, timeout: 0, mode: -1, fxVer18: null, fxVer36: null, embeddedImages: false, embeddedScript: false, embeddedStyles: false, linkedArchives: false, linkedAudio: false, linkedCustom: false, linkedImages: false, linkedMovies: false },

	scsStyleSheetFilename : [],	//enthält die Dateinamen der StyleSheets im Verzeichnis des Eintrags
	scsStyleSheetRules	: [],	//enthält Platz für alle verfügbaren Regeln eines StyleSheets; mit Text vorhanden sind aber nur die tatsächlich genutzten Regeln

	scsWindowURLSource	: null,	//wird für PrivacyMode in downSaveFile benötigt

	scsCaptureRunning	: 0,
	scsDLProgress		: [0, 0],	//1. Zahl: fertig verarbeitete Dateien, 2. Zahl: Dateien insgesamt

	scsArrayURL			: [],	//enthält alle Adressen, die gefunden und bearbeitet wurden
	scsArrayURLDepth	: [],	//Ebene der Adresse
	scsArrayURLFilename	: [],	//enthält den Dateinamen, unter dem die scsArrayURL gespeichert werden soll
	scsArrayURLFiletype	: [],	//Dateityp (0=unbekannt, 1=HTML, 2=Bild, 3=Audio, 4=Film, 5=Archiv, 6=benutzerdefiniert)
	scsArrayURLLinks	: [],	//enthält die Nummern aller URLs, auf die verwiesen wird, als Zeichenkette (durch Komma getrennt)
	scsArrayURLLinksSt	: [],	//enthält den Status für jeden Link als Zeichenkette (durch Komma getrennt)
	scsArrayURLSelected	: [],	//gibt an, ob vorgesehen ist, die Datei herunterzuladen oder nicht (0=nein, 1=ja)
	scsArrayURLState	: [],	//enthält den Zustand der Datei (0=noch nicht gespeichert/fehlgeschlagen, 1=gespeichert (kein Redirect), 2=gespeichert (Redirect))

	//Die folgenden vier *Frame*-Variablen werden für die Bearbeitung der Seite im Browser verwendet.
	//Sie müssen bei jedem Aufruf der Funktion "capture" initialisiert werden
	scsArrayFrame		: [],	//enthält für jedes Frame das Window-/Frame-Objekt
	scsArrayFrameBase	: [],	//enthält für jedes Frame das URL-Objekt mit der base
	scsArrayFrameNr		: 0,	//Nummer des Frames, das gerade bearbeitet wird
	scsArrayFrameStyles	: [],	//Wert gibt an, wie viele Style-Blöcke in der aktuellen HTML-Seite schon bearbeitet worden sind; Startwert ist immer 0

	scsHashURL			: {},	//Hash-Bereich für Web-Adressen (HTLM, Bilder, sonstiges)							-- nur Nummer zu scsArrayURL
	scsHashFilename		: {},	//Hash-Bereich für Dateinamen														-- nur Nummer zu scsArrayURL

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

		//1. Variablen initialisieren
		this.scsArrayFrame			= [];
		this.scsArrayFrameBase		= [];
		this.scsArrayFrameNr		= 0;
		this.scsArrayFrameStyles	= [];
		this.scsWindowURLSource		= cRootWindow;
/*
		if ( this.scsHashURL[cRootWindow.document.URL] ) {
			cFilename = this.scsArrayURLFilename[this.scsHashURL[cRootWindow.document.URL]];
		} else {
			if ( cFilename == null ) {
				cFilename = this.getFilenameFromURL(cRootWindow.document.URL, null);
			}
			this.scsHashFilename[cFilename] = -1;
		}
*/
		//2. Liste mit Frames erstellen
		this.scsArrayFrame = sbp2Common.getFrameList(cRootWindow);
		for ( var cI=0; cI<this.scsArrayFrame.length; cI++ )
		{
			this.scsArrayFrameBase.push(null);
			this.scsArrayFrameStyles.push(1);
		}
		//3. Seiteninhalt archivieren
		this.saveDocumentInternal(cRootWindow.document, sbp2Capture.getCurrentURLFromTree(), this.scsArrayFrameNr, cFilename, cDepthCur);
		//4. Falls in Schritt 3 kein Icon gefunden wurde, wird jetzt versucht, eines zu bestimmen
		//(nsIFaviconService funktioniert nicht, wenn Firefox im Private Modus läuft. Daher dieser Weg.)
		if ( this.scsOptions.mode < 2 && this.scsItem.icon == null ) {
			var cMainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
							  .getInterface(Components.interfaces.nsIWebNavigation)
							  .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
							  .rootTreeItem
							  .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
							  .getInterface(Components.interfaces.nsIDOMWindow);
			var cURLIcon = cMainWindow.gBrowser.selectedTab.getAttribute("image");
			if ( cURLIcon != "" ) {
				this.scsItem.icon = this.downSaveFile(cMainWindow.gBrowser.selectedTab.getAttribute("image"), cDepthCur, 2);
			} else {
				this.scsItem.icon = "";
			}
		}
		//5. Ende Verarbeitung erreicht
		this.captureCompleteCheck();
	},

	captureAddWebsite : function(cawRootWindow, cawFilename, cawNewID, cawOptions)
	{
alert("sbp2CaptureSaverInDepth.captureAddWebsite - Out of order.");
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
		for ( var cI=0; cI<this.scsArrayURL.length; cI++ )
		{
			if ( this.scsArrayURLLinks[cI].substr(this.scsArrayURLLinks[cI].length-1, 1) == "," ) {
				this.scsArrayURLLinks[cI] = this.scsArrayURLLinks[cI].substring(0, this.scsArrayURLLinks[cI].length-1);
				this.scsArrayURLLinksSt[cI] = this.scsArrayURLLinksSt[cI].substring(0, this.scsArrayURLLinksSt[cI].length-1);
			}
			cfData = cfData + this.scsArrayURL[cI] + "\n" +
							this.scsArrayURLDepth[cI] + "\n" +
							this.scsArrayURLFilename[cI] + "\n" +
							this.scsArrayURLFiletype[cI] + "\n" +
							this.scsArrayURLLinks[cI] + "\n" +
							this.scsArrayURLLinksSt[cI] + "\n" +
							this.scsArrayURLState[cI] + "\n";
		}
		var cfFile = this.scsOptions.directoryDst.clone();
		cfFile.append("sbp2-links_org.txt");
		sbp2Common.fileWrite(cfFile, cfData, "UTF-8");
//wird von this.captureCompleteCheck aufgerufen
		//1. Variablen initialisieren
		var cDataNeu = null;
		var cFile = null;
		var cFileDst = null;
		var cNr = -1;
		//2. CSS-Seiten schreiben, falls dies gewünscht ist
		if ( this.scsOptions.embeddedStyles ) {
			cDataNeu = "";
			for ( var cI=0; cI<this.scsStyleSheetFilename.length; cI++ )
			{
				if ( this.scsStyleSheetFilename[cI] > -1 ) {
					cDataNeu = "";
					//genutzte Rules zusammenstellen
					for ( var cJ=0; cJ<this.scsStyleSheetRules[cI].length; cJ++ )
					{
						if ( this.scsStyleSheetRules[cI][cJ].length > 0 ) {
							cDataNeu = cDataNeu + "\n" + this.scsStyleSheetRules[cI][cJ] + "\n";
						}
					}
					//Datei erstellen oder aktualisieren, falls Daten vorhanden sind
					if ( cDataNeu.length>0 ) {
						cNr = this.scsStyleSheetFilename[cI];
						cFileDst = this.scsOptions.directoryDst.clone();
						cFileDst.append(this.scsArrayURLFilename[cNr]);
						if ( this.scsArrayURLState[cNr] == 0 ) {
							sbp2Common.fileWrite(cFileDst, cDataNeu, "UTF-8");
							this.scsArrayURLState[cNr] = 1;
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
		for ( var cI=0; cI<this.scsArrayURL.length; cI++ )
		{
			//Nur Seiten prüfen, die auch Verweise enthalten
			if ( this.scsArrayURLFiletype[cI] == 1 ) {
				if ( this.scsArrayURLLinks[cI].length > 0 ) {
					//Komma am Ende des Text abschneiden
					if ( this.scsArrayURLLinks[cI].substr(this.scsArrayURLLinks[cI].length-1, 1) == "," ) {
						this.scsArrayURLLinks[cI] = this.scsArrayURLLinks[cI].substring(0, this.scsArrayURLLinks[cI].length-1);
						this.scsArrayURLLinksSt[cI] = this.scsArrayURLLinksSt[cI].substring(0, this.scsArrayURLLinksSt[cI].length-1);
					}
					//Variablen initialisieren
					cData = null;
					cDoc = null;
					cDocChanged = 0;
					cLinks = [];
					var cSplitLinks = this.scsArrayURLLinks[cI].split(",");
					var cSplitState = this.scsArrayURLLinksSt[cI].split(",");
/*
var cAusgabe = "";
for ( var cJ=0; cJ<cSplitLinks.length; cJ++ )
{
	var cNr = cSplitLinks[cJ];
	cAusgabe = cAusgabe + cNr + " -  " +  this.scsArrayURL[cNr] + " - " + this.scsArrayURLState[cNr] + " - " + cSplitState[cJ] + "\n";
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
dump(this.scsArrayURLState[cNr]+" != "+cSplitState[cJ]+" - "+this.scsArrayURL[cNr]+"\n");
						if ( this.scsArrayURLState[cNr] != cSplitState[cJ] ) {
							//Inhalt der Webseite in den Speicher holen und parsen, falls dies noch nicht geschehen ist
							if ( cDocChanged == 0 ) {
								cFileDst = this.scsOptions.directoryDst.clone();
								cFileDst.append(this.scsArrayURLFilename[cI]);
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
							if ( this.scsArrayURLState[cNr] == 0 ) {
								//Dateiname durch URL ersetzen
								cLinks[cJ+cNoHref].setAttribute("href", this.scsArrayURL[cNr]+cAnker);
								cSplitState[cJ] = 0;
							} else {
								//URL durch Dateiname ersetzen
								cLinks[cJ+cNoHref].setAttribute("href", this.scsArrayURLFilename[cNr]+cAnker);
								cSplitState[cJ] = 1;
							}
						}
					}
					//Webseite und this.scsArrayURLLinksSt[cI] aktualisieren, falls zuvor Verweise geändert wurden
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
						cFileDst = this.scsOptions.directoryDst.clone();
						cFileDst.append(this.scsArrayURLFilename[cI]);
//						sbp2Common.fileWrite(cFileDst, cHTML, RegExp.$1);
						sbp2Common.fileWrite(cFileDst, cHTML, null);
						//Status der Verweise aktualisieren
						this.scsArrayURLLinksSt[cI] = cSplitState[0];
						for ( var cJ=1; cJ<cSplitState.length; cJ++ )
						{
							this.scsArrayURLLinksSt[cI] = this.scsArrayURLLinksSt[cI] + "," + cSplitState[cJ];
						}
					}
				}
			}
		}
		//4. sbp2-links.txt erstellen
		cData = "";
		for ( var cI=0; cI<this.scsArrayURL.length; cI++ )
		{
			cData = cData + this.scsArrayURL[cI] + "\n" +
							this.scsArrayURLDepth[cI] + "\n" +
							this.scsArrayURLFilename[cI] + "\n" +
							this.scsArrayURLFiletype[cI] + "\n" +
							this.scsArrayURLLinks[cI] + "\n" +
							this.scsArrayURLLinksSt[cI] + "\n" +
							this.scsArrayURLState[cI] + "\n";
		}
		cFile = this.scsOptions.directoryDst.clone();
		cFile.append("sbp2-links.txt");
		sbp2Common.fileWrite(cFile, cData, "UTF-8");
		//5. sbp2-capset.txt erstellen
		cData = "";
		cData += sbp2CaptureSaverInDepth.scsOptions.embeddedImages + "\n";
		cData += sbp2CaptureSaverInDepth.scsOptions.embeddedStyles + "\n";
		cData += sbp2CaptureSaverInDepth.scsOptions.embeddedScript + "\n";
		cData += sbp2CaptureSaverInDepth.scsOptions.linkedImages + "\n";
		cData += sbp2CaptureSaverInDepth.scsOptions.linkedAudio + "\n";
		cData += sbp2CaptureSaverInDepth.scsOptions.linkedMovies + "\n";
		cData += sbp2CaptureSaverInDepth.scsOptions.linkedArchives + "\n";
		cData += sbp2CaptureSaverInDepth.scsOptions.linkedCustom + "\n";
		cData += sbp2CaptureSaverInDepth.scsOptions.depthMax + "\n";
		cData += sbp2CaptureSaverInDepth.scsOptions.timeout + "\n";
		cFile = this.scsOptions.directoryDst.clone();
		cFile.append("sbp2-capset.txt");
		sbp2Common.fileWrite(cFile, cData, "UTF-8");
		//6. modusabhängige End-Aktion durchführen
//alert("sbp2CaptureSaverInDepth.scsOptions.mode - "+this.scsOptions.mode);
		if ( this.scsOptions.mode == 1 || this.scsOptions.mode == 3 ) {
//nichts
		} else {
alert("sbp2CaptureSaverInDepth.captureComplete - Unbekannter Modus -> "+this.scsOptions.mode);
		}
	},

	captureCompleteCheck : function()
	{
		//Hier wird geprüft, ob alle zu speichernden Dateien schon auf der Platte liegen. (HTML und asynchrone Downloads)
		//
		//Ablauf:
		//1. Anzahl abgeschlossener Downloads um 1 erhöhen
		//2. Diese Prüfung muss hier nicht sein, da Vorgang mit "Beenden"-Knopf abgeschlossen wird

		//1. Anzahl abgeschlossener Downloads um 1 erhöhen
		this.scsDLProgress[0]++;
		//2. Diese Prüfung muss hier nicht sein, da Vorgang mit "Beenden"-Knopf abgeschlossen wird
//alert("captureCompleteCheck\n"+this.scsDLProgress[0]+" - "+this.scsDLProgress[1]);
		if ( this.scsDLProgress[0] == this.scsDLProgress[1] ) {
			if ( this.scsOptions.mode != 1 && this.scsOptions.mode != 3 ) {
alert("sbp2CaptureSaverInDepth.captureCompleteCheck - Unbekannter Modus -> "+this.scsOptions.mode);
			}
		}
	},

	captureInitInDepthNormal : function(cinArrayURL, cinArrayURLDepth, cinArrayURLFilename, cinArrayURLHTML, cinArrayURLLinks, cinArrayURLLinksSt, cinArrayURLSelected, cinArrayURLState, cinDLProgress, cinHashURL, cinHashFilename, cinOptions, cinResDestination, cinStyleSheetFilename, cinStyleSheetRules, cinItem)
	{
//wird von sbp2Capture.cInit aufgerufen
		//
		//Ablauf:
		//1. Funktion verlassen, falls schon eine Archivierung läuft
		//2. Variablen initialisieren

		//1. Funktion verlassen, falls schon eine Archivierung läuft
		if ( this.scsCaptureRunning == 1 ) return null;
		//2. Variablen initialisieren
		this.scsArrayURL = cinArrayURL;
		this.scsArrayURLDepth = cinArrayURLDepth;
		this.scsArrayURLFilename = cinArrayURLFilename;
		this.scsArrayURLFiletype = cinArrayURLHTML;
		this.scsArrayURLLinks = cinArrayURLLinks;
		this.scsArrayURLLinksSt = cinArrayURLLinksSt;
		this.scsArrayURLSelected = cinArrayURLSelected;
		this.scsArrayURLState = cinArrayURLState;

		this.scsCaptureRunning = 1;

		this.scsDLProgress[0] = cinDLProgress[0];
		this.scsDLProgress[1] = cinDLProgress[1];

		this.scsHashURL = cinHashURL;
		this.scsHashFilename = cinHashFilename;
		this.scsOptions.depthMax = cinOptions.depthMax;
		this.scsOptions.mode = cinOptions.mode;

		this.scsOptions.timeout = cinOptions.timeout;
		this.scsOptions.embeddedImages = cinOptions.embeddedImages;
		this.scsOptions.embeddedScript = cinOptions.embeddedScript;
		this.scsOptions.embeddedStyles = cinOptions.embeddedStyles;
		this.scsOptions.linkedArchives = cinOptions.linkedArchives;
		this.scsOptions.linkedAudio = cinOptions.linkedAudio;
		this.scsOptions.linkedCustom = cinOptions.linkedCustom;
		this.scsOptions.linkedImages = cinOptions.linkedImages;
		this.scsOptions.linkedMovies = cinOptions.linkedMovies;
		this.scsOptions.directoryDst = cinOptions.directoryDst;
		this.scsOptions.fxVer18 = cinOptions.fxVer18;
		this.scsOptions.fxVer36 = cinOptions.fxVer36;

		this.scsResDestination.position = cinResDestination.position;
		this.scsResDestination.resCont = cinResDestination.resCont;

		this.scsStyleSheetFilename = cinStyleSheetFilename;
		this.scsStyleSheetRules = cinStyleSheetRules;

		this.scsItem = cinItem;
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
		if ( this.scsHashURL[sdiURLR] ) {
			sdiPosR = this.scsHashURL[sdiURLR];
			sdiFileString = this.scsArrayURLFilename[sdiPosR];
		} else {
			sdiPosR = this.scsArrayURL.length;
			if ( sdiFilename.length > 0 ) {
				sdiFileString = sdiFilename;
			} else {
				sdiFileString = this.getFilenameFromURL(sdiURLR, null);
			}
			this.scsArrayURL.push(sdiURLR);
			this.scsArrayURLDepth.push(sdiDepthCur);
			this.scsArrayURLFilename.push(sdiFileString);
			this.scsArrayURLFiletype.push(1);
			this.scsArrayURLLinks.push("");
			this.scsArrayURLLinksSt.push("");
			this.scsArrayURLSelected.push(1);
			this.scsArrayURLState.push(0);
			this.scsHashURL[sdiURLR] = sdiPosR;
			this.scsHashFilename[sdiFileString] = sdiPosR;
		}
		if ( sdiURLT == sdiURLR ) {
			sdiPosT = sdiPosR;
		} else {
			if ( this.scsHashURL[sdiURLT] ) {
				sdiPosT = this.scsHashURL[sdiURLT];
				this.scsArrayURLFilename[sdiPosT] = sdiFileString;
			} else {
				sdiPosT = this.scsArrayURL.length;
				this.scsArrayURL.push(sdiURLT);
				this.scsArrayURLDepth.push(sdiDepthCur);
				this.scsArrayURLFilename.push(sdiFileString);
				this.scsArrayURLFiletype.push(1);
				this.scsArrayURLLinks.push("");
				this.scsArrayURLLinksSt.push("");
				this.scsArrayURLSelected.push(1);
				this.scsArrayURLState.push(0);
				this.scsHashURL[sdiURLT] = sdiPosT;
			}
		}
//alert("sdiURLT - "+sdiURLT+"\nsdiURLR - "+sdiURLR+"\nsdiPosT - "+sdiPosT+"\nsdiPosR - "+sdiPosR+"\nsdiFilename - "+sdiFilename+"\nsdiFileString - "+sdiFileString+"\n"+this.scsHashURL[sdiURLR]);
		//3. Weiteren Download vermerken
		this.scsDLProgress[1]++;
		//4. Seite archivieren, falls sie noch nicht archiviert wurde
		if ( this.scsArrayURLState[sdiPosR] == 0 ) {
			//4.1 Variablen initialisieren
			var sdiHTML = "";
			var sdiNodeList = [];
			var sdiURLNr = null;
			if ( sdiDocument.baseURI == null ) alert("baseURI ist null");
			if ( sdiDocument.baseURI == undefined ) alert("baseURI ist undefined");
			if ( sdiDocument.baseURI.length == 0 ) alert("baseURI enthält keine Stellen");
			this.scsArrayFrameBase[sdiDocumentNr] = this.convertURLToObject(sdiDocument.baseURI);
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
			var sdiFileDst = this.scsOptions.directoryDst.clone();
			sdiFileDst.append(sdiFileString);
			sbp2Common.fileWrite(sdiFileDst, sdiHTML, sdiDocument.characterSet);
			//4.6 (Redirect-)Seite erfolgreich gespeichert -> Status ändern
			this.scsArrayURLState[sdiPosR] = 1;
		}
		//5. Seite erfolgreich gespeichert -> Status ändern
		if ( sdiPosR != sdiPosT ) this.scsArrayURLState[sdiPosT] = 2;
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
					if ( this.scsOptions.embeddedStyles ) {
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
						case "jpg" : case "jpeg" : case "png" : case "gif" : case "tiff" : inDownloadNow = this.scsOptions.linkedImages;   inFiletype = 2; break;
						case "mp3" : case "wav"  : case "ram" : case "rm"  : case "wma"  : inDownloadNow = this.scsOptions.linkedAudio;    inFiletype = 3; break;
						case "mpg" : case "mpeg" : case "avi" : case "mov" : case "wmv"  : inDownloadNow = this.scsOptions.linkedMovies;   inFiletype = 4; break;
						case "zip" : case "lzh"  : case "rar" : case "jar" : case "xpi"  : inDownloadNow = this.scsOptions.linkedArchives; inFiletype = 5; break;
					}
					var inHref = inHref + inPHP;
					if ( inDownloadNow == null ) {
						//Link verarbeiten
						var inFilename = null;
						var inURLNr2 = -1;
						if ( this.scsHashURL[inHref] == undefined ) {
							//da verlinkte Seite unbekannt ist, Angaben dazu speichern
							inURLNr2 = this.scsArrayURL.length;
							inFilename = this.getFilenameFromURL(inHref, null);
							this.scsArrayURL.push(inHref);
							this.scsArrayURLDepth.push(inDepthCur+1);
							this.scsArrayURLFilename.push(inFilename);
							this.scsArrayURLFiletype.push(0);
							this.scsArrayURLLinks.push("");
							this.scsArrayURLLinksSt.push("");
							this.scsArrayURLSelected.push(1);
							this.scsArrayURLState.push(0);
							this.scsHashURL[inHref] = inURLNr2;
							this.scsHashFilename[inFilename] = inURLNr2;
							//DLProgress[1] hier nicht erhöhen, da sonst sbp2Capture.xul nicht aufgerufen wird
							//Verweise für weitere Verarbeitung zwischenspeichern, falls inDepthCapture aktiv ist
							if ( inDepthCur < this.scsOptions.depthMax ) {
								//Link selbst speichern
								var inState = sbp2Capture.itemAdd(inHref, inHref, "InDepth", inDepthCur+1);
								//vermerken, dass verlinkte Seite nicht heruntergeladen wird
								if ( inState == false ) {
									this.scsArrayURLSelected[inURLNr2] = 0;
									//komplette URL eintragen
									inCurNode.setAttribute("href", inCurNode.href);
								} else {
									//URL durch Dateinamen ersetzen
									inCurNode.setAttribute("href", this.scsArrayURLFilename[inURLNr2]+inAnker);
								}
							} else {
								//vermerken, dass verlinkte Seite nicht heruntergeladen wird
								this.scsArrayURLSelected[inURLNr2] = 0;
								//komplette URL eintragen
								inCurNode.setAttribute("href", inCurNode.href);
							}
						} else {
							//da verlinkte Seite schon bekannt ist, nichts tun
							inURLNr2 = this.scsHashURL[inHref];
							//URL auf verlinkte Seite passend ersetzen
							if ( this.scsArrayURLSelected[inURLNr2] == 1 ) {
								//URL durch Dateinamen ersetzen
								inCurNode.setAttribute("href", this.scsArrayURLFilename[inURLNr2]+inAnker);
							} else {
								//komplette URL eintragen
								inCurNode.setAttribute("href", inCurNode.href);
							}
						}
						//Verweis für Mutterseite vermerken
						this.scsArrayURLLinks[inURLNr] += inURLNr2 + ",";
						this.scsArrayURLLinksSt[inURLNr] += this.scsArrayURLSelected[inURLNr2] + ",";
						//vermerken, dass Mutterseite Verweise enthält und es sich daher um eine HTML-Seite handeln muss
						this.scsArrayURLFiletype[inURLNr] = 1;
					} else if ( inDownloadNow == true ) {
						//Datei herunterladen
						var inFileDst = this.downSaveFile(inCurNode.href, inDepthCur, inFiletype);
						//Nummer für verlinkte Seite bestimmen
						inURLNr2 = this.scsHashURL[inHref];
						//Verweis für Mutterseite vermerken
						this.scsArrayURLLinks[inURLNr] += inURLNr2 + ",";
						this.scsArrayURLLinksSt[inURLNr] += this.scsArrayURLSelected[inURLNr2] + ",";
						//vermerken, dass Mutterseite Verweise enthält und es sich daher um eine HTML-Seite handeln muss
						this.scsArrayURLFiletype[inURLNr] = 1;
						//lokalen Dateinamen eintragen
						inCurNode.setAttribute("href", inFileDst+inAnker);
					} else {
						if ( this.scsHashURL[inHref] == undefined ) {
							//verlinkte Seite unbekannt
							inURLNr2 = this.scsArrayURL.length;
							inFilename = this.getFilenameFromURL(inHref, null);
							this.scsArrayURL.push(inHref);
							this.scsArrayURLDepth.push(inDepthCur+1);
							this.scsArrayURLFilename.push(inFilename);
							this.scsArrayURLFiletype.push(inFiletype);
							this.scsArrayURLLinks.push("");
							this.scsArrayURLLinksSt.push("");
							this.scsArrayURLSelected.push(1);
							this.scsArrayURLState.push(0);
							this.scsHashURL[inHref] = inURLNr2;
							this.scsHashFilename[inFilename] = inURLNr2;
						} else {
							//verlinkte Seite bekannt
							inURLNr2 = this.scsHashURL[inHref];
						}
						//Verweis für Mutterseite vermerken
						this.scsArrayURLLinks[inURLNr] += inURLNr2 + ",";
						this.scsArrayURLLinksSt[inURLNr] += this.scsArrayURLSelected[inURLNr2] + ",";
						//vermerken, dass Mutterseite Verweise enthält und es sich daher um eine HTML-Seite handeln muss
						this.scsArrayURLFiletype[inURLNr] = 1;
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
					alert("sbp2CaptureSaverInDepth.inspectNode\n---\n\nURL is incomplete -- "+inCurNode.action+". Contact the developer.");
				}
*/
				try {
					var inURLBase = this.scsArrayFrameBase[this.scsArrayFrameNr].spec;
					var inURLObj = this.scsArrayFrameBase[this.scsArrayFrameNr];
					var inURLRel = inCurNode.action;
					//" entfernen aus inURLRel
					inURLRel = inURLRel.replace(/\"/g, "");
					inCurNode.setAttribute("action", inURLObj.resolve(inURLRel));
				} catch(ex) {
					dump("sbp2CaptureSaverInDepth.inspectNode\n---\nFailed to resolve URL: " + inURLBase + "\t" + inURLRel + "\n");
				}
				break;
			case "FRAME":
			case "IFRAME":
				this.scsArrayFrameNr++;
//				inCurNode.src = this.scsArrayFrame[this.scsArrayFrameNr].location.href;
//				var inFileString = "";
//				if ( this.scsHashURL[inCurNode.src] ) {
//					inFileString = this.scsArrayURLFilename[this.scsHashURL[inCurNode.src]];
//				} else {
//					inFileString = this.getFilenameFromURL(inCurNode.src, null);
//				}
//alert(inCurNode.src+" - "+inFileString);
//if ( inCurNode.src != this.scsArrayFrame[this.scsArrayFrameNr].location.href ) {
//	alert(inCurNode.src+" != "+this.scsArrayFrame[this.scsArrayFrameNr].location.href);
//}
				var inFileString = this.saveDocumentInternal(this.scsArrayFrame[this.scsArrayFrameNr].document, inCurNode.src, this.scsArrayFrameNr, "", inDepthCur);
				inCurNode.src = inFileString;
				this.scsDLProgress[0]++;
				break;
			case "IMG":
				//Bild herunterladen oder ganz entfernen
				if ( this.scsOptions.embeddedImages ) {
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
					if ( this.scsOptions.embeddedStyles ) {
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
						if ( this.scsOptions.mode < 2 ) this.scsItem.icon = inFileDst;
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
				if ( this.scsOptions.embeddedScript ) {
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
				if ( this.scsOptions.embeddedStyles ) {
					inCurNode = this.inspectStyleSheet(inCurNode, inDepthCur, this.scsArrayFrameBase[this.scsArrayFrameNr].spec, 1);
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
		if ( this.scsOptions.embeddedStyles ) {
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
		var isrURLBase = this.scsArrayFrameBase[this.scsArrayFrameNr].spec;
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
		var issStyleSheetANr = -1;					//Zugriff auf this.scsStyleSheet*
		//2. StyleSheet-Nummer suchen
		if ( issMode == 1 ) {
			//passende Listen-Nummer suchen
			var issI=0;
			issStyleSheetNr = -1;
			while ( issI < this.scsArrayFrameStyles[this.scsArrayFrameNr] )
			{
				issStyleSheetNr++;
				if ( issDocument.styleSheets[issStyleSheetNr].href == null ) {
					issI++;
				}
			}
			//Dateiname bestimmen
			this.scsStyleSheetFilename.push(-1);
			issStyleSheetANr = this.scsStyleSheetFilename.length-1;
			//Platzhalter für Regeln des aktuellen StyleSheet in this.scsStyleSheetRules erstellen
			var issRules = [];
			for ( var issI=0; issI<issDocument.styleSheets[issStyleSheetNr].cssRules.length; issI++ )
			{
				issRules[issI] = "";
			}
			this.scsStyleSheetRules.push(issRules);
			//vermerken, dass ein Style-Block in der aktuellen HTML-Seite bearbeitet worden ist
			this.scsArrayFrameStyles[this.scsArrayFrameNr]++;
			//Objekt mit den Regeln festlegen
			issCSS = issDocument.styleSheets[issStyleSheetNr];
		} else if ( issMode == 3 ) {
			//Objekt mit den Regeln festlegen
			issCSS = issNode.styleSheet;
			//Dateiname bestimmen, falls das StyleSheet zuvor noch nicht bearbeitet worden ist.
			if ( this.scsHashURL[issCSS.href] ) {
				var issURLNr = this.scsHashURL[issCSS.href];
				this.scsStyleSheetFilename.push(issURLNr);
				issStyleSheetANr = this.scsStyleSheetFilename.length-1;
				//Platzhalter für Regeln des aktuellen StyleSheet in this.scsStyleSheetRules erstellen
				var issRules = [];
				for ( var issI=0; issI<issCSS.cssRules.length; issI++ )
				{
					issRules[issI] = "";
				}
				this.scsStyleSheetRules.push(issRules);
//alert("issStyleSheetNr - "+issStyleSheetNr+"\nissCSS.href - "+issCSS.href+"\n"+this.scsHashURL[issCSS.href]+"\nthis.scsStyleSheetFilename.length - "+this.scsStyleSheetFilename.length);
				if ( issStyleSheetANr == -1 ) {
					this.scsStyleSheetFilename.push(issURLNr);
					issStyleSheetANr = this.scsStyleSheetFilename.length-1;
					//Platzhalter für Regeln des aktuellen StyleSheet in this.scsStyleSheetRules erstellen
					var issRules = [];
					for ( var issI=0; issI<issCSS.cssRules.length; issI++ )
					{
						issRules[issI] = "";
					}
					this.scsStyleSheetRules.push(issRules);
				}
			} else {
				//Neue CSS-Datei gefunden
				//lokalen Dateinamen bestimmen
				var issFilename = this.getFilenameFromURL(issCSS.href, null);
				var issURLNr = this.scsArrayURL.length;
				this.scsArrayURL.push(issCSS.href);
				this.scsArrayURLDepth.push(issDepthCur);
				this.scsArrayURLFilename.push(issFilename);
				this.scsArrayURLFiletype.push(0);
				this.scsArrayURLLinks.push("");
				this.scsArrayURLLinksSt.push("");
				this.scsArrayURLSelected.push(1);
				this.scsArrayURLState.push(0);
				this.scsHashURL[issCSS.href] = issURLNr;
				this.scsHashFilename[issFilename] = issURLNr;
				this.scsStyleSheetFilename.push(issURLNr);
				issStyleSheetANr = this.scsStyleSheetFilename.length-1;
				//Platzhalter für Regeln des aktuellen StyleSheet in this.scsStyleSheetRules erstellen
				var issRules = [];
				for ( var issI=0; issI<issCSS.cssRules.length; issI++ )
				{
					issRules[issI] = "";
				}
				this.scsStyleSheetRules.push(issRules);
			}
		} else {
			//passende Listen-Nummer suchen
			while ( issDocument.styleSheets[issStyleSheetNr].href != issNode.href )
			{
				issStyleSheetNr++;
			}
			//Dateiname bestimmen, falls das StyleSheet zuvor noch nicht bearbeitet worden ist.
			if ( this.scsHashURL[issNode.href] ) {
				var issURLNr = this.scsHashURL[issNode.href];
				this.scsStyleSheetFilename.push(issURLNr);
				issStyleSheetANr = this.scsStyleSheetFilename.length-1;
				//Platzhalter für Regeln des aktuellen StyleSheet in this.scsStyleSheetRules erstellen
				var issRules = [];
				for ( var issI=0; issI<issDocument.styleSheets[issStyleSheetNr].cssRules.length; issI++ )
				{
					issRules[issI] = "";
				}
				this.scsStyleSheetRules.push(issRules);
//alert("issStyleSheetNr - "+issStyleSheetNr+"\nissNode.href - "+issNode.href+"\n"+this.scsHashURL[issNode.href]+"\nthis.scsStyleSheetFilename.length - "+this.scsStyleSheetFilename.length);
				if ( issStyleSheetANr == -1 ) {
					this.scsStyleSheetFilename.push(issURLNr);
					issStyleSheetANr = this.scsStyleSheetFilename.length-1;
					//Platzhalter für Regeln des aktuellen StyleSheet in this.scsStyleSheetRules erstellen
					var issRules = [];
					for ( var issI=0; issI<issDocument.styleSheets[issStyleSheetNr].cssRules.length; issI++ )
					{
						issRules[issI] = "";
					}
					this.scsStyleSheetRules.push(issRules);
				}
			} else {
				//Neue CSS-Datei gefunden
				//lokalen Dateinamen bestimmen
				var issFilename = this.getFilenameFromURL(issNode.href, null);
				var issURLNr = this.scsArrayURL.length;
				this.scsArrayURL.push(issNode.href);
				this.scsArrayURLDepth.push(issDepthCur);
				this.scsArrayURLFilename.push(issFilename);
				this.scsArrayURLFiletype.push(0);
				this.scsArrayURLLinks.push("");
				this.scsArrayURLLinksSt.push("");
				this.scsArrayURLSelected.push(1);
				this.scsArrayURLState.push(0);
				this.scsHashURL[issNode.href] = issURLNr;
				this.scsHashFilename[issFilename] = issURLNr;
				this.scsStyleSheetFilename.push(issURLNr);
				issStyleSheetANr = this.scsStyleSheetFilename.length-1;
				//Platzhalter für Regeln des aktuellen StyleSheet in this.scsStyleSheetRules erstellen
				var issRules = [];
				for ( var issI=0; issI<issDocument.styleSheets[issStyleSheetNr].cssRules.length; issI++ )
				{
					issRules[issI] = "";
				}
				this.scsStyleSheetRules.push(issRules);
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
			if ( this.scsStyleSheetRules[issStyleSheetANr][issI] == "" ) {
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
					this.scsStyleSheetRules[issStyleSheetANr][issI] = issCSS.cssRules[issI].cssText.replace(/(url\([ '"]+)(.*?)([ '"]+\))/g, '$1'+issFilename+'$3');
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
								this.scsStyleSheetRules[issStyleSheetANr][issI] = issCSS.cssRules[issI].selectorText + " { " +
																				  issCSS.cssRules[issI].style.cssText + " }";
							}
						} catch (issException)
						{
							this.scsStyleSheetRules[issStyleSheetANr][issI] = issCSS.cssRules[issI].cssText;
						}
					} else {
						this.scsStyleSheetRules[issStyleSheetANr][issI] = issCSS.cssRules[issI].cssText;
					}
					//3.3.1 Regel nach verlinkter Datei durchsuchen und diese herunterladen
					var issLinks = this.scsStyleSheetRules[issStyleSheetANr][issI].match(/url\(.*?\)/gi);
//dump(this.scsStyleSheetRules[issStyleSheetANr][issI]+"\n---\n");
//dump(issLinks+"\n");
					if ( issLinks ) {
//					var issURLPath = issNode.href;
//					var issURLPath = this.scsArrayFrameBase[this.scsArrayFrameNr];
//dump("issNode.href - "+issNode.href+"\nthis.scsArrayFrameBase[this.scsArrayFrameNr] - "+this.scsArrayFrameBase[this.scsArrayFrameNr]+"\n");
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
								this.scsStyleSheetRules[issStyleSheetANr][issI] = this.scsStyleSheetRules[issStyleSheetANr][issI].replace(issSearchterm,issSplit[1]+issFile+issSplit[2]);
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
			for ( var issI=0; issI<this.scsStyleSheetRules[issStyleSheetANr].length; issI++ )
			{
				if ( this.scsStyleSheetRules[issStyleSheetANr][issI].length>0 ) {
					cssData = cssData + "\n" + this.scsStyleSheetRules[issStyleSheetANr][issI];
				}
			}
			var issNodeNew = document.createElement("STYLE");
			issNodeNew.appendChild(document.createTextNode(cssData+"\n"));
			issNode.parentNode.replaceChild(issNodeNew, issNode);
			//neuen Node zurückgeben, damit der TreeWalker einen Fortsetzungspunkt hat (alte Node existiert nicht mehr)
			return issNodeNew;
		} else {
			//Dateiname zurückgeben
			return this.scsArrayURLFilename[this.scsStyleSheetFilename[issStyleSheetANr]];
		}
	},

	downSaveFile : function(dsfURLSpec, dsfDepthCur, dsfFiletype)
	{
//wird von this.capture und inspectNode aufgerufen
		//Läd das Dokument hinter dsfURLSpec herunter und speichert es unverändert nach this.scsOptions.directoryDst als dsfFileString.
		//
		//Ablauf:
		//1. Prüfen, ob Datei schon heruntergeladen wird
		//2. Weiteren Download vermerken
		//3. lokalen Dateinamen bestimmen
		//4. wichtige Informationen im globalen Speicherbereich merken
		//5. Datei herunterladen
		//6. Dateiname zurück an aufrufende Funktion

		//1. Prüfen, ob Datei schon heruntergeladen wird
		if ( this.scsHashURL[dsfURLSpec] ) {
			//Datei wurde schon heruntergeladen -> Dateiname zurückgeben
			return this.scsArrayURLFilename[this.scsHashURL[dsfURLSpec]];
		}
		//2. Weiteren Download vermerken
		this.scsDLProgress[1]++;
		//3. lokalen Dateinamen bestimmen
		var dsfFileString = this.getFilenameFromURL(dsfURLSpec, null);
		//4. wichtige Informationen im globalen Speicherbereich merken
		var dsfNr = this.scsArrayURL.length;
		this.scsArrayURL.push(dsfURLSpec);
		this.scsArrayURLDepth.push(dsfDepthCur);
		this.scsArrayURLFilename.push(dsfFileString);
		this.scsArrayURLFiletype.push(dsfFiletype);
		this.scsArrayURLLinks.push("");
		this.scsArrayURLLinksSt.push("");
		this.scsArrayURLSelected.push(1);
		this.scsArrayURLState.push(0);
		this.scsHashURL[dsfURLSpec] = dsfNr;
		this.scsHashFilename[dsfFileString] = dsfNr;
		//5. Datei herunterladen
		var dsfFile = this.scsOptions.directoryDst.clone();
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
					sbp2CaptureSaverInDepth.captureCompleteCheck();
				}
			}
		}
		if ( this.scsOptions.fxVer36 ) {
			var dsfPrivacy = PrivateBrowsingUtils.privacyContextFromWindow(this.scsWindowURLSource);
			dsfWBP.saveURI(dsfURIObj, null, this.scsArrayFrameBase[this.scsArrayFrameNr], Components.interfaces.nsIHttpChannel.REFERRER_POLICY_NO_REFERRER_WHEN_DOWNGRADE, null, "", dsfFile, dsfPrivacy);
		} else if ( this.scsOptions.fxVer18 ) {
			var dsfPrivacy = PrivateBrowsingUtils.privacyContextFromWindow(this.scsWindowURLSource);
			dsfWBP.saveURI(dsfURIObj, null, this.scsArrayFrameBase[this.scsArrayFrameNr], null, "", dsfFile, dsfPrivacy);
		} else {
			dsfWBP.saveURI(dsfURIObj, null, this.scsArrayFrameBase[this.scsArrayFrameNr], null, "", dsfFile);
		}
		//6. Seite erfolgreich gespeichert -> Status ändern
		this.scsArrayURLState[dsfNr] = 1;
		//6. Dateiname zurück an aufrufende Funktion
		return dsfFileString;
	},

	downSaveFileAdd : function(dsfURLSpec, dsfDepthCur, dsfFiletype)
	{
//wird von this.capture und inspectNode aufgerufen
		//Läd das Dokument hinter dsfURLSpec herunter und speichert es unverändert nach this.scsOptions.directoryDst als dsfFileString.
		//
		//Ablauf:
		//1. Prüfen, ob Datei schon heruntergeladen wird
		//2. Weiteren Download vermerken
		//3. lokalen Dateinamen bestimmen
		//4. wichtige Informationen im globalen Speicherbereich merken
		//5. Datei herunterladen
		//6. Dateiname zurück an aufrufende Funktion

		//1. Variablen initialisieren
		var dsfNr = this.scsHashURL[dsfURLSpec];
		//2. Datei nicht erneut herunterladen, falls schon vorhanden
		if ( this.scsArrayURLState[dsfNr] == 1 ) {
			sbp2CaptureSaverInDepth.captureCompleteCheck();
		}
		//2. Weiteren Download vermerken
		this.scsDLProgress[1]++;
		//3. lokalen Dateinamen bestimmen
		var dsfFileString = this.scsArrayURLFilename[dsfNr];
		//4. wichtige Informationen im globalen Speicherbereich merken
		//--
		//5. Datei herunterladen
		var dsfFile = this.scsOptions.directoryDst.clone();
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
					sbp2CaptureSaverInDepth.captureCompleteCheck();
				}
			}
		}
		if ( this.scsOptions.fxVer36 ) {
			var dsfPrivacy = PrivateBrowsingUtils.privacyContextFromWindow(this.scsWindowURLSource);
			dsfWBP.saveURI(dsfURIObj, null, null, Components.interfaces.nsIHttpChannel.REFERRER_POLICY_NO_REFERRER_WHEN_DOWNGRADE, null, "", dsfFile, dsfPrivacy);
		} else if ( this.scsOptions.fxVer18 ) {
			//Da die URL nicht von einem Window kommt, ist null in Ordnung für dsfPrivacy
			var dsfPrivacy = null;
			dsfWBP.saveURI(dsfURIObj, null, null, null, "", dsfFile, dsfPrivacy);
		} else {
			dsfWBP.saveURI(dsfURIObj, null, null, null, "", dsfFile);
		}
		//6. Seite erfolgreich gespeichert -> Status ändern
		this.scsArrayURLState[dsfNr] = 1;
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

	setState : function(ssURL, ssState)
	{
//wird von sbp2Capture.onFailure aufgerufen
		//Setzt den Status für die URL ssURL auf ssState
		var ssNr = this.scsHashURL[ssURL];
		this.scsArrayURLState[ssNr] = ssState;
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
		if ( this.scsHashFilename[gffuFilename] != undefined ) {
			if ( this.scsHashFilename[gffuFilename] > -1 ) {
				var gffuCounter = 0;
				var gffuExtension = this.fileGetExtension(gffuFilename);
				var gffuName = "";
				if ( gffuExtension.length > 0 ) {
					gffuName = gffuFilename.substring(0, gffuFilename.length-gffuExtension.length-1);
				} else {
					gffuName = gffuFilename;
				}
				while ( this.scsHashFilename[gffuFilename] != undefined )
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
		this.scsHashFilename[gffuFilename] = -1;
		//7. Dateinamen an aufrufende Funktion zurückliefern
		return gffuFilename;
	},

/*
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
		var u2fPosA = -2;
		var u2fPosB = -2;
		//2. Zeichenkette nach dem letzten / bestimmen
		u2fFileString = u2fFileString.substring(u2fFileString.lastIndexOf("/")+1, u2fFileString.length);
		//3. Zeichenkette vor dem ersten ? bestimmen
		u2fPosA = u2fFileString.search(/\?/);
		u2fPosB = u2fFileString.search(/#/);
		if ( u2fPosA > -1 && u2fPosA < u2fPosB ) {
			u2fFileString = u2fFileString.substring(0, u2fPosA);
		} else if ( u2fPosB > -1 && u2fPosB < u2fPosA ) {
			u2fFileString = u2fFileString.substring(0, u2fPosB);
		}
		//4. Nächster gültiger Dateiname suchen
		if ( this.scsHashFilename[u2fFileString] != undefined ) {
			if ( this.scsHashFilename[u2fFileString] > -1 ) {
				var u2fCounter = 0;
				var u2fExtension = this.fileGetExtension(u2fFileString);
				var u2fName = u2fFileString.substring(0, u2fFileString.length-u2fExtension.length-1);
				while ( this.scsHashFilename[u2fFileString] != undefined )
				{
					u2fCounter++;
					if ( u2fCounter<10) {
						u2fFileString = u2fName+"_00"+u2fCounter+"."+u2fExtension;
					} else if ( u2fCounter<100) {
						u2fFileString = u2fName+"_0"+u2fCounter+"."+u2fExtension;
					} else {
						u2fFileString = u2fName+"_"+u2fCounter+"."+u2fExtension;
					}
				}
			}
		}
		//5. Dateiname in Hash aufnehmen
		this.scsHashFilename[u2fFileString] = -1;
		//6. Dateinamen an aufrufende Funktion zurückliefern
		return u2fFileString;
	},
*/

}