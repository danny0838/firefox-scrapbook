
var sbPageBinder = {

	get WIZARD()    { return document.getElementById("sbCombineWizard"); },
	get STRING()    { return document.getElementById("sbCombineString"); },
	get LISTBOX()   { return document.getElementById("sbCombineListbox"); },
	get currentID() { return this.idList[this.index]; },

	index   : 0,
	idList  : [],
	resList : [],
	parList : [],
	option  : [],
	prefix  : "",
	postfix : "",

	init : function()
	{
		SBstring = document.getElementById("ScrapBookString");
		sbDataSource.init();
		sbTreeHandler.init(false);
		SB_initObservers();
		this.index = 0;
		this.WIZARD.getButton("back").label = this.STRING.getString("RESET_BUTTON_LABEL");
		this.WIZARD.getButton("back").disabled = false;
		this.WIZARD.getButton("back").onclick = function(){ SBtree.parentNode.collapsed = true; window.location.reload(); };
		this.WIZARD.canAdvance = false;
	},

	add : function()
	{
		var curRes = SBtree.builderView.getResourceAtIndex(SBtree.currentIndex);
		var type = sbDataSource.getProperty("type", curRes);
		if ( type == "folder" ) return;
		if ( type == "note" || type == "file" ) { alert(this.STRING.getString("CANNOT_COMBINE_NOTES")); return; }
		this.LISTBOX.appendItem(sbDataSource.getProperty("title", curRes));
		this.idList.push(sbDataSource.getProperty("id", curRes));
		this.resList.push(curRes);
		this.parList.push(SB_getParentResourceAtIndex(SBtree.currentIndex));
		this.WIZARD.canAdvance = true;
	},

	next : function()
	{
		dump("sbPageBinder::next " + this.index + "\n");
		if ( this.index < this.idList.length ) {
			this.prefix  = "(" + (this.index + 1) + "/" + this.idList.length + ") ";
			this.postfix = sbDataSource.getProperty("title", this.resList[this.index]);
			sbInvisibleBrowser.load(SBcommon.getURL(this.currentID), this.currentID);
		} else {
			this.prefix  = "";
			this.postfix = "combine.html";
			this.donePreview();
		}
	},

	initPreview : function()
	{
		dump("sbPageBinder::initPreview\n");
		this.WIZARD.canAdvance = false;
		this.WIZARD.getButton("finish").label = this.STRING.getString("FINISH_BUTTON_LABEL");
		this.WIZARD.getButton("finish").disabled = true;
		this.option[0] = document.getElementById("sbCombineOptionH").checked;
		sbInvisibleBrowser.init();
		sbInvisibleBrowser.ELEMENT.removeEventListener("load", sbInvisibleBrowser.onload, true);
		sbInvisibleBrowser.onload = function(){ sbDocumentAnalyzer.exec(); };
		sbInvisibleBrowser.ELEMENT.addEventListener("load", sbInvisibleBrowser.onload, true);
		this.next();
	},

	donePreview : function()
	{
		dump("sbPageBinder::donePreview\n");
		var htmlFile = SBcommon.getScrapBookDir();
		htmlFile.append("combine.html");
		SBcommon.writeFile(htmlFile, sbDocumentAnalyzer.htmlSrc, "UTF-8");
		var cssFile = SBcommon.getScrapBookDir();
		cssFile.append("combine.css");
		SBcommon.writeFile(cssFile, sbDocumentAnalyzer.cssText, "UTF-8");
		sbInvisibleBrowser.refreshEvent(function(){ sbPageBinder.showBrowser(); });
		sbInvisibleBrowser.load(SBcommon.convertFilePathToURL(htmlFile.path));
	},

	showBrowser : function()
	{
		dump("sbPageBinder::showBrowser\n");
		this.toggleElements(false);
		sbInvisibleBrowser.ELEMENT.onclick = function(aEvent){ aEvent.preventDefault(); };
		this.WIZARD.getButton("finish").disabled = false;
		this.WIZARD.getButton("finish").onclick = function(){ sbPageBinder.finish(); };
	},

	finish : function()
	{
		dump("sbPageBinder::finish\n");
		this.WIZARD.getButton("finish").disabled = true;
		this.toggleElements(true);
		SB_trace(SBstring.getString("CAPTURE_START"));
		setTimeout(function(){ sbContentSaver.captureWindow(sbInvisibleBrowser.ELEMENT.contentWindow, false, false, "urn:scrapbook:root", 0, null); }, 0);
	},

	toggleElements : function(isProgressMode)
	{
		sbInvisibleBrowser.ELEMENT.collapsed = isProgressMode;
		document.getElementById("ScrapBookCaptureTextbox").collapsed = !isProgressMode;
	},

	onCombineComplete : function(aItem)
	{
		var newRes = SBservice.RDF.GetResource("urn:scrapbook:item" + aItem.id);
		sbDataSource.updateItem(newRes, "type",   "combine");
		sbDataSource.updateItem(newRes, "source", sbDataSource.getProperty("source", this.resList[0]));
		sbDataSource.updateItem(newRes, "icon",   sbDataSource.getProperty("icon",   this.resList[0]).replace(/\d{14}/, aItem.id));
		var newComment = "";
		for ( var i = 0; i < this.resList.length; i++ )
		{
			var comment = sbDataSource.getProperty("comment", this.resList[i]);
			if ( comment ) newComment += comment + " __BR__ ";
		}
		if ( newComment ) sbDataSource.updateItem(newRes, "comment", newComment);
	},

};




