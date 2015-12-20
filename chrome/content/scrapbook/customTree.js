
const ATOM_SERVICE = Components.classes['@mozilla.org/atom-service;1'].getService(Components.interfaces.nsIAtomService);

function sbCustomTreeView(aColIDs, aItems) {
    this._items = aItems;
    this._rowCount = aItems.length;
    this.colIDs = aColIDs;
}


sbCustomTreeView.prototype = {
    get rowCount() {
        return this._rowCount;
    },
    getCellText: function(row, col) {
        return this._items[row][col.index];
    },
    setCellText: function(row, col, val) {
        this._items[row][col.index] = val;
    },
    setTree: function(tree) {
        this._treeBox = tree;
    },
    cycleHeader : function(colID, elem){},
    getRowProperties : function(index, properties){},
    getCellProperties : function(row, colID, properties){},
    getColumnProperties : function(colID, colElem, properties){},
    isContainer : function(row){},
    isContainerOpen : function(row){},
    isContainerEmpty : function(row){},
    isSeparator : function(row){},
    isSorted : function(row){},
    canDrop : function(index, orient){},
    canDropOn : function(index){},
    canDropBeforeAfter : function(index, before){},
    drop : function(index, orient){},
    getParentIndex : function getParentIndex(index){ return -1; },
    hasNextSibling : function(index, afterIndex){},
     getLevel : function(index){},
    getImageSrc : function(row, col){},
    getProgressMode : function(row, colID){},
    getCellValue : function(row, colID){},
    selectionChanged : function(){},
    cycleCell : function(row, colID){},
    isEditable : function(row, colID){},
    toggleOpenState : function(index){},
    performAction : function(action){},
    performActionOnRow : function(action, row){},
    performActionOnCell : function(action, row, colID){},
};


var sbCustomTreeUtil = {

    sortItems : function(aService, aColElem) {
        var asc = aColElem.getAttribute("sortDirection") != "ascending";
        var elems = aService.TREE.firstChild.childNodes;
        for ( var i = 0; i < elems.length; i++ ) {
            elems[i].removeAttribute("sortDirection");
        }
        if ( !asc ) {
            aService.treeItems.reverse();
        } else {
            this.sortArrayByIndex(aService.treeItems, aColElem.getAttribute("sortIndex"));
        }
        aColElem.setAttribute("sortDirection", asc ? "ascending" : "descending");
        aService.initTree();
    },

    sortArrayByIndex : function(array, index) {
        array.sort(function(a, b){
            if (a[index] > b[index]) return 1;
            if (a[index] < b[index]) return -1;
            return 0;
        });
    },

    getSelection : function(aTree) {
        var retArray = [];
        for ( var rc = 0; rc < aTree.view.selection.getRangeCount(); rc++ ) {
            var start = {}, end = {};
            aTree.view.selection.getRangeAt(rc, start, end);
            for ( var i = start.value; i <= end.value; i++ ) {
                retArray.push(i);
            }
        }
        return retArray;
    },

};


