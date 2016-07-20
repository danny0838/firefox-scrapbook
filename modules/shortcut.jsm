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
    if (data.modifiers.indexOf("Meta") !== -1) this.modifiers.push("Meta");
    if (data.modifiers.indexOf("Ctrl") !== -1) this.modifiers.push("Ctrl");
    if (data.modifiers.indexOf("Alt") !== -1) this.modifiers.push("Alt");
    if (data.modifiers.indexOf("Shift") !== -1) this.modifiers.push("Shift");
}

Shortcut.prototype.toString = function () {
    var parts = [];
    var keyName = keyCodeToNameMap[this.keyCode];

    // if the key is not registered, return null
    if (!keyName) return null;

    parts = parts.concat(this.modifiers);
    parts.push(keyName);

    return parts.join("+");
};

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

    var modifiers = [];
    if (event.metaKey) modifiers.push("Meta");
    if (event.ctrlKey) modifiers.push("Ctrl");
    if (event.altKey) modifiers.push("Alt");
    if (event.shiftKey) modifiers.push("Shift");
    data.modifiers = modifiers;

    return new Shortcut(data);
};
