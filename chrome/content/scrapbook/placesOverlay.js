function sbPlacesOverlayInit() {

    let placesContext = document.getElementById("placesContext");
    placesContext.addEventListener("popupshowing", function(event) {
        try {
            let node = this._view.selectedNode;
            if(node)
            {
                //必须是书签，而且在sb目录
                let inSb = sbCommonUtils.inScrapbook(node.itemId) && node.type==0;
                document.getElementById("ScrapbookStorage").hidden = !inSb;
                document.getElementById("ScrapbookStorageSep").hidden = !inSb;
            }else
            {
                let nodes = this._view.selectedNodes;
                let test = nodes.some(function(n){
                    //如果有一个不是书签，或者不在sb目录，就不显示了。
                    return n.type!=0 || !sbCommonUtils.inScrapbook(n.itemId);
                });
                document.getElementById("ScrapbookStorage").hidden = test;
                document.getElementById("ScrapbookStorageSep").hidden = test;

            }
        } catch(e) {
            document.getElementById("ScrapbookStorage").hidden = true;
            document.getElementById("ScrapbookStorageSep").hidden = true;
        }

    }, false);
}

window.addEventListener("load", sbPlacesOverlayInit, false);
window.addEventListener("unload", function() {

}, false);