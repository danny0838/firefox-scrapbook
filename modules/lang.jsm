/********************************************************************
 *
 * ScrapBook language pack handling
 *
 * @public {function} lang
 *
 *******************************************************************/

this.EXPORTED_SYMBOLS = ["lang"];

const stringBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                     .getService(Components.interfaces.nsIStringBundleService);

const _bundle = stringBundle.createBundle("chrome://scrapbook/locale/message.properties");

/**
 * Returns the localized string for ScrapBook X
 *
 * - For simpilicity, all strings for scripts are defined in:
 *   chrome://scrapbook/locale/<lang>/message.properties
 *
 * @param string key   The key to be searched in the .properties string bundle file.
 *                     If not defined, return the key string
 * @param string arg1  The first argument to be put in %s or so
 * @param string arg2
 * ...
 */
function lang(key) {
    try {
        if (arguments.length > 1) {
            let args = Array.prototype.slice.call(arguments, 1);
            return _bundle.formatStringFromName(key, args, args.length);
        } else {
            return _bundle.GetStringFromName(key);
        }
    } catch (ex) {}
    return key;
}
