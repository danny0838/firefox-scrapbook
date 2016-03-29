
var sbCaptureOptions = {

    get CUSTOM_UI() { return document.getElementById("sbDetailCustom"); },
    get WARNING_UI(){ return document.getElementById("sbDetailWarnAboutScript"); },

    param : null,

    init : function() {
        if ( !window.arguments || !("sbContentSaver" in window.opener) ) window.close();
        this.param = window.arguments[0];
        // accept button
        document.documentElement.getButton("accept").label = sbCommonUtils.lang("scrapbook", "CAPTURE_OK_BUTTON");
        // title
        this.fillTitleList();
        // script warning
        this.WARNING_UI.setAttribute("offset", this.WARNING_UI.boxObject.height || 32);
        setTimeout(function(){ sbCaptureOptions.updateWarningUI(document.getElementById('sbDetailOptionScript').checked); }, 0);
        // download link - custom extension
        this.updateCustomUI();
        // context specific settings
        if ( this.param.context == "capture-again" || this.param.context == "capture-again-deep" ) {
            document.getElementById("sbDetailFolderRow").collapsed = true;
            document.getElementById("sbDetailWarnAboutRenew").hidden = false;
            document.getElementById("sbDetailTabComment").hidden = true;
            if ( this.param.context == "capture-again-deep" ) {
                document.getElementById("sbDetailInDepthBox").collapsed = true;
            }
        } else {
            // make folder list
            setTimeout(function(){ sbFolderSelector.init(); }, 100);
            // comment
            document.getElementById("sbDetailComment").value = this.param.item.comment.replace(/ __BR__ /g, "\n");
        }
    },

    updateCustomUI : function() {
        this.CUSTOM_UI.nextSibling.disabled = !this.CUSTOM_UI.checked;
    },

    updateWarningUI : function(checked) {
        var oldHidden = this.WARNING_UI.hidden;
        var newHidden = !checked;
        this.WARNING_UI.hidden = newHidden;
        if (oldHidden != newHidden) {
            var offset = parseInt(this.WARNING_UI.getAttribute("offset"), 10);
            newHidden ? window.outerHeight -= offset : window.outerHeight += offset;
        }
    },

    fillTitleList : function() {
        var isPartial = this.param.titles.length > 1;
        var list = document.getElementById("sbDetailTitle");
        if ( this.param.context == "capture-again" ) {
            var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + this.param.item.id);
            list.appendItem(sbDataSource.getProperty(res, "title"));
        }
        for ( var i = 0; i < this.param.titles.length; i++ ) {
            list.appendItem(this.param.titles[i]);
            if ( i == 0 && this.param.titles.length > 1 ) list.firstChild.appendChild(document.createElement("menuseparator"));
        }
        list.selectedIndex = isPartial ? 2 : 0;
    },

    accept : function() {
        this.param.item.comment         = sbCommonUtils.escapeComment(document.getElementById("sbDetailComment").value);
        this.param.item.title           = document.getElementById("sbDetailTitle").value;
        this.param.option["images"]     = document.getElementById("sbDetailOptionImages").checked;
        this.param.option["media"]      = document.getElementById("sbDetailOptionMedia").checked;
        this.param.option["fonts"]      = document.getElementById("sbDetailOptionFonts").checked;
        this.param.option["frames"]     = document.getElementById("sbDetailOptionFrames").checked;
        this.param.option["styles"]     = document.getElementById("sbDetailOptionStyles").checked;
        this.param.option["script"]     = document.getElementById("sbDetailOptionScript").checked;
        this.param.option["asHtml"]     = document.getElementById("sbDetailOptionAsHtml").checked;
        this.param.option["forceUtf8"]  = document.getElementById("sbDetailOptionForceUtf8").checked;
        this.param.option["rewriteStyles"]  = document.getElementById("sbDetailOptionRewriteStyles").checked;
        this.param.option["keepLink"]   = document.getElementById("sbDetailOptionKeepLink").checked;
        this.param.option["dlimg"]      = document.getElementById("sbDetailImage").checked;
        this.param.option["dlsnd"]      = document.getElementById("sbDetailSound").checked;
        this.param.option["dlmov"]      = document.getElementById("sbDetailMovie").checked;
        this.param.option["dlarc"]      = document.getElementById("sbDetailArchive").checked;
        this.param.option["custom"]     = this.CUSTOM_UI.checked ? document.getElementById("sbDetailCustomExt").value : "";
        if ( this.param.context !== "capture-again-deep" ) {
            this.param.option["inDepth"]    = parseInt("0" + document.getElementById("sbDetailInDepth").value, 10);
            this.param.poption["timeout"]   = parseInt("0" + document.getElementById("sbDetailTimeout").value, 10);
            this.param.poption["charset"]   = document.getElementById("sbDetailCharset").value;
        }
        if ( this.param.context == "capture-again" ) {
            var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + this.param.item.id);
            sbDataSource.setProperty(res, "title", document.getElementById("sbDetailTitle").value);
        }
    },

    cancel : function() {
        this.param.result = 0;
    },

};




