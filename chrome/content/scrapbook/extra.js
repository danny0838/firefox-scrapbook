var sbContext = {
    openDirect2:function(event)
    {
        let ct = document.getElementById("placesContext");
        let aNodes = ct._view.selectedNodes;
        if(aNodes.length==1)
        {
            let window = PlacesUIUtils._getWindow(ct._view);
            let aWhere = window.whereToOpenLink(event);
            window.openUILinkIn(aNodes[0].uri, aWhere, {
                inBackground: Services.prefs.getBoolPref("browser.tabs.loadBookmarksInBackground")
            });

        }else
        {
        let window = PlacesUIUtils._getWindow(ct._view);
        let urlsToOpen = [];
        for (var i = 0; i < aNodes.length; i++) {
            if (PlacesUtils.nodeIsURI(aNodes[i]))
                urlsToOpen.push({uri: aNodes[i].uri, isBookmark: PlacesUtils.nodeIsBookmark(aNodes[i])});
        }
        PlacesUIUtils._openTabset(urlsToOpen, event, window);
        }
    },
    openDirect3:function(event)
    {
        let uri = ScrapBookUtils.bmsvc.getBookmarkURI(ScrapBookUtils.getBookmarkId(content.document.location.href));
        let aWhere = window.whereToOpenLink(event);
        window.openUILinkIn(uri.spec, aWhere, {
            inBackground: Services.prefs.getBoolPref("browser.tabs.loadBookmarksInBackground")
        });


    },
    reSave:function()
    {

        let ct = document.getElementById("placesContext");
        let aNodes = ct._view.selectedNodes;
        let node = aNodes[0];
        if (PlacesUtils.nodeIsURI(node))
        {

            linkURL = node.uri;
            let des = PlacesUtils.annotations.getItemAnnotation(node.itemId, "bookmarkProperties/description");
            //todo 来源页面不太对
            this.cleanItem(node.itemId);
            window.openDialog(
                    "chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
                    [linkURL], null, false, 'urn:scrapbook:root', 0, null, null, null, null,
                    {itemId:ScrapBookUtils.getItemId(des)}
            );
            //sbBrowserOverlay.execCaptureTarget(false,'urn:scrapbook:root',node);
        }

    },
    reSave2:function()
    {
        let bookmarkId = ScrapBookUtils.getBookmarkId(content.document.location.href);
        let uri = ScrapBookUtils.bmsvc.getBookmarkURI(bookmarkId);
        this.cleanItem(bookmarkId);
        window.openDialog(
                "chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
                [uri.spec], content.document.location.href, false, 'urn:scrapbook:root', 0, null, null, null, null,
                {itemId:ScrapBookUtils.getItemId(content.document.location.href)}
        );

    },
    openFile:function()
    {
        let ct = document.getElementById("placesContext");
        let aNodes = ct._view.selectedNodes;
        for (var i = 0; i < aNodes.length; i++) {
            if (PlacesUtils.nodeIsURI(aNodes[i]))
            {
                let des = PlacesUtils.annotations.getItemAnnotation(aNodes[i].itemId, "bookmarkProperties/description");
                let f = ScrapBookUtils.getLocalFileFromNativePathOrUrl(des);
                ScrapBookUtils.openParent(f);
            }
        }
    },
    openFile2:function()
    {
        let f = ScrapBookUtils.getLocalFileFromNativePathOrUrl(content.document.location.href);
        ScrapBookUtils.openParent(f);
    },
    //one file
    exportMaf:function()
    {
        let path = sbMafService.getOutputBrowse();
        if (path) {
            let ct = document.getElementById("placesContext");
            let aNodes = ct._view.selectedNodes;
            for (var i = 0; i < aNodes.length; i++) {
                if (PlacesUtils.nodeIsURI(aNodes[i])) {
                    sbMafService.exec(path,aNodes[i]);
                }
            }
        }
    },
    exportMaf2:function()
    {
        let path = sbMafService.getOutputBrowse();
        if(path)
        {
            let bookmarkId = ScrapBookUtils.getBookmarkId(content.document.location.href);
            let uri = ScrapBookUtils.bmsvc.getBookmarkURI(bookmarkId);
            sbMafService.exec(path,{title:content.document.title,itemId:bookmarkId,uri:uri.spec});

        }

    },
    exportMht:function () {

        let path = sbMafService.getOutputBrowse();
        if (path) {
            let ct = document.getElementById("placesContext");
            let aNodes = ct._view.selectedNodes;

            for (var i = 0; i < aNodes.length; i++) {
                if (PlacesUtils.nodeIsURI(aNodes[i])) {
                    //
                    sbMhtService.convertTimer(path,aNodes[i]);

                }
            }

        }
    },
    exportMht2:function()
    {
        let path = sbMafService.getOutputBrowse();
        if (path) {
            let bookmarkId = ScrapBookUtils.getBookmarkId(content.document.location.href);
            sbMhtService.convertTimer(path,{title:content.document.title,itemId:bookmarkId});
        }

    },
    saveAsMht:function()
    {
        //file dialog
        let path = this.getOutputBrowse("mht");
        if(!path) return;
        if(path.leafName.search(/\.mht$/)>-1)
            sbBrowserOverlay.execCapture(2, false, false,'urn:scrapbook:root',{saveAsMht:path});
        else
            sbBrowserOverlay.execCapture(2, false, false,'urn:scrapbook:root',{saveAsMaf:path});

    },


    getOutputBrowse:function (fileExtension) {
        // Init a file picker and display it.
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, sbMafService.strings.GetStringFromName("browseFolder"), nsIFilePicker.modeSave);
        fp.appendFilter("MHT","*.mht;*.mhtml");
        fp.appendFilter("MAFF","*.maff");
        fp.appendFilters(nsIFilePicker.filterAll);
        fp.defaultExtension = fileExtension;
        try{
            fp.defaultString = ScrapBookUtils.validateFileName(content.document.title);
        }catch(e){
            //todo
        }

        var res = fp.show();
        if (res == nsIFilePicker.returnOK || res==nsIFilePicker.returnReplace) {
            return fp.file;
        }
    },

    //slimx todo
    editBookmark:function()
    {

    },
    //更新地址栏状态
    updateStatus:function()
    {
        try{
        let url = ScrapBookUtils.getMainWin().content.document.location.href;
        let bookmarkId = ScrapBookUtils.getBookmarkId(url);
        this._updateStatus(bookmarkId>0);
        }catch(e)
        {
            ScrapBookUtils.log(e);
            this._updateStatus(false);
        }
    },
    _updateStatus:function(status) {
        ScrapBookUtils.getMainWin().document.getElementById("scrapbook-lite-image").hidden = !status;
    },
    //edit and save
    reSave3:function()
    {
        let id = ScrapBookUtils.getItemId(content.document.location.href);
        this.cleanItem();
        sbBrowserOverlay.execCapture(2, false, false,'urn:scrapbook:root',{itemId:id});

    },
    remove:function(event)
    {
        let bookmarkId = ScrapBookUtils.getBookmarkId(content.document.location.href);
        ScrapBookUtils.bmsvc.removeItem(bookmarkId);
        //这个删除多好啊,干嘛要用系统那个恶心的
        let url = content.document.location.href;
        let file = ScrapBookUtils.convertURLToFile(url);
        ScrapBookUtils.saveBookmarkInfo(url,0);
        sbContext._updateStatus(false);
        if (file.exists()) {
            if (file.leafName.search(/\.html$/) > -1)
                file.parent.remove(true);
            else if (file.leafName.search(/\.maff$/) > -1)
                file.remove(true);
        }
    },
    cleanItem:function(itemId)
    {
        let file;
        if(itemId)
        {
            let _localUri = PlacesUtils.annotations.getItemAnnotation(itemId, "bookmarkProperties/description");
            file = ScrapBookUtils.convertURLToFile(_localUri);
        }else
        {
            file = ScrapBookUtils.convertURLToFile(ScrapBookUtils.getMainWin().content.document.location.href);
        }



        if (file.exists()) {
            if (file.leafName.search(/\.html$/) > -1)
                file.parent.remove(true);
            else if (file.leafName.search(/\.maff$/) > -1)
                file.remove(true);
        }
    }
}

//todo move to modules
//var EXPORTED_SYMBOLS = ["sbContext"];