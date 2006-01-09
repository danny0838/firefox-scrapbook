
var SBstring;
var SBstatus;
var SBtextbox;



function SB_initMultiple()
{
	SBstring  = document.getElementById("ScrapBookString");
	SBstatus  = document.getElementById("ScrapBookStatus");
	SBtextbox = document.getElementById("ScrapBookMultipleTextbox");
	document.documentElement.getButton("accept").label = SBstring.getString("CAPTURE_OK_BUTTON");
	document.documentElement.getButton("accept").accesskey = "C";
	SBtextbox.focus();
	setTimeout(SB_pasteClipboardURL, 0);
	setTimeout(SB_initFolderWithDelay, 100);
}


function SB_acceptMultiple()
{
	var URLs = [];
	var lines = SBtextbox.value.split("\n");
	for ( var i = 0; i < lines.length; i++ )
	{
		if ( lines[i].length < 3 ) continue;
		URLs.push(lines[i]);
	}
	if ( URLs.length < 1 ) return;
	var resName = SBarguments.resName ? SBarguments.resName : "urn:scrapbook:root";
	if ( !SB_ensureWindowOpener() ) return;
	window.opener.openDialog(
		"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
		URLs, "", false, resName, 0, null, null ,null
	);
}


function SB_ensureWindowOpener()
{
	var flag = false;
	try {
		if ( window.opener.location.href != "chrome://browser/content/browser.xul" ) flag = true;
	} catch(ex) {
		flag = true;
	}
	if ( flag ) { alert("ScrapBook ERROR: can't specify window.opener"); return false; }
	return true;
}


function SB_addURL(aURL)
{
	if ( !aURL.match(/^(http|https|ftp|file):\/\//) ) return;
	SBtextbox.value += aURL + "\n";
}




function SB_clearURL()
{
	SBtextbox.value = "";
}


function SB_pasteClipboardURL()
{
	try {
		var myClip  = Components.classes['@mozilla.org/widget/clipboard;1'].createInstance(Components.interfaces.nsIClipboard);
		var myTrans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
		myTrans.addDataFlavor("text/unicode");
		myClip.getData(myTrans, myClip.kGlobalClipboard);
		var str = new Object();
		var len = new Object();
		myTrans.getTransferData("text/unicode", str, len);
		if ( str ) {
			str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
			SB_addURL(str.toString());
		}
	} catch(ex) {
	}
}


function SB_detectURLOfTabs()
{
	SB_clearURL();
	var nodes = window.opener.gBrowser.mTabContainer.childNodes;
	for ( var i = 0; i < nodes.length; i++ )
	{
		SB_addURL(window.opener.gBrowser.getBrowserForTab(nodes[i]).contentDocument.location.href);
	}
}


function SB_detectURLInPage()
{
	SB_clearURL();
	var node = window.opener.top._content.document.body;
	traceTree : while ( true )
	{
		if ( node.nodeName.toUpperCase() == "A" || node.nodeName.toUpperCase() == "AREA" )
		{
			if ( node.hasAttribute("href") ) { SB_addURL(node.href); dump(node.href + "\n"); }
		}
		if ( node.hasChildNodes() ) node = node.firstChild;
		else
		{
			while ( !node.nextSibling ) { node = node.parentNode; if ( !node ) break traceTree; }
			node = node.nextSibling;
		}
	}
}


function SB_detectURLInSelection()
{
	SB_clearURL();
	var sel = window.opener.top.sbPageEditor.getSelection();
	if ( !sel ) return;
	var selRange  = sel.getRangeAt(0);
	var node = selRange.startContainer;
	if ( node.nodeName == "#text" ) node = node.parentNode;
	var nodeRange = window.opener.top._content.document.createRange();
	traceTree : while ( true )
	{
		nodeRange.selectNode(node);
		if ( nodeRange.compareBoundaryPoints(Range.START_TO_END, selRange) > -1 )
		{
			if ( nodeRange.compareBoundaryPoints(Range.END_TO_START, selRange) > 0 ) break;
			else if ( (node.nodeName.toUpperCase() == "A" || node.nodeName.toUpperCase() == "AREA") )
			{
				if ( node.hasAttribute("href") ) SB_addURL(node.href);
			}
		}
		if ( node.hasChildNodes() ) node = node.firstChild;
		else
		{
			while ( !node.nextSibling ) { node = node.parentNode; if ( !node ) break traceTree; }
			node = node.nextSibling;
		}
	}
}


var sbURLDetectorF = {

	type   : "",
	index  : 0,
	lines  : [],
	result : "",
	weboxBaseURL : "",

	run : function(aType)
	{
		this.type = aType;
		this.index = 0;
		this.lines = [];
		this.result = "";
		this.weboxBaseURL = "";
		var theFile ;
		if ( this.type == "W" ) {
			var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
			FP.init(window, "Select default.html of WeBoX.", FP.modeOpen);
			FP.appendFilters(FP.filterHTML);
			var answer = FP.show();
			if ( answer == FP.returnOK ) theFile = FP.file;
			else return;
			this.weboxBaseURL = theFile.parent.path + '\\Data\\';
		} else {
			theFile = sbCommonUtils.DIR.get("ProfD", Components.interfaces.nsIFile);
			theFile.append("bookmarks.html");
			if ( !theFile.exists() ) return;
		}
		SB_clearURL();
		this.lines = sbCommonUtils.readFile(theFile).split("\n");
		this.inspect();
	},

	inspect : function()
	{
		SBstatus.value = SBstring.getString("SCANNING") + "... (" + this.index + "/" + (this.lines.length-1) + ")";
		this.result += "\n";
		if ( this.type == "W" ) {
			if ( this.lines[this.index].match(/ LOCALFILE\=\"([^\"]+)\" /) )
				this.result += sbCommonUtils.convertFilePathToURL(this.weboxBaseURL + RegExp.$1);
		} else {
			if ( this.lines[this.index].match(/ HREF\=\"([^\"]+)\" /) )
				this.result += RegExp.$1;
		}
		if ( ++this.index < this.lines.length ) {
			setTimeout(function(){ sbURLDetectorF.inspect(); }, 0);
		} else {
			this.result = this.result.replace(/\n\n+/g, "\n\n");
			this.result = this.result.replace(/^\n+/, "");
			SBtextbox.value = this.result;
			SBstatus.value = "";
		}
	},

};


var sbURLDetectorD = {

	index : 0,

	run : function()
	{
		this.index = 0;
		var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		FP.init(window, "", FP.modeGetFolder);
		var answer = FP.show();
		if ( answer == FP.returnOK )
		{
			SB_clearURL();
			this.inspectDirectory(FP.file, 0);
		}
	},

	inspectDirectory : function(aDir, curIdx)
	{
		SBstatus.value = SBstring.getString("SCANNING") + " (" + curIdx + "/" + this.index + ")... " + aDir.path;
		var aEntries = aDir.directoryEntries;
		while ( aEntries.hasMoreElements() )
		{
			var aEntry = aEntries.getNext().QueryInterface(Components.interfaces.nsILocalFile);
			if ( aEntry.isDirectory() ) {
				this.inspectDirectoryWithDelay(aEntry, ++this.index);
			} else {
				if ( aEntry.leafName.match(/\.(html|htm)$/i) ) SB_addURL(sbCommonUtils.convertFilePathToURL(aEntry.path));
			}
		}
		if ( curIdx == this.index ) SBstatus.value = "";
	},

	inspectDirectoryWithDelay : function(aDir, aIndex)
	{
		setTimeout(function(){ sbURLDetectorD.inspectDirectory(aDir, aIndex); }, 200 * aIndex);
	},

};


