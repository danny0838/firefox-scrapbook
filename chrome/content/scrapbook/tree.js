
var SBtree;



var sbTreeHandler = {

	TREE : null,
	prefSingleExpand : false,

	init : function(isContainer, xulID)
	{
		if ( !xulID ) xulID = "ScrapBookTree";
		SBtree    = document.getElementById(xulID);
		this.TREE = document.getElementById(xulID);
		SBtree.database.AddDataSource(sbDataSource.data);
		this.prefSingleExpand = sbCommonUtils.getBoolPref("scrapbook.tree.singleexpand", false);
		if ( isContainer ) document.getElementById("ScrapBookTreeRule").setAttribute("iscontainer", true);
		SBtree.builder.rebuild();
	},

	onClick : function(aEvent, forceOpen)
	{
		if ( aEvent.button != 0 && aEvent.button != 1 ) return;
		var obj = {};
		SBtree.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, {}, {}, obj);
		if ( !obj.value || obj.value == "twisty" ) return;
		var curIdx = SBtree.currentIndex;
		if ( SBtree.view.isContainer(curIdx) ) {
			this.toggleFolder(curIdx);
		} else {
			if ( forceOpen ) SB_open(aEvent.button == 1 || aEvent.ctrlKey || aEvent.shiftKey);
		}
	},

	onKeyPress : function(aEvent)
	{
		switch ( aEvent.keyCode )
		{
			case aEvent.DOM_VK_RETURN : 
				if ( SBtree.view.isContainer(SBtree.currentIndex) ) return;
				SB_open(aEvent.ctrlKey || aEvent.shiftKey);
				break;
			case aEvent.DOM_VK_DELETE : SB_delete(); break;
			case aEvent.DOM_VK_F2     : SB_forward("P"); break;
		}
	},

	onDblClick : function(aEvent)
	{
		if ( aEvent.originalTarget.localName != "treechildren" || aEvent.button != 0 ) return;
		var curIdx = SBtree.currentIndex;
		var curRes = SBtree.builderView.getResourceAtIndex(curIdx);
		if ( SBtree.view.isContainer(curIdx) ) return;
		var myID   = sbDataSource.getProperty("id", curRes);
		var myType = sbDataSource.getProperty("type", curRes);
		sbCommonUtils.loadURL(sbCommonUtils.getURL(myID, myType), aEvent.ctrlKey || aEvent.shiftKey);
	},

	getSelection : function(idx2res, rule)
	{
		var retArray = [];
		for ( var rc = 0; rc < SBtree.view.selection.getRangeCount(); rc++ )
		{
			var start = {}, end = {};
			SBtree.view.selection.getRangeAt(rc, start, end);
			for ( var i = start.value; i <= end.value; i++ )
			{
				if ( rule == 1 && !SBtree.view.isContainer(i) ) continue;
				if ( rule == 2 && SBtree.view.isContainer(i) ) continue;
				retArray.push( idx2res ? SBtree.builderView.getResourceAtIndex(i) : i );
			}
		}
		return retArray;
	},

	toggleFolder : function(aIdx)
	{
		if ( !aIdx ) aIdx = SBtree.currentIndex;
		SBtree.view.toggleOpenState(aIdx);
		if ( this.prefSingleExpand ) this.collapseFoldersBut(aIdx);
	},

	toggleAllFolders : function(forceClose)
	{
		var willOpen = true;
		for ( var i = 0; i < SBtree.view.rowCount; i++ )
		{
			if ( !SBtree.view.isContainer(i) ) continue;
			if ( SBtree.view.isContainerOpen(i) ) { willOpen = false; break; }
		}
		if ( forceClose ) willOpen = false;
		if ( willOpen ) {
			for ( var i = 0; i < SBtree.view.rowCount; i++ )
			{
				if ( SBtree.view.isContainer(i) && !SBtree.view.isContainerOpen(i) ) SBtree.view.toggleOpenState(i);
			}
		} else {
			for ( var i = SBtree.view.rowCount - 1; i >= 0; i-- )
			{
				if ( SBtree.view.isContainer(i) && SBtree.view.isContainerOpen(i) ) SBtree.view.toggleOpenState(i);
			}
		}
	},

	collapseFoldersBut : function(curIdx)
	{
		var ascIdxList = {};
		ascIdxList[curIdx] = true;
		while ( curIdx >= 0 )
		{
			curIdx = SBtree.builderView.getParentIndex(curIdx);
			ascIdxList[curIdx] = true;
		}
		for ( var i = SBtree.view.rowCount - 1; i >= 0; i-- )
		{
			if ( !ascIdxList[i] && SBtree.view.isContainer(i) && SBtree.view.isContainerOpen(i) ) {
				SBtree.view.toggleOpenState(i);
			}
		}
	},

};


