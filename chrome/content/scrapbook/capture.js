
var gURLs       = [];
var gDepths     = [];
var gRefURL     = "";
var gShowDetail = false;
var gResName    = "";
var gResIdx     = 0;
var gReferItem  = null;
var gOption     = {};
var gFile2URL   = {};
var gURL2Name   = {};
var gPreset     = [];
var gContext    = "";
<<<<<<< HEAD
var gMethod     = "SB";
var gCharset	= "";
var gTitles		= [];
var gTitle;
var gTimeout	= null;
=======
>>>>>>> release-1.6.0.a1




function SB_trace(aMessage)
{
	document.getElementById("sbCaptureTextbox").value = aMessage;
}


function SB_initCapture()
{
	var myURLs  = window.arguments[0];
	gRefURL     = window.arguments[1];
	gShowDetail = window.arguments[2];
	gResName    = window.arguments[3];
	gResIdx     = window.arguments[4];
	gReferItem  = window.arguments[5];
	gOption     = window.arguments[6];
	gFile2URL   = window.arguments[7];
	gPreset     = window.arguments[8];
<<<<<<< HEAD
	gMethod     = window.arguments[9];
	gCharset	= window.arguments[10];
	gTimeout	= window.arguments[11];
	gTitles		= window.arguments[12];

	if ( !gCharset ) gCharset = "UTF-8";
	if ( !gTimeout ) gTimeout = 0;
=======
>>>>>>> release-1.6.0.a1
	if ( gReferItem )
	{
		gContext = "indepth";
		gURL2Name[unescape(gReferItem.source)] = "index";
	}
	else if ( gPreset )
	{
		gContext = gPreset[1] == "index" ? "capture-again" : "capture-again-deep";
		if ( gContext == "capture-again-deep" )
		{
<<<<<<< HEAD
			var contDir = sbCommonUtils.getContentDir(gPreset[0]);
			var file = contDir.clone();
			file.append("sb-file2url.txt");
			if ( !file.exists() ) { alert("ScrapBook ERROR: Could not find 'sb-file2url.txt'."); window.close(); }
			var lines = sbCommonUtils.readFile(file).split("\n");
=======
			var contDir = ScrapBookUtils.getContentDir(gPreset[0]);
			var file = contDir.clone();
			file.append("sb-file2url.txt");
			if ( !file.exists() ) { ScrapBookUtils.alert("ERROR: Could not find 'sb-file2url.txt'."); window.close(); }
			var lines = ScrapBookUtils.readFile(file).split("\n");
>>>>>>> release-1.6.0.a1
			for ( var i = 0; i < lines.length; i++ )
			{
				var arr = lines[i].split("\t");
				if ( arr.length == 2 ) gFile2URL[arr[0]] = arr[1];
			}
<<<<<<< HEAD
			file = sbCommonUtils.getContentDir(gPreset[0]).clone();
			file.append("sb-url2name.txt");
			if ( !file.exists() ) { alert("ScrapBook ERROR: Could not find 'sb-url2name.txt'."); window.close(); }
			lines = sbCommonUtils.readFile(file).split("\n");
=======
			file = ScrapBookUtils.getContentDir(gPreset[0]).clone();
			file.append("sb-url2name.txt");
			if ( !file.exists() ) { ScrapBookUtils.alert("ERROR: Could not find 'sb-url2name.txt'."); window.close(); }
			lines = ScrapBookUtils.readFile(file).split("\n");
>>>>>>> release-1.6.0.a1
			for ( i = 0; i < lines.length; i++ )
			{
				var arr = lines[i].split("\t");
				if ( arr.length == 2 )
				{
					gURL2Name[arr[0]] = arr[1];
					if ( arr[1] == gPreset[1] ) myURLs = [arr[0]];
				}
			}
			gPreset[3] = gFile2URL;
<<<<<<< HEAD
			if ( !myURLs[0] ) { alert("ScrapBook ERROR: Could not find the source URL for " + gPreset[1] + ".html."); window.close(); }
=======
			if ( !myURLs[0] ) { ScrapBookUtils.alert("ERROR: Could not find the source URL for " + gPreset[1] + ".html."); window.close(); }
>>>>>>> release-1.6.0.a1
		}
	}
	else gContext = "link";
	if ( !gOption ) gOption = {};
	if ( !("script" in gOption ) ) gOption["script"] = false;
	if ( !("images" in gOption ) ) gOption["images"] = true;
	sbInvisibleBrowser.init();
	sbCaptureTask.init(myURLs);
<<<<<<< HEAD
	//Es wird gar nichts gemacht. Der Benutzer muss den Download selbst starten!
	sbCaptureTask.seconds = -1;
	sbCaptureTask.toggleStartPause(false);
=======
	gURLs.length == 1 ? sbCaptureTask.start() : sbCaptureTask.countDown();
>>>>>>> release-1.6.0.a1
}


function SB_splitByAnchor(aURL)
{
	var pos = 0;
	return ( (pos = aURL.indexOf("#")) < 0 ) ? [aURL, ""] : [aURL.substring(0, pos), aURL.substring(pos, aURL.length)];
}


function SB_suggestName(aURL)
{
<<<<<<< HEAD
	var baseName = sbCommonUtils.validateFileName(sbCommonUtils.splitFileName(sbCommonUtils.getFileName(aURL))[0]);
=======
	var baseName = ScrapBookUtils.validateFileName(ScrapBookUtils.splitFileName(ScrapBookUtils.getFileName(aURL))[0]);
>>>>>>> release-1.6.0.a1
	baseName = baseName.toLowerCase();
	if ( baseName == "index" ) baseName = "default";
	if ( !baseName ) baseName = "default";
	var name = baseName + ".html";
	var seq = 0;
	while ( gFile2URL[name] ) name = baseName + "_" + sbContentSaver.leftZeroPad3(++seq) + ".html";
<<<<<<< HEAD
	name = sbCommonUtils.splitFileName(name)[0];
=======
	name = ScrapBookUtils.splitFileName(name)[0];
>>>>>>> release-1.6.0.a1
	gFile2URL[name + ".html"] = aURL;
	gFile2URL[name + ".css"]  = true;
	return name;
}


function SB_fireNotification(aItem)
{
<<<<<<< HEAD
	var win = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
	win.sbCaptureObserverCallback.onCaptureComplete(aItem);
=======
	ScrapBookUtils.getBrowserWindow().sbCaptureObserverCallback.onCaptureComplete(aItem);
>>>>>>> release-1.6.0.a1
}




