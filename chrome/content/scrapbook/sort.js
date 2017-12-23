
let sbSortService = {

    get WIZARD()      { return document.getElementById("sbSortWizard"); },
    get RADIO_GROUP() { return document.getElementById("sbSortRadioGroup"); },

    key: "",
    order: 1,
    grouping: false,
    index: -1,
    contResList: [],
    waitTime: 0,

    init: function() {
        this.WIZARD.getButton("back").hidden = true;
        this.WIZARD.getButton("finish").disabled = true;
        this.WIZARD.getButton("next").removeAttribute("accesskey");
        this.WIZARD.canAdvance = false;
        this.RADIO_GROUP.selectedIndex = this.RADIO_GROUP.getAttribute("sortIndex");
        if ( window.arguments ) {
            this.contResList = [window.arguments[0]];
            this.waitTime = 2;
        } else {
            this.contResList = [sbCommonUtils.RDF.GetResource("urn:scrapbook:root")];
            this.waitTime = 6;
        }
        sbSortService.countDown();
        // hide the tree
        window.opener.document.getElementById("sbTreeOuter").hidden = true;
    },

    countDown: function() {
        this.WIZARD.getButton("next").label = sbCommonUtils.lang("START_BUTTON") + (this.waitTime > 0 ? " (" + this.waitTime + ")" : "");
        this.WIZARD.canAdvance = this.waitTime == 0;
        if ( this.waitTime-- ) setTimeout(function(){ sbSortService.countDown() }, 500);
    },

    exec: function() {
        this.WIZARD.getButton("cancel").hidden = true;
        this.order = document.getElementById("sbSortDescending").checked ? -1 : 1;
        this.grouping = document.getElementById("sbSortGrouping").checked;
        if (document.getElementById("sbSortRecursive").checked)
            this.contResList = sbDataSource.flattenResources(this.contResList[0], 1, true);
        switch ( this.RADIO_GROUP.selectedIndex ) {
            case 0: break;
            case 1: this.key = "title"; break;
            case 2: this.key = "source"; break;
            case 3: this.key = "id"; break;
            case 4: this.key = "create"; break;
            case 5: this.key = "modify"; break;
        }
        this.next();
    },

    next: function() {
        if ( ++this.index < this.contResList.length ) {
            document.getElementById("sbSortTextbox").value = "(" + (this.index + 1) + "/" + this.contResList.length + ")... " + sbDataSource.getProperty(this.contResList[this.index], "title");
            this.process(this.contResList[this.index]);
        } else {
            // sort completed
            this.RADIO_GROUP.setAttribute("sortIndex", this.RADIO_GROUP.selectedIndex);
            // Due to manual interverntion, we need to flush the datasource expicitly
            // @TODO: should we move the sorting task into the datasource.jsm?
            sbDataSource.flush();
            // show the tree
            window.opener.document.getElementById("sbTreeOuter").hidden = false;
            // close this dialog window
            window.close();
        }
    },

    process: function(aContRes) {
        let rdfCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
        rdfCont.Init(sbDataSource.data, aContRes);
        let resEnum = rdfCont.GetElements();
        let resListF = [], resListI = [], resListB = [], resListN = [], resListX = [];
        if (this.grouping) {
            while ( resEnum.hasMoreElements() ) {
                let res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
                switch(sbDataSource.getProperty(res, "type")) {
                    case "folder":
                        resListF.push(res);
                        break;
                    case "bookmark":
                        resListB.push(res);
                        break;
                    case "note":
                        resListN.push(res);
                        break;
                    case "notex":
                        resListX.push(res);
                        break;
                    default:
                        resListI.push(res);
                        break;
                }
            }
            if ( !this.key ){
                resListF.reverse();
                resListI.reverse();
                resListB.reverse();
                resListN.reverse();
                resListX.reverse();
                resListF = resListF.concat(resListI).concat(resListB).concat(resListX).concat(resListN);
            } else {
                resListF.sort(this.compare);
                resListI.sort(this.compare);
                resListB.sort(this.compare);
                resListN.sort(this.compare);
                resListX.sort(this.compare);
                resListF = resListF.concat(resListI).concat(resListB).concat(resListX).concat(resListN);
            }
        } else {
            while ( resEnum.hasMoreElements() ) {
                let res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
                resListF.push(res);
            }
            if ( !this.key ){
                resListF.reverse();
            } else {
                resListF.sort(this.compare);
            }
        }
        for ( let i = 0; i < resListF.length; i++ ) {
            rdfCont.RemoveElement(resListF[i], true);
            rdfCont.AppendElement(resListF[i]);
        }
        setTimeout(function(){ sbSortService.next(res); }, 0);
    },

    showTree: function() {
        // show the tree
        window.opener.document.getElementById("sbTreeOuter").hidden = false;
    },

    compare: function(resA, resB) {
        let a = sbDataSource.getProperty(resA, sbSortService.key).toUpperCase();
        let b = sbDataSource.getProperty(resB, sbSortService.key).toUpperCase();
        if ( a > b ) return sbSortService.order;
        if ( a < b ) return -sbSortService.order;
        return 0;
    },

};



