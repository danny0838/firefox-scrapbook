/**************************************************
// note.js
// Implementation file for note.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/



const NS_XHTML = "http://www.w3.org/1999/xhtml";

var gID;
var gRes;



function SN_init()
{
	gID = document.location.href.match(/\?id\=(\d{14})$/);
	gID = RegExp.$1;
	SBnote.sidebar = false;
	SBnote.init();
	SBRDF.init();
	gRes = SBservice.RDF.GetResource("urn:scrapbook:item" + gID);
	SBnote.edit(gRes);
	SNtemplate.init();
}


function SN_quitNoSave()
{
	SBnote.toSave = false;
	window.location.href = "about:blank";
}


var SNpreview = {

	show : function()
	{
		SBnote.save();
		SNtemplate.save();
		var mySrc = SNtemplate.getTemplate();
		if ( SBnote.editXUL.value.match(/\n/) ) {
			var myTitle   = RegExp.leftContext;
			var myContent = RegExp.rightContext;
		} else {
			var myTitle   = SBnote.editXUL.value;
			var myContent = "";
		}
		myTitle = myTitle.replace(/</g, "&lt;");
		myTitle = myTitle.replace(/>/g, "&gt;");
		myTitle = myTitle.replace(/\"/g, "&quot;");
		if ( document.getElementById("ScrapNoteToolbarA").checked ) myContent = myContent.replace(/([^>])$/mg, "$1<br>");
		mySrc = mySrc.replace(/<%NOTE_TITLE%>/g,   myTitle);
		mySrc = mySrc.replace(/<%NOTE_CONTENT%>/g, myContent);
		var myHTML = SBcommon.getScrapBookDir().clone();
		myHTML.append("note.html");
		SBcommon.writeFile(myHTML, mySrc, "UTF-8");
		document.getElementById("ScrapNoteSplitter").hidden = false;
		document.getElementById("ScrapNoteBrowser").hidden  = false;
		document.getElementById("ScrapNoteHeader").lastChild.hidden = false;
		document.getElementById("ScrapNoteBrowser").removeAttribute("src");
		document.getElementById("ScrapNoteBrowser").setAttribute("src", SBcommon.convertFilePathToURL(myHTML.path));
	},

	exit : function()
	{
		document.getElementById("ScrapNoteSplitter").hidden = true;
		document.getElementById("ScrapNoteBrowser").hidden  = true;
		document.getElementById("ScrapNoteHeader").lastChild.hidden = true;
	},

};


var SNtemplate = {

	editXUL  : null,
	enable   : false,
	toSave   : false,
	tmplFile : null,

	dropListener : function() { SNtemplate.change(true); },

	init : function()
	{
		this.editXUL = document.getElementById("ScrapNoteTemplateTextbox");
		this.editXUL.removeEventListener("dragdrop", this.dropListener, true);
		this.editXUL.addEventListener("dragdrop",    this.dropListener, true);
		this.tmplFile = SBcommon.getScrapBookDir().clone();
		this.tmplFile.append("note_template.html");
		if ( !this.tmplFile.exists() ) SBcommon.saveTemplateFile("chrome://scrapbook/content/template.html", this.tmplFile);
	},

	show : function(willShow)
	{
		document.getElementById("ScrapNoteTemplate").hidden = !willShow;
		document.getElementById("ScrapNoteEditor").hidden   = willShow;
		this.enable = willShow;
	},

	getTemplate : function()
	{
		var template = SBcommon.readFile(this.tmplFile);
		template = SBcommon.convertStringToUTF8(template);
		return template;
	},

	load : function()
	{
		this.save();
		this.show(true);
		this.editXUL.value = this.getTemplate();
		this.editXUL.focus();
	},

	save : function()
	{
		if ( !this.toSave ) return;
		var myCSS = SBcommon.getScrapBookDir().clone();
		myCSS.append("note_template.html");
		SBcommon.writeFile(myCSS, this.editXUL.value, "UTF-8");
		this.change(false);
	},

	exit : function(checkOff)
	{
		this.save();
		this.show(false);
		if ( checkOff ) document.getElementById("ScrapNoteToolbarT").checked = false;
	},

	change : function(aBool)
	{
		this.toSave = aBool;
		document.getElementById("ScrapNoteToolbarS").disabled = !aBool;
	},

};


