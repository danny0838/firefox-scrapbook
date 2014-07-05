
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
var gCharset	= "";
var gTitles		= [];
var gTitle;
var gTimeout	= null;




function SB_trace(aMessage)
{
	document.getElementById("sbCaptureTextbox").value = aMessage;
}

/**
 * Receive data from other script opening capture.xul
 *
 * data:
 *   urls:        array    strings, each is a full URL to capture 
 *   refUrl:      string   reference URL, mainly to resolve relative links
 *   showDetail:  bool     show detail or not
 *   resName:     string   the resource name to add
 *   resIdx:      string   the index to insert resource
 *   referItem:   string   (deep-capture, re-capture) the refer item,
                           determine where to save file and to set resource property
 *   option:      object   capture options, such as:
 *                           images:  media:  styles:  script:
 *                           rewriteStyles:  forceUtf8:  textAsHtml: 
 *                           dlimg:  dlsnd:  dlmov:  dlarc:  custom:
 *                           inDepth:  isPartial:
 *   file2Url:    array    the file2URL data in saver.js from last capture,
 *                         will then pass to saver.js for next capture
 *   preset:      array    (re-capture) the preset data,
 *                         will pass to saver.js for each capture,
 *                         generally this will overwrite data
 *                           [0]   string   id of resource
 *                           [1]   string   file name to save
 *                           [2]   string   overwrites data.option if set
 *                           [3]   array    overwrites data.file2Url if set
 *                           [4]   int      limits depth of capture
 *                           [5]   bool     true if is a bookmark, will reset resource type to "" (page)
 *   charset:     string   force using charset to read html, autodetect if not set                  
 *   timeout:     string   (multi-capture, deep-capture) countdown seconds before next capture
 *   titles:      array    (multi-capture) strings, overwrite the resource title,
 *                         each entry corresponds with data.urls
 *   context      string   the capture context, determines the behavior
 *                           "bookmark": (seems unused, obsolete?)
 *                           "capture": capture the browser window (not used here)
 *                           "link": load a page to capture
 *                           "indepth": capture a page and pages linked by
 *                           "capture-again": capture a page and overwrite the current resource,
 *                                            prompts a new capture.js in indepth if deep capture
 *                           "capture-again-deep": capture a page other than index.html
 *                                                 do not allow deep capture
 */
function SB_initCapture()
{
	var data = window.arguments[0];
	var myURLs  = data.urls;
	gRefURL     = data.refUrl;
	gShowDetail = data.showDetail;
	gResName    = data.resName;
	gResIdx     = data.resIdx;
	gReferItem  = data.referItem;
	gOption     = data.option;
	gFile2URL   = data.file2Url;
	gPreset     = data.preset;
	gCharset	= data.charset;
	gTimeout	= data.timeout;
	gTitles		= data.titles;
	gContext    = data.context;

	if ( !gTimeout ) gTimeout = 0;
	if ( gContext == "indepth" )
	{
		gURL2Name[gReferItem.source] = "index";
	}
	else if ( gContext == "capture-again-deep" )
	{
		var contDir = sbCommonUtils.getContentDir(gPreset[0]);
		// read sb-file2url.txt => gFile2URL for later usage
		var file = contDir.clone();
		file.append("sb-file2url.txt");
		if ( !file.exists() ) { sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "ERR_NO_FILE2URL")); window.close(); }
		var lines = sbCommonUtils.readFile(file).split("\n");
		for ( var i = 0; i < lines.length; i++ )
		{
			var arr = lines[i].split("\t");
			if ( arr.length == 2 ) gFile2URL[arr[0]] = arr[1];
		}
		// read sb-url2name.txt => gURL2Name and search for source URL of the current page
		file = contDir.clone();
		file.append("sb-url2name.txt");
		if ( !file.exists() ) { sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "ERR_NO_URL2NAME")); window.close(); }
		lines = sbCommonUtils.readFile(file).split("\n");
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
		if ( !myURLs[0] ) { sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "ERR_NO_SOURCE_URL", [gPreset[1] + ".html."])); window.close(); }
	}
	if ( !gOption ) gOption = {};
	if ( !("script" in gOption ) ) gOption["script"] = false;
	if ( !("images" in gOption ) ) gOption["images"] = true;
	sbInvisibleBrowser.init();
	sbCaptureTask.init(myURLs);
	//Es wird gar nichts gemacht. Der Benutzer muss den Download selbst starten!
	sbCaptureTask.seconds = -1;
	sbCaptureTask.toggleStartPause(false);
}


