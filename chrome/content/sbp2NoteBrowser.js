
var sbp2NoteBrowser = {

	nbHTML_Head : '<html><head><meta http-equiv="Content-Type" content="text/html;Charset=UTF-8"></head><body><pre>\n',
	nbHTML_Foot : '\n</pre></body></html>',
	nbID : null,

	close : function()
	{
		//Schließt das Tab ohne den Browser zu schließen. Bei nicht gespeicherten änderungen wird vor dem Schließen nachgefragt, ob gespeichert
		//werden soll.
		//
		//Ablauf:
		//1. onunload abbrechen
		//2. änderungen speichern?
		//3. Tab entfernen oder leere Seite laden, falls das Tab das einzige im Fenster ist
		//4. Variablien zurücksetzen

		//1. onunload abbrechen
		window.onunload = null;
		//2. änderungen speichern?
		if ( document.getElementById("sbp2NoteBSave").disabled == false ) {
			if ( window.confirm(document.getElementById("sbp2CommonString").getString("QUESTION_SAVE")) ) {
				this.save();
			}
		}
		//3. Tab entfernen oder leere Seite laden, falls das Tab das einzige im Fenster ist
		var cBrowser = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser").getBrowser();
		if ( cBrowser.mTabContainer.childNodes.length == 1 ) {
			cBrowser.loadURI("about:blank");
//Rein theoretisch nicht erfüllbar. Abfrage nur während alpha und beta-Phase. Dann entfernen.
} else if ( cBrowser.mTabContainer.childNodes.length == 0 ) {
	alert("sbp2NoteBrowser.close\n---\ncBrowser.mTabContainer.childNodes.length == 0. Contact the developer.");
		} else {
			window.close();
		}
		//4. Variablien zurücksetzen
		this.nbID = "";
	},

	onInput : function()
	{
		//Aktiviert den Speichern-Knopf, sobald eine Taste in der Textbox gedrückt wird.
		document.getElementById("sbp2NoteBSave").disabled=false;
		document.getElementById("sbp2NoteBSave").setAttribute("image", "chrome://scrapbookplus2/skin/note_save.png");
	},

	open : function()
	{
		//Läd den Inhalt von index.html im Tab des Browsers
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Datei-Objekt für index.html erstellen
		//3. Daten laden
		//4. Sicherstellen, dass Umlaute korrekt dargestellt werden
		//5. Kopf und Fuß entfernen
		//6. aufbereitete Daten in Textbox laden
		//7. Titel und Icon des Tab anpassen

		//1. Variablen initialisieren
		if ( !sbp2DataSource.dbData) sbp2DataSource.init();
		window.location.href.match(/\?id\=(\d{14})/);
		this.nbID = RegExp.$1;
		//2. Datei-Objekt für index.html erstellen
		var oDatei = sbp2Common.getBuchVZ();
		oDatei.append("data");
		oDatei.append(this.nbID);
		oDatei.append("index.html");
		//3. Daten laden
		var oData = sbp2Common.fileRead(oDatei);
		//4. Sicherstellen, dass Umlaute korrekt dargestellt werden
		oData = sbp2Common.convertToUnicode(oData, "UTF-8");
		//5. Kopf und Fuß entfernen
		oData = oData.replace(this.nbHTML_Head, "");
		oData = oData.replace(this.nbHTML_Foot, "");
		//6. aufbereitete Daten in Textbox laden
		document.getElementById("sbp2NoteBTextbox").value = oData;
		//7. Titel und Icon des Tab anpassen
		var oTitle = sbp2DataSource.propertyGet(sbp2DataSource.dbData, sbp2Common.RDF.GetResource("urn:scrapbook:item"+this.nbID), "title");
		document.getElementById("sbp2NoteBImage").setAttribute("src", "chrome://scrapbookplus2/skin/treenote.png");
		document.getElementById("sbp2NoteBLabel").value = oTitle;
		var win = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
		win.gBrowser.selectedTab.label = oTitle;
//Funktioniert nicht, da Tab noch nicht sichtbar ist zum Ausführungszeitpunkt
//		win.gBrowser.selectedTab.setAttribute("image", "chrome://scrapbookplus2/skin/treenote.png");
	},

	save : function()
	{
		//Speichert die in der Textbox stehenden Zeichen in index.html. Die erste Zeile wird zusätzlich als Titel eingetragen.
		//Nach dem Speichern wird die Textbox wieder versteckt.
		//
		//Ablauf:
		//1. Daten aus Textbox holen
		//2. Titel bestimmen
		//3. Daten aufbereiten
		//4. Datei-Objekt erstellen
		//5. aufbereitete Daten in Datei schreiben
		//6. Titel aktualisieren
		//7. Ansicht aktualisieren
		//7. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		//8. Speichern-Knopf deaktivieren, um anzuzeigen, daß die letzte änderung gespeichert worden ist

		//1. Daten aus Textbox holen
		var sData = document.getElementById("sbp2NoteBTextbox").value;
		//2. Titel bestimmen
		var sTitel = sData.split("\n");
		//3. Daten aufbereiten
		sData = this.nbHTML_Head + sData + this.nbHTML_Foot;
		//4. Datei-Objekt erstellen
		var sDatei = sbp2Common.getBuchVZ();
		sDatei.append("data");
		sDatei.append(this.nbID);
		sDatei.append("index.html");
		//5. aufbereitete Daten in Datei schreiben
		sbp2Common.fileWrite(sDatei, sData, "UTF-8");
		//6. Titel aktualisieren
		if ( sTitel.length>0 ) {
			sbp2DataSource.propertySet(sbp2DataSource.dbData, sbp2Common.RDF.GetResource("urn:scrapbook:item"+this.nbID), "title", sTitel[0]);
			document.getElementById("sbp2NoteBLabel").value = sTitel[0];
			var win = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
			win.gBrowser.selectedTab.label = sTitel[0];
		}
		//7. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		sbp2DataSource.dsFlush(sbp2DataSource.dbData);
		//8. Speichern-Knopf deaktivieren, um anzuzeigen, daß die letzte änderung gespeichert worden ist
		document.getElementById("sbp2NoteBSave").disabled = true;
		document.getElementById("sbp2NoteBSave").setAttribute("image", "chrome://scrapbookplus2/skin/note_save_dis.png");
	},

}