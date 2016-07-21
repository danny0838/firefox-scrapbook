/********************************************************************
 *
 * The class for keyboard shortcut
 *
 * @public {class} Shortcut
 *
 *******************************************************************/

this.EXPORTED_SYMBOLS = ["Shortcut"];

const { sbCommonUtils } = Components.utils.import("resource://scrapbook-modules/common.jsm", {});

/**
 * Shortcut class
 */

// possible values of nsIXULRuntime.OS:
// https://developer.mozilla.org/en/OS_TARGET
const nsIXULRuntime = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime);
const isMac = (nsIXULRuntime.OS.substring(0, 3).toLowerCase() == "mac");
const keyCodeToNameMap = {};
const keyNameToCodeMap = {};
const keyNameToUIStringMap = {
    "Left": "\u2190",
    "Up": "\u2191",
    "Right": "\u2192",
    "Down": "\u2193",
    "Comma": ",",
    "Period": ".",
    "Slash": "/",
    "Open_Bracket": "[",
    "Close_Bracket": "]",
};

// Ths list of nsIDOMKeyEvent constants can be found here:
// https://dxr.mozilla.org/mozilla-central/source/dom/interfaces/events/nsIDOMKeyEvent.idl
(function () {
    var keys = Components.interfaces.nsIDOMKeyEvent;
    for (var name in keys) {
        if (name.match(/^DOM_VK_/)) {
            var keyName = RegExp.rightContext.toLowerCase().replace(/(^|_)([a-z])/g, function(){
                return arguments[1] + arguments[2].toUpperCase();
            });
            var keyCode = keys[name];
            keyCodeToNameMap[keyCode] = keyName;
            keyNameToCodeMap[keyName] = keyCode;
        }
    }
})();

var printableRegex = /^[0-9A-Za-z]$/;

function Shortcut(data) {
    this.keyCode = data.keyCode;
    this.keyName = keyCodeToNameMap[this.keyCode];
    // unify the order
    this.accelKey = false;
    this.metaKey = false;
    this.ctrlKey = false;
    this.altKey = false;
    this.shiftKey = false;
    this.modifiers = [];
    if (data.modifiers.indexOf("Accel") !== -1) {
        this.accelKey = true;
        this.modifiers.push("Accel");
    }
    if (data.modifiers.indexOf("Meta") !== -1) {
        this.metaKey = true;
        this.modifiers.push("Meta");
    }
    if (data.modifiers.indexOf("Ctrl") !== -1) {
        this.ctrlKey = true;
        this.modifiers.push("Ctrl");
    }
    if (data.modifiers.indexOf("Alt") !== -1) {
        this.altKey = true;
        this.modifiers.push("Alt");
    }
    if (data.modifiers.indexOf("Shift") !== -1) {
        this.shiftKey = true;
        this.modifiers.push("Shift");
    }
}

Shortcut.prototype = {
    get isValid() {
        delete this.isValid;
        return this.isValid = !!this.keyName;
    },

    // A combination with all modifiers e.g. Ctrl+Alt is incomplete
    get isComplete() {
        delete this.isComplete;
        if (!this.isValid) return this.isComplete = false;
        return this.isComplete = (["Win", "Control", "Alt", "Shift"].indexOf(this.keyName) == -1);
    },

    get isPrintable() {
        delete this.isPrintable;
        if (!this.isValid) return this.isPrintable = false;
        return this.isPrintable = printableRegex.test(this.keyName);
    },

    get getAccelKeyCode() {
        delete this.getAccelKeyCode;
        return this.getAccelKeyCode = sbCommonUtils.getPref("ui.key.accelKey", 0, true);
    },

    // return the normalized string
    toString: function () {
        var mainKey = this.keyName || "";
        var parts = Array.prototype.slice.call(this.modifiers);
        if (["Win", "Control", "Alt", "Shift"].indexOf(mainKey) == -1) {
            parts.push(mainKey);
        } else {
            parts.push("");
        }
        return parts.join("+");
    },

    // return the modifiers attribute for XUL <key> elements
    getModifiers: function () {
        var modifiers = [];
        if (this.accelKey) modifiers.push("accel");
        if (this.metaKey) modifiers.push("meta");
        if (this.ctrlKey) modifiers.push("control");
        if (this.altKey) modifiers.push("alt");
        if (this.shiftKey) modifiers.push("shift");
        return modifiers.join(" ");
    },

    // return the string which is nice to show in the UI
    getUIString: function () {
        var mainKey = this.keyName || "";
        var parts = Array.prototype.slice.call(this.modifiers);
        if (["Win", "Control", "Alt", "Shift"].indexOf(this.keyName) == -1) {
            mainKey = keyNameToUIStringMap[mainKey] || mainKey;
        } else {
            mainKey = "";
        }
        parts.push(mainKey);

        var keys = parts.join("+");

        // replace Accel
        if (this.getAccelKeyCode == 17) {
            keys = keys.replace("Accel", "Ctrl");
        } else if (this.getAccelKeyCode == 224) {
            keys = keys.replace("Accel", "Meta");
        } else if (this.getAccelKeyCode == 18) {
            keys = keys.replace("Accel", "Alt");
        } else if (this.getAccelKeyCode == 16) {
            keys = keys.replace("Accel", "Shift");
        }

        // use key symbols for Mac
        if (isMac) {
            keys = keys.replace("Meta", "\u2318").replace("Ctrl", "\u2303").replace("Alt", "\u2325").replace("Shift", "\u21E7");
        }

        return keys;
    },
};

// returns new object from a normalized string
Shortcut.fromString = function (str) {
    var data = {}
    var parts = str.split("+");
    data.keyCode = keyNameToCodeMap[parts.pop()];
    data.modifiers = [].concat(parts);
    return new Shortcut(data);
};

Shortcut.fromEvent = function (event) {
    var data = {};
    data.keyCode = event.keyCode;

    // We haven't instintiate Shortcut object now. Read if from current pref.
    var accelKeyCode = sbCommonUtils.getPref("ui.key.accelKey", 0, true);

    // if accel key is pressed, record it as "Accel" rather than usual
    var modifiers = [];
    if ((event.ctrlKey && accelKeyCode == 17) ||
        (event.metaKey && accelKeyCode == 224) ||
        (event.altKey && accelKeyCode == 18) ||
        (event.shiftKey && accelKeyCode == 16)) {
        modifiers.push("Accel");
    }
    if (event.metaKey && accelKeyCode != 224) modifiers.push("Meta");
    if (event.ctrlKey && accelKeyCode != 17) modifiers.push("Ctrl");
    if (event.altKey && accelKeyCode != 18) modifiers.push("Alt");
    if (event.shiftKey && accelKeyCode != 16) modifiers.push("Shift");
    data.modifiers = modifiers;

    return new Shortcut(data);
};
