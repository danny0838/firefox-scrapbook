
var SBstatus;
var SBstring;
var SBbaseURL;

var gCacheFile;




function SB_initFT(type)
{
	SBstatus = document.getElementById("ScrapBookStatus");
	SBstring = document.getElementById("ScrapBookString");
	gCacheFile = SBcommon.getScrapBookDir().clone();
	gCacheFile.append("cache.rdf");
	sbDataSource.init();
	sbCacheSource.init();
	SBbaseURL = SBcommon.getBaseHref(sbDataSource.data.URI);
	switch ( type )
	{
		case 'SEARCH' : sbSearchResult.exec(); break;
		case 'CACHE'  : setTimeout(function() { sbCacheService.build(); }, 0); break;
	}
}


var sbSearchResult =
{
	get TREE() { return document.getElementById("ScrapBookTree"); },
	get CURRENT_TREEITEM() { return this.treeItems[this.TREE.currentIndex]; },
	get TEXT_TO_SUB_URI()  { return Components.classes['@mozilla.org/intl/texttosuburi;1'].getService(Components.interfaces.nsITextToSubURI); },
	get MAX_HIT() { return 100; },
	get COLORS()  { return ["#FFFF33","#66FFFF","#90FF90","#FF9999","#FF99FF"]; },


	hit : 0,
	QueryStrings   : { q : "", re : "", cs : "" },
	RegExpModifier : "",
	includeWords : [],
	excludeWords : [],
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
		this.QueryStrings['q'] = this.TEXT_TO_SUB_URI.UnEscapeAndConvert("UTF-8", this.QueryStrings['q']);

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

		var resEnum = sbCacheSource.container.GetElements();
		while ( resEnum.hasMoreElements() && this.hit < this.MAX_HIT )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( res.Value == "urn:scrapbook:cache" ) continue;
			var content = sbCacheSource.getProperty("content", res);
			var folder  = sbCacheSource.getProperty("folder",  res);
			var resURI  = res.Value.split("#")[0];
			var name    = res.Value.split("#")[1] || "index";
			res = SBservice.RDF.GetResource(resURI);
			var type    = sbDataSource.getProperty("type",    res);
			var title   = sbDataSource.getProperty("title",   res);
			var comment = sbDataSource.getProperty("comment", res);
			if ( !sbDataSource.exists(res) ) continue;
			if ( this.QueryStrings['re'] == "true" )
			{
				var re = new RegExp(this.QueryStrings['q'], this.RegExpModifier);
				var isMatchT = title.match(re);
				var isMatchM = comment.match(re);
				var isMatchC = content.match(re);
			}
			else
			{
				var willContinue = false;
				var tcc = [title, comment, content].join("\t");
				for ( var x = 0; x < RegExpInclude.length; x++ ) {
					if ( !tcc.match(RegExpInclude[x]) ) { willContinue = true; break; }
				}
				if ( willContinue ) continue;
				for ( x = 0; x < RegExpExclude.length; x++ ) {
					if ( tcc.match(RegExpExclude[x]) )  { willContinue = true; break; }
				}
				if ( willContinue ) continue;
				var isMatchT = isMatchM = isMatchC = true;
			}
			if ( isMatchT || isMatchM || isMatchC )
			{
				var icon = sbDataSource.getProperty("icon", res);
				if ( !icon ) icon = SBcommon.getDefaultIcon(type);
				sbSearchResult.treeItems.push([
					title,
					this.extractRightContext(content),
					this.extractRightContext(comment).replace(/ __BR__ /g, " "),
					folder,
					name,
					resURI.substring(18),
					type,
					icon,
				]);
				this.hit++;
			}
			if ( this.hit >= this.MAX_HIT ) break;
		}

		sbSearchResult.initTree();

		if ( this.hit >= this.MAX_HIT ) document.getElementById("ScrapBookResult").setAttribute("class", "sb-header-ex");
		var headerLabel1 = SBstring.getFormattedString( ( this.hit < this.MAX_HIT ) ? "RESULTS_FOUND" : "RESULTS_FOUND_OVER", [this.hit] );
		if ( this.QueryStrings['re'] == "true" )
		{
			var headerLabel2 = SBstring.getFormattedString("MATCHING", [ this.localizedQuotation(this.QueryStrings['q']) ]);
		}
		else
		{
			var includeQuoted = [];
			for ( var x = 0; x < this.includeWords.length; x++ ) {
				includeQuoted.push(this.localizedQuotation(this.includeWords[x]));
			}
			if ( includeQuoted.length > 0 ) includeQuoted = SBstring.getFormattedString("INCLUDING", [includeQuoted.join(" ")]);
			var excludeQuoted = [];
			for ( var x = 0; x < this.excludeWords.length; x++ ) {
				excludeQuoted.push(this.localizedQuotation(this.excludeWords[x]));
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
			"sbTreeColName",
		];
		var treeView = new sbCustomTreeView(colIDs, this.treeItems);
		treeView.getImageSrc = function(row, col)
		{
			if ( col == "sbTreeColTitle" || col.index == 0 ) return this._items[row][7];
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
		var id   = this.CURRENT_TREEITEM[5];
		var url  = this.CURRENT_TREEITEM[6] == "note" ? "chrome://scrapbook/content/note.xul?id=" + id : SBbaseURL + "data/" + id + "/" + this.CURRENT_TREEITEM[4] + ".html";
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
			sbHighlight.exec(this.COLORS[i % this.COLORS.length], this.includeWords[i]);
		}
	},


};


