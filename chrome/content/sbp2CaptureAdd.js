
var sbp2CaptureAdd = {

	caRes : null,

	cadAccept : function(caEvent)
	{
//wird von sbp2CaptureAdd.xul aufgerufen
		//Seite im aktuellen Tab soll einem Archiv hinzugefügt werden. Der Vorgang wird nur begonnen, falls die Seite
		//im Tab im Archiv verlinkt ist und noch nicht archiviert wurde.
		//Der Benutzer wird darüber informiert, sollte eine der beiden Bedingungen nicht erfüllt sein. Der Vorgang
		//wird dann abgebrochen.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Sicherstellen, dass mindestens eine Seite in this.caRes auf window.arguments[0].url verweist
		//3. Return-Code abhängig vom Prüfungsergebnis zurückgeben
		//3.1 Angaben zu Archivierungstiefe und Timeout übergeben

		//1. Variablen initialisieren
		var caData = null;
		var caID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, this.caRes, "id");
		var caLines = null;
		var caOK = 2;	//0=OK, 1=Seite schon vorhanden, 2=Seite nicht im Archiv verlinkt
		//2. Sicherstellen, dass mindestens eine Seite in this.caRes auf window.arguments[0].url verweist
		var caFile = sbp2Common.getBuchVZ();
		caFile.append("data");
		caFile.append(caID);
		caFile.append("sbp2-links.txt");
		caData = sbp2Common.fileRead(caFile);
		caLines = caData.split("\n");
		for ( var caI=0; caI<caLines.length-1; caI = caI + 8 )
		{
			//Adresse muss übereinstimmen
			if ( window.arguments[0].url == caLines[caI] ) {
				//Seite darf noch nicht archiviert worden sein
				if ( caLines[caI+6] == 0 ) {
					//Resource ist gültig und kann daher als Ziel genutzt werden
					caI = caLines.length;
					window.arguments[1].id = caID;
					caOK = 0;
				} else {
					//Seite ist schon im Archiv vorhanden
					caOK = 1;
				}
			}
		}
		//3. Return-Code abhängig vom Prüfungsergebnis zurückgeben
		if ( caOK == 0 ) {
			//3.1 Angaben zu Archivierungstiefe und Timeout übergeben
			window.arguments[1].depthMax = parseInt(document.getElementById("sbp2DetailInDepthRadioGroup").selectedItem.label);
			window.arguments[1].mode = window.arguments[1].depthMax == 0 ? 2 : 3;
			window.arguments[1].timeout = parseInt(document.getElementById("sbp2DetailTimeoutRadioGroup").selectedItem.label);
			return true;
		} else if ( caOK == 1 ) {
			alert(document.getElementById("sbp2CaptureAddString").getString("RESALREADYCONTAINSLINK"));
			return false;
		} else {
			alert(document.getElementById("sbp2CaptureAddString").getString("RESDOESNOTCONTAINLINK"));
			return false;
		}
	},

	cadCancel : function()
	{
//wird von sbp2CaptureAdd.xul aufgerufen
		//Dialog wird über Cancel-Knopf geschlossen
		window.arguments[1].dialogAccepted = false;
	},

	cadInit : function()
	{
//wird von sbp2CaptureAdd.xul aufgerufen
		//Ablauf:
		//1. tree-css.txt initialisieren, falls die Datei noch nicht existiert
		//2. tree-css.txt laden
		//4. Datenquelle scrapbook.rdf laden
		//5. Dem Tree die Datenquelle zuweisen. Ohne rebuild wird nichts angezeigt.
		//6. OK-Knopf deaktivieren, da noch kein gültiger Eintrag im Tree ausgewählt worden ist

		//1. tree-css.txt initialisieren, falls die Datei noch nicht existiert
		var ciProfilVZ = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
		ciProfilVZ.append("ScrapBookPlus2");
		ciProfilVZ.append("tree-css.txt");
		if ( !ciProfilVZ.exists() ) {
			var ciData = "color: #20C020 ;\n";
			sbp2Common.fileWrite(ciProfilVZ, ciData, "UTF-8");
		}
		//2. tree-css.txt laden
		var ciData = sbp2Common.fileRead(ciProfilVZ);
		var ciLines = ciData.split("\n");
		if ( ciLines.length > 1 ) {
			document.styleSheets[2].insertRule("treechildren::-moz-tree-cell-text(bookmark) { " + ciLines[0] + "}", 0);
		}
		//3. Datenquelle scrapbook.rdf laden
		if ( sbp2DataSource.dbData == null ) sbp2DataSource.init();
		//4. Dem Tree die Datenquelle zuweisen. Ohne rebuild wird nichts angezeigt.
		var ciTree = document.getElementById("sbp2CATree");
		ciTree.database.AddDataSource(sbp2DataSource.dbData);
		ciTree.builder.rebuild();
		//5. OK-Knopf deaktivieren, da noch kein gültiger Eintrag im Tree ausgewählt worden ist
		document.documentElement.getButton("accept").disabled = true;
	},

	cadSetDepth : function(cadsdEvent)
	{
//wird von sbp2CaptureAdd.xul aufgerufen
		//Erlaubt das Setzen einer anderen Tiefe als 1-3 über ein Eingabefenster.
		//Die Eingabe wird direkt im letzten Feld der Radiogroup angezeigt.
		//
		//Ablauf:
		//1. Funktion verlassen, falls kein Radio-Button angeklickt wurde
		//2. Prüfung, welcher Radio-Button angeklickt wurde
		//2.1 RadioGroup zur Auswahl der Pause bis zum Start der nächsten Archivierung freischalten
		//2.2 Eingabefenster einblenden mit anschließender Prüfung der Eingabe auf Gültigkeit
		//2.2.1 Variablen initialisieren
		//2.2.2 Neuen Wert bei Benutzer erfragen
		//2.2.3 Überprüfen des Wertes auf Gültigkeit (es muss eine Zahl größer 3 sein)
		//2.2.3.1 Anzeigen des Wertes 
		//2.2.4 Falls Eingabe nicht akzeptiert worden ist, Tiefe 3 wählen und einen Hinweis für den Anwender ausgeben
		//
		//2.1 RadioGroup zur Auswahl der Pause bis zum Start der nächsten Archivierung deaktivieren

		//1. Funktion verlassen, falls kein Radio-Button angeklickt wurde
		if  ( cadsdEvent.target.id.length > 0 ) return;
		//2. Prüfung, welcher Radio-Button angeklickt wurde
		if ( cadsdEvent.currentTarget.getItemAtIndex(0)!=cadsdEvent.target ) {
			//2.1 RadioGroup zur Auswahl der Pause bis zum Start der nächsten Archivierung freischalten
			document.getElementById("sbp2DetailTimeoutRadioGroup").disabled = false;
			//2.2 Eingabefenster einblenden mit anschließender Prüfung der Eingabe auf Gültigkeit
			if ( cadsdEvent.currentTarget.getItemAtIndex(4)==cadsdEvent.target ) {
				//2.2.1 Variablen initialisieren
				var cadsdDepthRadioLast = document.getElementById("sbp2DetailInDepthRadioGroup").getItemAtIndex(4);
				var cadsdParams = { mode: null, out: null};
				//2.2.2 Neuen Wert bei Benutzer erfragen
				window.openDialog('chrome://scrapbookplus2/content/sbp2InputDialog.xul', '', 'chrome,centerscreen,modal', cadsdParams);
				//2.2.3 Überprüfen des Wertes auf Gültigkeit (es muss eine Zahl größer 3 sein)
				var cadsdNumberAccepted = false;
				if ( cadsdParams.out.length>0 ) {
					if ( !isNaN(cadsdParams.out) ) {
						var cadsdNumber = parseInt(cadsdParams.out);
						if ( cadsdNumber>3 ) {
							//2.2.3.1 Anzeigen des Wertes 
							cadsdDepthRadioLast.label = cadsdParams.out;
							cadsdNumberAccepted = true;
						}
					}
				}
				//2.2.4 Falls Eingabe nicht akzeptiert worden ist, Tiefe 3 wählen und einen Hinweis für den Anwender ausgeben
				if ( !cadsdNumberAccepted ) {
					document.getElementById("sbp2DetailInDepthRadioGroup").selectedIndex = 3;
					alert(document.getElementById("sbp2CaptureAddString").getString("HINT"));
				}
			}
		} else {
			//2.1 RadioGroup zur Auswahl der Pause bis zum Start der nächsten Archivierung deaktivieren
			document.getElementById("sbp2DetailTimeoutRadioGroup").disabled = true;
		}
	},

	cadToggleOptionsBox : function()
	{
//wird von sbp2CaptureAdd.xul aufgerufen
		//Blendet die Box mit den erweiterten Optionen ein oder aus
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Box ein-/ausblenden

		//1. Variablen initialisieren
		var ctfbChecked = document.getElementById("sbp2ChkOptions").checked;
		//2. Box ein-/ausblenden
		if ( ctfbChecked ) {
			document.getElementById("sbp2OptionsBox").hidden = false;
		} else {
			document.getElementById("sbp2OptionsBox").hidden = true;
		}
	},

	cadTreeOnClick : function(ctocEvent)
	{
//wird von sbp2CaptureAdd.xul aufgerufen
		//1. Variablen initialisieren
		var ctocObject={};
		var ctocTree = document.getElementById("sbp2CATree");
		var ctocDisabled = false;
		//2. wurde ein ungültiges Objekt angeklickt, wird die Funktion verlassen
		ctocTree.treeBoxObject.getCellAt(ctocEvent.clientX, ctocEvent.clientY, {}, {}, ctocObject);
		if ( ctocObject.value == "" || ctocObject.value == "twisty" ) ctocDisabled = true;
if ( ctocObject.value != "cell" && ctocObject.value != "image" && ctocObject.value != "text" ) alert("ctocObject.value - "+ctocObject.value);
		//3. Funktion verlassen
		var ctocIndex = ctocTree.currentIndex;
		var ctocRes = ctocTree.builderView.getResourceAtIndex(ctocIndex);
		var ctocType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ctocRes, "type");
		if ( ctocType == "bookmark" || ctocType == "folder" || ctocType == "separator" ) ctocDisabled = true;
		//4. Resource merken, falls ctocDisabled auf false steht
		if ( ctocDisabled == false ) this.caRes = ctocRes;
		//5. OK-Knopf aktivieren/deaktivieren
		document.documentElement.getButton("accept").disabled = ctocDisabled;
	},

}