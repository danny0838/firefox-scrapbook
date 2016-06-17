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

const stringBundles = [];

/**
 * Gets the specific language bundle. Create one it it doesn't yet exist.
 */
var getLangBundle = function (aBundle) {
    var bundle = stringBundles[aBundle];
    if (!bundle) {
        var uri = "chrome://scrapbook/locale/%s.properties".replace("%s", aBundle);
        bundle = stringBundles[aBundle] = stringBundle.createBundle(uri);
    }
    return bundle;
};

/**
 * Returns the localized string for ScrapBook X
 */
var lang = function (aBundle, aName, aArgs) {
    var bundle = getLangBundle(aBundle);
    try {
        if (!aArgs) {
            return bundle.GetStringFromName(aName);
        } else {
            return bundle.formatStringFromName(aName, aArgs, aArgs.length);
        }
    } catch (ex) {}
    return aName;
};
