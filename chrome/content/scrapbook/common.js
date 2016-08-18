/********************************************************************
 *
 * Shared classes for most scripts.
 *
 * @public {class} sbCommonUtils
 * @public {class} sbDataSource
 * @public {class} sbShortcut
 *
 *******************************************************************/

Components.utils.import("resource://scrapbook-modules/common.jsm");
Components.utils.import("resource://scrapbook-modules/datasource.jsm");
Components.utils.import("resource://scrapbook-modules/shortcut.jsm");

/* javascript polyfill */
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
        position = position || 0;
        return this.substr(position, searchString.length) === searchString;
    };
}