var sbFolderSelector = {

    get MENU_LIST()  { return document.getElementById("sbFolderList"); },
    get MENU_POPUP() { return document.getElementById("sbFolderPopup"); },

    nest : 0,

    init : function() {
        if ( !sbCaptureOptions.param.resURI ) sbCaptureOptions.param.resURI = "urn:scrapbook:root";
        this.refresh(sbCaptureOptions.param.resURI);
    },

    refresh : function(aResID) {
        if ( document.getElementById(aResID) == null ) {
            this.nest = 0;
            this.clear();
            this.processRecent();
            this.processRoot();
            this.processRecursive(sbCommonUtils.RDF.GetResource("urn:scrapbook:root"));
        }
        this.MENU_LIST.selectedItem = document.getElementById(aResID);
        this.MENU_LIST.disabled = false;
    },

    clear : function() {
        var oldItems = this.MENU_POPUP.childNodes;
        for ( var i = oldItems.length - 1; i >= 0; i-- ) {
            this.MENU_POPUP.removeChild(oldItems[i]);
        }
    },

    fill : function(aID, aTitle) {
        var item = document.createElement("menuitem");
        item.setAttribute("id",    aID);
        item.setAttribute("label", aTitle);
        item.setAttribute("nest", this.nest);
        item.setAttribute("class", "menuitem-iconic folder-icon");
        item.setAttribute("style", "padding-left:" + (20 * this.nest + 3) + "px;");
        this.MENU_POPUP.appendChild(item);
    },

    processRoot : function() {
        this.fill("urn:scrapbook:root", sbCommonUtils.lang("scrapbook", "ROOT_FOLDER"));
        this.MENU_POPUP.appendChild(document.createElement("menuseparator"));
    },

    processRecent: function() {
        var ids = sbCommonUtils.getPref("ui.folderList", "");
        ids = ids ? ids.split("|") : [];
        var shownItems = 0;
        var maxEntries = sbCommonUtils.getPref("ui.folderList.maxEntries", 5);
        for (var i = 0; i < ids.length && shownItems < maxEntries; i++) {
            if (!sbCommonUtils.validateID(ids[i])) continue;
            var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + ids[i]);
            if (!sbDataSource.exists(res)) continue;
            this.fill(res.Value, sbDataSource.getProperty(res, "title"));
            shownItems++;
        }
        if (shownItems > 0)
            this.MENU_POPUP.appendChild(document.createElement("menuseparator"));
    },

    processRecursive : function(aContRes) {
        this.nest++;
        var resList = sbDataSource.flattenResources(aContRes, 1, false);
        resList.shift();
        for ( var i = 0; i < resList.length; i++ ) {
            var res = resList[i];
            this.fill(res.Value, sbDataSource.getProperty(res, "title"));
            this.processRecursive(res);
        }
        this.nest--;
    },

    onChange : function(aResURI) {
        sbCaptureOptions.param.resURI = aResURI;
        sbCaptureOptions.param.result = 2;
    },

    onMiddleClick : function() {
        this.MENU_LIST.selectedIndex = 0;
        this.onChange(this.MENU_LIST.selectedItem.id);
    },

    pick : function() {
        var ret = {};
        window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes', ret, sbCaptureOptions.param.resURI);
        if ( ret.resource ) {
            this.refresh(ret.resource.Value);
            this.onChange(ret.resource.Value);
        }
    },

};



