
var gID;
var gRes;



function SB_initView()
{
	gID = document.location.href.match(/\?id\=(\d{14})$/);
	gID = RegExp.$1;

	sbDataSource.init();

	var resURI = gID ? "urn:scrapbook:item" + gID : "urn:scrapbook:root";
	gRes = SBservice.RDF.GetResource(resURI);
	var type = sbDataSource.getProperty("type", gRes);
	if ( type != "folder" )
	{
		window.location.href = SBcommon.getURL(gID, type);
		return;
	}


	var src = SB_getHTMLHead(sbDataSource.getProperty("title", gRes));

	SBservice.RDFC.Init(sbDataSource.data, gRes);
	var resEnum = SBservice.RDFC.GetElements();
	while ( resEnum.hasMoreElements() )
	{
		var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
		if ( SBservice.RDFCU.IsContainer(sbDataSource.data, res) ) continue;
		var item = new ScrapBookItem();
		for ( var prop in item )
		{
			item[prop] = sbDataSource.getProperty(prop, res);
		}
		if ( !item.icon ) item.icon = SBcommon.getDefaultIcon(sbDataSource.getProperty("type", res));
		src += SB_getHTMLBody(item);
	}

	src += SB_getHTMLFoot();

	var file = SBcommon.getScrapBookDir().clone();
	file.append("collection.html");
	if ( !file.exists() ) file.create(file.NORMAL_FILE_TYPE, 0666);
	SBcommon.writeFile(file, src, "UTF-8");
	var filePath = SBservice.IO.newFileURI(file).spec;
	window.location.href = filePath;
}


function SB_getHTMLHead(aTitle)
{
	var src = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">\n\n'
	        + '<html>\n\n'
	        + '<head>\n'
	        + '	<meta http-equiv="Content-Type" content="text/html;Charset=UTF-8">\n'
	        + '	<meta http-equiv="Content-Style-Type" content="text/css">\n'
	        + '	<title>' + aTitle + '</title>\n'
	        + '	<link rel="stylesheet" type="text/css" href="chrome://scrapbook/skin/combine.css" media="screen,print">\n'
	        + '</head>\n\n'
	        + '<body>\n\n';
	return src;
}


function SB_getHTMLBody(aSBitem)
{
	var url   = ( aSBitem.source.length > 100 ) ? aSBitem.source.substring(0,100) + "..." : aSBitem.source;
	var title = ( aSBitem.title.length  > 100 ) ? aSBitem.title.substring(0,100)  + "..." : aSBitem.title;
	var icon  = aSBitem.icon ? aSBitem.icon : SBcommon.getDefaultIcon(aSBitem.type);
	var src = "";
	src += '<cite class="scrapbook-header">\n';
	src += '\t<img src="' + icon + '" width="16" height="16">\n';
	src += '\t<span>' + title + '</span>\n';
	src += '\t<a href="' + aSBitem.source + '" target="_top">' + url + '</a>\n';
	src += '</cite>\n';
	src += '<iframe class="scrapbook-iframe" src="./data/' + aSBitem.id + '/index.html" onload="this.setAttribute(\'style\', \'height:\' + (this.contentDocument.height+30));"></iframe>\n';
	return src;
}


function SB_getHTMLFoot()
{
	var src = '</body>\n\n' + '</html>\n';
	return src;
}


