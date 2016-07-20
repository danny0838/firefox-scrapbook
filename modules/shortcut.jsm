/********************************************************************
 *
 * The class for keyboard shortcut
 *
 * @public {class} Shortcut
 *
 *******************************************************************/

this.EXPORTED_SYMBOLS = ["Shortcut"];

/**
 * Shortcut class
 */

// possible values of nsIXULRuntime.OS:
// https://developer.mozilla.org/en/OS_TARGET
const nsIXULRuntime = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime);
const isMac = (nsIXULRuntime.OS.substring(0, 3).toLowerCase() == "mac");
const keyCodeToNameMap = {};
const keyNameToCodeMap = {};

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

function Shortcut(data) {
    this.keyCode = data.keyCode;
    this.modifiers = [];
    // unify the order
    if (data.modifiers.indexOf("Ctrl") !== -1) this.modifiers.push("Ctrl");
    if (data.modifiers.indexOf("Alt") !== -1) this.modifiers.push("Alt");
    if (data.modifiers.indexOf("Shift") !== -1) this.modifiers.push("Shift");
}

// A combination with all modifiers e.g. Ctrl+Alt is incomplete
Shortcut.prototype.isComplete = function () {
    var keyName = keyCodeToNameMap[this.keyCode];
    if (!keyName) return false;
    return (["Win", "Control", "Alt", "Shift"].indexOf(keyName) == -1);
};

Shortcut.prototype.isPrintable = function () {
    var keyName = keyCodeToNameMap[this.keyCode];
    if (!keyName) return false;
    return /^[0-9A-Za-z]$/.test(keyName);
};

// returns the normalized string
Shortcut.prototype.toString = function () {
    var keyName = keyCodeToNameMap[this.keyCode];

    // if the key is not registered, return empty string
    if (!keyName) return "";

    var parts = Array.prototype.slice.call(this.modifiers);
    if (["Win", "Control", "Alt", "Shift"].indexOf(keyName) == -1) {
        parts.push(keyName);
    } else {
        parts.push("");
    }

    return parts.join("+");
};

// return the modifiers attribute for XUL <key> elements
Shortcut.prototype.getModifiers = function () {
    var keys = this.toString();

    // if this shortcut is not effective, return empty string
    if (!keys) return "";

    var modifiers = [];
    if (this.modifiers.indexOf("Ctrl") != -1) modifiers.push("accel");
    if (this.modifiers.indexOf("Alt") != -1) modifiers.push("alt");
    if (this.modifiers.indexOf("Shift") != -1) modifiers.push("shift");
    return modifiers.join(" ");
};

// return the string which is nice to show in the UI
Shortcut.prototype.getUIString = function () {
    var keys = this.toString();

    // if this shortcut is not effective, return empty string
    if (!keys) return "";

    if (isMac) {
        keys = keys.replace("Ctrl", "\u2318").replace("Alt", "\u2325").replace("Shift", "\u21E7");
    }
    return keys;
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

    // normalized Ctrl = Command on Mac
    // normalized Alt = Option on Mac
    var modifiers = [];
    if ((event.ctrlKey && !isMac) || (event.metaKey && isMac)) modifiers.push("Ctrl");
    if (event.altKey) modifiers.push("Alt");
    if (event.shiftKey) modifiers.push("Shift");
    data.modifiers = modifiers;

    return new Shortcut(data);
};
