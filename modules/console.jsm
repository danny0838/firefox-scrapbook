/********************************************************************
 *
 * A basic console.* implemention for debugging
 *
 * @public {class} console
 *
 *******************************************************************/

this.EXPORTED_SYMBOLS = ["console"];

try {
  // use Firefox built-in console module if available
  Components.utils.import("resource://gre/modules/Console.jsm");
} catch (ex) {
  // for older Firefox versions, use shim implementation
  var console = {};

  console.nsIWindowMediator = Components.classes['@mozilla.org/appshell/window-mediator;1']
                                .getService(Components.interfaces.nsIWindowMediator);

  console.getContentWindow = function () {
    return console.nsIWindowMediator.getMostRecentWindow("navigator:browser");
  };

  console._fxVer30 = (function () {
    // Firefox >= 30.0: window.console.log for addons can be seen; has window.console.count
    // Firefox >=  4.0: has window.console.log, but addon logs do not show; no window.console.count
    // Firefox <   4.0: no window.console.log
    var window = console.getContentWindow();
    return window.console && window.console.count;
  })();

  console.log = function (data) {
    if (console._fxVer30) {
      var window = console.getContentWindow();
      window.console.log(data);
    } else {
      var nsIConsoleService = Components.classes['@mozilla.org/consoleservice;1']
                                .getService(Components.interfaces.nsIConsoleService);
      // @FIXME: does not record the script line and is not suitable for tracing...
      nsIConsoleService.logStringMessage(data);
    }
  };

  console.warn = function (data) {
    if (console._fxVer30) {
      var window = console.getContentWindow();
      window.console.warn(data);
    } else {
      // set javascript.options.showInConsole to true in the about:config to see it
      // default true since Firefox 4.0
      Components.utils.reportError(data);
    }
  };

  console.error = function (data) {
    if (console._fxVer30) {
      var window = console.getContentWindow();
      window.console.error(data);
    } else {
      // set javascript.options.showInConsole to true in the about:config to see it
      // default true since Firefox 4.0
      Components.utils.reportError(data);
    }
  };
}
