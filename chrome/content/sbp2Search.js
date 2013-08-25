
var sbp2Search = {

	ssSearchFound			: [],
	ssSearchFoundStartPos	: [],
	ssSearchString			: "",

	exit : function()
	{
		//Blendet das Suchergebnis aus
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. RDF-Datenquellen vom tree entfernen
		//3. alte RDF-Datenquelle dem tree hinzufügen
		//4. Ansicht aktualisieren
		//5. Der Inhalt des Suchfeldes wird entfernt

		//1. Variablen initialisieren
		var eTree = document.getElementById("sbp2Tree");
		//2. RDF-Datenquellen vom tree entfernen
		sbp2DataSource.dsRemoveFromTree(eTree);
		//3. alte RDF-Datenquelle dem tree hinzufügen
		eTree.database.AddDataSource(sbp2DataSource.dbData);
		//4. Ansicht aktualisieren
		eTree.ref = "urn:scrapbook:root";
		eTree.builder.rebuild();
		document.getElementById("sbp2SidebarHeader").hidden = true;
		//5. Der Inhalt des Suchfeldes wird entfernt
		document.getElementById("sbp2SearchTextbox").value = "";
	},

	init : function()
	{
		//Eintrag im Popup markieren und richtiges Icon anzeigen.
		//
		//Ablauf:
		//1. Markiert den gewählten Modus im Popup
		//2. Icon und searchtype anpassen

		//1. Markiert den gewählten Modus im Popup
		var iModus = document.getElementById("sbp2SearchImage").getAttribute("searchtype");
		switch(iModus)
		{
			case "fulltext": document.getElementById("sbp2SidebarPopupSearchF").setAttribute("checked", "true");break;
			case "title":    document.getElementById("sbp2SidebarPopupSearchT").setAttribute("checked", "true");break;
			case "comment":  document.getElementById("sbp2SidebarPopupSearchC").setAttribute("checked", "true");break;
			case "source":   document.getElementById("sbp2SidebarPopupSearchS").setAttribute("checked", "true");break;
			case "id":       document.getElementById("sbp2SidebarPopupSearchI").setAttribute("checked", "true");break;
			case "tag":      document.getElementById("sbp2SidebarPopupSearchG").setAttribute("checked", "true");break;
		}
		//2. Icon und searchtype anpassen
		this.searchModeChange(iModus);
	},

	searchBegin : function()
	{
		//Wird ausgeführt, wenn der Benuter in der Textbox ENTER drückt
		//
		//Ablauf:
		//1. Wechsel zu anderer Funktion, wenn Modus nicht passt
		//2. Variablen initialisieren
		//3. Ordnerstruktur entfernen
		//4. Eintrag nach Begriff durchsuchen
		//5. Funde in einem seperatem Tree ausgeben
		//6. Historie der Suchbegriffe aktualisieren
		//7. Scope ändern

		//1. Suchmodus bestimmen
		var sbMode = document.getElementById("sbp2SearchImage").getAttribute("searchtype");
		//2. Zum Suchmodus passende Funktion aufrufen
		switch(sbMode)
		{
			case "fulltext":
				this.searchStartFulltext();
				break;
			case "tag":
				this.searchStartTag();
				break;
			case "title":
			case "comment":
			case "source":
			case "id":
				this.searchStartNormal();
				break;
			default:
				alert("sbp2Search.searchBegin\n---\nsbMode "+sbMode+" is not supported!");
				break;
		}
	},

	searchModeChange : function(smcModus)
	{
		//Wird beim Klicken auf einen Menüeintrag des Popup sbp2SidebarPopupSearch ausgeführt
		//Das Icon sowie das Attribut searchtype werden angepasst.
		//
		//Ablauf:
		//1. Icon anpassen
		//2. searchtype anpassen

		//1. Icon anpassen
		var smcImage = null;
		switch(smcModus)
		{
			case "fulltext": smcImage ="chrome://scrapbookplus2/skin/search_fulltext.png";break;
			case "title":    smcImage ="chrome://scrapbookplus2/skin/search_title.png";break;
			case "comment":  smcImage ="chrome://scrapbookplus2/skin/search_comment.png";break;
			case "source":   smcImage ="chrome://scrapbookplus2/skin/search_source.png";break;
			case "id":       smcImage ="chrome://scrapbookplus2/skin/search_id.png";break;
			case "tag":      smcImage ="chrome://scrapbookplus2/skin/search_tag.png";break;
		}
		document.getElementById("sbp2SearchImage").setAttribute("src",smcImage);
		//2. searchtype anpassen
		document.getElementById("sbp2SearchImage").setAttribute("searchtype", smcModus);
	},

	searchStartFulltext : function()
	{
		//
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Prüfe, ob Cache aktualisiert werden muss und gegebenenfalls aktualisieren

		//1. Variablen initialisieren
		this.ssSearchFound = [];
		this.ssSearchFoundStartPos = [];
		this.ssSearchString = document.getElementById("sbp2SearchTextbox").value;
		if ( this.ssSearchString.length <= 1 ) return;
		var ssfRes = null;
		var ssfSearchCacheUpdateMode = null;	//-1 neu erstellen, 0 nichts zu tun, 1 entweder neu erstellen oder aktualisieren
		var ssfSearchCacheEntriesDelUpd = null;
		if ( !sbp2DataSource.dbDataSearchCache ) sbp2DataSource.initSearchCache();
		var ssfDataSearchCache = sbp2DataSource.dbDataSearchCache;
		//2. Prüfe, ob Cache aktualisiert werden muss und gegebenenfalls aktualisieren
		if ( sbp2DataSource.dbDataSearchCacheUpdate ) {
			ssfRes = sbp2Common.RDF.GetResource("urn:scrapbook:searchcachestats");
			ssfSearchCacheUpdateMode = sbp2DataSource.propertyGet(sbp2DataSource.dbDataSearchCacheUpdate, ssfRes, "updatemode");
		} else {
alert("sbp2Search.searchStartFulltext\n---\nsbp2DataSource.dbDataSearchCacheUpdate should be loaded. Contact the developer");
return;
		}
		if ( ssfSearchCacheUpdateMode == -1 ) {
			sbp2SearchCache.cacheBuild();
		} else if ( ssfSearchCacheUpdateMode > 0 ) {
			ssfSearchCacheEntriesDelUpd = sbp2DataSource.propertyGet(sbp2DataSource.dbDataSearchCacheUpdate, ssfRes, "entriesdelupd");
			if ( ssfSearchCacheEntriesDelUpd>100 ) {
				sbp2SearchCache.cacheBuild();
			} else {
				sbp2SearchCache.cacheUpdate();
			}
		}
		//3.
		var ssfResList = [];
		sbp2DataSource.containerGetAllItems(ssfDataSearchCache, sbp2Common.RDF.GetResource("urn:scrapbook:searchcache"), ssfResList, true);
		//4.
		var ssfParameters = "";
		if ( !document.getElementById("sbp2SidebarPopupSearchOptionUC").getAttribute("checked") ) ssfParameters = "i";
		var ssfRegExp = new RegExp(this.ssSearchString, ssfParameters);
		//5. Eintraege nach Begriff durchsuchen
		for ( var ssfI=0; ssfI<ssfResList.length; ssfI++ )
		{
			var ssfContent = sbp2DataSource.propertyGet(ssfDataSearchCache, ssfResList[ssfI], "content");
			var ssfPos = ssfContent.search(ssfRegExp);
			if ( ssfPos>-1 ) {
				this.ssSearchFound.push(ssfResList[ssfI]);
				this.ssSearchFoundStartPos.push(ssfPos);
			}
		}
		//4. Funde in einem seperatem Tree ausgeben
		sbp2DataSource.initSearch();
		sbp2DataSource.containerRemoveAllEntries(sbp2DataSource.dbDataSearch, "urn:scrapbook:search", true);
		for ( var ssfI=0; ssfI<this.ssSearchFound.length; ssfI++ )
		{
			//Container fuer Eintrag anlegen
			var ssfTemp = this.ssSearchFound[ssfI].Value;
			var ssfSplit = ssfTemp.split("#");
			var ssfRes = sbp2Common.RDF.GetResource(ssfSplit[0]);
			if ( sbp2DataSource.propertyGet(sbp2DataSource.dbDataSearch, ssfRes, "id") == "" ) {
				var ssfID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ssfRes, "id");
				var ssfText = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ssfRes, "title");
				var ssfType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ssfRes, "type");
				var ssfSource = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ssfRes, "source");
				var ssfIcon = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ssfRes, "icon");
				sbp2DataSource.itemAddSearch("urn:scrapbook:search", ssfID, ssfText, ssfType, ssfSource, ssfIcon);
				sbp2DataSource.dsCreateEmptySeq(sbp2DataSource.dbDataSearch, ssfRes);
			}
			var ssfID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ssfRes, "id");
			var ssfText = sbp2DataSource.propertyGet(sbp2DataSource.dbDataSearchCache, this.ssSearchFound[ssfI], "content").substr(this.ssSearchFoundStartPos[ssfI],60);
			var ssfSource = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ssfRes, "source");
			sbp2DataSource.itemAddSearch(ssfRes.Value, ssfID+"#"+ssfSplit[1], ssfText, "cache", ssfSource, "");
		}
		sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearch);
		//6. Historie der Suchbegriffe aktualisieren
