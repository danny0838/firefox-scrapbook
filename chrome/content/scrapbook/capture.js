
var gContentSaver = new sbContentSaverClass();
var gURLs = [];
var gTitles = [];
var gDepths = [];
var gRefURL = "";
var gShowDetail = false;
var gResName = "";
var gResIdx = 0;
var gReferItem = null;
var gOption = gContentSaver.option;
var gFile2URL = {};
var gURL2Name = {};
var gPreset = null;
var gContext = "";




function SB_trace(aMessage) {
    document.getElementById("sbCaptureTextbox").value = aMessage;
}

/**
 * Receive data from other script opening capture.xul
 *
 * data:
 *   urls:        array    strings, each is a full URL to capture 
 *   refUrl:      string   reference URL, mainly to resolve relative links
 *   showDetail:  bool     show detail or not
 *   resName:     string   the resource name to add
 *   resIdx:      string   the index to insert resource
 *   referItem:   string   (deep-capture, re-capture) the refer item,
 *                         determine where to save file and to set resource property
 *   option:      object   capture options, replace the default option in saver.js
 *                         Those more relavant here are:
 *                           inDepth:
 *                           internalize:
 *   file2Url:    array    the file2URL data in saver.js from last capture,
 *                         will then pass to saver.js for next capture
 *   preset:      array    (re-capture) the preset data,
 *                         will pass to saver.js for each capture,
 *                         generally this will overwrite data
 *                           [0]   string   id of resource
 *                           [1]   string   file name to save
 *                           [2]   string   overwrites data.option if set
 *                           [3]   array    overwrites data.file2Url if set
 *                           [4]   int      limits depth of capture
 *                           [5]   bool     true if is a bookmark, will reset resource type to "" (page)
 *   titles:      array    (multi-capture) strings, overwrite the resource title,
 *                         each entry corresponds with data.urls
 *   context      string   the capture context, determines the behavior
 *                           "bookmark": (seems unused, obsolete?)
 *                           "capture": capture the browser window (not used here)
 *                           "link": load a page to capture
 *                           "indepth": capture a page and pages linked by
 *                           "capture-again": capture a page and overwrite the current resource,
 *                                            prompts a new capture.js in indepth if deep capture
 *                           "capture-again-deep": capture a page other than index.html
 *                                                 do not allow deep capture
 */
function SB_initCapture() {
    var data = window.arguments[0];

    // deprecated, left for downward compatibility with old style call by addons
    if (window.arguments.length > 1) {
        var data = {
            urls: window.arguments[0],
            refUrl: window.arguments[1],
            showDetail: window.arguments[2],
            resName: window.arguments[3],
            resIdx: window.arguments[4],
            referItem: window.arguments[5],
            option: window.arguments[6],
            file2Url: window.arguments[7],
            preset: window.arguments[8],
            // method: window.arguments[9],  // we no more use this
            // charset: window.arguments[10],  // we no more use this
            // timeout: window.arguments[11],  // we no more use this
            titles: window.arguments[12],
        };
        data.context = (function(){
            if ( data.referItem ) {
                return "indepth";
            } else if ( data.preset ) {
                return data.preset[1] == "index" ? "capture-again" : "capture-again-deep";
            }
            return "link";
        })();
    }

    var myURLs = data.urls;
    gTitles = data.titles || gTitles;
    gRefURL = data.refUrl || gRefURL;
    gShowDetail = !!data.showDetail;
    gResName = data.resName || gResName;
    gResIdx = data.resIdx || gResIdx;
    gReferItem = data.referItem || gReferItem;
    gOption = data.option ? sbCommonUtils.extendObject(gOption, data.option) : gOption;
    gFile2URL = data.file2Url || gFile2URL;
    gPreset = data.preset || gPreset;
    gContext = data.context || gContext;

    // handle specific contexts
    if ( gContext == "indepth" ) {
        gURL2Name[sbCommonUtils.normalizeURI(gReferItem.source)] = "index";
    } else if ( gContext == "capture-again-deep" ) {
        myURLs = null;
        var contDir = sbCommonUtils.getContentDir(gPreset[0]);
        // read sb-file2url.txt => gFile2URL for later usage
        var file = contDir.clone(); file.append("sb-file2url.txt");
        if ( !(file.exists() && file.isFile()) ) {
            sbCommonUtils.alert(sbCommonUtils.lang("ERR_NO_FILE2URL"));
            window.close();
        }
        sbCommonUtils.readFile(file, "UTF-8").split("\n").forEach(function (line) {
            var [file, url] = line.split("\t", 2);
            if (url) {
                gFile2URL[file] = url;
            }
        });
        gPreset[3] = gFile2URL;
        // read sb-url2name.txt => gURL2Name and search for source URL of the current page
        var file = contDir.clone(); file.append("sb-url2name.txt");
        if ( !(file.exists() && file.isFile()) ) {
            sbCommonUtils.alert(sbCommonUtils.lang("ERR_NO_URL2NAME"));
            window.close();
        }
        sbCommonUtils.readFile(file, "UTF-8").split("\n").forEach(function (line) {
            var [url, docName] = line.split("\t", 2);
            if (docName) {
                gURL2Name[sbCommonUtils.normalizeURI(url)] = docName;
                if ( docName == gPreset[1] ) myURLs = [url];
            }
        });
        if ( !myURLs ) {
            sbCommonUtils.alert(sbCommonUtils.lang("ERR_NO_SOURCE_URL", gPreset[1] + ".html."));
            window.close();
        }
    }

    // use passed timeout and charset (mostly for indepth)
    if (gOption["batchTimeout"]) {
        document.getElementById("sbCaptureTimeout").value = gOption["batchTimeout"];
    }
    if (gOption["batchCharset"]) {
        document.getElementById("sbCaptureCharset").value = gOption["batchCharset"];
    }

    // start capture
    sbInvisibleBrowser.init();
    sbCaptureTask.init(myURLs);
    // link: 1 or more item (> 1 for multiple capture)
    // capture-again, capture-again-deep: 1 item
    // in-depth: 1 or more item, but it's possible that new items be added if depth >= 2
    if ( gURLs.length == 1 && gContext != "indepth" && !gShowDetail ) {
        sbCaptureTask.start();
    } else {
        document.getElementById("sbCaptureWindow").className = "complex";
        sbCaptureTask.seconds = -1;
        sbCaptureTask.toggleStartPause(false);
    }
}


