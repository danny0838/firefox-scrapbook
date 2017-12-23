
let sbContentSaver = {
    captureWindow: function(aRootWindow, aIsPartial, aShowDetail, aResName, aResIndex, aPresetData, aContext, aTitle) {
        let saver = new sbContentSaverClass();
        return saver.captureWindow(aRootWindow, aIsPartial, aShowDetail, aResName, aResIndex, aPresetData, aContext, aTitle);
    },

    captureFile: function(aSourceURL, aReferURL, aType, aShowDetail, aResName, aResIndex, aPresetData, aContext) {
        let saver = new sbContentSaverClass();
        return saver.captureFile(aSourceURL, aReferURL, aType, aShowDetail, aResName, aResIndex, aPresetData, aContext);
    },

    notifyCaptureComplete: function(aItem) {
        // aItem is the last item that is captured
        // in a multiple capture it could be null 
        if (aItem) {
            let res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + aItem.id);
            if ( sbDataSource.getProperty(res, "type") == "marked" ) return;
            if ( sbCommonUtils.getPref("notifyOnComplete", true) ) {
                let icon = sbDataSource.getProperty(res, "icon") || sbCommonUtils.getDefaultIcon(aItem.type);
                let title = "ScrapBook: " + sbCommonUtils.lang("SAVE_COMPLETE");
                let text = sbCommonUtils.crop(aItem.title, null, 100);
                let listener = {
                    observe: function(subject, topic, data) {
                        if (topic == "alertclickcallback")
                            sbCommonUtils.loadURL("chrome://scrapbook/content/view.xul?id=" + data, true);
                    }
                };
                sbCommonUtils.ALERT.showAlertNotification(icon, title, text, true, aItem.id, listener);
            }
        } else {
            let title = "ScrapBook: " + sbCommonUtils.lang("SAVE_COMPLETE");
            sbCommonUtils.ALERT.showAlertNotification(null, title, null);
        }
    },
};


function sbContentSaverClass() {
    this.context = null;
    this.option = {
        "isPartial": false,
        "images": sbCommonUtils.getPref("save.default.images", true),
        "media": sbCommonUtils.getPref("save.default.media", true),
        "fonts": sbCommonUtils.getPref("save.default.fonts", true),
        "frames": sbCommonUtils.getPref("save.default.frames", true),
        "styles": sbCommonUtils.getPref("save.default.styles", true),
        "script": sbCommonUtils.getPref("save.default.script", false),
        "fileAsHtml": sbCommonUtils.getPref("save.default.fileAsHtml", false),
        "forceUtf8": sbCommonUtils.getPref("save.default.forceUtf8", true),
        "tidyCss": sbCommonUtils.getPref("save.default.tidyCss", 3), // 0: none, 1: +rewrite link, 2: +remove unknown; 3: +remove unused
        "removeIntegrity": sbCommonUtils.getPref("save.default.removeIntegrity", true),
        "saveDataUri": sbCommonUtils.getPref("save.default.saveDataUri", false),
        "serializeFilename": sbCommonUtils.getPref("save.default.serializeFilename", false),
        "linkUrlFilters": sbCommonUtils.getPref("save.default.linkUrlFilters", ""),
        "downLinkMethod": sbCommonUtils.getPref("save.default.downLinkMethod", 0),
        "downLinkFilter": sbCommonUtils.getPref("save.default.downLinkFilter", ""),
        "inDepth": 0, // active only if explicitly set in detail dialog
        "internalize": false,
        "recordSkippedUrl": sbCommonUtils.getPref("save.default.recordSkippedUrl", false),
        "recordRemovedAttr": sbCommonUtils.getPref("save.default.recordRemovedAttr", false),        
        "recordInDepthLink": sbCommonUtils.getPref("save.default.recordInDepthLink", false),
        // "batchTimeout": null, // passed from capture.js via presetData[2]
        // "batchCharset": null, // passed from capture.js via presetData[2]
    };
    this.documentName = "";
    this.item = null;
    this.contentDir = null;
    this.refURLObj = null;
    this.isMainFrame = true;
    this.selection = null;
    this.treeRes = null;
    this.depth = 0;
    this.httpTask = {};
    this.downloadRewriteFiles = {};
    this.downloadRewriteMap = {};
    this.file2URL = {};
    this.file2Doc = {};
    this.linkURLs = [];
    this.elemMapKey = "data-sb-id-" + Date.now();
    this.elemMapOrig = [];
    this.elemMapClone = [];
    this.frameCount = 0;
}

