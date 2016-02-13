var mbEditDialog = {

    _nameTextbox: null,
    _pathField  : null,

    init: function() {
        if (!window.arguments)
            throw Components.results.NS_ERROR_UNDEXPECTED;
        this._nameTextbox = document.getElementById("mbName");
        this._pathField   = document.getElementById("mbPath");
        var ret = window.arguments[0];
        this._nameTextbox.value = ret.value ? ret.value[0] : "";
        if (ret.value && ret.value[1]) {
            var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(ret.value[1]);
            this._pathField.file = file;
            this._pathField.label = file.path;
        }
    },

    accept: function() {
        if (!this._nameTextbox.value)
            this._nameTextbox.value = this._pathField.file.leafName;
        window.arguments[0].value = [this._nameTextbox.value, this._pathField.file.path];
    },

    cancel: function() {
        window.arguments[0].value = null;
    },

    selectFolder: function(aTitle) {
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
        fp.init(window, aTitle, fp.modeGetFolder);
        if (this._pathField.file)
            fp.displayDirectory = this._pathField.file;
        if (fp.show() == fp.returnOK) {
            this._pathField.file = fp.file;
            this._pathField.label = fp.file.path;
        }
    },

};


