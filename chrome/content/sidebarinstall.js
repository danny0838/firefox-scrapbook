/* Script Source: http://www.mozdev.org/source/browse/cookiebar/src/cookiebar/content/addpanel.js?rev=1.1&content-type=text/x-cvsweb-markup */

const DEBUG = true;
const PANELS_RDF_FILE = "UPnls";
const SIDEBAR_CONTRACTID   = "@mozilla.org/sidebar;1";
const SIDEBAR_CID      = Components.ID("{22117140-9c6e-11d3-aaf1-00805f8a4905}");
const CONTAINER_CONTRACTID = "@mozilla.org/rdf/container;1";
const DIR_SERV_CONTRACTID  = "@mozilla.org/file/directory_service;1"
const STD_URL_CONTRACTID   = "@mozilla.org/network/standard-url;1"
const IO_SERV_CONTRACTID   = "@mozilla.org/network/io-service;1";
const NETSEARCH_CONTRACTID = "@mozilla.org/rdf/datasource;1?name=internetsearch"
const nsIRDFContainer  = Components.interfaces.nsIRDFContainer;
const nsIProperties    = Components.interfaces.nsIProperties;
const nsIFileURL       = Components.interfaces.nsIFileURL;
const nsIRDFRemoteDataSource = Components.interfaces.nsIRDFRemoteDataSource;

function addPanel(aTitle,aContentURL,aCustomizeURL) {
	debug("addPanel() - start");
	var sidebar = new mySidebar();
	sidebar.addPanel(aTitle,aContentURL,aCustomizeURL);
	debug("addPanel() - end");
	return true;
}

function mySidebar() {
	const RDF_CONTRACTID = "@mozilla.org/rdf/rdf-service;1";
	const nsIRDFService = Components.interfaces.nsIRDFService;
	this.rdf = Components.classes[RDF_CONTRACTID].getService(nsIRDFService);
	this.datasource_uri = getSidebarDatasourceURI(PANELS_RDF_FILE);
	debug('datasource_uri is ' + this.datasource_uri);
	this.resource = 'urn:sidebar:current-panel-list';
	this.datasource = this.rdf.GetDataSource(this.datasource_uri);
}

mySidebar.prototype.nc = "http://home.netscape.com/NC-rdf#";

mySidebar.prototype.addPanel = function (aTitle,aContentURL,aCustomizeURL) { 
	debug("addPanel(" + aTitle + ", " + aContentURL + ", " + aCustomizeURL + ")");
	var panel_list = this.datasource.GetTarget(this.rdf.GetResource(this.resource), this.rdf.GetResource(mySidebar.prototype.nc+"panel-list"), true);
	if (panel_list)
		panel_list.QueryInterface(Components.interfaces.nsIRDFResource);
	else
		debug("Sidebar datasource is busted\n");
	var container = Components.classes[CONTAINER_CONTRACTID].createInstance(nsIRDFContainer);
	container.Init(this.datasource, panel_list);
	var panel_resource = this.rdf.GetResource("urn:sidebar:3rdparty-panel:" + aContentURL);
	var panel_index = container.IndexOf(panel_resource);
	if (panel_index != -1) {
		debug("addPanel(): panel already in list");
		return 0;
	}
	this.datasource.Assert(panel_resource, this.rdf.GetResource(this.nc + "title"), this.rdf.GetLiteral(aTitle), true);
	this.datasource.Assert(panel_resource, this.rdf.GetResource(this.nc + "content"), this.rdf.GetLiteral(aContentURL), true);
	if (aCustomizeURL) this.datasource.Assert(panel_resource, this.rdf.GetResource(this.nc + "customize"), this.rdf.GetLiteral(aCustomizeURL), true);        
	container.AppendElement(panel_resource);
	this.datasource.Assert(this.rdf.GetResource(this.resource), this.rdf.GetResource(this.nc + "refresh"), this.rdf.GetLiteral("true"), true);
	this.datasource.Unassert(this.rdf.GetResource(this.resource), this.rdf.GetResource(this.nc + "refresh"), this.rdf.GetLiteral("true"));
	this.datasource.QueryInterface(nsIRDFRemoteDataSource).Flush();
	return 1;
}

var debug;
if (DEBUG)
	debug = function (s) { dump("-*- sidebar component: " + s + "\n"); }
else
	debug = function (s) {}

function getSidebarDatasourceURI(panels_file_id) {
	try {
		var directory_service = Components.classes[DIR_SERV_CONTRACTID].getService();
		if (directory_service)
			directory_service = directory_service.QueryInterface(Components.interfaces.nsIProperties);
		var sidebar_file = directory_service.get(panels_file_id, Components.interfaces.nsIFile);
		if (!sidebar_file.exists()) {
			debug("sidebar file does not exist");
			return null;
		}
		if (Components.classes[IO_SERV_CONTRACTID] && Components.interfaces.nsIIOService) { 
			var io_service = Components.classes[IO_SERV_CONTRACTID].getService(Components.interfaces.nsIIOService);
			var file_handler = io_service.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
			if (file_handler.getURLSpecFromFile) {
				var sidebar_uri = file_handler.getURLSpecFromFile(sidebar_file);
				return sidebar_uri;
			}
		}
		var file_url = Components.classes[STD_URL_CONTRACTID].createInstance(Components.interfaces.nsIFileURL);
		file_url.file = sidebar_file;
		debug("sidebar uri is " + file_url.spec);
		return file_url.spec;
	} catch (ex) {
		debug("caught " + ex + " getting sidebar datasource uri");
		return null;
	}
}

