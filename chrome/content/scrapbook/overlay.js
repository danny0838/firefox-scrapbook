
var sbBrowserOverlay = {

	get FOLDER_POPUP() { return document.getElementById("ScrapBookContextFolderPopup"); },

	lastLocation : "",
	editMode : false,
	infoMode : false,
	resource : null,
	locateMe : null,
	folderList : [],

	init : function()
	{
		dump("sbBrowserOverlay::init\n");
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", sbInitContextMenu, true);
		if ( sbCommonUtils.getBoolPref("scrapbook.browser.submenu", false) )
		{
			document.getElementById("ScrapBookContextSubmenu").hidden = false;
			for ( var i = 1; i <= 8; i++ )
			{
				document.getElementById("ScrapBookContextSubmenu").firstChild.appendChild(document.getElementById("ScrapBookContextMenu" + i));
			}
		}
		this.refresh();
		gBrowser.mTabBox.addEventListener("select", function(){ sbBrowserOverlay.onLocationChange(); }, false);
	},

	refresh : function()
	{
		dump("sbBrowserOverlay::refresh\n");
		this.lastLocation = "";
		this.editMode = sbCommonUtils.getBoolPref("scrapbook.view.editor",  true);
		this.infoMode = sbCommonUtils.getBoolPref("scrapbook.view.infobar", false);
		sbDataSource.init(true);
		sbDataSource.backup();
	},

	getID : function()
	{
		var curURL = window._content.location.href;
		var isEditable = ( curURL.indexOf("file") == 0 && curURL.match(/\/data\/(\d{14})\//) );
		return isEditable ? RegExp.$1 : null;
	},

	onLocationChange : function()
	{
		var curURL = window._content.location.href;
		if ( curURL == this.lastLocation ) return;
		var id = this.getID();
		document.getElementById("ScrapBookToolbox").hidden         = id ? false : true;
		document.getElementById("ScrapBookEditStatusPanel").hidden = id ? false : true;
		document.getElementById("ScrapBookInfoStatusPanel").hidden = id ? false : true;
		if ( id )
		{
			this.resource = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + id);
			if ( this.editMode )
				setTimeout(function(){ sbPageEditor.init(); }, 0);
			else
				sbPageEditor.showHide(false);
			if ( this.infoMode )
				setTimeout(function(){ sbInfoViewer.init(); }, 50);
			else
				document.getElementById("ScrapBookInfobar").hidden = true;
		}
		this.locateMe = null;
		this.lastLocation = curURL;
	},

	flipOpenPopup : function(aElement)
	{
		var parElem = this.FOLDER_POPUP.parentNode;
		var oldElem = aElement.parentNode.replaceChild(this.FOLDER_POPUP, aElement);
		parElem.appendChild(oldElem);
		this.updatePopup();
	},

	updatePopup : function()
	{
		var arr = nsPreferences.copyUnicharPref("scrapbook.detail.recentfolder", "").split("|");
		this.folderList = arr;
		var flag = false;
		for ( var i = 2; i < 7; i++ )
		{
			this.FOLDER_POPUP.childNodes[i].hidden = true;
			if ( i > arr.length + 2 ) continue;
			var res = sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + arr[i-2]);
			if ( !sbDataSource.exists(res) ) continue;
			this.FOLDER_POPUP.childNodes[i].hidden = false;
			this.FOLDER_POPUP.childNodes[i].id     = res.Value;
			this.FOLDER_POPUP.childNodes[i].label  = sbDataSource.getProperty("title", res);
			flag = true;
		}
		document.getElementById("urn:scrapbook:root").nextSibling.hidden = !flag;
	},

	setFolderPref : function(aResName)
	{
		if ( aResName == "urn:scrapbook:root" ) return;
		var newArr = [aResName.substring(18,32)];
		for ( var i = 0; i < this.folderList.length; i++ )
		{
			if ( this.folderList[i] != newArr[0] ) newArr.push(this.folderList[i]);
		}
		nsPreferences.setUnicharPref("scrapbook.detail.recentfolder", newArr.slice(0,5).join("|"));
	},

	verifyTargetID : function(targetID)
	{
		if ( targetID == "ScrapBookContextPicking" )
		{
			var result = {};
			window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes',result);
			return result.target ? result.target.Value : null;
		}
		if ( targetID.indexOf("urn:scrapbook:") != 0 ) targetID = "urn:scrapbook:root";
		return targetID;
	},

	execCaptureQuickly : function(frameOnly, isPartial, showDetail, targetID)
	{
		targetID = this.verifyTargetID(targetID);
		if ( !targetID ) return;
		var targetWindow = frameOnly ? sbCommonUtils.getFocusedWindow() : window._content;
		sbContentSaver.captureWindow(targetWindow, isPartial, showDetail, targetID, 0, null);
		this.setFolderPref(targetID);
	},

	execCaptureTargetQuickly : function(showDetail, targetID)
	{
		targetID = this.verifyTargetID(targetID);
		if ( !targetID ) return;
		var linkURL;
		try {
			linkURL = gContextMenu.linkURL();
		} catch(ex) {
			try {
				linkURL = gContextMenu.getLinkURL();
			} catch(ex) {
				linkURL = sbGetLinkURI();
			}
		}
		if ( !linkURL ) return;
		window.openDialog(
			"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			[linkURL], document.popupNode.ownerDocument.location.href, showDetail, targetID, 0, null, null, null
		);
		this.setFolderPref(targetID);
	},

	locate : function(aResource)
	{
		if ( !sbDataSource.exists(aResource) ) { sbPageEditor.disable(true); return; }
		if ( document.getElementById("viewScrapBookSidebar").getAttribute("checked") )
		{
			document.getElementById("sidebar").contentWindow.SB_locate(aResource);
		}
		else
		{
			this.locateMe = aResource;
			toggleSidebar("viewScrapBookSidebar");
		}
	},

};


