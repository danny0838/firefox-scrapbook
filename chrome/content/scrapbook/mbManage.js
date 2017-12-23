const kNameCol = 0;
const kPathCol = 1;
const kActiveCol = 2;

let gMultiBookTreeView;

let gMultiBookManager = {

    _changed: false,
    _activeItemChanged: false,

    init: function() {
        if (!window.opener)
            throw Components.results.NS_ERROR_UNEXPECTED;
        let data = sbMultiBookService.initFile();
        let currentPath = sbCommonUtils.getPref("data.path", "");
        data.forEach(function(item) {
            item[kActiveCol] = (item[kPathCol] == currentPath);
        });
        gMultiBookTreeView = new MultiBookTreeView(data);
        let tree = document.getElementById("mbManagerTree");
        tree.view = gMultiBookTreeView;
        this.updateButtonsUI();
    },

    done: function() {
        if (!this._changed)
            return;
        let content = "";
        gMultiBookTreeView._data.forEach(function(item) {
            content += item[kNameCol] + "\t" + item[kPathCol] + "\n";
        });
        sbCommonUtils.writeFile(sbMultiBookService.file, content, "UTF-8");
        if (this._activeItemChanged) {
            gMultiBookTreeView._data.forEach(function(item) {
                if (item[kActiveCol]) {
                    sbCommonUtils.setPref("data.path", item[kPathCol]);
                    sbCommonUtils.setPref("data.title", item[kNameCol]);
                }
            });
        }
        sbDataSource.checkRefresh();
    },

    updateButtonsUI: function() {
        let row = gMultiBookTreeView.selection.currentIndex;
        let item = gMultiBookTreeView.getItemAt(row);
        let canEdit = gMultiBookTreeView.selection.count == 1;
        let canRemove = item ? !item[kActiveCol] : false;
        document.getElementById("mbEditButton").disabled = !canEdit;
        document.getElementById("mbRemoveButton").disabled = !canRemove;
    },

    add: function() {
        let newItem = ["", ""];
        gMultiBookTreeView.appendItem(newItem);
        let canceled = this.edit();
        if (canceled)
            gMultiBookTreeView.removeItemAt(gMultiBookTreeView.selection.currentIndex);
    },

    edit: function() {
        let row = gMultiBookTreeView.selection.currentIndex;
        if (row < 0)
            return false;
        let item = gMultiBookTreeView.getItemAt(row);
        let ret = { value: item };
        window.openDialog(
            "chrome://scrapbook/content/mbEdit.xul", "", "chrome,centerscreen,modal",
            ret
        );
        if (!ret.value || !ret.value[kPathCol])
            return true;
        item[kNameCol] = ret.value[kNameCol];
        item[kPathCol] = ret.value[kPathCol];
        gMultiBookTreeView._treeBoxObject.invalidateRow(row);
        this._changed = true;
        if (item[kActiveCol])
            this._activeItemChanged = true;
        return false;
    },

    remove: function() {
        let row = gMultiBookTreeView.selection.currentIndex;
        gMultiBookTreeView.removeItemAt(row);
        this._changed = true;
    },

    handleTreeDblClick: function(aEvent) {
        if (aEvent.button != 0)
            return;
        let row = {}, obj = {};
        gMultiBookTreeView._treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, row, {}, obj);
        if (row.value == -1 || obj.value == "twisty")
            return;
        this.edit();
    },

    handleDragStart: function(event) {
        if (gMultiBookTreeView.selection.count != 1) {
            return;
        }
        let sourceIndex = gMultiBookTreeView.selection.currentIndex;
        let name = gMultiBookTreeView._data[sourceIndex][kNameCol];
        let path = gMultiBookTreeView._data[sourceIndex][kPathCol];
        event.dataTransfer.setData("text/x-moz-tree-index", sourceIndex);
        event.dataTransfer.setData("text/plain", name + "\t" + path);
        event.dataTransfer.dropEffect = "move";
    }

};



