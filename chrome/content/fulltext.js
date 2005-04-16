/**************************************************
// fulltext.js
// Implementation file for cache.xul, result.xul
// 
// Description: 
// Author: Gomita
// Contributors: michael-brueggemann
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBstatus;
var SBstring;

var gCacheFile;
var gQueryStrings  = { q : "", re : "", cs : "" };
var gRegExpModifier;
var gHit = 0;
const gMax = 100;

var SBincludeWords = [];
var SBexcludeWords = [];

var SBhighlightColors = ["#FFFF33","#66FFFF","#90FF90","#FF9999","#FF99FF"];




function SB_initFullText(type)
{
	SBstatus = document.getElementById("ScrapBookStatus");
	SBstring = document.getElementById("ScrapBookString");
	gCacheFile = SBcommon.getScrapBookDir().clone();
	gCacheFile.append("cache.rdf");
	switch ( type )
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
		gQueryStrings[QA[i].split("=")[0]] = QA[i].split("=")[1];
	}
	const TTSU = Components.classes['@mozilla.org/intl/texttosuburi;1'].getService(Components.interfaces.nsITextToSubURI);
	gQueryStrings['q'] = TTSU.UnEscapeAndConvert("UTF-8", gQueryStrings['q']);

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


	gRegExpModifier = ( gQueryStrings['cs'] != "true" ) ? "im" : "m";

	if ( gQueryStrings['re'] != "true" )
	{
		var RegExpInclude = new Array();
		var RegExpExclude = new Array();

		var query = gQueryStrings['q'].replace(/( |\u3000)+/g, " ");

		var quotePos1;
		var quotePos2;
		var quotedStr;

		while ( (quotePos1 = query.indexOf('"')) != -1 )
		{
			quotedStr = query.substring(quotePos1+1, query.length);
			quotePos2 = quotedStr.indexOf('"');
			if ( quotePos2 == -1 ) break;
			quotedStr = quotedStr.substring(0, quotePos2);
			var replaceStr = '"' + quotedStr + '"';
			if ( quotePos1 >= 1 && query.charAt(quotePos1-1) == '-' )
			{
				SBexcludeWords.push(quotedStr);
				RegExpExclude.push( new RegExp(quotedStr, gRegExpModifier) );
				replaceStr = "-" + replaceStr;
			}
			else if ( quotedStr.length > 0 )
			{
				SBincludeWords.push(quotedStr);
				RegExpInclude.push( new RegExp(SB_escapeRegExpSpecialChars(quotedStr), gRegExpModifier) );
			}
			query = query.replace(replaceStr, "");
		}

		query = query.replace(/ +/g, " ").split(' ');

		for ( var i=0; i<query.length; i++ )
		{
			var word = query[i];
			if ( word.charAt(0) == '-' )
			{
				word = word.substring(1, word.length);
				SBexcludeWords.push(word);
				RegExpExclude.push( new RegExp(SB_escapeRegExpSpecialChars(word), gRegExpModifier) );
			}
			else if ( word.length > 0 )
			{
				SBincludeWords.push(word);
				RegExpInclude.push( new RegExp(SB_escapeRegExpSpecialChars(word), gRegExpModifier) );
			}
		}
		if ( RegExpInclude.length == 0 ) return;
	}

	SBservice.RDFC.Init(SCRDF.data, SBservice.RDF.GetResource("urn:scrapbook:cache"));
	var ResSet = SBservice.RDFC.GetElements();
	var ResCnt = SBservice.RDFC.GetCount() - 1;
	while ( ResSet.hasMoreElements() && gHit < gMax )
	{
		var myRes = ResSet.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
		if ( myRes.Value == "urn:scrapbook:cache" ) continue;

		if ( gQueryStrings['re'] == "true" )
		{
			var myRE = new RegExp(gQueryStrings['q'], gRegExpModifier);
			var isMatchT = SBRDF.getProperty("title",   myRes).match(myRE);
			var isMatchC = SCRDF.getProperty("content", myRes).match(myRE);
			var isMatchM = SBRDF.getProperty("comment", myRes).match(myRE);
		}
		else
		{
			var willContinue = false;
			var myContent = SCRDF.getProperty("content", myRes);
			for ( var i = 0; i < RegExpInclude.length; i++ ) {
				if ( !myContent.match(RegExpInclude[i]) ) { willContinue = true; break; }
			}
			if ( willContinue ) continue;
			for ( var i = 0; i < RegExpExclude.length; i++ ) {
				if ( myContent.match(RegExpExclude[i]) )  { willContinue = true; break; }
			}
			if ( willContinue ) continue;
			var isMatchC = true;
		}

		if ( isMatchT || isMatchM || isMatchC )
		{
			gHit++;
			var myIcon = SBRDF.getProperty("icon", myRes);
			var myType = SBRDF.getProperty("type", myRes);
			if ( !myIcon ) myIcon = SBcommon.getDefaultIcon(myType);
			var SBlistitem  = document.getElementById("ScrapBookResultListTemplate").cloneNode(true);
			SBlistitem.setAttribute("hidden", false);
			SBlistitem.setAttribute("id", myRes.Value);
			SBlistitem.setAttribute("type", myType);
			SBlistitem.childNodes[0].setAttribute("image", myIcon);
			SBlistitem.childNodes[0].setAttribute("label", SBRDF.getProperty("title",  myRes));
			SBlistitem.childNodes[1].setAttribute("label", SB_extractRightContext(SCRDF.getProperty("content", myRes)));
			SBlistitem.childNodes[2].setAttribute("label", SB_extractRightContext(SBRDF.getProperty("comment", myRes)).replace(/ __BR__ /g, " "));
			SBlistitem.childNodes[3].setAttribute("label", SCRDF.getProperty("folder", myRes));
			if ( isMatchT ) SBlistitem.childNodes[0].setAttribute("style", "color:#0000FF;");
			if ( isMatchC ) SBlistitem.childNodes[1].setAttribute("style", "color:#0000FF;");
			if ( isMatchM ) SBlistitem.childNodes[2].setAttribute("style", "color:#0000FF;");
			document.getElementById("ScrapBookResultList").appendChild(SBlistitem);
		}
	}

	if ( gHit >= gMax ) document.getElementById("ScrapBookResult").setAttribute("class", "sb-header-ex");
	var headerLabel1 = SBstring.getFormattedString( ( gHit < gMax ) ? "RESULTS_FOUND" : "RESULTS_FOUND_OVER", [gHit] );
	if ( gQueryStrings['re'] == "true" )
	{
		var headerLabel2 = SBstring.getFormattedString("MATCHING", [ SB_localizedQuotation(gQueryStrings['q']) ]);
	}
	else
	{
		var includeQuoted = [];
		for ( var i = 0; i < SBincludeWords.length; i++ ) {
			includeQuoted.push(SB_localizedQuotation(SBincludeWords[i]));
		}
		if ( includeQuoted.length > 0 ) includeQuoted = SBstring.getFormattedString("INCLUDING", [includeQuoted.join(" ")]);
		var excludeQuoted = [];
		for ( var i = 0; i < SBexcludeWords.length; i++ ) {
			excludeQuoted.push(SB_localizedQuotation(SBexcludeWords[i]));
		}
		if ( excludeQuoted.length > 0 ) excludeQuoted = SBstring.getFormattedString("EXCLUDING", [excludeQuoted.join(" ")]);
		var headerLabel2 = includeQuoted + " " + excludeQuoted;
	}
	document.getElementById("ScrapBookResultLabel").value = headerLabel1 + " : " + headerLabel2;
}


function SB_extractRightContext(aString)
{
	aString = aString.replace(/\r|\n|\t/g, " ");
	pattern = ( gQueryStrings['re'] == "true" ) ? gQueryStrings['q'] : SBincludeWords[0];
	var RE = new RegExp("(" + pattern + ".*)", gRegExpModifier);
	var ret = aString.match(RE) ? RegExp.$1 : aString;
	return ( ret.length > 100 ) ? ret.substring(0, 100) : ret;
}


function SB_escapeRegExpSpecialChars(aString)
{
	return aString.replace(/([\*\+\?\.\^\/\$\\\|\[\]\{\}\(\)])/g, "\\$1");
}


function SB_localizedQuotation(aString)
{
	return SBstring.getFormattedString("QUOTATION", [aString]);
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


function SB_openResult(aEvent, type)
{
	if ( aEvent.originalTarget.localName != "listitem" && aEvent.originalTarget.localName != "menuitem" ) return;
	var myID   = document.getElementById("ScrapBookResultList").currentItem.id.substring(18, 32);
	var myType = document.getElementById("ScrapBookResultList").currentItem.getAttribute("type");
	var myURL  = SBcommon.getURL(myID, myType);
	switch ( type ) {
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
	if ( gQueryStrings["re"] == "true" ) SBincludeWords = [gQueryStrings['q']];
	for ( var i = 0; i < SBincludeWords.length; i++ )
	{
		SBhighlight.exec(SBhighlightColors[i % SBhighlightColors.length], SBincludeWords[i]);
	}
}




var SBcache = {

	i       : 0,
	total   : 0,
	dataDir : null,

	build : function()
	{
		window.title = "ScrapBook - " + SBstring.getString("BUILD_CACHE");
		SBstatus.firstChild.value = SBstring.getString("BUILD_CACHE_INIT");
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

		SBstatus.firstChild.value = "";
		SCRDF.flush();
		window.close();
	},

	processRDFRecursively : function(aContRes)
	{
		SBservice.RDFC.Init(SBRDF.data, aContRes);
		var ResSet = SBservice.RDFC.GetElements();
		while ( ResSet.hasMoreElements() )
		{
			var myRes  = ResSet.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			var myType = SBRDF.getProperty("type", myRes);
			SBstatus.firstChild.value = SBstring.getString("BUILD_CACHE_SCAN") + myRes.Value;
			SBstatus.lastChild.value  = Math.round(++this.i / this.total * 100);
			if ( SBservice.RDFCU.IsContainer(SBRDF.data, myRes) )
			{
				this.processRDFRecursively(myRes);
			}
			else if ( myType == "image" || myType == "file" )
			{
				continue;
			}
			else
			{
				var myID    = SBRDF.getProperty("id", myRes);
				var myChars = SBRDF.getProperty("chars", myRes);
				var myDir = this.dataDir.clone();
				myDir.append(myID);
				var myContentList = [];
				var num = 0;
				do {
					var myFile = myDir.clone();
					myFile.append("index" + ((num > 0) ? num : "") + ".html");
					if ( !myFile.exists() ) break;
					var myContent = SBcommon.readFile(myFile);
					try {
						SBservice.UC.charset = myChars;
						myContent = SBservice.UC.ConvertToUnicode(myContent);
					} catch(ex) {
						dump("*** ScrapBook Failed to ConvertToUnicode : " + SBRDF.getProperty("title", myRes) + "\n");
					}
					myContentList.push( SB_convertHTML2Text(myContent) );
				}
				while ( ++num < 100 );
				myContentList = myContentList.join("\n").replace(/[\x00-\x1F\x7F]/g, " ");
				SCRDF.addEntry(myRes, myContentList, SBRDF.getProperty("title", aContRes));
			}
		}
	}

};




var SCRDF = {

	data : null,
	cont : null,

	init : function()
	{
		if ( !gCacheFile.exists() ) gCacheFile.create(gCacheFile.NORMAL_FILE_TYPE, 0666);
		var filePath = SBservice.IO.newFileURI(gCacheFile).spec;
		this.data = SBservice.RDF.GetDataSourceBlocking(filePath);
		this.initContainer("urn:scrapbook:cache");
	},

	initContainer : function(aResID)
	{
		this.cont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		try {
			this.cont.Init(this.data, SBservice.RDF.GetResource(aResID));
		} catch(ex) {
			this.cont = SBservice.RDFCU.MakeSeq(this.data, SBservice.RDF.GetResource(aResID));
		}
	},

	addEntry : function(aRes, aContent, aFolder)
	{
		SBRDF.sanitize(aContent);
		SBRDF.sanitize(aFolder);
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
			dump("*** ScrapBook ERROR @ SCRDF::getProperty " + aProp + " " + aRes.Value + "\n");
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
	frameList : [],
	searchRange : null,
	startPoint : null,
	endPoint : null,

	getFrameList : function(aWindow)
	{
		for ( var f = 0; f < aWindow.frames.length; f++ )
		{
			this.frameList.push(aWindow.frames[f]);
			this.getFrameList(aWindow.frames[f]);
		}
	},

	exec : function(color, word)
	{
		this.word = word;

		var rootWin = document.getElementById("ScrapBookBrowser").contentWindow;
		this.frameList = [rootWin];
		this.getFrameList(rootWin);

		for ( var i = 0; i < this.frameList.length; i++ )
		{
			var doc = this.frameList[i].document;
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
			var finder = Components.classes['@mozilla.org/embedcomp/rangefind;1'].createInstance().QueryInterface(Components.interfaces.nsIFind);

			while( (retRange = finder.Find(this.word, this.searchRange, this.startPoint, this.endPoint)) )
			{
				var nodeSurround = baseNode.cloneNode(true);
				var node = this.highlightNode(retRange, nodeSurround);
				this.startPoint = node.ownerDocument.createRange();
				this.startPoint.setStart(node, node.childNodes.length);
				this.startPoint.setEnd(node, node.childNodes.length);
			}
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


