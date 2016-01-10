
var sbp2LinkRepl = {

	//Enthält alle Objekte und Funktionen, die für das Ersetzen der externen Links durch Lokale benötigt werden.
	slrOptions_act		: null,
	slrOptions_lst		: null,
	slrBusy				: 0,		//0=slrReplace darf ausgeführt werden, 1=slrReplace darf nicht ausgeführt werden, um parallelen Lauf zu verhindern
	slrDatabase			: null,		//Verweis auf linkrepl.rdf
	slrDataHash			: {},		//Hash-Tabelle Link -> Datei (Quelle ist linkrep_data.txt)
	slrDataState		: -2,
	//-2 = Eintrag "entries" in linkrep.rdf muss noch ausgewertet werden
	//-1 = linkrep_data.txt und linkrep_index.txt noch nicht erstellt
	// 0 = linkrep*.txt sind geladen und aktuell
	//>0 = linkrep*.txt sind zwar geladen, aber nicht mehr aktuell

	slrDataCreate : function()
	{
		//Liest den Inhalt von sbp2-html2filename.txt für jeden Eintrag ein und erstellt aus den Informationen die Dateien
		//linkrep_index.txt und linkrep_data.txt.
		//Die Datei linkrep_data.txt enthält die für den Linkaustausch erforderlichen Informationen.
		//Die Datei linkrep_index.txt stellt ein Inhaltsverzeichnis der Datei linkrep_data.txt dar und wird beim Aktualisieren benötigt.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Liste mit Resources erstellen (ohne Resources vom Typ "folder")
		//3. Liste mit IDs erzeugen
		//4. Liste mit IDs aufsteigend sortieren (Bubble Sort)
		//5. Daten sammeln (Resources vom Typ "separator" wurden in Schritt 3 aussortiert)
		//6. Daten unter linkrep_index.txt und linkrep_data.txt ablegen
		//7. urn:scrapbook:linkreplstats->entries in linkrepl.rdf auf 0 setzen nach getaner Arbeit

		//1. Variablen initialisieren
		var dcFile = null;
		var dcFileContent = "";
		var dcFileLines = [];
		var dcFileLine = [];
		var dcID = "";
		var dcType = "";
		var dcFolderBase = sbp2Common.getBuchVZ();
		dcFolderBase.append("data");
		var dcFolderBaseString = dcFolderBase.path;
		dcFolderBaseString = "file:///" + dcFolderBaseString.replace(/\\/g, "/") + "/";
		var dcResRoot = sbp2Common.RDF.GetResource("urn:scrapbook:root");
		var dcResList = [];
		var dcIDs = [];
		var dcIDsSorted = [];
		var dcOutput_a = "";	//Inhalt für linkrep_index.txt
		var dcOutput_b = "";	//Inhalt für linkrep_data.txt
		//2. Liste mit Resources erstellen (ohne Resources vom Typ "folder")
		sbp2DataSource.containerGetAllItems(sbp2DataSource.dbData, dcResRoot, dcResList, "true");
		//3. Liste mit IDs erzeugen
		for ( var dcI=0; dcI<dcResList.length; dcI++ )
		{
			 dcType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, dcResList[dcI], "type");
			 if ( dcType != "separator" ) {
				dcIDsSorted.push(dcIDs.length);
				dcID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, dcResList[dcI], "id");
				dcIDs.push(dcID);
			}
		}
		//4. Liste mit IDs aufsteigend sortieren (Bubble Sort)
		var dcNr = -1;
		var dcCount = dcIDs.length;
		var dcGetauscht = 1;
		while ( dcGetauscht == 1 )
		{
			dcCount--;
			dcGetauscht = 0;
			for ( var dcI=0; dcI<dcCount; dcI++ )
			{
				if ( dcIDs[dcIDsSorted[dcI]] > dcIDs[dcIDsSorted[dcI+1]] ) {
					dcNr = dcIDsSorted[dcI];
					dcIDsSorted[dcI] = dcIDsSorted[dcI+1];
					dcIDsSorted[dcI+1] = dcNr;
					dcGetauscht = 1;
				}
			}
		}
		//5. Daten sammeln (Resources vom Typ "separator" wurden in Schritt 3 aussortiert)
		for ( var dcI=0; dcI<dcIDs.length; dcI++ )
		{
			dcID = dcIDs[dcIDsSorted[dcI]];
			dcFile = dcFolderBase.clone();
			dcFile.append(dcID);
			dcFile.append("sbp2-html2filename.txt");
			if ( dcFile.exists() ) {
				//Aktualisierung für Einträge, die über SBP2 erstellt wurden
				dcFileContent = sbp2Common.fileRead(dcFile);
				dcFileLines = dcFileContent.split("\n");
				dcOutput_a = dcOutput_a + dcID + "\n" + (dcFileLines.length-1) + "\n";
				for ( var dcJ=0; dcJ<dcFileLines.length; dcJ++ )
				{
					dcFileLine = dcFileLines[dcJ].split("\t");
					if ( dcFileLine.length == 2 ) {
						dcOutput_b = dcOutput_b + dcFileLine[0] + "\t" + dcFolderBaseString + dcID + "/" + dcFileLine[1] + "\n";
						if ( !this.slrDataHash[dcFileLine[0]] ) {
							this.slrDataHash[dcFileLine[0]] = dcFolderBaseString + dcID + "/" + dcFileLine[1];
						}
					}
				}
			} else {
				//Aktualisierung für Einträge, die noch unter SBP1 erstellt wurden
				dcFileLine = sbp2DataSource.propertyGet(sbp2DataSource.dbData, dcResList[dcIDsSorted[dcI]], "source");
				dcOutput_a = dcOutput_a + dcID + "\n1\n";
				dcOutput_b = dcOutput_b + dcFileLine + "\t" + dcFolderBaseString + dcID + "/index.html\n";
				if ( !this.slrDataHash[dcFileLine] ) {
					this.slrDataHash[dcFileLine] = dcFolderBaseString + dcID + "/index.html";
				}
			}
		}
		//6. Daten unter linkrep_index.txt und linkrep_data.txt ablegen
		dcFile = dcFolderBase.parent.clone();
		dcFile.append("linkrep_index.txt");
		sbp2Common.fileWrite(dcFile, dcOutput_a, "UTF-8");
		dcFile = dcFolderBase.parent.clone();
		dcFile.append("linkrep_data.txt");
		sbp2Common.fileWrite(dcFile, dcOutput_b, "UTF-8");
		//7. urn:scrapbook:linkreplstats->entries in linkrepl.rdf auf 0 setzen nach getaner Arbeit
		sbp2DataSource.propertySet(this.slrDatabase, sbp2Common.RDF.GetResource("urn:scrapbook:linkreplstats"), "entries", "0");
		sbp2DataSource.dsFlush(this.slrDatabase);
	},

	slrDataLoad : function()
	{
		//Füllt this.slrDataHash mit Inhalt.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. linkrep_*.txt erstellen, aktualisieren oder nur laden

		//1. Variablen initialisieren
		var dlData = this.slrDatabase;
		if ( !dlData ) {
			alert("sbp2LinkRepl.slrDataLoad\n---\nRDF nicht geladen");
			return;
		}
		//2. linkrep_*.txt erstellen, aktualisieren oder nur laden
		if ( this.slrBusy == 0 ) {
			if ( this.slrDataState == -2 ) {
				this.slrDataState = sbp2DataSource.propertyGet(this.slrDatabase, sbp2Common.RDF.GetResource("urn:scrapbook:linkreplstats"), "entries");
				if ( this.slrDataState > -1 ) {
					this.slrDataLoadTxt();
				}
			}
			if ( this.slrDataState == -1 ) {
				this.slrBusy = 1;
				this.slrDataCreate();
				this.slrDataState = 0;
				this.slrBusy = 0;
			} else if ( this.slrDataState > 0 ) {
				this.slrBusy = 1;
				this.slrDataUpdate();
				this.slrDataState = 0;
				this.slrBusy = 0;
			} else if ( this.slrDataState == 0 ) {
//nichts zu tun: die Zeile drüber, diese Zeile sowie die nächsten beiden Zeilen können nach Testphase gelöscht werden
			} else {
alert("Fehler - "+this.slrDataState+" - sollte zwischen -2 und 1 liegen");
			}
		}
	},

	slrDataLoadTxt : function()
	{
		//Läd die Datei linkrep_data.txt und füllt this.slrDataHash.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. linkrep_data.txt einlesen
		//3. Hash-Tabelle aufbauen

		//1. Variablen initialisieren
alert("slrDataLoadTxt");
		this.slrDataHash = {};
		//2. linkrep_data.txt einlesen
		var dltFile = sbp2Common.getBuchVZ();
		dltFile.append("linkrep_data.txt");
		var dltData = sbp2Common.fileRead(dltFile);
		//3. Hash-Tabelle aufbauen
		var dltLines = dltData.split("\n");
		var dltLine = [];
		for ( var dltI=0; dltI<dltLines.length; dltI++ )
		{
			dltLine = dltLines[dltI].split("\t");
			if ( !this.slrDataHash[dltLine[0]] ) {
				this.slrDataHash[dltLine[0]] = dltLine[1];
			}
		}
	},

	slrDataUpdate : function()
	{
		//Liest den Inhalt von sbp2-html2filename.txt für jeden neuen oder aktualisierten Eintrag ein und erstellt aus den Informationen
		//die Dateien linkrep_index.txt und linkrep_data.txt.
		//Die Datei linkrep_data.txt enthält die für den Linkaustausch erforderlichen Informationen.
		//Die Datei linkrep_index.txt stellt ein Inhaltsverzeichnis der Datei linkrep_data.txt dar und wird beim Aktualisieren benötigt.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. linkrepl.rdf einlesen
		//3. duRDFSorted initialisieren
		//4. RDF-IDs unter Verwendung von duRDFSorted aufsteigend sortieren (Bubble Sort)
		//5. linkrep_index.txt einlesen und die Daten aufbereiten
		//6. linkrep_data.txt einlesen und in Zeilen aufteilen
		//7. vorhandene Daten aktualisieren
		//8. Daten um neue Einträge erweitern
		//9. Daten unter linkrep_index.txt und linkrep_data.txt ablegen
		//10. urn:scrapbook:linkreplstats->entries in linkrepl.rdf auf 0 setzen nach getaner Arbeit

		//1. Variablen initialisieren
		var duData = null;
		var duFile = null;
		var duFolderBase = sbp2Common.getBuchVZ();
		duFolderBase.append("data");
		var duFolderBaseString = duFolderBase.path;
		duFolderBaseString = "file:///" + duFolderBaseString.replace(/\\/g, "/") + "/";
		var duLine = null;
		var duOutput_a = "";		//Inhalt von neuer linkrep_index.txt
		var duOutput_b = "";		//Inhalt von neuer linkrep_data.txt
		var duResList = [];			//enthält die Resources aller Einträge in linkrep.rdf

		var duDataLines = [];		//Zeilen aus linkrep_data.txt
		var duDataLinesPos = 0;
		var duIndexID = [];			//ID aus linkrep_index.txt
		var duIndexCount = [];		//Anzahl Einträge zur ID aus linkrep_index.txt

		var duRDFID = [];
		var duRDFPos = 0;
		var duRDFSorted = [];
		var duRDFState = [];
//******************
		var duFileContent = "";
		var duFileLines = [];
		var duFileLine = [];
var duID = "";
var duResRoot = sbp2Common.RDF.GetResource("urn:scrapbook:root");
var dcIDs = [];
var dcIDsSorted = [];
		//2. linkrepl.rdf einlesen
		var duContRes = sbp2Common.RDF.GetResource("urn:scrapbook:linkreplupdate");
		var duCont = Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer);
		duCont.Init(this.slrDatabase, duContRes);
		var duContEnum = duCont.GetElements();
		while ( duContEnum.hasMoreElements() )
		{
			//Resource bestimmen
			var duRes = duContEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			//Resource aufnehmen in Liste, damit das Löschen am Ende der Funktion funktioniert
			duResList.push(duRes);
			//ID und Status übernehmen
			duRDFID.push(sbp2DataSource.propertyGet(this.slrDatabase, duRes, "id"));
			duRDFState.push(sbp2DataSource.propertyGet(this.slrDatabase, duRes, "status"));
		}
		//3. duRDFSorted initialisieren
		for ( var duI=0; duI<duRDFID.length; duI++ )
		{
			duRDFSorted.push(duI);
		}
		//4. RDF-IDs unter Verwendung von duRDFSorted aufsteigend sortieren (Bubble Sort)
		var duNr = -1;
		var duCount = duRDFID.length;
		var duGetauscht = 1;
		while ( duGetauscht == 1 )
		{
			duCount--;
			duGetauscht = 0;
			for ( var duI=0; duI<duCount; duI++ )
			{
				if ( duRDFID[duRDFSorted[duI]] > duRDFID[duRDFSorted[duI+1]] ) {
					duNr = duRDFSorted[duI];
					duRDFSorted[duI] = duRDFSorted[duI+1];
					duRDFSorted[duI+1] = duNr;
					duGetauscht = 1;
				}
			}
		}
		//5. linkrep_index.txt einlesen und die Daten aufbereiten
		duFile = duFolderBase.parent.clone();
		duFile.append("linkrep_index.txt");
		duData = sbp2Common.fileRead(duFile);
		duDataLines = duData.split("\n");
		for ( var duI=0; duI<duDataLines.length-1; duI++ )
		{
			duIndexID.push(duDataLines[duI]);
			duIndexCount.push(parseInt(duDataLines[duI+1]));
			duI++;
		}
		//6. höchster Wert von linkrep_index.txt (a) mit niedrigstem Wert von linkrepl.rdf (b) vergleichen
		//   (a < b -> Daten hinten anhängen; sonst -> linkrep_index.txt aktualisieren und erst dann den Rest hinten anhängen)
		if ( duIndexID[duIndexID.length-1] < duRDFID[duRDFSorted[0]] ) {
alert("anhaengen");
			//6.1 Keiner der bestehenden Einträge in der RDF-Datei muss aktualisiert oder gelöscht werden. Alles kann am Ende angefügt werden.
			duOutput_a = duData
			duFile = duFolderBase.parent.clone();
			duFile.append("linkrep_data.txt");
			duOutput_b = sbp2Common.fileRead(duFile);
			for ( var duI=0; duI<duRDFID.length; duI++ )
			{
				duID = duRDFID[duRDFSorted[duI]];
				duFile = duFolderBase.clone();
				duFile.append(duID);
				duFile.append("sbp2-html2filename.txt");
				if ( duFile.exists() ) {
					//Aktualisierung für Einträge, die über SBP2 erstellt wurden
					duFileContent = sbp2Common.fileRead(duFile);
					duFileLines = duFileContent.split("\n");
					duOutput_a = duOutput_a + duID + "\n" + (duFileLines.length-1) + "\n";
					for ( var duJ=0; duJ<duFileLines.length; duJ++ )
					{
						duFileLine = duFileLines[duJ].split("\t");
						if ( duFileLine.length == 2 ) {
							duOutput_b = duOutput_b + duFileLine[0] + "\t" + duFolderBaseString + duID + "/" + duFileLine[1] + "\n";
							if ( !this.slrDataHash[duFileLine[0]] ) {
								this.slrDataHash[duFileLine[0]] = duFolderBaseString + duID + "/" + duFileLine[1];
							}
						}
					}
				} else {
					//Aktualisierung für Einträge, die noch unter SBP1 erstellt wurden
					duFileLine = sbp2DataSource.propertyGet(sbp2DataSource.dbData, duResList[duRDFSorted[duI]], "source");
					duOutput_a = duOutput_a + duID + "\n1\n";
					duOutput_b = duOutput_b + duFileLine + "\t" + duFolderBaseString + duID + "/index.html\n";
					if ( !this.slrDataHash[duFileLine] ) {
						this.slrDataHash[duFileLine] = duFolderBaseString + duID + "/index.html";
					}
				}
			}
			//6.2 Daten unter linkrep_index.txt und linkrep_data.txt ablegen
			duFile = duFolderBase.parent.clone();
			duFile.append("linkrep_index.txt");
			sbp2Common.fileWrite(duFile, duOutput_a, "UTF-8");
			duFile = duFolderBase.parent.clone();
			duFile.append("linkrep_data.txt");
			sbp2Common.fileWrite(duFile, duOutput_b, "UTF-8");
		} else {
alert("aktualisieren und anhaengen");
			//6.3 Mindestens einer der veränderten/gelöschten/neuen Einträge befindet sich im Bereich der schon in linkrep_data.txt enthaltenen Einträge.
			//Daher muss erst der Inhalt von linkrep_data.txt aktualisiert werden.
			duDataLinesPos = 0;
			var duRDFNr = 0;
			this.slrDataHash = {};
			//6.3.1 Inhalt von linkrep_data.txt einlesen und in Zeilen splitten
			duFile = duFolderBase.parent.clone();
			duFile.append("linkrep_data.txt");
			duData = sbp2Common.fileRead(duFile);
			duDataLines = duData.split("\n");
			//6.3.2 alte Daten aktualisieren
			for ( var duI=0; duI<duIndexID.length; duI++ )
			{
//alert(duIndexID[duI]+" - "+duRDFID[duRDFSorted[duRDFNr]]);
//alert(duOutput_a+"\n----\n"+duDataLinesPos);
				if ( duRDFSorted.length == duRDFNr || duIndexID[duI] < duRDFID[duRDFSorted[duRDFNr]] ) {
					//alte Daten bleiben erhalten
					duOutput_a = duOutput_a + duIndexID[duI] + "\n" + duIndexCount[duI] + "\n";
					for ( var duJ=0; duJ<duIndexCount[duI]; duJ++ )
					{
						duOutput_b = duOutput_b + duDataLines[duDataLinesPos] + "\n";
						duFileLine = duDataLines[duDataLinesPos].split("\t");
						if ( !this.slrDataHash[duFileLine[0]] ) {
							this.slrDataHash[duFileLine[0]] = duFolderBaseString + duID + "/" + duFileLine[1];
						}
						duDataLinesPos++;
					}
				} else if ( duIndexID[duI] == duRDFID[duRDFSorted[duRDFNr]] ) {
					//alte Daten könnten aktualisiert oder gelöscht worden sein
					if ( duRDFState[duRDFSorted[duRDFNr]] == 2 ) {
						//gelöscht
						duDataLinesPos = duDataLinesPos + duIndexCount[duI];
						duRDFNr++;
					} else if ( duRDFState[duRDFSorted[duRDFNr]] == 1 ) {
alert("aktualisieren");
						//aktualisiert
						//alte Zeilen überspringen
						duDataLinesPos = duDataLinesPos + duIndexCount[duI];
						//Daten aktualisieren
						duID = duIndexID[duI];
						duFile = duFolderBase.clone();
						duFile.append(duID);
						duFile.append("sbp2-html2filename.txt");
						if ( duFile.exists() ) {
							//Aktualisierung für Einträge, die über SBP2 erstellt wurden
							duFileContent = sbp2Common.fileRead(duFile);
							duFileLines = duFileContent.split("\n");
							duOutput_a = duOutput_a + duID + "\n" + (duFileLines.length-1) + "\n";
							for ( var duJ=0; duJ<duFileLines.length; duJ++ )
							{
								duFileLine = duFileLines[duJ].split("\t");
								if ( duFileLine.length == 2 ) {
									duOutput_b = duOutput_b + duFileLine[0] + "\t" + duFolderBaseString + duID + "/" + duFileLine[1] + "\n";
									if ( !this.slrDataHash[duFileLine[0]] ) {
										this.slrDataHash[duFileLine[0]] = duFolderBaseString + duID + "/" + duFileLine[1];
									}
								}
							}
						} else {
							//Aktualisierung für Einträge, die noch unter SBP1 erstellt wurden
							duFileLine = sbp2DataSource.propertyGet(sbp2DataSource.dbData, duResList[duRDFSorted[duRDFNr]], "source");
							duOutput_a = duOutput_a + duID + "\n1\n";
							duOutput_b = duOutput_b + duFileLine + "\t" + duFolderBaseString + duID + "/index.html\n";
							if ( !this.slrDataHash[duFileLine] ) {
								this.slrDataHash[duFileLine] = duFolderBaseString + duID + "/index.html";
							}
						}
						duRDFNr++;
					} else {
alert("ungueltiger Wert -> "+duRDFState[duRDFSorted[duRDFNr]]);
					}
				} else {
					//neuer Eintrag zwischen alten Daten
					duID = duRDFID[duRDFSorted[duRDFNr]];
					duFile = duFolderBase.clone();
					duFile.append(duID);
					duFile.append("sbp2-html2filename.txt");
					if ( duFile.exists() ) {
						//Aktualisierung für Einträge, die über SBP2 erstellt wurden
						duFileContent = sbp2Common.fileRead(duFile);
						duFileLines = duFileContent.split("\n");
						duOutput_a = duOutput_a + duID + "\n" + (duFileLines.length-1) + "\n";
						for ( var duJ=0; duJ<duFileLines.length; duJ++ )
						{
							duFileLine = duFileLines[duJ].split("\t");
							if ( duFileLine.length == 2 ) {
								duOutput_b = duOutput_b + duFileLine[0] + "\t" + duFolderBaseString + duID + "/" + duFileLine[1] + "\n";
								if ( !this.slrDataHash[duFileLine[0]] ) {
									this.slrDataHash[duFileLine[0]] = duFolderBaseString + duID + "/" + duFileLine[1];
								}
							}
						}
					} else {
						//Aktualisierung für Einträge, die noch unter SBP1 erstellt wurden
//alert(duRDFNr+" - "+duRDFSorted[duRDFNr]+" - ");
						duFileLine = sbp2DataSource.propertyGet(sbp2DataSource.dbData, duResList[duRDFSorted[duRDFNr]], "source");
						duOutput_a = duOutput_a + duID + "\n1\n";
						duOutput_b = duOutput_b + duFileLine + "\t" + duFolderBaseString + duID + "/index.html\n";
						if ( !this.slrDataHash[duFileLine] ) {
							this.slrDataHash[duFileLine] = duFolderBaseString + duID + "/index.html";
						}
					}
					duRDFNr++;
					duI--;
				}
			}
			//6.3.3 verbliebene RDF-Einträge aufnehmen (Status müsste immer 0 sein = neu)
			for ( var duI=duRDFNr; duI<duRDFID.length; duI++ )
			{
if ( duRDFState[duRDFSorted[duI]] != 0 ) alert("Fehler -> Wert muesste 0 sein");
				duID = duRDFID[duRDFSorted[duI]];
				duFile = duFolderBase.clone();
				duFile.append(duID);
				duFile.append("sbp2-html2filename.txt");
				if ( duFile.exists() ) {
					//Aktualisierung für Einträge, die über SBP2 erstellt wurden
					duFileContent = sbp2Common.fileRead(duFile);
					duFileLines = duFileContent.split("\n");
					duOutput_a = duOutput_a + duID + "\n" + (duFileLines.length-1) + "\n";
					for ( var duJ=0; duJ<duFileLines.length; duJ++ )
					{
						duFileLine = duFileLines[duJ].split("\t");
						if ( duFileLine.length == 2 ) {
							duOutput_b = duOutput_b + duFileLine[0] + "\t" + duFolderBaseString + duID + "/" + duFileLine[1] + "\n";
							if ( !this.slrDataHash[duFileLine[0]] ) {
								this.slrDataHash[duFileLine[0]] = duFolderBaseString + duID + "/" + duFileLine[1];
							}
						}
					}
				} else {
					//Aktualisierung für Einträge, die noch unter SBP1 erstellt wurden
					duFileLine = sbp2DataSource.propertyGet(sbp2DataSource.dbData, duResList[duRDFSorted[duI]], "source");
					duOutput_a = duOutput_a + duID + "\n1\n";
					duOutput_b = duOutput_b + duFileLine + "\t" + duFolderBaseString + duID + "/index.html\n";
					if ( !this.slrDataHash[duFileLine] ) {
						this.slrDataHash[duFileLine] = duFolderBaseString + duID + "/index.html";
					}
				}
			}
			//6.3.4 Daten unter linkrep_index.txt und linkrep_data.txt ablegen
			duFile = duFolderBase.parent.clone();
			duFile.append("linkrep_index.txt");
			sbp2Common.fileWrite(duFile, duOutput_a, "UTF-8");
			duFile = duFolderBase.parent.clone();
			duFile.append("linkrep_data.txt");
			sbp2Common.fileWrite(duFile, duOutput_b, "UTF-8");
		}
		//10. Einträge in linkrepl.rdf löschen
		for ( var duI=0; duI<duResList.length; duI++ )
		{
//			sbp2DataSource.itemDelete(this.slrDatabase, duResList[duI]);
		}
		//11. urn:scrapbook:linkreplstats->entries in linkrepl.rdf auf 0 setzen nach getaner Arbeit
