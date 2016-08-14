
var sbp2Preferences = {

	spElements        : [],		//enthält einen Verweis auf die 5 Eingabefelder
	spKeysChanged     :  0,		//0=keine akzeptierte Taste bei aktiver Textbox gedrückt, 1=Taste gedrückt
	spKeysAccel       : -1,		//enthält den KeyCode für accel
	spKeysModifiers   : [],		//enthält den modifier in der Reihenfolge Umschalt, Strg und Alt
	spKeysTranslated  : [],		//enthält die übersetzungen aus prefs.properties in der Reihenfolge Umschalt, Strg und Alt
	spKeysSetTransltd : [],		//enthält die derzeitigen, vom Anwender gesetzten, Werte in lesbarer Form

	spHighlighterCopyMode  : 0,		//0=aus, 1=copy, 2=cut
	spHighlighterModified  : 0,		//0=kein Markierstift wurde verändert oder hinzugefügt, 1=mindestens ein Markierstift wurde verändert oder hinzugefügt
	spHighlighterName      : [],	//enthält die Namen der Markierstifte
	spHighlighterNamePreview : "",	//enthält den Wert des Markierstifts, der gerade im Bereich der Vorschau angezeigt wird
	spHighlighterNrCop     : [],	//0=nicht bearbeitet, 1=kopiert, 2=ausgeschnitten
	spHighlighterNrSel     : [],	//0=nicht selektiert, 1=selektiert
	spHighlighterNrSelCount: -1,	//Anzahl an selektierten Einträgen
	spHighlighterNrSelFirst: -1,	//enthält die Nummer des Markierstifts, der angeklickt wurde (ohne Shift-/Strg-Taste); entspricht dem Eintrag, der rechts im Fenster dargestellt wird
	spHighlighterStyle     : [],	//enthält die Angaben zur optischen Gestaltung der Markiertstifte
	spHighlighterStylePreview : "",	//enthält den Wert des Markierstifts, der gerade im Bereich der Vorschau angezeigt wird

	spTreecolorsModified  : 0,		//0=kein Markierstift wurde verändert oder hinzugefügt, 1=mindestens ein Markierstift wurde verändert oder hinzugefügt
	spTreecolorsName      : [],		//enthält die Namen der Einträge
	spTreecolorsNrSel     : [],		//0=nicht selektiert, 1=selektiert
	spTreecolorsStyle     : [],		//enthält die Angaben zur optischen Gestaltung der Einträge

	accept : function()
	{
//Wird derzeit nur von sbp2Preferences.onunload aufgerufen.
		//Wird beim Schließen des Preferences-Fensters ausgeführt.
		this.keysAccept();
		if ( this.spHighlighterModified == 1 ) this.highlighterAccept();
		if ( this.spTreecolorsModified == 1 ) this.treecolorsAccept();
	},

	init : function()
	{
//Wird derzeit nur von sbp2Preferences.onload aufgerufen.
		//Wird beim Öffnen des Preferences-Fensters ausgeführt.
		this.treecolorsInit();
		this.highlighterInit();
		this.keysInit();
	},

	show : function()
	{
		alert(document.getElementById('sbp2PrefEditorHighlighterList').childNodes[0].childNodes[0].label);
	},

	close : function()
	{
		//Derzeit ist kein Code notwendig. Daher ist diese Funktion leer.
	},

	highlighterAccept : function()
	{
//Wird derzeit nur von sbp2Preferences.accept aufgerufen.
		//Aktualisiert den Inhalt der Datei highlighter.txt für das geöffnete ScrapBook.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. neuen Inhalt von highlighter.txt zusammenstellen
		//3. highlighter.txt aktualisieren
		//4. In allen Fenstern sbp2Editor.hlInit aufrufen, um sicherzugehen, dass die Auswahlliste aktuell ist

		//1. Variablen initialisieren
		var haData = "";
		var haFile = sbp2Common.getBuchVZ();
		haFile.append("highlighter.txt");
		var haWin = null;
		//2. neuen Inhalt von highlighter.txt zusammenstellen
		for ( var haI=0; haI<this.spHighlighterName.length; haI++ )
		{
			haData = haData + this.spHighlighterName[haI] + "\n" + this.spHighlighterStyle[haI] + "\n";
		}
		//3. highlighter.txt aktualisieren
		sbp2Common.fileWrite(haFile, haData, "UTF-8");
		//4. In allen Fenstern sbp2Editor.hlInit aufrufen, um sicherzugehen, dass die Auswahlliste aktuell ist
		var haWinEnum = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getEnumerator("navigator:browser");
		while ( haWinEnum.hasMoreElements() ) {
			haWin = haWinEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			try {
				if ( haWin.sbp2Editor.seHighlighterState > 0 ) {
					haWin.sbp2Editor.hlInit(haData.split("\n"));
					haWin.sbp2Editor.hlUIUpdate();
				}
			}
			catch(haEx) {
			}
		}
	},

	highlighterActionCopy : function()
	{
//Wird derzeit nur von sbp2Preferences.xul verwendet.
		//Beim Aufruf werden die selektierten Einträge im Browser als kopiert markiert (border-style: dashed).
		var hacBody = document.getElementById("sbp2EditorHLBrowser").contentWindow.document.body;
		for ( var hacI=this.spHighlighterName.length-1; hacI>-1; hacI-- )
		{
			if ( this.spHighlighterNrSel[hacI] == 1 ) {
				//2.1 Eintrag im Browser als "kopiert" markieren
				hacBody.childNodes[hacI].setAttribute("style", "border-width:1px; border-style:dashed; border-color:black; padding:4px;");
				//2.2 Eintrag in globaler Variable als "kopiert" markieren
				sbp2Preferences.spHighlighterNrCop[hacI] = 1;
				//2.3 Eintrag ist nicht mehr "selektiert"
				sbp2Preferences.spHighlighterNrSel[hacI] = 0;
			} else {
				//2.1 Markierung im Browser aufheben, da der Eintrag nicht selektiert war
				if ( this.spHighlighterNrCop[hacI] > 0 ) {
					hacBody.childNodes[hacI].setAttribute("style", "padding:5px;");
					sbp2Preferences.spHighlighterNrCop[hacI] = 0;
				}
			}
		}
		sbp2Preferences.spHighlighterCopyMode = 1;
		sbp2Preferences.spHighlighterNrSelCount = 0;
	},

	highlighterActionCut : function()
	{
//Wird derzeit nur von sbp2Preferences.xul verwendet.
		//Beim Aufruf werden die selektierten Einträge im Browser als ausgeschnitten markiert (border-style: dotted).
		var hacBody = document.getElementById("sbp2EditorHLBrowser").contentWindow.document.body;
		for ( var hacI=this.spHighlighterName.length-1; hacI>-1; hacI-- )
		{
			if ( this.spHighlighterNrSel[hacI] == 1 ) {
				//2.1 Eintrag im Browser als "ausgeschnitten" markieren
				hacBody.childNodes[hacI].setAttribute("style", "border-width:1px; border-style:dotted; border-color:black; padding:4px;");
				//2.2 Eintrag in globaler Variable als "ausgeschnitten" markieren
				sbp2Preferences.spHighlighterNrCop[hacI] = 2;
				//2.3 Eintrag ist nicht mehr "selektiert"
				sbp2Preferences.spHighlighterNrSel[hacI] = 0;
			} else {
				//2.1 Markierung im Browser aufheben, da der Eintrag nicht selektiert war
				if ( this.spHighlighterNrCop[hacI] > 0 ) {
					hacBody.childNodes[hacI].setAttribute("style", "padding:5px;");
					sbp2Preferences.spHighlighterNrCop[hacI] = 0;
				}
			}
		}
		sbp2Preferences.spHighlighterCopyMode = 2;
		sbp2Preferences.spHighlighterNrSelCount = 0;
	},

	highlighterActionDelete : function()
	{
//Wird derzeit nur von sbp2Preferences.xul verwendet.
		//Beim Aufruf werden die selektierten Einträge im Browser gelöscht.
		//
		//Ablauf:
		//1. Sicherheitsabfrage
		//2. Einträge löschen
		//2.1 Einträge im Browser löschen
		//2.2 Einträge in den Variablen löschen
		//2.3 Vermerken, dass 1 Eintrag verändert wurde

		//1. Sicherheitsabfrage
		var hadAnswer = window.confirm(document.getElementById("sbp2PreferencesString").getString("QUESTION_DELETE_M"));
		//2. Einträge löschen
		if ( hadAnswer ) {
			var hadBody = document.getElementById("sbp2EditorHLBrowser").contentWindow.document.body;
			for ( var hadI=this.spHighlighterName.length-1; hadI>-1; hadI-- )
			{
				if ( this.spHighlighterNrSel[hadI] == 1 ) {
					//2.1 Einträge im Browser löschen
					hadBody.removeChild(hadBody.childNodes[hadI]);
					//2.2 Einträge in den Variablen löschen
					this.spHighlighterName.splice(hadI, 1);
					this.spHighlighterNrCop.splice(hadI, 1);
					this.spHighlighterNrSel.splice(hadI, 1);
					this.spHighlighterStyle.splice(hadI, 1);
					//2.3 Vermerken, dass 1 Eintrag verändert wurde
					this.spHighlighterModified = 1;
				}
			}
		}
	},

	highlighterActionPasteA : function()
	{
//Wird derzeit nur von sbp2Preferences.xul verwendet.
		//Beim Aufruf werden die kopierten/ausgeschnittenen Einträge nach dem gerade selektierten Eintrag eingefügt.
		//Durch die cloneNode-Methode in Schritt 2 kann kontrolliert werden, ob der Eintrag später kopiert oder verschoben wird.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. selektierten Node bestimmen
		//3. Nodes der kopierten/ausgeschnittenen Einträge zusammenstellen
		//4. Einträge einfügen
		//5. globale Variablen aktualisieren

		//1. Variablen initialisieren
		var hapaBody = document.getElementById("sbp2EditorHLBrowser").contentWindow.document.body;
		var hapaNodes = [];
		var hapaNodesCopName = [];
		var hapaNodesCopStyle = [];
		var hapaNodeCorrection = 0;
		var hapaNodesName = [];
		var hapaNodeNr = -1;
		var hapaNodeSel = null;
		var hapaNodesStyle = [];
		//2. selektierten Node bestimmen
		for ( var hapaI=0; hapaI<this.spHighlighterNrSel.length; hapaI++ )
		{
			if ( this.spHighlighterNrSel[hapaI] == 1 ) {
				hapaNodeSel = hapaBody.childNodes[hapaI];
				hapaNodeSel.setAttribute("style", "padding:5px;");
				hapaNodeNr = hapaI;
				hapaI = this.spHighlighterNrSel.length;
			}
		}
		//3. Nodes der kopierten/ausgeschnittenen Einträge zusammenstellen
		//   (soll kopiert werden, wird cloneNode verwendet)
		for ( var hapaI=0; hapaI<this.spHighlighterNrCop.length; hapaI++ )
		{
			if ( this.spHighlighterNrCop[hapaI] == 1 ) {
				hapaBody.childNodes[hapaI].setAttribute("style", "padding:5px;");
				hapaNodes.push(hapaBody.childNodes[hapaI].cloneNode(true));
				hapaNodesName.push(this.spHighlighterName[hapaI]);
				hapaNodesStyle.push(this.spHighlighterStyle[hapaI]);
				hapaNodesCopName.push(this.spHighlighterName[hapaI]);
				hapaNodesCopStyle.push(this.spHighlighterStyle[hapaI]);
			} else if ( this.spHighlighterNrCop[hapaI] == 2 ) {
				hapaBody.childNodes[hapaI].setAttribute("style", "padding:5px;");
				hapaNodes.push(hapaBody.childNodes[hapaI]);
				hapaNodesCopName.push(this.spHighlighterName[hapaI]);
				hapaNodesCopStyle.push(this.spHighlighterStyle[hapaI]);
				if ( hapaI < hapaNodeNr ) hapaNodeCorrection++;
			} else {
				hapaNodesName.push(this.spHighlighterName[hapaI]);
				hapaNodesStyle.push(this.spHighlighterStyle[hapaI]);
			}
		}
		//4. Einträge einfügen
		for ( var hapaI=hapaNodes.length-1; hapaI>-1; hapaI-- )
		{
			hapaBody.insertBefore(hapaNodes[hapaI], hapaNodeSel.nextSibling);
		}
		//5. globale Variablen aktualisieren
		hapaNodeNr = hapaNodeNr - hapaNodeCorrection;
		this.spHighlighterNrCop = [];
		this.spHighlighterCopyMode = 0;
		this.spHighlighterModified = 1;
		this.spHighlighterName = [];
		this.spHighlighterNrSel = [];
		this.spHighlighterNrSelCount = -1;
		this.spHighlighterNrSelFirst = -1;
		this.spHighlighterStyle = [];
		for ( var hapaI=0; hapaI<hapaNodesName.length; hapaI++ )
		{
			this.spHighlighterName.push(hapaNodesName[hapaI]);
			this.spHighlighterStyle.push(hapaNodesStyle[hapaI]);
			this.spHighlighterNrSel.push(0);
			this.spHighlighterNrCop.push(0);
			if ( hapaI == hapaNodeNr ) {
				for ( var hapaJ=0; hapaJ<hapaNodesCopName.length; hapaJ++ )
				{
					this.spHighlighterName.push(hapaNodesCopName[hapaJ]);
					this.spHighlighterStyle.push(hapaNodesCopStyle[hapaJ]);
					this.spHighlighterNrSel.push(0);
					this.spHighlighterNrCop.push(0);
				}
			}
		}
//		alert(this.spHighlighterName.length+"\n"+this.spHighlighterStyle.length+"\n"+this.spHighlighterNrCop.length+"\n"+this.spHighlighterNrSel.length);
	},

	highlighterActionPasteB : function()
	{
		//Beim Aufruf werden die kopierten/ausgeschnittenen Einträge vor dem gerade selektierten Eintrag eingefügt.
		//Durch die cloneNode-Methode in Schritt 2 kann kontrolliert werden, ob der Eintrag später kopiert oder verschoben wird.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. selektierten Node bestimmen
		//3. Nodes der kopierten/ausgeschnittenen Einträge zusammenstellen
		//4. Einträge einfügen
		//5. globale Variablen aktualisieren

		//1. Variablen initialisieren
		var hapaBody = document.getElementById("sbp2EditorHLBrowser").contentWindow.document.body;
		var hapaNodes = [];
		var hapaNodesCopName = [];
		var hapaNodesCopStyle = [];
		var hapaNodeCorrection = 0;
		var hapaNodesName = [];
		var hapaNodeNr = -1;
		var hapaNodeSel = null;
		var hapaNodesStyle = [];
		//2. selektierten Node bestimmen
		for ( var hapaI=0; hapaI<this.spHighlighterNrSel.length; hapaI++ )
		{
			if ( this.spHighlighterNrSel[hapaI] == 1 ) {
				hapaNodeSel = hapaBody.childNodes[hapaI];
				hapaNodeSel.setAttribute("style", "padding:5px;");
				hapaNodeNr = hapaI;
				hapaI = this.spHighlighterNrSel.length;
			}
		}
		//3. Nodes der kopierten/ausgeschnittenen Einträge zusammenstellen
		//   (soll kopiert werden, wird cloneNode verwendet)
		for ( var hapaI=0; hapaI<this.spHighlighterNrCop.length; hapaI++ )
		{
			if ( this.spHighlighterNrCop[hapaI] == 1 ) {
				hapaBody.childNodes[hapaI].setAttribute("style", "padding:5px;");
				hapaNodes.push(hapaBody.childNodes[hapaI].cloneNode(true));
				hapaNodesName.push(this.spHighlighterName[hapaI]);
				hapaNodesStyle.push(this.spHighlighterStyle[hapaI]);
				hapaNodesCopName.push(this.spHighlighterName[hapaI]);
				hapaNodesCopStyle.push(this.spHighlighterStyle[hapaI]);
			} else if ( this.spHighlighterNrCop[hapaI] == 2 ) {
				hapaBody.childNodes[hapaI].setAttribute("style", "padding:5px;");
				hapaNodes.push(hapaBody.childNodes[hapaI]);
				hapaNodesCopName.push(this.spHighlighterName[hapaI]);
				hapaNodesCopStyle.push(this.spHighlighterStyle[hapaI]);
				if ( hapaI < hapaNodeNr ) hapaNodeCorrection++;
			} else {
				hapaNodesName.push(this.spHighlighterName[hapaI]);
				hapaNodesStyle.push(this.spHighlighterStyle[hapaI]);
			}
		}
		//4. Einträge einfügen
		for ( var hapaI=hapaNodes.length-1; hapaI>-1; hapaI-- )
		{
			hapaBody.insertBefore(hapaNodes[hapaI], hapaNodeSel);
		}
		//5. globale Variablen aktualisieren
		hapaNodeNr = hapaNodeNr - hapaNodeCorrection;
		this.spHighlighterNrCop = [];
		this.spHighlighterCopyMode = 0;
		this.spHighlighterModified = 1;
		this.spHighlighterName = [];
		this.spHighlighterNrSel = [];
		this.spHighlighterNrSelCount = -1;
		this.spHighlighterNrSelFirst = -1;
		this.spHighlighterStyle = [];
		for ( var hapaI=0; hapaI<hapaNodesName.length; hapaI++ )
		{
			if ( hapaI == hapaNodeNr ) {
				for ( var hapaJ=0; hapaJ<hapaNodesCopName.length; hapaJ++ )
				{
					this.spHighlighterName.push(hapaNodesCopName[hapaJ]);
					this.spHighlighterStyle.push(hapaNodesCopStyle[hapaJ]);
					this.spHighlighterNrSel.push(0);
					this.spHighlighterNrCop.push(0);
				}
			}
			this.spHighlighterName.push(hapaNodesName[hapaI]);
			this.spHighlighterStyle.push(hapaNodesStyle[hapaI]);
			this.spHighlighterNrSel.push(0);
			this.spHighlighterNrCop.push(0);
		}
	},

	highlighterCheckNode : function(hcnEvent)
	{
//Wird derzeit nur von sbp2Preferences.xul verwendet.
		//Wird beim Klicken mit der rechten Maustaste auf das Browser-Element aufgerufen. Es wird der P-Node des angeklickten Markierstifts ermittelt.
		//Ist der P-Node nicht Bestandteil der bisherigen Auswahl, wird die alte Auswahl verworfen und der P-Node ist die neue Auswahl.
		//Wurde weder ein SPAN- noch ein P-Node angeklickt, wird kein Kontextmenü angezeigt.
		//Einträge im Kontextmenü werden abhängig von der Auswahl ein-/ausgeblendet.
		if ( hcnEvent.originalTarget.triggerNode.nodeName.toLowerCase() == "span" || hcnEvent.originalTarget.triggerNode.nodeName.toLowerCase() == "p" ) {
			//P-Node bestimmen
			var hcnNodeP = hcnEvent.originalTarget.triggerNode;
			while ( hcnNodeP.nodeName.toLowerCase() != "p" )
			{
				hcnNodeP = hcnNodeP.parentNode;
			}
			//Prüfen, ob hcnNodeP kopiert oder ausgeschnitten wurde
			var hcnNodeB = hcnNodeP.parentNode;
			var hcnNodeFound = 0;
			for ( var hcnI=0; hcnI<sbp2Preferences.spHighlighterNrCop.length; hcnI++ )
			{
				if ( sbp2Preferences.spHighlighterNrCop[hcnI] == 1 ) {
					if ( hcnNodeB.childNodes[hcnI] == hcnNodeP ) {
						hcnNodeFound = 1;
						hcnI = sbp2Preferences.spHighlighterNrCop.length;
					}
				}
			}
			//Sind zuvor Einträge kopiert/ausgeschnitten worden, an der markierten Stelle eingefügt werden, sofern nicht mehr als 1 Eintrag ausgewählt ist und dieser
			//Eintrag nicht Bestandteil der kopierten/ausgeschnittenen Einträge ist.
			sbp2Preferences.highlighterMarkSelected(hcnNodeP, 3, false, false);
/*dump("hcnNodeFound - "+hcnNodeFound+"\n");
dump("SelCount     - "+sbp2Preferences.spHighlighterNrSelCount+"\n");
dump("Sel          - "+sbp2Preferences.spHighlighterNrSel+"\n");
dump("Cop          - "+sbp2Preferences.spHighlighterNrCop+"\n");
*/			if ( hcnNodeFound == 0 ) {
				if ( sbp2Preferences.spHighlighterCopyMode > 0 & sbp2Preferences.spHighlighterNrSelCount < 2 ) {
					document.getElementById("sbp2EditorHLPstB").hidden = false;
					document.getElementById("sbp2EditorHLPstA").hidden = false;
				} else {
					document.getElementById("sbp2EditorHLPstB").hidden = true;
					document.getElementById("sbp2EditorHLPstA").hidden = true;
				}
			} else {
				document.getElementById("sbp2EditorHLPstB").hidden = true;
				document.getElementById("sbp2EditorHLPstA").hidden = true;
			}
		} else {
			hcnEvent.preventDefault();
		}
	},

	highlighterHandleClick : function(hhcEvent)
	{
//Wird derzeit nur von sbp2Preferences.highlighterInit verwendet.
		//Nummer des Markierstifts im Browser bestimmen, auf den geklickt worden ist.
		//Funktion wird nach einem Klick im Browser-Element ausgelöst.
		//Siehe addEventListener im Script.
		//
		//Ablauf:
		//1. Funktion beenden, falls nicht die Linke-Maustaste gedrückt wurde
		//2. Funktion beenden, falls weder SPAN- noch P-Node angeklickt wurden.
		//3. Variablen initialisieren
		//4. P-Node des angeklickten Markierstifts bestimmen
		//5. selektierte Einträge hervorheben

		//1. Funktion beenden, falls nicht die Linke-Maustaste gedrückt wurde
		if ( hhcEvent.which != 1 ) return;
		//2. Funktion beenden, falls weder P- noch SPAN-Node angeklickt wurden.
		if ( hhcEvent.originalTarget.nodeName.toLowerCase() != "span" && hhcEvent.originalTarget.nodeName.toLowerCase() != "p" ) return;
		//3. Variablen initialisieren
		var hhcKeyCtrl = hhcEvent.ctrlKey;
		var hhcKeyShift = hhcEvent.shiftKey;
		var hhcNodeP = hhcEvent.originalTarget;
		//4. P-Node des angeklickten Markierstifts bestimmen
		while ( hhcNodeP.nodeName.toLowerCase() != "p" )
		{
			hhcNodeP = hhcNodeP.parentNode;
		}
		//5. selektierte Einträge hervorheben
		sbp2Preferences.highlighterMarkSelected(hhcNodeP, hhcEvent.which, hhcKeyCtrl, hhcKeyShift);
	},

	highlighterInit : function()
	{
//Wird derzeit nur von sbp2Preferences.init aufgerufen.
		//Diese Funktion läd die Datei highlighter.txt, welche entweder die Angaben zu den Initial-Markierstiften oder die vom Anwender modifzierten/erstellen Markierstifte enthält.
		//Der Inhalt der Datei wird im Browser "sbp2EditorHLBrowser" dargestellt. Dessen Inhalt wird dynamisch erzeugt.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. highlighter.txt einlesen
		//2.1 gelesene Zeilen in this.spHighlighterName und this.spHighlighterStyle ablegen; this.spHighlighterNrCop und this.spHighlighterNrSel werden initialisiert
		//2.2 HTML-Seite aufbaufen
		//2.3 HTML-Seite speichern
		//2.4 HTML-Seite im browser-Objekt anzeigen
		//2.5 Listener, um bei einem Mausklick die rechte Seite des Fensters zu aktualisieren (sofern ein Eintrag angeklickt worden ist)

		//1. Variablen initialisieren
		//2. highlighter.txt einlesen
		var hiFile = sbp2Common.getBuchVZ();
		hiFile.append("highlighter.txt");
		var hiData = sbp2Common.fileRead(hiFile);
		var hiLines = hiData.split("\n");
		if ( hiLines.length > 1 ) {
			//2.1 gelesene Zeilen in this.spHighlighterName und this.spHighlighterStyle ablegen; this.spHighlighterNrCop und this.spHighlighterNrSel werden initialisiert
			for ( var hiI=0; hiI<hiLines.length-1; hiI = hiI + 2 )
			{
				this.spHighlighterName.push(hiLines[hiI]);
				this.spHighlighterStyle.push(hiLines[hiI+1]);
				this.spHighlighterNrCop.push(0);
				this.spHighlighterNrSel.push(0);
			}
			//2.2 HTML-Seite aufbaufen
			var hiHTML = "";
			var hiNodeList = [];
			var hiDoc = document.implementation.createHTMLDocument("highlighter.txt");
			var hiRootNode = hiDoc.getElementsByTagName("html")[0].cloneNode(false);
			var hiHeadNode = hiDoc.getElementsByTagName("head")[0].cloneNode(true);
			var hiBodyNode = hiDoc.getElementsByTagName("body")[0].cloneNode(true);
			var hiMeta1 = hiDoc.createElement("meta");
			hiMeta1.setAttribute("charset", "utf-8");
			var hiMeta2 = hiDoc.createElement("meta");
			hiMeta2.setAttribute("name", "viewport");
			hiMeta2.setAttribute("content", "width=device-width, initial-scale=1.0");
			var hiStyle = hiDoc.createElement("style");
			hiStyle.setAttribute("type", "text/css");
			hiStyle.appendChild(hiDoc.createTextNode("\n\t\t\tbody {\n\t\t\t\t-moz-user-select: none;\n\t\t\t}"));
			hiStyle.appendChild(hiDoc.createTextNode("\n\t\t\tp {\n\t\t\t\t-moz-user-content: none;\n\t\t\t\tcursor: default;\n\t\t\t}\n\t\t"));

			hiHeadNode.insertBefore(hiDoc.createTextNode("\n\t\t"), hiHeadNode.firstChild);
			hiHeadNode.appendChild(hiDoc.createTextNode("\n\t\t"));
			hiHeadNode.appendChild(hiMeta1);
			hiHeadNode.appendChild(hiDoc.createTextNode("\n\t\t"));
			hiHeadNode.appendChild(hiMeta2);
			hiHeadNode.appendChild(hiDoc.createTextNode("\n\t\t"));
			hiHeadNode.appendChild(hiStyle);
			hiHeadNode.appendChild(hiDoc.createTextNode("\n\t"));

			hiBodyNode.appendChild(hiDoc.createTextNode("\n\t"));
			var hiP = null;
			var hiSpan = null;
			for ( var hiI = 0; hiI < this.spHighlighterName.length; hiI++ )
			{
				hiP = document.createElement("p");
				hiP.setAttribute("style", "padding:5px;");
				hiSpan = document.createElement("span");
				hiSpan.appendChild(hiDoc.createTextNode(this.spHighlighterName[hiI]));
				if ( this.spHighlighterStyle[hiI].length > 0 ) hiSpan.style.cssText = this.spHighlighterStyle[hiI];
				hiP.appendChild(hiSpan);
				hiBodyNode.appendChild(hiDoc.createTextNode("\t"));
				hiBodyNode.appendChild(hiP);
				hiBodyNode.appendChild(hiDoc.createTextNode("\n\t"));
			}

			hiRootNode.appendChild(hiDoc.createTextNode("\t"));
			hiRootNode.appendChild(hiHeadNode);
			hiRootNode.appendChild(hiDoc.createTextNode("\n\t"));
			hiRootNode.appendChild(hiBodyNode);
			hiRootNode.appendChild(hiDoc.createTextNode("\n"));
			var hiTag = "<" + hiRootNode.nodeName.toLowerCase();
			for ( var hiI=0; hiI<hiRootNode.attributes.length; hiI++ )
			{
				hiTag += ' ' + hiRootNode.attributes[hiI].name + '="' + hiRootNode.attributes[hiI].value + '"';
			}
			hiTag += ">\n";
			hiHTML =  hiTag + hiRootNode.innerHTML + "</" + hiRootNode.nodeName.toLowerCase() + ">\n";
			hiHTML = "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\" \"http://www.w3.org/TR/html4/loose.dtd\">\n" + hiHTML;
			//2.3 HTML-Seite speichern
			hiFile = sbp2Common.getBuchVZ();
			hiFile.append("highlighter.html");
			sbp2Common.fileWrite(hiFile, hiHTML, "UTF-8");
			//2.4 HTML-Seite im browser-Objekt anzeigen
			var hiBrowser = document.getElementById("sbp2EditorHLBrowser");
			//Grundeinstellung für das Laden der übergebenen Seite
			hiBrowser.docShell.allowMetaRedirects = false;
			if ( Components.interfaces.nsIDocShellHistory ) {
				hiBrowser.docShell.QueryInterface(Components.interfaces.nsIDocShellHistory).useGlobalHistory = false;
			} else {
				hiBrowser.docShell.useGlobalHistory = false;
			}
			//Laden der Seite
			try
			{
				hiBrowser.loadURI("data:text/html,"+hiHTML, null, null);
			} catch(lEx)
			{
				alert("bsTree.load Fehler");
			}
			//2.5 Listener, um bei einem Mausklick die rechte Seite des Fensters zu aktualisieren (sofern ein Eintrag angeklickt worden ist)
			hiBrowser.addEventListener("click", this.highlighterHandleClick, true);
		}
	},

	highlighterMarkSelected : function(hmsNodeP, hmsMouseButton, hmsKeyCtrl, hmsKeyShift)
	{
//Wird von this.highlighterHandleClick und this.highlighterCheckNode aufgerufen.
		//Aktualisiert die globalen Variablen, die Auskunft über die derzeitige Auswahl liefern. Außerdem wird die Hervorhebung der Markierstifte im Browser geprüft und aktualisiert.
		//(hmsMouseButton 1 (links), 3 (rechts))
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Nummer des angeklickten Markierstifts bestimmen
		//3. Klickaktion bearbeiten
		//3.1 Mausklick mit Shift-Taste (nur in Verbindung mit linker Maustaste)
		//3.1 Mausklick mit Strg-Taste (nur in Verbindung mit linker Maustaste)
		//3.1 Mausklick ohne Shift- und Strg-Taste
		//4. Knöpfe in Benutzeroberfläche freischalten
		//5. Benutzeroberfläche aktualisieren

		//1. Variablen initialisieren
		var hmsMode = 0;
		var hmsNodeB = null;
		var hmsNr = 0;
		//2. Nummer des angeklickten Markierstifts bestimmen
		hmsNodeB = hmsNodeP.parentNode;
		while ( hmsNodeB.childNodes[hmsNr] != hmsNodeP )
		{
			if ( hmsNodeB.childNodes[hmsNr] != hmsNodeP ) hmsNr++;
		}
		//3. Klickaktion bearbeiten
		if ( hmsKeyShift ) {
			//3.1 Mausklick mit Shift-Taste (nur in Verbindung mit linker Maustaste)
			hmsNr = 0;
			while ( hmsMode < 2 ) {
				//Modus ändern, falls Anfang/Ende gefunden wurden
				if ( hmsNodeB.childNodes[hmsNr] == hmsNodeP ) {
					hmsMode++;
				}
				if ( hmsNr == sbp2Preferences.spHighlighterNrSelFirst ) {
					hmsMode++;
				}
				//hmsMode = 0 -> selektierte Einträge abwählen; hmsMode > 0 -> nicht selektierte Einträge selektieren
				if ( hmsMode == 0 ) {
					if ( sbp2Preferences.spHighlighterNrSel[hmsNr] == 1 ) {
						hmsNodeB.childNodes[hmsNr].setAttribute("style", "padding:5px;");
						sbp2Preferences.spHighlighterNrSel[hmsNr] = 0;
						sbp2Preferences.spHighlighterNrSelCount--;
					}
				} else {
					if ( sbp2Preferences.spHighlighterNrSel[hmsNr] == 0 ) {
						hmsNodeB.childNodes[hmsNr].setAttribute("style", "border-width:1px; border-style:solid; border-color:black; padding:4px;");
						sbp2Preferences.spHighlighterNrSel[hmsNr] = 1;
						sbp2Preferences.spHighlighterNrSelCount++;
					}
				}
				//Weiter mit dem nächsten Markierstift im Browser
				hmsNr++;
			}
			while ( hmsNr < sbp2Preferences.spHighlighterNrSel.length ) {
				if ( sbp2Preferences.spHighlighterNrSel[hmsNr] == 1 ) {
					hmsNodeB.childNodes[hmsNr].setAttribute("style", "padding:5px;");
					sbp2Preferences.spHighlighterNrSel[hmsNr] = 0;
					sbp2Preferences.spHighlighterNrSelCount--;
				}
				hmsNr++;
			}
		} else if ( hmsKeyCtrl ) {
			//3.1 Mausklick mit Strg-Taste (nur in Verbindung mit linker Maustaste)
			if ( sbp2Preferences.spHighlighterNrSel[hmsNr] == 1 ) {
				if ( sbp2Preferences.spHighlighterNrCop[hmsNr] == 1 ) {
					hmsNodeB.childNodes[hmsNr].setAttribute("style", "border-width:1px; border-style:dashed; border-color:black; padding:4px;");
				} else if ( sbp2Preferences.spHighlighterNrCop[hmsNr] == 2 ) {
					hmsNodeB.childNodes[hmsNr].setAttribute("style", "border-width:1px; border-style:dotted; border-color:black; padding:4px;");
				} else {
					hmsNodeB.childNodes[hmsNr].setAttribute("style", "padding:5px;");
				}
				sbp2Preferences.spHighlighterNrSel[hmsNr] = 0;
				sbp2Preferences.spHighlighterNrSelCount--;
			} else {
				hmsNodeB.childNodes[hmsNr].setAttribute("style", "border-width:1px; border-style:solid; border-color:black; padding:4px;");
				sbp2Preferences.spHighlighterNrSel[hmsNr] = 1;
				sbp2Preferences.spHighlighterNrSelCount++;
			}
		} else {
			//3.1 Mausklick ohne Shift- und Strg-Taste
			//3.1.1
			if ( sbp2Preferences.spHighlighterNrSel[hmsNr] == 1 && hmsMouseButton == 3 ) return;
//			if ( sbp2Preferences.spHighlighterNrCop[hmsNr] == 1 && hmsMouseButton == 3 ) return;
			//3.1.2 Hervorhebung im Browser aktualisieren
			for ( var hmsI=0; hmsI<sbp2Preferences.spHighlighterNrSel.length; hmsI++ )
			{
				if ( sbp2Preferences.spHighlighterNrCop[hmsI] == 1 ) {
					hmsNodeB.childNodes[hmsI].setAttribute("style", "border-width:1px; border-style:dashed; border-color:black; padding:4px;");
					sbp2Preferences.spHighlighterNrSel[hmsI] = 0;
				} else if ( sbp2Preferences.spHighlighterNrCop[hmsI] == 2 ) {
					hmsNodeB.childNodes[hmsI].setAttribute("style", "border-width:1px; border-style:dotted; border-color:black; padding:4px;");
					sbp2Preferences.spHighlighterNrSel[hmsI] = 0;
				} else if ( sbp2Preferences.spHighlighterNrSel[hmsI] == 1 ) {
					hmsNodeB.childNodes[hmsI].setAttribute("style", "padding:5px;");
					sbp2Preferences.spHighlighterNrSel[hmsI] = 0;
				}
			}
			//3.1.3 selektierten Eintrag im Browser hervorheben
			hmsNodeB.childNodes[hmsNr].setAttribute("style", "border-width:1px; border-style:solid; border-color:black; padding:4px;");
			//3.1.4 momentan selektierten Eintrag merken
			sbp2Preferences.spHighlighterNrSel[hmsNr] = 1;
			sbp2Preferences.spHighlighterNrSelCount = 1;
			sbp2Preferences.spHighlighterNrSelFirst = hmsNr;
		}
		//4. Knöpfe in Benutzeroberfläche freischalten
		document.getElementById("sbp2EditorHLAdd").disabled = false;
		document.getElementById("sbp2EditorHLApply").disabled = false;
		document.getElementById("sbp2EditorHLReset").disabled = false;
		//5. Benutzeroberfläche aktualisieren
		sbp2Preferences.highlighterUpdateUIPart1();
		sbp2Preferences.highlighterUpdateUIPart2();
	},

	highlighterSettingsAdd : function()
	{
//Wird derzeit nur von sbp2Preferences.xul aufgerufen.
		//Diese Funktion erstellt einen neuen Eintrag am Ende der Liste
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Neues P- und SPAN-Element aufbauen
		//3. Neues P-Element (das das SPAN-Element enthält) am Ende des Body-Elements einfügen
		//4. Vermerken, dass 1 Eintrag verändert wurde

		//1. Variablen initialisieren
		var hsaBrowser = document.getElementById("sbp2EditorHLBrowser");
		var hsaBody = hsaBrowser.contentWindow.document.body;
		var hdsDocument = hsaBrowser.contentWindow.document;
		//2. Neues P- und SPAN-Element aufbauen
		var hsaP = hdsDocument.createElement("p");
		hsaP.setAttribute("style", "padding:5px;");
		var hsaSpan = hdsDocument.createElement("span");
		hsaSpan.appendChild(hdsDocument.createTextNode(this.spHighlighterName[this.spHighlighterNrSelFirst]));
		if ( this.spHighlighterStyle[this.spHighlighterNrSelFirst].length > 0 ) hsaSpan.style.cssText = this.spHighlighterStyle[this.spHighlighterNrSelFirst];
		hsaP.appendChild(hsaSpan);
		//3. Neues P-Element (das das SPAN-Element enthält) am Ende des Body-Elements einfügen
//		hsaBody.appendChild(hdsDocument.createTextNode("\t"));
		hsaBody.appendChild(hsaP);
//		hsaBody.appendChild(hdsDocument.createTextNode("\r\n\t"));
		//4. Definition des neuen Markierstifts am Ende der Liste einfügen
		this.spHighlighterName.push(this.spHighlighterName[this.spHighlighterNrSelFirst]);
		this.spHighlighterStyle.push(this.spHighlighterStyle[this.spHighlighterNrSelFirst]);
		this.spHighlighterNrCop.push(0);
		this.spHighlighterNrSel.push(0);
		//4. Vermerken, dass 1 Eintrag verändert wurde
		this.spHighlighterModified = 1;
	},

	highlighterSettingsApply : function()
	{
//Wird derzeit nur von sbp2Preferences.xul aufgerufen.
		//Diese Funktion aktualisiert den zuvor gewählten Eintrag in der Liste.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Variablen aktualisieren
		//3. Ersetze den Text des Span-Elements im Browser
		//4. Ersetze den css-Text des Span-Elements im Browser
		//5. Vermerken, dass Änderungen vorgenommen wurden

		//1. Variablen initialisieren
		var hsaBody = document.getElementById("sbp2EditorHLBrowser").contentWindow.document.body;
		var hsaDocument = document.getElementById("sbp2EditorHLBrowser").contentWindow.document;
		var hsaSpan = hsaBody.childNodes[this.spHighlighterNrSelFirst].childNodes[0];
		//2. Variablen aktualisieren
		this.spHighlighterName[this.spHighlighterNrSelFirst] = this.spHighlighterNamePreview;
		this.spHighlighterStyle[this.spHighlighterNrSelFirst] = this.spHighlighterStylePreview;
		//3. Ersetze den Text des Span-Elements im Browser
		hsaSpan.replaceChild(hsaDocument.createTextNode(this.spHighlighterName[this.spHighlighterNrSelFirst]), hsaSpan.childNodes[0]);
		//4. Ersetze den css-Text des Span-Elements im Browser
		hsaSpan.style.cssText = this.spHighlighterStyle[this.spHighlighterNrSelFirst];
		//5. Vermerken, dass Änderungen vorgenommen wurden
		this.spHighlighterModified = 1;
	},

	highlighterSettingsReset : function()
	{
//Wird derzeit nur von sbp2Preferences.xul aufgerufen.
		//Diese Funktion läd die Werte für den zuletzt gewählten Markierstift. Etwaige Änderungen im Vorschaufenster werden dadurch rückgängig gemacht.
		this.highlighterUpdateUIPart1();
		this.highlighterUpdateUIPart2();
	},

	highlighterUpdateName : function()
	{
//Wird derzeit nur von sbp2Preferences.xul aufgerufen.
		//Diese Funktion aktualisiert den Text im Label für die Vorschau sowie den Inhalt der Variable this.spHighlighterNamePreview
		document.getElementById("sbp2EditorHLPreview").value = document.getElementById("sbp2EditorHLTitle").value;
		this.spHighlighterNamePreview = document.getElementById("sbp2EditorHLTitle").value;
	},

	highlighterUpdatePreviewLabel : function()
	{
//Wird derzeit nur von sbp2Preferences.xul aufgerufen.
		//Diese Funktion aktualisiert den Inhalt des Labels "sbp2EditorHLPreview".
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Einstellungen in Variable ablegen
		//3. Inhalt von Variable für Vorschau aktualisieren
		//4. Benutzeroberfläche aktualisieren

		//1. Variablen initialisieren
		var hupStyle = "";
		//2. Einstellungen in Variable ablegen
		if ( document.getElementById("sbp2EditorHLBackgroundCB").checked ) hupStyle = hupStyle + "background-color: "+ document.getElementById("sbp2EditorHLBackgroundCl").color +" ; ";
		if ( document.getElementById("sbp2EditorHLFontCB").checked ) hupStyle = hupStyle + "color: "+ document.getElementById("sbp2EditorHLFontCl").color +" ; ";
		if ( document.getElementById("sbp2EditorHLFontBl").checked ) hupStyle = hupStyle + "font-weight: bold ; ";
		if ( document.getElementById("sbp2EditorHLFontIt").checked ) hupStyle = hupStyle + "font-style: italic ; ";
		if ( document.getElementById("sbp2EditorHLFontLn").checked ) hupStyle = hupStyle + "text-decoration: line-through ; ";
		if ( document.getElementById("sbp2EditorHLBorderCB").checked ) {
			hupStyle = hupStyle + document.getElementById("sbp2EditorHLBorderTp").selectedItem.value + ": ";
			hupStyle = hupStyle + document.getElementById("sbp2EditorHLBorderCl").color + " ";
			hupStyle = hupStyle + document.getElementById("sbp2EditorHLBorderSt").selectedItem.value + " ";
			hupStyle = hupStyle + document.getElementById("sbp2EditorHLBorderWd").selectedItem.value + " ; ";
		}
		//3. Inhalt von Variable für Vorschau aktualisieren
		this.spHighlighterStylePreview = hupStyle;
		//4. Benutzeroberfläche aktualisieren
		this.highlighterUpdateUIPart2();
	},

	highlighterUpdateUIPart1 : function()
	{
//Wird derzeit nur von sbp2Preferences.highlighterHandleClick aufgerufen.
		//Diese Funktion initialisiert die Checkboxen, Colorpicker und Menülisten. Im Anschluß werden die Attribute des zuletzt
		//angeklickten/erstellten Markierstifts angezeigt.
		//Der Inhalt von sbp2EditorHLPreview wird über die Funktion this.highlighterUpdateUIPart2 aktualisiert. Der Aufruf
		//dieser Funktion erfolgt nicht innerhalb von highlighterUpdateUIPart1.
		//
		//Ablauf:
		//1. Benutzeroberfläche zurücksetzen
		//2. Eigenschaften des Markierstifts kopieren
		//3. Eigenschaften des Markierstifts anzeigen

		//1. Benutzeroberfläche zurücksetzen
		document.getElementById("sbp2EditorHLBackgroundCB").checked = false;
		document.getElementById("sbp2EditorHLBackgroundCl").disabled = true;
		document.getElementById("sbp2EditorHLBackgroundCl").color = "#FFFFFF";
		document.getElementById("sbp2EditorHLFontCB").checked = false;
		document.getElementById("sbp2EditorHLFontCl").disabled = true;
		document.getElementById("sbp2EditorHLFontCl").color = null;
		document.getElementById("sbp2EditorHLFontBl").checked = false;
		document.getElementById("sbp2EditorHLFontIt").checked = false;
		document.getElementById("sbp2EditorHLFontLn").checked = false;
		document.getElementById("sbp2EditorHLBorderCB").checked = false;
		document.getElementById("sbp2EditorHLBorderCl").disabled = true;
		document.getElementById("sbp2EditorHLBorderCl").color = "#FFFFFF";
		document.getElementById("sbp2EditorHLBorderTp").disabled = true;
		document.getElementById("sbp2EditorHLBorderTp").selectedIndex = 0;
		document.getElementById("sbp2EditorHLBorderSt").disabled = true;
		document.getElementById("sbp2EditorHLBorderSt").selectedIndex = 0;
		document.getElementById("sbp2EditorHLBorderWd").disabled = true;
		document.getElementById("sbp2EditorHLBorderWd").selectedIndex = 0;
		//2. Eigenschaften des Markierstifts kopieren
		this.spHighlighterNamePreview = this.spHighlighterName[this.spHighlighterNrSelFirst];
		this.spHighlighterStylePreview = this.spHighlighterStyle[this.spHighlighterNrSelFirst];
		//3. Eigenschaften des Markierstifts anzeigen
		document.getElementById("sbp2EditorHLTitle").value = this.spHighlighterNamePreview;
		var huu1Values = [];
		huu1Values = this.spHighlighterStylePreview.split(" ");
		for ( var huu1I=0; huu1I<huu1Values.length; huu1I++ )
		{
			if ( huu1Values[huu1I] == "background-color:" ) {
				document.getElementById("sbp2EditorHLBackgroundCB").checked = true;
				document.getElementById("sbp2EditorHLBackgroundCl").disabled = false;
				document.getElementById("sbp2EditorHLBackgroundCl").color = huu1Values[huu1I+1];
				huu1I++;
			} else if ( huu1Values[huu1I] == "color:" ) {
				document.getElementById("sbp2EditorHLFontCB").checked = true;
				document.getElementById("sbp2EditorHLFontCl").disabled = false;
				if ( huu1Values[huu1I+1].substring(0,1) == "#" ) {
					document.getElementById("sbp2EditorHLFontCl").color = huu1Values[huu1I+1];
					huu1I = huu1I + 2;
				}
				if ( huu1Values[huu1I+1] == "font-weight:" ) {
					document.getElementById("sbp2EditorHLFontBl").checked = true;
					huu1I = huu1I + 3;
				}
				if ( huu1Values[huu1I+1] == "font-style:" ) {
					document.getElementById("sbp2EditorHLFontIt").checked = true;
					huu1I = huu1I + 3;
				}
				if ( huu1Values[huu1I+1] == "text-decoration:" ) {
					document.getElementById("sbp2EditorHLFontLn").checked = true;
					huu1I = huu1I + 3;
				}
			} else if ( huu1Values[huu1I] == "border:" ) {
				document.getElementById("sbp2EditorHLBorderCB").checked = true;
				document.getElementById("sbp2EditorHLBorderCl").disabled = false;
				document.getElementById("sbp2EditorHLBorderTp").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").disabled = false;
				document.getElementById("sbp2EditorHLBorderWd").disabled = false;
				document.getElementById("sbp2EditorHLBorderTp").selectedIndex = 0;
				if ( huu1Values[huu1I+1].substring(0,1) == "#" ) {
					document.getElementById("sbp2EditorHLBorderCl").color = huu1Values[huu1I+1];
					huu1I++;
				}
			} else if ( huu1Values[huu1I] == "border-bottom:" ) {
				document.getElementById("sbp2EditorHLBorderCB").checked = true;
				document.getElementById("sbp2EditorHLBorderCl").disabled = false;
				document.getElementById("sbp2EditorHLBorderTp").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").disabled = false;
				document.getElementById("sbp2EditorHLBorderWd").disabled = false;
				document.getElementById("sbp2EditorHLBorderTp").selectedIndex = 1;
				if ( huu1Values[huu1I+1].substring(0,1) == "#" ) {
					document.getElementById("sbp2EditorHLBorderCl").color = huu1Values[huu1I+1];
					huu1I++;
				}
			} else if ( huu1Values[huu1I] == "solid" ) {
				document.getElementById("sbp2EditorHLBorderCB").checked = true;
				document.getElementById("sbp2EditorHLBorderCl").disabled = false;
				document.getElementById("sbp2EditorHLBorderTp").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").disabled = false;
				document.getElementById("sbp2EditorHLBorderWd").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").selectedIndex = 0;
			} else if ( huu1Values[huu1I] == "dotted" ) {
				document.getElementById("sbp2EditorHLBorderCB").checked = true;
				document.getElementById("sbp2EditorHLBorderCl").disabled = false;
				document.getElementById("sbp2EditorHLBorderTp").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").disabled = false;
				document.getElementById("sbp2EditorHLBorderWd").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").selectedIndex = 1;
			} else if ( huu1Values[huu1I] == "dashed" ) {
				document.getElementById("sbp2EditorHLBorderCB").checked = true;
				document.getElementById("sbp2EditorHLBorderCl").disabled = false;
				document.getElementById("sbp2EditorHLBorderTp").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").disabled = false;
				document.getElementById("sbp2EditorHLBorderWd").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").selectedIndex = 2;
			} else if ( huu1Values[huu1I] == "double" ) {
				document.getElementById("sbp2EditorHLBorderCB").checked = true;
				document.getElementById("sbp2EditorHLBorderCl").disabled = false;
				document.getElementById("sbp2EditorHLBorderTp").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").disabled = false;
				document.getElementById("sbp2EditorHLBorderWd").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").selectedIndex = 3;
			} else if ( huu1Values[huu1I] == "thin" ) {
				document.getElementById("sbp2EditorHLBorderCB").checked = true;
				document.getElementById("sbp2EditorHLBorderCl").disabled = false;
				document.getElementById("sbp2EditorHLBorderTp").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").disabled = false;
				document.getElementById("sbp2EditorHLBorderWd").disabled = false;
				document.getElementById("sbp2EditorHLBorderWd").selectedIndex = 0;
			} else if ( huu1Values[huu1I] == "medium" ) {
				document.getElementById("sbp2EditorHLBorderCB").checked = true;
				document.getElementById("sbp2EditorHLBorderCl").disabled = false;
				document.getElementById("sbp2EditorHLBorderTp").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").disabled = false;
				document.getElementById("sbp2EditorHLBorderWd").disabled = false;
				document.getElementById("sbp2EditorHLBorderWd").selectedIndex = 1;
			} else if ( huu1Values[huu1I] == "thick" ) {
				document.getElementById("sbp2EditorHLBorderCB").checked = true;
				document.getElementById("sbp2EditorHLBorderCl").disabled = false;
				document.getElementById("sbp2EditorHLBorderTp").disabled = false;
				document.getElementById("sbp2EditorHLBorderSt").disabled = false;
				document.getElementById("sbp2EditorHLBorderWd").disabled = false;
				document.getElementById("sbp2EditorHLBorderWd").selectedIndex = 2;
			}
		}
	},

	highlighterUpdateUIPart2 : function()
	{
//Wird derzeit nur von sbp2Preferences.highlighterHandleClick aufgerufen.
		//Diese Funktion aktualisiert den Inhalt des Labels "sbp2EditorHLPreview".
		//
		//Ablauf:
		//1. Label "sbp2EditorHLPreview" aktualisieren

		//1. Label "sbp2EditorHLPreview" aktualisieren
		document.getElementById("sbp2EditorHLPreview").value = this.spHighlighterNamePreview;
		document.getElementById("sbp2EditorHLPreview").setAttribute("style", this.spHighlighterStylePreview);
		document.getElementById("sbp2EditorHLPreview").setAttribute("style", this.spHighlighterStylePreview);
	},

	highlighterUpdateUIPart3 : function(huu3ObjectNr)
	{
//Wird derzeit nur von sbp2Preferences.xul aufgerufen.
		//Diese Funktion aktiviert/deaktiviert Checkboxen und Knöpfe im Reiter. Mindestens eine der "Haupt"-Checkboxen muss aktiviert sein,
		//damit die Knöpfe "Hinzufügen" und/oder "Anwenden" freigeschaltet bleiben.
		//
		//Ablauf:
		//1. Benutzeroberfläche anpassen

		//1. Benutzeroberfläche anpassen
		if ( huu3ObjectNr == 0 ) {
			document.getElementById("sbp2EditorHLBackgroundCl").disabled = !document.getElementById("sbp2EditorHLBackgroundCB").checked;
		} else if ( huu3ObjectNr == 1 ) {
			document.getElementById("sbp2EditorHLFontCl").disabled = !document.getElementById("sbp2EditorHLFontCB").checked;
		} else if ( huu3ObjectNr == 2 ) {
			document.getElementById("sbp2EditorHLBorderCl").disabled = !document.getElementById("sbp2EditorHLBorderCB").checked;
			document.getElementById("sbp2EditorHLBorderTp").disabled = !document.getElementById("sbp2EditorHLBorderCB").checked;
			document.getElementById("sbp2EditorHLBorderWd").disabled = !document.getElementById("sbp2EditorHLBorderCB").checked;
			document.getElementById("sbp2EditorHLBorderSt").disabled = !document.getElementById("sbp2EditorHLBorderCB").checked;
		}
		if ( document.getElementById("sbp2EditorHLBackgroundCB").checked ||
			 document.getElementById("sbp2EditorHLFontCB").checked ||
			 document.getElementById("sbp2EditorHLFontBl").checked ||
			 document.getElementById("sbp2EditorHLFontIt").checked ||
			 document.getElementById("sbp2EditorHLFontLn").checked ||
			 document.getElementById("sbp2EditorHLBorderCB").checked ) {
			document.getElementById("sbp2EditorHLAdd").disabled = false;
//			if ( this.spHighlighterNr > -1 ) document.getElementById("sbp2EditorHLApply").disabled = false;
		} else {
			document.getElementById("sbp2EditorHLAdd").disabled = true;
			document.getElementById("sbp2EditorHLApply").disabled = true;
		}
	},

	keysAccept : function()
	{
		//Diese Funktion aktualisiert die Einstellungen für ScrapBook Plus 2 (nur die Tastenkürzel)
		if ( this.spKeysChanged == 1 ) {
			for ( var kaI=0; kaI<this.spKeysSetTransltd.length; kaI++ )
			{
				//Es werden nur die Tastenkürzel neu geschrieben, die auch tatsächlich geändert wurden
				if ( this.spKeysSetTransltd[kaI] != this.spElements[kaI].value ) {
					//Neues Tastenkürzel aufbereiten (z.B. Alt durch alt ersetzen)
					var kaString = "";
					var kaSplits = this.spElements[kaI].value.split(" + ");
					for ( var kaJ=0; kaJ<kaSplits.length-1; kaJ++ )
					{
						for ( var kaK=0; kaK<this.spKeysTranslated.length; kaK++ )
						{
							if ( kaSplits[kaJ] == this.spKeysTranslated[kaK] ) {
								kaSplits[kaJ] = this.spKeysModifiers[kaK];
								kaK = this.spKeysTranslated.length;
							}
						}
						if ( kaString.length>0 ) kaString += " ";
						kaString += kaSplits[kaJ];
					}
					//Neues Tastenkürzel vermerken
					var rkPrefKeys = ["extensions.scrapbookplus2.key.a.","extensions.scrapbookplus2.key.b.","extensions.scrapbookplus2.key.c.","extensions.scrapbookplus2.key.d.","extensions.scrapbookplus2.key.e."];
					var rkPrefBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
					var rkString = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
					rkString.data = kaString;
					rkPrefBranch.setComplexValue(rkPrefKeys[kaI]+1, Components.interfaces.nsISupportsString, rkString);
					rkString.data = kaSplits[kaSplits.length-1];
					rkPrefBranch.setComplexValue(rkPrefKeys[kaI]+2, Components.interfaces.nsISupportsString, rkString);
				}
			}
		}
	},

	keysInit : function()
	{
		//Diese Funktion läd alle notwendigen Informationen in den Speicher.
		//
		//Ablauf:
		//1. übersetzungen laden
		//2. accel KeyCode bestimmen
		//3. modifier code laden
		//4. modifier austauschen, falls erforderlich

		//1. übersetzungen laden
		this.spKeysTranslated.push(document.getElementById("sbp2PreferencesString").getString("KEY_SHIFT"));
		this.spKeysTranslated.push(document.getElementById("sbp2PreferencesString").getString("KEY_CONTROL"));
		this.spKeysTranslated.push(document.getElementById("sbp2PreferencesString").getString("KEY_ALT"));
		//2. accel KeyCode bestimmen
		this.spKeysAccel = sbp2Prefs.getIntPref("ui.key.accelKey");
		//3. modifier code laden
		this.spKeysModifiers.push("shift");
		this.spKeysModifiers.push("ctrl");
		this.spKeysModifiers.push("alt");
		//4. modifier austauschen, falls erforderlich
		if ( this.spKeysAccel-16>-1 ) {
			this.spKeysModifiers[this.spKeysAccel-16] = "accel";
		}
		//5. formatierte Ausgabe für Benutzer bestimmen
		this.spElements = [document.getElementById("sbp2PrefKey1"),document.getElementById("sbp2PrefKey2"),document.getElementById("sbp2PrefKey3"),document.getElementById("sbp2PrefKey4"),document.getElementById("sbp2PrefKey5")];
		var kiPref = ["extensions.scrapbookplus2.key.a.","extensions.scrapbookplus2.key.b.","extensions.scrapbookplus2.key.c.","extensions.scrapbookplus2.key.d.","extensions.scrapbookplus2.key.e."];
		var kiPrefBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		for ( var kiI=0; kiI<5; kiI++ )
		{
			var kiValue1 = kiPrefBranch.getComplexValue(kiPref[kiI]+1, Components.interfaces.nsISupportsString).data;
			var kiValue2 = kiPrefBranch.getComplexValue(kiPref[kiI]+2, Components.interfaces.nsISupportsString).data;
			var kiSplits = kiValue1.split(" ");
			kiSplits.push(kiValue2);
			var kiString = "";
			for ( var kiJ=0; kiJ<kiSplits.length; kiJ++ )
			{
				for ( var kiK=0; kiK<this.spKeysModifiers.length; kiK++ )
				{
					if ( kiSplits[kiJ] == this.spKeysModifiers[kiK] ) {
						kiSplits[kiJ] = this.spKeysTranslated[kiK];
						kiK = this.spKeysModifiers.length;
					}
				}
				if ( kiString.length>0 ) kiString += " + ";
				kiString += kiSplits[kiJ];
			}
			this.spKeysSetTransltd.push(kiString);
			this.spElements[kiI].value = kiString;
		}
	},

	keysOnKeyDown : function(kokdElement, kokdEvent)
	{
		//Wenn Tab gedrückt wird, soll der Focus zum nächsten Element springen
		if ( kokdEvent.keyCode == 9 ) return;
		//Normale Verarbeitung des Tastendrucks verhindern
		kokdEvent.preventDefault();
		kokdEvent.stopPropagation();
		//ESC-Taste setzt den Wert der Textbox auf den aktuell genutzten Wert zurück
		if ( kokdEvent.keyCode == 27 ) {
			this.keysReset(kokdElement);
			return;
		}
		//Initialisieren
		var kokdKeysPressed = 0;
		var kokdShortcutString = "";
		//Modifier bestimmen
		if ( kokdEvent.ctrlKey ) {
			kokdShortcutString = document.getElementById("sbp2PreferencesString").getString("KEY_CONTROL")+" + ";
			kokdKeysPressed++;
		}
		if ( kokdEvent.shiftKey ) {
			kokdShortcutString += document.getElementById("sbp2PreferencesString").getString("KEY_SHIFT")+" + ";
			kokdKeysPressed++;
		}
		if ( kokdEvent.metaKey ) {
			kokdShortcutString += "Meta + ";
			kokdKeysPressed++
		}
		if ( kokdEvent.altKey ) {
			kokdShortcutString += document.getElementById("sbp2PreferencesString").getString("KEY_ALT")+" + ";
			kokdKeysPressed++
		}
		//gedrückte Taste bestimmen
		if ( kokdEvent.keyCode != 16 &&
		     kokdEvent.keyCode != 17 &&
		     kokdEvent.keyCode != 18 &&
		     kokdEvent.keyCode != 224 ) {
			//Es werden nur Tastenkürzel unterstützt, die nicht mehr als 3 Tasten umfassen
			if ( kokdKeysPressed == 3 ) return;
			//
			kokdShortcutString += String.fromCharCode(kokdEvent.keyCode);
		}
		//änderung vermerken
		this.spKeysChanged = 1;
		//Tastenkombination im Textfeld ausgeben
		kokdElement.value = kokdShortcutString;
	},

	keysReset : function(krElement)
	{
		//Diese Funktion setzt den für die Tastenkombination
		if ( krElement.id == "sbp2PrefKey1" ) {
			krElement.value = this.spKeysSetTransltd[0];
		} else if ( krElement.id == "sbp2PrefKey2" ) {
			krElement.value = this.spKeysSetTransltd[1];
		} else if ( krElement.id == "sbp2PrefKey3" ) {
			krElement.value = this.spKeysSetTransltd[2];
		} else if ( krElement.id == "sbp2PrefKey4" ) {
			krElement.value = this.spKeysSetTransltd[3];
		} else if ( krElement.id == "sbp2PrefKey5" ) {
			krElement.value = this.spKeysSetTransltd[4];
		}
	},

	treecolorsAccept : function()
	{
//Wird derzeit nur von sbp2Preferences.accept aufgerufen.
		//Aktualisiert den Inhalt der Datei tree-css.txt für das geöffnete ScrapBook.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. neuen Inhalt von tree-css.txt zusammenstellen
		//3. tree-css.txt aktualisieren
		//4. In allen Fenstern das Stylesheet der Sidebar aktualisieren, damit die Schriftfarben im Tree wieder stimmen

		//1. Variablen initialisieren
		var taData = "";
		var taFile = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
		taFile.append("ScrapBookPlus2");
		taFile.append("tree-css.txt");
		var taSidebar = null;
		var taWin = null;
		//2. neuen Inhalt von tree-css.txt zusammenstellen
		for ( var taI=0; taI<this.spTreecolorsStyle.length; taI++ )
		{
			taData = taData + this.spTreecolorsStyle[taI] + "\n";
		}
		//3. tree-css.txt aktualisieren
		sbp2Common.fileWrite(taFile, taData, "UTF-8");
		//4. In allen Fenstern das Stylesheet der Sidebar aktualisieren, damit die Schriftfarben im Tree wieder stimmen
		var taWinEnum = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getEnumerator("navigator:browser");
		while ( taWinEnum.hasMoreElements() ) {
			taWin = taWinEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			taSidebar = taWin.document.getElementById("sidebar");
			if ( taSidebar ) {
				if ( taSidebar.contentWindow.document.getElementById("sbp2Sidebar") ) {
					var taLines = taData.split("\n");
					taSidebar.contentWindow.sbp2Sidebar.tcInit(taLines);
				}
			}
		}
	},

	treecolorsInit : function()
	{
//Wird derzeit nur von sbp2Preferences.init aufgerufen.
		//Diese Funktion läd die Datei tree-css.txt, welche entweder die Angaben zu den Initial-TreeColors oder die vom Anwender modifzierten/erstellen TreeColors enthält.
		//Der Inhalt der Datei wird im Browser "sbp2TreeColorsBrowser" dargestellt. Dessen Inhalt wird dynamisch erzeugt.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. tree-css.txt einlesen
		//2.1 gelesene Zeilen in this.spTreecolorsName und this.spTreecolorsStyle ablegen; this.spTreecolorsNrSel werden initialisiert
		//2.2 HTML-Seite aufbaufen
		//2.3 HTML-Seite speichern
		//2.4 HTML-Seite im browser-Objekt anzeigen
		//2.5 Listener, um bei einem Mausklick die rechte Seite des Fensters zu aktualisieren (sofern ein Eintrag angeklickt worden ist)

		//1. Variablen initialisieren
		//2. tree-css.txt einlesen
		var tiFile = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
		tiFile.append("ScrapBookPlus2");
		tiFile.append("tree-css.txt");
		var tiData = sbp2Common.fileRead(tiFile);
		var tiLines = tiData.split("\n");
		if ( tiLines.length > 1 ) {
			//2.1 gelesene Zeilen in this.spTreecolorsName und this.spTreecolorsStyle ablegen; this.spTreecolorsNrSel werden initialisiert
			this.spTreecolorsName.push(document.getElementById("sbp2PreferencesString").getString("ITEM1"));
			this.spTreecolorsStyle.push(tiLines[0]);
			this.spTreecolorsNrSel.push(0);
			//2.2 HTML-Seite aufbaufen
			var tiHTML = "";
			var tiNodeList = [];
			var tiDoc = document.implementation.createHTMLDocument("");
			var tiRootNode = tiDoc.getElementsByTagName("html")[0].cloneNode(false);
			var tiHeadNode = tiDoc.getElementsByTagName("head")[0].cloneNode(true);
			var tiBodyNode = tiDoc.getElementsByTagName("body")[0].cloneNode(true);
			var tiMeta1 = tiDoc.createElement("meta");
			tiMeta1.setAttribute("charset", "utf-8");
			var tiMeta2 = tiDoc.createElement("meta");
			tiMeta2.setAttribute("name", "viewport");
			tiMeta2.setAttribute("content", "width=device-width, initial-scale=1.0");
			var tiStyle = tiDoc.createElement("style");
			tiStyle.setAttribute("type", "text/css");
			tiStyle.appendChild(tiDoc.createTextNode("\n\t\t\tbody {\n\t\t\t\t-moz-user-select: none;\n\t\t\t}"));
			tiStyle.appendChild(tiDoc.createTextNode("\n\t\t\tp {\n\t\t\t\t-moz-user-content: none;\n\t\t\t\tcursor: default;\n\t\t\t}\n\t\t"));

			tiHeadNode.insertBefore(tiDoc.createTextNode("\n\t\t"), tiHeadNode.firstChild);
			tiHeadNode.appendChild(tiDoc.createTextNode("\n\t\t"));
			tiHeadNode.appendChild(tiMeta1);
			tiHeadNode.appendChild(tiDoc.createTextNode("\n\t\t"));
			tiHeadNode.appendChild(tiMeta2);
			tiHeadNode.appendChild(tiDoc.createTextNode("\n\t\t"));
			tiHeadNode.appendChild(tiStyle);
			tiHeadNode.appendChild(tiDoc.createTextNode("\n\t"));

			tiBodyNode.appendChild(tiDoc.createTextNode("\n\t"));
			var tiP = null;
			var tiSpan = null;
			for ( var tiI = 0; tiI < this.spTreecolorsName.length; tiI++ )
			{
				tiP = document.createElement("p");
				tiP.setAttribute("style", "padding:5px;");
				tiSpan = document.createElement("span");
				tiSpan.appendChild(tiDoc.createTextNode(this.spTreecolorsName[tiI]));
				if ( this.spTreecolorsStyle[tiI].length > 0 ) tiSpan.style.cssText = this.spTreecolorsStyle[tiI];
				tiP.appendChild(tiSpan);
				tiBodyNode.appendChild(tiDoc.createTextNode("\t"));
				tiBodyNode.appendChild(tiP);
				tiBodyNode.appendChild(tiDoc.createTextNode("\n\t"));
			}

			tiRootNode.appendChild(tiDoc.createTextNode("\t"));
			tiRootNode.appendChild(tiHeadNode);
			tiRootNode.appendChild(tiDoc.createTextNode("\n\t"));
			tiRootNode.appendChild(tiBodyNode);
			tiRootNode.appendChild(tiDoc.createTextNode("\n"));
			var tiTag = "<" + tiRootNode.nodeName.toLowerCase();
			for ( var tiI=0; tiI<tiRootNode.attributes.length; tiI++ )
			{
				tiTag += ' ' + tiRootNode.attributes[tiI].name + '="' + tiRootNode.attributes[tiI].value + '"';
			}
			tiTag += ">\n";
			tiHTML =  tiTag + tiRootNode.innerHTML + "</" + tiRootNode.nodeName.toLowerCase() + ">\n";
			tiHTML = "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\" \"http://www.w3.org/TR/html4/loose.dtd\">\n" + tiHTML;
			//2.3 HTML-Seite speichern
			tiFile = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
			tiFile.append("ScrapBookPlus2");
			tiFile.append("tree-css.html");
			sbp2Common.fileWrite(tiFile, tiHTML, "UTF-8");
			//2.4 HTML-Seite im browser-Objekt anzeigen
			var tiBrowser = document.getElementById("sbp2TreeColorsBrowser");
			//Grundeinstellung für das Laden der übergebenen Seite
			tiBrowser.docShell.allowMetaRedirects = false;
			if ( Components.interfaces.nsIDocShellHistory ) {
				tiBrowser.docShell.QueryInterface(Components.interfaces.nsIDocShellHistory).useGlobalHistory = false;
			} else {
				tiBrowser.docShell.useGlobalHistory = false;
			}
			//Laden der Seite
			try
			{
				tiBrowser.loadURI("data:text/html,"+tiHTML, null, null);
			} catch(lEx)
			{
				alert("bsTree.load Fehler");
			}
			//2.5 Listener, um bei einem Mausklick die rechte Seite des Fensters zu aktualisieren (sofern ein Eintrag angeklickt worden ist)
			tiBrowser.addEventListener("click", this.treecolorsHandleClick, true);
		}
	},

	treecolorsHandleClick : function(thcEvent)
	{
//Wird derzeit nur von sbp2Preferences.treecolorsInit verwendet.
		//Nummer des Eintrags im Browser bestimmen, auf den geklickt worden ist.
		//Funktion wird nach einem Klick im Browser-Element ausgelöst.
		//Siehe addEventListener im Script.
		//
		//Ablauf:
		//1. Funktion beenden, falls nicht die Linke-Maustaste gedrückt wurde
		//2. Funktion beenden, falls weder SPAN- noch P-Node angeklickt wurden.
		//3. Variablen initialisieren
		//4. P-Node des angeklickten Eintrags bestimmen
		//5. selektierten Eintrag hervorheben

		//1. Funktion beenden, falls nicht die Linke-Maustaste gedrückt wurde
		if ( thcEvent.which != 1 ) return;
		//2. Funktion beenden, falls weder P- noch SPAN-Node angeklickt wurden.
		if ( thcEvent.originalTarget.nodeName.toLowerCase() != "span" && thcEvent.originalTarget.nodeName.toLowerCase() != "p" ) return;
		//3. Variablen initialisieren
		var thcNodeP = thcEvent.originalTarget;
		//4. P-Node des angeklickten Eintrags bestimmen
		while ( thcNodeP.nodeName.toLowerCase() != "p" )
		{
			thcNodeP = thcNodeP.parentNode;
		}
		//5. selektierten Eintrag hervorheben
		sbp2Preferences.treecolorsMarkSelected(thcNodeP, thcEvent.which);
	},

	treecolorsMarkSelected : function(tmsNodeP, tmsMouseButton)
	{
//Wird von this.treecolorsHandleClick aufgerufen.
		//Aktualisiert die globalen Variablen, die Auskunft über die derzeitige Auswahl liefern. Außerdem wird die Hervorhebung der Markierstifte im Browser geprüft und aktualisiert.
		//(tmsMouseButton 1 (links), 3 (rechts))
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Nummer des angeklickten Eintrags bestimmen
		//3. Klickaktion bearbeiten
		//3.1 Mausklick mit Shift-Taste (nur in Verbindung mit linker Maustaste)
		//3.1 Mausklick mit Strg-Taste (nur in Verbindung mit linker Maustaste)
		//3.1 Mausklick ohne Shift- und Strg-Taste
		//4. Knöpfe in Benutzeroberfläche freischalten
		//5. Benutzeroberfläche aktualisieren

		//1. Variablen initialisieren
		var tmsMode = 0;
		var tmsNodeB = null;
		var tmsNr = 0;
		//2. Nummer des angeklickten Eintrags bestimmen
		tmsNodeB = tmsNodeP.parentNode;
		while ( tmsNodeB.childNodes[tmsNr] != tmsNodeP )
		{
			if ( tmsNodeB.childNodes[tmsNr] != tmsNodeP ) tmsNr++;
		}
		//3. Klickaktion bearbeiten
		//3.1 Mausklick ohne Shift- und Strg-Taste
		//3.1.1
		if ( sbp2Preferences.spTreecolorsNrSel[tmsNr] == 1 && tmsMouseButton == 3 ) return;
		//3.1.2 Hervorhebung im Browser aktualisieren
		for ( var tmsI=0; tmsI<sbp2Preferences.spTreecolorsNrSel.length; tmsI++ )
		{
			if ( sbp2Preferences.spTreecolorsNrSel[tmsI] == 1 ) {
				tmsNodeB.childNodes[tmsI].setAttribute("style", "padding:5px;");
				sbp2Preferences.spTreecolorsNrSel[tmsI] = 0;
			}
		}
		//3.1.3 selektierten Eintrag im Browser hervorheben
		tmsNodeB.childNodes[tmsNr].setAttribute("style", "border-width:1px; border-style:solid; border-color:black; padding:4px;");
		//3.1.4 momentan selektierten Eintrag merken
		sbp2Preferences.spTreecolorsNrSelFirst = tmsNr;
		//4. Knöpfe in Benutzeroberfläche freischalten
		//5. Benutzeroberfläche aktualisieren
		sbp2Preferences.treecolorsUpdateUIPart1();
	},

	treecolorsUpdateBrowser : function()
	{
//Wird derzeit nur von sbp2Preferences.xul aufgerufen.
		//Diese Funktion aktualisiert den Inhalt des Browsers "sbp2TreeColorsBrowser".
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Einstellungen in Variable ablegen
		//3. Benutzeroberfläche aktualisieren

		//1. Variablen initialisieren
		var tubStyle = "";
		//2. Einstellungen in Variable ablegen
		tubStyle = document.getElementById("sbp2TreeColorsCl").color;
		//3. Benutzeroberfläche aktualisieren
		this.treecolorsUpdateUIPart2(tubStyle);
	},

	treecolorsUpdateUIPart1 : function(tuuStyle)
	{
//Wird derzeit nur von sbp2Preferences.treecolorsMarkSelected aufgerufen.
		//Name und Farbe des angeklickten Eintrags werde angezeigt.
		//
		//Ablauf:
		//1. Color-Picker freischalten
		//2. Eigenschaften des Eintrags anzeigen

		//1. Color-Picker freischalten
		document.getElementById("sbp2TreeColorsCl").disabled = false;
		//2. Eigenschaften des Eintrags anzeigen
		document.getElementById("sbp2TreeColorsType").value = this.spTreecolorsName[this.spTreecolorsNrSelFirst];
		var huu1Values = [];
		huu1Values = this.spTreecolorsStyle[this.spTreecolorsNrSelFirst].split(" ");
		for ( var huu1I=0; huu1I<huu1Values.length; huu1I++ )
		{
			if ( huu1Values[huu1I] == "color:" ) {
				if ( huu1Values[huu1I+1].substring(0,1) == "#" ) {
					document.getElementById("sbp2TreeColorsCl").color = huu1Values[huu1I+1];
				}
			}
		}

	},

	treecolorsUpdateUIPart2 : function(tuuStyle)
	{
//Wird derzeit nur von sbp2Preferences.xul aufgerufen.
		//Diese Funktion aktualisiert den zuvor gewählten Eintrag in der Liste.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Variablen aktualisieren
		//3. Ersetze den css-Text des Span-Elements im Browser
		//4. Vermerken, dass Änderungen vorgenommen wurden

		//1. Variablen initialisieren
		var tuuBody = document.getElementById("sbp2TreeColorsBrowser").contentWindow.document.body;
		var tuuDocument = document.getElementById("sbp2TreeColorsBrowser").contentWindow.document;
		var tuuSpan = tuuBody.childNodes[this.spTreecolorsNrSelFirst].childNodes[0];
		//2. Variablen aktualisieren
		tuuStyle = "color: "+ tuuStyle +" ; ";
		this.spTreecolorsStyle[this.spTreecolorsNrSelFirst] = tuuStyle;
		//3. Ersetze den css-Text des Span-Elements im Browser
		tuuSpan.style.cssText = tuuStyle;
		//4. Vermerken, dass Änderungen vorgenommen wurden
		this.spTreecolorsModified = 1;
	},
}