function SB_exitResult()
{
	window.location.href = document.getElementById("ScrapBookBrowser").contentWindow.location.href;
}




var sbCacheService = {

	index : 0,
	dataDir : null,
	resList : [],
	folders : [],
	uriHash : {},


	build : function()
	{
		dump("sbCacheService::build\n");
		window.title = SBstring.getString("BUILD_CACHE") + " - ScrapBook";
		SBstatus.firstChild.value = SBstring.getString("BUILD_CACHE_INIT");
		sbCacheSource.refreshEntries();
		this.dataDir = SBcommon.getScrapBookDir().clone();
		this.dataDir.append("data");
		this.prepareBuilding(SBservice.RDF.GetResource("urn:scrapbook:root"));
		this.processAsync();
	},


	prepareBuilding : function(aContRes)
	{
		SBservice.RDFC.Init(sbDataSource.data, aContRes);
		var resEnum = SBservice.RDFC.GetElements();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			var type = sbDataSource.getProperty("type", res);
			if ( SBservice.RDFCU.IsContainer(sbDataSource.data, res) )
			{
				this.prepareBuilding(res);
			}
			else if ( type == "image" || type == "file" )
			{
				continue;
			}
			else
			{
				this.resList.push(res);
				this.folders.push(sbDataSource.getProperty("title", aContRes));
			}
		}
	},


	processAsync : function()
	{
		var res = this.resList[this.index];
		var id  = sbDataSource.getProperty("id", res);
		var dir = this.dataDir.clone();
		dir.append(id);
		SBstatus.firstChild.value = SBstring.getString("BUILD_CACHE_UPDATE") + " " + sbDataSource.getProperty("title", res);
		SBstatus.lastChild.value  = Math.round((this.index + 1) / this.resList.length * 100);
		this.inspectFile(dir, "index");
		if ( sbDataSource.getProperty("type", res) == "site" )
		{
			var url2name = dir.clone();
			url2name.append("sb-url2name.txt");
			if ( url2name.exists() )
			{
				url2name = SBcommon.readFile(url2name).split("\n");
				for ( var i = 0; i < url2name.length; i++ )
				{
					if ( i > 256 ) break;
					var line = url2name[i].split("\t");
					if ( !line[1] || line[1] == "index" ) continue;
					this.inspectFile(dir, line[1]);
				}
			}
		}
		if ( window.title != this.folders[this.index] ) window.title = this.folders[this.index] || SBstring.getString("BUILD_CACHE");
		if ( ++this.index < this.resList.length )
			setTimeout(function(){ sbCacheService.processAsync(); }, 0);
		else
			setTimeout(function(){ sbCacheService.finalize(); }, 0);
	},


	inspectFile : function(aDir, aName)
	{
		var resource = SBservice.RDF.GetResource(this.resList[this.index].Value + "#" + aName);
		var contents = [];
		var num = 0;
		do {
			var file;
			var file1 = aDir.clone();
			var file2 = aDir.clone();
			file1.append(aName + ((num > 0) ? num : "") + ".html");
			file2.append(aName + "_" + ((num > 0) ? num : "") + ".html");
			if      ( file1.exists() ) file = file1;
			else if ( file2.exists() ) file = file2;
			else break;
			if ( num == 0 && sbCacheSource.exists(resource) )
			{
				if ( gCacheFile.lastModifiedTime > file.lastModifiedTime )
				{
					this.uriHash[resource.Value] = true;
					sbCacheSource.updateEntry(resource, "folder",  this.folders[this.index]);
					return;
				}
			}
			var content = SBcommon.readFile(file);
			try {
				SBservice.UNICODE.charset = sbDataSource.getProperty("chars", this.resList[this.index]);
				content = SBservice.UNICODE.ConvertToUnicode(content);
			} catch(ex) {
				dump("*** ScrapBook Failed to ConvertToUnicode : " + aDir.leafName + "\t" + aName + "\n");
			}
			contents.push(this.convertHTML2Text(content));
		}
		while ( ++num < 10 );
		contents = contents.join("\t").replace(/[\x00-\x1F\x7F]/g, " ").replace(/\s+/g, " ");
		if ( sbCacheSource.exists(resource) )
		{
			dump("+\t" + aDir.leafName + "#" + aName + "\n");
			sbCacheSource.updateEntry(resource, "folder",  this.folders[this.index]);
			sbCacheSource.updateEntry(resource, "content", contents);
		}
		else
		{
			dump("*\t" + aDir.leafName + "#" + aName + "\n");
			sbCacheSource.addEntry(resource, contents);
		}
		this.uriHash[resource.Value] = true;
	},


	finalize : function()
	{
		window.title = SBstring.getString("BUILD_CACHE_UPDATE");
		for ( var uri in this.uriHash )
		{
			if ( !this.uriHash[uri] && uri != "urn:scrapbook:cache" )
			{
				dump("-\t" + uri + "\n");
				SBstatus.firstChild.value = SBstring.getString("BUILD_CACHE_REMOVE") + " " + uri;
				sbCacheSource.removeEntry(SBservice.RDF.GetResource(uri));
			}
		}
		SBstatus.firstChild.value = SBstring.getString("BUILD_CACHE_UPDATE") + "cache.rdf";
		sbCacheSource.flush();
		try {
			if ( window.arguments[0] ) SBcommon.loadURL(window.arguments[0], true);
		} catch(ex) {
		}
		window.close();
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




var sbCacheSource = {

	dataSource : null,
	container  : null,

	init : function()
	{
		if ( !gCacheFile.exists() ) gCacheFile.create(gCacheFile.NORMAL_FILE_TYPE, 0666);
		var filePath = SBservice.IO.newFileURI(gCacheFile).spec;
		this.dataSource = SBservice.RDF.GetDataSourceBlocking(filePath);
		this.container = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		try {
			this.container.Init(this.dataSource, SBservice.RDF.GetResource("urn:scrapbook:cache"));
		} catch(ex) {
			this.container = SBservice.RDFCU.MakeSeq(this.dataSource, SBservice.RDF.GetResource("urn:scrapbook:cache"));
		}
	},

	refreshEntries : function()
	{
		var resEnum = this.dataSource.GetAllResources();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( res.Value.indexOf("#") == -1 && res.Value != "urn:scrapbook:cache" )
				this.removeEntry(res);
			else
				sbCacheService.uriHash[res.Value] = false;
		}
		this.container = SBservice.RDFCU.MakeSeq(this.dataSource, SBservice.RDF.GetResource("urn:scrapbook:cache"));
	},

	addEntry : function(aRes, aContent)
	{
		aContent = sbDataSource.sanitize(aContent);
		this.container.AppendElement(aRes);
		this.dataSource.Assert(aRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "folder"),  SBservice.RDF.GetLiteral(sbCacheService.folders[sbCacheService.index]),  true);
		this.dataSource.Assert(aRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + "content"), SBservice.RDF.GetLiteral(aContent), true);
	},

	updateEntry : function(aRes, aProp, newVal)
	{
		newVal = sbDataSource.sanitize(newVal);
		aProp = SBservice.RDF.GetResource(NS_SCRAPBOOK + aProp);
		var oldVal = this.dataSource.GetTarget(aRes, aProp, true).QueryInterface(Components.interfaces.nsIRDFLiteral);
		newVal = SBservice.RDF.GetLiteral(newVal);
		this.dataSource.Change(aRes, aProp, oldVal, newVal);
	},

	removeEntry : function(aRes)
	{
		this.container.RemoveElement(aRes, true);
		var names = this.dataSource.ArcLabelsOut(aRes);
		while ( names.hasMoreElements() )
		{
			var name  = names.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			var value = this.dataSource.GetTarget(aRes, name, true);
			this.dataSource.Unassert(aRes, name, value);
		}
	},

	getProperty : function(aProp, aRes)
	{
		try {
			var retVal = this.dataSource.GetTarget(aRes, SBservice.RDF.GetResource(NS_SCRAPBOOK + aProp), true);
			return retVal.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
		} catch(ex) {
			dump("*** ERROR sbCacheSource::getProperty " + aProp + " " + aRes.Value + "\n");
			return "";
		}
	},

	exists : function(aRes)
	{
		return (this.dataSource.ArcLabelsOut(aRes).hasMoreElements() && this.container.IndexOf(aRes) != -1);
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