sbContentSaverClass.prototype = {

    init: function(aContext, aPresetData, aIsPartial) {
        this.context = aContext;
        this.item = sbCommonUtils.newItem(sbCommonUtils.getTimeStamp());
        this.item.id = sbDataSource.identify(this.item.id);
        this.documentName = "index";
        this.depth = 0;
        this.file2URL = {
            "index.dat": true,
            "index.png": true,
            "index.rdf": true,
            "sitemap.xml": true,
            "sitemap.xsl": true,
            "sb-file2url.txt": true,
            "sb-url2name.txt": true,
        };

        // these could be modified or overwritten by preset data
        if ( aPresetData ) {
            if ( aPresetData[0] ) this.item.id = aPresetData[0];
            if ( aPresetData[1] ) this.documentName = aPresetData[1];
            if ( aPresetData[2] ) this.option = sbCommonUtils.extendObject(this.option, aPresetData[2]);
            if ( aPresetData[3] ) this.file2URL = aPresetData[3];
            if ( aPresetData[4] ) this.depth = aPresetData[4];
        }
        this.httpTask[this.item.id] = 0;
        this.downloadRewriteFiles[this.item.id] = [];
        this.downloadRewriteMap[this.item.id] = {};
        this.option["isPartial"] = !!aIsPartial;

        // special handling of certain contexts
        switch (this.context) {
            case "capture-again-deep":
                this.option["inDepth"] = 0;
                break;
            case "combine":
                this.option["images"] = true;
                this.option["media"] = true;
                this.option["fonts"] = true;
                this.option["frames"] = true;
                this.option["styles"] = true;
                this.option["script"] = true;
                this.option["removeIntegrity"] = false;
                this.option["downLinkMethod"] = 0;
                this.option["inDepth"] = 0;
                break;
            case "internalize":
                this.option["isPartial"] = false;
                this.option["images"] = true;
                this.option["fonts"] = true;
                this.option["media"] = true;
                this.option["styles"] = true;
                this.option["script"] = true;
                this.option["fileAsHtml"] = false;
                this.option["forceUtf8"] = false;
                this.option["tidyCss"] = 0;
                this.option["removeIntegrity"] = false;
                this.option["downLinkMethod"] = 0;
                this.option["inDepth"] = 0;
                break;
        }

        // other resets
        this.isMainFrame = true;
        this.selection = null;
        this.treeRes = null;
        this.file2Doc = {};
        this.linkURLs = [];
        this.elemMapOrig = [];
        this.elemMapClone = [];
        this.frameCount = 0;
    },

    // aRootWindow: window to be captured
    // aIsPartial: (bool) this is a partial capture (only capture selection area)
    // aShowDetail: 
    // aResName: the folder item which is the parent of this captured item
    // aResIndex: the position index where this captured item will be in the parent folder
    //            (1 is the first; 0 is last or first depending on pref "tree.unshift")
    //            (currently it is always 0)
    // aPresetData: data comes from a capture.js, cold be: 
    //              link, indepth, capture-again, capture-again-deep
    captureWindow: function(aRootWindow, aIsPartial, aShowDetail, aResName, aResIndex, aPresetData, aContext, aTitle) {
        this.init(aContext, aPresetData, aIsPartial);
        this.item.chars = this.option["forceUtf8"] ? "UTF-8" : aRootWindow.document.characterSet;
        this.item.source = aRootWindow.location.href;

        // if there is no selection, process as non-partial
        if ( aIsPartial ) {
            let sel = aRootWindow.getSelection();
            if (!sel.isCollapsed) this.selection = sel;
        }

        // Build the title list.
        // First is default title (document title or URL), others are candidate.
        let titles = [aRootWindow.document.title || decodeURI(this.item.source)];
        if (aTitle) titles.push(aTitle);
        if ( this.selection ) {
            let lines = this.selection.toString().split("\n");
            for ( let i = 0, I = lines.length; i < I; i++ ) {
                let line = lines[i].replace(/[\r\n\t]+/g, "");
                if ( line.length > 0 ) {
                    titles.push(sbCommonUtils.crop(line, 150, 180));
                    if ( titles.length > 4 ) break;
                }
            }
        }
        this.item.title = titles[1] || titles[0];
        // If the edit toolbar is showing, also modify its title
        if ( document.getElementById("ScrapBookToolbox") && !document.getElementById("ScrapBookToolbox").hidden && document.getElementById("ScrapBookEditor") && !document.getElementById("ScrapBookEditor").hidden ) {
            let modTitle = document.getElementById("ScrapBookEditTitle").value;
            if ( titles.indexOf(modTitle) < 0 ) {
                titles.splice(1, 0, modTitle);
                this.item.title = modTitle;
            }
            this.item.comment = sbCommonUtils.escapeComment(sbPageEditor.COMMENT.value);
        }

        // Show detail dialog
        // if the user closes it, skip the capture process
        if ( aShowDetail ) {
            let ret = this.showDetailDialog(titles, aResName, aContext);
            if ( ret.result == 0 ) { return null; }
            if ( ret.result == 2 ) { aResName = ret.resURI; aResIndex = 0; }
        }

        // save the document content to ScrapBook
        this.contentDir = sbCommonUtils.getContentDir(this.item.id);
        let newName = this.saveDocumentInternal(aRootWindow.document, this.documentName);

        // Use the tab icon as the item icon if it's available
        // For a file or image, use default (file extension related icon)
        if ( ["file", "image"].indexOf(this.item.type) == -1 ) {
            if ( "gBrowser" in window && aRootWindow == gBrowser.contentWindow ) {
                let iconURL = gBrowser.mCurrentBrowser.mIconURL;
                let iconFileName = this.download(iconURL);
                if (iconFileName) this.item.icon = iconFileName;
            }
        }

        // register resource to the rdf
        this.addResource(aResName, aResIndex);

        // if there is no further download task, complete the download
        if ( this.httpTask[this.item.id] == 0 ) {
            let that = this;
            setTimeout(function(){ that.onAllDownloadsComplete(that.item); }, 100);
        }

        // finalize
        return [sbCommonUtils.splitFileName(newName)[0], this.file2URL, this.item.title];
    },

    captureFile: function(aSourceURL, aReferURL, aType, aShowDetail, aResName, aResIndex, aPresetData, aContext) {
        this.init(aContext, aPresetData);
        this.item.title = sbCommonUtils.getFileName(aSourceURL);
        this.item.icon = "moz-icon://" + this.escapeURL(this.item.title, null, true) + "?size=16";
        this.item.source = aSourceURL;
        this.item.type = aType;
        if ( aShowDetail ) {
            let ret = this.showDetailDialog(null, aResName, aContext);
            if ( ret.result == 0 ) { return null; }
            if ( ret.result == 2 ) { aResName = ret.resURI; aResIndex = 0; }
        }
        this.contentDir = sbCommonUtils.getContentDir(this.item.id);
        this.refURLObj = sbCommonUtils.convertURLToObject(aReferURL);
        let newName = this.saveFileInternal(aSourceURL, this.documentName, aType);
        this.addResource(aResName, aResIndex);
        return [sbCommonUtils.splitFileName(newName)[0], this.file2URL, this.item.title];
    },

    showDetailDialog: function(aTitles, aResURI, aContext) {
        let ret = {
            item: this.item,
            option: this.option,
            titles: aTitles || [this.item.title],
            resURI: aResURI,
            result: 1,
            context: aContext
        };
        window.openDialog("chrome://scrapbook/content/detail.xul", "", "chrome,modal,centerscreen,resizable", ret);
        return ret;
    },

    saveDocumentInternal: function(aDocument, aFileKey) {
        let captureType = "";
        let charset = this.option["forceUtf8"] ? "UTF-8" : aDocument.characterSet;
        let contentType = aDocument.contentType;
        if ( ["text/html", "application/xhtml+xml"].indexOf(contentType) < 0 ) {
            if ( !(aDocument.documentElement.nodeName.toUpperCase() == "HTML" && this.option["fileAsHtml"]) ) {
                captureType = "file";
            }
        }
        if ( captureType ) {
            let newLeafName = this.saveFileInternal(aDocument.location.href, aFileKey, captureType, charset);
            return newLeafName;
        }

        // HTML document: save the current DOM

        // A frame could have a ridiculous location.href, such as "javascript:foo.bar",
        // catch the error and this.refURLObj should remain original (the parent frame).
        // The document might have a ridiculous location.href, such as "about:blank",
        // if there is no refURLObj yet, use the "index.html" in the target item dir as ref.
        try {
            let elem = aDocument.createElement("a");
            elem.href = "";
            this.refURLObj = sbCommonUtils.convertURLToObject(elem.href);
        } catch(ex) {
            if (!this.refURLObj) {
                let refFile = this.contentDir.clone(); refFile.append("index.html");
                this.refURLObj = sbCommonUtils.convertURLToObject(sbCommonUtils.convertFileToURL(refFile));
            }
        }

        if ( !this.option["internalize"] ) {
            let useXHTML = (contentType == "application/xhtml+xml") && (!this.option["fileAsHtml"]);
            let [myHTMLFileName, myHTMLFileDone] = this.getUniqueFileName(aFileKey + (useXHTML?".xhtml":".html"), this.refURLObj.spec, aDocument);
            if (myHTMLFileDone) return myHTMLFileName;
            // create a meta refresh for each *.xhtml
            if (useXHTML) {
                let myHTML = '<html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;URL=./' + myHTMLFileName + '"></head><body></body></html>';
                let myHTMLFile = this.contentDir.clone();
                myHTMLFile.append(aFileKey + ".html");
                sbCommonUtils.writeFile(myHTMLFile, myHTML, "UTF-8");
            }
        }

        let htmlNode = aDocument.documentElement;
        // cloned frames has contentDocument = null
        // cloned canvas has no image data
        // give them an unique id for later retrieving
        Array.prototype.forEach.call(htmlNode.querySelectorAll("frame, iframe, canvas, link, style"), function (elem) {
            let idx = this.elemMapOrig.length;
            this.elemMapOrig[idx] = elem;
            elem.setAttribute(this.elemMapKey, idx);
        }, this);
        // construct the node list
        let rootNode;
        let headNode;
        if ( this.selection ) {
            let selNodeTree = []; // Is not enough to preserve order of sparsely selected table cells
            for ( let iRange = 0; iRange < this.selection.rangeCount; ++iRange ) {
                let myRange = this.selection.getRangeAt(iRange);
                let curNode = myRange.commonAncestorContainer;
                if ( curNode.nodeName.toUpperCase() == "HTML" ) {
                    // in some case (e.g. view image) the selection is the html node
                    // and will cause subsequent errors.
                    // in this case we just process as if there's no selection
                    this.selection = null;
                    break;
                }

                if ( iRange === 0 ) {
                    rootNode = htmlNode.cloneNode(false);
                    headNode = this.getHeadNode(htmlNode);
                    headNode = headNode ? headNode.cloneNode(true) : aDocument.createElement("head");
                    rootNode.appendChild(headNode);
                    rootNode.appendChild(aDocument.createTextNode("\n"));
                }

                if ( curNode.nodeName == "#text" ) curNode = curNode.parentNode;

                let tmpNodeList = [];
                do {
                    tmpNodeList.unshift(curNode);
                    curNode = curNode.parentNode;
                } while ( curNode.nodeName.toUpperCase() != "HTML" );

                let parentNode = rootNode;
                let branchList = selNodeTree;
                let matchedDepth = -2;
                for( let iDepth = 0; iDepth < tmpNodeList.length; ++iDepth ) {
                    for ( let iBranch = 0; iBranch < branchList.length; ++iBranch ) {
                        if (tmpNodeList[iDepth] === branchList[iBranch].origNode ) {
                            matchedDepth = iDepth;
                            break;
                        }
                    }

                    if (iBranch === branchList.length) {
                        let clonedNode = tmpNodeList[iDepth].cloneNode(false);
                        parentNode.appendChild(clonedNode);
                        branchList.push({
                            origNode: tmpNodeList[iDepth],
                            clonedNode: clonedNode,
                            children: []
                        });
                    }
                    parentNode = branchList[iBranch].clonedNode;
                    branchList = branchList[iBranch].children;
                }
                if ( matchedDepth === tmpNodeList.length - 1 ) {
                    // Perhaps a similar splitter should be added for any node type
                    // but some tags e.g. <td> require special care
                    if (myRange.commonAncestorContainer.nodeName === "#text") {
                        parentNode.appendChild(aDocument.createComment("DOCUMENT_FRAGMENT_SPLITTER"));
                        parentNode.appendChild(aDocument.createTextNode(" … "));
                        parentNode.appendChild(aDocument.createComment("/DOCUMENT_FRAGMENT_SPLITTER"));
                    }
                }
                parentNode.appendChild(aDocument.createComment("DOCUMENT_FRAGMENT"));
                parentNode.appendChild(myRange.cloneContents());
                parentNode.appendChild(aDocument.createComment("/DOCUMENT_FRAGMENT"));
            }
        }
        if ( !this.selection ) {
            rootNode = htmlNode.cloneNode(true);
            headNode = this.getHeadNode(rootNode);
            if (!headNode) {
                headNode = aDocument.createElement("head");
                rootNode.insertBefore(headNode, rootNode.firstChild);
                rootNode.insertBefore(aDocument.createTextNode("\n"), headNode.nextSibling);
            }
        }

        // build the map of cloned style elements
        Array.prototype.forEach.call(rootNode.querySelectorAll("link, style"), function (elem) {
            let idx = elem.getAttribute(this.elemMapKey);
            this.elemMapClone[idx] = elem;
            elem.removeAttribute(this.elemMapKey);
        }, this);

        // process internal (style) and external (link) CSS
        Array.prototype.forEach.call(aDocument.styleSheets, function(css){
            try {
                // Firefox Bug 1385552: document.styleSheets may contain a bad object
                let nodeOrig = css.ownerNode;
                let node = this.elemMapClone[nodeOrig.getAttribute(this.elemMapKey)];
                if (!node) throw "not in capture range";
            } catch (ex) {
                // this css node does not exist or is out of the capture range
                return;
            }

            // do not rewrite CSS during an internalize
            if (this.option["internalize"]) return;

            switch (node.nodeName.toLowerCase()) {
                case "style":
                    if ( sbCommonUtils.getSbObjectType(node) == "stylesheet" ) {
                        // a special stylesheet used by scrapbook, keep it intact
                        return;
                    } else if ( this.option["styles"] ) {
                        if ( this.option["tidyCss"] >= 2 ) {
                            let cssText = this.processCSSRules(css, this.refURLObj.spec, aDocument, "");
                            cssText = "\n/* Code tidied up by ScrapBook */\n" + cssText;
                            node.textContent = cssText;
                        } else if ( this.option["tidyCss"] == 1 ) {
                            let cssText = this.inspectCSSFileText(node.textContent, this.refURLObj.spec);
                            node.textContent = cssText;
                        } else {
                            // keep the styles as-is
                        }
                    } else {
                        // not capturing styles, remove it
                        if (node.textContent) node.textContent = "/* Code removed by ScrapBook */";
                        return;
                    }
                    break;
                case "link":
                    let url = css.href;
                    if ( sbCommonUtils.getSbObjectType(node) == "stylesheet" ) {
                        // a special stylesheet used by scrapbook, keep it intact
                        // (it should use an absolute link or a chrome link, which don't break after capture)
                        return;
                    } else if ( url.startsWith("chrome:") ) {
                        // a special stylesheet used by scrapbook or other addons/programs, keep it intact
                        return;
                    } else if ( this.option["styles"] ) {
                        if ( this.option["tidyCss"] >= 2 ) {
                            let cssText = this.processCSSRules(css, url, aDocument, "");
                            cssText = "/* Code tidied up by ScrapBook */\n" + cssText;
                            let fileName = this.download(url, "quote", "cssText", { cssText: cssText });
                            if (fileName) node.setAttribute("href", fileName);
                        } else if ( this.option["tidyCss"] == 1 ) {
                            let url = css.href;
                            let fileName = this.download(url, "quote", "cssFile");
                            if (fileName) node.setAttribute("href", fileName);
                        } else {
                            let fileName = this.download(url, null);
                            if (fileName) node.setAttribute("href", fileName);
                        }
                    } else {
                        // not capturing styles, set it blank
                        node.setAttribute("href", this.getSkippedURL(url));
                    }
                    break;
            }
        }, this);

        // remove the temporary mapping key
        this.elemMapOrig.forEach(function (elem) {
            if (!sbCommonUtils.isDeadObject(elem)) {
                elem.removeAttribute(this.elemMapKey);
            }
        }, this);

        // process HTML DOM
        Array.prototype.forEach.call(rootNode.querySelectorAll("*"), function(curNode){
            this.inspectNode(curNode, rootNode);
        }, this);

        // change the charset to UTF-8
        // also change the meta tag; generate one if none found
        if ( this.option["forceUtf8"] ) {
            let metas = rootNode.getElementsByTagName("meta"), meta, hasmeta = false;
            for (var i=0, len=metas.length; i<len; ++i) {
                meta = metas[i];
                if (meta.hasAttribute("http-equiv") && meta.hasAttribute("content") &&
                    meta.getAttribute("http-equiv").toLowerCase() == "content-type" && 
                    meta.getAttribute("content").match(/^[^;]*;\s*charset=(.*)$/i) ) {
                    hasmeta = true;
                    meta.setAttribute("content", "text/html; charset=UTF-8");
                } else if ( meta.hasAttribute("charset") ) {
                    hasmeta = true;
                    meta.setAttribute("charset", "UTF-8");
                }
            }
            if (!hasmeta) {
                let metaNode = aDocument.createElement("meta");
                metaNode.setAttribute("charset", "UTF-8");
                headNode.insertBefore(aDocument.createTextNode("\n"), headNode.firstChild);
                headNode.insertBefore(metaNode, headNode.firstChild);
                headNode.insertBefore(aDocument.createTextNode("\n"), headNode.firstChild);
            }
        }

        // generate the HTML and CSS file and save
        let myHTML = sbCommonUtils.doctypeToString(aDocument.doctype);
        if (contentType == "application/xhtml+xml" && this.option["fileAsHtml"]) {
            // convert xhtml into html
            let iframe = aDocument.createElement("iframe");
            iframe.style.display = "hidden";
            htmlNode.appendChild(iframe);
            let doc = iframe.contentDocument.documentElement;
            htmlNode.removeChild(iframe);
            while (doc.firstChild) doc.removeChild(doc.firstChild);
            this.cloneNodeData(rootNode, doc);
            myHTML += sbCommonUtils.surroundByTags(doc, doc.innerHTML + "\n");
        } else {
            myHTML += sbCommonUtils.surroundByTags(rootNode, rootNode.innerHTML + "\n");
        }

        if ( this.option["internalize"] ) {
            let myHTMLFile = this.option["internalize"];
        } else {
            let myHTMLFile = this.contentDir.clone();
            myHTMLFile.append(myHTMLFileName);
        }

        sbCommonUtils.writeFile(myHTMLFile, myHTML, charset);
        this.downloadRewriteFiles[this.item.id].push([myHTMLFile, charset]);
        return myHTMLFile.leafName;
    },

    saveFileInternal: function(aFileURL, aFileKey, aCaptureType, aCharset) {
        if ( !aFileKey ) aFileKey = "file" + Math.random().toString();
        let urlObj = sbCommonUtils.convertURLToObject(aFileURL);
        if ( !this.refURLObj ) {
            this.refURLObj = urlObj;
        }
        let newFileName = this.download(aFileURL, "HTML");
        if (newFileName) {
            if ( aCaptureType == "image" ) {
                let myHTML = '<html><head><meta charset="UTF-8"></head><body><img src="' + newFileName + '"></body></html>';
            } else {
                let myHTML = '<html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;URL=' + newFileName + '"></head><body></body></html>';
            }
            if ( this.isMainFrame ) {
                this.item.icon = "moz-icon://" + this.download(aFileURL) + "?size=16";
                this.item.type = aCaptureType;
                this.item.chars = aCharset || "";
            }
        } else {
            let myHTML = "";
        }
        let myHTMLFile = this.contentDir.clone();
        myHTMLFile.append(aFileKey + ".html");
        sbCommonUtils.writeFile(myHTMLFile, myHTML, "UTF-8");
        this.downloadRewriteFiles[this.item.id].push([myHTMLFile, "UTF-8"]);
        return myHTMLFile.leafName;
    },

    // aResName is null if it's not the main document of an indepth capture
    // set treeRes to the created resource or null if aResName is not defined
    addResource: function(aResName, aResIndex) {
        if ( !aResName ) return;
        // We are during a capture process, temporarily set marked and no icon
        let [_type, _icon] = [this.item.type, this.item.icon];
        [this.item.type, this.item.icon] = ["marked", ""];
        this.treeRes = sbDataSource.addItem(this.item, aResName, aResIndex);
        [this.item.type, this.item.icon] = [_type, _icon];
        sbCommonUtils.rebuildGlobal();
        if ( "sbBrowserOverlay" in window ) sbBrowserOverlay.updateFolderPref(aResName);
    },


    getHeadNode: function(aNode) {
        let headNode = aNode.getElementsByTagName("head")[0];
        if (!headNode) {
            let elems = aNode.childNodes;
            for (var i=0, I=elems.length; i<I; i++) {
                if (elems[i].nodeType == 1) {
                    if (elems[i].nodeName.toUpperCase() == "HEAD") {
                        headNode = elems[i];
                    } else {
                        break;
                    }
                }
            }
        }
        return headNode;
    },

    inspectNode: function(aNode, aRootNode) {
        switch ( aNode.nodeName.toLowerCase() ) {
            case "img": 
                if ( aNode.hasAttribute("src") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("src")) ) break;
                    let url = aNode.src;
                    if ( this.option["images"] ) {
                        let fileName = this.download(url);
                        if (fileName) aNode.setAttribute("src", fileName);
                    } else {
                        aNode.setAttribute("src", this.getSkippedURL(url));
                    }
                }
                if ( aNode.hasAttribute("srcset") ) {
                    let that = this;
                    let newSrcset = this.parseSrcset(aNode.getAttribute("srcset"), function(url){
                        if ( that.option["internalize"] && that.isInternalized(url) ) return url;
                        let url = sbCommonUtils.resolveURL(that.refURLObj.spec, url);
                        if ( that.option["images"] ) {
                            let fileName = that.download(url);
                            if (fileName) return fileName;
                        } else {
                            return that.getSkippedURL(url);
                        }
                    });
                    aNode.setAttribute("srcset", newSrcset);
                }
                break;
            case "embed": 
            case "audio":
            case "video":
                if ( aNode.hasAttribute("src") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("src")) ) break;
                    let url = aNode.src;
                    if ( this.option["media"] ) {
                        let fileName = this.download(url);
                        if (fileName) aNode.setAttribute("src", fileName);
                    } else {
                        aNode.setAttribute("src", this.getSkippedURL(url));
                    }
                }
                if ( aNode.hasAttribute("poster") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("poster")) ) break;
                    let url = aNode.poster;
                    if ( this.option["media"] ) {
                        let fileName = this.download(url);
                        if (fileName) aNode.setAttribute("poster", fileName);
                    } else {
                        aNode.setAttribute("poster", this.getSkippedURL(url));
                    }
                }
                break;
            case "source":  // in <picture>, <audio> and <video>
                if ( aNode.hasAttribute("src") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("src")) ) break;
                    let url = aNode.src;
                    let type = (this.getSourceParentType(aNode) === "picture") ? "images" : "media";
                    if ( this.option[type] ) {
                        let fileName = this.download(url);
                        if (fileName) aNode.setAttribute("src", fileName);
                    } else {
                        aNode.setAttribute("src", this.getSkippedURL(url));
                    }
                }
                if ( aNode.hasAttribute("srcset") ) {
                    let that = this;
                    let type = (this.getSourceParentType(aNode) === "picture") ? "images" : "media";
                    let newSrcset = this.parseSrcset(aNode.getAttribute("srcset"), function(url){
                        if ( that.option["internalize"] && that.isInternalized(url) ) return url;
                        url = sbCommonUtils.resolveURL(that.refURLObj.spec, url);
                        if ( that.option[type] ) {
                            let fileName = that.download(url);
                            if (fileName) return fileName;
                        } else {
                            return that.getSkippedURL(url);
                        }
                    });
                    aNode.setAttribute("srcset", newSrcset);
                }
                break;
            case "object": 
                if ( aNode.hasAttribute("data") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("data")) ) break;
                    let url = aNode.data;
                    if ( this.option["media"] ) {
                        let fileName = this.download(url);
                        if (fileName) aNode.setAttribute("data", fileName);
                    } else {
                        aNode.setAttribute("data", this.getSkippedURL(url));
                    }
                }
                break;
            case "applet": 
                if ( aNode.hasAttribute("archive") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("archive")) ) break;
                    let url = sbCommonUtils.resolveURL(this.refURLObj.spec, aNode.getAttribute("archive"));
                    if ( this.option["media"] ) {
                        let fileName = this.download(url);
                        if (fileName) aNode.setAttribute("archive", fileName);
                    } else {
                        aNode.setAttribute("archive", this.getSkippedURL(url));
                    }
                }
                break;
            case "canvas":
                if ( this.option["media"] && !this.option["script"] ) {
                    let canvasOrig = this.elemMapOrig[aNode.getAttribute(this.elemMapKey)];
                    let canvasScript = aNode.ownerDocument.createElement("script");
                    canvasScript.textContent = '(' + this.setCanvasData.toString().replace(/\s+/g, ' ') + ')("' + canvasOrig.toDataURL() + '")';
                    aNode.parentNode.insertBefore(canvasScript, aNode.nextSibling);
                }
                aNode.removeAttribute(this.elemMapKey);
                break;
            case "track":  // in <audio> and <video>
                if ( aNode.hasAttribute("src") ) {
                    if ( this.option["internalize"] ) break;
                    aNode.setAttribute("src", aNode.src);
                }
                break;
            case "body": 
            case "table": 
            case "tr": 
            case "th": 
            case "td": 
                // handle "background" attribute (HTML5 deprecated)
                if ( aNode.hasAttribute("background") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("background")) ) break;
                    let url = sbCommonUtils.resolveURL(this.refURLObj.spec, aNode.getAttribute("background"));
                    if ( this.option["images"] ) {
                        let fileName = this.download(url);
                        if (fileName) aNode.setAttribute("background", fileName);
                    } else {
                        aNode.setAttribute("background", this.getSkippedURL(url));
                    }
                }
                break;
            case "input": 
                switch (aNode.type.toLowerCase()) {
                    case "image": 
                        if ( aNode.hasAttribute("src") ) {
                            if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("src")) ) break;
                            let url = aNode.src;
                            if ( this.option["images"] ) {
                                let fileName = this.download(url);
                                if (fileName) aNode.setAttribute("src", fileName);
                            } else {
                                aNode.setAttribute("src", this.getSkippedURL(url));
                            }
                        }
                        break;
                }
                break;
            case "link": 
                // we are only interested in those with href
                if ( aNode.hasAttribute("href") ) {
                    if ( this.option["internalize"] ) break;
                    // gets "" if rel attribute not defined
                    let rels = aNode.rel.toLowerCase().split(/[ \t\r\n\v\f]+/);
                    if (rels.indexOf("stylesheet") >= 0) {
                        // stylesheets should already been processed now
                    } else if (rels.indexOf("icon") >= 0) {
                        let fileName = this.download(aNode.href);
                        if (fileName) {
                            aNode.setAttribute("href", fileName);
                            if ( this.isMainFrame ) this.item.icon = fileName;
                        }
                    } else {
                        aNode.setAttribute("href", aNode.href);
                    }
                }
                break;
            case "base": 
                if ( aNode.hasAttribute("href") ) {
                    if ( this.option["internalize"] ) break;
                    aNode.setAttribute("href", "");
                }
                break;
            case "script": 
                if ( this.option["script"] ) {
                    if ( aNode.hasAttribute("src") ) {
                        if ( this.option["internalize"] ) break;
                        let fileName = this.download(aNode.src);
                        if (fileName) aNode.setAttribute("src", fileName);
                    }
                } else {
                    if ( aNode.hasAttribute("src") ) {
                        let url = aNode.src;
                        aNode.setAttribute("src", this.getSkippedURL(url));
                    }
                    if (aNode.textContent) aNode.textContent = "/* Code removed by ScrapBook */";
                }
                break;
            case "a": 
            case "area": 
                if ( this.option["internalize"] ) break;
                let url = aNode.href;
                if ( !url ) {
                    break;
                } else if ( url.match(/^javascript:/i) && !this.option["script"] ) {
                    this.removeAttr(aNode, "href");
                    break;
                }
                // adjustment for hash links targeting the current page
                let [urlMain, urlHash] = sbCommonUtils.splitURLByAnchor(url);
                if ( urlMain === sbCommonUtils.splitURLByAnchor(aNode.ownerDocument.location.href)[0] ) {
                    // This link targets the current page.
                    if ( urlHash === '' || urlHash === '#' ) {
                        // link to the current page as a whole
                        aNode.setAttribute('href', '#');
                        break;
                    }
                    // For full capture (no selection), relink to the captured page.
                    // For partial capture, the captured page could be incomplete,
                    // relink to the captured page only when the target node is included in the selected fragment.
                    let hasLocalTarget = !this.selection;
                    if ( !hasLocalTarget ) {
                        let targetId = decodeURIComponent(urlHash.substr(1)).replace(/\W/g, '\\$&');
                        if ( aRootNode.querySelector('[id="' + targetId + '"], a[name="' + targetId + '"]') ) {
                            hasLocalTarget = true;
                        }
                    }
                    if ( hasLocalTarget ) {
                        // if the original link is already a pure hash, 
                        // skip the rewrite to prevent a potential encoding change
                        if (aNode.getAttribute('href').charAt(0) != "#") {
                            aNode.setAttribute('href', urlHash);
                        }
                        break;
                    }
                }
                // determine whether to download (copy) the link target file
                if ( url.indexOf("http:") === 0 || url.indexOf("https:") === 0 || url.indexOf("ftp:") === 0 ) {
                    // if the URL matches the linkUrlFilters (mostly meaning it's offending to visit)
                    // skip it for downLink or inDepth
                    if (!this.globalURLFilter(urlMain)) {
                        break;
                    }
                    if (this.option["downLinkMethod"] == 2) {
                        // check header and url extension
                        let fileName = this.download(url, null, "linkFilter");
                        if (fileName) {
                            aNode.setAttribute("href", fileName);
                            break;
                        }
                    } else if (this.option["downLinkMethod"] == 1) {
                        // check url extension
                        let [, ext] = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(url));
                        if (this.downLinkFilter(ext)) {
                            let fileName = this.download(url);
                            if (fileName) {
                                aNode.setAttribute("href", fileName);
                                break;
                            }
                        }
                    }
                } else if ( url.indexOf("file:") === 0 ) {
                    // Download all non-HTML local files.
                    // This is primarily for the combine wizard to capture all "file:" data.
                    let mime = sbCommonUtils.getFileMime(sbCommonUtils.convertURLToFile(url));
                    if ( ["text/html", "application/xhtml+xml"].indexOf(mime) < 0 ) {
                        let fileName = this.download(url);
                        if (fileName) {
                            aNode.setAttribute("href", fileName);
                            break;
                        }
                    }
                } else {
                    // We are not interested in URLs with other protocols
                    // Just keep them as-is
                    break;
                }
                // Add unfixed URLs to the link list if it's a work of deep capture
                if ( this.option["inDepth"] > this.depth ) {
                    this.linkURLs.push(url);
                }
                // rewrite the URL to make it absolute
                aNode.setAttribute("href", url);
                break;
            case "form": 
                if ( aNode.hasAttribute("action") ) {
                    if ( this.option["internalize"] ) break;
                    aNode.setAttribute("action", aNode.action);
                }
                break;
            case "meta": 
                if ( !aNode.hasAttribute("content") ) break;
                if ( aNode.hasAttribute("property") ) {
                    if ( this.option["internalize"] ) break;
                    switch ( aNode.getAttribute("property").toLowerCase() ) {
                        case "og:image":
                        case "og:image:url":
                        case "og:image:secure_url":
                        case "og:audio":
                        case "og:audio:url":
                        case "og:audio:secure_url":
                        case "og:video":
                        case "og:video:url":
                        case "og:video:secure_url":
                        case "og:url":
                            let url = sbCommonUtils.resolveURL(this.refURLObj.spec, aNode.getAttribute("content"));
                            aNode.setAttribute("content", url);
                            break;
                    }
                }
                if ( aNode.hasAttribute("http-equiv") ) {
                    switch ( aNode.getAttribute("http-equiv").toLowerCase() ) {
                        case "refresh":
                            if ( aNode.getAttribute("content").match(/^(\d+;\s*url=)(.*)$/i) ) {
                                let url = sbCommonUtils.resolveURL(this.refURLObj.spec, RegExp.$2);
                                aNode.setAttribute("content", RegExp.$1 + url);
                                // add to the link list if it's a work of deep capture
                                if ( this.option["inDepth"] > this.depth ) this.linkURLs.push(url);
                            }
                            break;
                    }
                }
                break;
            case "frame": 
            case "iframe": 
                if ( this.option["internalize"] ) break;
                if ( this.option["frames"] ) {
                    this.isMainFrame = false;
                    if ( this.selection ) this.selection = null;
                    let tmpRefURL = this.refURLObj;
                    // retrieve contentDocument from the corresponding real frame
                    let idx = aNode.getAttribute(this.elemMapKey);
                    let newFileName = this.saveDocumentInternal(this.elemMapOrig[idx].contentDocument, this.documentName + "_" + (++this.frameCount));
                    aNode.setAttribute("src", this.escapeURL(newFileName, null, true));
                    this.refURLObj = tmpRefURL;
                } else {
                    aNode.setAttribute("src", this.getSkippedURL(aNode.src));
                }
                aNode.removeAttribute(this.elemMapKey);
                break;
        }
        // handle style attr
        if ( aNode.style && aNode.style.cssText ) {
            let newCSStext = this.inspectCSSText(aNode.style.cssText, this.refURLObj.spec, "image");
            if ( newCSStext ) aNode.setAttribute("style", newCSStext);
        }
        // handle script related attrs
        if ( !this.option["script"] ) {
            // general: remove on* attributes
            let attrs = aNode.attributes;
            for (var i = 0; i < attrs.length; i++) {
                if (attrs[i].name.toLowerCase().startsWith("on")) {
                    this.removeAttr(aNode, attrs[i].name);
                    i--;  // removing an attribute shrinks the list
                }
            }
            // other specific
            this.removeAttr(aNode, "contextmenu");
        }
        // handle integrity and crossorigin
        // We have to remove integrity check because we could modify the content
        // and they might not work correctly in the offline environment.
        if ( this.option["removeIntegrity"] ) {
            this.removeAttr(aNode, "integrity");
            this.removeAttr(aNode, "crossorigin");
        }
    },

    // clone the attributes and childNodes (recursively) to the targetNode
    cloneNodeData: function (sourceNode, targetNode) {
        // copy attributes
        Array.prototype.forEach.call(sourceNode.attributes, function(attr){
            targetNode.setAttribute(attr.name, attr.value);
        }, this);
        if (!sourceNode.hasChildNodes()) return;
        Array.prototype.forEach.call(sourceNode.childNodes, function(elem){
            if (elem.nodeType === 1) {
                let newElem = targetNode.ownerDocument.createElement(elem.nodeName);
                targetNode.appendChild(newElem);
                this.cloneNodeData(elem, newElem);
            }
            else {
                let newElem = elem.cloneNode(true);
                targetNode.appendChild(newElem);
            }
        }, this);
    },

    // replaceFunc = function (url) { return ...; }
    parseSrcset: function (srcset, replaceFunc) {
        return srcset.replace(/(\s*)([^ ,][^ ]*[^ ,])(\s*(?: [^ ,]+)?\s*(?:,|$))/g, function (m, m1, m2, m3) {
            return m1 + replaceFunc(m2) + m3;
        });
    },

    getSourceParentType: function (aSourceNode) {
        let node = aSourceNode.parentNode;
        while (node) {
            let nn = node.nodeName.toLowerCase();
            if (nn == "picture" || nn == "audio" || nn == "video") {
                return nn;
            }
            node = node.parentNode;
        }
        return false;
    },

    setCanvasData: function (data) {
      let scripts = document.getElementsByTagName("script");
      let script = scripts[scripts.length-1], canvas = script.previousSibling;
      let img = new Image();
      img.onload = function(){ canvas.getContext("2d").drawImage(img, 0, 0); };
      img.src = data;
      script.parentNode.removeChild(script);
    },

    processCSSRules: function(aCSS, aRefURL, aDocument, aIndent) {
        let content = "";
        // if aCSS is a rule set of an external CSS file, use its URL as reference
        let refURL = aCSS.href || aRefURL;
        Array.forEach(aCSS.cssRules, function(cssRule) {
            switch (cssRule.type) {
                case Components.interfaces.nsIDOMCSSRule.IMPORT_RULE: 
                    let importedCSS = cssRule.styleSheet;
                    if (!importedCSS) break;
                    let importedCSSText = "/* Code tidied up by ScrapBook */\n"
                        + this.processCSSRules(importedCSS, importedCSS.href, aDocument, "");
                    let fileName = this.download(importedCSS.href, "quote", "cssText", { cssText: importedCSSText });
                    let cssText = aIndent + '@import url("' + fileName + '");';
                    if (cssText) content += cssText + "\n";
                    break;
                case Components.interfaces.nsIDOMCSSRule.FONT_FACE_RULE: 
                    let cssText = aIndent + this.inspectCSSText(cssRule.cssText, refURL, "font");
                    if (cssText) content += cssText + "\n";
                    break;
                case Components.interfaces.nsIDOMCSSRule.MEDIA_RULE: 
                    cssText = aIndent + "@media " + cssRule.conditionText + " {\n"
                        + this.processCSSRules(cssRule, refURL, aDocument, aIndent + "  ")
                        + aIndent + "}";
                    if (cssText) content += cssText + "\n";
                    break;
                case Components.interfaces.nsIDOMCSSRule.STYLE_RULE: 
                    // if script is used, preserve all css in case it's used by a dynamic generated DOM
                    if (this.option["script"] || (this.option["tidyCss"] < 3) || verifySelector(aDocument, cssRule.selectorText)) {
                        let cssText = aIndent + this.inspectCSSText(cssRule.cssText, refURL, "image");
                        if (cssText) content += cssText + "\n";
                    }
                    break;
                default: 
                    let cssText = aIndent + this.inspectCSSText(cssRule.cssText, refURL, "image");
                    if (cssText) content += cssText + "\n";
                    break;
            }
        }, this);
        return content;

        function verifySelector(doc, selectorText) {
            try {
                if (doc.querySelector(selectorText)) return true;
                // querySelector of selectors like a:hover or so always return null
                // preserve pseudo-class and pseudo-elements if their non-pseudo versions exist
                let hasPseudo = false;
                let startPseudo = false;
                let depseudoSelectors = [""];
                selectorText.replace(
                    /(,\s+)|(\s+)|((?:[\-0-9A-Za-z_\u00A0-\uFFFF]|\\[0-9A-Fa-f]{1,6} ?|\\.)+)|(\[(?:"(?:\\.|[^"])*"|\\.|[^\]])*\])|(.)/g,
                    function(){
                        if (arguments[1]) {
                            depseudoSelectors.push("");
                            startPseudo = false;
                        } else if (arguments[5] == ":") {
                            hasPseudo = true;
                            startPseudo = true;
                        } else if (startPseudo && (arguments[3] || arguments[5])) {
                        } else if (startPseudo) {
                            startPseudo = false;
                            depseudoSelectors[depseudoSelectors.length - 1] += arguments[0];
                        } else {
                            depseudoSelectors[depseudoSelectors.length - 1] += arguments[0];
                        }
                        return arguments[0];
                    }
                );
                if (hasPseudo) {
                    for (var i=0, I=depseudoSelectors.length; i<I; ++i) {
                        if (depseudoSelectors[i] === "" || doc.querySelector(depseudoSelectors[i])) return true;
                    };
                }
            } catch(ex) {
            }
            return false;
        }
    },

    // Process a downloaded css file and rewrite it
    // Browser normally determine the charset of a CSS file via:
    // 1. HTTP header content-type
    // 2. Unicode BOM in the CSS file
    // 3. @charset rule in the CSS file
    // 4. assume it's UTF-8
    // We follow 1-3 but not 4: if no supported charset found, handle it as a byte string.
    processCSSFile: function(aCSSFile, aRefURL, aCharset) {
        let getSupportedCharset = function (charset) {
            try {
                sbCommonUtils.UNICODE.charset = charset;
            } catch (ex) {
                // charset is not supported by Firefox
                return null;
            }
            return charset;
        };

        let charset = getSupportedCharset(aCharset);
        let cssText = sbCommonUtils.readFile(aCSSFile, charset);
        let hasAtRule = false;

        if (!charset) {
            if (cssText.startsWith("\xEF\xBB\xBF")) {
                charset = "UTF-8";
            } else if (cssText.startsWith("\xFE\xFF")) {
                charset = "UTF-16BE";
            } else if (cssText.startsWith("\xFF\xFE")) {
                charset = "UTF-16LE";
            } else if (cssText.startsWith("\x00\x00\xFE\xFF")) {
                charset = "UTF-32BE";
            } else if (cssText.startsWith("\x00\x00\xFF\xFE")) {
                charset = "UTF-32LE";
            } else if (/^@charset (["'])(\w+)\1;/.test(cssText)) {
                charset = RegExp.$2;
                hasAtRule = true;
            }
            charset = getSupportedCharset(charset);
            if (charset) cssText = sbCommonUtils.convertToUnicode(cssText, charset);
        } else {
            if (/^@charset (["'])(\w+)\1;/.test(cssText)) {
                hasAtRule = true;
            }
        }

        // if the CSS file doesn't have @charset, save it as UTF-8 so that it can be load correctly
        if (charset && !hasAtRule) charset = "UTF-8";

        cssText = this.inspectCSSFileText(cssText, aRefURL);
        if (charset) {
            sbCommonUtils.writeFile(aCSSFile, cssText, charset);
        } else {
            sbCommonUtils.writeFileBytes(aCSSFile, cssText);
        }
        this.downloadRewriteFiles[this.item.id].push([aCSSFile, charset]);
    },

    // process the CSS text of whole <style> or CSS file
    //
    // @TODO: current code is heuristic and ugly,
    //        consider implementing a real CSS parser to prevent potential error
    //        for certain complicated CSS
    inspectCSSFileText: function(aCSSText, aRefURL) {
        let that = this;
        let pCm = "(?:/\\*[\\s\\S]*?\\*/)"; // comment
        let pSp = "(?:[ \\t\\r\\n\\v\\f]*)"; // space equivalents
        let pCmSp = "(?:" + "(?:" + pCm + "|" + pSp + ")" + "*" + ")"; // comment or space
        let pChar = "(?:\\\\.|[^\\\\])"; // a char, or escaped
        let pStr = "(?:" + pChar + "*?" + ")"; // string
        let pSStr = "(?:" + pCmSp + pStr + pCmSp + ")"; // spaced string
        let pDQStr = "(?:" + '"' + pStr + '"' + ")"; // single quoted string
        let pSQStr = "(?:" + "'" + pStr + "'" + ")"; // double quoted string
        let pES = "(?:" + "(?:" + [pCm, pDQStr, pSQStr, pChar].join("|") + ")*?" + ")"; // embeded string
        let pUrl = "(?:" + "url\\(" + pSp + "(?:" + [pDQStr, pSQStr, pSStr].join("|") + ")" + pSp + "\\)" + ")";
        let pUrl2 = "(" + "url\\(" + pSp + ")(" + [pDQStr, pSQStr, pSStr].join("|") + ")(" + pSp + "\\)" + ")"; // catch 3
        let pRImport = "(" + "@import" + pCmSp + ")(" + [pUrl, pDQStr, pSQStr].join("|") + ")(" + pCmSp + ";" + ")"; // catch 3
        let pRFontFace = "(" + "@font-face" + pCmSp + "{" + pES + "}" + ")"; // catch 1

        let parseUrlFunc = function (text, callback) {
            return text.replace(new RegExp(pUrl2, "gi"), function (m, u1, u2, u3) {
                if (u2.startsWith('"') && u2.endsWith('"')) {
                    let ret = callback(u2.slice(1, -1));
                } else if (u2.startsWith("'") && u2.endsWith("'")) {
                    let ret = callback(u2.slice(1, -1));
                } else {
                    let ret = callback(u2.trim());
                }
                return u1 + '"' + ret + '"' + u3;
            });
        };
        let importParseUrlFunc = function (url) {
            let dataURL = sbCommonUtils.unescapeCss(url);
            if (dataURL.startsWith("data:") && !that.option["saveDataUri"]) return dataURL;
            dataURL = sbCommonUtils.resolveURL(aRefURL, dataURL);
            let dataFile = that.download(dataURL, "quote", "cssFile");
            if (dataFile) dataURL = dataFile;
            return dataURL;
        };

        let cssText = aCSSText.replace(
            new RegExp([pCm, pRImport, pRFontFace, "("+pUrl+")"].join("|"), "gi"),
            function (m, im1, im2, im3, ff, u) {
                if (im2) {
                    if (im2.startsWith('"') && im2.endsWith('"')) {
                        let ret = 'url("' + importParseUrlFunc(im2.slice(1, -1)) + '")';
                    } else if (im2.startsWith("'") && im2.endsWith("'")) {
                        let ret = 'url("' + importParseUrlFunc(im2.slice(1, -1)) + '")';
                    } else {
                        let ret = parseUrlFunc(im2, importParseUrlFunc);
                    }
                    return im1 + ret + im3;
                } else if (ff) {
                    return parseUrlFunc(m, function (url) {
                        let dataURL = sbCommonUtils.unescapeCss(url);
                        if (dataURL.startsWith("data:") && !that.option["saveDataUri"]) return dataURL;
                        dataURL = sbCommonUtils.resolveURL(aRefURL, dataURL);
                        if (that.option["fonts"]) {
                            let dataFile = that.download(dataURL, "quote");
                            if (dataFile) dataURL = dataFile;
                        } else {
                            dataURL = that.getSkippedURL(dataURL);
                        }
                        return dataURL;
                    });
                } else if (u) {
                    return parseUrlFunc(m, function (url) {
                        let dataURL = sbCommonUtils.unescapeCss(url);
                        if (dataURL.startsWith("data:") && !that.option["saveDataUri"]) return dataURL;
                        dataURL = sbCommonUtils.resolveURL(aRefURL, dataURL);
                        if (that.option["images"]) {
                            let dataFile = that.download(dataURL, "quote");
                            if (dataFile) dataURL = dataFile;
                        } else {
                            dataURL = that.getSkippedURL(dataURL);
                        }
                        return dataURL;
                    });
                }
                return m;
            });
        return cssText;
    },

    inspectCSSText: function(aCSSText, aRefURL, aType) {
        let that = this;
        // CSS get by .cssText is always url("something-with-\"double-quote\"-escaped")
        // and no CSS comment is in, so we can parse it safely with this RegExp.
        let regex = / url\(\"((?:\\.|[^"])+)\"\)/g;
        aCSSText = aCSSText.replace(regex, function() {
            let dataURL = sbCommonUtils.unescapeCss(arguments[1]);
            if (dataURL.startsWith("data:") && !that.option["saveDataUri"]) return ' url("' + dataURL + '")';
            if ( that.option["internalize"] && that.isInternalized(dataURL) ) return ' url("' + dataURL + '")';
            dataURL = sbCommonUtils.resolveURL(aRefURL, dataURL);
            switch (aType) {
                case "image":
                    if (that.option["images"]) {
                        let dataFile = that.download(dataURL, "quote");
                        if (dataFile) dataURL = dataFile;
                    } else {
                        dataURL = that.getSkippedURL(dataURL);
                    }
                    break;
                case "font":
                    if (that.option["fonts"]) {
                        let dataFile = that.download(dataURL, "quote");
                        if (dataFile) dataURL = dataFile;
                    } else {
                        dataURL = that.getSkippedURL(dataURL);
                    }
                    break;
            }
            return ' url("' + dataURL + '")';
        });
        return aCSSText;
    },


    // Converting a data URI to nsIURL will throw an NS_ERROR_MALFORMED_URI error
    // if the data URI is large (e.g. 5 MiB), so we manipulate the URL string instead
    // of converting the URI to nsIURI initially.
    //
    // aURLSpec is an absolute URL, could be encodeURI or not
    //
    // aEscapeType is how we escape the result URL, it will be passed to escapeURL and can be omitted
    //
    // aSpecialMode is special handler, can be omitted
    //   "linkFilter": for a filter for download linked files
    //   "cssText": use parsed cssText (aSpecialModeParams.cssText) as real file content
    //   "cssFile": parse the file content as CSS after downloaded
    //
    // return "": means no download happened (should no change the url)
    // return <sourceURL>: deep capture for latter rewrite via sbCrossLinker (must have identical url)
    // return "urn:scrapbook-download:<hash>": when download starts
    // return "urn:scrapbook-download-error:<sourceURL>": when download error detected
    // return <fileName>: a download happen, or used an already downloaded file
    download: function(aURLSpec, aEscapeType, aSpecialMode, aSpecialModeParams) {
        if ( !aURLSpec ) return "";
        let sourceURL = aURLSpec;
        let that = this;

        let errorHandler = function(ex) {
            // crop to prevent large dataURI masking the exception info, especially dataURIs
            sourceURL = sbCommonUtils.crop(sourceURL, 1024);
            if (sourceURL.startsWith("file:")) {
                let msgType = "ERR_FAIL_COPY_FILE";
            } else if (sourceURL.startsWith("data:")) {
                let msgType = "ERR_FAIL_WRITE_FILE";
            } else {
                let msgType = "ERR_FAIL_DOWNLOAD_FILE";
            }
            let errURL = "urn:scrapbook-download-error:" + sourceURL;
            sbCommonUtils.error(sbCommonUtils.lang(msgType, sourceURL, ex));
            if (hashKey) that.downloadRewriteMap[that.item.id][hashKey] = that.escapeURL(errURL, aEscapeType);
            return errURL;
        };

        try {
            if ( sourceURL.startsWith("http:") || sourceURL.startsWith("https:") || sourceURL.startsWith("ftp:") ) {
                let targetDir = that.option["internalize"] ? that.option["internalize"].parent : that.contentDir.clone();
                let hashKey = sbCommonUtils.getUUID();
                let fileName, isDuplicate;
                that.httpTask[that.item.id]++;
                try {
                    let channel = sbCommonUtils.newChannel(sourceURL);
                    channel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
                    channel.setRequestHeader("referer", that.refURLObj.spec, false);
                    channel.asyncOpen({
                        _content: {},
                        _stream: null,
                        _file: null,
                        _skipped: false,
                        onStartRequest: function (aRequest, aContext) {
                            try {
                                aRequest = aRequest.QueryInterface(Components.interfaces.nsIChannel);
                                // get header info
                                try { this._content.filename = aRequest.contentDispositionFilename; } catch (ex) {}
                                try { this._content.isAttachment = aRequest.contentDisposition; } catch (ex) {}
                                try { this._content.contentType = aRequest.contentType; } catch (ex) {}
                                try { this._content.contentCharset = aRequest.contentCharset; } catch (ex) {}
                                try { this._content.contentLength = aRequest.contentLength; } catch (ex) {}
                                // if header Content-Disposition is defined, use it
                                if (this._content.filename) {
                                    fileName = this._content.filename;
                                    let [, ext] = sbCommonUtils.splitFileName(fileName);
                                }
                                // if no ext defined, try header Content-Type
                                if (!fileName) {
                                    let [base, ext] = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(aRequest.name));
                                    if (!ext && this._content.contentType) {
                                        ext = sbCommonUtils.getMimePrimaryExtension(this._content.contentType, ext);
                                    }
                                    fileName = base + "." + (ext || "dat");
                                }
                                // special: apply the filter
                                if (aSpecialMode == "linkFilter") {
                                    let toDownload = ["text/html", "application/xhtml+xml"].indexOf(this._content.contentType) < 0 && that.downLinkFilter(ext);
                                    if (!toDownload) {
                                        if ( that.option["inDepth"] > that.depth ) {
                                            // do not copy, but add to the link list if it's a work of deep capture
                                            that.linkURLs.push(sourceURL);
                                        }
                                        that.downloadRewriteMap[that.item.id][hashKey] = that.escapeURL(sourceURL, aEscapeType);
                                        this._skipped = true;
                                        channel.cancel(Components.results.NS_BINDING_ABORTED);
                                        return;
                                    }
                                }
                                // special: use cssText
                                if (aSpecialMode == "cssText") {
                                    // use a dummy sourceDoc "cssText" as key to prevent a normal file used the same URL
                                    [fileName, isDuplicate] = that.getUniqueFileName(fileName, sourceURL, "cssText");
                                    that.downloadRewriteMap[that.item.id][hashKey] = that.escapeURL(fileName, aEscapeType, true);
                                    if (!isDuplicate) {
                                        let targetFile = targetDir.clone(); targetFile.append(fileName);
                                        sbCommonUtils.writeFile(targetFile, aSpecialModeParams.cssText, "UTF-8");
                                        that.downloadRewriteFiles[that.item.id].push([targetFile, "UTF-8"]);
                                    }
                                    this._skipped = true;
                                    channel.cancel(Components.results.NS_BINDING_ABORTED);
                                    return;
                                }
                                // determine the filename and check for duplicate
                                [fileName, isDuplicate] = that.getUniqueFileName(fileName, sourceURL);
                                that.downloadRewriteMap[that.item.id][hashKey] = that.escapeURL(fileName, aEscapeType, true);
                                if (isDuplicate) {
                                    this._skipped = true;
                                    channel.cancel(Components.results.NS_BINDING_ABORTED);
                                }
                            } catch (ex) {
                                sbCommonUtils.error(ex);
                                channel.cancel(Components.results.NS_BINDING_ABORTED);
                            }
                        },
                        onStopRequest: function (aRequest, aContext, aStatusCode) {
                            try {
                                if (!!this._stream) {
                                    this._stream.close;
                                }
                                if (!this._skipped) {
                                    if (aStatusCode != Components.results.NS_OK) {
                                        // download failed, remove the file and use the original URL
                                        if (this._file) this._file.remove(true);
                                        throw "download channel fail";
                                    }
                                    // special: parse CSS file
                                    if (aSpecialMode == "cssFile") {
                                        that.processCSSFile(this._file, sourceURL, this._content.contentCharset);
                                    }
                                }
                            } catch (ex) {
                                errorHandler(ex);
                            }
                            that.onDownloadComplete(that.item);
                        },
                        onDataAvailable: function (aRequest, aContext, aInputStream, aOffset, aCount) {
                            // Sometimes channel.cancel cannot terminate the data transfter.
                            // We add a check here to avoid a skipped file be downloaded.
                            if (this._skipped) return;
                            try {
                                if (!this._stream) {
                                    this._file = targetDir.clone(); this._file.append(fileName);
                                    let ostream = Components.classes['@mozilla.org/network/file-output-stream;1']
                                            .createInstance(Components.interfaces.nsIFileOutputStream);
                                    ostream.init(this._file, -1, 0666, 0);
                                    let bostream = Components.classes['@mozilla.org/network/buffered-output-stream;1']
                                            .createInstance(Components.interfaces.nsIBufferedOutputStream);
                                    bostream.init(ostream, 1024 * 1024);
                                    this._stream = bostream;
                                }
                                this._stream.writeFrom(aInputStream, aCount);
                                this._stream.flush();
                                that.onDownloadProgress(that.item, fileName, aOffset);
                            } catch(ex) {
                                sbCommonUtils.error(ex);
                                channel.cancel(Components.results.NS_BINDING_ABORTED);
                            }
                        }
                    }, null);
                } catch (ex) {
                    that.httpTask[that.item.id]--;
                    errorHandler(ex);
                }
                return "urn:scrapbook-download:" + hashKey;
            } else if ( sourceURL.startsWith("file:") ) {
                // if sourceURL is not targeting a file, fail out
                let sourceFile = sbCommonUtils.convertURLToFile(sourceURL);
                if (!sourceFile.exists()) throw sourceURL + " does not exist";
                if (!sourceFile.isFile()) throw sourceURL + " is not a file";
                // determine the filename
                let targetDir = that.option["internalize"] ? that.option["internalize"].parent : that.contentDir.clone();
                let fileName, isDuplicate;
                fileName = sbCommonUtils.getFileName(sourceURL);
                // if the target file exists and has same content as the source file, skip copy
                // This kind of duplicate is probably a result of Firefox making a relative link absolute
                // during a copy/cut.
                fileName = sbCommonUtils.validateFileName(fileName);
                let targetFile = targetDir.clone(); targetFile.append(fileName);
                if (sbCommonUtils.compareFiles(sourceFile, targetFile)) {
                    return that.escapeURL(fileName, aEscapeType, true);
                }
                // special: use cssText
                if (aSpecialMode == "cssText") {
                    // use a dummy sourceDoc "cssText" as key to prevent a normal file used the same URL
                    [fileName, isDuplicate] = that.getUniqueFileName(fileName, sourceURL, "cssText");
                    if (isDuplicate) return that.escapeURL(fileName, aEscapeType, true);
                    sbCommonUtils.writeFile(targetFile, aSpecialModeParams.cssText, "UTF-8");
                    that.downloadRewriteFiles[that.item.id].push([targetFile, "UTF-8"]);
                    return that.escapeURL(fileName, aEscapeType, true);
                }
                // check for duplicate
                [fileName, isDuplicate] = that.getUniqueFileName(fileName, sourceURL);
                if (isDuplicate) return that.escapeURL(fileName, aEscapeType, true);
                // set task
                that.httpTask[that.item.id]++;
                let item = that.item;
                setTimeout(function(){ that.onDownloadComplete(item); }, 0);
                // do the copy
                sourceFile.copyTo(targetDir, fileName);
                // special: parse CSS file
                if (aSpecialMode == "cssFile") {
                    that.processCSSFile(targetFile, sourceURL);
                }
                return that.escapeURL(fileName, aEscapeType, true);
            } else if ( sourceURL.startsWith("data:") ) {
                // special: use cssText
                if (aSpecialMode == "cssText") {
                    let dataURI = "data:text/css;base64," + btoa(sbCommonUtils.unicodeToUtf8(aSpecialModeParams.cssText));
                    if (!that.option["saveDataUri"]) {
                        return that.escapeURL(dataURI, aEscapeType, true);
                    } else {
                        // replace sourceURL with cssText version
                        sourceURL = dataURI;
                    }
                }
                // download "data:" only if option on
                if (!that.option["saveDataUri"]) {
                    return "";
                }
                let { mime, charset, base64, data } = sbCommonUtils.parseDataURI(sourceURL);
                let dataURIBytes = base64 ? atob(data) : decodeURIComponent(data); // in bytes
                // use sha1sum as the filename
                let dataURIFileName = sbCommonUtils.sha1(dataURIBytes, "BYTES") + "." + (sbCommonUtils.getMimePrimaryExtension(mime, null) || "dat");
                let targetDir = that.option["internalize"] ? that.option["internalize"].parent : that.contentDir.clone();
                let fileName, isDuplicate;
                // if the target file exists and has same content as the dataURI, skip copy
                fileName = dataURIFileName;
                let targetFile = targetDir.clone(); targetFile.append(fileName);
                if (targetFile.exists() && targetFile.isFile()) {
                    if (sbCommonUtils.readFile(targetFile) === dataURIBytes) {
                        return that.escapeURL(fileName, aEscapeType, true);
                    }
                }
                // determine the filename and check for duplicate
                [fileName, isDuplicate] = that.getUniqueFileName(fileName, sourceURL);
                if (isDuplicate) return that.escapeURL(fileName, aEscapeType, true);
                // set task
                that.httpTask[that.item.id]++;
                let item = that.item;
                setTimeout(function(){ that.onDownloadComplete(item); }, 0);
                // do the save
                let targetFile = targetDir.clone(); targetFile.append(fileName);
                sbCommonUtils.writeFileBytes(targetFile, dataURIBytes);
                return that.escapeURL(fileName, aEscapeType, true);
            }
        } catch (ex) {
            return errorHandler(ex);
        }
        return "";
    },

    downLinkFilter: function(aFileExt) {
        let that = this;
        // use cache if the filter is not changed
        if (arguments.callee._filter !== that.option["downLinkFilter"]) {
            arguments.callee._filter = that.option["downLinkFilter"];
            arguments.callee.filters = (function () {
                let ret = [];
                that.option["downLinkFilter"].split(/[\r\n]/).forEach(function (line) {
                    if (line.charAt(0) === "#") return;
                    line = line.trim();
                    if (line === "") return;
                    try {
                        let regex = new RegExp("^(?:" + line + ")$", "i");
                        ret.push(regex);
                    } catch (ex) {}
                });
                return ret;
            })();
        }
        let toDownload = arguments.callee.filters.some(function (filter) {
            return filter.test(aFileExt);
        });
        return toDownload;
    },

    globalURLFilter: function (aURL) {
        let that = this;
        // use the cache if the filter is not changed
        if (arguments.callee._filter !== that.option["linkUrlFilters"]) {
            arguments.callee._filter = that.option["linkUrlFilters"];
            arguments.callee.filters = (function () {
                try {
                    let filters = [];
                    let dataStr = that.option["linkUrlFilters"];
                    let data = JSON.parse(dataStr);
                    ((data instanceof Array) ? data : [data]).forEach(function (item) {
                        // make sure each item is a valid RegExp
                        try {
                            item = item.toString();
                            if (/^\/(.*)\/([a-z]*)$/.test(item)) {
                                item = new RegExp(RegExp.$1, RegExp.$2);
                            } else {
                                item = new RegExp(sbCommonUtils.escapeRegExp(item));
                            }
                        } catch (ex) {
                            sbCommonUtils.error("Invalid RegExp string '" + item + "'\n\n" + ex);
                            return;
                        }
                        filters.push(item);
                    });
                    return filters;
                } catch (ex) {
                    sbCommonUtils.error("Unable to parse JSON data '" + dataStr + "'\n\n" + ex);
                }
                return [];
            })();
        }
        // apply the filters
        let toForbid = arguments.callee.filters.some(function (filter) {
            return filter.test(aURL);
        });
        return !toForbid;
    },

    /**
     * @return  [(string) newFileName, (bool) isDuplicated]
     */
    getUniqueFileName: function(aSuggestFileName, aSourceURL, aSourceDoc) {
        if (this.option["serializeFilename"]) {
            return this.getUniqueFileNameSerialize(aSuggestFileName, aSourceURL, aSourceDoc);
        }
        let newFileName = sbCommonUtils.validateFileName(aSuggestFileName || "untitled");
        let [newFileBase, newFileExt] = sbCommonUtils.splitFileName(newFileName);
        newFileBase = sbCommonUtils.crop(newFileBase, 128, 240);
        newFileExt = newFileExt || "dat";
        let sourceURL = sbCommonUtils.splitURLByAnchor(aSourceURL)[0];
        let sourceDoc = aSourceDoc;

        // CI means case insensitive
        let seq = 0;
        newFileName = newFileBase + "." + newFileExt;
        let newFileNameCI = newFileName.toLowerCase();
        while (this.file2URL[newFileNameCI] !== undefined) {
            if (this.file2URL[newFileNameCI] === sourceURL) {
                if (this.file2Doc[newFileNameCI] === sourceDoc || !sourceDoc) {
                    // case 1. this.file2Doc[newFileNameCI] === sourceDoc === undefined
                    // Has been used by a non-HTML-doc file, e.g. <img src="http://some.url/someFile.png">
                    // And now used by a non-HTML-doc file, e.g. <link rel="icon" href="http://some.url/someFile.png">
                    // Action: mark as duplicate and do not download.
                    //
                    // case 2. this.file2Doc[newFileNameCI] === sourceDoc !== undefined
                    // This case is impossible since any two nodes having HTML-doc are never identical.
                    //
                    // case 3. this.file2Doc[newFileNameCI] !== sourceDoc === undefined (bad use case)
                    // Has been used by an HTML doc, e.g. an <iframe src="http://some.url/index_1.html"> saving to index_1.html
                    // And now used as a non-HTML-doc file, e.g. <img src="http://some.url/index_1.html">
                    // Action: mark as duplicate and do not download.
                    return [newFileName, true];
                } else if (!this.file2Doc[newFileNameCI]) {
                    // case 4. undefined === this.file2Doc[newFileNameCI] !== sourceDoc (bad use case)
                    // Has been used by an HTML-doc which had been downloaded as a non-HTML-doc file, e.g. <img src="http://some.url/index_1.html">
                    // And now used by an HTML-doc, e.g. an <iframe src="http://some.url/index_1.html"> saving to index_1.html
                    // Action: mark as non-duplicate and capture the parsed doc,
                    //         and record the sourceDoc so that further usage of sourceURL becomes case 3 or 6.
                    this.file2Doc[newFileNameCI] = sourceDoc;
                    return [newFileName, false];
                }
            }
            // case 5. undefined !== this.file2URL[newFileNameCI] !== sourceURL
            // Action: suggest another name to download.
            //
            // case 6. undefined !== this.file2Doc[newFileNameCI] !== sourceDoc !== undefined
            // Has been used by an HTML-doc, e.g. an <iframe src="http://some.url/index_1.html"> saving to index_1.html
            // And now used by another HTML doc with same sourceURL, e.g. a (indepth) main page http://some.url/index.html saving to index_1.html
            // Action: suggest another name to download the doc.
            newFileName = newFileBase + "_" + sbCommonUtils.pad(++seq, 3) + "." + newFileExt;
            newFileNameCI = newFileName.toLowerCase();
        }
        // case 7. undefined === this.file2URL[newFileNameCI] !== sourceURL
        //         or as a post-renaming-result of case 5 or 6.
        this.file2URL[newFileNameCI] = sourceURL;
        this.file2Doc[newFileNameCI] = sourceDoc;
        return [newFileName, false];
    },
    
    getUniqueFileNameSerialize: function(aSuggestFileName, aSourceURL, aSourceDoc) {
        if (arguments.callee._file2URL !== this.file2URL) {
            arguments.callee._file2URL = this.file2URL;
            arguments.callee.fileBase2URL = {};
            for (var keyFileName in this.file2URL) {
                let keyFileBase = sbCommonUtils.splitFileName(keyFileName)[0];
                arguments.callee.fileBase2URL[keyFileBase] = this.file2URL[keyFileName];
            }
        }
        let newFileName = sbCommonUtils.validateFileName(aSuggestFileName || "untitled");
        let [newFileBase, newFileExt] = sbCommonUtils.splitFileName(newFileName);
        newFileBase = "index";
        newFileExt = (newFileExt || "dat").toLowerCase();
        let sourceURL = sbCommonUtils.splitURLByAnchor(aSourceURL)[0];
        let sourceDoc = aSourceDoc;

        // CI means case insensitive
        let seq = 0;
        newFileName = newFileBase + "." + newFileExt;
        while (arguments.callee.fileBase2URL[newFileBase] !== undefined) {
            // special handle index.html
            if (newFileName === "index.html" && this.file2URL[newFileName] === undefined) {
                break;
            }
            if (this.file2URL[newFileName] === sourceURL) {
                if (this.file2Doc[newFileName] === sourceDoc || !sourceDoc) {
                    return [newFileName, true];
                } else if (!this.file2Doc[newFileName]) {
                    this.file2Doc[newFileName] = sourceDoc;
                    return [newFileName, false];
                }
            }
            newFileBase = "file" + "_" + sbCommonUtils.pad(++seq, 8);
            newFileName = newFileBase + "." + newFileExt;
        }
        arguments.callee.fileBase2URL[newFileBase] = sourceURL;
        this.file2URL[newFileName] = sourceURL;
        this.file2Doc[newFileName] = sourceDoc;
        return [newFileName, false];
    },

    isInternalized: function (aURI) {
        return aURI.indexOf("://") === -1 && !aURI.startsWith("data:");
    },

    // escapeType: determine how to escape the result url
    //   (default): use plain URL text without additional escape
    //   "quote": the result url is part of (double) quote content
    //   "HTML": the result url is part of HTML content
    // Note: if the url is to be passed to e.g. elem.setAttribute(), we should use default instead of HTML
    //
    // isFilename: true if the url contains only the filename; otherwise (e.g. undefined) if it's a full URL
    escapeURL: function (url, escapeType, isFilename) {
        if (isFilename) {
            url = sbCommonUtils.escapeFileName(url);
        }
        if (escapeType == "quote") {
            sbCommonUtils.escapeQuotes(url);
        } else if (escapeType == "HTML") {
            url = sbCommonUtils.escapeHTML(url);
        }
        return url;
    },

    restoreFileNameFromHash: function (content) {
        let that = this;
        return content.replace(/urn:scrapbook-download:([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})/g, function (match, key) {
            let url = that.downloadRewriteMap[that.item.id][key];
            // This could happen when a web page really contains a content text in our format.
            // We return the original text for keys not defineded in the map to prevent a bad replace
            // since it's nearly impossible for them to hit on the hash keys we are using.
            if (!url) return match;
            return url;
        });
    },

    // get the skipped form for specific protocol that we do not handle
    getSkippedURL: function (url) {
        if (this.option["recordSkippedUrl"]) {
            if (!url.startsWith("urn:scrapbook-download-skip:")) {
                return "urn:scrapbook-download-skip:" + url;
            }
        } else {
            return "about:blank";
        }
        return url;
    },

    // remove the specified attr, record it if option set
    removeAttr: function (elem, attr) {
        if (!elem.hasAttribute(attr)) return;
        if (this.option["recordRemovedAttr"]) {
            elem.setAttribute("data-sb-orig-" + attr, elem.getAttribute(attr));
        }
        elem.removeAttribute(attr);
    },

    /**
     * Capture observer
     */
    trace: function(aText, aMillisec) {},

    onDownloadComplete: function(aItem) {
        if ( --this.httpTask[aItem.id] == 0 ) {
            this.onAllDownloadsComplete(aItem);
            return;
        }
        this.trace(sbCommonUtils.lang("SAVE", this.httpTask[aItem.id], aItem.title), 0);
    },

    onAllDownloadsComplete: function(aItem) {
        // restore downloaded file names
        this.downloadRewriteFiles[aItem.id].forEach(function (data) {
            let [file, charset] = data;
            let content = sbCommonUtils.readFile(file, charset);
            content = this.restoreFileNameFromHash(content);
            if (charset) {
                sbCommonUtils.writeFile(file, content, charset);
            } else {
                sbCommonUtils.writeFileBytes(file, content);
            }
        }, this);

        // restore item.icon
        if (aItem.icon) {
            aItem.icon = this.restoreFileNameFromHash(aItem.icon);
        }

        // invoke indepth capture dialog
        if ( this.option["inDepth"] > this.depth && this.linkURLs.length > 0 ) {
            if ( this.depth == 0 ) {
                this.item.type = "marked";
                let data = {
                    urls: this.linkURLs,
                    refUrl: this.refURLObj.spec,
                    showDetail: false,
                    referItem: this.item,
                    option: this.option,
                    file2Url: this.file2URL,
                    context: "indepth",
                };
                window.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,dialog=no", data);
            } else {
                for ( let i = 0; i < this.linkURLs.length; i++ ) {
                    sbCaptureTask.add(this.linkURLs[i], this.depth + 1);
                }
            }
        }

        // fix resource settings after capture complete
        // This is only run if we have addResource'd for this document.
        let res = this.treeRes;
        if (res && sbDataSource.exists(res)) {
            sbDataSource.setProperty(res, "type", aItem.type);
            // Don't add "resource://" for URLs like "moz-icon://"
            if (aItem.icon) {
                if (aItem.icon.indexOf(":") >= 0) {
                    let iconURL = aItem.icon;
                } else {
                    let iconURL = "resource://scrapbook/data/" + aItem.id + "/" + aItem.icon;
                }
                sbDataSource.setProperty(res, "icon", iconURL);
            }
            sbCommonUtils.rebuildGlobal();
            sbCommonUtils.writeIndexDat(aItem);
        }

        this.trace(sbCommonUtils.lang("SAVE_COMPLETE", aItem.title), 5000);
        this.onCaptureComplete(aItem);
    },

    onDownloadProgress: function(aItem, aFileName, aProgress) {
        this.trace(sbCommonUtils.lang("DOWNLOAD_DATA", aFileName, sbCommonUtils.formatFileSize(aProgress)), 0);
    },

    onCaptureComplete: function(aItem) {
        sbContentSaver.notifyCaptureComplete(aItem);
    },

};


