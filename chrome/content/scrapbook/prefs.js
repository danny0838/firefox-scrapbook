
<<<<<<< HEAD
const Cc = Components.classes;
const Ci = Components.interfaces;

var sbPrefWindow = {

	changed: false,

	init: function() {
		//Checkbox zum Aktivieren des Status-Bar Icons ausblenden, falls FF>=4
		var iffVersion = Cc["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
		var iVerComparator = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
		if ( iVerComparator.compare(iffVersion.version, "4.0")>=0 ) document.getElementById("sbPrefStatsBarIcon").hidden = true;
		//Ende
		this.updateDataPath();
		this.updateViewerPath();
		this.hlInitUI();
		this._updateFileField("sbDataPath", "scrapbook.data.path");
		if (!sbMultiBookService.validateRefresh(true)) {
=======
var sbPrefWindow = {

	init: function() {
		this.updateDataPath();
		this.hlInitUI();
		if (!sbMultiBookUI.validateRefresh(true)) {
>>>>>>> release-1.6.0.a1
			var elts = document.getElementById("sbDataDefault").getElementsByTagName("*");
			Array.forEach(elts, function(elt) {
				elt.disabled = true;
			});
		}
<<<<<<< HEAD
		if (navigator.platform.indexOf("Win") == 0) {
			var elt = document.getElementById("sbViewerDefault");
			elt.label += " (" + elt.getAttribute("label2") + ")";
		}
	},

	done: function() {
		if (!this.changed)
			return;
		sbMultiBookService.refreshGlobal();
	},

=======
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

>>>>>>> release-1.6.0.a1
	updateGroupedUI: function(aPrefName, aGroupName) {
		var enable = document.getElementById(aPrefName).value;
		var elts = document.getElementsByAttribute("group", aGroupName);
		Array.forEach(elts, function(elt) {
			elt.disabled = !enable;
		});
	},

	hlInitUI: function() {
		var tmpElt = document.getElementById("hlTemplate");
<<<<<<< HEAD
		for (var num = 1; num <= 6; num++) {
=======
		for (var num = 1; num <= 4; num++) {
>>>>>>> release-1.6.0.a1
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
<<<<<<< HEAD
		for (var num = 6; num > 0; num--) {
=======
		for (var num = 4; num > 0; num--) {
>>>>>>> release-1.6.0.a1
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

<<<<<<< HEAD
	updateViewerUI: function() {
		var isDefault = document.getElementById("scrapbook.fileViewer.default").value;
		document.getElementById("sbViewerPath").disabled   = isDefault;
		document.getElementById("sbViewerButton").disabled = isDefault;
	},

=======
>>>>>>> release-1.6.0.a1
	updateDataPath: function() {
		this._updateFileField("sbDataPath", "scrapbook.data.path");
	},

<<<<<<< HEAD
	updateViewerPath: function() {
		this._updateFileField("sbViewerPath", "scrapbook.fileViewer.path");
	},

=======
>>>>>>> release-1.6.0.a1
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

<<<<<<< HEAD
	selectViewer: function() {
		var title = document.getElementById("sbViewerCaption").label;
		var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
		fp.init(window, title, fp.modeOpen);
		fp.appendFilters(fp.filterApps);
		if (fp.show() == fp.returnOK) {
			document.getElementById("scrapbook.fileViewer.path").value = fp.file;
			this.updateViewerPath();
		}
=======
	onInputKey: function(event) {
		event.target.value = event.target.value.toUpperCase().replace(/[^A-Z]/g, '');
>>>>>>> release-1.6.0.a1
	},

};


