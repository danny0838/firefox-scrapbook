var gArg;
var gPrefName;
var gPreviewUI;
var gColorIndex;

function getElement(aID) {
    return document.getElementById(aID);
}

var hlCustomizer = {

    init: function() {
        if (!window.arguments || !(gArg = window.arguments[0])) {
            window.close();
            return;
        }
        gColorIndex = gArg.index;
        gPreviewUI  = getElement("hlCustomPreview");
        gPrefName   = "highlighter.style." + gColorIndex;
        var prefVal = sbCommonUtils.getPref(gPrefName, sbHighlighter.PRESET_STYLES[gColorIndex]);
        gPreviewUI.setAttribute("style", prefVal);
        this.syncFromPreview();
    },

    done: function() {
        sbCommonUtils.setPref(gPrefName, gPreviewUI.style.cssText);
        gArg.result = 1;
    },

    syncFromPreview: function() {
        getElement("hlTextBold").checked   = gPreviewUI.style.fontWeight == "bold";
        getElement("hlTextItalic").checked = gPreviewUI.style.fontStyle == "italic";
        getElement("hlTextStrike").checked = gPreviewUI.style.textDecoration == "line-through";
        getElement("hlBackgroundEnabled").checked = !!gPreviewUI.style.backgroundColor;
        getElement("hlTextEnabled").checked       = !!gPreviewUI.style.color;
        getElement("hlBorderEnabled").checked     = !!gPreviewUI.style.borderBottomColor;
        getElement("hlBackgroundColor").color = gPreviewUI.style.backgroundColor   || "none";
        getElement("hlTextColor").color       = gPreviewUI.style.color             || "none";
        getElement("hlBorderColor").color     = gPreviewUI.style.borderBottomColor || "none";
        getElement("hlBorderType").value = gPreviewUI.style.border ? "border" : gPreviewUI.style.borderBottom ? "border-bottom" : "";
        getElement("hlBorderStyle").value = gPreviewUI.style.borderBottomStyle;
        getElement("hlBorderWidth").value = gPreviewUI.style.borderBottomWidth;
        this._updateUIActiveState();
    },

    syncToPreview: function() {
        var rules = [];
        if (getElement("hlTextBold").checked)
            rules.push("font-weight: bold;");
        if (getElement("hlTextItalic").checked)
            rules.push("font-style: italic;");
        if (getElement("hlTextStrike").checked)
            rules.push("text-decoration: line-through;");
        if (getElement("hlBackgroundEnabled").checked)
            rules.push("background-color: " + getElement("hlBackgroundColor").color + ";");
        if (getElement("hlTextEnabled").checked)
            rules.push("color: " + getElement("hlTextColor").color + ";");
        if (getElement("hlBorderEnabled").checked) {
            var borderType  = getElement("hlBorderType").value;
            var borderStyle = getElement("hlBorderStyle").value;
            var borderWidth = getElement("hlBorderWidth").value;
            var borderColor = getElement("hlBorderColor").color;
            rules.push(borderType + ": " + [borderWidth, borderStyle, borderColor].join(" ") + ";");
        }
        this._updateUIActiveState();
        gPreviewUI.setAttribute("style", rules.join(" "));
        gPreviewUI.setAttribute("tooltiptext", gPreviewUI.style.cssText);
    },

    _updateUIActiveState: function() {
        var bgEnabled     = getElement("hlBackgroundEnabled").checked;
        var textEnabled   = getElement("hlTextEnabled").checked;
        var borderEnabled = getElement("hlBorderEnabled").checked;
        getElement("hlBackgroundColor").disabled = !bgEnabled;
        getElement("hlTextColor").disabled       = !textEnabled;
        getElement("hlBorderColor").disabled     = !borderEnabled;
        getElement("hlBackgroundColor").style.MozOpacity = bgEnabled     ? "1.0" : "0.5";
        getElement("hlBackgroundColor").style.opacity    = bgEnabled     ? "1.0" : "0.5";
        getElement("hlTextColor").style.MozOpacity       = textEnabled   ? "1.0" : "0.5";
        getElement("hlTextColor").style.opacity          = textEnabled   ? "1.0" : "0.5";
        getElement("hlBorderColor").style.MozOpacity     = borderEnabled ? "1.0" : "0.5";
        getElement("hlBorderColor").style.opacity        = borderEnabled ? "1.0" : "0.5";
        getElement("hlBorderType").disabled  = !borderEnabled;
        getElement("hlBorderStyle").disabled = !borderEnabled;
        getElement("hlBorderWidth").disabled = !borderEnabled;
    },

    _presetIndex: 0,

    rotatePreset: function() {
        if (++this._presetIndex > 8)
            this._presetIndex = 0;
        var button = getElement("hlCustomizeDialog").getButton("extra2");
        button.label.match(/\d(\/\d)$/);
        button.label = RegExp.leftContext + this._presetIndex.toString() + RegExp.$1;
        gPreviewUI.setAttribute("style", sbHighlighter.PRESET_STYLES[this._presetIndex]);
        this.syncFromPreview();
    },

};


