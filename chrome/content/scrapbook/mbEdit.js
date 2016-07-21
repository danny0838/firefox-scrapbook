var mbEditDialog = {

    _nameTextbox: null,
    _pathField: null,

    init: function() {
        if (!window.arguments)
            throw Components.results.NS_ERROR_UNDEXPECTED;
        this._nameTextbox = document.getElementById("mbName");
        this._pathField = document.getElementById("mbPath");
        var ret = window.arguments[0];
        this._nameTextbox.value = ret.value ? ret.value[0] : "";
        if (ret.value && ret.value[1]) {
            var file = sbCommonUtils.convertPathToFile(ret.value[1]);
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
        var pickedFile = sbCommonUtils.showFilePicker({
            window: window,
            title: aTitle,
            mode: 2, // modeGetFolder
            dir: this._pathField.file,
        });
        if (pickedFile) {
            this._pathField.file = pickedFile;
            this._pathField.label = pickedFile.path;
        }
    },

};


