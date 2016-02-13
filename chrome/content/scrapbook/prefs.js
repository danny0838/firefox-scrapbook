var sbPrefWindow = {

    changed: false,

    init: function() {
        this.updateDataPath();
        this.hlUpdateUI();
        this._updateFileField("sbDataPath", "extensions.scrapbook.data.path");
        if (!sbMultiBookService.validateRefresh(true)) {
            var elts = document.getElementById("sbDataDefault").getElementsByTagName("*");
            Array.forEach(elts, function(elt) {
                elt.disabled = true;
            });
        }
        if (navigator.platform.substr(0, 3) == "Mac") {
            var modifiersMap = {
                "Ctrl" : "command",
                "Shift": "shift",
                "Alt"  : "option",
            };
            for (let [win, mac] in Iterator(modifiersMap)) {
                var elts = document.querySelectorAll("label[value*='" + win + "']");
                Array.forEach(elts, function(elt) {
                    elt.value = elt.value.replace(win, mac);
                });
            }
            document.getElementById("sbKeysMenubar").hidden = true;
        }
        // output tree requires correct pref and datasource,
        // we have to exec it before changing them
        sbDataSource.outputTreeAuto();
    },

    done: function() {
        if (!this.changed)
            return;
        sbDataSource.checkRefresh();
    },

    updateGroupedUI: function(aPrefName, aGroupName) {
        var enable = document.getElementById(aPrefName).value;
        var elts = document.getElementsByAttribute("group", aGroupName);
        Array.forEach(elts, function(elt) {
            elt.disabled = !enable;
        });
    },

    hlUpdateUI: function() {
        for (var num = 8; num > 0; num--) {
            var prefVal = sbCommonUtils.getPref("highlighter.style." + num, sbHighlighter.PRESET_STYLES[num]);
            sbHighlighter.decorateElement(document.getElementById("hlPrefLabel" + num), prefVal);
        }
    },

    hlCustomize: function(aNumber) {
        var ret = {index: aNumber};
        document.documentElement.openSubDialog(
            "chrome://scrapbook/content/hlCustom.xul", "modal,centerscreen,chrome", ret
        );
        if (ret.result == 1) this.changed = true;
        this.hlUpdateUI();
    },

    updateDataUI: function() {
        var isDefault = document.getElementById("extensions.scrapbook.data.default").value;
        var mbEnabled = document.getElementById("extensions.scrapbook.multibook.enabled").value;
        document.getElementById("sbDataDefault").disabled = mbEnabled;
        document.getElementById("sbDataPath").disabled    = isDefault || mbEnabled;
        document.getElementById("sbDataButton").disabled  = isDefault || mbEnabled;
    },

    updateDataPath: function() {
        this._updateFileField("sbDataPath", "extensions.scrapbook.data.path");
    },

    _updateFileField: function(aEltID, aPrefID) {
        var file = document.getElementById(aPrefID).value;
        if (!file)
            return;
        var fileField = document.getElementById(aEltID);
        fileField.file = file;
        if (file.exists() && file.isDirectory())
            fileField.label = file.path;
    },

    selectFolder: function(aPickerTitle) {
        var file = document.getElementById("extensions.scrapbook.data.path").value;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
        if (file)
            fp.displayDirectory = file;
        fp.init(window, aPickerTitle, fp.modeGetFolder);
        if (fp.show() == fp.returnOK) {
            document.getElementById("extensions.scrapbook.data.path").value = fp.file;
            this.updateDataPath();
        }
    },

    onInputKey: function(event) {
        event.target.value = event.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    },

    exportPrefs: function() {
        var oFP = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
        oFP.init(window, "Export Preferences", oFP.modeSave);
        oFP.defaultString = "scrapbook.prefs." + sbCommonUtils.getTimeStamp().substring(0, 8) + ".json";
        oFP.defaultExtension = "json";
        oFP.appendFilter("JSON files", "*.json");
        oFP.appendFilters(oFP.filterAll);

        var ret = oFP.show();
        if (ret == oFP.returnOK || ret == oFP.returnReplace) {
            var list = sbCommonUtils.getPrefKeys();
            var result = {};
            for (var i=0, I=list.length; i<I; ++i) {
                result[list[i]] = sbCommonUtils.getPref(list[i]);
            }
            sbCommonUtils.writeFile(oFP.file, JSON.stringify(result));
            return true;
        }
        return false;
    },
    
    importPrefs: function() {
        var oFP = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
        oFP.init(window, "Import Preferences", oFP.modeOpen);
        oFP.defaultExtension = "json";
        oFP.appendFilter("JSON files", "*.json");
        oFP.appendFilters(oFP.filterAll);

        if (oFP.show() == oFP.returnOK) {
            try {
                var data = sbCommonUtils.convertToUnicode(sbCommonUtils.readFile(oFP.file), "UTF-8");
                var prefs = JSON.parse(data);
                for (var i in prefs) {
                    sbCommonUtils.setPref(i, prefs[i]);
                }
                sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "MSG_UPDATE_PREFS"));
                return true;
            } catch(ex) {
                sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "ERR_UPDATE_PREFS", [ex]));
                return false;
            }
        }
        return false;
    },
    
    resetPrefs: function() {
        try {
            sbCommonUtils.resetPrefs();
            sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "MSG_UPDATE_PREFS"));
            return true;
        } catch(ex) {
            sbCommonUtils.alert(sbCommonUtils.lang("scrapbook", "ERR_UPDATE_PREFS", [ex]));
            return false;
        }
    }
};