//		this.FORM_HISTORY.addEntry("sbp2SearchHistory", this.ssSearchString);
		//7. Scope ändern
		var ssfTree = document.getElementById("sbp2Tree");
			//alte RDF-Datenquelle vom tree entfernen
		sbp2DataSource.dsRemoveFromTree(ssfTree);
			//neue RDF-Datenquelle dem tree hinzufügen
		ssfTree.database.AddDataSource(sbp2DataSource.dbDataSearch);
			//Ansicht aktualisieren
		ssfTree.ref = "urn:scrapbook:search";
		ssfTree.builder.rebuild();
		document.getElementById("sbp2SidebarHeader").hidden = false;
		document.getElementById("sbp2SidebarHeader").firstChild.value = this.ssSearchFound.length+" "+document.getElementById("sbp2CommonString").getString("SEARCHRESULT");
	},

	searchStartNormal : function()
	{
		//1. Variablen initialisieren
		this.ssSearchFound = [];
		this.ssSearchString = document.getElementById("sbp2SearchTextbox").value;
		if ( this.ssSearchString.length <= 1 ) return;
		//2. Ordnerstruktur entfernen
		var ssnResList = sbp2DataSource.dsGetResources(sbp2DataSource.dbData, sbp2Common.RDF.GetResource("urn:scrapbook:root"), 1, true);
		//3. Eintrag nach Begriff durchsuchen
		var ssnMode = document.getElementById("sbp2SearchImage").getAttribute("searchtype");
		var ssnParameters = "";
		if ( !document.getElementById("sbp2SidebarPopupSearchOptionUC").getAttribute("checked") ) ssnParameters = "i";
		var ssnRegExp = new RegExp(this.ssSearchString, ssnParameters);
		for ( var ssnI=0; ssnI<ssnResList.length; ssnI++ )
		{
			var ssnValue = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ssnResList[ssnI], ssnMode);
			if ( ssnValue.match(ssnRegExp) ) this.ssSearchFound.push(ssnResList[ssnI]);
		}
		//4. Funde in einem seperatem Tree ausgeben
		sbp2DataSource.initSearch();
		sbp2DataSource.containerRemoveAllEntries(sbp2DataSource.dbDataSearch, "urn:scrapbook:search", true);
		for ( var ssnI=0; ssnI<this.ssSearchFound.length; ssnI++ )
		{
			var ssnID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, this.ssSearchFound[ssnI], "id");
			var ssnText = sbp2DataSource.propertyGet(sbp2DataSource.dbData, this.ssSearchFound[ssnI], "title");
			var ssnType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, this.ssSearchFound[ssnI], "type");
			var ssnSource = sbp2DataSource.propertyGet(sbp2DataSource.dbData, this.ssSearchFound[ssnI], "source");
			var ssnIcon = sbp2DataSource.propertyGet(sbp2DataSource.dbData, this.ssSearchFound[ssnI], "icon");
			sbp2DataSource.itemAddSearch("urn:scrapbook:search", ssnID, ssnText, ssnType, ssnSource, ssnIcon);
		}
		sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearch);
		//6. Historie der Suchbegriffe aktualisieren
