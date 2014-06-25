
var sbCommonUtils;
var sbDataSource;

var sbCombineService = {


	get WIZARD()  { return document.getElementById("sbCombineWizard"); },
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

	dropObserver : 
	{
		getSupportedFlavours : function()
		{
			var flavours = new FlavourSet();
			flavours.appendFlavour("moz/rdfitem");
			return flavours;
		},
		onDragOver : function(event, flavour, session) {},
		onDragExit : function(event, session) {},
		onDrop     : function(event, transferData, session)
		{
			var idxList = window.top.sbTreeHandler.getSelection(false, 2);
			idxList.forEach(function(aIdx)
			{
				var res    = window.top.sbTreeHandler.TREE.builderView.getResourceAtIndex(aIdx);
				var parRes = window.top.sbTreeHandler.getParentResource(aIdx);
				sbCombineService.add(res, parRes);
			});
		},
	},


	init : function()
	{
		//Block wird benötigt, um Korrekturen bei fehlerhafter Zusammenstellung zu erlauben
		this.toggleElements(true);
		//Ende Block
		gOption = { "script" : true, "images" : true };
		if ( window.top.location.href != "chrome://scrapbook/content/manage.xul" )
		{
			document.documentElement.collapsed = true;
			return;
		}
		window.top.document.getElementById("mbToolbarButton").disabled = true;
		sbCommonUtils = window.top.sbCommonUtils;
		sbDataSource  = window.top.sbDataSource;
		this.index = 0;
		sbFolderSelector2.init();
//		this.WIZARD.getButton("back").onclick = function(){ sbCombineService.undo(); };
		this.WIZARD.getButton("back").hidden = true;
//		this.WIZARD.getButton("cancel").hidden = true;
		this.WIZARD.getButton("cancel").onclick = function(){ sbCombineService.abort(); };
		this.toggleButtons();
		this.updateButtons();
	},

	done : function()
	{
		window.top.document.getElementById("mbToolbarButton").disabled = false;
	},

	add : function(aRes, aParRes)
	{
		if ( this.resList.indexOf(aRes) != -1 ) return;
		var type = sbDataSource.getProperty(aRes, "type");
		if (type == "folder" || type == "separator")
			return;
		if (type == "site")
			alert(sbCommonUtils.lang("combine", "WARN_ABOUT_INDEPTH"));
		var icon = sbDataSource.getProperty(aRes, "icon");
		if ( !icon ) icon = sbCommonUtils.getDefaultIcon(type);
		var listItem = this.LISTBOX.appendItem(sbDataSource.getProperty(aRes, "title"));
		listItem.setAttribute("class", "listitem-iconic");
		listItem.setAttribute("image", icon);
		this.idList.push(sbDataSource.getProperty(aRes, "id"));
		this.resList.push(aRes);
		this.parList.push(aParRes);
		this.toggleButtons();
		this.updateButtons();
	},
/*
	undo : function()
	{
		if ( this.idList.length == 0 ) return;
		this.LISTBOX.removeItemAt(this.idList.length - 1);
		this.idList.pop();
		this.resList.pop();
		this.parList.pop();
		this.updateButtons();
	},
*/
	updateButtons : function()
	{
		this.WIZARD.canRewind  = this.idList.length > 0;
		this.WIZARD.canAdvance = this.idList.length > 1;
	},

	initPreview : function()
	{
//		this.WIZARD.canRewind = false;
		this.WIZARD.canAdvance = false;
//		this.WIZARD.getButton("back").onclick = null;
		this.WIZARD.getButton("back").hidden = false;
		this.WIZARD.getButton("back").disabled = true;
		this.WIZARD.getButton("finish").label = sbCommonUtils.lang("combine", "FINISH_BUTTON_LABEL");
		this.WIZARD.getButton("finish").disabled = true;
		this.WIZARD.getButton("cancel").hidden = false;
		this.WIZARD.getButton("cancel").disabled = true;
//		this.WIZARD.getButton("cancel").onclick = function(){ sbCombineService.abort(); };
		this.option["R"] = document.getElementById("sbCombineOptionRemove").checked;
		//Werte müssen initialisiert werden, damit es beim erneuten Laden nicht zu doppelt geladenem Inhalt kommt
		sbPageCombiner.htmlSrc = "";
		sbPageCombiner.cssText = "";
		sbPageCombiner.offsetTop = 0;
		sbPageCombiner.isTargetCombined = false;
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
			this.postfix = sbDataSource.getProperty(this.resList[this.index], "title");
			var type = sbDataSource.getProperty(this.resList[this.index], "type");
			if  ( type == "file" || type == "bookmark" )
			{
				sbPageCombiner.exec(type);
			} else
			{
				sbInvisibleBrowser.load(sbCommonUtils.getBaseHref(sbDataSource.data.URI) + "data/" + this.curID + "/index.html");
			}
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
		this.WIZARD.getButton("back").disabled = false;
		this.WIZARD.getButton("finish").disabled = false;
		this.WIZARD.getButton("finish").onclick = function(){ sbCombineService.finish(); };
		this.WIZARD.getButton("cancel").disabled = false;
	},

	abort : function()
	{
		this.WIZARD.getButton("back").disabled = true;
		this.WIZARD.getButton("finish").disabled = true;
		this.WIZARD.getButton("cancel").disabled = true;
		setTimeout(function()
		{
			window.top.sbManageService.toggleRightPane("sbToolbarCombine");
		}, 500);
	},

	finish : function()
	{
		this.WIZARD.getButton("finish").disabled = true;
		this.WIZARD.getButton("cancel").disabled = true;
		this.option["R"] = document.getElementById("sbCombineOptionRemove").checked;
		this.toggleElements(true);
		SB_trace(sbCommonUtils.lang("capture", "CAPTURE_START"));
//alert("--"+document.getElementById("sbpTitleTextbox").value+"--");
		if ( document.getElementById("sbpTitleTextbox").value == "" )
		{
			setTimeout(function(){ sbContentSaver.captureWindow(sbInvisibleBrowser.ELEMENT.contentWindow, false, false, sbFolderSelector2.resURI, 0, null); }, 0);
		} else
		{
			setTimeout(function(){ sbContentSaver.captureWindow(sbInvisibleBrowser.ELEMENT.contentWindow, false, false, sbFolderSelector2.resURI, 0, null, null, document.getElementById("sbpTitleTextbox").value); }, 0);
		}
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
		return newRes;
	},

	deleteItem : function()
	{
		//Index festhalten
		var diIndex = this.LISTBOX.selectedIndex;
		var diCount = this.LISTBOX.getRowCount();
		var diVorher = "";
		var diNachhr = "";
		//Eintrag aus Listbox entfernen
		this.LISTBOX.removeItemAt(diIndex);
		//this.idList aktualisieren
		this.idList.splice(diIndex, 1);
		//this.resList aktualisieren
		this.resList.splice(diIndex, 1);
		//this.parList aktualisieren
		this.parList.splice(diIndex, 1);
		this.toggleButtons();
		this.updateButtons();
	},

	moveDown : function()
	{
		var mdIndex = this.LISTBOX.selectedIndex;
		//Reihenfolge ändern
		var mdPuffer = this.idList[mdIndex];
		this.idList[mdIndex] = this.idList[mdIndex+1];
		this.idList[mdIndex+1] = mdPuffer;
		var mdPuffer = this.resList[mdIndex];
		this.resList[mdIndex] = this.resList[mdIndex+1];
		this.resList[mdIndex+1] = mdPuffer;
		var mdPuffer = this.parList[mdIndex];
		this.parList[mdIndex] = this.parList[mdIndex+1];
		this.parList[mdIndex+1] = mdPuffer;
		var mdItem = this.LISTBOX.removeItemAt(mdIndex);
		var mdNewItem = this.LISTBOX.insertItemAt( mdIndex+1, mdItem.getAttribute("label") );
		this.LISTBOX.selectItem(mdNewItem);
		mdNewItem.setAttribute("class", "listitem-iconic");
		mdNewItem.setAttribute("image", mdItem.getAttribute("image"));
		this.toggleButtons();
	},

	moveUp : function()
	{
		//Index bestimmen
		var muIndex = this.LISTBOX.selectedIndex;
		//Reihenfolge ändern
		var muPuffer = this.idList[muIndex];
		this.idList[muIndex] = this.idList[muIndex-1];
		this.idList[muIndex-1] = muPuffer;
		var muPuffer = this.resList[muIndex];
		this.resList[muIndex] = this.resList[muIndex-1];
		this.resList[muIndex-1] = muPuffer;
		var muPuffer = this.parList[muIndex];
		this.parList[muIndex] = this.parList[muIndex-1];
		this.parList[muIndex-1] = muPuffer;
		var muItem = this.LISTBOX.removeItemAt(muIndex);
		var muNewItem = this.LISTBOX.insertItemAt( muIndex-1, muItem.getAttribute("label") );
		this.LISTBOX.selectItem(muNewItem);
		muNewItem.setAttribute("class", "listitem-iconic");
		muNewItem.setAttribute("image", muItem.getAttribute("image"));
		this.toggleButtons();
	},

	toggleButtons : function()
	{
		var tbIndex = this.LISTBOX.selectedIndex;
		var tbEintraege = this.LISTBOX.getRowCount();
		if ( tbEintraege>1 )
		{
			switch ( tbIndex )
			{
				case -1:
					document.getElementById("sbpUp").disabled = true;
					document.getElementById("sbpDown").disabled = true;
					document.getElementById("sbpDelete").disabled = true;
					document.getElementById("sbpUp").setAttribute("image", "chrome://scrapbook/skin/sbpExtra/expander_up_dis.png");
					document.getElementById("sbpDown").setAttribute("image", "chrome://scrapbook/skin/sbpExtra/expander_down_dis.png");
					document.getElementById("sbpDelete").setAttribute("image", "chrome://scrapbook/skin/sbpExtra/menu_remove_dis.png");
					break;
				case 0:
					document.getElementById("sbpUp").disabled = true;
					document.getElementById("sbpDown").disabled = false;
					document.getElementById("sbpDelete").disabled = false;
					document.getElementById("sbpUp").setAttribute("image", "chrome://scrapbook/skin/sbpExtra/expander_up_dis.png");
					document.getElementById("sbpDown").setAttribute("image", "chrome://scrapbook/skin/expander_down.png");
					document.getElementById("sbpDelete").setAttribute("image", "chrome://scrapbook/skin/menu_remove.png");
					break;
				case tbEintraege-1:
					document.getElementById("sbpUp").disabled = false;
					document.getElementById("sbpDown").disabled = true;
					document.getElementById("sbpDelete").disabled = false;
					document.getElementById("sbpUp").setAttribute("image", "chrome://scrapbook/skin/expander_up.png");
					document.getElementById("sbpDown").setAttribute("image", "chrome://scrapbook/skin/sbpExtra/expander_down_dis.png");
					document.getElementById("sbpDelete").setAttribute("image", "chrome://scrapbook/skin/menu_remove.png");
					break;
				default:
					document.getElementById("sbpUp").disabled = false;
					document.getElementById("sbpDown").disabled = false;
					document.getElementById("sbpDelete").disabled = false;
					document.getElementById("sbpUp").setAttribute("image", "chrome://scrapbook/skin/expander_up.png");
					document.getElementById("sbpDown").setAttribute("image", "chrome://scrapbook/skin/expander_down.png");
					document.getElementById("sbpDelete").setAttribute("image", "chrome://scrapbook/skin/menu_remove.png");
					break;
			}
		} else
		{
			//Da keine Einträge vorhanden sind, kann auch nichts gemacht werden. Daher können sämtliche Knöpfe deaktiviert werden
			document.getElementById("sbpUp").disabled = true;
			document.getElementById("sbpDown").disabled = true;
			document.getElementById("sbpUp").setAttribute("image", "chrome://scrapbook/skin/sbpExtra/expander_up_dis.png");
			document.getElementById("sbpDown").setAttribute("image", "chrome://scrapbook/skin/sbpExtra/expander_down_dis.png");
			if ( tbIndex > -1 )
			{
				document.getElementById("sbpDelete").disabled = false;
				document.getElementById("sbpDelete").setAttribute("image", "chrome://scrapbook/skin/menu_remove.png");
			} else
			{
				document.getElementById("sbpDelete").disabled = true;
				document.getElementById("sbpDelete").setAttribute("image", "chrome://scrapbook/skin/sbpExtra/menu_remove_dis.png");
			}
		}
	},
};




