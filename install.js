/* *********************************
Installation script for Mozilla
Author: Gomita
********************************* */

const author              = "Gomita";
const displayName         = "ScrapBook";
const name                = "scrapbook";
const version             = "0.12.0";
var contentFlag           = CONTENT | PROFILE_CHROME;
var error                 = null;
var folder                = getFolder("Profile", "chrome");
var localeFlag            = LOCALE | PROFILE_CHROME;
var skinFlag              = SKIN | PROFILE_CHROME;
var jarName               = name + ".jar";
var existsInApplication   = File.exists(getFolder(getFolder("chrome"), jarName));
var existsInProfile       = File.exists(getFolder(folder, jarName));

initInstall(displayName, name, version);

// If the extension exists in the application folder or it doesn't exist in the profile folder and the user doesn't want it installed to the profile folder
if (
	existsInApplication ||
	(!existsInProfile && !confirm("Do you want to install the extension into your profile folder?\n(Cancel will install into the application folder)"))
) {
	contentFlag = CONTENT | DELAYED_CHROME;
	folder      = getFolder("chrome");
	localeFlag  = LOCALE | DELAYED_CHROME;
	skinFlag    = SKIN | DELAYED_CHROME;
}

setPackageFolder(folder);
error = addFile(author, version, 'chrome/' + jarName, folder, null);

// If adding the JAR file succeeded
if ( error == SUCCESS )
{
	folder = getFolder(folder, jarName);
	registerChrome(contentFlag, folder, "content/");
	registerChrome(localeFlag, folder, "locale/en-US/");
	registerChrome(localeFlag, folder, "locale/ja-JP/");
// 	registerChrome(localeFlag, folder, "locale/zh-TW/");
// 	registerChrome(localeFlag, folder, "locale/it-IT/");
	registerChrome(skinFlag, folder, "skin/classic/");

	error = performInstall();

	// If the install failed
	if ( error == SUCCESS || error == 999 )
	{
		alert(displayName + " " + version + " has been succesfully installed.\nPlease restart Mozilla and go to 'chrome://scrapbook/content/install.html' for completion.");
	}
	else
	{
		alert("Install failed. Error code : " + error);
		cancelInstall(error);
	}
}
else
{
	alert("The installation of the extension failed.\n" + error + "\n Failed to create " + jarName + " \n"
	       + "Make sure you have the correct permissions");
	cancelInstall(error);
}


