/**************************************************
// detail.js
// Implementation file for detail.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBstring;
var SBarguments = {};
var SBcustom;
var gLinkedExpanding = false;




function SB_initDetail()
{
	try {
		SBarguments = window.arguments[0];
	} catch(ex) {
		alert("ScrapBook ERROR: Not enough arguments.");
	}
	SBcustom = document.getElementById("ScrapBookDetailLinkedCustom");
	SB_toggleLinkedCustom();
	SBcustom.nextSibling.value = nsPreferences.copyUnicharPref("scrapbook.detail.custom", "pdf, doc");
	SBstring = document.getElementById("ScrapBookString");
	document.documentElement.getButton("accept").label = SBstring.getString("CAPTURE_OK_BUTTON");
	document.documentElement.getButton("accept").accesskey = "C";
	SB_fillTitleList();
	setTimeout(SB_initFolderWithDelay, 100);
}


function SB_initFolderWithDelay()
{
	sbDataSource.init();
	SBfolderList.init();
}


function SB_toggleLinkedCustom()
{
	SBcustom.nextSibling.disabled = !SBcustom.checked;
}




var SBfolderList = {

	get MENU_LIST()  { return document.getElementById("ScrapBookDetailFolder"); },
	get MENU_POPUP() { return document.getElementById("ScrapBookDetailFolderPopup"); },

	depth : 0,
	recent : [],

	init : function()
	{
		if ( !SBarguments.resName ) SBarguments.resName = "urn:scrapbook:root";
		this.refresh(SBarguments.resName, true);
	},

	refresh : function(aResID, shouldUpdate)
	{
		if ( shouldUpdate )
		{
			this.depth = 0;
			this.recent = [];
			this.clear();
			this.processRecent();
			this.processRoot();
			this.processRecursive("urn:scrapbook:root");
		}
		this.MENU_LIST.selectedItem = document.getElementById(aResID);
		this.MENU_LIST.disabled = false;
	},

	clear : function()
	{
		var oldItems = this.MENU_POPUP.childNodes;
		for ( var i = 0; i < oldItems.length; i++ )
		{
			this.MENU_POPUP.removeChild(oldItems[i]);
		}
	},

	fill : function(aID, aTitle)
	{
		var item = document.createElement("menuitem");
		item.setAttribute("id",    aID);
		item.setAttribute("label", aTitle);
		item.setAttribute("depth", this.depth);
		item.setAttribute("class", "menuitem-iconic folder-icon");
		item.setAttribute("style", "padding-left:" + (20 * this.depth + 3) + "px;");
		this.MENU_POPUP.appendChild(item);
	},

	processRoot : function()
	{
		this.fill("urn:scrapbook:root", SBstring.getString("ROOT_FOLDER"));
		this.MENU_POPUP.appendChild(document.createElement("menuseparator"));
	},

	processRecent : function()
	{
		var arr = nsPreferences.copyUnicharPref("scrapbook.detail.recentfolder", "").split("|");
		var flag = false;
		for ( var i = 0; i < arr.length; i++ )
		{
			if ( arr[i].length != 14 ) continue;
			var res = SBservice.RDF.GetResource("urn:scrapbook:item" + arr[i]);
			if ( !sbDataSource.exists(res) ) continue;
			flag = true;
			this.fill(res.Value, sbDataSource.getProperty("title", res));
		}
		if ( flag ) this.MENU_POPUP.appendChild(document.createElement("menuseparator"));
		this.recent = arr;
	},

	processRecursive : function(aResName)
	{
		this.depth++;
		SBservice.RDFC.Init(sbDataSource.data, SBservice.RDF.GetResource(aResName));
		var resEnum = SBservice.RDFC.GetElements();
		while ( resEnum.hasMoreElements() )
		{
			var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( !SBservice.RDFCU.IsContainer(sbDataSource.data, res) ) continue;
			this.fill(res.Value, sbDataSource.getProperty("title", res));
			this.processRecursive(res.Value);
		}
		this.depth--;
	},

	createFolder : function()
	{
		var newID = sbDataSource.identify(SBcommon.getTimeStamp());
		var newItem = new ScrapBookItem(newID);
		newItem.title = SBstring.getString("DEFAULT_FOLDER");
		newItem.type = "folder";
		var tarResName = this.MENU_LIST.selectedItem.getAttribute("depth") > 0 ? this.MENU_LIST.selectedItem.id : "urn:scrapbook:root";
		var newRes = sbDataSource.addItem(newItem, tarResName, 0);
		sbDataSource.createEmptySeq(newRes.Value);
		var result = {};
		window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome", newItem.id, result);
		if ( !result.accept )
		{
			sbDataSource.deleteItemDescending(newRes, SBservice.RDF.GetResource(tarResName));
			sbDataSource.flush();
		}
		else
		{
			this.refresh(newRes.Value, true);
			this.onselect(newRes.Value);
		}
	},

	setRecentPref : function()
	{
		if ( SBarguments.resName == "urn:scrapbook:root" ) return;
		var newArr = [SBarguments.resName.substring(18,32)];
		for ( var i = 0; i < this.recent.length; i++ )
		{
			if ( this.recent[i] != newArr[0] ) newArr.push(this.recent[i]);
		}
		nsPreferences.setUnicharPref("scrapbook.detail.recentfolder", newArr.slice(0,5).join("|"));
	},

	onselect : function(aResID)
	{
		SBarguments.resName = aResID;
		SBarguments.change  = true;
	},

	openFolderPicker : function()
	{
		var result = {};
		window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes',result);
		if ( result.target )
		{
			this.refresh(result.target.Value, result.shouldUpdate);
			this.onselect(result.target.Value);
		}
	},

};




function SB_fillTitleList()
{
	var selOnly = (SBarguments.titleList.length > 1);
	var listXUL = document.getElementById("ScrapBookDetailTitle");
	for ( var i = 0; i < SBarguments.titleList.length; i++ )
	{
		listXUL.appendItem(SBarguments.titleList[i]);
		if ( i == 0 && SBarguments.titleList.length > 1 ) listXUL.firstChild.appendChild(document.createElement("menuseparator"));
	}
	listXUL.selectedIndex = selOnly ? 2 : 0;
}


function SB_checkLinkedCustom(aElem)
{
	if ( aElem.selectedIndex > 0 )
	{
		SBcustom.nextSibling.value = SBcustom.nextSibling.value.replace(/(html|htm|cgi|php|asp|jsp)/g, "");
		SBcustom.nextSibling.value = SBcustom.nextSibling.value.replace(/(, ,|,,)/g, ",");
		SBcustom.nextSibling.value = SBcustom.nextSibling.value.replace(/(\| \||\|\|)/g, "|");
	}
}


function SB_acceptDetail()
{
	window.opener.sbContentSaver.item.comment   = SBcommon.escapeComment(document.getElementById("ScrapBookDetailComment").value);
	window.opener.sbContentSaver.item.title     = document.getElementById("ScrapBookDetailTitle").value;
	window.opener.sbContentSaver.linked.image   = document.getElementById("ScrapBookDetailLinkedI").checked;
	window.opener.sbContentSaver.linked.sound   = document.getElementById("ScrapBookDetailLinkedS").checked;
	window.opener.sbContentSaver.linked.movie   = document.getElementById("ScrapBookDetailLinkedM").checked;
	window.opener.sbContentSaver.linked.archive = document.getElementById("ScrapBookDetailLinkedA").checked;
	window.opener.sbContentSaver.linked.depth   = document.getElementById("ScrapBookDetailLinkedP").selectedIndex;
	window.opener.sbContentSaver.linked.custom = "";
	if ( SBcustom.checked )
	{
		window.opener.sbContentSaver.linked.custom = SBcustom.nextSibling.value.replace(/[^0-9a-zA-Z,\|]/g, "").replace(/[,\|]/g, ", ");
		nsPreferences.setUnicharPref("scrapbook.detail.custom", window.opener.sbContentSaver.linked.custom);
	}
	SBfolderList.setRecentPref();
}


function SB_cancelDetail()
{
	SBarguments.cancel = true;
}


