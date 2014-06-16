
var sbFolderPicker = {

	init : function()
	{
<<<<<<< HEAD
		sbDataSource.init();
		sbTreeHandler.init(true);
		document.documentElement.buttons = "accept,cancel,extra2";
		document.documentElement.getButton("extra2").className += " sb-create";
		document.getElementById("sbFolderPickerRoot").label = sbMainService.STRING.getString("ROOT_FOLDER");
		if ( window.arguments.length == 2 )
		{
			if ( window.arguments[1] )
			{
				if ( typeof(window.arguments[1]) == "string" ) window.arguments[1] = sbCommonUtils.RDF.GetResource(window.arguments[1]);
				if ( window.arguments[1].Value != "urn:scrapbook:root" )
				{
					sbTreeHandler.locateInternal(window.arguments[1]);
				}
=======
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
>>>>>>> release-1.6.0.a1
			}
		}
	},

	update : function()
	{
<<<<<<< HEAD
		document.getElementById("sbFolderPickerRoot").checked = sbTreeHandler.TREE.view.selection.count == 0;
=======
		document.getElementById("sbFolderPickerRoot").checked = sbTreeUI.TREE.view.selection.count == 0;
>>>>>>> release-1.6.0.a1
	},

	accept : function()
	{
		if ( document.getElementById("sbFolderPickerRoot").checked ) {
<<<<<<< HEAD
			window.arguments[0].resource = sbCommonUtils.RDF.GetResource(sbTreeHandler.TREE.ref);
			window.arguments[0].title    = sbMainService.STRING.getString("ROOT_FOLDER");
		} else {
			window.arguments[0].resource = sbTreeHandler.getSelection(true, 1)[0];
			window.arguments[0].title    = sbDataSource.getProperty(window.arguments[0].resource, "title");
		}
		sbTreeHandler.collapseFoldersBut(sbTreeHandler.TREE.currentIndex);
=======
			window.arguments[0].resource = ScrapBookUtils.RDF.GetResource(sbTreeUI.TREE.ref);
			window.arguments[0].title    = ScrapBookUtils.getLocaleString("ROOT_FOLDER");
		} else {
			window.arguments[0].resource = sbTreeUI.getSelection(true, 1)[0];
			window.arguments[0].title    = ScrapBookData.getProperty(window.arguments[0].resource, "title");
		}
		sbTreeUI.collapseFoldersBut(sbTreeUI.TREE.currentIndex);
>>>>>>> release-1.6.0.a1
	},

};




var sbFolderSelector2 = {

<<<<<<< HEAD
	get STRING() { return document.getElementById("sbMainString"); },
=======
>>>>>>> release-1.6.0.a1
	get TEXTBOX(){ return document.getElementById("sbFolderTextbox"); },
	get resURI() { return this.TEXTBOX.getAttribute("resuri"); },

	init : function()
	{
<<<<<<< HEAD
		this.TEXTBOX.value = this.STRING.getString("ROOT_FOLDER");
=======
		this.TEXTBOX.value = ScrapBookUtils.getLocaleString("ROOT_FOLDER");
>>>>>>> release-1.6.0.a1
		this.TEXTBOX.setAttribute("resuri", "urn:scrapbook:root");
	},

	pick : function()
	{
		var ret = {};
<<<<<<< HEAD
		//this.RES_URI durch this.resURI ersetzt
		window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes', ret, this.resURI);
=======
		window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes', ret, this.RES_URI);
>>>>>>> release-1.6.0.a1
		if ( ret.resource )
		{
			this.TEXTBOX.value = ret.title;
			this.TEXTBOX.setAttribute("resuri", ret.resource.Value);
<<<<<<< HEAD
			if ( document.getElementById("sbpCounter") )
			{
				sbMultipleService.currentID = this.resURI;
				if ( sbMultipleService.currentID != sbMultipleService.lastID ) sbMultipleService.detectExistingLinks();
				sbMultipleService.updateSelection();
			}
=======
>>>>>>> release-1.6.0.a1
		}
	},

};