var sbCaptureTask = {

<<<<<<< HEAD
	get INTERVAL() { return gTimeout; },
	get TREE()     { return document.getElementById("sbpURLList"); },
=======
	get INTERVAL() { return 1; },
	get LISTBOX()  { return document.getElementById("sbCaptureListbox"); },
>>>>>>> release-1.6.0.a1
	get STRING()   { return document.getElementById("sbCaptureString"); },
	get URL()      { return gURLs[this.index]; },

	index       : 0,
	contentType : "",
	isDocument  : false,
	canRefresh  : true,
	sniffer     : null,
<<<<<<< HEAD
	seconds     : 3,
	timerID     : 0,
	forceExit   : 0,
	failed      : 0,
=======
	seconds     : 5,
	timerID     : 0,
	forceExit   : 0,
>>>>>>> release-1.6.0.a1

	init : function(myURLs)
	{
		if ( gContext != "indepth" && myURLs.length == 1 )
		{
<<<<<<< HEAD
			document.getElementById("sbCaptureSkipButton").hidden = true;
		}
=======
			this.LISTBOX.collapsed = true;
			this.LISTBOX.setAttribute("class", "plain");
			document.getElementById("sbCaptureSkipButton").hidden = true;
		}
		else
		{
			this.LISTBOX.setAttribute("rows", 10);
		}
		if ( gContext == "indepth" )
		{
			var button = document.getElementById("sbCaptureFilterButton");
			button.hidden = false;
			button.nextSibling.hidden = false;
			button.firstChild.firstChild.label += " (" + ScrapBookUtils.getRootHref(gReferItem.source) + ")" ;
			button.firstChild.firstChild.nextSibling.label += " (" + ScrapBookUtils.getBaseHref(gReferItem.source) + ")";
		}
>>>>>>> release-1.6.0.a1
		for ( var i = 0; i < myURLs.length; i++ ) this.add(myURLs[i], 1);
	},

	add : function(aURL, aDepth)
	{
<<<<<<< HEAD
=======
		if ( gURLs.length > 10000 ) return;
>>>>>>> release-1.6.0.a1
		if ( !aURL.match(/^(http|https|ftp|file):\/\//i) ) return;
		if ( gContext == "indepth" )
		{
			if ( aDepth > gOption["inDepth"] ) {
				return;
			}
			aURL = SB_splitByAnchor(aURL)[0];
			if ( !gOption["isPartial"] && aURL == gReferItem.source ) return;
			if ( gURLs.indexOf(aURL) != -1 ) return;
		}
		gURLs.push(aURL);
		gDepths.push(aDepth);
<<<<<<< HEAD
		try
		{
			var aObj = this.TREE;
			for (var aI=0; aI < aObj.childNodes.length; aI++)
			{
				if (aObj.childNodes[aI].nodeName == "treechildren")
				{
					var aTchild = aObj.childNodes[aI];
					var aTrow = document.createElement("treerow");
					var aTcell0 = document.createElement("treecell");
					aTcell0.setAttribute("value", sbpFilter.filter(aURL));
					aTrow.appendChild(aTcell0);
					var aTcell1 = document.createElement("treecell");
					aTcell1.setAttribute("label", aDepth + " [" + (gURLs.length - 1) + "] " + aURL);
					aTrow.appendChild(aTcell1);
					var aTcell2 = document.createElement("treecell");
					aTcell2.setAttribute("label", "ScrapBook");
					aTrow.appendChild(aTcell2);
					var aTitem = document.createElement("treeitem");
					aTitem.appendChild(aTrow);
					aTchild.appendChild(aTitem);
				}
			}
		} catch(aEx) { alert("add\n---\n"+aEx); }
=======
		var listitem = document.createElement("listitem");
		listitem.setAttribute("label", aDepth + " [" + (gURLs.length - 1) + "] " + aURL);
		listitem.setAttribute("type", "checkbox");
		listitem.setAttribute("checked", this.filter(gURLs.length - 1));
		this.LISTBOX.appendChild(listitem);
>>>>>>> release-1.6.0.a1
	},

	start : function(aOverriddenURL)
	{
		this.seconds = -1;
		this.toggleStartPause(true);
		this.toggleSkipButton(true);
<<<<<<< HEAD
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].setAttribute("properties", "selected");
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[0].setAttribute("properties", "disabled");
		var checkstate = this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[0].getAttribute("value");
		if ( checkstate.match("false") )
		{
			document.getElementById("sbpCaptureProgress").value = (this.index+1)+" \/ "+gURLs.length;
			this.TREE.childNodes[1].childNodes[this.index].childNodes[0].setAttribute("properties", "finished");
=======
		this.LISTBOX.getItemAtIndex(this.index).setAttribute("indicated", true);
		if ( this.index > 0 ) this.LISTBOX.getItemAtIndex(this.index - 1).removeAttribute("indicated");
		this.LISTBOX.ensureIndexIsVisible(this.index);
		var listitem = this.LISTBOX.getItemAtIndex(this.index);
		listitem.setAttribute("disabled", true);
		if ( !listitem.checked )
		{
>>>>>>> release-1.6.0.a1
			this.next(true);
			return;
		}
		this.contentType = "";
		this.isDocument = true;
		this.canRefresh = true;
		var url = aOverriddenURL || gURLs[this.index];
<<<<<<< HEAD
		if ( gTitles ) gTitle = gTitles[this.index];
		SB_trace(this.STRING.getString("CONNECT") + "... " + url);
		if ( gMethod != "SB" ) alert(gMethod+" unknown");
=======
		SB_trace(this.STRING.getString("CONNECT") + "... " + url);
>>>>>>> release-1.6.0.a1
		if ( url.indexOf("file://") == 0 ) {
			sbInvisibleBrowser.load(url);
		} else {
			this.sniffer = new sbHeaderSniffer(url, gRefURL);
			this.sniffer.httpHead();
		}
	},

	succeed : function()
	{
<<<<<<< HEAD
		document.getElementById("sbpCaptureProgress").value = (this.index+1)+" \/ "+gURLs.length;
		var treecell = document.createElement("treecell");
		treecell.setAttribute("label", "OK");
		treecell.setAttribute("properties", "success");
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].appendChild(treecell);
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].setAttribute("properties", "finished");
=======
		this.LISTBOX.getItemAtIndex(this.index).setAttribute("status", "succeed");
>>>>>>> release-1.6.0.a1
		this.next(false);
	},

	fail : function(aErrorMsg)
	{
<<<<<<< HEAD
		document.getElementById("sbpCaptureProgress").value = (this.index+1)+" \/ "+gURLs.length;
		if ( aErrorMsg ) SB_trace(aErrorMsg);
		var treecell = document.createElement("treecell");
		treecell.setAttribute("label", this.sniffer.getStatus());
		treecell.setAttribute("properties", "failed");
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].appendChild(treecell);
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].setAttribute("properties", "finished");
=======
		if ( aErrorMsg ) SB_trace(aErrorMsg);
		var listitem = this.LISTBOX.getItemAtIndex(this.index);
		listitem.setAttribute("label", gDepths[this.index] + " [" + this.index + "] " + aErrorMsg);
		listitem.setAttribute("status", "failure");
