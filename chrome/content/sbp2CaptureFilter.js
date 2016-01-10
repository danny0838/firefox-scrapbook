
var sbp2CaptureFilter = {

	cfFilter			: [],			//Liste mit allen Filtern, die im Tree zu sehen sind
	cfFilterIncExc		: [],			//Liste mit Include/Exclude-Angaben zu allen Einträgen in cfFilter
	cfFilterEdit		: -1,			//enthält den Index des Filters, der gerade editiert wird

	input : function()
	{
		//Ist Text vorhanden, wird der OK-Knopf freigeschaltet, andernfalls deaktiviert
		var iText = document.getElementById("sbp2TextboxFilter").value;
		if ( iText.length > 0 ) {
			document.getElementById("sbp2BtnAccept").disabled=false;
		} else {
			document.getElementById("sbp2BtnAccept").disabled=true;
		}
	},

	itemAdd : function()
	{
		//Nimmt einen neuen Filter auf oder ändert einen bestehenden.
		//Die Anzahl der selektierten Einträge wird an die aufrufende Funktion zurückgegeben.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Sicherstellen, dass der Eintrag noch nicht im Array vorhanden ist (momentan inaktiv)
		//3. Eintrag in Array aufnehmen, falls die Zeichenfolge noch nicht enthalten ist
		//4. Fenster aktualisieren
		//5. Anzahl Einträge mit Haken in Checkbox zurück an aufrufende Funktion

		//1. Variablen initialisieren
		var iaExists = -1;
		var iaIncExc = document.getElementById("sbp2MnuIncExc").label;
		var iaTitle = document.getElementById("sbp2TextboxFilter").value;
		//2. Prüfen, ob Eintrag gültig ist
			var iaSlash = 0;
			if ( iaTitle.substring(0, 1) == "+" ) {
				iaTitle = "/" + iaTitle.substring(0, iaTitle.length);
			} else if ( iaTitle.substring(0, 1) == "*" ) {
				iaTitle = "/" + iaTitle.substring(0, iaTitle.length);
			}
			for ( var iaJ=0; iaJ<iaTitle.length; iaJ++ )
			{
				if ( iaTitle.substring(iaJ, iaJ+1) == "/" ) {
					iaSlash = 1;
				} else {
					iaSlash = 0;
				}
			}
			//Anwendungstest
			try
			{
				var ufRegExp = new RegExp(iaTitle, "");
			} catch (iaException)
			{
				alert(document.getElementById("sbp2CaptureString").getString("FILTERERROR")+"\n\n"+iaTitle);
				return -1;
			}
		//2. Sicherstellen, dass der Eintrag noch nicht im Array vorhanden ist (momentan inaktiv)
		iaExists = -1;
/*
		for ( var iaI=0; iaI<this.cfFilter.length; iaI++ )
		{
			if ( this.cfFilter[iaI].match(iaTitle) ) {
				if ( this.cfFilterIncExc[iaI].match(iaIncExc) ) {
					iaExists = iaI;
					iaI = this.cfFilter.length;
				}
			}
		}
*/
		//3. Eintrag in Array aufnehmen, falls die Zeichenfolge noch nicht enthalten ist
		if ( iaExists == -1 ) {
			try
			{
				var iaTree = document.getElementById("sbp2TreeFilter");
				for ( var iaI=0; iaI<iaTree.childNodes.length; iaI++ )
				{
					if ( iaTree.childNodes[iaI].nodeName == "treechildren" ) {
						if ( this.cfFilterEdit == -1 ) {
							//Neuen Filter aufnehmen
							this.cfFilterIncExc.push(iaIncExc);
							this.cfFilter.push(iaTitle);
							//Neuen Filter in Tree aufnehmen
							var iaTchild = iaTree.childNodes[iaI];
							var iaTrow = document.createElement("treerow");
							var iaTcell0 = document.createElement("treecell");
							iaTcell0.setAttribute("label", iaIncExc);
							iaTrow.appendChild(iaTcell0);
							var iaTcell1 = document.createElement("treecell");
							iaTcell1.setAttribute("label", iaTitle);
							iaTrow.appendChild(iaTcell1);
							var iaTitem = document.createElement("treeitem");
							iaTitem.appendChild(iaTrow);
							iaTchild.appendChild(iaTitem);
						} else {
							//Bestehenden Filter in Listen editieren
							this.cfFilterIncExc[this.cfFilterEdit] = iaIncExc;
							this.cfFilter[this.cfFilterEdit] = iaTitle;
							//Bestehenden Filter im Tree aktualisieren
							iaTree.childNodes[iaI].childNodes[this.cfFilterEdit].childNodes[0].childNodes[0].setAttribute("label", iaIncExc);
							iaTree.childNodes[iaI].childNodes[this.cfFilterEdit].childNodes[0].childNodes[1].setAttribute("label", iaTitle);
							//gewaehlten Eintrag abwaehlen
							this.cfFilterEdit = -1;
						}
					}
				}
			} catch(iaEx)
			{
				alert("sbp2CaptureFilter.filterAdd\n---\nThis message should not be shown. Contact the developer.\n---\n"+iaEx);
			}
		}
		//4. Fenster aktualisieren
		var iaRWert = this.updateSelection();
		document.getElementById("sbp2TextboxFilter").value = "";
		document.getElementById("sbp2BtnAccept").disabled = true;
		document.getElementById("sbp2BtnCancel").disabled = true;
		document.getElementById("sbp2BtnDel").disabled = true;
		//5. Anzahl Einträge mit Haken in Checkbox zurück an aufrufende Funktion
		return iaRWert;
	},

	itemDel : function()
	{
		//Löscht den selektierten Filter.
		//Die Anzahl der selektierten Einträge wird an die aufrufende Funktion zurückgegeben.
		//
		//Ablauf:
		//1. Eintrag aus Array entfernen
		//2. Eintrag aus Tree entfernen
		//3. Editier-Modus ist nicht mehr aktiv
		//4. Fenster aktualisieren
		//5. Anzahl Einträge mit Haken in Checkbox zurück an aufrufende Funktion

		//1. Eintrag aus Array entfernen
		this.cfFilterIncExc.splice(this.cfFilterEdit, 1);
		this.cfFilter.splice(this.cfFilterEdit, 1);
		//2. Eintrag aus Tree entfernen
		var fdTree = document.getElementById("sbp2TreeFilter");
		for ( var fdI=0; fdI<fdTree.childNodes.length; fdI++ )
		{
			if ( fdTree.childNodes[fdI].nodeName == "treechildren" ) {
				fdTree.childNodes[fdI].childNodes[this.cfFilterEdit].childNodes[0].removeChild(fdTree.childNodes[fdI].childNodes[this.cfFilterEdit].childNodes[0].childNodes[1]);
				fdTree.childNodes[fdI].childNodes[this.cfFilterEdit].childNodes[0].removeChild(fdTree.childNodes[fdI].childNodes[this.cfFilterEdit].childNodes[0].childNodes[0]);
				fdTree.childNodes[fdI].childNodes[this.cfFilterEdit].removeChild(fdTree.childNodes[fdI].childNodes[this.cfFilterEdit].childNodes[0]);
				fdTree.childNodes[fdI].removeChild(fdTree.childNodes[fdI].childNodes[this.cfFilterEdit]);
			}
		}
		//3. Editier-Modus ist nicht mehr aktiv
		this.cfFilterEdit = -1;
		//4. Fenster aktualisieren
		var fdRWert = this.updateSelection();
		document.getElementById("sbp2TextboxFilter").value = "";
		document.getElementById("sbp2BtnAccept").disabled = true;
		document.getElementById("sbp2BtnCancel").disabled = true;
		document.getElementById("sbp2BtnDel").disabled = true;
		//5. Anzahl Einträge mit Haken in Checkbox zurück an aufrufende Funktion
		return fdRWert;
	},

	itemEdit : function()
	{
		//Vorbereiten zum Editieren oder Löschen eines Filters
		//
		//Ablauf:
		//1. Bestimmen der Position des selektierten Eintrags
		//2. Wurde ein Eintrag ausgewählt, wird das Editieren dieses Eintrags ermöglicht...
		//2.1 ... und der Fokus auf das Textfeld verlegt

		//1. Bestimmen der Position des selektierten Eintrags
		this.cfFilterEdit = document.getElementById("sbp2TreeFilter").currentIndex;
		//2. Wurde ein Eintrag ausgewählt, wird das Editieren dieses Eintrags ermöglicht
		if ( this.cfFilterEdit > -1 ) {
			if ( this.cfFilterIncExc[this.cfFilterEdit] == "Include" ) {
				document.getElementById("sbp2MnuIncExc").selectedIndex = 0;
			} else {
				document.getElementById("sbp2MnuIncExc").selectedIndex = 1;
			}
			document.getElementById("sbp2TextboxFilter").value = this.cfFilter[this.cfFilterEdit];
			document.getElementById("sbp2BtnAccept").disabled = true;
			document.getElementById("sbp2BtnCancel").disabled = false;
			document.getElementById("sbp2BtnDel").disabled = false;
			//2.1 ... und der Fokus auf das Textfeld verlegt
			document.getElementById("sbp2TextboxFilter").select();
			document.getElementById("sbp2TextboxFilter").focus();
		}
	},

	itemEditCancel : function()
	{
		//Das Editieren des ausgewählten Eintrags wurde vom Benutzer abgebrochen

		//Editier-Modus ist nicht mehr aktiv
		this.cfFilterEdit = -1;
		//Fenster aktualisieren
		document.getElementById("sbp2TextboxFilter").value = "";
		document.getElementById("sbp2BtnAccept").disabled = true;
		document.getElementById("sbp2BtnCancel").disabled = true;
		document.getElementById("sbp2BtnDel").disabled = true;
	},

	onKeyPressEnter : function(okpeURLTreeItemsSel)
	{
		//Auswertung der Tastatureingabe (nur Enter-Taste wird berücksichtigt)
		//Die Anzahl der selektierten Einträge wird an die aufrufende Funktion zurückgegeben (okpeRWert).
		//Sollte der neue/geänderte Filter ungültig sein, liefert this.itemAdd() -1 zurück. Dann liefert
		//diese Funktion die alte Anzahl an selektierten Einträgen im Tree zurück.
		var okpeText = document.getElementById("sbp2TextboxFilter").value;
		if ( okpeText.length > 0 ) {
			var okpeRWert = this.itemAdd();
			if ( okpeRWert == -1 ) {
				okpeRWert = okpeURLTreeItemsSel;
			}
			return okpeRWert;
		}
	},

	updateSelection : function()
	{
		//Es ist ein Filter hinzugekommen, geändert oder gelöscht worden. Die Auswahl muss aktualisiert werden.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. verbleibende Seiten prüfen und Auswahl an neue Filterliste anpassen
		//3. Information für Anwender ausgeben
		//4. Start-Knopf ist nach der Aktualisierung ausgegraut, falls nicht mindestens 1 Eintrag noch selektiert ist.
		//5. Anzahl Einträge mit Haken in Checkbox zurück an aufrufende Funktion

		//1. Variablen initialisieren
		var usSelected = 0;
		var usTree = document.getElementById("sbp2HTMLTree");
		//2. verbleibende Seiten prüfen und Auswahl an neue Filterliste anpassen
		for ( var usI=sbp2Capture.scURLTreePos; usI<sbp2Capture.scURLTree.length; usI++ )
		{
			var usChecked = this.useFilter(sbp2Capture.scURLTree[usI]);
			if ( usChecked ) usSelected++;
			usTree.childNodes[1].childNodes[usI].childNodes[0].childNodes[0].setAttribute("value", usChecked);
		}
		//3. Information für Anwender ausgeben
		var usSitesRemaining = usTree.childNodes[1].childNodes.length - sbp2Capture.scURLTreePos;
		document.getElementById("sbp2Progress").value = usSelected + " " + document.getElementById("sbp2CaptureString").getString("OF") + " " + usSitesRemaining + " " + document.getElementById("sbp2CaptureString").getString("ENTRIES");
		//4. Start-Knopf ist nach der Aktualisierung ausgegraut, falls nicht mindestens 1 Eintrag noch selektiert ist.
		if ( usSelected > 0 ) {
			document.getElementById("sbp2CaptureStartButton").disabled = false;
		} else {
			document.getElementById("sbp2CaptureStartButton").disabled = true;
		}
		//5. Anzahl Einträge mit Haken in Checkbox zurück an aufrufende Funktion
		return usSelected;
	},

	useFilter : function(ufURL)
	{
		//Können alle Suchbegriffe in ufURL gefunden werden, wird an die aufrufende Funktion "true" zurückgegeben,
		//andernfalls wird false.
		//
		//Ablauf:
		//1. Suchbegriff(e) in URL suchen
		//2. ufRWert bestimmen
		//3. true oder false an aufrufende Funktion zurückgegeben

		//1. Suchbegriff(e) in URL finden
		var ufMatch = 0;
		for ( var ufI=0; ufI<this.cfFilter.length; ufI++ )
		{
			var ufRegExp = new RegExp(this.cfFilter[ufI], "");
			if ( this.cfFilterIncExc[ufI] == "Include" ) {
				if ( ufURL.match(ufRegExp) ) ufMatch++;
			} else {
				if ( !ufURL.match(ufRegExp) ) ufMatch++;
			}
		}
		//2. ufRWert bestimmen
		var ufRWert = false;
		if ( ufMatch == this.cfFilter.length ) ufRWert = true;
		//3. true oder false an aufrufende Funktion zurückgegeben
		return ufRWert;
	},

}