function SB_splitByAnchor(aURL)
{
	var pos = 0;
	return ( (pos = aURL.indexOf("#")) < 0 ) ? [aURL, ""] : [aURL.substring(0, pos), aURL.substring(pos, aURL.length)];
}


function SB_suggestName(aURL)
{
	var tmpName = sbCommonUtils.splitFileName(sbCommonUtils.validateFileName(sbCommonUtils.getFileName(decodeURI(aURL))))[0].toLowerCase();
	if ( !tmpName || tmpName == "index" ) tmpName = "default";
	var name = tmpName, seq = 0;
	while ( gFile2URL[name+".html"] ) name = tmpName + "_" + sbCommonUtils.pad(++seq, 3);
	return name;
}


function SB_fireNotification(aItem)
{
	var win = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
	win.sbCaptureObserverCallback.onCaptureComplete(aItem);
}




var sbCaptureTask = {

	get INTERVAL() { return gTimeout; },
	get TREE()     { return document.getElementById("sbpURLList"); },
	get URL()      { return gURLs[this.index]; },

	index       : 0,
	contentType : "",
	isDocument  : false,
	sniffer     : null,
	seconds     : 3,
	timerID     : 0,
	forceExit   : 0,
	failed      : 0,

	init : function(myURLs)
	{
		if ( gContext != "indepth" && myURLs.length == 1 )
		{
			document.getElementById("sbCaptureSkipButton").hidden = true;
		}
		if (!gTitles) gTitles = [];
		for ( var i = 0; i < myURLs.length; i++ ) this.add(myURLs[i], 1, gTitles[i]);
	},

	add : function(aURL, aDepth, aTitle)
	{
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
					aTcell2.setAttribute("label", aTitle || "");
					aTrow.appendChild(aTcell2);
					var aTitem = document.createElement("treeitem");
					aTitem.appendChild(aTrow);
					aTchild.appendChild(aTitem);
				}
			}
		} catch(aEx) { alert("add\n---\n"+aEx); }
	},

	start : function(aOverriddenURL)
	{
		this.seconds = -1;
		this.toggleStartPause(true);
		this.toggleSkipButton(true);
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].setAttribute("properties", "selected");
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[0].setAttribute("properties", "disabled");
		var checkstate = this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[0].getAttribute("value");
		if ( checkstate.match("false") )
		{
			document.getElementById("sbpCaptureProgress").value = (this.index+1)+" \/ "+gURLs.length;
			this.TREE.childNodes[1].childNodes[this.index].childNodes[0].setAttribute("properties", "finished");
			this.next(true);
			return;
		}
		this.contentType = "";
		this.isDocument = true;
		var url = aOverriddenURL || gURLs[this.index];
		if ( gTitles ) gTitle = gTitles[this.index];
		SB_trace(sbCommonUtils.lang("capture", "CONNECT", [url]));
		if ( url.indexOf("file://") == 0 ) {
			sbInvisibleBrowser.load(url);
		} else {
			this.sniffer = new sbHeaderSniffer(url, gRefURL);
			this.sniffer.httpHead();
		}
	},

	succeed : function()
	{
		document.getElementById("sbpCaptureProgress").value = (this.index+1)+" \/ "+gURLs.length;
		var treecell = document.createElement("treecell");
		treecell.setAttribute("label", "OK");
		treecell.setAttribute("properties", "success");
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].appendChild(treecell);
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].setAttribute("properties", "finished");
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[2].setAttribute("label", gTitles[this.index] || "");
		this.next(false);
	},

	fail : function(aErrorMsg)
	{
		document.getElementById("sbpCaptureProgress").value = (this.index+1)+" \/ "+gURLs.length;
		if ( aErrorMsg ) SB_trace(aErrorMsg);
		var treecell = document.createElement("treecell");
		treecell.setAttribute("label", this.sniffer.getStatus());
		treecell.setAttribute("properties", "failed");
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].appendChild(treecell);
		this.TREE.childNodes[1].childNodes[this.index].childNodes[0].setAttribute("properties", "finished");
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
		if ( this.sniffer ) this.sniffer.onHttpSuccess = function(){};
		sbInvisibleBrowser.ELEMENT.stop();
		if ( ++this.index >= gURLs.length ) {
			this.finalize();
		} else {
			if ( quickly || gURLs[this.index].indexOf("file://") == 0 ) {
				window.setTimeout(function(){ sbCaptureTask.start(); }, 0);
			} else {
				this.seconds = this.INTERVAL;
				if ( this.seconds > 0 )
				{
					sbCaptureTask.countDown();
				} else
				{
					sbCaptureTask.start();
				}
			}
		}
	},

	countDown : function()
	{
		SB_trace(sbCommonUtils.lang("capture", "WAITING", [sbCaptureTask.seconds]));
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
			//Fenster wird nur geschlossen, wenn alle ausgewaehlten Seiten heruntergeladen werden konnten
			if ( this.failed == 0 ) this.closeWindow();
		}
	},

	closeWindow : function()
	{
		window.setTimeout(function(){ window.close(); }, 1000);
	},

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
				alert("This shouldn't happen\n---\n"+aEx);
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

