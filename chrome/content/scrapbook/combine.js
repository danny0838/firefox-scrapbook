
var sbCombineService = {

	get WIZARD()  { return document.getElementById("sbCombineWizard"); },
	get STRING()  { return document.getElementById("sbCombineString"); },
	get LISTBOX() { return document.getElementById("sbCombineListbox"); },
	get curID()   { return this.idList[this.index]; },
	get curRes()  { return this.resList[this.index]; },

	index   : 0,
	idList  : [],
	resList : [],
	parList : [],
	option  : {},
	prefix  : "",
	postfix : "",

	init : function()
	{
		gOption = { "script" : true, "format" : true };
		sbDataSource.init();
		sbTreeHandler.init(false);
		this.index = 0;
		this.WIZARD.getButton("back").onclick = function(){ sbCombineService.undo(); };
		this.WIZARD.canAdvance = false;
		sbFolderSelector2.init();
		if ( window.arguments ) setTimeout(function()
		{
			for ( var i = 0; i < window.arguments[0].length; i++ )
			{
				sbCombineService.add(window.arguments[0][i], window.arguments[1][i]);
			}
		}, 0);
	},

	add : function(aRes, aParRes)
	{
		if ( !aRes || !aParRes )
		{
			aRes = sbTreeHandler.resource;
			aParRes = sbTreeHandler.getParentResource(sbTreeHandler.TREE.currentIndex);
		}
		var type = sbDataSource.getProperty(aRes, "type");
		if ( type == "folder" ) return;
		if ( type == "site" ) alert(this.STRING.getString("WARN_ABOUT_INDEPTH"));
		var icon = sbDataSource.getProperty(aRes, "icon");
		if ( !icon ) icon = sbCommonUtils.getDefaultIcon(type);
		var listItem = this.LISTBOX.appendItem(sbDataSource.getProperty(aRes, "title"));
		listItem.setAttribute("class", "listitem-iconic");
		listItem.setAttribute("image", icon);
		this.idList.push(sbDataSource.getProperty(aRes, "id"));
		this.resList.push(aRes);
		this.parList.push(aParRes);
		this.WIZARD.canAdvance = true;
		this.WIZARD.canRewind = true;
	},

	undo : function()
	{
		if ( this.idList.length == 0 || this.WIZARD.currentPage.pageid == "sbCombinePreviewPage" ) return;
		this.LISTBOX.removeItemAt(this.idList.length - 1);
		this.idList.pop();
		this.resList.pop();
		this.parList.pop();
		if ( this.idList.length == 0 )
		{
			this.WIZARD.canAdvance = false;
			this.WIZARD.canRewind = false;
		}
	},

	next : function()
	{
		if ( this.index < this.idList.length )
		{
			this.prefix  = "(" + (this.index + 1) + "/" + this.idList.length + ") ";
			this.postfix = sbDataSource.getProperty(this.resList[this.index], "title");
			var type = sbDataSource.getProperty(this.resList[this.index], "type");
			if  ( type == "file" || type == "bookmark" )
				sbPageCombiner.exec(type);
			else
				sbInvisibleBrowser.load(sbCommonUtils.getBaseHref(sbDataSource.data.URI) + "data/" + this.curID + "/index.html");
		}
		else
		{
			this.prefix  = "";
			this.postfix = "combine.html";
			this.donePreview();
		}
	},

	initPreview : function()
	{
		this.WIZARD.canRewind = false;
		this.WIZARD.canAdvance = false;
		this.WIZARD.getButton("finish").label = this.STRING.getString("FINISH_BUTTON_LABEL");
		this.WIZARD.getButton("finish").disabled = true;
		this.option["R"] = document.getElementById("sbCombineOptionR").checked;
		sbInvisibleBrowser.init();
		sbInvisibleBrowser.ELEMENT.removeEventListener("load", sbInvisibleBrowser.onload, true);
		sbInvisibleBrowser.onload = function(){ sbPageCombiner.exec(); };
		sbInvisibleBrowser.ELEMENT.addEventListener("load", sbInvisibleBrowser.onload, true);
		this.next();
	},

	donePreview : function()
	{
		var htmlFile = sbCommonUtils.getScrapBookDir();
		htmlFile.append("combine.html");
		sbCommonUtils.writeFile(htmlFile, sbPageCombiner.htmlSrc, "UTF-8");
		var cssFile = sbCommonUtils.getScrapBookDir();
		cssFile.append("combine.css");
		sbCommonUtils.writeFile(cssFile, sbPageCombiner.cssText, "UTF-8");
		sbInvisibleBrowser.refreshEvent(function(){ sbCombineService.showBrowser(); });
		sbInvisibleBrowser.load(sbCommonUtils.convertFilePathToURL(htmlFile.path));
	},

	showBrowser : function()
	{
		this.toggleElements(false);
		sbInvisibleBrowser.ELEMENT.onclick = function(aEvent){ aEvent.preventDefault(); };
		this.WIZARD.getButton("finish").disabled = false;
		this.WIZARD.getButton("finish").onclick = function(){ sbCombineService.finish(); };
	},

	finish : function()
	{
		this.WIZARD.getButton("finish").disabled = true;
		this.toggleElements(true);
		SB_trace(sbCaptureTask.STRING.getString("CAPTURE_START"));
		setTimeout(function(){ sbContentSaver.captureWindow(sbInvisibleBrowser.ELEMENT.contentWindow, false, false, sbFolderSelector2.selection, 0, null); }, 0);
	},

	toggleElements : function(isProgressMode)
	{
		sbInvisibleBrowser.ELEMENT.collapsed = isProgressMode;
		document.getElementById("sbCaptureTextbox").collapsed = !isProgressMode;
	},

	onCombineComplete : function(aItem)
	{
		var newRes = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + aItem.id);
		sbDataSource.setProperty(newRes, "type", "combine");
		sbDataSource.setProperty(newRes, "source", sbDataSource.getProperty(this.resList[0], "source"));
		var newIcon = sbDataSource.getProperty(this.resList[0], "icon");
		if ( newIcon.match(/\d{14}/) ) newIcon = "resource://scrapbook/data/" + aItem.id + "/" + sbCommonUtils.getFileName(newIcon);
		sbDataSource.setProperty(newRes, "icon", newIcon);
		var newComment = "";
		for ( var i = 0; i < this.resList.length; i++ )
		{
			var comment = sbDataSource.getProperty(this.resList[i], "comment");
			if ( comment ) newComment += comment + " __BR__ ";
		}
		if ( newComment ) sbDataSource.setProperty(newRes, "comment", newComment);
	},

};




