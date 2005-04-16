/**************************************************
// scrapnote.js
// Implementation file for scrapbook.xul, note.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/


var SBnote = {

	editXUL : null,
	curRes  : null,
	curFile : null,
	toSave  : false,
	sidebar : true,
	lock    : false,

	dropListener : function() { SBnote.change(true); },

	init : function()
	{
		this.editXUL = document.getElementById("ScrapNoteTextbox");
		this.editXUL.removeEventListener("dragdrop", this.dropListener, true);
		this.editXUL.addEventListener("dragdrop",    this.dropListener, true);
	},

	add : function(tarResName, tarRelIdx)
	{
		if ( this.lock ) return;
		this.lock = true;
		setTimeout(function(){ SBnote.lock = false; }, 1000);
		this.save();
		var newID = SBRDF.identify(SBcommon.getTimeStamp());
		var newSBitem = new ScrapBookItem(newID);
		newSBitem.type  = "note";
		newSBitem.chars = "UTF-8";
		this.curRes = SBRDF.addItem(newSBitem, tarResName, tarRelIdx);
		this.curFile = SBcommon.getContentDir(SBRDF.getProperty("id", this.curRes)).clone();
		this.curFile.append("index.html");
		SBcommon.writeFile(this.curFile, "", "UTF-8");
		SBpref.usetabNote ? this.open(this.curRes, true) : this.edit(this.curRes);
	},

	edit : function(aRes)
	{
		this.save();
		this.curRes = aRes;
		this.toSave = false;
		if ( this.sidebar )
		{
			document.getElementById("ScrapBookSplitter").hidden = false;
			document.getElementById("ScrapNote").hidden = false;
		}
		this.curFile = SBcommon.getContentDir(SBRDF.getProperty("id", this.curRes)).clone();
		this.curFile.append("index.html");
		var myContent = SBcommon.readFile(this.curFile);
		myContent = SBcommon.convertStringToUTF8(myContent);
		this.editXUL.value = myContent;
		this.editXUL.focus();
		document.getElementById("ScrapNoteLabel").value = SBRDF.getProperty("title", this.curRes);
		if ( !this.sidebar )
		{
			var myIcon = SBcommon.getDefaultIcon("note");
			document.getElementById("ScrapNoteImage").setAttribute("src", myIcon);
			if ( !document.getElementById("ScrapNoteBrowser").hidden ) SNpreview.show();
			var myBrowser = SBservice.WM.getMostRecentWindow("navigator:browser").getBrowser();
			if ( myBrowser.selectedBrowser.contentWindow.gID == gID )
			{
				myBrowser.selectedTab.label = SBRDF.getProperty("title", this.curRes);
				myBrowser.selectedTab.setAttribute("image", myIcon);
			}
		}
	},

	save : function()
	{
		if ( !this.toSave ) return;
		if ( !SBRDF.getProperty("id", this.curRes) ) return;
		SBcommon.writeFile(this.curFile, this.editXUL.value, "UTF-8");
		this.updateResource();
		if ( this.sidebar ) SBstatus.trace("Saving... " + SBRDF.getProperty("title", this.curRes), 1000);
		this.change(false);
	},

	updateResource : function()
	{
		var myTitle = this.editXUL.value.split("\n")[0].replace(/\t/g, " ");
		if ( myTitle.length > 50 ) myTitle = myTitle.substring(0,50) + "...";
		SBRDF.updateItem(this.curRes, "title", myTitle);
		SBRDF.flush();
	},

	exit : function()
	{
		this.save();
		this.curRes  = null;
		this.curFile = null;
		this.change(false);
		if ( this.sidebar ) {
			document.getElementById("ScrapBookSplitter").hidden = true;
			document.getElementById("ScrapNote").hidden = true;
		}
	},

	open : function(aRes, tabbed)
	{
		if ( top.document.getElementById("content").contentWindow.SBnote )
		{
			top.document.getElementById("content").contentWindow.SBnote.edit(aRes);
		}
		else
		{
			if ( tabbed ) {
				if ( top.document.getElementById("content").contentWindow.location.href == "about:blank" ) tabbed = false;
				SBcommon.loadURL("chrome://scrapbook/content/note.xul?id=" + SBRDF.getProperty("id", aRes), tabbed);
			} else {
				SBnote.edit(aRes);
			}
		}
	},

	expand : function()
	{
		this.open(this.curRes, true);
		this.exit();
	},

	change : function(aBool)
	{
		this.toSave = aBool;
		if ( !this.sidebar ) document.getElementById("ScrapNoteToolbarS").disabled = !aBool;
	},

};


function SN_insertTab(aEvent)
{
	if ( ( aEvent.keyCode != aEvent.DOM_VK_TAB) || aEvent.ctrlKey || aEvent.altKey || aEvent.shiftKey ) return;
	aEvent.preventDefault();

	var command = "cmd_insertText";
	try {
		var controller = document.commandDispatcher.getControllerForCommand(command);
		if (controller && controller.isCommandEnabled(command))
		{
			controller = controller.QueryInterface(Components.interfaces.nsICommandController);
			var params = Components.classes["@mozilla.org/embedcomp/command-params;1"];
			params = params.createInstance(Components.interfaces.nsICommandParams);
			params.setStringValue("state_data", "\t");
			controller.doCommandWithParams(command, params);
		}
	}
	catch(ex) {
		dump("*** ScrapBook Exception: Failed to execute cmd_insertText.\n");
	}
}


