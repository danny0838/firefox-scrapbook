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
var SBmenulist;
var SBmenupopup;
var SBmenudepth = 0;



function SB_initDetail()
{
	SBstring = document.getElementById("ScrapBookString");
	document.documentElement.getButton("accept").label = SBstring.getString("CAPTURE_OK_BUTTON");
	document.documentElement.getButton("accept").accesskey = "C";

	document.getElementById("ScrapBookDetailTitle").value = window.opener.SBcapture.item.title;
	SB_toggleCheckLinked();

	SBRDF.init();
	SBmenulist  = document.getElementById("ScrapBookDetailMenuList");
	SBmenupopup = document.getElementById("ScrapBookDetailMenuPopup");
	SB_fillMenuitemRecursively("urn:scrapbook:root");
}


function SB_fillMenuitemRecursively(aResName)
{
	SBmenudepth++;
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
		SBmenuitem.setAttribute("style", "padding-left:" + 20 * SBmenudepth + "px;");
		SBmenupopup.appendChild(SBmenuitem);
		if ( aRes.Value == window.opener.SBcapture.resource.name ) SBmenulist.selectedItem = SBmenuitem;
		SB_fillMenuitemRecursively(aRes.Value);
	}
	SBmenudepth--;
}


function SB_onSelectFolder(aEvent)
{
	window.opener.SBcapture.resource.name = aEvent.target.id;
}


function SB_getHtmlTitle()
{
	document.getElementById("ScrapBookDetailTitle").value = window.opener.SBcapture.exchange.htmltitle;
}


function SB_toggleCheckLinked()
{
	var aBool = document.getElementById("ScrapBookDetailLinkedZ").checked ? true : false;
	document.getElementById("ScrapBookDetailLinkedI").disabled = aBool;
	document.getElementById("ScrapBookDetailLinkedS").disabled = aBool;
	document.getElementById("ScrapBookDetailLinkedM").disabled = aBool;
	document.getElementById("ScrapBookDetailLinkedA").disabled = aBool;
}


function SB_acceptDetail()
{
	window.opener.SBcapture.item.title   = document.getElementById("ScrapBookDetailTitle").value;
	window.opener.SBcapture.item.comment = document.getElementById("ScrapBookDetailComment").value.replace(/\r|\n/g, " __BR__ ");
	window.opener.SBcapture.linked.img   = document.getElementById("ScrapBookDetailLinkedI").checked;
	window.opener.SBcapture.linked.snd   = document.getElementById("ScrapBookDetailLinkedS").checked;
	window.opener.SBcapture.linked.mov   = document.getElementById("ScrapBookDetailLinkedM").checked;
	window.opener.SBcapture.linked.arc   = document.getElementById("ScrapBookDetailLinkedA").checked;
	window.opener.SBcapture.linked.all   = document.getElementById("ScrapBookDetailLinkedZ").checked;
}


function SB_cancelDetail()
{
	window.opener.SBcapture.exchange.cancel = true;
}