>>>>>>> release-1.6.0.a1
		if ( gURLs.length > 1 ) {
			this.next(true);
		} else {
			this.toggleStartPause(false);
		}
	},

	next : function(quickly)
	{
		this.toggleStartPause(true);
		this.toggleSkipButton(false);
<<<<<<< HEAD
=======
		this.LISTBOX.getItemAtIndex(this.index).setAttribute("disabled", true);
		this.LISTBOX.getItemAtIndex(this.index).removeAttribute("indicated");
>>>>>>> release-1.6.0.a1
		if ( this.sniffer ) this.sniffer.onHttpSuccess = function(){};
		sbInvisibleBrowser.ELEMENT.stop();
		if ( ++this.index >= gURLs.length ) {
			this.finalize();
		} else {
			if ( quickly || gURLs[this.index].indexOf("file://") == 0 ) {
				window.setTimeout(function(){ sbCaptureTask.start(); }, 0);
			} else {
				this.seconds = this.INTERVAL;
<<<<<<< HEAD
				if ( this.seconds > 0 )
				{
					sbCaptureTask.countDown();
				} else
				{
					sbCaptureTask.start();
				}
=======
				sbCaptureTask.countDown();
>>>>>>> release-1.6.0.a1
			}
		}
	},

	countDown : function()
	{
		SB_trace(this.STRING.getFormattedString("WAITING", [sbCaptureTask.seconds]) + "...");
		if ( --this.seconds > 0 )
			this.timerID = window.setTimeout(function(){ sbCaptureTask.countDown(); }, 1000);
		else
			this.timerID = window.setTimeout(function(){ sbCaptureTask.start(); }, 1000);
	},

	finalize : function()
	{
		if ( gContext == "indepth" )
		{
			sbCrossLinker.invoke();
		}
		else
		{
			if ( gURLs.length > 1 ) SB_fireNotification(null);
<<<<<<< HEAD
			//Fenster wird nur geschlossen, wenn alle ausgewaehlten Seiten heruntergeladen werden konnten
			if ( this.failed == 0 ) this.closeWindow();
		}
	},

	closeWindow : function()
	{
		window.setTimeout(function(){ window.close(); }, 1000);
	},

=======
			window.setTimeout(function(){ window.close(); }, 1000);
		}
	},

>>>>>>> release-1.6.0.a1
	activate : function()
	{
		this.toggleStartPause(true);
		if ( this.seconds < 0 )
			sbCaptureTask.start();
		else
			this.countDown();
	},

	pause : function()
	{
		this.toggleStartPause(false);
		if ( this.seconds < 0 ) {
			sbInvisibleBrowser.ELEMENT.stop();
		} else {
			this.seconds++;
			window.clearTimeout(this.timerID);
		}
	},

	abort : function()
	{
		if ( gContext != "indepth" ) window.close();
		if ( ++this.forceExit > 2 ) window.close();
		if ( this.index < gURLs.length - 1 ) { this.index = gURLs.length - 1; this.next(); }
	},

<<<<<<< HEAD
	toggleFilterBox : function(tfbEvent)
	{
		//Blendet die Filterdetails an/aus

		var tfbChecked = true;
		tfbChecked = document.getElementById("sbpChkFilter").checked;
		if ( tfbEvent )
		{
			if ( tfbEvent.button == 0 )
			{
				if ( tfbChecked )
				{
					tfbChecked = false;
				} else
				{
					tfbChecked = true;
				}
			}
		}
		document.getElementById("sbpFilterBox").hidden = !tfbChecked;
	},

=======
>>>>>>> release-1.6.0.a1
	toggleStartPause : function(allowPause)
	{
		document.getElementById("sbCapturePauseButton").disabled = false;
		document.getElementById("sbCapturePauseButton").hidden = !allowPause;
		document.getElementById("sbCaptureStartButton").hidden =  allowPause;
		document.getElementById("sbCaptureTextbox").disabled   = !allowPause;
	},

	toggleSkipButton : function(willEnable)
	{
		document.getElementById("sbCaptureSkipButton").disabled = !willEnable;
	},

<<<<<<< HEAD
};

