
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
		gOption = { "script" : true, "images" : true };
		if ( window.top.location.href != "chrome://scrapbook/content/manage.xul" )
		{
			document.documentElement.collapsed = true;
			return;
		}
		window.top.document.getElementById("mbToolbarButton").disabled = true;
		this.index = 0;
		sbFolderSelector2.init();
		this.WIZARD.getButton("back").onclick = function(){ sbCombineService.undo(); };
		this.WIZARD.getButton("cancel").hidden = true;
		this.updateButtons();
	},

	done : function()
	{
		window.top.document.getElementById("mbToolbarButton").disabled = false;
	},

	add : function(aRes, aParRes)
	{
		if ( this.resList.indexOf(aRes) != -1 ) return;
		var type = ScrapBookData.getProperty(aRes, "type");
		if (type == "folder" || type == "separator")
			return;
		if (type == "site")
			ScrapBookUtils.alert(this.STRING.getString("WARN_ABOUT_INDEPTH2"));
		var icon = ScrapBookData.getProperty(aRes, "icon");
		if ( !icon ) icon = ScrapBookUtils.getDefaultIcon(type);
		var listItem = this.LISTBOX.appendItem(ScrapBookData.getProperty(aRes, "title"));
		listItem.setAttribute("class", "listitem-iconic");
		listItem.setAttribute("image", icon);
		this.idList.push(ScrapBookData.getProperty(aRes, "id"));
		this.resList.push(aRes);
		this.parList.push(aParRes);
		this.updateButtons();
	},

	undo : function()
	{
		if ( this.idList.length == 0 ) return;
		this.LISTBOX.removeItemAt(this.idList.length - 1);
		this.idList.pop();
		this.resList.pop();
		this.parList.pop();
		this.updateButtons();
	},

	updateButtons : function()
	{
		this.WIZARD.canRewind  = this.idList.length > 0;
		this.WIZARD.canAdvance = this.idList.length > 1;
	},

	initPreview : function()
	{
		this.WIZARD.canRewind = false;
		this.WIZARD.canAdvance = false;
		this.WIZARD.getButton("back").onclick = null;
		this.WIZARD.getButton("finish").label = this.STRING.getString("FINISH_BUTTON_LABEL");
		this.WIZARD.getButton("finish").disabled = true;
		this.option["R"] = document.getElementById("sbCombineOptionRemove").checked;
		sbInvisibleBrowser.init();
		sbInvisibleBrowser.ELEMENT.removeEventListener("load", sbInvisibleBrowser.onload, true);
		sbInvisibleBrowser.onload = function(){
			// onload may be fired many times when a document is loaded
			if (sbInvisibleBrowser.ELEMENT.currentURI.spec !== sbInvisibleBrowser.loading) return;
			sbInvisibleBrowser.loading = false;
			sbPageCombiner.exec();
		};
		sbInvisibleBrowser.ELEMENT.addEventListener("load", sbInvisibleBrowser.onload, true);
		this.next();
	},

	next : function()
	{
		if ( this.index < this.idList.length )
		{
			this.prefix  = "(" + (this.index + 1) + "/" + this.idList.length + ") ";
			this.postfix = ScrapBookData.getProperty(this.resList[this.index], "title");
			var type = ScrapBookData.getProperty(this.resList[this.index], "type");
			if  ( type == "file" || type == "bookmark" )
				sbPageCombiner.exec(type);
			else
				sbInvisibleBrowser.load(ScrapBookUtils.getBaseHref(ScrapBookData.dataSource.URI) + "data/" + this.curID + "/index.html");
		}
		else
		{
			this.prefix  = "";
			this.postfix = "combine.html";
			this.donePreview();
		}
	},

	donePreview : function()
	{
		var htmlFile = ScrapBookUtils.getScrapBookDir();
		htmlFile.append("combine.html");
		ScrapBookUtils.writeFile(htmlFile, sbPageCombiner.htmlSrc, "UTF-8");
		var cssFile = ScrapBookUtils.getScrapBookDir();
		cssFile.append("combine.css");
		ScrapBookUtils.writeFile(cssFile, sbPageCombiner.cssText, "UTF-8");
		sbInvisibleBrowser.refreshEvent(function(){ sbCombineService.showBrowser(); });
		sbInvisibleBrowser.load(ScrapBookUtils.convertFilePathToURL(htmlFile.path));
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
		SB_trace(sbCaptureTask.STRING.getString("SAVE_START"));
		setTimeout(function(){ sbContentSaver.captureWindow(sbInvisibleBrowser.ELEMENT.contentWindow, false, false, sbFolderSelector2.resURI, 0, null); }, 0);
	},

	toggleElements : function(isProgressMode)
	{
		sbInvisibleBrowser.ELEMENT.collapsed = isProgressMode;
		document.getElementById("sbCaptureTextbox").collapsed = !isProgressMode;
	},

	onCombineComplete : function(aItem)
	{
		var newRes = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + aItem.id);
		ScrapBookData.setProperty(newRes, "type", "combine");
		ScrapBookData.setProperty(newRes, "source", ScrapBookData.getProperty(this.resList[0], "source"));
		var newIcon = ScrapBookData.getProperty(this.resList[0], "icon");
		if ( newIcon.match(/\d{14}/) ) newIcon = "resource://scrapbook/data/" + aItem.id + "/" + ScrapBookUtils.getFileName(newIcon);
		ScrapBookData.setProperty(newRes, "icon", newIcon);
		var newComment = "";
		for ( var i = 0; i < this.resList.length; i++ )
		{
			var comment = ScrapBookData.getProperty(this.resList[i], "comment");
			if ( comment ) newComment += comment + " __BR__ ";
		}
		if ( newComment ) ScrapBookData.setProperty(newRes, "comment", newComment);
		return newRes;
	},

	onDragOver: function(event) {
		if (event.dataTransfer.types.contains("moz/rdfitem"))
			event.preventDefault();
	},

	onDrop: function(event) {
		event.preventDefault();
		if (!event.dataTransfer.types.contains("moz/rdfitem"))
			return;
		var idxs = window.top.sbTreeUI.getSelection(false, 2);
		idxs.forEach(function(idx) {
			var res    = window.top.sbTreeUI.TREE.builderView.getResourceAtIndex(idx);
			var parRes = window.top.sbTreeUI.getParentResource(idx);
			sbCombineService.add(res, parRes);
		});
	},

};




