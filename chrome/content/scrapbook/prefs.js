
var sbPrefWindow = {

	init: function() {
		this.updateDataPath();
		this.hlInitUI();
		if (!sbMultiBookUI.validateRefresh(true)) {
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
	},

	updateGroupedUI: function(aPrefName, aGroupName) {
		var enable = document.getElementById(aPrefName).value;
		var elts = document.getElementsByAttribute("group", aGroupName);
		Array.forEach(elts, function(elt) {
			elt.disabled = !enable;
		});
	},

	hlInitUI: function() {
		var tmpElt = document.getElementById("hlTemplate");
		for (var num = 1; num <= 4; num++) {
			var elt = tmpElt.cloneNode(true);
			tmpElt.parentNode.insertBefore(elt, tmpElt);
			elt.firstChild.setAttribute("value", num + ":");
			elt.firstChild.nextSibling.id = "hlPrefLabel" + num;
			elt.lastChild.setAttribute("hlnumber", num);
		}
		tmpElt.hidden = true;
		this.hlUpdateUI();
	},

	hlUpdateUI: function() {
		var prefBranch = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
		for (var num = 4; num > 0; num--) {
			var prefVal = null;
			var prefName = "scrapbook.highlighter.style." + num;
			try {
				prefVal = prefBranch.getComplexValue(prefName, Ci.nsISupportsString).data;
			}
			catch (ex) {
				prefVal = sbHighlighter.PRESET_STYLES[num];
			}
			sbHighlighter.decorateElement(document.getElementById("hlPrefLabel" + num), prefVal);
		}
	},

	hlCustomize: function(aNumber) {
		document.documentElement.openSubDialog(
			"chrome://scrapbook/content/hlCustom.xul", "modal,centerscreen,chrome", aNumber
		);
		this.hlUpdateUI();
	},

	updateDataUI: function() {
		var isDefault = document.getElementById("scrapbook.data.default").value;
		var mbEnabled = document.getElementById("scrapbook.multibook.enabled").value;
		document.getElementById("sbDataDefault").disabled = mbEnabled;
		document.getElementById("sbDataPath").disabled    = isDefault || mbEnabled;
		document.getElementById("sbDataButton").disabled  = isDefault || mbEnabled;
	},

	updateDataPath: function() {
		this._updateFileField("sbDataPath", "scrapbook.data.path");
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
		var file = document.getElementById("scrapbook.data.path").value;
		var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
		if (file)
			fp.displayDirectory = file;
		fp.init(window, aPickerTitle, fp.modeGetFolder);
		if (fp.show() == fp.returnOK) {
			document.getElementById("scrapbook.data.path").value = fp.file;
			this.updateDataPath();
		}
	},

	onInputKey: function(event) {
		event.target.value = event.target.value.toUpperCase().replace(/[^A-Z]/g, '');
	},

};


