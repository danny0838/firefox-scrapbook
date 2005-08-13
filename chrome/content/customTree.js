function sbCustomTreeView(aColIDs, aItems)
{
	this._items = aItems;
	this._rowCount = aItems.length;
	this.colIDs = aColIDs;
	this.colCount = this.colIDs.length;
}


sbCustomTreeView.prototype = 
{
	get rowCount()
	{
		return this._rowCount;
	},
	getCellText: function(row, col)
	{
		if ( col.index > -1 ) {
			return this._items[row][col.index];
		} else {
			var colIdx = 0;
			while ( colIdx < this.colCount && col != this.colIDs[colIdx] ) ++colIdx;
			return this._items[row][colIdx];
		}
	},
	setCellText: function(row, col, val)
	{
		if ( col.index > -1 ) {
			this._items[row][col.index] = val;
		} else {
			var colIdx = 0;
			while ( colIdx < this.colCount && col != this.colIDs[colIdx] ) ++colIdx;
			this._items[row][colIdx] = val;
		}
	},
	setTree: function(tree)
	{
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
	canDropOn : function(aIndex){},
	canDropBeforeAfter : function(index, before){},
	drop : function(index, orient){},
	getParentIndex : function getParentIndex(index){},
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
	performActionOnCell : function(action, row, colID){}
}


