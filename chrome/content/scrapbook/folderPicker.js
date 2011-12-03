
var sbFolderPicker = {

	init : function()
	{
		sbTreeUI.init(true);
		document.documentElement.buttons = "accept,cancel,extra2";
		document.documentElement.getButton("extra2").className += " sb-create";
		document.getElementById("sbFolderPickerRoot").label = ScrapBookUtils.getLocaleString("ROOT_FOLDER");
		if ( window.arguments.length == 2 )
		{
			if ( typeof(window.arguments[1]) == "string" ) window.arguments[1] = ScrapBookUtils.RDF.GetResource(window.arguments[1]);
			if ( window.arguments[1].Value != "urn:scrapbook:root" )
			{
				sbTreeUI.locateInternal(window.arguments[1]);
			}
		}
	},

	update : function()
	{
		document.getElementById("sbFolderPickerRoot").checked = sbTreeUI.TREE.view.selection.count == 0;
	},

	accept : function()
	{
		if ( document.getElementById("sbFolderPickerRoot").checked ) {
			window.arguments[0].resource = ScrapBookUtils.RDF.GetResource(sbTreeUI.TREE.ref);
			window.arguments[0].title    = ScrapBookUtils.getLocaleString("ROOT_FOLDER");
		} else {
			window.arguments[0].resource = sbTreeUI.getSelection(true, 1)[0];
			window.arguments[0].title    = ScrapBookData.getProperty(window.arguments[0].resource, "title");
		}
		sbTreeUI.collapseFoldersBut(sbTreeUI.TREE.currentIndex);
	},

};




var sbFolderSelector2 = {

	get TEXTBOX(){ return document.getElementById("sbFolderTextbox"); },
	get resURI() { return this.TEXTBOX.getAttribute("resuri"); },

	init : function()
	{
		this.TEXTBOX.value = ScrapBookUtils.getLocaleString("ROOT_FOLDER");
		this.TEXTBOX.setAttribute("resuri", "urn:scrapbook:root");
	},

	pick : function()
	{
		var ret = {};
		window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes', ret, this.RES_URI);
		if ( ret.resource )
		{
			this.TEXTBOX.value = ret.title;
			this.TEXTBOX.setAttribute("resuri", ret.resource.Value);
		}
	},

};



