/**************************************************
// export.js
// Implementation file for export.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBexport = {

	depth : 0,
	src   : "",

	init : function() {

		var myDir = SBcommon.getScrapBookDir().clone();
		myDir.append("tree");
		if ( !myDir.exists() ) myDir.create(myDir.DIRECTORY_TYPE, 0700);

		var myFile = myDir.clone();
		myFile.append("index.html");
		if ( !myFile.exists() ) myFile.create(myFile.NORMAL_FILE_TYPE, 0666);

		var myArray = {
			"chrome://scrapbook/skin/tree.css"       : "tree.css",
			"chrome://scrapbook/skin/treeitem.png"   : "treeitem.png",
			"chrome://scrapbook/skin/treenote.png"   : "treenote.png",
			"chrome://scrapbook/skin/treefolder.png" : "treefolder.png",
			"chrome://scrapbook/content/frame.html"  : "frame.html",
		};
		for ( var target in myArray )
		{
			var targetFile = myDir.clone();
			targetFile.append(myArray[target]);
			SBcommon.saveTemplateFile(target, targetFile);
		}

		SBRDF.init();

		this.src = this.getHTMLhead();
		this.processRDFRescursively( SBservice.RDF.GetResource("urn:scrapbook:root") );
		this.src += this.getHTMLfoot();

		SBcommon.writeFile(myFile, this.src, "UTF-8");
		window.location.href = SBcommon.convertFilePathToURL(myFile.path);
	},


	processRDFRescursively : function(aParRes)
	{
		this.depth++;
		var myID = SBRDF.getProperty("id", aParRes);
		if ( !myID ) myID = "root";
		this.src += '<ul id="folder-' + myID + '">\n';
		SBservice.RDFC.Init(SBRDF.data, aParRes);
		var ResList = SBservice.RDFC.GetElements();
		while ( ResList.hasMoreElements() )
		{
			var aRes = ResList.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			this.src += '<li class="depth' + this.depth + '">';
			this.src += this.getHTMLbody(aRes);
			if ( SBservice.RDFCU.IsContainer(SBRDF.data, aRes) ) this.processRDFRescursively(aRes);
			this.src += "</li>\n";
		}
		this.src += "</ul>\n";
		this.depth--;
	},


	getHTMLhead : function()
	{
		var HTML = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">\n\n'
		         + '<html>\n\n'
		         + '<head>\n'
		         + '	<meta http-equiv="Content-Type" content="text/html;Charset=UTF-8">\n'
		         + '	<meta http-equiv="Content-Style-Type" content="text/css">\n'
		         + '	<meta http-equiv="Content-Script-Type" content="text/javascript">\n'
		         + '	<title>ScrapBook</title>\n'
		         + '	<link rel="stylesheet" type="text/css" href="./tree.css" media="all">\n'
		         + '	<script type="text/javascript" language="JavaScript"><!--\n'
		         + '	function init() {\n'
		         + '		if ( top.location.href != location.href ) document.getElementById(\'header\').style.display = "none";\n'
		         + '	}\n'
		         + '	function toggle(aID) {\n'
		         + '		var listelt = document.getElementById(aID);\n'
		         + '		listelt.style.display = ( listelt.style.display == "none" ) ? "block" : "none";\n'
		         + '	}\n'
		         + '	//--></script>\n'
		         + '</head>\n\n'
		         + '<body onload="init();">\n\n'
		         + '<div id="header"><a href="./frame.html" target="_top">Click here to set frames.</a></div>\n\n'
		         + '<h1>ScrapBook</h1>\n\n';
		return HTML;
	},


	getHTMLbody : function(aRes)
	{
		var myID    = SBRDF.getProperty("id", aRes);
		var myTitle = SBRDF.getProperty("title", aRes);
		var myIcon  = SBRDF.getProperty("icon", aRes);
		if ( myIcon.match(/(\/data\/\d{14}\/.*$)/) ) myIcon = ".." + RegExp.$1;
		if ( !myIcon ) myIcon = SBcommon.getFileName( SBcommon.getDefaultIcon(SBRDF.getProperty("type", aRes)) );
		myTitle = myTitle.replace(/</g, "&lt;");
		myTitle = myTitle.replace(/>/g, "&gt;");
		if ( SBRDF.getProperty("type", aRes) == "folder" ) {
			HTML = '<a class="folder" href="javascript:toggle(\'folder-' + myID + '\');"><img src="./treefolder.png" width="16" height="16" alt="">' + myTitle + '</a>\n';
		} else {
			HTML = '<a href="../data/' + myID + '/index.html" target="main"><img src="' + myIcon + '" width="16" height="16" alt="">' + myTitle + '</a>';
		}
		return HTML;
	},


	getHTMLfoot : function()
	{
		var HTML = "\n</body>\n</html>\n";
		return HTML;
	},


};


SBexport.init();


