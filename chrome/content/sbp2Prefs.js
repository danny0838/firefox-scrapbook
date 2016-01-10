/*
	Dieses Skript stellt Funktionen zur Nutzung des preferences-service bereit.
*/

var sbp2Prefs = {

	get PREF()		{ return Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch); },

	getBoolPref : function(gbpPrefName, gbpDefVal)
	{
		//Liefert den aktuellen Wert für gboPrefName zurück.

		try
		{
			return this.PREF.getBoolPref(gbpPrefName);
		} catch(gbpEx)
		{
			return gbpDefVal != undefined ? gbpDefVal : null;
		}
	},

	setBoolPref : function(sbpPrefName, sbpValue)
	{
		//ändert den Wert für sbpPrefName.
		//
		//Ablauf:
		//1. Wert ändern
		//2. änderung speichern

		try
		{
			//1. Wert ändern
			this.PREF.setBoolPref(sbpPrefName, sbpValue);
			//2. änderung speichern
			var supPrefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
			supPrefService.savePrefFile(null);
		} catch(sbpEx)
		{
			alert("sbp2Prefs.setBoolPref\n---\n"+sbpEx);
		}
	},

	getIntPref : function(gipPrefName)
	{
		//Liefert den aktuellen Wert für gipPrefName zurück.
		try
		{
			return this.PREF.getIntPref(gipPrefName);
		} catch (gupEx)
		{
			return -1;
		}
	},

	getUnicharPref : function(gupPrefName, gupDefVal)
	{
		//Liefert den aktuellen Wert für gupPrefName zurück.

		try
		{
			return this.PREF.getComplexValue(gupPrefName, Components.interfaces.nsISupportsString).data;
		} catch (gupEx)
		{
			return gupDefVal != undefined ? gupDefVal : null;
		}
	},

	setUnicharPref : function(supPrefName, supPrefValue)
	{
		//ändert den Wert für supPrefName.
		//
		//Ablauf:
		//1. Wert ändern
		//2. änderung speichern

		try
		{
			//1. Wert ändern
			var supString = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
			supString.data = supPrefValue;
			this.PREF.setComplexValue(supPrefName, Components.interfaces.nsISupportsString, supString);
			//2. änderung speichern
			var supPrefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
			supPrefService.savePrefFile(null);
		} catch(supEx)
		{
			alert("sbp2Prefs.setUnicharPref\n---\n"+supEx);
		}
	},
}