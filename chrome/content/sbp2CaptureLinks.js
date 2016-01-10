
var sbp2CaptureLinks = {

	get FILTER()	{ return document.getElementById("sbp2FilterTextbox"); },
	get STATUS()	{ return document.getElementById("sbp2Status"); },
	get TEXTBOX()	{ return document.getElementById("sbp2URLList"); },

	clDataFolders : null,
	clURL : [],
	clURLAll : [],
	clURLAllHash : {},
	clURLFiletype : [],

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
			this.caDataFolders.Assert(fcResNew, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#title"), sbp2Common.RDF.GetLiteral(document.getElementById("sbp2CaptureLinksString").getString("SBP2_ROOT")), true);
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
				document.getElementById("sbp2FolderList").selectedItem.label = document.getElementById("sbp2CaptureLinksString").getString("SBP2_ROOT");
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
		//Seiten mit den angegebenen Werten und Einstellungen speichern.
		//Bis auf den Title werden alle Angaben für den nächsten Aufruf gespeichert.
		//
		//Ablauf:
		//1. Zielverzeichnis endgültig festlegen
		//2. Optionen übernehmen
		//3. Datei mit den zuletzt genutzten Verzeichnissen aktualisieren
		//4. Filetype der gewählten Adressen bestimmen

		//1. Zielverzeichnis endgültig festlegen
		if ( document.getElementById("sbp2FolderList").selectedItem.id == "R" ) {
			window.arguments[1].resCont = sbp2Common.RDF.GetResource("urn:scrapbook:root");
		} else {
			window.arguments[1].resCont = sbp2Common.RDF.GetResource("urn:scrapbook:item"+document.getElementById("sbp2FolderList").selectedItem.id);
		}
		//2. Optionen übernehmen
		window.arguments[1].embeddedImages = document.getElementById("sbp2DetailOptionImages").checked;
		window.arguments[1].embeddedStyles = document.getElementById("sbp2DetailOptionStyles").checked;
		window.arguments[1].embeddedScript = document.getElementById("sbp2DetailOptionScript").checked;
		window.arguments[1].linkedArchives = document.getElementById("sbp2DetailArchive").checked;
		window.arguments[1].linkedAudio = document.getElementById("sbp2DetailSound").checked;
		window.arguments[1].linkedCustom = document.getElementById("sbp2DetailCustom").checked;
		window.arguments[1].linkedImages = document.getElementById("sbp2DetailImage").checked;
		window.arguments[1].linkedMovies = document.getElementById("sbp2DetailMovie").checked;
		window.arguments[1].timeout = parseInt(document.getElementById("sbp2DetailTimeoutRadioGroup").selectedItem.label);
		window.arguments[1].links = this.clURL;
		//3. Datei mit den zuletzt genutzten Verzeichnissen aktualisieren
		this.folderListFileUpdate();
		//4. Filetype der gewählten Adressen bestimmen
		for ( var caI=0; caI<this.clURL.length; caI++ )
		{
			var caHref = this.clURL;
			var caPosAnker = caHref.indexOf("#");
			if ( caPosAnker > -1 ) caHref = caHref.substring(0, caPosAnker);
			var caPosPHP = caHref.indexOf("?");
			if ( caPosPHP > -1 ) caHref = caHref.substring(0, caPosPHP);
			var caFileExtension = "";
			var caPosPoint = caHref.lastIndexOf(".");
			if ( caPosPoint > -1 ) caFileExtension = caHref.substring(caPosPoint+1,caHref.length);
			var caFiletype = 1;
			switch ( caFileExtension )
			{
				case "jpg" : case "jpeg" : case "png" : case "gif" : case "tiff" : caFiletype = 2; break;
				case "mp3" : case "wav"  : case "ram" : case "rm"  : case "wma"  : caFiletype = 3; break;
				case "mpg" : case "mpeg" : case "avi" : case "mov" : case "wmv"  : caFiletype = 4; break;
				case "zip" : case "lzh"  : case "rar" : case "jar" : case "xpi"  : caFiletype = 5; break;
			}
			this.clURLFiletype.push(caFiletype);
		}
		window.arguments[1].types = this.clURLFiletype;
	},

	caInit : function()
	{
		//Aktualisiert die Bildschirmansicht.
		//
		//Ablauf:
		//1. Variablen initialisieren
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
			caiItem.setAttribute("label", document.getElementById("sbp2CaptureLinksString").getString("SBP2_ROOT"));
			document.getElementById("sbp2FolderPopup").appendChild(caiItem);
		} else {
			//Ersten Eintrag in der Liste als Zielverzeichnis eintragen
			caiItem.setAttribute("id", caiLines[0]);
			if ( caiLines[0] == "R" ) {
				caiItem.setAttribute("label", document.getElementById("sbp2CaptureLinksString").getString("SBP2_ROOT"));
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
					caiItem.setAttribute("label", document.getElementById("sbp2CaptureLinksString").getString("SBP2_ROOT"));
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

	urlsAdd : function(uaExclude)
	{
//wird von this.urlsDetectURLsInPage und this.urlsUpdateSelection aufgerufen
		//Fügt die Adressen im Hash uaURLHash in this.TEXTBOX.
		//Nach jeder Adresse erfolgt ein Zeilenumbruch
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Adressen in this.TEXTBOX einfügen (unter Berücksichtigung der Ausschlußkriterien)
		//3. gefundene Adressen in this.TEXTBOX stellen
		//4. Status aktualisieren

		//1. Variablen initialisieren
		var uaCount = this.clURLAll.length;
		if ( uaExclude == null ) uaExclude = document.getElementById("sbp2ExcludeExistingAddresses").checked;
		var uaFilter = this.FILTER.value;
		var uaSelected = 0;
		var uaURLsText = "";
		this.clURL = [];
		//2. Adressen in this.TEXTBOX einfügen (unter Berücksichtigung der Ausschlußkriterien)
		if ( uaCount > 0 ) {
			for ( var uaI=0; uaI<uaCount; uaI++ )
			{
				//auf Filter prüfen
				if ( this.clURLAll[uaI].match(uaFilter) ) {
					uaSelected++;
					this.clURL.push(this.clURLAll[uaI])
					uaURLsText += this.clURLAll[uaI] + "\n";
				}
			}
		}
		//3. gefundene Adressen in this.TEXTBOX stellen
		this.TEXTBOX.value = uaURLsText;
		//4. Status aktualisieren
		this.STATUS.value = uaSelected +"\/" + uaCount;
	},

	urlsClear : function()
	{
//wird von sbp2CaptureLinks.xul und urlsDetectURLsInPage aufgerufen
		//this.TEXTBOX, die die Adressen enthält, wird geleert.
		this.TEXTBOX.value = "";
	},

	urlsDetectURLsInPage : function()
	{
//wird nur von sbp2CaptureLinks.xul aufgerufen
		//Ermittelt die Adressen von verlinkten Seiten innerhalb des Tab und fügt diese in this.TEXTBOX;
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. this.TEXTBOX leeren
		//3. Adressen bestimmen
		//4. Alle Einträge des Hash in this.TEXTBOX aufnehmen

		//1. Variablen initialisieren
		var uduipEnd = 0;
		var uduipNode = window.opener.top.content.document.body;
		var uduipURL = "";
		this.clURLAll = [];
		this.clURLAllHash = {};
		//2. this.TEXTBOX leeren
		this.urlsClear();
		//3. Adressen bestimmen
		while ( true )
		{
			if ( uduipNode instanceof HTMLAnchorElement || uduipNode instanceof HTMLAreaElement ) {
				uduipURL = uduipNode.href;
				if ( uduipURL.match(/^(http|https|ftp|file):\/\//) )
				{
					if ( !this.clURLAllHash[uduipURL] ) {
						this.clURLAllHash[uduipURL] = "1";
						this.clURLAll.push(uduipURL);
					}
				}
			}
			if ( uduipNode.hasChildNodes() ) {
				uduipNode = uduipNode.firstChild;
			} else {
				while ( !uduipNode.nextSibling )
				{
					uduipNode = uduipNode.parentNode;
					if ( !uduipNode ) break;
				}
				if ( !uduipNode ) break;
				uduipNode = uduipNode.nextSibling;
			}
		}
		//4. Alle Einträge des Hash in this.TEXTBOX aufnehmen
		this.urlsAdd(0);
	},

	urlsUpdateSelection : function(uusEvent)
	{
//wird nur von sbp2CaptureLinks.xul aufgerufen
		//Aktualisiert den Inhalt von this.TEXTBOX
		this.urlsAdd(0);
	},

}