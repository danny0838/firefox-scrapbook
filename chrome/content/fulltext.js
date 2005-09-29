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




function SB_initFT(type)
{
	SBstatus = document.getElementById("ScrapBookStatus");
	SBstring = document.getElementById("ScrapBookString");
	gCacheFile = SBcommon.getScrapBookDir().clone();
	gCacheFile.append("cache.rdf");
	switch ( type )
	{
		case 'SEARCH' : sbResult.exec(); break;
		case 'CACHE'  : setTimeout(function() { SBcache.build(); }, 0); break;
	}
}


var sbResult =
{
	get TREE() { return document.getElementById("ScrapBookTree"); },
	get CURRENT_TREEITEM() { return this.treeItems[this.TREE.currentIndex]; },


	hit : 0,
	max : 100,
	QueryStrings   : { q : "", re : "", cs : "" },
	RegExpModifier : "",
	includeWords : [],
	excludeWords : [],
	highlightColors : ["#FFFF33","#66FFFF","#90FF90","#FF9999","#FF99FF"],
	treeItems : [],


	exec : function()
	{
		var qs = document.location.href.match(/result\.xul\?(.*)$/);
		qs = RegExp.$1;
		var qa = qs.split("&");
		for ( var i = 0; i < qa.length; i++ )
		{
			this.QueryStrings[qa[i].split("=")[0]] = qa[i].split("=")[1];
		}
		const TTSU = Components.classes['@mozilla.org/intl/texttosuburi;1'].getService(Components.interfaces.nsITextToSubURI);
		this.QueryStrings['q'] = TTSU.UnEscapeAndConvert("UTF-8", this.QueryStrings['q']);

		sbDataSource.init();
		scDataSource.init();


		this.RegExpModifier = ( this.QueryStrings['cs'] != "true" ) ? "im" : "m";

		if ( this.QueryStrings['re'] != "true" )
		{
			var RegExpInclude = new Array();
			var RegExpExclude = new Array();

			var query = this.QueryStrings['q'].replace(/( |\u3000)+/g, " ");

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
					this.excludeWords.push(quotedStr);
					RegExpExclude.push( new RegExp(quotedStr, this.RegExpModifier) );
					replaceStr = "-" + replaceStr;
				}
				else if ( quotedStr.length > 0 )
				{
					this.includeWords.push(quotedStr);
					RegExpInclude.push( new RegExp(this.escapeRegExpSpecialChars(quotedStr), this.RegExpModifier) );
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
					this.excludeWords.push(word);
					RegExpExclude.push( new RegExp(this.escapeRegExpSpecialChars(word), this.RegExpModifier) );
				}
				else if ( word.length > 0 )
				{
					this.includeWords.push(word);
					RegExpInclude.push( new RegExp(this.escapeRegExpSpecialChars(word), this.RegExpModifier) );
				}
			}
			if ( RegExpInclude.length == 0 ) return;
		}

		SBservice.RDFC.Init(scDataSource.dataSource, SBservice.RDF.GetResource("urn:scrapbook:cache"));
		var resEnum = SBservice.RDFC.GetElements();
		while ( resEnum.hasMoreElements() && this.hit < this.max )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( res.Value == "urn:scrapbook:cache" ) continue;

			if ( this.QueryStrings['re'] == "true" )
			{
				var re = new RegExp(this.QueryStrings['q'], this.RegExpModifier);
				var isMatchT = sbDataSource.getProperty("title",   res).match(re);
				var isMatchM = sbDataSource.getProperty("comment", res).match(re);
				var isMatchC = scDataSource.getProperty("content", res).match(re);
			}
			else
			{
				var willContinue = false;
				var myTitle   = sbDataSource.getProperty("title", res);
				var myComment = sbDataSource.getProperty("comment", res);
				var myContent = [myTitle, myComment, scDataSource.getProperty("content", res)].join("\t");

				for ( var i = 0; i < RegExpInclude.length; i++ ) {
					if ( !myContent.match(RegExpInclude[i]) ) { willContinue = true; break; }
				}
				if ( willContinue ) continue;
				for ( var i = 0; i < RegExpExclude.length; i++ ) {
					if ( myContent.match(RegExpExclude[i]) )  { willContinue = true; break; }
				}
				if ( willContinue ) continue;
				var isMatchT = isMatchM = isMatchC = true;
			}

			if ( isMatchT || isMatchM || isMatchC )
			{
				if ( !sbDataSource.exists(res) ) continue;
				this.hit++;

				var icon = sbDataSource.getProperty("icon", res);
				if ( !icon ) icon = SBcommon.getDefaultIcon(sbDataSource.getProperty("type", res));
				sbResult.treeItems.push([
					sbDataSource.getProperty("title", res),
					this.extractRightContext(scDataSource.getProperty("content", res)),
					this.extractRightContext(sbDataSource.getProperty("comment", res)).replace(/ __BR__ /g, " "),
					scDataSource.getProperty("folder", res),
					sbDataSource.getProperty("id", res),
					sbDataSource.getProperty("type", res),
					icon,
				]);
			}
			sbResult.initTree();
		}

		if ( this.hit >= this.max ) document.getElementById("ScrapBookResult").setAttribute("class", "sb-header-ex");
		var headerLabel1 = SBstring.getFormattedString( ( this.hit < this.max ) ? "RESULTS_FOUND" : "RESULTS_FOUND_OVER", [this.hit] );
		if ( this.QueryStrings['re'] == "true" )
		{
			var headerLabel2 = SBstring.getFormattedString("MATCHING", [ this.localizedQuotation(this.QueryStrings['q']) ]);
		}
		else
		{
			var includeQuoted = [];
			for ( var i = 0; i < this.includeWords.length; i++ ) {
				includeQuoted.push(this.localizedQuotation(this.includeWords[i]));
			}
			if ( includeQuoted.length > 0 ) includeQuoted = SBstring.getFormattedString("INCLUDING", [includeQuoted.join(" ")]);
			var excludeQuoted = [];
			for ( var i = 0; i < this.excludeWords.length; i++ ) {
				excludeQuoted.push(this.localizedQuotation(this.excludeWords[i]));
			}
			if ( excludeQuoted.length > 0 ) excludeQuoted = SBstring.getFormattedString("EXCLUDING", [excludeQuoted.join(" ")]);
			var headerLabel2 = includeQuoted + " " + excludeQuoted;
		}
		document.getElementById("ScrapBookResultLabel").value = headerLabel1 + " : " + headerLabel2;
	},


	initTree : function()
	{
		var colIDs = [
			"sbTreeColTitle",
			"sbTreeColContent",
			"sbTreeColComment",
			"sbTreeColFolder",
			"sbTreeColID",
			"sbTreeColType",
			"sbTreeColIcon",
		];
		var treeView = new sbCustomTreeView(colIDs, this.treeItems);
		treeView.getImageSrc = function(row, col)
		{
			if ( col == "sbTreeColTitle" || col.index == 0 ) return this._items[row][6];
		};
		this.TREE.view = treeView;
	},


	extractRightContext : function(aString)
	{
		aString = aString.replace(/\r|\n|\t/g, " ");
		pattern = ( this.QueryStrings['re'] == "true" ) ? this.QueryStrings['q'] : this.includeWords[0];
		var re = new RegExp("(" + pattern + ".*)", this.RegExpModifier);
		var ret = aString.match(re) ? RegExp.$1 : aString;
		return ( ret.length > 100 ) ? ret.substring(0, 100) : ret;
	},


	escapeRegExpSpecialChars : function(aString)
	{
		return aString.replace(/([\*\+\?\.\^\/\$\\\|\[\]\{\}\(\)])/g, "\\$1");
	},


	localizedQuotation : function(aString)
	{
		return SBstring.getFormattedString("QUOTATION", [aString]);
	},


	forward : function(key)
	{
		var id   = this.CURRENT_TREEITEM[4];
		var type = this.CURRENT_TREEITEM[5];
		var url  = SBcommon.getURL(id, type);
		switch ( key ) {
			case "O" : SBcommon.loadURL(url, false); break;
			case "T" : SBcommon.loadURL(url, true); break;
			case "P" : window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome" ,id); break;
			case "L" : SBcommon.launchDirectory(SBcommon.getContentDir(id));
			default  : document.getElementById("ScrapBookBrowser").setAttribute("src", url); break;
		}
	},


	onDocumentLoad : function(aEvent)
	{
		aEvent.stopPropagation();
		aEvent.preventDefault();
		if ( this.QueryStrings["re"] == "true" ) this.includeWords = [this.QueryStrings['q']];
		for ( var i = 0; i < this.includeWords.length; i++ )
		{
			sbHighlight.exec(this.highlightColors[i % this.highlightColors.length], this.includeWords[i]);
		}
	},


};


