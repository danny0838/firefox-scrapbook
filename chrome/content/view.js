/**************************************************
// view.js
// Implementation file for view.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var gID, gRes;



function SB_initView()
{
	gID = document.location.href.match(/\?id\=(\d{14})$/);
	gID = RegExp.$1;

	SBRDF.init();

	var resURI = gID ? "urn:scrapbook:item" + gID : "urn:scrapbook:root";
	gRes = SBservice.RDF.GetResource(resURI);
	var type = SBRDF.getProperty("type", gRes);
	if ( type != "folder" )
	{
		window.location.href = SBcommon.getURL(gID, type);
		return;
	}


	var src = SB_getHTMLHead(SBRDF.getProperty("title", gRes));

	SBservice.RDFC.Init(SBRDF.data, gRes);
	var resEnum = SBservice.RDFC.GetElements();
	while ( resEnum.hasMoreElements() )
	{
		var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
		if ( SBservice.RDFCU.IsContainer(SBRDF.data, res) ) continue;
		var item = new ScrapBookItem();
		for ( var prop in item )
		{
			item[prop] = SBRDF.getProperty(prop, res);
		}
		if ( !item.icon ) item.icon = SBcommon.getDefaultIcon(SBRDF.getProperty("type", res));
		dumpObj(item);
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
	        + '	<link rel="stylesheet" type="text/css" href="chrome://scrapbook/skin/collection.css" media="screen,print">\n'
	        + '</head>\n\n'
	        + '<body>\n\n';
	return src;
}


function SB_getHTMLBody(aSBitem)
{
	var url = ( aSBitem.source.length > 100 ) ? aSBitem.source.substring(0,100) + "..." : aSBitem.source;
	var filePath = './data/' + aSBitem.id + '/index.html';
	var src = '<cite>' + aSBitem.title + ' <a href="' + aSBitem.source + '" target="_top">' + url + '</a></cite>\n'
		    + '<iframe src="' + filePath + '" onload="this.setAttribute(\'style\', \'height:\' + (this.contentDocument.height+30));"></iframe>\n';
	return src;
}


function SB_getHTMLFoot()
{
	var src = '</body>\n\n' + '</html>\n';
	return src;
}