function SB_suggestName(aURL) {
    var tmpName = sbCommonUtils.splitFileName(sbCommonUtils.validateFileName(sbCommonUtils.getFileName(aURL)))[0];
    if ( !tmpName || tmpName == "index" ) tmpName = "default";
    var name = tmpName, seq = 0;
    while ( gFile2URL[(name+".html").toLowerCase()] ) name = tmpName + "_" + sbCommonUtils.pad(++seq, 3);
    return name;
}


function SB_fireNotification(aItem) {
    var win = sbCommonUtils.getBrowserWindow();
    win.sbContentSaver.notifyCaptureComplete(aItem);
}




var sbCaptureTask = {

    get INTERVAL() { return parseInt(document.getElementById("sbCaptureTimeout").value, 10); },
    get CHARSET()  { return document.getElementById("sbCaptureCharset").value; },
    get TREE()     { return document.getElementById("sbCaptureUrlList"); },
    get URL()      { return gURLs[this.index]; },

    index: 0,
    redirectHash: null,
    sniffer: null,
    seconds: 3,
    timerID: 0,
    forceExit: 0,
    failed: 0,
    lastItem: null,

    init: function(myURLs) {
        var depth = (gContext == "indepth" ? 1 : 0);
        for ( var i = 0, I = myURLs.length; i < I; i++ ) {
            this.add(myURLs[i], depth, gTitles[i]);
        }
    },

    add: function(aURL, aDepth, aTitle) {
        if ( !aURL.match(/^(http|https|ftp|file):\/\//i) ) return;
        if ( gContext == "indepth" ) {
            if ( aDepth > gOption["inDepth"] ) {
                return;
            }
            aURL = sbCommonUtils.splitURLByAnchor(aURL)[0];
            if ( !gOption["isPartial"] && aURL == gReferItem.source ) return;
            if ( gURLs.indexOf(aURL) != -1 ) return;
        }
        gURLs.push(aURL);
        gDepths.push(aDepth);
        var wrapper = this.TREE.childNodes[1];
        var item = document.createElement("treeitem");
        wrapper.appendChild(item);
        var row = document.createElement("treerow");
        item.appendChild(row);
        var cell0 = document.createElement("treecell");
        cell0.setAttribute("value", sbCaptureFilter.filter(aURL));
        row.appendChild(cell0);
        var cell1 = document.createElement("treecell");
        cell1.setAttribute("label", aDepth + " [" + (gURLs.length - 1) + "] " + aURL);
        row.appendChild(cell1);
        var cell2 = document.createElement("treecell");
        cell2.setAttribute("label", aTitle || "");
        row.appendChild(cell2);
        var cell3 = document.createElement("treecell");
        row.appendChild(cell3);
    },

    // start capture
    start: function(aRedirectURL) {
        this.seconds = -1;

        // mark the item we are currently on
        this.TREE.childNodes[1].childNodes[this.index].childNodes[0].setAttribute("properties", "selected");
        this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[0].setAttribute("properties", "disabled");
        var checkstate = this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[0].getAttribute("value");
        if ( checkstate.match("false") ) {
            document.getElementById("sbCaptureProgress").value = (this.index+1)+" \/ "+gURLs.length;
            this.TREE.childNodes[1].childNodes[this.index].childNodes[0].setAttribute("properties", "finished");
            this.next(true);
            return;
        }

        // manage redirect and fail out on circular redirect
        if (!aRedirectURL) {
            var url = gURLs[this.index];
            this.redirectHash = {};
        } else {
            if (!this.redirectHash[sbCommonUtils.normalizeURI(aRedirectURL)]) {
                var url = aRedirectURL;
            } else {
                var errMsg = "Circular redirect";
                this.updateStatus(errMsg);
                this.fail(errMsg);
                return;
            }
        }
        this.redirectHash[sbCommonUtils.normalizeURI(url)] = true;

        // if active, start connection and capture
        SB_trace(sbCommonUtils.lang("CONNECT", url));
        if (this.isActive()) {
            this.sniffer = new sbHeaderSniffer(url, gRefURL);
            this.sniffer.checkURL();
        }
    },

    updateStatus: function(aStatus) {
        this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[3].setAttribute("label", aStatus);
    },

    // when a capture completes successfully
    succeed: function() {
        document.getElementById("sbCaptureProgress").value = (this.index+1)+" \/ "+gURLs.length;
        this.TREE.childNodes[1].childNodes[this.index].childNodes[0].setAttribute("properties", "finished");
        this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[2].setAttribute("label", gTitles[this.index] || "");
        this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[3].setAttribute("properties", "success");
        if (!this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[3].hasAttribute("label")) {
            this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[3].setAttribute("label", "OK");
        }
        this.next(false);
    },

    // when a capture fails
    fail: function(aErrorMsg) {
        this.failed++;
        document.getElementById("sbCaptureProgress").value = (this.index+1)+" \/ "+gURLs.length;
        if ( aErrorMsg ) SB_trace(aErrorMsg);
        this.TREE.childNodes[1].childNodes[this.index].childNodes[0].setAttribute("properties", "finished");
        this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[3].setAttribute("properties", "failed");
        if (!this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[3].hasAttribute("label")) {
            this.TREE.childNodes[1].childNodes[this.index].childNodes[0].childNodes[3].setAttribute("label", "ERROR");
        }
        this.next(true);
    },

    // press "skip" button
    // shift to next item
    next: function(quickly) {
        // Resume "skip" button, which is temporarily diasbled
        // when a capture is already executed (rather than waiting for connection)
        this.toggleSkipButton(true);

        if ( ++this.index < gURLs.length ) {
            if ( quickly || this.URL.startsWith("file:") ) {
                window.setTimeout(function(){ sbCaptureTask.start(); }, 0);
            } else {
                this.seconds = this.INTERVAL;
                sbCaptureTask.countDown();
            }
        } else {
            this.finalize();
        }
    },

    countDown: function() {
        SB_trace(sbCommonUtils.lang("WAITING", sbCaptureTask.seconds));
        if (document.getElementById("sbCaptureStartButton").hidden) {
            if ( this.seconds > 0 ) {
                this.seconds--;
                this.timerID = window.setTimeout(function(){ sbCaptureTask.countDown(); }, 1000);
            } else {
                this.timerID = window.setTimeout(function(){ sbCaptureTask.start(); }, 0);
            }
        }
    },

    finalize: function() {
        document.getElementById("sbCaptureTextbox").disabled = false;
        document.getElementById("sbCapturePauseButton").disabled = true;
        document.getElementById("sbCapturePauseButton").hidden = false;
        document.getElementById("sbCaptureStartButton").hidden = true;
        document.getElementById("sbCaptureCancelButton").hidden = true;
        document.getElementById("sbCaptureFinishButton").hidden = false;
        document.getElementById("sbCaptureSkipButton").disabled = true;
        window.clearTimeout(this.timerID);
        if ( gContext == "indepth" ) {
            sbCrossLinker.invoke();
        } else {
            // multiple capture
            if ( gURLs.length > 1 ) {
                SB_fireNotification(null);
            // link, capture-again, capture-again-deep, internalize
            // make sure we have at least one item downloaded successfully
            } else if (this.lastItem) {
                if ( gContext == "capture-again" || gContext == "capture-again-deep" ) {
                    if ( gContext == "capture-again" ) {
                        var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + gPreset[0]);
                        sbDataSource.setProperty(res, "title", this.lastItem.title);
                        if ( gPreset[5] ) {
                            // converts bookmark to normal
                            sbDataSource.setProperty(res, "type", "");
                        }
                        sbDataSource.setProperty(res, "chars", this.lastItem.chars);
                    }
                    sbCrossLinker.forceReloading(gPreset[0], gPreset[1]);
                } else if ( gContext == "internalize" ) {
                    sbCrossLinker.forceReloadingURL(sbCommonUtils.convertFileToURL(gOption.internalize));
                }
                SB_fireNotification(this.lastItem);
            }

            // Close the window only if all selected pages can be downloaded
            if ( this.failed == 0 ) this.closeWindow();
        }
    },

    closeWindow: function() {
        window.setTimeout(function(){ window.close(); }, 1000);
    },

    // press "start" button
    activate: function() {
        this.toggleStartPause(true);
        this.countDown();
    },

    // press "pause" button
    pause: function() {
        this.toggleStartPause(false);
        if ( this.seconds < 0 ) {
            if ( this.sniffer ) this.sniffer.cancel();
            sbInvisibleBrowser.cancel();
        } else {
            this.seconds++;
            window.clearTimeout(this.timerID);
        }
    },

    // press "cancel" button
    abort: function() {
        if ( gContext != "indepth" ) window.close();
        if ( ++this.forceExit >= 2 ) window.close();

        // remember the current active state because it would be interfered by UI changing
        var wasActive = this.isActive();

        // set UI, generally same as finalize
        document.getElementById("sbCaptureTextbox").disabled = false;
        document.getElementById("sbCapturePauseButton").disabled = true;
        document.getElementById("sbCapturePauseButton").hidden = false;
        document.getElementById("sbCaptureStartButton").hidden = true;
        document.getElementById("sbCaptureCancelButton").hidden = true;
        document.getElementById("sbCaptureFinishButton").hidden = false;
        document.getElementById("sbCaptureSkipButton").disabled = true;

        if (wasActive) {
            this.next = this.finalize; // mark to finalize on next capture
        } else {
            this.finalize();
        }
    },

    isActive: function () {
        return this.seconds < 0 && document.getElementById("sbCaptureStartButton").hidden;
    },

    toggleFilterBox: function(tfbEvent) {
        //Blendet die Filterdetails an/aus

        var tfbChecked = true;
        tfbChecked = document.getElementById("sbCaptureFilterToggle").checked;
        if ( tfbEvent ) {
            if ( tfbEvent.button == 0 ) {
                if ( tfbChecked ) {
                    tfbChecked = false;
                } else {
                    tfbChecked = true;
                }
            }
        }
        document.getElementById("sbCaptureFilterBox").hidden = !tfbChecked;
    },

    toggleStartPause: function(allowPause) {
        document.getElementById("sbCapturePauseButton").hidden = !allowPause;
        document.getElementById("sbCaptureStartButton").hidden =  allowPause;
        document.getElementById("sbCaptureTextbox").disabled = !allowPause;
    },

    toggleSkipButton: function(willEnable) {
        document.getElementById("sbCaptureSkipButton").disabled = !willEnable;
    },

    toggleSelection: function(willCheck) {
        this.getSelection().forEach(function(index){
            this.TREE.childNodes[1].childNodes[index].childNodes[0].childNodes[0].setAttribute("value", willCheck);
        }, this);
    },

    getSelection: function() {
        var ret = [];
        for ( var rc = 0; rc < this.TREE.view.selection.getRangeCount(); rc++ ) {
            var start = {}, end = {};
            this.TREE.view.selection.getRangeAt(rc, start, end);
            for ( var i = start.value; i <= end.value; i++ ) {
                ret.push(i);
            }
        }
        return ret;
    },

    _captureWindow: function(aWindow, aAllowPartial) {
        // update info
        SB_trace(sbCommonUtils.lang("SAVE_START"));

        // Disable "Skip" directive before the capture because we cannot reliably terminate
        // a capture process once it's started, and it would result in partial saved files.
        this.toggleSkipButton(false);

        // start capture
        if (gPreset) {
            var preset = gPreset;
        } else if (gReferItem) {
            var preset = [gReferItem.id, SB_suggestName(aWindow.location.href), gOption, gFile2URL, gDepths[this.index]];
        } else {
            var preset = [];
        }
        // pass current timeout and charset to saver so that a potential indepth capture can use them
        preset[2] = preset[2] || {};
        preset[2]["batchTimeout"] = sbCaptureTask.INTERVAL;
        preset[2]["batchCharset"] = sbCaptureTask.CHARSET;

        var ret = gContentSaver.captureWindow(aWindow, aAllowPartial, gShowDetail, gResName, gResIdx, preset, gContext, gTitles[this.index]);
        if ( ret ) {
            if ( gContext == "indepth" ) {
                gURL2Name[sbCommonUtils.normalizeURI(this.URL)] = ret[0];
                gFile2URL = ret[1];
            } else if ( gContext == "capture-again-deep" ) {
                gFile2URL = ret[1];
                var contDir = sbCommonUtils.getContentDir(gPreset[0]);
                var txtFile = contDir.clone();
                txtFile.append("sb-file2url.txt");
                var txt = "";
                for ( var f in gFile2URL ) txt += f + "\t" + gFile2URL[f] + "\n";
                sbCommonUtils.writeFile(txtFile, txt, "UTF-8");
            }
            gTitles[this.index] = ret[2];
        } else {
            if ( gShowDetail ) window.close();
            SB_trace(sbCommonUtils.lang("SAVE_ABORT"));
            this.fail("");
        }
    },
};

var sbCaptureFilter = {
    filterList: [],
    ruleList: [],
    filterEdited: -1,  // index of the audited filter

    // Add a new filter or modify an existing one
    add: function() {
        var filterDuplIdx = -1;
        var filterNew = document.getElementById("sbCaptureFilterInput").value;
        var ruleNew = document.getElementById("sbCaptureFilterRule").label;
        // 1. Confirm the filter is valid
        try {
            new RegExp(filterNew);
        } catch(ex) {
            alert(sbCommonUtils.lang("ERR_INAVLID_REGEXP", filterNew));
            return;
        }
        // 2. Browse the filter list for an identical entry
        if ( this.filterEdited == -1 ) {
            filterDuplIdx = this.filterList.indexOf(filterNew);
        }
        // 3. Update filter list
        if ( filterDuplIdx == -1 ) {
            var wrapper = document.getElementById("sbCaptureFilter").childNodes[1];
            if ( this.filterEdited == -1 ) {
                // add a new filter
                var item = document.createElement("treeitem");
                wrapper.appendChild(item);
                var row = document.createElement("treerow");
                item.appendChild(row);
                var cell0 = document.createElement("treecell");
                cell0.setAttribute("label", ruleNew);
                row.appendChild(cell0);
                var cell1 = document.createElement("treecell");
                cell1.setAttribute("label", filterNew);
                row.appendChild(cell1);
                this.ruleList.push(ruleNew);
                this.filterList.push(filterNew);
            } else {
                // update an existing filter
                wrapper.childNodes[this.filterEdited].childNodes[0].childNodes[0].setAttribute("label", ruleNew);
                wrapper.childNodes[this.filterEdited].childNodes[0].childNodes[1].setAttribute("label", filterNew);
                this.ruleList[this.filterEdited] = ruleNew;
                this.filterList[this.filterEdited] = filterNew;
                this.filterEdited = -1;
            }
        }
        // 4. Update selection
        this.updateSelection();
        // 5. Finalize
        document.getElementById("sbCaptureFilterInput").value = "";
        document.getElementById("sbCaptureFilterAccept").disabled = true;
        document.getElementById("sbCaptureFilterCancel").disabled = true;
        document.getElementById("sbCaptureFilterDelete").disabled = true;
    },

    // Cancel edit of the selected entry
    cancel: function() {
        this.filterEdited = -1;
        document.getElementById("sbCaptureFilterInput").value = "";
        document.getElementById("sbCaptureFilterAccept").disabled = true;
        document.getElementById("sbCaptureFilterCancel").disabled = true;
        document.getElementById("sbCaptureFilterDelete").disabled = true;
    },

    // Delete the selected filter
    del: function() {
        // 1. Remove item from Array
        this.ruleList.splice(this.filterEdited, 1);
        this.filterList.splice(this.filterEdited, 1);
        // 2. Remove entry from file
        var wrapper = document.getElementById("sbCaptureFilter").childNodes[1];
        sbCommonUtils.removeNode(wrapper.childNodes[this.filterEdited]);
        // 3. Update selection
        this.updateSelection();
        // 4. Finalize
        this.filterEdited = -1;
        document.getElementById("sbCaptureFilterInput").value = "";
        document.getElementById("sbCaptureFilterAccept").disabled = true;
        document.getElementById("sbCaptureFilterCancel").disabled = true;
        document.getElementById("sbCaptureFilterDelete").disabled = true;
    },

    // Prepare to edit or delete a filter
    selectFilter: function() {
        // 1. Determine the position of the selected entry
        this.filterEdited = document.getElementById("sbCaptureFilter").currentIndex;
        // 2. Select the entry and allow editing
        if ( this.filterEdited > -1 ) {
            if ( this.ruleList[this.filterEdited] == "Include" ) {
                document.getElementById("sbCaptureFilterRule").selectedIndex = 0;
            } else {
                document.getElementById("sbCaptureFilterRule").selectedIndex = 1;
            }
            document.getElementById("sbCaptureFilterInput").value = this.filterList[this.filterEdited];
            document.getElementById("sbCaptureFilterAccept").disabled = true;
            document.getElementById("sbCaptureFilterCancel").disabled = false;
            document.getElementById("sbCaptureFilterDelete").disabled = false;
        }
    },

    // Apply filters to the URL
    // the URL must pass all filters
    filter: function(url) {
        for ( var i=0, I=this.filterList.length; i<I; i++ ) {
            if ( this.ruleList[i] == "Include" ) {
                if ( !url.match(sbCaptureFilter.filterList[i]) ) return false;
            } else {
                if ( url.match(sbCaptureFilter.filterList[i]) ) return false;
            }
        }
        return true;
    },

    // If text is available, enabled the OK button; otherwise disabled it
    input: function() {
        var iText = document.getElementById("sbCaptureFilterInput").value;
        if ( iText.length > 0 ) {
            document.getElementById("sbCaptureFilterAccept").disabled=false;
        } else {
            document.getElementById("sbCaptureFilterAccept").disabled=true;
        }
    },

    // Update the content of the current selection
    updateSelection: function() {
        var wrapper = document.getElementById("sbCaptureUrlList").childNodes[1];
        for ( var i=sbCaptureTask.index, I=gURLs.length; i<I; i++ ) {
            var checked = this.filter(gURLs[i]);
            wrapper.childNodes[i].childNodes[0].childNodes[0].setAttribute("value", checked);
        }
    },

};

var sbInvisibleBrowser = {

    get ELEMENT() {
        delete this.ELEMENT;
        return this.ELEMENT = document.getElementById("sbCaptureBrowser");
    },
    get STATE_START() {
        delete this.STATE_START;
        return this.STATE_START = Components.interfaces.nsIWebProgressListener.STATE_START;
    },
    get STATE_LOADED() {
        delete this.STATE_LOADED;
        return this.STATE_LOADED = Components.interfaces.nsIWebProgressListener.STATE_STOP | Components.interfaces.nsIWebProgressListener.STATE_IS_NETWORK | Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW;
    },
    
    _eventListener: {
        QueryInterface: function(aIID) {
            if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
                aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
                aIID.equals(Components.interfaces.nsIXULBrowserWindow) ||
                aIID.equals(Components.interfaces.nsISupports))
                return this;
            throw Components.results.NS_NOINTERFACE;
        },

        onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
            if ( aStateFlags & sbInvisibleBrowser.STATE_START ) {
                sbInvisibleBrowser.fileCount++;
                sbInvisibleBrowser.onLoadStart.call(sbInvisibleBrowser);
            } else if ( (aStateFlags & sbInvisibleBrowser.STATE_LOADED) === sbInvisibleBrowser.STATE_LOADED && aStatus == 0 ) {
                if (aRequest.name === sbInvisibleBrowser.ELEMENT.currentURI.spec) {
                    sbInvisibleBrowser.onLoadFinish.call(sbInvisibleBrowser);
                }
            }
        },

        onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
            if ( aCurTotalProgress != aMaxTotalProgress ) {
                SB_trace(sbCommonUtils.lang("TRANSFER_DATA", aCurTotalProgress));
            }
        },

        onStatusChange: function() {},
        onLocationChange: function() {},
        onSecurityChange: function() {},
    },

    fileCount: 0,

    init: function(aLoadMedia) {
        try {
            this.ELEMENT.removeProgressListener(this._eventListener, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
        } catch(ex) {
        }
        this.ELEMENT.addProgressListener(this._eventListener, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
        this.ELEMENT.docShell.allowImages = !!aLoadMedia;
        // allowMedia is supported since Firefox 24
        try {
            this.ELEMENT.docShell.allowMedia = !!aLoadMedia;
        } catch(ex) {}
        this.ELEMENT.docShell.allowSubframes = gOption["frames"];
        this.ELEMENT.docShell.allowJavascript = false;  // javascript error will freeze up capture process
        this.ELEMENT.docShell.allowMetaRedirects = false;  // we'll handle meta redirect in another way
        // nsIDocShellHistory is deprecated in newer version of Firefox
        // nsIDocShell in the old version doesn't work
        if ( Components.interfaces.nsIDocShellHistory ) {
            this.ELEMENT.docShell.QueryInterface(Components.interfaces.nsIDocShellHistory).useGlobalHistory = false;
        } else if ( Components.interfaces.nsIDocShell ) {
            this.ELEMENT.docShell.QueryInterface(Components.interfaces.nsIDocShell).useGlobalHistory = false;
        } else {
            this.ELEMENT.docShell.useGlobalHistory = false;
        }
    },

    load: function(aURL, aCharset) {
        this.fileCount = 0;
        // Firefox < 12.0 use nsIDocCharset instead of nsIDocShell
        if (aCharset) {
            if (Components.interfaces.nsIDocCharset) {
                this.ELEMENT.docShell.QueryInterface(Components.interfaces.nsIDocCharset).charset = aCharset;
            } else {
                this.ELEMENT.docShell.charset = aCharset;
            }
        }
        this.ELEMENT.loadURI(aURL, null, null);
        // if aURL is different from the current URL only in hash,
        // a loading is not performed unless forced to reload
        if (this.ELEMENT.currentURI.specIgnoringRef == sbCommonUtils.splitURLByAnchor(aURL)[0]) this.ELEMENT.reload();
    },

    cancel: function() {
        this.ELEMENT.stop();
    },

    onLoadStart: function() {
        SB_trace(sbCommonUtils.lang("LOADING", this.fileCount, (this.ELEMENT.currentURI.spec || this.ELEMENT.contentDocument.title)));
    },
    
    onLoadFinish: function() {
        // check for a potential meta refresh redirect
        if ( this.ELEMENT.contentDocument.body ) {
            var metaElems = this.ELEMENT.contentDocument.getElementsByTagName("meta");
            for ( var i = 0; i < metaElems.length; i++ ) {
                if ( metaElems[i].hasAttribute("http-equiv") && metaElems[i].hasAttribute("content") &&
                     metaElems[i].getAttribute("http-equiv").toLowerCase() == "refresh" && 
                     metaElems[i].getAttribute("content").match(/URL\=(.*)$/i) ) {
                    var curURL = this.ELEMENT.currentURI.spec;
                    var newURL = sbCommonUtils.resolveURL(this.ELEMENT.currentURI.spec, RegExp.$1);
                    sbCaptureTask.start(newURL);
                    return;
                }
            }
        }
        // capture the window
        sbCaptureTask._captureWindow(this.ELEMENT.contentWindow, false);
    },

};




var sbCrossLinker = {

    get ELEMENT(){ return document.getElementById("sbCaptureBrowser"); },

    index: -1,
    baseURL: "",
    nameList: [],

    XML: null,
    rootNode: null,
    nodeHash: {},

    invoke: function() {
        sbDataSource.setProperty(sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + gReferItem.id), "type", "site");
        sbInvisibleBrowser.onLoadStart = function() {
            SB_trace(sbCommonUtils.lang("REBUILD_LINKS", sbCrossLinker.index + 1, sbCrossLinker.nameList.length, this.fileCount, sbCrossLinker.nameList[sbCrossLinker.index] + ".html"));
        };
        sbInvisibleBrowser.onLoadFinish = function() {
            sbCrossLinker.exec();
        };
        this.baseURL = sbCommonUtils.IO.newFileURI(sbCommonUtils.getContentDir(gReferItem.id)).spec;
        for ( var url in gURL2Name ) {
            this.nameList.push(gURL2Name[url]);
        }
        // For a partial capture containing a link to self, the index may be overwritten and not exist
        // Add it to prevent further error
        if (this.nameList[0] != "index") this.nameList.unshift("index");
        this.XML = document.implementation.createDocument("", "", null);
        this.rootNode = this.XML.createElement("site");
        this.start();
    },

    start: function() {
        if ( ++this.index < this.nameList.length ) {
            var url = this.baseURL + encodeURIComponent(this.nameList[this.index]) + ".html";
            sbInvisibleBrowser.load(url);
        } else {
            SB_trace(sbCommonUtils.lang("REBUILD_LINKS_COMPLETE"));
            this.flushXML();
            SB_fireNotification(gReferItem);
            // Close the window only if all selected pages can be downloaded
            if ( sbCaptureTask.failed == 0 ) {
                sbCaptureTask.closeWindow();
            } else {
                document.getElementById("sbCaptureSkipButton").hidden = true;
                document.getElementById("sbCapturePauseButton").hidden = true;
                document.getElementById("sbCaptureCancelButton").hidden = true;
                document.getElementById("sbCaptureFinishButton").hidden = false;
            }
        }
    },

    exec: function() {
        if ( this.ELEMENT.currentURI.scheme != "file" ) {
            return;
        }
        // follow the meta refresh (mainly for ###.html --> ###.xhtml)
        if ( this.ELEMENT.contentDocument.body ) {
            var curURL = this.ELEMENT.currentURI.spec;
            var metaElems = this.ELEMENT.contentDocument.getElementsByTagName("meta");
            for ( var i = 0; i < metaElems.length; i++ ) {
                if ( metaElems[i].hasAttribute("http-equiv") && metaElems[i].hasAttribute("content") &&
                     metaElems[i].getAttribute("http-equiv").toLowerCase() == "refresh" && 
                     metaElems[i].getAttribute("content").match(/URL\=(.*)$/i) ) {
                    var newURL = sbCommonUtils.splitURLByAnchor(sbCommonUtils.resolveURL(curURL, RegExp.$1))[0];
                    if ( newURL != curURL ) {
                        sbInvisibleBrowser.load(newURL);
                        return;
                    }
                }
            }
        }
        if ( !this.nodeHash[this.nameList[this.index]] ) {
            // Error message could be intercepted using query. 
            // However, the demolition at this point may also be desirable (Research!)
            this.nodeHash[this.nameList[this.index]] = this.createNode(this.nameList[this.index], (gReferItem) ? gReferItem.title : "");
        }
        this.nodeHash[this.nameList[this.index]].setAttribute("title", sbDataSource.sanitize(this.ELEMENT.contentTitle) || sbCommonUtils.getFileName(this.ELEMENT.currentURI.spec));
        sbCommonUtils.flattenFrames(this.ELEMENT.contentWindow).forEach(function(win) {
            var doc = win.document;
            var shouldSave = false;
            Array.prototype.forEach.call(doc.links, function(link) {
                var [url, hash] = sbCommonUtils.splitURLByAnchor(link.href);
                var name = gURL2Name[sbCommonUtils.normalizeURI(url)];
                if ( name ) {
                    link.href = sbCommonUtils.escapeFileName(name) + ".html" + hash;
                    if (gOption["recordInDepthLink"]) {
                        link.setAttribute("data-sb-indepth", "true");
                    }
                    if ( !this.nodeHash[name] ) {
                        var text = link.textContent;
                        text = (!/^\s*$/.test(text)) ? text.replace(/[\t\r\n\v\f]/g, " ") : "";
                        this.nodeHash[name] = this.createNode(name, text);
                        this.nodeHash[this.nameList[this.index]].appendChild(this.nodeHash[name]);
                    }
                    shouldSave = true;
                }
            }, this);
            if ( shouldSave ) {
                var rootNode = doc.getElementsByTagName("html")[0];
                var src = sbCommonUtils.doctypeToString(doc.doctype) + sbCommonUtils.surroundByTags(rootNode, rootNode.innerHTML);
                var file = sbCommonUtils.getContentDir(gReferItem.id);
                file.append(sbCommonUtils.getFileName(doc.location.href));
                sbCommonUtils.writeFile(file, src, doc.characterSet);
            }
        }, this);
        this.forceReloading(gReferItem.id, this.nameList[this.index]);
        this.start();
    },

    createNode: function(aName, aText) {
        aText = sbCommonUtils.crop(aText, 150, 180);
        //Fehlermeldung könnte über Abfrage abgefangen werden.
        //Allerdings kann der Abbruch an dieser Stelle auch erwünscht sein (Nachforschungen!)
        var node = this.XML.createElement("page");
        node.setAttribute("file", sbCommonUtils.escapeFileName(aName) + ".html");
        node.setAttribute("text", sbDataSource.sanitize(aText));
        return node;
    },

    flushXML: function() {
        this.rootNode.appendChild(this.nodeHash["index"]);
        this.XML.appendChild(this.rootNode);
        var src = "";
        src += '<?xml version="1.0" encoding="UTF-8"?>\n';
        src += '<?xml-stylesheet href="../../sitemap.xsl" type="text/xsl" media="all"?>\n';
        src += (new XMLSerializer()).serializeToString(this.XML).replace(/></g, ">\n<");
        src += '\n';
        var xslFile = sbCommonUtils.getScrapBookDir().clone();
        xslFile.append("sitemap.xsl");
        if ( !xslFile.exists() ) sbCommonUtils.saveTemplateFile("chrome://scrapbook/skin/sitemap.xsl", xslFile);
        var contDir = sbCommonUtils.getContentDir(gReferItem.id);
        var xmlFile = contDir.clone();
        xmlFile.append("sitemap.xml");
        sbCommonUtils.writeFile(xmlFile, src, "UTF-8");
        var txt = "";
        var txtFile1 = contDir.clone();
        txtFile1.append("sb-file2url.txt");
        for ( var f in gFile2URL ) txt += f + "\t" + gFile2URL[f] + "\n";
        sbCommonUtils.writeFile(txtFile1, txt, "UTF-8");
        txt = "";
        var txtFile2 = contDir.clone();
        txtFile2.append("sb-url2name.txt");
        for ( var u in gURL2Name ) txt += u + "\t" + gURL2Name[u] + "\n";
        sbCommonUtils.writeFile(txtFile2, txt, "UTF-8");
    },

    forceReloading: function(aID, aName) {
        var file = sbCommonUtils.getContentDir(aID);
        file.append(aName + ".html");
        var url = sbCommonUtils.convertFileToURL(file);
        this.forceReloadingURL(url);
    },

    forceReloadingURL: function(aURL) {
        try {
            var win = sbCommonUtils.getBrowserWindow();
            var nodes = win.gBrowser.mTabContainer.childNodes;
            for ( var i = 0; i < nodes.length; i++ ) {
                var uri = win.gBrowser.getBrowserForTab(nodes[i]).currentURI.spec;
                uri = sbCommonUtils.splitURLByAnchor(uri)[0];
                if ( uri == aURL ) {
                    win.gBrowser.getBrowserForTab(nodes[i]).reload();
                }
            }
        } catch(ex) {
        }
    },

};