function SB_exitResult()
{
	window.location.href = document.getElementById("ScrapBookBrowser").contentWindow.location.href;
}




var SBcache = {

	count : 0,
	dataDir : null,
	resList : [],
	folderTitles : [],


	build : function()
	{
		window.title = SBstring.getString("BUILD_CACHE") + " - ScrapBook";
		SBstatus.firstChild.value = SBstring.getString("BUILD_CACHE_INIT");
		sbDataSource.init();
		scDataSource.init();
		scDataSource.removeAllEntries();
		this.dataDir = SBcommon.getScrapBookDir().clone();
		this.dataDir.append("data");
		this.initRecursive(SBservice.RDF.GetResource("urn:scrapbook:root"));
		this.count = 0;
		this.processAsync(this.resList[this.count]);
	},


	initRecursive : function(aContRes)
	{
		SBservice.RDFC.Init(sbDataSource.data, aContRes);
		var resEnum = SBservice.RDFC.GetElements();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			var type = sbDataSource.getProperty("type", res);
			if ( SBservice.RDFCU.IsContainer(sbDataSource.data, res) )
			{
				this.initRecursive(res);
			}
			else if ( type == "image" || type == "file" )
			{
				continue;
			}
			else
			{
				this.resList.push(res);
				this.folderTitles.push(sbDataSource.getProperty("title", aContRes));
			}
			SBstatus.firstChild.value = SBstring.getString("BUILD_CACHE_INIT") + " (" + ++this.count + ")";
		}
	},


	processAsync : function(aRes)
	{
		var id  = sbDataSource.getProperty("id", aRes);
		var dir = this.dataDir.clone();
		dir.append(id);
		var contentList = [];
		var num = 0;
		do {
			var file1 = dir.clone();
			var file2 = dir.clone();
			file1.append("index"  + ((num > 0) ? num : "") + ".html");
			file2.append("index_" + ((num > 0) ? num : "") + ".html");
			var file;
			if      ( file1.exists() ) file = file1;
			else if ( file2.exists() ) file = file2;
			else break;
			var content = SBcommon.readFile(file);
			try {
				SBservice.UNICODE.charset = sbDataSource.getProperty("chars", aRes);
				content = SBservice.UNICODE.ConvertToUnicode(content);
			} catch(ex) {
				dump("*** ScrapBook Failed to ConvertToUnicode : " + sbDataSource.getProperty("title", aRes) + "\n");
			}
			contentList.push( this.convertHTML2Text(content) );
		}
		while ( ++num < 10 );
		contentList = contentList.join("\n").replace(/[\x00-\x1F\x7F]/g, " ");
		scDataSource.addEntry(aRes, contentList, this.folderTitles[this.count]);
		SBstatus.firstChild.value = SBstring.getString("BUILD_CACHE_SCAN") + " " + sbDataSource.getProperty("title", aRes);
		SBstatus.lastChild.value  = Math.round(this.count / this.resList.length * 100);
		if ( window.title != this.folderTitles[this.count] ) window.title = this.folderTitles[this.count];
		if ( ++this.count < this.resList.length ) {
			setTimeout(function() { SBcache.processAsync(SBcache.resList[SBcache.count]); }, 0);
		} else {
			this.finish();
		}
	},


	finish : function()
	{
		SBstatus.firstChild.value = "";
		scDataSource.flush();
		try {
			if ( window.arguments[0] ) SBcommon.loadURL(window.arguments[0], true);
		} catch(ex) {
		}
		window.close();
	},


	unload : function()
	{
		if ( this.count != this.resList.length )
		{
			scDataSource.removeAllEntries();
			scDataSource.flush();
		}
	},


	convertHTML2Text : function(aStr)
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
	},


};




