
var sbMultiBookConfig = {

	get TREE(){ return document.getElementById("sbMultiBookTree"); },
	get CURRENT_TREEITEM() { return this.treeItems[this.TREE.currentIndex]; },

	changed : false,
	treeItems : [],

	init : function()
	{
		this.treeItems = sbMultiBookService.initFile();
		this.initTree();
	},

	initTree : function()
	{
		var colIDs = [
			"sbMultiBookTreecolName",
			"sbMultiBookTreecolPath",
		];
		this.TREE.view = new sbCustomTreeView(colIDs, this.treeItems);
	},

	add : function()
	{
		window.openDialog("chrome://scrapbook/content/mbProperty.xul","","chrome,centerscreen,modal");
	},

	edit : function()
	{
		if ( this.TREE.currentIndex < 0 ) return;
		window.openDialog("chrome://scrapbook/content/mbProperty.xul","","chrome,centerscreen,modal", this.CURRENT_TREEITEM);
	},

	up : function()
	{
		var curIdx = this.TREE.currentIndex;
		if ( curIdx < 1 ) return;
		var tmp = this.treeItems[curIdx-1];
		this.treeItems[curIdx-1] = this.treeItems[curIdx];
		this.treeItems[curIdx] = tmp;
		this.initTree();
		this.changed = true;
		this.TREE.view.selection.rangedSelect(curIdx-1, curIdx-1, true);
		this.TREE.focus();
	},

	down : function()
	{
		var curIdx = this.TREE.currentIndex;
		if ( curIdx < 0 || curIdx >= this.treeItems.length - 1 ) return;
		var tmp = this.treeItems[curIdx + 1];
		this.treeItems[curIdx+1] = this.treeItems[curIdx];
		this.treeItems[curIdx] = tmp;
		this.initTree();
		this.changed = true;
		this.TREE.view.selection.rangedSelect(curIdx+1, curIdx+1, true);
		this.TREE.focus();
	},

	remove : function()
	{
		if ( this.TREE.currentIndex < 0 ) return;
		if ( window.confirm(window.opener.sbMainService.STRING.getString("CONFIRM_DELETE")) )
		{
			this.treeItems.splice(this.TREE.currentIndex, 1);
			this.initTree();
			this.changed = true;
		}
	},

	done : function()
	{
		if ( !this.changed ) return;
		var content = "";
		for ( var i = 0; i < this.treeItems.length; i++ )
		{
			content += this.treeItems[i][0] + "\t" + this.treeItems[i][1] + "\n";
		}
		sbCommonUtils.writeFile(sbMultiBookService.file, content, "UTF-8");
		window.opener.location.reload();
	},

};


