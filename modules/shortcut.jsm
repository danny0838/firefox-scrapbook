/********************************************************************
 *
 * The class for keyboard shortcut
 *
 * @public {class} sbShortcut
 *
 *******************************************************************/

this.EXPORTED_SYMBOLS = ["sbShortcut"];

const { sbCommonUtils } = Components.utils.import("resource://scrapbook-modules/common.jsm", {});

// possible values of nsIXULRuntime.OS:
// https://developer.mozilla.org/en/OS_TARGET
const nsIXULRuntime = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime);
const isMac = (nsIXULRuntime.OS == "Darwin");

const keyNameToUIStringMap = {
    "BackQuote": "`",
    "HyphenMinus": "-",
    "Equals": "=",
    "BackSlash": "\\",
    "OpenBracket": "[",
    "CloseBracket": "]",
    "Semicolon": ";",
    "Quote": '"',
    "Comma": ",",
    "Period": ".",
    "Slash": "/",
    "Left": "\u2190",
    "Up": "\u2191",
    "Right": "\u2192",
    "Down": "\u2193",
    "Return": "Enter",
    "Escape": "Esc",
    "PageUp": "PgUp",
    "PageDown": "PgDn",
    "Insert": "Ins",
    "Delete": "Del", // U+2326, U+2421
    "Decimal": "Numpad.",
    "Add": "Numpad+",
    "Subtract": "Numpad-",
    "Multiply": "Numpad*",
    "Divide": "Numpad/",
};

// Mac style keys
const keyNameToUIStringMapMac = {
    "Meta": "\u2318",
    "Ctrl": "\u2303",
    "Alt": "\u2325",
    "Shift": "\u21E7",
    "Return": "\u21A9", // U+23CE, U+21B5; Numpad Enter is same as Return in Firefox
    "Tab": "\u21E5",
    "CapsLock": "\u21EA",
    "Space": "\u2423",
    "Escape": "\u238B", // U+241B
    "PageUp": "\u21DE",
    "PageDown": "\u21DF",
    "Home": "\u2196",
    "End": "\u2198",
    "BackSpace": "\u232B",
    "Delete": "\u2326", // U+2421
};

// Retrieve native nsIDOMKeyEvent constants and build keyCode<->keyName map
// Convert DOM_VK_XXX_YYY to the form XxxYyy
//
// Ths list of nsIDOMKeyEvent constants can be found here:
// https://dxr.mozilla.org/mozilla-central/source/dom/interfaces/events/nsIDOMKeyEvent.idl
const keyCodeToNameMap = {};
const keyNameToCodeMap = {};
(function () {
    let keys = Components.interfaces.nsIDOMKeyEvent;
    for (var name in keys) {
        if (name.match(/^DOM_VK_/)) {
            let keyName = RegExp.rightContext.toLowerCase().replace(/(^|_)([a-z])/g, function(){
                return arguments[2].toUpperCase();
            });
            let keyCode = keys[name];
            keyCodeToNameMap[keyCode] = keyName;
            keyNameToCodeMap[keyName] = keyCode;
        }
    }
})();

const printableRegex = /^[0-9A-Za-z]$/;

// This pref natively requires a restart to get it work,
// and thus we only get it once and for all.
const accelKeyCode = sbCommonUtils.getPref("ui.key.accelKey", 0, true);


/**
 * sbShortcut class
 */
function sbShortcut(data) {
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

sbShortcut.prototype = {
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

    // return an array containing the keys
    get getKeys() {
        let mainKey = this.keyName || "";
        if (["Win", "Control", "Alt", "Shift"].indexOf(mainKey) != -1) {
            mainKey = "";
        }
        let parts = Array.prototype.slice.call(this.modifiers);
        parts.push(mainKey);
        delete this.getKeys;
        return this.getKeys = parts;
    },

    // return the normalized string
    toString: function () {
        return this.getKeys.join("+");
    },

    // return the string which is nice to show in the UI
    getUIString: function () {
        let keys = this.getKeys.map(function(key) {
            // replace Accel
            if (key == "Accel") {
                if (accelKeyCode == 17) {
                    key = "Ctrl";
                } else if (accelKeyCode == 224) {
                    key = "Meta";
                } else if (accelKeyCode == 18) {
                    key = "Alt";
                } else if (accelKeyCode == 16) {
                    key = "Shift";
                }
            }

            // use Mac symbol if it's Mac
            if (isMac) {
                if (keyNameToUIStringMapMac[key]) {
                    return keyNameToUIStringMapMac[key];
                }
            }

            // use the string for output
            if (keyNameToUIStringMap[key]) {
                return keyNameToUIStringMap[key];
            }

            return key;
        });

        // Mac style modifier keys: reversed order and no "+" inbetween
        if (isMac) {
            let macKeys = [keys.pop()];
            while (keys.length) {
                macKeys.unshift(keys.shift());
            }
            return macKeys.join("");
        }

        return keys.join("+");
    },

    // return the keycode attribute for XUL <key> elements
    getKeyCode: function() {
        if (!this.isValid) return "";
        return "VK_" + this.keyName.replace(/(?!^)[A-Z]/g, "_$&").toUpperCase();
    },

    // return the modifiers attribute for XUL <key> elements
    getModifiers: function () {
        let modifiers = [];
        if (this.accelKey) modifiers.push("accel");
        if (this.metaKey) modifiers.push("meta");
        if (this.ctrlKey) modifiers.push("control");
        if (this.altKey) modifiers.push("alt");
        if (this.shiftKey) modifiers.push("shift");
        return modifiers.join(" ");
    },
};

// returns new object from a normalized string
sbShortcut.fromString = function (str) {
    let data = {}
    let parts = str.split("+");
    data.keyCode = keyNameToCodeMap[parts.pop()];
    data.modifiers = [].concat(parts);
    return new sbShortcut(data);
};

// Use keydown event as possible since keypress event could be inaccurate sometimes
// e.g. Space gets event.keyCode = 0
// and is more likely to be overriden by other key events.
sbShortcut.fromEvent = function (event) {
    let data = {};
    data.keyCode = event.keyCode;

    // if accel key is pressed, record it as "Accel" rather than usual
    let modifiers = [];
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

    return new sbShortcut(data);
};
