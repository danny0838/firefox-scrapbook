
var sbBrowserOverlay = {

	get STRING()       { return document.getElementById("ScrapBookOverlayString"); },
	get FOLDER_POPUP() { return document.getElementById("ScrapBookContextFolderPopup"); },

	lastLocation : "",
	editMode : false,
	infoMode : false,
	resource : null,
	locateMe : null,
	prefOpenFromMenu : false,
	prefBookmarkMenu : true,

	webProgressListener : {

		QueryInterface : function(aIID)
		{
			if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
				aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
				aIID.equals(Components.interfaces.nsISupports))
				return this;
			throw Components.results.NS_NOINTERFACE;
		},
		onLocationChange    : function(aProgress, aRequest, aURI){ sbBrowserOverlay.onLocationChange(aURI.spec); },
		onStateChange       : function(){},
		onProgressChange    : function(){},
		onStatusChange      : function(){},
		onSecurityChange    : function(){},
		onLinkIconAvailable : function(){},
	},

	init : function()
	{
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", sbInitContextMenu, false);
		this.refresh();
		gBrowser.addProgressListener(this.webProgressListener);
		if ( sbCommonUtils.getBoolPref("scrapbook.browser.submenu", false) )
		{
			setTimeout(function()
			{
				document.getElementById("ScrapBookContextSubmenu").hidden = false;
				for ( var i = 1; i <= 9; i++ )
				{
					document.getElementById("ScrapBookContextSubmenu").firstChild.appendChild(document.getElementById("ScrapBookContextMenu" + i));
				}
			}, 1000);
		}
	},

	refresh : function()
	{
		this.lastLocation = "";
		this.dataTitle = "";
		this.editMode = sbPageEditor.TOOLBAR.getAttribute("autoshow") == "true";
		this.infoMode = sbInfoViewer.TOOLBAR.getAttribute("autoshow") == "true";
		this.prefOpenFromMenu = sbCommonUtils.getBoolPref("scrapbook.tabs.openFromMenu", false);
		this.prefBookmarkMenu = sbCommonUtils.getBoolPref("scrapbook.browser.bookmark", true);
		sbDataSource.init(true);
		sbDataSource.backup();
		this.setProtocolSubstitution();
		sbMenuHandler.MENU.hidden = !sbCommonUtils.getBoolPref("scrapbook.browser.menubar", true);
		document.getElementById("ScrapBookToolsMenu").hidden = !sbMenuHandler.MENU.hidden;
		if ( !sbMenuHandler.MENU.hidden ) sbMenuHandler.init();
		var file = sbCommonUtils.getScrapBookDir().clone();
		file.append("folders.txt");
		if ( file.exists() ) {
			nsPreferences.setUnicharPref("scrapbook.tree.folderList", sbCommonUtils.readFile(file));
		} else {
			var ids = nsPreferences.copyUnicharPref("scrapbook.tree.folderList", "");
			sbCommonUtils.writeFile(file, ids, "UTF-8");
		}
	},

	setProtocolSubstitution : function()
	{
		var baseURL = sbCommonUtils.getBaseHref(sbDataSource.data.URI);
		var RPH = sbCommonUtils.IO.getProtocolHandler("resource").QueryInterface(Components.interfaces.nsIResProtocolHandler);
		if ( RPH.hasSubstitution("scrapbook") && (RPH.getSubstitution("scrapbook").spec == baseURL) ) return;
		RPH.setSubstitution("scrapbook", sbCommonUtils.convertURLToObject(baseURL));
	},

	getID : function(aURL)
	{
		if ( !aURL ) aURL = gBrowser.currentURI ? gBrowser.currentURI.spec : "";
		var editable = ( aURL.indexOf("file") == 0 && aURL.match(/\/data\/(\d{14})\//) );
		return editable ? RegExp.$1 : null;
	},

	onLocationChange : function(aURL)
	{
		if ( aURL && aURL != (gBrowser.currentURI ? gBrowser.currentURI.spec : "") ) return;
		if ( aURL.indexOf("file") != 0 && aURL == this.lastLocation ) return;
		var id = this.getID(aURL);
		document.getElementById("ScrapBookToolbox").hidden = id ? false : true;
		if ( id )
		{
			this.resource = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
			if ( this.editMode ) setTimeout(function(){ sbPageEditor.init(id); }, 20); else setTimeout(function(){ sbPageEditor.showHide(false); }, 0);
			if ( this.infoMode ) setTimeout(function(){ sbInfoViewer.init(id); }, 50);
		}
		this.locateMe = null;
		this.lastLocation = aURL;
	},

	flipOpenPopup : function(aElement)
	{
		var parElem = this.FOLDER_POPUP.parentNode;
		var oldElem = aElement.parentNode.replaceChild(this.FOLDER_POPUP, aElement);
		parElem.appendChild(oldElem);
		this.updatePopup();
	},

	updatePopup : function()
	{
		var ids = nsPreferences.copyUnicharPref("scrapbook.tree.folderList", "");
		ids = ids ? ids.split("|") : [];
		var ni = 2;
		for ( var i = 0; i < ids.length; i++ )
		{
			if ( ids[i].length != 14 ) continue;
			var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + ids[i]);
			if ( !sbDataSource.exists(res) ) continue;
			this.FOLDER_POPUP.childNodes[ni].hidden = false;
			this.FOLDER_POPUP.childNodes[ni].id     = res.Value;
			this.FOLDER_POPUP.childNodes[ni].label  = sbDataSource.getProperty(res, "title");
			if ( ++ni > 7 ) break;
		}
		document.getElementById("ScrapBookContextPicking").previousSibling.hidden = ni == 2;
		for ( ni; ni < 7; ni++ )
		{
			this.FOLDER_POPUP.childNodes[ni].hidden = true;
		}
	},

	updateFolderPref : function(aResURI)
	{
		if ( aResURI == "urn:scrapbook:root" ) return;
		var oldIDs = nsPreferences.copyUnicharPref("scrapbook.tree.folderList", "");
		oldIDs = oldIDs ? oldIDs.split("|") : [];
		var newIDs = [aResURI.substring(18,32)];
		oldIDs.forEach(function(id){ if ( id != newIDs[0] ) newIDs.push(id); });
		newIDs = newIDs.slice(0,8).join("|");
		nsPreferences.setUnicharPref("scrapbook.tree.folderList", newIDs);
		var file = sbCommonUtils.getScrapBookDir().clone();
		file.append("folders.txt");
		sbCommonUtils.writeFile(file, newIDs, "UTF-8");
	},

	verifyTargetID : function(aTargetID)
	{
		dump("sbBrowserOverlay::verifyTargetID (aTargetID = " + aTargetID + ")\n");
		if ( aTargetID == "ScrapBookContextPicking" )
		{
			var result = {};
			window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes',result);
			return result.target ? result.target.Value : null;
		}
		if ( aTargetID.indexOf("urn:scrapbook:") != 0 ) aTargetID = "urn:scrapbook:root";
		return aTargetID;
	},

	execCapture : function(aPartialEntire, aFrameOnly, aShowDetail, aTargetID)
	{
		if ( aPartialEntire == 0 )
		{
			aPartialEntire = this.isSelected() ? 1 : 2;
			aFrameOnly = aPartialEntire == 1;
		}
		aTargetID = this.verifyTargetID(aTargetID);
		if ( !aTargetID ) return;
		var targetWindow = aFrameOnly ? sbCommonUtils.getFocusedWindow() : window._content;
		var ret = sbContentSaver.captureWindow(targetWindow, aPartialEntire == 1, aShowDetail, aTargetID, 0, null);
		return ret;
	},

	execCaptureTarget : function(aShowDetail, aTargetID)
	{
		aTargetID = this.verifyTargetID(aTargetID);
		if ( !aTargetID ) return;
		var linkURL;
		try {
			linkURL = gContextMenu.getLinkURL();
		} catch(ex) {
			linkURL = this.getLinkURI();
		}
		if ( !linkURL ) return;
		window.openDialog(
			"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[linkURL], document.popupNode.ownerDocument.location.href, aShowDetail, aTargetID, 0, null, null, null
		);
	},

	execBookmark : function(aTargetID)
	{
		aTargetID = this.verifyTargetID(aTargetID);
		if ( !aTargetID ) return;
		this.bookmark(aTargetID, 0);
	},

	bookmark : function(aResName, aResIndex)
	{
		var newID = sbDataSource.identify(sbCommonUtils.getTimeStamp());
		var newItem = sbCommonUtils.newItem(newID);
		newItem.type   = "bookmark";
		newItem.source = window._content.location.href;
		newItem.title  = gBrowser.selectedTab.label;
		newItem.icon   = gBrowser.selectedTab.getAttribute("image");
		sbDataSource.addItem(newItem, aResName, aResIndex);
		this.updateFolderPref(aResName);
		sbCommonUtils.rebuildGlobal();
	},

	locate : function(aRes)
	{
		if ( !aRes ) return;
		if ( !sbDataSource.exists(aRes) ) { sbPageEditor.disable(true); return; }
		if ( document.getElementById("viewScrapBookSidebar").getAttribute("checked") )
		{
			document.getElementById("sidebar").contentWindow.sbMainService.locate(aRes);
		}
		else
		{
			this.locateMe = aRes;
			toggleSidebar("viewScrapBookSidebar");
		}
	},

	getLinkURI : function()
	{
		var i = 0;
		var linkURL;
		var curNode = document.popupNode;
		while ( ++i < 10 && curNode )
		{
			if ( ( curNode instanceof HTMLAnchorElement || curNode instanceof HTMLAreaElement ) && curNode.href )
			{
				linkURL = curNode.href;
				break;
			}
			curNode = curNode.parentNode;
		}
		if ( linkURL ) return linkURL;
	},

	isSelected : function()
	{
		var sel = sbCommonUtils.getFocusedWindow().getSelection().QueryInterface(Components.interfaces.nsISelectionPrivate);
		var isSelected = false;
		try {
			isSelected = ( sel.anchorNode.isSameNode(sel.focusNode) && sel.anchorOffset == sel.focusOffset ) ? false : true;
		} catch(ex) {
		}
		return isSelected;
	},

};


