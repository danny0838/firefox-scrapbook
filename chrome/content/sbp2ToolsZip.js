
const PR_RDONLY			= 0x01;
const PR_WRONLY			= 0x02;
const PR_RDWR			= 0x04;
const PR_CREATE_FILE	= 0x08;
const PR_APPEND			= 0x10;
const PR_TRUNCATE		= 0x20;
const PR_SYNC			= 0x40
const PR_EXCL			= 0x80;

var sbp2ToolsZip = {

	scanDirectory : function(sdZipW, sdFolder, sdDefaultStringLength, sdIncFolders)
	{
		//Nimmt alle Dateien eines Verzeichnisses in die ZIP-Datei auf und trägt Unterverzeichnisse ein.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Einträge im Verzeichnis verarbeiten
		//3. Dateien im Verzeichnis werden nach den Unterverzeichnissen eingetragen
		//4. Unterverzeichnisse verarbeiten

		//1.Variablen initialisieren
		var sdFiles = [];
		var sdFolders = [];
		//2. Einträge im Verzeichnis verarbeiten
		var sdEnum = sdFolder.directoryEntries;
		while ( sdEnum.hasMoreElements() )
		{
			var sdFile = sdEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
			if ( sdFile.isDirectory() && sdIncFolders ) {
				var sdString = sdFile.path.substring(sdDefaultStringLength, sdFile.path.length);
				sdString = sdString.replace(/\\/g, "\/");
				sdZipW.addEntryDirectory(sdString, sdFile.lastModifiedTime * 1000, false);
				sdFolders.push(sdFile);
			} else {
				if ( sdFile.leafName.toLowerCase() != "index.dat" ) sdFiles.push(sdFile);
			}
		}
		//3. Dateien im Verzeichnis werden nach den Unterverzeichnissen eingetragen
		for ( var sdI=0; sdI<sdFiles.length; sdI++ )
		{
			var sdString = sdFiles[sdI].path.substring(sdDefaultStringLength, sdFiles[sdI].path.length);
			sdString = sdString.replace(/\\/g, "\/");
			sdZipW.addEntryFile(sdString, Components.interfaces.nsIZipWriter.COMPRESSION_BEST, sdFiles[sdI], false);
		}
		//4. Unterverzeichnisse verarbeiten
		for ( var sdI=0; sdI<sdFolders.length; sdI++ )
		{
			this.scanDirectory(sdZipW, sdFolders[sdI], sdDefaultStringLength);
		}
	},

/*
	unzipCompleteFolder : function(ucfFolder, ucfEntryName)
	{
		var ucfTemp = ucfEntryName.split("/");
		for ( var ucfI=0; ucfI<ucfTemp.length; ucfI++ )
		{
			ucfFolder.append(ucfTemp[ucfI]);
		}
		return ucfFolder;
	},
*/

	unzipFile : function(ufZipFile, ufDstFld)
	{
		//Extrahiert alle Dateien einer ZIP-Datei und entpackt sie in ufDstFld
		//
		//1. ZIP-Datei öffnen
		//2. Alle Dateien entpacken bis auf index.dat

		//1. ZIP-Datei öffnen
		var ufZipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"].createInstance(Components.interfaces.nsIZipReader);
		ufZipReader.open(ufZipFile, PR_RDWR);
		//2. Alle Dateien entpacken bis auf index.dat
		var ufEntries = ufZipReader.findEntries("*/");
			//Verzeichnisse anlegen
/*
		while ( ufEntries.hasMore() )
		{
			var ufEntryName = ufEntries.getNext();
			var ufFolder = this.unzipCompleteFolder(ufDstFld, ufEntryName);
		}
*/
			//Dateien extrahieren
		ufEntries = ufZipReader.findEntries(null);
		while ( ufEntries.hasMore() )
		{
			var ufEntryName = ufEntries.getNext();
			if ( ufEntryName == "index.dat") continue;
			var ufFile = ufDstFld.clone();
			ufFile.append(ufEntryName);
			ufZipReader.extract(ufEntryName, ufFile);
		}
	},

	zipFolder : function(zfZipFile, zfFolder, zfIncFolders)
	{
		//ZIP-Datei anlegen, öffnen, Dateien und Verzeichnisse aufnehmen und schließen.
		//
		//Ablauf:
		//1. ZIP-Datei anlegen und öffnen
		//2. Dateien aufnehmen
		//3. ZIP-Datei schließen

		//1. ZIP-Datei anlegen und öffnen
		var zfZipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
		var zfZipW = new zfZipWriter();
		zfZipW.open(zfZipFile, PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE);
		//2. Dateien aufnehmen
		this.scanDirectory(zfZipW, zfFolder, zfFolder.path.length+1, zfIncFolders);
		//3. ZIP-Datei schließen
		zfZipW.close();
		zfZipW = null;
	},

	zipStreamRead : function(zsrZipFile, zsrEntry)
	{
		//Inhalt der Datei 'zipStreamRead' aus zsrZipFile extrahieren.
		//
		//Ablauf:
		//1. ZIP-Datei öffnen
		//2. Daten lesen
		//3. Damit die Umlaute stimmen, müssen die ausgelesenen Daten konvertiert werden
		//4. ZIP-Datei schließen
		//5. Daten zurück an aufrufende Funktion

		//1. ZIP-Datei öffnen
		var zsrZipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"].createInstance(Components.interfaces.nsIZipReader);
		try
		{
			zsrZipReader.open(zsrZipFile, PR_RDWR);
		} catch(zsrEx)
		{
			if ( zsrEx.name == "NS_ERROR_FILE_CORRUPTED" ) {

			} else {
				alert("zipStreamRead (zsrZipReader.open)\n---\n"+zsrEx);
			}
			return "";
		}
		//2. Daten lesen
		var zsrIStream = null;
		try
		{
			zsrIStream = zsrZipReader.getInputStream(zsrEntry);
		} catch(zsrEx)
		{
			//index.dat nicht gefunden, Datei daher ungültig -> leeren String zurückgeben
			return "";
		}
		var zsrSIStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
		zsrSIStream.init(zsrIStream);
		var zsrData = null;
		try
		{
			zsrData = zsrSIStream.read(zsrIStream.available());
		} catch(zsrEx)
		{
			alert("zipStreamRead\n---\n"+zsrEx);
		}
		//3. Damit die Umlaute stimmen, müssen die ausgelesenen Daten konvertiert werden
		zsrData = sbp2Common.convertToUnicode(zsrData, "UTF-8");
		//4. ZIP-Datei schließen
		zsrZipReader.close();
		zsrZipReader = null;
		//5. Daten zurück an aufrufende Funktion
		return zsrData;
	},

	zipStream : function(zsZipFile, zsEntry, zsStream, zsOverwrite)
	{
		//1. ZIP-Datei anlegen und öffnen
		//2. Stream als index.dat hinzufügen
		//3. ZIP-Datei schließen

		//1. ZIP-Datei anlegen und öffnen
		var zsZipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
		var zsZipW = new zsZipWriter();
		zsZipW.open(zsZipFile, PR_RDWR | PR_CREATE_FILE);
		//2. Stream als index.dat hinzufügen
		zsZipW.addEntryStream(zsEntry, 0, Components.interfaces.nsIZipWriter.COMPRESSION_BEST, zsStream, false);
		//3. ZIP-Datei schließen
		zsZipW.close();
		zsZipW = null;
	},

}