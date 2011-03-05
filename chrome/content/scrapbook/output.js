
var sbOutputService = {

	depth : 0,
	content : "",
	optionAll   : true,
	optionFrame : false,

	init : function()
	{
		document.documentElement.getButton("accept").label = ScrapBookUtils.getLocaleString("START_BUTTON");
		sbTreeUI.init(true);
		this.selectAllFolders();
		if ( window.location.search == "?auto" )
		{
			document.getElementById("ScrapBookOutputOptionO").checked = false;
			this.start();
		}
	},

	selectAllFolders : function()
	{
		if ( document.getElementById('ScrapBookOutputOptionA').checked )
		{
			sbTreeUI.toggleAllFolders(true);
			sbTreeUI.TREE.view.selection.selectAll();
			sbTreeUI.TREE.treeBoxObject.focused = true;
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
		sbTreeUI.toggleAllFolders(true);
		if ( window.location.search == "?auto" ) setTimeout(function(){ window.close(); }, 1000);
	},

	execAll : function()
	{
		this.content = this.getHTMLHead();
		this.processRescursively(sbTreeUI.TREE.resource);
		this.finalize();
	},

	exec : function()
	{
		this.content = this.getHTMLHead();
		var selResList = sbTreeUI.getSelection(true, 1);
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
		var dir = ScrapBookUtils.getScrapBookDir().clone();
		dir.append("tree");
		if ( !dir.exists() ) dir.create(dir.DIRECTORY_TYPE, 0700);
		var urlHash = {
			"chrome://scrapbook/skin/output.css"     : "output.css",
			"chrome://scrapbook/skin/treeitem.png"   : "treeitem.png",
			"chrome://scrapbook/skin/treenote.png"   : "treenote.png",
			"chrome://scrapbook/skin/treefolder.png" : "folder.png",
			"chrome://scrapbook/skin/toolbar_toggle.png" : "toggle.png",
		};
		for ( var url in urlHash )
		{
			var destFile = dir.clone();
			destFile.append(urlHash[url]);
			ScrapBookUtils.saveTemplateFile(url, destFile);
		}
		var frameFile = dir.clone();
		frameFile.append("frame.html");
		if ( !frameFile.exists() ) frameFile.create(frameFile.NORMAL_FILE_TYPE, 0666);
		ScrapBookUtils.writeFile(frameFile, this.getHTMLFrame(), "UTF-8");
		var indexFile = dir.clone();
		indexFile.append("index.html");
		if ( !indexFile.exists() ) indexFile.create(indexFile.NORMAL_FILE_TYPE, 0666);
		this.content += this.getHTMLFoot();
		ScrapBookUtils.writeFile(indexFile, this.content, "UTF-8");
		var fileName = this.optionFrame ? "frame.html" : "index.html";
		if ( document.getElementById("ScrapBookOutputOptionO").checked )
		{
			ScrapBookUtils.loadURL(ScrapBookUtils.convertFilePathToURL(dir.path) + fileName, true);
		}
	},

	processRescursively : function(aContRes)
	{
		this.depth++;
		var id = ScrapBookData.getProperty(aContRes, "id") || "root";
		this.content += '<ul id="folder-' + id + '">\n';
		var resList = ScrapBookData.flattenResources(aContRes, 0, false);
		for (var i = 1; i < resList.length; i++) {
			this.content += '<li class="depth' + String(this.depth) + '">';
			this.content += this.getHTMLBody(resList[i]);
			if (ScrapBookData.isContainer(resList[i]))
				this.processRescursively(resList[i]);
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
			+ '	<meta http-equiv="Content-Type" content="text/html;charset=UTF-8">\n'
			+ '	<meta http-equiv="Content-Style-Type" content="text/css">\n'
			+ '	<meta http-equiv="Content-Script-Type" content="text/javascript">\n'
			+ '	<title>' + document.title + '</title>\n'
			+ '	<link rel="stylesheet" type="text/css" href="./output.css" media="all">\n'
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
		return HTML;
	},

	getHTMLBody : function(aRes)
	{
		var id    = ScrapBookData.getProperty(aRes, "id");
		var title = ScrapBookData.getProperty(aRes, "title");
		var icon  = ScrapBookData.getProperty(aRes, "icon");
		var type  = ScrapBookData.getProperty(aRes, "type");
		if ( icon.match(/(\/data\/\d{14}\/.*$)/) ) icon = ".." + RegExp.$1;
		if ( !icon ) icon = ScrapBookUtils.getFileName( ScrapBookUtils.getDefaultIcon(type) );
		title = title.replace(/</g, "&lt;");
		title = title.replace(/>/g, "&gt;");
		var ret;
		switch (type) {
			case "separator": 
				ret = '<hr>\n';
				break;
			case "folder": 
				ret = '<a class="folder" href="javascript:toggle(\'folder-' + id + '\');">'
				    + '<img src="./folder.png" width="16" height="16" alt="">' + title + '</a>\n';
				break;
			default: 
				var href = (type == "bookmark") ? 
				           ScrapBookData.getProperty(aRes, "source") : 
				           "../data/" + id + "/index.html";
				var target = this.optionFrame ? ' target="main"' : "";
				ret = '<a href="' + href + '"' + target + ' class="' + type + '">'
				    + '<img src="' + icon + '" width="16" height="16" alt="">' + title + '</a>';
				break;
		}
		return ret;
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
			+ '	<meta http-equiv="Content-Type" Content="text/html;charset=UTF-8">\n'
			+ '	<title>' + document.title + '</title>\n'
			+ '</head>\n\n'
			+ '<frameset cols="200,*">\n'
			+ '	<frame name="side" src="./index.html">\n'
			+ '	<frame name="main">\n'
			+ '</frameset>\n\n'
			+ '</html>\n';
		return HTML;
	},

};



