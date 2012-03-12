/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is ScrapBook MAF Creator.
 *
 * The Initial Developer of the Original Code is Gary Harris.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *     Gomita <gomita@xuldev.org> (the author of Scrapbook)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


var sbMafService = {
    // Zip constants.
    PR_RDONLY:0x01,
    PR_WRONLY:0x02,
    PR_RDWR:0x04,
    PR_CREATE_FILE:0x08,
    PR_APPEND:0x10,
    PR_TRUNCATE:0x20,
    PR_SYNC:0x40,
    PR_EXCL:0x80,

    entryTitle:"",
    contentDir:null,
    resource:null,
    fileRDF:null,
    dateTime:null,
    zipW:null,

	strings : null,
    oSBTree:null,
    oSBData:null,
    oSBUtils:null,

    exec:function (path, node,mark) {
        let f,result;
        if(mark)
        {
            f = sbCommonUtils.getScrapBookDir();
            f.append("data");
            f.append(node.itemId);
            f.append("index.html");
            this.dateTime = new Date();
        }else
        {
                let des = PlacesUtils.annotations.getItemAnnotation(node.itemId, "bookmarkProperties/description");
                f = sbCommonUtils.getLocalFileFromNativePathOrUrl(des);
                let dateNum = sbCommonUtils.bmsvc.getItemLastModified(node.itemId);
                this.dateTime = new Date(dateNum / 1000);

        }

        if(sbCommonUtils.getType(f)==1)
        {
            let fileOutput = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
            fileOutput.initWithPath(path.path);
            result = this.IsNewFileOrCanOverwrite(path.path, sbCommonUtils.validateFileName(node.title + ".maff"));
            if (!result) {
                sbCommonUtils.log("can't export");
                return false;
            }
            if(result.exists()) result.remove(true);
            f.copyTo(fileOutput, result.leafName);
            return true;
        }

        this.contentDir = f.parent;


        this.entryTitle = node.title;
        if(mark)
        {
            result = path;
            if(path.exists())
                path.remove(true);
        }else
        {
            result = this.IsNewFileOrCanOverwrite(path.path, sbCommonUtils.validateFileName(this.entryTitle + ".maff"));
        }

        if (!result) {
            sbCommonUtils.log("can't export");
            return false;
        }

        try {
            try {
                this.CreateRDF(node);
                this.CreateZip(result);
                this.ZipEntry();
                this.CloseZip();
                if(mark)
                {
                    try
                    {
                        f.parent.remove(true);
                    }catch(e){}
                }
            } catch (e) {
                this.HandleError(e);
            }
            this.ReportCompletion("导出成功");
        } catch (e) {
            return false;
        }

        return true;
    },

    //直接保存
    exec2:function (node) {
        let file = sbCommonUtils.getScrapBookDir();
        file.append("data");

        let file2 = file.clone();
        file2.append(node.itemId);
        this.contentDir = file2;

        this.dateTime = new Date();
        this.entryTitle = node.title;

        file.append(node.itemId+".maff");

        try {
            try {
                this.CreateRDF(node);
                this.CreateZip(file);
                this.ZipEntry();
                this.CloseZip();
                //如果文件夹存在，删除掉
                if(file2.exists())
                    file2.remove(true);

            } catch (e) {
                this.HandleError(e);
            }
        } catch (e) {
            return false;
        }

        return true;
    },



    CreateRDF:function (node) {
        var txtContent = "";
        txtContent += "<?xml version=\"1.0\"?>\n";
        txtContent += "<RDF:RDF xmlns:MAF=\"http://maf.mozdev.org/metadata/rdf#\"\n";
        txtContent += "         xmlns:NC=\"http://home.netscape.com/NC-rdf#\"\n";
        txtContent += "         xmlns:RDF=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">\n";
        txtContent += "  <RDF:Description RDF:about=\"urn:root\">\n";
        txtContent += "    <MAF:originalurl RDF:resource=\"" + sbCommonUtils.formatText(node.uri.toString()) + "\"/>\n";
        txtContent += "    <MAF:title RDF:resource=\"" + sbCommonUtils.formatText(node.title) + "\"/>\n";
        txtContent += "    <MAF:archivetime RDF:resource=\"" + this.dateTime + "\"/>\n";
        txtContent += "    <MAF:indexfilename RDF:resource=\"index.html\"/>\n";
        txtContent += "    <MAF:charset RDF:resource=\"UTF-8\"/>\n";
        txtContent += "  </RDF:Description>\n";
        txtContent += "</RDF:RDF>\n";

        this.fileRDF = this.contentDir.clone();
        this.fileRDF.append("index.rdf");

        sbCommonUtils.writeFile(this.fileRDF, txtContent, "UTF-8");
    },

    CreateZip:function (pathOutput) {
        var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
        this.zipW = new zipWriter();

        this.zipW.open(pathOutput, this.PR_RDWR | this.PR_CREATE_FILE | this.PR_TRUNCATE);
    },

    CloseZip:function () {
        this.zipW.close();
    },

    ZipEntry:function () {
        this.zipW.addEntryDirectory(this.contentDir.leafName, 0, false);
        // Loop through the files in the dir and find the content files.
        var entries = this.contentDir.directoryEntries;
        while (entries.hasMoreElements()) {
            var entry = entries.getNext();
            entry.QueryInterface(Components.interfaces.nsIFile);
            // Skip pre-existing .maffs.
            if (entry.leafName.substr(entry.leafName.lastIndexOf('.'), 5) == ".maff") {
                continue;
            }
            this.zipW.addEntryFile(this.contentDir.leafName + "/" + entry.leafName, Components.interfaces.nsIZipWriter.COMPRESSION_BEST, entry, false);
        }
    },

    PostProcess:function () {
        // Delete rdf file.
        try {
            var fileRdf = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
            fileRdf.initWithPath(this.contentDir.path);
            fileRdf.append("index.rdf");
            fileRdf.remove(false);
        } catch (e) {
            if (e.name == "NS_ERROR_FILE_ACCESS_DENIED") {
                var errorAccess = this.strings.GetStringFromName("errorAccess");
                alert(errorAccess);
            }
            else {
            }
        }
    },

    ReportCompletion:function (label) {
        try {
            document.getElementById("statusbar-display").label = label;
            //在一定时间之后自动消失提示
            setTimeout(function () {
                document.getElementById("statusbar-display").label = "";
            }, 3000);
        } catch (ex) {
        }
    },

    //处理错误
    HandleError:function(e)
    {
        this.ReportCompletion("发生错误");
        sbCommonUtils.log(e);
        throw "stop";
    },

    // Check if the file already exists and, if so, whether to overwrite.
    IsNewFileOrCanOverwrite:function (pathOutput, fileName) {
        var fileOutput = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
        fileOutput.initWithPath(pathOutput);
        fileOutput.append(fileName);
        if (fileOutput.exists()) {
            var promptOverwrite1 = this.strings.GetStringFromName("promptOverwrite1");
            var promptOverwrite2 = this.strings.GetStringFromName("promptOverwrite2");

            var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Components.interfaces.nsIPromptService);
            var check = {value: false};
            var flags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING +
                    prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_CANCEL +
                    prompts.BUTTON_POS_2 * prompts.BUTTON_TITLE_IS_STRING;

            var button = prompts.confirmEx(null, "确认", fileOutput.path + " " + promptOverwrite1,
                    flags, "替换", "", "重命名", null, check);

            if(button==2)
            {
                //rename
                fileOutput.createUnique(0,0644);
                return fileOutput;
            }
            else if(button==0)
            {
            }else if(button==1)
            {
                //cancel
                return false;
            }
        }
        return fileOutput;
    },

//得到保存目录
    getOutputBrowse:function () {
        // Init a file picker and display it.
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, this.strings.GetStringFromName("browseFolder"), nsIFilePicker.modeGetFolder);

        var res = fp.show();
        if (res == nsIFilePicker.returnOK) {
            return fp.file;
        }
    },
    //初始化
    init:function () {
        let strbundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
        sbMafService.strings = strbundle.createBundle("chrome://scrapbook/locale/overlayMaf.properties");
    }
};

window.addEventListener("load", sbMafService.init, true);




