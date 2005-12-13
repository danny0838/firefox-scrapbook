
function SB_initManage()
{
	SBstring = document.getElementById("ScrapBookString");
	SB_disablePopupMenus();
	sbDataSource.init();
	sbTreeHandler.init(false, "ScrapBookManageTree");
	SB_initObservers();
	SBbaseURL = SBcommon.getBaseHref(sbDataSource.data.URI);
	SBtree.ref = window.arguments[0];
	SBpref.init();
	var winTitle = sbDataSource.getProperty("title", SBservice.RDF.GetResource(SBtree.ref));
	if ( winTitle )
	{
		document.getElementById("ScrapBookManageWindow").setAttribute("title", winTitle);
		document.title = winTitle;
	}
}


function SB_disablePopupMenus()
{
	var keys = ['C','M','E'];
	for ( var i = 0; i < keys.length; i++ )
	{
		document.getElementById("ScrapBookTreePopup" + keys[i]).setAttribute("disabled", true);
	}
}



function SB_sendMultiple()
{
	var idxList = sbTreeHandler.getSelection(false, 2);
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
		sbDataSource.moveItem(curResList[i], curParList[i], tarPar, -1);
	}
	sbDataSource.flush();
}


function SB_deleteMultiple()
{
	var idxList = sbTreeHandler.getSelection(false, 2);
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
		rmIDs = rmIDs.concat ( sbDataSource.deleteItemDescending(curResList[i], curParList[i]) );
	}
	sbDataSource.flush();
	for ( var i = 0; i < rmIDs.length; i++ )
	{
		if ( rmIDs[i].length == 14 ) SBcommon.removeDirSafety(SBcommon.getContentDir(rmIDs[i]), true);
	}
	SBstatus.trace(SBstring.getFormattedString("ITEMS_REMOVED", [rmIDs.length]));
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
	var idxList = sbTreeHandler.getSelection(false, 2);
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
	sbDataSource.flush();
}


