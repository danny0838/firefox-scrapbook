var gData;

function init() {
    if ( !window.arguments) window.close();
    gData = window.arguments[0];
    if (gData.url) document.getElementById("sbFileHTML").value = gData.url;

    // focus the corresponding field of the selected radio
    if (document.getElementById("sbFileFileUse").selected) {
        document.getElementById("sbFilePicker").focus();
    } else if (document.getElementById("sbFileHTMLUse").selected) {
        document.getElementById("sbFileHTML").focus();
    }
}

function accept() {
    gData.file_use = document.getElementById("sbFileFileUse").selected;
    gData.html_use = document.getElementById("sbFileHTMLUse").selected;
    gData.file = document.getElementById("sbFilePath").value;
    gData.html = document.getElementById("sbFileHTML").value;
    gData.insert = document.getElementById("sbFileInsert").checked;
    gData.format = document.getElementById("sbFileFormat").value;
    gData.result = ((gData.file_use && gData.file) || (gData.html_use && gData.html)) ? 1 : 0;
}

function pickFile() {
    var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
    FP.init(window, sbCommonUtils.lang("overlay", "EDIT_ATTACH_FILE_TITLE"), FP.modeOpen);
    var ret = FP.show();
    if ( ret != FP.returnOK ) return false;
    document.getElementById("sbFilePath").label = FP.file.path;
    document.getElementById("sbFilePath").value = FP.file;
    return true;
}

function pick(aIDToCheck) {
    var el = document.getElementById(aIDToCheck);
    if (!el.disabled) document.getElementById("sbFileSelector").selectedItem = el;
}