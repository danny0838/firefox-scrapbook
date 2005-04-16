/**************************************************
// tree.js
// Implementation file for scrapbook.xul, manage.xul, output.xul, trade.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



var SBtree;




var SBtreeUtil = {

	singleExpand : false,

	init : function(xulID, isContainer)
	{
		SBtree = document.getElementById(xulID);
		SBtree.database.AddDataSource(SBRDF.data);
		this.singleExpand = SBcommon.getBoolPref("scrapbook.tree.singleexpand", false);
		if ( isContainer ) document.getElementById("ScrapBookTreeRule").setAttribute("iscontainer", true);
		SBtree.builder.rebuild();
	},

	onClickDefault : function(aEvent)
	{
		if ( aEvent.button != 0 || aEvent.ctrlKey || aEvent.shiftKey ) return;
		var obj = {};
		SBtree.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, {}, {}, obj);
		if ( !obj.value || obj.value == "twisty" ) return;
		var curIdx = SBtree.currentIndex;
		if ( SBtree.view.isContainer(curIdx) )
		{
			SBtree.view.toggleOpenState(curIdx);
			if ( this.singleExpand ) SBtreeUtil.collapseOtherFolders(curIdx);
		}
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

	collapseOtherFolders : function(curIdx)
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

};


