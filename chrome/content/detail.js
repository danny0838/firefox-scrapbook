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
var gLinkedExpanding = false;




function SB_initDetail()
{
	try {
		SBarguments = window.arguments[0];
	} catch(ex) {
		alert("ScrapBook ERROR: No Arguments.");
	}
	SBstring = document.getElementById("ScrapBookString");
	document.documentElement.getButton("accept").label = SBstring.getString("CAPTURE_OK_BUTTON");
	document.documentElement.getButton("accept").accesskey = "C";
	SB_fillTitleList();


	setTimeout(SB_initFolderWithDelay, 100);
}


function SB_initFolderWithDelay()
{
	SBRDF.init();
	SBfolderList.init();
}


function SB_toggleLinkedChecking()
{
	var checkBox = document.getElementById("ScrapBookDetailLinkedU");
	checkBox.nextSibling.disabled = !checkBox.checked;
}


function SB_toggleLinkedExpanding()
{
	gLinkedExpanding = !gLinkedExpanding;
	document.getElementById("ScrapBookDetailExpander").setAttribute("image", gLinkedExpanding ? "chrome://scrapbook/skin/expander_up.png" : "chrome://scrapbook/skin/expander_down.png");
	document.getElementById("ScrapBookDetailLinkedGroupbox").setAttribute("orient", gLinkedExpanding ? "vertical" : "horizontal");
	var flags = new Array("I","S","M","A");
	for ( var i = 0; i < flags.length; i++ )
	{
		var checkbox = document.getElementById("ScrapBookDetailLinked" + flags[i]);
		if ( gLinkedExpanding ) {
			checkbox.label = checkbox.getAttribute("tooltiptext");
			checkbox.setAttribute("tmpsrc", checkbox.getAttribute("src"));
			checkbox.removeAttribute("src");
		} else {
			checkbox.setAttribute("tooltiptext", checkbox.label);
			checkbox.removeAttribute("label");
			checkbox.setAttribute("src", checkbox.getAttribute("tmpsrc"));
		}
	}
	document.getElementById("ScrapBookDetailLinkedU").nextSibling.hidden = !gLinkedExpanding;
	window.sizeToContent();
}




var SBfolderList = {

	listXUL  : null,
	popupXUL : null,
	depth : 0,

	init : function()
	{
		this.listXUL  = document.getElementById("ScrapBookDetailFolder");
		this.popupXUL = document.getElementById("ScrapBookDetailFolderPopup");
		this.depth = 0;
		this.fillRecursively("urn:scrapbook:root");
		if ( !SBarguments.resName ) SBarguments.resName = "urn:scrapbook:root";
		this.listXUL.selectedItem = document.getElementById(SBarguments.resName);
		this.listXUL.disabled = false;
	},

	clear : function()
	{
		var oldItems = this.popupXUL.childNodes;
		for ( var i = oldItems.length - 1; i > 1 ; i-- )
		{
			this.popupXUL.removeChild(oldItems[i]);
		}
	},

	fillRecursively : function(aResName)
	{
		this.depth++;
		SBservice.RDFC.Init(SBRDF.data, SBservice.RDF.GetResource(aResName));
		var ResList = SBservice.RDFC.GetElements();
		while ( ResList.hasMoreElements() )
		{
			var aRes = ResList.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			var aID  = SBRDF.getProperty("id", aRes);
			if ( !SBservice.RDFCU.IsContainer(SBRDF.data, aRes) ) continue;
			var SBmenuitem = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "menuitem");
			SBmenuitem.setAttribute("id",    aRes.Value);
			SBmenuitem.setAttribute("label", SBRDF.getProperty("title", aRes));
			SBmenuitem.setAttribute("class", "menuitem-iconic folder-icon");
			SBmenuitem.setAttribute("style", "padding-left:" + 20 * this.depth + "px;");
			this.popupXUL.appendChild(SBmenuitem);
			this.fillRecursively(aRes.Value);
		}
		this.depth--;
	},

	createFolder : function()
	{
		var newID = SBRDF.identify(SBcommon.getTimeStamp());
		var newSBitem = new ScrapBookItem(newID);
		newSBitem.title = SBstring.getString("DEFAULT_FOLDER");
		newSBitem.type = "folder";
		var tarResName = SBarguments.resName;
		var newRes = SBRDF.addItem(newSBitem, tarResName, 0);
		SBRDF.createEmptySeq(newRes.Value);
		var result = {};
		window.openDialog("chrome://scrapbook/content/property.xul", "", "modal,centerscreen,chrome", newSBitem.id, result);
		if ( !result.accept ) {
			SBRDF.deleteItemDescending(newRes, SBservice.RDF.GetResource(tarResName));
			SBRDF.flush();
		} else {
			this.reset(newRes.Value, true);
		}
	},

	reset : function(aResID, shouldUpdate)
	{
		if ( shouldUpdate )
		{
			SBfolderList.clear();
			SBfolderList.fillRecursively("urn:scrapbook:root");
		}
		this.listXUL.selectedItem = document.getElementById(aResID);
		this.onselect(aResID);
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
			this.reset(result.target.Value, result.shouldUpdate);
		}
	},

};




function SB_fillTitleList()
{
	var listXUL = document.getElementById("ScrapBookDetailTitle");
	for ( var i = 0; i < SBarguments.titleList.length; i++ )
	{
		listXUL.appendItem(SBarguments.titleList[i]);
		if ( i == 0 && SBarguments.titleList.length > 1 ) listXUL.firstChild.appendChild(document.createElement("menuseparator"));
	}
	listXUL.selectedIndex = (SBarguments.titleList.length > 1) ? 2 : 0;
}


function SB_acceptDetail()
{
	window.opener.SBcapture.item.title   = document.getElementById("ScrapBookDetailTitle").value;
	window.opener.SBcapture.item.comment = document.getElementById("ScrapBookDetailComment").value.replace(/\r|\n/g, " __BR__ ");
	window.opener.SBcapture.linked.img   = document.getElementById("ScrapBookDetailLinkedI").checked;
	window.opener.SBcapture.linked.snd   = document.getElementById("ScrapBookDetailLinkedS").checked;
	window.opener.SBcapture.linked.mov   = document.getElementById("ScrapBookDetailLinkedM").checked;
	window.opener.SBcapture.linked.arc   = document.getElementById("ScrapBookDetailLinkedA").checked;


	window.opener.SBcapture.linked.seq   = document.getElementById("ScrapBookDetailLinkSeq").checked;
}


function SB_cancelDetail()
{
	SBarguments.cancel = true;
}


