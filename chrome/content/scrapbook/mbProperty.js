
var sbMultiBookProp = {

	get NAME() { return document.getElementById("sbMultiBookPropName"); },
	get PATH() { return document.getElementById("sbMultiBookPropPath"); },

	editMode : true,

	init : function()
	{
		if ( !window.arguments )
		{
			this.editMode = false;
			return;
		}
		this.NAME.value = window.arguments[0][0];
		this.PATH.value = window.arguments[0][1];
	},

	done : function()
	{
		if ( this.editMode )
		{
			window.opener.sbMultiBookConfig.CURRENT_TREEITEM[0] = this.NAME.value;
			window.opener.sbMultiBookConfig.CURRENT_TREEITEM[1] = this.PATH.value;
		}
		else
		{
			try {
				var aFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
				aFile.initWithPath(this.PATH.value);
			} catch(ex) {
				alert("ScrapBook ERROR: Invalid file path.\n" + ex);
				return;
			}
			if ( !this.NAME.value ) this.NAME.value = this.PATH.value;
			var newItem = [this.NAME.value, this.PATH.value];
			window.opener.sbMultiBookConfig.treeItems.push(newItem);
			window.opener.sbMultiBookConfig.initTree();
		}
		window.opener.sbMultiBookConfig.changed = true;
	},

	browse : function()
	{
		var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		FP.init(window, "Select destination to store data.", FP.modeGetFolder);
		var answer = FP.show();
		if ( answer == FP.returnOK )
		{
			var theFile = FP.file;
			this.PATH.value = theFile.path;
		}
	},

};


