
var sbp2Properties = {

	pItem : { id : null, type : null, title : null, chars : null, icon : null, source : null, comment : null },
	pModified : false,		//steht auf true, falls der Titel, die Adresse oder die Beschreibung angepasst wurden

	calculateSize : function(csID, csType)
	{
		//Bestimmen der Gesamtgröße aller Dateien im Verzeichnis
		//
		//Ablauf
		//1. Variablen initialisieren
		//2. Berechnung der Größe erfolgt nicht bei bookmark, folder oder separator
		//2b. Umrechnung der Dateigröße von Byte auf eine geeignete Einheit
		//3. Rückgabe des formatierten Ausgabestrings an aufrufende Funktion

		//1. Variablen initialisieren
		var csFilesize = 0;
		var csEinheitNr = 0;
		//2. Berechnung der Größe erfolgt nicht bei bookmark, folder oder separator
		if ( csType != "bookmark" && csType != "folder" && csType != "separator" ) {
			try
			{
				var csDirectory = sbp2Common.getBuchVZ();
				csDirectory.append("data");
				csDirectory.append(csID);
				var csDirectoryEnum = csDirectory.directoryEntries;
				while ( csDirectoryEnum.hasMoreElements() )
				{
					var csFile = csDirectoryEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
					csFilesize += csFile.fileSize;
				}
			} catch(ex)
			{
				alert("sbp2Properties.calculateSize\n---\n"+ex);
			}
			//2b. Umrechnung der Dateigröße von Byte auf eine geeignete Einheit
			if (csFilesize>(1024*1024) ) {
				csEinheitNr=2;
				csFilesize=csFilesize/(1024*1024);
			} else if ( csFilesize>1024 ) {
				csEinheitNr=1;
				csFilesize=csFilesize/1024;
			}
		}
		var csSize = this.formatNumber(csFilesize);
		//3. Rückgabe des formatierten Ausgabestrings an aufrufende Funktion
		var csEinheit = new Array("B","kBytes","MB");
		var csRValue = csSize.concat(" "+csEinheit[csEinheitNr]);
		return csRValue;
	},

	exit : function()
	{
		//Aktualisieren von Titel und/oder Beschreibung, falls der alte Text geändert wurde
		//
		//Ablauf:
		//1. Daten ändern, falls eine Textboxeingabe zuvor registriert wurde
		//2. Titel aktualisieren, falls erforderlich
		//3. Adresse aktualisieren, falls erforderlich
		//4. Beschreibung aktualisieren, falls erforderlich
		//5. Aktualisiere index.dat
		//6. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)

//überarbeitung:
//Ein Update von searchcacheupdate scheint nicht notwendig, da die änderbaren Daten bei der Volltextsuche nicht berücksichtigt werden

		//1. Daten ändern, falls eine Textboxeingabe zuvor registriert wurde
		var eGeandert = false;
		if ( this.pModified )
		{
			//2. Titel aktualisieren, falls erforderlich
			var eNeuerWert = document.getElementById("sbp2PropTitle").value;
			if ( eNeuerWert != this.pItem.title )
			{
				var eRes = sbp2Common.RDF.GetResource("urn:scrapbook:item"+this.pItem.id);
				sbp2DataSource.propertySet(sbp2DataSource.dbData, eRes, "title", eNeuerWert);
				eGeandert = true;
			}
			//3. Adresse aktualisieren, falls erforderlich
			if ( this.pItem.type != "folder" ) {
				eNeuerWert = document.getElementById("sbp2PropAddress").value;
				if ( eNeuerWert != this.pItem.source )
				{
					var eRes = sbp2Common.RDF.GetResource("urn:scrapbook:item"+this.pItem.id);
					sbp2DataSource.propertySet(sbp2DataSource.dbData, eRes, "source", eNeuerWert);
					eGeandert = true;
				}
			}
			//4. Beschreibung aktualisieren, falls erforderlich
			eNeuerWert = document.getElementById("sbp2PropDescription").value;
			eNeuerWert = sbp2Common.ersetzeSonderzeichen(eNeuerWert);
			if ( eNeuerWert != this.pItem.comment )
			{
				var eRes = sbp2Common.RDF.GetResource("urn:scrapbook:item"+this.pItem.id);
				sbp2DataSource.propertySet(sbp2DataSource.dbData, eRes, "comment", eNeuerWert);
				eGeandert = true;
			}
		}
		if ( eGeandert )
		{
			//5. Aktualisiere index.dat
			var eDatei = sbp2Common.getBuchVZ();
			eDatei.append("data");
			eDatei.append(this.pItem.id);
			eDatei.append("index.dat");
			sbp2Common.fileWriteIndexDat(eDatei.path, this.pItem);
			//6. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
			sbp2DataSource.dsFlush(sbp2DataSource.dbData);
//			sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCacheUpdate);
		}
	},

	formatDate : function(fdString)
	{
		//Erstellt aus einem String im Format YYYYMMDDHHMMSS einen neuen String im Format YYYY-MM-DD HH:MM:SS
		//und gibt diesen an die aufrufende Funktion zurück
		//
		//Ablauf
		//1. Formatieren von fdString
		//2. übergabe des formatierten Datums an aufrufende Funktion

		//1. Formatieren von fdString
		var fdValue = fdString.substr(0,4)+"-"+fdString.substr(4,2)+"-"+fdString.substr(6,2)+" "+fdString.substr(8,2)+":"+fdString.substr(10,2)+":"+fdString.substr(12,2)+" Uhr";
		//2. übergabe des formatierten Datums an aufrufende Funktion
		return fdValue;
	},

	formatNumber : function(fnFloat)
	{
		//Zahl auf zwei Nachkommastellen runden
		//
		//Ablauf:
		//1. Dezimalwert runden
		//2. gerundeten Dezimalwert in Zeichenkette umwandeln
		//3. übergabe der gerundeten Zahl an aufrufende Funktion

		//1. Dezimalwert runden
		fnFloat = Math.round(fnFloat*100)/100;
		//2. gerundeten Dezimalwert in Zeichenkette umwandeln
		var fnRValue = fnFloat.toString();
		//3. übergabe der gerundeten Zahl an aufrufende Funktion
		return fnRValue;
	},

	init : function()
	{
		//Läd alle vorhandenen Informationen zum selektierten Eintrag und aktualisiert das Fenster
		//
		//Ablauf
		//1. Daten sind ab und zu nicht erreichbar und müssen erneut geladen werden (Grund unklar)
		//2. Tree-Objekt übernehmen
		//3. Index des gewählten Eintrag bestimmen
		//4. Resource des gewählten Eintrag bestimmen
		//5. Informationen zum Eintrag anzeigen
		//6. Unnötige Elemente ausblenden

		//1. Daten sind ab und zu nicht erreichbar und müssen erneut geladen werden (Grund unklar)
		if ( !sbp2DataSource.dbData ) sbp2DataSource.init();
//		if ( !sbp2DataSource.dbDataCrosslinkUpdate ) sbp2DataSource.initCrosslinkUpdate();
//		if ( !sbp2DataSource.dbDataSearchCacheUpdate ) sbp2DataSource.initSearchCacheUpdate();
		//2. Tree-Objekt übernehmen
		var iTree = window.arguments[0];
		//3. Index des gewählten Eintrag bestimmen
		var iIndex = iTree.currentIndex;
		//4. Resource des gewählten Eintrag bestimmen
		var iRes = iTree.builderView.getResourceAtIndex(iIndex);
		//5. Informationen zum Eintrag anzeigen
		this.pItem.id		= sbp2DataSource.propertyGet(sbp2DataSource.dbData, iRes, "id");
		this.pItem.type		= sbp2DataSource.propertyGet(sbp2DataSource.dbData, iRes, "type");
		this.pItem.title	= sbp2DataSource.propertyGet(sbp2DataSource.dbData, iRes, "title");
		this.pItem.chars	= sbp2DataSource.propertyGet(sbp2DataSource.dbData, iRes, "chars")
		this.pItem.icon		= sbp2DataSource.propertyGet(sbp2DataSource.dbData, iRes, "icon");
		if ( this.pItem.icon=="" ) {
			if ( this.pItem.type=="note" ) {
				this.pItem.icon = "chrome://scrapbookplus2/skin/treenote.png";
			} else if ( this.pItem.type=="site") {
				this.pItem.icon = "chrome://scrapbookplus2/skin/treeitem.png";
			} else {
				document.getElementById("sbp2PropFavicon").setAttribute("style", "list-style-image: url('chrome://global/skin/icons/folder-item.png'); -moz-image-region: rect(0px, 16px,  16px,  0px)");
			}
		}
		this.pItem.source	= sbp2DataSource.propertyGet(sbp2DataSource.dbData, iRes, "source");
		this.pItem.comment	= sbp2DataSource.propertyGet(sbp2DataSource.dbData, iRes, "comment");
		this.pItem.comment = this.pItem.comment.replace(/ __BR__ /g, "\n");
		document.getElementById("sbp2PropTitle").value       = this.pItem.title;
		document.getElementById("sbp2PropAddress").value     = this.pItem.source;
		document.getElementById("sbp2PropID").value          = this.pItem.id;
		document.getElementById("sbp2PropDate").value        = this.formatDate(this.pItem.id);
		document.getElementById("sbp2PropType").value        = this.pItem.type;
		document.getElementById("sbp2PropCharset").value     = this.pItem.chars;
		var iGroesse = this.calculateSize(this.pItem.id, document.getElementById("sbp2PropType").value);
		document.getElementById("sbp2PropSize").value        = iGroesse;
		if ( this.pItem.icon != "" ) document.getElementById("sbp2PropFavicon").src       = this.pItem.icon;
		document.getElementById("sbp2PropDescription").value = this.pItem.comment;
		//6. Unnötige Elemente ausblenden
		if (
			 this.pItem.type == "folder" ||
			 this.pItem.type == "separator"
		   ) {
			var iElement = document.getElementById("sbp2PropRows");
			iElement.removeChild(iElement.childNodes[8]);
			iElement.removeChild(iElement.childNodes[7]);
			iElement.removeChild(iElement.childNodes[2]);
			iElement.removeChild(iElement.childNodes[1]);
			document.getElementById("sbp2PDesc").hidden = true;
			document.getElementById("sbp2PTags").hidden = true;
		}
	},

	tagsShow : function()
	{
		//Listet alle dem Eintrag zugeordneten Tags auf.
		var tsTree = document.getElementById("sbp2PropTagTree");
		tsTree.ref = "urn:scrapbook:item"+this.pItem.id;
		sbp2DataSource.initTag();
		tsTree.database.AddDataSource(sbp2DataSource.dbDataTag);
		tsTree.builder.rebuild();
	},

}