
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const FLUSH_DELAY = 10000;
const PREF_DOMAIN = "extensions.scrapbook.";

Components.utils.import("resource://scrapbook-modules/utils.jsm");


var ScrapBookData = {


	_rdfFile: null,

	_dataSource: null,

	get dataSource() {
		if (!this._dataSource)
			this._init();
		return this._dataSource;
	},



	_firstInit: true,

	_init: function SBD__init() {
		if (this._firstInit) {
			this._firstInit = false;
			this._toggleObserving(true);
		}
		if (this._dataSource)
			return;
		try {
			this._rdfFile = ScrapBookUtils.getScrapBookDir().clone();
			this._rdfFile.append("scrapbook.rdf");
			if (!this._rdfFile.exists()) {
				this._rdfFile.create(this._rdfFile.NORMAL_FILE_TYPE, 0666);
				var fileURL = ScrapBookUtils.IO.newFileURI(this._rdfFile).spec;
				this._dataSource = ScrapBookUtils.RDF.GetDataSourceBlocking(fileURL);
				this.createEmptySeq("urn:scrapbook:root");
				this.flush();
			}
			else {
				var fileURL = ScrapBookUtils.IO.newFileURI(this._rdfFile).spec;
				this._dataSource = ScrapBookUtils.RDF.GetDataSourceBlocking(fileURL);
				this._archiveFile();
			}
			var baseURL = ScrapBookUtils.getBaseHref(this._dataSource.URI);
			var rph = ScrapBookUtils.IO.getProtocolHandler("resource").
			          QueryInterface(Ci.nsIResProtocolHandler);
			if (!rph.hasSubstitution("scrapbook") ||
				rph.getSubstitution("scrapbook").spec != baseURL) {
				rph.setSubstitution("scrapbook", ScrapBookUtils.convertURLToObject(baseURL));
			}
		}
		catch (ex) {
			ScrapBookUtils.alert("ERROR: Failed to initialize datasource.\n\n" + ex);
		}
	},

	_archiveFile: function SBD__archiveFile() {
		var bDir = ScrapBookUtils.getScrapBookDir();
		bDir.append("backup");
		if (!bDir.exists())
			bDir.create(bDir.DIRECTORY_TYPE, 0700);
		var bFileName = "scrapbook_" + ScrapBookUtils.getTimeStamp().substring(0, 8) + ".rdf";
		try {
			this._rdfFile.copyTo(bDir, bFileName);
		}
		catch (ex) {
		}
		var max = 5;
		var today = (new Date()).getTime();
		var dirEnum = bDir.directoryEntries;
		while (dirEnum.hasMoreElements()) {
			var entry = dirEnum.getNext().QueryInterface(Ci.nsILocalFile);
			if (!entry.leafName.match(/^scrapbook_(\d{4})(\d{2})(\d{2})\.rdf$/))
				continue;
			var [y, m, d] = [RegExp.$1, RegExp.$2, RegExp.$3].map(function(val) parseInt(val, 10));
			var lifeTime = new Date(y, m - 1, d).getTime();
			lifeTime = Math.round((today - lifeTime) / (1000 * 60 * 60 * 24));
			if (lifeTime > 30 && --max >= 0) {
				entry.remove(false);
			}
		}
	},

	restoreFromBackup: function SBD_restoreFromBackup(aBackupFile) {
		if (!aBackupFile || !aBackupFile.exists())
			throw Cr.NS_ERROR_INVALID_ARG;
		this._archiveFile();
		if (this._rdfFile)
			this._rdfFile.remove(false);
		aBackupFile.copyTo(ScrapBookUtils.getScrapBookDir(), "scrapbook.rdf");
		this._uninit();
		this._init();
		ScrapBookUtils.refreshGlobal(true);
	},

	_flushTimer: null,

	flush: function SBD_flush() {
		if (!this._dataSource)
			throw Cr.NS_ERROR_NOT_INITIALIZED;
		this._dataSource.QueryInterface(Ci.nsIRDFRemoteDataSource).Flush();
	},

	_flushWithDelay: function SBD__flushWithDelay() {
		if (this._flushTimer)
			return;
		this._flushTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
		this._flushTimer.init(this, FLUSH_DELAY, Ci.nsITimer.TYPE_ONE_SHOT);
	},

	_uninit: function SBD__uninit() {
		if (this._flushTimer) {
			this.flush();
			this._flushTimer.cancel();
			this._flushTimer = null;
		}
		ScrapBookUtils.RDF.UnregisterDataSource(this._dataSource);
		this._dataSource = null;
		this._rdfFile = null;
	},

	_toggleObserving: function SBD__toggleObserving(aObserve) {
		var obs = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
		var pb2 = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
		try {
			obs.removeObserver(this, "quit-application");
		}
		catch (ex) {}
		try {
			pb2.removeObserver(PREF_DOMAIN, this);
		}
		catch (ex) {}
		if (aObserve) {
			obs.addObserver(this, "quit-application", false);
			pb2.addObserver(PREF_DOMAIN, this, false);
		}
	},

	observe: function SBD_observe(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "timer-callback": 
				this._flushTimer = null;
				this.flush();
				break;
			case "quit-application": 
				this._toggleObserving(false);
				this._uninit();
				break;
			case "nsPref:changed": 
				if (aData == PREF_DOMAIN + "data.default" || 
				    aData == PREF_DOMAIN + "data.path" || 
				    aData == PREF_DOMAIN + "multibook.enabled") {
					this._uninit();
					this._init();
					ScrapBookUtils.refreshGlobal(true);
				}
				break;
			default: 
		}
	},



	newItem: function SBD_newItem(aID) {
		this._init();
		if (aID === undefined) {
			aID = ScrapBookUtils.getTimeStamp();
			var i = 0;
			while (this.exists(aID)) {
				--aID;
				if (aID < 0)
					throw Components.results.NS_ERROR_UNEXPECTED;
			}
		}
		function Item(aID) {
			this.id      = aID;
			this.type    = "";
			this.title   = "";
			this.chars   = "";
			this.icon    = "";
			this.source  = "";
			this.comment = "";
		}
		return new Item(aID);
	},

	sanitize: function SBD_sanitize(aVal) {
		if (!aVal)
			return "";
		return aVal.replace(/[\x00-\x1F\x7F]/g, " ");
	},

	validateURI: function SBD_validateURI(aURI) {
		if (aURI == "urn:scrapbook:root" || 
		    aURI == "urn:scrapbook:search" || 
		    aURI.match(/^urn:scrapbook:item\d{14}$/)) {
			return true;
		}
		return false;
	},

	addItem: function SBD_addItem(aSBitem, aParName, aIdx) {
		this._init();
		if (!this.validateURI("urn:scrapbook:item" + aSBitem.id))
			return;
		["title", "comment", "icon", "source"].forEach(function(prop) {
			aSBitem[prop] = this.sanitize(aSBitem[prop]);
		}, this);
		try {
			var cont = this.getContainer(aParName, false);
			if (!cont) {
				cont = this.getContainer("urn:scrapbook:root", false);
				aIdx = 0;
			}
			var newRes = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + aSBitem.id);
			["id", "type", "title", "chars", "comment", "icon", "source"].forEach(function(prop) {
				var arc = ScrapBookUtils.RDF.GetResource(ScrapBookUtils.namespace + prop);
				var val = ScrapBookUtils.RDF.GetLiteral(aSBitem[prop]);
				this._dataSource.Assert(newRes, arc, val, true);
			}, this);
			if (aSBitem.type == "separator") {
				this._dataSource.Assert(
					newRes,
					ScrapBookUtils.RDF.GetResource("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
					ScrapBookUtils.RDF.GetResource("http://home.netscape.com/NC-rdf#BookmarkSeparator"),
					true
				);
			}
			if (ScrapBookUtils.getPref("tree.unshift", false) && 
			    (aIdx == 0 || aIdx == -1)) {
				aIdx = 1;
			}
			if (0 < aIdx && aIdx < cont.GetCount())
				cont.InsertElementAt(newRes, aIdx, true);
			else
				cont.AppendElement(newRes);
			this._flushWithDelay();
			return newRes;
		}
		catch (ex) {
			ScrapBookUtils.alert("ERROR: Failed to add resource to datasource.\n\n" + ex);
			return false;
		}
	},

	moveItem: function SBD_moveItem(curRes, curPar, tarPar, tarRelIdx) {
		this._init();
		try {
			ScrapBookUtils.RDFC.Init(this._dataSource, curPar);
			ScrapBookUtils.RDFC.RemoveElement(curRes, true);
		}
		catch (ex) {
			ScrapBookUtils.alert("ERROR: Failed to move element at datasource (1).\n\n" + ex);
			return;
		}
		if (ScrapBookUtils.getPref("tree.unshift", false) && 
		    (tarRelIdx == 0 || tarRelIdx == -1)) {
			tarRelIdx = 1;
		}
		try {
			ScrapBookUtils.RDFC.Init(this._dataSource, tarPar);
			if (tarRelIdx > 0)
				ScrapBookUtils.RDFC.InsertElementAt(curRes, tarRelIdx, true);
			else
				ScrapBookUtils.RDFC.AppendElement(curRes);
		}
		catch (ex) {
			ScrapBookUtils.alert("ERROR: Failed to move element at datasource (2).\n\n" + ex);
			ScrapBookUtils.RDFC.Init(this._dataSource, ScrapBookUtils.RDF.GetResource("urn:scrapbook:root"));
			ScrapBookUtils.RDFC.AppendElement(curRes, true);
		}
		this._flushWithDelay();
	},

	createEmptySeq: function SBD_createEmptySeq(aResName) {
		this._init();
		if (!this.validateURI(aResName))
			return;
		ScrapBookUtils.RDFCU.MakeSeq(this._dataSource, ScrapBookUtils.RDF.GetResource(aResName));
		this._flushWithDelay();
	},

	deleteItemDescending: function SBD_deleteItemDescending(aRes, aParRes) {
		this._init();
		ScrapBookUtils.RDFC.Init(this._dataSource, aParRes);
		ScrapBookUtils.RDFC.RemoveElement(aRes, true);
		var rmIDs = [], addIDs = [];
		var depth = 0;
		do {
			addIDs = this._cleanUpIsolation();
			rmIDs = rmIDs.concat(addIDs);
		}
		while (addIDs.length > 0 && ++depth < 100);
		this._flushWithDelay();
		return rmIDs;
	},

	_cleanUpIsolation: function SBD__cleanUpIsolation() {
		var rmIDs = [];
		try {
			var resEnum = this._dataSource.GetAllResources();
			while (resEnum.hasMoreElements()) {
				var aRes = resEnum.getNext().QueryInterface(Ci.nsIRDFResource);
				if (aRes.Value != "urn:scrapbook:root" && 
				    aRes.Value != "urn:scrapbook:search" && 
				    !this._dataSource.ArcLabelsIn(aRes).hasMoreElements()) {
					rmIDs.push(this.removeResource(aRes));
				}
			}
		}
		catch (ex) {
			ScrapBookUtils.alert("ERROR: Failed to clean up datasource.\n" + ex);
		}
		return rmIDs;
	},

	removeResource: function SBD_removeResource(aRes) {
		var names = this._dataSource.ArcLabelsOut(aRes);
		var rmID = this.getProperty(aRes, "id");
		while (names.hasMoreElements()) {
			try {
				var name  = names.getNext().QueryInterface(Ci.nsIRDFResource);
				var value = this._dataSource.GetTarget(aRes, name, true);
				this._dataSource.Unassert(aRes, name, value);
			}
			catch (ex) {
			}
		}
		this._flushWithDelay();
		return rmID;
	},



	getContainer: function SBD_getContainer(aResURI, aForceCreate) {
		this._init();
		var cont = Cc['@mozilla.org/rdf/container;1'].createInstance(Ci.nsIRDFContainer);
		try {
			cont.Init(this._dataSource, ScrapBookUtils.RDF.GetResource(aResURI));
			return cont;
		}
		catch (ex) {
			if (!aForceCreate || !this.validateURI(aResURI))
				return null;
			return ScrapBookUtils.RDFCU.MakeSeq(this._dataSource, ScrapBookUtils.RDF.GetResource(aResURI));
		}
	},

	clearContainer: function SBD_clearContainer(aResURI) {
		this._init();
		var cont = this.getContainer(aResURI, true);
		while (cont.GetCount() > 0) {
			cont.RemoveElementAt(1, true);
		}
		this._flushWithDelay();
	},

	removeFromContainer: function SBD_removeFromContainer(aResURI, aRes) {
		this._init();
		var cont = this.getContainer(aResURI, true);
		if (cont)
			cont.RemoveElement(aRes, true);
		this._flushWithDelay();
	},



	getProperty: function SBD_getProperty(aRes, aProp) {
		this._init();
		if (aRes.Value == "urn:scrapbook:root")
			return "";
		try {
			var arc = ScrapBookUtils.RDF.GetResource(ScrapBookUtils.namespace + aProp);
			return this._dataSource.GetTarget(aRes, arc, true).QueryInterface(Ci.nsIRDFLiteral).Value;
		} catch(ex) {
			return "";
		}
	},

	setProperty: function SBD_setProperty(aRes, aProp, newVal) {
		this._init();
		newVal = this.sanitize(newVal);
		aProp = ScrapBookUtils.RDF.GetResource(ScrapBookUtils.namespace + aProp);
		try {
			var oldVal = this._dataSource.GetTarget(aRes, aProp, true);
			oldVal = oldVal.QueryInterface(Ci.nsIRDFLiteral);
			newVal = ScrapBookUtils.RDF.GetLiteral(newVal);
			this._dataSource.Change(aRes, aProp, oldVal, newVal);
			this._flushWithDelay();
		}
		catch (ex) {
		}
	},

	getURL: function SBD_getURL(aRes) {
		this._init();
		var id = aRes.Value.substring(18);
		switch (this.getProperty(aRes, "type")) {
			case "folder"  : return "chrome://scrapbook/content/view.xul?id=" + id;
			case "note"    : return "chrome://scrapbook/content/note.xul?id=" + id;
			case "bookmark": return this.getProperty(aRes, "source");
			default        : return ScrapBookUtils.getBaseHref(this._dataSource.URI) + "data/" + id + "/index.html";
		}
	},

	exists: function SBD_exists(aRes) {
		this._init();
		if (typeof(aRes) == "string") {
			aRes = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + aRes);
		}
		return this._dataSource.ArcLabelsOut(aRes).hasMoreElements();
	},

	isContainer: function SBD_isContainer(aRes) {
		this._init();
		return ScrapBookUtils.RDFCU.IsContainer(this._dataSource, aRes);
	},

	getRelativeIndex: function SBD_getRelativeIndex(aParRes, aRes) {
		this._init();
		return ScrapBookUtils.RDFCU.indexOf(this._dataSource, aParRes, aRes);
	},

	flattenResources: function SBD_flattenResources(aContRes, aRule, aRecursive) {
		this._init();
		var resList = [];
		if (aRule != 2)
			resList.push(aContRes);
		ScrapBookUtils.RDFC.Init(this._dataSource, aContRes);
		var resEnum = ScrapBookUtils.RDFC.GetElements();
		while (resEnum.hasMoreElements()) {
			var res = resEnum.getNext().QueryInterface(Ci.nsIRDFResource);
			if (this.isContainer(res)) {
				if (aRecursive)
					resList = resList.concat(this.flattenResources(res, aRule, aRecursive));
				else if (aRule != 2)
					resList.push(res);
			}
			else {
				if (aRule != 1)
					resList.push(res);
			}
		}
		return resList;
	},

	findParentResource: function SBD_findParentResource(aRes) {
		this._init();
		var resEnum = this._dataSource.GetAllResources();
		while (resEnum.hasMoreElements()) {
			var res = resEnum.getNext().QueryInterface(Ci.nsIRDFResource);
			if (!this.isContainer(res))
				continue;
			if (res.Value == "urn:scrapbook:search")
				continue;
			if (ScrapBookUtils.RDFCU.indexOf(this._dataSource, res, aRes) != -1)
				return res;
		}
		return null;
	},

};




var EXPORTED_SYMBOLS = ["ScrapBookData"];



