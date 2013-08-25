
var sbp2FolderPicker = {

	fpData : null,
	fpResContainerSelected : null,

	accept : function()
	{
		//Ändert den Zielordner in der Maske sowie im Speicher, falls dieser geändert wurde
		//
		//1. Variablen initialisieren
		//2. Sind alter und neuer Zielordner verschieden, wird dies vermerkt
		//3. globale Variablen auf null setzen

		//1. Variablen initialisieren
		var aTree = document.getElementById("sbp2FPTree");
		var aRes = aTree.builderView.getResourceAtIndex(aTree.currentIndex);
		//2. Sind alter und neuer Zielordner verschieden, wird dies vermerkt
		if ( aRes != this.fpResContainerSelected ) {
			window.arguments[0].out = aRes;
		}
		//3. globale Variablen auf null setzen
		this.fpData = null;
		this.fpResContainerSelected = null;
	},

	cancel : function()
	{
		//globale Variablen auf null setzen
		this.fpData = null;
		this.fpResContainerSelected = null;
	},

	foldersGet : function(fgContParentRes)
	{
		//Ermittelt die Container innerhalb von fgContParentRes und trägt diese in fpData ein
		//
		//Ablauf:
		//1. Container in sbp2DataSource.dbData initialisieren
		//2. Container in sbp2FolderPicker.fpData initialisieren
		//3. Enumerator erstellen
		//4. Alle Container aufnehmen (rekursiver Aufruf zur Ermittlung von Containern im Container)

		//1. Container in sbp2DataSource.dbData initialisieren
		var fgContParent = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		fgContParent.Init(sbp2DataSource.dbData, fgContParentRes);
		//2. Container in sbp2FolderPicker.fpData initialisieren
		var fgCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		fgCont.Init(this.fpData, fgContParentRes);
		//3. Enumerator erstellen
		var fgContParentEnum = fgContParent.GetElements();
		//4. Alle Container aufnehmen
		while ( fgContParentEnum.hasMoreElements() )
		{
			//Resource bestimmen
			var fgRes = fgContParentEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			//Daten des Containers eintragen und nach weiteren Containern innerhalb von diesem suchen
			if ( sbp2Common.RDFCU.IsContainer(sbp2DataSource.dbData, fgRes) )
			{
				var fgID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, fgRes, "id");
				var fgTitle = sbp2DataSource.propertyGet(sbp2DataSource.dbData, fgRes, "title");
				this.fpData.Assert(fgRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#id"), sbp2Common.RDF.GetLiteral(fgID), true);
				this.fpData.Assert(fgRes, sbp2Common.RDF.GetResource("http://amb.vis.ne.jp/mozilla/scrapbook-rdf#title"), sbp2Common.RDF.GetLiteral(fgTitle), true);
				sbp2Common.RDFCU.MakeSeq(this.fpData, fgRes);
				fgCont.AppendElement(fgRes);
				this.foldersGet(fgRes);
			}
		}
	},

	init : function()
	{
		//Laden der übergebenen in-memory-datasource in sbp2FPTree
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Ansicht aktualisieren
		//3. Gewähltes Verzeichnis im Tree selektieren

		//1. Variablen initialisieren
		var iTree = document.getElementById("sbp2FPTree");
		this.fpData = window.arguments[0].data;
		this.fpResContainerSelected = window.arguments[0].res;
		var iRes = sbp2Common.RDF.GetResource("urn:scrapbook:root");
		//2. Ansicht aktualisieren
			//Verzeichnisstruktur von sbpDataSource.dbData übernehmen
		sbp2DataSource.init();
		this.foldersGet(iRes);
			//Wir weisen unserem tree die DataSource zu.
		iTree.database.AddDataSource(this.fpData);
			//Der rebuild() ist notwendig, da sonst immer noch nichts angezeigt wird!
		iTree.builder.rebuild();
		//3. Gewähltes Verzeichnis im Tree selektieren
		var iIdx = iTree.builderView.getIndexOfResource(this.fpResContainerSelected);
		iTree.view.selection.select(iIdx);
	},

}