var sbpFilter = {
	sfLimitToDomain : 0,
	sfRegularExpression : 0,
	sfFilter : [],
	sfFilterIncExc : [],
	sfFilterEdit : -1,			//enthält den Index des zu editierenden Filters

	add : function()
	{
		//Nimmt einen neuen Filter auf oder ändert einen bestehenden
		//
		//Ablauf
		//1. Filterliste durchsuchen nach identischem Eintrag
		//2. Filter in Tabelle aufnehmen, sofern noch nicht vorhanden
		//3. Selektion aktualisieren
		//4. Vorgang beendet

		var aFilterVorhanden = -1;
		var aFilterNeu = document.getElementById("sbpTextboxFilter").value;
		var aFilterIncExcNeu = document.getElementById("sbpMnuIncExc").label;
		//1. Filterliste durchsuchen nach identischem Eintrag
		if ( this.sfFilterEdit == -1 )
		{
			for ( var aI=0; aI<this.sfFilter.length; aI++ )
			{
				if ( this.sfFilter[aI].match(aFilterNeu) )
				{
					aFilterVorhanden = aI;
					aI = this.sfFilter.length;
				}
			}
		}
		//2. Filter in Tabelle aufnehmen, sofern noch nicht vorhanden
		if ( aFilterVorhanden == -1 )
		{
			try
			{
				var aTree = document.getElementById("sbpTreeFilter");
				for ( var aI=0; aI<aTree.childNodes.length; aI++ )
				{
					if ( aTree.childNodes[aI].nodeName == "treechildren" )
					{
						if ( this.sfFilterEdit == -1 )
						{
							this.sfFilterIncExc.push(aFilterIncExcNeu);
							this.sfFilter.push(aFilterNeu);
							var aTchild = aTree.childNodes[aI];
							var aTrow = document.createElement("treerow");
							var aTcell0 = document.createElement("treecell");
							aTcell0.setAttribute("label", aFilterIncExcNeu);
							aTrow.appendChild(aTcell0);
							var aTcell1 = document.createElement("treecell");
							aTcell1.setAttribute("label", aFilterNeu);
							aTrow.appendChild(aTcell1);
							var aTitem = document.createElement("treeitem");
							aTitem.appendChild(aTrow);
							aTchild.appendChild(aTitem);
						} else
						{
							aTree.childNodes[aI].childNodes[0].childNodes[this.sfFilterEdit].childNodes[0].setAttribute("label", aFilterIncExcNeu);
							aTree.childNodes[aI].childNodes[0].childNodes[this.sfFilterEdit].childNodes[1].setAttribute("label", aFilterNeu);
							this.sfFilterIncExc[this.sfFilterEdit] = aFilterIncExcNeu;
							this.sfFilter[this.sfFilterEdit] = aFilterNeu;
							this.sfFilterEdit = -1;
						}
					}
				}
			} catch(aEx)
			{
				alert("Das sollte nicht vorkommen\n---\n"+aEx);
			}
		}
		//3. Selektion aktualisieren
		this.updateSelection();
		//4. Vorgang beendet
		document.getElementById("sbpTextboxFilter").value = "";
		document.getElementById("sbpBtnAccept").disabled = true;
		document.getElementById("sbpBtnCancel").disabled = true;
		document.getElementById("sbpBtnDel").disabled = true;
	},

	cancel : function()
	{
		//Das Editieren des ausgewählten Eintrags wird vom Benutzer abgebrochen

		this.sfFilterEdit = -1;
		document.getElementById("sbpTextboxFilter").value = "";
		document.getElementById("sbpBtnAccept").disabled = true;
		document.getElementById("sbpBtnCancel").disabled = true;
		document.getElementById("sbpBtnDel").disabled = true;
	},

	del : function()
	{
		//Löscht den selektierten Filter
		//
		//Ablauf:
		//1. Eintrag aus Array entfernen
		//2. Eintrag aus Tree entfernen
		//3. Selektion aktualisieren
		//4. Vorgang beendet

		//1. Eintrag aus Array entfernen
		this.sfFilterIncExc.splice(this.sfFilterEdit, 1);
		this.sfFilter.splice(this.sfFilterEdit, 1);
		//2. Eintrag aus Tree entfernen
		var dTree = document.getElementById("sbpTreeFilter");
		for ( var dI=0; dI<dTree.childNodes.length; dI++ )
		{
			if ( dTree.childNodes[dI].nodeName == "treechildren" )
			{
				dTree.childNodes[dI].childNodes[this.sfFilterEdit].childNodes[0].removeChild(dTree.childNodes[dI].childNodes[this.sfFilterEdit].childNodes[0].childNodes[1]);
				dTree.childNodes[dI].childNodes[this.sfFilterEdit].childNodes[0].removeChild(dTree.childNodes[dI].childNodes[this.sfFilterEdit].childNodes[0].childNodes[0]);
				dTree.childNodes[dI].childNodes[this.sfFilterEdit].removeChild(dTree.childNodes[dI].childNodes[this.sfFilterEdit].childNodes[0]);
				dTree.childNodes[dI].removeChild(dTree.childNodes[dI].childNodes[this.sfFilterEdit]);
			}
		}
		//3. Selektion aktualisieren
		this.updateSelection();
		//4. Vorgang beendet
		this.sfFilterEdit = -1;
		document.getElementById("sbpTextboxFilter").value = "";
		document.getElementById("sbpBtnAccept").disabled = true;
		document.getElementById("sbpBtnCancel").disabled = true;
		document.getElementById("sbpBtnDel").disabled = true;
	},

	editFilter : function()
	{
		//Vorbereiten zum Editieren oder Löschen eines Filters
		//
		//Ablauf:
		//1. Bestimmen der Position des selektierten Eintrags
		//2. Wurde ein Eintrag ausgewählt, wird das Editieren dieses Eintrags ermöglicht

		//1.
		this.sfFilterEdit = document.getElementById("sbpTreeFilter").currentIndex;
		//2.
		if ( this.sfFilterEdit > -1 )
		{
			if ( this.sfFilterIncExc[this.sfFilterEdit] == "Include" )
			{
				document.getElementById("sbpMnuIncExc").selectedIndex = 0;
			} else
			{
				document.getElementById("sbpMnuIncExc").selectedIndex = 1;
			}
			document.getElementById("sbpTextboxFilter").value = this.sfFilter[this.sfFilterEdit];
			document.getElementById("sbpBtnAccept").disabled = true;
			document.getElementById("sbpBtnCancel").disabled = false;
			document.getElementById("sbpBtnDel").disabled = false;
		}
	},

	filter : function(fURL)
	{
		//Wendet die gesetzten Filter auf die übergebene URL an und liefert true oder false zurück
		//
		//Ablauf:
		//1. Suchbegriff(e) in URL finden
		//2. fRWert bestimmen
		//3. true oder false an aufrufende Funktion zurückgegeben

		//1. Suchbegriff(e) in URL finden
		var fAufnehmen = 0;
		for ( var fI=0; fI<this.sfFilter.length; fI++ )
		{
			if ( this.sfFilterIncExc[fI] == "Include" )
			{
				if ( fURL.match(sbpFilter.sfFilter[fI]) ) fAufnehmen++;
			} else
			{
				if ( !fURL.match(sbpFilter.sfFilter[fI]) ) fAufnehmen++;
			}
		}
		//2. fRWert bestimmen
		var fRWert = false;
		if ( fAufnehmen == this.sfFilter.length )
		{
			fRWert = true;
		}
		//3. true oder false an aufrufende Funktion zurückgegeben
		return fRWert;
	},

	input : function()
	{
		//Ist Text vorhanden, wird der OK-Knopf freigeschaltet, andernfalls deaktiviert
		var iText = document.getElementById("sbpTextboxFilter").value;
		if ( iText.length > 0 )
		{
			document.getElementById("sbpBtnAccept").disabled=false;
		} else
		{
			document.getElementById("sbpBtnAccept").disabled=true;
		}
	},

	updateSelection : function()
	{
		//Funktion aktualisiert den Inhalt der aktuellen Auswahl

		var usFilteranzahl = this.sfFilter.length;

		if ( usFilteranzahl==0 ) this.sfFilter.push("");
		if ( this.sfFilter[0].substr(this.sfFilter[0].length-1, this.sfFilter[0].length) != "\\" )
		{
			var usTree = document.getElementById("sbpURLList");
			if ( usTree.childNodes[1].childNodes.length>0 )
			{
				for ( var usI=sbCaptureTask.index; usI<gURLs.length; usI++ )
				{
					var usChecked = this.filter(gURLs[usI]);
					usTree.childNodes[1].childNodes[usI].childNodes[0].childNodes[0].setAttribute("value", usChecked);
				}
			}
		}
		if ( usFilteranzahl==0 ) this.sfFilter = [];
	},

};
=======
	filter : function(i)
	{
		return true;
	},

	applyFilter : function(type)
	{
		switch ( type )
		{
			case "D" : var ref = ScrapBookUtils.getRootHref(gReferItem.source).toLowerCase(); this.filter = function(i){ return gURLs[i].toLowerCase().indexOf(ref) == 0; }; break;
			case "L" : var ref = ScrapBookUtils.getBaseHref(gReferItem.source).toLowerCase(); this.filter = function(i){ return gURLs[i].toLowerCase().indexOf(ref) == 0; }; break;
			case "S" : 
				var ret = { value : "" };
				if ( !ScrapBookUtils.PROMPT.prompt(window, "[ScrapBook]", this.STRING.getString("FILTER_BY_STRING"), ret, null, {}) ) return;
				if ( ret.value ) this.filter = function(i){ return gURLs[i].toLowerCase().indexOf(ret.value.toLowerCase()) != -1; };
				break;
			case "N" : this.filter = function(i){ return true;  }; break;
			case "F" : this.filter = function(i){ return false; }; break;
			case "I" : this.filter = function(i){ return !sbCaptureTask.LISTBOX.getItemAtIndex(i).checked; }; break;
			default  : return;
		}
		for ( var i = this.index; i < gURLs.length; i++ )
		{
			this.LISTBOX.getItemAtIndex(i).checked = this.filter(i);
		}
	},

};



