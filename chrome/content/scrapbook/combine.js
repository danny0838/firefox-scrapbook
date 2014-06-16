
<<<<<<< HEAD
var sbCommonUtils;
var sbDataSource;

=======
>>>>>>> release-1.6.0.a1
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

<<<<<<< HEAD
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
=======

	init : function()
	{
>>>>>>> release-1.6.0.a1
		gOption = { "script" : true, "images" : true };
		if ( window.top.location.href != "chrome://scrapbook/content/manage.xul" )
		{
			document.documentElement.collapsed = true;
			return;
		}
		window.top.document.getElementById("mbToolbarButton").disabled = true;
<<<<<<< HEAD
		sbCommonUtils = window.top.sbCommonUtils;
		sbDataSource  = window.top.sbDataSource;
		this.index = 0;
		sbFolderSelector2.init();
//		this.WIZARD.getButton("back").onclick = function(){ sbCombineService.undo(); };
		this.WIZARD.getButton("back").hidden = true;
//		this.WIZARD.getButton("cancel").hidden = true;
		this.WIZARD.getButton("cancel").onclick = function(){ sbCombineService.abort(); };
		this.toggleButtons();
=======
		this.index = 0;
		sbFolderSelector2.init();
		this.WIZARD.getButton("back").onclick = function(){ sbCombineService.undo(); };
		this.WIZARD.getButton("cancel").hidden = true;
>>>>>>> release-1.6.0.a1
		this.updateButtons();
	},

	done : function()
	{
		window.top.document.getElementById("mbToolbarButton").disabled = false;
	},

	add : function(aRes, aParRes)
	{
		if ( this.resList.indexOf(aRes) != -1 ) return;
<<<<<<< HEAD
		var type = sbDataSource.getProperty(aRes, "type");
		if (type == "folder" || type == "separator")
			return;
		if (type == "site")
			alert(this.STRING.getString("WARN_ABOUT_INDEPTH"));
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
=======
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

>>>>>>> release-1.6.0.a1
	undo : function()
	{
		if ( this.idList.length == 0 ) return;
		this.LISTBOX.removeItemAt(this.idList.length - 1);
		this.idList.pop();
		this.resList.pop();
		this.parList.pop();
		this.updateButtons();
	},
<<<<<<< HEAD
*/
=======

>>>>>>> release-1.6.0.a1
	updateButtons : function()
	{
		this.WIZARD.canRewind  = this.idList.length > 0;
		this.WIZARD.canAdvance = this.idList.length > 1;
	},

	initPreview : function()
	{
<<<<<<< HEAD
//		this.WIZARD.canRewind = false;
		this.WIZARD.canAdvance = false;
//		this.WIZARD.getButton("back").onclick = null;
		this.WIZARD.getButton("back").hidden = false;
		this.WIZARD.getButton("back").disabled = true;
		this.WIZARD.getButton("finish").label = this.STRING.getString("FINISH_BUTTON_LABEL");
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
=======
		this.WIZARD.canRewind = false;
		this.WIZARD.canAdvance = false;
		this.WIZARD.getButton("back").onclick = null;
		this.WIZARD.getButton("finish").label = this.STRING.getString("FINISH_BUTTON_LABEL");
		this.WIZARD.getButton("finish").disabled = true;
		this.option["R"] = document.getElementById("sbCombineOptionRemove").checked;
>>>>>>> release-1.6.0.a1
		sbInvisibleBrowser.init();
		sbInvisibleBrowser.ELEMENT.removeEventListener("load", sbInvisibleBrowser.onload, true);
		sbInvisibleBrowser.onload = function(){ sbPageCombiner.exec(); };
		sbInvisibleBrowser.ELEMENT.addEventListener("load", sbInvisibleBrowser.onload, true);
		this.next();
	},

	next : function()
	{
		if ( this.index < this.idList.length )
		{
			this.prefix  = "(" + (this.index + 1) + "/" + this.idList.length + ") ";
<<<<<<< HEAD
			this.postfix = sbDataSource.getProperty(this.resList[this.index], "title");
			var type = sbDataSource.getProperty(this.resList[this.index], "type");
			if  ( type == "file" || type == "bookmark" )
			{
				sbPageCombiner.exec(type);
			} else
			{
				sbInvisibleBrowser.load(sbCommonUtils.getBaseHref(sbDataSource.data.URI) + "data/" + this.curID + "/index.html");
			}
=======
			this.postfix = ScrapBookData.getProperty(this.resList[this.index], "title");
			var type = ScrapBookData.getProperty(this.resList[this.index], "type");
			if  ( type == "file" || type == "bookmark" )
				sbPageCombiner.exec(type);
			else
				sbInvisibleBrowser.load(ScrapBookUtils.getBaseHref(ScrapBookData.dataSource.URI) + "data/" + this.curID + "/index.html");
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		var htmlFile = sbCommonUtils.getScrapBookDir();
		htmlFile.append("combine.html");
		sbCommonUtils.writeFile(htmlFile, sbPageCombiner.htmlSrc, "UTF-8");
		var cssFile = sbCommonUtils.getScrapBookDir();
		cssFile.append("combine.css");
		sbCommonUtils.writeFile(cssFile, sbPageCombiner.cssText, "UTF-8");
		sbInvisibleBrowser.refreshEvent(function(){ sbCombineService.showBrowser(); });
		sbInvisibleBrowser.load(sbCommonUtils.convertFilePathToURL(htmlFile.path));
=======
		var htmlFile = ScrapBookUtils.getScrapBookDir();
		htmlFile.append("combine.html");
		ScrapBookUtils.writeFile(htmlFile, sbPageCombiner.htmlSrc, "UTF-8");
		var cssFile = ScrapBookUtils.getScrapBookDir();
		cssFile.append("combine.css");
		ScrapBookUtils.writeFile(cssFile, sbPageCombiner.cssText, "UTF-8");
		sbInvisibleBrowser.refreshEvent(function(){ sbCombineService.showBrowser(); });
		sbInvisibleBrowser.load(ScrapBookUtils.convertFilePathToURL(htmlFile.path));
>>>>>>> release-1.6.0.a1
	},

	showBrowser : function()
	{
		this.toggleElements(false);
		sbInvisibleBrowser.ELEMENT.onclick = function(aEvent){ aEvent.preventDefault(); };
<<<<<<< HEAD
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
=======
		this.WIZARD.getButton("finish").disabled = false;
		this.WIZARD.getButton("finish").onclick = function(){ sbCombineService.finish(); };
>>>>>>> release-1.6.0.a1
	},

	finish : function()
	{
		this.WIZARD.getButton("finish").disabled = true;
<<<<<<< HEAD
		this.WIZARD.getButton("cancel").disabled = true;
		this.option["R"] = document.getElementById("sbCombineOptionRemove").checked;
		this.toggleElements(true);
		SB_trace(sbCaptureTask.STRING.getString("CAPTURE_START"));
//alert("--"+document.getElementById("sbpTitleTextbox").value+"--");
		if ( document.getElementById("sbpTitleTextbox").value == "" )
		{
			setTimeout(function(){ sbContentSaver.captureWindow(sbInvisibleBrowser.ELEMENT.contentWindow, false, false, sbFolderSelector2.resURI, 0, null); }, 0);
		} else
		{
			setTimeout(function(){ sbContentSaver.captureWindow(sbInvisibleBrowser.ELEMENT.contentWindow, false, false, sbFolderSelector2.resURI, 0, null, null, document.getElementById("sbpTitleTextbox").value); }, 0);
		}
=======
		this.toggleElements(true);
		SB_trace(sbCaptureTask.STRING.getString("SAVE_START"));
		setTimeout(function(){ sbContentSaver.captureWindow(sbInvisibleBrowser.ELEMENT.contentWindow, false, false, sbFolderSelector2.resURI, 0, null); }, 0);
>>>>>>> release-1.6.0.a1
	},

	toggleElements : function(isProgressMode)
	{
		sbInvisibleBrowser.ELEMENT.collapsed = isProgressMode;
		document.getElementById("sbCaptureTextbox").collapsed = !isProgressMode;
	},

	onCombineComplete : function(aItem)
	{
<<<<<<< HEAD
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
=======
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

>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
//alert("htmlSrc - "+this.htmlSrc.length+"\ncssText - "+this.cssText.length+"\noffsetTop - "+this.offsetTop+"\nisTargetCombined - "+this.isTargetCombined);
=======
>>>>>>> release-1.6.0.a1
		this.isTargetCombined = false;
		if ( sbCombineService.index == 0 )
		{
			this.htmlSrc += '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">';
			this.htmlSrc += '<html><head>';
			this.htmlSrc += '<meta http-equiv="Content-Type" content="text/html;Charset=UTF-8">';
			this.htmlSrc += '<meta http-equiv="Content-Style-Type" content="text/css">';
<<<<<<< HEAD
			this.htmlSrc += '<title>' + sbDataSource.getProperty(sbCombineService.curRes, "title") + '</title>';
=======
			this.htmlSrc += '<title>' + ScrapBookData.getProperty(sbCombineService.curRes, "title") + '</title>';
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		var title = sbCommonUtils.crop(sbDataSource.getProperty(sbCombineService.curRes, "title") , 100);
=======
		var title = ScrapBookUtils.crop(ScrapBookData.getProperty(sbCombineService.curRes, "title") , 100);
>>>>>>> release-1.6.0.a1
		var linkURL = "";
		switch ( aType )
		{
			case "file" :
<<<<<<< HEAD
				var htmlFile = sbCommonUtils.getContentDir(sbCombineService.curID);
				htmlFile.append("index.html");
				var isMatch = sbCommonUtils.readFile(htmlFile).match(/URL=\.\/([^\"]+)\"/);
=======
				var htmlFile = ScrapBookUtils.getContentDir(sbCombineService.curID);
				htmlFile.append("index.html");
				var isMatch = ScrapBookUtils.readFile(htmlFile).match(/URL=\.\/([^\"]+)\"/);
>>>>>>> release-1.6.0.a1
				if ( isMatch ) linkURL = "./data/" + sbCombineService.curID + "/" + RegExp.$1;
				break;
			case "note" :
				linkURL = ""; break;
			default :
<<<<<<< HEAD
				linkURL = sbDataSource.getProperty(sbCombineService.curRes, "source"); break;
		}
		var icon = sbDataSource.getProperty(sbCombineService.curRes, "icon");
		if ( !icon ) icon = sbCommonUtils.getDefaultIcon(aType);
		if ( icon.indexOf("resource://") == 0 && icon.indexOf(sbCombineService.curID) > 0 )
		{
			icon = "./data/" + sbCombineService.curID + "/" + sbCommonUtils.getFileName(icon);
=======
				linkURL = ScrapBookData.getProperty(sbCombineService.curRes, "source"); break;
		}
		var icon = ScrapBookData.getProperty(sbCombineService.curRes, "icon");
		if ( !icon ) icon = ScrapBookUtils.getDefaultIcon(aType);
		if ( icon.indexOf("resource://") == 0 && icon.indexOf(sbCombineService.curID) > 0 )
		{
			icon = "./data/" + sbCombineService.curID + "/" + ScrapBookUtils.getFileName(icon);
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
			alert(sbCombineService.STRING.getString("CANNOT_COMBINE_FRAMES") + "\n" + sbDataSource.getProperty(sbCombineService.curRes, "title"));
=======
			ScrapBookUtils.alert(
				sbCombineService.STRING.getString("CANNOT_COMBINE_FRAMES") + "\n" + 
				ScrapBookData.getProperty(sbCombineService.curRes, "title")
			);
>>>>>>> release-1.6.0.a1
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
				childNodes[i].style.top = (parseInt(childNodes[i].style.top, 10) + this.offsetTop) + "px";
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
<<<<<<< HEAD
			aNode.setAttribute(aAttr, sbCommonUtils.resolveURL(this.BROWSER.currentURI.spec, aNode.getAttribute(aAttr)));
=======
			aNode.setAttribute(aAttr, ScrapBookUtils.resolveURL(this.BROWSER.currentURI.spec, aNode.getAttribute(aAttr)));
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		if ( rmIDs ) SB_trace(window.top.sbMainService.STRING.getFormattedString("ITEMS_REMOVED", [rmIDs.length]));
=======
		if ( rmIDs ) SB_trace(ScrapBookUtils.getLocaleString("ITEMS_REMOVED", [rmIDs.length]));
>>>>>>> release-1.6.0.a1
	}
	SB_fireNotification(aItem);
	setTimeout(function()
	{
<<<<<<< HEAD
		window.top.sbManageService.toggleRightPane("sbToolbarCombine");
		window.top.sbMainService.locate(newRes);
=======
		window.top.sbManageUI.toggleRightPane("sbToolbarCombine");
		window.top.sbMainUI.locate(newRes);
>>>>>>> release-1.6.0.a1
	}, 500);
}


sbInvisibleBrowser.onStateChange = function(aWebProgress, aRequest, aStateFlags, aStatus)
{
<<<<<<< HEAD
	if ( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START )
=======
	if ( aStateFlags & Ci.nsIWebProgressListener.STATE_START )
>>>>>>> release-1.6.0.a1
	{
		SB_trace(sbCaptureTask.STRING.getString("LOADING") + "... " + sbCombineService.prefix + (++this.fileCount) + " " + sbCombineService.postfix);
	}
};



