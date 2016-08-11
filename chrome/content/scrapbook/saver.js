
var sbContentSaver = {
    captureWindow: function(aRootWindow, aIsPartial, aShowDetail, aResName, aResIndex, aPresetData, aContext, aTitle) {
        var saver = new sbContentSaverClass();
        return saver.captureWindow(aRootWindow, aIsPartial, aShowDetail, aResName, aResIndex, aPresetData, aContext, aTitle);
    },

    captureFile: function(aSourceURL, aReferURL, aType, aShowDetail, aResName, aResIndex, aPresetData, aContext) {
        var saver = new sbContentSaverClass();
        return saver.captureFile(aSourceURL, aReferURL, aType, aShowDetail, aResName, aResIndex, aPresetData, aContext);
    },

    notifyCaptureComplete: function(aItem) {
        // aItem is the last item that is captured
        // in a multiple capture it could be null 
        if (aItem) {
            if ( sbDataSource.getProperty(sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + aItem.id), "type") == "marked" ) return;
            if ( sbCommonUtils.getPref("notifyOnComplete", true) ) {
                var icon = aItem.icon ? "resource://scrapbook/data/" + aItem.id + "/" + aItem.icon : sbCommonUtils.getDefaultIcon();
                var title = "ScrapBook: " + sbCommonUtils.lang("CAPTURE_COMPLETE");
                var text = sbCommonUtils.crop(aItem.title, null, 100);
                var listener = {
                    observe: function(subject, topic, data) {
                        if (topic == "alertclickcallback")
                            sbCommonUtils.loadURL("chrome://scrapbook/content/view.xul?id=" + data, true);
                    }
                };
                var alertsSvc = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
                alertsSvc.showAlertNotification(icon, title, text, true, aItem.id, listener);
            }
        } else {
            var icon = sbCommonUtils.getDefaultIcon();
            var title = "ScrapBook: " + sbCommonUtils.lang("CAPTURE_COMPLETE");
            var alertsSvc = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
            alertsSvc.showAlertNotification(icon, title, null);
        }
    },
};


function sbContentSaverClass() {
    this.option = {};
    this.context = null;
    this.documentName = "";
    this.item = null;
    this.favicon = null;
    this.contentDir = null;
    this.refURLObj = null;
    this.isMainFrame = true;
    this.selection = null;
    this.treeRes = null;
    this.presetData = null;
    this.httpTask = {};
    this.downloadRewriteFiles = {};
    this.downloadRewriteMap = {};
    this.file2URL = {};
    this.file2Doc = {};
    this.linkURLs = [];
    this.elemMapKey = "data-sb-id-" + Date.now();
    this.elemMapOrig = [];
}

