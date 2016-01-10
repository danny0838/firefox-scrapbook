
var sbp2SearchCache = {

	//Da die RDF-Einträge im Container urn:scrapbook:searchcache der Datei searchcache.rdf auch den Dateinamen (#dateiname) enthalten, kann nicht direkt nach ihnen gesucht werden,
	//wenn ein kompletter Eintrag gelöscht werden muss, da die vollständige Bezeichnung für die Resource nicht bekannt ist.
	searchCacheItems : null,

	cacheBuild : function()
	{
		//Erstellt einen neuen Cache (searchcache.rdf). Hierzu werden die Einträge (ohne Container) aus dbData bestimmt
		//und im Anschluß verarbeitet.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Cache laden und Inhalte entfernen, da diese neu erstellt werden sollen
		//3. Liste mit Containern aus dbData erstellen
		//4. Inhalt der Container aus dbData verarbeiten
		//5. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		//6. searchcacheupdate.rdf zurücksetzen

		//1. Variablen initialisieren
		var cbContainer = null;
		var cbContainerEnum = null;
		var cbData = sbp2DataSource.dbData;
		var cbRes = null;
		var cbType = null;
		//2. Cache laden und Inhalte entfernen, da diese neu erstellt werden sollen
		if ( !sbp2DataSource.dbDataSearchCache ) {
			//Ist die RDF-Datenquelle noch nicht geladen, kann diese (meist) zeitsparendere Methode zur Initialisierung verwendet werden
			var cbFile = sbp2Common.getBuchVZ();
			cbFile.append("searchcache.rdf");
			if ( cbFile.exists() ) cbFile.remove(false);
			sbp2DataSource.initSearchCache();
		} else {
			//Ist die RDF-Datenquelle schon geladen, muß zunächst alles entfernt werden.
			sbp2DataSource.containerRemoveAllEntries(sbp2DataSource.dbDataSearchCache, "urn:scrapbook:searchcache", true);
			sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCache);
		}
		//3. Liste mit Containern aus dbData erstellen
		var cbResListeCont = [];
		cbResListeCont.push(sbp2Common.RDF.GetResource("urn:scrapbook:root"));
		sbp2DataSource.containerGetAllContainers(cbData, sbp2Common.RDF.GetResource("urn:scrapbook:root"), cbResListeCont, true);
		//4. Inhalt der Container aus dbData verarbeiten
		for ( var cbI=0; cbI<cbResListeCont.length; cbI++ )
		{
			//Container initialisieren
			cbContainer = Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer);
			cbContainer.Init(sbp2DataSource.dbData, cbResListeCont[cbI]);
			//Inhalt des initialisierten Containers verarbeiten
			cbContainerEnum = cbContainer.GetElements();
			while ( cbContainerEnum.hasMoreElements() )
			{
				//Resource bestimmen
				cbRes = cbContainerEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				if ( !sbp2Common.RDFCU.IsContainer(cbData, cbRes) ) {
					cbType = sbp2DataSource.propertyGet(cbData, cbRes, "type");
					if ( cbType == "bookmark" || cbType == "file" || cbType == "image" || cbType == "separator" ) continue;
					this.itemAdd(cbRes);
				}
			}
		}
		//5. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCache);
		//6. searchcacheupdate.rdf zurücksetzen
		//(ein Löschen der Datei funktioniert nicht, da diese irgendwo zwischengespeichert wird für einen unbekannten Zeitraum)
		cbRes = sbp2Common.RDF.GetResource("urn:scrapbook:searchcachestats");
		sbp2DataSource.propertySet(sbp2DataSource.dbDataSearchCacheUpdate, cbRes, "updatemode", "0");
		sbp2DataSource.propertySet(sbp2DataSource.dbDataSearchCacheUpdate, cbRes, "entriesadd", "0");
		sbp2DataSource.propertySet(sbp2DataSource.dbDataSearchCacheUpdate, cbRes, "entriesdelupd", "0");
		sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCacheUpdate);
	},

	cacheUpdate : function()
	{
		//Aktualisiert den vorhandenen Cache (searchcache.rdf)
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Cache initialisieren, falls dies erforderlich ist
		//3. Einträge in searchcacheupdate.rdf verarbeiten
		//4. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		//5. searchcacheupdate.rdf zurücksetzen
		//6. Nach getaner Arbeit kann die Variable wieder auf null gesetzt werden.

		//1. Variablen initialisieren
		var cuData = null;
		//2. Cache initialisieren, falls dies erforderlich ist
		if ( !sbp2DataSource.dbDataSearchCacheUpdate ) sbp2DataSource.initSearchCacheUpdate();
		cuData = sbp2DataSource.dbDataSearchCacheUpdate;
		//3. Einträge in searchcacheupdate.rdf verarbeiten
		var cuContParent = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		cuContParent.Init(cuData, sbp2Common.RDF.GetResource("urn:scrapbook:searchcacheupdate"));
		var cuContParentEnum = cuContParent.GetElements();
		while ( cuContParentEnum.hasMoreElements() )
		{
			//Resource bestimmen
			var cuRes  = cuContParentEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			//Update-Modus für Resource bestimmen
			//0 -> Neu
			//1 -> Update
			//2 -> Entfernen
			var cuStatus = sbp2DataSource.propertyGet(cuData, cuRes, "status");
			if ( cuStatus == "0" ) {
//"hier geht es weiter" iaContString muss angegeben werden
				this.itemAdd(cuRes);
			} else if ( cuStatus == "1" ) {
				
			} else {
				this.itemDelete(cuRes);
			}
		}
		//4. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCache);
		//5. searchcacheupdate.rdf zurücksetzen
		//(ein Löschen der Datei funktioniert nicht, da diese irgendwo zwischengespeichert wird für einen unbekannten Zeitraum)
		sbp2DataSource.containerRemoveAllEntries(cuData, "urn:scrapbook:searchcacheupdate", false);
		sbp2Common.RDFCU.MakeSeq(cuData, sbp2Common.RDF.GetResource("urn:scrapbook:searchcacheupdate"));
		var cuRes = sbp2Common.RDF.GetResource("urn:scrapbook:searchcachestats");
		cuData.Assert(cuRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#updatemode"),  sbp2Common.RDF.GetLiteral("0"), true);
		cuData.Assert(cuRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#entriesadd"),  sbp2Common.RDF.GetLiteral("0"), true);
		cuData.Assert(cuRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#entriesdelupd"),  sbp2Common.RDF.GetLiteral("0"), true);
		sbp2DataSource.dsFlush(cuData);
		//6. Nach getaner Arbeit kann die Variable wieder auf null gesetzt werden.
		this.searchCacheItems = null;
	},

	itemAdd : function(iaRes)
	{
		//Holt die Daten aus jeder einzelnen HTML-Seite der Resource und schreibt diese in searchcache.rdf
		//
		//Ablauf:
		//1. Initialisierung
		//2. zu verarbeitende Dateien bestimmen (.html, .htm und .php)
		//3. Inhalt der in Schritt 2 gefundenen Dateien aufnehmen

		//1. Initialisierung
		var iaFilenames = [];
		var iaDirectory = sbp2Common.getBuchVZ();
		iaDirectory.append("data");
		var iaID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, iaRes, "id");
		//2. zu verarbeitende Dateien bestimmen (.html, .htm und .php)
		var iaFile = iaDirectory.clone();
		iaFile.append(iaID);
		iaFile.append("sb-file2url.txt");
		if ( iaFile.exists() ) {
			var iaData = sbp2Common.fileRead(iaFile);
			var iaSplit = iaData.split("\n");
			for ( var iaI=0; iaI<iaSplit.length; iaI++ )
			{
				var iaParts = iaSplit[iaI].split("\t");
				if ( iaParts[0].match(/\.(htm|html|php)$/i) ) {
					iaFilenames.push(iaParts[0]);
				}
			}
		} else {
			iaFile = iaDirectory.clone();
			iaFile.append(iaID);
			iaFile.append("sbp2-links.txt");
			if ( iaFile.exists() ) {
				var iaData = sbp2Common.fileRead(iaFile);
				var iaSplit = iaData.split("\n");
				for ( var iaI=6; iaI<iaSplit.length - 4; iaI = iaI + 7 )
				{
					if ( iaSplit[iaI] == 1 ) {
						if ( iaSplit[iaI-3] == 1 ) {
							iaFilenames.push(iaSplit[iaI-4]);
						}
					}
				}
			} else {
				iaFilenames.push("index.html");
			}
		}
		//3. Inhalt der in Schritt 2 gefundenen Dateien aufnehmen
		for ( var iaI=0; iaI<iaFilenames.length; iaI++ )
		{
			iaFile = iaFile.parent;
			iaFile.append(iaFilenames[iaI]);
			if ( iaFile.exists() ) {
				//Inhalt auslesen
				var iaData = sbp2Common.fileRead(iaFile);
				//Frames extrahieren
				var iaFrames = iaData.match(/<frame( |\r|\n).*>/gi);
				//Text aus HTML-Seiten extrahieren
				var iaData = sbp2Common.convertToUnicode(iaData, sbp2DataSource.propertyGet(sbp2DataSource.dbData, iaRes, "chars"));
				var iaDataAll = this.convertHTML2Text(iaData);
				if ( iaFrames ) {
					for ( var iaJ=0; iaJ<iaFrames.length; iaJ++ )
					{
						//Dateiname bestimmen
						var iaFilename = iaFrames[iaJ].match(/src=\S+"/i);
						iaFilename = iaFilename[0].substring(5, iaFilename[0].length-1);
						//Inhalt der Datei laden und nur den Text übernehmen
						var iaFileFrame = iaDirectory.clone();
						iaFileFrame.append(iaID);
						iaFileFrame.append(iaFilename);
						iaData = sbp2Common.fileRead(iaFileFrame);
						iaData = sbp2Common.convertToUnicode(iaData, sbp2DataSource.propertyGet(sbp2DataSource.dbData, iaRes, "chars"));
						iaDataAll += this.convertHTML2Text(iaData);
					}
				}
				//Steuerzeichen entfernen
				iaDataAll = iaDataAll.replace(/[\x00-\x1F\x7F]/g, " ").replace(/\s+/g, " ");	//<- ???
				//Eintrag anlegen
				sbp2DataSource.itemAddSearchCache(sbp2DataSource.dbDataSearchCache, iaID, iaFilenames[iaI], iaDataAll);
			} else {
alert("sbp2SearchCache.itemAdd\n---\nsb-file2url.txt contains an unknown file - "+iaFile.path+"\n");
			}
		}
	},

	itemDelete : function(idRes)
	{
		//Löscht alle Einträge aus dem Cache, die zu idRes gehören
		//
		//Ablauf:
		//1. Eine Liste mit allen Einträgen im Cache erstellen, falls diese noch nicht existiert
		//2. Liste durchsuchen und passende Einträge im Cache löschen

		//1. Eine Liste mit allen Einträgen im Cache erstellen, falls diese noch nicht existiert
		if ( this.searchCacheItems == null ) {
			this.searchCacheItems = [];
			var idContParent = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
			idContParent.Init(sbp2DataSource.dbDataSearchCache, sbp2Common.RDF.GetResource("urn:scrapbook:searchcache"));
			var idContParentEnum = idContParent.GetElements();
			while ( idContParentEnum.hasMoreElements() )
			{
				var idCRes  = idContParentEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				this.searchCacheItems.push(idCRes.Value.toString());
			}
		}
		//2. Liste durchsuchen und passende Einträge im Cache löschen
		var idName = idRes.Value.toString();
		for ( var idI=0; idI<this.searchCacheItems.length; idI++ )
		{
			if ( this.searchCacheItems[idI].indexOf(idName) > -1 ) {
				sbp2DataSource.itemDeleteSearchCache(sbp2DataSource.dbDataSearchCache, sbp2Common.RDF.GetResource(this.searchCacheItems[idI]));
			}
		}
	},

	convertHTML2Text : function(ch2tString)
	{
		//Entfernen der HTML-Tags
		var ch2tStringFrom = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString);
		var ch2tStringTo = { value: null };
		ch2tStringFrom.data = ch2tString;
		try
		{
			Components.classes['@mozilla.org/widget/htmlformatconverter;1'].createInstance(Components.interfaces.nsIFormatConverter).
				convert("text/html", ch2tStringFrom, ch2tStringFrom.toString().length, "text/unicode", ch2tStringTo, {});
			ch2tStringTo = ch2tStringTo.value.QueryInterface(Components.interfaces.nsISupportsString);
			return ch2tStringTo.toString();
		} catch(ch2tEx)
		{
alert("sbp2SearchCache.convertHTML2Text\n---\nerror during conversion - "+cht2Ex+". Contact the developer.");
			return ch2tString;
		}
	},

}