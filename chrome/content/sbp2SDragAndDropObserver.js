
var sbp2SDragAndDropObserver = {

	modifierAlt : false,
	modifierCtrl : false,
	modifierShift : false,

	doDragOver : function(ddoEvent)
	{
		//Nur gültige Objekte dürfen auf das Tree-Element der Sidebar fallen gelassen werden.
		var ddoIsLink = ddoEvent.dataTransfer.types.contains("text/uri-list");
		var ddoIsTab = ddoEvent.dataTransfer.types.contains("application/x-moz-tabbrowser-tab");
		if ( ddoIsLink || ddoIsTab ) ddoEvent.preventDefault();
	},

	doDragStart : function(ddsEvent)
	{
		//
		if (ddsEvent.originalTarget.localName != "treechildren") return;
		ddsEvent.dataTransfer.setData('sbp2/itemimport', 'sbp2Tree');
	},

	modifiersGet : function(mgEvent)
	{
		//normale Verarbeitung verhindern
		mgEvent.preventDefault();
		//Festhalten, welche relevanten Tasten beim Auslösen der onDrop-Funktion vom Anwender gedrückt wurden
		if ( mgEvent.altKey ) this.modifierAlt = true;
		if ( mgEvent.ctrlKey ) this.modifierCtrl = true;
		if ( mgEvent.shiftKey ) this.modifierShift = true;
	},

	ddTreeBuilderObserver :
	{
		//Hier sind nur die für einen fehlerfreien Ablauf notwendigen Funktionen deklariert!

		canDrop : function(odIndex, odOrientation, odTransferData)
		{
			return true;
		},

		onDrop : function(odRow, odOrientation, odTransferData)
		{
			//Über odRow und odOrientation kann die Position bestimmt werden, an der der Eintrag eingefügt werden soll.
			//Die grafische Anzeige der Position scheint dagegen nicht sauber zu funktionieren. Der Benutzer erhält
			//keinerlei Hinweise, auf welcher Ebene das Element eingefügt wird.
			//
			//Ablauf:
			//1. Initialisierung
			//1.1 Ziel-Container und Position im Container bestimmen
			//1.2 Seite speichern oder Lesezeichen erstellen
			//1.3 Eintrag verschieben
			//2. Modifier auf false zurücksetzen

			//1. Variablen initialisieren
			var odContRes = null;
			var odContPos = null;
			var odIsLink = odTransferData.types.contains("text/uri-list");
			var odIsTab = odTransferData.types.contains("application/x-moz-tabbrowser-tab");
//			if ( odIsLink || odIsTab ) {
			if ( odIsTab ) {
/*
var odDataTransfer = odTransferData;
var odMessage = "";
for ( var odI=0; odI<odDataTransfer.types.length; odI++ )
{
	odMessage += odDataTransfer.types[odI]+" --- "+odDataTransfer.getData(odDataTransfer.types[odI])+"\n----\n";
}
alert(odMessage);
*/
				//1.1 Ziel-Container und Position im Container bestimmen
				if ( odRow > -1 ) {
					if ( odOrientation == 0 ) {
						var odTree = document.getElementById("sbp2Tree");
						odContRes = odTree.builderView.getResourceAtIndex(odRow);
						odContPos = -1;
					} else {
						var odData = sbp2DataSource.dbData;
						var odResources = odData.GetAllResources();
						var odTree = document.getElementById("sbp2Tree");
						var odRes = odTree.builderView.getResourceAtIndex(odRow);
						var odResIndexOf = -2;
						var odResource = null;
						while ( odResources.hasMoreElements() )
						{
							odResource = odResources.getNext();
							if ( sbp2Common.RDFCU.IsContainer(odData, odResource) ) {
								odResIndexOf = sbp2Common.RDFCU.indexOf(odData, odResource, odRes);
								if ( odResIndexOf > -1 ) {
									odContRes = odResource;
									if ( odOrientation == 0 ) {
										odContPos = -1;
									} else if ( odOrientation == -1 ) {
										odContPos = odResIndexOf;
									} else {
										odContPos = odResIndexOf + 1;
									}
									break;
								}
							}
						}
					}
				}
				//1.2 Seite speichern oder Lesezeichen erstellen
				if ( sbp2SDragAndDropObserver.modifierCtrl || sbp2SDragAndDropObserver.modifierShift ) {
					sbp2Common.captureTab(window.parent.gBrowser.currentURI.spec, window.parent.gBrowser.selectedTab.label, odContRes, odContPos, 1);
				} else if ( sbp2SDragAndDropObserver.modifierAlt ) {
					sbp2Common.captureBookmark(window.content.location.href, window.parent.gBrowser.selectedTab.label, odContRes, odContPos);
				} else {
					sbp2Common.captureTab(window.parent.gBrowser.currentURI.spec, window.parent.gBrowser.selectedTab.label, odContRes, odContPos, 0);
				}
			} else {
				//1.2 Eintrag verschieben
				var odTreeSrc = document.getElementById("sbp2Tree");
				var odTreeDst = document.getElementById("sbp2Tree");
				sbp2DataSource.itemMove(odTreeSrc, odTreeDst, odRow, odOrientation);
			}
			//2. Modifier auf false zurücksetzen
			sbp2SDragAndDropObserver.modifierAlt = false;
			sbp2SDragAndDropObserver.modifierCtrl = false;
			sbp2SDragAndDropObserver.modifierShift = false;
		},

		onToggleOpenState : function(otosIndex) {}
	},

}