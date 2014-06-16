
<<<<<<< HEAD
var sbBrowserOverlay = {
=======
var ScrapBookBrowserOverlay = {
>>>>>>> release-1.6.0.a1

	lastLocation: "",
	editMode: false,
	infoMode: false,
	resource: null,
	locateMe: null,
<<<<<<< HEAD
	_prefBranch: null,
	ffVersion: null,
=======
>>>>>>> release-1.6.0.a1

	get STRING() {
		if (!this._stringBundle)
			this._stringBundle = document.getElementById("ScrapBookOverlayString");
		return this._stringBundle;
	},
	_stringBundle: null,

	webProgressListener: {
		onLocationChange: function(aProgress, aRequest, aURI) {
<<<<<<< HEAD
			sbBrowserOverlay.onLocationChange(aURI ? aURI.spec : "about:blank");
=======
			ScrapBookBrowserOverlay.onLocationChange(aURI ? aURI.spec : "about:blank");
>>>>>>> release-1.6.0.a1
		},
		onStateChange      : function(){},
		onProgressChange   : function(){},
		onStatusChange     : function(){},
		onSecurityChange   : function(){},
		onLinkIconAvailable: function(){},
		QueryInterface: function(aIID) {
			if (aIID.equals(Ci.nsIWebProgressListener) ||
			    aIID.equals(Ci.nsISupportsWeakReference) ||
			    aIID.equals(Ci.nsISupports))
				return this;
			throw Components.results.NS_NOINTERFACE;
		},
	},

	init: function()
	{
<<<<<<< HEAD
		//Ermitteln der Firefox-Version
		this.ffVersion = Cc["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
		document.getElementById("contentAreaContextMenu").addEventListener(
			"popupshowing", this, false
		);
		this._prefBranch = Cc["@mozilla.org/preferences-service;1"]
		                   .getService(Components.interfaces.nsIPrefService)
		                   .getBranch("scrapbook.ui.");
		this.refresh();
		gBrowser.addProgressListener(this.webProgressListener);
		if (this._prefBranch.getBoolPref("contextMenu") && 
		    this._prefBranch.getBoolPref("contextSubMenu")) {
			var callback = function() {
				document.getElementById("ScrapBookContextSubmenu").hidden = false;
				for (var i = 1; i <= 10; i++) {
=======
		document.getElementById("contentAreaContextMenu").addEventListener(
			"popupshowing", this, false
		);
		this.refresh();
		gBrowser.addProgressListener(this.webProgressListener);
		if (ScrapBookUtils.getPref("ui.contextMenu") && 
		    ScrapBookUtils.getPref("ui.contextSubMenu")) {
			var callback = function() {
				document.getElementById("ScrapBookContextSubmenu").hidden = false;
				for (var i = 1; i <= 9; i++) {
>>>>>>> release-1.6.0.a1
					document.getElementById("ScrapBookContextSubmenu").firstChild.appendChild(
						document.getElementById("ScrapBookContextMenu" + i)
					);
				}
			};
			window.setTimeout(callback, 1000);
		}
<<<<<<< HEAD
		if (this._prefBranch.getBoolPref("menuBar.icon")) {
=======
		if (ScrapBookUtils.getPref("ui.menuBar.icon")) {
>>>>>>> release-1.6.0.a1
			var menu   = document.getElementById("ScrapBookMenu");
			var button = document.createElement("toolbarbutton");
			var attrs = menu.attributes;
			for (var i = 0; i < attrs.length; i++)
				button.setAttribute(attrs[i].nodeName, attrs[i].nodeValue);
			while (menu.hasChildNodes())
				button.appendChild(menu.firstChild);
			button.removeAttribute("label");
			button.setAttribute("type", "menu");
			button.setAttribute("image", "chrome://scrapbook/skin/main_16.png");
			var menubar = document.getElementById("main-menubar");
			menubar.appendChild(button);
			menubar.removeChild(menu);
		}
<<<<<<< HEAD
=======
		var key = ScrapBookUtils.getPref("key.menubar");
		if (key.length == 1) {
			var elt = document.getElementById("ScrapBookMenu");
			elt.setAttribute("accesskey", key);
		}
		var keyMap = {
			"key.sidebar"    : "key_openScrapBookSidebar",
			"key.save"       : "key_ScrapBookCapture",
			"key.saveAs"     : "key_ScrapBookCaptureAs",
			"key.saveAllTabs": "key_ScrapBookSaveAllTabs",
			"key.bookmark"   : "key_BookmarkWithScrapBook",
		};
		for (let [pref, id] in Iterator(keyMap)) {
			var key = ScrapBookUtils.getPref(pref);
			var elt = document.getElementById(id);
			if (key.length == 1)
				elt.setAttribute("key", key);
			else
				elt.parentNode.removeChild(elt);
		}
>>>>>>> release-1.6.0.a1
	},

	destroy: function()
	{
		gBrowser.removeProgressListener(this.webProgressListener);
	},

<<<<<<< HEAD
	refresh: function()
	{
		this.lastLocation = "";
		this.dataTitle = "";
		this.editMode = sbPageEditor.TOOLBAR.getAttribute("autoshow") == "true";
		this.infoMode = sbInfoViewer.TOOLBAR.getAttribute("autoshow") == "true";
		document.getElementById("ScrapBookMenu").hidden        = !this._prefBranch.getBoolPref("menuBar");
		var rVerComparator = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
		if ( rVerComparator.compare(this.ffVersion.version, "4.0")<0 ) {
			document.getElementById("ScrapBookStatusPanel").hidden = !this._prefBranch.getBoolPref("statusBar");
		}
		document.getElementById("ScrapBookToolsMenu").hidden   = !this._prefBranch.getBoolPref("toolsMenu");
		sbDataSource.init(true);
		sbDataSource.backup();
		this.setProtocolSubstitution();
		var file = sbCommonUtils.getScrapBookDir().clone();
		file.append("folders.txt");
		if (file.exists()) {
			this._prefBranch.setCharPref("folderList", sbCommonUtils.readFile(file));
		}
		else {
			var ids = this._prefBranch.getCharPref("folderList");
			sbCommonUtils.writeFile(file, ids, "UTF-8");
		}
	},

	setProtocolSubstitution: function()
	{
		var baseURL = sbCommonUtils.getBaseHref(sbDataSource.data.URI);
		var RPH = sbCommonUtils.IO.getProtocolHandler("resource")
		          .QueryInterface(Ci.nsIResProtocolHandler);
		if (RPH.hasSubstitution("scrapbook") && (RPH.getSubstitution("scrapbook").spec == baseURL))
			return;
		RPH.setSubstitution("scrapbook", sbCommonUtils.convertURLToObject(baseURL));
=======
	rebuild: function()
	{
		ScrapBookMenuHandler.shouldRebuild = true;
	},

	refresh: function()
	{
		this.lastLocation = "";
		this.editMode = sbPageEditor.TOOLBAR.getAttribute("autoshow") == "true";
		this.infoMode = sbInfoViewer.TOOLBAR.getAttribute("autoshow") == "true";
		document.getElementById("ScrapBookMenu").hidden        = !ScrapBookUtils.getPref("ui.menuBar");
		document.getElementById("ScrapBookStatusPanel").hidden = !ScrapBookUtils.getPref("ui.statusBar");
		document.getElementById("ScrapBookToolsMenu").hidden   = !ScrapBookUtils.getPref("ui.toolsMenu");
		var file = ScrapBookUtils.getScrapBookDir().clone();
		file.append("folders.txt");
		if (file.exists()) {
			ScrapBookUtils.setPref("ui.folderList", ScrapBookUtils.readFile(file));
		}
		else {
			var ids = ScrapBookUtils.getPref("ui.folderList");
			ScrapBookUtils.writeFile(file, ids, "UTF-8");
		}
		this.onLocationChange(gBrowser.currentURI.spec);
>>>>>>> release-1.6.0.a1
	},

	getID: function(aURL)
	{
		if (!aURL)
			aURL = gBrowser.currentURI ? gBrowser.currentURI.spec : "";
		var editable = (aURL.indexOf("file") == 0 && aURL.match(/\/data\/(\d{14})\//));
		return editable ? RegExp.$1 : null;
	},

	onLocationChange: function(aURL)
	{
<<<<<<< HEAD
		//Verhindert das Zurückbleiben von "ZombieCompartments"
		sbContentSaver.frameList = null;
		sbPageEditor.focusedWindow = null;
		sbPageEditor.savedBody = null;
=======
>>>>>>> release-1.6.0.a1
		if (aURL && aURL != (gBrowser.currentURI ? gBrowser.currentURI.spec : ""))
			return;
		if (aURL.indexOf("file") != 0 && aURL == this.lastLocation)
			return;
		var id = this.getID(aURL);
		document.getElementById("ScrapBookToolbox").hidden = id ? false : true;
		if (id) {
<<<<<<< HEAD
			this.resource = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
=======
			this.resource = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + id);
>>>>>>> release-1.6.0.a1
			if (this.editMode)
				window.setTimeout(function() { sbPageEditor.init(id); }, 20);
			else
				window.setTimeout(function() { sbPageEditor.showHide(false); }, 0);
			if (this.infoMode)
				window.setTimeout(function() { sbInfoViewer.init(id); }, 50);
		}
		this.locateMe = null;
		this.lastLocation = aURL;
	},

	buildPopup: function(aPopup)
	{
		var menuItem;
		menuItem = aPopup.appendChild(document.createElement("menuitem"));
		menuItem.id = "urn:scrapbook:root";
		menuItem.setAttribute("class", "menuitem-iconic bookmark-item");
		menuItem.setAttribute("container", "true");
		menuItem.setAttribute("label", this.STRING.getString("ROOT_FOLDER"));
		aPopup.appendChild(document.createElement("menuseparator"));
<<<<<<< HEAD
		var ids = this._prefBranch.getCharPref("folderList");
		ids = ids ? ids.split("|") : [];
		var shownItems = 0;
		var maxEntries = this._prefBranch.getIntPref("folderList.maxEntries");
		for (var i = 0; i < ids.length && shownItems < maxEntries; i++) {
			if (ids[i].length != 14)
				continue;
			var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + ids[i]);
			if (!sbDataSource.exists(res))
=======
		var ids = ScrapBookUtils.getPref("ui.folderList");
		ids = ids ? ids.split("|") : [];
		var shownItems = 0;
		var maxEntries = ScrapBookUtils.getPref("ui.folderList.maxEntries");
		for (var i = 0; i < ids.length && shownItems < maxEntries; i++) {
			if (ids[i].length != 14)
				continue;
			var res = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + ids[i]);
			if (!ScrapBookData.exists(res))
>>>>>>> release-1.6.0.a1
				continue;
			menuItem = aPopup.appendChild(document.createElement("menuitem"));
			menuItem.id = res.Value;
			menuItem.setAttribute("class", "menuitem-iconic bookmark-item");
			menuItem.setAttribute("container", "true");
<<<<<<< HEAD
			menuItem.setAttribute("label", sbDataSource.getProperty(res, "title"));
=======
			menuItem.setAttribute("label", ScrapBookData.getProperty(res, "title"));
>>>>>>> release-1.6.0.a1
			shownItems++;
		}
		if (shownItems > 0)
			aPopup.appendChild(document.createElement("menuseparator"));
		menuItem = aPopup.appendChild(document.createElement("menuitem"));
		menuItem.id = "ScrapBookContextPicking";
		menuItem.setAttribute("label", this.STRING.getString("SELECT_FOLDER") + "...");
	},

	destroyPopup: function(aPopup)
	{
		while (aPopup.hasChildNodes())
			aPopup.removeChild(aPopup.lastChild);
	},

	updateFolderPref : function(aResURI)
	{
		if ( aResURI == "urn:scrapbook:root" ) return;
<<<<<<< HEAD
		var oldIDs = this._prefBranch.getCharPref("folderList");
		oldIDs = oldIDs ? oldIDs.split("|") : [];
		var newIDs = [aResURI.substring(18,32)];
		oldIDs.forEach(function(id){ if ( id != newIDs[0] ) newIDs.push(id); });
		newIDs = newIDs.slice(0, this._prefBranch.getIntPref("folderList.maxEntries")).join("|");
		this._prefBranch.setCharPref("folderList", newIDs);
		var file = sbCommonUtils.getScrapBookDir().clone();
		file.append("folders.txt");
		sbCommonUtils.writeFile(file, newIDs, "UTF-8");
=======
		var oldIDs = ScrapBookUtils.getPref("ui.folderList");
		oldIDs = oldIDs ? oldIDs.split("|") : [];
		var newIDs = [aResURI.substring(18,32)];
		oldIDs.forEach(function(id){ if ( id != newIDs[0] ) newIDs.push(id); });
		newIDs = newIDs.slice(0, ScrapBookUtils.getPref("ui.folderList.maxEntries")).join("|");
		ScrapBookUtils.setPref("ui.folderList", newIDs);
		var file = ScrapBookUtils.getScrapBookDir().clone();
		file.append("folders.txt");
		ScrapBookUtils.writeFile(file, newIDs, "UTF-8");
>>>>>>> release-1.6.0.a1
	},

	verifyTargetID : function(aTargetID)
	{
		if (aTargetID == "ScrapBookContextPicking") {
			var ret = {};
			window.openDialog(
				"chrome://scrapbook/content/folderPicker.xul", "",
				"modal,chrome,centerscreen,resizable=yes", ret
			);
			return ret.resource ? ret.resource.Value : null;
		}
		if (aTargetID.indexOf("urn:scrapbook:") != 0)
			aTargetID = "urn:scrapbook:root";
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
<<<<<<< HEAD
		var targetWindow = aFrameOnly ? sbCommonUtils.getFocusedWindow() : window.content;
=======
		var targetWindow = aFrameOnly ? ScrapBookUtils.getFocusedWindow() : window.content;
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
			[linkURL], document.popupNode.ownerDocument.location.href, aShowDetail, aTargetID, 0, null, null, null, null, "SB"
		);
	},

	execCaptureTargetISO : function(aShowDetail, aTargetID)
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
			[linkURL], document.popupNode.ownerDocument.location.href, aShowDetail, aTargetID, 0, null, null, null, null, "SB", "ISO-8859-1"
=======
			[linkURL], document.popupNode.ownerDocument.location.href, aShowDetail, aTargetID, 0, null, null, null
>>>>>>> release-1.6.0.a1
		);
	},

	execBookmark: function(aTargetID)
	{
		aTargetID = this.verifyTargetID(aTargetID);
		if (!aTargetID)
			return;
		this.bookmark(aTargetID, 0);
	},

	bookmark: function(aResName, aResIndex, aPreset)
	{
<<<<<<< HEAD
		var newID = sbDataSource.identify(sbCommonUtils.getTimeStamp());
		var newItem = sbCommonUtils.newItem(newID);
=======
		var newItem = ScrapBookData.newItem();
>>>>>>> release-1.6.0.a1
		newItem.type   = "bookmark";
		newItem.source = window.content.location.href;
		newItem.title  = gBrowser.selectedTab.label;
		newItem.icon   = gBrowser.selectedTab.getAttribute("image");
		for (var prop in aPreset)
			newItem[prop] = aPreset[prop];
<<<<<<< HEAD
		sbDataSource.addItem(newItem, aResName, aResIndex);
		this.updateFolderPref(aResName);
		sbCommonUtils.rebuildGlobal();
=======
		ScrapBookData.addItem(newItem, aResName, aResIndex);
		this.updateFolderPref(aResName);
		ScrapBookUtils.refreshGlobal(false);
>>>>>>> release-1.6.0.a1
	},

	execLocate: function(aRes)
	{
<<<<<<< HEAD
//Hier werden Änderungen fällig
		//Dieser Block ist notwendig, da MultiSidebar verwendet Fehler verursachen würde
		var elSidebarId = "sidebar";
		var elSidebarTitleId = "sidebar-title";
		var elSidebarSplitterId = "sidebar-splitter";
		var elSidebarBoxId = "sidebar-box";
		var elPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		var elPosition;

		if ( elPrefs.prefHasUserValue("extensions.multisidebar.viewScrapBookSidebar") )
		{
			elPosition = elPrefs.getIntPref("extensions.multisidebar.viewScrapBookSidebar");
		} else
		{
			elPosition = 1;
		}
		if ( elPosition > 1)
		{
			elSidebarId = "sidebar-" + elPosition;
			elSidebarTitleId = "sidebar-" + elPosition + "-title";
			elSidebarSplitterId = "sidebar-" + elPosition + "-splitter";
			elSidebarBoxId = "sidebar-" + elPosition + "-box";
		}
		//Ende Block
		if (!aRes)
			return;
		if (!sbDataSource.exists(aRes)) {
=======
		if (!aRes)
			return;
		if (!ScrapBookData.exists(aRes)) {
>>>>>>> release-1.6.0.a1
			sbPageEditor.disable(true);
			return;
		}
		if (document.getElementById("viewScrapBookSidebar").getAttribute("checked"))
<<<<<<< HEAD
			document.getElementById(elSidebarId).contentWindow.sbMainService.locate(aRes);
=======
			document.getElementById("sidebar").contentWindow.sbMainUI.locate(aRes);
>>>>>>> release-1.6.0.a1
		else {
			this.locateMe = aRes;
			toggleSidebar("viewScrapBookSidebar");
		}
	},

	getLinkURI: function()
	{
		var i = 0;
		var linkURL;
		var curNode = document.popupNode;
		while (++i < 10 && curNode) {
			if ((curNode instanceof HTMLAnchorElement || curNode instanceof HTMLAreaElement ) && 
			    curNode.href) {
				linkURL = curNode.href;
				break;
			}
			curNode = curNode.parentNode;
		}
		if (linkURL)
			return linkURL;
	},

	isSelected : function()
	{
<<<<<<< HEAD
		var sel = sbCommonUtils.getFocusedWindow().getSelection().QueryInterface(Ci.nsISelectionPrivate);
		var isSelected = false;
		try {
			isSelected = !(sel.anchorNode == sel.focusNode && sel.anchorOffset == sel.focusOffset);
		}
		catch(ex) {}
		return isSelected;
=======
		var sel = ScrapBookUtils.getFocusedWindow().getSelection().QueryInterface(Ci.nsISelectionPrivate);
		var selected = sel.anchorNode !== sel.focusNode || sel.anchorOffset != sel.focusOffset;
		return selected;
>>>>>>> release-1.6.0.a1
	},

	handleEvent: function(event)
	{
		if (event.type == "popupshowing")
			this.onPopupShowing(event);
	},

<<<<<<< HEAD
=======
	_dragStartTime: null,

	handleDragEvents: function(event)
	{
		event.preventDefault();
		switch (event.type) {
			case "dragenter": 
				this._dragStartTime = Date.now();
				break;
			case "dragover": 
				if (this._dragStartTime && Date.now() - this._dragStartTime > 1000) {
					this._dragStartTime = null;
					event.target.doCommand();
				}
				break;
			default: 
		}
	},

>>>>>>> release-1.6.0.a1
	onPopupShowing : function(event)
	{
		if (event.originalTarget.id != "contentAreaContextMenu")
			return;
		var selected, onLink, inFrame, onInput;
		try {
			selected = gContextMenu.isTextSelected;
			onLink   = gContextMenu.onLink && !gContextMenu.onMailtoLink;
			inFrame  = gContextMenu.inFrame;
			onInput  = gContextMenu.onTextInput;
		}
		catch(ex) {
			selected = this.isSelected();
			onLink   = this.getLinkURI() ? true : false;
			inFrame  = document.popupNode.ownerDocument != window.content.document;
			onInput  = document.popupNode instanceof HTMLTextAreaElement || 
			           (document.popupNode instanceof HTMLInputElement && 
			           (document.popupNode.type == "text" || document.popupNode.type == "password"));
		}
		var isActive = selected || onLink || onInput;
		var getElement = function(aID) {
			return document.getElementById(aID);
		};
<<<<<<< HEAD
		var prefContext  = this._prefBranch.getBoolPref("contextMenu");
		var prefBookmark = this._prefBranch.getBoolPref("bookmarkMenu");
=======
		var prefContext  = ScrapBookUtils.getPref("ui.contextMenu");
		var prefBookmark = ScrapBookUtils.getPref("ui.bookmarkMenu");
>>>>>>> release-1.6.0.a1
		getElement("ScrapBookContextMenu0").hidden = !prefContext || onInput;
		getElement("ScrapBookContextMenu1").hidden = !prefContext || !selected;
		getElement("ScrapBookContextMenu2").hidden = !prefContext || !selected;
		getElement("ScrapBookContextMenu3").hidden = !prefContext || isActive;
		getElement("ScrapBookContextMenu4").hidden = !prefContext || isActive;
		getElement("ScrapBookContextMenu5").hidden = !prefContext || isActive || !inFrame;
		getElement("ScrapBookContextMenu6").hidden = !prefContext || isActive || !inFrame;
		getElement("ScrapBookContextMenu7").hidden = !prefContext || selected || !onLink;
		getElement("ScrapBookContextMenu8").hidden = !prefContext || selected || !onLink;
<<<<<<< HEAD
		getElement("ScrapBookContextMenu10").hidden = !prefContext || selected || !onLink;
=======
>>>>>>> release-1.6.0.a1
		getElement("ScrapBookContextMenu9").hidden = !prefContext || isActive || !prefBookmark;
	},

	onMiddleClick: function(event, aFlag)
	{
		if (event.originalTarget.localName == "menu" || event.button != 1)
			return;
<<<<<<< HEAD
=======
		document.getElementById("contentAreaContextMenu").hidePopup();
>>>>>>> release-1.6.0.a1
		switch (aFlag) {
			case 1 : this.execCapture(1, true, true , event.originalTarget.id); break;
			case 3 : this.execCapture(2, false,true , event.originalTarget.id); break;
			case 5 : this.execCapture(2, true, true , event.originalTarget.id); break;
			case 7 : this.execCaptureTarget(true,  event.originalTarget.id); break;
		}
	},

};




<<<<<<< HEAD
var sbMenuHandler = {
=======
var ScrapBookMenuHandler = {
>>>>>>> release-1.6.0.a1

	_menu: null,
	baseURL: "",
	shouldRebuild: false,

	_init: function()
	{
		this._menu = document.getElementById("ScrapBookMenu");
<<<<<<< HEAD
		this.baseURL  = sbCommonUtils.getBaseHref(sbDataSource.data.URI);
=======
		this.baseURL  = ScrapBookUtils.getBaseHref(ScrapBookData.dataSource.URI);
>>>>>>> release-1.6.0.a1
		var dsEnum = this._menu.database.GetDataSources();
		while (dsEnum.hasMoreElements()) {
			var ds = dsEnum.getNext().QueryInterface(Ci.nsIRDFDataSource);
			this._menu.database.RemoveDataSource(ds);
		}
<<<<<<< HEAD
		this._menu.database.AddDataSource(sbDataSource.data);
=======
		this._menu.database.AddDataSource(ScrapBookData.dataSource);
>>>>>>> release-1.6.0.a1
		this._menu.builder.rebuild();
		this.shouldRebuild = false;
	},

	onPopupShowing: function(event, aMenuPopup)
	{
		var getElement = function(aID) {
			return document.getElementById(aID);
		};
		var initFlag = false;
		var dsEnum = getElement("ScrapBookMenu").database.GetDataSources();
		while (dsEnum.hasMoreElements()) {
			var ds = dsEnum.getNext().QueryInterface(Ci.nsIRDFDataSource);
<<<<<<< HEAD
			if (ds.URI == sbDataSource.data.URI)
=======
			if (ds.URI == ScrapBookData.dataSource.URI)
>>>>>>> release-1.6.0.a1
				initFlag = true;
		}
		if (!initFlag)
			this._init();
<<<<<<< HEAD
		var selected = sbBrowserOverlay.isSelected();
		if (event.target == aMenuPopup) {
			getElement("ScrapBookMenubarItem1").setAttribute("label", document.getElementById("ScrapBookContextMenu" + (selected ? 1 : 3)).getAttribute("label"));
			getElement("ScrapBookMenubarItem2").setAttribute("label", document.getElementById("ScrapBookContextMenu" + (selected ? 2 : 4)).getAttribute("label"));
=======
		var selected = ScrapBookBrowserOverlay.isSelected();
		if (event.target == aMenuPopup) {
			var label1 = document.getElementById("ScrapBookContextMenu" + (selected ? 1 : 3)).getAttribute("label");
			var label2 = document.getElementById("ScrapBookContextMenu" + (selected ? 2 : 4)).getAttribute("label");
			getElement("ScrapBookMenubarItem1").setAttribute("label", label1);
			getElement("ScrapBookMenubarItem2").setAttribute("label", label2);
>>>>>>> release-1.6.0.a1
			getElement("ScrapBookMenubarItem1").className = "menuitem-iconic " + (selected ? "sb-capture-partial" : "sb-capture-entire");
			getElement("ScrapBookMenubarItem2").className = "menuitem-iconic " + (selected ? "sb-capture-partial" : "sb-capture-entire");
			getElement("ScrapBookMenubarItem5").label = getElement("ScrapBookMenubarItem5").getAttribute("sblabel");
			if (!this.shouldRebuild)
				return;
			this.shouldRebuild = false;
			this._menu.builder.rebuild();
		}
		else {
			if (event.target.firstChild && event.target.firstChild.className.indexOf("sb-capture") >= 0) {
				event.target.firstChild.label     = getElement("ScrapBookMenubarItem1").label;
				event.target.firstChild.className = getElement("ScrapBookMenubarItem1").className;
				return;
			}
			var elt1 = document.createElement("menuseparator");
			var elt2 = document.createElement("menuitem");
			elt2.setAttribute("class", getElement("ScrapBookMenubarItem1").className);
			elt2.setAttribute("label", getElement("ScrapBookMenubarItem1").label);
			elt2.setAttribute("resuri", event.target.parentNode.resource.Value);
			event.target.insertBefore(elt1, event.target.firstChild);
			event.target.insertBefore(elt2, event.target.firstChild);
		}
	},

	onClick: function(event)
	{
		if (event.target.id == "ScrapBookMenubarItem3" || event.target.id == "ScrapBookMenubarItem4")
			return;
		if (event.target.className.indexOf("sb-capture") >= 0) {
<<<<<<< HEAD
			var ds = null;
			var dsEnum = document.getElementById("ScrapBookMenu").database.GetDataSources();
			while (dsEnum.hasMoreElements()) {
				ds = dsEnum.getNext().QueryInterface(Ci.nsIRDFDataSource);
				document.getElementById("ScrapBookMenu").database.RemoveDataSource(ds);
			}
			var aShowDetail = event.target.id == "ScrapBookMenubarItem2" || event.button == 1;
			var resURI = event.target.hasAttribute("resuri") ? event.target.getAttribute("resuri") : "urn:scrapbook:root";
			sbBrowserOverlay.execCapture(0, null, aShowDetail, resURI);
			document.getElementById("ScrapBookMenu").database.AddDataSource(ds);
=======
			var aShowDetail = event.target.id == "ScrapBookMenubarItem2" || event.button == 1;
			var resURI = event.target.hasAttribute("resuri") ? event.target.getAttribute("resuri") : "urn:scrapbook:root";
			ScrapBookBrowserOverlay.execCapture(0, null, aShowDetail, resURI);
>>>>>>> release-1.6.0.a1
			return;
		}
		if (event.button == 1)
			this._menu.firstChild.hidePopup();
		if (event.target.id.indexOf("urn:scrapbook:") != 0)
			return;
<<<<<<< HEAD
		var res = sbCommonUtils.RDF.GetResource(event.target.id);
		if (sbDataSource.isContainer(res)) {
			if (event.button == 1)
				sbBrowserOverlay.execLocate(res);
			return;
		}
		var id = sbDataSource.getProperty(res, "id");
		if (!id)
			return;
		var url;
		switch (sbDataSource.getProperty(res, "type")) {
			case "note"     : url = "chrome://scrapbook/content/note.xul?id=" + id; break;
			case "bookmark" : url = sbDataSource.getProperty(res, "source");        break;
			default         : url = this.baseURL + "data/" + id + "/index.html";
		}
		var openInTab = sbCommonUtils.PREF.getBoolPref("scrapbook.tabs.open");
		sbCommonUtils.loadURL(url, openInTab || event.button == 1 || event.ctrlKey || event.shiftKey);
=======
		var res = ScrapBookUtils.RDF.GetResource(event.target.id);
		if (ScrapBookData.isContainer(res)) {
			if (event.button == 1)
				ScrapBookBrowserOverlay.execLocate(res);
			return;
		}
		var id = ScrapBookData.getProperty(res, "id");
		if (!id)
			return;
		var url;
		switch (ScrapBookData.getProperty(res, "type")) {
			case "note"     : url = "chrome://scrapbook/content/note.xul?id=" + id; break;
			case "bookmark" : url = ScrapBookData.getProperty(res, "source");        break;
			default         : url = this.baseURL + "data/" + id + "/index.html";
		}
		var openInTab = ScrapBookUtils.getPref("tabs.open");
		ScrapBookUtils.loadURL(url, openInTab || event.button == 1 || event.ctrlKey || event.shiftKey);
>>>>>>> release-1.6.0.a1
		event.stopPropagation();
	},

	execCaptureAllTabs: function(aTargetID)
	{
		if (!aTargetID)
<<<<<<< HEAD
			aTargetID = sbBrowserOverlay.verifyTargetID("ScrapBookContextPicking");
=======
			aTargetID = ScrapBookBrowserOverlay.verifyTargetID("ScrapBookContextPicking");
>>>>>>> release-1.6.0.a1
		if (!aTargetID)
			return;
		var tabList = [];
		var nodes = gBrowser.mTabContainer.childNodes;
		for (var i = 0; i < nodes.length; i++)
			tabList.push(nodes[i]);
		this._goNextTab(tabList, aTargetID);
	},

	_goNextTab: function(tabList, aTargetID)
	{
		if (tabList.length == 0)
			return;
		var tab = tabList.shift();
		gBrowser.selectedTab = tab;
		var win = gBrowser.getBrowserForTab(tab).contentWindow;
		if (win.location.href != "about:blank")
		{
			try {
				sbContentSaver.captureWindow(win, false, false, aTargetID, 0, null);
			} catch(ex) {
			}
		}
<<<<<<< HEAD
		setTimeout(function(){ sbMenuHandler._goNextTab(tabList, aTargetID); }, 1000);
=======
		setTimeout(function(){ ScrapBookMenuHandler._goNextTab(tabList, aTargetID); }, 1000);
>>>>>>> release-1.6.0.a1
	},

};




<<<<<<< HEAD
window.addEventListener("load", function(){ sbBrowserOverlay.init(); }, false);
window.addEventListener("unload", function(){ sbBrowserOverlay.destroy(); }, false);
=======
window.addEventListener("load", function(){ ScrapBookBrowserOverlay.init(); }, false);
window.addEventListener("unload", function(){ ScrapBookBrowserOverlay.destroy(); }, false);
>>>>>>> release-1.6.0.a1


