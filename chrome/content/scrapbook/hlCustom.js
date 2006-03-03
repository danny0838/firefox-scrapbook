
var hlCustomizer = {

	get PREVIEW() { return document.getElementById("hlCustomPreview"); },

	index : 4,
	presetIndex : 0,

	init : function() 
	{
		document.documentElement.buttons = "accept,cancel,extra2";
		if ( !window.arguments || window.arguments[0] < 1 || window.arguments[0] > 4 )
		{
			window.close(); return;
		}
		this.index = window.arguments[0];
		var cssText = nsPreferences.copyUnicharPref("scrapbook.highlighter.style." + this.index, sbHighlighter.PRESET_STYLES[this.index]);
		this.parseFromString(cssText);
	},

	done : function() 
	{
		nsPreferences.setUnicharPref("scrapbook.highlighter.style." + this.index, this.PREVIEW.style.cssText);
		window.opener.hlPrefService.shouldUpdate = true;
	},

	update : function()
	{
		this.PREVIEW.setAttribute("style", this.parseToString());
	},

	broadcast : function()
	{
		var ret = [
			document.getElementById("hlBackgroundEnabled").checked,
			document.getElementById("hlTextEnabled").checked,
			document.getElementById("hlBorderEnabled").checked
		];
		document.getElementById("hlBroadcast0").setAttribute("disabled", !ret[0]);
		document.getElementById("hlBroadcast1").setAttribute("disabled", !ret[1]);
		document.getElementById("hlBroadcast2").setAttribute("disabled", !ret[2]);
		return ret;
	},

	parseFromString : function(cssText)
	{
		this.PREVIEW.setAttribute("style", cssText);
		document.getElementById("hlTextBold").checked   = this.PREVIEW.style.fontWeight == "bold";
		document.getElementById("hlTextItalic").checked = this.PREVIEW.style.fontStyle == "italic";
		document.getElementById("hlTextStrike").checked = this.PREVIEW.style.textDecoration == "line-through";
		document.getElementById("hlBackgroundEnabled").checked = this.PREVIEW.style.backgroundColor;
		document.getElementById("hlTextEnabled").checked       = this.PREVIEW.style.color;
		document.getElementById("hlBorderEnabled").checked     = this.PREVIEW.style.borderBottom;
		var bcList = this.broadcast();
		if ( bcList[0] ) document.getElementById("hlBackgroundColor").color = this.PREVIEW.style.backgroundColor;
		if ( bcList[1] ) document.getElementById("hlTextColor").color = this.PREVIEW.style.color;
		if ( bcList[2] )
		{
			document.getElementById("hlBorderColor").color = this.PREVIEW.style.borderBottomColor;
			document.getElementById("hlBorderType").selectedIndex = this.PREVIEW.style.borderTop ? 0 : 1;
			var elem = document.getElementsByAttribute("value", this.PREVIEW.style.borderBottomStyle);
			document.getElementById("hlBorderStyle").selectedIndex = elem.length > 0 ? elem[0].getAttribute("index") : 0;
			elem = document.getElementsByAttribute("value", this.PREVIEW.style.borderBottomWidth);
			document.getElementById("hlBorderWidth").selectedIndex = elem.length > 0 ? elem[0].getAttribute("index") : 0;
		}
	},

	parseToString : function()
	{
		var bcList = this.broadcast();
		var cssRules = [];
		if ( document.getElementById("hlTextBold").checked )   cssRules.push("font-weight:bold");
		if ( document.getElementById("hlTextItalic").checked ) cssRules.push("font-style:italic");
		if ( document.getElementById("hlTextStrike").checked ) cssRules.push("text-decoration:line-through");
		if ( bcList[0] ) cssRules.push("background-color:" + (document.getElementById("hlBackgroundColor").color || "none"));
		if ( bcList[1] ) cssRules.push("color:" + (document.getElementById("hlTextColor").color || "none"));
		if ( bcList[2] )
		{
			var borderType  = document.getElementById("hlBorderType").selectedItem.value == "box" ? "border" : "border-bottom";
			var borderStyle = document.getElementById("hlBorderStyle").selectedItem.value;
			var borderWidth = document.getElementById("hlBorderWidth").selectedItem.value;
			var borderColor = document.getElementById("hlBorderColor").color || "none";
			cssRules.push(borderType + ":" + [borderWidth,borderStyle,borderColor].join(" "));
		}
		return cssRules.join(";");
	},

	rotatePreset : function()
	{
		if ( ++this.presetIndex > 8 ) this.presetIndex = 0;
		var presetButton = document.getElementById("hlCustomizeDialog").getButton("extra2");
		presetButton.label = presetButton.label.replace(/\s\d\/8$/, " " + this.presetIndex + "/8");
		this.parseFromString(sbHighlighter.PRESET_STYLES[this.presetIndex]);
	},

};


