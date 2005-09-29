/**************************************************
// output.js
// Implementation file for output.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBstring;
var gSelectAll;
var gFrameOption;



function SB_initOutput()
{
	SBstring = document.getElementById("ScrapBookString");
	document.documentElement.getButton("accept").label = SBstring.getString("OUTPUT_OK_BUTTON");
	sbDataSource.init();
	SBtreeUtil.init("ScrapBookTree", true);
	SB_selectAllFolders();
	if ( window.location.href.match(/\?auto/) )
	{
		document.getElementById("ScrapBookOutputOptionO").checked = false;
		SB_execOutput();
	}
}


function SB_selectAllFolders()
{
	if ( document.getElementById('ScrapBookOutputOptionA').checked )
	{
		SBtreeUtil.toggleAllFolders(true);
		SBtree.view.selection.selectAll();
		SBtree.treeBoxObject.focused = true;
	}
	gSelectAll = true;
}


function SB_toggleAllSelection()
{
	document.getElementById("ScrapBookOutputOptionA").checked = false;
	gSelectAll = false;
}


function SB_execOutput()
{
	gFrameOption = document.getElementById("ScrapBookOutputOptionF").checked;

	SBoutput.init();
	if ( gSelectAll )
	{
		SBoutput.processRDFRescursively(SBservice.RDF.GetResource("urn:scrapbook:root"));
	}
	else
	{
		var selResList = SBtreeUtil.getSelection(true, 1);
		SBoutput.src += "<ul>\n";
		for ( var i = 0; i < selResList.length; i++ )
		{
			SBoutput.exec(selResList[i]);
		}
		SBoutput.src += "</ul>\n";
	}
	SBoutput.finalize();
	SBtreeUtil.toggleAllFolders(true);
	if ( window.location.href.match(/\?auto/) ) setTimeout(function(){ window.close(); }, 1000);
}




var SBoutput = {

	depth : 0,
	src   : "",

	init : function()
	{
		this.src = this.getHTMLHead();
	},

	finalize : function()
	{
		var myDir = SBcommon.getScrapBookDir().clone();
		myDir.append("tree");
		if ( !myDir.exists() ) myDir.create(myDir.DIRECTORY_TYPE, 0700);

		var urlHash = {
			"chrome://scrapbook/skin/treestyle.css"  : "treestyle.css",
			"chrome://scrapbook/skin/treeitem.png"   : "treeitem.png",
			"chrome://scrapbook/skin/treenote.png"   : "treenote.png",
			"chrome://scrapbook/skin/treefolder.png" : "treefolder.png",
			"chrome://scrapbook/skin/tool_togglefolder.png" : "togglefolder.png",
		};
		for ( var url in urlHash )
		{
			var destFile = myDir.clone();
			destFile.append(urlHash[url]);
			SBcommon.saveTemplateFile(url, destFile);
		}

		var myFrameFile = myDir.clone();
		myFrameFile.append("frame.html");
		if ( !myFrameFile.exists() ) myFrameFile.create(myFrameFile.NORMAL_FILE_TYPE, 0666);
		SBcommon.writeFile(myFrameFile, this.getHTMLFrame(), "UTF-8");

		var myFile = myDir.clone();
		myFile.append("index.html");
		if ( !myFile.exists() ) myFile.create(myFile.NORMAL_FILE_TYPE, 0666);
		this.src += this.getHTMLFoot();
		SBcommon.writeFile(myFile, this.src, "UTF-8");

		var fileName = gFrameOption ? "frame.html" : "index.html";
		if ( document.getElementById("ScrapBookOutputOptionO").checked )
		{
			SBcommon.loadURL(SBcommon.convertFilePathToURL(myDir.path) + fileName, SBcommon.getBoolPref("scrapbook.usetab.output", false));
		}
	},

	exec : function(aContRes)
	{
		this.src += '<li class="depth' + String(this.depth) + '">';
		this.src += this.getHTMLBody(aContRes);
		this.processRDFRescursively(aContRes);
		this.src += "</li>\n";
	},

	processRDFRescursively : function(aContRes)
	{
		this.depth++;
		var myID = sbDataSource.getProperty("id", aContRes);
		if ( !myID ) myID = "root";
		this.src += '<ul id="folder-' + myID + '">\n';
		SBservice.RDFC.Init(sbDataSource.data, aContRes);
		var ResList = SBservice.RDFC.GetElements();
		while ( ResList.hasMoreElements() )
		{
			var aRes = ResList.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			this.src += '<li class="depth' + String(this.depth) + '">';
			this.src += this.getHTMLBody(aRes);
			if ( SBservice.RDFCU.IsContainer(sbDataSource.data, aRes) ) this.processRDFRescursively(aRes);
			this.src += "</li>\n";
		}
		this.src += "</ul>\n";
		this.depth--;
	},

	getHTMLHead : function()
	{
		var HTML = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">\n\n'
		         + '<html>\n\n'
		         + '<head>\n'
		         + '	<meta http-equiv="Content-Type" content="text/html;Charset=UTF-8">\n'
		         + '	<meta http-equiv="Content-Style-Type" content="text/css">\n'
		         + '	<meta http-equiv="Content-Script-Type" content="text/javascript">\n'
		         + '	<title>ScrapBook</title>\n'
		         + '	<link rel="stylesheet" type="text/css" href="./treestyle.css" media="all">\n'
		         + '	<script type="text/javascript" language="JavaScript"><!--\n'
		         + '	function toggle(aID) {\n'
		         + '		var listElt = document.getElementById(aID);\n'
		         + '		listElt.style.display = ( listElt.style.display == "none" ) ? "block" : "none";\n'
		         + '	}\n'
		         + '	function toggleAll(willOpen) {\n'
		         + '		var ulElems = document.getElementsByTagName("UL");\n'
		         + '		for ( var i = 1; i < ulElems.length; i++ ) {\n'
		         + '			ulElems[i].style.display = willOpen ? "block" : "none";\n'
		         + '		}\n'
		         + '	}\n'
		         + '	//--></script>\n'
		         + '</head>\n\n'
		         + '<body onload="toggleAll(false);">\n\n'
		         + '<div id="header">\n'
		         + '	<a href="#" onclick="toggleAll(true);">Open</a>\n'
		         + '	<a href="#" onclick="toggleAll(false);">Close</a>\n'
		         + '</div>\n\n';
		return HTML;
	},

	getHTMLBody : function(aRes)
	{
		var myID    = sbDataSource.getProperty("id", aRes);
		var myTitle = sbDataSource.getProperty("title", aRes);
		var myIcon  = sbDataSource.getProperty("icon", aRes);
		if ( myIcon.match(/(\/data\/\d{14}\/.*$)/) ) myIcon = ".." + RegExp.$1;
		if ( !myIcon ) myIcon = SBcommon.getFileName( SBcommon.getDefaultIcon(sbDataSource.getProperty("type", aRes)) );
		myTitle = myTitle.replace(/</g, "&lt;");
		myTitle = myTitle.replace(/>/g, "&gt;");
		var target = gFrameOption ? ' target="main"' : "";
		if ( sbDataSource.getProperty("type", aRes) == "folder" ) {
			HTML = '<a class="folder" href="javascript:toggle(\'folder-' + myID + '\');"><img src="./treefolder.png" width="16" height="16" alt="">' + myTitle + '</a>\n';
		} else {
			HTML = '<a href="../data/' + myID + '/index.html"' + target + '><img src="' + myIcon + '" width="16" height="16" alt="">' + myTitle + '</a>';
		}
		return HTML;
	},

	getHTMLFoot : function()
	{
		var HTML = "\n</body>\n</html>\n";
		return HTML;
	},

	getHTMLFrame : function()
	{
		var HTML = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN">\n\n'
		         + '<html>\n\n'
		         + '<head>\n'
		         + '	<meta http-equiv="Content-Type" Content="text/html;Charset=UTF-8">\n'
		         + '	<title>ScrapBook</title>\n'
		         + '</head>\n\n'
		         + '<frameset cols="200,*">\n'
		         + '	<frame name="side" src="./index.html">\n'
		         + '	<frame name="main">\n'
		         + '</frameset>\n\n'
		         + '</html>\n';
		return HTML;
	},

};


