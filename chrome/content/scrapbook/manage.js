
function SB_initManage()
{
	SBstring = document.getElementById("ScrapBookString");
	SB_disablePopupMenus();
	sbDataSource.init();
	sbTreeHandler.init(false, "ScrapBookManageTree");
	SB_initObservers();
	SBbaseURL = sbCommonUtils.getBaseHref(sbDataSource.data.URI);
	SBtree.ref = window.arguments[0];
	sbPrefs.init();
	var winTitle = sbDataSource.getProperty("title", sbCommonUtils.RDF.GetResource(SBtree.ref));
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
	if ( !sbPrefs.quickDelete )
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
		if ( rmIDs[i].length == 14 ) sbCommonUtils.removeDirSafety(sbCommonUtils.getContentDir(rmIDs[i]), true);
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


