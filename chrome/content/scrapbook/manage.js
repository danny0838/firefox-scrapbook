
var sbManageUI = {

	moduleID : "",

	treeColumnState : [],

	init: function() {
		if (window.arguments) {
			if (window.arguments[0]) {
				document.getElementById("sbTree").setAttribute("ref", window.arguments[0].Value);
				document.title = ScrapBookData.getProperty(window.arguments[0], "title");
			}
			if (window.arguments[1])
				this.toggleRightPane(window.arguments[1]);
		}
		document.getElementById("sbTreeColTitle").setAttribute("hideheader", "false");
		window.focus();
	},

	toggleRightPane : function(aModuleElt)
	{
		if ( typeof(aModuleElt) == "string" ) aModuleElt = document.getElementById(aModuleElt);
		this.moduleID = this.moduleID == aModuleElt.id ? "" : aModuleElt.id;
		var willEnable = this.moduleID == "" ? false : true;
		var elts = document.getElementsByAttribute("group", "module");
		for ( var i = 0; i < elts.length; i++ )
		{
			elts[i].checked = elts[i].id == this.moduleID;
		}
		document.getElementById("sbPaneSplitter").hidden = !willEnable;
		document.getElementById("sbRightPaneBrowser").hidden = !willEnable;
		var colElts = document.getElementById("sbTreeCols").childNodes;
		for ( var i = 1; i < colElts.length; i++ )
		{
			colElts[i].removeAttribute("persist");
			if ( willEnable ) {
				this.treeColumnState[i] = colElts[i].hidden;
				colElts[i].hidden = true;
			} else {
				colElts[i].hidden = this.treeColumnState[i];
			}
		}
		if ( willEnable ) document.getElementById("sbRightPaneBrowser").loadURI(aModuleElt.getAttribute("moduleurl"));
	},

	getTreeSelection : function()
	{
		var arg1 = [], arg2 = [];
		var idxList = sbTreeUI.getSelection(false, 2);
		idxList.forEach(function(aIdx)
		{
			arg1.push(sbTreeUI.TREE.builderView.getResourceAtIndex(aIdx));
			arg2.push(sbTreeUI.getParentResource(aIdx));
		});
		return [arg1, arg2];
	},

};


