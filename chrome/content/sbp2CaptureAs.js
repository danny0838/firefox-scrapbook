
var sbp2CaptureAs = {

	caData : null,
	caDataFolders : null,
	caInDepthIndex : 0,

	folderChange : function()
	{
		//Blendet ein neues Fenster ein, in dem der Anwender das Zielverzeichnisses ändern kann.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. in-memory-datasource erstellen, falls dies bisher noch nicht geschehen ist
		//3. Fenster zur Auswahl des neuen Zielverzeichnis anzeigen
		//4. Ist fcParams.out != null, wurde das Zielverzeichnis geändert und die Name des Zielverzeichnisses muss angepasst werden.

		//1. Variablen initialisieren
		sbp2DataSource.init();
		this.caData = sbp2DataSource.dbData;
		//2. in-memory-datasource erstellen, falls dies bisher noch nicht geschehen ist
		if ( this.caDataFolders == null ) {
			//datasource initialisieren
			this.caDataFolders = Components.classes["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"].createInstance(Components.interfaces.nsIRDFDataSource);
			//root-Element erzeugen und einfügen
			var fcRes = sbp2Common.RDF.GetResource("urn:sbp2:root");
			sbp2Common.RDFCU.MakeSeq(this.caDataFolders, fcRes);
			var fcCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
			fcCont.Init(this.caDataFolders, fcRes);
			//root-Element aus sbp2DataSource.dbData einfügen
			var fcResNew = sbp2Common.RDF.GetResource("urn:scrapbook:root");
			this.caDataFolders.Assert(fcResNew, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#id"), sbp2Common.RDF.GetLiteral("R"), true);
			this.caDataFolders.Assert(fcResNew, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#title"), sbp2Common.RDF.GetLiteral(document.getElementById("sbp2CaptureAsString").getString("SBP2_ROOT")), true);
			sbp2Common.RDFCU.MakeSeq(this.caDataFolders, fcResNew);
			fcCont.AppendElement(fcResNew);
		}
		//3. Fenster zur Auswahl des neuen Zielverzeichnis anzeigen
		var fcParams = { data: this.caDataFolders, res: null, out: null};
		if ( document.getElementById("sbp2FolderList").selectedItem.id == "R" ) {
			fcParams.res = sbp2Common.RDF.GetResource("urn:scrapbook:root");
		} else {
			fcParams.res = sbp2Common.RDF.GetResource("urn:scrapbook:item"+document.getElementById("sbp2FolderList").selectedItem.id);
		}
		window.openDialog("chrome://scrapbookplus2/content/sbp2FolderPicker.xul", "", "modal,chrome,centerscreen,resizable=yes", fcParams);
		//4. Ist fcParams.out != null, wurde das Zielverzeichnis geändert und die Name des Zielverzeichnisses muss angepasst werden.
		if ( fcParams.out != null ) {
			if ( fcParams.out.Value == "urn:scrapbook:root" ) {
				document.getElementById("sbp2FolderList").selectedItem.id = "R";
				document.getElementById("sbp2FolderList").selectedItem.label = document.getElementById("sbp2CaptureAsString").getString("SBP2_ROOT");
			} else {
				var fcID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, fcParams.out, "id");
				var fcTitle = sbp2DataSource.propertyGet(sbp2DataSource.dbData, fcParams.out, "title");
				document.getElementById("sbp2FolderList").selectedItem.id = fcID;
				document.getElementById("sbp2FolderList").selectedItem.label = fcTitle;
			}
		}
	},

	folderListFileLoad : function()
	{
		//Läd die Datei lastFolder.txt des aktuell geöffneten scrapbook und gibt den Inhalt aufgeteilt nach Zeilen an die aufrufende Funktion zurück.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Inhalt der Datei einlesen, falls sie existiert
		//3. Dateiinhalt oder null zurück an aufrufende Funktion

		//1. Variablen initialisieren
		var flflData = null;
		var flflFile = sbp2Common.getBuchVZ();
		flflFile.append("lastFolder.txt");
		var flflLines = null;
		//2. Inhalt der Datei einlesen, falls sie existiert
		if ( flflFile.exists() ) {
			flflData = sbp2Common.fileRead(flflFile);
			flflLines = flflData.split("\n");
		}
		//3. Dateiinhalt oder null zurück an aufrufende Funktion
		return flflLines;
	},

	folderListFileUpdate : function()
	{
		//Aktualisiert die Datei lastFolder.txt für das aktuell geöffnete scrapbook.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Dateiinhalt zusammenstellen
		//3. Daten schreiben

		//1. Variablen initialisieren
		var flfuIndex = document.getElementById("sbp2FolderList").selectedIndex;
		var flfuData = "";
		var flfuEntryTop = document.getElementById("sbp2FolderList").getItemAtIndex(flfuIndex).id;
		//2. Dateiinhalt zusammenstellen
		flfuData = flfuEntryTop;
		for ( var flfuI=2; flfuI<document.getElementById("sbp2FolderList").itemCount; flfuI++ )
		{
			if ( flfuI != flfuIndex ) {
				if ( document.getElementById("sbp2FolderList").getItemAtIndex(flfuI).id != flfuEntryTop ) {
					flfuData += "\n" + document.getElementById("sbp2FolderList").getItemAtIndex(flfuI).id;
				}
			}
		}
		//3. Daten schreiben
		var flfuFile = sbp2Common.getBuchVZ();
		flfuFile.append("lastFolder.txt");
		sbp2Common.fileWrite(flfuFile, flfuData, "UTF-8");
	},

	caAccept : function()
	{
		//Seite mit den angegebenen Werten und Einstellungen speichern.
		//Bis auf den Title werden alle Angaben für den nächsten Aufruf gespeichert.
		//
		//Ablauf:
		//1. Titel endgülitg festlegen
		//2. Zielverzeichnis endgültig festlegen
		//3. Optionen übernehmen
		//4. Datei mit den zuletzt genutzten Verzeichnissen aktualisieren

		//1. Titel endgülitg festlegen
		window.arguments[1].title = document.getElementById("sbp2DetailTitle").value;
		//2. Zielverzeichnis endgültig festlegen
		if ( document.getElementById("sbp2FolderList").selectedItem.id == "R" ) {
			window.arguments[1].resCont = sbp2Common.RDF.GetResource("urn:scrapbook:root");
		} else {
			window.arguments[1].resCont = sbp2Common.RDF.GetResource("urn:scrapbook:item"+document.getElementById("sbp2FolderList").selectedItem.id);
		}
		//3. Optionen übernehmen
		window.arguments[1].depthMax = parseInt(document.getElementById("sbp2DetailInDepthRadioGroup").selectedItem.label);
		window.arguments[1].embeddedImages = document.getElementById("sbp2DetailOptionImages").checked;
		window.arguments[1].embeddedStyles = document.getElementById("sbp2DetailOptionStyles").checked;
		window.arguments[1].embeddedScript = document.getElementById("sbp2DetailOptionScript").checked;
		window.arguments[1].linkedArchives = document.getElementById("sbp2DetailArchive").checked;
		window.arguments[1].linkedAudio = document.getElementById("sbp2DetailSound").checked;
		window.arguments[1].linkedCustom = document.getElementById("sbp2DetailCustom").checked;
		window.arguments[1].linkedImages = document.getElementById("sbp2DetailImage").checked;
		window.arguments[1].linkedMovies = document.getElementById("sbp2DetailMovie").checked;
		window.arguments[1].mode = window.arguments[1].depthMax == 0 ? 0 : 1;
		window.arguments[1].timeout = parseInt(document.getElementById("sbp2DetailTimeoutRadioGroup").selectedItem.label);
		//4. Datei mit den zuletzt genutzten Verzeichnissen aktualisieren
		this.folderListFileUpdate();
	},

	caInit : function()
	{
		//Aktualisiert die Bildschirmansicht.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Titel eintragen
		//3. Datenbank initialisieren (wird für Zielverzeichniswahl benötigt)
		//4. lastFolder.txt einlesen (gibt null zurück, falls die Datei nicht existiert)
		//5. Inhalt von lastFolder.txt inhaltlich prüfen (ungültige RDF-Einträge werden gelöscht)
		//6. Zielverzeichnisliste initialisieren
		//7. Zielverzeichnis ist erster Eintrag in sbp2FolderList
		//8. wurden während der Prüfung (5.) Fehler gefunden, wird lastFolder.txt erneuert.

		//1. Variablen initialisieren
		var caiCorrection = 0;
		var caiItem = document.createElement("menuitem");
		var caiLines = [];
		//2. Titel eintragen
		document.getElementById("sbp2DetailTitle").value = window.arguments[0].title;
		//3. Datenbank initialisieren (wird für Zielverzeichniswahl benötigt)
		sbp2DataSource.init();
		//4. lastFolder.txt einlesen (gibt null zurück, falls die Datei nicht existiert)
		var caiLinesUntested = this.folderListFileLoad();
		//5. Inhalt von lastFolder.txt inhaltlich prüfen (ungültige RDF-Einträge werden gelöscht)
		for ( var caiI=0; caiI<caiLinesUntested.length; caiI++ )
		{
			if ( caiLinesUntested[caiI].length > 1 ) {
				var caiRes = sbp2Common.RDF.GetResource("urn:scrapbook:item"+caiLinesUntested[caiI]);
				var caiTitle = sbp2DataSource.propertyGet(sbp2DataSource.dbData, caiRes, "title");
				if ( caiTitle.length > 0 ) {
					caiLines.push(caiLinesUntested[caiI]);
				} else {
					caiCorrection = 1;
				}
			} else {
				caiLines.push(caiLinesUntested[caiI]);
			}
		}
		//6. Zielverzeichnisliste initialisieren
		if ( caiLines == null ) {
			//Da bislang noch nichts gespeichert wurde, wird das Hauptverzeichnis als Zielverzeichnis eingetragen
			caiItem.setAttribute("id", "R");
			caiItem.setAttribute("label", document.getElementById("sbp2CaptureAsString").getString("SBP2_ROOT"));
			document.getElementById("sbp2FolderPopup").appendChild(caiItem);
		} else {
			//Ersten Eintrag in der Liste als Zielverzeichnis eintragen
			caiItem.setAttribute("id", caiLines[0]);
			if ( caiLines[0] == "R" ) {
				caiItem.setAttribute("label", document.getElementById("sbp2CaptureAsString").getString("SBP2_ROOT"));
			} else {
				var caiRes = sbp2Common.RDF.GetResource("urn:scrapbook:item"+caiLines[0]);
				var caiTitle = sbp2DataSource.propertyGet(sbp2DataSource.dbData, caiRes, "title");
				caiItem.setAttribute("label", caiTitle);
			}
			document.getElementById("sbp2FolderPopup").appendChild(caiItem);
			//alle Einträge der Liste eintragen
			document.getElementById("sbp2FolderPopup").appendChild(document.createElement("menuseparator"));
			for ( var caiI=0; caiI<caiLines.length; caiI++ )
			{
				caiItem = document.createElement("menuitem");
				caiItem.setAttribute("id", caiLines[caiI]);
				if ( caiLines[caiI] == "R" ) {
					caiItem.setAttribute("label", document.getElementById("sbp2CaptureAsString").getString("SBP2_ROOT"));
				} else {
					caiItem.setAttribute("id", caiLines[caiI]);
					var caiRes = sbp2Common.RDF.GetResource("urn:scrapbook:item"+caiLines[caiI]);
					var caiTitle = sbp2DataSource.propertyGet(sbp2DataSource.dbData, caiRes, "title");
					caiItem.setAttribute("label", caiTitle);
				}
				document.getElementById("sbp2FolderPopup").appendChild(caiItem);
			}
		}
		//7. Zielverzeichnis ist erster Eintrag in sbp2FolderList
		document.getElementById("sbp2FolderList").selectedIndex = 0;
		//8. wurden während der Prüfung (5.) Fehler gefunden, wird lastFolder.txt erneuert.
		if ( caiCorrection == 1 ) this.folderListFileUpdate();
	},

	idcSetDepth : function(idcsdEvent)
	{
		//Erlaubt das Setzen einer anderen Tiefe als 1-3 über ein Eingabefenster.
		//Die Eingabe wird direkt im letzten Feld der Radiogroup angezeigt.
		//
		//Ablauf:
		//1. Funktion verlassen, falls kein Radio-Button angeklickt wurde
		//2. Prüfung, welcher Radio-Button angeklickt wurde
		//2.1 RadioGroup zur Auswahl der Pause bis zum Start der nächsten Archivierung freischalten
		//2.2 Eingabefenster einblenden mit anschließender Prüfung der Eingabe auf Gültigkeit
		//2.2.1 Variablen initialisieren
		//2.2.2 Neuen Wert bei Benutzer erfragen
		//2.2.3 Überprüfen des Wertes auf Gültigkeit (es muss eine Zahl größer 3 sein). Ist dies nicht der Fall, wird der alte Wert wieder gewählt.
		//2.2.3.1 Anzeigen des Wertes 
		//
		//2.1 RadioGroup zur Auswahl der Pause bis zum Start der nächsten Archivierung deaktivieren
		//2.2 Index merken

		//1. Funktion verlassen, falls kein Radio-Button angeklickt wurde
		if  ( idcsdEvent.target.id.length > 0 ) return;
		//2. Prüfung, welcher Radio-Button angeklickt wurde
		if ( idcsdEvent.currentTarget.getItemAtIndex(0)!=idcsdEvent.target ) {
			//2.1 RadioGroup zur Auswahl der Pause bis zum Start der nächsten Archivierung freischalten
			document.getElementById("sbp2DetailTimeoutRadioGroup").disabled = false;
			//2.2 Eingabefenster einblenden mit anschließender Prüfung der Eingabe auf Gültigkeit
			if ( idcsdEvent.currentTarget.getItemAtIndex(4)==idcsdEvent.target ) {
				//2.2.1 Variablen initialisieren
				var idcsdDepthRadioLast = document.getElementById("sbp2DetailInDepthRadioGroup").getItemAtIndex(4);
				var idcsdParams = { mode: null, out: null};
				//2.2.2 Neuen Wert bei Benutzer erfragen
				window.openDialog('chrome://scrapbookplus2/content/sbp2InputDialog.xul', '', 'chrome,centerscreen,modal', idcsdParams);
				//2.2.3 Überprüfen des Wertes auf Gültigkeit (es muss eine Zahl größer 3 sein). Ist dies nicht der Fall, wird der alte Wert wieder gewählt.
				if ( idcsdParams.out == null ) {
					document.getElementById("sbp2DetailInDepthRadioGroup").selectedIndex = this.caInDepthIndex;
				} else {
					var idcsdNumberAccepted = false;
					if ( idcsdParams.out.length>0 ) {
						if ( !isNaN(idcsdParams.out) ) {
							var idcsdNumber = parseInt(idcsdParams.out);
							if ( idcsdNumber>3 ) {
								//2.2.3.1 Anzeigen des Wertes 
								idcsdDepthRadioLast.label = idcsdParams.out;
								idcsdNumberAccepted = true;
							}
						}
					}
					//Falls Eingabe nicht akzeptiert worden ist, Tiefe 3 wählen und einen Hinweis für den Anwender ausgeben
					if ( !idcsdNumberAccepted ) {
						alert(document.getElementById("sbp2CaptureAsString").getString("HINT"));
						document.getElementById("sbp2DetailInDepthRadioGroup").selectedIndex = this.caInDepthIndex;
					} else {
						//Index merken
						this.caInDepthIndex = 4;
					}
				}
			} else {
				//2.2.1 Index merken
				this.caInDepthIndex = document.getElementById("sbp2DetailInDepthRadioGroup").selectedIndex;
			}
		} else {
			//2.1 RadioGroup zur Auswahl der Pause bis zum Start der nächsten Archivierung deaktivieren
			document.getElementById("sbp2DetailTimeoutRadioGroup").disabled = true;
			//2.2 Index merken
			this.caInDepthIndex = 0;
		}
	},

}