//		sbp2DataSource.propertySet(this.slrDatabase, sbp2Common.RDF.GetResource("urn:scrapbook:linkreplstats"), "entries", "0");
//		sbp2DataSource.dsFlush(this.slrDatabase);
return;
		//7. vorhandene Daten aktualisieren
//		duRDFPos = 0;
/*
		for ( var duI=0; duI<duIndexID.length; duI++ )
		{
			if ( duIndexID[duI] < duRDFID[duRDFSorted[duRDFPos]] ) {
				//Einträge übernehmen
				duOutput_a = duOutput_a + duIndexID[duI] + "\n" + duIndexCount[duI] + "\n";
				for ( var duJ=duDataLinesPos; duJ<duDataLinesPos+duIndexCount[duI]; duJ++ )
				{
					duOutput_b = duOutput_b + duDataLines[duJ] + "\n";
				}
				duDataLinesPos = duDataLinesPos+duIndexCount[duI];
			} else if ( duIndexID[duI] == duRDFID[duRDFSorted[duRDFPos]] ) {
				//Prüfen, welche Aktion ausgeführt werden soll (0=neu, 1=Update, 2=gelöscht)
				if ( duRDFState[duRDFSorted[duRDFPos]] == 1 ) {
alert("sbp2LinkRepl.slrDataUpdate\nUpdate schon vorhandener Daten geht noch nicht");
				} else if ( duRDFState[duRDFSorted[duRDFPos]] == 2 ) {
					//Eintrag wurde gelöscht, daher darf nichts übernommen werden
				} else {
//Sollte eigentlich nicht vorkommen
alert(duRDFID[duRDFSorted[duRDFPos]]+" - "+duRDFState[duRDFSorted[duRDFPos]]);
				}
				//Weiter mit nächstem Eintrag in duRDF*
				duRDFPos++;
			} else if ( duIndexID[duI] > duRDFID[duRDFSorted[duRDFPos]] ) {
alert("Was soll das? Die Daten sollten aufsteigend sortiert sein.");
			}
		}
*/
		//8. Daten um neue Einträge erweitern
		for ( var duI=duRDFPos; duI<duRDFID.length; duI++ )
		{
			duFile = duFolderBase.clone();
			duFile.append(duRDFID[duRDFSorted[duI]]);
			duFile.append("sbp2-html2filename.txt");
			if ( duFile.exists() ) {
				duData = sbp2Common.fileRead(duFile);
				duDataLines = duData.split("\n");
				duOutput_a = duOutput_a + duRDFID[duRDFSorted[duI]] + "\n" + (duDataLines.length-1) + "\n";
				for ( var dcJ=0; dcJ<duDataLines.length; dcJ++ )
				{
					duLine = duDataLines[dcJ].split("\t");
					if ( duLine.length == 2 ) duOutput_b = duOutput_b + duLine[0] + "\t" + duFolderBaseString + duRDFID[duRDFSorted[duI]] + "/" + duLine[1] + "\n";
				}
			}
		}
		//9. Daten unter linkrep_index.txt und linkrep_data.txt ablegen
		duFile = duFolderBase.parent.clone();
		duFile.append("linkrep_index.txt");
		sbp2Common.fileWrite(duFile, duOutput_a, "UTF-8");
		duFile = duFolderBase.parent.clone();
		duFile.append("linkrep_data.txt");
		sbp2Common.fileWrite(duFile, duOutput_b, "UTF-8");
		//10. Einträge in linkrepl.rdf löschen
		for ( var duI=0; duI<duResList.length; duI++ )
		{
			sbp2DataSource.itemDelete(this.slrDatabase, duResList[duI]);
		}
		//11. urn:scrapbook:linkreplstats->entries in linkrepl.rdf auf 0 setzen nach getaner Arbeit
		sbp2DataSource.propertySet(this.slrDatabase, sbp2Common.RDF.GetResource("urn:scrapbook:linkreplstats"), "entries", "0");
		sbp2DataSource.dsFlush(this.slrDatabase);
	},

	slrInit : function()
	{
//wird von sbp2Overlay.init aufgerufen, davor wurde schon slrInitDatabase aufgerufen
		//Initialisiert die Werte für this.slrOptions_act und this.slrOptions_lst
		//
		//Ablauf:
		//1. Prüfen ob Initialisierung schon stattgefunden hat
		//1.1 Initialisierung vornehmen

		//1. Prüfen ob Initialisierung schon stattgefunden hat
		if ( this.slrOptions_act == null ) {
			//1.1 Initialisierung vornehmen
			this.slrOptions_act = sbp2Prefs.getBoolPref("extensions.scrapbookplus2.addons.linkrepl_act", null);
			this.slrOptions_lst = sbp2Prefs.getBoolPref("extensions.scrapbookplus2.addons.linkrepl_lst", null);
			if ( window.parent.gBrowser )
				if ( this.slrOptions_act == true ) window.parent.gBrowser.addEventListener("load", this.slrReplace, true);
		}
	},

	slrInitDatabase : function()
	{
		//Funktion initialisiert eine leere Datenbank oder läd eine vorhandene
		//
		//Ablauf:
		//1. Vorarbeit
		//2. Datenbank laden
		//2a. vorhandene Datenbank laden
		//2b. leere Datenbank anlegen und laden

		//1. Vorarbeit
		var idFile = sbp2Common.getBuchVZ();
		idFile.append("linkrepl.rdf");
		//2. Datenbank laden
		if ( idFile.exists() ) {
			//2a. vorhandene Datenbank laden
			var idFileURL = sbp2Common.IO.newFileURI(idFile).spec;
			this.slrDatabase = sbp2Common.RDF.GetDataSourceBlocking(idFileURL);
		} else {
			//2b. leere Datenbank anlegen und laden
			idFile.create(idFile.NORMAL_FILE_TYPE, parseInt("0666", 8));
			var idFileURL = sbp2Common.IO.newFileURI(idFile).spec;
				//Info: Beim Aufruf wird eine Fehlermeldung geschrieben, da die Datei bislang keinerlei Daten enthält.
				//Ein Abfangen des Fehlers war bislang nicht möglich!
			this.slrDatabase = sbp2Common.RDF.GetDataSourceBlocking(idFileURL);
			sbp2Common.RDFCU.MakeSeq(this.slrDatabase, sbp2Common.RDF.GetResource("urn:scrapbook:linkreplupdate"));
			var idRes = sbp2Common.RDF.GetResource("urn:scrapbook:linkreplstats");
			this.slrDatabase.Assert(idRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#entries"),  sbp2Common.RDF.GetLiteral("-1"), true);
			this.slrDatabase.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
		}
	},

	slrItemAdd : function(iaContString, iaID, iaStatus)
	{
		//Erstellt einen neuen bzw. aktualisiert einen alten Eintrag in slrDatabase.
		//
		//Ablauf:
		//1. Initialisierung
		//2. Da Datenbank von Zeit zu Zeit nicht geladen ist, muss diese Prüfung stattfinden.
		//3. Funktion verlassen, falls noch keine Dateien für die Funktion erzeugt wurden.
		//4. neuen Datensatz anlegen oder einen alten Datensatz aktualisieren
		//4a. alten Datensatz aktualisieren oder löschen
		//4b. neuen Datensatz anlegen
		//5. LinkRepl-Update-Statistik aktualisieren
		//6. Daten als "müssen neu geladen werden" markieren

		//1. Initialisierung
		var iaData = this.slrDatabase;
		//2. Da Datenbank von Zeit zu Zeit nicht geladen ist, muss diese Prüfung stattfinden.
		if ( !iaData ) {
			alert("sbp2LinkRepl.slrItemAdd\n---\nRDF nicht geladen");
			return;
		}
		//3. Funktion verlassen, falls noch keine Dateien für die Funktion erzeugt wurden.
		if ( this.slrDataState == -1 ) return;
		//4. neuen Datensatz anlegen oder einen alten Datensatz aktualisieren
		var iaNewRes = sbp2Common.RDF.GetResource("urn:scrapbook:linkreplstats");
		var iaEntries = sbp2DataSource.propertyGet(iaData, iaNewRes, "entries");
		iaNewRes = sbp2Common.RDF.GetResource("urn:scrapbook:item" + iaID);
		var iaOldStatus = sbp2DataSource.propertyGet(iaData, iaNewRes, "status");
		if ( iaOldStatus != "" ) {
			//4a. alten Datensatz aktualisieren oder löschen
			if ( iaOldStatus == "0" && iaStatus == "2" )
			{
//alert("geloescht");
				sbp2DataSource.itemDelete(iaData, iaNewRes);
				iaEntries--;
			} else {
//alert("edit");
				sbp2DataSource.propertySet(iaData, iaNewRes, "status", iaStatus);
			}
		} else {
//alert("neu");
			//4b. neuen Datensatz anlegen
			iaData.Assert(iaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#id"),     sbp2Common.RDF.GetLiteral(iaID), true);
			iaData.Assert(iaNewRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#status"), sbp2Common.RDF.GetLiteral(iaStatus), true);
			var iaCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
			iaCont.Init(iaData, sbp2Common.RDF.GetResource(iaContString));
			iaCont.AppendElement(iaNewRes);
			iaEntries++;
		}
		//5. LinkRepl-Update-Statistik aktualisieren
		var iaRes = sbp2Common.RDF.GetResource("urn:scrapbook:linkreplstats");
		sbp2DataSource.propertySet(iaData, iaRes, "entries", iaEntries.toString());
		//6. Daten als "müssen neu geladen werden" markieren
		this.slrDataState = 1;
		this.slrDatabase.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
	},

	slrReplace : function(rEvent)
	{
		//Ersetzt externe Verweise (http://...) durch lokale Verweise (file://...). Beim Ersetzen werden nur Seiten berücksichtigt, die
		//sich im geöffneten ScrapBook befinden.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Funktion verlassen, falls  das Fenster, das den Event ausgelöst hat, nicht das Hauptfenster, sondern ein Frame ist.
		//3. Funktion verlassen, falls die Seite im Hauptfenster keine lokale Seite ist, die sich im lokalen ScrapBook befindet
		//4. Hash-Tabelle laden
		//5. Hash-Tabelle verwenden, um externe Verweise durch lokale zu ersetzen, falls die Seite schon archiviert worden ist.

		//1. Variablen initialisieren
		var rWin = rEvent.originalTarget.defaultView;
		var rDoc = rWin.document;
		var rDir = sbp2Common.getBuchVZ().path;
		rDir = rDir.replace(/\\/g, "/");
		//2. Funktion verlassen, falls  das Fenster, das den Event ausgelöst hat, nicht das Hauptfenster, sondern ein Frame ist.
		if ( rWin != rWin.parent ) return;
		//3. Funktion verlassen, falls die Seite im Hauptfenster keine lokale Seite ist, die sich im lokalen ScrapBook befindet
		if ( rDoc.location.href.indexOf(rDir) == -1 ) return;
		//4. Hash-Tabelle laden
		sbp2LinkRepl.slrDataLoad();
		//5. Hash-Tabelle verwenden, um externe Verweise durch lokale zu ersetzen, falls die Seite schon archiviert worden ist.
		var rLinks = null;
		var rFrameList = sbp2Common.getFrameList(rWin);
		for ( var rI=0; rI<rFrameList.length; rI++ )
		{
			rLinks = rFrameList[rI].document.links;
			for ( var rJ=0; rJ<rLinks.length; rJ++ )
			{
				if ( sbp2LinkRepl.slrDataHash[rLinks[rJ]] ) rLinks[rJ].setAttribute("href", sbp2LinkRepl.slrDataHash[rLinks[rJ]]);
			}
		}
	},

	slrSettings : function(sEntryNr)
	{
		//Speichert in about:config den Status der Checkboxen für das Add-on.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Einstellung aktualisieren

		//1. Variablen initialisieren
		var sState = false;
		//2. Einstellung aktualisieren
		if ( sEntryNr == 0 ) {
			if ( document.getElementById("sbp2AddonsLinkReplActivate").getAttribute("checked") ) sState = true;
			sbp2Prefs.setBoolPref("extensions.scrapbookplus2.addons.linkrepl_act", sState);
			if ( sState == false ) {
				document.getElementById("sbp2AddonsLinkReplLinklist").setAttribute("disabled", "true");
				window.parent.gBrowser.removeEventListener("load", sbp2LinkRepl.slrReplace, true);
			} else {
				document.getElementById("sbp2AddonsLinkReplLinklist").setAttribute("disabled", "false");
				this.slrDataCreate();
				window.parent.gBrowser.addEventListener("load", sbp2LinkRepl.slrReplace, true);
			}
		} else {
			if ( document.getElementById("sbp2AddonsLinkReplLinklist").getAttribute("checked") ) sState = true;
			sbp2Prefs.setBoolPref("extensions.scrapbookplus2.addons.linkrepl_lst", sState);
		}
	},

}