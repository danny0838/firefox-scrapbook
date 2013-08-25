
var sbp2Tags = {

	addFolderEntries : function(afeTree, afeData, afeContParentRes, afeList, afeListNr, afeNr)
	{
		//Ablauf:
		//1.

		//1.
		afeNr++;
		var itotResComp = afeTree.builderView.getResourceAtIndex(afeListNr[afeNr]);
		while ( sbp2Common.RDFCU.indexOf(sbp2DataSource.dbData, afeContParentRes, itotResComp) > -1 ) {
			afeNr++;
			itotResComp = afeTree.builderView.getResourceAtIndex(afeListNr[afeNr]);
		}
		afeNr--;
		//2.
		var afeContParent = Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer);
		afeContParent.Init(afeData, afeContParentRes);
		//3. 
		var afeContParentEnum = afeContParent.GetElements();
		//4. 
		while ( afeContParentEnum.hasMoreElements() )
		{
			//Resource bestimmen
			var afeRes = afeContParentEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			//Ein Container und dessen Inhalt muss sofort aufgenommen werden
			if ( sbp2Common.RDFCU.IsContainer(afeData, afeRes) ) {
				afeNr = this.addFolderEntries(afeTree, afeData, afeRes, afeList, afeListNr, afeNr);
			} else {
				afeList.push(afeRes);
			}
		}
		//5.
		afeNr++;
		itotResComp = afeTree.builderView.getResourceAtIndex(afeListNr[afeNr]);
		while ( sbp2Common.RDFCU.indexOf(sbp2DataSource.dbData, afeContParentRes, itotResComp) > -1 ) {
			afeNr++;
			itotResComp = afeTree.builderView.getResourceAtIndex(afeListNr[afeNr]);
		}
		afeNr--;
		//6.
		return afeNr;
	},

	itemAdd : function(itTreeString, itResID)
	{
		//Stichwort/Stichwörter für gewählte Einträge eintragen
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Stichwörter vom Benutzer angeben lassen
		//3. itParams verarbeiten
		//3.1 Variablen initialisieren
		//3.2 Stichwörter trennen (Komma ist Trennzeichen)
		//3.3 Resource-Liste mit allen Stichwörtern, die zugewiesen werden sollen, erstellen
		//4. Stichwörter den Einträgen zuweisen
		//4.1 Variablen initialisieren
		//4.2 Tags dem selektierten Eintrag zuweisen
		//4.2 Tag dem Eintrag zuweisen, dessen Properties gerade angezeigt werden
		//4.3 rdf-Datei schreiben

		//1. Variablen initialisieren
		var itParams  = { mode: "tag", out: null};			//Objekt für Antwort von Eingabefenster erstellen
		var itResList = [];
		var itTree    = null;
		if ( itTreeString != "" ) itTree = document.getElementById(itTreeString);
		//2. Stichwörter vom Benutzer angeben lassen (mehrere Stichwörter können mit Komma getrennt angegeben worden sein)
		window.openDialog('chrome://scrapbookplus2/content/sbp2InputDialog.xul', '', 'chrome,centerscreen,modal', itParams);
		//3. itParams verarbeiten
		if ( itParams.out != null ) {
			//3.1 Variablen initialisieren
			var itData = sbp2DataSource.dbDataTag;
			//3.2 Stichwörter trennen (Komma ist Trennzeichen)
			var itTags = itParams.out.split(",");
			//3.3 Resource-Liste mit allen Stichwörtern, die zugewiesen werden sollen, erstellen
			for ( var itI=0; itI<itTags.length; itI++ )
			{
				//Es werden nur Stichwörter angelegt, die nach dem Entfernen von Leerzeichen aus mindestens einem Zeichen bestehen.
				var itTag = itTags[itI].trim();
				if ( itTag.length>0 ) {
					//Variablen initialisieren Teil 1
					var itContRes = sbp2Common.RDF.GetResource("urn:scrapbook:tags");
					var itFound = 0;
					//Sicherstellen, das Stichwort noch nicht vorhanden ist
					var itCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
					itCont.Init(itData, itContRes);
					var itContEnum = itCont.GetElements();
					while ( itContEnum.hasMoreElements() )
					{
						//Resource bestimmen
						var itRes = itContEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
						//Tag-Titel bestimmen
						var itTitle = sbp2DataSource.propertyGet(itData, itRes, "title");
						//Vergleichen
						if ( itTitle.toLowerCase() == itTag.toLowerCase() ) {
							//Existiert schon ein Stichwort mit dem gleichen Namen, wird dessen Resource aufgenommen.
							itResList.push(itRes);
							itFound = 1;
							break;
						}
					}
					if ( itFound == 0 ) {
						//Variablen initialisieren Teil 2
						var itNewID = sbp2Common.createNewRDFURL(itData,"urn:scrapbook:tag");
						var itRes = sbp2Common.RDF.GetResource("urn:scrapbook:tag" + itNewID);
						var itContRes = sbp2Common.RDF.GetResource("urn:scrapbook:tags");
						var itItem = { id : itNewID, type : "tag", title : itTag, icon : "" };
						//neues Stichwort in dbDataTag eintragen
						sbp2DataSource.itemTagAdd(itData, itItem, itContRes, itRes);
						itResList.push(itRes);
					}
				}
			}
			//4. Stichwörter den Einträgen zuweisen
			if ( itResList.length>0 ) {
				if ( itTree != null ) {
					//4.1 Variablen initialisieren
					var itStart		= new Object();
					var itEnd		= new Object();
					var itNumRanges	= itTree.view.selection.getRangeCount();
					//4.2 Tags den selektierten Einträgen zuweisen
					for ( var itI=itNumRanges-1; itI>=0; itI--)
					{
						itTree.view.selection.getRangeAt(itI, itStart, itEnd);
						for ( var itJ=itEnd.value; itJ>=itStart.value; itJ--)
						{
							var itRes = itTree.builderView.getResourceAtIndex(itJ);
							sbp2DataSource.itemTagToItemAttach(itRes, itResList);
						}
					}
				} else {
					//4.2 Tag dem Eintrag zuweisen, dessen Properties gerade angezeigt werden
					var itRes = sbp2Common.RDF.GetResource("urn:scrapbook:item"+itResID);
					sbp2DataSource.itemTagToItemAttach(itRes, itResList);
				}
				//4.3 rdf-Datei schreiben
				sbp2DataSource.dsFlush(itData);
			}
		}
	},

	itemDelete : function(idTreeString)
	{
		//Selektierte Stichwörter löschen
		//
		//Ablauf:
		//1. Sicherheitsabfrage
		//	2. Variablen initiailsieren
		//	3. Resources der selektierten Stichwörter sammeln
		//  4. Resources Löschen
		//	5. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		//	6. Status der Knöpfe korrigieren
		//7. Tree fokusieren

		//1. Sicherheitsabfrage
		if ( window.confirm(document.getElementById("sbp2CommonString").getString("QUESTION_DELETE_M")) ) {
			//2. Variablen initiailsieren
			var idTree = document.getElementById(idTreeString);
			var idNumRanges = idTree.view.selection.getRangeCount();
			var idStart = new Object();
			var idEnd = new Object();
			var idResListe = [];
			//3. Resources der selektierten Stichwörter sammeln
			for (var idI=0; idI<idNumRanges; idI++)
			{
				idTree.view.selection.getRangeAt(idI, idStart, idEnd);
				for (var idJ=idStart.value; idJ<=idEnd.value; idJ++)
				{
					//Resource bestimmen
					var idRes = idTree.builderView.getResourceAtIndex(idJ);
					//Resource in Liste aufnehmen
					idResListe.push(idRes);
				}
			}
			//4. Resources Löschen
			for ( var idI=idResListe.length-1; idI>=0; idI-- )
			{
				//RDF-Eintrag entfernen
				sbp2DataSource.itemTagDelete(idResListe[idI]);
			}
			//5. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
			sbp2DataSource.dsFlush(sbp2DataSource.dbDataTag);
			//6. Status der Knöpfe korrigieren
			idTree = document.getElementById("sbp2MTTree2");
			if ( idTree.view.selection.count == 0 ) {
				document.getElementById("sbp2MTBtnTagAdd").disabled = true;
				document.getElementById("sbp2MTBtnTagSub").disabled = true;
				document.getElementById("sbp2MTBtnTagDel").disabled = true;
				document.getElementById("sbp2MTBtnTagRen").disabled = true;
			}
		}
		//7. Tree fokusieren
		document.getElementById(idTreeString).focus();
	},

	itemRename : function(irTreeString)
	{
		//Selektiertes Stichwort umbenennen
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Dialog zur Eingabe eines Stichwortes öffnen
		//3. Änderung übernehmen

		//1. Variablen initialisieren
		var irTree      = document.getElementById(irTreeString);
		var irNumRanges = irTree.view.selection.getRangeCount();
		var irStart     = new Object();
		var irEnd       = new Object();
		irTree.view.selection.getRangeAt(0, irStart, irEnd);
		var irRes       = irTree.builderView.getResourceAtIndex(irStart.value);
		var irResCompare= null;
		var irTitle     = sbp2DataSource.propertyGet(sbp2DataSource.dbDataTag, irRes, "title");
		var irParams    = { mode: "edit", out: irTitle};
		//2. Dialog zur Eingabe eines Verzeichnisnamen öffnen
		window.openDialog('chrome://scrapbookplus2/content/sbp2InputDialog.xul', '', 'chrome,centerscreen,modal', irParams);
		//3. Änderung übernehmen
		if ( irTitle != irParams.out ) {
			//sicherstellen, dass Name nicht schon vergeben ist (Abbruch, falls zutreffend)
			//Variablen initialisieren Teil 1
			var irContRes = sbp2Common.RDF.GetResource("urn:scrapbook:tags");
			var irData = sbp2DataSource.dbDataTag;
			//Sicherstellen, das Tag noch nicht vorhanden ist
			var irCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
			irCont.Init(irData, irContRes);
			var irContEnum = irCont.GetElements();
			while ( irContEnum.hasMoreElements() )
			{
				//Resource bestimmen
				irResCompare = irContEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				//Tag-Titel bestimmen
				irTitle = sbp2DataSource.propertyGet(irData, irResCompare, "title");
				//Vergleichen
				if ( irTitle.toLowerCase() == irParams.out.toLowerCase() ) {
					//Existiert schon ein Tag mit dem gleichen Namen, wird der Vorgang abgebrochen.
					alert(irParams.out+document.getElementById("sbp2TagString").getString("DUPLICATETAG"));
					return;
				}
			}
			//Tag umbenennen
			sbp2DataSource.itemTagRename(irRes, irParams.out);
			//RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
			sbp2DataSource.dsFlush(sbp2DataSource.dbDataTag);
		}
	},

	itemRemoveFromEntriesProperties : function()
	{
		//Entfernt die selektierten Stichwörter vom Eintrag
		//(die Stichwörter selbst werden nur gelöscht, falls ihnen kein anderer Eintrag mehr zugewiesen ist)
		//
		//Ablauf:
		//1. Sicherheitsabfrage
		//	2. Variablien initialisieren
		//	3. Resources der selektierten Stichwörter sammeln
		//	4. Stichwörter entfernen
		//	5. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		//	6. Status der Knöpfe korrigieren

		//1. Sicherheitsabfrage
		if ( window.confirm(document.getElementById("sbp2CommonString").getString("QUESTION_DELETE_M")) ) {
			//2. Variablien initialisieren
			var irfepTree		= document.getElementById("sbp2PropTagTree");
			var irfepNumRanges	= irfepTree.view.selection.getRangeCount();
			var irfepStart		= new Object();
			var irfepEnd		= new Object();
			var irfepRes		= null;
			var irfepResListe	= [];
			//3. Resources der selektierten Stichwörter sammeln
			for (var irfepI=0; irfepI<irfepNumRanges; irfepI++)
			{
				irfepTree.view.selection.getRangeAt(irfepI, irfepStart, irfepEnd);
				for (var irfepJ=irfepStart.value; irfepJ<=irfepEnd.value; irfepJ++)
				{
					//Resource bestimmen
					irfepRes = irfepTree.builderView.getResourceAtIndex(irfepJ);
					//Resource in Liste aufnehmen
					irfepResListe.push(irfepRes);
				}
			}
			//4. Stichwörter entfernen
			sbp2DataSource.itemTagToItemRemove(sbp2Common.RDF.GetResource("urn:scrapbook:item"+sbp2Properties.pItem.id), irfepResListe);
			sbp2DataSource.itemTagDeleteCheck(irfepResListe);
			//5. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
			sbp2DataSource.dsFlush(sbp2DataSource.dbDataTag);
			//6. Status der Knöpfe korrigieren
			document.getElementById("sbp2PropTagRen").disabled = true;
			document.getElementById("sbp2PropTagDel").disabled = true;
		}
	},

	itemRemoveFromEntriesManage : function()
	{
		//Entfernt die selektierten Stichwörter von den selektierten Einträgen
		//(die Stichwörter selbst werden nur gelöscht, falls ihnen kein anderer Eintrag mehr zugewiesen ist)
		//
		//Ablauf:
		//1. Sicherheitsabfrage
		//	2. Variablien initialisieren
		//	3. selektierte Stichwörter bestimmen (Resource)
		//	4. selektierte Einträge in der Seitenliste bestimmen (Resources)
		//	5. Resources der selektierten Einträge sowie Einträge innerhalb der selektierten Folders bestimmen.
		//	6. Stichwörter entfernen
		//		7. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		//	8. Status der Knöpfe korrigieren

		//1. Sicherheitsabfrage
		if ( window.confirm(document.getElementById("sbp2CommonString").getString("QUESTION_DELETE_M")) ) {
			//2. Variablien initialisieren
			var irfemTree		= document.getElementById("sbp2MTTree2");
			var irfemNumRanges	= null;
			var irfemStart		= new Object();
			var irfemEnd		= new Object();
			var irfemRes		= null;
			var irfemResList	= [];
			var irfemResListNr	= [];
			var irfemResListTags= [];
			var irfemNr			= 0;
			var irfemType		= "";
			//3. selektierte Stichwörter bestimmen (Resource)
			irfemNumRanges = irfemTree.view.selection.getRangeCount();
			for ( var irfemI=0; irfemI<irfemNumRanges; irfemI++)
			{
				irfemTree.view.selection.getRangeAt(irfemI, irfemStart, irfemEnd);
				for ( var irfemJ=irfemStart.value; irfemJ<=irfemEnd.value; irfemJ++)
				{
					irfemResListTags.push(irfemTree.builderView.getResourceAtIndex(irfemJ));
				}
			}
			//4. selektierte Einträge in der Seitenliste bestimmen (Resources)
			irfemTree = document.getElementById("sbp2MTTree1")
			irfemNumRanges = irfemTree.view.selection.getRangeCount();
			for ( var irfemI=0; irfemI<irfemNumRanges; irfemI++)
			{
				irfemTree.view.selection.getRangeAt(irfemI, irfemStart, irfemEnd);
				for ( var irfemJ=irfemStart.value; irfemJ<=irfemEnd.value; irfemJ++ )
				{
					irfemResListNr[irfemNr] = irfemJ;
					irfemNr++;
				}
			}
			//5. Resources der selektierten Einträge sowie Einträge innerhalb der selektierten Folders bestimmen.
			for ( var irfemI=0; irfemI<irfemNr; irfemI++ )
			{
				irfemRes = irfemTree.builderView.getResourceAtIndex(irfemResListNr[irfemI]);
				irfemType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, irfemRes, "type");
				if ( irfemType == "folder" ) {
					//Verzeichnis verarbeiten
					irfemI = this.addFolderEntries(irfemTree, sbp2DataSource.dbData, irfemRes, irfemResList, irfemResListNr, irfemI);
				} else if ( irfemType == "separator" ) {
					//Nichts tun
				} else {
					//Eintrag aufnehmen
					irfemResList.push(irfemRes);
				}
			}
			//6. Stichwörter entfernen
			if ( irfemResList.length>0 ) {
				for ( var irfemI=0; irfemI<irfemResList.length; irfemI++ )
				{
					sbp2DataSource.itemTagToItemRemove(irfemResList[irfemI], irfemResListTags);
				}
				sbp2DataSource.itemTagDeleteCheck(irfemResListTags);
				//7. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
				sbp2DataSource.dsFlush(sbp2DataSource.dbDataTag);
			}
			//8. Status der Knöpfe korrigieren
			irfemTree = document.getElementById("sbp2MTTree2");
			if ( irfemTree.view.selection.count == 0 ) {
				document.getElementById("sbp2MTBtnTagAdd").disabled = true;
				document.getElementById("sbp2MTBtnTagSub").disabled = true;
				document.getElementById("sbp2MTBtnTagDel").disabled = true;
				document.getElementById("sbp2MTBtnTagRen").disabled = true;
			}
		}
	},

	itemRemoveFromEntriesManageIE : function(irfemieResList)
	{
		//Löscht die Einträge aus irfemieResList und überprüft im Anschluss, ob auch Stichwörter gelöscht werden können.
		//Als Rückgabewert werden 0 oder 1 geliefert, wobei 1 angibt, dass Änderungen stattgefunden haben und die Datei tag.rdf
		//daher gespeichert werden muss.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Einträge von Seiten löschen
		//3. Einträge von Stichwörtern prüfen und ggf. löschen
		//4. Rückgabewert an aufrufende Funktion zurückliefern

		//1. Variablen initialisieren
		var irfemieReturn = 0;
		var irfemieResListTags = [];
		//2. Einträge von Seiten löschen
		for ( var irfemieI=0; irfemieI<irfemieResList.length; irfemieI++ )
		{
			if ( sbp2Common.RDFCU.IsSeq(sbp2DataSource.dbDataTag,irfemieResList[irfemieI]) ) {
				var irfemieCont = Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer);
				irfemieCont.Init(sbp2DataSource.dbDataTag, irfemieResList[irfemieI]);
				var irfemieContEnum = irfemieCont.GetElements();
				//ID der Seite bestimmen
				var irfemieID = irfemieResList[irfemieI].Value.substring(18,32);
				while ( irfemieContEnum.hasMoreElements() )
				{
					//Resource bestimmen
					var irfemieRes  = irfemieContEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
					//Resource speichern für Schritt 3
					irfemieResListTags.push(irfemieRes);
					//Informationen entfernen
					sbp2DataSource.dbDataTag.Unassert(irfemieRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#entries"),  sbp2Common.RDF.GetLiteral(irfemieID), true);
					irfemieCont.RemoveElement(irfemieRes, false);
				}
				var irfemieNames = sbp2DataSource.dbDataTag.ArcLabelsOut(irfemieResList[irfemieI]);
				while ( irfemieNames.hasMoreElements() )
				{
					try
					{
						var irfemieName = irfemieNames.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
						var irfemieValue = sbp2DataSource.dbDataTag.GetTarget(irfemieResList[irfemieI], irfemieName, true);
						sbp2DataSource.dbDataTag.Unassert(irfemieResList[irfemieI], irfemieName, irfemieValue);
					} catch(irfemieEx)
					{
						alert("sbp2Tags.itemRemoveFromEntriesManageIE\n---\n"+irfemieEx);
					}
				}
			}
		}
		//3. Einträge von Stichwörtern prüfen und ggf. löschen
		sbp2DataSource.itemTagDeleteCheck(irfemieResListTags);
		//4. Rückgabewert an aufrufende Funktion zurückliefern
		return irfemieReturn;
	},

	itemTagToItem : function()
	{
		//Weist die selektierten Stichwörter den selektierten Einträgen zu.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. selektierte Stichwörter bestimmen (Resource)
		//3. selektierte Einträge in der Seitenliste bestimmen (Resources)
		//4. Resources der selektierten Einträge sowie Einträge innerhalb der selektierten Folders bestimmen.
		//5. Stichwörter zuweisen
		//6. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)

		//1. Variablen initialisieren
		var itotTree		= null;
		var itotRes			= null;
		var itotResList		= [];
		var itotResListNr	= [];
		var itotResListTags	= [];
		var itotNr			= 0;
		var itotType		= "";
		var itotStart		= new Object();
		var itotEnd			= new Object();
		var itotNumRanges	= null;
		//2. selektierte Stichwörter bestimmen (Resource)
		itotTree = document.getElementById("sbp2MTTree2")
		itotNumRanges = itotTree.view.selection.getRangeCount();
		for ( var itotI=0; itotI<itotNumRanges; itotI++)
		{
			itotTree.view.selection.getRangeAt(itotI, itotStart, itotEnd);
			for ( var itotJ=itotStart.value; itotJ<=itotEnd.value; itotJ++)
			{
				itotResListTags.push(itotTree.builderView.getResourceAtIndex(itotJ));
			}
		}
		//3. selektierte Einträge in der Seitenliste bestimmen (Resources)
		itotTree = document.getElementById("sbp2MTTree1")
		itotNumRanges = itotTree.view.selection.getRangeCount();
		for ( var itotI=0; itotI<itotNumRanges; itotI++)
		{
			itotTree.view.selection.getRangeAt(itotI, itotStart, itotEnd);
			for ( var itotJ=itotStart.value; itotJ<=itotEnd.value; itotJ++)
			{
				itotResListNr[itotNr] = itotJ;
				itotNr++;
			}
		}
		//4. Resources der selektierten Einträge sowie Einträge innerhalb der selektierten Folders bestimmen.
		for ( var itotI=0; itotI<itotNr; itotI++ )
		{
			itotRes = itotTree.builderView.getResourceAtIndex(itotResListNr[itotI]);
			itotType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, itotRes, "type");
			if ( itotType == "folder" ) {
				//Verzeichnis verarbeiten
				itotI = this.addFolderEntries(itotTree, sbp2DataSource.dbData, itotRes, itotResList, itotResListNr, itotI);
			} else if ( itotType == "separator" ) {
				//Nichts tun
			} else {
				//Eintrag aufnehmen
				itotResList.push(itotRes);
			}
		}
		//5. Stichwörter zuweisen
		for ( var itotI=0; itotI<itotResList.length; itotI++ )
		{
			sbp2DataSource.itemTagToItemAttach(itotResList[itotI], itotResListTags);
		}
		//6. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		if ( itotResList.length>0 ) sbp2DataSource.dsFlush(sbp2DataSource.dbDataTag);
	},

	onClickProp : function(ocpEvent)
	{
		//Aktiviert/Deaktiviert die Knöpfe zum Löschen und Umbenennen von Stichwörtern
		var ocpSelected = document.getElementById("sbp2PropTagTree").builderView.selection.count;
		if ( ocpSelected == 0 ) {
			document.getElementById("sbp2PropTagRen").disabled = true;
			document.getElementById("sbp2PropTagDel").disabled = true;
		} else if ( ocpSelected == 1 ) {
			document.getElementById("sbp2PropTagRen").disabled = false;
			document.getElementById("sbp2PropTagDel").disabled = false;
		} else {
			document.getElementById("sbp2PropTagRen").disabled = true;
			document.getElementById("sbp2PropTagDel").disabled = false;
		}
	},

	onKeyPress : function(okpEvent, okpTreeString)
	{
		//Erlaubt das Umbenennen mit F2 sowie das Löschen von Tags mit Del
		switch ( okpEvent.keyCode )
		{
			case okpEvent.DOM_VK_F2:
			{
				if ( document.getElementById(okpTreeString).builderView.selection.count == 1 ) this.itemRename(okpTreeString);
				break;
			}
			case okpEvent.DOM_VK_DELETE:
			{
				if ( okpTreeString == "sbp2MTTree2" ) {
					this.itemDelete(okpTreeString);
				} else {
					this.itemRemove(okpTreeString);
				}
				break;
			}
		}
	},

	populatePopup : function(ppTreeString, ppEvent)
	{
		//Blendet Einträge im Kontextmenü ein und aus
		var ppSelected = document.getElementById(ppTreeString).builderView.selection.count;
		var ppObj = {};
		var ppRow = {};
		document.getElementById(ppTreeString).treeBoxObject.getCellAt(ppEvent.clientX, ppEvent.clientY, ppRow, {}, ppObj);
		switch (ppRow.value)
		{
			case -1:
				if ( ppTreeString == "sbp2TreeTag" ) {
					ppEvent.preventDefault();
				} else if ( ppTreeString == "sbp2PropTagTree" ) {
					document.getElementById("sbp2PropPopupTagRename").hidden = true;
					document.getElementById("sbp2PropPopupTagRemove").hidden = true;
					document.getElementById("sbp2PropPopupTagSeparator").hidden = true;
				} else if ( ppTreeString == "sbp2MT2Tree" ) {
					ppEvent.preventDefault();
					document.getElementById("sbp2MPopupTagRRename").hidden = true;
					document.getElementById("sbp2MPopupTagRRemove").hidden = true;
				} else if ( ppTreeString == "sbp2MT1Tree" ) {
					ppEvent.preventDefault();
				} else if ( ppTreeString == "sbp2MT2Tree" ) {
					ppEvent.preventDefault();
					document.getElementById("sbp2MPopupTagRRename").hidden = true;
					document.getElementById("sbp2MPopupTagRRemove").hidden = true;
				} else {
					alert("Debug:\nsbp2Tags.js -> populatePopup (-1) -> "+ppTreeString);
				}
				break;
			default:
				if ( ppTreeString == "sbp2TreeTag" ) {
					if ( ppSelected>1 )
						document.getElementById("sbp2SidebarPopupTagRename").hidden = true;
					else
						document.getElementById("sbp2SidebarPopupTagRename").hidden = false;
					document.getElementById("sbp2SidebarPopupTagRemove").hidden = false;
				} else if ( ppTreeString == "sbp2PropTagTree" ) {
					if ( ppSelected>1 )
						document.getElementById("sbp2PropPopupTagRename").hidden = true;
					else
						document.getElementById("sbp2PropPopupTagRename").hidden = false;
					document.getElementById("sbp2PropPopupTagRemove").hidden = false;
					document.getElementById("sbp2PropPopupTagSeparator").hidden = false;
				} else if ( ppTreeString == "sbp2MT1Tree" ) {
					
				} else if ( ppTreeString == "sbp2MT2Tree" ) {
					if ( ppSelected>1 )
						document.getElementById("sbp2MPopupTagRRename").hidden = true;
					else
						document.getElementById("sbp2MPopupTagRRename").hidden = false;
					document.getElementById("sbp2MPopupTagRRemove").hidden = false;
				} else {
					alert("Debug:\nsbp2Tags.js -> populatePopup (default) -> "+ppTreeString);
				}
				break;
		}
	},

}