var sbInvisibleBrowser = {

	get ELEMENT() { return document.getElementById("sbCaptureBrowser"); },

	fileCount : 0,
	onload    : null,

	init : function()
	{
		try {
			this.ELEMENT.webProgress.removeProgressListener(this, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
		} catch(ex) {
		}
		this.ELEMENT.webProgress.addProgressListener(this, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
		this.loading = false;
		this.onload = function(){
			// onload may be fired many times when a document is loaded
			// (loading of a frame may fire)
			// we need this check to allow only the desired url and only fire once...
			if (sbInvisibleBrowser.ELEMENT.currentURI.spec !== sbInvisibleBrowser.loading) return;
			sbInvisibleBrowser.loading = false;
			sbInvisibleBrowser.execCapture();
		};
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
		// older version of Firefox gets error on setting charset
		try {
			if (gCharset) this.ELEMENT.docShell.charset = gCharset;
		}
		catch (ex) {
			alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_CHANGE_CHARSET"));
		}
		// nsIDocShellHistory is deprecated in newer version of Firefox
		// nsIDocShell in the old version doesn't work
		if ( Components.interfaces.nsIDocShellHistory ) {
			this.ELEMENT.docShell.QueryInterface(Components.interfaces.nsIDocShellHistory).useGlobalHistory = false;
		}
		else if ( Components.interfaces.nsIDocShell ) {
			this.ELEMENT.docShell.QueryInterface(Components.interfaces.nsIDocShell).useGlobalHistory = false;
		}
		else {
			this.ELEMENT.docShell.useGlobalHistory = false;
		}
		this.loading = aURL;
		this.ELEMENT.loadURI(aURL, null, null);
	},

	execCapture : function()
	{
		SB_trace(sbCommonUtils.lang("capture", "CAPTURE_START"));
		document.getElementById("sbCapturePauseButton").disabled = true;
		sbCaptureTask.toggleSkipButton(false);
		var ret = null;
		var preset = gReferItem ? [gReferItem.id, SB_suggestName(this.ELEMENT.currentURI.spec), gOption, gFile2URL, gDepths[sbCaptureTask.index]] : null;
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
					var newURL = sbCommonUtils.resolveURL(sbCaptureTask.URL, RegExp.$1);
					if ( newURL != sbCaptureTask.URL )
					{
						sbCaptureTask.start(newURL);
						return;
					}
				}
			}
			ret = sbContentSaver.captureWindow(this.ELEMENT.contentWindow, false, gShowDetail, gResName, gResIdx, preset, gContext, gTitle);
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
				gURL2Name[sbCaptureTask.URL] = ret[0];
				gFile2URL = ret[1];
			}
			else if ( gContext == "capture-again-deep" )
			{
				gFile2URL = ret[1];
				var contDir = sbCommonUtils.getContentDir(gPreset[0]);
				var txtFile = contDir.clone();
				txtFile.append("sb-file2url.txt");
				var txt = "";
				for ( var f in gFile2URL ) txt += f + "\t" + gFile2URL[f] + "\n";
				sbCommonUtils.writeFile(txtFile, txt, "UTF-8");
			}
			gTitles[sbCaptureTask.index] = ret[2];
		}
		else
		{
			if ( gShowDetail ) window.close();
			SB_trace(sbCommonUtils.lang("capture", "CAPTURE_ABORT"));
			sbCaptureTask.fail("");
		}
	},

	QueryInterface : function(aIID)
	{
		if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
			aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
			aIID.equals(Components.interfaces.nsIXULBrowserWindow) ||
			aIID.equals(Components.interfaces.nsISupports))
			return this;
		throw Components.results.NS_NOINTERFACE;
	},

	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
		if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START )
		{
			SB_trace(sbCommonUtils.lang("capture", "LOADING", [++this.fileCount, (sbCaptureTask.URL ? sbCaptureTask.URL : this.ELEMENT.contentDocument.title)]));
		}
	},

	onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
	{
		if ( aCurTotalProgress != aMaxTotalProgress )
		{
			SB_trace(sbCommonUtils.lang("overlay", "TRANSFER_DATA", [aCurTotalProgress]));
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
		sbDataSource.setProperty(sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + gReferItem.id), "type", "site");
		sbInvisibleBrowser.refreshEvent(function(){ sbCrossLinker.exec(); });
		this.ELEMENT.docShell.allowImages = false;
		sbInvisibleBrowser.onStateChange = function(aWebProgress, aRequest, aStateFlags, aStatus)
		{
			if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START )
			{
				SB_trace(sbCommonUtils.lang("capture", "REBUILD_LINKS", 
					[sbCrossLinker.index + 1, sbCrossLinker.nameList.length, ++sbInvisibleBrowser.fileCount, sbCrossLinker.nameList[sbCrossLinker.index] + ".html"]));
			}
		};
		this.baseURL = sbCommonUtils.IO.newFileURI(sbCommonUtils.getContentDir(gReferItem.id)).spec;
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
			var url = this.baseURL + encodeURI(this.nameList[this.index]) + ".html";
			sbInvisibleBrowser.loading = url;
			this.ELEMENT.loadURI(url, null, null);
		}
		else
		{
			SB_trace(sbCommonUtils.lang("capture", "REBUILD_LINKS_COMPLETE"));
			this.flushXML();
			SB_fireNotification(gReferItem);
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
		}
	},

	exec : function()
	{
		// onload may be fired many times when a document is loaded
		// we need this check to prevent
		if (this.ELEMENT.currentURI.spec !== sbInvisibleBrowser.loading) return;
		sbInvisibleBrowser.loading = false;
		if ( this.ELEMENT.currentURI.scheme != "file" ) {
			return;
		}
		if ( !this.nodeHash[this.nameList[this.index]] ) {
			// Error message could be intercepted using query. 
			// However, the demolition at this point may also be desirable (Research!)
			this.nodeHash[this.nameList[this.index]] = this.createNode(this.nameList[this.index], (gReferItem) ? gReferItem.title : "");
		}
		this.nodeHash[this.nameList[this.index]].setAttribute("title", sbDataSource.sanitize(this.ELEMENT.contentTitle));
		sbCommonUtils.flattenFrames(this.ELEMENT.contentWindow).forEach(function(win) {
			var doc = win.document;
			var linkList = doc.links;
			if ( !linkList ) return;
			var shouldSave = false;
			for ( var i = 0; i < linkList.length; i++ ) {
				var urlLR = SB_splitByAnchor(linkList[i].href);
				if ( gURL2Name[urlLR[0]] ) {
					var name = gURL2Name[urlLR[0]];
					linkList[i].href = name + ".html" + urlLR[1];
					linkList[i].setAttribute("data-sb-indepth", "true");
					if ( !this.nodeHash[name] ) {
						var text = linkList[i].text ? linkList[i].text.replace(/\r|\n|\t/g, " ") : "";
						if ( text.replace(/\s/g, "") == "" ) text = "";
						this.nodeHash[name] = this.createNode(name, text);
						if ( !this.nodeHash[name] ) this.nodeHash[name] = name;
						this.nodeHash[this.nameList[this.index]].appendChild(this.nodeHash[name]);
					}
					shouldSave = true;
				}
			}
			if ( shouldSave ) {
				var rootNode = doc.getElementsByTagName("html")[0];
				var src = sbContentSaver.doctypeToString(doc.doctype) + sbCommonUtils.getOuterHTML(rootNode, true);
				var file = sbCommonUtils.getContentDir(gReferItem.id);
				file.append(sbCommonUtils.getFileName(doc.location.href));
				sbCommonUtils.writeFile(file, src, doc.characterSet);
			}
		}, this);
		this.forceReloading(gReferItem.id, this.nameList[this.index]);
		this.start();
	},

	createNode : function(aName, aText)
	{
		aText = sbCommonUtils.crop(aText, 100);
		//Fehlermeldung könnte über Abfrage abgefangen werden.
		//Allerdings kann der Abbruch an dieser Stelle auch erwünscht sein (Nachforschungen!)
		var node = this.XML.createElement("page");
		node.setAttribute("file", aName + ".html");
		node.setAttribute("text", sbDataSource.sanitize(aText));
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
		var xslFile = sbCommonUtils.getScrapBookDir().clone();
		xslFile.append("sitemap.xsl");
		if ( !xslFile.exists() ) sbCommonUtils.saveTemplateFile("chrome://scrapbook/skin/sitemap.xsl", xslFile);
		var contDir = sbCommonUtils.getContentDir(gReferItem.id);
		var xmlFile = contDir.clone();
		xmlFile.append("sitemap.xml");
		sbCommonUtils.writeFile(xmlFile, src, "UTF-8");
		var txt = "";
		var txtFile1 = contDir.clone();
		txtFile1.append("sb-file2url.txt");
		for ( var f in gFile2URL ) txt += f + "\t" + gFile2URL[f] + "\n";
		sbCommonUtils.writeFile(txtFile1, txt, "UTF-8");
		txt = "";
		var txtFile2 = contDir.clone();
		txtFile2.append("sb-url2name.txt");
		for ( var u in gURL2Name ) txt += u + "\t" + gURL2Name[u] + "\n";
		sbCommonUtils.writeFile(txtFile2, txt, "UTF-8");
	},

	forceReloading : function(aID, aName)
	{
		var file = sbCommonUtils.getContentDir(aID);
		file.append(aName + ".html");
		var url = sbCommonUtils.convertFilePathToURL(file.path);
		this.forceReloadingURL(url);
	},

	forceReloadingURL : function(aURL)
	{
		try {
			var win = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
			var nodes = win.gBrowser.mTabContainer.childNodes;
			for ( var i = 0; i < nodes.length; i++ ) {
				var uri = win.gBrowser.getBrowserForTab(nodes[i]).currentURI.spec;
				uri = SB_splitByAnchor(uri)[0];
				if ( uri == aURL ) {
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

	_URL     : Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL),
	_channel : null,
	_headers : null,

	httpHead : function()
	{
		this._channel = null;
		this._headers = {};
		try {
			this._URL.spec = this.URLSpec;
			this._channel = sbCommonUtils.IO.newChannelFromURI(this._URL).QueryInterface(Components.interfaces.nsIHttpChannel);
			this._channel.loadFlags = this._channel.LOAD_BYPASS_CACHE;
			this._channel.setRequestHeader("User-Agent", navigator.userAgent, false);
			if ( this.refURLSpec ) this._channel.setRequestHeader("Referer", this.refURLSpec, false);
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
		SB_trace(sbCommonUtils.lang("capture", "CONNECT_SUCCESS", [sbCaptureTask.contentType]));
		switch ( httpStatus )
		{
			case 404 : sbCaptureTask.failed++;sbCaptureTask.fail(sbCommonUtils.lang("capture", "HTTP_STATUS_404")); return;
			case 403 : sbCaptureTask.failed++;sbCaptureTask.fail(sbCommonUtils.lang("capture", "HTTP_STATUS_403")); return;
			case 500 : sbCaptureTask.failed++;sbCaptureTask.fail(sbCommonUtils.lang("capture", "HTTP_STATUS_500")); return;
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
		//Ermitteln, wann der Wert this.failed erhoeht werden muss
		sbCaptureTask.failed++;
		sbCaptureTask.fail(sbCommonUtils.lang("capture", "CONNECT_FAILURE", [aErrorMsg]));
	},

};




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
		var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + gPreset[0]);
		sbDataSource.setProperty(res, "chars", aItem.chars);
		if ( gPreset[5] ) sbDataSource.setProperty(res, "type", "");
	}
	else if ( gContext == "internalize" )
	{
		sbCrossLinker.forceReloadingURL(sbCommonUtils.convertFilePathToURL(gOption.internalize.path));
	}
	sbCaptureTask.succeed();
};


