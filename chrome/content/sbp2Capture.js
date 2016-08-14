
//Diese Konstanten reduzieren die Laufzeit, da auf sie schneller zugegriffen werden kann
const Ci = Components.interfaces;
const Cr = Components.results;

var sbp2Capture = {

	scDLProgress		: 0,
	scParameter : {
		autostart		: false,
		charset			: "",
		comment			: "",
		dialogAccepted	: true,
		depthMax		: 0,
		embeddedImages	: true,
		embeddedStyles	: true,
		embeddedScript	: false,
		icon			: null,
		id				: null,
		linkedArchives	: false,
		linkedAudio		: false,
		linkedCustom	: false,
		linkedImages	: false,
		linkedMovies	: false,
//		mode			: 0,			//0=Single, 1=InDepth Phase 1, 2=InDepth Phase 2, 3=Add, 4=Add InDepth Phase 1, 5=Add InDepth Phase 2
		mode			: 0,			//0=Single, 1=InDepth, 2=Add, 3=Add InDepth, 9=Image, 10=multiple
		position		: 0,
		resCont			: 0,
		source			: "",
		timeout			: 0,
		title			: "",
		type			: "",
		window			: null
	},
	scPause				: false,//unterbricht die Verarbeitung nach Ablauf des Timeouts
	scSecondsMax		: 0,	//Anzahl Sekunden, die in sbp2CaptureAs.xul vom Benutzer eingestellt worden sind
	scSecondsRem		: 0,	//Anzahl Sekunden, die noch gewartet werden muss, bis cStart aufgerufen werden darf (Wert beginnt bei scSecondsMax und wird auf 0 reduziert)
	scTree				: null,
	scURLTree			: [],	//enthält für jeden Eintrag im Tree die URL
	scURLTreeDepth		: [],	//enthält für jeden Eintrag im Tree die Ebene der URL
	scURLTreeFiletype	: [],	//enthält für jeden Eintrag im Tree den Datei-Typ (dieser entscheidet darüber, ob der Eintrag als einzelne Datei oder als Website bearbeitet wird)
	scURLTreePos		: 0,	//aktuelle Position in sbp2HTMLTree
	scURLTreeItemsRem	: 0,	//enthält die Anzahl an Einträgen, die noch nicht bearbeitet worden ist
	scURLTreeItemsSel	: 0,	//enthält die Anzahl an Einträgen, die momentan ausgewählt ist

	close : function()
	{
		//Schließt das Fenster und teilt sbp2CaptureSaver mit, dass der Download beendet ist.
		//
		//Ablauf:
//		//1. Verbleibende Verweise auf "nicht heruntergeladen" setzen
		//2. Arbeiten im InDepth-Modus abschließen
		//2.1 CSS-Dateien sowie sbp2-html2filename.txt und sbp2.url2filename.txt schreiben
		//3. Download als abgeschlossen kennzeichnen
		//4. Fenster schließen

//		//1. Verbleibende Verweise auf "nicht heruntergeladen" setzen
//		for ( var cI=sbp2Capture.scURLTreePos+1; cI<sbp2Capture.scURLTree.length; cI++ )
//		{
//			sbp2CaptureSaverInDepth.setState(this.scURLTree[cI], 0);
//		}
		//2. Arbeiten im InDepth-Modus abschließen
//Hier muss noch dran gearbeitet werden. Im InDepth Add (3) werden derzeit die sbp2-links.txt und andere aktualisiert, auch wenn nichts gespeichert worden ist.
//Umstellung auf 10 geht nicht, da in sbp2Common.captureTabFinish sonst doch ein neuer Eintrag erstellt werden würde.
		if ( this.scParameter.mode != 10 ) {
			if ( sbp2CaptureSaverInDepth.scsDLProgress[1] > 0 ) {
				//2.1 CSS-Dateien sowie sbp2-html2filename.txt und sbp2.url2filename.txt schreiben
				sbp2CaptureSaverInDepth.captureComplete();
			}
			//2.2 Download als abgeschlossen kennzeichnen
			window.opener.sbp2Common.captureTabFinish(window.arguments[16], window.arguments[13].resCont, -1, this.scParameter.mode, this.scDLProgress);
		}
		//3. Fenster schließen
		window.close();
	},

	cInit : function()
	{
//Wird von sbp2Capture.xul aufgerufen
		//
		var cURLNr = null;
		//this.scParameter initialisieren mit den Parametern, die an das Fenster übergeben wurden
		this.scParameter.depthMax = window.arguments[12].depthMax;
		this.scParameter.embeddedImages = window.arguments[12].embeddedImages;
		this.scParameter.embeddedStyles = window.arguments[12].embeddedStyles;
		this.scParameter.embeddedScript = window.arguments[12].embeddedScript;
		this.scParameter.id = window.arguments[16].id;
		this.scParameter.linkedArchives = window.arguments[12].linkedArchives;
		this.scParameter.linkedAudio = window.arguments[12].linkedAudio;
		this.scParameter.linkedCustom = window.arguments[12].linkedCustom;
		this.scParameter.linkedImages = window.arguments[12].linkedImages;
		this.scParameter.linkedMovies = window.arguments[12].linkedMovies;
		this.scParameter.mode = window.arguments[12].mode;
		this.scParameter.timeout = window.arguments[12].timeout;
/*
sbp2CaptureSaver.scsOptions (window.arguments[12]) enthält diese Parameter überhaupt nicht
		this.scParameter.autostart = window.arguments[12].autostart;
		this.scParameter.charset = window.arguments[12].charset;
		this.scParameter.comment = window.arguments[12].comment;
		this.scParameter.dialogAccepted = window.arguments[12].dialogAccepted;
this.scParameter.depthMax = window.arguments[12].depthMax;
this.scParameter.embeddedImages = window.arguments[12].embeddedImages;
this.scParameter.embeddedStyles = window.arguments[12].embeddedStyles;
this.scParameter.embeddedScript = window.arguments[12].embeddedScript;
		this.scParameter.icon = window.arguments[12].icon;
this.scParameter.id = window.arguments[12].id;
this.scParameter.linkedArchives = window.arguments[12].linkedArchives;
this.scParameter.linkedAudio = window.arguments[12].linkedAudio;
this.scParameter.linkedCustom = window.arguments[12].linkedCustom;
this.scParameter.linkedImages = window.arguments[12].linkedImages;
this.scParameter.linkedMovies = window.arguments[12].linkedMovies;
this.scParameter.mode = window.arguments[12].mode;
		this.scParameter.position = window.arguments[12].position;
		this.scParameter.resCont = window.arguments[12].resCont;
		this.scParameter.source = window.arguments[12].source;
this.scParameter.timeout = window.arguments[12].timeout;
		this.scParameter.title = window.arguments[12].title;
		this.scParameter.type = window.arguments[12].type;
		this.scParameter.window = window.arguments[12].window;
*/
		
		//window.arguments[3] in this.scURLTreeFiletype ablegen
		for ( var ciI=0; ciI<window.arguments[3].length; ciI++ )
		{
			this.scURLTreeFiletype.push(window.arguments[3][ciI]);
		}
		//scsLinks zurücksetzen, da diese bei jedem Capture-Vorgang neu befüllt wird. Ausgangspunkt ist ein leeres Feld.
		sbp2CaptureSaverInDepth.scsLinks = [];
		//globale Variablen von sbp2Capture setzen
		this.scSecondsMax = this.scParameter.timeout;
		this.scTree = document.getElementById("sbp2HTMLTree");
		//Variablen von sbp2CaptureSaverInDepth setzen
		if ( this.scParameter.mode == 1 || this.scParameter.mode == 3 ) sbp2CaptureSaverInDepth.captureInitInDepthNormal(window.arguments[0], window.arguments[1], window.arguments[2], window.arguments[3], window.arguments[4], window.arguments[5], window.arguments[6], window.arguments[7], window.arguments[8], window.arguments[9], window.arguments[10], window.arguments[11], window.arguments[12], window.arguments[13], window.arguments[14], window.arguments[15], window.arguments[16]);
		//übergebene Links in Tree eintragen
		for ( var iI=0; iI<window.arguments[17].length; iI++ )
		{
			if ( this.scParameter.mode == 1 ) {
				this.itemAdd(window.arguments[17][iI], window.arguments[17][iI], "InDepth", 1);
			} else if ( this.scParameter.mode == 3 ) {
				cURLNr = window.arguments[10][window.arguments[17][iI]];
				this.itemAdd(window.arguments[17][iI], window.arguments[17][iI], "InDepth Add", window.arguments[1][cURLNr]);
			} else if ( this.scParameter.mode == 10 ) {
				this.itemAdd(window.arguments[17][iI], window.arguments[17][iI], "Multiple", 1);
			} else {
				dump("sbp2Capture.cInit\n---\n\nunknown mode -- "+this.scParameter.mode+". Contact the developer.");
			}
		}
		//Falls this.scParameter.mode == 3 oder 10, Filter-Einstellungen laden und Auswahl aktualisieren
		if ( this.scParameter.mode == 3 || this.scParameter.mode == 10 ) {
			var iFile = sbp2Common.getBuchVZ();
			iFile.append("data");
			iFile.append(this.scParameter.id);
			iFile.append("sbp2-capflt.txt");
			var iData = sbp2Common.fileRead(iFile);
			var iLines = iData.split("\n");
			for ( var iI=0; iI<iLines.length-1; iI=iI+2 )
			{
				sbp2CaptureFilter.itemAdd(iLines[iI], iLines[iI+1]);
			}
		}
		//Anzahl an Einträgen im Tree merken und Benutzerinformation darüber ausgeben (this.scURLTreeItemsRem ist in itemAdd aktualisiert worden)
		this.scURLTreeItemsSel = this.scURLTreeItemsRem;
		document.getElementById("sbp2Progress").value = this.scURLTreeItemsSel + " " + document.getElementById("sbp2CaptureString").getString("OF") + " " + this.scURLTreeItemsRem + " " + document.getElementById("sbp2CaptureString").getString("ENTRIES");
		//Überwachung des Browser-Objekts aktivieren
		sbp2InvisibleBrowser.init();
		//RDF-Datenquellen initialisieren, falls this.scParameter.mode == 10
		if ( this.scParameter.mode == 10 ) {
			sbp2DataSource.init();
			sbp2DataSource.initSearchCacheUpdate();
			sbp2LinkRepl.slrInitDatabase();
		}
	},

	cNext : function()
	{
		//Zum nächsten selektierten Eintrag im Tree springen. Sollte es keinen mehr geben, wird toggleButtons("finished") aufgerufen.
//sbp2InvisibleBrowser.ELEMENT.stop();
		sbp2Capture.scURLTreePos++;
		sbp2Capture.scURLTreeItemsRem--;
		if ( this.scPause == false ) {
			if ( sbp2Capture.scURLTreePos<sbp2Capture.scURLTree.length ) {
				sbp2Capture.cStart();
			} else {
				this.toggleButtons("finished");
			}
		} else {
			sbp2Capture.toggleButtons("pause");
			document.getElementById("sbp2Progress").value = document.getElementById("sbp2CaptureString").getString("PAUSE");
		}
	},

	cStart : function()
	{
		//Beginnen/Fortsetzen der Archivierung
		//
		//Ablauf:
		//1. Variablen zurücksetzen
		//2. Selektierten Eintrag verarbeiten, nicht selektierten Eintrag überspringen
		//2.1 Seite laden
		//2.2 Seite überspringen

		//1. Variablen zurücksetzen
//alert("cStart\n"+sbp2CaptureSaverInDepth.scsDLProgress[0]+" - "+sbp2CaptureSaverInDepth.scsDLProgress[1]);
		this.scPause = false;
		//2. Selektierten Eintrag verarbeiten, nicht selektierten Eintrag überspringen
		if ( this.scTree.childNodes[1].childNodes[sbp2Capture.scURLTreePos].childNodes[0].childNodes[0].getAttribute("value") == "true" ) {
			//2.1 Seite laden
//alert("this.scURLTreePos - "+this.scURLTreePos+"\n"+
//      "this.scURLTree[this.scURLTreePos] - "+this.scURLTree[this.scURLTreePos]);
			if ( this.scParameter.mode == 10 ) {
				var csURLNr = this.scURLTreePos;
				if ( this.scURLTreeFiletype[csURLNr] < 2 ) {
					this.scSecondsRem = this.scSecondsMax;
					document.getElementById("sbp2Progress").value = document.getElementById("sbp2CaptureString").getString("LOAD") + " " + this.scURLTree[this.scURLTreePos] + " ...";
					this.scParameter.source = this.scURLTree[this.scURLTreePos];
//					sbp2CaptureSaverMultiple.captureInitNormal(null, this.scParameter);
					this.scDLProgress = 1;
					sbp2InvisibleBrowser.load(this.scURLTree[this.scURLTreePos]);
				} else {
alert("War hier!");
//					sbp2CaptureSaverMultiple.downSaveFileAdd(this.scURLTree[this.scURLTreePos], this.scURLTreeDepth[this.scURLTreePos], this.scURLTreeFiletype[csURLNr]);
//					this.onSuccess();
				}
			} else {
				var csURLNr = sbp2CaptureSaverInDepth.scsHashURL[this.scURLTree[this.scURLTreePos]];
				if ( sbp2CaptureSaverInDepth.scsArrayURLFiletype[csURLNr] < 2 ) {
					this.scSecondsRem = this.scSecondsMax;
					document.getElementById("sbp2Progress").value = document.getElementById("sbp2CaptureString").getString("LOAD") + " " + this.scURLTree[this.scURLTreePos] + " ...";
					this.scDLProgress = 1;
					sbp2InvisibleBrowser.load(this.scURLTree[this.scURLTreePos]);
				} else {
					this.scDLProgress = 1;
					sbp2CaptureSaverInDepth.downSaveFileAdd(this.scURLTree[this.scURLTreePos], this.scURLTreeDepth[this.scURLTreePos], this.scURLTreeFiletype[csURLNr]);
					this.onSuccess();
				}
			}
		} else {
			//2.2 Seite überspringen
			this.onSkip();
		}
	},

	cTreeUpdate : function()
	{
		//Ändert die Formatierung des aktuellen Eintrags

		//Eintrag als "aktuell in Bearbeitung" markieren
		this.scTree.childNodes[1].childNodes[this.scURLTreePos].childNodes[0].childNodes[0].setAttribute("properties", "disabled");
//		this.scTree.childNodes[1].childNodes[this.scURLTreePos].childNodes[0].setAttribute("properties", "current");
		this.cWait();
	},

	cWait : function()
	{
		//Wartet mit dem Aufruf von cNext so lange, bis [sbp2Capture.scSecondsMax] Sekunden verstrichen sind.
		if ( sbp2Capture.scSecondsRem > 0 ) {
			document.getElementById("sbp2Progress").value = document.getElementById("sbp2CaptureString").getString("WAIT") + " \("+sbp2Capture.scSecondsRem + "s\) ...";
			sbp2Capture.scSecondsRem--;
			window.setTimeout(sbp2Capture.cWait, 1000);
		} else {
			sbp2Capture.cNext();
		}
	},

	getCurrentURLFromTree : function()
	{
//wird von sbp2CaptureSaver.??? aufgerufen
		//Liefert die Adresse der Seite an die aufrufende Funktion zurueck.
		//Die Adresse wird mit der Adresse des aktuellen Fensters/Frames verglichen, um einen Redirect erkennen zu koennen
		//(Adresse des Tree != Adresse des aktuellen Fensters/Frames)
		//
		//Ablauf:
		//1. Adresse des Eintrags, der gerade in Bearbeitung ist zurück an die aufrufende Funktion

		//1. Adresse des Eintrags, der gerade in Bearbeitung ist zurück an die aufrufende Funktion
		return this.scURLTree[this.scURLTreePos];
	},

	itemAdd : function(iaURL, iaTitle, iaMode, iaDepth)
	{
		//Aufnahme der Adresse in die Liste. Eine Prüfung, ob die Adresse gültig ist, findet vor dem
		//Aufruf dieser Funktion statt.
		var iaChecked = false;
		this.scURLTree.push(iaURL);
		this.scURLTreeDepth.push(iaDepth);
		for (var iaI=0; iaI < this.scTree.childNodes.length; iaI++)
		{
			if (this.scTree.childNodes[iaI].nodeName == "treechildren") {
				var iaTchild = this.scTree.childNodes[iaI];
				var iaTrow = document.createElement("treerow");
				var iaTcell0 = document.createElement("treecell");
				iaChecked = sbp2CaptureFilter.useFilter(iaURL);
				iaTcell0.setAttribute("value", iaChecked);
				iaTrow.appendChild(iaTcell0);
				var iaTcell1 = document.createElement("treecell");
				iaTcell1.setAttribute("label", iaURL);
				iaTrow.appendChild(iaTcell1);
				var iaTcell2 = document.createElement("treecell");
				iaTcell2.setAttribute("label", iaTitle);
				iaTrow.appendChild(iaTcell2);
				var iaTcell3 = document.createElement("treecell");
				if ( iaMode == "InDepth" || iaMode == "InDepth Add" ) {
					iaTcell3.setAttribute("label", iaMode+" ("+iaDepth+")");
				} else {
					iaTcell3.setAttribute("label", iaMode+" ("+this.scTree.childNodes[1].childNodes.length+")");
				}
				iaTrow.appendChild(iaTcell3);
				var iaTitem = document.createElement("treeitem");
				iaTitem.appendChild(iaTrow);
				iaTchild.appendChild(iaTitem);
			}
		}
		this.scURLTreeItemsRem++;
		if ( iaChecked == true ) {
			this.scURLTreeItemsSel++;
		} else {
			this.scURLTreeItemsSel--;
		}
		return iaChecked;
	},

	onFailure : function(ofResponseCode)
	{
		//1. Ansicht aktualisieren
		document.getElementById("sbp2CaptureCount").value = (this.scURLTreePos+1)+" \/ "+this.scURLTree.length;
		var osTreecell = document.createElement("treecell");
		osTreecell.setAttribute("label", ofResponseCode);
		osTreecell.setAttribute("properties", "failure");
		this.scTree.childNodes[1].childNodes[this.scURLTreePos].childNodes[0].appendChild(osTreecell);
		//2. sbp2CaptureSaverInDepth.scsArrayURLState[?] muss auf 0 gesetzt werden
		sbp2CaptureSaverInDepth.setState(this.scURLTree[this.scURLTreePos], 0);
		//3. Formatierung für aktuellen Eintrag im Tree anpassen
		this.cTreeUpdate();
	},

	onSkip : function()
	{
		//1. Ansicht aktualisieren
		document.getElementById("sbp2CaptureCount").value = (this.scURLTreePos+1)+" \/ "+this.scURLTree.length;
		document.getElementById("sbp2Progress").value = "";
		//2. sbp2CaptureSaverInDepth.scsArrayURLState[?] muss auf 0 gesetzt werden
		sbp2CaptureSaverInDepth.setState(this.scURLTree[this.scURLTreePos], 0);
		//3. Formatierung für aktuellen Eintrag im Tree anpassen
		this.cTreeUpdate();
	},

	onSuccess : function()
	{
		//1. Ansicht aktualisieren
		document.getElementById("sbp2CaptureCount").value = (this.scURLTreePos+1)+" \/ "+this.scURLTree.length;
		var osTreecell = document.createElement("treecell");
		osTreecell.setAttribute("label", "OK");
		osTreecell.setAttribute("properties", "success");
		this.scTree.childNodes[1].childNodes[this.scURLTreePos].childNodes[0].appendChild(osTreecell);
		//2. Formatierung für aktuellen Eintrag im Tree anpassen
		this.cTreeUpdate();
	},

	toggleButtons : function(tbEvent)
	{
		//Aktiviert/Deaktiviert die Knöpfe in der oberen Leiste im Fenster "Archivierung"
		switch (tbEvent)
		{
			case "finished":
				document.getElementById("sbp2CaptureStartButton").disabled = true;
				document.getElementById("sbp2CapturePauseButton").disabled = true;
				document.getElementById("sbp2CaptureSkipButton").disabled = true;
				document.getElementById("sbp2CaptureFinishButton").disabled = false;
				break;
			case "pause":
				document.getElementById("sbp2CaptureStartButton").disabled = false;
				document.getElementById("sbp2CapturePauseButton").disabled = true;
				document.getElementById("sbp2CaptureSkipButton").disabled = true;
				document.getElementById("sbp2CaptureFinishButton").disabled = false;
				break;
			case "start":
				document.getElementById("sbp2CaptureStartButton").disabled = true;
				document.getElementById("sbp2CapturePauseButton").disabled = false;
				document.getElementById("sbp2CaptureSkipButton").disabled = false;
				document.getElementById("sbp2CaptureFinishButton").disabled = true;
				break;
		}
	},

	toggleFilterBox : function()
	{
		//Blendet die Filterbox ein oder aus
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Filterbox ein-/ausblenden

		//1. Variablen initialisieren
		var tfbChecked = document.getElementById("sbp2ChkFilter").checked;
		//2. Filterbox ein-/ausblenden
		if ( tfbChecked ) {
			document.getElementById("sbp2FilterBox").hidden = false;
		} else {
			document.getElementById("sbp2FilterBox").hidden = true;
		}
	},

	treeButtonsCheck : function()
	{
		//Aktiviert bzw. deaktiviert den Start-Knopf. Außerdem wird die Anzahl der noch nicht bearbeiteten Einträge im Tree ausgegeben sowie die Anzahl der Einträge, die selektiert sind.
		//Damit der Start-Knopf aktiviert wird, muss sich bei mindestens einem Eintrag im Tree in der Checkbox ein Haken befinden.
		document.getElementById("sbp2Progress").value = this.scURLTreeItemsSel + " " + document.getElementById("sbp2CaptureString").getString("OF") + " " + this.scURLTreeItemsRem + " " + document.getElementById("sbp2CaptureString").getString("ENTRIES");
		if ( this.scURLTreeItemsSel == 0 ) {
			document.getElementById("sbp2CaptureStartButton").disabled = true;
		} else {
			document.getElementById("sbp2CaptureStartButton").disabled = false;
		}
	},

	treeCheckboxSet : function(tcsBool)
	{
		//Noch nicht bearbeitete Einträge in sbp2HTMLTree werden auf tcsBool (true/false) gesetzt.
		//Außerdem wird der Start-Knopf aktiviert bzw. deaktiviert.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Eintrag an-/abwählen
		//3. Start-Knopf aktivieren bzw. deaktivieren und Status-Information für Anwender ausgeben
		//1. Variablen initialisieren
		if ( tcsBool == false ) {
			this.scURLTreeItemsSel = 0;
		} else {
			this.scURLTreeItemsSel = this.scURLTreeItemsRem;
		}
		//2. Eintrag an-/abwählen
		for ( var tcsI=sbp2Capture.scURLTreePos; tcsI<sbp2Capture.scURLTree.length; tcsI++ )
		{
			this.scTree.childNodes[1].childNodes[tcsI].childNodes[0].childNodes[0].setAttribute("value", tcsBool);
		}
		//3. Start-Knopf aktivieren bzw. deaktivieren und Status-Information für Anwender ausgeben
		this.treeButtonsCheck();
	},

	treeCheckboxSetSelection : function(tcssBoolString)
	{
//wird von sbp2Capture.xul aufgerufen
		//Selektierte Einträge werden auf tcsBool (true/false) gesetzt.
		//Außerdem wird der Start-Knopf aktiviert bzw. deaktiviert.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Eintrag an-/abwählen
		//3. Start-Knopf aktivieren bzw. deaktivieren und Status-Information für Anwender ausgeben

		//1. Variablen initialisieren
		var tcssTree = document.getElementById("sbp2HTMLTree");
		var tcssNumRanges = tcssTree.view.selection.getRangeCount();
		var tcssStart = new Object();
		var tcssEnd = new Object();
		var tcssValue = null;
		//2. Einträge an-/abwählen
		for ( var tcssI=0; tcssI<tcssNumRanges; tcssI++ )
		{
			tcssTree.view.selection.getRangeAt(tcssI, tcssStart, tcssEnd);
			for ( var tcssJ=tcssStart.value; tcssJ<=tcssEnd.value; tcssJ++ )
			{
				tcssValue = this.scTree.childNodes[1].childNodes[tcssJ].childNodes[0].childNodes[0].getAttribute("value");
				if ( tcssBoolString != tcssValue ) {
					if ( tcssValue == "false" ) {
						this.scURLTreeItemsSel++;
					} else {
						this.scURLTreeItemsSel--;
					}
					this.scTree.childNodes[1].childNodes[tcssJ].childNodes[0].childNodes[0].setAttribute("value", tcssBoolString);
				}
			}
		}
		//3. Start-Knopf aktivieren bzw. deaktivieren und Status-Information für Anwender ausgeben
		this.treeButtonsCheck();
	},

	treeOnClick : function(tocEvent)
	{
		//sbp2Capture.treeButtonsCheck wird nur ausgeführt, falls der Eintrag im Tree noch nicht verarbeitet und in die erste Spalte geklickt wurde.
		var tocIndex = this.scTree.currentIndex;
		if ( tocIndex >= this.scURLTreePos ) {
			var tocCol = {};
			this.scTree.treeBoxObject.getCellAt(tocEvent.clientX, tocEvent.clientY, {}, tocCol, {});
			if ( tocCol.value ) {
				if ( tocCol.value.index == 0 ) {
//Muss noch geprüft werden, welchen Typ tokpValue hat
					var tocValue = this.scTree.childNodes[1].childNodes[tocIndex].childNodes[0].childNodes[0].getAttribute("value");
					var tocChecked = "true";
					if ( tocValue == "true" ) {
						tocChecked = "false";
						this.scURLTreeItemsSel--;
					} else {
						this.scURLTreeItemsSel++;
					}
					this.scTree.childNodes[1].childNodes[tocIndex].childNodes[0].childNodes[0].setAttribute("value", tocChecked);
					this.treeButtonsCheck();
				}
			}
		}
	},

	treeOnKeyPress : function(tokpEvent)
	{
		//sbp2Capture.treeButtonsCheck wird nur ausgeführt, wenn die Leertaste gedrückt wurde.
		//Außerdem wird der Haken der Checkbox des selektierten Eintrags gesetzt oder entfernt.
		if ( tokpEvent.charCode == 32 ) {
			var tokpIndex = this.scTree.currentIndex;
//Muss noch geprüft werden, welchen Typ tokpValue hat
			var tokpValue = this.scTree.childNodes[1].childNodes[tokpIndex].childNodes[0].childNodes[0].getAttribute("value");
			var tokpChecked = "true";
			if ( tokpValue == "true" ) {
				tokpChecked = "false";
				this.scURLTreeItemsSel--;
			} else {
				this.scURLTreeItemsSel++;
			}
			this.scTree.childNodes[1].childNodes[tokpIndex].childNodes[0].childNodes[0].setAttribute("value", tokpChecked);
			this.treeButtonsCheck();
		}
	}

};

