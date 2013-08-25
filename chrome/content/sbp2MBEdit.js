
var sbp2MBEdit = {

	eintragDetails : null,

	mbeInit : function()
	{
		//OK-Knopf deaktivieren (erst verfügbar, wenn alle notwendigen Informationen angegeben sind)
		document.documentElement.getButton("accept").disabled = true;
		//Angaben merken
		this.eintragDetails = window.arguments[0];
		//Ansicht aktualisieren
		document.getElementById("sbp2Name").value = this.eintragDetails.name;
		if ( this.eintragDetails.folder != null )
		{
			if ( this.eintragDetails.folder.length>0 )
			{
				var miVZ = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
				miVZ.initWithPath(this.eintragDetails.folder);
				document.getElementById("sbp2VZ").file  = miVZ;
				document.getElementById("sbp2VZ").label = miVZ.path;
			}
		}
	},

	mbeCheckValues : function()
	{
		//OK-Knopf aktivieren und Angaben merken

		//OK-Knopf aktivieren, sofern ein Name und der Pfad bekannt sind
		this.eintragDetails.name = "";
		this.eintragDetails.folder = "";
		this.eintragDetails.status = null;
		document.documentElement.getButton("accept").disabled = true;
		var mcvTitle = document.getElementById("sbp2Name").value;
		if ( mcvTitle.length>0 )
		{
			if ( document.getElementById("sbp2VZ").label.length>0 )
			{
				document.documentElement.getButton("accept").disabled = false;
				//Angaben merken
				this.eintragDetails.name = mcvTitle;
				this.eintragDetails.folder = document.getElementById("sbp2VZ").label;
				this.eintragDetails.status = "1";
			}
		}
	},

	mbeChangeDirectory : function()
	{
		//Auswahl eines Ordners, der als Daten-Verzeichnis dient oder schon welche enthält
		//
		//Ablauf:
		//1. Picker öffnen
		//2. Verzeichnis anzeigen
		//3. Status des OK-Knopfs setzen

		//1. Picker öffnen
		var mcdPickerVZ = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		mcdPickerVZ.init(window, "Wählen sie ein Verzeichnis", mcdPickerVZ.modeGetFolder);
		if ( this.eintragDetails.folder != "" )
		{
			var mcdVZ = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
			mcdVZ.initWithPath(this.eintragDetails.folder);
			mcdPickerVZ.displayDirectory = mcdVZ;
		}
		var mvRWert = mcdPickerVZ.show();
		if ( mvRWert == mcdPickerVZ.returnOK )
		{
			//2. Verzeichnis anzeigen
			var mcdPathField = document.getElementById("sbp2VZ");
			mcdPathField.file = mcdPickerVZ.file;
			mcdPathField.label = mcdPickerVZ.file.path;
			//3. Status des OK-Knopfs setzen
			this.mbeCheckValues();
		}
	},

}