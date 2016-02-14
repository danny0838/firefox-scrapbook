
var gID;
var gRes;



function SB_initView() {
    gID = sbCommonUtils.parseURLQuery(document.location.search.substring(1))['id'];
    if ( !gID ) return;
    var win = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
    if ( !win ) return;
    gRes = sbCommonUtils.RDF.GetResource(gID ? "urn:scrapbook:item" + gID : "urn:scrapbook:root");
    if ( !sbDataSource.isContainer(gRes) ) {
        window.location.href = sbDataSource.getURL(gRes);
        return;
    }


    var src = SB_getHTMLHead(sbDataSource.getProperty(gRes, "title"));

    var resList = sbDataSource.flattenResources(gRes, 2, false);
    for ( var i = 0; i < resList.length; i++ ) {
        var res = resList[i];
        if (sbDataSource.getProperty(res, "type") == "separator")
            continue;
        var item = sbDataSource.getItem(res);
        if ( !item.icon ) item.icon = sbCommonUtils.getDefaultIcon(item.type);
        item.icon = sbCommonUtils.convertResURLToURL(item.icon, true);
        src += SB_getHTMLBody(item);
    }

    src += SB_getHTMLFoot();

    var file = sbCommonUtils.getScrapBookDir().clone();
    file.append("collection.html");
    if ( !file.exists() ) file.create(file.NORMAL_FILE_TYPE, 0666);
    sbCommonUtils.writeFile(file, src, "UTF-8");
    var filePath = sbCommonUtils.IO.newFileURI(file).spec;
    window.location.href = filePath;
}


function SB_getHTMLHead(aTitle) {
    var src = '<!DOCTYPE html>\n'
        + '<html>\n'
        + '<head>\n'
        + '<meta charset="UTF-8">\n'
        + '<title>' + sbCommonUtils.escapeHTMLWithSpace(aTitle, true) + '</title>\n'
        + '<style type="text/css" media="all" data-sb-obj="stylesheet">\n'
        + 'body {\n'
        + '    margin: 0px;\n'
        + '    background-color: #FFFFFF;\n'
        + '}\n'

        + 'cite.scrapbook-header {\n'
        + '    clear: both;\n'
        + '    display: block;\n'
        + '    padding: 3px 6px;\n'
        + '    font-family: "MS UI Gothic","Tahoma","Verdana","Arial","Sans-Serif","Helvetica";\n'
        + '    font-style: normal;\n'
        + '    font-size: 12px;\n'
        + '    background-color: InfoBackground;\n'
        + '    border: 1px solid ThreeDShadow;\n'
        + '}\n'

        + 'cite.scrapbook-header img {\n'
        + '    vertical-align: middle;\n'
        + '}\n'

        + 'cite.scrapbook-header a {\n'
        + '    color: InfoText;\n'
        + '    text-decoration: none;\n'
        + '}\n'

        + 'cite.scrapbook-header a[href]:hover {\n'
        + '    color: #3388FF;\n'
        + '}\n'

        + 'cite.scrapbook-header a.marked { font-weight: bold; }\n'
        + 'cite.scrapbook-header a.combine  { color: blue; }\n'
        + 'cite.scrapbook-header a.bookmark { color: limegreen; }\n'
        + 'cite.scrapbook-header a.notex { color: rgb(80,0,32); }\n'+ '\n'

        + 'iframe.scrapbook-iframe {\n'
        + '    padding: 0px;\n'
        + '    border: 0px;\n'
        + '    margin: 0px;\n'
        + '    width: 100%;\n'
        + '    height: 250px;\n'
        + '}\n'
        + '</style>\n'
        + '<script>\n'
        + 'window.onresize = function() {\n'
        + '    var elems = document.getElementsByTagName("iframe");\n'
        + '    for (var i=0, I=elems.length; i<I; i++) fixHeight(elems[i]);\n'
        + '}\n'
        + 'function fixHeight(elem){\n'
        + '    try {\n'
        + '        var elemHtml = elem.contentDocument.documentElement;\n'
        + '        var elemBody = elem.contentDocument.body;\n'
        + '    } catch(ex) {}\n'
        + '    if (elemHtml && elemBody.tagName === "BODY") {\n'
        + '        elem.style.height = 1 + "px";\n'
        + '        elem.style.height = elemHtml.scrollHeight + 30 + "px";\n'
        + '    } else {\n'
        + '        elem.style.height = window.innerHeight + "px";\n'
        + '    }\n'
        + '}'
        + '</script>\n'
        + '</head>\n'
        + '<body>\n';
    return src;
}


function SB_getHTMLBody(aItem) {
    var src = '<cite class="scrapbook-header">\n'
        + '\t<img src="' + sbCommonUtils.escapeHTML(aItem.icon) + '" width="16" height="16">\n'
        + '\t<a href="' + sbCommonUtils.escapeHTML(aItem.source) + '" target="_top">' + sbCommonUtils.escapeHTMLWithSpace(aItem.title, true) + '</a>\n'
        + '</cite>\n';
    if ( aItem.type != "bookmark" ) src += '<iframe class="scrapbook-iframe" src="data/' + aItem.id + '/index.html" onload="fixHeight(this);"></iframe>\n';
    return src;
}


function SB_getHTMLFoot() {
    var src = '</body>\n' + '</html>\n';
    return src;
}