function sbInitContextMenu(aEvent)
{
	if ( aEvent.originalTarget.id != "contentAreaContextMenu" ) return;
	try {
		var isActive = gContextMenu.isTextSelected || gContextMenu.onLink || gContextMenu.onMailtoLink;
		document.getElementById("ScrapBookContextMenu1").hidden = !gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu2").hidden = !gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu3").hidden = isActive;
		document.getElementById("ScrapBookContextMenu4").hidden = isActive;
		document.getElementById("ScrapBookContextMenu5").hidden = isActive || !gContextMenu.inFrame;
		document.getElementById("ScrapBookContextMenu6").hidden = isActive || !gContextMenu.inFrame;
		document.getElementById("ScrapBookContextMenu7").hidden = !gContextMenu.onLink || gContextMenu.onMailtoLink;
		document.getElementById("ScrapBookContextMenu8").hidden = !gContextMenu.onLink || gContextMenu.onMailtoLink;
		document.getElementById("ScrapBookContextMenu9").hidden = isActive || !sbBrowserOverlay.prefBookmarkMenu;
	}
	catch(ex)
	{
		var onLink = sbBrowserOverlay.getLinkURI() ? true : false;
		var isSelected = sbBrowserOverlay.isSelected();
		document.getElementById("ScrapBookContextMenu1").hidden = !isSelected;
		document.getElementById("ScrapBookContextMenu2").hidden = !isSelected;
		document.getElementById("ScrapBookContextMenu3").hidden = onLink || isSelected;
		document.getElementById("ScrapBookContextMenu4").hidden = onLink || isSelected;
		var inFrame = document.popupNode.ownerDocument != window.content.document;
		document.getElementById("ScrapBookContextMenu5").hidden = onLink || isSelected || !inFrame;
		document.getElementById("ScrapBookContextMenu6").hidden = onLink || isSelected || !inFrame;
		document.getElementById("ScrapBookContextMenu7").hidden = !onLink;
		document.getElementById("ScrapBookContextMenu8").hidden = !onLink;
		document.getElementById("ScrapBookContextMenu9").hidden = onLink || isSelected || !sbBrowserOverlay.prefBookmarkMenu;
	}
}