//		this.FORM_HISTORY.addEntry("sbp2SearchHistory", this.ssSearchString);
		//7. Scope ändern
		var ssnTree = document.getElementById("sbp2Tree");
			//alte RDF-Datenquelle vom tree entfernen
		sbp2DataSource.dsRemoveFromTree(ssnTree);
			//neue RDF-Datenquelle dem tree hinzufügen
		ssnTree.database.AddDataSource(sbp2DataSource.dbDataSearch);
			//Ansicht aktualisieren
		ssnTree.ref = "urn:scrapbook:search";
		ssnTree.builder.rebuild();
		document.getElementById("sbp2SidebarHeader").hidden = false;
		document.getElementById("sbp2SidebarHeader").firstChild.value = this.ssSearchFound.length+" "+document.getElementById("sbp2CommonString").getString("SEARCHRESULT");
	},

	searchForTags : function(sftEvent)
	{
		//Übernimmt das Tag, auf das doppelt geklickt wurde, in die Suchleiste und startet den Suchvorgang
		//
		//Ablauf:
		//1. Nur weiter, wenn Doppelklick mit linker Maustaste ausgeführt worden ist
		//2. Nur weiter, wenn der Doppelklick auf einen Eintrag ausgeführt wurde
		//3. Variablen initialisieren
		//4. Sicherstellen, das Suchmodus auf 'Tag' steht
		//5. Suchbegriffe aktualisieren
		//6. Suchvorgang starten

		//1. Nur weiter, wenn Doppelklick mit linker Maustaste ausgeführt worden ist
		if ( !sftEvent.button==0 ) return;
		//2. Nur weiter, wenn der Doppelklick auf einen Eintrag ausgeführt wurde
		var sftObj = {};
		var sftRow = {};
		document.getElementById("sbp2TreeTag").treeBoxObject.getCellAt(sftEvent.clientX, sftEvent.clientY, sftRow, {}, sftObj);
		if ( sftRow.value==-1 ) return;
		//3. Variablen initialisieren
		var sftSearchStringOld = "";
		var sftTree = document.getElementById("sbp2TreeTag");
		var sftSearchModeTag = document.getElementById("sbp2SidebarPopupSearchG").getAttribute("checked");
		//4. Sicherstellen, das Suchmodus auf 'Tag' steht
		if ( sftSearchModeTag != "tag" ) {
			document.getElementById("sbp2SidebarPopupSearchG").setAttribute("checked", "true");
			this.searchModeChange("tag");
		}
		//5. Suchbegriffe aktualisieren
		var sftTreeIndex = sftTree.currentIndex;
		var sftRes = sftTree.builderView.getResourceAtIndex(sftTreeIndex);
		var sftTitle = sbp2DataSource.propertyGet(sbp2DataSource.dbDataTag, sftRes, "title");
		var sftTemp = document.getElementById("sbp2SearchTextbox").value;
		var sftSearchStringList = sftTemp.split(",");
		var sftStatus = 2;
		for ( var sftI=0; sftI<sftSearchStringList.length; sftI++ )
		{
			if ( sftTitle == sftSearchStringList[sftI] ) {
				sftStatus = 1;
				break;
			} else if ( sftTitle<sftSearchStringList[sftI] ) {
				sftSearchStringList.splice(sftI,0,sftTitle);
				sftStatus = 0;
				break;
			}
		}
			//Das neue Tag wird am Ende eingefügt
		switch ( sftStatus )
		{
			case 0:
				for ( var sftI=0; sftI<sftSearchStringList.length; sftI++ )
				{
					sftSearchStringOld += sftSearchStringList[sftI];
					if ( sftI<sftSearchStringList.length-1 ) sftSearchStringOld += ",";
				}
				break;
			case 1:
				sftSearchStringOld = sftTemp;
				break;
			case 2:
				if ( sftTemp == "" ) {
					sftSearchStringOld = sftTitle;
				} else {
					sftSearchStringOld = sftTemp + "," + sftTitle;
				}
				break;
		}
		document.getElementById("sbp2SearchTextbox").value = sftSearchStringOld;
		//6. Suchvorgang starten
		this.searchStartTag();
	},

	searchStartTag : function()
	{
		//Listet alle zum Tag passenden Einträge auf
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Liste mit Tags erstellen, die den Suchbegriff enthalten
		//3. Einträge passend zur Tag-Liste suchen
		//4. Funde in einem separatem Tree ausgeben
		//5. Historie der Suchbegriffe aktualisieren
		//6. Scope ändern

		//1. Variablen initialisieren
		this.ssSearchFound = [];
		this.ssSearchString = document.getElementById("sbp2SearchTextbox").value;
		var sstDataTag = sbp2DataSource.dbDataTag;
		var sstSearchStringList = this.ssSearchString.split(",");
		//2. Liste mit Resourcen der Tags erstellen
		var sstTagList = [];
		var sstContRes = sbp2Common.RDF.GetResource("urn:scrapbook:tags");
		var sstCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		sstCont.Init(sstDataTag, sstContRes);
		var sstContEnum = sstCont.GetElements();
		while ( sstContEnum.hasMoreElements() )
		{
			//Resource bestimmen
			var sstRes = sstContEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			//Tag-Titel bestimmen
			var sstTitle = sbp2DataSource.propertyGet(sstDataTag, sstRes, "title");
			//Übereinstimmung in Tagliste suchen
			for ( var sstI=0; sstI<sstSearchStringList.length; sstI++ )
			{
				if ( sstSearchStringList[sstI] == sstTitle ) {
					sstTagList.push(sstRes);
					break;
				}
			}
		}
		//3. Einträge passend zur Tag-Liste suchen
/*		for ( var sstI=0; sstI<sstTagList.length; sstI++ )
		{
			var sPredicate = sbpCommon.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#entries");
			var sValueEnum = sstDataTag.GetTargets(sstTagList[sstI], sstPredicate, true);
			while ( sValueEnum.hasMoreElements() )
			{
				var sValue = sValueEnum.getNext();
				var sResID = sValue.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
				this.ssSearchFound.push(sbpCommon.RDF.GetResource("urn:scrapbook:item"+sResID));
			}
		}*/
		//3.1 Einträge passend zum ersten Tag finden
		var sstTemp = [];
		var sstPredicate = sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#entries");
		var sstValueEnum = sstDataTag.GetTargets(sstTagList[0], sstPredicate, true);
		while ( sstValueEnum.hasMoreElements() )
		{
			var sstValue = sstValueEnum.getNext();
			var sstResID = sstValue.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
			sstTemp.push(sbp2Common.RDF.GetResource("urn:scrapbook:item"+sstResID));
		}
		//3.2 Sicherstellen, dass die gefundenen Einträge alle gesuchten Tags enthalten
		for ( var sstI=0; sstI<sstTemp.length; sstI++ )
		{
			if ( sbp2Common.RDFCU.IsContainer(sstDataTag, sstTemp[sstI]) ) {
				var sstCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
				sstCont.Init(sstDataTag, sstTemp[sstI]);
				var sstContEnum = sstCont.GetElements();
				var sstTagsFound = 0;
				var sstJ=0;
				while ( sstContEnum.hasMoreElements() )
				{
					//Resource bestimmen
					var sstResTag = sstContEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
					//Stimmen zugewiesenes und gefundenes Tag überein?
					if ( sstResTag == sstTagList[sstJ] ) {
						sstJ++
						sstTagsFound++;
						if ( sstTagsFound == sstTagList.length ) {
							this.ssSearchFound.push(sstTemp[sstI]);
							break;
						}
					}
				}
			}
		}
		//4. Funde in einem separatem Tree ausgeben
		sbp2DataSource.initSearch();
		sbp2DataSource.containerRemoveAllEntries(sbp2DataSource.dbDataSearch, "urn:scrapbook:search", true);
		for ( var sI=0; sI<this.ssSearchFound.length; sI++ )
		{
			var sID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, this.ssSearchFound[sI], "id");
			var sText = sbp2DataSource.propertyGet(sbp2DataSource.dbData, this.ssSearchFound[sI], "title");
			var sType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, this.ssSearchFound[sI], "type");
			var sSource = sbp2DataSource.propertyGet(sbp2DataSource.dbData, this.ssSearchFound[sI], "source");
			var sIcon = sbp2DataSource.propertyGet(sbp2DataSource.dbData, this.ssSearchFound[sI], "icon");
			sbp2DataSource.itemAddSearch("urn:scrapbook:search", sID, sText, sType, sSource, sIcon);
		}
		sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearch);
		//5. Historie der Suchbegriffe aktualisieren
//		this.FORM_HISTORY.addEntry("sbp2SearchHistory", this.ssSearchString);
		//6. Scope ändern
			//alte RDF-Datenquelle vom tree entfernen
		var sstTree = document.getElementById("sbp2Tree");
		var sstTreeEnum = sstTree.database.GetDataSources();
		while ( sstTreeEnum.hasMoreElements() )
		{
			var sstData = sstTreeEnum.getNext().QueryInterface(Components.interfaces.nsIRDFDataSource);
			sstTree.database.RemoveDataSource(sstData);
		}
			//neue RDF-Datenquelle dem tree hinzufügen
		sstTree.database.AddDataSource(sbp2DataSource.dbDataSearch);
			//Ansicht aktualisieren
		sstTree.ref = "urn:scrapbook:search";
		sstTree.builder.rebuild();
		document.getElementById("sbp2SidebarHeader").hidden = false;
		document.getElementById("sbp2SidebarHeader").firstChild.value = this.ssSearchFound.length+" "+document.getElementById("sbp2CommonString").getString("SEARCHRESULT");
	},

}