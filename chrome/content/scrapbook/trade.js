
var sbTradeService = {


    get TREE()  { return document.getElementById("sbTradeTree"); },


    leftDir  : null,
    rightDir : null,
    locked : false,
    treeItems : [],


    init : function() {
        if ( window.arguments ) {
            document.getElementById("sbTradeHeader").collapsed = true;
            document.getElementById("sbTradeTree").collapsed = true;
            document.getElementById("sbTradeToolbar").collapsed = true;
            document.getElementById("sbTradeLog").collapsed = true;
            document.getElementById("sbTradeQuickStatus").hidden = false;
            window.sizeToContent();
            document.title = document.getElementById("sbTradeExportButton").label;
            setTimeout(function(){ sbTradeService.prepareRightDir(true); }, 100);
            return;
        }
        if ( window.top.location.href != "chrome://scrapbook/content/manage.xul" ) {
            document.documentElement.collapsed = true;
            return;
        }
        window.top.sbTreeDNDHandler.importData = function(aRow, aOrient) {
            sbImportService.exec(aRow, aOrient);
        };
        setTimeout(function(){ sbTradeService.prepareRightDir(false); }, 100);
    },

    prepareRightDir : function(aQuickMode) {
        var dirPath = sbCommonUtils.getPref("trade.path", "");
        if ( !dirPath ) {
            this.lock(1);
            if ( this.selectDir(aQuickMode) ) {
                this.prepareRightDir(aQuickMode);
                return;
            }
            if (aQuickMode)
                window.setTimeout(function() { window.close(); }, 0);
            return;
        }
        this.rightDir = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
        var invalid = false;
        try {
            this.rightDir.initWithPath(dirPath);
            if ( !this.rightDir.exists() || !this.rightDir.isDirectory() ) {
                invalid = true;
            }
        } catch(ex) {
            invalid = true;
        }
        if ( invalid ) {
            this.lock(1);
            sbCommonUtils.alert(sbCommonUtils.lang("trade", "ERROR_INVALID_FILEPATH", [dirPath]));
            if (aQuickMode)
                window.setTimeout(function() { window.close(); }, 0);
            return;
        }
        if ( aQuickMode ) {
            sbExportService.execQuick(window.arguments[0]);
        } else {
            if ( this.locked ) this.lock(0);
            var fileField = document.getElementById("sbTradePath");
            fileField.file = this.rightDir;
            fileField.label = dirPath;
            this.refreshTree();
        }
    },

    selectDir : function() {
        var picker = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
        picker.init(window, sbCommonUtils.lang("trade", "SELECT_PATH"), picker.modeGetFolder);
        if ( this.rightDir ) picker.displayDirectory = this.rightDir;
        var answer = picker.show();
        if ( answer == picker.returnOK ) {
            sbCommonUtils.setPref("trade.path", picker.file.path);
            return true;
        }
        return false;
    },

    refreshTree : function() {
        this.treeItems = [];
        var baseURL = sbCommonUtils.convertFilePathToURL(this.rightDir.path);
        var dirEnum = this.rightDir.directoryEntries;
        while ( dirEnum.hasMoreElements() ) {
            var file = dirEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
            var dirName = file.leafName;
            file.append("index.dat");
            if ( !file.exists() ) continue;
            var item = this.parseIndexDat(file);
            if ( item.icon && !item.icon.match(/^http|moz-icon|chrome/) ) {
                item.icon = baseURL + dirName + "/" + item.icon;
            }
            if ( !item.icon ) item.icon = sbCommonUtils.getDefaultIcon(item.type);
            this.treeItems.push([
                item.title,
                (new Date(file.lastModifiedTime)).toLocaleString(),
                item.folder ? item.folder.replace(/\t/g, "\x1B") : "",
                item.id,
                item.icon,
                file.lastModifiedTime,
                dirName,
                item.type
            ]);
        }
        sbCustomTreeUtil.sortArrayByIndex(this.treeItems, 5);
        this.initTree();
        this.log(sbCommonUtils.lang("trade", "DETECT", [this.treeItems.length, this.rightDir.path]), "G");
    },

    initTree : function() {
        var colIDs = [
            "sbTradeTreeColTitle",
            "sbTradeTreeColDate",
            "sbTradeTreeColFolder",
        ];
        var treeView = new sbCustomTreeView(colIDs, this.treeItems);
        treeView.getImageSrc = function(row, col) {
            if (this._items[row][7] == "separator")
                return;
            if (col.index == 0)
                return this._items[row][4];
        };
        treeView.getCellProperties = function(row, col, properties) {
            if (col.index != 0) return "";
            var val = this._items[row][7];
            // Gecko >= 22 (Firefox >= 22): do not take properties and requires a return value
            if (properties) {
                properties.AppendElement(ATOM_SERVICE.getAtom(val));
            } else {
                return val;
            }
        };
        treeView.cycleHeader = function(col) {
            sbCustomTreeUtil.sortItems(sbTradeService, col.element);
        };
        treeView.isSeparator = function(row) {
            return (this._items[row][7] == "separator");
        };
        this.TREE.view = treeView;
    },

    prepareLeftDir : function() {
        this.leftDir = sbCommonUtils.getScrapBookDir();
        this.leftDir.append("data");
    },


    lock : function(aLevel) {
        this.locked = aLevel > 0;
        var elts = document.getElementsByAttribute("group", "lockTarget");
        for ( var i = 0; i < elts.length; i++ ) elts[i].setAttribute("disabled", aLevel > 0);
        if ( window.top != window ) {
            document.getElementById("sbTradeBrowseButton").disabled = aLevel == 2;
            window.top.document.getElementById("mbToolbarButton").disabled = aLevel == 2;
            window.top.document.getElementById("statusbar-progresspanel").collapsed = aLevel != 2;
        }
    },

    log : function(aMessage, aColor, aBold) {
        window.top.sbMainService.trace(aMessage, 2000);
        var listbox = document.getElementById("sbTradeLog");
        var listitem = listbox.appendItem(aMessage);
        listbox.ensureIndexIsVisible(listbox.getRowCount() - 1);
        switch ( aColor ) {
            case "R" : aColor = "#FF0000"; break;
            case "G" : aColor = "#00AA33"; break;
            case "B" : aColor = "#0000FF"; break;
        }
        if ( aColor ) listitem.style.color = aColor;
        if ( aBold  ) listitem.style.fontWeight = "bold";
    },


    parseIndexDat : function(aFile) {
        if ( !(aFile instanceof Components.interfaces.nsILocalFile) ) return sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "ERR_TRADE_INVALID_ARGS"));
        var data = sbCommonUtils.convertToUnicode(sbCommonUtils.readFile(aFile), "UTF-8");
        data = data.split("\n");
        if ( data.length < 2 ) return;
        var item = sbCommonUtils.newItem();
        for ( var i = 0; i < data.length; i++ ) {
            if ( !data[i].match(/\t/) ) continue;
            var keyVal = data[i].split("\t");
            if ( keyVal.length == 2 ) {
                item[keyVal[0]] = keyVal[1];
            } else {
                item[keyVal.shift()] = keyVal.join("\t");
            }
        }
        return item;
    },

    getComplexTreeSelection : function() {
        var ret = [];
        var uriList = [];
        var selRes = window.top.sbTreeHandler.getSelection(true, 0);
        var filterRule = document.getElementById("sbTradeOptionExportFolder").checked ? 0 : 2;
        for ( var i = 0; i < selRes.length; i++ ) {
            if ( sbDataSource.isContainer(selRes[i]) ) {
                var childRes = sbDataSource.flattenResources(selRes[i], filterRule, true);
                for ( var j = 0; j < childRes.length; j++ ) {
                    if ( uriList.indexOf(childRes[j].Value) < 0 ) { ret.push(childRes[j]); uriList.push(childRes[j].Value); }
                }
            } else {
                if ( uriList.indexOf(selRes[i].Value) < 0 ) { ret.push(selRes[i]); uriList.push(selRes[i].Value); }
            }
        }
        return ret;
    },


    getCurrentDirName : function() {
        var curIdx = sbCustomTreeUtil.getSelection(this.TREE)[0];
        return this.treeItems[curIdx][6];
    },

    open : function(aTabbed) {
        var idx = sbCustomTreeUtil.getSelection(this.TREE)[0];
        var type = this.treeItems[idx][7];
        if (type == "bookmark" || type == "separator")
            return;
        sbCommonUtils.loadURL(
            sbCommonUtils.convertFilePathToURL(this.rightDir.path) + this.getCurrentDirName() + "/index.html",
            aTabbed
        );
    },

    browse : function() {
        var dir = this.rightDir.clone();
        dir.append(this.getCurrentDirName());
        if ( dir.exists() ) window.top.sbController.launch(dir);
    },

    remove : function() {
        var idxList = sbCustomTreeUtil.getSelection(this.TREE);
        if ( idxList.length < 1 ) return;
        if ( !this.confirmRemovingPrompt() ) return;
        for ( var i = 0; i < idxList.length; i++ ) {
            var dirName = this.treeItems[idxList[i]][6];
            if ( !dirName ) return;
            var dir = this.rightDir.clone();
            dir.append(dirName);
            if ( !dir.exists() ) continue;
            sbCommonUtils.removeDirSafety(dir, false);
        }
        this.refreshTree();
    },

    confirmRemovingPrompt: function() {
        var button = sbCommonUtils.PROMPT.STD_YES_NO_BUTTONS + sbCommonUtils.PROMPT.BUTTON_POS_1_DEFAULT;
        var text = sbCommonUtils.lang("scrapbook", "CONFIRM_DELETE");
        // pressing default button or closing the prompt returns 1
        // reverse it to mean "no" by default
        return !sbCommonUtils.PROMPT.confirmEx(null, "[ScrapBook]", text, button, null, null, null, null, {});
    },

    showProperties : function() {
        var datFile = this.rightDir.clone();
        datFile.append(this.getCurrentDirName());
        datFile.append("index.dat");
        if ( !datFile.exists() ) return;
        var item = this.parseIndexDat(datFile);
        var content = "";
        for ( var prop in item ) {
            content += prop + " : " + item[prop] + "\n";
        }
        sbCommonUtils.alert(content);
    },

    onDblClick : function(aEvent) {
        if ( aEvent.originalTarget.localName == "treechildren" && aEvent.button == 0 ) this.open(false);
    },

    onKeyPress : function(aEvent) {
        switch ( aEvent.keyCode ) {
            case aEvent.DOM_VK_RETURN : this.open(false); break;
            case aEvent.DOM_VK_DELETE : this.remove(); break;
            default : break;
        }
    },

};




