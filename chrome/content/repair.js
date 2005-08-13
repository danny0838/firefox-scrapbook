/**************************************************
// repair.js
// Implementation file for repair.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/


var sbRepair = {

	get WIZARD() { return document.getElementById("sbRepairWizard"); },
	get TREE()   { return document.getElementById("sbRepairTree"); },

	treeItems : [],

	initStartPage : function()
	{
		var nextPage;
		switch ( document.getElementById("sbRepairRadioGroup").selectedIndex )
		{
			case 0 : nextPage = 'sbRepairRDF1'; break;
			case 1 : nextPage = 'sbRepairFavicons'; break;
		}
		if ( nextPage ) this.WIZARD.currentPage.next = nextPage;
		this.WIZARD.canAdvance = nextPage ? true : false;
	},

	initRestoreRDF : function()
	{
		this.treeItems = [];
		var backupDir = SBcommon.getScrapBookDir();
		backupDir.append("backup");
		if ( !backupDir.exists() )
		{
			alert("No backup files found.");
			return;
		}
		var fileEnum = backupDir.directoryEntries;
		while ( fileEnum.hasMoreElements() )
		{
			var fileObj  = fileEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
			var fileName = fileObj.leafName;
			var isMatch  = fileName.match(/^scrapbook_\d{8}\.rdf$/);
			if ( isMatch ) this.treeItems.push([fileName, SBtrade.formateMilliSeconds(fileObj.lastModifiedTime), fileObj.fileSize]);
		}
		var colIDs = [
			"sbRepairTreecolFile",
			"sbRepairTreecolTime",
			"sbRepairTreecolSize",
		];
		this.TREE.view = new sbCustomTreeView(colIDs, this.treeItems);
	},

	execRestoreRDF : function()
	{
		if ( this.TREE.currentIndex < 0 ) { this.WIZARD.rewind(); return; }
		var fileName = this.treeItems[this.TREE.currentIndex][0];
		if ( !fileName ) { this.WIZARD.rewind(); return; }
		var bFile = SBcommon.getScrapBookDir();
		bFile.append("backup");
		bFile.append(fileName);
		if ( !bFile.exists() || !bFile.isFile() ) { this.WIZARD.rewind(); return; }
		this.WIZARD.canRewind = false;
		var aFile = SBcommon.getScrapBookDir();
		aFile.append("scrapbook.rdf");
		try {
			var bDir = SBcommon.getScrapBookDir();
			bDir.append("backup");
			aFile.copyTo(bDir, "scrapbook_" + SBcommon.getTimeStamp().substring(0,8) + ".rdf");
		} catch(ex) {
		}
		try {
			aFile.remove(false);
			var aDir = SBcommon.getScrapBookDir();
			bFile.copyTo(aDir, "scrapbook.rdf");
		} catch(ex) {
			document.getElementById("sbRepairRDF2Text").value = "ERROR: " + ex;
			return;
		}
		document.getElementById("sbRepairRDF2Text").value = "Completed. Please restart Firefox.";
	},

	restoreFavicons : function()
	{
		this.WIZARD.canRewind = false;
		this.WIZARD.getButton("finish").disabled = true;
		SBRDF.init();
		var dir = SBcommon.getScrapBookDir().clone();
		dir.append("data");
		var baseURL = SBcommon.convertFilePathToURL(dir.path);
		if ( baseURL.charAt(baseURL.length - 1) != "/" ) baseURL = baseURL + "/";
		var shouldFlush = false;
		var i = 0;
		var resEnum = SBRDF.data.GetAllResources();
		while ( resEnum.hasMoreElements() )
		{
			var res  = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			var id   = SBRDF.getProperty("id", res);
			var icon = SBRDF.getProperty("icon", res);
			if ( ++i % 10 == 0 ) document.getElementById("sbRepairFaviconsTextbox").value = "Resolving favicon URL: " + SBRDF.getProperty("title", res);
			if ( icon.match(/(\d{14}\/.*$)/) )
			{
				var newIcon = baseURL + RegExp.$1;
				if ( icon != newIcon )
				{
					dump("*** RESOLVING_ICON_URL:: " + newIcon + "\n");
					SBRDF.updateItem(res, "icon", newIcon);
					shouldFlush = true;
				}
			}
		}
		document.getElementById("sbRepairFaviconsTextbox").value = "Completed.";
		if ( shouldFlush ) { SBRDF.flush(); window.opener.reload(); }
		this.WIZARD.getButton("finish").disabled = false;
	},

};



