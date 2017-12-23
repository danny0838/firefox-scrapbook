
let sbCalcService = {

    get TREE()     { return document.getElementById("sbTree"); },
    get STATUS()   { return document.getElementById("sbCalcMessage"); },
    get PROGRESS() { return document.getElementById("sbCalcProgress"); },

    dirEnum: null,
    treeItems: [],
    count: 0,
    total: 0,
    grandSum: 0,
    invalidCount: 0,

    exec: function() {
        let resEnum = sbDataSource.data.GetAllResources();
        while ( resEnum.hasMoreElements() ) {
            let res = resEnum.getNext();
            if ( sbDataSource.isContainer(res) ) continue;
            this.total++;
            let id = sbDataSource.getProperty(res, "id");
            if ( !id ) continue;
            let type = sbDataSource.getProperty(res, "type");
            if ( ["folder", "separator", "bookmark"].indexOf(type) != -1 ) continue;
            let icon = sbDataSource.getProperty(res, "icon");
            if ( !icon ) icon = sbCommonUtils.getDefaultIcon(type);
            if ( !sbCommonUtils.getContentDir(id, true) ) {
                this.invalidCount++;
                this.treeItems.push([
                    id,
                    sbDataSource.getProperty(res, "type"),
                    sbDataSource.getProperty(res, "title"),
                    icon,
                    0,
                    sbCommonUtils.formatFileSize(0),
                    false,
                ]);
            }
        }
        let dataDir = sbCommonUtils.getScrapBookDir().clone();
        dataDir.append("data");
        this.dirEnum = dataDir.directoryEntries;
        this.processAsync();
    },

    processAsync: function() {
        if ( !this.dirEnum.hasMoreElements() ) {
            this.finish();
            return;
        }
        this.count++;
        let dir = this.dirEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
        if ( dir.isDirectory() ) {
            let id = dir.leafName;
            let index = dir.clone(); index.append("index.html");
            let bytes = sbPropService.getTotalFileSize(id)[0];
            this.grandSum += bytes;
            let res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
            let type = sbDataSource.getProperty(res, "type");
            let valid = sbDataSource.exists(res)
                && !sbDataSource.isolated(res)
                && ["folder", "separator", "bookmark"].indexOf(type) == -1
                && index.exists() && index.isFile();
            let icon = sbDataSource.getProperty(res, "icon");
            if ( !icon ) icon = sbCommonUtils.getDefaultIcon(type);
            this.treeItems.push([
                id,
                type,
                sbDataSource.getProperty(res, "title"),
                icon,
                bytes,
                sbCommonUtils.formatFileSize(bytes),
                valid,
            ]);
            if ( !valid ) this.invalidCount++;
            this.STATUS.label = sbCommonUtils.lang("CALCULATING", this.count, this.total);
            this.PROGRESS.value = Math.round(this.count / this.total * 100);
        }
        setTimeout(function() { sbCalcService.processAsync(); }, 0);
    },

    finish: function() {
        sbCustomTreeUtil.sortArrayByIndex(this.treeItems, 4);
        this.treeItems.reverse();
        this.initTree();
        this.STATUS.label = "";
        this.PROGRESS.hidden = true;
        document.getElementById("sbCalcTotalSize").value = sbCommonUtils.lang("ITEMS_COUNT", sbCommonUtils.formatFileSize(this.grandSum), this.count, this.total);
        document.getElementById("sbCalcDiagnosis").value = ( this.invalidCount == 0 ) ? sbCommonUtils.lang("DIAGNOSIS_OK") : sbCommonUtils.lang("DIAGNOSIS_NG", this.invalidCount);
        this.checkDoubleEntries();
    },

    initTree: function() {
        let colIDs = [
            "sbTreeColTitle",
            "sbTreeColSize",
            "sbTreeColState",
        ];
        let treeView = new sbCustomTreeView(colIDs, this.treeItems);
        treeView.getCellText = function(row, col) {
            switch ( col.index ) {
                case 0: return this._items[row][2]; break;
                case 1: return this._items[row][5]; break;
                case 2: return this._items[row][6] ? "" : sbCommonUtils.lang("INVALID"); break;
            }
        };
        treeView.getImageSrc = function(row, col) {
            if ( col.index == 0 ) return this._items[row][3];
        };
        treeView.getCellProperties = function(row, col, properties) {
            if ( this._items[row][6] && col.index != 0 ) return "";
            let val = !this._items[row][6] ? "invalid" : this._items[row][1];
            // Gecko >= 22 (Firefox >= 22): do not take properties and requires a return value
            if (properties) {
                properties.AppendElement(sbCommonUtils.ATOM.getAtom(val));
            } else {
                return val;
            }
        };
        treeView.cycleHeader = function(col) {
            sbCustomTreeUtil.sortItems(sbCalcService, col.element);
        };
        this.TREE.view = treeView;
    },

    checkDoubleEntries: function() {
        let hashTable = {};
        let resList = sbDataSource.flattenResources(sbCommonUtils.RDF.GetResource("urn:scrapbook:root"), 0, true);
        for ( let i = 0; i < resList.length; i++ ) {
            if ( resList[i].Value in hashTable ) {
                sbCommonUtils.alert(sbCommonUtils.lang("WARN_DOUBLE_ENTRY", sbDataSource.getProperty(resList[i], "title")));
                let parRes = sbDataSource.findParentResource(resList[i]);
                if ( parRes ) sbDataSource.removeFromContainer(parRes.Value, resList[i]);
            }
            hashTable[resList[i].Value] = true;
        }
    },

};




let sbCalcController = {

    get CURRENT_TREEITEM() {
        return sbCalcService.treeItems[sbCalcService.TREE.currentIndex];
    },

    createPopupMenu: function(aEvent) {},

    onDblClick: function(aEvent) {
        if ( aEvent.button == 0 && aEvent.originalTarget.localName == "treechildren" ) this.open(false);
    },

    open: function(tabbed) {
        let res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + this.CURRENT_TREEITEM[0]);
        sbCommonUtils.loadURL(sbDataSource.getURL(res), tabbed);
    },

    remove: function() {
        let id = this.CURRENT_TREEITEM[0];
        if (this.CURRENT_TREEITEM[6]) {
            if (!sbController.confirmRemovingPrompt()) return;
        }
        try {
            // remove the data folder
            let dir = sbCommonUtils.getContentDir(id, true, true);
            if (dir) {
                if (!sbCommonUtils.removeDirSafety(dir, false)) throw "failed to remove directory";
            }
            // remove the item from the resource
            let res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
            if (sbDataSource.exists(res)) {
                let parent = sbDataSource.findParentResource(res);
                sbDataSource.deleteItemDescending(res, parent);
            }
            // remove the item from the list
            sbCalcService.treeItems.splice(sbCalcService.TREE.currentIndex, 1);
            sbCalcService.initTree();
        } catch(ex) {}
    },

    forward: function(aCommand) {
        let id = this.CURRENT_TREEITEM[0];
        switch ( aCommand ) {
            case "P": window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome" ,id); break;
            case "L": sbController.launch(sbCommonUtils.getContentDir(id, true, true));
            default: break;
        }
    },

};


