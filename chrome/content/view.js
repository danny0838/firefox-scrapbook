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

	var ResURL = gID ? "urn:scrapbook:item" + gID : "urn:scrapbook:root";
	gRes = SBservice.RDF.GetResource(ResURL);
	var type = SBRDF.getProperty("type", gRes);
	if ( type != "folder" )
	{
		window.location.href = SBcommon.getURL(gID, type);
		return;
	}


	var htmlSrc = SB_getHTMLHead(SBRDF.getProperty("title", gRes));

	SBservice.RDFC.Init(SBRDF.data, gRes);
	var ResList = SBservice.RDFC.GetElements();
	while ( ResList.hasMoreElements() )
	{
		var aRes = ResList.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
		var aID  = SBRDF.getProperty("id", aRes);
		if ( SBservice.RDFCU.IsContainer(SBRDF.data, aRes) ) continue;
		var aSBitem = new ScrapBookItem(aID);
		aSBitem.title   = SBRDF.getProperty("title", aRes);
		aSBitem.icon    = SBRDF.getProperty("icon", aRes);
		aSBitem.source  = SBRDF.getProperty("source", aRes);
		aSBitem.comment = SBRDF.getProperty("comment", aRes);
		if ( !aSBitem.icon ) aSBitem.icon = SBcommon.getDefaultIcon(SBRDF.getProperty("type", aRes));
		htmlSrc += SB_getHTMLBody(aSBitem);
	}

	htmlSrc += SB_getHTMLFoot();

	var htmlFile = SBcommon.getScrapBookDir().clone();
	htmlFile.append("collection.html");
	if ( !htmlFile.exists() ) htmlFile.create(htmlFile.NORMAL_FILE_TYPE, 0666);
	SBcommon.writeFile(htmlFile, htmlSrc, "UTF-8");
	var htmlFilePath = SBservice.IO.newFileURI(htmlFile).spec;
	window.location.href = htmlFilePath;
}


function SB_getHTMLHead(aTitle)
{
	var HTML = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">\n\n'
	         + '<html>\n\n'
	         + '<head>\n'
	         + '	<meta http-equiv="Content-Type" content="text/html;Charset=UTF-8">\n'
	         + '	<meta http-equiv="Content-Style-Type" content="text/css">\n'
	         + '	<title>' + aTitle + '</title>\n'
	         + '	<link rel="stylesheet" type="text/css" href="chrome://scrapbook/skin/collection.css" media="screen,print">\n'
	         + '</head>\n\n'
	         + '<body>\n\n';
	return HTML;
}


function SB_getHTMLBody(aSBitem)
{
	var aSource = ( aSBitem.source.length > 100 ) ? aSBitem.source.substring(0,100) + "..." : aSBitem.source;
	var aFilePath = './data/' + aSBitem.id + '/index.html';
	var HTML = '<cite>' + aSBitem.title + ' <a href="' + aSBitem.source + '" target="_top">' + aSource + '</a></cite>\n'
		     + '<iframe src="' + aFilePath + '" onload="this.setAttribute(\'style\', \'height:\' + (this.contentDocument.height+30));"></iframe>\n';
	return HTML;
}


function SB_getHTMLFoot()
{
	var HTML = '</body>\n\n' + '</html>\n';
	return HTML;
}


