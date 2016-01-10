
var sbp2NoteSidebar = {

	nsHTML_Head : '<html><head><meta http-equiv="Content-Type" content="text/html;Charset=UTF-8"></head><body><pre>\n',
	nsHTML_Foot : '\n</pre></body></html>',
	nsID : "",	//muß von außen gesetzt werden
	nsChanged : 0,	//es muss eine eigene Variable gesetzt werden, da sonst beim Schließen der Sidebar keine Prüfung auf änderung der Notiz stattfinden kann

	close : function()
	{
		//Schließt das Fenster mit der Notiz. Fragt beim Schließen nach, ob noch nicht übernommene änderungen vor dem Schließen
		//gespeichert werden sollen.
		//
		//Ablauf:
		//1. änderungen speichern?
		//2. Sidebar-Ansicht ausblenden
		//3. Variablien zurücksetzen

		//1. änderungen speichern?
		if ( this.nsChanged == 1 ) {
			if ( window.confirm(document.getElementById("sbp2CommonString").getString("QUESTION_SAVE")) ) {
				this.save();
			}
		}
		//2. Sidebar-Ansicht ausblenden
		document.getElementById("sbp2NoteSBSave").disabled = true;
		document.getElementById("sbp2NoteSBSave").setAttribute("image", "chrome://scrapbookplus2/skin/note_save_dis.png");
		document.getElementById("sbp2SplitterNoteSB").hidden = true;
		document.getElementById("sbp2NoteSBVB").hidden = true;
		//3. Variablien zurücksetzen
		this.nsID = "";
		this.nsChanged = 0;
	},

	load : function()
	{
		//Läd den Inhalt von index.html in die Textbox.
		//
		//Ablauf:
		//1. Datei-Objekt für index.html erstellen
		//2. Daten laden
		//3. Daten aufbereiten (Kopf und Fuß entfernen)
		//4. aufbereitete Daten in Textbox laden

		//1. Datei-Objekt für index.html erstellen
		var lDatei = sbp2Common.getBuchVZ();
		lDatei.append("data");
		lDatei.append(this.nsID);
		lDatei.append("index.html");
		//2. Daten laden
		var lData = sbp2Common.fileRead(lDatei);
		lData = sbp2Common.convertToUnicode(lData, "UTF-8");
		//3. Daten aufbereiten (Kopf und Fuß entfernen)
		lData = lData.replace(this.nsHTML_Head, "");
		lData = lData.replace(this.nsHTML_Foot, "");
		//4. aufbereitete Daten in Textbox laden
		document.getElementById("sbp2NoteSBTextbox").value = lData;
	},

	onInput : function()
	{
		//Aktiviert den Speichern-Knopf, sobald eine Taste in der Textbox gedrückt wird. sbp2NoteSidebar.nChanged wird auf 1 gesetzt, um eine änderung zu signalisieren.
		document.getElementById("sbp2NoteSBSave").disabled=false;
		document.getElementById("sbp2NoteSBSave").setAttribute("image", "chrome://scrapbookplus2/skin/note_save.png");
		this.nsChanged = 1;
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
		//8. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		//9. Speichern-Knopf deaktivieren, um anzuzeigen, daß die letzte änderung gespeichert worden ist

		//1. Daten aus Textbox holen
		var sData = document.getElementById("sbp2NoteSBTextbox").value;
		//2. Titel bestimmen
		//(Titel darf nicht mit Leerzeichen enden, da es sonst Probleme beim Exportieren gibt - Verzeichnisnamen mit Leerzeichen am Ende gibt es nicht)
		var sTitel = sData.split("\n");
		sTitel[0] = sTitel[0].trim();
		//3. Daten aufbereiten
		sData = this.nsHTML_Head + sData + this.nsHTML_Foot;
		//4. Datei-Objekt erstellen
		var sDatei = sbp2Common.getBuchVZ();
		sDatei.append("data");
		sDatei.append(this.nsID);
		sDatei.append("index.html");
		//5. aufbereitete Daten in Datei schreiben
		sbp2Common.fileWrite(sDatei, sData, "UTF-8");
		//6. Titel aktualisieren
		if ( sTitel.length>0 ) sbp2DataSource.propertySet(sbp2DataSource.dbData, sbp2Common.RDF.GetResource("urn:scrapbook:item"+this.nsID), "title", sTitel[0]);
		//7. Ansicht aktualisieren
		document.getElementById("sbp2Tree").builder.rebuild();
		//8. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		sbp2DataSource.dsFlush(sbp2DataSource.dbData);
		//9. Speichern-Knopf deaktivieren und nChanged auf 0 setzen, um anzuzeigen, daß die letzte änderung gespeichert worden ist
		document.getElementById("sbp2NoteSBSave").disabled = true;
		document.getElementById("sbp2NoteSBSave").setAttribute("image", "chrome://scrapbookplus2/skin/note_save_dis.png");
		this.nsChanged = 0;
	},

	tab : function()
	{
		//öffnet die angezeigte Notiz in einem neuen Tab. Die Ansicht in der Sidebar wird ausgeblendet.
		//Schon gemachte änderungen werden im Tab angezeigt.
		//
		//Ablauf:
		//1. Sidebar-Ansicht ausblenden
		//2. Overlay einblenden

		var tData = document.getElementById("sbp2NoteSBTextbox").value;
		//1. Sidebar-Ansicht ausblenden
		document.getElementById("sbp2NoteSBSave").disabled = true;
		document.getElementById("sbp2NoteSBSave").setAttribute("image", "chrome://scrapbookplus2/skin/note_save_dis.png");
		document.getElementById("sbp2SplitterNoteSB").hidden = true;
		document.getElementById("sbp2NoteSBVB").hidden = true;
		//2. Overlay einblenden
		sbp2Common.loadURL("chrome://scrapbookplus2/content/sbp2Note.xul?id="+this.nsID, true);
	},

}