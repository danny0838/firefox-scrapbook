
var sbp2CaptureSaverImage = {

	save : function(sContent, sdbData)
	{
		//Speichert den Inhalt der ganzen Seite als Bild. Verwendet den Seitentitel als Titel in der Sidebar.
		//
		//Ablauf:
		//1. Zielverzeichnis anlegen
		//2. Canvas mit Daten füllen
		//3. Daten in Canvas umwandeln
		//4. Daten als PNG-Datei im Zielverzeichnis ablegen
		//5. index.html schreiben
		//6. index.dat schreiben
		//7. Archivierung abschließen

		//1. Zielverzeichnis anlegen
		var sNewID = sbp2Common.directoryCreate();
		var sExt = ".png";
		var sFile = sbp2Common.getBuchVZ();
		sFile.append("data");
		sFile.append(sNewID);
		sFile.append("index"+sExt);
		//2. Canvas mit Daten füllen
		var sCanvas = document.createElementNS("http://www.w3.org/1999/xhtml", "html:canvas");
		var sContext = sCanvas.getContext("2d");
		sCanvas.height = sContent.document.documentElement.scrollHeight;
		sCanvas.width = sContent.document.documentElement.scrollWidth;
		try
		{
			sContext.drawWindow(sContent, 0, 0, sContent.document.documentElement.scrollWidth, sContent.document.documentElement.scrollHeight, "rgb(255,255,255)");
		} catch (sEx)
		{
			alert("sbp2CaptureSaverImage.save\n---\n"+sEx);
		}
		//3. Daten in Canvas umwandeln
		var sData = sCanvas.toDataURL();
		//4. Daten als PNG-Datei im Zielverzeichnis ablegen
/*
		var sChosenData = new AutoChosen();
		sChosenData.file = sFile
		sChosenData.uri = makeURI(sData, null);
		internalSave(sData, null, "index"+sExt, null, "image/png", true, null, sChosenData, null, false);
*/
		sData				= sData.substring(22, sData.length);
		sData				= sData.replace(/[^A-Za-z0-9\+\/\=]/g, "");
		var sChr1, sChr2, sChr3;
		var sEnc1, sEnc2, sEnc3, sEnc4;
		var	sI				= 0;
		var sKeyStr			= "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var sOutput			= "";
		while ( sI < sData.length) {
			sEnc1 = sKeyStr.indexOf(sData.charAt(sI++));
			sEnc2 = sKeyStr.indexOf(sData.charAt(sI++));
			sEnc3 = sKeyStr.indexOf(sData.charAt(sI++));
			sEnc4 = sKeyStr.indexOf(sData.charAt(sI++));
			sChr1 = (sEnc1 << 2) | (sEnc2 >> 4);
			sChr2 = ((sEnc2 & 15) << 4) | (sEnc3 >> 2);
			sChr3 = ((sEnc3 & 3) << 6) | sEnc4;
			sOutput = sOutput + String.fromCharCode(sChr1);
			if (sEnc3 != 64) sOutput = sOutput + String.fromCharCode(sChr2);
			if (sEnc4 != 64) sOutput = sOutput + String.fromCharCode(sChr3);
 		}
		try
		{
			var sfoStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
			sfoStream.init(sFile, 0x02 | 0x08 | 0x20, parseInt("0666", 8), 0); 
			sfoStream.write(sOutput, sOutput.length);
			sfoStream.close();
		} catch(sEx)
		{
			alert("sbp2CaptureSaverImage.save\n---\n"+sEx);
		}
		//5. index.html schreiben
		sData = "<html>\n<head>\n<meta http-equiv=\"content-type\" content=\"text/html; charset=UTF-8\">\n<meta http-equiv=\"refresh\" content=\"0;URL=./index.png\">\n</head>\n<body>\n</body>\n</html>";
		sFile = sFile.parent;
		sFile.append("index.html");
		sbp2Common.fileWrite(sFile, sData, "UTF-8");
		//6. index.dat schreiben
		var sItem = { id: sNewID, type: "", title: gBrowser.selectedTab.label, chars: "", comment: "", icon: "", source: "" };
		sFile = sFile.parent;
		sFile.append("index.dat");
		sbp2Common.fileWriteIndexDat(sFile.path, sItem);
		//7. Archivierung abschließen
		sbp2Common.captureTabFinish(sItem, sbp2Common.RDF.GetResource("urn:scrapbook:root"), -1, 9);
	},

}