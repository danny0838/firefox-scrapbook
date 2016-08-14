
var sbp2DataSource = {

	dbData					: null,
	dbDataSearch			: null,	//nur temporär, um Ergebnisse prüfen zu können; später durch in-memory-ds ersetzen
	dbDataSearchCache		: null,
	dbDataSearchCacheUpdate	: null,
	dbDataTag				: null,

	checkFolderExists : function(cfeData, cfeContParentRes, cfeFolderName)
	{
		//Sucht in cfeData im Container cfeContParentRes nach einem Verzeichnis (type: folder) mit dem Namen cfeFolderName
		//Liefert bei Fund die Resource des Containers zurück.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Prüfen, ob einer der Einträge des Containers cfeContParent dem gesuchten Verzeichnis entspricht
		//3. Resource oder null wird zurück gegeben

		//1. Variablen initialisieren
		var cfeRRes = null;
		var cfeContParent = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		cfeContParent.Init(cfeData, cfeContParentRes);
		//2. Prüfen, ob einer der Einträge des Containers cfeContParent dem gesuchten Verzeichnis entspricht
		var cfeContParentEnum = cfeContParent.GetElements();
		while ( cfeContParentEnum.hasMoreElements() )
		{
			//Resource bestimmen
			var cfeRes  = cfeContParentEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			//Titel der Resource bestimmen
			var cfeTitel = this.propertyGet(cfeData, cfeRes, "title");
			if ( cfeTitel == cfeFolderName ) {
				var cfeType = this.propertyGet(cfeData, cfeRes, "type");
				if ( cfeType == "folder" ) {
					cfeRRes = cfeRes;
					break;
				}
			}
		}
		//3. Resource oder null wird zurück gegeben
		return cfeRRes;
	},

	containerGetAllContainers : function(cgacData, cgacContRes, cgacContResList, cgacRecursive)
	{
		//Die Funktion ermittelt alle Container im übergebenen Container. Ist cgacRecursive gesetzt, werden auch die gefundenen Container verarbeitet.
		//
		//Ablauf:
		//1.
		//2.
		//3.

		//1.
		var cgacCont = Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer);
		cgacCont.Init(cgacData, cgacContRes);
		//2. 
		var cgacContEnum = cgacCont.GetElements();
		//3. 
		while ( cgacContEnum.hasMoreElements() )
		{
			//Resource bestimmen
			var cgacRes = cgacContEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			//Stammt die gefundene Resource von einem Container, wird dieser aufgenommen
			if ( sbp2Common.RDFCU.IsContainer(cgacData, cgacRes) ) {
				cgacContResList.push(cgacRes);
				if ( cgacRecursive ) this.containerGetAllContainers(cgacData, cgacRes, cgacContResList, cgacRecursive);
			}
		}
	},

	containerGetAllItems : function(cgaiData, cgaiContRes, cgaiResList, cgaiRecursive)
	{
		//Die Funktion ermittelt alle Einträge im übergebenen Container. Ist cgaiRecursive gesetzt, werden auch die gefundenen Container verarbeitet.
		//
		//Ablauf:
		//1.
		//2.
		//3.

		//1.
		var cgaiCont = Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer);
		cgaiCont.Init(cgaiData, cgaiContRes);
		//2.
		var cgaiContEnum = cgaiCont.GetElements();
		//3.
		while ( cgaiContEnum.hasMoreElements() )
		{
			//Resource bestimmen
			var cgaiRes = cgaiContEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			//Stammt die gefundene Resource von einem Container, wird dieser aufgenommen
			if ( sbp2Common.RDFCU.IsContainer(cgaiData, cgaiRes) ) {
				if ( cgaiRecursive ) this.containerGetAllContainers(cgaiData, cgaiRes, cgaiResList, cgaiRecursive);
			} else {
				cgaiResList.push(cgaiRes);
			}
		}
	},

	containerGetAll : function(cgaData, cgaContParentRes, cgaListe, cgaListeCont, cgaOnlyCont)
	{
		//Diese Funktion erstellt eine Liste, die sämtliche Resources vom Typ Container enthält.
		//
		//Nimmt alle Resources/Container innerhalb des Containers cgaContParentRes in cgaListe auf. 
		//Die Resource des Containers, in dem sich die Resource befindet, wird in cgaListeCont vermerkt.
		//Ist cgaOnlyCont gesetzt, werden auch die Container in cgaContParentRes weiterberarbeitet.
		//
		//Ablauf:
		//1.

		//1.
		var cgaContParent = Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer);
		cgaContParent.Init(cgaData, cgaContParentRes);
		//2. 
		var cgaContParentEnum = cgaContParent.GetElements();
		//3. 
		while ( cgaContParentEnum.hasMoreElements() )
		{
			//Resource bestimmen
			var cgaRes = cgaContParentEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( !cgaOnlyCont ) {
				cgaListe.push(cgaRes);
				cgaListeCont.push(cgaContParentRes);
			}
			//Ein Container und dessen Inhalt muss sofort aufgenommen werden
			if ( sbp2Common.RDFCU.IsContainer(cgaData, cgaRes) ) {
				if ( cgaOnlyCont ) {
					cgaListe.push(cgaRes);
					cgaListeCont.push(cgaContParentRes);
				}
				this.containerGetAll(cgaData, cgaRes, cgaListe, cgaListeCont, cgaOnlyCont);
			}
		}
	},

	containerRemoveAllEntries : function(craeData, craeContResString, craeFlush)
	{
		//Entfernt alle Einträge des Containers
		//
		//Ablauf:
		//1. Container initialisieren
		//2. Resources entfernen
		//3. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)

		//1. Container initialisieren
		var craeContParentRes = sbp2Common.RDF.GetResource(craeContResString);
		var craeContParent = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		craeContParent.Init(craeData, craeContParentRes);
		//2. Resources entfernen
		var craeResEnum = craeData.GetAllResources();
		while ( craeResEnum.hasMoreElements() )
		{
			var craeRes = craeResEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( craeRes.Value != craeContResString ) {
				//2a. Aus Container entfernen
				craeContParent.RemoveElement(craeRes, true);
				//2b. Unterpunkte entfernen
				var craeNames = craeData.ArcLabelsOut(craeRes);
				while ( craeNames.hasMoreElements() )
				{
					try
					{
						var craeName  = craeNames.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
						var craeValue = craeData.GetTarget(craeRes, craeName, true);
						craeData.Unassert(craeRes, craeName, craeValue);
					} catch(craeEx)
					{
						alert("sbp2DataSource.containerRemoveAllEntries\n---\n"+craeEx);
					}
				}
			}
		}
		//3. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		if ( craeFlush ) this.dsFlush(craeData);
	},

	dsCreateEmptySeq : function(dcesData, dcesRes)
	{
		//Erstellt einen leeren Container innerhalb der RDF-Datenquelle
		sbp2Common.RDFCU.MakeSeq(dcesData, dcesRes);
	},

	dsFlush : function(dfData)
	{
		//Aktualisiert den Inhalt einer RDF-DataSource auf der Platte
		dfData.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
	},

	dsGetResources : function(dsgrData, dsgrContRes, dsgrMode, dsgrRekursiv)
	{
		//Gibt eine Liste mit Resourcen der Einträge zurück. Die Resource von Verzeichnissen wird nur im Modus 2 aufgenommen, die Inhalte von
		//Verzeichnissen immer.
		//
		//dsgrMode:
		//1 -> keine Verzeichnisse aufnehmen 
		//2 -> nur Verzeichnisse aufnehmen
		var dsgrResListe = [];
		sbp2Common.RDFC.Init(dsgrData, dsgrContRes);
		var dsgrResEnum = sbp2Common.RDFC.GetElements();
		while ( dsgrResEnum.hasMoreElements() )
		{
			var dsgrRes = dsgrResEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			var dsgrType = this.propertyGet(dsgrData, dsgrRes, "type");
			if ( dsgrType == "folder" )
			{
				if ( dsgrMode == 2 ) dsgrResListe.push(dsgrRes);
				if ( dsgrRekursiv ) dsgrResListe = dsgrResListe.concat(this.dsGetResources(dsgrData, dsgrRes, dsgrMode, dsgrRekursiv));
			} else if ( dsgrType != "separator" ) {
				if ( dsgrMode == 1 ) dsgrResListe.push(dsgrRes);
			}
		}
		return dsgrResListe;
	},

	dsRemoveFromTree : function(drftTree)
	{
		//Alle Datenquellen des Objekts entfernen
		//
		//Ablauf:
		//1. Verbundene Datenquellen bestimmen
		//2. Gefundene Datenquellen entfernen

if ( !drftTree ) {
	alert("sbp2DataSource.dsRemoveFromTree\n---\nNo tree object given. Contact the developer.");
	return;
}
		//1. Verbundene Datenquellen bestimmen
		var drftEnum = drftTree.database.GetDataSources();
		//2. Gefundene Datenquellen entfernen
		while ( drftEnum.hasMoreElements() )
		{
			var drftDS = drftEnum.getNext().QueryInterface(Components.interfaces.nsIRDFDataSource);
			drftTree.database.RemoveDataSource(drftDS);
		}
	},

	propertyGet : function(pgData, pgRes, pgProp)
	{
		//Liefert den Wert für pgProp der Resource pgRes zurück. Existiert pgRes noch nicht, wird "" zurückgeliefert.
		if ( pgRes.Value == "urn:scrapbook:root" ) return "";
		try
		{
			var pgRetVal = pgData.GetTarget(pgRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + pgProp), true);
			return pgRetVal.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
		} catch(pgEx) {
			return "";
		}
	},

	propertySet : function(psData, psRes, psProp, psNewVal)
	{
if ( psNewVal == undefined ) alert("sbp2DataSource.propertySet\n---\npsNewVal not set. Contact the developer.");
		psNewVal = psNewVal.replace(/[\x00-\x1F\x7F]/g, " ");
		psProp = sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + psProp);
		try
		{
			var psOldVal = psData.GetTarget(psRes, psProp, true);
			psOldVal = psOldVal.QueryInterface(Components.interfaces.nsIRDFLiteral);
			psNewVal = sbp2Common.RDF.GetLiteral(psNewVal);
			psData.Change(psRes, psProp, psOldVal, psNewVal);
		} catch(psEx)
		{
			alert("sbp2DataSource.propertySet\n---\n"+psEx);
		}
	},

	init : function()
	{
		//Funktion initialisiert eine leere Datenbank oder läd eine vorhandene
		//
		//Ablauf:
		//1. Vorarbeit
		//2. Datenbank laden
		//2a. vorhandene Datenbank laden
		//2b. leere Datenbank anlegen und laden
		//3. Verzeichnis, in dem die gerade geöffnete Datenbank steht, zurück an aufrufende Funktion

		//1. Vorarbeit
		var iFile = sbp2Common.getBuchVZ();
		iFile.append("scrapbook.rdf");
		//2. Datenbank laden
		if ( iFile.exists() ) {
			//2a. vorhandene Datenbank laden
			var iFileURL = sbp2Common.IO.newFileURI(iFile).spec;
			sbp2DataSource.dbData = sbp2Common.RDF.GetDataSourceBlocking(iFileURL);
		} else {
			//2b. leere Datenbank anlegen und laden
			iFile.create(iFile.NORMAL_FILE_TYPE, parseInt("0666", 8));
			var iFileURL = sbp2Common.IO.newFileURI(iFile).spec;
				//Info: Beim Aufruf wird eine Fehlermeldung geschrieben, da die Datei bislang keinerlei Daten enthält.
				//Ein Abfangen des Fehlers war bislang nicht möglich!
			sbp2DataSource.dbData = sbp2Common.RDF.GetDataSourceBlocking(iFileURL);
			sbp2DataSource.dsCreateEmptySeq(sbp2DataSource.dbData, sbp2Common.RDF.GetResource("urn:scrapbook:root"));
			sbp2DataSource.dsFlush(sbp2DataSource.dbData);
		}
		//3. Verzeichnis, in dem die gerade geöffnete Datenbank steht, zurück an aufrufende Funktion
		return iFile.parent.path;
	},

	initSearch : function()
	{
		//Funktion initialisiert eine leere Search-Datenbank
		//
		//Ablauf:
		//1. Vorarbeit
		//2. Datenbank laden
		//3. leere Datenbank anlegen und laden

		//1. Vorarbeit
		var isFile = sbp2Common.getBuchVZ();
		isFile.append("search.rdf");
		//2. Sicherstellen, dass Datenbank nicht vorhanden ist
		if ( isFile.exists() ) isFile.remove(false);
		//3. leere Datenbank anlegen und laden
		isFile.create(isFile.NORMAL_FILE_TYPE, parseInt("0666", 8));
		var isFileURL = sbp2Common.IO.newFileURI(isFile).spec;
			//Info: Beim Aufruf wird eine Fehlermeldung geschrieben, da die Datei bislang keinerlei Daten enthält.
			//Ein Abfangen des Fehlers war bislang nicht möglich!
		sbp2DataSource.dbDataSearch = sbp2Common.RDF.GetDataSourceBlocking(isFileURL);
		sbp2DataSource.dsCreateEmptySeq(sbp2DataSource.dbDataSearch, sbp2Common.RDF.GetResource("urn:scrapbook:search"));
		sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearch);
	},

	initSearchCache : function()
	{
		//Funktion initialisiert eine leere SearchCacheUpdate-Datenbank. Diese enthält Informationen über neue, geänderte sowie gelöschte
		//Einträge. Mit Hilfe dieser Informationen wird entschieden, ob nur einzelne Einträge im SearchCache aktualisiert werden oder die
		//Datei gelöscht und neu erstellt wird.
		//
		//Ablauf:
		//1. Vorarbeit
		//2. Datenbank laden
		//2a. vorhandene Datenbank laden
		//2b. leere Datenbank anlegen und laden

		//1. Vorarbeit
		var iscFile = sbp2Common.getBuchVZ();
		iscFile.append("searchcache.rdf");
		//2. Datenbank laden
		if ( iscFile.exists() ) {
			//2a. vorhandene Datenbank laden
			var iscFileURL = sbp2Common.IO.newFileURI(iscFile).spec;
			sbp2DataSource.dbDataSearchCache = sbp2Common.RDF.GetDataSourceBlocking(iscFileURL);
		} else {
			//2b. leere Datenbank anlegen und laden
			iscFile.create(iscFile.NORMAL_FILE_TYPE, parseInt("0666", 8));
			var iscFileURL = sbp2Common.IO.newFileURI(iscFile).spec;
				//Info: Beim Aufruf wird eine Fehlermeldung geschrieben, da die Datei bislang keinerlei Daten enthält.
				//Ein Abfangen des Fehlers war bislang nicht möglich!
			sbp2DataSource.dbDataSearchCache = sbp2Common.RDF.GetDataSourceBlocking(iscFileURL);
			sbp2Common.RDFCU.MakeSeq(sbp2DataSource.dbDataSearchCache, sbp2Common.RDF.GetResource("urn:scrapbook:searchcache"));
			sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCache);
		}
	},


	initSearchCacheUpdate : function(iscuEntfernen)
	{
		//Funktion initialisiert eine leere SearchCacheUpdate-Datenbank. Diese enthält Informationen über neue, geänderte sowie gelöschte
		//Einträge. Mit Hilfe dieser Informationen wird entschieden, ob nur einzelne Einträge im SearchCache aktualisiert werden oder die
		//Datei gelöscht und neu erstellt wird.
		//
		//Ablauf:
		//1. Vorarbeit
		//2. Datenbank laden
		//2a. vorhandene Datenbank laden
		//2b. leere Datenbank anlegen und laden

		//1. Vorarbeit
		var iscuFile = sbp2Common.getBuchVZ();
		iscuFile.append("searchcacheupdate.rdf");
		//2. Datenbank laden
		if ( iscuFile.exists() && iscuEntfernen ) iscuFile.remove(false);
		if ( iscuFile.exists() ) {
			//2a. vorhandene Datenbank laden
			var iscuFileURL = sbp2Common.IO.newFileURI(iscuFile).spec;
			sbp2DataSource.dbDataSearchCacheUpdate = sbp2Common.RDF.GetDataSourceBlocking(iscuFileURL);
		} else {
			//2b. leere Datenbank anlegen und laden
			iscuFile.create(iscuFile.NORMAL_FILE_TYPE, parseInt("0666", 8));
			var iscuFileURL = sbp2Common.IO.newFileURI(iscuFile).spec;
				//Info: Beim Aufruf wird eine Fehlermeldung geschrieben, da die Datei bislang keinerlei Daten enthält.
				//Ein Abfangen des Fehlers war bislang nicht möglich!
			sbp2DataSource.dbDataSearchCacheUpdate = sbp2Common.RDF.GetDataSourceBlocking(iscuFileURL);
			sbp2Common.RDFCU.MakeSeq(sbp2DataSource.dbDataSearchCacheUpdate, sbp2Common.RDF.GetResource("urn:scrapbook:searchcacheupdate"));
			var iscuRes = sbp2Common.RDF.GetResource("urn:scrapbook:searchcachestats");
			sbp2DataSource.dbDataSearchCacheUpdate.Assert(iscuRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#updatemode"),  sbp2Common.RDF.GetLiteral("-1"), true);
			sbp2DataSource.dbDataSearchCacheUpdate.Assert(iscuRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#entriesadd"),  sbp2Common.RDF.GetLiteral("0"), true);
			sbp2DataSource.dbDataSearchCacheUpdate.Assert(iscuRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#entriesdelupd"),  sbp2Common.RDF.GetLiteral("0"), true);
			sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCacheUpdate);
		}
	},

	initTag : function()
	{
		//Funktion initialisiert eine leere Datenbank oder läd eine vorhandene für Stichwörter.
		//
		//Ablauf:
		//1. Vorarbeit
		//2. Datenbank laden
		//2a. vorhandene Datenbank laden
		//2b. leere Datenbank anlegen und laden

		//1. Vorarbeit
		var itFile = sbp2Common.getBuchVZ();
		itFile.append("tag.rdf");
		//2. Datenbank laden
		if ( itFile.exists() ) {
			//2a. vorhandene Datenbank laden
			var itFileURL = sbp2Common.IO.newFileURI(itFile).spec;
			sbp2DataSource.dbDataTag = sbp2Common.RDF.GetDataSourceBlocking(itFileURL);
		} else {
			//2b. leere Datenbank anlegen und laden
			itFile.create(itFile.NORMAL_FILE_TYPE, parseInt("0666", 8));
			var itFileURL = sbp2Common.IO.newFileURI(itFile).spec;
				//Info: Beim Aufruf wird eine Fehlermeldung geschrieben, da die Datei bislang keinerlei Daten enthält.
				//Ein Abfangen des Fehlers war bislang nicht möglich!
			sbp2DataSource.dbDataTag = sbp2Common.RDF.GetDataSourceBlocking(itFileURL);
			sbp2DataSource.dsCreateEmptySeq(sbp2DataSource.dbDataTag, sbp2Common.RDF.GetResource("urn:scrapbook:tags"));
			sbp2DataSource.dsFlush(sbp2DataSource.dbDataTag);
		}
	},

	itemAdd : function(iaData, iaItem, iaContRes, iaPosition)
	{
		//
		//
		//Ablauf:
		//1. Da Datenbank von Zeit zu Zeit nicht geladen ist, muss diese Prüfung stattfinden.
		//2. neuen Datensatz anlegen
		//3. Datensatz in Container einfügen

		//1. Da Datenbank von Zeit zu Zeit nicht geladen ist, muss diese Prüfung stattfinden.
		if ( !iaData ) {
			//Wird beim Benutzen des Archivierungs-Dialogs benötigt, wenn die Sidebar nicht angezeigt wird
dump("sbp2DataSource.itemAdd\n---\ndbData is not defined. Contact the developer.");
			sbp2DataSource.init();
			iaData = sbp2DataSource.dbData;
		}
		//2. neuen Datensatz anlegen
		var iaNewRes = sbp2Common.RDF.GetResource("urn:scrapbook:item" + iaItem.id);
		iaData.Assert(iaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#id"),      sbp2Common.RDF.GetLiteral(iaItem.id), true);
		iaData.Assert(iaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#type"),    sbp2Common.RDF.GetLiteral(iaItem.type), true);
		iaData.Assert(iaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#title"),   sbp2Common.RDF.GetLiteral(iaItem.title), true);
		iaData.Assert(iaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#chars"),   sbp2Common.RDF.GetLiteral(iaItem.chars), true);
		iaData.Assert(iaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#comment"), sbp2Common.RDF.GetLiteral(iaItem.comment), true);
		if ( iaItem.icon != "" &&
			 iaItem.icon.indexOf("data:") != 0 &&
			 iaItem.icon.indexOf("http:\/\/") != 0 &&
			 iaItem.icon.indexOf("https:\/\/") != 0 &&
			 iaItem.icon.indexOf("file:\/\/\/") != 0 &&
			 iaItem.icon.indexOf("resource:\/\/") != 0 &&
			 iaItem.icon.indexOf("moz-icon:\/\/") != 0 )
			iaItem.icon = "resource://scrapbook/data/" + iaItem.id + "/" + iaItem.icon;
		iaData.Assert(iaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#icon"),    sbp2Common.RDF.GetLiteral(iaItem.icon), true);
		iaData.Assert(iaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#source"),  sbp2Common.RDF.GetLiteral(iaItem.source), true);
		if ( iaItem.type == "separator" ) {
			const RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
			const NC_NS  = "http://home.netscape.com/NC-rdf#";
			iaData.Assert(iaNewRes, sbp2Common.RDF.GetResource(RDF_NS + "type"), sbp2Common.RDF.GetResource(NC_NS + "BookmarkSeparator"), true);
		}
		//3. Datensatz in Container einfügen
		var iaCont = Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer);
		iaCont.Init(iaData, iaContRes);
		if ( iaPosition == -1 ) {
			iaCont.AppendElement(iaNewRes);
		} else {
			iaCont.InsertElementAt(iaNewRes, iaPosition, true);
		}
		if ( iaItem.type == "folder" ) {
			sbp2DataSource.dsCreateEmptySeq(iaData, iaNewRes);
		} else if ( iaItem.type != "separator" && iaItem.type !="bookmark" ) {
			sbp2LinkRepl.slrItemAdd("urn:scrapbook:linkreplupdate", iaItem.id, "0");
			sbp2DataSource.itemAddSearchCacheUpdate("urn:scrapbook:searchcacheupdate", iaItem.id, "0");
		}
	},

	itemAddSearch : function(iasContString, iasID, iasText, iasType, iasSource, iasIcon)
	{
		//Erstellt einen neuen Eintrag sbp2DataSource.dbDataSearch.
		//
		//Ablauf:
		//1. Da Datenbank von Zeit zu Zeit nicht geladen ist, muss diese Prüfung stattfinden.
		//2. neuen Datensatz anlegen
		//3. Datensatz in Container einfügen

		//1. Da Datenbank von Zeit zu Zeit nicht geladen ist, muss diese Prüfung stattfinden.
		if ( !this.dbDataSearch ) {
			alert("sbp2DataSource.itemAddSearch\n---\ndatabase not loaed.");
			return;
		}
		//2. neuen Datensatz anlegen
		var iasNewRes = sbp2Common.RDF.GetResource("urn:scrapbook:item" + iasID);
		this.dbDataSearch.Assert(iasNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#id"),     sbp2Common.RDF.GetLiteral(iasID), true);
		this.dbDataSearch.Assert(iasNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#title"),  sbp2Common.RDF.GetLiteral(iasText), true);
		this.dbDataSearch.Assert(iasNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#type"),   sbp2Common.RDF.GetLiteral(iasType), true);
		this.dbDataSearch.Assert(iasNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#source"), sbp2Common.RDF.GetLiteral(iasSource), true);
		this.dbDataSearch.Assert(iasNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#icon"),   sbp2Common.RDF.GetLiteral(iasIcon), true);
		//3. Datensatz in Container einfügen
		var iasCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		iasCont.Init(this.dbDataSearch, sbp2Common.RDF.GetResource(iasContString));
		iasCont.AppendElement(iasNewRes);
	},

	itemAddSearchCache : function(iascData, iascID, iascFilename, iascContent)
	{
		//1. neuen Datensatz anlegen
		var iascNewRes = sbp2Common.RDF.GetResource("urn:scrapbook:item" + iascID + "#" + iascFilename);
		iascData.Assert(iascNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#content"), sbp2Common.RDF.GetLiteral(iascContent), true);
		//2. Datensatz in Container einfügen
		var iascCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		iascCont.Init(iascData, sbp2Common.RDF.GetResource("urn:scrapbook:searchcache"));
		iascCont.AppendElement(iascNewRes);
	},

	itemAddSearchCacheUpdate : function(iascuContString, iascuID, iascuStatus)
	{
		//Bringt this.dbDataSearchCacheUpdate auf den aktuellen Stand. Wurden änderungen gemacht, wird an die aufrufende Funktion 1, sonst 0, zurückgegeben.
		//
		//iascuStatus:
		//0 = add
		//1 = upd
		//2 = del
		//
		//Ablauf:
		//1. Initialisierung
		//2. Es muss kein Eintrag aufgenommen werden, falls der Cache noch nie in SBP2 für das offene Buch erstellt worden ist, was durch -1 angezeigt wird
		//3. Da die Datenbank von Zeit zu Zeit nicht geladen ist, muss diese Prüfung stattfinden.
		//4. Prüfen, ob schon ein Eintrag vorhanden ist und wie der "status" lautet
		//5. Aktualisierung in Abhängigkeit von der vorhergehenden Prüfung und iascuStatus vornehmen
//muss noch überarbeitet werden -> Schritt 6 nicht vorhanden
		//6. iascuReturnCode zurück an aufrufende Funktion

		//x. Da Datenbank von Zeit zu Zeit nicht geladen ist, muss diese Prüfung stattfinden.
		if ( !this.dbDataSearchCacheUpdate ) {
			alert("sbp2DataSource.itemAddSearchCacheUpdate\n---\nError. itemAddSearchCacheUpdate needs to be loaded. Contact the developer.");
			this.initSearchCacheUpdate(false);
		}
		//1. Initialisierung
		var iascuReturnCode = 0;	//falls der Wert auf 1 steht, wurde eine änderung in this.dbDataSearchCacheUpdate vorgenommen
		var iascuData = this.dbDataSearchCacheUpdate;
		var iascuUpdateMode = this.propertyGet(iascuData, sbp2Common.RDF.GetResource("urn:scrapbook:searchcachestats"), "updatemode");
		var iascuEntriesAdd = this.propertyGet(iascuData, sbp2Common.RDF.GetResource("urn:scrapbook:searchcachestats"), "entriesadd");
		var iascuEntriesDelUpd = this.propertyGet(iascuData, sbp2Common.RDF.GetResource("urn:scrapbook:searchcachestats"), "entriesdelupd");
		//2. Es muss kein Eintrag aufgenommen werden, falls der Cache noch nie in SBP2 für das offene Buch erstellt worden ist, was durch -1 angezeigt wird
		if ( iascuUpdateMode == -1 ) return;
		//3. Da die Datenbank von Zeit zu Zeit nicht geladen ist, muss diese Prüfung stattfinden.
		if ( !iascuData ) {
			alert("sbp2DataSource.itemAddSearchCacheUpdate\n---\nFehler Suche");
			return;
		}
		//4. Prüfen, ob schon ein Eintrag vorhanden ist und wie der "status" lautet
		var iascuNewRes = sbp2Common.RDF.GetResource("urn:scrapbook:item" + iascuID);
		var iascuOldStatus = this.propertyGet(iascuData, iascuNewRes, "status");
		//5. Aktualisierung in Abhängigkeit von der vorhergehenden Prüfung und iascuStatus vornehmen
		if ( iascuOldStatus == "" ) {
			iascuData.Assert(iascuNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#id"), sbp2Common.RDF.GetLiteral(iascuID), true);
			iascuData.Assert(iascuNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#status"), sbp2Common.RDF.GetLiteral(iascuStatus), true);
			var iascuCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
			iascuCont.Init(iascuData, sbp2Common.RDF.GetResource(iascuContString));
			iascuCont.AppendElement(iascuNewRes);
			var iascuRes = sbp2Common.RDF.GetResource("urn:scrapbook:searchcachestats");
			this.propertySet(iascuData, iascuRes, "updatemode", "1");
			if ( iascuStatus == 0 ) {
				//add
				iascuEntriesAdd++;
			} else {
				//upd und del
				iascuEntriesDelUpd++;
			}
			this.propertySet(iascuData, iascuRes, "entriesadd", iascuEntriesAdd.toString());
			this.propertySet(iascuData, iascuRes, "entriesdelupd", iascuEntriesDelUpd.toString());
			iascuReturnCode = 1;
		} else {
			if ( iascuOldStatus == "0" ) {
				//add
				if ( iascuStatus == "2" ) {
					//del
					this.itemDelete(iascuData, iascuNewRes);
					iascuEntriesAdd--;
					var iascuRes = sbp2Common.RDF.GetResource("urn:scrapbook:searchcachestats");
					this.propertySet(iascuData, iascuRes, "entriesadd", iascuEntriesAdd.toString());
					if ( iascuEntriesAdd+iascuEntriesDelUpd == 0 ) {
						this.propertySet(iascuData, iascuRes, "updatemode", "0");
					} else {
						this.propertySet(iascuData, iascuRes, "updatemode", "1");
					}
					iascuReturnCode = 1;
				}
			} else if ( iascuOldStatus == "1" ) {
				//upd
				if ( iascuStatus == "2" ) {
					//del
					this.propertySet(iascuData, iascuNewRes, "status", "2");
					iascuReturnCode = 1;
				}
			} else {
				//del
				if ( iascuStatus == "0" ) {
					//add
					this.propertySet(iascuData, iascuNewRes, "status", "1");
					iascuReturnCode = 1;
				}
			}
		}
	},

	itemDelete : function(idData, idRes)
	{
//Wird derzeit nur von sbp2TreeHandle.itemDelete() und sbp2DataSource.itemAddSearchCacheUpdate() aufgerufen.
		//Entfernt die übergebene Resource aus idData (intakte als auch tote Einträge)
		//
		//1. Container bestimmen, der die Resource enthält
		//2. Resource aus Container entfernen
		//3. Unterpunkte entfernen

		//1. Container bestimmen, der die Resource enthält
		var idResources = idData.GetAllResources();
		var idContParentRes;
		while ( idResources.hasMoreElements() )
		{
			var idResource = idResources.getNext();
			if ( sbp2Common.RDFCU.indexOf(idData, idResource, idRes) > -1 ) {
				idContParentRes = idResource;
				break;
			}
		}
		//2. Resource aus Container entfernen, falls erforderlich
		if ( idContParentRes ) {
			var idContParent = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
			idContParent.Init(idData, idContParentRes);
			idContParent.RemoveElement(idRes,true);
		}
		//3. Unterpunkte entfernen
		var idNames = idData.ArcLabelsOut(idRes);
		while ( idNames.hasMoreElements() )
		{
			try
			{
				var idName  = idNames.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				var idValue = idData.GetTarget(idRes, idName, true);
				idData.Unassert(idRes, idName, idValue);
			} catch(idEx)
			{
				alert("sbp2DataSource.itemDelete\n---\n"+idEx);
			}
		}
	},

	itemDeleteSearchCache : function(idscData, idscRes)
	{
		//Entfernt die übergebene Resource aus idscData
		//
		//Ablauf:
		//1. idscRes aus Container urn:scrapbook:searchcache entfernen
		//2. Unterpunkte entfernen

		//1. idscRes aus Container urn:scrapbook:searchcache entfernen
		var idscContParentRes = sbp2Common.RDF.GetResource("urn:scrapbook:searchcache");
		var idscContParent = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		idscContParent.Init(idscData, idscContParentRes);
		idscContParent.RemoveElement(idscRes, true);
		//2. Unterpunkte entfernen
		var idscNames = idscData.ArcLabelsOut(idscRes);
		while ( idscNames.hasMoreElements() )
		{
			try
			{
				var idscName  = idscNames.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				var idscValue = idscData.GetTarget(idscRes, idscName, true);
				idscData.Unassert(idscRes, idscName, idscValue);
			} catch(idscEx)
			{
				alert("sbp2DataSource.itemDeleteCache\n---\n"+idscEx);
			}
		}
	},

	itemMove : function(imTreeFrom, imTreeTo, imRow, imPosition)
	{
		//imPosition== 0 -> ans Ende des Containers
		//imPosition== 1 -> vor dem dazugehörenden Eintrag im übergeordneten Container
		//imPosition==-1 -> nach dem dazugehörenden Eintrag im übergeordneten Container
		//
		//Ablauf:
		//0. Initialisierung
		//1. Zielcontainer bestimmen
		//2. Selektierte Container (inkl. Untercontainer) und Einträge bestimmen
		//3. Selektion um Einträge bereinigen, deren Container in imListeMoveSelCont enthalten ist
		//4. RDF-Datenquelle vom tree entfernen
		//5. Verbliebene Einträge verschieben
		//6. RDF-Datenquelle dem tree hinzufügen
		//7. Damit die Boxen zum Auf-/Zuklappen von Verzeichnissen dargestellt werden, ist ein rebuild des Tree notwendig
		//8. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)

		//0. Initialisierung
		var imDataFrom          = this.dbData;
		var imDataTo            = this.dbData;
		var imListeMoveAll      = [];
		var imListeMoveFiltered = [];
		var imListeMoveSelCont  = [];
		if ( imRow == -1 ) {
			var imRes;
			var imResCont = sbp2Common.RDF.GetResource("urn:scrapbook:root");
			var imCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
			imCont.Init(this.dbData, imResCont);
			var imContEnum = imCont.GetElements();
			while ( imContEnum.hasMoreElements() )
			{
				imRes = imContEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			}
			imRow = imTreeTo.builderView.getIndexOfResource(imRes);
			imPosition = 1;
		}
		//1. Zielcontainer bestimmen
		var imContNewParentRes = sbp2Common.RDF.GetResource("urn:scrapbook:root");
		var imDstRes = imTreeTo.builderView.getResourceAtIndex(imRow);
		if ( imPosition == 0 ) {
			imContNewParentRes = imDstRes;
		} else {
			var imEintraege = imDataTo.GetAllResources();
			while ( imEintraege.hasMoreElements() )
			{
				var imEintrag = imEintraege.getNext();
				if ( sbp2Common.RDFCU.indexOf(imDataTo, imEintrag, imDstRes) > -1 ) {
					imContNewParentRes = imEintrag;
					break;
				}
			}
		}
		//2. Selektierte Container (inkl. Untercontainer) und Einträge bestimmen
		var imNumRanges = imTreeFrom.view.selection.getRangeCount();
		var imStart = new Object();
		var imEnd = new Object();
		for (var imI=0; imI<imNumRanges; imI++)
		{
			imTreeFrom.view.selection.getRangeAt(imI,imStart,imEnd);
			for (var imJ=imStart.value; imJ<=imEnd.value; imJ++)
			{
				//Resource bestimmen
				var imRes = imTreeFrom.builderView.getResourceAtIndex(imJ);
				//Falls Zielcontainer und selektierte Resource identisch sind, Vorgang abbrechen
				if ( imRes == imContNewParentRes ) {
//					alert("Quelle und Ziel identisch\n\n"+imRes.Value+"\n"+imContNewParentRes.Value);
					return;
				}
				//Falls selektierte Resource mit imRow übereinstimmt, Vorgang abbrechen
				if ( imRes == imDstRes ) {
//					alert("Quelle stimmt mit imRow (imDstRes) überein");
					return;
				}
				//Resource in Liste aufnehmen
				imListeMoveAll.push(imRes);
				//Selekierte Container bestimmen
				if ( sbp2Common.RDFCU.IsContainer(imDataFrom, imRes) ) {
					imListeMoveSelCont.push(imRes);
					var imDump = [];
					this.containerGetAll(imDataFrom, imRes, imListeMoveSelCont, imDump, true);
				}
			}
		}
			//doppelte Resource filtern
		var imHash = {};
		for ( var imI=0; imI<imListeMoveSelCont.length; imI++ )
		{
			imHash[imListeMoveSelCont[imI].Value] = true;
		}
		imListeMoveSelCont = [];
		for ( var imEintrag in imHash ) { imListeMoveSelCont.push(sbp2Common.RDF.GetResource(imEintrag)); }
		//3. Selektion um Einträge bereinigen, deren Container in imListeMoveSelCont enthalten ist
		for ( var imI=0; imI<imListeMoveAll.length; imI++ )
		{
			//Quellcontainer bestimmen, der die Resource enthält
			var imEintraege = imDataFrom.GetAllResources();
			var imContParentRes = sbp2Common.RDF.GetResource("urn:scrapbook:root");
			while ( imEintraege.hasMoreElements() )
			{
				var imEintrag = imEintraege.getNext();
				if ( sbp2Common.RDFCU.indexOf(imDataFrom, imEintrag, imListeMoveAll[imI]) > -1 ) {
					imContParentRes = imEintrag;
					break;
				}
			}
			//Quellcontainer in imListeMoveSelCont suchen
			var imGefunden = 0;
			for ( var imJ=0; imJ<imListeMoveSelCont.length; imJ++ )
			{
				if ( imListeMoveSelCont[imJ] == imContParentRes ) {
					imGefunden = 1;
					imJ=imListeMoveSelCont.length;
				}
			}
			//Wurde Quellcontainer nicht gefunden, kann der Eintrag verschoben werden
			if ( imGefunden == 0 ) {
				imListeMoveFiltered.push(imListeMoveAll[imI]);
			}
		}
		//4. RDF-Datenquelle vom tree entfernen
			//a
		this.dsRemoveFromTree(imTreeFrom);
/*
		var dsEnum = imTreeFrom.database.GetDataSources();
		while ( dsEnum.hasMoreElements() )
		{
			var ds = dsEnum.getNext().QueryInterface(Components.interfaces.nsIRDFDataSource);
			imTreeFrom.database.RemoveDataSource(ds);
		}
*/
			//b
		this.dsRemoveFromTree(imTreeTo);
/*
		var dsEnum = imTreeTo.database.GetDataSources();
		while ( dsEnum.hasMoreElements() )
		{
			var ds = dsEnum.getNext().QueryInterface(Components.interfaces.nsIRDFDataSource);
			imTreeTo.database.RemoveDataSource(ds);
		}
*/
		//5. Verbliebene Einträge verschieben
		for ( var imI=0; imI<imListeMoveFiltered.length; imI++ )
		{
			//Quellcontainer bestimmen, der die Resource enthält
			var imEintraege = imDataFrom.GetAllResources();
			var imContParentRes = sbp2Common.RDF.GetResource("urn:scrapbook:root");
			while ( imEintraege.hasMoreElements() )
			{
				var imEintrag = imEintraege.getNext();
				if ( sbp2Common.RDFCU.indexOf(imDataFrom, imEintrag, imListeMoveFiltered[imI]) > -1 ) {
					imContParentRes = imEintrag;
					break;
				}
			}
			//Sind Quell- und Zielcontainer identisch, wird der Eintrag übersprungen
			if ( imContParentRes == imContNewParentRes && imPosition == 0 ) continue;
			//Resource aus Quellcontainer entfernen
			var imContParent = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
			imContParent.Init(imDataFrom,imContParentRes);
			imContParent.RemoveElement(imListeMoveFiltered[imI],true);
			//Resource in Zielcontainer an vorbestimmter Stelle einfügen
			var imContNewParent = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
			imContNewParent.Init(imDataTo,imContNewParentRes);
			if ( imPosition == 0 ) {
				imContNewParent.AppendElement(imListeMoveFiltered[imI]);
			} else {
				var imNewPosition = imContNewParent.IndexOf(imDstRes);
				if ( imPosition == 1 ) imNewPosition = imNewPosition + imI + 1;
				imContNewParent.InsertElementAt(imListeMoveFiltered[imI], imNewPosition, true);
			}
		}
		//6. RDF-Datenquelle dem tree hinzufügen
		imTreeFrom.database.AddDataSource(imDataFrom);
		imTreeTo.database.AddDataSource(imDataTo);
		//7. Damit die Boxen zum Auf-/Zuklappen von Verzeichnissen dargestellt werden, ist ein rebuild des Tree notwendig
		imTreeFrom.builder.rebuild();
/*
		if ( imTreeFrom != imTreeTo ) {
			alert("unterschiedliche Trees");
			imTreeTo.builder.rebuild();
		}
*/
		//8. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
//		if ( imTreeFrom == "sbp2MC2Tree" ) alert("Icons korrigieren");
		this.dsFlush(imDataFrom);
		if ( imDataFrom != imDataTo ) this.dsFlush(imDataTo);
	},

	itemTagAdd : function(itaData, itaEintrag, itaContRes, itaRes)
	{
		//Erstellt ein neues Stichwort in der Datenbank dbDataTag
		//
		//Ablauf:
		//1. neuen Datensatz anlegen
		//2. Position bestimmen, an der das neue Stichwort eingefügt werden soll
		//3. Datensatz am Ende des Containers einfügen

		//1. neuen Datensatz anlegen
		itaData.Assert(itaRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "id"),     sbp2Common.RDF.GetLiteral(itaEintrag.id), true);
		itaData.Assert(itaRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "title"),  sbp2Common.RDF.GetLiteral(itaEintrag.title), true);
		itaData.Assert(itaRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "type"),   sbp2Common.RDF.GetLiteral(itaEintrag.type), true);
		itaData.Assert(itaRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#" + "icon"),   sbp2Common.RDF.GetLiteral(itaEintrag.icon), true);
		//2. Position bestimmen, an der das neue Stichwort eingefügt werden soll
		var itaCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		itaCont.Init(sbp2DataSource.dbDataTag, itaContRes);
		var itaContChildren = itaCont.GetElements();
		var itaNr = 0;
		var itaAdded = false;
		while (itaContChildren.hasMoreElements())
		{
			var itaContChild = itaContChildren.getNext();
			var itaTitle = this.propertyGet(this.dbDataTag, itaContChild, "title");
			itaNr++;
			if ( itaEintrag.title < itaTitle )
			{
				itaCont.InsertElementAt(itaRes, itaNr, true);
				itaAdded = true;
				break;
			}
		}
		//3. Datensatz am Ende des Containers einfügen
		if ( !itaAdded )
		{
			var itaCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
			itaCont.Init(itaData, itaContRes);
			itaCont.AppendElement(itaRes);
		}
	},

	itemTagDelete : function(itdRes)
	{
		//Löscht das Stichwort mit der Resource itdRes.
		//
		//Ablauf:
		//1. Items sammeln, denen das Tag zugewiesen wurde.
		//2. Item von Tags befreien
		//3. Tag aus Container entfernen
		//4. Unterpunkte entfernen

		//1. Items sammeln, denen das Tag zugewiesen wurde.
		var itdResList = [];
		var itdData = sbp2DataSource.dbDataTag;
		var itdPredicate = sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#entries");
		var itdTargetEnum = itdData.GetTargets(itdRes, itdPredicate, true);
		while ( itdTargetEnum.hasMoreElements() )
		{
			var itdTarget = itdTargetEnum.getNext().QueryInterface(Components.interfaces.nsIRDFNode);
			var itdValue = itdTarget.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
			var itdResItem = sbp2Common.RDF.GetResource("urn:scrapbook:item"+itdValue);
			itdResList.push(itdResItem);
		}
		//2. Item von Tags befreien
		var itdList = [];
		itdList.push(itdRes);
		for ( var itdI=0; itdI<itdResList.length; itdI++ )
		{
			this.itemTagToItemRemove(itdResList[itdI], itdList);
		}
		//3. Tag aus Container entfernen
		var itdContParent = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		itdContParent.Init(itdData, sbp2Common.RDF.GetResource("urn:scrapbook:tags"));
		itdContParent.RemoveElement(itdRes,true);
		//4. Unterpunkte entfernen
		var itdNames = itdData.ArcLabelsOut(itdRes);
		while ( itdNames.hasMoreElements() )
		{
			try
			{
				var itdName  = itdNames.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				var itdValue = itdData.GetTarget(itdRes, itdName, true);
				itdData.Unassert(itdRes, itdName, itdValue);
			} catch(itdEx)
			{
				alert("sbp2DataSource.itemTagDelete\n---\n"+itdEx);
			}
		}
	},

	itemTagDeleteCheck : function(itdcResListTags)
	{
		//Löscht jene Stichwörter, denen kein Eintrag mehr zugewiesen ist.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Alle Einträge in itdcResListTags verarbeiten
		//  3. Stichwort nur löschen, falls keine anderen Einträge zugewiesen sind
		//    3. Stichwort aus Container entfernen
		//    4. Unterpunkte entfernen

		//1. Variablen initialisieren
		var itdcData = sbp2DataSource.dbDataTag;
		var itdcPredicate = sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#entries");
		var itdcTargetEnum = null;
		var itdcContParent = null;
		var itdcNames = null;
		var itdcName = null;
		var itdcValue = null;
		//2. Alle Einträge in itdcResListTags verarbeiten
		for ( var itdcI=0; itdcI<itdcResListTags.length; itdcI++ )
		{
			//3. Stichwort nur löschen, falls keine anderen Einträge zugewiesen sind
			itdcTargetEnum = itdcData.GetTargets(itdcResListTags[itdcI], itdcPredicate, true);
			if ( !itdcTargetEnum.hasMoreElements() ) {
				//4. Stichwort aus Container entfernen
				itdcContParent = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
				itdcContParent.Init(itdcData, sbp2Common.RDF.GetResource("urn:scrapbook:tags"));
				itdcContParent.RemoveElement(itdcResListTags[itdcI], true);
				//5. Unterpunkte entfernen
				itdcNames = itdcData.ArcLabelsOut(itdcResListTags[itdcI]);
				while ( itdcNames.hasMoreElements() )
				{
					try
					{
						itdcName  = itdcNames.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
						itdcValue = itdcData.GetTarget(itdcResListTags[itdcI], itdcName, true);
						itdcData.Unassert(itdcResListTags[itdcI], itdcName, itdcValue);
					} catch(itdcEx)
					{
						alert("sbp2DataSource.itemTagDeleteCheck\n---\n"+itdcEx);
					}
				}
			}
		}
	},

	itemTagToItemAttach : function(ittiRes, ittiResListTags)
	{
		//1. Variablen initialisieren
		var ittiData = sbp2DataSource.dbDataTag;
		var ittiContTag = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		//2. Container für Item anlegen (ist schon einer vorhanden, wird der Befehl ignoriert)
		this.dsCreateEmptySeq(ittiData, ittiRes);
		//3. Tag einfügen in Item-Container
		var ittiCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		ittiCont.Init(ittiData, ittiRes);
		for ( var ittiI=0; ittiI<ittiResListTags.length; ittiI++ )
		{
			if ( sbp2Common.RDFCU.indexOf(ittiData, ittiRes, ittiResListTags[ittiI]) == -1 ) {
				//Variablen initialisieren
				var ittiID = this.propertyGet(this.dbData, ittiRes, "id");
				var ittiTitleNew = this.propertyGet(ittiData, ittiResListTags[ittiI], "title");
				//Item im Tag vermerken
				ittiData.Assert(ittiResListTags[ittiI], sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#entries"),  sbp2Common.RDF.GetLiteral(ittiID), true);
				//Position bestimmen, an der das Tag eingefügt werden soll
				var ittiContChildren = ittiCont.GetElements();
				var ittiNr = 0;
				var ittiAdded = false;
				while (ittiContChildren.hasMoreElements())
				{
					var ittiContChild = ittiContChildren.getNext();
					var ittiTitle = this.propertyGet(ittiData, ittiContChild, "title");
					ittiNr++;
					if ( ittiTitleNew < ittiTitle ) {
						ittiCont.InsertElementAt(ittiResListTags[ittiI], ittiNr, true);
						ittiAdded = true;
						break;
					}
				}
				if ( !ittiAdded ) {
					ittiCont.AppendElement(ittiResListTags[ittiI]);
				}
			}
		}
	},

	itemTagToItemRemove : function(itdRes, itdResListTags)
	{
		//Löscht die Stichwörter aus itdResListTags für den Eintrag itdRes
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Tag löschen in Item-Container
		//3. Ist das Stichwort keinem Eintrag mehr zugewiesen, wird es gelöscht

		//1. Variablen initialisieren
		var itdData = sbp2DataSource.dbDataTag;
		//2. Tag löschen in Item-Container
		var itdCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		if ( !sbp2Common.RDFCU.IsContainer(itdData, itdRes) ) return;
		itdCont.Init(itdData, itdRes);
		for ( var itdI=0; itdI<itdResListTags.length; itdI++ )
		{
			var itdID = this.propertyGet(this.dbData, itdRes, "id");
			itdData.Unassert(itdResListTags[itdI], sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#entries"),  sbp2Common.RDF.GetLiteral(itdID), true);
			itdCont.RemoveElement(itdResListTags[itdI], true);
		}
		//3. Ist das Stichwort keinem Eintrag mehr zugewiesen, wird es gelöscht
		if ( sbp2Common.RDFCU.IsEmpty(itdData, itdRes) ) {
			var itdNames = itdData.ArcLabelsOut(itdRes);
			var itdID = this.propertyGet(itdData, itdRes, "id");
			while ( itdNames.hasMoreElements() )
			{
				try
				{
					var itdName  = itdNames.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
					var itdValue = itdData.GetTarget(itdRes, itdName, true);
					itdData.Unassert(itdRes, itdName, itdValue);
				} catch(itdEx)
				{
					alert("sbp2DataSource.itemTagToItemRemove\n---\n"+itdEx);
				}
			}
		}
	},

	itemTagRename : function(itrRes, itrTitle)
	{
		//Titel von itrRes anpassen. Prüfung, ob Titel überhaupt angepasst werden kann, findet vor dem Aufruf dieser Funktion statt.
		sbp2DataSource.propertySet(sbp2DataSource.dbDataTag, itrRes, "title", itrTitle);
	},

}