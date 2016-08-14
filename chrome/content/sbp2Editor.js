
var sbp2Editor = {

	seTabListener		:	0,		//0=noch keine Listener für aktuelles Fenster; 1=Listener für aktuelles Fenster aktiv
	seTabModified		:	[],		//0=nicht verändert, 1=verändert für jeden Eintrag in seTabObject
	seTabObject			:	[],		//Referenz auf Tab-Objekt
	seHighlighterState	:	0,		//0=Text-Datei muss noch geladen werden; 1=Einträge im Menü des Markierstifts aktualisieren; 2=Einträge im Menü des Markierstifts auf dem aktuellen Stand
	seHighlighterName	:	[],
	seHighlighterStyle	:	[],

	deHandleEvent : function(deheEvent)
	{
		//DOMEraser:
		//- hervorgehobenes Element löschen mit einem Mausklick
		//- Shift-Taste gedrückt halten, um nur das hervorgehobene Element zu behalten
		//
		//Ablauf:
		//1. Verhindern, dass beim Klick auf Verweise die Seite gewechselt wird.
		//2. Variablen initialisieren und ausgelöstes Event unterbrechen
		//3. HTML- und BODY-Tag dürfen nicht angefasst werden, da sonst die komplette Seite fehlen würde
		//4. gewünschtes Objekt entfernen

		//1. Verhindern, dass beim Klick auf Verweise die Seite gewechselt wird.
		deheEvent.preventDefault();
		//2. Variablen initialisieren und ausgelöstes Event unterbrechen
		var deheElement = deheEvent.target;
		var deheTagName = deheElement.localName.toUpperCase();
		//3. HTML- und BODY-Tag dürfen nicht angefasst werden, da sonst die komplette Seite fehlen würde
		if ( deheTagName=="HTML" ) return;
		if ( deheTagName=="BODY" ) return;
		//4. gewünschtes Objekt entfernen
		if ( deheEvent.button == 0 ) {
			if ( deheEvent.shiftKey ) {
				//alles bis auf das selektierte Objekt wird entfernt
				var deheNode = deheElement;
				while ( deheNode != deheNode.ownerDocument.body ) {
					var deheNodeParent = deheNode.parentNode;
					var deheKorrektur  = 0;
					while ( deheNodeParent.childNodes.length>1 ) {
						if ( deheNodeParent.childNodes[deheKorrektur] != deheNode ) {
							deheNodeParent.removeChild(deheNodeParent.childNodes[deheKorrektur]);
						} else {
							deheKorrektur++;
						}
					}
					deheNode = deheNodeParent;
				}
			} else {
				if ( deheTagName == "SPAN" && deheElement.getAttribute("class") == "linemarker-marked-line" ) {
					//Ein mit dem Markierstift hervorgehobenes Objekt wurde angeklickt. Das SPAN-Element wird durch ein Text-Element ersetzt.
					//Um die Anzahl an Nodes zu reduzieren werden Text-Elemente vor und nach dem SPAN-Element zusammen mit dem SPAN-Element
					//zu einem neuen Text-Element zusammengefasst.
					deheElement.removeAttribute("class");
					deheElement.removeAttribute("style");
					var deheElementNext = deheElement.nextSibling;
					var deheElementPrev = deheElement.previousSibling;
					var deheTextContent = deheElement.textContent;
					if ( deheElementPrev.nodeType == deheElementPrev.TEXT_NODE ) {
						deheTextContent = deheElementPrev.textContent + deheTextContent;
						deheElementPrev.parentNode.removeChild(deheElementPrev);
					}
					if ( deheElementNext.nodeType == deheElementNext.TEXT_NODE ) {
						deheTextContent = deheTextContent + deheElementNext.textContent;
						deheElementNext.parentNode.removeChild(deheElementNext);
					}
					deheElement.parentNode.replaceChild(deheElement.ownerDocument.createTextNode(deheTextContent), deheElement);
//alert(deheElement.ownerDocument.getElementsByTagName("html")[0].innerHTML);
				} else {
					//Selektiertes Objekt wird entfernt
					deheElement.parentNode.removeChild(deheElement);
				}
			}
		}
	},

	hlHighlight : function(hlhNr)
	{
//Wird derzeit nur von sbp2Overlay.xul -> sbp2EditorHLButton aufgerufen.
		//Hebt den Text im markierten Bereich mit dem gewählten Markierstift hervor.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Falls der Button direkt gedrückt wurde, muss geprüft werden, welcher Markierstift im Moment selektiert ist.
		//3. Label für Vorschau aktualisieren, damit der gewählte Eintrag in der Liste angezeigt wird
		//4. Text-Auswahl mit Markierstift bearbeiten
		//4.1 Variablen initialisieren
		//4.2 Text vor Beginn der Auswahl separieren
		//4.3 Text nach Ende der Auswahl separieren
		//4.4 neuen SPAN-Node erstellen (selektierter Text wird mit Markierstift bearbeitet)
		//4.5 alten Text-Node durch neuen SPAN-Node ersetzen
		//4.6 alte Auswahl aufheben

		//1. Variablen initialisieren
		var hlhWindow = window.parent.gBrowser.contentWindow;
		var hlhChecked = null;
		var hlhDocument = hlhWindow.document;
		var hlhMenupopup = document.getElementById("sbp2EditorHLMenupopup");
		var hlhRange = null;
		var hlhSelection = hlhWindow.getSelection();
		//2. Falls der Button direkt gedrückt wurde, muss geprüft werden, welcher Markierstift im Moment selektiert ist.
		if ( !hlhNr ) {
			for ( var hlhI=1; hlhI<hlhMenupopup.childNodes.length; hlhI++ )
			{
				hlhChecked = hlhMenupopup.childNodes[hlhI].hasAttribute("checked");
				if ( hlhChecked == true ) {
					hlhNr = hlhI - 1;
					hlhI = hlhMenupopup.childNodes.length;
				}
			}
		}
		//3. Label für Vorschau aktualisieren, damit der gewählte Eintrag in der Liste angezeigt wird
		var hlhLabel = document.getElementById("sbp2EditorHLPreview");
		hlhLabel.value = this.seHighlighterName[hlhNr];
		hlhLabel.style.cssText = this.seHighlighterStyle[hlhNr];
		//4. Text-Auswahl mit Markierstift bearbeiten
		for ( var hlhI=0; hlhI<hlhSelection.rangeCount; hlhI++ )
		{
			//4.1 Variablen initialisieren
			hlhRange = hlhSelection.getRangeAt(hlhI);
			var hlhNode = hlhRange.commonAncestorContainer;
			var hlhNodeNext = hlhNode.nextSibling;
			var hlhParent = hlhNode.parentNode;
			var hlhTextOffsetStart = hlhRange.startOffset;
			var hlhTextOffsetEnd = hlhRange.endOffset;
			//Nur hervorheben, falls wirklich Text markiert wurde
			if ( hlhTextOffsetStart != hlhTextOffsetEnd ) {
				//4.2 Text vor Beginn der Auswahl separieren
				if ( hlhTextOffsetStart > 0 ) {
					hlhNode.splitText(hlhTextOffsetStart);
					hlhNode = hlhNode.nextSibling;
					hlhTextOffsetEnd = hlhTextOffsetEnd - hlhTextOffsetStart;
				}
				//4.3 Text nach Ende der Auswahl separieren
				if ( hlhTextOffsetEnd < hlhNode.textContent.length ) {
					hlhNode.splitText(hlhTextOffsetEnd);
				}
				//4.4 neuen SPAN-Node erstellen (selektierter Text wird mit Markierstift bearbeitet)
				var hlhSpan = hlhDocument.createElement("span");
				hlhSpan.appendChild(hlhDocument.createTextNode(hlhNode.textContent));
				hlhSpan.style.cssText = this.seHighlighterStyle[hlhNr];
				hlhSpan.setAttribute("class", "linemarker-marked-line");
				//4.5 alten Text-Node durch neuen SPAN-Node ersetzen
				hlhParent.replaceChild(hlhSpan, hlhNode);
				//4.6 alte Auswahl aufheben
				hlhRange.collapse();			//<- setzt beide Offset-Werte für Range auf 1
				hlhRange.detach();				//<- range freigeben, gut für Performance
			}
		}
//		alert(hlgstDocument.getElementsByTagName("html")[0].innerHTML);
	},

	hlInit : function(hliLines)
	{
//Wird von sbp2Editor.toggleEditorContext und sbp2Properties.accept aufgerufen.
		//Falls beim Aufruf der Funktion keine Daten mitgegeben werden, wird die Datei highlighter.txt aus dem Verzeichnis des
		//gerade geöffneten ScrapBooks eingelesen. Die Daten der Datei werden zeilenweise in einem Array abgelegt.
		//Mit den Informationen aus dem Array werden seHighlighterName und seHighlighterStyle initialisiert.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. highlighter.txt einlesen
		//3. gelesene Zeilen in this.seHighlighterName und this.seHighlighterStyle ablegen

		//1. Variablen initialisieren
		this.seHighlighterName = [];
		this.seHighlighterStyle = [];
		//2. highlighter.txt einlesen
		if ( hliLines == null ) {
			var hliFile = sbp2Common.getBuchVZ();
			hliFile.append("highlighter.txt");
			var hliData = sbp2Common.fileRead(hliFile);
			hliLines = hliData.split("\n");
		}
		//3. gelesene Zeilen in this.seHighlighterName und this.seHighlighterStyle ablegen
		if ( hliLines.length > 1 ) {
			for ( var hliI=0; hliI<hliLines.length-1; hliI = hliI + 2 )
			{
				this.seHighlighterName.push(hliLines[hliI]);
				this.seHighlighterStyle.push(hliLines[hliI+1]);
			}
		}
	},

	hlUIUpdate : function()
	{
//Wird derzeit nur von sbp2Editor.toggleEditorContext aufgerufen.
		//Füllt das Menü für den "Markierstift" im Editor mit Einträgen.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. alte menuitems löschen, falls welche vorhanden sind
		//3. menuitems anlegen
		//4. Ersten Eintrag im Menü auswählen
		//5. Label für Vorschau aktualisieren, damit der gewählte Eintrag in der Liste angezeigt wird

		//1. Variablen initialisieren
		var hliMenupopup = document.getElementById("sbp2EditorHLMenupopup");
		var hliMenuitem = null;
		var hliMenuitemLabel = null;
		var hliNr = hliMenupopup.childNodes.length - 1;
		//2. alte menuitems löschen, falls welche vorhanden sind
		while ( hliNr > 0 )
		{
			hliMenupopup.removeChild(hliMenupopup.childNodes[hliNr]);
			hliNr--;
		}
		//3. menuitems anlegen
		for ( var hliI=0; hliI<this.seHighlighterStyle.length; hliI++ )
		{
			hliMenuitem = document.getElementById("sbp2EditorHLMenuitemTemplate").cloneNode(true);
			hliMenuitem.setAttribute("hidden", "false");
			hliMenuitem.setAttribute("id", "sbp2EditorHLMenuitem"+hliI);
			hliMenuitem.setAttribute("label", this.seHighlighterName[hliI]);
			hliMenuitem.setAttribute("oncommand", "sbp2Editor.hlHighlight("+hliI+")");
			hliMenuitem.setAttribute("type", "radio");
			hliMenuitemLabel = document.getAnonymousElementByAttribute(hliMenuitem, "class", "menu-iconic-text");
			hliMenuitemLabel.style.cssText = this.seHighlighterStyle[hliI];
			hliMenuitemLabel.setAttribute("tooltiptext", this.seHighlighterStyle[hliI]);
			hliMenupopup.appendChild(hliMenuitem);
		}
		//4. Ersten Eintrag im Menü auswählen
		document.getElementById("sbp2EditorHLMenuitem0").setAttribute("checked", true);
		//5. Label für Vorschau aktualisieren, damit der gewählte Eintrag in der Liste angezeigt wird
		hliMenuitem = document.getElementById("sbp2EditorHLPreview");
		hliMenuitem.value = this.seHighlighterName[0];
		hliMenuitem.style.cssText = this.seHighlighterStyle[0];
	},

	sSave : function()
	{
//Wird derzeit nur von sbp2Overlay.xul -> sbp2EditorSave aufgerufen.
		//Speichern einer schon vorhandenen Seite oder Archivieren
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Seite speichern oder archivieren

		//1. Variablen initialisieren
		var ssDocumentList = [];
		var ssRootWindow = window.content;
		var ssURL = gBrowser.currentURI.spec;
		//2. Seite speichern oder archivieren
		var ssFilename = sbp2Common.getBuchVZ().path;
		ssFilename = ssFilename.replace(/\\/g, "/");
		ssFilename = ssFilename + "/data";
		var ssID = ssURL.match(/\/data\/(\d{14})\//);
		if ( ssURL.indexOf("file") == 0 && ssID != null && ssURL.indexOf(ssFilename) == 8 ) {
			//Speichern, da lokal
			ssDocumentList.push(ssRootWindow.document);
			for ( var ssI=0; ssI<ssRootWindow.frames.length; ssI++ )
			{
				ssDocumentList.push(ssRootWindow.frames[ssI].document);
			}
			for ( var ssI=0; ssI<ssDocumentList.length; ssI++ )
			{
				//Variablen initialisieren
				ssFilename = "";
				var ssHTML = "";
				var ssNodeList = [];
				//Dateiname bestimmen
				ssFilename = ssDocumentList[ssI].documentURI;
				ssFilename = ssFilename.substring(ssFilename.lastIndexOf("/")+1, ssFilename.length);
				//Kopie der geladenen Seite im Speicher erstellen
				ssNodeList.unshift(ssDocumentList[ssI].body.cloneNode(true));			//Sinn unklar!
				var ssRootNode = ssDocumentList[ssI].getElementsByTagName("html")[0].cloneNode(false);
				var ssHeadNode = ssDocumentList[ssI].getElementsByTagName("head")[0].cloneNode(true);
				ssRootNode.appendChild(ssHeadNode);
				ssRootNode.appendChild(ssDocumentList[ssI].createTextNode("\n"));
				ssRootNode.appendChild(ssNodeList[0]);
				ssRootNode.appendChild(ssDocumentList[ssI].createTextNode("\n"));
				//HTML-Code zusammenstellen
				var ssHTML = sbp2CaptureSaver.addHTMLTag(ssRootNode, ssRootNode.innerHTML);
				if ( ssDocumentList[ssI].doctype ) ssHTML = sbp2CaptureSaver.addHTMLDocType(ssDocumentList[ssI].doctype) + ssHTML;
				//Schreiben der finalen Datei
				var ssFileDst = sbp2Common.getBuchVZ();
				ssFileDst.append("data");
				ssFileDst.append(ssID[1]);
				ssFileDst.append(ssFilename);
				sbp2Common.fileWrite(ssFileDst, ssHTML, ssDocumentList[ssI].characterSet);
			}
			//Update in sbp2DataSource.dbDataSearchCacheUpdate vermerken
			sbp2DataSource.itemAddSearchCacheUpdate("urn:scrapbook:searchcacheupdate", ssID[1], "1");
			//RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
			sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCacheUpdate);
		} else {
			//Archivieren, da Webseite
			sbp2Common.captureTab(window.content.location.href, document.getElementById('content').selectedTab.label, null, null, 0);
		}
	},

	tabOnClose : function(tocEvent)
	{
//Wird derzeit nur von sbp2Editor.toggleEditorContext aufgerufen.
		//Prüfen, ob ein Eintrag in sbp2Editor.seTabObject existiert. Ist dies der Fall, müssen die Einträge in
		//sbp2Editor.seTabModified und sbp2Editor.seTabObject gelöscht werden.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Tab in Liste suchen und bei Fund löschen

		//1. Variablen initialisieren
		var tocTab = tocEvent.target;
		//2. Tab in Liste suchen und bei Fund löschen
		for ( var tocI=0; tocI<sbp2Editor.seTabObject.length; tocI++ )
		{
			if ( sbp2Editor.seTabObject[tocI] == tocTab ) {
				sbp2Editor.seTabModified.splice(tocI, 1);
				sbp2Editor.seTabObject.splice(tocI, 1);
				tocI = sbp2Editor.seTabObject.length;
			}
		}
	},

	tabOnMove : function(tomEvent)
	{
//Wird derzeit nur von sbp2Editor.toggleEditorContext aufgerufen.
		//Falls ein Tab in ein neues Fenster verschoben wird, müssen Informationen in sbp2Editor.seTabModified und sbp2Editor.seTabObject ebenfalls verschoben werden.
	},

	tabOnSelect : function(tosEvent)
	{
//Wird derzeit nur von sbp2Editor.toggleEditorContext aufgerufen.
		//Prüfen, ob für das selektierte Tab der Editor angezeigt werden muss.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Tab in Liste suchen
		//3. Hidden-Attribut für Editor aktualisieren (wurde der Tab in der Liste gefunden, wird der Editor angezeigt)

		//1. Variablen initialisieren
		var tosHidden = true;
		var tosTab = tosEvent.target;
		//2. Tab in Liste suchen
		for ( var tosI=0; tosI<sbp2Editor.seTabObject.length; tosI++ )
		{
			if ( sbp2Editor.seTabObject[tosI] == tosTab ) {
				tosHidden = false;
				tosI = sbp2Editor.seTabObject.length;
			}
		}
		//3. Hidden-Attribut für Editor aktualisieren (wurde der Tab in der Liste gefunden, wird der Editor angezeigt)
		document.getElementById("sbp2Toolbox").hidden = tosHidden;
	},

	toggleEditor : function()
	{
//Wird derzeit nur von sbp2Overlay.xul aufgerufen.
		//Blendet den Editor ein und aus.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Editor ein-/ausblenden

		//1. Variablen initialisieren
		var tChecked = document.getElementById("sbp2StatusPopupE").getAttribute("checked");
		//2. Editor ein-/ausblenden
		if ( tChecked ) {
			//Editor soll eingeblendet werden
			document.getElementById("sbp2Toolbox").hidden = false;
		} else {
			//Editor soll ausgeblendet werden
			document.getElementById("sbp2Toolbox").hidden = true;
		}
	},

	toggleEditorContext : function(tecEvent, tecHidden)
	{
//Wird derzeit nur von sbp2Overlay.xul aufgerufen.
		//Blendet den Editor über das Kontext-Menü ein und aus.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Informationen zu Tab bearbeiten
		//2.1 Informationen zu Tab entfernen, da Editor für Tab ausgeblendet wird
		//2.2 Informationen zu Tab aufnehmen, da Editor für Tab eingeblendet wird
		//3. Listener aktivieren, sofern für mindestens ein Tab im Fenster der Editor angezeigt wird, andernfalls deaktivieren
		//4. Einträge für Markierstift aktualisieren
		//5. Editor ein-/ausblenden

		//1. Variablen initialisieren
		if ( !tecHidden ) tecHidden = !document.getElementById("sbp2Toolbox").hidden;
		var tecTab = gBrowser.selectedTab;
		//2. Informationen zu Tab bearbeiten
		if ( tecHidden ) {
			//2.1 Informationen zu Tab entfernen, da Editor für Tab ausgeblendet wird
			for ( var tecI=0; tecI<this.seTabObject.length; tecI++ )
			{
				if ( this.seTabObject[tecI] == tecTab ) {
					alert("Tab gefunden!");
					this.seTabModified.splice(tecI, 1);
					this.seTabObject.splice(tecI, 1);
					tecI = this.seTabObject.length;
				}
			}
			alert(this.seTabObject.length);
		} else {
			//2.2 Informationen zu Tab aufnehmen, da Editor für Tab eingeblendet wird
			this.seTabModified.push(0);
			this.seTabObject.push(tecTab);
		}
		//3. Listener aktivieren, sofern für mindestens ein Tab im Fenster der Editor angezeigt wird, andernfalls deaktivieren
		var tecTabContainer = gBrowser.tabContainer;
		if ( this.seTabObject.length > 0 ) {
			tecTabContainer.addEventListener("TabClose", sbp2Editor.tabOnClose, false);
			tecTabContainer.addEventListener("TabMove", sbp2Editor.tabOnMove, false);
			tecTabContainer.addEventListener("TabSelect", sbp2Editor.tabOnSelect, false);
			this.seTabListener = 1;
		} else {
			tecTabContainer.removeEventListener("TabClose", sbp2Editor.tabOnClose, false);
			tecTabContainer.removeEventListener("TabMove", sbp2Editor.tabOnMove, false);
			tecTabContainer.removeEventListener("TabSelect", sbp2Editor.tabOnSelect, false);
			this.seTabListener = 0;
		}
		//4. Einträge für Markierstift aktualisieren
		if ( this.seTabObject.length > 0 ) {
			if ( this.seHighlighterState == 0 ) {
				this.hlInit();
				this.seHighlighterState = 1;
			}
			if ( this.seHighlighterState == 1 ) {
				this.hlUIUpdate();
				this.seHighlighterState = 2;
			}
		}
		//5. Editor ein-/ausblenden
		document.getElementById("sbp2Toolbox").hidden = tecHidden;
//Components.utils.import("resource://gre/modules/Services.jsm");
//let browserWin = Services.wm.getMostRecentWindow("navigator:browser");
//let tabBrowser = browserWin.getBrowser();
//alert(tabBrowser.selectedTab.nodeName);
//alert(tabBrowser.tabs[0] == tabBrowser.selectedTab);
//alert(tabBrowser.getBrowserAtIndex(0).contentWindow.document.URL+"\n"+tabBrowser.getBrowserAtIndex(1).currentURI.spec);
	}

}