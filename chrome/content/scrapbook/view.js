
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


function SB_getHTMLHead(aTitle)
{
	var src = '<!DOCTYPE html>\n'
		+ '<html>\n'
		+ '<head>\n'
		+ '	<meta charset="UTF-8">\n'
		+ '	<title>' + sbCommonUtils.escapeHTML(aTitle, true) + '</title>\n'
		+ '	<link rel="stylesheet" type="text/css" href="chrome://scrapbook/skin/combine.css" media="screen,print" data-sb-obj="stylesheet">\n'
		+ '	<script>\n'
		+ '	function initHeight(obj){\n'
		+ '		obj.style.height = parseInt(obj.contentDocument.documentElement.scrollHeight, 10) + 30 + \'px\';\n'
		+ '	}\n'
		+ '	</script>\n'
		+ '</head>\n'
		+ '<body>\n';
	return src;
}


function SB_getHTMLBody(aItem)
{
	var src = '<cite class="scrapbook-header">\n'
		+ '\t<img src="' + sbCommonUtils.escapeHTML(aItem.icon) + '" width="16" height="16">\n'
		+ '\t<a href="' + sbCommonUtils.escapeHTML(aItem.source) + '" target="_top">' + sbCommonUtils.escapeHTML(sbCommonUtils.crop(aItem.title, 100)) + '</a>\n'
		+ '</cite>\n';
	if ( aItem.type != "bookmark" ) src += '<iframe class="scrapbook-iframe" src="./data/' + aItem.id + '/index.html" onload="initHeight(this);"></iframe>\n';
	return src;
}


function SB_getHTMLFoot()
{
	var src = '</body>\n' + '</html>\n';
	return src;
}