var scDataSource = {

	dataSource : null,
	container : null,

	init : function()
	{
		if ( !gCacheFile.exists() ) gCacheFile.create(gCacheFile.NORMAL_FILE_TYPE, 0666);
		var filePath = SBservice.IO.newFileURI(gCacheFile).spec;
		this.dataSource = SBservice.RDF.GetDataSourceBlocking(filePath);
		this.initContainer("urn:scrapbook:cache");
	},

	initContainer : function(aResID)
	{
		this.container = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		try {
			this.container.Init(this.dataSource, SBservice.RDF.GetResource(aResID));
		} catch(ex) {
			this.container = SBservice.RDFCU.MakeSeq(this.dataSource, SBservice.RDF.GetResource(aResID));
		}
	},

	addEntry : function(aRes, aContent, aFolder)
	{
		sbDataSource.sanitize(aContent);
		sbDataSource.sanitize(aFolder);
		this.container.AppendElement(aRes);
		this.dataSource.Assert(aRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "content"), SBservice.RDF.GetLiteral(aContent), true);
		this.dataSource.Assert(aRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "folder"),  SBservice.RDF.GetLiteral(aFolder),  true);
	},

	getProperty : function(aProp, aRes)
	{
		try {
			var retVal = this.dataSource.GetTarget(aRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + aProp), true);
			return retVal.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
		} catch(ex) {
			dump("*** ScrapBook ERROR @ scDataSource::getProperty " + aProp + " " + aRes.Value + "\n");
			return "";
		}
	},

	removeAllEntries : function()
	{
		var resEnum = this.dataSource.GetAllResources();
		while ( resEnum.hasMoreElements() )
		{
			var aRes = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			this.removeEntry(aRes);
		}
		SBservice.RDFCU.MakeSeq(this.dataSource, SBservice.RDF.GetResource("urn:scrapbook:cache"));
	},

	removeEntry : function(aRes)
	{
		this.container.RemoveElement(aRes, true);
		var names = this.dataSource.ArcLabelsOut(aRes);
		while ( names.hasMoreElements() )
		{
			try {
				var name  = names.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				var value = this.dataSource.GetTarget(aRes, name, true);
				this.dataSource.Unassert(aRes, name, value);
			}
			catch(ex) {
			}
		}
	},

	flush : function()
	{
		this.dataSource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
	}

};




var sbHighlight = {

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


