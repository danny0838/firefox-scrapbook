
var sbp2TreeHandle = {

	changeFolderState : function()
	{
		//Ist ein Container geöffnet, werden alle geschlossen. Andernfalls werden alle Container geöffnet.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Prüfen, ob mindestens ein Container geöffnet ist
		//3. alle Container öffnen/schließen

		//1. Variablen initialisieren
		var cfsIsFolderOpen = false;
		var cfsTree = document.getElementById("sbp2Tree");
		//2. Prüfen, ob mindestens ein Container geöffnet ist
		for ( var cfsI=0; cfsI<cfsTree.view.rowCount; cfsI++ )
		{
			if ( !cfsTree.view.isContainer(cfsI) ) continue;
			if ( cfsTree.view.isContainerOpen(cfsI) ) { cfsIsFolderOpen = true; break; }
		}
		//3. alle Container öffnen/schließen
		if ( cfsIsFolderOpen == false ) {
			for ( var cfsI=0; cfsI<cfsTree.view.rowCount; cfsI++ ) {
				if ( cfsTree.view.isContainer(cfsI) && cfsTree.view.isContainerOpen(cfsI) == false ) cfsTree.view.toggleOpenState(cfsI);
			}
		} else {
			for ( var cfsI=cfsTree.view.rowCount-1; cfsI>=0; cfsI-- ) {
				if ( cfsTree.view.isContainer(cfsI) && cfsTree.view.isContainerOpen(cfsI) == true ) cfsTree.view.toggleOpenState(cfsI);
			}
		}
	},

	onClick : function(ocTree, ocEvent)
	{
		//Läd die Seite im Browser
		//
		//Ablauf:
		//1. wurde weder die linke noch die mittlere Maustaste gedrückt, wird die Funktion verlassen
		//2. wird ein ungültiges Objekt angeklickt, wird die Funktion verlassen
		//3. Seite laden

		//1. wurde weder die linke noch die mittlere Maustaste gedrückt, wird die Funktion verlassen
		if ( ocEvent.button != 0 && ocEvent.button != 1 ) return;
		//2. wird ein ungültiges Objekt angeklickt, wird die Funktion verlassen
		var ocObject={};
		ocTree.treeBoxObject.getCellAt(ocEvent.clientX, ocEvent.clientY, {}, {}, ocObject);
		if ( ocObject.value == "" || ocObject.value == "twisty" ) return;
if ( ocObject.value != "cell" && ocObject.value != "image" && ocObject.value != "text" ) alert("ocObject.value - "+ocObject.value);
		//3. Seite laden
		this.itemShow(ocTree, ocEvent.ctrlKey || ocEvent.button == 1 || false );
	},

	onKeyPress : function(okpTree, okpEvent)
	{
		//Auswertung der Tastatureingabe (Enter, Entfernen und F2 werden berücksichtigt)
		switch ( okpEvent.keyCode )
		{
			case okpEvent.DOM_VK_RETURN:
			{
				this.itemShow(okpTree, okpEvent.ctrlKey);
				break;
			}
			case okpEvent.DOM_VK_DELETE:
			{
				this.itemDelete(okpTree.id, sbp2DataSource.dbData, sbp2DataSource.dbDataSearchCacheUpdate);
				break;
			}
			case okpEvent.DOM_VK_F2:
			{
				window.openDialog("chrome://scrapbookplus2/content/sbp2Properties.xul", "ScrapBook Plus 2", "chrome,centerscreen,modal", okpTree);
				break;
			}
			default: { break; }
		}
	},

	itemDelete : function(idTreeString, idData)
	{
		//Selektierte Eintraege werden vom Datentraeger und aus der RDF-Datenquelle entfernt
		//
		//Ablauf:
		//1. Sicherheitsabfrage
		//2. Initialisierung
		//3. selektierte Eintraege bestimmen
		//4. Löschvorgang Einträge in Hauptdatenbank
		//5. Löschvorgang Einträge in Stichwortdatenbank
		//6. Damit die Boxen zum Auf-/Zuklappen von Verzeichnissen dargestellt werden, ist ein rebuild des Tree notwendig
		//7. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		//8.

		//1. Sicherheitsabfrage
		if ( !window.confirm(document.getElementById("sbp2CommonString").getString("QUESTION_DELETE_M")) ) return 0;
		//2. Initialisierung
		var idResListe = [];
		var idResContListe = [];
		var idTree = document.getElementById(idTreeString);
		//3. selektierte Eintraege bestimmen
		var idNumRanges = idTree.view.selection.getRangeCount();
		var idStart = new Object();
		var idEnd = new Object();
		for (var idI=0; idI<idNumRanges; idI++)
		{
			idTree.view.selection.getRangeAt(idI,idStart,idEnd);
			for (var idJ=idStart.value; idJ<=idEnd.value; idJ++)
			{
				var idRes = idTree.builderView.getResourceAtIndex(idJ);
				//Sicherstellen, das gefundene Resource nicht in einem Container enthalten ist, der schon aufgenommen wurde
				var idGefunden = 0;
				for ( var idK=0; idK<idResContListe.length; idK++ )
				{
					if ( sbp2Common.RDFCU.indexOf(idData, idResContListe[idK], idRes) > -1 ) {
						idGefunden=1;
						idK=idResContListe.length;
					}
				}
				if ( idGefunden==1 ) continue;
				//Resource zum Loeschen vormerken
				idResListe.push(idRes);
				//bei einem Container müssen die enthaltenen Einträge berücksichtigt werden
				if ( sbp2Common.RDFCU.IsContainer(idData, idRes) ) {
					idResContListe.push(idRes);
					this.getContentFromRDFContainer(idData, idRes, idResListe, idResContListe);
				}
			}
		}
		//4. Löschvorgang Einträge in Hauptdatenbank
		for ( var idI=idResListe.length-1; idI>=0; idI-- )
		{
			var idType = sbp2DataSource.propertyGet(idData, idResListe[idI], "type");
			//4a. Dateien entfernen
			if ( idType == "site" || idType == "note" || idType == "combine" || idType == "" ) {
				//Verzeichnis initialisieren
				var idID = sbp2DataSource.propertyGet(idData, idResListe[idI], "id");
				var idDirectory = sbp2Common.getBuchVZ();
				idDirectory.append("data");
				idDirectory.append(idID);
				//Verzeichnis entfernen
				sbp2Common.directoryRemove(idDirectory);
			}
			//4b. Eintrag aus RDF-Datenquelle entfernen
			sbp2DataSource.itemDelete(idData, idResListe[idI]);
			if ( idType != "folder" && idType != "separator" && idType !="bookmark" ) {
				sbp2LinkRepl.slrItemAdd("urn:scrapbook:linkreplupdate", idID, "2");
				sbp2DataSource.itemAddSearchCacheUpdate("urn:scrapbook:searchcacheupdate", idID, "2");
			}
		}
		//5. Löschvorgang Einträge in Stichwortdatenbank
		sbp2Tags.itemRemoveFromEntriesManageIE(idResListe);
		//6. Damit die Boxen zum Auf-/Zuklappen von Verzeichnissen dargestellt werden, ist ein rebuild des Tree notwendig
		idTree.builder.rebuild();
		//7. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		sbp2DataSource.dsFlush(idData);
		sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCacheUpdate);
		sbp2DataSource.dsFlush(sbp2DataSource.dbDataTag);
		sbp2DataSource.dsFlush(sbp2LinkRepl.slrDatabase);
		//8. 
		return 1;
	},

	itemShow : function(isTree, isTabbed)
	{
		//Anzeigen des gewählten Eintrags im Browser.
//wird von sbp2TreeHandle.onClick, sbp2TreeHandle.onKeyPress und von sbp2Sidebar.xul aufgerufen
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Bei nicht ladbaren Elementen (folder, separator) Funktion verlassen
		//3. Sonderbehandlung für Volltextsuche
		//3.1 Anpassungen, falls ein bei einer Volltextsuche gefundener Eintrag angezeigt werden soll
		//4.2 Texthervorhebung initiieren, falls ein Eintrag nach einer erfolgreichen Volltextsuche angezeigt werden soll
		//4. Unterscheidung zwischen Notizen und sonstigen Einträgen

		//1. Variablen initialisieren
		var isFilename = "index.html";
		var isIndex = isTree.currentIndex;
		var isRes = isTree.builderView.getResourceAtIndex(isIndex);
		var isType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, isRes, "type");
		//2. Bei nicht ladbaren Elementen (folder, separator) Funktion verlassen
		if ( isType == "folder" ) return;
		if ( isType == "separator" ) return;
		//3. Sonderbehandlung für Volltextsuche
		if ( sbp2Search.ssIsFullTextSearch == 1 ) {
			//3.1 Anpassungen, falls ein bei einer Volltextsuche gefundener Eintrag angezeigt werden soll
			if ( isRes.Value.match(/#/) ) {
				var isSplit = isRes.Value.split(/#/);
				isRes = sbp2Common.RDF.GetResource(isSplit[0]);
				isFilename = isSplit[1];
			}
			//3.2 Texthervorhebung initiieren, falls ein Eintrag nach einer erfolgreichen Volltextsuche angezeigt werden soll
			var isAppcontent = window.top.document.getElementById("appcontent");
			isAppcontent.addEventListener("DOMContentLoaded", sbp2TreeHandle.highlightText, false);
		}
		//4. Unterscheidung zwischen Notizen und sonstigen Einträgen
//Problem derzeit: Probleme, falls mehrere Notizen auf einmal offen sind
		if ( sbp2DataSource.propertyGet(sbp2DataSource.dbData, isRes, "type") == "note" ) {
			sbp2NoteSidebar.nsID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, isRes, "id");
			if ( isTabbed ) {
				sbp2NoteSidebar.tab();
			} else {
				sbp2NoteSidebar.load();
				document.getElementById("sbp2SplitterNoteSB").hidden = false;
				document.getElementById("sbp2NoteSBVB").hidden = false;
			}
		} else {
			//URL bestimmen
			var isURL;
			if ( sbp2DataSource.propertyGet(sbp2DataSource.dbData, isRes, "type") == "bookmark" ) {
				isURL = sbp2DataSource.propertyGet(sbp2DataSource.dbData, isRes, "source");
			} else {
				var isDatei = sbp2Common.getBuchVZ();
				isDatei.append("data");
				isDatei.append(sbp2DataSource.propertyGet(sbp2DataSource.dbData, isRes, "id"));
				isDatei.append(isFilename);
				isURL = isDatei.path;
			}
			//Seite laden
			sbp2Common.loadURL(isURL, isTabbed);
		}
	},

	getContentFromRDFContainer : function(gcfrcData, gcfrcContRes, gcfrcListe, gcfrcContListe)
	{
//Wird derzeit nur von sbp2TreeHandle.itemDelete() aufgerufen.
		//Nimmt alle Eintraege des Containers - Eintraege und Container - in gcfrcListe auf.
		//Die Inhalte von gefundenen Containern werden durch rekursiven Aufruf dieser Funktion ebenfalls aufgenommen.
		//
		//Ablauf:
		//1. Container initialisieren
		//2. Einträge des Containers aufnehmen

		//1. Container initialisieren
		var gcfrcCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		gcfrcCont.Init(gcfrcData, gcfrcContRes);
		//2. Einträge des Containers aufnehmen
		var gcfrcContEnum = gcfrcCont.GetElements();
		while ( gcfrcContEnum.hasMoreElements() )
		{
			//Resource bestimmen
			var gcfrcRes  = gcfrcContEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			//Resource in Liste aufnehmen
			gcfrcListe.push(gcfrcRes);
			//Der Inhalt eines Containers muss sofort aufgenommen werden
			if ( sbp2Common.RDFCU.IsContainer(gcfrcData, gcfrcRes) )
			{
				gcfrcContListe.push(gcfrcRes);
				this.getContentFromRDFContainer(gcfrcData, gcfrcRes, gcfrcListe, gcfrcContListe);
			}
		}
	},

	highlightText : function(htEvent)
	{
//wird von sbp2TreeHandle.itemShow aufgerufen
		//Hebt im Tab alle Vorkommen des Suchbegriffs einer Volltextsuche hervor.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Benutzvorgabe für Groß-/Kleinschreibung berücksichtigen
		//3. Fundstellen hervorheben
		//4. Überwachung wieder entfernen


		//1. Variablen initialisieren
		var htWindow = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
		var htBrowser = htWindow.document.getElementById("content");
		var htDocument = htBrowser.contentWindow.document;
		var htBody = ( htDocument instanceof Components.interfaces.nsIDOMHTMLDocument && htDocument.body ) ? htDocument.body : htDocument.documentElement;
		var htSpanElement = htDocument.createElement("span");
		htSpanElement.setAttribute("style", "background: #FF0; color: #F000; display: inline !important; font-size: inherit !important;");
		var htSearchRange = htDocument.createRange();
		htSearchRange.selectNodeContents(htBody);
		var htStart = htSearchRange.cloneRange();
		htStart.collapse(true);
		var htEnd = htSearchRange.cloneRange();
		htEnd.collapse(false);
		var htCurrentRange = null;
		var htFinder = Components.classes["@mozilla.org/embedcomp/rangefind;1"].createInstance().QueryInterface(Components.interfaces.nsIFind);
		//2. Benutzvorgabe für Groß-/Kleinschreibung berücksichtigen
		htFinder.caseSensitive = sbp2Search.ssCaseSensitive;
		//3. Fundstellen hervorheben
		while ((htCurrentRange = htFinder.Find(sbp2Search.ssSearchString, htSearchRange, htStart, htEnd)))
		{
			var htSpanElementClone = htSpanElement.cloneNode(true);
			htCurrentRange.surroundContents(htSpanElementClone);
			htStart = htCurrentRange.cloneRange();
			htStart.collapse(false);
		}
		//4. Überwachung wieder entfernen
		var isAppcontent = window.top.document.getElementById("appcontent");
		isAppcontent.removeEventListener("DOMContentLoaded", sbp2TreeHandle.highlightText, false);
	},

	populatePopup : function(ppTreeString, ppEvent)
	{
		//Funktion blendet sinnlose Einträge aus
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Type der Resource bestimmen, falls erforderlich
		//3. Einträge ein-/ausblenden

		//1. Variablen initialisieren
		var ppObj = {};
		var ppRes;
		var ppRow = {};
		var ppTree = document.getElementById(ppTreeString);
		var ppType;
		ppTree.treeBoxObject.getCellAt(ppEvent.clientX, ppEvent.clientY, ppRow, {}, ppObj);
		var ppIndex = ppRow.value;
		//2. Type der Resource bestimmen, falls erforderlich
		if ( ppIndex > -1 ) {
			ppRes = ppTree.builderView.getResourceAtIndex(ppIndex);
			ppType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ppRes, "type");
		}
		//3. Einträge ein-/ausblenden
		var ppStatus = false;
		var ppIsBookmark = false;
		var ppIsNote = false;
		if ( ppType == "bookmark" ) {
			ppIsBookmark = true;
		} else if ( ppType == "note" ) {
			ppIsNote = true;
		}
		if ( ppType == "folder" || ppType == "separator" || ppIndex == -1 ) ppStatus = true;
		if ( ppTreeString == "sbp2Tree" ) {
			document.getElementById("sbp2Open").hidden = ppStatus;
			document.getElementById("sbp2OpenInTab").hidden = ppStatus;
			document.getElementById("sbp2OpenURL").hidden = ppStatus || ppIsBookmark || ppIsNote;
			document.getElementById("sbp2Separator1").hidden = ppStatus || ppIsBookmark;
		}
		document.getElementById("sbp2ShowFiles").hidden = ppStatus || ppIsBookmark;
		document.getElementById("sbp2Separator4").hidden = ppStatus || ppIsBookmark || ppIsNote;
		document.getElementById("sbp2LinksAdd").hidden = ppStatus || ppIsBookmark || ppIsNote;
		document.getElementById("sbp2Separator2").hidden = ppStatus;
		if ( ppIndex > -1 ) ppStatus = false;
		document.getElementById("sbp2Delete").hidden = ppStatus;
		document.getElementById("sbp2Separator3").hidden = ppStatus;
		document.getElementById("sbp2Props").hidden = ppStatus;
		document.getElementById("sbp2Separator5").hidden = ppStatus;
		//das Merken der Position wird benötigt, damit in sbp2Common.createItem der selektierte Eintrag bestimmt werden kann
		sbp2Common.cPosX = ppEvent.clientX;
		sbp2Common.cPosY = ppEvent.clientY;
	},

	populatePopupIEL : function(ppielEvent)
	{
		//Kontextmenü wird nur bei gültigen Einträgen im linken Export-Tree angezeigt
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Type der Resource bestimmen, falls erforderlich
		//3. Kontextmenü anzeigen, falls sinnvoll

		//1. Variablen initialisieren
		var ppielObj = {};
		var ppielRes;
		var ppielRow = {};
		var ppielTree	= document.getElementById("sbp2MIETree1");
		var ppielType;
		ppielTree.treeBoxObject.getCellAt(ppielEvent.clientX, ppielEvent.clientY, ppielRow, {}, ppielObj);
		var ppielIndex = ppielRow.value;
		//2. Type der Resource bestimmen, falls erforderlich
		if ( ppielIndex > -1 ) {
			ppielRes = ppielTree.builderView.getResourceAtIndex(ppielIndex);
			ppielType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ppielRes, "type");
		}
		//3. Kontextmenü anzeigen, falls sinnvoll
		if ( ppielIndex == -1 ) {
			//Kein Kontextmenü anzeigen, wenn kein Eintrag angeklickt wurde
			ppielEvent.preventDefault();
		} else if ( ppielTree.view.selection.count == 1 ) {
			//Kontextmenü für genau 1 Eintrag anzeigen
			document.getElementById("sbp2ShowFiles").hidden = false;
			document.getElementById("sbp2Separator2").hidden = false;
			document.getElementById("sbp2Separator3").hidden = false;
			document.getElementById("sbp2Props").hidden = false;
			//das Merken der Position wird benötigt, damit in sbp2Common.createItem der selektierte Eintrag bestimmt werden kann
			sbp2Common.cPosX = ppielEvent.clientX;
			sbp2Common.cPosY = ppielEvent.clientY;
		} else if ( ppielTree.view.selection.count > 1 ) {
			//Kontextmenü für mehrere Einträge anzeigen
			document.getElementById("sbp2ShowFiles").hidden = true;
			document.getElementById("sbp2Separator2").hidden = true;
			document.getElementById("sbp2Separator3").hidden = true;
			document.getElementById("sbp2Props").hidden = true;
			//das Merken der Position wird benötigt, damit in sbp2Common.createItem der selektierte Eintrag bestimmt werden kann
			sbp2Common.cPosX = ppielEvent.clientX;
			sbp2Common.cPosY = ppielEvent.clientY;
		}
	},

	populatePopupIER : function(ppierEvent)
	{
		//Kontextmenü wird nur bei gültigen Einträgen im Export-Tree angezeigt
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Kontextmenü anzeigen, falls sinnvoll

		//1. Variablen initialisieren
		var ppierTree	= document.getElementById("sbp2MIETree2");
		var ppierObject	= {};
		//2. Kontextmenü anzeigen, falls sinnvoll
		ppierTree.treeBoxObject.getCellAt(ppierEvent.clientX, ppierEvent.clientY, {}, {}, ppierObject);
		if ( ppierObject.value == "" ) {
			//Kein Kontextmenü anzeigen, wenn kein Eintrag angeklickt wurde
			ppierEvent.preventDefault();
		} else if ( ppierTree.view.selection.count == 1 ) {
			//Kontextmenü anzeigen, wenn genau 1 Eintrag selektiert ist
			document.getElementById("sbp2MIEShowFiles").hidden = false;
			document.getElementById("sbp2Separator6").hidden = false;
		} else if ( ppierTree.view.selection.count > 1 ) {
			//Kein Kontextmenü anzeigen, wenn mehr als 1 Eintrag selektiert ist
			document.getElementById("sbp2MIEShowFiles").hidden = true;
			document.getElementById("sbp2Separator6").hidden = true;
		}
	},

	populatePopupS : function(ppsEvent)
	{
		//Kontextmenü wird nur bei gültigen Einträgen im Export-Tree angezeigt
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Kontextmenü anzeigen, falls sinnvoll

		//1. Variablen initialisieren
		var ppsTree	= document.getElementById("sbp2MSTree");
		var ppsObject	= {};
		//2. Kontextmenü anzeigen, falls sinnvoll
		ppsTree.treeBoxObject.getCellAt(ppsEvent.clientX, ppsEvent.clientY, {}, {}, ppsObject);
		if ( ppsObject.value == "" ) {
			//Kein Kontextmenü anzeigen, wenn kein Eintrag angeklickt wurde
			ppsEvent.preventDefault();
		} else if ( ppsTree.view.selection.count == 1 ) {
			//Kontextmenü anzeigen, wenn genau 1 Eintrag selektiert ist
		} else if ( ppsTree.view.selection.count > 1 ) {
			//Kein Kontextmenü anzeigen, wenn mehr als 1 Eintrag selektiert ist
			ppsEvent.preventDefault();
		}
	}

}