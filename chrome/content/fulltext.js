/**************************************************
// fulltext.js
// Implementation file for fulltext.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBstatus;
const NS_XUL = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';

var gCacheFile;
var gQuery  = { q : "", re : false, cs : false };
var gRegExp = [];
var gHit = 0;
const gMax = 100;




function SB_initFT(flag)
{
	SBstatus  = document.getElementById("ScrapBookStatus");
	gCacheFile = SBcommon.getScrapBookDir().clone();
	gCacheFile.append("cache.rdf");
	switch ( flag )
	{
		case 'SEARCH' : SB_execSearch(); break;
		case 'CACHE'  : setTimeout(function() { SBcache.build(); }, 0); break;
	}
}


function SB_execSearch()
{
	var QS = document.location.href.match(/result\.xul\?(.*)$/);
	QS = RegExp.$1;
	var QA = QS.split("&");
	for ( var i = 0; i < QA.length; i++ )
	{
		gQuery[QA[i].split("=")[0]] = QA[i].split("=")[1];
	}
	const TTSU = Components.classes['@mozilla.org/intl/texttosuburi;1'].getService(Components.interfaces.nsITextToSubURI);
	gQuery['q'] = TTSU.UnEscapeAndConvert("UTF-8", gQuery['q']);

	var shouldBuild = false;
	if ( !gCacheFile.exists() )
	{
		shouldBuild = true;
	}
	else
	{
		var curTime = new Date().getTime();
		var modTime = gCacheFile.lastModifiedTime;
		if ( modTime && (curTime - modTime) > 1000 * 60 * 60 * 24 * 5 ) shouldBuild = true;
	}
	if ( shouldBuild ) window.openDialog('chrome://scrapbook/content/cache.xul','','chrome,centerscreen,modal');

	SBRDF.init();
	SCRDF.init();

	gRegExp[0] = ( gQuery['re'] != "true" ) ? gQuery['q'].replace(/([\*\+\?\.\|\[\]\{\}\^\/\$\\])/g, "\\$1") : gQuery['q'];
	gRegExp[1] = ( gQuery['cs'] != "true" ) ? "im" : "m";
	var RE = new RegExp(gRegExp[0], gRegExp[1]);

	SBservice.RDFC.Init(SCRDF.data, SBservice.RDF.GetResource("urn:scrapbook:cache"));
	var ResSet = SBservice.RDFC.GetElements();
	while ( ResSet.hasMoreElements() && gHit < gMax )
	{
		var myRes = ResSet.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
		if ( myRes.Value == "urn:scrapbook:cache" ) continue;
		var isMatchT = SBRDF.getProperty("title",   myRes).match(RE);
		var isMatchM = SBRDF.getProperty("comment", myRes).match(RE);
		var isMatchC = SCRDF.getProperty("content", myRes).match(RE);
		if ( isMatchT || isMatchM || isMatchC )
		{
			gHit++;
			var myIcon = SBRDF.getProperty("icon", myRes);
			var myType = SBRDF.getProperty("type", myRes);
			if ( !myIcon ) myIcon = SBcommon.getDefaultIcon(myType);
			var SBlistitem  = document.createElementNS(NS_XUL, "listitem");
			var SBlistcellT = document.createElementNS(NS_XUL, "listcell");
			var SBlistcellF = document.createElementNS(NS_XUL, "listcell");
			var SBlistcellC = document.createElementNS(NS_XUL, "listcell");
			var SBlistcellM = document.createElementNS(NS_XUL, "listcell");
			SBlistitem.setAttribute("id", myRes.Value);
			SBlistitem.setAttribute("type", myType);
			SBlistcellT.setAttribute("class", "listcell-iconic");
			SBlistcellT.setAttribute("image", myIcon);
			SBlistcellT.setAttribute("label", SBRDF.getProperty("title",  myRes));
			SBlistcellM.setAttribute("label", SB_extractKeyword(SBRDF.getProperty("comment", myRes)).replace(/ __BR__ /g, " "));
			SBlistcellC.setAttribute("label", SB_extractKeyword(SCRDF.getProperty("content", myRes)));
			SBlistcellF.setAttribute("label", SCRDF.getProperty("folder", myRes));
			if ( isMatchT ) SBlistcellT.setAttribute("style", "color:#0000FF;");
			if ( isMatchM ) SBlistcellM.setAttribute("style", "color:#0000FF;");
			if ( isMatchC ) SBlistcellC.setAttribute("style", "color:#0000FF;");
			SBlistitem.appendChild(SBlistcellT);
			SBlistitem.appendChild(SBlistcellC);
			SBlistitem.appendChild(SBlistcellM);
			SBlistitem.appendChild(SBlistcellF);
			document.getElementById("ScrapBookResultList").appendChild(SBlistitem);
		}
	}

	if ( gHit >= gMax )
	{
		gHit = "Over " + gHit;
		document.getElementById("ScrapBookResult").setAttribute("class", "sb-header-ex");
	}
	var type = ( gQuery['re'] == "true" ) ? "Matching" : "Containing";
	document.getElementById("ScrapBookResultLabel").value = gHit + " Results Found " + type + " '" + gQuery['q'] + "'";
}


function SB_extractKeyword(aString)
{
	aString = aString.replace(/\r|\n|\t/g, " ");
	var RE = new RegExp("(" + gRegExp[0] + ".*)", gRegExp[1]);
	var ret = aString.match(RE) ? RegExp.$1 : aString;
	return ( ret.length > 100 ) ? ret.substring(0, 100) : ret;
}


function SB_convertHTML2Text(aStr)
{
	var	FORMAT_CONVERTER = Components.classes['@mozilla.org/widget/htmlformatconverter;1'].createInstance(Components.interfaces.nsIFormatConverter);
	var fromStr = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString);
	var toStr   = { value: null };
	fromStr.data = aStr;
	try {
		FORMAT_CONVERTER.convert("text/html", fromStr, fromStr.toString().length, "text/unicode", toStr, {});
		toStr = toStr.value.QueryInterface(Components.interfaces.nsISupportsString);
		return toStr.toString();
	}
	catch(ex) {
		return aStr;
	}
}


function SB_openResult(aEvent, flag)
{
	if ( aEvent.originalTarget.localName != "listitem" && aEvent.originalTarget.localName != "menuitem" ) return;
	var myID   = document.getElementById("ScrapBookResultList").currentItem.id.substring(18, 32);
	var myType = document.getElementById("ScrapBookResultList").currentItem.getAttribute("type");
	var myURL  = SBcommon.getURL(myID, myType);
	switch ( flag ) {
		case "P" : document.getElementById("ScrapBookBrowser").setAttribute("src", myURL); break;
		case "O" : SBcommon.loadURL(myURL, false); break;
		case "T" : SBcommon.loadURL(myURL, true); break;
	}
}


function SB_exitResult()
{
	window.location.href = document.getElementById("ScrapBookBrowser").contentWindow.location.href;
}


function SB_browserOnload(aEvent)
{
	aEvent.stopPropagation();
	aEvent.preventDefault();
	SBhighlight.exec("yellow", gQuery['q']);
}




var SBcache = {

	i       : 0,
	total   : 0,
	dataDir : null,

	build : function()
	{
		SBRDF.init();
		SCRDF.init();
		SCRDF.removeAllEntries();
		this.dataDir = SBcommon.getScrapBookDir().clone();
		this.dataDir.append("data");
		var ResSet = SBRDF.data.GetAllResources();
		while ( ResSet.hasMoreElements() )
		{
			ResSet.getNext();
			this.total++;
		}
		this.total -= 2;

		this.processRDFRecursively(SBservice.RDF.GetResource("urn:scrapbook:root"));

		SBstatus.firstChild.value = "complete";
		SCRDF.flush();
		window.close();
	},

	processRDFRecursively : function(aContRes)
	{
		SBservice.RDFC.Init(SBRDF.data, aContRes);
		var ResSet = SBservice.RDFC.GetElements();
		while ( ResSet.hasMoreElements() )
		{
			var myRes = ResSet.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			SBstatus.firstChild.value = "scanning... " + myRes.Value;
			SBstatus.lastChild.value  = Math.round(++this.i / this.total * 100);
			if ( SBservice.RDFCU.IsContainer(SBRDF.data, myRes) )
			{
				this.processRDFRecursively(myRes);
			}
			else
			{
				var myFile = this.dataDir.clone();
				myFile.append(SBRDF.getProperty("id", myRes));
				myFile.append("index.html");
				var myContent = SBcommon.readFile(myFile);
				if ( !myFile.exists() ) continue;
				try {
					SBservice.UC.charset = SBRDF.getProperty("chars", myRes);
					myContent = SBservice.UC.ConvertToUnicode(myContent);
				} catch(ex) {
					dump("*** ScrapBook Failed to ConvertToUnicode : " + myRes.Value + "\n");
				}
				myContent = SB_convertHTML2Text(myContent);
				SCRDF.addEntry(myRes, myContent, SBRDF.getProperty("title", aContRes));
			}
		}
	}

};




var SCRDF = {

	data : null,
	cont : null,

	init : function()
	{
		var myPath;
		if ( !gCacheFile.exists() )
		{
			gCacheFile.create(gCacheFile.NORMAL_FILE_TYPE, 0666);
			myPath = SBservice.IO.newFileURI(gCacheFile).spec;
			this.data = SBservice.RDF.GetDataSourceBlocking(myPath);
			SBservice.RDFCU.MakeSeq(this.data, SBservice.RDF.GetResource("urn:scrapbook:cache"));
		}
		else
		{
			myPath = SBservice.IO.newFileURI(gCacheFile).spec;
			this.data = SBservice.RDF.GetDataSourceBlocking(myPath);
		}
		this.cont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		this.cont.Init(this.data, SBservice.RDF.GetResource("urn:scrapbook:cache"));
	},

	addEntry : function(aRes, aContent, aFolder)
	{
		this.cont.AppendElement(aRes);
		this.data.Assert(aRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "content"), SBservice.RDF.GetLiteral(aContent), true);
		this.data.Assert(aRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "folder"),  SBservice.RDF.GetLiteral(aFolder),  true);
	},

	getProperty : function(aProp, aRes)
	{
		try {
			var retVal = this.data.GetTarget(aRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + aProp), true);
			return retVal.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
		} catch(ex) {
			return "";
		}
	},

	removeAllEntries : function()
	{
		var ResSet = this.data.GetAllResources();
		while ( ResSet.hasMoreElements() )
		{
			var aRes = ResSet.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			this.removeEntry(aRes);
		}
		SBservice.RDFCU.MakeSeq(this.data, SBservice.RDF.GetResource("urn:scrapbook:cache"));
	},

	removeEntry : function(aRes)
	{
		this.cont.RemoveElement(aRes, true);
		var names = this.data.ArcLabelsOut(aRes);
		while ( names.hasMoreElements() )
		{
			try {
				var name  = names.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				var value = this.data.GetTarget(aRes, name, true);
				this.data.Unassert(aRes, name, value);
			}
			catch(ex) {
			}
		}
	},

	flush : function()
	{
		this.data.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
	}

};




var SBhighlight = {

	word : "",
	searchRange : null,
	startPoint : null,
	endPoint : null,

	exec : function(color, _word)
	{
		this.word = _word;
		var doc = document.getElementById("ScrapBookBrowser").contentDocument;
		var body = doc.body;
		if ( !body ) return;

		var count = body.childNodes.length;
		this.searchRange = doc.createRange();
		this.startPoint  = doc.createRange();
		this.endPoint    = doc.createRange();

		var baseNode = doc.createElement("span");
		baseNode.setAttribute("style", "background-color: " + color + ";");
		baseNode.setAttribute("id", "__firefox-findbar-search-id");

		this.searchRange.setStart(body, 0);
		this.searchRange.setEnd(body, count);

		this.startPoint.setStart(body, 0);
		this.startPoint.setEnd(body, 0);
		this.endPoint.setStart(body, count);
		this.endPoint.setEnd(body, count);

		var retRange = null;
		var finder = Components.classes["@mozilla.org/embedcomp/rangefind;1"].createInstance().QueryInterface(Components.interfaces.nsIFind);

		while( (retRange = finder.Find(this.word, this.searchRange, this.startPoint, this.endPoint)) )
		{
			var nodeSurround = baseNode.cloneNode(true);
			var node = this.highlightNode(retRange, nodeSurround);
			this.startPoint = node.ownerDocument.createRange();
			this.startPoint.setStart(node, node.childNodes.length);
			this.startPoint.setEnd(node, node.childNodes.length);
		}
	},

	highlightNode : function(range, node)
	{
		var startContainer = range.startContainer;
		var startOffset = range.startOffset;
		var endOffset = range.endOffset;
		var docfrag = range.extractContents();
		var before = startContainer.splitText(startOffset);
		var parent = before.parentNode;
		node.appendChild(docfrag);
		parent.insertBefore(node, before);
		return node;
	}

};


