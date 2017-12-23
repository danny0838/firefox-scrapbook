
let sbCombineService = {


    get WIZARD()  { return document.getElementById("sbCombineWizard"); },
    get LISTBOX() { return document.getElementById("sbCombineListbox"); },
    get curID()   { return this.idList[this.index]; },
    get curRes()  { return this.resList[this.index]; },


    index: 0,
    idList: [],
    resList: [],
    parList: [],
    option: {},
    prefix: "",
    postfix: "",

    init: function() {
        this.toggleElements(true);
        if ( window.top.location.href != "chrome://scrapbook/content/manage.xul" ) {
            document.documentElement.collapsed = true;
            return;
        }
        window.top.document.getElementById("mbToolbarButton").disabled = true;
        this.index = 0;
        sbFolderSelector2.init();
        this.WIZARD.getButton("back").hidden = true;
        this.WIZARD.getButton("cancel").onclick = function(){ sbCombineService.abort(); };
        this.toggleButtons();
        this.updateButtons();
    },

    done: function() {
        window.top.document.getElementById("mbToolbarButton").disabled = false;
    },

    add: function(aRes, aParRes) {
        if ( this.resList.indexOf(aRes) != -1 ) return;
        let type = sbDataSource.getProperty(aRes, "type");
        if (type == "folder" || type == "separator") return;
        let icon = sbDataSource.getProperty(aRes, "icon");
        if ( !icon ) icon = sbCommonUtils.getDefaultIcon(type);
        let listItem = this.LISTBOX.appendItem(sbDataSource.getProperty(aRes, "title"));
        listItem.setAttribute("class", "listitem-iconic");
        listItem.setAttribute("image", icon);
        this.idList.push(sbDataSource.getProperty(aRes, "id"));
        this.resList.push(aRes);
        this.parList.push(aParRes);
        this.toggleButtons();
        this.updateButtons();
    },

    updateButtons: function() {
        this.WIZARD.canRewind = this.idList.length > 0;
        this.WIZARD.canAdvance = this.idList.length > 1;
    },

    initPreview: function() {
        // generate default tree icons
        // borrow the tree folder
        let dir = sbCommonUtils.getScrapBookDir().clone(); dir.append("tree");
        if ( !dir.exists() ) dir.create(dir.DIRECTORY_TYPE, 0700);
        let urlHash = {
            "chrome://scrapbook/skin/treeitem.png": "treeitem.png",
            "chrome://scrapbook/skin/treenote.png": "treenote.png",
            "chrome://scrapbook/skin/treenotex.png": "treenotex.png",
        };
        for ( let url in urlHash ) {
            let destFile = dir.clone(); destFile.append(urlHash[url]);
            sbCommonUtils.saveTemplateFile(url, destFile);
        }

        this.WIZARD.canAdvance = false;
        this.WIZARD.getButton("back").hidden = false;
        this.WIZARD.getButton("back").disabled = true;
        this.WIZARD.getButton("finish").label = sbCommonUtils.lang("FINISH_BUTTON_LABEL");
        this.WIZARD.getButton("finish").disabled = true;
        this.WIZARD.getButton("cancel").hidden = false;
        this.WIZARD.getButton("cancel").disabled = true;
        this.option["T"] = document.getElementById("sbTitleTextbox").value;
        this.option["R"] = document.getElementById("sbCombineOptionRemove").checked;

        // reset the variables to prevent double-charged content when reloaded
        sbPageCombiner.htmlSrc = "";
        sbPageCombiner.cssText = "";
        sbPageCombiner.hasSite = false;

        sbInvisibleBrowser.init(true); // load embeded media so that they aren't broken when previewing
        sbInvisibleBrowser.onLoadFinish = function() {
            sbPageCombiner.exec();
        };

        this.next();
    },

    next: function() {
        if ( this.index < this.idList.length ) {
            this.prefix = "(" + (this.index + 1) + "/" + this.idList.length + ") ";
            this.postfix = sbDataSource.getProperty(this.resList[this.index], "title");
            let type = sbDataSource.getProperty(this.resList[this.index], "type");
            if  ( type == "file" || type == "bookmark" ) {
                sbPageCombiner.exec(type);
            } else {
                sbPageCombiner.refreshHash = {};
                sbInvisibleBrowser.load(sbCommonUtils.getBaseHref(sbDataSource.data.URI) + "data/" + this.curID + "/index.html");
            }
        } else {
            this.prefix = "";
            this.postfix = "combine.html";
            this.donePreview();
        }
    },

    donePreview: function() {
        let htmlFile = sbCommonUtils.getScrapBookDir();
        htmlFile.append("combine.html");
        sbCommonUtils.writeFile(htmlFile, sbPageCombiner.htmlSrc, "UTF-8");
        let cssFile = sbCommonUtils.getScrapBookDir();
        cssFile.append("combine.css");
        sbCommonUtils.writeFile(cssFile, sbPageCombiner.cssText, "UTF-8");
        sbInvisibleBrowser.onLoadFinish = function() {
            sbCombineService.showBrowser();
        };
        sbInvisibleBrowser.load(sbCommonUtils.convertFileToURL(htmlFile));
    },

    showBrowser: function() {
        this.toggleElements(false);
        sbInvisibleBrowser.ELEMENT.onclick = function(aEvent){ aEvent.preventDefault(); };
        this.WIZARD.getButton("back").disabled = false;
        this.WIZARD.getButton("finish").disabled = false;
        this.WIZARD.getButton("finish").onclick = function(){ sbCombineService.finish(); };
        this.WIZARD.getButton("cancel").disabled = false;
    },

    abort: function() {
        this.WIZARD.getButton("back").disabled = true;
        this.WIZARD.getButton("finish").disabled = true;
        this.WIZARD.getButton("cancel").disabled = true;
        setTimeout(function() {
            window.top.sbManageService.toggleRightPane("sbToolbarCombine");
        }, 500);
    },

    finish: function() {
        this.WIZARD.getButton("finish").disabled = true;
        this.WIZARD.getButton("cancel").disabled = true;
        this.option["R"] = document.getElementById("sbCombineOptionRemove").checked;
        this.toggleElements(true);
        SB_trace(sbCommonUtils.lang("SAVE_START"));
        setTimeout(function(){ gContentSaver.captureWindow(sbInvisibleBrowser.ELEMENT.contentWindow, false, false, sbFolderSelector2.resURI, 0, null, "combine"); }, 0);
    },

    toggleElements: function(isProgressMode) {
        sbInvisibleBrowser.ELEMENT.collapsed = isProgressMode;
        document.getElementById("sbCaptureTextbox").collapsed = !isProgressMode;
    },

    onCombineComplete: function(aItem) {
        let newRes = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + aItem.id);
        sbDataSource.setProperty(newRes, "type", "combine");
        sbDataSource.setProperty(newRes, "source", sbDataSource.getProperty(this.resList[0], "source"));
        let newIcon = sbDataSource.getProperty(this.resList[0], "icon");
        if ( newIcon.startsWith("resource://scrapbook/data/") ) newIcon = "resource://scrapbook/data/" + aItem.id + "/" + sbCommonUtils.getFileName(newIcon);
        sbDataSource.setProperty(newRes, "icon", newIcon);
        let newComment = "";
        for ( let i = 0; i < this.resList.length; i++ ) {
            let comment = sbDataSource.getProperty(this.resList[i], "comment");
            if ( comment ) newComment += comment + " __BR__ ";
        }
        if ( newComment ) sbDataSource.setProperty(newRes, "comment", newComment);
        return newRes;
    },

    onKeyPress: function(aEvent) {
        let shortcut = sbShortcut.fromEvent(aEvent);
        if ( shortcut.toString() == "Delete") {
            this.deleteItem();
        } else if (shortcut.toString() == "Alt+Up") {
            this.moveUp();
        } else if (shortcut.toString() == "Alt+Down") {
            this.moveDown();
        }
    },

    onDragOver: function(event) {
        if (event.dataTransfer.types.contains("moz/rdfitem")) {
            event.preventDefault();
        }
    },

    onDrop: function(event) {
        event.preventDefault();
        let th = window.top.sbTreeHandler;
        th.getComplexSelection(
            event.dataTransfer.getData("moz/rdfitem").split("\n").map(function(resValue){
                return sbCommonUtils.RDF.GetResource(resValue);
            }),
            0
        ).forEach(function(res) {
            let resIdx = th.TREE.builderView.getIndexOfResource(res);
            let parRes = (resIdx >= 0) ? th.getParentResource(resIdx) : sbDataSource.findParentResource(res);
            sbCombineService.add(res, parRes);
        });
    },

    deleteItem: function() {
        let diIndex = this.LISTBOX.selectedIndex;
        if (diIndex < 0) return; // no select
        this.LISTBOX.removeItemAt(diIndex);
        this.idList.splice(diIndex, 1);
        this.resList.splice(diIndex, 1);
        this.parList.splice(diIndex, 1);
        if (this.LISTBOX.getRowCount() > 0) {
            let diNewItem = this.LISTBOX.getItemAtIndex(diIndex) || this.LISTBOX.getItemAtIndex(--diIndex);
            this.LISTBOX.ensureElementIsVisible(diNewItem);
            this.LISTBOX.selectItem(diNewItem);
            this.LISTBOX.focus();
        }
        this.toggleButtons();
        this.updateButtons();
    },

    moveDown: function() {
        let mdIndex = this.LISTBOX.selectedIndex;
        if (mdIndex < 0 || mdIndex == this.LISTBOX.getRowCount() - 1) return; // no select, or at bottom
        [this.idList[mdIndex], this.idList[mdIndex+1]] = [this.idList[mdIndex+1], this.idList[mdIndex]];
        [this.resList[mdIndex], this.resList[mdIndex+1]] = [this.resList[mdIndex+1], this.resList[mdIndex]];
        [this.parList[mdIndex], this.parList[mdIndex+1]] = [this.parList[mdIndex+1], this.parList[mdIndex]];
        let mdItem = this.LISTBOX.removeItemAt(mdIndex);
        let mdNewItem = this.LISTBOX.insertItemAt( mdIndex+1, mdItem.getAttribute("label") );
        mdNewItem.setAttribute("class", "listitem-iconic");
        mdNewItem.setAttribute("image", mdItem.getAttribute("image"));
        this.LISTBOX.ensureElementIsVisible(mdNewItem);
        this.LISTBOX.selectItem(mdNewItem);
        this.LISTBOX.focus();
        this.toggleButtons();
    },

    moveUp: function() {
        let muIndex = this.LISTBOX.selectedIndex;
        if (muIndex <= 0) return; // no select, or at top
        [this.idList[muIndex], this.idList[muIndex-1]] = [this.idList[muIndex-1], this.idList[muIndex]];
        [this.resList[muIndex], this.resList[muIndex-1]] = [this.resList[muIndex-1], this.resList[muIndex]];
        [this.parList[muIndex], this.parList[muIndex-1]] = [this.parList[muIndex-1], this.parList[muIndex]];
        let muItem = this.LISTBOX.removeItemAt(muIndex);
        let muNewItem = this.LISTBOX.insertItemAt( muIndex-1, muItem.getAttribute("label") );
        muNewItem.setAttribute("class", "listitem-iconic");
        muNewItem.setAttribute("image", muItem.getAttribute("image"));
        this.LISTBOX.ensureElementIsVisible(muNewItem);
        this.LISTBOX.selectItem(muNewItem);
        this.LISTBOX.focus();
        this.toggleButtons();
    },

    toggleButtons: function() {
        let index = this.LISTBOX.selectedIndex;
        let entry = this.LISTBOX.getRowCount();
        if ( entry > 1 ) {
            switch ( index ) {
                case -1:
                    document.getElementById("sbUp").disabled = true;
                    document.getElementById("sbDown").disabled = true;
                    document.getElementById("sbDelete").disabled = true;
                    break;
                case 0:
                    document.getElementById("sbUp").disabled = true;
                    document.getElementById("sbDown").disabled = false;
                    document.getElementById("sbDelete").disabled = false;
                    break;
                case entry - 1:
                    document.getElementById("sbUp").disabled = false;
                    document.getElementById("sbDown").disabled = true;
                    document.getElementById("sbDelete").disabled = false;
                    break;
                default:
                    document.getElementById("sbUp").disabled = false;
                    document.getElementById("sbDown").disabled = false;
                    document.getElementById("sbDelete").disabled = false;
                    break;
            }
        } else {
            document.getElementById("sbUp").disabled = true;
            document.getElementById("sbDown").disabled = true;
            if ( index > -1 ) {
                document.getElementById("sbDelete").disabled = false;
            } else {
                document.getElementById("sbDelete").disabled = true;
            }
        }
    },
};