function sbInitContextMenu(aEvent)
{
	if ( aEvent.originalTarget.id != "contentAreaContextMenu" ) return;
	try {
		document.getElementById("ScrapBookContextMenu1").hidden = !gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu2").hidden = !gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu3").hidden =  gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu4").hidden =  gContextMenu.isTextSelected;
		document.getElementById("ScrapBookContextMenu5").hidden = (!gContextMenu.inFrame || gContextMenu.isTextSelected);
		document.getElementById("ScrapBookContextMenu6").hidden = (!gContextMenu.inFrame || gContextMenu.isTextSelected);
		document.getElementById("ScrapBookContextMenu7").hidden = (!gContextMenu.onLink  || gContextMenu.onMailtoLink);
		document.getElementById("ScrapBookContextMenu8").hidden = (!gContextMenu.onLink  || gContextMenu.onMailtoLink);
	}
	catch(ex)
	{
		dump("ScrapBook ERROR: gContextMenu is not defined.\nlocation: " + window.location.href + "\nthis: " + this + "\nexception: " + ex);
		var win = document.commandDispatcher.focusedWindow;
		if ( !win || win == window ) win = window._content;
		var sel = win.getSelection().QueryInterface(Components.interfaces.nsISelectionPrivate);
		var isSelected = false;
		try {
			isSelected = ( sel.anchorNode.isSameNode(sel.focusNode) && sel.anchorOffset == sel.focusOffset ) ? false : true;
		} catch(ex) {
		}
		document.getElementById("ScrapBookContextMenu1").hidden = !isSelected;
		document.getElementById("ScrapBookContextMenu2").hidden = !isSelected;
		document.getElementById("ScrapBookContextMenu3").hidden =  isSelected;
		document.getElementById("ScrapBookContextMenu4").hidden =  isSelected;
		var inFrame = document.popupNode.ownerDocument != window.content.document;
		document.getElementById("ScrapBookContextMenu5").hidden = !inFrame || isSelected;
		document.getElementById("ScrapBookContextMenu6").hidden = !inFrame || isSelected;
		var onLink = sbGetLinkURI() ? true : false;
		document.getElementById("ScrapBookContextMenu7").hidden = !onLink;
		document.getElementById("ScrapBookContextMenu8").hidden = !onLink;
	}
}


function sbGetLinkURI()
{
	var i = 0;
	var linkURL;
	var curNode = document.popupNode;
	while ( ++i < 10 && curNode )
	{
		if ( ( curNode.nodeName.toUpperCase() == "A" || curNode.nodeName.toUpperCase() == "AREA" ) && curNode.href )
		{
			linkURL = curNode.href;
			break;
		}
		curNode = curNode.parentNode;
	}
	if ( linkURL ) return linkURL;
}



window.addEventListener("load", function(){ sbBrowserOverlay.init(); }, false);


window.addEventListener("load",  function(){ sbBrowserOverlay.onLocationChange(); }, true);
window.addEventListener("focus", function(){ sbBrowserOverlay.onLocationChange(); }, true);



