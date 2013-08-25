
var sbp2Manage = {

	mainTabContentLoaded: [],	//pro Tab ein Eintrag; 0=Inhalt noch nicht geladen, 1=Inhalt geladen
	dbData				: null,

	ieExportDir			: "",

	mbDatensaetze		: [],

	tLSelectedOK		: false,
	tRSelectedOK		: false,
	tRSelectedOne		: false,

	statsDiagnostics	: [],	//Beschreibung zu Diagnoswerten 0-4
	statsDirectories	: [],	//Enthält Angaben zu den gefundenen Verzeichnissen
	statsItems			: [],	//Enthält Angaben zu den Einträgen im Tree (Verzeichnisse und RDF-Einträge)
	statsItemsDirEmpty	: 0,	//>0, falls leere Verzeichnisse existieren
	statsItemsSorted	: [],	//gibt die Reihenfolge der Einträge im Tree an

	mainChangeTab : function(mctModus)
	{
		switch (mctModus)
		{
			case "impexp" :
				if ( this.mainTabContentLoaded[0] == 0 ) {
					//1. Dem Tree die Datenquelle zuweisen. Ohne rebuild wird nichts angezeigt.
					var mctTree = document.getElementById("sbp2MIETree1");
					mctTree.database.AddDataSource(sbp2DataSource.dbData);
					mctTree.builder.rebuild();
					//2. Information aus about:config holen
					this.ieExportDir = sbp2Prefs.getUnicharPref("extensions.scrapbookplus2.trade.path", "");
					//3. Ansicht aktualisieren, falls ein Exportverzeichnis gefunden werden konnte
					if ( this.ieExportDir != "" ) {
						var mctDirectory = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
						mctDirectory.initWithPath(this.ieExportDir);
						this.ieRefresh(mctDirectory);
					}
					//4.
					document.getElementById("sbp2MIETree1").builderView.addObserver(sbp2MDragAndDropImpExp.ddBuilderViewObserver);
					//5. Erstmalige Anzeige vermerken
					this.mainTabContentLoaded[0] = 1;
				}
				break;
			case "tags" :
				if ( this.mainTabContentLoaded[1] == 0 ) {
					//1. Dem Tree die Datenquelle zuweisen. Ohne rebuild wird nichts angezeigt.
					var mctTree = document.getElementById("sbp2MTTree1");
					mctTree.database.AddDataSource(sbp2DataSource.dbData);
					mctTree.builder.rebuild();
					//2. Dem Tree die Datenquelle zuweisen. Ohne rebuild wird nichts angezeigt.
					mctTree = document.getElementById("sbp2MTTree2");
					mctTree.database.AddDataSource(sbp2DataSource.dbDataTag);
					mctTree.builder.rebuild();
					//3. Erstmalige Anzeige vermerken
					this.mainTabContentLoaded[1] = 1;
				}
				break;
			case "stats" :
				if ( this.mainTabContentLoaded[2] == 0 ) {
					//1. Statistiken laden
					this.statsUpdate();
					//2. Erstmalige Anzeige vermerken
					this.mainTabContentLoaded[2] = 1;
				}
				break;
			case "multibook" :
				if ( this.mainTabContentLoaded[3] == 0 ) {
					//1. multibook.txt laden
					this.mbTreeUpdate(this.mbDatensaetze);
					//2. Sortieren der Einträge zulassen
					this.mbTreeSortEnable();
					//3. Erstmalige Anzeige vermerken
					this.mainTabContentLoaded[3] = 1;
				}
				break;
			default :
				break;
		}
	},

	mainLoad : function(mlModus)
	{
		//Initialisiert verschiedene Variablen und läd den gewünschten Tab beim Aufruf der Verwaltung
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. sbp2DataSource.dbData laden, falls erfoderlich
		//3. Übergabeparameter des Fensters übernehmen
		//4. Datenquelle vom tree in der Sidebar trennen und den tree verstecken
		//5. multibook.txt laden
		//6. Listener einbinden
		//7. Datenverwaltung aktivieren
		//8. Ansicht wechseln, falls iModus != content

		//1. Variablen initialisieren
		this.mainTabContentLoaded.push(0);
		this.mainTabContentLoaded.push(0);
		this.mainTabContentLoaded.push(0);
		this.mainTabContentLoaded.push(0);
		this.statsDiagnostics.push(document.getElementById("sbp2ManageString").getString("DIAGNOSTICS_0"));
		this.statsDiagnostics.push(document.getElementById("sbp2ManageString").getString("DIAGNOSTICS_1"));
		this.statsDiagnostics.push(document.getElementById("sbp2ManageString").getString("DIAGNOSTICS_2"));
		this.statsDiagnostics.push(document.getElementById("sbp2ManageString").getString("DIAGNOSTICS_3"));
		this.statsDiagnostics.push(document.getElementById("sbp2ManageString").getString("DIAGNOSTICS_4"));
		sbp2DataSource.initSearchCacheUpdate();
/*
		this.mProfileFolder = document.getElementById("sbp2CommonString").getString("PROFILEFOLDER");
		//2. RDF-Dateien laden, falls erfoderlich
*/
		if ( !sbp2DataSource.dbData ) sbp2DataSource.init();
		if ( !sbp2DataSource.dbDataTag ) sbp2DataSource.initTag();
/*
		if ( !sbp2DataSource.dbDataCrosslinkUpdate ) sbp2DataSource.initCrosslinkUpdate();
		if ( !sbp2DataSource.dbDataSearchCacheUpdate ) sbp2DataSource.initSearchCacheUpdate();
*/
		this.dbData = Components.classes["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"].createInstance(Components.interfaces.nsIRDFDataSource);
		var iResRoot = sbp2Common.RDF.GetResource("urn:scrapbook:root");
		sbp2Common.RDFCU.MakeSeq(this.dbData, iResRoot);
		//3. Übergabeparameter des Fensters übernehmen
		mlModus = window.arguments[0];
		//4. Datenquelle vom tree in der Sidebar trennen und den tree verstecken
		var mlSidebarTree = window.opener.document.getElementById("sbp2Tree");
		sbp2DataSource.dsRemoveFromTree(mlSidebarTree);
		mlSidebarTree.hidden = true;
		mlSidebarTree = window.opener.document.getElementById("sbp2TreeTag");
		sbp2DataSource.dsRemoveFromTree(mlSidebarTree);
		mlSidebarTree.hidden = true;
		//5. multibook.txt laden
		this.mbDatensaetze = this.mbLoadMultibookTxt();
		//6. Listener einbinden
//		document.getElementById("sbp2MIETree1").builderView.addObserver(sbpMDragAndDrop.ddBuilderViewObserver);
		//7. Ansicht aktualisieren (wird für die Anzeige der Einträge im Multibook-Tab benötigt, falls dieses direkt über die Sidebar aufgerufen wird)
		this.mainChangeTab(mlModus);
		//8. Ansicht wechseln, falls iModus != impexp
		if ( mlModus != "impexp" ) {
			document.getElementById("sbp2MTabs").selectedIndex = 3;
		}
	},

	mainUnload : function()
	{
		//Manage-Fenster wird geschlossen und der Tree in der Sidebar wieder eingeblendet.
		//
		//Ablauf:
		//1. Alle RDF-Resourcen von den Trees entfernen
		//2. Datenquelle an tree in der Sidebar anhängen und den tree wieder sichtbar machen

		//1. Alle RDF-Resourcen von den Trees entfernen
//		sbp2DataSource.exit(document.getElementById("sbp2MIETree1"));
//		if ( sbp2DataSource.dbDataRechts ) {
//			sbp2DataSource.exit(document.getElementById("sbp2MC2Tree"));
//			sbp2DataSource.korrigiereIconRes(true);
//		}
//		sbp2DataSource.exit(document.getElementById("sbp2MCombineTree"));
		//2. Datenquelle an tree in der Sidebar anhängen und den tree wieder sichtbar machen
		var muTreeSidebar = window.opener.document.getElementById("sbp2Tree");
		muTreeSidebar.database.AddDataSource(sbp2DataSource.dbData);
		muTreeSidebar.hidden = false;
		muTreeSidebar = window.opener.document.getElementById("sbp2TreeTag");
		muTreeSidebar.database.AddDataSource(sbp2DataSource.dbDataTag);
		muTreeSidebar.hidden = false;
			//Vor dem rebuild() müssen noch die Einträge für Standardicons eingetragen werden
//		sbp2DataSource.addDefaultIcons(sbp2DataSource.dbData);
			//Der rebuild() ist notwendig, da sonst immer noch nichts angezeigt wird!
		muTreeSidebar.builder.rebuild();
	},

	ieChangeDirectory : function()
	{
		//Öffnet den Dateimanager, um das Export-Verzeichnis ändern zu können
		//
		//Ablauf:
		//1. Picker öffnen
		//2. Verzeichnis in sbp2MC2VZ anzeigen
		//3. Variable für Export-Verzeichnis aktualisieren
		//4. about:config aktualisieren
		//5. Ansicht aktualisieren

		//1. Picker öffnen
		var iecdPickerDir = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		iecdPickerDir.init(window, "Wählen sie ein Verzeichnis", iecdPickerDir.modeGetFolder);
		if ( this.ieExportDir != "" ) {
			var iecdDir = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
			iecdDir.initWithPath(this.ieExportDir);
			iecdPickerDir.displayDirectory = iecdDir;
		}
		var iecdRWert = iecdPickerDir.show();
		if ( iecdRWert == iecdPickerDir.returnOK ) {
			//2. Verzeichnis in sbp2MC2VZ anzeigen
//			var iecdPathField = document.getElementById("sbp2MC2VZ");
//			iecdPathField.file = iecdPickerDir.file;
//			iecdPathField.label = iecdPickerDir.file.path;
			//3. Variable für Export-Verzeichnis aktualisieren
			this.ieExportDir = iecdPickerDir.file.path;
			//4. about:config aktualisieren
			sbp2Prefs.setUnicharPref("extensions.scrapbookplus2.trade.path", iecdPickerDir.file.path);
			//5. Ansicht aktualisieren
			this.ieRefresh(iecdPickerDir.file);
		}
	},

	ieGetFolders : function(iegfContRes, iegfArray)
	{
		//Ermittelt alle Einträge des Typs folder in iegfContRes

		//1. Container in sbp2DataSource.dbData initialisieren
		var iegfCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		iegfCont.Init(sbp2DataSource.dbData, iegfContRes);
		//2. Enumerator erstellen
		var iegfContEnum = iegfCont.GetElements();
		//3. Alle Container aufnehmen
		while ( iegfContEnum.hasMoreElements() )
		{
			//Resource bestimmen
			var iegfRes = iegfContEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			//Type bestimmen
			var iegfType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iegfRes, "type");
			//
			if ( iegfType == "folder" ) {
				iegfArray.push(iegfRes);
				iegfArray = this.ieGetFolders(iegfRes, iegfArray);
			}
		}
		//4. Rückgabe aller bislang gefundenen folder an aufrufende Funktion
		return iegfArray;
	},

	ieItemAdd : function(ieiaNr, ieiaItem, ieiaCont, ieiaFolder)
	{
		//Erstellt den Eintrag in der RDF-Datenquelle mit allen für den Import benötigten Informationen
		var ieiaNewRes = sbp2Common.RDF.GetResource("urn:scrapbook:item" + ieiaNr);
		this.dbData.Assert(ieiaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "id"),      sbp2Common.RDF.GetLiteral(ieiaItem.id), true);
		this.dbData.Assert(ieiaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "type"),    sbp2Common.RDF.GetLiteral(ieiaItem.type), true);
		this.dbData.Assert(ieiaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "title"),   sbp2Common.RDF.GetLiteral(ieiaItem.title), true);
		this.dbData.Assert(ieiaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "chars"),   sbp2Common.RDF.GetLiteral(ieiaItem.chars), true);
		this.dbData.Assert(ieiaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "comment"), sbp2Common.RDF.GetLiteral(ieiaItem.comment), true);
		if ( ieiaItem.icon != "" &&
			 ieiaItem.icon.indexOf("file:\/\/\/") != 0 ) {
			var ieiaTemp = "file:///"+ieiaFolder.path.replace(/\\/g, "\/");
			if ( ieiaTemp.lastIndexOf("\/") != ieiaTemp.length-1 ) ieiaTemp += "/";
			ieiaItem.icon = ieiaTemp + ieiaItem.icon;
		}
		this.dbData.Assert(ieiaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "icon"),    sbp2Common.RDF.GetLiteral(ieiaItem.icon), true);
		this.dbData.Assert(ieiaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "source"),  sbp2Common.RDF.GetLiteral(ieiaItem.source), true);
		this.dbData.Assert(ieiaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "date"),    sbp2Common.RDF.GetLiteral((new Date(ieiaFolder.lastModifiedTime)).toLocaleString()), true);
		this.dbData.Assert(ieiaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "folder"),  sbp2Common.RDF.GetLiteral(ieiaItem.folder.replace(/\t/g, "\/")), true);
		this.dbData.Assert(ieiaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "localfld"), sbp2Common.RDF.GetLiteral(ieiaFolder.path), true);
		this.dbData.Assert(ieiaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "isZip"),   sbp2Common.RDF.GetLiteral(ieiaItem.isZip), true);
		ieiaCont.AppendElement(ieiaNewRes);
	},

	ieItemDeleteL : function()
	{
		//Falls die Statistik-Daten schon erstellt waren, müssen diese Daten nach dem Löschen einer oder mehrerer Einträge erneut erstellt werden.
		//this.mainTabContentLoaded[2] -> 0
		var ieidlRC = sbp2TreeHandle.itemDelete('sbp2MIETree1', sbp2DataSource.dbData);
		if ( ieidlRC == 1 ) this.mainTabContentLoaded[2] = 0;
	},

	ieItemDeleteR : function()
	{
		//Alle selektierten Einträge werden gelöscht
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Sicherheitsabfrage (wirklich löschen?)
		//2.1 Selektierte Einträge löschen
		//2.2 Ansicht aktualisieren

		//1. Variablen initialisieren
		var ieidTree		= document.getElementById("sbp2MIETree2");
		var ieidStart		= new Object();
		var ieidEnd			= new Object();
		var ieidNumRanges	= ieidTree.view.selection.getRangeCount();
		var ieidAnswer      = null;
		//2. Sicherheitsabfrage (wirklich löschen?)
		if ( ieidTree.view.selection.count == 1 ) {
			ieidAnswer = window.confirm(document.getElementById("sbp2CommonString").getString("QUESTION_DELETE_S"));
		} else {
			ieidAnswer = window.confirm(document.getElementById("sbp2CommonString").getString("QUESTION_DELETE_M"));
		}
		if ( ieidAnswer == true ) {
			//2.1 Selektierte Einträge löschen
			for ( var ieidI=0; ieidI<ieidNumRanges; ieidI++)
			{
				ieidTree.view.selection.getRangeAt(ieidI,ieidStart,ieidEnd);
				for ( var ieidJ=ieidStart.value; ieidJ<=ieidEnd.value; ieidJ++)
				{
					var ieidRes = ieidTree.builderView.getResourceAtIndex(ieidJ);
					var ieidFolder = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
					ieidFolder.initWithPath(sbp2DataSource.propertyGet(ieidTree.database, ieidRes, "localfld"));
					sbp2Common.directoryRemove(ieidFolder);
				}
			}
			//2.2 Ansicht aktualisieren
			var ieidDir = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
			ieidDir.initWithPath(this.ieExportDir);
			this.ieRefresh(ieidDir);
		}
	},

	ieItemExport : function()
	{
		//Exportiert die in sbp2MIETree1 selektierten Einträge ins Exportverzeichnis
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. selektierte Eintraege bestimmen (Trennlinien werden ignoriert)
		//3. selektierte Einträge exportieren
		//	3.1 Titel bestimmen
		//	3.2 Name der ZIP-Datei anhand des Titels festlegen
		//	3.3 ZIP-Datei erstellen
		//	3.4 komplettes Quellverzeichnis der Resource bestimmen
		//	3.5 index.dat erstellen, falls diese fehlt
		//	3.6 Eintrag einfügen

		//1. Variablen initialisieren
		var iieData         = sbp2DataSource.dbData;
		var iieTree         = document.getElementById("sbp2MIETree1");
		var iieZTree        = document.getElementById("sbp2MIETree2");
		var iieResContList  = [];
		var iieResList      = [];
		var iieResRoot      = sbp2Common.RDF.GetResource("urn:scrapbook:root");
		var iieStart        = new Object();
		var iieEnd          = new Object();
		var iieNumRanges    = iieTree.view.selection.getRangeCount();
		//2. selektierte Eintraege bestimmen (Trennlinien werden ignoriert)
		for (var iieI=0; iieI<iieNumRanges; iieI++)
		{
			iieTree.view.selection.getRangeAt(iieI, iieStart, iieEnd);
			for (var iieJ=iieStart.value; iieJ<=iieEnd.value; iieJ++)
			{
				//Resource des selektierten Eintrags bestimmen
				var iieRes = iieTree.builderView.getResourceAtIndex(iieJ);
				//Resourcen vom Typ "separator" ignorieren
				var iieType = sbp2DataSource.propertyGet(iieData, iieRes, "type");
				if ( iieType=="separator" ) continue;
				//Resource zum Exportieren vormerken
				iieResList.push(iieRes);
			}
/*
				//Resource des selektierten Eintrags bestimmen
				var iieRes = iieTree.builderView.getResourceAtIndex(iieJ);
				//Resourcen vom Type "separator" ignorieren
				var iieType = sbp2DataSource.propertyGet(iieData, iieRes, "type");
				if ( iieType=="separator" ) continue;
				//Sicherstellen, das gefundene Resource nicht in einem Container enthalten ist, der schon aufgenommen wurde
				var iieFound = 0;
				for ( var iieK=0; iieK<iieResContList.length; iieK++ )
				{
					if ( sbp2Common.RDFCU.indexOf(iieData, iieResContList[iieK], iieRes) > -1 ) {
						iieFound=1;
						iieK=iieResContList.length;
					}
				}
				if ( iieFound==1 ) continue;
				//bei einem Container müssen die enthaltenen Einträge berücksichtigt werden
				if ( sbp2Common.RDFCU.IsContainer(iieData, iieRes) ) {
					iieResContList.push(iieRes);
//					this.elContainerAdd(iieData, iieRes, iieResList, iieResContList);
				} else {
					//Resource zum Loeschen vormerken
					iieResList.push(iieRes);
				}
			}
*/
		}
		//3. selektierte Einträge exportieren
		for ( var iieI=0; iieI<iieResList.length; iieI++ )
		{
			//3.1 Titel bestimmen
			var iieRes = iieResList[iieI];
			var iieTitel = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "title");
			//3.2 Name der ZIP-Datei anhand des Titels festlegen
			var iieZIPFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
			iieZIPFile.initWithPath(this.ieExportDir);
			iieTitel = iieTitel.replace(/\"/g, "'");		//ungültiges Zeichen für Verzeichnisse ersetzen
			iieTitel = iieTitel.replace(/\|/g, "");			//ungültiges Zeichen für Verzeichnisse ersetzen
			iieTitel = iieTitel + ".zip";
			iieZIPFile.append(iieTitel);
			var iieZaehler = 0;
			while ( iieZIPFile.exists() )
			{
				iieZaehler++;
				iieZIPFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
				iieZIPFile.initWithPath(this.ieExportDir);
				iieZIPFile.append(iieTitel+"-"+iieZaehler);
			}
//			iieZielDir.create(iieZielDir.DIRECTORY_TYPE, parseInt("0700", 8));
/*
			var iieType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "type");
			var iieID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "id");
			if ( iieType != "bookmark" ) {
				//Quellverzeichnis bestimmen
				var iieQuellVZ = sbp2Common.getBuchVZ();
				iieQuellVZ.append("data");
				iieQuellVZ.append(iieID);
				//alle Dateien im Quellverzeichnis kopieren
				var iieQuellVZEnum = iieQuellVZ.directoryEntries;
				while ( iieQuellVZEnum.hasMoreElements() )
				{
					var iieFile = iieQuellVZEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
					if ( !iieFile.isDirectory() ) iieFile.copyTo(iieZielDir, iieFile.leafName);
				}
			}
			//3.4 komplettes Quellverzeichnis der Resource bestimmen
			var iieDir = "";
			var iieContResAll = this.ieGetFolders(iieResRoot, []);
			iieContResAll.push(iieRes);
			var iieReachedRoot = false;
			var iieLastHit = iieContResAll.length-1;
			for ( var iieK=iieContResAll.length-2; iieK>-1; iieK-- )
			{
				if ( sbp2Common.RDFCU.indexOf(sbp2DataSource.dbData, iieContResAll[iieK], iieContResAll[iieLastHit]) > -1 ) {
					iieLastHit = iieK;
					iieDir = "\t"+sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieContResAll[iieK], "title")+iieDir;
				}
			}
			iieDir = iieDir.substring(1, iieDir.length);
			//3.5 index.dat erstellen, falls diese fehlt
			var iieIndexDat = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
			iieIndexDat.initWithPath(iieZielDir.path);
			iieIndexDat.append("index.dat");
			var iieItem = { id: "", type: "", title: "", chars: "", icon: "", source: "", comment: "", folder: "", isZip: "0" };
			iieItem.id      = iieID;
			iieItem.type    = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "type");
			iieItem.title   = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "title");
			iieItem.chars   = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "chars");
			iieItem.icon    = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "icon");
			if ( iieItem.icon.match(/^resource:\/\/scrapbook\/data\/\d{14}/) ) {
				iieItem.icon = iieItem.icon.substring(41, iieItem.icon.length);
			}
			iieItem.source  = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "source");
			iieItem.comment = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "comment");
			iieItem.folder = iieDir;
			if ( !iieIndexDat.exists() ) {
				sbp2Common.fileWriteIndexDat(iieIndexDat.path, iieItem);
			}
*/
			//3.3 ZIP-Datei erstellen
			var iieID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "id");
			if ( iieType != "bookmark" ) {
				//Quellverzeichnis bestimmen
				var iieQuellVZ = sbp2Common.getBuchVZ();
				iieQuellVZ.append("data");
				iieQuellVZ.append(iieID);
				//alle Dateien im Quellverzeichnis packen
				sbp2ToolsZip.zipFolder(iieZIPFile, iieQuellVZ, false);
			}
			//3.4 index.dat erstellen, falls diese fehlt
			var iieItem = { id: "", type: "", title: "", chars: "", icon: "", source: "", comment: "", folder: "", isZip: "1" };
			iieItem.id = iieID;
			iieItem.type = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "type");
			iieItem.title = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "title");
			iieItem.chars = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "chars");
			iieItem.icon = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "icon");
			if ( iieItem.icon.match(/^resource:\/\/scrapbook\/data\/\d{14}/) ) iieItem.icon = iieItem.icon.substring(41, iieItem.icon.length);
			iieItem.source = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "source");
			iieItem.comment = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieRes, "comment");
			//4.4.1 komplettes Quellverzeichnis der Resource bestimmen
			var iieFolder = "";
			var iieContResAll = this.ieGetFolders(iieResRoot, []);
			iieContResAll.push(iieRes);
			var iieReachedRoot = false;
			var iieLastHit = iieContResAll.length-1;
			for ( var iieK=iieContResAll.length-2; iieK>-1; iieK-- )
			{
				if ( sbp2Common.RDFCU.indexOf(sbp2DataSource.dbData, iieContResAll[iieK], iieContResAll[iieLastHit]) > -1 ) {
					iieLastHit = iieK;
					iieFolder = "\t"+sbp2DataSource.propertyGet(sbp2DataSource.dbData, iieContResAll[iieK], "title")+iieFolder;
				}
			}
			iieFolder = iieFolder.substring(1, iieFolder.length);
			iieItem.folder = iieFolder;
			var iieString = "";
			iieString += "id\t"+iieItem.id+"\n";
			iieString += "type\t"+iieItem.type+"\n";
			iieString += "title\t"+iieItem.title+"\n";
			iieString += "chars\t"+iieItem.chars+"\n";
			iieString += "icon\t"+iieItem.icon+"\n";
			iieString += "source\t"+iieItem.source+"\n";
			iieString += "comment\t"+iieItem.comment+"\n";
			iieString += "folder\t"+iieItem.folder+"\n";
			var iieConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
			iieConverter.charset = "UTF-8";
			var iieStream = iieConverter.convertToInputStream(iieString);
			sbp2ToolsZip.zipStream(iieZIPFile, "index.dat", iieStream, true);
			//Damit bei einem ZIP-Archiv ein Icon angezeigt wird, muss der Wert auf "" gesetzt werden
			iieItem.icon = "";
			//3.6 Eintrag einfügen
			var iieContRoot = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
			iieContRoot.Init(this.dbData, iieResRoot);
			this.ieItemAdd(iieContRoot.GetCount(), iieItem, iieContRoot, iieZielDir);
			iieZTree.builder.rebuild();
		}
	},

	ieItemImport : function()
	{
		//Es werden alle selektierten Einträge importiert und am Ende die RDF-Datei neu geschrieben.
		//
		//Ablauf (für jeden selektierten Eintrag im rechten Tree):
		//1. Zielverzeichnis in RDF-Struktur initialisieren
		//2. Verzeichnisstruktur im Tree erstellen
		//3. Variablen initialisieren
		//4. neue ID bestimmen (es wird die alte verwendet, falls dies möglich ist)
		//5. Daten für Eintrag und index.dat sammeln
		//6. Dateien kopieren, sofern kein "bookmark" importiert werden soll
		//7. Eintrag einfügen
		//8. Damit die Boxen zum Auf-/Zuklappen von Verzeichnissen dargestellt werden, ist ein rebuild des Tree notwendig
		//9. rdf-Datei schreiben

		if ( !sbp2DataSource.dbDataSearchCacheUpdate ) sbp2DataSource.initSearchCacheUpdate();
		var iiiTree = document.getElementById("sbp2MIETree2");
		var iiiStart = new Object();
		var iiiEnd = new Object();
		var iiiNumRanges = iiiTree.view.selection.getRangeCount();
		for ( var iiiI=0; iiiI<iiiNumRanges; iiiI++)
		{
			iiiTree.view.selection.getRangeAt(iiiI, iiiStart, iiiEnd);
			for ( var iiiJ=iiiStart.value; iiiJ<=iiiEnd.value; iiiJ++ )
			{
				var iiiRes = iiiTree.builderView.getResourceAtIndex(iiiJ);
				//1. Zielverzeichnis in RDF-Struktur initialisieren
				var iiiResCont = sbp2Common.RDF.GetResource("urn:scrapbook:root");
				//2. Verzeichnisstruktur im Tree erstellen
				if ( document.getElementById("sbp2MIECbRestoreDirectory").checked ) {
					var iiiFolder = { id: "", type: "", title: "", chars: "", icon: "", source: "", comment: "", folder: "" };
					var iiiUnterverzeichnisse = sbp2DataSource.propertyGet(this.dbData, iiiRes, "folder").split("\/");
					if ( iiiUnterverzeichnisse.length > 1 || iiiUnterverzeichnisse[0] != "" ) {
						for ( var iiiI=0; iiiI<iiiUnterverzeichnisse.length; iiiI++ )
						{
							//Resource des Containers bestimmen, falls er schon existiert
							var iiiResContTemp = sbp2DataSource.checkFolderExists(sbp2DataSource.dbData, iiiResCont, iiiUnterverzeichnisse[iiiI]);
							//Wurde Container nicht gefunden, wird er angelegt
							if ( iiiResContTemp == null ) {
								iiiFolder.id = sbp2Common.createNewRDFURL(sbp2DataSource.dbData,"urn:scrapbook:item");
								iiiFolder.type = "folder";
								iiiFolder.title = iiiUnterverzeichnisse[iiiI];
								iiiFolder.chars = "";
								iiiFolder.icon = "";
								iiiFolder.source = "";
								iiiFolder.comment = "";
								iiiFolder.folder = "";
								sbp2DataSource.itemAdd(sbp2DataSource.dbData, iiiFolder, iiiResCont, -1);
								iiiResCont = sbp2Common.RDF.GetResource("urn:scrapbook:item"+iiiFolder.id);
							} else {
								iiiFolder.id = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iiiResContTemp, "id");
								iiiResCont = iiiResContTemp;
							}
						}
					}
				}
				//3. Variablen initialisieren
				var iiiDir = sbp2DataSource.propertyGet(this.dbData, iiiRes, "id");
				var iiiFolderString = sbp2DataSource.propertyGet(this.dbData, iiiRes, "localfld");
				var iiiFolder = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
				iiiFolder.initWithPath(iiiFolderString);
//muss noch angepasst werden (???)
				//4. neue ID bestimmen (es wird die alte verwendet, falls dies möglich ist)
				var iiiResNew = sbp2Common.RDF.GetResource("urn:scrapbook:item" + iiiDir);
				if ( sbp2DataSource.propertyGet(sbp2DataSource.dbData, iiiResNew, "id") != "" ) {
					alert("Schon benutzt! Eintrag wird nicht importiert.");
				} else {
					//5. Daten für Eintrag und index.dat sammeln
					var iiiItem = { id: "", type: "", title: "", chars: "", comment: "", icon: "", source: "", folder: "", quellVZ: "" };
					iiiItem.id		= iiiDir;
					iiiItem.type	= sbp2DataSource.propertyGet(this.dbData, iiiRes, "type");
					iiiItem.title	= sbp2DataSource.propertyGet(this.dbData, iiiRes, "title");
					iiiItem.chars	= sbp2DataSource.propertyGet(this.dbData, iiiRes, "chars");
					var iiiTemp	= sbp2DataSource.propertyGet(this.dbData, iiiRes, "icon");
					if ( iiiTemp.match(/^file:\/\/\//) ) iiiTemp = iiiTemp.substring(iiiTemp.lastIndexOf("/"), iiiTemp.length);
					iiiItem.comment = sbp2DataSource.propertyGet(this.dbData, iiiRes, "comment");
					iiiItem.icon	= iiiTemp;
					iiiItem.source	= sbp2DataSource.propertyGet(this.dbData, iiiRes, "source");
					//6. Dateien kopieren, sofern kein "bookmark" importiert werden soll
					if ( sbp2DataSource.propertyGet(this.dbData, iiiRes, "type") != "bookmark" ) {
						//neues Datenverzeichnis anlegen
						var iiiDestinationDir = sbp2Common.getBuchVZ();
						iiiDestinationDir.append("data");
						iiiDestinationDir.append(iiiItem.id);
						try
						{
							iiiDestinationDir.create(iiiDestinationDir.DIRECTORY_TYPE, parseInt("0700", 8));
						} catch(iiiEx)
						{
							alert("sbp2Manage.ieItemImport\n---\n"+iiiEx);
						}
						//Dateien kopieren
						if ( sbp2DataSource.propertyGet(this.dbData, iiiRes, "isZip") == "1" ) {
							sbp2ToolsZip.unzipFile(iiiFolder, iiiDestinationDir);
						} else {
							var iiiQuellVZEnum = iiiFolder.directoryEntries;
							while ( iiiQuellVZEnum.hasMoreElements() )
							{
								var iiiFile = iiiQuellVZEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
								if ( iiiFile.leafName != "index.dat" ) {
									iiiFile.copyTo(iiiDestinationDir, iiiFile.leafName);
								}
							}
						}
						//index.dat erstellen
						sbp2Common.fileWriteIndexDat(iiiDestinationDir.path+"\\index.dat", iiiItem);
					}
					//7. Eintrag einfügen
					sbp2DataSource.itemAdd(sbp2DataSource.dbData, iiiItem, iiiResCont, -1);
				}
			}
		}
		//8. Damit die Boxen zum Auf-/Zuklappen von Verzeichnissen dargestellt werden, ist ein rebuild des Tree notwendig
		document.getElementById("sbp2MIETree1").builder.rebuild();		
		//9. rdf-Datei schreiben
		sbp2DataSource.dsFlush(sbp2DataSource.dbData);
		sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCacheUpdate);
	},

	ieItemShowFiles : function()
	{
		//Öffnet das Verzeichnis, das die Dateien des gewählten Eintrags enthält.
		//
		//Ablauf:
		//1. Verzeichnis bestimmen
		//2. Verzeichnis anzeigen

		//1. Verzeichnis bestimmen
			//1a. Tree bestimmen
		var ieisfTree = document.getElementById("sbp2MIETree2");
			//1b. Nummer des gewählten Eintrags bestimmen
		var ieisfIndex = ieisfTree.currentIndex;
//			//1c. Funktion verlassen, wenn ein Verzeichnis (Container) selektiert ist und somit nichts angezeigt werden kann
//		if ( ieisfTree.view.isContainer(ieisfIndex) ) return;
			//1d. Resource bestimmen
		var ieisfRes = ieisfTree.builderView.getResourceAtIndex(ieisfIndex);
			//1e. Verzeichnisnamen vervollständigen
		var ieisfFolder = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		ieisfFolder.initWithPath(sbp2DataSource.propertyGet(ieisfTree.database, ieisfRes, "localfld"));
		//2. Verzeichnis anzeigen
		try
		{
			ieisfFolder = ieisfFolder.QueryInterface(Components.interfaces.nsILocalFile);
			ieisfFolder.launch();
		} catch(ieisfEx)
		{
			alert("sbp2Manage.showFiles\n---\n"+ieisfEx);
		}
	},

	ieOnKeyPress : function(ieokpEvent)
	{
		//F2  -> Editieren des Eintrags
		//del -> Löschen des Eintrags

		switch ( ieokpEvent.keyCode )
		{
			case ieokpEvent.DOM_VK_F2:
			{
				break;
			}
			case ieokpEvent.DOM_VK_DELETE:
			{
				var ieokpRC = sbp2TreeHandle.itemDelete('sbp2MIETree1', sbp2DataSource.dbData, null);
				if ( ieokpRC == 1 ) this.mainTabContentLoaded[2] = 0;
				break;
			}
		}
	},

	ieRefresh : function(ierVerzeichnis)
	{
		//Listet alle Einträge, die importiert werden können, in sbp2MIETree2 auf
		//
		//Ablauf:
		//1. Treeobjekt bestimmen
		//2. Datenbank entfernen
		//3. Tree leeren
		//4. Tree mit Datensätzen im Verzeichnis füllen
		//5. RDF-Datenquelle dem tree hinzufügen
		//6. Damit die Boxen zum Auf-/Zuklappen von Verzeichnissen dargestellt werden, ist ein rebuild des Tree notwendig

		//1. Treeobjekt bestimmen
		var ierTree = document.getElementById("sbp2MIETree2");
		//2. Datenbank entfernen
		var ierDBEnum = ierTree.database.GetDataSources();
		while ( ierDBEnum.hasMoreElements() )
		{
			var ierDataSource = ierDBEnum.getNext().QueryInterface(Components.interfaces.nsIRDFDataSource);
			ierTree.database.RemoveDataSource(ierDataSource);
		}
		//3. Tree leeren
		this.ieTreeRemoveItems(ierTree);
		//4. Tree mit Datensätzen im Verzeichnis füllen
		var ierNr = -1;
		var ierDirEnum = ierVerzeichnis.directoryEntries;
		var ierCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		ierCont.Init(this.dbData, sbp2Common.RDF.GetResource("urn:scrapbook:root"));
		while ( ierDirEnum.hasMoreElements() )
		{
			var ierFile = ierDirEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
			if ( ierFile.isDirectory() ) {
				//exportierte Einträge aus ScrapBook Plus 1 sowie ScrapBook stehen in eigenen Unterverzeichnissen
				var ierIndexDat = ierFile.clone();
				ierIndexDat.append("index.dat");
				var ierItem = "";
				if ( ierIndexDat.exists() ) {
					//index.dat lesen
					ierItem = sbp2Common.fileReadIndexDat(ierIndexDat);
				} else {
					continue;
				}
				//Eintrag aufnehmen
				ierNr++;
				this.ieItemAdd(ierNr, ierItem, ierCont, ierFile);
			} else {
				//ZIP-Dateien stehen direkt im gewählten Verzeichnis
				if ( ierFile.fileSize > 0 ) {
					//index.dat in ZIP-Datei lesen
					var ierData = sbp2ToolsZip.zipStreamRead(ierFile, "index.dat");
					//Falls die ZIP-Datei fehlerhaft ist, wird diese ignoriert
					if ( ierData.length==0 ) continue;
					var ierLines = ierData.split("\n");
					ierItem = { id: "", type: "", title: "", chars: "", comment: "", icon: "", source: "", folder: "", quellVZ: "", isZip: "1" };
					for ( var ierI=0; ierI<ierLines.length; ierI++ )
					{
						if ( !ierLines[ierI].match(/\t/) ) continue;
						var keyVal = ierLines[ierI].split("\t");
						if ( keyVal.length == 2 ) {
							ierItem[keyVal[0]] = keyVal[1];
						} else {
							ierItem[keyVal.shift()] = keyVal.join("\t");
						}
					}
					ierItem.icon = "";
				} else {
					continue;
				}
				//Eintrag aufnehmen
				ierNr++;
				this.ieItemAdd(ierNr, ierItem, ierCont, ierFile);
			}
		}
		//5. RDF-Datenquelle dem tree hinzufügen
		ierTree.database.AddDataSource(this.dbData);
		//6. Damit die Boxen zum Auf-/Zuklappen von Verzeichnissen dargestellt werden, ist ein rebuild des Tree notwendig
		ierTree.builder.rebuild();
	},

	ieTreeRemoveItems : function(ietriTree)
	{
		//Entfernt sämtliche Einträge aus sbp2Manage.dbData
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Alle Einträge des Containers entfernen

		//1. Variablen initialisieren
		var ietriCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		ietriCont.Init(this.dbData, sbp2Common.RDF.GetResource("urn:scrapbook:root"));
		var ietriCount = ietriCont.GetCount();
		//2. Alle Einträge des Containers entfernen
		for ( var ietriI=ietriCount; ietriI>0; ietriI-- )
		{
			//Eintrag im Container entfernen
			var ietriRes = ietriCont.RemoveElementAt(ietriI, true);
			//Resource entfernen
			var ietriNames = this.dbData.ArcLabelsOut(ietriRes);
			while ( ietriNames.hasMoreElements() )
			{
				try
				{
					var ietriName  = ietriNames.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
					var ietriValue = this.dbData.GetTarget(ietriRes, ietriName, true);
					this.dbData.Unassert(ietriRes, ietriName, ietriValue);
				} catch(ietriEx)
				{
					alert("sbp2Manage.ieTreeRemoveItems\n---\n"+ietriEx);
				}
			}
		}
	},

	mSort : function(scResContainer, scModus, scDirSub)
	{
		//Sortiert die Einträge in Container scResContainer auf- oder absteigend (scModus). Unterverzeichnisse werden berücksichtigt,
		//falls scDirSub den Wert true hat.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Einträge aus Container sammeln
		//3. Einträge sortieren
		//4. neue Reihenfolge übernehmen
		//5. Vermerken, dass ein Mal Veränderungen vorgenommen wurden, damit später gespeichert wird
		//6. sortierte Liste auf Festplatte schreiben
		//7. Damit die Boxen zum Auf-/Zuklappen von Verzeichnissen dargestellt werden, ist ein rebuild des Tree notwendig

		//1. Variablen initialisieren
		var scListFolder		= [];
		var scListType			= [];
		var scListItem			= [];
		var scListItemNr		= [];
		var scType				= "";
		var scItemLastNr		= -1;
		var scChanged			= 0;	//0 -> innere Schleife verlassen
		var scChangedAll		= 0;	//0 -> äussere Schleife verlassen
		var scChangedAll2		= 0;	//1 -> in irgendeinem der folder in scListFolder wurde mindestens eine Veränderung vorgenommen -> speichern
		var scTemp				= null;
		var scVal1				= null;
		var scVal2				= null;
		scListFolder.push(scResContainer);
		for ( var scA=0; scA<scListFolder.length; scA++ )
		{
			//2. Einträge aus Container sammeln
			scListType			= [];
			scListItem			= [];
			scListItemNr		= [];
			var scCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
			scCont.Init(sbp2DataSource.dbData, scListFolder[scA]);
			var scContChildren = scCont.GetElements();
			while (scContChildren.hasMoreElements())
			{
				var scContChild = scContChildren.getNext();
				scListItem.push(scContChild);
				scListItemNr.push(scListItem.length-1);
				scType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, scContChild, "type");
				if ( scType == "folder" ) {
					if ( scDirSub ) {
						scListFolder.push(scContChild);
					}
					scListType.push(1);
				} else if ( scType == "separator" ) {
					scListType.push(2);
				} else {
					scListType.push(0);
				}
			}
			//3. Einträge sortieren
			scItemLastNr = scListItem.length;
			scChangedAll = 0;
			if ( scModus == 0 ) {
				for ( var scI=0; scI<scListItem.length-1; scI++ )
				{
					scChanged = 0;
					scItemLastNr--;
					for ( var scJ=0; scJ<scItemLastNr; scJ++ )
					{
						if ( scListType[scListItemNr[scJ]] == 1 ) {
							if ( scListType[scListItemNr[scJ+1]] == 1 ) {
								//Tausch prüfen
								scVal1 = sbp2DataSource.propertyGet(sbp2DataSource.dbData, scListItem[scListItemNr[scJ]], "title");
								scVal2 = sbp2DataSource.propertyGet(sbp2DataSource.dbData, scListItem[scListItemNr[scJ+1]], "title");
								if (  scVal1 > scVal2 ) {
									scTemp = scListItemNr[scJ];
									scListItemNr[scJ] = scListItemNr[scJ+1];
									scListItemNr[scJ+1] = scTemp;
									scChanged = 1;
									scChangedAll = 1;
									scChangedAll2 = 1;
								}
							} else if ( scListType[scListItemNr[scJ+1]] == 2 ) {
								//den folgenden separator überspringen
								scJ++;
							}
						} else if ( scListType[scListItemNr[scJ]] == 0 ) {
							if ( scListType[scListItemNr[scJ+1]] == 1 ) {
								//tauschen, da folder immer über normalen Einträgen stehen
								scTemp = scListItemNr[scJ];
								scListItemNr[scJ] = scListItemNr[scJ+1];
								scListItemNr[scJ+1] = scTemp;
								scChanged = 1;
								scChangedAll = 1;
								scChangedAll2 = 1;
							} else if ( scListType[scListItemNr[scJ+1]] == 2 ) {
								//den folgenden separator überspringen
								scJ++;
							} else {
								//Tausch prüfen
								scVal1 = sbp2DataSource.propertyGet(sbp2DataSource.dbData, scListItem[scListItemNr[scJ]], "title");
								scVal2 = sbp2DataSource.propertyGet(sbp2DataSource.dbData, scListItem[scListItemNr[scJ+1]], "title");
								if (  scVal1 > scVal2 ) {
									scTemp = scListItemNr[scJ];
									scListItemNr[scJ] = scListItemNr[scJ+1];
									scListItemNr[scJ+1] = scTemp;
									scChanged = 1;
									scChangedAll = 1;
									scChangedAll2 = 1;
								}
							}
						}
					}
					//Falls keine Änderung durchgeführt wurde, kann das Sortieren beendet werden.
					if ( scChanged == 0 ) {
						scI = scListItem.length;
						scJ = scItemLastNr;
					}
				}
			} else {
				for ( var scI=0; scI<scListItem.length-1; scI++ )
				{
					scChanged = 0;
					scItemLastNr--;
					for ( var scJ=0; scJ<scItemLastNr; scJ++ )
					{
						if ( scListType[scListItemNr[scJ]] == 1 ) {
							if ( scListType[scListItemNr[scJ+1]] == 1 ) {
								//Tausch prüfen
								scVal1 = sbp2DataSource.propertyGet(sbp2DataSource.dbData, scListItem[scListItemNr[scJ]], "title");
								scVal2 = sbp2DataSource.propertyGet(sbp2DataSource.dbData, scListItem[scListItemNr[scJ+1]], "title");
								if (  scVal1 < scVal2 ) {
									scTemp = scListItemNr[scJ];
									scListItemNr[scJ] = scListItemNr[scJ+1];
									scListItemNr[scJ+1] = scTemp;
									scChanged = 1;
									scChangedAll = 1;
								}
							} else if ( scListType[scListItemNr[scJ+1]] == 2 ) {
								//den folgenden separator überspringen
								scJ++;
							}
						} else if ( scListType[scListItemNr[scJ]] == 0 ) {
							if ( scListType[scListItemNr[scJ+1]] == 1 ) {
								//tauschen, da folder immer über normalen Einträgen stehen
								scTemp = scListItemNr[scJ];
								scListItemNr[scJ] = scListItemNr[scJ+1];
								scListItemNr[scJ+1] = scTemp;
								scChanged = 1;
								scChangedAll = 1;
							} else if ( scListType[scListItemNr[scJ+1]] == 2 ) {
								//den folgenden separator überspringen
								scJ++;
							} else {
								//Tausch prüfen
								scVal1 = sbp2DataSource.propertyGet(sbp2DataSource.dbData, scListItem[scListItemNr[scJ]], "title");
								scVal2 = sbp2DataSource.propertyGet(sbp2DataSource.dbData, scListItem[scListItemNr[scJ+1]], "title");
								if (  scVal1 < scVal2 ) {
									scTemp = scListItemNr[scJ];
									scListItemNr[scJ] = scListItemNr[scJ+1];
									scListItemNr[scJ+1] = scTemp;
									scChanged = 1;
									scChangedAll = 1;
								}
							}
						}
					}
					//Falls keine Änderung durchgeführt wurde, kann das Sortieren beendet werden.
					if ( scChanged == 0 ) {
						scI = scListItem.length;
						scJ = scItemLastNr;
					}
				}
			}
			//Anpassungen sind nur erforderlich, falls Einträge verschoben wurden.
			if ( scChangedAll == 1 ) {
				//4. neue Reihenfolge übernehmen
				for ( var scI=0; scI<scListItem.length; scI++ )
				{
					if ( scListItemNr[scI] != scI ) {
						var scRes = scCont.RemoveElementAt(scListItemNr[scI]+1, false);
						scCont.InsertElementAt(scRes, scI+1, false);
					}
				}
				//5. Vermerken, dass ein Mal Veränderungen vorgenommen wurden, damit später gespeichert wird
				scChangedAll2 = 1;
			}
		}
		//Anpassungen sind nur erforderlich, falls Einträge verschoben wurden.
		if ( scChangedAll2 == 1 ) {
			//6. sortierte Liste auf Festplatte schreiben
			sbp2DataSource.dsFlush(sbp2DataSource.dbData);
			//7. Damit die Boxen zum Auf-/Zuklappen von Verzeichnissen dargestellt werden, ist ein rebuild des Tree notwendig
			document.getElementById("sbp2MIETree1").builder.rebuild();
		}
	},

	tCheckButtons : function(tcbMode, tcbTreeString)
	{
		//Prüft, welche Knöpfe aktiviert/deaktiviert werden
		//
		//Ablauf:
		//1. Tree-Element, dessen Informationen geprüft werden, bestimmen
		//2. Modus abfragen (je nach Modus müssen nur bestimmte Abfragen gemacht werden)
		//3. Knöpfe aktivieren/deaktivieren

		//1. Tree-Element, dessen Informationen geprüft werden, bestimmen
		var tcbTree = document.getElementById(tcbTreeString);
		//2. Modus abfragen (je nach Modus müssen nur bestimmte Abfragen gemacht werden)
		if ( tcbMode == 1 ) {
			if ( tcbTree.view.selection.count == 0 ) {
				this.tLSelectedOK	= false;
			} else if ( tcbTree.view.selection.count == 1 ) {
				var tcbStart = new Object();
				var tcbEnd = new Object();
				var tcbOK = 0;
				for ( var tcbI=0; tcbI<1; tcbI++)
				{
					tcbTree.view.selection.getRangeAt(tcbI,tcbStart,tcbEnd);
					for ( var tcbJ=tcbStart.value; tcbJ<=tcbEnd.value; tcbJ++)
					{
						var tcbRes = tcbTree.builderView.getResourceAtIndex(tcbJ);
						var tcbType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, tcbRes, "type");
						if ( tcbType != "separator" ) {
							tcbOK = 1;
							tcbJ = tcbEnd.value;
							tcbI = 1;
						}
					}
				}
				if ( tcbOK == 0 ) {
					this.tLSelectedOK	= false;
				} else {
					this.tLSelectedOK	= true;
				}
			} else {
				this.tLSelectedOK	= true;
			}
		} else {
			if ( tcbTree.view.selection.count == 0 ) {
				this.tRSelectedOK = false;
				this.tRSelectedOne = false;
			} else {
				if ( tcbTree.view.selection.count == 1 ) {
					this.tRSelectedOne = true;
				} else {
					this.tRSelectedOne = false;
				}
				this.tRSelectedOK = true;
			}
		}
		//3. Knöpfe aktivieren/deaktivieren
		document.getElementById("sbp2MTBtnTagNew").disabled = !this.tLSelectedOK;
		document.getElementById("sbp2MTBtnTagAdd").disabled = !( this.tLSelectedOK && this.tRSelectedOK );
		document.getElementById("sbp2MTBtnTagSub").disabled = !( this.tLSelectedOK && this.tRSelectedOK );
		document.getElementById("sbp2MTBtnTagDel").disabled = !this.tRSelectedOK;
		document.getElementById("sbp2MTBtnTagRen").disabled = !this.tRSelectedOne;
	},

	manageSort : function()
	{
	},

	mbUpdatePopup : function()
	{
		//Variablen Inhalt des Popup vor dem Anzeigen neu aufbauen, um aktuell zu bleiben
		//
		//Ablauf:
		//1. Popupobjekt bestimmen
		//2. Variable Einträge aus Popupobjekt entfernen
		//3. Neue Einträge am Listenanfang des Popupobjekt einfügen
		//4. Geöffnetes Buch hervorheben

		var mupDataPath = sbp2Prefs.getUnicharPref("extensions.scrapbookplus2.data.path");
		var mupIsDefault = false;
		if ( mupDataPath == "" ) mupIsDefault = true;
		//1. Popupobjekt bestimmen
		var mupPopup = document.getElementById("sbp2SidebarBSwitchMPopup");
		//2. Variable Einträge entfernen
		while ( mupPopup.childNodes.length>4 )
		{
			mupPopup.removeChild(mupPopup.firstChild);
		}
		//3. Neue Einträge am Listenanfang einfügen
		var mupItems = this.mbLoadMultibookTxt();
		for ( var mupI=mupItems.length-1; mupI>=0; mupI--)
		{
			var mupElt = document.getElementById("sbp2SidebarBSwitchMItem").cloneNode(false);
			mupPopup.insertBefore(mupElt, mupPopup.firstChild);
			mupElt.removeAttribute("id");
			mupElt.removeAttribute("hidden");
			mupElt.setAttribute("label", mupItems[mupI][0]);
			mupElt.setAttribute("path",  mupItems[mupI][1]);
		}
		//4. Geöffnetes Buch hervorheben
		if ( mupIsDefault ) {
			document.getElementById("sbp2SidebarBSwitchMItemDefault").setAttribute("checked", true);
		} else {
			var mupNodes = document.getElementById("sbp2SidebarBSwitchMPopup").childNodes;
			for ( var mupI=0; mupI<mupNodes.length; mupI++ )
			{
				if ( mupNodes[mupI].getAttribute("path") == mupDataPath ) {
					mupNodes[mupI].setAttribute("checked", true);
					break;
				}
			}
		}
	},

	mbLoadMultibookTxt : function()
	{
		//Läd multiple.txt und zeigt die gefundenen Einträge in sbp2MMBTree an
		//
		//Ablauf:
		//1. Dateiobjekt erstellen
		//2. Vorhandene Datei laden oder eine Leere erstellen
		//3. Rückgabe der gefundenen Datensätze an aufrufende Funktion

		//1. Dateiobjekt erstellen
		var lmtDatei = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
		lmtDatei.append("ScrapBookPlus2");
		lmtDatei.append("multibook.txt");
		//2. Vorhandene Datei laden oder eine Leere erstellen
		var lmtDatensaetze = [];
		if ( lmtDatei.exists() ) {
			//Inhalt lesen
			var lmtZeilen = sbp2Common.convertToUnicode(sbp2Common.fileRead(lmtDatei), "UTF-8").split("\n");
			//Datensätze erstellen
			for ( var lmtI=0; lmtI<lmtZeilen.length; lmtI++ )
			{
				var lmtDatensatz = lmtZeilen[lmtI].replace(/\r|\n/g,"").split("\t");
				if ( lmtDatensatz.length == 2 ) lmtDatensaetze.push(lmtDatensatz);
			}
		} else {
			//leere Datei anlegen
			lmtDatei.create(lmtDatei.NORMAL_FILE_TYPE, parseInt("0666", 8));
		}
		//3. Rückgabe der gefundenen Datensätze an aufrufende Funktion
		return lmtDatensaetze;
	},

	mbAdd : function()
	{
		//Legt ein neues ScrapBook im Auswahlmenü an. Zunächst wird ein Fenster geöffnet, damit Name und Speicherort für ein neues ScrapBook eingegeben werden können.
		//
		//Ablauf:
		//1. Fenster zur Angabe von Titel und Speicherort öffnen
		//2. Informationen verarbeiten, falls Fenster mit OK-Knopf geschlossen wurde
		//	3. Sicherstellen, dass durch die Aufnahme kein doppelter Eintrag existiert
		//	4. Eintrag aufnehmen, wenn zuvor keine Übereinstimmung gefunden wurde

		//1. Fenster zur Angabe von Titel und Speicherort öffnen
		var mbaRetVals = { name: "", folder: "", status: null };
		window.openDialog("chrome://scrapbookplus2/content/sbp2MBEdit.xul", "", "chrome,centerscreen,modal", mbaRetVals);
		//2. Informationen verarbeiten, falls Fenster mit OK-Knopf geschlossen wurde
		if ( mbaRetVals.status == 1 ) {
			if ( mbaRetVals.name == "" || mbaRetVals.folder == "" ) {
				//Einer der Werte wurde nicht gesetzt -> Fehler
				alert("sbp2Manage.mbAdd\n---\nFehler");
			} else {
				var mbaItems = this.mbDatensaetze;
				//3. Sicherstellen, dass durch die Aufnahme kein doppelter Eintrag existiert
				var mbaGefunden = 0;
				for ( var mbaI=0; mbaI<mbaItems.length; mbaI++ )
				{
					if ( mbaItems[mbaI][0] == mbaRetVals.name || mbaItems[mbaI][1] == mbaRetVals.folder ) {
						mbaGefunden = 1;
						mbaI = mbaItems.length;
					}
				}
				//4. Eintrag aufnehmen, wenn zuvor keine Übereinstimmung gefunden wurde
				if ( mbaGefunden == 0 ) {
					//Datensatz hinzufügen
					var mbaItem = [];
					mbaItem.push(mbaRetVals.name);
					mbaItem.push(mbaRetVals.folder);
					mbaItems.push(mbaItem);
					//Neuen Dateiinhalt aufbauen
					var mbaData = "";
					for ( var mbaI=0; mbaI<mbaItems.length; mbaI++ )
					{
						mbaData += mbaItems[mbaI][0]+"\t"+mbaItems[mbaI][1]+"\n";
					}
					//Dateiobjekt erstellen
					var mbaDatei = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
					mbaDatei.append("ScrapBookPlus2");
					mbaDatei.append("multibook.txt");
					//Datei aktualisieren
					sbp2Common.fileWrite(mbaDatei, mbaData, "UTF-8");
					//aktualisiere Ansicht
					var mbaTree = document.getElementById("sbp2MMBTree");
					for (var mbaI=0; mbaI<mbaTree.childNodes.length;mbaI++)
					{
						if (mbaTree.childNodes[mbaI].nodeName == "treechildren") {
							var aTchild = mbaTree.childNodes[mbaI];
							var aTrow = document.createElement("treerow");
							var aTcell0 = document.createElement("treecell");
							aTcell0.setAttribute("label", mbaRetVals.name);
							aTrow.appendChild(aTcell0);
							var aTcell1 = document.createElement("treecell");
							aTcell1.setAttribute("label", mbaRetVals.folder);
							aTrow.appendChild(aTcell1);
							var aTitem = document.createElement("treeitem");
							aTitem.appendChild(aTrow);
							aTchild.appendChild(aTitem);
							//Zustand der Sortierknöpfe anpassen
							this.mbTreeSortEnable();
						}
					}
				}
			}
		}
	},

	mbDel : function()
	{
		//Selektiertes ScrapBook aus Auswahlmenü entfernen
		//
		//Ablauf:
		//1. Treeobjekt bestimmen
		//2. Ein geöffnetes Buch kann nicht entfernt werden!
		//3. Sicherheitsabfrage (wirklich löschen?)
		//3a. Eintrag entfernen und Titel merken für Bereinigung der Datei multibook.txt

		//1. Treeobjekt bestimmen
		var mbdTree = document.getElementById("sbp2MMBTree");
		//2. Ein geöffnetes Buch kann nicht entfernt werden!
		var mbdStatus = "";
		for (var mbdI=0; mbdI<mbdTree.childNodes.length;mbdI++) {
			if (mbdTree.childNodes[mbdI].nodeName == "treechildren")
				mbdStatus = mbdTree.childNodes[mbdI].childNodes[mbdTree.view.selection.currentIndex].childNodes[0].childNodes[0].getAttribute("properties");
		}
		if ( mbdStatus == "active" ) {
			alert(document.getElementById("sbp2ManageString").getString("OPENBOOKERROR"));
			return;
		}
		//3. Sicherheitsabfrage (wirklich löschen?)
		if ( window.confirm(document.getElementById("sbp2CommonString").getString("QUESTION_DELETE_S")) ) {
			//3a. Eintrag entfernen und Titel merken für Bereinigung der Datei multibook.txt
			var mbdTitel = "";
			for (var mbdI=0; mbdI<mbdTree.childNodes.length;mbdI++) {
				if (mbdTree.childNodes[mbdI].nodeName == "treechildren") {
					mbdTitel = mbdTree.childNodes[mbdI].childNodes[mbdTree.view.selection.currentIndex].childNodes[0].childNodes[0].getAttribute("label");
					mbdTree.childNodes[mbdI].removeChild(mbdTree.childNodes[mbdI].childNodes[mbdTree.view.selection.currentIndex]);
				}
			}
			//4. multibook.txt aktualisieren
			var mbdItems = this.mbDatensaetze;
			for ( var mbdI=0; mbdI<mbdItems.length; mbdI++ ) {
				if ( mbdItems[mbdI][0] == mbdTitel ) {
					mbdItems.splice(mbdI,1);
					mbdI = mbdItems.length;
				}
			}
				//Neuen Dateiinhalt aufbauen
			var mbdData = "";
			for ( var mbdI=0; mbdI<mbdItems.length; mbdI++ ) {
				if ( mbdItems[mbdI][0] != mbdTitel ) mbdData += mbdItems[mbdI][0]+"\t"+mbdItems[mbdI][1]+"\n";
			}
				//Dateiobjekt erstellen
			var mbdDatei = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
			mbdDatei.append("ScrapBookPlus2");
			mbdDatei.append("multibook.txt");
				//Datei aktualisieren
			sbp2Common.fileWrite(mbdDatei, mbdData, "UTF-8");
				//Ansicht aktualisieren
			this.mbTreeSortEnable();
		}
	},

	mbEdit : function()
	{
		//Titel oder Speicherort von selektiertem ScrapBook anpassen. Die Werte von einem geöffnetem Buch können nicht angepasst werden.
		//
		//Ablauf:
		//1. Ein geöffnetes Buch kann nicht editiert werden!
		//2. Variablen initialisieren
		//3. Titel und Speicherord des selektierten Buchs bestimmen
		//3.1 Fenster zum Ändern der Werte öffnen

		//1. Ein geöffnetes Buch kann nicht editiert werden!
		var mbeStatus = "";
		var mbeTree = document.getElementById("sbp2MMBTree");
		for (var mbeI=0; mbeI<mbeTree.childNodes.length;mbeI++) {
			if (mbeTree.childNodes[mbeI].nodeName == "treechildren") {
				mbeStatus = mbeTree.childNodes[mbeI].childNodes[mbeTree.view.selection.currentIndex].childNodes[0].childNodes[0].getAttribute("properties");
			}
		}
		if ( mbeStatus == "active" ) {
			alert("Ein geöffnetes Buch kann nicht editiert werden!");
			return;
		}
		//2. Variablen initialisieren
		var mbeTree = document.getElementById("sbp2MMBTree");
		var mbeTitle = "";
		var mbePfad = "";
		//3. Titel und Speicherort des selektierten Buchs bestimmen
		for ( var mbeI=0; mbeI<mbeTree.childNodes.length; mbeI++ ) {
			if ( mbeTree.childNodes[mbeI].nodeName == "treechildren" ) {
				mbeTitle = mbeTree.childNodes[mbeI].childNodes[mbeTree.view.selection.currentIndex].childNodes[0].childNodes[0].getAttribute("label");
				mbePfad = mbeTree.childNodes[mbeI].childNodes[mbeTree.view.selection.currentIndex].childNodes[0].childNodes[1].getAttribute("label");
				//3.1 Fenster zum Ändern der Werte öffnen
				var mbeRetVals = { name: mbeTitle, folder: mbePfad, status: null };
				window.openDialog("chrome://scrapbookplus2/content/sbp2MBEdit.xul", "", "chrome,centerscreen,modal", mbeRetVals);
				//3.2 Werte für gewählten Eintrag aktualisieren, falls das Fenster mit "OK" geschlossen wurde
				if ( mbeRetVals.status == 1 ) {
					//Datensatz modifizieren
					var mbeData = "";
					for ( var mbeJ=0; mbeJ<this.mbDatensaetze.length; mbeJ++ )
					{
						if ( this.mbDatensaetze[mbeJ][0] == mbeTitle ) {
							this.mbDatensaetze[mbeJ][0] = mbeRetVals.name;
							this.mbDatensaetze[mbeJ][1] = mbeRetVals.folder;
						}
					}
					//Neuen Dateiinhalt aufbauen
					var mbeData = "";
					for ( var mbeJ=0; mbeJ<this.mbDatensaetze.length; mbeJ++ )
					{
						mbeData += this.mbDatensaetze[mbeJ][0]+"\t"+this.mbDatensaetze[mbeJ][1]+"\n";
					}
					//Dateiobjekt erstellen
					var mbeDatei = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
					mbeDatei.append("ScrapBookPlus2");
					mbeDatei.append("multibook.txt");
					//Datei aktualisieren
					sbp2Common.fileWrite(mbeDatei, mbeData, "UTF-8");
					//aktualisiere Ansicht
					mbeTree.childNodes[mbeI].childNodes[mbeTree.view.selection.currentIndex].childNodes[0].childNodes[0].setAttribute("label", mbeRetVals.name);
					mbeTree.childNodes[mbeI].childNodes[mbeTree.view.selection.currentIndex].childNodes[0].childNodes[1].setAttribute("label", mbeRetVals.folder);
				}
			}
		}
	},

	mbOnKeyPress : function(mbokpEvent)
	{
		//F2  -> Editieren des Eintrags
		//del -> Löschen des Eintrags

		if ( document.getElementById("sbp2MMBBtnEdit").disabled == false ) {
			switch ( mbokpEvent.keyCode )
			{
				case mbokpEvent.DOM_VK_F2:
				{
					this.mbEdit();
					break;
				}
				case mbokpEvent.DOM_VK_DELETE:
				{
					this.mbDel();
					break;
				}
			}
		}
	},

	mbSelected : function()
	{
		//Editieren bzw. Löschen eines selektierten Eintrags zulassen.
		if ( document.getElementById("sbp2MMBTree").view.selection.currentIndex > -1 ) {
			document.getElementById("sbp2MMBBtnEdit").disabled = false;
			document.getElementById("sbp2MMBBtnEdit").image = "chrome://scrapbookplus2/skin/manage_mbedit.png";
			document.getElementById("sbp2MMBBtnDel").disabled = false;
			document.getElementById("sbp2MMBBtnDel").image = "chrome://scrapbookplus2/skin/manage_mbdel.png";
		}
	},

	mbSort : function(mbsRichtung)
	{
		//Die Einträge im Auswahlmenü werden alphabetisch auf- bzw. absteigend sortiert
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Index des childNode bestimmen, der die Zeilen mit den Daten enthält
		//3. Eine Liste mit den Titeln sowie eine weitere mit der Reihenfolge der Titel erstellen
		//4. Einträge sortieren mit Bubble Sort
		//5. multibook.txt aktualisieren
		//6a. Inhalt des tree aktualisieren
		//6b. Symbol für Sortierrichtung aktualisieren

		//1. Variablen initialisieren
		var mbsItems = this.mbDatensaetze;
		var mbsReihenfolge = [];
		var mbsGetauscht = 0;
		var mbsTreeChildrenIndex = -1;
		//2. Index des childNode bestimmen, der die Zeilen mit den Daten enthält
		var mbsTree = document.getElementById("sbp2MMBTree");
		for ( var mbsI=0; mbsI<mbsTree.childNodes.length; mbsI++ ) {
			if ( mbsTree.childNodes[mbsI].nodeName == "treechildren" ) {
				mbsTreeChildrenIndex = mbsI;
				mbsI = mbsTree.childNodes.length;
			}
		}
		//3. Eine Liste mit den Titeln sowie eine weitere mit der Reihenfolge der Titel erstellen
		for ( var mbsI=0; mbsI<mbsItems.length; mbsI++ ) {
			mbsReihenfolge.push(mbsI);
		}
		//4. Einträge sortieren mit Bubble Sort
		var mbsAnzahl = mbsItems.length;
		if ( mbsRichtung == 0 ) {
			for ( var mbsI=0; mbsI<mbsItems.length-1; mbsI++ ) {
				mbsAnzahl--;
				for ( var mbsJ=0; mbsJ<mbsAnzahl; mbsJ++ ) {
					if ( mbsItems[mbsReihenfolge[mbsJ]][0] > mbsItems[mbsReihenfolge[mbsJ+1]][0] ) {
						mbsGetauscht = 1;
						var mbsTemp = mbsReihenfolge[mbsJ];
						mbsReihenfolge[mbsJ] = mbsReihenfolge[mbsJ+1];
						mbsReihenfolge[mbsJ+1] = mbsTemp;
					}
				}
			}
		} else {
			for ( var mbsI=0; mbsI<mbsItems.length-1; mbsI++ ) {
				mbsAnzahl--;
				for ( var mbsJ=0; mbsJ<mbsAnzahl; mbsJ++ ) {
					if ( mbsItems[mbsReihenfolge[mbsJ]][0] < mbsItems[mbsReihenfolge[mbsJ+1]][0] ) {
						mbsGetauscht = 1;
						var mbsTemp = mbsReihenfolge[mbsJ];
						mbsReihenfolge[mbsJ] = mbsReihenfolge[mbsJ+1];
						mbsReihenfolge[mbsJ+1] = mbsTemp;
					}
				}
			}
		}
		if ( mbsGetauscht == 1 ) {
			//5. multibookt.txt aktualisieren
				//Neuen Dateiinhalt aufbauen
			var mbsData = "";
			for ( var mbsI=0; mbsI<mbsItems.length; mbsI++ ) {
				mbsData += mbsItems[mbsReihenfolge[mbsI]][0]+"\t"+mbsItems[mbsReihenfolge[mbsI]][1]+"\n";
			}
				//Dateiobjekt erstellen
			var mbsDatei = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
			mbsDatei.append("ScrapBookPlus2");
			mbsDatei.append("multibook.txt");
				//Datei aktualisieren
			sbp2Common.fileWrite(mbsDatei, mbsData, "UTF-8");
			//6a. Inhalt des tree aktualisieren
			var mbsItemsSorted = [];
			for ( var mbsI=0; mbsI<mbsItems.length; mbsI++ ) {
				var mbsItem = [];
				mbsItem.push(mbsItems[mbsReihenfolge[mbsI]][0]);
				mbsItem.push(mbsItems[mbsReihenfolge[mbsI]][1]);
				mbsItemsSorted.push(mbsItem);
			}
			for ( var mbsI=0; mbsI<mbsItemsSorted.length; mbsI++ ) {
				mbsItems[mbsI][0] = mbsItemsSorted[mbsI][0];
				mbsItems[mbsI][1] = mbsItemsSorted[mbsI][1];
			}
			this.mbTreeUpdate(mbsItems);
		}
		//6b. Symbol für Sortierrichtung aktualisieren
		if ( mbsRichtung == 0 ) {
			document.getElementById("sbp2MMBColTitle").setAttribute("sortDirection", "ascending");
		} else {
			document.getElementById("sbp2MMBColTitle").setAttribute("sortDirection", "descending");
		}
	},

	mbTreeSortEnable : function()
	{
		//Erlaubt das Sortieren der Einträge, sofern mehr als ein Eintrag vorhanden ist
		if ( this.mbDatensaetze.length > 1 ) {
			document.getElementById("sbp2MMBBtnSortUp").disabled = false;
			document.getElementById("sbp2MMBBtnSortUp").image = "chrome://scrapbookplus2/skin/manage_sortup.png";
			document.getElementById("sbp2MMBBtnSortDown").disabled = false;
			document.getElementById("sbp2MMBBtnSortDown").image = "chrome://scrapbookplus2/skin/manage_sortdown.png";
		} else {
			document.getElementById("sbp2MMBBtnSortUp").disabled = true;
			document.getElementById("sbp2MMBBtnSortUp").image = "chrome://scrapbookplus2/skin/manage_sortup_dis.png";
			document.getElementById("sbp2MMBBtnSortDown").disabled = true;
			document.getElementById("sbp2MMBBtnSortDown").image = "chrome://scrapbookplus2/skin/manage_sortdown_dis.png";
		}
	},

	mbTreeUpdate : function(mbtuDatensaetze)
	{
		//Läd die übergebenen Datensätze in sbp2MMBTree
		//
		//Ablauf:
		//1. Treeobjekt bestimmen
		//2. Tree leeren
		//3. Datensätze in Tree einfügen

		//1. Treeobjekt bestimmen
		var mbtuTree = document.getElementById("sbp2MMBTree");
		//2. Tree leeren
		if ( mbtuTree.childNodes[1].nodeName != "treechildren" ) alert("Can't empty tree");
		for ( var mbtuI=mbtuTree.childNodes[1].childNodes.length-1; mbtuI>-1; mbtuI-- )
		{
			mbtuTree.childNodes[1].removeChild(mbtuTree.childNodes[1].childNodes[mbtuI]);
		}
		//3. Datensätze in Tree einfügen
		for ( var mbtuI=0; mbtuI<mbtuDatensaetze.length; mbtuI++ )
		{
			for ( var mbtuJ=0; mbtuJ<mbtuTree.childNodes.length; mbtuJ++ )
			{
				if ( mbtuTree.childNodes[mbtuJ].nodeName == "treechildren" ) {
					var mbtuTrow = document.createElement("treerow");
					var mbtuTcell0 = document.createElement("treecell");
					mbtuTcell0.setAttribute("label", mbtuDatensaetze[mbtuI][0]);
					var mbtuTcell1 = document.createElement("treecell");
					mbtuTcell1.setAttribute("label", mbtuDatensaetze[mbtuI][1]);
					if ( sbp2Prefs.getUnicharPref("extensions.scrapbookplus2.data.title","") == mbtuDatensaetze[mbtuI][0] ) {
						mbtuTcell0.setAttribute("properties", "active");
						mbtuTcell1.setAttribute("properties", "active");
					}
					mbtuTrow.appendChild(mbtuTcell0);
					mbtuTrow.appendChild(mbtuTcell1);
					var mbtuTitem = document.createElement("treeitem");
					mbtuTitem.appendChild(mbtuTrow);
					var mbtuTchild = mbtuTree.childNodes[mbtuJ];
					mbtuTchild.appendChild(mbtuTitem);
				}
			}
		}
	},

	selectAll : function()
	{
		//Alle Einträge im Tree auswählen
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. ID des fokusierten Tree-Elements bestimmen (saError -> true, falls kein Tree fokusiert ist)
		//3. alle Einträge im Tree auswählen, falls ein Tree fokusiert ist

		//1. Variablen initialisieren
		var saElement	= document.commandDispatcher.focusedElement;
if ( !saElement ) alert(saElement);
		var saElementID	= saElement.id;
		var saError		= false;
		var saTabIndex	= document.getElementById("sbp2MTabs").selectedIndex;
		//2. ID des fokusierten Tree-Elements bestimmen (saError -> true, falls kein Tree fokusiert ist)
		switch (saTabIndex)
		{
			case 0:
				saError = true; break;
			case 1:
				if ( saElementID != "sbp2MIETree1" && saElementID != "sbp2MIETree2" ) saError = true; break;
			case 2:
				if ( saElementID != "sbp2MTTree1" && saElementID != "sbp2MTTree2" ) saError = true; break;
			case 3:
				if ( saElementID != "sbp2MSTree" ) saError = true; break;
			case 4:
				if ( saElementID != "sbp2MMBTree" ) saError = true; break;
		}
		//3. alle Einträge im Tree auswählen, falls ein Tree fokusiert ist
		if ( !saError ) {
//			var saTree = document.getElementById(saElementID);
			saElement.view.selection.selectAll();
		}
	},

	statsCalculateSize : function(scsFolder)
	{
		//Bestimmt die Gesamtgröße aller Dateien im Verzeichnis und gibt die Summe an die aufrufende Funktion zurück.
		//
		//Ablauf
		//1. Variablen initialisieren
		//2. Größe der Dateien im Verzeichnis zusammenzählen
		//3. Rückgabe der Gesamtgröße in Byte an aufrufende Funktion

		//1. Variablen initialisieren
		var scsDatasize = 0;
		//2. Größe der Dateien im Verzeichnis zusammenzählen
		try
		{
			var scsFolderEnum = scsFolder.directoryEntries;
			while ( scsFolderEnum.hasMoreElements() )
			{
				var scsFile = scsFolderEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
				scsDatasize += scsFile.fileSize;
			}
		} catch(scsEx)
		{
			alert("sbp2Manage.statsCalculateSize\n---\n"+scsEx);
		}
		//3. Rückgabe der Gesamtgröße in Byte an aufrufende Funktion
		return scsDatasize;
	},

	statsDirectoryShow : function()
	{
		//Zeigt den Inhalt eines Verzeichnises im Dateimanager des Betriebssystems an
		//
		//Ablauf:
		//1. ScrapBook-Verzeichnis bestimmen
		//2. selektierten Eintrag bestimmen
		//3. Verzeichnis anzeigen

		//1. Variablen initialisieren
		var sdsDirectory	= sbp2Common.getBuchVZ();
		sdsDirectory.append("data");
		var sdsTree			= document.getElementById("sbp2MSTree");
		var sdsStart        = new Object();
		var sdsEnd          = new Object();
		//2. selektierten Eintrag bestimmen
		sdsTree.view.selection.getRangeAt(0, sdsStart, sdsEnd);
		sdsDirectory.append(this.statsItems[this.statsItemsSorted[sdsStart.value]].id);
		//3. Verzeichnis anzeigen
		try
		{
			sdsDirectory = sdsDirectory.QueryInterface(Components.interfaces.nsILocalFile);
			sdsDirectory.launch();
		} catch(dsEx)
		{
			alert("sbp2Manage.statsDirectoryShow\n---\n"+dsEx);
		}
	},

	statsSizeFormat : function(ssfSize, ssfIdx)
	{
		//ssfString umrechnen und aufrunden (kB auf ganze Zahl, MB mit zwei Nachkommastellen)
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. ssfGroesse umrechnen in gewünschte Einheit
		//3. Anhängen der Nachkommastellen
		//4. Übergabe von ssfString an aufrufende Funktion

		//1. Variablen initialisieren
		var ssfUnit = new Array("B","kB","MB");
		var ssfUnitNr = 0;
		//2. ssfGroesse umrechnen in gewünschte Einheit
		if ( ssfSize == -1 ) return -1;
		switch (ssfIdx)
		{
			case 0:
				if (ssfSize>(1024*1024) ) {
					ssfUnitNr=2;
					ssfSize=ssfSize/(1024*1024);
				} else if ( ssfSize>1024 ) {
					ssfUnitNr=1;
					ssfSize=ssfSize/1024;
				}
				break;
			case 1:
				ssfUnitNr=0;
				break;
			default:
				break;
		}
		//3. Anhängen der Nachkommastellen
		var ssfString;
		if ( ssfUnitNr == 2 ) {
			ssfString = (Math.round(ssfSize * 100) / 100).toString();
			ssfString += (ssfString.indexOf(".") == -1 ? ".00" : "00" );
			ssfString = ssfString.substring(0, ssfString.indexOf(".") + 3);
		} else {
			ssfString = (Math.round(ssfSize)).toString();
		}
		ssfString = ssfString.concat(" "+ssfUnit[ssfUnitNr]);
		//4. Übergabe von ssfString an aufrufende Funktion
		return ssfString;
	},

	statsRepair : function()
	{
		//Löscht leere Verzeichnisse
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Verzeichnis auf Datenträger löschen
		//3. Einträge im Tree löschen
		//4. Eintrgäe für gelöschte Verzeichnisse aus this.statsItemsSorted entfernen
		//5. Variablen zurücksetzen

		if ( this.statsItemsDirEmpty>0 ) {
			//1. Variablen initialisieren
			var srDir = sbp2Common.getBuchVZ();
			srDir.append("data");
			var srItemsDeletedNr = [];
			var srTempItemsSorted = [];
			var srTree = document.getElementById("sbp2MSTree");
			if ( srTree.childNodes[1].nodeName != "treechildren" ) {
				alert("sbp2Manage.statsRepair\n---\n\nCan't empty tree");
				return;
			}
			//2. Verzeichnis auf Datenträger löschen
			for ( var srI=0; srI<this.statsItemsSorted.length; srI++ )
			{
				//leeres Verzeichnis, Informationen im Speicher löschen
				if (this.statsItems[this.statsItemsSorted[srI]].diagnostics == 3 ) {
					var srFile = srDir.clone();
					srFile.append(this.statsItems[this.statsItemsSorted[srI]].id);
					//Verzeichnis wird nicht über sbp2Common.directoryRemove gelöscht, da es wirklich leer ist.
//					srFile.remove(false);
					//
					srItemsDeletedNr.push(srI);
				}
			}
			//3. Einträge im Tree löschen
			for ( var srI=srItemsDeletedNr.length-1; srI>=0; srI-- )
			{
				srTree.childNodes[1].removeChild(srTree.childNodes[1].childNodes[srItemsDeletedNr[srI]]);
			}
			//4. Eintrgäe für gelöschte Verzeichnisse aus this.statsItemsSorted entfernen
			var srNr = 0;
			for ( var srI=0; srI<this.statsItemsSorted.length; srI++ )
			{
				if ( this.statsItemsSorted[srI] == srItemsDeletedNr[srNr] ) {
					srNr++;
				} else {
					srTempItemsSorted.push(this.statsItemsSorted[srI]);
				}
			}
			this.statsItemsSorted = [];
			for ( var srI=0; srI<srTempItemsSorted.length; srI++ )
			{
				this.statsItemsSorted.push(srTempItemsSorted[srI]);
			}
			//5. Variablen zurücksetzen
			this.statsItemsDirEmpty = 0;
		}
	},

	statsSort : function(ssColumn)
	{
		//Sortiert die Einträge im sbp2MSTree
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Neue Sortierreihenfolge festlegen
		//3. Daten sortieren (es wird nur sbp2Manage.statsItemsSorted sortiert)
		//4. Tree leeren
		//5. Datensätze in Tree einfügen
		//6. alten Spaltenindikator entfernen
		//7. neuen Spaltenindikator einfügen
		//8. alten Treeindikator entfernen

		//1. Variablen initialisieren
		var ssTree				= document.getElementById("sbp2MSTree");
		var ssColumnIDNew		= ssColumn.id;
		var ssColumnIDOld		= ssTree.getAttribute("sortResource");
		var ssOrder				= -1;											// 0=ascending, 1=descending
		var ssTemp				= -1;
		//2. Neue Sortierreihenfolge festlegen
		if ( ssColumnIDNew == ssColumnIDOld ) {
			ssOrder = ssTree.getAttribute("sortDirection") == "ascending" ? 1 : 0;
		} else {
			ssOrder = 0;
		}
		//3. Daten sortieren
		if ( ssOrder == 0 ) {
			for ( var ssI=0; ssI<sbp2Manage.statsItemsSorted.length-1; ssI++ )
			{
				for ( var ssJ=0; ssJ<sbp2Manage.statsItemsSorted.length-1; ssJ++ )
				{
					if ( ssColumnIDNew == "sbp2MSColTitle" ) {
						if ( sbp2Manage.statsItems[sbp2Manage.statsItemsSorted[ssJ]].title > sbp2Manage.statsItems[sbp2Manage.statsItemsSorted[ssJ+1]].title ) {
							ssTemp = sbp2Manage.statsItemsSorted[ssJ];
							sbp2Manage.statsItemsSorted[ssJ] = sbp2Manage.statsItemsSorted[ssJ+1];
							sbp2Manage.statsItemsSorted[ssJ+1] = ssTemp;
						}
					} else if ( ssColumnIDNew == "sbp2MSColSize" ) {
						if ( sbp2Manage.statsItems[sbp2Manage.statsItemsSorted[ssJ]].space > sbp2Manage.statsItems[sbp2Manage.statsItemsSorted[ssJ+1]].space ) {
							ssTemp = sbp2Manage.statsItemsSorted[ssJ];
							sbp2Manage.statsItemsSorted[ssJ] = sbp2Manage.statsItemsSorted[ssJ+1];
							sbp2Manage.statsItemsSorted[ssJ+1] = ssTemp;
						}
					} else if ( ssColumnIDNew == "sbp2MSColState" ) {
						if ( sbp2Manage.statsItems[sbp2Manage.statsItemsSorted[ssJ]].diagnostics > sbp2Manage.statsItems[sbp2Manage.statsItemsSorted[ssJ+1]].diagnostics ) {
							ssTemp = sbp2Manage.statsItemsSorted[ssJ];
							sbp2Manage.statsItemsSorted[ssJ] = sbp2Manage.statsItemsSorted[ssJ+1];
							sbp2Manage.statsItemsSorted[ssJ+1] = ssTemp;
						}
					}
				}
			}
		} else {
			for ( var ssI=0; ssI<sbp2Manage.statsItemsSorted.length-1; ssI++ )
			{
				for ( var ssJ=0; ssJ<sbp2Manage.statsItemsSorted.length-1; ssJ++ )
				{
					if ( ssColumnIDNew == "sbp2MSColTitle" ) {
						if ( sbp2Manage.statsItems[sbp2Manage.statsItemsSorted[ssJ]].title < sbp2Manage.statsItems[sbp2Manage.statsItemsSorted[ssJ+1]].title ) {
							ssTemp = sbp2Manage.statsItemsSorted[ssJ];
							sbp2Manage.statsItemsSorted[ssJ] = sbp2Manage.statsItemsSorted[ssJ+1];
							sbp2Manage.statsItemsSorted[ssJ+1] = ssTemp;
						}
					} else if ( ssColumnIDNew == "sbp2MSColSize" ) {
						if ( sbp2Manage.statsItems[sbp2Manage.statsItemsSorted[ssJ]].space < sbp2Manage.statsItems[sbp2Manage.statsItemsSorted[ssJ+1]].space ) {
							ssTemp = sbp2Manage.statsItemsSorted[ssJ];
							sbp2Manage.statsItemsSorted[ssJ] = sbp2Manage.statsItemsSorted[ssJ+1];
							sbp2Manage.statsItemsSorted[ssJ+1] = ssTemp;
						}
					} else if ( ssColumnIDNew == "sbp2MSColState" ) {
						if ( sbp2Manage.statsItems[sbp2Manage.statsItemsSorted[ssJ]].diagnostics < sbp2Manage.statsItems[sbp2Manage.statsItemsSorted[ssJ+1]].diagnostics ) {
							ssTemp = sbp2Manage.statsItemsSorted[ssJ];
							sbp2Manage.statsItemsSorted[ssJ] = sbp2Manage.statsItemsSorted[ssJ+1];
							sbp2Manage.statsItemsSorted[ssJ+1] = ssTemp;
						}
					}
				}
			}
		}
		//4. Tree leeren
		if ( ssTree.childNodes[1].nodeName != "treechildren" ) {
			alert("Can't empty tree");
			return;
		}
		for ( var ssI=ssTree.childNodes[1].childNodes.length-1; ssI>-1; ssI-- )
		{
			ssTree.childNodes[1].removeChild(ssTree.childNodes[1].childNodes[ssI]);
		}
		//5. Datensätze in Tree einfügen
		for ( var ssI=0; ssI<this.statsItems.length; ssI++ )
		{
			var ssTrow = document.createElement("treerow");
			var ssTcell0 = document.createElement("treecell");
			var ssIcon = sbp2Manage.statsItems[this.statsItemsSorted[ssI]].icon;
			if ( ssIcon.match(/^(http|chrome|moz-icon)/i) ) {
				ssTcell0.setAttribute("src", ssIcon);
			} else {
				var ssDir = sbp2Common.getBuchVZ();
				ssDir.append("data");
				ssDir.append(sbp2Manage.statsItems[this.statsItemsSorted[ssI]].id);
				var ssIconFile = ssDir;
				if ( ssIcon.match(/^resource/) ) {
					var ssSplit = ssIcon.split("\/");
					ssIconFile.append(ssSplit[ssSplit.length-1]);
				} else if ( ssIcon.match(/^data/) ) {
					//nichts machen und ssIcon in der folgenden Abfrage als src angeben
				} else {
					ssIconFile.append(ssIcon);
				}
				if ( ssIconFile.exists() && !ssIconFile.isDirectory() ) {
					var ssIconFileDirName = ssIconFile.path;
					ssIconFileDirName = ssIconFileDirName.replace(/\\/gi, "/");
					ssIconFileDirName = "file:///"+ssIconFileDirName;
					ssTcell0.setAttribute("src", ssIconFileDirName);
				} else if ( ssIcon.match(/^data/) ) {
					ssTcell0.setAttribute("src", ssIcon);
				} else if ( sbp2Manage.statsItems[this.statsItemsSorted[ssI]].type == "note" ) {
					ssTcell0.setAttribute("src", "chrome://scrapbookplus2/skin/treenote.png");
				} else {
					ssTcell0.setAttribute("src", "chrome://mozapps/skin/places/defaultFavicon.png");
				}
			}
			ssTcell0.setAttribute("label", sbp2Manage.statsItems[this.statsItemsSorted[ssI]].title);
			ssTcell0.setAttribute("properties", sbp2Manage.statsItems[this.statsItemsSorted[ssI]].type);
			var ssTcell1 = document.createElement("treecell");
			ssTcell1.setAttribute("label", this.statsSizeFormat(sbp2Manage.statsItems[this.statsItemsSorted[ssI]].space, 0));	//Autowert
			var ssTcell2 = document.createElement("treecell");
			ssTcell2.setAttribute("label", this.statsSizeFormat(sbp2Manage.statsItems[this.statsItemsSorted[ssI]].space, 1));	//Bytes
			var ssTcell3 = document.createElement("treecell");
			ssTcell3.setAttribute("label", this.statsDiagnostics[sbp2Manage.statsItems[this.statsItemsSorted[ssI]].diagnostics]);
			ssTrow.appendChild(ssTcell0);
			ssTrow.appendChild(ssTcell1);
			ssTrow.appendChild(ssTcell2);
			ssTrow.appendChild(ssTcell3);
			var ssTitem = document.createElement("treeitem");
			ssTitem.appendChild(ssTrow);
			var ssTchild = ssTree.childNodes[1];
			ssTchild.appendChild(ssTitem);
		}
		//6. alten Spaltenindikator entfernen
		if ( ssColumnIDOld ) document.getElementById(ssColumnIDOld).removeAttribute("sortDirection");
		//7. neuen Spaltenindikator einfügen
		document.getElementById(ssColumn.id).setAttribute("sortDirection", ssOrder == 0 ? "ascending" : "descending");
		//8. alten Treeindikator entfernen
		ssTree.setAttribute("sortDirection", ssOrder == 0 ? "ascending" : "descending");
		ssTree.setAttribute("sortResource", ssColumn.id);
	},

	statsUpdate : function()
	{
//wird nur von sbp2Manage.mainChangeTab aufgerufen
		//Sammelt Informationen
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Resources aller Einträge ohne Ordner (aber mit Ordnerinhalten) sammeln
		//3. Informationen zu Unterverzeichnissen im data-Verzeichnis sammeln
		//4. Daten der Resources mit denen der Unterverzeichnisse zusammenführen
		//5. Daten von nicht "sichtbaren" RDF-Einträgen sammeln
		//6. Treeobjekt bestimmen
		//7. Tree leeren
		//8. Datensätze in Tree einfügen
		//9. Spaltensortierung zurücksetzen
		//
		//Anmerkung:
		//diagnostics kann Werte von 0-4 annehmen
		//0 -> alles ok
		//1 -> Verzeichnis mit index.dat, jedoch nicht sichtbar
		//2 -> Verzeichnis ohne index.dat -> kaputter Inhalt
		//3 -> leeres Verzeichnis (immer löschen inkl. eventuell vorhandener RDF-Einträge)
		//4 -> fehlerhafter RDF-Eintrag (keine Dateien oder nur RDF-Container-Eintrag)

if ( !sbp2DataSource.dbData ) {
	alert("sbp2DataSource.dbData nicht geladen")
	return;
}
		//1. Variablen initialisieren
		this.statsItems			= [];
		this.statsItemsDirEmpty = 0;
		this.statsItemsSorted	= [];
		this.statsDirectories	= [];
		var suFound				= 0;
		var suData				= sbp2DataSource.dbData;
		var suResListe			= null;
		var suDirTemp			= sbp2Common.getBuchVZ();
		suDirTemp.append("data");
		//2. Resources aller Einträge ohne Ordner (aber mit Ordnerinhalten) sammeln
		suResListe = sbp2DataSource.dsGetResources(suData, sbp2Common.RDF.GetResource("urn:scrapbook:root"), 1, true);
		//3. Informationen zu Unterverzeichnissen im data-Verzeichnis sammeln
		var suDirTempEnum = suDirTemp.directoryEntries;
		while ( suDirTempEnum.hasMoreElements() )
		{
			var suDirectory = { title: "", id: "", type: "", icon: "", res: 0, space: 0, diagnostics: -1 };
			var suDir = suDirTempEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
			var suFile = suDir.clone();
			suFile.append("index.dat");
			//Daten aus index.dat auslesen
			suDirectory.id = suDir.leafName;
			suDirectory.space = this.statsCalculateSize(suDir);
			if ( suFile.exists() ) {
				var suContent = sbp2Common.fileReadIndexDat(suFile);
				suDirectory.title = suContent.title;
				suDirectory.id = suContent.id;
				suDirectory.type = suContent.type;
				suDirectory.icon = suContent.icon;
				suDirectory.diagnostics = 1;
			} else {
				if ( suDirectory.space > 0 ) {
					suDirectory.diagnostics = 2;
				} else {
					suDirectory.diagnostics = 3;
					this.statsItemsDirEmpty++;
				}
			}
			//Daten merken
			this.statsDirectories.push(suDirectory);
		}
		//4. Daten der Resources mit denen der Unterverzeichnisse zusammenführen
		for ( var suI=0; suI<suResListe.length; suI++ )
		{
			//Daten von Resource sammeln
			var suItem = { title: "", id: "", type: "", icon: "", folder: "", foldernr: -1, space: -1, wastedspace: 0, container: null, diagnostics: -1 };
			suItem.title = sbp2DataSource.propertyGet(suData, suResListe[suI], "title");
			suItem.id = sbp2DataSource.propertyGet(suData, suResListe[suI], "id");
			suItem.type = sbp2DataSource.propertyGet(suData, suResListe[suI], "type");
			suItem.icon = sbp2DataSource.propertyGet(suData, suResListe[suI], "icon");
			//dazugehörendes Verzeichnis suchen
			if ( suItem.type == "" || suItem.type == "note" || suItem.type == "site" ) {
				suFound = 0;
				for ( var suJ=0; suJ<this.statsDirectories.length; suJ++ )
				{
					if ( suItem.id == this.statsDirectories[suJ].id ) {
						this.statsDirectories[suJ].res = 1;		//<- Verzeichnis hat Resource, verbleibt Wert bei 0 wurde keine Resource gefunden
						suFound = 1;
						suItem.foldernr = suJ;
						suItem.space = this.statsDirectories[suJ].space;
						this.statsDirectories[suJ].diagnostics = 0;
						suItem.diagnostics = 0;
						suJ = this.statsDirectories.length;
					}
				}
				if ( suFound == 0 ) alert("Fehler");
			} else if ( suItem.type == "bookmark" ) {
				suItem.diagnostics = 0;
			} else {
alert(suItem.title+" - "+suItem.type);
			}
			//Daten merken
if ( suI != this.statsItems.length ) alert("Fehler");
			this.statsItemsSorted.push(this.statsItems.length);
			this.statsItems.push(suItem);
		}
		//5. Daten von nicht "sichtbaren" RDF-Einträgen sammeln
		for ( var suI=0; suI<this.statsDirectories.length; suI++ )
		{
			if ( this.statsDirectories[suI].res == 0 ) {
				var suItem = { title: "", id: "", type: "", icon: "", folder: "", foldernr: -1, space: -1, wastedspace: 0, container: null, diagnostics: -1 };
				//Daten sammeln
				suItem.foldernr = suI;
				suItem.id = this.statsDirectories[suI].id;
				suItem.space = this.statsDirectories[suI].space;
				suItem.diagnostics = this.statsDirectories[suI].diagnostics;
				//Daten merken
				this.statsItemsSorted.push(this.statsItems.length);
				this.statsItems.push(suItem);
			}
		}
		//6. Treeobjekt bestimmen
		var suTree = document.getElementById("sbp2MSTree");
		//7. Tree leeren
		if ( suTree.childNodes[1].nodeName != "treechildren" ) alert("Can't empty tree");
		for ( var suI=suTree.childNodes[1].childNodes.length-1; suI>-1; suI-- )
		{
			suTree.childNodes[1].removeChild(suTree.childNodes[1].childNodes[suI]);
		}
		//8. Datensätze in Tree einfügen
		for ( var suI=0; suI<this.statsItems.length; suI++ )
		{
			for ( var suJ=0; suJ<suTree.childNodes.length; suJ++ )
			{
				if ( suTree.childNodes[suJ].nodeName == "treechildren" ) {
					var suTrow = document.createElement("treerow");
					var suTcell0 = document.createElement("treecell");
					var suIcon = sbp2Manage.statsItems[suI].icon;
					if ( suIcon.match(/^(http|chrome|moz-icon)/i) ) {
						suTcell0.setAttribute("src", suIcon);
					} else {
						var suDir = sbp2Common.getBuchVZ();
						suDir.append("data");
						suDir.append(sbp2Manage.statsItems[suI].id);
						var suIconFile = suDir;
						if ( suIcon.match(/^resource/) ) {
							var suSplit = suIcon.split("\/");
							suIconFile.append(suSplit[suSplit.length-1]);
						} else if ( suIcon.match(/^data/) ) {
							//nichts machen und suIcon in der folgenden Abfrage als src angeben
						} else {
							suIconFile.append(suIcon);
						}
						if ( suIconFile.exists() && !suIconFile.isDirectory() ) {
							var suIconFileDirName = suIconFile.path;
							suIconFileDirName = suIconFileDirName.replace(/\\/gi, "/");
							suIconFileDirName = "file:///"+suIconFileDirName;
							suTcell0.setAttribute("src", suIconFileDirName);
						} else if ( suIcon.match(/^data/) ) {
							suTcell0.setAttribute("src", suIcon);
						} else if ( sbp2Manage.statsItems[suI].type == "note" ) {
							suTcell0.setAttribute("src", "chrome://scrapbookplus2/skin/treenote.png");
						} else {
							suTcell0.setAttribute("src", "chrome://mozapps/skin/places/defaultFavicon.png");
						}
					}
					suTcell0.setAttribute("label", sbp2Manage.statsItems[suI].title);
					suTcell0.setAttribute("properties", sbp2Manage.statsItems[suI].type);
					var suTcell1 = document.createElement("treecell");
					suTcell1.setAttribute("label", this.statsSizeFormat(sbp2Manage.statsItems[suI].space, 0));	//Autowert
					var suTcell2 = document.createElement("treecell");
					suTcell2.setAttribute("label", this.statsSizeFormat(sbp2Manage.statsItems[suI].space, 1));	//Bytes
					var suTcell3 = document.createElement("treecell");
					suTcell3.setAttribute("label", this.statsDiagnostics[sbp2Manage.statsItems[suI].diagnostics]);
					suTrow.appendChild(suTcell0);
					suTrow.appendChild(suTcell1);
					suTrow.appendChild(suTcell2);
					suTrow.appendChild(suTcell3);
					var suTitem = document.createElement("treeitem");
					suTitem.appendChild(suTrow);
					var suTchild = suTree.childNodes[suJ];
					suTchild.appendChild(suTitem);
				}
			}
		}
		//9. Spaltensortierung zurücksetzen
		suTree.removeAttribute("sortResource");
		suTree.removeAttribute("sortDirection");
		document.getElementById("sbp2MSColTitle").removeAttribute("sortDirection");
		document.getElementById("sbp2MSColSize").removeAttribute("sortDirection");
		document.getElementById("sbp2MSColSizeB").removeAttribute("sortDirection");
		document.getElementById("sbp2MSColState").removeAttribute("sortDirection");
	},

}