var sbPageCombiner = {

	get BROWSER(){ return document.getElementById("sbCaptureBrowser"); },
	get BODY()   { return this.BROWSER.contentDocument.body; },

	htmlSrc : "",
	cssText : "",
	offsetTop : 0,
	isTargetCombined : false,

	exec : function(aType)
	{
		this.isTargetCombined = false;
		if ( sbCombineService.index == 0 )
		{
			this.htmlSrc += '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">';
			this.htmlSrc += '<html><head>';
			this.htmlSrc += '<meta http-equiv="Content-Type" content="text/html;Charset=UTF-8">';
			this.htmlSrc += '<meta http-equiv="Content-Style-Type" content="text/css">';
			this.htmlSrc += '<title>' + sbDataSource.getProperty(sbCombineService.curRes, "title") + '</title>';
			this.htmlSrc += '<link rel="stylesheet" href="combine.css" media="all">';
			this.htmlSrc += '<link rel="stylesheet" href="chrome://scrapbook/skin/combine.css" media="all">';
			this.htmlSrc += '<link rel="stylesheet" href="chrome://scrapbook/skin/annotation.css" media="all">';
			this.htmlSrc += '</head><body>\n';
		}
		if ( aType == "file" || aType == "bookmark" )
		{
			this.htmlSrc += this.getCiteHTML(aType);
		}
		else
		{
			this.processDOMRecursively(this.BROWSER.contentDocument.body);
			if ( !this.isTargetCombined ) this.htmlSrc += this.getCiteHTML(aType);
			this.htmlSrc += this.surroundDOM();
			this.cssText += this.surroundCSS();
			this.offsetTop += this.BROWSER.contentDocument.body.offsetHeight;
		}
		if ( sbCombineService.index == sbCombineService.idList.length - 1 )
		{
			this.htmlSrc += '\n</body>\n</html>\n';
		}
		sbCombineService.index++;
		sbCombineService.next();
	},

	getCiteHTML : function(aType)
	{
		var src   = '\n<!--' + sbCombineService.postfix + '-->\n';
		var title = sbCommonUtils.crop(sbDataSource.getProperty(sbCombineService.curRes, "title") , 100);
		var linkURL = "";
		switch ( aType )
		{
			case "file" :
				var htmlFile = sbCommonUtils.getContentDir(sbCombineService.curID);
				htmlFile.append("index.html");
				var isMatch = sbCommonUtils.readFile(htmlFile).match(/URL=\.\/([^\"]+)\"/);
				if ( isMatch ) linkURL = "./data/" + sbCombineService.curID + "/" + RegExp.$1;
				break;
			case "note" :
				linkURL = ""; break;
			default :
				linkURL = sbDataSource.getProperty(sbCombineService.curRes, "source"); break;
		}
		var icon = sbDataSource.getProperty(sbCombineService.curRes, "icon");
		if ( !icon ) icon = sbCommonUtils.getDefaultIcon(aType);
		if ( icon.indexOf("resource://") == 0 && icon.indexOf(sbCombineService.curID) > 0 )
		{
			icon = "./data/" + sbCombineService.curID + "/" + sbCommonUtils.getFileName(icon);
		}
		src += '<cite class="scrapbook-header' + '">\n';
		src += '\t<img src="' + icon + '" width="16" height="16">\n';
		src += '\t' + (linkURL ? '<a href="' + linkURL + '">' + title + '</a>' : title) + '\n';
		src += '</cite>\n';
		return src;
	},

	surroundDOM : function()
	{
		if ( this.BODY.localName.toUpperCase() != "BODY" )
		{
			alert(sbCombineService.STRING.getString("CANNOT_COMBINE_FRAMES") + "\n" + sbDataSource.getProperty(sbCombineService.curRes, "title"));
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
			var nodeName  = childNodes[i].nodeName.toUpperCase();
			if ( nodeName == "DIV" && childNodes[i].hasAttribute("class") && childNodes[i].getAttribute("class") == "scrapbook-sticky" )
				childNodes[i].style.top = (parseInt(childNodes[i].style.top) + this.offsetTop) + "px";
			else if ( nodeName == "CITE" && childNodes[i].hasAttribute("class") && childNodes[i].getAttribute("class") == "scrapbook-header" ) continue;
			else if ( nodeName == "DIV"  && childNodes[i].id.match(/^item\d{14}$/) ) continue;
			divElem.insertBefore(childNodes[i], divElem.firstChild);
		}
		divElem.id  = "item" + sbCombineService.curID;
		divElem.appendChild(this.BROWSER.contentDocument.createTextNode("\n"));
		return this.BODY.innerHTML;
	},

	surroundCSS : function()
	{
		var ret = "";
		for ( var i = 0; i < this.BROWSER.contentDocument.styleSheets.length; i++ )
		{
			if ( this.BROWSER.contentDocument.styleSheets[i].href.indexOf("chrome") == 0 ) continue;
			var cssRules = this.BROWSER.contentDocument.styleSheets[i].cssRules;
			for ( var j = 0; j < cssRules.length; j++ )
			{
				var cssText = cssRules[j].cssText;
				if ( !this.isTargetCombined )
				{
					cssText = cssText.replace(/^html /,  "");
					cssText = cssText.replace(/^body /,  "");
					cssText = cssText.replace(/^body, /, ", ");
					cssText = cssText.replace(/position: absolute; /, "position: relative; ");
					cssText = "div#item" + sbCombineService.curID + " " + cssText;
				}
				var blanketLR = cssText.split("{");
				if ( blanketLR[0].indexOf(",") > 0 )
				{
					blanketLR[0] = blanketLR[0].replace(/,/g, ", div#item" + sbCombineService.curID);
					cssText = blanketLR.join("{");
				}
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
			aCSSText = aCSSText.replace(RE, " url('./data/" + sbCombineService.curID + "/" + RegExp.$1 + "')");
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
			case "CITE" : 
				if ( aNode.hasAttribute("class") && aNode.getAttribute("class") == "scrapbook-header" ) this.isTargetCombined = true;
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
			aNode.setAttribute(aAttr, sbCommonUtils.resolveURL(this.BROWSER.currentURI.spec, aNode.getAttribute(aAttr)));
		}
		return aNode;
	},

};




sbCaptureObserverCallback.onCaptureComplete = function(aItem)
{
	sbCombineService.onCombineComplete(aItem);
	SB_trace(sbCaptureTask.STRING.getString("CAPTURE_COMPLETE") + " : " + aItem.title);
	if ( sbCombineService.option["R"] )
	{
		if ( sbCombineService.resList.length != sbCombineService.parList.length ) return;
		var rmIDs = sbController.removeInternal(sbCombineService.resList, sbCombineService.parList);
		if ( rmIDs ) SB_trace(sbMainService.STRING.getFormattedString("ITEMS_REMOVED", [rmIDs.length]));
	}
	SB_fireNotification(aItem);
	setTimeout(function(){ window.close(); }, 500);
}


sbInvisibleBrowser.onStateChange = function(aWebProgress, aRequest, aStateFlags, aStatus)
{
	if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START )
	{
		SB_trace(sbCaptureTask.STRING.getString("LOADING") + "... " + sbCombineService.prefix + (++this.fileCount) + " " + sbCombineService.postfix);
	}
};


