
var sbp2Sidebar = {

	sTreeCSS : [],

	close : function()
	{
		//Wird beim Schließen der Sidebar aufgerufen.
		//
		//Ablauf:
		//1. Im Augenblick muss nichts getan werden
	},

	init : function()
	{
		//Wird beim öffnen der Sidebar aufgerufen.
		//
		//Ablauf:
		//1. Hinzufügen eines Observer, damit Drag & Drop funktioniert
		//2. Laden des zuletzt geöffneten ScrapBook

		//1. Hinzufügen eines Observer, damit Drag & Drop funktioniert
		var iTree = document.getElementById("sbp2Tree");
		iTree.builderView.addObserver(sbp2SDragAndDropObserver.ddTreeBuilderObserver);
		//2. Laden des zuletzt geöffneten ScrapBook
		this.scrapbookLoad();
	},

	scrapbookLoad : function()
	{
		//Wird beim Öffnen der Sidebar aufgerufen oder beim Wechseln des Scrapbooks.
		//
		//Ablauf:
		//1. SBP2-Verzeichnis im Profilordner anlegen, falls erforderlich
		//2. SBP2-Daten-Verzeichnis im Profilordner anlegen, falls erforderlich
		//3. SBP2-Grundeinstellungen setzen
		//4. SBP2-Datenquellen laden
		//5. highlighter.txt initialisieren, falls die Datei noch nicht existiert
		//6. scrapbook.css initialisieren, falls die Datei noch nicht existiert
		//7. Interprätation von resource://scrapbook ermöglichen
		//8. Verknüpfen der Datenquelle mit dem Tree in der Sidebar
		//9. tree-css.txt laden
		//10. Verknüpfen der Tag-Datenquelle mit dem Tree in der Sidebar
		//11. Suchfunktion initialisieren

		this.showTitle();
		//1. SBP2-Verzeichnis im Profilordner anlegen, falls erforderlich
		var iProfilVZ = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
		iProfilVZ.append("ScrapBookPlus2");
		if ( !iProfilVZ.exists() ) {
			//Das Verzeichnis 'ScrapBookPlus2' muss angelegt werden
			iProfilVZ.create(iProfilVZ.DIRECTORY_TYPE, parseInt("0700", 8));
		}
		//2. SBP2-Daten-Verzeichnis im Profilordner anlegen, falls erforderlich
		iProfilVZ.append("data");
		if ( !iProfilVZ.exists() ) {
			//Das Verzeichnis 'data' muss angelegt werden
			iProfilVZ.create(iProfilVZ.DIRECTORY_TYPE, parseInt("0700", 8));
		}
		//3. SBP2-Grundeinstellungen setzen
		var iDataFolder = sbp2Prefs.getUnicharPref("extensions.scrapbookplus2.data.path");
		if ( iDataFolder == null ) {
			sbp2Prefs.setUnicharPref("extensions.scrapbookplus2.data.path", "");
		}
		var iTitle = sbp2Prefs.getUnicharPref("extensions.scrapbookplus2.data.title");
		if ( iTitle == null ) {
			sbp2Prefs.setUnicharPref("extensions.scrapbookplus2.data.title", document.getElementById("sbp2CommonString").getString("PROFILEFOLDER"));
		}
		//4. SBP2-Datenquellen laden
		sbp2DataSource.dbDataSearchCache = null;
		var iPath = sbp2DataSource.init();
		sbp2DataSource.initSearchCacheUpdate();
		sbp2DataSource.initTag();
		sbp2LinkRepl.slrInitDatabase();
		//5. highlighter.txt initialisieren, falls die Datei noch nicht existiert
		iProfilVZ = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		iProfilVZ.initWithPath(iPath);
		iProfilVZ.append("highlighter.txt");
		if ( !iProfilVZ.exists() ) {
			    var iData = "Highlighter 1\n" +
					"background-color: #FFFF99 ; color: #000000 ; border: #FFCC00 dashed thin ;\n" +
					"Highlighter 2\n" +
					"border-bottom: #33FF33 solid medium ;\n" +
					"Highlighter 3\n" +
					"background-color: #CCFFFF ; color: #000000 ; border: #0099FF solid thin ;\n" +
					"Highlighter 4\n" +
					"background-color: #FFFF00 ; color: #000000 ;\n" +
					"Highlighter 5\n" +
					"border: #993399 double medium ;\n" +
					"Highlighter 6\n" +
					"background-color: #EE3311 ; color: #FFFFFF ; font-weight: bold ;\n" +
					"Highlighter 7\n" +
					"color: #FF0000 ; text-decoration: line-through ;\n" +
					"Highlighter 8\n" +
					"border-bottom: #3366FF solid thin ;\n";
			sbp2Common.fileWrite(iProfilVZ, iData, "UTF-8");
		}
		//6. tree-css.txt initialisieren, falls die Datei noch nicht existiert
		iProfilVZ = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
		iProfilVZ.append("ScrapBookPlus2");
		iProfilVZ.append("tree-css.txt");
		if ( !iProfilVZ.exists() ) {
			var iData = "color: #20C020 ;\n";
			sbp2Common.fileWrite(iProfilVZ, iData, "UTF-8");
		}
		//7. Interprätation von resource://scrapbook ermöglichen
		var iDir = sbp2DataSource.dbData.URI;
		var iPos = iDir.lastIndexOf("/");
		iDir = iDir.substring(0, ++iPos);
		var iRPH = sbp2Common.IO.getProtocolHandler("resource").QueryInterface(Components.interfaces.nsIResProtocolHandler);
		if ( iRPH.hasSubstitution("scrapbook") ) {
			if ( iRPH.getSubstitution("scrapbook").spec != iDir ) {
				var iURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
				iURL.spec = iDir;
				iRPH.setSubstitution("scrapbook", iURL);
			}
		} else {
			var iURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
			iURL.spec = iDir;
			iRPH.setSubstitution("scrapbook", iURL);
		}
		//8. Verknüpfen der Datenquelle mit dem Tree in der Sidebar
		var iTree = document.getElementById("sbp2Tree");
		iTree.database.AddDataSource(sbp2DataSource.dbData);
			//Der rebuild() ist Bestandteil von this.tcInit
//		iTree.builder.rebuild();
		//9. tree-css.txt laden
		var iData = sbp2Common.fileRead(iProfilVZ);
		var iLines = iData.split("\n");
		this.tcInit(iLines);
		//10. Verknüpfen der Tag-Datenquelle mit dem Tree in der Sidebar
		iTree = document.getElementById("sbp2TreeTag");
		iTree.database.AddDataSource(sbp2DataSource.dbDataTag);
			//Der rebuild() ist notwendig, da sonst immer noch nichts angezeigt wird!
		iTree.builder.rebuild();
		//11. Suchfunktion initialisieren
		sbp2Search.init();
	},

	showTitle : function()
	{
//Wird derzeit nur von sbp2Sidebar.scrapbookLoad() aufgerufen.
		//Zeigt die Bezeichnung des geöffneten Archivs im Titel der Sidebar an
		var stWin = "sbp2Overlay" in window.top ? window.top : window.opener.top;
		var stTitle = sbp2Prefs.getUnicharPref("extensions.scrapbookplus2.data.title", "");
		stWin.document.getElementById("sidebar-title").value = "ScrapBook Plus 2 ["+stTitle+"]"
	},

	tcInit : function(tciLines)
	{
//Wird derzeit nur von sbp2Preferences.treecolorsAccept() aufgerufen.
		//Falls beim Aufruf der Funktion keine Daten mitgegeben werden, wird die Datei tree-css.txt aus dem Profilverzeichnis
		//eingelesen. Die Daten der Datei werden zeilenweise in einem Array abgelegt.
		//Mit den Informationen aus dem Array wird sTreeCSS initialisiert.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. tree-css.txt einlesen
		//3. gelesene Zeilen in this.sTreeCSS ablegen und document.styleSheets[2] aktualisieren

		//1. Variablen initialisieren
		this.sTreeCSS = [];
		//2. tree-css.txt einlesen
/*		if ( tciLines == null ) {
			var tciFile = sbp2Common.getBuchVZ();
			tciFile.append("tree-css.txt");
			var tciData = sbp2Common.fileRead(tciFile);
			tciLines = tciData.split("\n");
		}
*/		//3. gelesene Zeilen in this.sTreeCSS ablegen und document.styleSheets[2] aktualisieren
		if ( tciLines.length > 1 ) {
			this.sTreeCSS.push("treechildren::-moz-tree-cell-text(bookmark) { " + tciLines[0] + "}");
			if ( document.styleSheets[2].cssRules.length == 11 ) document.styleSheets[2].deleteRule(0);
			document.styleSheets[2].insertRule(this.sTreeCSS[0], 0);
			var iTree = document.getElementById("sbp2Tree");
			iTree.builder.rebuild();
		}
	}

}