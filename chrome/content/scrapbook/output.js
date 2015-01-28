
var sbOutputService = {

	depth : 0,
	content : "",
	isAuto : false,
	optionAll   : true,
	optionFrame : false,
	optionOpen   : true,

	/**
	 * window.arguments[0]: true means is auto mode
	 */
	init : function()
	{
		if (window.arguments && window.arguments[0]) this.isAuto = true;
		document.documentElement.getButton("accept").label = sbCommonUtils.lang("scrapbook", "START_BUTTON");
		sbTreeHandler.init(true);
		this.selectAllFolders();
		if ( this.isAuto ) this.start();
	},

	selectAllFolders : function()
	{
		if ( document.getElementById('ScrapBookOutputOptionA').checked )
		{
			sbTreeHandler.toggleAllFolders(true);
			sbTreeHandler.TREE.view.selection.selectAll();
			sbTreeHandler.TREE.treeBoxObject.focused = true;
		}
	},

	toggleAllSelection : function()
	{
		document.getElementById("ScrapBookOutputOptionA").checked = false;
	},

	start : function()
	{
		this.optionAll = document.getElementById("ScrapBookOutputOptionA").checked;
		this.optionFrame = document.getElementById("ScrapBookOutputOptionF").checked;
		this.optionOpen = document.getElementById("ScrapBookOutputOptionO").checked;
		if ( this.isAuto ) {
			this.optionOpen = false;
		}
		this.optionAll ? this.execAll() : this.exec();
		sbTreeHandler.toggleAllFolders(true);
		if ( this.isAuto ) window.close();
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
			"chrome://scrapbook/skin/treeitem.png"   : "treeitem.png",
			"chrome://scrapbook/skin/treenote.png"   : "treenote.png",
			"chrome://scrapbook/skin/treenotex.png"  : "treenotex.png",
			"chrome://scrapbook/skin/treefolder.png" : "folder.png",
			"chrome://scrapbook/skin/toolbar_toggle.png" : "toggle.png",
			"chrome://scrapbook/skin/search_all.png" : "search.png",
		};
		for ( var url in urlHash )
		{
			var destFile = dir.clone();
			destFile.append(urlHash[url]);
			sbCommonUtils.saveTemplateFile(url, destFile);
		}
		var frameFile = dir.clone();
		frameFile.append("frame.html");
		sbCommonUtils.writeFile(frameFile, this.getHTMLFrame(), "UTF-8");
		var indexFile = dir.clone();
		indexFile.append("index.html");
		this.content += this.getHTMLFoot();
		sbCommonUtils.writeFile(indexFile, this.content, "UTF-8");
		var indexCSS = dir.clone();
		indexCSS.append('index.css');
		sbCommonUtils.saveTemplateFile("chrome://scrapbook/skin/output.css", indexCSS, true);
		var searchJS = dir.clone();
		searchJS.append('search.js');
		sbCommonUtils.saveTemplateFile("chrome://scrapbook/content/search.js", searchJS, true);
		var searchFile = dir.parent;
		searchFile.append('search.html');
		sbCommonUtils.saveTemplateFile("chrome://scrapbook/content/search.html", searchFile, true);
		sbDataSource.outputTreeAutoDone();
		if ( this.optionOpen )
		{
			var fileName = this.optionFrame ? "frame.html" : "index.html";
			sbCommonUtils.loadURL(sbCommonUtils.convertFilePathToURL(dir.path) + fileName, true);
		}
	},

	processRescursively : function(aContRes)
	{
		this.depth++;
		var id = sbDataSource.getProperty(aContRes, "id") || "root";
		this.content += '<ul id="folder-' + id + '">\n';
		var resList = sbDataSource.flattenResources(aContRes, 0, false);
		for (var i = 1; i < resList.length; i++) {
			this.content += '<li class="depth' + String(this.depth) + '">';
			this.content += this.getHTMLBody(resList[i]);
			if (sbDataSource.isContainer(resList[i]))
				this.processRescursively(resList[i]);
			this.content += "</li>\n";
		}
		this.content += "</ul>\n";
		this.depth--;
	},

	getHTMLHead : function()
	{
		var HTML = '<!DOCTYPE html>\n'
			+ '<html>\n\n'
			+ '<head>\n'
			+ '	<meta charset="UTF-8">\n'
			+ '	<title>' + sbCommonUtils.escapeHTMLWithSpace(document.title, true) + '</title>\n'
			+ '	<meta name="viewport" content="width=device-width">\n'
			+ '	<link rel="stylesheet" type="text/css" href="index.css" media="all">\n'
			+ '	<link rel="stylesheet" type="text/css" href="custom.css" media="all">\n'
			+ '	<script>\n'
			+ '	function init() {\n'
			+ '		toggleAll(false);\n'
			+ '		loadHash();\n'
			+ '		registerRenewHash();\n'
			+ '	}\n'
			+ '	function loadHash() {\n'
			+ '		var hash = top.location.hash;\n'
			+ '		if (!hash) return;\n'
			+ '		hash = hash.substring(1);\n'
			+ '		if (self != top) top.frames[1].location = hash;\n'
			+ '		var elems = document.getElementsByTagName("A");\n'
			+ '		for ( var i = 1; i < elems.length; i++ ) {\n'
			+ '			var elem = elems[i];\n'
			+ '			if (elem.getAttribute("href") == hash) {\n'
			+ '				if (self != top) top.document.title = elem.childNodes[1].nodeValue;\n'
			+ '				var ancs = elem.parentNode;\n'
			+ '				while (ancs) { if (ancs.nodeName == "UL") ancs.style.display = "block"; ancs = ancs.parentNode; }\n'
			+ '				elem.focus();\n'
			+ '				break;\n'
			+ '			}\n'
			+ '		}\n'
			+ '	}\n'
			+ '	function registerRenewHash() {\n'
			+ '		var elems = document.getElementById("folder-root").getElementsByTagName("A");\n'
			+ '		for ( var i = 1; i < elems.length; i++ ) {\n'
			+ '			if (elems[i].className != "folder") {\n'
			+ '				elems[i].onclick = renewHash;\n'
			+ '			}\n'
			+ '		}\n'
			+ '	}\n'
			+ '	function renewHash() {\n'
			+ '		if (self == top) return;\n'
			+ '		var hash = "#" + this.getAttribute("href");\n'
			+ '		var title = this.childNodes[1].nodeValue;\n'
			+ '		if (history && history.pushState) top.history.pushState("", title, hash);\n'
			+ '		else top.location.hash = hash;\n'
			+ '		top.document.title = title;\n'
			+ '	}\n'
			+ '	function toggle(aID) {\n'
			+ '		var listElems = document.getElementById(aID);\n'
			+ '		listElems.style.display = ( listElems.style.display == "none" ) ? "block" : "none";\n'
			+ '	}\n'
			+ '	function toggleAll(willOpen) {\n'
			+ '		var ulElems = document.getElementsByTagName("UL");\n'
			+ '		if (willOpen === undefined) {\n'
			+ '			willOpen = false;\n'
			+ '			for ( var i = 1; i < ulElems.length; i++ ) {\n'
			+ '				if (ulElems[i].style.display == "none") { willOpen = true; break; }\n'
			+ '			}\n'
			+ '		}\n'
			+ '		for ( var i = 1; i < ulElems.length; i++ ) {\n'
			+ '			ulElems[i].style.display = willOpen ? "block" : "none";\n'
			+ '		}\n'
			+ '	}\n'
			+ '	</script>\n'
			+ '	<script src="custom.js"></script>\n'
			+ '</head>\n\n'
			+ '<body onload="init();">\n'
			+ '<div id="header"><a href="javascript:toggleAll();"><img src="toggle.png" width="16" height="16" alt="">ScrapBook</a> <a href="../search.html"><img src="search.png" width="18" height="12" alt=""></a></div>\n'
		return HTML;
	},

	getHTMLBody : function(aRes)
	{
		var id    = sbDataSource.getProperty(aRes, "id");
		var type  = sbDataSource.getProperty(aRes, "type");
		var icon  = sbDataSource.getProperty(aRes, "icon");
		var title = sbDataSource.getProperty(aRes, "title");
		var source = sbDataSource.getProperty(aRes, "source");
		if ( icon.match(/(\/data\/\d{14}\/.*$)/) ) icon = ".." + RegExp.$1;
		if ( !icon ) icon = sbCommonUtils.escapeFileName(sbCommonUtils.getFileName( sbCommonUtils.getDefaultIcon(type) ));
		icon = sbCommonUtils.escapeHTML(icon);
		title = sbCommonUtils.escapeHTMLWithSpace(title);
		source = sbCommonUtils.escapeHTML(source);
		var ret;
		switch (type) {
			case "separator": 
				ret = '<fieldset class="separator" title="' + title + '"><legend>&nbsp;' + title + '&nbsp;</legend></fieldset>';
				break;
			case "folder": 
				ret = '<a class="folder" href="javascript:toggle(\'folder-' + id + '\');" title="' + title + '">'
				    + '<img src="folder.png" width="16" height="16" alt="">' + title + '</a>\n';
				break;
			case "bookmark": 
				ret = '<a href="' + source + '" target="_blank" class="' + type + '" title="' + title + '">'
				    + '<img src="' + icon + '" width="16" height="16" alt="">' + title + '</a>';
				break;
			default: 
				var href = sbCommonUtils.escapeHTML("../data/" + id + "/index.html");
				var target = this.optionFrame ? ' target="main"' : "";
				ret = '<a href="' + href + '"' + target + ' class="' + type + '" title="' + title + '">'
				    + '<img src="' + icon + '" width="16" height="16" alt="">' + title + '</a>';
				if (!source) break;
				ret += ' <a href="' + source + '" target="_blank" class="bookmark" title="Source">➤</a>';
				break;
		}
		return ret;
	},

	getHTMLFoot : function()
	{
		var HTML = "</body>\n\n</html>\n";
		return HTML;
	},

	getHTMLFrame : function()
	{
		var HTML = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">\n'
			+ '<html>\n'
			+ '<head>\n'
			+ '	<meta charset="UTF-8">\n'
			+ '	<title>' + sbCommonUtils.escapeHTMLWithSpace(document.title, true) + '</title>\n'
			+ '</head>\n'
			+ '<frameset cols="200,*">\n'
			+ '	<frame name="side" src="index.html">\n'
			+ '	<frame name="main">\n'
			+ '</frameset>\n'
			+ '</html>\n';
		return HTML;
	},

};