>>>>>>> release-1.6.0.a1

var sbInvisibleBrowser = {

	get ELEMENT() { return document.getElementById("sbCaptureBrowser"); },

	fileCount : 0,
	onload    : null,

	init : function()
	{
<<<<<<< HEAD
		//Dieser try-catch-Block entfernt einen eventuell vorhandenen ProgressListener. Dieser Block wurde notwendig, um
		//beim Zusammenfassen-Assistent Fehler zu vermeiden, wenn eine fertig geladene Vorschau korrigiert werden soll.
		try
		{
			this.ELEMENT.webProgress.removeProgressListener(this, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
		} catch(ex)
		{
		}
		this.ELEMENT.webProgress.addProgressListener(this, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
=======
		this.ELEMENT.webProgress.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_ALL);
>>>>>>> release-1.6.0.a1
		this.onload = function(){ sbInvisibleBrowser.execCapture(); };
		this.ELEMENT.addEventListener("load", sbInvisibleBrowser.onload, true);
	},

	refreshEvent : function(aEvent)
	{
		this.ELEMENT.removeEventListener("load", this.onload, true);
		this.onload = aEvent;
		this.ELEMENT.addEventListener("load", this.onload, true);
	},

	load : function(aURL)
	{
		this.fileCount = 0;
		this.ELEMENT.docShell.allowJavascript = gOption["script"];
		this.ELEMENT.docShell.allowImages     = gOption["images"];
		this.ELEMENT.docShell.allowMetaRedirects = false;
<<<<<<< HEAD
		if ( Components.interfaces.nsIDocShellHistory ) {
			this.ELEMENT.docShell.QueryInterface(Components.interfaces.nsIDocShellHistory).useGlobalHistory = false;
		} else {
			this.ELEMENT.docShell.useGlobalHistory = false;
		}
		//gCharset = "ISO-8859-1" oder UTF-8;
		var browserObj = document.commandDispatcher.focusedWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebNavigation);
		browserObj.QueryInterface(Components.interfaces.nsIDocShell).QueryInterface(Components.interfaces.nsIDocCharset).charset = gCharset;
=======
		if (Ci.nsIDocShellHistory)
			this.ELEMENT.docShell.QueryInterface(Ci.nsIDocShellHistory).useGlobalHistory = false;
		else
			this.ELEMENT.docShell.useGlobalHistory = false;
>>>>>>> release-1.6.0.a1
		this.ELEMENT.loadURI(aURL, null, null);
	},

	execCapture : function()
	{
<<<<<<< HEAD
		SB_trace(sbCaptureTask.STRING.getString("CAPTURE_START"));
=======
		SB_trace(sbCaptureTask.STRING.getString("SAVE_START"));
>>>>>>> release-1.6.0.a1
		document.getElementById("sbCapturePauseButton").disabled = true;
		sbCaptureTask.toggleSkipButton(false);
		var ret = null;
		var preset = gReferItem ? [gReferItem.id, SB_suggestName(sbCaptureTask.URL), gOption, gFile2URL, gDepths[sbCaptureTask.index]] : null;
		if ( gPreset ) preset = gPreset;
		if ( this.ELEMENT.contentDocument.body && sbCaptureTask.isDocument )
		{
			var metaElems = this.ELEMENT.contentDocument.getElementsByTagName("meta");
			for ( var i = 0; i < metaElems.length; i++ )
			{
				if ( metaElems[i].hasAttribute("http-equiv") && metaElems[i].hasAttribute("content") &&
				     metaElems[i].getAttribute("http-equiv").toLowerCase() == "refresh" && 
				     metaElems[i].getAttribute("content").match(/URL\=(.*)$/i) )
				{
<<<<<<< HEAD
					var newURL = sbCommonUtils.resolveURL(sbCaptureTask.URL, RegExp.$1);
=======
					var newURL = ScrapBookUtils.resolveURL(sbCaptureTask.URL, RegExp.$1);
>>>>>>> release-1.6.0.a1
					if ( newURL != sbCaptureTask.URL && sbCaptureTask.canRefresh )
					{
						gURLs[sbCaptureTask.index] = newURL;
						sbCaptureTask.canRefresh = false;
						this.ELEMENT.loadURI(newURL, null, null);
						return;
					}
				}
			}
<<<<<<< HEAD
			ret = sbContentSaver.captureWindow(this.ELEMENT.contentWindow, false, gShowDetail, gResName, gResIdx, preset, gContext, gTitle);
=======
			ret = sbContentSaver.captureWindow(this.ELEMENT.contentWindow, false, gShowDetail, gResName, gResIdx, preset, gContext);
>>>>>>> release-1.6.0.a1
		}
		else
		{
			var type = sbCaptureTask.contentType.match(/image/i) ? "image" : "file";
			ret = sbContentSaver.captureFile(sbCaptureTask.URL, gRefURL ? gRefURL : sbCaptureTask.URL, type, gShowDetail, gResName, gResIdx, preset, gContext);
		}
		if ( ret )
		{
			if ( gContext == "indepth" )
			{
				gURL2Name[unescape(sbCaptureTask.URL)] = ret[0];
				gFile2URL = ret[1];
			}
			else if ( gContext == "capture-again-deep" )
			{
				gFile2URL = ret[1];
<<<<<<< HEAD
				var contDir = sbCommonUtils.getContentDir(gPreset[0]);
=======
				var contDir = ScrapBookUtils.getContentDir(gPreset[0]);
>>>>>>> release-1.6.0.a1
				var txtFile = contDir.clone();
				txtFile.append("sb-file2url.txt");
				var txt = "";
				for ( var f in gFile2URL ) txt += f + "\t" + gFile2URL[f] + "\n";
<<<<<<< HEAD
				sbCommonUtils.writeFile(txtFile, txt, "UTF-8");
=======
				ScrapBookUtils.writeFile(txtFile, txt, "UTF-8");
>>>>>>> release-1.6.0.a1
			}
		}
		else
		{
			if ( gShowDetail ) window.close();
<<<<<<< HEAD
			SB_trace(sbCaptureTask.STRING.getString("CAPTURE_ABORT"));
=======
			SB_trace(sbCaptureTask.STRING.getString("SAVE_ABORT"));
>>>>>>> release-1.6.0.a1
			sbCaptureTask.fail("");
		}
	},

	QueryInterface : function(aIID)
	{
<<<<<<< HEAD
		if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
			aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
			aIID.equals(Components.interfaces.nsIXULBrowserWindow) ||
			aIID.equals(Components.interfaces.nsISupports))
=======
		if (aIID.equals(Ci.nsIWebProgressListener) ||
			aIID.equals(Ci.nsISupportsWeakReference) ||
			aIID.equals(Ci.nsIXULBrowserWindow) ||
			aIID.equals(Ci.nsISupports))
>>>>>>> release-1.6.0.a1
			return this;
		throw Components.results.NS_NOINTERFACE;
	},

	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
