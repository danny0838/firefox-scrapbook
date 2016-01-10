
var sbp2Preferences = {

	spElements        : [],		//enthält einen Verweis auf die 5 Eingabefelder
	spKeysChanged     :  0,		//0=keine akzeptierte Taste bei aktiver Textbox gedrückt, 1=Taste gedrückt
	spKeysAccel       : -1,		//enthält den KeyCode für accel
	spKeysModifiers   : [],		//enthält den modifier in der Reihenfolge Umschalt, Strg und Alt
	spKeysTranslated  : [],		//enthält die übersetzungen aus prefs.properties in der Reihenfolge Umschalt, Strg und Alt
	spKeysSetTransltd : [],		//enthält die derzeitigen, vom Anwender gesetzten, Werte in lesbarer Form

	close : function()
	{
		//Derzeit ist kein Code notwendig. Daher ist diese Funktion leer.
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

}