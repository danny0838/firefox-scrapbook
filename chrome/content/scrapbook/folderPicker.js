
var sbFolderPicker = {

    init : function() {
        sbTreeHandler.init(true);
        document.documentElement.buttons = "accept,cancel,extra2";
        document.documentElement.getButton("extra2").className += " sb-create";
        document.getElementById("sbFolderPickerRoot").label = sbCommonUtils.lang("scrapbook", "ROOT_FOLDER");
        if ( window.arguments.length == 2 ) {
            if ( window.arguments[1] ) {
                if ( typeof(window.arguments[1]) == "string" ) window.arguments[1] = sbCommonUtils.RDF.GetResource(window.arguments[1]);
                if ( window.arguments[1].Value != "urn:scrapbook:root" ) {
                    sbTreeHandler.locateInternal(window.arguments[1]);
                }
            }
        }
    },

    update : function() {
        document.getElementById("sbFolderPickerRoot").checked = sbTreeHandler.TREE.view.selection.count == 0;
    },

    accept : function() {
        if ( document.getElementById("sbFolderPickerRoot").checked ) {
            window.arguments[0].resource = sbCommonUtils.RDF.GetResource(sbTreeHandler.TREE.ref);
            window.arguments[0].title    = sbCommonUtils.lang("scrapbook", "ROOT_FOLDER");
        } else {
            window.arguments[0].resource = sbTreeHandler.getSelection(true, 1)[0];
            window.arguments[0].title    = sbDataSource.getProperty(window.arguments[0].resource, "title");
        }
        sbTreeHandler.collapseFoldersBut(sbTreeHandler.TREE.currentIndex);
    },

};




var sbFolderSelector2 = {

    get TEXTBOX(){ return document.getElementById("sbFolderTextbox"); },
    get resURI() { return this.TEXTBOX.getAttribute("resuri"); },

    init : function() {
        this.TEXTBOX.value = sbCommonUtils.lang("scrapbook", "ROOT_FOLDER");
        this.TEXTBOX.setAttribute("resuri", "urn:scrapbook:root");
    },

    pick : function() {
        var ret = {};
        //this.RES_URI durch this.resURI ersetzt
        window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes', ret, this.resURI);
        if ( ret.resource ) {
            this.TEXTBOX.value = ret.title;
            this.TEXTBOX.setAttribute("resuri", ret.resource.Value);
            if ( document.getElementById("sbpCounter") ) {
                sbMultipleService.currentID = this.resURI;
                if ( sbMultipleService.currentID != sbMultipleService.lastID ) sbMultipleService.detectExistingLinks();
                sbMultipleService.updateSelection();
            }
        }
    },

};