<<<<<<< HEAD
		if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START )
=======
		if ( aStateFlags & Ci.nsIWebProgressListener.STATE_START )
>>>>>>> release-1.6.0.a1
		{
			SB_trace(sbCaptureTask.STRING.getString("LOADING") + "... " + (++this.fileCount) + " " + (sbCaptureTask.URL ? sbCaptureTask.URL : this.ELEMENT.contentDocument.title));
		}
	},

	onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
	{
		if ( aCurTotalProgress != aMaxTotalProgress )
		{
			SB_trace(sbCaptureObserverCallback.getString("TRANSFER_DATA") + "... (" + aCurTotalProgress + " Bytes)");
		}
	},

	onStatusChange   : function() {},
	onLocationChange : function() {},
	onSecurityChange : function() {},

};




var sbCrossLinker = {

	get ELEMENT(){ return document.getElementById("sbCaptureBrowser"); },

	index    : -1,
	baseURL  : "",
	nameList : [],

	XML      : null,
	rootNode : null,
	nodeHash : {},

	invoke : function()
	{
<<<<<<< HEAD
		if ( !sbDataSource.data ) sbDataSource.init();
		sbDataSource.setProperty(sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + gReferItem.id), "type", "site");
		sbDataSource.flush();
=======
		ScrapBookData.setProperty(ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + gReferItem.id), "type", "site");
>>>>>>> release-1.6.0.a1
		sbInvisibleBrowser.refreshEvent(function(){ sbCrossLinker.exec(); });
		this.ELEMENT.docShell.allowImages = false;
		sbInvisibleBrowser.onStateChange = function(aWebProgress, aRequest, aStateFlags, aStatus)
		{
<<<<<<< HEAD
			if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START )
=======
			if ( aStateFlags & Ci.nsIWebProgressListener.STATE_START )
>>>>>>> release-1.6.0.a1
			{
				SB_trace(sbCaptureTask.STRING.getFormattedString("REBUILD_LINKS", [sbCrossLinker.index + 1, sbCrossLinker.nameList.length]) + "... "
					+ ++sbInvisibleBrowser.fileCount + " : " + sbCrossLinker.nameList[sbCrossLinker.index] + ".html");
			}
		};
<<<<<<< HEAD
		this.baseURL = sbCommonUtils.IO.newFileURI(sbCommonUtils.getContentDir(gReferItem.id)).spec;
=======
		this.baseURL = ScrapBookUtils.IO.newFileURI(ScrapBookUtils.getContentDir(gReferItem.id)).spec;