function sbHeaderSniffer(aURLSpec, aRefURLSpec) {
    this._eventListener._sniffer = this;
    this.URLSpec = aURLSpec;
    this.refURLSpec = aRefURLSpec;
}


sbHeaderSniffer.prototype = {

    _channel: null,
    _headers: null,
    _eventListener: {
        _sniffer: null,
        onDataAvailable: function(aRequest, aContext, aInputStream, aOffset, aCount) {},
        onStartRequest: function(aRequest, aContext) {},
        onStopRequest: function(aRequest, aContext, aStatus) {
            var that = this._sniffer;

            // show connect success
            var contentType = that.getContentType() || "";
            SB_trace(sbCommonUtils.lang("CONNECT_SUCCESS", contentType));

            // get and show http status
            var [statusCode, statusText] = that.getStatus();
            if ( statusCode !== false) {
                sbCaptureTask.updateStatus(statusCode + " " + statusText);
                if ( statusCode >= 400 && statusCode < 600 || statusCode == 305 ) {
                    that.reportError(statusCode + " " + statusText);
                    return;
                }
            } else {
                sbCaptureTask.updateStatus("???");
                // got no status code, do nothing (continue parsing HTML)
            }

            // manage redirect if defined
            var redirectURL = that.getHeader("Location");
            if ( redirectURL ) {
                redirectURL = sbCommonUtils.resolveURL(that.URLSpec, redirectURL);
                sbCaptureTask.start(redirectURL);
                return;
            }

            // attempt to load the content
            var isAttachment = that.getContentDisposition();
            that.load(that.URLSpec, contentType, isAttachment);
        },
    },

    checkURL: function() {
        if (this.URLSpec.startsWith("file:")) {
            this.checkLocalFile(this.URLSpec);
        } else {
            this.checkHttpHeader(this.URLSpec, this.refURLSpec);
        }
    },

    checkLocalFile: function(URL) {
        var file = sbCommonUtils.convertURLToFile(URL);
        if (!(file.exists() && file.isFile() && file.isReadable())) {
            this.reportConnectError("Can't access");
            return;
        }
        var mime = sbCommonUtils.getFileMime(file);
        this.load(URL, mime);
    },

    checkHttpHeader: function(URL, refURL) {
        this._channel = null;
        try {
            this._channel = sbCommonUtils.newChannel(URL).QueryInterface(Components.interfaces.nsIHttpChannel);
            this._channel.loadFlags = this._channel.LOAD_BYPASS_CACHE;
            this._channel.setRequestHeader("User-Agent", navigator.userAgent, false);
            if ( refURL ) this._channel.setRequestHeader("Referer", refURL, false);
        } catch(ex) {
            this.reportConnectError("Invalid URL");
            return;
        }
        try {
            this._channel.requestMethod = "HEAD";
            this._channel.asyncOpen(this._eventListener, this);
        } catch(ex) {
            this.reportConnectError(ex);
        }
    },

    getHeader: function(aHeader) {
         try { return this._channel.getResponseHeader(aHeader); } catch(ex) { return ""; }
    },

    getStatus: function() {
        try {
            return [this._channel.responseStatus, this._channel.responseStatusText];
        } catch(ex) {
            return [false, ""];
        }
    },

    getContentType: function() {
        try {
            return this._channel.contentType;
        } catch(ex) {}
        return null;
    },

    // 1 if it is an attachment, null otherwise
    getContentDisposition: function() {
        try {
            return this._channel.contentDisposition;
        } catch(ex) {}
        return null;
    },

    load: function(URL, contentType, isAttachment) {
        contentType = contentType || "text/html";
        if (!isAttachment && ["text/html", "application/xhtml+xml"].indexOf(contentType) >= 0) {
            // for inline html or xhtml files, load the document and capture it
            sbInvisibleBrowser.load(URL, sbCaptureTask.CHARSET);
        } else if (gContext == "link") {
            // capture as file for link capture
            var refURL = this.refURLSpec || sbCaptureTask.URL;
            gContentSaver.captureFile(URL, refURL, "file", gShowDetail, gResName, gResIdx, null, gContext);
        } else if (gContext == "indepth") {
            // in an indepth capture, files with defined extensions are pre-processed and is not send to the URL list
            // those who go here are undefined files, and should be skipped
            sbCaptureTask.next(true);
        } else {
            // sbCommonUtils.error("Non-HTML under undefined context: " + gContext);
        }
    },

    cancel: function() {
        if (this._channel) this._channel.cancel(Components.results.NS_BINDING_ABORTED);
    },

    reportConnectError: function(aErrorMsg) {
        this.reportError(sbCommonUtils.lang("CONNECT_FAILURE", aErrorMsg), aErrorMsg);
    },

    reportError: function(aErrorMsg, aStatus) {
        if (!aStatus) aStatus = aErrorMsg;
        sbCaptureTask.updateStatus(aStatus);
        sbCaptureTask.fail(aErrorMsg);
    },

};




gContentSaver.trace = function(aText) {
    SB_trace(aText);
};

gContentSaver.onCaptureComplete = function(aItem) {
    sbCaptureTask.lastItem = aItem;
    sbCaptureTask.succeed();
};