var sbExportService = {

    get QUICK_STATUS() { return document.getElementById("sbTradeQuickStatusText"); },

    count : -1,
    resList : [],

    exec : function() {
        if ( sbTradeService.locked ) return;
        if ( window.top.sbTreeHandler.TREE.view.selection.count == 0 ) return;
        sbTradeService.lock(2);
        sbTradeService.prepareLeftDir();
        this.count = -1;
        this.resList = sbTradeService.getComplexTreeSelection();
        this.next();
    },

    execQuick : function(aRes) {
        this.QUICK_STATUS.value = document.getElementById("sbTradeExportButton").label;
        sbTradeService.prepareLeftDir();
        var title = sbDataSource.getProperty(aRes, "title");
        try {
            this.copyLeftToRight(aRes);
        } catch(ex) {
            this.QUICK_STATUS.value = sbCommonUtils.lang("trade", "FAILED") + ": " + title;
            this.QUICK_STATUS.style.color = "#FF0000";
            return;
        }
        this.QUICK_STATUS.value = document.getElementById("sbTradeExportButton").label + ": " + title;
        var winEnum = sbCommonUtils.WINDOW.getEnumerator("scrapbook");
        while ( winEnum.hasMoreElements() ) {
            var win = winEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
            if ( win.location.href != "chrome://scrapbook/content/manage.xul" ) continue;
            try {
                win.document.getElementById("sbRightPaneBrowser").contentWindow.sbTradeService.refreshTree();
            } catch(ex) {
            }
        }
        setTimeout(function(){ window.close(); }, 1500);
    },

    next : function() {
        if ( ++this.count < this.resList.length ) {
            var rate = " (" + (this.count + 1) + "/" + this.resList.length + ") ";
            var title = sbDataSource.getProperty(this.resList[this.count], "title");
            try {
                this.copyLeftToRight(this.resList[this.count]);
                sbTradeService.log(document.getElementById("sbTradeExportButton").label + rate + title, "B");
            } catch(ex) {
                sbTradeService.log(sbCommonUtils.lang("trade", "FAILED") + ' "' + ex + '"' + rate + title, "R", true);
            }
            window.top.document.getElementById("sbManageProgress").value = Math.round( (this.count + 1) / this.resList.length * 100);
            setTimeout(function(){ sbExportService.next(); }, 0);
        } else {
            sbTradeService.refreshTree();
            sbTradeService.lock(0);
        }
    },

    copyLeftToRight : function(aRes) {
        if ( !sbDataSource.exists(aRes) ) throw "Datasource changed.";
        var item = sbDataSource.getItem(aRes);
        item.folder = sbDataSource.getFolderPath(aRes).join("\t");
        if ( item.icon && !item.icon.match(/^http|moz-icon|chrome/) ) {
            item.icon = item.icon.match(/\d{14}\/(.+)$/) ? RegExp.$1 : "";
        }
        var num = 0, destDir, dirName;
        do {
            dirName = sbCommonUtils.validateFileName(item.title).substring(0,60) || "untitled";
            if ( num > 0 ) dirName += "-" + num;
            dirName = dirName.replace(/\./g, "");
            destDir = sbTradeService.rightDir.clone();
            destDir.append(dirName);
        } while ( destDir.exists() && ++num < 256 );
        var srcDir = sbCommonUtils.getContentDir(item.id, false);
        sbCommonUtils.writeIndexDat(item);
        if ( !srcDir.exists() || !sbCommonUtils.validateID(srcDir.leafName) ) throw "Directory not found.";
        try {
            srcDir.copyTo(sbTradeService.rightDir, destDir.leafName);
        } catch(ex) {
            try {
                srcDir.copyTo(sbTradeService.rightDir, item.id);
            } catch(ex) {
                throw "Failed to copy files.";
            }
        }
        if (item.type == "folder" || item.type == "bookmark" || item.type == "separator")
            sbCommonUtils.removeDirSafety(srcDir);
    },

};




