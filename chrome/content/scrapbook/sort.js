
var sbSortService = {

	get WIZARD()      { return document.getElementById("sbSortWizard"); },
	get RADIO_GROUP() { return document.getElementById("sbSortRadioGroup"); },

	key : "",
	ascending : false,
	index : -1,
	contResList : [],
	waitTime : 0,

	init : function()
	{
		this.WIZARD.getButton("back").hidden = true;
		this.WIZARD.getButton("finish").disabled = true;
		this.WIZARD.getButton("next").removeAttribute("accesskey");
		this.WIZARD.canAdvance = false;
		this.RADIO_GROUP.selectedIndex = this.RADIO_GROUP.getAttribute("sortIndex");
		if ( window.arguments ) {
			this.contResList = [window.arguments[0]];
			this.waitTime = 2;
		} else {
			this.contResList = [sbCommonUtils.RDF.GetResource("urn:scrapbook:root")];
			this.waitTime = 6;
		}
		sbSortService.countDown();
		//tree verstecken
		var liste = window.opener.document.getElementById("sbTreeOuter");
		liste.hidden = true;
	},

	countDown : function()
	{
		this.WIZARD.getButton("next").label = sbCommonUtils.lang("scrapbook", "START_BUTTON") + (this.waitTime > 0 ? " (" + this.waitTime + ")" : "");
		this.WIZARD.canAdvance = this.waitTime == 0;
		if ( this.waitTime-- ) setTimeout(function(){ sbSortService.countDown() }, 500);
	},

	exec : function()
	{
		this.WIZARD.getButton("cancel").hidden = true;
		if (document.getElementById("sbSortRecursive").checked)
			this.contResList = sbDataSource.flattenResources(this.contResList[0], 1, true);
		switch ( this.RADIO_GROUP.selectedIndex )
		{
			case 0 : break;
			case 1 : this.key = "title"; this.ascending = true;  break;
			case 2 : this.key = "title"; this.ascending = false; break;
			case 3 : this.key = "id";    this.ascending = true;  break;
			case 4 : this.key = "id";    this.ascending = false; break;
		}
		this.next();
	},

	next : function()
	{
		if ( ++this.index < this.contResList.length ) {
			document.getElementById("sbSortTextbox").value = "(" + (this.index + 1) + "/" + this.contResList.length + ")... " + sbDataSource.getProperty(this.contResList[this.index], "title");
			this.process(this.contResList[this.index]);
		} else {
			//Sortieren beendet
			sbDataSource.flush();
			this.RADIO_GROUP.setAttribute("sortIndex", this.RADIO_GROUP.selectedIndex);
			window.close();
			//tree wieder anzeigen
			var liste = window.opener.document.getElementById("sbTreeOuter");
			liste.hidden = false;
		}
	},

	process : function(aContRes)
	{
		//Variablen
			//fuer Bubble Sort
		var		tausch					= 0;
		var		getauscht				= 0;
		var		anfang					= 0;
		var		ende					= 0;
		var		ersterTausch			= 0;
		var		letzterTausch			= 0;
			//fuer Bubble Sort
		var		data					= [];
		var		dataIDX0				= [];	//Folder
		var		dataIDX1				= [];	//Item
		var		dataIDX2				= [];	//???
		var		dataIDX					= [];
		var		dataIDXcount			= [];	//Folder, Item, ???
		var		puffer					= "";
		var		datum;
		var		stunden					= [];
		var		minuten					= [];
		var		sekundn					= [];
		var		resList					= []; 	//Folder
		var		resListcount			= -1;
		var		neueEintragNr			= 0;
		//Startzeit festhalten
		datum      = new Date();
		stunden[0] = datum.getHours();
		minuten[0] = datum.getMinutes();
		sekundn[0] = datum.getSeconds();
		//???
		dataIDXcount[0] = -1;
		dataIDXcount[1] = -1;
		dataIDXcount[2] = -1;
		//alter Code
		var rdfCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		rdfCont.Init(sbDataSource.data, aContRes);
		var resEnum = rdfCont.GetElements();
		//ueberarbeiteter Code
		if ( !this.key )
		{
			while ( resEnum.hasMoreElements() )
			{
				var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				resListcount++;
				resList.push(res);
				data[resListcount] = sbDataSource.getProperty(res, sbSortService.key).toUpperCase();
				dataIDXcount[0]++;
				dataIDX0[dataIDXcount[0]] = resListcount;
			}
			//Die Reihenfolge umkehren
			neueEintragNr = dataIDXcount[0];
			for (var i=0; i<=dataIDXcount[0]; i++)
			{
				dataIDX0[i] = neueEintragNr;
				neueEintragNr--;
			}
			//Da der Aufbau von resList immer gleich bleibt, egal was aus dem Tree-Container geloescht wird,
			//muss eine zweite Liste her, die den Aufbau im Tree-Container wiedergibt!
			for (var i=0; i<dataIDX0.length; i++)
			{
				dataIDX1[i] = dataIDX0[i];
			}
			//getauscht muss größer 0 sein, da sonst nichts gemacht wird
			getauscht = 1;
		}
		else
		{
			while ( resEnum.hasMoreElements() )
			{
				var res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				if ( sbDataSource.isContainer(res) )
				{
					resListcount++;
					resList.push(res);
					data[resListcount] = sbDataSource.getProperty(res, sbSortService.key).toUpperCase();
					dataIDXcount[0]++;
					dataIDX0[dataIDXcount[0]] = resListcount;
				} else
				{
					if ( sbDataSource.getProperty(res, "type") == "note")
					{
						resListcount++;
						resList.push(res);
						data[resListcount] = sbDataSource.getProperty(res, sbSortService.key).toUpperCase();
						dataIDXcount[2]++;
						dataIDX2[dataIDXcount[2]] = resListcount;
					} else
					{
						resListcount++;
						resList.push(res);
						data[resListcount] = sbDataSource.getProperty(res, sbSortService.key).toUpperCase();
						dataIDXcount[1]++;
						dataIDX1[dataIDXcount[1]] = resListcount;
					}
				}
			}
			//Zusammenführen von dataIDX0-2
			dataIDX.push(dataIDX0);
			dataIDX.push(dataIDX1);
			dataIDX.push(dataIDX2);
			if ( this.ascending )
			{
				//alle drei Arrays werden mit BubbleSort aufsteigend sortiert
				for (var k=0; k<3; k++)
				{
					//BubbleSort
					anfang = 0;
					ende = dataIDXcount[k];
					for (var i=0; i<dataIDXcount[k]; i++)
					{
						tausch = 0;
						ersterTausch = -1;
						letzterTausch = -1;
						for (var j=anfang; j<ende; j++)
						{
							if (data[dataIDX[k][j]] > data[dataIDX[k][j+1]])
							{
								//dataIDX[k] korrigieren
								puffer = dataIDX[k][j];
								dataIDX[k][j] = dataIDX[k][j+1];
								dataIDX[k][j+1] = puffer;
								getauscht++;
								letzterTausch = j;
								tausch = 1;
							}
						}
						for (var j=ende; j>anfang; j--)
						{
							if (data[dataIDX[k][j]] < data[dataIDX[k][j-1]])
							{
								//dataIDX[k] korrigieren
								puffer = dataIDX[k][j];
								dataIDX[k][j] = dataIDX[k][j-1];
								dataIDX[k][j-1] = puffer;
								getauscht++;
								ersterTausch = j;
								tausch = 1;
							}
						}
						if (tausch == 0)
						{
							i=dataIDXcount[k];
						} else
						{
							anfang = ersterTausch;
							ende = letzterTausch;
						}
					}
				}
			} else
			{
				//alle drei Arrays werden mit BubbleSort absteigend sortiert
				for (var k=0; k<3; k++)
				{
					//BubbleSort
					anfang = 0;
					ende = dataIDXcount[k];
					for (var i=0; i<dataIDXcount[k]; i++)
					{
						tausch = 0;
						ersterTausch = -1;
						letzterTausch = -1;
						for (var j=anfang; j<ende; j++)
						{
							if (data[dataIDX[k][j]] < data[dataIDX[k][j+1]])
							{
								//dataIDX[k] korrigieren
								puffer = dataIDX[k][j];
								dataIDX[k][j] = dataIDX[k][j+1];
								dataIDX[k][j+1] = puffer;
								getauscht++;
								letzterTausch = j;
								tausch = 1;
							}
						}
						for (var j=ende; j>anfang; j--)
						{
							if (data[dataIDX[k][j]] > data[dataIDX[k][j-1]])
							{
								//dataIDX[k] korrigieren
								puffer = dataIDX[k][j];
								dataIDX[k][j] = dataIDX[k][j-1];
								dataIDX[k][j-1] = puffer;
								getauscht++;
								ersterTausch = j;
								tausch = 1;
							}
						}
						if (tausch == 0)
						{
							i=dataIDXcount[k];
						} else
						{
							anfang = ersterTausch;
							ende = letzterTausch;
						}
					}
				}
			}
			//Zusammenfuegen der drei Arrays
			dataIDX0 = dataIDX0.concat(dataIDX1).concat(dataIDX2);
			//Da der Aufbau von resList immer gleich bleibt, egal was aus dem Tree-Container geloescht wird,
			//muss eine zweite Liste her, die den Aufbau im Tree-Container wiedergibt!
			for (var i=0; i<dataIDX0.length; i++)
			{
				dataIDX1[i] = dataIDX0[i];
			}
		}
		//Startzeit festhalten
		datum      = new Date();
		stunden[1] = datum.getHours();
		minuten[1] = datum.getMinutes();
		sekundn[1] = datum.getSeconds();
//		alert("Startzeit: "+stunden[0]+":"+minuten[0]+":"+sekundn[0]+"\r\nEndzeit:   "+stunden[1]+":"+minuten[1]+":"+sekundn[1])
		if (getauscht > 0)
		{
			//RDF-Datenquelle vom tree entfernen
			var datei = sbCommonUtils.getScrapBookDir();
			datei.append("scrapbook.rdf");
			var dateiURL = sbCommonUtils.IO.newFileURI(datei).spec;
			var daten = sbCommonUtils.RDF.GetDataSourceBlocking(dateiURL);
			var treeObj = window.opener.document.getElementById("sbTree");
			treeObj.database.RemoveDataSource(daten);
			getauscht = 0;
			for (var i=0; i<dataIDX0.length; i++)
			{
				if (i != dataIDX1[i])
				{
					//Eintrag aus Liste entfernen
					rdfCont.RemoveElementAt(dataIDX1[i]+1, true);
					//Zuvor entfernten Eintrag an neuer Position einfuegen
					rdfCont.InsertElementAt(resList[dataIDX0[i]], i+1, true);
					//dataIDX1 anpassen
					for (var j=i+1; j<dataIDX1.length; j++)
					{
						if (dataIDX1[j] < dataIDX1[i] && dataIDX1[j] >= i)
						{
							dataIDX1[j]++;
						}
					}
					dataIDX1[i] = i;
					//Tausch merken
					getauscht++;
				}
			}
			//RDF-Datenquelle dem tree hinzufügen
			treeObj.database.AddDataSource(daten);
		}
//		alert("Es wurden insgesamt "+getauscht+" Eintraege verschoben.");
		//Endzeit festhalten
		datum      = new Date();
		stunden[3] = datum.getHours();
		minuten[3] = datum.getMinutes();
		sekundn[3] = datum.getSeconds();
		//Start- und Endzeit ausgeben
//		alert("Startzeit: "+stunden[0]+":"+minuten[0]+":"+sekundn[0]+"\r\nEndzeit:   "+stunden[3]+":"+minuten[3]+":"+sekundn[3]);
		setTimeout(function(){ sbSortService.next(res); }, 0);
	},

	showTree : function()
	{
		//tree wieder anzeigen
		var liste = window.opener.document.getElementById("sbTreeOuter");
		liste.hidden = false;
	},

	compare : function(resA, resB)
	{
		var a = sbDataSource.getProperty(resA, sbSortService.key).toUpperCase();
		var b = sbDataSource.getProperty(resB, sbSortService.key).toUpperCase();
		if ( a > b ) return 1;
		if ( a < b ) return -1;
		return 0;
	},

};



