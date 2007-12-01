
var gID;
var gRes;
var sbDataSource;



function SB_initView()
{
	document.location.search.match(/\?id\=(\d{14})$/);
	gID = RegExp.$1;
	if ( !gID ) return;
	var win = sbCommonUtils.WINDOW.getMostRecentWindow("navigator:browser");
	if ( !win ) return;
	sbDataSource = win.sbDataSource;
	gRes = sbCommonUtils.RDF.GetResource(gID ? "urn:scrapbook:item" + gID : "urn:scrapbook:root");
	if ( !sbDataSource.isContainer(gRes) )
	{
		window.location.href = sbDataSource.getURL(gRes);
		return;
	}


	var src = SB_getHTMLHead(sbDataSource.getProperty(gRes, "title"));

	var resList = sbDataSource.flattenResources(gRes, 2, false);
	for ( var i = 0; i < resList.length; i++ )
	{
		var res = resList[i];
		if (sbDataSource.getProperty(res, "type") == "separator")
			continue;
		var item = sbCommonUtils.newItem();
		for ( var prop in item ) item[prop] = sbDataSource.getProperty(res, prop);
		if ( !item.icon ) item.icon = sbCommonUtils.getDefaultIcon(sbDataSource.getProperty(res, "type"));
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


function SB_getHTMLHead(aTitle)
{
	var src = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">\n\n'
	src += '<html>\n\n'
	src += '<head>\n'
	src += '	<meta http-equiv="Content-Type" content="text/html;charset=UTF-8">\n'
	src += '	<meta http-equiv="Content-Style-Type" content="text/css">\n'
	src += '	<title>' + aTitle + '</title>\n'
	src += '	<link rel="stylesheet" type="text/css" href="chrome://scrapbook/skin/combine.css" media="screen,print">\n'
	src += '</head>\n\n'
	src += '<body>\n\n';
	return src;
}


function SB_getHTMLBody(aItem)
{
	var src = "";
	src += '<cite class="scrapbook-header">\n';
	src += '\t<img src="' + (aItem.icon ? aItem.icon : sbCommonUtils.getDefaultIcon(aItem.type)) + '" width="16" height="16">\n';
	src += '\t<a href="' + aItem.source + '" target="_top">' + sbCommonUtils.crop(aItem.title, 100) + '</a>\n';
	src += '</cite>\n';
	if ( aItem.type != "bookmark" ) src += '<iframe class="scrapbook-iframe" src="./data/' + aItem.id + '/index.html" onload="this.setAttribute(\'style\', \'height:\' + (this.contentDocument.height || 600 + 30));"></iframe>\n';
	return src;
}


function SB_getHTMLFoot()
{
	var src = '</body>\n\n' + '</html>\n';
	return src;
}


