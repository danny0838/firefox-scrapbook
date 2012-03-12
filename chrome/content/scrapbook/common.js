
const NS_SCRAPBOOK = "http://amb.vis.ne.jp/mozilla/scrapbook-rdf#";

function ScrapBookItem(aID)
{
	this.id      = aID;
	this.type    = "";
	this.title   = "";
	this.chars   = "";
	this.icon    = "";
	this.source  = "";
	this.comment = "";
}


var sbCommonUtils = {
    $del:10408,
    $done:10406,
    bmsvc: Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
        .getService(Components.interfaces.nsINavBookmarksService),


	get RDF()     { return Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(Components.interfaces.nsIRDFService); },
	get RDFC()    { return Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer); },
	get RDFCU()   { return Components.classes['@mozilla.org/rdf/container-utils;1'].getService(Components.interfaces.nsIRDFContainerUtils); },
	get DIR()     { return Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties); },
	get IO()      { return Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService); },
	get UNICODE() { return Components.classes['@mozilla.org/intl/scriptableunicodeconverter'].getService(Components.interfaces.nsIScriptableUnicodeConverter); },
	get WINDOW()  { return Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator); },
	get PROMPT()  { return Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService); },
	get PREF()    { return Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch); },



	newItem : function(aID)
	{
		return { id : aID || "", type : "", title : "", chars : "", icon : "", source : "", comment : "" };
	},

	getScrapBookDir : function()
	{
		var dir;
		try {
			var isDefault = this.PREF.getBoolPref("scrapbook.data.default");
			dir = this.PREF.getComplexValue("scrapbook.data.path", Components.interfaces.nsIPrefLocalizedString).data;
			dir = this.convertPathToFile(dir);
		} catch(ex) {
			isDefault = true;
		}
		if ( isDefault )
		{
			dir = this.DIR.get("ProfD", Components.interfaces.nsIFile);
			dir.append("ScrapBookStorage");
		}
		if ( !dir.exists() )
		{
			dir.create(dir.DIRECTORY_TYPE, 0700);
		}
		return dir;
	},

	getContentDir : function(aID, aSuppressCreate)
	{
        //slimx edit ����Ŀ¼����֤��ʽ,��Ϊ�����˺���,���Գ��ȾͲ���14��,��17
		if ( !aID)
		{
			alert("ScrapBook FATAL ERROR: Failed to get directory '" + aID + "'.");
			return null;
		}
		var dir = this.getScrapBookDir().clone();
		dir.append("data");
		if ( !dir.exists() ) dir.create(dir.DIRECTORY_TYPE, 0700);
		dir.append(aID);
		if ( !dir.exists() )
		{
			if ( aSuppressCreate )
			{
				return null;
			}
			dir.create(dir.DIRECTORY_TYPE, 0700);
		}
		return dir;
	},

	removeDirSafety : function(aDir, check)
	{
		var file;
		try {
			if ( check && !aDir.leafName.match(/^\d{14}$/) ) return;
			var fileEnum = aDir.directoryEntries;
			while ( fileEnum.hasMoreElements() )
			{
				file = fileEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
				if ( file.isFile() ) file.remove(false);
			}
			file = aDir;
			if ( aDir.isDirectory() ) aDir.remove(false);
			return true;
		} catch(ex) {
			alert("ScrapBook ERROR: Failed to remove file '" + file.leafName + "'.\n" + ex);
			return false;
		}
	},

	loadURL : function(aURL, tabbed)
	{
		var win = this.WINDOW.getMostRecentWindow("navigator:browser");
		if ( !win ) return;
		var browser = win.document.getElementById("content");
		if ( tabbed ) {
			browser.selectedTab = browser.addTab(aURL);
		} else {
			browser.loadURI(aURL);
		}
	},

	getTimeStamp : function(advance)
	{
		var dd = new Date;
		if ( advance ) dd.setTime(dd.getTime() + 1000 * advance);
		var y = dd.getFullYear();
		var m = dd.getMonth() + 1; if ( m < 10 ) m = "0" + m;
		var d = dd.getDate();      if ( d < 10 ) d = "0" + d;
		var h = dd.getHours();     if ( h < 10 ) h = "0" + h;
		var i = dd.getMinutes();   if ( i < 10 ) i = "0" + i;
		var s = dd.getSeconds();   if ( s < 10 ) s = "0" + s;
        //slimx edit �޸���ʱ��,�����˺���,��Ϊ�����̫����...
        //if(sbCommonUtils.PREF.getBoolPref("scrapbook.save2zotero"))
        //{
        //var ms = Math.floor(dd.getMilliseconds()/10);
        //ms = ms<10?"0"+ms:ms;
                   var ms = dd.getMilliseconds();
                   if(ms<10)ms="00"+ms;
                   else if(ms<100)ms="0"+ms;
		return y.toString() + m.toString() + d.toString() + h.toString() + i.toString() + s.toString()+ms.toString();
        //}else return y.toString() + m.toString() + d.toString() + h.toString() + i.toString() + s.toString();


	},

	getRootHref : function(aURLSpec)
	{
		var url = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
		url.spec = aURLSpec;
		return url.scheme + "://" + url.host + "/";
	},

	getBaseHref : function(sURI)
	{
		var pos, base;
		base = ( (pos = sURI.indexOf("?")) != -1 ) ? sURI.substring(0, pos) : sURI;
		base = ( (pos = base.indexOf("#")) != -1 ) ? base.substring(0, pos) : base;
		base = ( (pos = base.lastIndexOf("/")) != -1 ) ? base.substring(0, ++pos) : base;
		return base;
	},

	getFileName : function(aURI)
	{
		var pos, name;
		name = ( (pos = aURI.indexOf("?")) != -1 ) ? aURI.substring(0, pos) : aURI;
		name = ( (pos = name.indexOf("#")) != -1 ) ? name.substring(0, pos) : name;
		name = ( (pos = name.lastIndexOf("/")) != -1 ) ? name.substring(++pos) : name;
		return name;
	},

	splitFileName : function(aFileName)
	{
		var pos = aFileName.lastIndexOf(".");
		var ret = [];
		if ( pos != -1 ) {
			ret[0] = aFileName.substring(0, pos);
			ret[1] = aFileName.substring(pos + 1, aFileName.length);
		} else {
			ret[0] = aFileName;
			ret[1] = "";
		}
		return ret;
	},

	validateFileName : function(aFileName)
	{
		aFileName = aFileName.replace(/[\"\?!~`]+/g, "");
		aFileName = aFileName.replace(/[\*\&]+/g, "+");
		aFileName = aFileName.replace(/[\\\/\|\:;]+/g, "-");
		aFileName = aFileName.replace(/[\<]+/g, "(");
		aFileName = aFileName.replace(/[\>]+/g, ")");
		aFileName = aFileName.replace(/[\s]+/g, "_");
		aFileName = aFileName.replace(/[%]+/g, "@");
		return aFileName;
	},

	resolveURL : function(aBaseURL, aRelURL)
	{
		try {
			var baseURLObj = this.convertURLToObject(aBaseURL);
			return baseURLObj.resolve(aRelURL);
		} catch(ex) {
			dump("*** ScrapBook ERROR: Failed to resolve URL: " + aBaseURL + "\t" + aRelURL + "\n");
		}
	},

	crop : function(aString, aMaxLength)
	{
		return aString.length > aMaxLength ? aString.substring(0, aMaxLength) + "..." : aString;
	},



	readFile : function(aFile)
	{
		try {
			var istream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
			istream.init(aFile, 1, 0, false);
			var sstream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
			sstream.init(istream);
			var content = sstream.read(sstream.available());
			sstream.close();
			istream.close();
			return content;
		}
		catch(ex)
		{
			return false;
		}
	},

	writeFile : function(aFile, aContent, aChars,append)
	{
		if (aFile.exists() ) aFile.remove(false);
		try {
			aFile.create(aFile.NORMAL_FILE_TYPE, 0666);
			this.UNICODE.charset = aChars;
			aContent = this.UNICODE.ConvertFromUnicode(aContent);
			var ostream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
			ostream.init(aFile, 2, 0x200, false);
			ostream.write(aContent, aContent.length);
			ostream.close();
		}
		catch(ex)
		{
			alert("ScrapBook ERROR: Failed to write file: " + aFile.leafName);
		}
	},
    writeFile2:function(aFile, aContent, aChars)
    {
		try {
			this.UNICODE.charset = aChars;
			aContent = this.UNICODE.ConvertFromUnicode(aContent);
			var ostream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
			ostream.init(aFile, 0x02 | 0x10 | 0x08, 0664,0);
			ostream.write(aContent, aContent.length);
			ostream.close();
		}
		catch(ex)
		{
            alert(ex)
			alert("ScrapBook ERROR: Failed to write file: " + aFile.leafName);
		}
    },

	writeIndexDat : function(aItem, aFile)
	{
		if ( !aFile )
		{
			aFile = this.getContentDir(aItem.id).clone();
			aFile.append("index.dat");
		}
		var content = "";
		for ( var prop in aItem )
		{
			content += prop + "\t" + aItem[prop] + "\n";
		}
		this.writeFile(aFile, content, "UTF-8");
	},
    /**
     * ���浽acdsee��ݿ����Ϣ
     * @param item
     */
    writeAcdsee:function(item)
    {
        var file=this.getContentDir(item.id).clone();
        //var isMaff = this.PREF.getBoolPref("scrapbook.acdsee.isMaff");
        //if(isMaff)
        // file.append(item.id+".maff.xmp");
        //else
        file.append("index.html.xmp");
        var content='<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Public XMP Toolkit Core 3.5"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:acdsee="http://ns.acdsee.com/iptc/1.0/"><acdsee:categories/><acdsee:tagged>False</acdsee:tagged>'
 +'<acdsee:notes><![CDATA['+item.source+']]></acdsee:notes>'
 +'<acdsee:author><![CDATA['+this.getSite(item.source)+']]></acdsee:author>'
 +'<acdsee:datetime>'+this.formatID2Date(item.id)+'</acdsee:datetime>'
 +'<acdsee:caption><![CDATA['+item.title+']]></acdsee:caption>'
 +'</rdf:Description></rdf:RDF></x:xmpmeta>';
        this.writeFile(file,content,"UTF-8");

    },
    //����һ���򵥵��ض���html,�Ͳ�����ȥ�ļ�����Ѿ�������,������ʾ��������,�ƺ���û���õ����
    $writeHtml:function(item)
    {
        var file = this.getScrapBookDir().clone();
        //in�ļ���,���done��wait��ʱ��ֻ�ƶ�"�����ļ�",���ƶ����ݵ��ļ���.
        // ɾ��Ҳֻ���ƶ���delĿ¼����.ֻ��Ҫ��ʱ����Ŀ¼�Ϳ�����.
		file.append("in");//wait,done,del
        file.append(item.title.slice(0,100)+".html");
        var content='<meta content="0;url=../data/'+item.id+'/index.html" http-equiv="Refresh">';
        this.writeFile(file,content,"UTF-8");
    },

    //�����ı䷽ʽ,���浽��ǩ����
    writeHtml:function(item,node)
    {
        //�ֶ�����һ��Ŀ¼,�鵽Ŀ¼��id,10375,guid:zOWTpQxR5vO
        //����ǩ���浽���Ŀ¼
        //����Ҳֻ�����Լ�����,�̶���Ҳû��ʲô����,·��,�ļ��е�idʲô��.

        let file = this.getScrapBookDir();
        file.append("data");

        if(sbCommonUtils.PREF.getIntPref("scrapbook.save.format")==1)
        {
            //maf
            file.append(item.id+".maff");
        }else
        {
            //html
            file.append(item.id);
            file.append("index.html");
        }
        let path = this.IO.newFileURI(file).spec;

        Components.utils.import("resource:///modules/PlacesUtils.jsm");
        let annoObj = { name: "bookmarkProperties/description",type: 3,flags: 0,value:path ,expires: 4 };
        //aURI, aContainer, aIndex, aTitle, aKeyword,aAnnotations, aChildTransactions
        if(node)
        {
            if(node.itemId)
            {
                //������ǩ
                let _localUri = PlacesUtils.annotations.getItemAnnotation(node.itemId, "bookmarkProperties/description");
                let _file = sbCommonUtils.convertURLToFile(_localUri);
                //del
                if (_file.exists()) {
                    if (sbCommonUtils.getType(_file) == 0)
                        _file.parent.remove(true);
                    else _file.remove(true);
                }

                let tx = new PlacesSetItemAnnotationTransaction(node.itemId, annoObj);//����
                tx.doTransaction();
            }
            else if(node.parentId)
            {
                //todo ָ����ǩλ�õ��½�
                let tx = new PlacesCreateBookmarkTransaction(this.url(item.source),node.parentId,0,item.title,undefined,[annoObj],undefined);
                tx.doTransaction();
            }
            else if(node.saveAsMht)
            {
                //todo?


            }
        }else
        {
            let tx = new PlacesCreateBookmarkTransaction(this.url(item.source),Application.storage.get("sb@in",-1),0,item.title,undefined,[annoObj],undefined);
            tx.doTransaction();
        }

    },
    //����ǩ��tag,ʹ�õ��������sbCommonUtils.tagItem(undefined,"@done"),���Ҳû���õ�,��Ϊʵ����˵,û�����ļ������ķ���
    $tagItem:function(uri,tag)
    {
        
        var taggingSvc = Components.classes["@mozilla.org/browser/tagging-service;1"]
                .getService(Components.interfaces.nsITaggingService);
        if(uri)
        {
        //�����Ҫ��tag
        taggingSvc.tagURI(uri, ["@.in"]);
        }else
        {
            //����Ǵ�ҳ����������
            //��ַ��ҳ��ĵ�ַ
            uri = this.url(content.document.location.href);
            //��֮ǰ���ܵĶ�ɾ���
            taggingSvc.untagURI(uri,["@.in","@.wait","@.done","@.del"]);
            //�����Ҫ��tag
            taggingSvc.tagURI(uri,[tag]);
        }
    },
    moveItem:function(id)
    {
        var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
                      .getService(Components.interfaces.nsINavBookmarksService);

        var uri = this.url(content.document.location.href);
        var bookmarksArray = bmsvc.getBookmarkIdsForURI(uri, {});
//        alert(bookmarksArray.length);
        bmsvc.moveItem(bookmarksArray[0],id,0);
    },
    //��Ҫ����ǩɾ��,ҲҪ����ɾ��
    removeItems:function(id)
    {
       id = id||this.$del;
        //����ɾ��
       var children = Application.bookmarks.menu.children;
       var content="";
        //
        for(var i=0;i<children.length;i++)
        {
            if(children[i].title=="scrapbook")
            {
                var children2 = children[i].children;
                for(var j=0;j<children2.length;j++)
                {
                    if(children2[j].id==id)
                    {
                        var children3 = children2[j].children;
                        for(var l=0;l<children3.length;l++)
                        {
                            var path = children3[l].uri.spec;
                            var _text = path.replace("file:///","").replace("/index.html","");
                            content+="rd /q /s \""+_text+"\"\r\n";
                        }
                    }
                }
            }
        }
        //
        this.excuteBat("del",content);
        //����ǩɾ��
        var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
                      .getService(Components.interfaces.nsINavBookmarksService);
        bmsvc.removeFolderChildren(id);//���Ŀ¼
    },


    
    //������acdsee���Ŀ¼,����Ϊmaff�ļ�,����ѡ,ֻ����ȫ����.��ʱֻ��doneĿ¼�µ������ļ�.
    //Ч�ʺܲ�,��������sql,�������Ҳ��ֻ����ʱ������.
    exportItems:function()
    {
     var children = Application.bookmarks.menu.children;
     var content="";
        //����content������
        for(var i=0;i<children.length;i++)
        {
            if(children[i].title=="scrapbook")
            {
                var children2 = children[i].children;
                for(var j=0;j<children2.length;j++)
                {
                    if(children2[j].title=="@done")
                    {
                        var children3 = children2[j].children;
                        for(var l=0;l<children3.length;l++)
                        {
                           var url = children3[l].uri.spec;
                           var array = url.split("/");
                           var name = array[array.length-1-1];
                            //��7zѹ��,���浽ָ����λ��,����xmp�ļ����Ƶ���maffͬ����Ŀ¼.
                           content += '"E:/Program Files/7-Zip/7z.exe" a -tzip E:/indexed/temp/'+name+'.maff E:/indexed/zotero/data/'+name+'/\r\n'
                            +'copy E:\\indexed\\zotero\\data\\'+name+'\\index.html.xmp E:\\indexed\\temp\\'+name+'.maff.xmp\r\n'
                            +'rd /q /s \"E:\\indexed\\zotero\\data\\'+name+'\"\r\n';
                        }
                    }
                }
            }
        }
        //���bat�ļ���ִ��,������localfile,fileû��launch������
        this.excuteBat("export",content);
        //����ǩɾ��
        var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
                      .getService(Components.interfaces.nsINavBookmarksService);
        bmsvc.removeFolderChildren(this.$done);
    },

    //����һ��index�ļ�,���Ķ�������,���ܻ�ŵ���������?
    exportForReading:function()
    {
        this._exportForReading("@in");
        this._exportForReading("@wait");
        this._exportForReading("@done");
    },
    _exportForReading:function(folder)
    {
        var children = Application.bookmarks.menu.children;
        var content="";
        //����content������
        for(var i=0;i<children.length;i++)
        {
            if(children[i].title=="scrapbook")
            {
                var children2 = children[i].children;
                for(var j=0;j<children2.length;j++)
                {
                    if(children2[j].title==folder)
                    {
                        var children3 = children2[j].children;
                        for(var l=0;l<children3.length;l++)
                        {
                           var url = children3[l].uri.spec;
                           var array = url.split("/");
                           var name = array[array.length-1-1];
                           //·��,����
                           content += '<div><a href="'+name+'/index.html">'+children3[l].title+'</a></div>';
                        }
                    }
                }
            }
        }
        var file = this.getScrapBookDir().clone();
        file.append(folder+".html");
        this.writeFile(file, content, "UTF-8");
    },


    unpackMaff:function() {
        
        Components.utils.import("resource://gre/modules/NetUtil.jsm");
        var file = this.getScrapBookDir().clone();
        file.append("temp");
        var entries = file.directoryEntries;

        //��ȡmeta�ļ�����Ϣ
        var index = this.getScrapBookDir().clone();
        index.append("temp");
        let folder = index.clone();
        index.append("index.html");
        if(index.exists()) index.remove(false);
        let exportTemp = "";
        while (entries.hasMoreElements()) {
            var entry = entries.getNext();
            entry.QueryInterface(Components.interfaces.nsIFile);
            if(entry.isFile() && entry.leafName.search(".xmp")>-1)
            {
                this._exportInfo(entry,index);//
            }
        }

        //��ѹ��
        this.execProgram("e:\\indexed\\zotero\\temp\\do.bat",undefined,true);
    },
    
    _exportInfo:function(file,index)
    {
        NetUtil.asyncFetch(file, function(inputStream, status) {
            if (!Components.isSuccessCode(status)) {
                return;
            }
            var str = NetUtil.readInputStreamToString(inputStream, inputStream.available(), {charset:"utf-8"});
            str.match(/<content>(.*)<\/content>/);
            let title = RegExp.$1;
            let content =  "<div><a href='"+file.leafName.replace(/\.xmp$/,'')+"/index.htm'> "+title+"</a></div>";
            sbCommonUtils.writeFile2(index, content, "UTF-8");
        });
    },


    //����bat�ļ�,��ִ��
    excuteBat:function(name,content)
    {
        var file = Components.classes["@mozilla.org/file/local;1"].
                     createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath("C:\\temp\\"+name+".bat");
        this.writeFile(file,content,"UTF-8");
        file.launch();
    },

    //�õ�uri
    url:function(spec) {
        var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        return ios.newURI(spec, null, null);
    },

    getSite:function(aRes)
    {
        var site = '';
        site = aRes.split("/")[2];
        if (site == '')
            site = 'local file'
        return site;
    },
    formatID2Date : function(aID)
    {
        //slimx edit �޸�ת�����ڤ��趨
        aID.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
        try
        {
            return [RegExp.$1, RegExp.$2, RegExp.$3].join("-") + "T" + [RegExp.$4, RegExp.$5, RegExp.$6].join(":");
        }
        catch(ex)
        {
        }
    },

	saveTemplateFile : function(aURISpec, aFile)
	{
		if ( aFile.exists() ) return;
		var uri = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
		uri.spec = aURISpec;
		var WBP = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);
		WBP.saveURI(uri, null, null, null, null, aFile);
	},

	convertToUnicode : function(aString, aCharset)
	{
		if ( !aString ) return "";
		try {
			this.UNICODE.charset = aCharset;
			aString = this.UNICODE.ConvertToUnicode(aString);
		} catch(ex) {
		}
		return aString;
	},



	convertPathToFile : function(aPath)
	{
		var aFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		aFile.initWithPath(aPath);
		return aFile;
	},

	convertFilePathToURL : function(aFilePath)
	{
		var tmpFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		tmpFile.initWithPath(aFilePath);
		return this.IO.newFileURI(tmpFile).spec;
	},

	convertURLToObject : function(aURLString)
	{
		var aURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
		aURL.spec = aURLString;
		return aURL;
	},

	convertURLToFile : function(aURLString)
	{
		var aURL = this.convertURLToObject(aURLString);
		if ( !aURL.schemeIs("file") ) return;
		try {
			var fileHandler = this.IO.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
			return fileHandler.getFileFromURLSpec(aURLString);
		} catch(ex) {
		}
	},

	execProgram : function(aExecFilePath, args,launch)
	{
		var execfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		var process  = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
		try {
			execfile.initWithPath(aExecFilePath);
			if ( !execfile.exists() ) {
				alert("ScrapBook ERROR: File does not exist.\n" + aExecFilePath);
				return;
			}
            if(launch)
            {
                execfile.launch();
            }else
            {
			process.init(execfile);
			process.run(false, args, args.length);
            }
		} catch (ex) {
			alert("ScrapBook ERROR: File is not executable.\n" + aExecFilePath);
		}
	},

	getFocusedWindow : function()
	{
		var win = document.commandDispatcher.focusedWindow;
		if ( !win || win == window || win instanceof Components.interfaces.nsIDOMChromeWindow ) win = window.content;
		return win;
	},

	getDefaultIcon : function(type)
	{
		switch ( type )
		{
			case "folder" : return "chrome://scrapbook/skin/treefolder.png"; break;
			case "note"   : return "chrome://scrapbook/skin/treenote.png";   break;
			default       : return "chrome://scrapbook/skin/treeitem.png";   break;
		}
	},

	getBoolPref : function(aName, aDefVal)
	{
		try {
			return this.PREF.getBoolPref(aName);
		}
		catch(ex) {
			return aDefVal;
		}
	},

	setBoolPref: function(aPrefName, aPrefValue)
	{
		try {
			this.PREF.setBoolPref(aPrefName, aPrefValue);
		}
		catch (ex) {}
	},

	setUnicharPref: function (aPrefName, aPrefValue)
	{
		try {
			var str = Components.classes["@mozilla.org/supports-string;1"]
			          .createInstance(Components.interfaces.nsISupportsString);
			str.data = aPrefValue;
			this.PREF.setComplexValue(aPrefName, Components.interfaces.nsISupportsString, str);
		}
		catch (ex) {}
	},

	copyUnicharPref: function (aPrefName, aDefVal)
	{
		try {
			return this.PREF.getComplexValue(aPrefName, Components.interfaces.nsISupportsString).data;
		}
		catch (ex) {
			return aDefVal != undefined ? aDefVal : null;
		}
	},

	escapeComment : function(aStr)
	{
		if ( aStr.length > 10000 ) alert("NOTICE: Too long comment makes ScrapBook slow.");
		return aStr.replace(/\r|\n|\t/g, " __BR__ ");
	},

	openManageWindow : function(aRes, aModEltID)
	{
		window.openDialog("chrome://scrapbook/content/manage.xul", "ScrapBook:Manage", "chrome,centerscreen,all,resizable,dialog=no", aRes, aModEltID);
	},

	log : function(aMsg, aOpen)
	{
		const CONSOLE = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
		CONSOLE.logStringMessage(aMsg);
	},

    //�����ǩ�Ƿ�λ��scrapbookĿ¼
    inScrapbook:function(id)
    {
        var result = this._checkParent(id);
        return result;


    },
    _checkParent:function(id)
    {
        //�����쳣��
        try{
        var parentFolderId = this.bmsvc.getFolderIdForItem(id);
        }catch(ex)
        {
            return;
        }
        //sbCommonUtils.log(parentFolderId+":"+this.$root)
        if (parentFolderId == Application.storage.get("sb@root",-1)) return true;
        else
        {
            return this._checkParent(parentFolderId);
        }
    },


    //�ж�Ŀ¼�Ƿ����
    checkContainerExist:function()
    {
        let titleRoot = "Scrapbook Storage";
        let titleIn = "@in";
        let root = Application.bookmarks.menu;
        let children = root.children;

        let rootId=0,inId = 0;
        aLoop:
        for each(let i in children)
        {
            if(i.title==titleRoot)
            {
                rootId = i.id;
                let children2 = i.children;
                for each(let j in children2)
                {
                    if(j.title==titleIn)
                    {
                        inId = j.id;
                        break aLoop;
                    }
                }
                if(inId==0) inId  = this.bmsvc.createFolder(rootId,titleIn,0);
                break aLoop;
            }
        }
        if(rootId==0)
        {
            rootId = this.bmsvc.createFolder(root.id,titleRoot,0);
            inId  = this.bmsvc.createFolder(rootId,titleIn,0);
        }
        Application.storage.set("sb@root",rootId);
        Application.storage.set("sb@in",inId);
        sbCommonUtils.log(inId);
    },
    //todo �ų�հ�ҳ��
    getTabSize:function()
    {
        var nodes = gBrowser.mTabContainer.childNodes;
        let length = nodes.length;
        for (var i = 0; i < length; i++) {
            if (nodes[i].getAttribute('tabProtect') || nodes[i].getAttribute("pinned")) {
                length--;
            }
        }
        return length;
    },

    //ͨ��ǰ��url�õ���ǩ��id
    getBookmarkId:function(url)
    {
        let regexp = /\/(\d*)\/index.html$/;
        regexp.exec(url);
        let itemId = RegExp.$1;
        let id = 0;
        if(itemId!="") id = Application.storage.get("sbBookmark"+itemId,0);
        return id;
    },
    //����ǩ�ͱ��ص�ַ���浽storage
    saveBookmarkInfo:function(url,id)
    {
        let regexp = /\/(\d*)\/index.html$/;
        regexp.exec(url);
        let itemId = RegExp.$1;
        Application.storage.set("sbBookmark"+itemId,id);
    },

     getLocalFileFromNativePathOrUrl:function(aPathOrUrl)
    {
      if (aPathOrUrl.substring(0,7) == "file://") {
        // if this is a URL, get the file from that
        let ioSvc = Cc["@mozilla.org/network/io-service;1"].
                    getService(Ci.nsIIOService);

        // XXX it's possible that using a null char-set here is bad
        const fileUrl = ioSvc.newURI(aPathOrUrl, null, null).
                        QueryInterface(Ci.nsIFileURL);
        return fileUrl.file.clone().QueryInterface(Ci.nsILocalFile);
      } else {
        // if it's a pathname, create the nsILocalFile directly
        var f = new nsLocalFile(aPathOrUrl);

        return f;
      }
    },

    openParent:function(f) {
        try {
            // Show the directory containing the file and select the file
            f.reveal();
        } catch (e) {
            // If reveal fails for some reason (e.g., it's not implemented on unix or
            // the file doesn't exist), try using the parent if we have it.
            let parent = f.parent.QueryInterface(Ci.nsILocalFile);
            if (!parent)
                return;
            try {
                // "Double click" the parent directory to show where the file should be
                parent.launch();
            } catch (e) {
                // If launch also fails (probably because it's not implemented), let the
                // OS handler try to open the parent
                this.openExternal(parent);
            }
        }
    },

    openExternal:function(aFile) {
        var uri = Cc["@mozilla.org/network/io-service;1"].
                getService(Ci.nsIIOService).newFileURI(aFile);

        var protocolSvc = Cc["@mozilla.org/uriloader/external-protocol-service;1"].
                getService(Ci.nsIExternalProtocolService);
        protocolSvc.loadUrl(uri);
        return;
    },

    //0��html��1��maff
    getType:function(file)
    {
        if (file.leafName.search(/\.html$/) > -1)
        return 0;
        else if (file.leafName.search(/\.maff$/) > -1)
        return 1;
    },

    //xml里面必须要做实体换转
    formatText:function(txt)
    {
        return txt.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

}




function dumpObj(aObj, aLimit)
{
	dump("\n\n----------------[DUMP_OBJECT]----------------\n\n");
	for ( var i in aObj )
	{
		try {
			dump(i + (aLimit ? "" : " -> " + aObj[i]) + "\n");
		} catch(ex) {
			dump("XXXXXXXXXX ERROR XXXXXXXXXX\n" + ex + "\n");
		}
	}
	dump("\n\n");
}

//�Ҽ�˵�
var sbContext = {
    //ֱ�Ӵ�ԭ��������
    openDirect2:function(event)
    {
        let ct = document.getElementById("placesContext");
        let aNodes = ct._view.selectedNodes;
        let window = PlacesUIUtils._getWindow(ct._view);
        let urlsToOpen = [];
        for (var i = 0; i < aNodes.length; i++) {
            if (PlacesUtils.nodeIsURI(aNodes[i]))
                urlsToOpen.push({uri: aNodes[i].uri, isBookmark: PlacesUtils.nodeIsBookmark(aNodes[i])});
        }
        PlacesUIUtils._openTabset(urlsToOpen, event, window);
    },
    //todo
    reSave:function()
    {

        let ct = document.getElementById("placesContext");
        let aNodes = ct._view.selectedNodes;
        let node = aNodes[0];
        if (PlacesUtils.nodeIsURI(node))
        {

            linkURL = node.uri;
            window.openDialog(
                    "chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
                    [linkURL], document.popupNode.ownerDocument.location.href, false, 'urn:scrapbook:root', 0, null, null, null, null, node
            );
            //sbBrowserOverlay.execCaptureTarget(false,'urn:scrapbook:root',node);

        }

    },
    openFile:function()
    {
        let ct = document.getElementById("placesContext");
        let aNodes = ct._view.selectedNodes;
        for (var i = 0; i < aNodes.length; i++) {
            if (PlacesUtils.nodeIsURI(aNodes[i]))
            {
                let des = PlacesUtils.annotations.getItemAnnotation(aNodes[i].itemId, "bookmarkProperties/description");
                let f = sbCommonUtils.getLocalFileFromNativePathOrUrl(des);
                sbCommonUtils.openParent(f);
            }
        }
    },
    //one file
    exportMaf:function()
    {
        let path = sbMafService.getOutputBrowse();
        if (path) {
            let ct = document.getElementById("placesContext");
            let aNodes = ct._view.selectedNodes;
            for (var i = 0; i < aNodes.length; i++) {
                if (PlacesUtils.nodeIsURI(aNodes[i])) {
                    sbMafService.exec(path,aNodes[i]);
                }
            }
        }
    },
    exportMht:function () {

        let path = sbMafService.getOutputBrowse();
        if (path) {
            let ct = document.getElementById("placesContext");
            let aNodes = ct._view.selectedNodes;

            for (var i = 0; i < aNodes.length; i++) {
                if (PlacesUtils.nodeIsURI(aNodes[i])) {
                    //
                    sbMhtService.convertTimer(path,aNodes[i]);

                }
            }

        }
    },
    saveAsMht:function()
    {
        //file dialog
        let path = this.getOutputBrowse("mht");
        if(!path) return;
        if(path.leafName.search(/\.mht$/)>-1)
            sbBrowserOverlay.execCapture(2, false, false,'urn:scrapbook:root',{saveAsMht:path});
        else
            sbBrowserOverlay.execCapture(2, false, false,'urn:scrapbook:root',{saveAsMaf:path});

    },


    getOutputBrowse:function (fileExtension) {
        // Init a file picker and display it.
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, sbMafService.strings.GetStringFromName("browseFolder"), nsIFilePicker.modeSave);
        fp.appendFilter("MHT","*.mht;*.mhtml");
        fp.appendFilter("MAFF","*.maff");
        fp.appendFilters(nsIFilePicker.filterAll);
        fp.defaultExtension = fileExtension;
        try{
            fp.defaultString = sbCommonUtils.validateFileName(content.document.title);
        }catch(e){
            //todo
        }

        var res = fp.show();
        if (res == nsIFilePicker.returnOK || res==nsIFilePicker.returnReplace) {
            return fp.file;
        }
    }
}

