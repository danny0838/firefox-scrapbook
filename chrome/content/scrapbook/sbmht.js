var sbMhtService = {
    //3
    convertFile:function (mhtFile, targetFiles, subject, dirname,indexURL) {
        var fstream = Components.classes ["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
        try {
            fstream.init(mhtFile, 0x02 | 0x08 | 0x20, 0664, 0);
        } catch (e) {
            ScrapBookUtils.log(e)
            return false;
        }

        converter = Components.classes ["@mozilla.org/intl/scriptableunicodeconverter"].getService(Components.interfaces.nsIScriptableUnicodeConverter);

        converter.charset = "iso-2022-jp";
        subject = converter.ConvertFromUnicode(subject);
        //todo
        /* ヘッダに必要な情報を設定する utf-8 Q*/
        subject = "=?iso-2022-jp?B?" + btoa(subject) + "?=";
        var boundary = "----=_NextPart_000_0000_";
        var hex = [
            "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"
        ];
        for (var i = 0; i < 8; i++) {
            boundary += hex [parseInt(Math.random() * 15)];
        }
        boundary += ".";
        for (var i = 0; i < 8; i++) {
            boundary += hex [parseInt(Math.random() * 15)];
        }
        var date = (new Date()).toString().replace(/^([A-Za-z]{3}) /, "$1, ").replace(/ \(.*\)$/, "");

        var data = "";

        /* 全体のヘッダ */
        data = "From: <Saved by UnMHT>\r\n" + "Subject: " + subject + "\r\n" + "Date: " + date + "\r\n" + "MIME-Version: 1.0\r\n" + "Content-Type: multipart/related;\r\n" + "\tboundary=\"" + boundary + "\";\r\n" + "\ttype=\"text/html\"\r\n" + "\r\n";

        fstream.write(data, data.length);

        for (var i = 0; i < targetFiles.length; i++) {
            var file = targetFiles [i];

            data = "--" + boundary + "\r\n";
            fstream.write(data, data.length);

            var filetype = "";

            if (file.leafName.match(/\.[sx]?html?(\?.+)?(#.+)?$/i)) {
                filetype = "text/html";
            } else if (file.leafName.match(/\.css(\?.+)?$/i)) {
                filetype = "text/css";
            } else if (file.leafName.match(/\.mht(ml)?(\?.+)?$/i)) {
                filetype = "message/rfc822";
            } else if (file.leafName.match(/\.eml(\?.+)?$/i)) {
                filetype = "message/rfc822";
            } else if (file.leafName.match(/\.js(\?.+)?$/i)) {
                filetype = "text/javascript";
            } else if (file.leafName.match(/\.txt(\?.+)?$/i)) {
                filetype = "text/plain";
            } else if (file.leafName.match(/\.jpe?g(\?.+)?$/i)) {
                filetype = "image/jpeg";
            } else if (file.leafName.match(/\.gif(\?.+)?$/i)) {
                filetype = "image/gif";
            } else if (file.leafName.match(/\.png(\?.+)?$/i)) {
                filetype = "image/png";
            } else if (file.leafName.match(/\.bmp(\?.+)?$/i)) {
                filetype = "image/bmp";
            } else if (file.leafName.match(/\.ico(\?.+)?$/i)) {
                filetype = "image/x-icon";
            } else if (file.leafName.match(/\.svg(\?.+)?$/i)) {
                filetype = "image/svg+xml";
            } else if (file.leafName.match(/\.swf(\?.+)?$/i)) {
                filetype = "application/swf";
            } else if (file.leafName.match(/\.jar(\?.+)?$/i)) {
                filetype = "application/java-archive";
            } else if (file.leafName.match(/\.class(\?.+)?$/i)) {
                filetype = "application/octet-stream";
            } else if (file.leafName.match(/\.([A-Za-z0-9])(\?.*)?$/i)) {
                var ext = RegExp.$1;
                var mime = Components.classes ["@mozilla.org/mime;1"].getService(Components.interfaces.nsIMIMEService);

                try {
                    filetype = mime.getTypeFromExtension(ext);
                } catch (e) {
                    filetype = "application/octet-stream";
                }
            } else {
                filetype = "application/octet-stream";
            }

            var location;
            if (i == 0) {
                location = indexURL;
            } else {
                location = escape(file.leafName);
            }

            data = "Content-Type: " + filetype + "\r\n" + "Content-Transfer-Encoding: base64\r\n" + "Content-Location: " + location + "\r\n" + "\r\n";

            fstream.write(data, data.length);

            var fstream2 = Components.classes ["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
            var bstream = Components.classes ["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
            fstream2.init(file, 0x01, 0444, 0);
            bstream.setInputStream(fstream2);
            var content = btoa(bstream.readBytes(file.fileSize));
            bstream.close();
            fstream2.close();

            var width = 76;
            data = "";
            for (var j = 0; j < content.length; j += width) {
                data += content.substr(j, width) + "\r\n";
            }

            fstream.write(data, data.length);

            data = "\r\n";
            fstream.write(data, data.length);
        }

        data = "--" + boundary + "--\r\n";
        fstream.write(data, data.length);

        fstream.close();
        try {
            mhtFile.lastModifiedTime = targetFiles [0].lastModifiedTime;
        } catch (e) {
        }

        return true;
    },


    //2
    convertTimer:function (path, node,mark) {

        let file;
        let des = "index.html";
        if(mark)
        {
            file = ScrapBookUtils.getScrapBookDir();
            file.append("data");
            file.append(node.itemId);
            file.append("index.html");

        }else
        {
            let _des = PlacesUtils.annotations.getItemAnnotation(node.itemId, "bookmarkProperties/description");
            file = ScrapBookUtils.getLocalFileFromNativePathOrUrl(_des);
        }

        if(ScrapBookUtils.getType(file)==1)
        {
            //todo maf到mht
            alert("can't export mht to maff");
            return;
        }

        var dir = file.parent;

        var dirname = "";
        var targetFiles = [];

        if (dir && file.exists()) {
            dirname = dir.leafName;
            var entries = dir.directoryEntries;
            while (entries.hasMoreElements()) {
                var f = entries.getNext();
                try {
                    var file2 = f.QueryInterface(Components.interfaces.nsILocalFile);
                } catch (e) {
                    continue;
                }

                if (!file2.isFile()) {
                    continue;
                }
                //index.html就忽略掉
                if (file2.leafName == "index.html")
                    continue;
                targetFiles.push(file2);
            }
            targetFiles.unshift(file);

            let result;
            if(mark)
            {
                result = path;
                //按说不需要,但是...
            }else
            {

                let fileName = ScrapBookUtils.validateFileName(node.title + ".mht");
                result = sbMafService.IsNewFileOrCanOverwrite(path.path, fileName);

            }
            //del 按说不用,但是不知为什么
            if(result.exists())
                result.remove(true);

            if (!result) {
                ScrapBookUtils.log("can't export");
                return false;
            }
            sbMhtService.convertFile(result, targetFiles, node.title, dirname,des);
            //还要把临时文件删除
            if(mark)
            {
                try{
                file.parent.remove(true);
                }catch(e){}
            }
        }

    }
};
