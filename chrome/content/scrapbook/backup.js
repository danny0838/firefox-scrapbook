
var SBwizard;

var gProgPath;
var gDestPath;
var gArguments;
var gDataPath;


function SB_initBackup()
{
	SBwizard = document.getElementById("sbBackupWizard");
	gProgPath  = nsPreferences.copyUnicharPref("scrapbook.backup.program", "");
	gDestPath  = nsPreferences.copyUnicharPref("scrapbook.backup.destination", "");
	gArguments = nsPreferences.copyUnicharPref("scrapbook.backup.arguments", "");
	gDataPath  = sbCommonUtils.getScrapBookDir().path;
	document.getElementById("sbBackupProgramTextbox").value     = gProgPath;
	document.getElementById("sbBackupDestinationTextbox").value = gDestPath;
	document.getElementById("sbBackupArgumentsMenulist").value  = gArguments;
	SBwizard.getButton("back").hidden = true;
	SBwizard.getButton("finish").label = document.getElementById("sbMainString").getString("START_BUTTON");
	if ( window.location.href.match(/\?auto/) ) SB_execBackup();
}


function SB_execBackup()
{
	gProgPath  = document.getElementById("sbBackupProgramTextbox").value;
	gDestPath  = document.getElementById("sbBackupDestinationTextbox").value;
	gArguments = document.getElementById("sbBackupArgumentsMenulist").value;
	if ( !gProgPath || !gDestPath || !gArguments ) return;
	nsPreferences.setUnicharPref("scrapbook.backup.program",     gProgPath);
	nsPreferences.setUnicharPref("scrapbook.backup.destination", gDestPath);
	nsPreferences.setUnicharPref("scrapbook.backup.arguments",   gArguments);
	var args = gArguments.split(" ");
	for ( var i=0; i<args.length; i++ )
	{
		if ( args[i] == "%dst" ) args[i] = gDestPath;
		if ( args[i] == "%src" ) args[i] = gDataPath;
	}
	sbCommonUtils.execProgram(gProgPath, args);
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
		document.getElementById("sbBackupProgramTextbox").value = theFile.path;
	}
}


function SB_selectBackupDestination()
{
	var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
	FP.init(window, document.getElementById("sbBackupDestinationCaption").label, FP.modeSave);
	var ext, prog = document.getElementById("sbBackupProgramTextbox").value;
	var ext = prog.match(/WinRAR/i) ? "rar" : "zip";
	FP.defaultString = "ScrapBook." + ext;
	var answer = FP.show();
	if ( answer == FP.returnOK || answer == FP.returnReplace )
	{
		var theFile = FP.file;
		document.getElementById("sbBackupDestinationTextbox").value = theFile.path;
	}
}


