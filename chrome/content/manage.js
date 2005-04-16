/**************************************************
// manage.js
// Implementation file for manage.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



function SB_initManage()
{
	SBstring = document.getElementById("ScrapBookString");
	SBRDF.init();
	SBstatus.init();
	SBtreeUtil.init("ScrapBookManageTree", false);
	SB_initObservers();
	SBpref.init();
	SB_toggleShowFavicon();
	SBtree.ref = window.arguments[0];
	var popupKeys = ['C','M','E'];
	for ( var i = 0; i < popupKeys.length; i++ )
	{
		document.getElementById("ScrapBookTreePopup" + popupKeys[i]).setAttribute("disabled", true);
	}
	var winTitle = SBRDF.getProperty("title", SBservice.RDF.GetResource(SBtree.ref));
	if ( winTitle )
	{
		document.getElementById("ScrapBookManageWindow").setAttribute("title", winTitle);
		document.title = winTitle;
	}
}


function SB_openDblClick(aEvent)
{
	if ( aEvent.originalTarget.localName != "treechildren" ) return;
	var tabbed = (aEvent.ctrlKey || aEvent.shiftKey);
	var curIdx = SBtree.currentIndex;
	var curRes = SBtree.builderView.getResourceAtIndex(curIdx);
	if ( SBtree.view.isContainer(curIdx) )
	{
		if ( SBpref.folderclick ) SBtreeUtil.collapseOtherFolders(curIdx);
		return;
	}
	var myID   = SBRDF.getProperty("id", curRes);
	var myType = SBRDF.getProperty("type", curRes);
	SBcommon.loadURL(SBcommon.getURL(myID, myType), tabbed);
}


function SB_moveIntoFolder()
{
	var idxList = SBtreeUtil.getSelection(false, 2);
	if ( idxList.length < 1 ) return;
	if ( SB_validateMultipleSelection(idxList) == false ) return;
	var i = 0;
	var curResList = [];
	var curParList = [];
	for ( i = 0; i < idxList.length; i++ )
	{
		curResList.push( SBtree.builderView.getResourceAtIndex(idxList[i]) );
		curParList.push( SB_getParentResourceAtIndex(idxList[i]) );
	}
	var result = {};
	window.openDialog('chrome://scrapbook/content/folderPicker.xul','','modal,chrome,centerscreen,resizable=yes',result);
	if ( !result.target ) return;
	var tarPar = result.target;
	for ( i = 0; i < idxList.length; i++ )
	{
		SBRDF.moveItem(curResList[i], curParList[i], tarPar, -1);
	}
	SBRDF.flush();
}


function SB_deleteMultiple()
{
	var idxList = SBtreeUtil.getSelection(false, 2);
	if ( idxList.length < 1 ) return;
	if ( SB_validateMultipleSelection(idxList) == false ) return;
	if ( !SBpref.quickDelete )
	{
		if ( !window.confirm( SBstring.getString("CONFIRM_DELETE") ) ) return;
	}
	var i = 0;
	var curResList = [];
	var curParList = [];
	for ( i = 0; i < idxList.length; i++ )
	{
		curResList.push( SBtree.builderView.getResourceAtIndex(idxList[i]) );
		curParList.push( SB_getParentResourceAtIndex(idxList[i]) );
	}
	var rmIDs = [];
	for ( var i = 0; i < idxList.length; i++ )
	{
		rmIDs = rmIDs.concat ( SBRDF.deleteItemDescending(curResList[i], curParList[i]) );
	}
	SBRDF.flush();
	for ( var i = 0; i < rmIDs.length; i++ )
	{
		if ( rmIDs[i].length == 14 ) SBcommon.removeDirSafety( SBcommon.getContentDir(rmIDs[i]) );
	}
	SBstatus.trace(rmIDs.length + " items removed");
}


function SB_validateMultipleSelection(aIdxList)
{
	if ( aIdxList.length != SBtree.view.selection.count )
	{
		alert("ScrapBook ERROR: Can't move/delete multiple items including folders.");
		return false;
	}
	return true;
}



SBdropUtil.moveMultiple = function()
{
	var idxList = SBtreeUtil.getSelection(false, 2);
	if ( SB_validateMultipleSelection(idxList) == false ) return;
	var i = 0;
	var curResList = []; var curParList = [];
	var tarResList = []; var tarParList = [];
	for ( i = 0; i < idxList.length; i++ )
	{
		curResList.push( SBtree.builderView.getResourceAtIndex(idxList[i]) );
		curParList.push( SB_getParentResourceAtIndex(idxList[i]) );
		tarResList.push( SBtree.builderView.getResourceAtIndex(this.row) );
		tarParList.push( ( this.orient == this.DROP_ON ) ? tarResList[i] : SB_getParentResourceAtIndex(this.row) );
	}
	if ( this.orient == this.DROP_AFTER )
	{
		for ( i = idxList.length - 1; i >= 0 ; i-- )
		{
			this.moveCurrentToTarget(curResList[i], curParList[i], tarResList[i], tarParList[i]);
		}
	}
	else
	{
		for ( i = 0; i < idxList.length; i++ )
		{
			this.moveCurrentToTarget(curResList[i], curParList[i], tarResList[i], tarParList[i]);
		}
	}
	SBRDF.flush();
}


