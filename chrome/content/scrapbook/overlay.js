
var sbBrowserOverlay = {

	get FOLDER_POPUP() { return document.getElementById("ScrapBookContextFolderPopup"); },

	lastLocation : "",
	editMode : false,
	infoMode : false,
	resource : null,
	locateMe : null,
	folderList : [],
	prefOpenFromMenu : false,
	prefBookmarkMenu : true,

	init : function()
	{
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", sbInitContextMenu, false);
		if ( sbCommonUtils.getBoolPref("scrapbook.browser.submenu", false) )
		{
			document.getElementById("ScrapBookContextSubmenu").hidden = false;
			for ( var i = 1; i <= 9; i++ )
			{
				document.getElementById("ScrapBookContextSubmenu").firstChild.appendChild(document.getElementById("ScrapBookContextMenu" + i));
			}
		}
		this.refresh();
		gBrowser.mTabBox.addEventListener("select", function(){ sbBrowserOverlay.onLocationChange(); }, false);
	},

	refresh : function()
	{
		this.lastLocation = "";
		this.editMode = sbPageEditor.TOOLBAR.getAttribute("autoshow") == "true";
		this.infoMode = sbInfoViewer.TOOLBAR.getAttribute("autoshow") == "true";
		this.prefOpenFromMenu = sbCommonUtils.getBoolPref("scrapbook.tabs.openFromMenu", false);
		this.prefBookmarkMenu = sbCommonUtils.getBoolPref("scrapbook.browser.bookmark", true);
		sbDataSource.init(true);
		sbDataSource.backup();
		this.setProtocolSubstitution();
		sbMenuHandler.MENU.hidden = !sbCommonUtils.getBoolPref("scrapbook.browser.menubar", true);
		if ( !sbMenuHandler.MENU.hidden ) sbMenuHandler.init();
	},

	setProtocolSubstitution : function()
	{
		var baseURL = sbCommonUtils.getBaseHref(sbDataSource.data.URI);
		var RPH = sbCommonUtils.IO.getProtocolHandler("resource").QueryInterface(Components.interfaces.nsIResProtocolHandler);
		if ( RPH.hasSubstitution("scrapbook") && (RPH.getSubstitution("scrapbook").spec == baseURL) ) return;
		RPH.setSubstitution("scrapbook", sbCommonUtils.convertURLToObject(baseURL));
	},

	getID : function()
	{
		var curURL = window._content.location.href;
		var isEditable = ( curURL.indexOf("file") == 0 && curURL.match(/\/data\/(\d{14})\//) );
		return isEditable ? RegExp.$1 : null;
	},

	onLocationChange : function(aEvent)
	{
		if ( aEvent && aEvent.originalTarget instanceof HTMLDocument )
		{
			if ( aEvent.originalTarget.location.protocol == "file:" )
			{
				this.lastLocation = "";
			}
		}
		var curURL = window._content.location.href;
		if ( curURL == this.lastLocation ) return;
		var id = this.getID();
		document.getElementById("ScrapBookToolbox").hidden         = id ? false : true;
		document.getElementById("ScrapBookEditStatusPanel").hidden = id ? false : true;
		document.getElementById("ScrapBookInfoStatusPanel").hidden = id ? false : true;
		if ( id )
		{
			this.resource = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
			if ( this.editMode )
				setTimeout(function(){ sbPageEditor.init(); }, 0);
			else
				sbPageEditor.showHide(false);
			if ( this.infoMode )
				setTimeout(function(){ sbInfoViewer.init(); }, 50);
			else
				document.getElementById("ScrapBookInfobar").hidden = true;
			this.onAfterLocationChange(curURL, id);
		}
		this.locateMe = null;
		this.lastLocation = curURL;
	},

	onAfterLocationChange : function(aURL, aID) { return; },

	flipOpenPopup : function(aElement)
	{
		var parElem = this.FOLDER_POPUP.parentNode;
		var oldElem = aElement.parentNode.replaceChild(this.FOLDER_POPUP, aElement);
		parElem.appendChild(oldElem);
		this.updatePopup();
	},

	updatePopup : function()
	{
		var arr = nsPreferences.copyUnicharPref("scrapbook.tree.folderList", "").split("|");
		this.folderList = arr;
		var flag = false;
		for ( var i = 2; i < 7; i++ )
		{
			this.FOLDER_POPUP.childNodes[i].hidden = true;
			if ( i > arr.length + 2 ) continue;
			var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + arr[i-2]);
			if ( !sbDataSource.exists(res) ) continue;
			this.FOLDER_POPUP.childNodes[i].hidden = false;
			this.FOLDER_POPUP.childNodes[i].id     = res.Value;
			this.FOLDER_POPUP.childNodes[i].label  = sbDataSource.getProperty(res, "title");
			flag = true;
		}
		document.getElementById("ScrapBookContextPicking").previousSibling.hidden = !flag;
	},

	setFolderPref : function(aResName)
	{
		if ( aResName == "urn:scrapbook:root" ) return;
		var newArr = [aResName.substring(18,32)];
		for ( var i = 0; i < this.folderList.length; i++ )
		{
			if ( this.folderList[i] != newArr[0] ) newArr.push(this.folderList[i]);
		}
		nsPreferences.setUnicharPref("scrapbook.tree.folderList", newArr.slice(0,5).join("|"));
	},

	verifyTargetID : function(targetID)
	{
		if ( targetID == "ScrapBookContextPicking" || targetID == "cmd_ScrapBookCaptureEntire" )
		{
			var result = {};
			window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes',result);
			return result.target ? result.target.Value : null;
		}
		if ( targetID.indexOf("urn:scrapbook:") != 0 ) targetID = "urn:scrapbook:root";
		return targetID;
	},

	execCapture : function(frameOnly, isPartial, showDetail, targetID)
	{
		targetID = this.verifyTargetID(targetID);
		if ( !targetID ) return;
		var targetWindow = frameOnly ? sbCommonUtils.getFocusedWindow() : window._content;
		sbContentSaver.captureWindow(targetWindow, isPartial, showDetail, targetID, 0, null);
		this.setFolderPref(targetID);
	},

	execCaptureTarget : function(showDetail, targetID)
	{
		targetID = this.verifyTargetID(targetID);
		if ( !targetID ) return;
		var linkURL;
		try {
			linkURL = gContextMenu.getLinkURL();
		} catch(ex) {
			linkURL = this.getLinkURI();
		}
		if ( !linkURL ) return;
		window.openDialog(
			"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[linkURL], document.popupNode.ownerDocument.location.href, showDetail, targetID, 0, null, null, null
		);
		this.setFolderPref(targetID);
	},

	execBookmark : function(targetID)
	{
		targetID = this.verifyTargetID(targetID);
		if ( !targetID ) return;
		var newID = sbDataSource.identify(sbCommonUtils.getTimeStamp());
		var newItem = new ScrapBookItem(newID);
		newItem.title  = window._content.document.title;
		newItem.source = window._content.location.href;
		newItem.icon   = gBrowser.selectedTab.getAttribute("image");
		newItem.type   = "bookmark";
		sbDataSource.addItem(newItem, targetID, 0);
		sbCommonUtils.rebuildGlobal();
		this.setFolderPref(targetID);
	},

	locate : function(aRes)
	{
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

};


function sbInitContextMenu(aEvent)
{
	if ( aEvent.originalTarget.id != "contentAreaContextMenu" ) return;
	try {
		document.getElementById("ScrapBookContextMenu1").hidden = !gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu2").hidden = !gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu3").hidden =  gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu4").hidden =  gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu5").hidden = (!gContextMenu.inFrame || gContextMenu.isTextSelected);
		document.getElementById("ScrapBookContextMenu6").hidden = (!gContextMenu.inFrame || gContextMenu.isTextSelected);
		document.getElementById("ScrapBookContextMenu7").hidden = (!gContextMenu.onLink  || gContextMenu.onMailtoLink);
		document.getElementById("ScrapBookContextMenu8").hidden = (!gContextMenu.onLink  || gContextMenu.onMailtoLink);
		document.getElementById("ScrapBookContextMenu9").hidden =  gContextMenu.isTextSelected || gContextMenu.onLink || gContextMenu.onMailtoLink || !sbBrowserOverlay.prefBookmarkMenu;
	}
	catch(ex)
	{
		var win = document.commandDispatcher.focusedWindow;
		if ( !win || win == window ) win = window._content;
		var sel = win.getSelection().QueryInterface(Components.interfaces.nsISelectionPrivate);
		var isSelected = false;
		try {
			isSelected = ( sel.anchorNode.isSameNode(sel.focusNode) && sel.anchorOffset == sel.focusOffset ) ? false : true;
		} catch(ex) {
		}
		document.getElementById("ScrapBookContextMenu1").hidden = !isSelected;
		document.getElementById("ScrapBookContextMenu2").hidden = !isSelected;
		document.getElementById("ScrapBookContextMenu3").hidden =  isSelected;
		document.getElementById("ScrapBookContextMenu4").hidden =  isSelected;
		var inFrame = document.popupNode.ownerDocument != window.content.document;
		document.getElementById("ScrapBookContextMenu5").hidden = !inFrame || isSelected;
		document.getElementById("ScrapBookContextMenu6").hidden = !inFrame || isSelected;
		var onLink = sbBrowserOverlay.getLinkURI() ? true : false;
		document.getElementById("ScrapBookContextMenu7").hidden = !onLink;
		document.getElementById("ScrapBookContextMenu8").hidden = !onLink;
		document.getElementById("ScrapBookContextMenu9").hidden = isSelected || onLink || !sbBrowserOverlay.prefBookmarkMenu;
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

	onPopupShowing : function(aEvent, aPopup)
	{
		if ( aEvent.target == aPopup && this.shouldRebuild )
		{
			this.shouldRebuild = false;
			this.MENU.builder.rebuild();
		}
	},

	open : function(aEvent)
	{
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
		sbCommonUtils.loadURL(url, aEvent.button == 1 || aEvent.ctrlKey || aEvent.shiftKey || sbBrowserOverlay.prefOpenFromMenu);
		aEvent.preventBubble();
	},

	execCaptureAllTabs : function()
	{
		var targetID = sbBrowserOverlay.verifyTargetID("ScrapBookContextPicking");
		if ( !targetID ) return;
		var tabList = [];
		var nodes = gBrowser.mTabContainer.childNodes;
		for ( var i = 0; i < nodes.length; i++ ) tabList.push(nodes[i]);
		sbBrowserOverlay.setFolderPref(targetID);
		this.goNextTab(tabList, targetID);
	},

	goNextTab : function(tabList, targetID)
	{
		if ( tabList.length == 0 ) return;
		var tab = tabList.shift();
		gBrowser.selectedTab = tab;
		var win = gBrowser.getBrowserForTab(tab).contentWindow;
		if ( win.location.href != "about:blank" )
		{
			try {
				sbContentSaver.captureWindow(win, false, false, targetID, 0, null);
			} catch(ex) {
			}
		}
		setTimeout(function(){ sbMenuHandler.goNextTab(tabList, targetID); }, 1000);
	},

};




window.addEventListener("load", function(){ sbBrowserOverlay.init(); }, false);
window.addEventListener("pageshow", function(aEvent){ sbBrowserOverlay.onLocationChange(aEvent); }, true);