var sbDocumentAnalyzer = {

	get BROWSER(){ return document.getElementById("ScrapBookCaptureBrowser"); },
	get BODY()   { return this.BROWSER.contentDocument.body; },

	htmlSrc : "",
	cssText : "",

	exec : function()
	{
		dump("sbDocumentAnalyzer::exec\n");
		if ( sbPageBinder.index == 0 )
		{
			this.htmlSrc += '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">';
			this.htmlSrc += '<html><head>';
			this.htmlSrc += '<meta http-equiv="Content-Type" content="text/html;Charset=UTF-8">';
			this.htmlSrc += '<meta http-equiv="Content-Style-Type" content="text/css">';
			this.htmlSrc += '<title>' + this.BROWSER.contentDocument.title + '</title>';
			this.htmlSrc += '<link rel="stylesheet" href="combine.css" media="all">';
			this.htmlSrc += '<link rel="stylesheet" href="chrome://scrapbook/skin/combine.css" media="all">';
			this.htmlSrc += '</head><body>\n';
		}
		this.processDOMRecursively(this.BROWSER.contentDocument.body);
		this.htmlSrc += this.getCiteHTML();
		this.htmlSrc += this.surroundDOM();
		this.cssText += this.surroundCSS();
		if ( sbPageBinder.index == sbPageBinder.idList.length - 1 )
		{
			this.htmlSrc += '\n</body>\n</html>\n';
		}
		sbPageBinder.index++;
		sbPageBinder.next();
	},

	getCiteHTML : function()
	{
		var src   = '\n<!--' + sbPageBinder.postfix + '-->\n';
		var opt   = sbPageBinder.option[0] ? "" : "-invisible";
		var res   = sbPageBinder.resList[sbPageBinder.index];
		var url   = sbDataSource.getProperty("source", res);
		var title = sbDataSource.getProperty("title", res);
		if ( url.length   > 100 ) url   = url.substring(0,100)   + "...";
		if ( title.length > 100 ) title = title.substring(0,100) + "...";
		var icon = sbDataSource.getProperty("icon", res);
		if ( !icon ) icon = SBcommon.getDefaultIcon(sbDataSource.getProperty("type", res));
		src += '<cite class="scrapbook-header' + opt + '">\n';
		src += '\t<img src="' + icon + '" width="16" height="16">\n';
		src += '\t<span>' + title + '</span>\n';
		src += '\t<a href="' + sbDataSource.getProperty("source", res) + '">' + url + '</a>\n';
		src += '</cite>\n';
		return src;
	},

	surroundDOM : function()
	{
		dump("sbDocumentAnalyzer::surroundDOM\n");
		if ( this.BODY.localName.toUpperCase() != "BODY" )
		{
			alert(sbPageBinder.STRING.getString("CANNOT_COMBINE_FRAMES") + "\n" + sbDataSource.getProperty("title", sbPageBinder.resList[sbPageBinder.index]));
			this.BROWSER.stop();
			window.location.reload();
		}
		var divElem = this.BROWSER.contentDocument.createElement("DIV");
		var bodyStyle = "";
		if ( this.BODY.hasAttribute("class") ) divElem.setAttribute("class", this.BODY.getAttribute("class"));
		if ( this.BODY.hasAttribute("bgcolor") ) bodyStyle += "background-color: " + this.BODY.getAttribute("bgcolor") + ";";
		if ( this.BODY.background ) bodyStyle += "background-image: url('" + this.BODY.background + "');";
		if ( bodyStyle ) divElem.setAttribute("style", bodyStyle);
		this.BROWSER.contentDocument.body.appendChild(divElem);
		var childNodes = this.BODY.childNodes;
		for ( var i = childNodes.length - 2; i >= 0; i-- )
		{
			divElem.insertBefore(childNodes[i], divElem.firstChild);
		}
		divElem.id  = "item" + sbPageBinder.currentID;
		divElem.appendChild(this.BROWSER.contentDocument.createTextNode("\n"));
		return this.BODY.innerHTML;
	},

	surroundCSS : function()
	{
		dump("sbDocumentAnalyzer::surroundCSS\n");
		var ret = "";
		for ( var i = 0; i < this.BROWSER.contentDocument.styleSheets.length; i++ )
		{
			var cssRules = this.BROWSER.contentDocument.styleSheets[i].cssRules;
			for ( var j = 0; j < cssRules.length; j++ )
			{
				var cssText = cssRules[j].cssText;
				cssText = cssText.replace(/^html /,  "");
				cssText = cssText.replace(/^body /,  "");
				cssText = cssText.replace(/^body, /, ", ");
				cssText = cssText.replace(/position: absolute; /, "position: relative; ");
				cssText = "div#item" + sbPageBinder.currentID + " " + cssText;
				ret += this.inspectCSSText(cssText) + "\n";
			}
		}
		return ret + "\n\n";
	},

	inspectCSSText : function(aCSSText)
	{
		var i = 0;
		var RE = new RegExp(/ url\(([^\'\)]+)\)/);
		while ( aCSSText.match(RE) && ++i < 10 )
		{
			aCSSText = aCSSText.replace(RE, " url('./data/" + sbPageBinder.currentID + "/" + RegExp.$1 + "')");
		}
		return aCSSText;
	},

	processDOMRecursively : function(rootNode)
	{
		for ( var curNode = rootNode.firstChild; curNode != null; curNode = curNode.nextSibling )
		{
			if ( curNode.nodeName == "#text" || curNode.nodeName == "#comment" ) continue;
			curNode = this.inspectNode(curNode);
			this.processDOMRecursively(curNode);
		}
	},

	inspectNode : function(aNode)
	{
		switch ( aNode.nodeName.toUpperCase() )
		{
			case "IMG" : case "EMBED" : case "IFRAME" : 
				if ( aNode.src ) aNode.setAttribute("src", aNode.src);
				break;
			case "OBJECT" : 
				if ( aNode.data ) aNode.setAttribute("data", aNode.data);
				break;
			case "BODY" : case "TABLE" : case "TD" : 
				aNode = this.setAbsoluteURL(aNode, "background");
				break;
			case "INPUT" : 
				if ( aNode.type.toLowerCase() == "image" ) aNode = this.setAbsoluteURL(aNode, "src");
				break;
			case "A" : 
			case "AREA" : 
				if ( aNode.href.indexOf("file://") == 0 ) aNode.setAttribute("href", aNode.href);
				break;
		}
		if ( aNode.style && aNode.style.cssText )
		{
			var newCSStext = this.inspectCSSText(aNode.style.cssText);
			if ( newCSStext ) aNode.setAttribute("style", newCSStext);
		}
		return aNode;
	},

	setAbsoluteURL : function(aNode, aAttr)
	{
		if ( aNode.getAttribute(aAttr) )
		{
			aNode.setAttribute(aAttr, SBcommon.resolveURL(this.BROWSER.currentURI.spec, aNode.getAttribute(aAttr)));
		}
		return aNode;
	},

};




sbContentSaver.onCaptureComplete = function(aItem)
{
	dump("sbContentSaver::onCaptureComplete(" + (aItem ? aItem.id : "") + ") [OVERRIDE combine.js]\n");
	sbPageBinder.onCombineComplete(aItem);
	SB_trace(SBstring.getString("CAPTURE_COMPLETE") + " : " + aItem.title);
	SB_fireNotification(aItem);
	setTimeout(function(){ window.close(); }, 500);
}


sbInvisibleBrowser.onStateChange = function(aWebProgress, aRequest, aStateFlags, aStatus)
{
	if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START )
	{
		SB_trace(SBstring.getString("LOADING") + "... " + sbPageBinder.prefix + (++this.fileCount) + " " + sbPageBinder.postfix);
	}
};


