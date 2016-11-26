
var sbCaptureOptions = {

    param: null,

    init: function() {
        if (window.arguments) {
            // opened from capture detail
            this.param = window.arguments[0];
        } else {
            // opened for default capture options
            // this.param.item = undefined
            this.param = {
                option: {},
                result: 1,
            };
        }

        // load from preference
        document.getElementById("sbDetailOptionImages").checked = sbCommonUtils.getPref("save.default.images", true);
        document.getElementById("sbDetailOptionMedia").checked = sbCommonUtils.getPref("save.default.media", true);
        document.getElementById("sbDetailOptionFonts").checked = sbCommonUtils.getPref("save.default.fonts", true);
        document.getElementById("sbDetailOptionFrames").checked = sbCommonUtils.getPref("save.default.frames", true);
        document.getElementById("sbDetailOptionStyles").checked = sbCommonUtils.getPref("save.default.styles", true);
        document.getElementById("sbDetailOptionScript").checked = sbCommonUtils.getPref("save.default.script", false);
        document.getElementById("sbDetailOptionAsHtml").checked = sbCommonUtils.getPref("save.default.fileAsHtml", false);
        document.getElementById("sbDetailOptionSaveDataURI").checked = sbCommonUtils.getPref("save.default.saveDataUri", false);
        document.getElementById("sbDetailOptionTidyCss").value = sbCommonUtils.getPref("save.default.tidyCss", 3);
        document.getElementById("sbDetailDownLinkMethod").value = sbCommonUtils.getPref("save.default.downLinkMethod", 0);
        document.getElementById("sbDetailDownLinkFilter").value = sbCommonUtils.getPref("save.default.downLinkFilter", "");
        if ( this.param.context !== "capture-again-deep" ) {
            document.getElementById("sbDetailInDepth").value = sbCommonUtils.getPref("save.default.inDepthLevels", 0);
        }

        // init UI
        this.updateScriptWarning();
        if (this.param.item) {
            document.documentElement.getButton("accept").label = sbCommonUtils.lang("SAVE_OK_BUTTON");
            this.fillTitleList();
            if ( this.param.context == "capture-again" || this.param.context == "capture-again-deep" ) {
                document.getElementById("sbDetailFolderRow").collapsed = true;
                document.getElementById("sbDetailCommentRow").collapsed = true;
                if ( this.param.context == "capture-again-deep" ) {
                    document.getElementById("sbDetailInDepthBox").collapsed = true;
                }
                document.getElementById("sbDetailWarnAboutRenew").hidden = false;
            } else {
                sbFolderSelector.init();
                document.getElementById("sbDetailComment").value = this.param.item.comment.replace(/ __BR__ /g, "\n");
            }
        } else {
            document.getElementById("sbDetailTabs").selectedIndex = 1;
            document.getElementById("sbDetailTabGeneral").collapsed = true;
            document.getElementById("sbDetailInDepthBox").collapsed = true;
            document.getElementById("sbDetailRememberAsDefault").hidden = true;
        }
    },

    accept: function() {
        // set return values
        if (this.param.item) {
            this.param.item.title = document.getElementById("sbDetailTitle").value;
            this.param.item.comment = sbCommonUtils.escapeComment(document.getElementById("sbDetailComment").value);
        }
        this.param.option["images"] = document.getElementById("sbDetailOptionImages").checked;
        this.param.option["media"] = document.getElementById("sbDetailOptionMedia").checked;
        this.param.option["fonts"] = document.getElementById("sbDetailOptionFonts").checked;
        this.param.option["frames"] = document.getElementById("sbDetailOptionFrames").checked;
        this.param.option["styles"] = document.getElementById("sbDetailOptionStyles").checked;
        this.param.option["script"] = document.getElementById("sbDetailOptionScript").checked;
        this.param.option["saveDataUri"] = document.getElementById("sbDetailOptionSaveDataURI").checked;
        this.param.option["fileAsHtml"] = document.getElementById("sbDetailOptionAsHtml").checked;
        this.param.option["tidyCss"] = parseInt(document.getElementById("sbDetailOptionTidyCss").value, 10);
        this.param.option["downLinkMethod"] = parseInt("0" + document.getElementById("sbDetailDownLinkMethod").value, 10);
        this.param.option["downLinkFilter"] = document.getElementById("sbDetailDownLinkFilter").value;
        if ( this.param.context !== "capture-again-deep" ) {
            this.param.option["inDepth"] = parseInt(document.getElementById("sbDetailInDepth").value, 10);
        }

        // save to preference
        if (!this.param.item || document.getElementById("sbDetailRememberAsDefault").checked) {
            sbCommonUtils.setPref("save.default.images", this.param.option["images"]);
            sbCommonUtils.setPref("save.default.media", this.param.option["media"]);
            sbCommonUtils.setPref("save.default.fonts", this.param.option["fonts"]);
            sbCommonUtils.setPref("save.default.frames", this.param.option["frames"]);
            sbCommonUtils.setPref("save.default.styles", this.param.option["styles"]);
            sbCommonUtils.setPref("save.default.script", this.param.option["script"]);
            sbCommonUtils.setPref("save.default.fileAsHtml", this.param.option["fileAsHtml"]);
            sbCommonUtils.setPref("save.default.saveDataUri", this.param.option["saveDataUri"]);
            sbCommonUtils.setPref("save.default.tidyCss", this.param.option["tidyCss"]);
            sbCommonUtils.setPref("save.default.downLinkMethod", this.param.option["downLinkMethod"]);
            sbCommonUtils.setPref("save.default.downLinkFilter", this.param.option["downLinkFilter"]);
            if ( this.param.context !== "capture-again-deep" ) {
                sbCommonUtils.setPref("save.default.inDepthLevels", this.param.option["inDepth"]);
            }
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
                line =  sbCommonUtils.lang("ERR_SAVE_DOWNLINKFILTER_LINE", index+1, srcLine);
                errors.push(line);
            }
        });
        if (errors.length) {
            var button = sbCommonUtils.PROMPT.STD_YES_NO_BUTTONS;
            var text = sbCommonUtils.lang("ERR_SAVE_DOWNLINKFILTER", errors.join("\n\n"));
            // yes => 0, no => 1, close => 1
            return sbCommonUtils.PROMPT.confirmEx(null, "[ScrapBook]", text, button, null, null, null, null, {});
        }

        return true;
    },

    cancel: function() {
        this.param.result = 0;
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

    updateScriptWarning: function() {
        document.getElementById("sbDetailWarnAboutScript").hidden = !document.getElementById("sbDetailOptionScript").checked;
    },

    resetDownLinkFilters: function() {
        var _filter = document.getElementById("sbDetailDownLinkFilter").value;
        sbCommonUtils.resetPref("save.default.downLinkFilter");
        document.getElementById("sbDetailDownLinkFilter").value = sbCommonUtils.getPref("save.default.downLinkFilter", "");
        sbCommonUtils.setPref("save.default.downLinkFilter", _filter);
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



