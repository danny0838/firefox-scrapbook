
var sbp2CaptureAs = {

	caData : null,
	caDataFolders : null,

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
		//Läd die Datei lastFolder.txt des aktuell geöffneten scrapbook und schreibt den Inhalt in die menulist sbp2FolderList.
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
		//2. Dateiinhalt zusammenstellen
		flfuData = document.getElementById("sbp2FolderList").getItemAtIndex(flfuIndex).id;
		for ( var flfuI=2; flfuI<document.getElementById("sbp2FolderList").itemCount; flfuI++ )
		{
			if ( flfuI != flfuIndex ) flfuData += "\n" + document.getElementById("sbp2FolderList").getItemAtIndex(flfuI).id;
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
		window.arguments[1].embeddedImages = document.getElementById("sbp2DetailOptionImages").checked;
		window.arguments[1].embeddedStyles = document.getElementById("sbp2DetailOptionStyles").checked;
		window.arguments[1].embeddedScript = document.getElementById("sbp2DetailOptionScript").checked;
		window.arguments[1].linkedArchives = document.getElementById("sbp2DetailArchive").checked;
		window.arguments[1].linkedAudio = document.getElementById("sbp2DetailSound").checked;
		window.arguments[1].linkedCustom = document.getElementById("sbp2DetailCustom").checked;
		window.arguments[1].linkedImages = document.getElementById("sbp2DetailImage").checked;
		window.arguments[1].linkedMovies = document.getElementById("sbp2DetailMovie").checked;
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
		//5. Zielverzeichnisliste initialisieren
		//6. Zielverzeichnis ist erster Eintrag in sbp2FolderList

		//1. Variablen initialisieren
		var caiItem = document.createElement("menuitem");
		//2. Titel eintragen
		document.getElementById("sbp2DetailTitle").value = window.arguments[0].title;
		//3. Datenbank initialisieren (wird für Zielverzeichniswahl benötigt)
		sbp2DataSource.init();
		//4. lastFolder.txt einlesen (gibt null zurück, falls die Datei nicht existiert)
		var caiLines = this.folderListFileLoad();
		//5. Zielverzeichnisliste initialisieren
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
	},

}