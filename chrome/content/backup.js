/**************************************************
// backup.js
// Implementation file for backup.xul
// 
// Description: 
// Author: Gomita
// Contributors: michael-brueggemann
// 
// Version: 
// License: see LICENSE.txt
**************************************************/


var SBwizard;
var SBstring;

var gProgPath;
var gDestPath;
var gArguments;
var gDataPath;


function SB_initBackup()
{
	SBwizard = document.getElementById("ScrapBookBackupWizard");
	SBstring = document.getElementById("ScrapBookString");
	gProgPath  = nsPreferences.copyUnicharPref("scrapbook.backup.program", "");
	gDestPath  = nsPreferences.copyUnicharPref("scrapbook.backup.destination", "");
	gArguments = nsPreferences.copyUnicharPref("scrapbook.backup.arguments", "");
	gDataPath  = SBcommon.getScrapBookDir().path;
	document.getElementById("ScrapBookBackupProgramTextbox").value     = gProgPath;
	document.getElementById("ScrapBookBackupDestinationTextbox").value = gDestPath;
	document.getElementById("ScrapBookBackupArgumentsMenulist").value  = gArguments;
	SBwizard.getButton("back").hidden = true;
	SBwizard.getButton("finish").label = SBstring.getString("START_BUTTON");
	if ( window.location.href.match(/\?auto/) ) SB_execBackup();
}


function SB_execBackup()
{
	gProgPath  = document.getElementById("ScrapBookBackupProgramTextbox").value;
	gDestPath  = document.getElementById("ScrapBookBackupDestinationTextbox").value;
	gArguments = document.getElementById("ScrapBookBackupArgumentsMenulist").value;
	if ( !gProgPath || !gDestPath || !gArguments ) return;
	nsPreferences.setUnicharPref("scrapbook.backup.program",     gProgPath);
	nsPreferences.setUnicharPref("scrapbook.backup.destination", gDestPath);
	nsPreferences.setUnicharPref("scrapbook.backup.arguments",   gArguments);
	gProgPath = gProgPath.replace(/\\/g, "\\\\");
	gDestPath = gDestPath.replace(/\\/g, "\\\\");
	gDataPath = gDataPath.replace(/\\/g, "\\\\");
	var args = gArguments.split(" ");
	for ( var i=0; i<args.length; i++ )
	{
		if ( args[i] == "%dst" ) args[i] = gDestPath;
		if ( args[i] == "%src" ) args[i] = gDataPath;
	}
	SBcommon.execProgram(gProgPath, args);
	if ( window.location.href.match(/\?auto/) ) setTimeout(function(){ window.close(); }, 1000);
}


function SB_selectCompressionProgram()
{
	var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
	FP.init(window, document.getElementById("sbBackupProgramCaption").label, FP.modeOpen);
	FP.appendFilters(FP.filterApps);
	var answer = FP.show();
	if ( answer == FP.returnOK )
	{
		var theFile = FP.file;
		document.getElementById("ScrapBookBackupProgramTextbox").value = theFile.path;
	}
}


function SB_selectBackupDestination()
{
	var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
	FP.init(window, document.getElementById("sbBackupDestinationCaption").label, FP.modeSave);
	var ext, prog = document.getElementById("ScrapBookBackupProgramTextbox").value;
	var ext = prog.match(/WinRAR/i) ? "rar" : "zip";
	FP.defaultString = "ScrapBook." + ext;
	var answer = FP.show();
	if ( answer == FP.returnOK || answer == FP.returnReplace )
	{
		var theFile = FP.file;
		document.getElementById("ScrapBookBackupDestinationTextbox").value = theFile.path;
	}
}