var sbPageCombiner = {

	get BROWSER(){ return document.getElementById("sbCaptureBrowser"); },
	get BODY()   { return this.BROWSER.contentDocument.body; },

	htmlSrc : "",
	cssText : "",
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
			this.htmlSrc += '<title>' + ScrapBookData.getProperty(sbCombineService.curRes, "title") + '</title>';
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
		var title = ScrapBookUtils.crop(ScrapBookData.getProperty(sbCombineService.curRes, "title") , 100);
		var linkURL = "";
		switch ( aType )
		{
			case "file" :
				var htmlFile = ScrapBookUtils.getContentDir(sbCombineService.curID);
				htmlFile.append("index.html");
				var isMatch = ScrapBookUtils.readFile(htmlFile).match(/URL=\.\/([^\"]+)\"/);
				if ( isMatch ) linkURL = "./data/" + sbCombineService.curID + "/" + RegExp.$1;
				break;
			case "note" :
				linkURL = ""; break;
			default :
				linkURL = ScrapBookData.getProperty(sbCombineService.curRes, "source"); break;
		}
		var icon = ScrapBookData.getProperty(sbCombineService.curRes, "icon");
		if ( !icon ) icon = ScrapBookUtils.getDefaultIcon(aType);
		if ( icon.indexOf("resource://") == 0 && icon.indexOf(sbCombineService.curID) > 0 )
		{
			icon = "./data/" + sbCombineService.curID + "/" + ScrapBookUtils.getFileName(icon);
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
			ScrapBookUtils.alert(
				sbCombineService.STRING.getString("CANNOT_COMBINE_FRAMES") + "\n" + 
				ScrapBookData.getProperty(sbCombineService.curRes, "title")
			);
			this.BROWSER.stop();
			window.location.reload();
		}
		var divElem = this.BROWSER.contentDocument.createElement("DIV");
		var bodyStyle = "";
		if ( this.BODY.hasAttribute("class") ) divElem.setAttribute("class", this.BODY.getAttribute("class"));
		if ( this.BODY.hasAttribute("bgcolor") ) bodyStyle += "background-color: " + this.BODY.getAttribute("bgcolor") + ";";
		if ( this.BODY.background ) bodyStyle += "background-image: url('" + this.BODY.background + "');";
		bodyStyle += "position: relative;";
		divElem.setAttribute("style", bodyStyle);
		this.BROWSER.contentDocument.body.appendChild(divElem);
		var childNodes = this.BODY.childNodes;
		for ( var i = childNodes.length - 2; i >= 0; i-- )
		{
			var nodeName  = childNodes[i].nodeName.toUpperCase();
			if ( nodeName == "CITE" && childNodes[i].hasAttribute("class") && childNodes[i].getAttribute("class") == "scrapbook-header" ) continue;
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
			aNode.setAttribute(aAttr, ScrapBookUtils.resolveURL(this.BROWSER.currentURI.spec, aNode.getAttribute(aAttr)));
		}
		return aNode;
	},

};




sbCaptureObserverCallback.onCaptureComplete = function(aItem)
{
	var newRes = sbCombineService.onCombineComplete(aItem);
	if ( sbCombineService.option["R"] )
	{
		if ( sbCombineService.resList.length != sbCombineService.parList.length ) return;
		var rmIDs = window.top.sbController.removeInternal(sbCombineService.resList, sbCombineService.parList);
		if ( rmIDs ) SB_trace(ScrapBookUtils.getLocaleString("ITEMS_REMOVED", [rmIDs.length]));
	}
	SB_fireNotification(aItem);
	setTimeout(function()
	{
		window.top.sbManageUI.toggleRightPane("sbToolbarCombine");
		window.top.sbMainUI.locate(newRes);
	}, 500);
}


sbInvisibleBrowser.onStateChange = function(aWebProgress, aRequest, aStateFlags, aStatus)
{
	if ( aStateFlags & Ci.nsIWebProgressListener.STATE_START )
	{
		SB_trace(sbCaptureTask.STRING.getString("LOADING") + "... " + sbCombineService.prefix + (++this.fileCount) + " " + sbCombineService.postfix);
	}
};