var sbp2InvisibleBrowser = {

	get ELEMENT() { return document.getElementById("sbp2CaptureBrowser"); },

	execCapture : function()
	{
		//Ablauf:
		//1. Variablen initialisieren
		//2. Seite archivieren
		//3. scsLinks einfügen in Liste. Die Adressen können nicht doppelt sein, da sie vor der Aufnahme mit scsHashURL und scsHashURLHTML abgeglichen werden.
		//4. Benutzer über Fortschritt informieren

		//1. Variablen initialisieren
		var ecNr = -1;
		//2. Seite archivieren
		if ( sbp2Capture.scParameter.mode == 1 ) {
			sbp2CaptureSaverInDepth.capture(this.ELEMENT.contentWindow, "", sbp2Capture.scURLTreeDepth[sbp2Capture.scURLTreePos]);
		} else if ( sbp2Capture.scParameter.mode == 3 ) {
			sbp2CaptureSaverInDepth.capture(this.ELEMENT.contentWindow, "", sbp2Capture.scURLTreeDepth[sbp2Capture.scURLTreePos]);
		} else if ( sbp2Capture.scParameter.mode == 10 ) {
			//2.1 Verzeichnis erstellen
			sbp2Capture.scParameter.id = sbp2Common.directoryCreate();
			//2.2 Titel und Zeichensatz bestimmen
			sbp2Capture.scParameter.title = this.ELEMENT.contentDocument.title;
			sbp2Capture.scParameter.chars = this.ELEMENT.contentDocument.characterSet;
			//2.3 Seite speichern
			sbp2CaptureSaver.captureInitNormal(this.ELEMENT.contentWindow, sbp2Capture.scParameter);
		} else {
			alert("sbp2InvisibleBrowser.execCapture\n---\n\nunknown mode -- "+sbp2Capture.scParameter.mode+". Contact the developer.");
		}
/*
		//3. scsLinks einfügen in Liste. Die Adressen können nicht doppelt sein, da sie vor der Aufnahme mit scsHashURL und scsHashURLHTML abgeglichen werden.
		for ( var ecI=0; ecI<sbp2CaptureSaverInDepth.scsLinks.length; ecI++ )
		{
			ecNr = sbp2Capture.scURLTree.length;
			sbp2Capture.scURLTree.push(sbp2CaptureSaverInDepth.scsLinks[ecI]);
			sbp2Capture.itemAdd(sbp2Capture.scURLTree[ecNr], sbp2Capture.scURLTree[ecNr], "", "");
		}
*/
		//4. Benutzer über Fortschritt informieren
		sbp2Capture.onSuccess();
	},

	init : function()
	{
		//Setzt einen ProgressListener. Steht aStateFlags beim Aufruf der Funktion onStateChange auf 786448, ist die Seite komplett geladen.
		try
		{
			this.ELEMENT.webProgress.removeProgressListener(this, Ci.nsIWebProgress.NOTIFY_ALL);
		} catch(iEx)
		{
		}
		this.ELEMENT.webProgress.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_ALL);
	},

	load : function(lURL)
	{
		//Konfiguriert sbp2CaptureBrowser und läd lURL
		//
		//Ablauf:
		//1. Grundeinstellung für das Laden der übergebenen Seite
		//2. Laden der Seite

		//1. Grundeinstellung für das Laden der übergebenen Seite
//		this.ELEMENT.docShell.allowJavascript = sbp2Capture.scParameters.embeddedJava;
//		this.ELEMENT.docShell.allowImages     = sbp2Capture.scParameters.embeddedImages;
		this.ELEMENT.docShell.allowMetaRedirects = false;
		if ( Ci.nsIDocShellHistory ) {
			this.ELEMENT.docShell.QueryInterface(Ci.nsIDocShellHistory).useGlobalHistory = false;
		} else {
			this.ELEMENT.docShell.useGlobalHistory = false;
		}
		//2. Laden der Seite
		try
		{
			this.ELEMENT.loadURI(lURL, null, null);
		} catch(lEx)
		{
			alert("sbp2InvisibleBrowser.load Fehler");
/*
			//Download als fehlgeschlagen vermerken
			sbp2Capture.scStatus[sbp2Capture.scURLPos] = -1;
			//Benutzer über Fehler informieren
			sbp2Capture.onFailure();
*/
		}
	},

	QueryInterface : function(aIID)
	{
		if (aIID.equals(Ci.nsIWebProgressListener) ||
			aIID.equals(Ci.nsISupportsWeakReference) ||
			aIID.equals(Ci.nsIXULBrowserWindow) ||
			aIID.equals(Ci.nsISupports))
			return this;
		throw Cr.NS_NOINTERFACE;
	},

	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
		if ( aStateFlags == 786448 ) {
			//Variablen initialisieren
			var oscChannel = this.ELEMENT.docShell.currentDocumentChannel;
			var oscHTTPChannel;
			//Werte verarbeiten
			if ( !oscChannel ) alert("onStateChange - Problem");
			try
			{
				oscHTTPChannel = oscChannel.QueryInterface(Ci.nsIHttpChannel);
			} catch (oscEx)
			{
				//oscChannel ist kein HTTP Channel
				alert("onStateChange - kein HTTP Channel\n"+oscEx);
			}
			//Capture nur ausführen, falls responseStatus 200 ist
			//(Einschränkung auf 200 könnte Probleme bereiten)
			if ( oscHTTPChannel ) {
				if ( oscHTTPChannel.responseStatus == 200 ) {
					sbp2InvisibleBrowser.execCapture();
				} else {
					sbp2Capture.onFailure(oscHTTPChannel.responseStatus);
				}
			}
		}
	},

	onProgressChange : function() {},
	onStatusChange   : function() {},
	onLocationChange : function() {},
	onSecurityChange : function() {},

}