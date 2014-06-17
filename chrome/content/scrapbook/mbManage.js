
const Cc = Components.classes;
const Ci = Components.interfaces;

const kNameCol = 0;
const kPathCol = 1;
const kActiveCol = 2;

var gMultiBookTreeView;

var gMultiBookManager = {

	_changed : false,
	_activeItemChanged: false,

	init: function() {
		if (!window.opener)
			throw Components.results.NS_ERROR_UNEXPECTED;
		var data = sbMultiBookService.initFile();
		var currentPath = sbCommonUtils.copyUnicharPref("extensions.scrapbook.data.path", "");
		data.forEach(function(item) {
			item[kActiveCol] = (item[kPathCol] == currentPath);
		});
		gMultiBookTreeView = new MultiBookTreeView(data);
		var tree = document.getElementById("mbManagerTree");
		tree.view = gMultiBookTreeView;
		this.updateButtonsUI();
	},

	done: function() {
		if (!this._changed)
			return;
		if (this._activeItemChanged) {
			gMultiBookTreeView._data.forEach(function(item) {
				if (item[kActiveCol]) {
					sbCommonUtils.setUnicharPref("extensions.scrapbook.data.title", item[kNameCol]);
					sbCommonUtils.setUnicharPref("extensions.scrapbook.data.path", item[kPathCol]);
					window.opener.top.sbBrowserOverlay.dataTitle = item[kNameCol];
				}
			});
		}
		var content = "";
		gMultiBookTreeView._data.forEach(function(item) {
			content += item[kNameCol] + "\t" + item[kPathCol] + "\n";
		});
		sbCommonUtils.writeFile(sbMultiBookService.file, content, "UTF-8");
		window.opener.location.reload();
	},

	updateButtonsUI: function() {
		var row = gMultiBookTreeView.selection.currentIndex;
		var item = gMultiBookTreeView.getItemAt(row);
		var canEdit = gMultiBookTreeView.selection.count == 1;
		var canRemove = item ? !item[kActiveCol] : false;
		document.getElementById("mbEditButton").disabled = !canEdit;
		document.getElementById("mbRemoveButton").disabled = !canRemove;
	},

	add: function() {
		var newItem = ["", ""];
		gMultiBookTreeView.appendItem(newItem);
		var canceled = this.edit();
		if (canceled)
			gMultiBookTreeView.removeItemAt(gMultiBookTreeView.selection.currentIndex);
	},

	edit: function() {
		var row = gMultiBookTreeView.selection.currentIndex;
		if (row < 0)
			return false;
		var item = gMultiBookTreeView.getItemAt(row);
		var ret = { value: item };
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
		var row = gMultiBookTreeView.selection.currentIndex;
		gMultiBookTreeView.removeItemAt(row);
		this._changed = true;
	},

	handleTreeDblClick: function(aEvent) {
		if (aEvent.button != 0)
			return;
		var row = {}, obj = {};
		gMultiBookTreeView._treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, row, {}, obj);
		if (row.value == -1 || obj.value == "twisty")
			return;
		this.edit();
	},

};



var gDragDropObserver = {

	onDragStart: function (aEvent, aXferData, aDragAction) {
		if (gMultiBookTreeView.selection.count != 1)
			return;
		var sourceIndex = gMultiBookTreeView.selection.currentIndex;
		aXferData.data = new TransferData();
		aXferData.data.addDataForFlavour("text/unicode", sourceIndex);
		aDragAction.action = Ci.nsIDragService.DRAGDROP_ACTION_MOVE;
	},

	onDrop: function (aEvent, aXferData, aDragSession) {},
	onDragExit: function (aEvent, aDragSession) {},
	onDragOver: function (aEvent, aFlavour, aDragSession) {},
	getSupportedFlavours: function() { return null; }

};



function MultiBookTreeView(aData) {
	this._data = aData;
}


MultiBookTreeView.prototype = {

	_treeBoxObject: null,

	get selectedItem() {
		if (this.selection.count < 1)
			return null;
		else
			return this._data[this.selection.currentIndex];
	},

	getItemAt: function(aRow) {
		return this._data[aRow];
	},

	appendItem: function(aItem) {
		this._data.push(aItem);
		var newIdx = this.rowCount - 1;
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
		var removedItems = this._data.splice(aSourceIndex, 1);
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
	getRowProperties: function(index) {},
	getCellProperties: function(row, col) {
		if (this._data[row][kActiveCol]) {
			var atomSvc = Cc["@mozilla.org/atom-service;1"].getService(Ci.nsIAtomService);
			return atomSvc.getAtom("active");
		}
	},
	getColumnProperties: function(col) {},
	isContainer: function(index) { return false; },
	isContainerOpen: function(index) { return false; },
	isContainerEmpty: function(index) { return false; },
	isSeparator: function(index) { return false; },
	isSorted: function() { return false; },
	canDrop: function(targetIndex, orientation) {
		if (this.selection.count != 1)
			return false;
		var sourceIndex = this.selection.currentIndex;
		return (
			sourceIndex != -1 &&
			sourceIndex != targetIndex &&
			sourceIndex != (targetIndex + orientation)
		);
	},
	drop: function(targetIndex, orientation) {
		if (this.selection.count != 1)
			return false;
		var sourceIndex = this.selection.currentIndex;
		if (sourceIndex < targetIndex) {
			if (orientation == Ci.nsITreeView.DROP_BEFORE)
				targetIndex--;
		}
		else {
			if (orientation == Ci.nsITreeView.DROP_AFTER)
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