let sbPageCombiner = {

    get BROWSER(){ return document.getElementById("sbCaptureBrowser"); },
    get BODY()   { return this.BROWSER.contentDocument.body; },

    htmlSrc: "",
    cssText: "",
    isTargetCombined: false,
    hasSite: false,
    baseURI: "",
    htmlId: "",
    bodyId: "",
    refreshHash: null,

    exec: function(aType) {
        // check for meta refresh
        let metaElems = this.BROWSER.contentDocument.getElementsByTagName("meta");
        for ( let i = 0; i < metaElems.length; i++ ) {
            if ( metaElems[i].hasAttribute("http-equiv") && metaElems[i].hasAttribute("content") &&
                 metaElems[i].getAttribute("http-equiv").toLowerCase() == "refresh" && 
                 metaElems[i].getAttribute("content").match(/URL\=(.*)$/i) ) {
                let curURL = this.BROWSER.currentURI.spec;
                let newURL = sbCommonUtils.resolveURL(curURL, RegExp.$1);
                if ( newURL != curURL && !this.refreshHash[newURL] ) {
                    this.refreshHash[curURL] = true;
                    sbInvisibleBrowser.load(newURL);
                    return;
                }
            }
        }

        this.isTargetCombined = false;
        let anchor = this.BROWSER.contentDocument.createElement("a");
        anchor.href = "";
        this.baseURI = anchor.href;
        if ( sbCombineService.index == 0 ) {
            if (!sbCombineService.option["T"]) {
                sbCombineService.option["T"] = sbDataSource.getProperty(sbCombineService.curRes, "title");
            }
            this.htmlSrc += '<!DOCTYPE html>\n'
                + '<html>\n'
                + '<head>\n'
                + '<meta charset="UTF-8">\n'
                + '<title>' + sbCommonUtils.escapeHTMLWithSpace(sbCombineService.option["T"], true) + '</title>\n'
                + '<link rel="stylesheet" href="combine.css" media="all">\n'
                + '<link rel="stylesheet" href="chrome://scrapbook/skin/annotation.css" media="all" data-sb-obj="stylesheet">\n'
                + '<style type="text/css" media="all" data-sb-obj="stylesheet">\n'
                + sbCommonUtils.readTemplateURL("chrome://scrapbook/skin/combineTemplate.css")
                + '</style>\n'
                + '</head>\n'
                + '<body>\n';
        }
        if ( aType == "file" || aType == "bookmark" ) {
            this.htmlSrc += this.getCiteHTML(aType);
        } else {
            aType = sbDataSource.getProperty(sbCombineService.curRes, "type");

            if (aType == "site" && !this.hasSite) {
                this.hasSite = true;
                sbCommonUtils.alert(sbCommonUtils.lang("WARN_ABOUT_INDEPTH"));
            }
            
            this.cssText += this.surroundCSS();
            this.inspectNode(this.BODY);
            Array.prototype.forEach.call(this.BODY.querySelectorAll("*"), function(curNode){
                this.inspectNode(curNode);
            }, this);
            if ( this.isTargetCombined ) {
                this.htmlSrc += this.surroundDOMCombined();
            } else {
                this.htmlSrc += this.getCiteHTML(aType);
                this.htmlSrc += this.surroundDOM();
            }
        }
        if ( sbCombineService.index == sbCombineService.idList.length - 1 ) {
            this.htmlSrc += '\n</body>\n</html>\n';
        }
        sbCombineService.index++;
        sbCombineService.next();
    },

    getCiteHTML: function(aType) {
        let src = '\n<!--' + sbCommonUtils.escapeHTMLComment(sbCombineService.postfix) + '-->\n';
        let title = sbDataSource.getProperty(sbCombineService.curRes, "title");
        let linkURL = "";
        switch ( aType ) {
            case "file":
                let htmlFile = sbCommonUtils.getContentDir(sbCombineService.curID); htmlFile.append("index.html");
                let targetFile = sbCommonUtils.readMetaRefresh(htmlFile);
                if (targetFile) {
                    linkURL = sbCommonUtils.convertFileToURL(targetFile);
                }
                break;
            case "note":
                linkURL = ""; break;
            default:
                linkURL = sbDataSource.getProperty(sbCombineService.curRes, "source"); break;
        }
        let icon = sbDataSource.getProperty(sbCombineService.curRes, "icon");
        if (icon) {
            icon = sbCommonUtils.convertResURLToURL(icon, true);
        } else {
            icon = sbCommonUtils.getDefaultIcon(aType).replace(/^chrome:\/\/scrapbook\/skin\//, "tree/");
        }
        src += '<cite class="scrapbook-header' + '">\n';
        src += '\t<img src="' + sbCommonUtils.escapeHTML(icon) + '" width="16" height="16">\n';
        src += '\t<a class="' + aType + '"' + (linkURL ? ' href="' + sbCommonUtils.escapeHTML(linkURL) + '"' : "") + '>' + sbCommonUtils.escapeHTMLWithSpace(title, true) + '</a>\n';
        src += '</cite>\n';
        return src;
    },

    surroundDOM: function() {
        if ( this.BODY.localName.toUpperCase() != "BODY" ) {
            sbCommonUtils.alert(sbCommonUtils.lang("CANNOT_COMBINE_FRAMES", sbDataSource.getProperty(sbCombineService.curRes, "title")));
            this.BROWSER.stop();
            window.location.reload();
        }

        let divBody = this.BROWSER.contentDocument.createElement("div");
        let attrs = this.BODY.attributes;
        for (var i = 0; i < attrs.length; i++) {
            divBody.setAttribute(attrs[i].name, attrs[i].value);
        }
        divBody.id = "item" + sbCombineService.curID + "body";
        divBody = sbCommonUtils.surroundByTags(divBody, this.BODY.innerHTML);

        let divHTML = this.BROWSER.contentDocument.createElement("div");
        let attrs = this.BROWSER.contentDocument.getElementsByTagName("html")[0].attributes;
        for (var i = 0; i < attrs.length; i++) {
            divHTML.setAttribute(attrs[i].name, attrs[i].value);
        }
        divHTML.id = "item" + sbCombineService.curID + "html";
        divHTML = sbCommonUtils.surroundByTags(divHTML, divBody);

        let divWrap = this.BROWSER.contentDocument.createElement("div");
        divWrap.id = "item" + sbCombineService.curID;
        divWrap.style.position = "relative";
        return sbCommonUtils.surroundByTags(divWrap, divHTML);
    },

    surroundDOMCombined: function() {
        let divWrap = this.BROWSER.contentDocument.createElement("div");
        divWrap.id = "item" + sbCombineService.curID;
        return sbCommonUtils.surroundByTags(divWrap, this.BODY.innerHTML);
    },

    surroundCSS: function() {
        this.htmlId = this.BROWSER.contentDocument.getElementsByTagName("html")[0].id;
        this.bodyId = this.BODY.id;
        let ret = "";
        for ( let i = 0; i < this.BROWSER.contentDocument.styleSheets.length; i++ ) {
            ret += this.processCSSRecursively(this.BROWSER.contentDocument.styleSheets[i]);
        }
        return ret + "\n\n";
    },

    processCSSRecursively: function(aCSS) {
        // a special stylesheet used by scrapbook, skip parsing it
        if (aCSS.ownerNode && sbCommonUtils.getSbObjectType(aCSS.ownerNode) == "stylesheet") return "";
        // a special stylesheet used by scrapbook or other addons/programs, skip parsing it
        if (aCSS.href && aCSS.href.startsWith("chrome:")) return "";
        let content = this.processCSSRules(aCSS, this.baseURI, "");
        let media = aCSS.media.mediaText;
        if (media) {
            // omit "all" since it's defined in the link tag
            if (media !== "all") {
                content = "@media " + media + " {\n" + content + "}\n";
            }
        }
        return content;
    },

    processCSSRules: function(aCSS, aRefURL) {
        let content = "";
        // if aCSS is a rule set of an external CSS file, use its URL as reference
        let refURL = aCSS.href || aRefURL;
        Array.forEach(aCSS.cssRules, function(cssRule) {
            let cssText = "";
            if (this.isTargetCombined) {
                cssText = cssRule.cssText;
            } else if (cssRule.type == Components.interfaces.nsIDOMCSSRule.IMPORT_RULE) {
                content += this.processCSSRecursively(cssRule.styleSheet);
                return;
            } else if (cssRule.type == Components.interfaces.nsIDOMCSSRule.STYLE_RULE) {
                cssText = this.remapCSSSelector(cssRule.selectorText) + "{" + cssRule.style.cssText + "}";
            } else if (cssRule.type == Components.interfaces.nsIDOMCSSRule.MEDIA_RULE) {
                cssText = "@media " + cssRule.conditionText + " {\n" + this.processCSSRules(cssRule, refURL) + "}";
            } else {
                cssText = cssRule.cssText;
            }
            content += this.inspectCSSText(cssText, refURL) + "\n";
        }, this);
        return content;
    },

    remapCSSSelector: function(selectorText) {
        let htmlId = this.htmlId;
        let bodyId = this.bodyId;
        let id = "item" + sbCombineService.curID;
        let canBeElement = true;
        let canBeId = false;
        let ret = "#" + id + " " + selectorText.replace(
            /(,\s+)|(\s+)|((?:[\-0-9A-Za-z_\u00A0-\uFFFF]|\\[0-9A-Fa-f]{1,6} ?|\\.)+)|(\[(?:"(?:\\.|[^"])*"|\\.|[^\]])*\])|(.)/g,
            function(){
                let ret = "";
                if (arguments[1]) {
                    // a new selector, add prefix
                    ret = arguments[1] + "#" + id + " ";
                    canBeElement = true;
                    canBeId = false;
                } else if (arguments[2]) {
                    // spaces, can follow element
                    ret = arguments[2];
                    canBeElement = true;
                    canBeId = false;
                } else if (arguments[3]) {
                    // element-like, check whether to replace
                    if (canBeElement) {
                        if (arguments[3].toLowerCase() == "html") {
                            ret = "#" + id + "html";
                        } else if (arguments[3].toLowerCase() == "body") {
                            ret = "#" + id + "body";
                        } else {
                            ret = arguments[3];
                        }
                    } else if (canBeId) {
                        if (arguments[3] == htmlId) {
                            ret = id + "html";
                        } else if (arguments[3] == bodyId) {
                            ret = id + "body";
                        } else {
                            ret = arguments[3];
                        }
                    } else {
                        ret = arguments[3];
                    }
                    canBeElement = false;
                    canBeId = false;
                } else if (arguments[4]) {
                    // bracket enclosed, eg. [class="html"]
                    ret = arguments[4];
                    canBeElement = false;
                    canBeId = false;
                } else if (arguments[5]) {
                    // other chars, may come from "#", ".", ":", " > ", " + ", " ~ ", etc
                    ret = arguments[5];
                    canBeElement = false;
                    canBeId = (arguments[5] == "#");
                }
                return ret;
        });
        return ret;
    },

    inspectCSSText: function(aCSSText, aRefURL) {
        // CSS get by cssText is always url("double-quoted-with-\"quote\"-escaped")
        let regex = / url\(\"((?:\\.|[^"])+)\"\)/g;
        aCSSText = aCSSText.replace(regex, function() {
            let dataURL = sbCommonUtils.unescapeCss(arguments[1]);
            if (dataURL.startsWith("data:")) return ' url("' + dataURL + '")';
            dataURL = sbCommonUtils.resolveURL(aRefURL, dataURL);
            // redirect the files to the original folder so we can capture them later on (and will rewrite the CSS)
            return ' url("' + dataURL + '")';
        });
        return aCSSText;
    },

    inspectNode: function(aNode) {
        switch ( aNode.nodeName.toLowerCase() ) {
            case "link": 
                if ( aNode.rel.toLowerCase().split(/[ \t\r\n\v\f]+/).indexOf("stylesheet") >= 0 ) {
                    // link tags in the body element is unusual
                    // styles should already be processed
                    // in sbPageCombiner.exec => surroundCSS => processCSSRecursively
                    // just discard it here so that it never appear in the combined page
                    sbCommonUtils.removeNode(aNode);
                    return;
                }
                break;
            case "style":
                // style tags in the body element is unusual
                // styles should already be processed
                // in sbPageCombiner.exec => surroundCSS => processCSSRecursively
                // just discard it here so that it never appear in the combined page
                sbCommonUtils.removeNode(aNode);
                return;
                break;
            case "base":
                // base tags in the body element is unusual
                // blank it anyway
                if ( aNode.hasAttribute("href") ) aNode.setAttribute("href", "");
                break;
            case "body": 
                // move body specific attributes into inline styles so that it can be transfered to div
                // inline style takes precedence than the corresponding HTML attribute
                if ( aNode.hasAttribute("background") ) {
                    if (!aNode.style.backgroundImage) aNode.style.backgroundImage = 'url("' + aNode.getAttribute("background") + '")';
                    aNode.removeAttribute("background");
                }
                if ( aNode.hasAttribute("bgcolor") ) {
                    if (!aNode.style.backgroundColor) aNode.style.backgroundColor = aNode.getAttribute("bgcolor");
                    aNode.removeAttribute("bgcolor");
                }
                if ( aNode.hasAttribute("text") ) {
                    if (!aNode.style.color) aNode.style.color = aNode.getAttribute("text");
                    aNode.removeAttribute("text");
                }
                break;
            case "img": case "source": 
                if ( aNode.hasAttribute("srcset") ) {
                    let that = this;
                    let newSrcset = gContentSaver.parseSrcset(aNode.getAttribute("srcset"), function(url){
                        return sbCommonUtils.resolveURL(that.baseURI, url);
                    });
                    aNode.setAttribute("srcset", newSrcset);
                }
            case "input": 
                if ( aNode.nodeName.toLowerCase() == "input" && aNode.type.toLowerCase() != "image" ) break;
            case "embed": case "audio": case "video": case "track": case "iframe": case "script": 
                if ( aNode.src ) aNode.setAttribute("src", aNode.src);
                break;
            case "object": 
                if ( aNode.data ) aNode.setAttribute("data", aNode.data);
                break;
            case "applet": 
                if ( aNode.hasAttribute("archive") ) {
                    let url = sbCommonUtils.resolveURL(this.baseURI, aNode.getAttribute("archive"));
                    aNode.setAttribute("archive", url);
                }
                break;
            case "table":  case "tr":  case "th": case "td": 
                if ( aNode.hasAttribute("background") ) {
                    let url = sbCommonUtils.resolveURL(this.baseURI, aNode.getAttribute("background"));
                    aNode.setAttribute("background", url);
                }
                break;
            case "a": case "area": 
                if ( aNode.href.startsWith("file:") ) aNode.setAttribute("href", aNode.href);
                break;
            case "cite": 
                if ( aNode.className == "scrapbook-header" ) this.isTargetCombined = true;
                break;
        }
        if ( aNode.style && aNode.style.cssText ) {
            let newCSStext = this.inspectCSSText(aNode.style.cssText, this.baseURI);
            if ( newCSStext ) aNode.setAttribute("style", newCSStext);
        }
    },

};




gContentSaver.onCaptureComplete = function(aItem) {
    let newRes = sbCombineService.onCombineComplete(aItem);
    if ( sbCombineService.option["R"] ) {
        if ( sbCombineService.resList.length != sbCombineService.parList.length ) return;
        let rmIDs = window.top.sbController.removeInternal(sbCombineService.resList, sbCombineService.parList);
        if ( rmIDs ) SB_trace(sbCommonUtils.lang("ITEMS_REMOVED", rmIDs.length));
    }
    SB_fireNotification(aItem);
    setTimeout(function() {
        window.top.sbManageService.toggleRightPane("sbToolbarCombine");
        window.top.sbMainService.locate(newRes);
    }, 500);
}


sbInvisibleBrowser.onLoadStart = function() {
    SB_trace(sbCommonUtils.lang("LOADING", sbCombineService.prefix + this.fileCount, sbCombineService.postfix));
};



