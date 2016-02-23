
var sbBrowserOverlay = {

    lastLocation: "",
    editMode: false,
    infoMode: false,
    resource: null,
    locateMe: null,

    webProgressListener: {
        onLocationChange: function(aProgress, aRequest, aURI) {
            sbBrowserOverlay.onLocationChange(aURI ? aURI.spec : "about:blank");
        },
        onStateChange      : function(){},
        onProgressChange   : function(){},
        onStatusChange     : function(){},
        onSecurityChange   : function(){},
        onLinkIconAvailable: function(){},
        QueryInterface: function(aIID) {
            if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
                aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
                aIID.equals(Components.interfaces.nsISupports))
                return this;
            throw Components.results.NS_NOINTERFACE;
        },
    },

    init: function() {
        gBrowser.addProgressListener(this.webProgressListener);
        document.getElementById("contentAreaContextMenu").addEventListener( "popupshowing", this, false);
        this.refresh();
        // hotkeys
        var key = sbCommonUtils.getPref("key.menubar", "");
        if (key.length == 1) {
            var elt = document.getElementById("ScrapBookMenu");
            elt.setAttribute("accesskey", key);
        }
        var keyMap = {
            "key.sidebar"       : "key_openScrapBookSidebar",
            "key.capture"       : "key_ScrapBookCapture",
            "key.captureAs"     : "key_ScrapBookCaptureAs",
            "key.captureAllTabs": "key_ScrapBookSaveAllTabs",
            "key.bookmark"      : "key_BookmarkWithScrapBook",
        };
        for (let [pref, id] in Iterator(keyMap)) {
            var key = sbCommonUtils.getPref(pref, "");
            var elt = document.getElementById(id);
            if (key.length == 1) {
                elt.setAttribute("key", key);
            } else {
                elt.parentNode.removeChild(elt);
            }
        }
    },

    destroy: function() {
        gBrowser.removeProgressListener(this.webProgressListener);
    },

    rebuild: function() {
        sbMenuHandler.shouldRebuild = true;
    },

    refresh: function() {
        this.lastLocation = "";
        this.editMode = sbPageEditor.TOOLBAR.getAttribute("autoshow") == "true";
        this.infoMode = sbInfoViewer.TOOLBAR.getAttribute("autoshow") == "true";
        // update menus by ui settings
        document.getElementById("ScrapBookMenu").hidden        = !sbCommonUtils.getPref("ui.menuBar", false);
        document.getElementById("ScrapBookToolsMenu").hidden   = !sbCommonUtils.getPref("ui.toolsMenu", false);
        // -- context menu
        // update if it's shown in a submenu
        var contextMenu = document.getElementById("contentAreaContextMenu");
        var submenu = document.getElementById("ScrapBookContextSubmenu");
        var submenu_mode_old = submenu.firstChild.hasChildNodes();
        var submenu_mode_new = sbCommonUtils.getPref("ui.contextSubMenu", false);
        if (submenu_mode_new != submenu_mode_old) {
            if (submenu_mode_new) {
                var start = document.getElementById("ScrapBookContextMenu0"), end = submenu, current;
                while ((current = start.nextSibling) !== end) {
                    submenu.firstChild.appendChild(current);
                }
            } else {
                while (submenu.firstChild.hasChildNodes()) {
                    contextMenu.insertBefore(submenu.firstChild.firstChild, submenu);
                }
            }
        }
        // -- main menu
        // update if it's shown as icon
        var menu = document.getElementById("ScrapBookMenu");
        if (sbCommonUtils.getPref("ui.menuBar.icon", false)) {
            menu.setAttribute("label", "");
            menu.setAttribute("class", "menu-iconic");
        } else {
            menu.setAttribute("label", menu.getAttribute("data-label"));
            menu.setAttribute("class", "");
        }
        // update the database and sidebar
        sbDataSource.backup();
        this.setProtocolSubstitution();
        var file = sbCommonUtils.getScrapBookDir().clone();
        file.append("folders.txt");
        if (file.exists()) {
            sbCommonUtils.setPref("ui.folderList", sbCommonUtils.readFile(file));
        } else {
            var ids = sbCommonUtils.getPref("ui.folderList", "");
            sbCommonUtils.writeFile(file, ids, "UTF-8");
        }
        // fire a "location change" event, which updates the main browser window and editor and info toolbars
        this.onLocationChange(gBrowser.currentURI.spec);
    },

    setProtocolSubstitution: function() {
        var baseURL = sbCommonUtils.getBaseHref(sbDataSource.data.URI);
        var RPH = sbCommonUtils.IO.getProtocolHandler("resource")
                  .QueryInterface(Components.interfaces.nsIResProtocolHandler);
        if (RPH.hasSubstitution("scrapbook") && (RPH.getSubstitution("scrapbook").spec == baseURL))
            return;
        RPH.setSubstitution("scrapbook", sbCommonUtils.convertURLToObject(baseURL));
    },

    getID: function(aURL) {
        if (!aURL) aURL = gBrowser.currentURI ? gBrowser.currentURI.spec : "";
        return sbCommonUtils.convertURLToId(aURL);
    },

    onLocationChange: function(aURL) {
        if (aURL && aURL != (gBrowser.currentURI ? gBrowser.currentURI.spec : ""))
            return;
        if (aURL.indexOf("file") != 0 && aURL == this.lastLocation)
            return;
        var id = this.getID(aURL);
        document.getElementById("ScrapBookToolbox").hidden = id ? false : true;
        if (id) {
            this.resource = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
            if (this.editMode) {
                window.setTimeout(function() { sbPageEditor.init(id); }, 20);
            } else {
                window.setTimeout(function() { sbPageEditor.showHide(false); }, 0);
            }
            if (this.infoMode)
                window.setTimeout(function() { sbInfoViewer.init(id); }, 50);
        } else {
            window.setTimeout(function() { sbPageEditor.uninit(); }, 0);
            if ( sbCommonUtils.getPref("notifyPageCaptured", true) ) this.notifyPageCaptured(aURL);
        }
        this.locateMe = null;
        this.lastLocation = aURL;
    },

    notifyPageCaptured: function(aURL) {
        aURL = sbCommonUtils.splitURLByAnchor(aURL)[0];
        var result = [];
        var resList = sbDataSource.flattenResources(sbCommonUtils.RDF.GetResource("urn:scrapbook:root"), 2, true);
        resList.forEach(function(res) {
            if (["bookmark", "note", "notex"].indexOf(sbDataSource.getProperty(res, "type")) != -1) return;
            if (sbCommonUtils.splitURLByAnchor(sbDataSource.getProperty(res, "source"))[0] == aURL) result.push(res);
        }, this);
        if (result.length) {
            res = result[0];
            var id = sbDataSource.getProperty(res, "id");
            var title = sbDataSource.getProperty(res, "title");
            var type = sbDataSource.getProperty(res, "type");
            var icon = sbDataSource.getProperty(res, "icon") || sbCommonUtils.getDefaultIcon(type);

            var text = title;
            var title = sbCommonUtils.lang("overlay", "PAGE_CAPTURED", [result.length]);
            var listener = {
                observe: function(subject, topic, data) {
                    if (topic == "alertclickcallback")
                        sbCommonUtils.loadURL("chrome://scrapbook/content/view.xul?id=" + data);
                }
            };
            var alertsSvc = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
            alertsSvc.showAlertNotification(icon, title, text, true, id, listener);
        }
    },

    buildPopup: function(aPopup) {
        var menuItem;
        menuItem = aPopup.appendChild(document.createElement("menuitem"));
        menuItem.id = "urn:scrapbook:root";
        menuItem.setAttribute("class", "menuitem-iconic bookmark-item");
        menuItem.setAttribute("container", "true");
        menuItem.setAttribute("label", sbCommonUtils.lang("overlay", "ROOT_FOLDER"));
        aPopup.appendChild(document.createElement("menuseparator"));
        var ids = sbCommonUtils.getPref("ui.folderList", "");
        ids = ids ? ids.split("|") : [];
        var shownItems = 0;
        var maxEntries = sbCommonUtils.getPref("ui.folderList.maxEntries", 5);
        for (var i = 0; i < ids.length && shownItems < maxEntries; i++) {
            if (!sbCommonUtils.validateID(ids[i])) continue;
            var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + ids[i]);
            if (!sbDataSource.exists(res)) continue;
            menuItem = aPopup.appendChild(document.createElement("menuitem"));
            menuItem.id = res.Value;
            menuItem.setAttribute("class", "menuitem-iconic bookmark-item");
            menuItem.setAttribute("container", "true");
            menuItem.setAttribute("label", sbDataSource.getProperty(res, "title"));
            shownItems++;
        }
        if (shownItems > 0)
            aPopup.appendChild(document.createElement("menuseparator"));
        menuItem = aPopup.appendChild(document.createElement("menuitem"));
        menuItem.id = "ScrapBookContextPicking";
        menuItem.setAttribute("label", sbCommonUtils.lang("overlay", "SELECT_FOLDER"));
    },

    destroyPopup: function(aPopup) {
        while (aPopup.hasChildNodes())
            aPopup.removeChild(aPopup.lastChild);
    },

    updateFolderPref : function(aResURI) {
        if ( aResURI == "urn:scrapbook:root" ) return;
        var oldIDs = sbCommonUtils.getPref("ui.folderList", "");
        oldIDs = oldIDs ? oldIDs.split("|") : [];
        var newIDs = [aResURI.substring(18,32)];
        oldIDs.forEach(function(id){ if ( id != newIDs[0] ) newIDs.push(id); });
        newIDs = newIDs.slice(0, sbCommonUtils.getPref("ui.folderList.maxEntries", 5)).join("|");
        sbCommonUtils.setPref("ui.folderList", newIDs);
        var file = sbCommonUtils.getScrapBookDir().clone();
        file.append("folders.txt");
        sbCommonUtils.writeFile(file, newIDs, "UTF-8");
    },

    verifyTargetID : function(aTargetID) {
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

    execCapture : function(aPartialEntire, aFrameOnly, aShowDetail, aTargetID) {
        if ( aPartialEntire == 0 ) {
            aPartialEntire = this.isSelected() ? 1 : 2;
            aFrameOnly = aPartialEntire == 1;
        }
        aTargetID = this.verifyTargetID(aTargetID);
        if ( !aTargetID ) return;
        var targetWindow = aFrameOnly ? sbCommonUtils.getFocusedWindow() : window.content;
        var ret = sbContentSaver.captureWindow(targetWindow, aPartialEntire == 1, aShowDetail, aTargetID, 0, null);
        return ret;
    },

    execCaptureTarget : function(aShowDetail, aTargetID) {
        aTargetID = this.verifyTargetID(aTargetID);
        if ( !aTargetID ) return;
        var linkURL;
        try {
            linkURL = gContextMenu.getLinkURL();
        } catch(ex) {
            linkURL = this.getLinkURI();
        }
        if ( !linkURL ) return;
        var data = {
            urls: [linkURL],
            refUrl: document.popupNode.ownerDocument.location.href,
            showDetail: aShowDetail,
            resName: aTargetID,
            resIdx: 0,
            referItem: null,
            option: null,
            file2Url: null,
            preset: null,
            charset: null,
            timeout: null,
            titles: null,
            context: "link",
        };
        window.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no", data);
    },

    execBookmark: function(aTargetID) {
        aTargetID = this.verifyTargetID(aTargetID);
        if (!aTargetID)
            return;
        this.bookmark(aTargetID, 0);
    },

    bookmark: function(aResName, aResIndex, aPreset) {
        var newItem = sbCommonUtils.newItem(sbCommonUtils.getTimeStamp());
        newItem.id     = sbDataSource.identify(newItem.id);
        newItem.type   = "bookmark";
        newItem.source = window.content.location.href;
        newItem.title  = gBrowser.selectedTab.label;
        newItem.icon   = gBrowser.selectedTab.getAttribute("image");
        for (var prop in aPreset)
            newItem[prop] = aPreset[prop];
        sbDataSource.addItem(newItem, aResName, aResIndex);
        this.updateFolderPref(aResName);
        sbCommonUtils.rebuildGlobal();
    },

    execLocate: function(aRes) {
        var sidebarId = sbCommonUtils.getSidebarId("sidebar");
        if (!aRes)
            return;
        if (!sbDataSource.exists(aRes)) {
            sbPageEditor.disable(true);
            return;
        }
        if (document.getElementById("viewScrapBookSidebar").getAttribute("checked")) {
            document.getElementById(sidebarId).contentWindow.sbMainService.locate(aRes);
        } else {
            this.locateMe = aRes;
            toggleSidebar("viewScrapBookSidebar");
        }
    },

    getLinkURI: function() {
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

    isSelected : function() {
        var sel = sbCommonUtils.getFocusedWindow().getSelection().QueryInterface(Components.interfaces.nsISelectionPrivate);
        var isSelected = false;
        try {
            isSelected = !(sel.anchorNode == sel.focusNode && sel.anchorOffset == sel.focusOffset);
        } catch(ex) {}
        return isSelected;
    },

    handleEvent: function(event) {
        if (event.type == "popupshowing")
            this.onPopupShowing(event);
    },

    onPopupShowing : function(event) {
        if (event.originalTarget.id != "contentAreaContextMenu")
            return;
        var selected, onLink, inFrame, onInput;
        try {
            selected = gContextMenu.isTextSelected;
            onLink   = gContextMenu.onLink && !gContextMenu.onMailtoLink;
            inFrame  = gContextMenu.inFrame;
            onInput  = gContextMenu.onTextInput;
        } catch(ex) {
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
        var prefContext  = sbCommonUtils.getPref("ui.contextMenu", false);
        var prefContextSub = sbCommonUtils.getPref("ui.contextSubMenu", false);
        var prefBookmark = sbCommonUtils.getPref("ui.bookmarkMenu", false);
        getElement("ScrapBookContextSubmenu").hidden = !prefContext || !prefContextSub;
        getElement("ScrapBookContextMenu0").hidden = !prefContext || onInput;
        getElement("ScrapBookContextMenu1").hidden = !prefContext || !selected;
        getElement("ScrapBookContextMenu2").hidden = !prefContext || !selected;
        getElement("ScrapBookContextMenu3").hidden = !prefContext || isActive;
        getElement("ScrapBookContextMenu4").hidden = !prefContext || isActive;
        getElement("ScrapBookContextMenu5").hidden = !prefContext || isActive || !inFrame;
        getElement("ScrapBookContextMenu6").hidden = !prefContext || isActive || !inFrame;
        getElement("ScrapBookContextMenu7").hidden = !prefContext || selected || !onLink;
        getElement("ScrapBookContextMenu8").hidden = !prefContext || selected || !onLink;
        getElement("ScrapBookContextMenu9").hidden = !prefContext || isActive || !prefBookmark;
        getElement("ScrapBookContextMenu10").hidden = !prefContext || !sbHtmlEditor.enabled;
    },

    onMiddleClick: function(event, aFlag) {
        if (event.originalTarget.localName == "menu" || event.button != 1)
            return;
        switch (aFlag) {
            case 1 : this.execCapture(1, true, true , event.originalTarget.id); break;
            case 3 : this.execCapture(2, false,true , event.originalTarget.id); break;
            case 5 : this.execCapture(2, true, true , event.originalTarget.id); break;
            case 7 : this.execCaptureTarget(true,  event.originalTarget.id); break;
        }
    },

};




var sbMenuHandler = {

    _menu: null,
    baseURL: "",
    shouldRebuild: false,

    _init: function() {
        this._menu = document.getElementById("ScrapBookMenu");
        this.baseURL  = sbCommonUtils.getBaseHref(sbDataSource.data.URI);
        var dsEnum = this._menu.database.GetDataSources();
        while (dsEnum.hasMoreElements()) {
            var ds = dsEnum.getNext().QueryInterface(Components.interfaces.nsIRDFDataSource);
            this._menu.database.RemoveDataSource(ds);
        }
        this._menu.database.AddDataSource(sbDataSource.data);
        this._menu.builder.rebuild();
        this.shouldRebuild = false;
    },

    onPopupShowing: function(event, aMenuPopup) {
        var getElement = function(aID) {
            return document.getElementById(aID);
        };
        var initFlag = false;
        var dsEnum = getElement("ScrapBookMenu").database.GetDataSources();
        while (dsEnum.hasMoreElements()) {
            var ds = dsEnum.getNext().QueryInterface(Components.interfaces.nsIRDFDataSource);
            if (ds.URI == sbDataSource.data.URI)
                initFlag = true;
        }
        if (!initFlag)
            this._init();
        var selected = sbBrowserOverlay.isSelected();
        if (event.target == aMenuPopup) {
            getElement("ScrapBookMenubarItem1").setAttribute("label", document.getElementById("ScrapBookContextMenu" + (selected ? 1 : 3)).getAttribute("label"));
            getElement("ScrapBookMenubarItem2").setAttribute("label", document.getElementById("ScrapBookContextMenu" + (selected ? 2 : 4)).getAttribute("label"));
            getElement("ScrapBookMenubarItem1").className = "menuitem-iconic " + (selected ? "sb-capture-partial" : "sb-capture-entire");
            getElement("ScrapBookMenubarItem2").className = "menuitem-iconic " + (selected ? "sb-capture-partial" : "sb-capture-entire");
            getElement("ScrapBookMenubarItem5").label = getElement("ScrapBookMenubarItem5").getAttribute("sblabel");            if (!this.shouldRebuild)
                return;
            this.shouldRebuild = false;
            this._menu.builder.rebuild();
        } else {
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

    onClick: function(event) {
        if (event.target.id == "ScrapBookMenubarItem3" || event.target.id == "ScrapBookMenubarItem4")
            return;
        if (event.target.className.indexOf("sb-capture") >= 0) {
            var ds = null;
            var dsEnum = document.getElementById("ScrapBookMenu").database.GetDataSources();
            while (dsEnum.hasMoreElements()) {
                ds = dsEnum.getNext().QueryInterface(Components.interfaces.nsIRDFDataSource);
                document.getElementById("ScrapBookMenu").database.RemoveDataSource(ds);
            }
            var aShowDetail = event.target.id == "ScrapBookMenubarItem2" || event.button == 1;
            var resURI = event.target.hasAttribute("resuri") ? event.target.getAttribute("resuri") : "urn:scrapbook:root";
            sbBrowserOverlay.execCapture(0, null, aShowDetail, resURI);
            document.getElementById("ScrapBookMenu").database.AddDataSource(ds);
            return;
        }
        if (event.button == 1)
            this._menu.firstChild.hidePopup();
        if (event.target.id.indexOf("urn:scrapbook:") != 0)
            return;
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
        var openInTab = sbCommonUtils.getPref("tabs.open", false);
        sbCommonUtils.loadURL(url, openInTab || event.button == 1 || event.ctrlKey || event.shiftKey);
        event.stopPropagation();
    },

    execCaptureAllTabs: function(aTargetID) {
        if (!aTargetID)
            aTargetID = sbBrowserOverlay.verifyTargetID("ScrapBookContextPicking");
        if (!aTargetID)
            return;
        var tabList = [];
        var nodes = gBrowser.mTabContainer.childNodes;
        for (var i = 0; i < nodes.length; i++)
            tabList.push(nodes[i]);
        this._goNextTab(tabList, aTargetID);
    },

    _goNextTab: function(tabList, aTargetID) {
        if (tabList.length == 0)
            return;
        var tab = tabList.shift();
        gBrowser.selectedTab = tab;
        var win = gBrowser.getBrowserForTab(tab).contentWindow;
        if (win.location.href != "about:blank") {
            try {
                sbContentSaver.captureWindow(win, false, false, aTargetID, 0, null);
            } catch(ex) {
            }
        }
        setTimeout(function(){ sbMenuHandler._goNextTab(tabList, aTargetID); }, 1000);
    },

};




window.addEventListener("load", function(){ sbBrowserOverlay.init(); }, false);
window.addEventListener("unload", function(){ sbBrowserOverlay.destroy(); }, false);