sbContentSaverClass.prototype = {

    init: function(aPresetData) {
        this.option = {
            "isPartial": false,
            "images": sbCommonUtils.getPref("capture.default.images", true),
            "media": sbCommonUtils.getPref("capture.default.media", true),
            "fonts": sbCommonUtils.getPref("capture.default.fonts", true),
            "frames": sbCommonUtils.getPref("capture.default.frames", true),
            "styles": sbCommonUtils.getPref("capture.default.styles", true),
            "script": sbCommonUtils.getPref("capture.default.script", false),
            "asHtml": sbCommonUtils.getPref("capture.default.asHtml", false),
            "forceUtf8": sbCommonUtils.getPref("capture.default.forceUtf8", true),
            "rewriteStyles": sbCommonUtils.getPref("capture.default.rewriteStyles", true),
            "keepLink": sbCommonUtils.getPref("capture.default.keepLink", false),
            "saveDataURI": sbCommonUtils.getPref("capture.default.saveDataURI", false),
            "serializeFilename": sbCommonUtils.getPref("capture.default.serializeFilename", false),
            "linkURLFilters": sbCommonUtils.getPref("capture.default.linkURLFilters", ""),
            "downLinkMethod": 0, // active only if explicitly set in detail dialog
            "downLinkFilter": "",
            "inDepth": 0, // active only if explicitly set in detail dialog
            "inDepthTimeout": 0,
            "inDepthCharset": "UTF-8",
            "internalize": false,
        };
        this.documentName = "index";
        this.item = sbCommonUtils.newItem(sbCommonUtils.getTimeStamp());
        this.item.id = sbDataSource.identify(this.item.id);
        this.favicon = null;
        this.isMainFrame = true;

        this.file2URL = {
            "index.dat": true,
            "index.png": true,
            "index.rdf": true,
            "sitemap.xml": true,
            "sitemap.xsl": true,
            "sb-file2url.txt": true,
            "sb-url2name.txt": true,
        };
        this.file2Doc = {};
        this.linkURLs = [];
        this.elemMapOrig = [];
        this.presetData = aPresetData;
        if ( aPresetData ) {
            if ( aPresetData[0] ) this.item.id = aPresetData[0];
            if ( aPresetData[1] ) this.documentName = aPresetData[1];
            if ( aPresetData[2] ) this.option = sbCommonUtils.extendObject(this.option, aPresetData[2]);
            if ( aPresetData[3] ) this.file2URL = aPresetData[3];
            if ( aPresetData[4] >= this.option["inDepth"] ) this.option["inDepth"] = 0;
        }
        this.httpTask[this.item.id] = 0;
        this.downloadRewriteFiles[this.item.id] = [];
        this.downloadRewriteMap[this.item.id] = {};
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
        this.init(aPresetData);
        this.option["isPartial"] = aIsPartial;
        this.context = aContext;
        this.item.chars = this.option["forceUtf8"] ? "UTF-8" : aRootWindow.document.characterSet;
        this.item.source = aRootWindow.location.href;
        //Favicon der angezeigten Seite bestimmen (Unterscheidung zwischen FF2 und FF3 notwendig!)
        if ( "gBrowser" in window && aRootWindow == gBrowser.contentWindow ) {
            this.item.icon = gBrowser.mCurrentBrowser.mIconURL;
        }
        var titles = aRootWindow.document.title ? [aRootWindow.document.title] : [decodeURI(this.item.source)];
        if ( aTitle ) titles[0] = aTitle;
        if ( aIsPartial ) {
            this.selection = aRootWindow.getSelection();
            var lines = this.selection.toString().split("\n");
            for ( var i = 0; i < lines.length; i++ ) {
                lines[i] = lines[i].replace(/\r|\n|\t/g, "");
                if ( lines[i].length > 0 ) titles.push(sbCommonUtils.crop(lines[i], 150, 180));
                if ( titles.length > 4 ) break;
            }
            this.item.title = ( titles.length > 0 ) ? titles[1] : titles[0];
        } else {
            this.selection = null;
            this.item.title = titles[0];
        }
        if ( document.getElementById("ScrapBookToolbox") && !document.getElementById("ScrapBookToolbox").hidden ) {
            var modTitle = document.getElementById("ScrapBookEditTitle").value;
            if ( titles.indexOf(modTitle) < 0 ) {
                titles.splice(1, 0, modTitle);
                this.item.title = modTitle;
            }
            this.item.comment = sbCommonUtils.escapeComment(sbPageEditor.COMMENT.value);
        }
        if ( aShowDetail ) {
            var ret = this.showDetailDialog(titles, aResName, aContext);
            if ( ret.result == 0 ) { return null; }
            if ( ret.result == 2 ) { aResName = ret.resURI; aResIndex = 0; }
        }
        this.contentDir = sbCommonUtils.getContentDir(this.item.id);
        var newName = this.saveDocumentInternal(aRootWindow.document, this.documentName);
        if ( this.item.icon && this.item.type != "image" && this.item.type != "file" ) {
            var iconFileName = this.download(this.item.icon);
            if (iconFileName) this.favicon = iconFileName;
        }
        if ( this.httpTask[this.item.id] == 0 ) {
            var that = this;
            setTimeout(function(){ that.onAllDownloadsComplete(that.item); }, 100);
        }
        this.addResource(aResName, aResIndex);
        return [sbCommonUtils.splitFileName(newName)[0], this.file2URL, this.item.title];
    },

    captureFile: function(aSourceURL, aReferURL, aType, aShowDetail, aResName, aResIndex, aPresetData, aContext) {
        this.init(aPresetData);
        this.context = aContext;
        this.item.title = sbCommonUtils.getFileName(aSourceURL);
        this.item.icon = "moz-icon://" + this.escapeURL(this.item.title, null, true) + "?size=16";
        this.item.source = aSourceURL;
        this.item.type = aType;
        if ( aShowDetail ) {
            var ret = this.showDetailDialog(null, aResName, aContext);
            if ( ret.result == 0 ) { return null; }
            if ( ret.result == 2 ) { aResName = ret.resURI; aResIndex = 0; }
        }
        this.contentDir = sbCommonUtils.getContentDir(this.item.id);
        this.refURLObj = sbCommonUtils.convertURLToObject(aReferURL);
        var newName = this.saveFileInternal(aSourceURL, this.documentName, aType);
        this.addResource(aResName, aResIndex);
        return [sbCommonUtils.splitFileName(newName)[0], this.file2URL, this.item.title];
    },

    showDetailDialog: function(aTitles, aResURI, aContext) {
        var ret = {
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
        var captureType = "";
        var charset = this.option["forceUtf8"] ? "UTF-8" : aDocument.characterSet;
        var contentType = aDocument.contentType;
        if ( ["text/html", "application/xhtml+xml"].indexOf(contentType) < 0 ) {
            if ( !(aDocument.documentElement.nodeName.toUpperCase() == "HTML" && this.option["asHtml"]) ) {
                captureType = "file";
            }
        }
        if ( captureType ) {
            var newLeafName = this.saveFileInternal(aDocument.location.href, aFileKey, captureType, charset);
            return newLeafName;
        }

        // HTML document: save the current DOM

        // frames could have ridiculous malformed location.href, such as "javascript:foo.bar"
        // in this case catch the error and this.refURLObj should remain original (the parent frame)
        try {
            var elem = aDocument.createElement("A");
            elem.href = "";
            this.refURLObj = sbCommonUtils.convertURLToObject(elem.href);
        } catch(ex) {
        }

        if ( !this.option["internalize"] ) {
            var useXHTML = (contentType == "application/xhtml+xml") && (!this.option["asHtml"]);
            var [myHTMLFileName, myHTMLFileDone] = this.getUniqueFileName(aFileKey + (useXHTML?".xhtml":".html"), this.refURLObj.spec, aDocument);
            if (myHTMLFileDone) return myHTMLFileName;
            // create a meta refresh for each *.xhtml
            if (useXHTML) {
                var myHTML = '<html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;URL=./' + myHTMLFileName + '"></head><body></body></html>';
                var myHTMLFile = this.contentDir.clone();
                myHTMLFile.append(aFileKey + ".html");
                sbCommonUtils.writeFile(myHTMLFile, myHTML, "UTF-8");
            }
        }

        if ( this.option["rewriteStyles"] ) {
            var [myCSSFileName] = this.getUniqueFileName(aFileKey + ".css", this.refURLObj.spec, aDocument);
        }

        var htmlNode = aDocument.documentElement;
        // cloned frames has contentDocument = null
        // cloned canvas has no image data
        // give them an unique id for later retrieving
        Array.prototype.forEach.call(htmlNode.querySelectorAll("frame, iframe, canvas"), function (elem) {
            var idx = this.elemMapOrig.length;
            this.elemMapOrig[idx] = elem;
            elem.setAttribute(this.elemMapKey, idx);
        }, this);
        // construct the node list
        var rootNode;
        var headNode;
        if ( this.selection ) {
            var selNodeTree = []; // Is not enough to preserve order of sparsely selected table cells
            for ( var iRange = 0; iRange < this.selection.rangeCount; ++iRange ) {
                var myRange = this.selection.getRangeAt(iRange);
                var curNode = myRange.commonAncestorContainer;
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

                var tmpNodeList = [];
                do {
                    tmpNodeList.unshift(curNode);
                    curNode = curNode.parentNode;
                } while ( curNode.nodeName.toUpperCase() != "HTML" );

                var parentNode = rootNode;
                var branchList = selNodeTree;
                var matchedDepth = -2;
                for( var iDepth = 0; iDepth < tmpNodeList.length; ++iDepth ) {
                    for ( var iBranch = 0; iBranch < branchList.length; ++iBranch ) {
                        if (tmpNodeList[iDepth] === branchList[iBranch].origNode ) {
                            matchedDepth = iDepth;
                            break;
                        }
                    }

                    if (iBranch === branchList.length) {
                        var clonedNode = tmpNodeList[iDepth].cloneNode(false);
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

        // process all inline and link CSS, will merge them into index.css later
        var myCSS = "";
        if ( (this.option["styles"] || this.option["keepLink"]) && this.option["rewriteStyles"] ) {
            var myStyleSheets = aDocument.styleSheets;
            for ( var i=0; i<myStyleSheets.length; i++ ) {
                myCSS += this.processCSSRecursively(myStyleSheets[i], aDocument);
            }
            if ( myCSS ) {
                var newLinkNode = aDocument.createElement("link");
                newLinkNode.setAttribute("media", "all");
                newLinkNode.setAttribute("href", myCSSFileName);
                newLinkNode.setAttribute("type", "text/css");
                newLinkNode.setAttribute("rel", "stylesheet");
                headNode.appendChild(aDocument.createTextNode("\n"));
                headNode.appendChild(newLinkNode);
                headNode.appendChild(aDocument.createTextNode("\n"));
            }
        }

        // change the charset to UTF-8
        // also change the meta tag; generate one if none found
        if ( this.option["forceUtf8"] ) {
            var metas = rootNode.getElementsByTagName("meta"), meta, hasmeta = false;
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
                var metaNode = aDocument.createElement("meta");
                metaNode.setAttribute("charset", "UTF-8");
                headNode.insertBefore(aDocument.createTextNode("\n"), headNode.firstChild);
                headNode.insertBefore(metaNode, headNode.firstChild);
                headNode.insertBefore(aDocument.createTextNode("\n"), headNode.firstChild);
            }
        }

        // generate the HTML and CSS file and save
        var myHTML = sbCommonUtils.doctypeToString(aDocument.doctype) + sbCommonUtils.surroundByTags(rootNode, rootNode.innerHTML + "\n");
        if ( this.option["internalize"] ) {
            var myHTMLFile = this.option["internalize"];
        } else {
            var myHTMLFile = this.contentDir.clone();
            myHTMLFile.append(myHTMLFileName);
        }
        sbCommonUtils.writeFile(myHTMLFile, myHTML, charset);
        this.downloadRewriteFiles[this.item.id].push([myHTMLFile, charset]);
        if ( myCSS ) {
            var myCSSFile = this.contentDir.clone();
            myCSSFile.append(myCSSFileName);
            sbCommonUtils.writeFile(myCSSFile, myCSS, charset);
            this.downloadRewriteFiles[this.item.id].push([myCSSFile, charset]);
        }
        return myHTMLFile.leafName;
    },

    saveFileInternal: function(aFileURL, aFileKey, aCaptureType, aCharset) {
        if ( !aFileKey ) aFileKey = "file" + Math.random().toString();
        var urlObj = sbCommonUtils.convertURLToObject(aFileURL);
        if ( !this.refURLObj ) {
            this.refURLObj = urlObj;
        }
        var newFileName = this.download(aFileURL, "HTML");
        if (newFileName) {
            if ( aCaptureType == "image" ) {
                var myHTML = '<html><head><meta charset="UTF-8"></head><body><img src="' + newFileName + '"></body></html>';
            } else {
                var myHTML = '<html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;URL=' + newFileName + '"></head><body></body></html>';
            }
            if ( this.isMainFrame ) {
                this.item.icon = "moz-icon://" + this.download(aFileURL) + "?size=16";
                this.item.type = aCaptureType;
                this.item.chars = aCharset || "";
            }
        } else {
            var myHTML = "";
        }
        var myHTMLFile = this.contentDir.clone();
        myHTMLFile.append(aFileKey + ".html");
        sbCommonUtils.writeFile(myHTMLFile, myHTML, "UTF-8");
        this.downloadRewriteFiles[this.item.id].push([myHTMLFile, "UTF-8"]);
        return myHTMLFile.leafName;
    },

    // aResName is null if it's not the main document of an indepth capture
    // set treeRes to the created resource or null if aResName is not defined
    addResource: function(aResName, aResIndex) {
        this.treeRes = null;
        if ( !aResName ) return;
        // We are during a capture process, temporarily set marked and no icon
        var [_type, _icon] = [this.item.type, this.item.icon];
        [this.item.type, this.item.icon] = ["marked", ""];
        this.treeRes = sbDataSource.addItem(this.item, aResName, aResIndex);
        [this.item.type, this.item.icon] = [_type, _icon];
        sbCommonUtils.rebuildGlobal();
        if ( "sbBrowserOverlay" in window ) sbBrowserOverlay.updateFolderPref(aResName);
    },


    getHeadNode: function(aNode) {
        var headNode = aNode.getElementsByTagName("head")[0];
        if (!headNode) {
            var elems = aNode.childNodes;
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
                    var url = aNode.src;
                    if ( this.option["images"] ) {
                        var fileName = this.download(url);
                        if (fileName) aNode.setAttribute("src", fileName);
                    } else if ( this.option["keepLink"] ) {
                        aNode.setAttribute("src", url);
                    } else {
                        aNode.setAttribute("src", this.getSkippedURL(url));
                    }
                }
                if ( aNode.hasAttribute("srcset") ) {
                    var that = this;
                    var newSrcset = this.parseSrcset(aNode.getAttribute("srcset"), function(url){
                        if ( that.option["internalize"] && that.isInternalized(url) ) return url;
                        var url = sbCommonUtils.resolveURL(that.refURLObj.spec, url);
                        if ( that.option["images"] ) {
                            var fileName = that.download(url);
                            if (fileName) return fileName;
                        } else if ( that.option["keepLink"] ) {
                            return url;
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
                    var url = aNode.src;
                    if ( this.option["media"] ) {
                        var fileName = this.download(url);
                        if (fileName) aNode.setAttribute("src", fileName);
                    } else if ( this.option["keepLink"] ) {
                        aNode.setAttribute("src", url);
                    } else {
                        aNode.setAttribute("src", this.getSkippedURL(url));
                    }
                }
                break;
            case "source":  // in <picture>, <audio> and <video>
                if ( aNode.hasAttribute("src") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("src")) ) break;
                    var url = aNode.src;
                    var type = (this.getSourceParentType(aNode) === "picture") ? "images" : "media";
                    if ( this.option[type] ) {
                        var fileName = this.download(url);
                        if (fileName) aNode.setAttribute("src", fileName);
                    } else if ( this.option["keepLink"] ) {
                        aNode.setAttribute("src", url);
                    } else {
                        aNode.setAttribute("src", this.getSkippedURL(url));
                    }
                }
                if ( aNode.hasAttribute("srcset") ) {
                    var that = this;
                    var type = (this.getSourceParentType(aNode) === "picture") ? "images" : "media";
                    var newSrcset = this.parseSrcset(aNode.getAttribute("srcset"), function(url){
                        if ( that.option["internalize"] && that.isInternalized(url) ) return url;
                        url = sbCommonUtils.resolveURL(that.refURLObj.spec, url);
                        if ( that.option[type] ) {
                            var fileName = that.download(url);
                            if (fileName) return fileName;
                        } else if ( that.option["keepLink"] ) {
                            return url;
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
                    var url = aNode.data;
                    if ( this.option["media"] ) {
                        var fileName = this.download(url);
                        if (fileName) aNode.setAttribute("data", fileName);
                    } else if ( this.option["keepLink"] ) {
                        aNode.setAttribute("data", url);
                    } else {
                        aNode.setAttribute("data", this.getSkippedURL(url));
                    }
                }
                break;
            case "applet": 
                if ( aNode.hasAttribute("archive") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("archive")) ) break;
                    var url = sbCommonUtils.resolveURL(this.refURLObj.spec, aNode.getAttribute("archive"));
                    if ( this.option["media"] ) {
                        var fileName = this.download(url);
                        if (fileName) aNode.setAttribute("archive", fileName);
                    } else if ( this.option["keepLink"] ) {
                        aNode.setAttribute("archive", url);
                    } else {
                        aNode.setAttribute("archive", this.getSkippedURL(url));
                    }
                }
                break;
            case "canvas":
                if ( this.option["media"] && !this.option["script"] ) {
                    var canvasOrig = this.elemMapOrig[aNode.getAttribute(this.elemMapKey)];
                    var canvasScript = aNode.ownerDocument.createElement("script");
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
                    var url = sbCommonUtils.resolveURL(this.refURLObj.spec, aNode.getAttribute("background"));
                    if ( this.option["images"] ) {
                        var fileName = this.download(url);
                        if (fileName) aNode.setAttribute("background", fileName);
                    } else if ( this.option["keepLink"] ) {
                        aNode.setAttribute("background", url);
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
                            var url = aNode.src;
                            if ( this.option["images"] ) {
                                var fileName = this.download(url);
                                if (fileName) aNode.setAttribute("src", fileName);
                            } else if ( this.option["keepLink"] ) {
                                aNode.setAttribute("src", url);
                            } else {
                                aNode.setAttribute("src", this.getSkippedURL(url));
                            }
                        }
                        break;
                }
                break;
            case "link": 
                // gets "" if rel attribute not defined
                switch ( aNode.rel.toLowerCase() ) {
                    case "stylesheet":
                        if ( this.option["internalize"] ) break;
                        if ( aNode.hasAttribute("href") ) {
                            var url = aNode.href;
                            if ( sbCommonUtils.getSbObjectType(aNode) == "stylesheet" ) {
                                // a special stylesheet used by scrapbook, keep it intact
                                // (it should use an absolute link or a chrome link, which don't break after capture)
                            } else if ( url.indexOf("chrome://") == 0 ) {
                                // a special stylesheet used by scrapbook or other addons/programs, keep it intact
                            } else if ( this.option["styles"] && this.option["rewriteStyles"] ) {
                                // capturing styles with rewrite, the style should be already processed
                                // in saveDocumentInternal => processCSSRecursively
                                // remove it here with safety
                                aNode.setAttribute("href", this.getReorganizedURL(url));
                                return;
                            } else if ( this.option["styles"] && !this.option["rewriteStyles"] ) {
                                // capturing styles with no rewrite, download it and rewrite the link
                                var fileName = this.download(url);
                                if (fileName) aNode.setAttribute("href", fileName);
                            } else if ( !this.option["styles"] && this.option["keepLink"] ) {
                                // link to the source css file
                                aNode.setAttribute("href", url);
                            } else if ( !this.option["styles"] && !this.option["keepLink"] ) {
                                // not capturing styles, set it blank
                                aNode.setAttribute("href", this.getSkippedURL(url));
                            }
                        }
                        break;
                    case "shortcut icon":
                    case "icon":
                        if ( aNode.hasAttribute("href") ) {
                            if ( this.option["internalize"] ) break;
                            var fileName = this.download(aNode.href);
                            if (fileName) {
                                aNode.setAttribute("href", fileName);
                                if ( this.isMainFrame && !this.favicon ) this.favicon = fileName;
                            }
                        }
                        break;
                    default:
                        if ( aNode.hasAttribute("href") ) {
                            if ( this.option["internalize"] ) break;
                            aNode.setAttribute("href", aNode.href);
                        }
                        break;
                }
                break;
            case "base": 
                if ( aNode.hasAttribute("href") ) {
                    if ( this.option["internalize"] ) break;
                    aNode.setAttribute("href", "");
                }
                break;
            case "style": 
                if ( sbCommonUtils.getSbObjectType(aNode) == "stylesheet" ) {
                    // a special stylesheet used by scrapbook, keep it intact
                } else if ( !this.option["styles"] && !this.option["keepLink"] ) {
                    // not capturing styles, remove it
                    aNode.textContent = "/* Code removed by ScrapBook */";
                    return;
                } else if ( this.option["rewriteStyles"] ) {
                    // capturing styles with rewrite, the styles should be already processed
                    // in saveDocumentInternal => processCSSRecursively
                    // remove it here with safety
                    aNode.textContent = "/* Code reorganized by ScrapBook */";
                    return;
                }
                break;
            case "script": 
                if ( this.option["script"] ) {
                    if ( aNode.hasAttribute("src") ) {
                        if ( this.option["internalize"] ) break;
                        var fileName = this.download(aNode.src);
                        if (fileName) aNode.setAttribute("src", fileName);
                    }
                } else {
                    if ( aNode.hasAttribute("src") ) {
                        var url = aNode.src;
                        aNode.setAttribute("src", this.getSkippedURL(url));
                    }
                    if (aNode.textContent) aNode.textContent = "/* Code removed by ScrapBook */";
                    return;
                }
                break;
            case "a": 
            case "area": 
                if ( this.option["internalize"] ) break;
                var url = aNode.href;
                if ( !url ) {
                    break;
                } else if ( url.match(/^javascript:/i) && !this.option["script"] ) {
                    aNode.removeAttribute("href");
                    break;
                }
                // adjustment for hash links targeting the current page
                var [urlMain, urlHash] = sbCommonUtils.splitURLByAnchor(url);
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
                    var hasLocalTarget = !this.selection;
                    if ( !hasLocalTarget ) {
                        var targetId = decodeURIComponent(urlHash.substr(1)).replace(/\W/g, '\\$&');
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
                    // if the URL matches the linkURLFilters (mostly meaning it's offending to visit)
                    // skip it for downLink or inDepth
                    if (!this.globalURLFilter(urlMain)) {
                        break;
                    }
                    if (this.option["downLinkMethod"] == 2) {
                        // check header and url extension
                        var fileName = this.download(url, null, true);
                        if (fileName) {
                            aNode.setAttribute("href", fileName);
                            break;
                        }
                    } else if (this.option["downLinkMethod"] == 1) {
                        // check url extension
                        var [, ext] = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(url));
                        if (this.downLinkFilter(ext)) {
                            var fileName = this.download(url);
                            if (fileName) {
                                aNode.setAttribute("href", fileName);
                                break;
                            }
                        }
                    }
                } else if ( url.indexOf("file:") === 0 ) {
                    // Download all non-HTML local files.
                    // This is primarily for the combine wizard to capture all "file:" data.
                    var mime = sbCommonUtils.getFileMime(sbCommonUtils.convertURLToFile(url));
                    if ( ["text/html", "application/xhtml+xml"].indexOf(mime) < 0 ) {
                        var fileName = this.download(url);
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
                if ( this.option["inDepth"] > 0 ) {
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
                            var url = sbCommonUtils.resolveURL(this.refURLObj.spec, aNode.getAttribute("content"));
                            aNode.setAttribute("content", url);
                            break;
                    }
                }
                if ( aNode.hasAttribute("http-equiv") ) {
                    switch ( aNode.getAttribute("http-equiv").toLowerCase() ) {
                        case "refresh":
                            if ( aNode.getAttribute("content").match(/^(\d+;\s*url=)(.*)$/i) ) {
                                var url = sbCommonUtils.resolveURL(this.refURLObj.spec, RegExp.$2);
                                aNode.setAttribute("content", RegExp.$1 + url);
                                // add to the link list if it's a work of deep capture
                                if ( this.option["inDepth"] > 0 ) this.linkURLs.push(url);
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
                    var tmpRefURL = this.refURLObj;
                    // retrieve contentDocument from the corresponding real frame
                    var idx = aNode.getAttribute(this.elemMapKey);
                    var newFileName = this.saveDocumentInternal(this.elemMapOrig[idx].contentDocument, this.documentName + "_" + (parseInt(idx)+1));
                    aNode.setAttribute("src", this.escapeURL(newFileName, null, true));
                    this.refURLObj = tmpRefURL;
                } else if ( this.option["keepLink"] ) {
                    aNode.setAttribute("src", aNode.src);
                } else {
                    aNode.setAttribute("src", this.getSkippedURL(aNode.src));
                }
                aNode.removeAttribute(this.elemMapKey);
                break;
        }
        if ( aNode.style && aNode.style.cssText ) {
            var newCSStext = this.inspectCSSText(aNode.style.cssText, this.refURLObj.spec, "image");
            if ( newCSStext ) aNode.setAttribute("style", newCSStext);
        }
        if ( !this.option["script"] ) {
            // general: remove on* attributes
            var attrs = aNode.attributes;
            for (var i = 0; i < attrs.length; i++) {
                if (attrs[i].name.toLowerCase().startsWith("on")) {
                    aNode.removeAttribute(attrs[i].name);
                    i--;  // removing an attribute shrinks the list
                }
            }
            // other specific
            aNode.removeAttribute("contextmenu");
        }
    },

    // replaceFunc = function (url) { return ...; }
    parseSrcset: function (srcset, replaceFunc) {
        return srcset.replace(/(\s*)([^ ,][^ ]*[^ ,])(\s*(?: [^ ,]+)?\s*(?:,|$))/g, function (m, m1, m2, m3) {
            return m1 + replaceFunc(m2) + m3;
        });
    },

    getSourceParentType: function (aSourceNode) {
        var node = aSourceNode.parentNode;
        while (node) {
            var nn = node.nodeName.toLowerCase();
            if (nn == "picture" || nn == "audio" || nn == "video") {
                return nn;
            }
            node = node.parentNode;
        }
        return false;
    },

    setCanvasData: function (data) {
      var scripts = document.getElementsByTagName("script");
      var script = scripts[scripts.length-1], canvas = script.previousSibling;
      var img = new Image();
      img.onload = function(){ canvas.getContext("2d").drawImage(img, 0, 0); };
      img.src = data;
      script.parentNode.removeChild(script);
    },

    processCSSRecursively: function(aCSS, aDocument, aIsImport) {
        // aCSS is invalid or disabled, skip it
        if (!aCSS || aCSS.disabled) return "";
        // a special stylesheet used by scrapbook, skip parsing it
        if (aCSS.ownerNode && sbCommonUtils.getSbObjectType(aCSS.ownerNode) == "stylesheet") return "";
        // a special stylesheet used by scrapbook or other addons/programs, skip parsing it
        if (aCSS.href && aCSS.href.startsWith("chrome:")) return "";
        var content = "";
        // sometimes <link> cannot access remote css
        // and aCSS.cssRules fires an error (instead of returning undefined)...
        // we need this try block to catch that
        var skip = false;
        try {
            if (!aCSS.cssRules) skip = true;
        } catch(ex) {
            sbCommonUtils.warn(sbCommonUtils.lang("ERR_FAIL_GET_CSS", aCSS.href, aDocument.location.href, ex));
                content += "/* ERROR: Unable to access this CSS */\n\n";
            skip = true;
        }
        if (!skip) content += this.processCSSRules(aCSS, aDocument.location.href, aDocument, "");
        var media = aCSS.media.mediaText;
        if (media) {
            // omit "all" since it's defined in the link tag
            if (media !== "all") {
                content = "@media " + media + " {\n" + content + "}\n";
            }
            media = " (@media " + media + ")";
        }
        if (aCSS.href) {
            if (!aIsImport) {
                content = "/* ::::: " + aCSS.href + media + " ::::: */\n\n" + content;
            } else {
                content = "/* ::::: " + "(import) " + aCSS.href + media + " ::::: */\n" + content + "/* ::::: " + "(end import)" + " ::::: */\n";
            }
        } else {
            content = "/* ::::: " + "[internal]" + media + " ::::: */\n\n" + content;
        }
        return content;
    },

    processCSSRules: function(aCSS, aRefURL, aDocument, aIndent) {
        var content = "";
        // if aCSS is a rule set of an external CSS file, use its URL as reference
        var refURL = aCSS.href || aRefURL;
        Array.forEach(aCSS.cssRules, function(cssRule) {
            switch (cssRule.type) {
                case Components.interfaces.nsIDOMCSSRule.IMPORT_RULE: 
                    content += this.processCSSRecursively(cssRule.styleSheet, aDocument, true);
                    break;
                case Components.interfaces.nsIDOMCSSRule.FONT_FACE_RULE: 
                    var cssText = aIndent + this.inspectCSSText(cssRule.cssText, refURL, "font");
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
                    if (this.option["script"] || verifySelector(aDocument, cssRule.selectorText)) {
                        var cssText = aIndent + this.inspectCSSText(cssRule.cssText, refURL, "image");
                        if (cssText) content += cssText + "\n";
                    }
                    break;
                default: 
                    var cssText = aIndent + this.inspectCSSText(cssRule.cssText, refURL, "image");
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
                var hasPseudo = false;
                var startPseudo = false;
                var depseudoSelectors = [""];
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

    inspectCSSText: function(aCSSText, aRefURL, aType) {
        var that = this;
        // CSS get by .cssText is always url("something-with-\"double-quote\"-escaped")
        // and no CSS comment is in, so we can parse it safely with this RegExp.
        var regex = / url\(\"((?:\\.|[^"])+)\"\)/g;
        aCSSText = aCSSText.replace(regex, function() {
            var dataURL = arguments[1];
            if (dataURL.startsWith("data:") && !that.option["saveDataURI"]) return ' url("' + dataURL + '")';
            if ( that.option["internalize"] && that.isInternalized(dataURL) ) return ' url("' + dataURL + '")';
            dataURL = sbCommonUtils.resolveURL(aRefURL, dataURL);
            switch (aType) {
                case "image":
                    if (that.option["images"]) {
                        var dataFile = that.download(dataURL, "quote");
                        if (dataFile) dataURL = dataFile;
                    } else if (!that.option["keepLink"]) {
                        dataURL = that.getSkippedURL(dataURL);
                    }
                    break;
                case "font":
                    if (that.option["fonts"]) {
                        var dataFile = that.download(dataURL, "quote");
                        if (dataFile) dataURL = dataFile;
                    } else if (!that.option["keepLink"]) {
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
    // aIsLinkFilter is specific for download link filter, can be omitted
    //
    // return "": means no download happened (should no change the url)
    // return <sourceURL>: deep capture for latter rewrite via sbCrossLinker (must have identical url)
    // return "urn:scrapbook-download:<hash>": when download starts
    // return "urn:scrapbook-download-error:<sourceURL>": when download error detected
    // return <fileName>: a download happen, or used an already downloaded file
    download: function(aURLSpec, aEscapeType, aIsLinkFilter) {
        if ( !aURLSpec ) return "";
        var sourceURL = aURLSpec;
        var that = this;

        var errorHandler = function(ex) {
            // crop to prevent large dataURI masking the exception info, especially dataURIs
            sourceURL = sbCommonUtils.crop(sourceURL, 1024);
            if (sourceURL.startsWith("file:")) {
                var msgType = "ERR_FAIL_COPY_FILE";
            } else if (sourceURL.startsWith("data:")) {
                var msgType = "ERR_FAIL_WRITE_FILE";
            } else {
                var msgType = "ERR_FAIL_DOWNLOAD_FILE";
            }
            var errURL = "urn:scrapbook-download-error:" + sourceURL;
            sbCommonUtils.error(sbCommonUtils.lang(msgType, sourceURL, ex));
            if (hashKey) that.downloadRewriteMap[that.item.id][hashKey] = that.escapeURL(errURL, aEscapeType);
            return errURL;
        };

        try {
            if ( sourceURL.startsWith("http:") || sourceURL.startsWith("https:") || sourceURL.startsWith("ftp:") ) {
                var targetDir = that.option["internalize"] ? that.option["internalize"].parent : that.contentDir.clone();
                var hashKey = sbCommonUtils.getUUID();
                var fileName, isDuplicate;
                that.httpTask[that.item.id]++;
                try {
                    var channel = sbCommonUtils.newChannel(sourceURL);
                    channel.asyncOpen({
                        _stream: null,
                        _file: null,
                        _skipped: false,
                        onStartRequest: function (aRequest, aContext) {
                            try {
                                // if header Content-Disposition is defined, use it
                                try {
                                    fileName = aRequest.contentDispositionFilename;
                                    var [, ext] = sbCommonUtils.splitFileName(fileName);
                                } catch (ex) {}
                                // if no ext defined, try header Content-Type
                                if (!fileName) {
                                    var [base, ext] = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(aRequest.name));
                                    if (!ext) {
                                        try {
                                            ext = sbCommonUtils.getMimePrimaryExtension(aRequest.contentType, ext) || "dat";
                                        } catch (ex) {}
                                    }
                                    fileName = base + "." + ext;
                                }
                                // apply the filter
                                if (aIsLinkFilter) {
                                    var toDownload = that.downLinkFilter(ext);
                                    if (!toDownload) {
                                        if ( that.option["inDepth"] > 0 ) {
                                            // do not copy, but add to the link list if it's a work of deep capture
                                            that.linkURLs.push(sourceURL);
                                        }
                                        that.downloadRewriteMap[that.item.id][hashKey] = that.escapeURL(sourceURL, aEscapeType);
                                        this._skipped = true;
                                        channel.cancel(Components.results.NS_BINDING_ABORTED);
                                        return;
                                    }
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
                                    this._stream.close
                                }
                                if (!this._skipped && aStatusCode != Components.results.NS_OK) {
                                    // download failed, remove the file and use the original URL
                                    if (this._file) this._file.remove(true);
                                    throw "download channel fail";
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
                                    var ostream = Components.classes['@mozilla.org/network/file-output-stream;1']
                                            .createInstance(Components.interfaces.nsIFileOutputStream);
                                    ostream.init(this._file, -1, 0666, 0);
                                    var bostream = Components.classes['@mozilla.org/network/buffered-output-stream;1']
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
                var sourceFile = sbCommonUtils.convertURLToFile(sourceURL);
                if (!sourceFile.exists()) throw sourceURL + " does not exist";
                if (!sourceFile.isFile()) throw sourceURL + " is not a file";
                // determine the filename
                var targetDir = that.option["internalize"] ? that.option["internalize"].parent : that.contentDir.clone();
                var fileName, isDuplicate;
                fileName = sbCommonUtils.getFileName(sourceURL);
                // if the target file exists and has same content as the source file, skip copy
                // This kind of duplicate is probably a result of Firefox making a relative link absolute
                // during a copy/cut.
                fileName = sbCommonUtils.validateFileName(fileName);
                var targetFile = targetDir.clone(); targetFile.append(fileName);
                if (sbCommonUtils.compareFiles(sourceFile, targetFile)) {
                    return that.escapeURL(fileName, aEscapeType, true);
                }
                // check for duplicate
                [fileName, isDuplicate] = that.getUniqueFileName(fileName, sourceURL);
                if (isDuplicate) return that.escapeURL(fileName, aEscapeType, true);
                // set task
                that.httpTask[that.item.id]++;
                var item = that.item;
                setTimeout(function(){ that.onDownloadComplete(item); }, 0);
                // do the copy
                sourceFile.copyTo(targetDir, fileName);
                return that.escapeURL(fileName, aEscapeType, true);
            } else if ( sourceURL.startsWith("data:") ) {
                // download "data:" only if option on
                if (!that.option["saveDataURI"]) {
                    return "";
                }
                var { mime, charset, base64, data } = sbCommonUtils.parseDataURI(sourceURL);
                var dataURIBytes = base64 ? atob(data) : decodeURIComponent(data); // in bytes
                // use sha1sum as the filename
                var dataURIFileName = sbCommonUtils.sha1(dataURIBytes, "BYTES") + "." + (sbCommonUtils.getMimePrimaryExtension(mime, null) || "dat");
                var targetDir = that.option["internalize"] ? that.option["internalize"].parent : that.contentDir.clone();
                var fileName, isDuplicate;
                // if the target file exists and has same content as the dataURI, skip copy
                fileName = dataURIFileName;
                var targetFile = targetDir.clone(); targetFile.append(fileName);
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
                var item = that.item;
                setTimeout(function(){ that.onDownloadComplete(item); }, 0);
                // do the save
                var targetFile = targetDir.clone(); targetFile.append(fileName);
                sbCommonUtils.writeFileBytes(targetFile, dataURIBytes);
                return that.escapeURL(fileName, aEscapeType, true);
            }
        } catch (ex) {
            return errorHandler(ex);
        }
        return "";
    },

    downLinkFilter: function(aFileExt) {
        var that = this;
        // use cache if the filter is not changed
        if (arguments.callee._filter !== that.option["downLinkFilter"]) {
            arguments.callee._filter = that.option["downLinkFilter"];
            arguments.callee.filters = (function () {
                var ret = [];
                that.option["downLinkFilter"].split(/[\r\n]/).forEach(function (line) {
                    if (line.charAt(0) === "#") return;
                    line = line.trim();
                    if (line === "") return;
                    try {
                        var regex = new RegExp("^(?:" + line + ")$", "i");
                        ret.push(regex);
                    } catch (ex) {}
                });
                return ret;
            })();
        }
        var toDownload = arguments.callee.filters.some(function (filter) {
            return filter.test(aFileExt);
        });
        return toDownload;
    },

    globalURLFilter: function (aURL) {
        var that = this;
        // use the cache if the filter is not changed
        if (arguments.callee._filter !== that.option["linkURLFilters"]) {
            arguments.callee._filter = that.option["linkURLFilters"];
            arguments.callee.filters = (function () {
                try {
                    var filters = [];
                    var dataStr = that.option["linkURLFilters"];
                    var data = JSON.parse(dataStr);
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
        var toForbid = arguments.callee.filters.some(function (filter) {
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
        var newFileName = sbCommonUtils.validateFileName(aSuggestFileName || "untitled");
        var [newFileBase, newFileExt] = sbCommonUtils.splitFileName(newFileName);
        newFileBase = sbCommonUtils.crop(newFileBase, 128, 240);
        newFileExt = newFileExt || "dat";
        var sourceURL = sbCommonUtils.splitURLByAnchor(aSourceURL)[0];
        var sourceDoc = aSourceDoc;

        // CI means case insensitive
        var seq = 0;
        newFileName = newFileBase + "." + newFileExt;
        var newFileNameCI = newFileName.toLowerCase();
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
                var keyFileBase = sbCommonUtils.splitFileName(keyFileName)[0];
                arguments.callee.fileBase2URL[keyFileBase] = this.file2URL[keyFileName];
            }
        }
        var newFileName = sbCommonUtils.validateFileName(aSuggestFileName || "untitled");
        var [newFileBase, newFileExt] = sbCommonUtils.splitFileName(newFileName);
        newFileBase = "index";
        newFileExt = (newFileExt || "dat").toLowerCase();
        var sourceURL = sbCommonUtils.splitURLByAnchor(aSourceURL)[0];
        var sourceDoc = aSourceDoc;

        // CI means case insensitive
        var seq = 0;
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
        var that = this;
        return content.replace(/urn:scrapbook-download:([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})/g, function (match, key) {
            var url = that.downloadRewriteMap[that.item.id][key];
            // This could happen when a web page really contains a content text in our format.
            // We return the original text for keys not defineded in the map to prevent a bad replace
            // since it's nearly impossible for them to hit on the hash keys we are using.
            if (!url) return match;
            return url;
        });
    },

    // get the skipped form for specific cases we handled in another way
    getReorganizedURL: function (url) {
        if (url.indexOf("http:") === 0 || url.indexOf("https:") === 0 || url.indexOf("ftp:") === 0 || url.indexOf("file:") === 0) {
            return "urn:scrapbook-download-reorganized:" + url;
        }
        return url;
    },

    // get the skipped form for specific protocol that we do not handle
    getSkippedURL: function (url) {
        if (url.startsWith("http:") || url.startsWith("https:") || url.startsWith("ftp:") || url.startsWith("file:")) {
            return "urn:scrapbook-download-skip:" + url;
        }
        return url;
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
        this.trace(sbCommonUtils.lang("CAPTURE", this.httpTask[aItem.id], aItem.title), 0);
    },

    onAllDownloadsComplete: function(aItem) {
        // restore downloaded file names
        this.downloadRewriteFiles[aItem.id].forEach(function (data) {
            var [file, charset] = data;
            var content = sbCommonUtils.readFile(file, charset);
            content = this.restoreFileNameFromHash(content);
            sbCommonUtils.writeFile(file, content, charset);
        }, this);

        // fix resource settings after capture complete
        // If it's an indepth capture, this.treeRes will be null for non-main documents,
        // and thus we don't have to update the resource for many times.
        var res = this.treeRes;
        if (res && sbDataSource.exists(res)) {
            sbDataSource.setProperty(res, "type", aItem.type);
            if ( this.favicon ) {
                aItem.icon = this.favicon;
            }
            // We replace the "urn:scrapbook-download:*" and skip adding "resource://" to prevent an issue
            // for URLs containing ":", such as "moz-icon://".
            if (aItem.icon) {
                aItem.icon = this.restoreFileNameFromHash(aItem.icon);
                if (aItem.icon.indexOf(":") >= 0) {
                    var iconURL = aItem.icon;
                } else {
                    var iconURL = "resource://scrapbook/data/" + aItem.id + "/" + aItem.icon;
                }
                sbDataSource.setProperty(res, "icon", iconURL);
            }
            sbCommonUtils.rebuildGlobal();
            sbCommonUtils.writeIndexDat(aItem);
        }

        if ( this.option["inDepth"] > 0 && this.linkURLs.length > 0 ) {
            // inDepth capture for "capture-again-deep" is pre-disallowed by hiding the options
            // and should never occur here
            if ( !this.presetData || this.context == "capture-again" ) {
                this.item.type = "marked";
                var data = {
                    urls: this.linkURLs,
                    refUrl: this.refURLObj.spec,
                    showDetail: false,
                    resName: null,
                    resIdx: 0,
                    referItem: this.item,
                    option: this.option,
                    file2Url: this.file2URL,
                    preset: null,
                    titles: null,
                    context: "indepth",
                };
                window.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,dialog=no", data);
            } else {
                for ( var i = 0; i < this.linkURLs.length; i++ ) {
                    sbCaptureTask.add(this.linkURLs[i], this.presetData[4] + 1);
                }
            }
        }

        this.trace(sbCommonUtils.lang("CAPTURE_COMPLETE", aItem.title), 5000);
        this.onCaptureComplete(aItem);
    },

    onDownloadProgress: function(aItem, aFileName, aProgress) {
        this.trace(sbCommonUtils.lang("DOWNLOAD_DATA", aFileName, sbCommonUtils.formatFileSize(aProgress)), 0);
    },

    onCaptureComplete: function(aItem) {
        sbContentSaver.notifyCaptureComplete(aItem);
    },

};