>>>>>>> release-1.6.0.a1
		this.nameList.push("index");
		for ( var url in gURL2Name )
		{
			this.nameList.push(gURL2Name[url]);
		}
		this.XML = document.implementation.createDocument("", "", null);
		this.rootNode = this.XML.createElement("site");
		this.start();
	},

	start : function()
	{
		if ( ++this.index < this.nameList.length )
		{
			sbInvisibleBrowser.fileCount = 0;
			this.ELEMENT.loadURI(this.baseURL + this.nameList[this.index] + ".html", null, null);
		}
		else
		{
			SB_trace(sbCaptureTask.STRING.getString("REBUILD_LINKS_COMPLETE"));
			this.flushXML();
			SB_fireNotification(gReferItem);
<<<<<<< HEAD
			//Fenster wird nur geschlossen, wenn alle ausgewaehlten Seiten heruntergeladen werden konnten
			if ( sbCaptureTask.failed == 0 )
			{
				sbCaptureTask.closeWindow();
			} else
			{
				document.getElementById("sbCaptureSkipButton").hidden = true;
				document.getElementById("sbCapturePauseButton").hidden = true;
				document.getElementById("sbCaptureCancelButton").hidden = true;
				document.getElementById("sbCaptureFinishButton").hidden = false;
			}
=======
			window.setTimeout(function(){ window.close(); }, 1000);
>>>>>>> release-1.6.0.a1
		}
	},

	exec : function()
	{
		if ( this.ELEMENT.currentURI.scheme != "file" )
		{
			return;
		}
		sbContentSaver.frameList = sbContentSaver.flattenFrames(this.ELEMENT.contentWindow);
		if ( !this.nodeHash[this.nameList[this.index]] )
		{
<<<<<<< HEAD
			//Fehlermeldung wurde über Abfrage abgefangen.
			//Allerdings kann der Abbruch an dieser Stelle auch erwünscht sein (Nachforschungen!)
			this.nodeHash[this.nameList[this.index]] = this.createNode(this.nameList[this.index], (gReferItem) ? gReferItem.title : "");
			this.nodeHash[this.nameList[this.index]].setAttribute("title", sbDataSource.sanitize(this.ELEMENT.contentTitle));
		}
		else
		{
			this.nodeHash[this.nameList[this.index]].setAttribute("title", sbDataSource.sanitize(this.ELEMENT.contentTitle));
=======
			this.nodeHash[this.nameList[this.index]] = this.createNode(this.nameList[this.index], gReferItem.title);
			this.nodeHash[this.nameList[this.index]].setAttribute("title", ScrapBookData.sanitize(this.ELEMENT.contentTitle));
		}
		else
		{
			this.nodeHash[this.nameList[this.index]].setAttribute("title", ScrapBookData.sanitize(this.ELEMENT.contentTitle));
>>>>>>> release-1.6.0.a1
		}
		for ( var f = 0; f < sbContentSaver.frameList.length; f++ )
		{
			var doc = sbContentSaver.frameList[f].document;
			if ( !doc.links ) continue;
			var shouldSave = false;
			var linkList = doc.links;
			for ( var i = 0; i < linkList.length; i++ )
			{
				var urlLR = SB_splitByAnchor(unescape(linkList[i].href));
				if ( gURL2Name[urlLR[0]] )
				{
					var name = gURL2Name[urlLR[0]];
					linkList[i].href = name + ".html" + urlLR[1];
					linkList[i].setAttribute("indepth", "true");
					if ( !this.nodeHash[name] )
					{
						var text = linkList[i].text ? linkList[i].text.replace(/\r|\n|\t/g, " ") : "";
						if ( text.replace(/\s/g, "") == "" ) text = "";
						this.nodeHash[name] = this.createNode(name, text);
						if ( !this.nodeHash[name] ) this.nodeHash[name] = name;
						this.nodeHash[this.nameList[this.index]].appendChild(this.nodeHash[name]);
					}
					shouldSave = true;
				}
			}
			if ( shouldSave )
			{
				var rootNode = doc.getElementsByTagName("html")[0];
				var src = "";
				src = sbContentSaver.surroundByTags(rootNode, rootNode.innerHTML);
				src = sbContentSaver.doctypeToString(doc.doctype) + src;
<<<<<<< HEAD
				var file = sbCommonUtils.getContentDir(gReferItem.id);
				file.append(sbCommonUtils.getFileName(doc.location.href));
				sbCommonUtils.writeFile(file, src, doc.characterSet);
=======
				var file = ScrapBookUtils.getContentDir(gReferItem.id);
				file.append(ScrapBookUtils.getFileName(doc.location.href));
				ScrapBookUtils.writeFile(file, src, doc.characterSet);
>>>>>>> release-1.6.0.a1
			}
		}
		this.forceReloading(gReferItem.id, this.nameList[this.index]);
		this.start();
	},

	createNode : function(aName, aText)
	{
<<<<<<< HEAD
		aText = sbCommonUtils.crop(aText, 100);
		//Fehlermeldung könnte über Abfrage abgefangen werden.
		//Allerdings kann der Abbruch an dieser Stelle auch erwünscht sein (Nachforschungen!)
		var node = this.XML.createElement("page");
		node.setAttribute("file", aName + ".html");
		node.setAttribute("text", sbDataSource.sanitize(aText));
=======
		aText = ScrapBookUtils.crop(aText, 100);
		var node = this.XML.createElement("page");
		node.setAttribute("file", aName + ".html");
		node.setAttribute("text", ScrapBookData.sanitize(aText));
>>>>>>> release-1.6.0.a1
		return node;
	},

	flushXML : function()
	{
		this.rootNode.appendChild(this.nodeHash["index"]);
		this.XML.appendChild(this.rootNode);
		var src = "";
		src += '<?xml version="1.0" encoding="UTF-8"?>\n';
		src += '<?xml-stylesheet href="../../sitemap.xsl" type="text/xsl" media="all"?>\n';
		src += (new XMLSerializer()).serializeToString(this.XML).replace(/></g, ">\n<");
		src += '\n';
<<<<<<< HEAD
		var xslFile = sbCommonUtils.getScrapBookDir().clone();
		xslFile.append("sitemap.xsl");
		if ( !xslFile.exists() ) sbCommonUtils.saveTemplateFile("chrome://scrapbook/skin/sitemap.xsl", xslFile);
		var contDir = sbCommonUtils.getContentDir(gReferItem.id);
		var xmlFile = contDir.clone();
		xmlFile.append("sitemap.xml");
		sbCommonUtils.writeFile(xmlFile, src, "UTF-8");
=======
		var xslFile = ScrapBookUtils.getScrapBookDir().clone();
		xslFile.append("sitemap.xsl");
		if ( !xslFile.exists() ) ScrapBookUtils.saveTemplateFile("chrome://scrapbook/skin/sitemap.xsl", xslFile);
		var contDir = ScrapBookUtils.getContentDir(gReferItem.id);
		var xmlFile = contDir.clone();
		xmlFile.append("sitemap.xml");
		ScrapBookUtils.writeFile(xmlFile, src, "UTF-8");
>>>>>>> release-1.6.0.a1
		var txt = "";
		var txtFile1 = contDir.clone();
		txtFile1.append("sb-file2url.txt");
		for ( var f in gFile2URL ) txt += f + "\t" + gFile2URL[f] + "\n";
<<<<<<< HEAD
		sbCommonUtils.writeFile(txtFile1, txt, "UTF-8");
=======
		ScrapBookUtils.writeFile(txtFile1, txt, "UTF-8");
>>>>>>> release-1.6.0.a1
		txt = "";
		var txtFile2 = contDir.clone();
		txtFile2.append("sb-url2name.txt");
		for ( var u in gURL2Name ) txt += u + "\t" + gURL2Name[u] + "\n";
<<<<<<< HEAD
		sbCommonUtils.writeFile(txtFile2, txt, "UTF-8");
=======
		ScrapBookUtils.writeFile(txtFile2, txt, "UTF-8");
>>>>>>> release-1.6.0.a1
	},

	forceReloading : function(aID, aName)
	{
		try {
<<<<<<< HEAD
			var win = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
=======
			var win = ScrapBookUtils.getBrowserWindow();
>>>>>>> release-1.6.0.a1
			var nodes = win.gBrowser.mTabContainer.childNodes;
			for ( var i = 0; i < nodes.length; i++ )
			{
				var uri = win.gBrowser.getBrowserForTab(nodes[i]).currentURI.spec;
				if ( uri.indexOf("/data/" + aID + "/" + aName + ".html") > 0 )
				{
					win.gBrowser.getBrowserForTab(nodes[i]).reload();
				}
			}
		} catch(ex) {
		}
	},

};




