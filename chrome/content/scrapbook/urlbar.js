var sbUrlBarStatusListener = {
    QueryInterface: function(aIID) {
        if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
                aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
                aIID.equals(Components.interfaces.nsISupports))
            return this;
        throw Components.results.NS_NOINTERFACE;
    },

    onLocationChange: function(aProgress, aRequest, aURI) {
        //todo 检查当前页面是否是在资料库中
       ScrapBookUtils.log(1)
        sbContext.updateStatus();
        sbUrlBarStatus.processNewURL(aURI);

    },

    onStateChange: function(a, b, c, d) {
    },
    onProgressChange: function(a, b, c, d, e, f) {
    },
    onStatusChange: function(a, b, c, d) {
    },
    onSecurityChange: function(a, b, c) {
    }
};

var sbUrlBarStatus = {
    oldURL: null,

    init: function() {
        // Listen for webpage loads
        try {
            gBrowser.addProgressListener(sbUrlBarStatusListener);
        } catch(e) {
            ScrapBookUtils.log(e);

        }
    },

    uninit: function() {

        try {
            gBrowser.removeProgressListener(sbUrlBarStatusListener);
        } catch(e) {
        }
    },

    processNewURL: function(aURI) {
        if (aURI.spec == this.oldURL)
            return;

        // now we know the url is new...
        //alert(aURI.spec);
        this.oldURL = aURI.spec;
    }

};

window.addEventListener("load", function() {
    sbUrlBarStatus.init()
}, false);
window.addEventListener("unload", function() {
    sbUrlBarStatus.uninit()
}, false);