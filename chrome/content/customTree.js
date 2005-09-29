function sbCustomTreeView(aColIDs, aItems)
{
	this._items = aItems;
	this._rowCount = aItems.length;
	this.colIDs = aColIDs;
}


sbCustomTreeView.prototype = 
{
	normalizeColumnIndex : function(col)
	{
		if ( col.index > -1 ) {
			// Firefox 1.1+
			return col.index;
		} else {
			// Firefox 1.0
			var colIdx = 0;
			while ( colIdx < this.colIDs.length && col != this.colIDs[colIdx] ) ++colIdx;
			return colIdx;
		}
	},
	get rowCount()
	{
		return this._rowCount;
	},
	getCellText: function(row, col)
	{
		return this._items[row][this.normalizeColumnIndex(col)];
	},
	setCellText: function(row, col, val)
	{
		this._items[row][this.normalizeColumnIndex(col)] = val;
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


