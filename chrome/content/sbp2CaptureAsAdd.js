
var sbp2CaptureAsAdd = {

	caInDepthIndex : 0,

	caAccept : function()
	{
		//Seite mit den angegebenen Werten und Einstellungen speichern.
		//Bis auf den Title werden alle Angaben für den nächsten Aufruf gespeichert.
		//
		//Ablauf:
		//1. Titel endgülitg festlegen
		//2. Zielverzeichnis endgültig festlegen
		//3. Optionen übernehmen
		//4. ID übernehmen

		//1. Titel endgülitg festlegen
		window.arguments[1].title = document.getElementById("sbp2DetailTitle").value;
		//2. Zielverzeichnis endgültig festlegen
		window.arguments[1].resCont = null;
		//3. Optionen übernehmen
		window.arguments[1].depthMax = parseInt(document.getElementById("sbp2DetailInDepthRadioGroup").selectedItem.label);
		window.arguments[1].embeddedImages = document.getElementById("sbp2DetailOptionImages").checked;
		window.arguments[1].embeddedStyles = document.getElementById("sbp2DetailOptionStyles").checked;
		window.arguments[1].embeddedScript = document.getElementById("sbp2DetailOptionScript").checked;
		window.arguments[1].linkedArchives = document.getElementById("sbp2DetailArchive").checked;
		window.arguments[1].linkedAudio = document.getElementById("sbp2DetailSound").checked;
		window.arguments[1].linkedCustom = document.getElementById("sbp2DetailCustom").checked;
		window.arguments[1].linkedImages = document.getElementById("sbp2DetailImage").checked;
		window.arguments[1].linkedMovies = document.getElementById("sbp2DetailMovie").checked;
		window.arguments[1].mode = 3;
		window.arguments[1].timeout = parseInt(document.getElementById("sbp2DetailTimeoutRadioGroup").selectedItem.label);
		//4. ID übernehmen
		window.arguments[1].id = window.arguments[0].url;
	},

	caInit : function()
	{
		//Aktualisiert die Bildschirmansicht.
		//
		//Ablauf:
		//1. Titel eintragen
		//2. Parameter auswählen

		//1. Titel eintragen
		document.getElementById("sbp2DetailTitle").value = window.arguments[0].title;
		//2. Parameter auswählen
		var caFile = sbp2Common.getBuchVZ();
		caFile.append("data");
		caFile.append(window.arguments[0].url);
		caFile.append("sbp2-capset.txt");
		var caData = sbp2Common.fileRead(caFile);
		var caLines = caData.split("\n");
		document.getElementById("sbp2DetailOptionImages").setAttribute("checked", caLines[0]);
		document.getElementById("sbp2DetailOptionStyles").setAttribute("checked", caLines[1]);
		document.getElementById("sbp2DetailOptionScript").setAttribute("checked", caLines[2]);
		document.getElementById("sbp2DetailImage").setAttribute("checked", caLines[3]);
		document.getElementById("sbp2DetailSound").setAttribute("checked", caLines[4]);
		document.getElementById("sbp2DetailMovie").setAttribute("checked", caLines[5]);
		document.getElementById("sbp2DetailArchive").setAttribute("checked", caLines[6]);
		document.getElementById("sbp2DetailCustom").setAttribute("checked", caLines[7]);
		if ( caLines[8] > 3 ) {
			document.getElementById("sbp2DetailInDepthRadioGroup").selectedIndex = 4;
			document.getElementById("sbp2DetailInDepthRadioGroup").getItemAtIndex(4).label = caLines[8];
		} else if ( caLines[8] > 0 ) {
			document.getElementById("sbp2DetailInDepthRadioGroup").selectedIndex = parseInt(caLines[8]);
		} else {
			document.getElementById("sbp2DetailInDepthRadioGroup").selectedIndex = 1;
		}
		document.getElementById("sbp2DetailTimeoutRadioGroup").disabled = false;
		document.getElementById("sbp2DetailTimeoutRadioGroup").selectedIndex = parseInt(caLines[9]);
	},

	idcSetDepth : function(idcsdEvent)
	{
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
		//2.2.3 Überprüfen des Wertes auf Gültigkeit (es muss eine Zahl größer 3 sein). Ist dies nicht der Fall, wird der alte Wert wieder gewählt.
		//2.2.3.1 Anzeigen des Wertes 
		//
		//2.1 Tiefe 0 ist in diesem Modus gesperrt

		//1. Funktion verlassen, falls kein Radio-Button angeklickt wurde
		if  ( idcsdEvent.target.id.length > 0 ) return;
		//2. Prüfung, welcher Radio-Button angeklickt wurde
		if ( idcsdEvent.currentTarget.getItemAtIndex(0)!=idcsdEvent.target ) {
			//2.1 RadioGroup zur Auswahl der Pause bis zum Start der nächsten Archivierung freischalten
			document.getElementById("sbp2DetailTimeoutRadioGroup").disabled = false;
			//2.2 Eingabefenster einblenden mit anschließender Prüfung der Eingabe auf Gültigkeit
			if ( idcsdEvent.currentTarget.getItemAtIndex(4)==idcsdEvent.target ) {
				//2.2.1 Variablen initialisieren
				var idcsdDepthRadioLast = document.getElementById("sbp2DetailInDepthRadioGroup").getItemAtIndex(4);
				var idcsdParams = { mode: null, out: null};
				//2.2.2 Neuen Wert bei Benutzer erfragen
				window.openDialog('chrome://scrapbookplus2/content/sbp2InputDialog.xul', '', 'chrome,centerscreen,modal', idcsdParams);
				//2.2.3 Überprüfen des Wertes auf Gültigkeit (es muss eine Zahl größer 3 sein). Ist dies nicht der Fall, wird der alte Wert wieder gewählt.
				if ( idcsdParams.out == null ) {
					document.getElementById("sbp2DetailInDepthRadioGroup").selectedIndex = this.caInDepthIndex;
				} else {
					var idcsdNumberAccepted = false;
					if ( idcsdParams.out.length>0 ) {
						if ( !isNaN(idcsdParams.out) ) {
							var idcsdNumber = parseInt(idcsdParams.out);
							if ( idcsdNumber>3 ) {
								//2.2.3.1 Anzeigen des Wertes 
								idcsdDepthRadioLast.label = idcsdParams.out;
								idcsdNumberAccepted = true;
							}
						}
					}
					//Falls Eingabe nicht akzeptiert worden ist, Tiefe 3 wählen und einen Hinweis für den Anwender ausgeben
					if ( !idcsdNumberAccepted ) {
						alert(document.getElementById("sbp2CaptureAsString").getString("HINT"));
						document.getElementById("sbp2DetailInDepthRadioGroup").selectedIndex = this.caInDepthIndex;
					} else {
						//Index merken
						this.caInDepthIndex = 4;
					}
				}
			} else {
				//2.2.1 Index merken
				this.caInDepthIndex = document.getElementById("sbp2DetailInDepthRadioGroup").selectedIndex;
			}
		} else {
			//2.1 Tiefe 0 ist in diesem Modus gesperrt
		}
	},

}