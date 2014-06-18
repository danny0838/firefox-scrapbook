var gPrefName;
var gPreviewUI;
var gColorIndex;

function getElement(aID) {
	return document.getElementById(aID);
}

var hlCustomizer = {

	init: function() 
	{
		if (!window.arguments || !window.arguments[0]) {
			window.close();
			return;
		}
		gColorIndex = window.arguments[0];
		gPreviewUI  = getElement("hlCustomPreview");
		gPrefName   = "highlighter.style." + gColorIndex;
		var prefVal = sbCommonUtils.getPref(gPrefName, sbHighlighter.PRESET_STYLES[gColorIndex]);
		gPreviewUI.setAttribute("style", prefVal);
		this.syncFromPreview();
	},

	done: function() 
	{
		sbCommonUtils.setPref(gPrefName, gPreviewUI.style.cssText);
	},

	syncFromPreview: function()
	{
		getElement("hlTextBold").checked   = gPreviewUI.style.fontWeight == "bold";
		getElement("hlTextItalic").checked = gPreviewUI.style.fontStyle == "italic";
		getElement("hlTextStrike").checked = gPreviewUI.style.textDecoration == "line-through";
		getElement("hlBackgroundColor").color = gPreviewUI.style.backgroundColor   || "none";
		getElement("hlTextColor").color       = gPreviewUI.style.color             || "none";
		getElement("hlBorderColor").color     = gPreviewUI.style.borderBottomColor || "none";
		getElement("hlBackgroundEnabled").checked = !!gPreviewUI.style.backgroundColor;
		getElement("hlTextEnabled").checked       = !!gPreviewUI.style.color;
		getElement("hlBorderEnabled").checked     = !!gPreviewUI.style.borderBottomColor;
		getElement("hlBorderType").selectedIndex = gPreviewUI.style.borderTop ? 0 : 1;
		var style = gPreviewUI.style.borderBottomStyle;
		if (style) {
			var selIdx = ["solid", "dotted", "dashed", "double"].indexOf(style);
			getElement("hlBorderStyle").selectedIndex = selIdx;
		}
		var width = gPreviewUI.style.borderBottomWidth;
		if (width) {
			var selIdx = ["thin", "medium", "thick"].indexOf(width);
			getElement("hlBorderWidth").selectedIndex = selIdx;
		}
		this._updateUIActiveState();
	},

	syncToPreview: function()
	{
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
			var borderType  = getElement("hlBorderType").selectedItem.value;
			var borderStyle = getElement("hlBorderStyle").selectedItem.value;
			var borderWidth = getElement("hlBorderWidth").selectedItem.value;
			var borderColor = getElement("hlBorderColor").color;
			rules.push(borderType + ": " + [borderWidth, borderStyle, borderColor].join(" "));
		}
		this._updateUIActiveState();
		gPreviewUI.setAttribute("style", rules.join(" "));
		gPreviewUI.setAttribute("tooltiptext", gPreviewUI.style.cssText);
	},

	_updateUIActiveState: function()
	{
		var bgEnabled     = getElement("hlBackgroundEnabled").checked;
		var textEnabled   = getElement("hlTextEnabled").checked;
		var borderEnabled = getElement("hlBorderEnabled").checked;
		getElement("hlBackgroundColor").disabled = !bgEnabled;
		getElement("hlTextColor").disabled       = !textEnabled;
		getElement("hlBorderColor").disabled     = !borderEnabled;
		getElement("hlBackgroundColor").style.MozOpacity = bgEnabled     ? "1.0" : "0.5";
		getElement("hlTextColor").style.MozOpacity       = textEnabled   ? "1.0" : "0.5";
		getElement("hlBorderColor").style.MozOpacity     = borderEnabled ? "1.0" : "0.5";
		getElement("hlBorderType").disabled  = !borderEnabled;
		getElement("hlBorderStyle").disabled = !borderEnabled;
		getElement("hlBorderWidth").disabled = !borderEnabled;
	},

	_presetIndex: 0,

	rotatePreset: function()
	{
		if (++this._presetIndex > 8)
			this._presetIndex = 0;
		var button = getElement("hlCustomizeDialog").getButton("extra2");
		button.label.match(/\d(\/\d)$/);
		button.label = RegExp.leftContext + this._presetIndex.toString() + RegExp.$1;
		gPreviewUI.setAttribute("style", sbHighlighter.PRESET_STYLES[this._presetIndex]);
		this.syncFromPreview();
	},

};


