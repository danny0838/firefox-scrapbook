
var sbOutputService = {

	depth : 0,
	content : "",
	optionAll   : true,
	optionFrame : false,

	init : function()
	{
		document.documentElement.getButton("accept").label = document.getElementById("sbMainString").getString("START_BUTTON");
		sbDataSource.init();
		sbTreeHandler.init(true);
		this.selectAllFolders();
		if ( window.location.href.match(/\?auto/) )
		{
			document.getElementById("ScrapBookOutputOptionO").checked = false;
			this.start();
		}
	},

	selectAllFolders : function()
	{
		if ( document.getElementById('ScrapBookOutputOptionA').checked )
		{
			sbTreeHandler.toggleAllFolders(true);
			sbTreeHandler.TREE.view.selection.selectAll();
			sbTreeHandler.TREE.treeBoxObject.focused = true;
		}
		this.optionAll = true;
	},

	toggleAllSelection : function()
	{
		if ( this.optionAll )
		{
			document.getElementById("ScrapBookOutputOptionA").checked = false;
			this.optionAll = false;
		}
	},

	start : function()
	{
		this.optionFrame = document.getElementById("ScrapBookOutputOptionF").checked;
		this.optionAll ? this.execAll() : this.exec();
		sbTreeHandler.toggleAllFolders(true);
		if ( window.location.href.match(/\?auto/) ) setTimeout(function(){ window.close(); }, 1000);
	},

	execAll : function()
	{
		this.content = this.getHTMLHead();
		this.processRescursively(sbTreeHandler.TREE.resource);
		this.finalize();
	},

	exec : function()
	{
		this.content = this.getHTMLHead();
		var selResList = sbTreeHandler.getSelection(true, 1);
		this.content += "<ul>\n";
		for ( var i = 0; i < selResList.length; i++ )
		{
			this.content += '<li class="depth' + String(this.depth) + '">';
			this.content += this.getHTMLBody(selResList[i]);
			this.processRescursively(selResList[i]);
			this.content += "</li>\n";
		}
		this.content += "</ul>\n";
		this.finalize();
	},

	finalize : function()
	{
		var dir = sbCommonUtils.getScrapBookDir().clone();
		dir.append("tree");
		if ( !dir.exists() ) dir.create(dir.DIRECTORY_TYPE, 0700);
		var urlHash = {
			"chrome://scrapbook/skin/treestyle.css"  : "style.css",
			"chrome://scrapbook/skin/treeitem.png"   : "treeitem.png",
			"chrome://scrapbook/skin/treenote.png"   : "treenote.png",
			"chrome://scrapbook/skin/treefolder.png" : "folder.png",
			"chrome://scrapbook/skin/toolbar_toggle.png" : "toggle.png",
		};
		for ( var url in urlHash )
		{
			var destFile = dir.clone();
			destFile.append(urlHash[url]);
			sbCommonUtils.saveTemplateFile(url, destFile);
		}
		var frameFile = dir.clone();
		frameFile.append("frame.html");
		if ( !frameFile.exists() ) frameFile.create(frameFile.NORMAL_FILE_TYPE, 0666);
		sbCommonUtils.writeFile(frameFile, this.getHTMLFrame(), "UTF-8");
		var indexFile = dir.clone();
		indexFile.append("index.html");
		if ( !indexFile.exists() ) indexFile.create(indexFile.NORMAL_FILE_TYPE, 0666);
		this.content += this.getHTMLFoot();
		sbCommonUtils.writeFile(indexFile, this.content, "UTF-8");
		var fileName = this.optionFrame ? "frame.html" : "index.html";
		if ( document.getElementById("ScrapBookOutputOptionO").checked )
		{
			sbCommonUtils.loadURL(sbCommonUtils.convertFilePathToURL(dir.path) + fileName, true);
		}
	},

	processRescursively : function(aContRes)
	{
		this.depth++;
		var id = sbDataSource.getProperty(aContRes, "id") || "root";
		this.content += '<ul id="folder-' + id + '">\n';
		sbCommonUtils.RDFC.Init(sbDataSource.data, aContRes);
		var resEnum = sbCommonUtils.RDFC.GetElements();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			this.content += '<li class="depth' + String(this.depth) + '">';
			this.content += this.getHTMLBody(res);
			if ( sbCommonUtils.RDFCU.IsContainer(sbDataSource.data, res) ) this.processRescursively(res);
			this.content += "</li>\n";
		}
		this.content += "</ul>\n";
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
			+ '	<link rel="stylesheet" type="text/css" href="./style.css" media="all">\n'
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
			+ '	<a href="#" onclick="toggleAll(true);">Expand</a>\n'
			+ '	<a href="#" onclick="toggleAll(false);">Collapse</a>\n'
			+ '</div>\n\n';
		return HTML;
	},

	getHTMLBody : function(aRes)
	{
		var myID    = sbDataSource.getProperty(aRes, "id");
		var myTitle = sbDataSource.getProperty(aRes, "title");
		var myIcon  = sbDataSource.getProperty(aRes, "icon");
		if ( myIcon.match(/(\/data\/\d{14}\/.*$)/) ) myIcon = ".." + RegExp.$1;
		if ( !myIcon ) myIcon = sbCommonUtils.getFileName( sbCommonUtils.getDefaultIcon(sbDataSource.getProperty(aRes, "type")) );
		myTitle = myTitle.replace(/</g, "&lt;");
		myTitle = myTitle.replace(/>/g, "&gt;");
		var target = this.optionFrame ? ' target="main"' : "";
		if ( sbDataSource.getProperty(aRes, "type") == "folder" ) {
			HTML = '<a class="folder" href="javascript:toggle(\'folder-' + myID + '\');"><img src="./folder.png" width="16" height="16" alt="">' + myTitle + '</a>\n';
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



