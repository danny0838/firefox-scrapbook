
var sbCaptureOptions = {

    param: null,

    init: function() {
        if ( !window.arguments ) window.close();
        this.param = window.arguments[0];
        // load from preference
        document.getElementById("sbDetailOptionImages").checked = sbCommonUtils.getPref("capture.default.images", true);
        document.getElementById("sbDetailOptionMedia").checked = sbCommonUtils.getPref("capture.default.media", true);
        document.getElementById("sbDetailOptionFonts").checked = sbCommonUtils.getPref("capture.default.fonts", true);
        document.getElementById("sbDetailOptionFrames").checked = sbCommonUtils.getPref("capture.default.frames", true);
        document.getElementById("sbDetailOptionStyles").checked = sbCommonUtils.getPref("capture.default.styles", true);
        document.getElementById("sbDetailOptionScript").checked = sbCommonUtils.getPref("capture.default.script", false);
        document.getElementById("sbDetailOptionAsHtml").checked = sbCommonUtils.getPref("capture.default.fileAsHtml", false);
        document.getElementById("sbDetailOptionSaveDataURI").checked = sbCommonUtils.getPref("capture.default.saveDataURI", false);
        document.getElementById("sbDetailDownLinkMethod").value = sbCommonUtils.getPref("capture.default.downLinkMethod", 0);
        document.getElementById("sbDetailDownLinkFilter").value = sbCommonUtils.getPref("capture.default.downLinkFilter", "");
        document.getElementById("sbDetailInDepth").value = sbCommonUtils.getPref("capture.default.inDepthLevels", 0);
        document.getElementById("sbDetailTimeout").value = sbCommonUtils.getPref("capture.default.batchTimeout", 0);
        document.getElementById("sbDetailCharset").value = sbCommonUtils.getPref("capture.default.batchCharset", "");
        // accept button
        document.documentElement.getButton("accept").label = sbCommonUtils.lang("CAPTURE_OK_BUTTON");
        // title
        this.fillTitleList();
        // script warning
        this.updateScriptWarning();
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

    // hiding/unhiding the elem does not automatically update XUL window height
    // so we must do it on out own :(
    updateScriptWarning: function() {
        document.getElementById("sbDetailWarnAboutScript").hidden = !document.getElementById("sbDetailOptionScript").checked;
    },

    resetDownLinkFilters: function() {
        var _filter = document.getElementById("sbDetailDownLinkFilter").value;
        sbCommonUtils.resetPref("capture.default.downLinkFilter");
        document.getElementById("sbDetailDownLinkFilter").value = sbCommonUtils.getPref("capture.default.downLinkFilter", "");
        sbCommonUtils.setPref("capture.default.downLinkFilter", _filter);
    },

    fillTitleList: function() {
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

    accept: function() {
        // set return values
        this.param.item.comment = sbCommonUtils.escapeComment(document.getElementById("sbDetailComment").value);
        this.param.item.title = document.getElementById("sbDetailTitle").value;
        this.param.option["images"] = document.getElementById("sbDetailOptionImages").checked;
        this.param.option["media"] = document.getElementById("sbDetailOptionMedia").checked;
        this.param.option["fonts"] = document.getElementById("sbDetailOptionFonts").checked;
        this.param.option["frames"] = document.getElementById("sbDetailOptionFrames").checked;
        this.param.option["styles"] = document.getElementById("sbDetailOptionStyles").checked;
        this.param.option["script"] = document.getElementById("sbDetailOptionScript").checked;
        this.param.option["fileAsHtml"] = document.getElementById("sbDetailOptionAsHtml").checked;
        this.param.option["saveDataURI"] = document.getElementById("sbDetailOptionSaveDataURI").checked;
        this.param.option["downLinkMethod"] = parseInt("0" + document.getElementById("sbDetailDownLinkMethod").value, 10);
        this.param.option["downLinkFilter"] = document.getElementById("sbDetailDownLinkFilter").value;
        this.param.option["inDepth"] = parseInt("0" + document.getElementById("sbDetailInDepth").value, 10);
        this.param.option["batchTimeout"] = parseInt("0" + document.getElementById("sbDetailTimeout").value, 10);
        this.param.option["batchCharset"] = document.getElementById("sbDetailCharset").value;
        // save to preference
        sbCommonUtils.setPref("capture.default.images", this.param.option["images"]);
        sbCommonUtils.setPref("capture.default.media", this.param.option["media"]);
        sbCommonUtils.setPref("capture.default.fonts", this.param.option["fonts"]);
        sbCommonUtils.setPref("capture.default.frames", this.param.option["frames"]);
        sbCommonUtils.setPref("capture.default.styles", this.param.option["styles"]);
        sbCommonUtils.setPref("capture.default.script", this.param.option["script"]);
        sbCommonUtils.setPref("capture.default.fileAsHtml", this.param.option["fileAsHtml"]);
        sbCommonUtils.setPref("capture.default.saveDataURI", this.param.option["saveDataURI"]);
        sbCommonUtils.setPref("capture.default.downLinkMethod", this.param.option["downLinkMethod"]);
        sbCommonUtils.setPref("capture.default.downLinkFilter", this.param.option["downLinkFilter"]);
        sbCommonUtils.setPref("capture.default.inDepthLevels", this.param.option["inDepth"]);
        sbCommonUtils.setPref("capture.default.batchTimeout", this.param.option["batchTimeout"]);
        sbCommonUtils.setPref("capture.default.batchCharset", this.param.option["batchCharset"]);
        // post-fix for special cases
        if ( this.param.context === "capture-again-deep" ) {
            this.param.option["inDepth"] = 0;
            this.param.option["batchTimeout"] = 0;
            this.param.option["batchCharset"] = "";
        }
        if ( this.param.context == "capture-again" ) {
            var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + this.param.item.id);
            sbDataSource.setProperty(res, "title", document.getElementById("sbDetailTitle").value);
        }
        // check for regex error
        var errors = [];
        this.param.option["downLinkFilter"].split(/[\r\n]/).forEach(function (srcLine, index) {
            if (srcLine.charAt(0) === "#") return;
            var line = srcLine.trim();
            if (line === "") return;
            try {
                new RegExp("^(?:" + line + ")$", "i");
            } catch (ex) {
                line =  sbCommonUtils.lang("ERR_CAPTURE_DOWNLINKFILTER_LINE", index+1, srcLine);
                errors.push(line);
            }
        });
        if (errors.length) {
            var button = sbCommonUtils.PROMPT.STD_YES_NO_BUTTONS;
            var text = sbCommonUtils.lang("ERR_CAPTURE_DOWNLINKFILTER", errors.join("\n\n"));
            // yes => 0, no => 1, close => 1
            return sbCommonUtils.PROMPT.confirmEx(null, "[ScrapBook]", text, button, null, null, null, null, {});
        }
        return true;
    },

    cancel: function() {
        this.param.result = 0;
    },

};




var sbFolderSelector = {

    get MENU_LIST()  { return document.getElementById("sbFolderList"); },
    get MENU_POPUP() { return document.getElementById("sbFolderPopup"); },

    nest: 0,

    init: function() {
        if ( !sbCaptureOptions.param.resURI ) sbCaptureOptions.param.resURI = "urn:scrapbook:root";
        this.refresh(sbCaptureOptions.param.resURI);
    },

    refresh: function(aResID) {
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

    clear: function() {
        var oldItems = this.MENU_POPUP.childNodes;
        for ( var i = oldItems.length - 1; i >= 0; i-- ) {
            this.MENU_POPUP.removeChild(oldItems[i]);
        }
    },

    fill: function(aID, aTitle) {
        var item = document.createElement("menuitem");
        item.setAttribute("id",    aID);
        item.setAttribute("label", aTitle);
        item.setAttribute("nest", this.nest);
        item.setAttribute("class", "menuitem-iconic folder-icon");
        item.setAttribute("style", "padding-left:" + (20 * this.nest + 3) + "px;");
        this.MENU_POPUP.appendChild(item);
    },

    processRoot: function() {
        this.fill("urn:scrapbook:root", sbCommonUtils.lang("ROOT_FOLDER"));
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

    processRecursive: function(aContRes) {
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

    onChange: function(aResURI) {
        sbCaptureOptions.param.resURI = aResURI;
        sbCaptureOptions.param.result = 2;
    },

    onMiddleClick: function() {
        this.MENU_LIST.selectedIndex = 0;
        this.onChange(this.MENU_LIST.selectedItem.id);
    },

    pick: function() {
        var ret = {};
        window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes', ret, sbCaptureOptions.param.resURI);
        if ( ret.resource ) {
            this.refresh(ret.resource.Value);
            this.onChange(ret.resource.Value);
        }
    },

};