function MultiBookTreeView(aData) {
    this._data = aData;
}


MultiBookTreeView.prototype = {

    _treeBoxObject: null,

    get selectedItem() {
        if (this.selection.count < 1) {
            return null;
        } else {
            return this._data[this.selection.currentIndex];
        }
    },

    getItemAt: function(aRow) {
        return this._data[aRow];
    },

    appendItem: function(aItem) {
        this._data.push(aItem);
        let newIdx = this.rowCount - 1;
        this._treeBoxObject.rowCountChanged(newIdx, 1);
        this.selection.select(newIdx);
        this._treeBoxObject.ensureRowIsVisible(newIdx);
        this._treeBoxObject.treeBody.focus();
    },

    removeItemAt: function(aRow) {
        this._data.splice(aRow, 1);
        this._treeBoxObject.rowCountChanged(aRow, -1);
        this.selection.clearSelection();
    },

    moveItem: function(aSourceIndex, aTargetIndex) {
        if (aTargetIndex < 0 || aTargetIndex > this.rowCount - 1)
            return;
        let removedItems = this._data.splice(aSourceIndex, 1);
        this._data.splice(aTargetIndex, 0, removedItems[0]);
        this._treeBoxObject.invalidate();
        this.selection.clearSelection();
        this.selection.select(aTargetIndex);
        this._treeBoxObject.ensureRowIsVisible(aTargetIndex);
        this._treeBoxObject.treeBody.focus();
        gMultiBookManager._changed = true;
    },


    get rowCount() {
        return this._data.length;
    },
    selection: null,
    getRowProperties: function(index, properties) {},
    getCellProperties: function(row, col, properties) {
        if (this._data[row][kActiveCol]) {
            let val = "active";
            // Gecko >= 22 (Firefox >= 22): do not take properties and requires a return value
            if (properties) {
                properties.AppendElement(sbCommonUtils.ATOM.getAtom(val));
            } else {
                return val;
            }
        }
    },
    getColumnProperties: function(col, properties) {},
    isContainer: function(index) { return false; },
    isContainerOpen: function(index) { return false; },
    isContainerEmpty: function(index) { return false; },
    isSeparator: function(index) { return false; },
    isSorted: function() { return false; },
    canDrop: function(targetIndex, orientation, dataTransfer) {
        if (!dataTransfer.types.contains("text/x-moz-tree-index")) {
            return false;
        }
        let sourceIndex = parseInt(dataTransfer.getData("text/x-moz-tree-index"), 10);
        return (
            sourceIndex != -1 &&
            sourceIndex != targetIndex &&
            sourceIndex != (targetIndex + orientation)
        );
    },
    drop: function(targetIndex, orientation, dataTransfer) {
        let sourceIndex = this.selection.currentIndex;
        if (sourceIndex < targetIndex) {
            if (orientation == Components.interfaces.nsITreeView.DROP_BEFORE)
                targetIndex--;
        } else {
            if (orientation == Components.interfaces.nsITreeView.DROP_AFTER)
                targetIndex++;
        }
        this.moveItem(sourceIndex, targetIndex);
    },
    getParentIndex: function(rowIndex) { return -1; },
    hasNextSibling: function(rowIndex, afterIndex) { return false; },
    getLevel: function(index) { return 0; },
    getImageSrc: function(row, col) {},
    getProgressMode: function(row, col) {},
    getCellValue: function(row, col) {},
    getCellText: function(row, col) {
        return this._data[row][col.index];
    },
    setTree: function(tree) {
        this._treeBoxObject = tree;
    },
    toggleOpenState: function(index) {},
    cycleHeader: function(col) {},
    selectionChanged: function() {},
    cycleCell: function(row, col) {},
    isEditable: function(row, col) { return false; },
    isSelectable: function(row, col) {},
    setCellValue: function(row, col, value) {},
    setCellText: function(row, col, value) {},
    performAction: function(action) {},
    performActionOnRow: function(action, row) {},
    performActionOnCell: function(action, row, col) {},

};


