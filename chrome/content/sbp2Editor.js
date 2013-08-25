
var sbp2Editor = {

	seEdited		:	false,

	deHandleEvent : function(deheEvent)
	{
		//DOMEraser:
		//- hervorgehobenes Element löschen mit einem Mausklick
		//- Shift-Taste gedrückt halten, um nur das hervorgehobene Element zu behalten
		//
		//Ablauf:
		//1. Variablen initialisieren und ausgelöstes Event unterbrechen
		//2. HTML- und BODY-Tag dürfen nicht angefasst werden, da sonst die komplette Seite fehlen würde
		//3. gewünschtes Objekt entfernen

		//1. Variablen initialisieren und ausgelöstes Event unterbrechen
		var deheElement = deheEvent.target;
		var deheTagName = deheElement.localName.toUpperCase();
		//2. HTML- und BODY-Tag dürfen nicht angefasst werden, da sonst die komplette Seite fehlen würde
		if ( deheTagName=="HTML" ) return;
		if ( deheTagName=="BODY" ) return;
		//3. gewünschtes Objekt entfernen
		if ( deheEvent.shiftKey && deheEvent.button == 0 ) {
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
			//Selektiertes Objekt wird entfernt
			deheElement.parentNode.removeChild(deheElement);
		}
	},

	sSave : function()
	{
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
		var ssID = ssURL.match(/\/data\/(\d{14})\//);
		if ( ssURL.indexOf("file") == 0 && ssID != null ) {
			//Speichern, da lokal
			ssDocumentList.push(ssRootWindow.document);
			for ( var ssI=0; ssI<ssRootWindow.frames.length; ssI++ )
			{
				ssDocumentList.push(ssRootWindow.frames[ssI].document);
			}
			for ( var ssI=0; ssI<ssDocumentList.length; ssI++ )
			{
				//Variablen initialisieren
				var ssHTML = "";
				var ssFilename = "";
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
			sbp2Common.captureTab(window.content.location.href, document.getElementById('content').selectedTab.label);
		}
	},

	toggle : function()
	{
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

}