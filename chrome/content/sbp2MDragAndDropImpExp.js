
var sbp2MDragAndDropImpExp = {

	ddOnDragStartExport : function(event)
	{
		//Es wird nur festgehalten, dass Einträge verschoben werden sollen.
		//Die Auswertung, ob es sich um gültige Einträge handelt, erfolgt erst beim Drop.
		if (event.originalTarget.localName != "treechildren") return;
		event.dataTransfer.setData('sbp2/itemexport', 'sbp2MIETree1');
	},

	ddOnDragStartImport : function(event)
	{
		if (event.originalTarget.localName != "treechildren") return;
		event.dataTransfer.setData('sbp2/itemimport', 'sbp2MIETree2');
	},

	ddOnDragOverImport : function(event)
	{
		//Nur Einträge, die aus dem linken Tree stammen ("sbp2/itemexport"), werden akzeptiert.
		var isExport = event.dataTransfer.types.contains("sbp2/itemexport");
		if (isExport) event.preventDefault();
	},

	ddOnDropImport : function(event)
	{
		//
		var data = event.dataTransfer.getData("sbp2/tradeitem");
		alert(data);
		event.preventDefault();
	},

	ddBuilderViewObserver :
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
			//2. Datenaustausch
			//2a. Import vom Export-Verzeichnis
			//2b. Eintrag kopieren

			//1. Initialisierung
			var odQuellTree = document.getElementById(odTransferData.getData(odTransferData.types[0]));
			var odZielTree = document.getElementById("sbp2MIETree1");
			//2. Datenaustausch
			if ( odQuellTree.id == "sbp2MIETree2" ) {
				//2a. Import vom Export-Verzeichnis
				sbp2Manage.ieItemImport();
			} else {
				//2b. Eintrag kopieren
				sbp2DataSource.itemMove(odQuellTree, odZielTree, odRow, odOrientation);
			}
		},

		onPerformAction : function(opaAction)
		{
			dump("hier\n");
		},

		onToggleOpenState : function(otosIndex) {}
	},

}