function sbHeaderSniffer(aURLSpec, aRefURLSpec)
{
	this.URLSpec    = aURLSpec;
	this.refURLSpec = aRefURLSpec;
}


sbHeaderSniffer.prototype = {

<<<<<<< HEAD
	_URL     : Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL),
=======
	_URL     : Cc['@mozilla.org/network/standard-url;1'].createInstance(Ci.nsIURL),
>>>>>>> release-1.6.0.a1
	_channel : null,
	_headers : null,

	httpHead : function()
	{
		this._channel = null;
		this._headers = {};
		try {
			this._URL.spec = this.URLSpec;
<<<<<<< HEAD
			this._channel = sbCommonUtils.IO.newChannelFromURI(this._URL).QueryInterface(Components.interfaces.nsIHttpChannel);
			this._channel.loadFlags = this._channel.LOAD_BYPASS_CACHE;
			this._channel.setRequestHeader("User-Agent", navigator.userAgent, false);
			if ( this.refURLSpec ) this._channel.setRequestHeader("Referer", this.refURLSpec, false);
=======
			this._channel = ScrapBookUtils.IO.newChannelFromURI(this._URL).QueryInterface(Ci.nsIHttpChannel);
			this._channel.loadFlags = this._channel.LOAD_BYPASS_CACHE;
			this._channel.setRequestHeader("User-Agent", navigator.userAgent, false);
			if (this.refURLSpec && this.refURLSpec.indexOf("http") == 0)
				this._channel.setRequestHeader("Referer", this.refURLSpec, false);
>>>>>>> release-1.6.0.a1
		} catch(ex) {
			this.onHttpError("Invalid URL");
		}
		try {
			this._channel.requestMethod = "HEAD";
			this._channel.asyncOpen(this, this);
		} catch(ex) {
			this.onHttpError(ex);
		}
	},

	getHeader : function(aHeader)
	{
	 	try { return this._channel.getResponseHeader(aHeader); } catch(ex) { return ""; }
	},

	getStatus : function()
	{
		try { return this._channel.responseStatus; } catch(ex) { return ""; }
	},

	visitHeader : function(aHeader, aValue)
	{
		this._headers[aHeader] = aValue;
	},

	onDataAvailable : function(aRequest, aContext, aInputStream, aOffset, aCount) {},
	onStartRequest  : function(aRequest, aContext) {},
	onStopRequest   : function(aRequest, aContext, aStatus) { this.onHttpSuccess(); },

	onHttpSuccess : function()
	{
		sbCaptureTask.contentType = this.getHeader("Content-Type");
		var httpStatus = this.getStatus();
		SB_trace(sbCaptureTask.STRING.getString("CONNECT_SUCCESS") + " (Content-Type: " + sbCaptureTask.contentType + ")");
		switch ( httpStatus )
		{
<<<<<<< HEAD
			case 404 : sbCaptureTask.failed++;sbCaptureTask.fail(sbCaptureTask.STRING.getString("HTTP_STATUS_404") + " (404 Not Found)"); return;
			case 403 : sbCaptureTask.failed++;sbCaptureTask.fail(sbCaptureTask.STRING.getString("HTTP_STATUS_403") + " (403 Forbidden)"); return;
			case 500 : sbCaptureTask.failed++;sbCaptureTask.fail("500 Internal Server Error"); return;
=======
			case 404 : sbCaptureTask.fail(sbCaptureTask.STRING.getString("HTTP_STATUS_404") + " (404 Not Found)"); return;
			case 403 : sbCaptureTask.fail(sbCaptureTask.STRING.getString("HTTP_STATUS_403") + " (403 Forbidden)"); return;
			case 500 : sbCaptureTask.fail("500 Internal Server Error"); return;
>>>>>>> release-1.6.0.a1
		}
		var redirectURL = this.getHeader("Location");
		if ( redirectURL )
		{
			if ( redirectURL.indexOf("http") != 0 ) redirectURL = this._URL.resolve(redirectURL);
			sbCaptureTask.start(redirectURL);
			return;
		}
		if ( !sbCaptureTask.contentType )
		{
			sbCaptureTask.contentType = "text/html";
		}
		var func = function(val) { return sbCaptureTask.contentType.indexOf(val) >= 0; };
		sbCaptureTask.isDocument = ["text/plain", "html", "xml"].some(func);
		if (sbCaptureTask.isDocument) {
			sbInvisibleBrowser.load(this.URLSpec);
		}
		else {
			if ( gContext == "indepth" ) {
				sbCaptureTask.next(true);
			} else {
				sbInvisibleBrowser.execCapture();
			}
		}
	},

	onHttpError : function(aErrorMsg)
	{
<<<<<<< HEAD
		//Ermitteln, wann der Wert this.failed erhoeht werden muss
		sbCaptureTask.failed++;
=======
>>>>>>> release-1.6.0.a1
		sbCaptureTask.fail(sbCaptureTask.STRING.getString("CONNECT_FAILURE") + " (" + aErrorMsg + ")");
	},

};




sbCaptureObserverCallback.getString = function(aBundleName)
{
	return document.getElementById("sbOverlayString").getString(aBundleName);
},

sbCaptureObserverCallback.trace = function(aText)
{
	SB_trace(aText);
};

sbCaptureObserverCallback.onCaptureComplete = function(aItem)
{
	if ( gContext != "indepth" && gURLs.length == 1 ) SB_fireNotification(aItem);
	if ( gContext == "capture-again" || gContext == "capture-again-deep" )
	{
		sbCrossLinker.forceReloading(gPreset[0], gPreset[1]);
<<<<<<< HEAD
		sbDataSource.init();
		var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + gPreset[0]);
		sbDataSource.setProperty(res, "chars", aItem.chars);
		if ( gPreset[5] ) sbDataSource.setProperty(res, "type", "");
=======
		var res = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + gPreset[0]);
		ScrapBookData.setProperty(res, "chars", aItem.chars);
		if ( gPreset[5] ) ScrapBookData.setProperty(res, "type", "");
>>>>>>> release-1.6.0.a1
	}
	sbCaptureTask.succeed();
};