var sbImportService = {

    count   : -1,
    idxList : [],
    restoring : false,
    ascending : false,
    tarResArray : [],
    folderTable : {},
    _dataURI : "",

    exec : function(aRow, aOrient) {
        if ( sbTradeService.locked ) return;
        if ( sbTradeService.TREE.view.selection.count == 0 ) return;
        sbTradeService.lock(2);
        sbTradeService.prepareLeftDir();
        this._dataURI = sbDataSource.data.URI;
        this.restoring = ( aRow == -128 ) ? document.getElementById("sbTradeOptionRestore").checked : false;
        this.tarResArray = ( aRow < 0 ) ? [window.top.sbTreeHandler.TREE.ref, 0] : window.top.sbTreeDNDHandler.getTarget(aRow, aOrient);
        this.ascending = ( aRow < 0 ) ? true : (aOrient == 0);
        this.idxList   = sbCustomTreeUtil.getSelection(sbTradeService.TREE);
        this.count     = this.ascending ? -1 : this.idxList.length;
        this.folderTable = {};
        if ( this.restoring ) {
            var resList = sbDataSource.flattenResources(sbCommonUtils.RDF.GetResource("urn:scrapbook:root"), 1, true);
            for ( var i = 1; i < resList.length; i++ ) {
                this.folderTable[sbDataSource.getProperty(resList[i], "title")] = resList[i].Value;
            }
        }
        this.next();
    },

    next : function() {
        var atEnd;
        if ( this.ascending ) {
            atEnd = ++this.count >= this.idxList.length;
        } else {
            atEnd = --this.count < 0;
        }
        if ( !atEnd ) {
            var num  = this.ascending ? this.count + 1 : this.idxList.length - this.count;
            var rate = " (" + num + "/" + this.idxList.length + ") ";
            var title  = sbTradeService.treeItems[this.idxList[this.count]][0];
            var folder = sbTradeService.treeItems[this.idxList[this.count]][2];
            if ( folder ) folder = " [" + folder + "] ";
            try {
                this.copyRightToLeft();
                sbTradeService.log(document.getElementById("sbTradeImportButton").label + rate + folder + title, "B");
            } catch(ex) {
                sbTradeService.log(sbCommonUtils.lang("trade", "FAILED") + ' "' + ex + '"' + rate + title, "R", true);
            }
            window.top.document.getElementById("sbManageProgress").value = Math.round(num / this.idxList.length * 100);
            setTimeout(function(){ sbImportService.next(); }, 0);
        } else {
            sbTradeService.refreshTree();
            sbTradeService.lock(0);
            sbCommonUtils.rebuildGlobal();
        }
    },

    copyRightToLeft : function() {
        if ( sbDataSource.data.URI != this._dataURI ) throw "Datasource changed.";
        var dirName = sbTradeService.treeItems[this.idxList[this.count]][6];
        var srcDir = sbTradeService.rightDir.clone();
        srcDir.append(dirName);
        if ( !srcDir.exists() ) throw "Directory not found.";
        var datFile = srcDir.clone();
        datFile.append("index.dat");
        if ( !datFile.exists() ) throw "index.dat not found.";
        var item = sbTradeService.parseIndexDat(datFile);
        if ( !sbCommonUtils.validateID(item.id) ) throw "Invalid ID.";
        if ( sbDataSource.exists(item.id) ) throw sbCommonUtils.lang("trade", "ERROR_SAME_ID_EXISTS");
        var destDir = sbTradeService.leftDir.clone();
        if ( item.icon && !item.icon.match(/^http|moz-icon|chrome/) ) item.icon = "resource://scrapbook/data/" + item.id + "/" + item.icon;
        if ( document.getElementById("sbTradeOptionUpdate").checked ) {
            // generate create and modify if none
            // older version (<= ScrapBook X 1.12.0a10) do not have these records
            if (!item.create) item.create = item.id;
            if (!item.modify) item.modify = item.create;
        }
        if ( item.type == "folder" || item.type == "bookmark" || item.type == "separator" ) {
            if ( document.getElementById("sbTradeOptionRemove").checked ) sbCommonUtils.removeDirSafety(srcDir, false);
        } else {
            try {
                if ( document.getElementById("sbTradeOptionRemove").checked ) {
                    srcDir.moveTo(destDir, item.id);
                } else {
                    srcDir.copyTo(destDir, item.id);
                }
            } catch(ex) {
                throw "Failed to copy files.";
            }
        }
        var folder = "";
        if ( this.restoring ) {
            this.tarResArray = ["urn:scrapbook:root", 0];
            var folderList = "folder" in item ? item.folder.split("\t") : [];
            for ( var i = 0; i < folderList.length; i++ ) {
                if ( folderList[i] == "" ) continue;
                if ( folderList[i] in this.folderTable &&
                    sbDataSource.getRelativeIndex(
                        sbCommonUtils.RDF.GetResource(this.tarResArray[0]),
                        sbCommonUtils.RDF.GetResource(this.folderTable[folderList[i]])
                    ) > 0 ) {
                    this.tarResArray[0] = this.folderTable[folderList[i]];
                    var idx = window.top.sbTreeHandler.TREE.builderView.getIndexOfResource(sbCommonUtils.RDF.GetResource(this.tarResArray[0]));
                    if ( idx >= 0 && !window.top.sbTreeHandler.TREE.view.isContainerOpen(idx) ) window.top.sbTreeHandler.TREE.view.toggleOpenState(idx);
                } else {
                    var newItem = sbCommonUtils.newItem(sbCommonUtils.getTimeStamp());
                    newItem.id = sbDataSource.identify(newItem.id);
                    newItem.title = folderList[i];
                    newItem.type = "folder";
                    var newRes = sbDataSource.addItem(newItem, this.tarResArray[0], 0);
                    sbDataSource.createEmptySeq(newRes.Value);
                    var idx = window.top.sbTreeHandler.TREE.builderView.getIndexOfResource(newRes);
                    if ( idx >= 0 ) window.top.sbTreeHandler.TREE.view.toggleOpenState(idx);
                    this.folderTable[newItem.title] = newRes.Value;
                    this.tarResArray[0] = newRes.Value;
                    sbTradeService.log(sbCommonUtils.lang("trade", "CREATE_FOLDER", [newItem.title]), "B", true);
                }
            }
            if ( this.tarResArray[0] != window.top.sbTreeHandler.TREE.ref ) folder = " [" + item.folder + "] ";
        }
        var curRes = sbDataSource.addItem(item, this.tarResArray[0], this.tarResArray[1]);
        if (item.type == "folder") sbDataSource.createEmptySeq(curRes.Value);
        this.folderTable[item.title] = curRes.Value;
        window.top.sbTreeHandler.TREE.builder.rebuild();
    },

};



var gDragDropObserver = {

    onDragStart: function(event, transferData, action) {
        if (event.originalTarget.localName != "treechildren")
            return;
        transferData.data = new TransferData();
        transferData.data.addDataForFlavour("sb/tradeitem", sbTradeService.TREE.view.selection);
    },
    getSupportedFlavours: function() {
        var flavours = new FlavourSet();
        flavours.appendFlavour("moz/rdfitem");
        return flavours;
    },
    onDragOver: function(event, flavour, session) {},
    onDragExit: function(event, session) {},
    onDrop: function(event, transferData, session) {
        if (sbTradeService.locked)
            return;
        sbExportService.exec();
    },

};