function sbMiddleClickContextMenu(aEvent, aFlag)
{
	if ( aEvent.originalTarget.localName == "menu" || aEvent.button != 1 ) return;
	switch ( aFlag )
	{
		case 1 : sbBrowserOverlay.execCapture(1, true, true , aEvent.originalTarget.id); break;
		case 3 : sbBrowserOverlay.execCapture(2, false,true , aEvent.originalTarget.id); break;
		case 5 : sbBrowserOverlay.execCapture(2, true, true , aEvent.originalTarget.id); break;
		case 7 : sbBrowserOverlay.execCaptureTarget(true,  aEvent.originalTarget.id); break;
	}
}




var sbMenuHandler = {

	get MENU() { return document.getElementById("ScrapBookMenu"); },

	baseURL  : "",
	shouldRebuild : false,

	init : function()
	{
		this.baseURL  = sbCommonUtils.getBaseHref(sbDataSource.data.URI);
		var dsEnum = this.MENU.database.GetDataSources();
		while ( dsEnum.hasMoreElements() )
		{
			var ds = dsEnum.getNext().QueryInterface(Components.interfaces.nsIRDFDataSource);
			this.MENU.database.RemoveDataSource(ds);
		}
		this.MENU.database.AddDataSource(sbDataSource.data);
		this.MENU.builder.rebuild();
	},

	onPopupShowing : function(aEvent, aPopupRoot)
	{
		var selected = sbBrowserOverlay.isSelected();
		if ( aEvent.target == aPopupRoot )
		{
			document.getElementById("ScrapBookMenubarItem1").label = document.getElementById("ScrapBookContextMenu" + (selected ? 1 : 3)).getAttribute("label");
			document.getElementById("ScrapBookMenubarItem2").label = document.getElementById("ScrapBookContextMenu" + (selected ? 2 : 4)).getAttribute("label");
			document.getElementById("ScrapBookMenubarItem1").className = "menuitem-iconic " + (selected ? "sb-capture-partial"    : "sb-capture-entire");
			document.getElementById("ScrapBookMenubarItem2").className = "menuitem-iconic " + (selected ? "sb-capture-partial-as" : "sb-capture-entire-as");
			if ( !this.shouldRebuild ) return;
			this.shouldRebuild = false;
			this.MENU.builder.rebuild();
		}
		else
		{
			if ( aEvent.target.firstChild && aEvent.target.firstChild.className.indexOf("sb-capture") >= 0 )
			{
				aEvent.target.firstChild.label     = document.getElementById("ScrapBookMenubarItem1").label;
				aEvent.target.firstChild.className = document.getElementById("ScrapBookMenubarItem1").className;
				return;
			}
			var elem1 = document.createElement("menuseparator");
			var elem2 = document.createElement("menuitem");
			elem2.setAttribute("class", document.getElementById("ScrapBookMenubarItem1").className);
			elem2.setAttribute("label", document.getElementById("ScrapBookMenubarItem1").label);
			elem2.setAttribute("resuri", aEvent.target.parentNode.resource.Value);
			aEvent.target.insertBefore(elem1, aEvent.target.firstChild);
			aEvent.target.insertBefore(elem2, aEvent.target.firstChild);
		}
	},

	onClick : function(aEvent)
	{
		if ( aEvent.target.id == "ScrapBookMenubarItem3" ) return;
		if ( aEvent.target.className.indexOf("sb-capture") >= 0 )
		{
			var aShowDetail = aEvent.target.id == "ScrapBookMenubarItem2" || aEvent.button == 1;
			var resURI = aEvent.target.hasAttribute("resuri") ? aEvent.target.getAttribute("resuri") : "urn:scrapbook:root";
			sbBrowserOverlay.execCapture(0, null, aShowDetail, resURI);
			return;
		}
		if ( aEvent.button == 1 ) this.MENU.firstChild.hidePopup();
		if ( aEvent.target.id.indexOf("urn:scrapbook:") != 0 ) return;
		var res = sbCommonUtils.RDF.GetResource(aEvent.target.id);
		if ( sbDataSource.isContainer(res) )
		{
			if ( aEvent.button == 1 ) sbBrowserOverlay.locate(res);
			return;
		}
		var id = sbDataSource.getProperty(res, "id");
		if ( !id ) return;
		var url;
		switch ( sbDataSource.getProperty(res, "type") )
		{
			case "note"     : url = "chrome://scrapbook/content/note.xul?id=" + id; break;
			case "bookmark" : url = sbDataSource.getProperty(res, "source");        break;
			default         : url = this.baseURL + "data/" + id + "/index.html";
		}
		sbCommonUtils.loadURL(url, (aEvent.button == 1 || aEvent.ctrlKey || aEvent.shiftKey) ^ sbBrowserOverlay.prefOpenFromMenu);
		aEvent.preventBubble();
	},

	execCaptureAllTabs : function(aTargetID)
	{
		if ( !aTargetID ) aTargetID = sbBrowserOverlay.verifyTargetID("ScrapBookContextPicking");
		if ( !aTargetID ) return;
		var tabList = [];
		var nodes = gBrowser.mTabContainer.childNodes;
		for ( var i = 0; i < nodes.length; i++ ) tabList.push(nodes[i]);
		this.goNextTab(tabList, aTargetID);
	},

	goNextTab : function(tabList, aTargetID)
	{
		if ( tabList.length == 0 ) return;
		var tab = tabList.shift();
		gBrowser.selectedTab = tab;
		var win = gBrowser.getBrowserForTab(tab).contentWindow;
		if ( win.location.href != "about:blank" )
		{
			try {
				sbContentSaver.captureWindow(win, false, false, aTargetID, 0, null);
			} catch(ex) {
			}
		}
		setTimeout(function(){ sbMenuHandler.goNextTab(tabList, aTargetID); }, 1000);
	},

};




window.addEventListener("load", function(){ sbBrowserOverlay.init(); }, false);