var sbPageCombiner = {

	get BROWSER(){ return document.getElementById("sbCaptureBrowser"); },
	get BODY()   { return this.BROWSER.contentDocument.body; },

	htmlSrc : "",
	cssText : "",
	isTargetCombined : false,
	htmlId: "",
	bodyId: "",

	exec : function(aType)
	{
		this.isTargetCombined = false;
		if ( sbCombineService.index == 0 )
		{
			this.htmlSrc += '<!DOCTYPE html>' + '\n' +
				'<html>' + '\n' +
				'<head>' + '\n' +
				'<meta charset="UTF-8">' + '\n' +
				'<title>' + sbDataSource.getProperty(sbCombineService.curRes, "title") + '</title>' + '\n' +
				'<link rel="stylesheet" href="combine.css" media="all">' +
				'<link rel="stylesheet" href="chrome://scrapbook/skin/combine.css" media="all">' + '\n' +
				'<link rel="stylesheet" href="chrome://scrapbook/skin/annotation.css" media="all">' + '\n' +
				'</head>' + '\n' +
				'<body>' + '\n';
		}
		if ( aType == "file" || aType == "bookmark" )
		{
			this.htmlSrc += this.getCiteHTML(aType);
		}
		else
		{
			this.cssText += this.surroundCSS();
			this.processDOMRecursively(this.BODY);
			if ( this.isTargetCombined ) {
				this.htmlSrc += this.BODY.innerHTML;
			}
			else {
				this.htmlSrc += this.getCiteHTML(aType);
				this.htmlSrc += this.surroundDOM();
			}
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
		// add a thin space between "--" in the comment to prevent exploits
		var src   = '\n<!--' + sbCombineService.postfix.replace(/--/g, "- -") + '-->\n';
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
			alert(sbCommonUtils.lang("combine", "CANNOT_COMBINE_FRAMES", [sbDataSource.getProperty(sbCombineService.curRes, "title")]));
			this.BROWSER.stop();
			window.location.reload();
		}
		var divWrap = this.BROWSER.contentDocument.createElement("DIV");
		divWrap.id = "item" + sbCombineService.curID;
		var divHTML = this.BROWSER.contentDocument.createElement("DIV");
		var attrs = this.BROWSER.contentDocument.getElementsByTagName("html")[0].attributes;
		for (var i = 0; i < attrs.length; i++) {
			divHTML.setAttribute(attrs[i].name, attrs[i].value);
		}
		divHTML.id = "item" + sbCombineService.curID + "html";
		var divBody = this.BROWSER.contentDocument.createElement("DIV");
		var attrs = this.BODY.attributes;
		for (var i = 0; i < attrs.length; i++) {
			divBody.setAttribute(attrs[i].name, attrs[i].value);
		}
		divBody.id = "item" + sbCombineService.curID + "body";
		divBody.innerHTML = this.BODY.innerHTML;
		divHTML.appendChild(divBody);
		divWrap.appendChild(this.BROWSER.contentDocument.createTextNode("\n"));
		divWrap.appendChild(divHTML);
		divWrap.appendChild(this.BROWSER.contentDocument.createTextNode("\n"));
		return sbCommonUtils.getOuterHTML(divWrap);
	},

	surroundCSS : function()
	{
		this.htmlId = this.BROWSER.contentDocument.getElementsByTagName("html")[0].id;
		this.bodyId = this.BODY.id;
		var ret = "";
		for ( var i = 0; i < this.BROWSER.contentDocument.styleSheets.length; i++ )
		{
			ret += this.processCSSRecursively(this.BROWSER.contentDocument.styleSheets[i]);
		}
		return ret + "\n\n";
	},

	processCSSRecursively : function(aCSS)
	{
		var ret = "";
		if ( aCSS.href && aCSS.href.indexOf("chrome://") == 0 ) return ret;
		var cssRules = aCSS.cssRules;
		for ( var i = 0; i < cssRules.length; i++ )
		{
			var cssRule = cssRules[i];
			var cssText = "";
			if (this.isTargetCombined) {
				cssText = cssRule.cssText;
			}
			else if (cssRule.type == Components.interfaces.nsIDOMCSSRule.STYLE_RULE) {
				cssText = this.remapCSSSelector(cssRule.selectorText) + "{" + cssRule.style.cssText + "}";
			}
			else if (cssRule.type == Components.interfaces.nsIDOMCSSRule.MEDIA_RULE) {
				cssText = "@media " + cssRule.conditionText + "{\n" + this.processCSSRecursively(cssRule) + "\n}";
			}
			else {
				cssText = cssRule.cssText;
			}
			ret += this.inspectCSSText(cssText, aCSS.href) + "\n";
		}
		return ret;
	},

	remapCSSSelector : function(selectorText)
	{
		var htmlId = this.htmlId;
		var bodyId = this.bodyId;
		var id = "item" + sbCombineService.curID;
		var canBeElement = true;
		var canBeId = false;
		var ret = "#" + id + " " + selectorText.replace(
			/(,\s+)|(\s+)|((?:[\-0-9A-Za-z_\u00A0-\uFFFF]|\\[0-9A-Fa-f]{1,6} ?|\\.)+)|(\[(?:"(?:\\.|[^"])*"|\\.|[^\]])*\])|(.)/g,
			function(){
				var ret = "";
				// a new selector, add prefix
				if (arguments[1]) {
					ret = arguments[1] + "#" + id + " ";
					canBeElement = true;
					canBeId = false;
				}
				// spaces, can follow element
				else if (arguments[2]) {
					ret = arguments[2];
					canBeElement = true;
					canBeId = false;
				}
				// element-like, check whether to replace
				else if (arguments[3]) {
					if (canBeElement) {
						if (arguments[3].toLowerCase() == "html") {
							ret = "#" + id + "html";
						}
						else if (arguments[3].toLowerCase() == "body") {
							ret = "#" + id + "body";
						}
						else {
							ret = arguments[3];
						}
					}
					else if (canBeId) {
						if (arguments[3] == htmlId) {
							ret = id + "html";
						}
						else if (arguments[3] == bodyId) {
							ret = id + "body";
						}
						else {
							ret = arguments[3];
						}
					}
					else {
						ret = arguments[3];
					}
					canBeElement = false;
					canBeId = false;
				}
				// bracket enclosed, eg. [class="html"]
				else if (arguments[4]) {
					ret = arguments[4];
					canBeElement = false;
					canBeId = false;
				}
				// other chars, may come from "#", ".", ":", " > ", " + ", " ~ ", etc
				else if (arguments[5]) {
					ret = arguments[5];
					canBeElement = false;
					canBeId = (arguments[5] == "#");
				}
				return ret;
		});
		return ret;
	},

	inspectCSSText : function(aCSSText, aCSSHref)
	{
		if (!aCSSHref) aCSSHref = this.BROWSER.currentURI.spec;
		// CSS get by cssText is always url("double-quoted-with-\"quote\"-escaped")
		aCSSText = aCSSText.replace(/ url\(\"((?:\\.|[^"])+)\"\)/g, function() {
			var dataURL = arguments[1];
			if (dataURL.indexOf("data:") === 0) return ' url("' + dataURL + '")';
			dataURL = sbCommonUtils.resolveURL(aCSSHref, dataURL);
			// redirect the files to the original folder so we can capture them later on (and will rewrite the CSS)
			return ' url("' + dataURL + '")';
		});
		return aCSSText;
	},

	processDOMRecursively : function(rootNode)
	{
		rootNode = this.inspectNode(rootNode);
		for ( var curNode = rootNode.firstChild; curNode != null; curNode = curNode.nextSibling )
		{
			if ( curNode.nodeName == "#text" || curNode.nodeName == "#comment" ) continue;
			curNode = this.processDOMRecursively(curNode);
		}
		return rootNode;
	},

	inspectNode : function(aNode)
	{
		switch ( aNode.nodeName.toLowerCase() )
		{
			case "link" : 
				// bad manner of link in the body
				// styles should already be parsed, remove the node to prevent scope leak
				if ( aNode.rel.toLowerCase() == "stylesheet" && aNode.href.indexOf("chrome://") != 0 ) 
				return sbContentSaver.removeNodeFromParent(aNode);
				break;
			case "style" :
				// bad manner of style in the body
				// styles should already be parsed, remove the node to prevent scope leak
				return sbContentSaver.removeNodeFromParent(aNode);
				break;
			case "body" : 
				// move body specific attributes into inline styles so that it can be transfered to div
				// inline style takes precedence than the corresponding HTML attribute
				if ( aNode.hasAttribute("background") ) {
					if (!aNode.style.backgroundImage) aNode.style.backgroundImage = 'url("' + aNode.getAttribute("background") + '")';
					aNode.removeAttribute("background");
				}
				if ( aNode.hasAttribute("bgcolor") ) {
					if (!aNode.style.backgroundColor) aNode.style.backgroundColor = aNode.getAttribute("bgcolor");
					aNode.removeAttribute("bgcolor");
				}
				if ( aNode.hasAttribute("text") ) {
					if (!aNode.style.color) aNode.style.color = aNode.getAttribute("text");
					aNode.removeAttribute("text");
				}
				// always set position:relative to make position:absolute in the pages to be combined to look right
				aNode.style.position = "relative";
				break;
			case "img" : case "embed" : case "source" : case "iframe" : 
				if ( aNode.src ) aNode.setAttribute("src", aNode.src);
				break;
			case "object" : 
				if ( aNode.data ) aNode.setAttribute("data", aNode.data);
				break;
			case "table" :  case "tr" :  case "th" : case "td" : 
				aNode = this.setAbsoluteURL(aNode, "background");
				break;
			case "input" : 
				if ( aNode.type.toLowerCase() == "image" ) aNode.setAttribute("src", aNode.src);
				break;
			case "a" : case "area" : 
				if ( aNode.href.indexOf("file://") == 0 ) aNode.setAttribute("href", aNode.href);
				break;
			case "cite" : 
				if ( aNode.className == "scrapbook-header" ) this.isTargetCombined = true;
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
	var newRes = sbCombineService.onCombineComplete(aItem);
	if ( sbCombineService.option["R"] )
	{
		if ( sbCombineService.resList.length != sbCombineService.parList.length ) return;
		var rmIDs = window.top.sbController.removeInternal(sbCombineService.resList, sbCombineService.parList);
		if ( rmIDs ) SB_trace(sbCommonUtils.lang("scrapbook", "ITEMS_REMOVED", [rmIDs.length]));
	}
	SB_fireNotification(aItem);
	setTimeout(function()
	{
		window.top.sbManageService.toggleRightPane("sbToolbarCombine");
		window.top.sbMainService.locate(newRes);
	}, 500);
}


sbInvisibleBrowser.onStateChange = function(aWebProgress, aRequest, aStateFlags, aStatus)
{
	if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START )
	{
		SB_trace(sbCommonUtils.lang("capture", "LOADING", [sbCombineService.prefix + (++this.fileCount), sbCombineService.postfix]));
	}
};



