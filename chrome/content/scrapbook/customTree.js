
<<<<<<< HEAD
const ATOM_SERVICE = Components.classes['@mozilla.org/atom-service;1'].getService(Components.interfaces.nsIAtomService);
=======
const ATOM_SERVICE = Cc['@mozilla.org/atom-service;1'].getService(Ci.nsIAtomService);
>>>>>>> release-1.6.0.a1

function sbCustomTreeView(aColIDs, aItems)
{
	this._items = aItems;
	this._rowCount = aItems.length;
	this.colIDs = aColIDs;
}


sbCustomTreeView.prototype = 
{
	get rowCount()
	{
		return this._rowCount;
	},
	getCellText: function(row, col)
	{
		return this._items[row][col.index];
	},
	setCellText: function(row, col, val)
	{
		this._items[row][col.index] = val;
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
	canDrop : function(index, orient){},
<<<<<<< HEAD
	canDropOn : function(index){},
	canDropBeforeAfter : function(index, before){},
=======
>>>>>>> release-1.6.0.a1
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

	sortItems : function(aService, aColElem)
	{
		var asc = aColElem.getAttribute("sortDirection") == "descending";
		var elems = aService.TREE.firstChild.childNodes;
		for ( var i = 0; i < elems.length; i++ )
		{
			elems[i].removeAttribute("sortDirection");
		}
		if ( !asc ) {
			aService.treeItems.reverse();
		} else {
			this.heapSort(aService.treeItems, aColElem.getAttribute("sortIndex"));
		}
		aColElem.setAttribute("sortDirection", asc ? "ascending" : "descending");
		aService.initTree();
	},

	heapSort : function(array, k)
	{
		var h, i, j, n;
		array[array.length] = array[0];
		var N = array.length - 1;
		for( h=N; h>0; h-- ) {
			i = h;
			n = array[i];
			while( (j=i*2) <= N ) {
				if( (j<N) && (array[j][k]<array[j+1][k]) ) j++;
				if( n[k] >= array[j][k] ) break;
				array[i] = array[j];
				i = j;
			}
			array[i] = n;
		}
		while( N>1 ) {
			n = array[N];
			array[N] = array[1];
			N--;
			i = 1;
			while( (j=i*2)<=N ) {
				if( (j<N) && (array[j][k]<array[j+1][k]) ) j++;
				if( n[k] >= array[j][k] ) break;
				array[i] = array[j];
				i = j;
			}
			array[i] = n;
		}
		for( i=0; i<array.length-1; i++ ) array[i] = array[i+1];
		array.length--;
	},

	getSelection : function(aTree)
	{
		var retArray = [];
		for ( var rc = 0; rc < aTree.view.selection.getRangeCount(); rc++ )
		{
			var start = {}, end = {};
			aTree.view.selection.getRangeAt(rc, start, end);
			for ( var i = start.value; i <= end.value; i++ )
			{
				retArray.push(i);
			}
		}
		return retArray;
	},

};


