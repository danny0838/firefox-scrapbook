
var sbPropService = {

    get ICON()   { return document.getElementById("sbPropIcon"); },

    id       : null,
    item     : null,
    resource : null,
    isTypeSeparator: false,
    isTypeBookmark : false,
    isTypeFolder   : false,
    isTypeNote     : false,
    isTypeFile     : false,
    isTypeSite     : false,

    init : function() {
        if (!window.arguments) { window.close(); return; }
        // get item and properties
        this.id = window.arguments[0];
        if (!this.id) { window.close(); return; }
        this.resource = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + this.id);
        this.item = sbDataSource.getItem(this.resource);
        if (!this.item.id) {
            // an invalid ID is given, show nothing but the given ID
            document.getElementById("sbPropDialog").getButton("accept").hidden = true;
            document.getElementById("sbPropGeneralTab").hidden = true;
            document.getElementById("sbPropCommentTab").hidden = true;
            document.getElementById("sbPropInvalidTab").hidden = false;
            document.getElementById("sbPropInvalidTab").parentNode.selectedIndex = 2;
            document.getElementById("sbPropIDInvalid").value = this.id;
            return;
        }
        // parse dateTime
        var date1 = this.item.create || this.id;
        var dateTime = "";
        if (date1.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/)) {
            var dd = new Date(
                parseInt(RegExp.$1, 10), parseInt(RegExp.$2, 10) - 1, parseInt(RegExp.$3, 10),
                parseInt(RegExp.$4, 10), parseInt(RegExp.$5, 10), parseInt(RegExp.$6, 10)
            );
            dateTime = dd.toLocaleString();
        }
        var date2 = this.item.modify;
        var dateTime2 = "";
        if (date2.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/)) {
            var dd = new Date(
                parseInt(RegExp.$1, 10), parseInt(RegExp.$2, 10) - 1, parseInt(RegExp.$3, 10),
                parseInt(RegExp.$4, 10), parseInt(RegExp.$5, 10), parseInt(RegExp.$6, 10)
            );
            dateTime2 = dd.toLocaleString();
        }
        // fill data to the fields
        document.getElementById("sbPropFolder").value  = sbDataSource.getFolderPath(this.resource).join("\x1B");
        document.getElementById("sbPropID").value      = this.item.id;
        document.getElementById("sbPropTitle").value   = this.item.title;
        document.getElementById("sbPropSource").value  = this.item.source;
        document.getElementById("sbPropDate").value    = dateTime;
        document.getElementById("sbPropModify").value  = dateTime2;
        document.getElementById("sbPropChars").value   = this.item.chars;
        document.getElementById("sbPropComment").value = this.item.comment.replace(/ __BR__ /g, "\n");
        document.getElementById("sbPropMark").setAttribute("checked", this.item.type == "marked");
        document.getElementById("sbPropLock").setAttribute("checked", this.item.lock == "true");
        this.ICON.src = this.item.icon ? this.item.icon : sbCommonUtils.getDefaultIcon(this.item.type);
        document.title = this.item.title;
        if (sbDataSource.isContainer(this.resource))
            this.item.type = "folder";
        var bundleName = "TYPE_PAGE";
        switch (this.item.type) {
            case "separator": this.isTypeSeparator = true; bundleName = "TYPE_SEPARATOR"; break;
            case "bookmark" : this.isTypeBookmark  = true; bundleName = "TYPE_BOOKMARK";  break;
            case "folder"   : this.isTypeFolder    = true; bundleName = "TYPE_FOLDER";    break;
            case "note"     : this.isTypeNote      = true; bundleName = "TYPE_NOTE";      break;
            case "notex"    : this.isTypeNotex     = true; bundleName = "TYPE_NOTEX";      break;
            case "file"     : 
            case "image"    : this.isTypeFile      = true; bundleName = "TYPE_FILE";      break;
            case "combine"  : this.isTypeSite      = true; bundleName = "TYPE_COMBINE";   break;
            case "site"     : this.isTypeSite      = true; bundleName = "TYPE_INDEPTH";   break;
        }
        document.getElementById("sbPropType").value = sbCommonUtils.lang("property", bundleName);
        document.getElementById("sbPropSourceRow").hidden = this.isTypeFolder || this.isTypeNote || this.isTypeSeparator;
        document.getElementById("sbPropCharsRow").hidden  = this.isTypeFolder || this.isTypeBookmark || this.isTypeSeparator;
        document.getElementById("sbPropIconRow").hidden   = this.isTypeSeparator;
        document.getElementById("sbPropIconMenu").hidden  = this.isTypeNote;
        document.getElementById("sbPropSizeRow").hidden   = this.isTypeFolder || this.isTypeBookmark || this.isTypeSeparator;
        document.getElementById("sbPropMark").hidden      = this.isTypeFolder || this.isTypeNote || this.isTypeNotex || this.isTypeFile || this.isTypeSite || this.isTypeBookmark;
        document.getElementById("sbPropLock").hidden      = this.isTypeFolder || this.isTypeNote || this.isTypeBookmark;
        document.getElementById("sbPropIconMenu").firstChild.firstChild.nextSibling.setAttribute("disabled", this.isTypeFolder || this.isTypeBookmark);
        if (this.isTypeNote)
            document.getElementById("sbPropTitle").removeAttribute("editable");
        this.updateCommentTab(this.item.comment);
        if (!this.isTypeFolder && !this.isTypeBookmark)
            setTimeout(function(){ sbPropService.delayedInit(); }, 0);
    },

    delayedInit : function() {
        var sizeCount = this.getTotalFileSize(this.id);
        document.getElementById("sbPropSize").value = sbCommonUtils.lang("property", "FILES_COUNT", [sbPropService.formatFileSize(sizeCount[0]), sizeCount[1], sizeCount[2]]);
    },

    accept : function() {
        var newVals = {
            title   : document.getElementById("sbPropTitle").value,
            source  : document.getElementById("sbPropSource").value,
            comment : sbCommonUtils.escapeComment(document.getElementById("sbPropComment").value),
            type    : this.item.type,
            icon    : this.getIconURL(),
            chars   : document.getElementById("sbPropChars").value
        };
        if (!this.isTypeSeparator && !document.getElementById("sbPropMark").hidden)
            newVals.type = document.getElementById("sbPropMark").checked ? "marked" : "";
        if (!this.isTypeSeparator && !document.getElementById("sbPropLock").hidden)
            newVals.lock = document.getElementById("sbPropLock").checked ? "true" : "";
        var changed = false;
        var props = ["title", "source", "comment", "type", "icon", "chars", "lock"];
        for (var i = 0; i < props.length; i++) {
            if (this.item[props[i]] != newVals[props[i]]) {
                this.item[props[i]] = newVals[props[i]];
                changed = true;
            }
        }
        if (changed) {
            this.item.modify = sbCommonUtils.getTimeStamp();
            for (var prop in this.item)  {
                sbDataSource.setProperty(this.resource, prop, this.item[prop]);
            }
            if (!this.isTypeFolder && !this.isTypeBookmark && !this.isTypeSeparator)
                sbCommonUtils.writeIndexDat(this.item);
            // refresh the toolbar
            // yes, we need to do large surgery to prevent inconsistency
            // (eg. change property in window 2 and the window 1 shows old property)
            sbCommonUtils.refreshGlobal();
        }
        if (window.arguments[1])
            window.arguments[1].accept = true;
    },

    cancel : function() {
        if ( window.arguments[1] ) window.arguments[1].accept = false;
    },

    fillTitle : function(aPopupElem) {
        if ( this.isTypeFolder || this.isTypeNote || this.isTypeFile || this.isTypeBookmark ) return;
        if ( !aPopupElem.hasChildNodes() ) {
            aPopupElem.parentNode.appendItem(this.getHTMLTitle(this.id, this.item.chars));
        }
    },

    setDefaultIcon : function() {
        this.ICON.src = sbCommonUtils.getDefaultIcon(this.item.type);
    },

    getIconURL : function() {
        var iconURL = this.ICON.src;
        return ( iconURL.indexOf("chrome://scrapbook/skin/") == 0 ) ? "" : iconURL;
    },

    pickupIcon : function(aCommand, aPickerLabel) {
        var dir;
        if ( aCommand == "F" ) {
            dir = sbCommonUtils.getContentDir(this.item.id, true);
            if ( !dir ) return;
        } else {
            dir = sbCommonUtils.getScrapBookDir().clone();
            dir.append("icon");
            if ( !dir.exists() ) dir.create(dir.DIRECTORY_TYPE, 0700);
        }
        var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
        FP.init(window, aPickerLabel, FP.modeOpen);
        FP.displayDirectory = dir;
        FP.appendFilters(FP.filterImages);
        if ( FP.show() == FP.returnOK ) {
            var iconURL;
            if ( aCommand == "F" && dir.contains(FP.file, false) ) {
                iconURL = sbCommonUtils.convertFileToResURL(FP.file);
            } else if ( aCommand == "U" && dir.contains(FP.file, false) ) {
                iconURL = sbCommonUtils.convertFileToResURL(FP.file);
            } else {
                iconURL = sbCommonUtils.convertFilePathToURL(FP.file.path);
            }
            this.ICON.src = iconURL;
        }
    },

    setIconURL : function() {
        var ret = { value : this.getIconURL() };
        if ( !sbCommonUtils.PROMPT.prompt(window, document.getElementById("sbPropIconMenu").label, sbCommonUtils.lang("property", "ADDRESS"), ret, null, {}) ) return;
        if ( ret.value ) this.ICON.src = ret.value;
    },

    updateCommentTab : function(aComment) {
        var elem = document.getElementById("sbPropCommentTab");
        if ( aComment ) {
            elem.setAttribute("image", "chrome://scrapbook/skin/edit_comment.png");
        } else {
            elem.removeAttribute("image");
        }
    },

    getHTMLTitle : function(aID, aChars) {
        var file  = sbCommonUtils.getContentDir(aID, true);
        if ( !file ) return "";
        file.append("index.html");
        var content = sbCommonUtils.convertToUnicode(sbCommonUtils.readFile(file), aChars);
        return content.match(/<title>([^<]+?)<\/title>/im) ? RegExp.$1 : "";
    },

    getTotalFileSize : function(aID) {
        var totalSize = 0;
        var totalFile = 0;
        var totalDir  = 0;
        var dir = sbCommonUtils.getContentDir(aID, true, true);
        if (!dir) return [totalSize, totalFile, totalDir];
        sbCommonUtils.forEachFile(dir, function(file){
            if (file.isDirectory()) {
                totalDir++;
            }
            if (!file.isFile()) return;
            try {
                totalSize += file.fileSize;
                totalFile++;
            } catch(ex) {
                sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "ERR_FAIL_READ_FILE_SIZE", [file.path]));
            }
        }, this);
        return [totalSize, totalFile, totalDir];
    },

    formatFileSize : function(aBytes) {
        if ( aBytes > 1000 * 1000 ) {
            return this.divideBy100( Math.round( aBytes / 1024 / 1024 * 100 ) ) + " MB";
        } else if ( aBytes == 0 ) {
            return "0 KB";
        } else {
            var kbytes = Math.round( aBytes / 1024 );
            return (kbytes == 0 ? 1 : kbytes) + " KB";
        }
    },

    divideBy100 : function(aInt) {
        if ( aInt % 100 == 0 ) {
            return aInt / 100 + ".00";
        } else if ( aInt % 10 == 0 ) {
            return aInt / 100 + "0";
        } else {
            return aInt / 100;
        }
    },

};



