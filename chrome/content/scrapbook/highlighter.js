let sbHighlighter = {

    nodePositionInRange: {
        SINGLE: 0,
        START: 1,
        MIDDLE: 2,
        END: 3
    },

    get PRESET_STYLES() {
        return [
            "",
            "background-color: #FFFF99; color: #000000; border: thin dashed #FFCC00;",
            "border-bottom: medium solid #33FF33;",
            "background-color: #CCFFFF; color: #000000; border: thin solid #0099FF;",
            "background-color: #FFFF00; color: #000000;",
            "border: medium double #993399;",
            "background-color: #EE3311; color: #FFFFFF; font-weight: bold;",
            "color: #FF0000; text-decoration: line-through;",
            "border-bottom: thin solid #3366FF;",
        ];
    },

    updatePopup: function() {
        let idx = document.getElementById("ScrapBookHighlighter").getAttribute("color") || 8;
        document.getElementById("ScrapBookHighlighterM" + idx).setAttribute("checked", "true");
        for ( idx = 8; idx > 0; idx-- ) {
            let cssText = sbCommonUtils.getPref("highlighter.style." + idx, "") || this.PRESET_STYLES[idx];
            this.decorateElement(document.getElementById("ScrapBookHighlighterM" + idx), cssText);
        }
    },

    decorateElement: function(aElement, aCssText) {
        if (aElement.localName == "menuitem") aElement = document.getAnonymousElementByAttribute(aElement, "class", "menu-iconic-text");
        aElement.style.cssText = aCssText;
        aElement.setAttribute("tooltiptext", aCssText);
    },

    set: function(aWindow, aSelection, aNodeName, aAttributes) {
        for ( let r = 0; r < aSelection.rangeCount; ++r ) {
            let range = aSelection.getRangeAt( r ); 
            let doc = aWindow.document;

            let startC = range.startContainer;
            let endC = range.endContainer;
            let sOffset = range.startOffset;
            let eOffset = range.endOffset;
            let sameNode = ( startC == endC );
//sbCommonUtils.alert("startC - "+startC+"\nendC - "+endC+"\nsOffset - "+sOffset+"\neOffset - "+eOffset);
            if ( aNodeName == "a" && !sameNode ) {
                sbCommonUtils.alert(sbCommonUtils.lang("MSG_ATTACH_ACROSS_TAGS"));
                return;
            }
            // Replace faulty original function
            let nodeWalker = doc.createTreeWalker(range.commonAncestorContainer,NodeFilter.SHOW_TEXT,this._acceptNode,false);
            nodeWalker.currentNode = startC;
            let txtNode = startC;
            let end = 1;
            if ( txtNode.nodeType == 1 ) {
                txtNode = nodeWalker.nextNode();
                if ( txtNode ) {
                    while ( end == 1 ) {
                        if ( range.isPointInRange(txtNode,0) ) {
                            end = 0;
                        } else {
                            txtNode = nodeWalker.nextNode();
                        }
                    }
                    end = 1;
                }
            }
            while ( end == 1 ) {
                if ( txtNode ) {
                    if ( txtNode == endC ) {
                        if ( this._isTextNode( endC ) ) endC.splitText( eOffset );
                        end = 0;
                    }
                    if ( txtNode == startC ) {
                        if ( this._isTextNode( startC ) ) txtNode = startC.splitText( sOffset );
                    }
                    if ( txtNode.nodeType != 1 ) {
                        if ( /[^\t\n\r ]/.test( txtNode.nodeValue ) ) {
                            nodeWalker.currentNode = this._wrapTextNodeWithSpan(doc,txtNode,this._createNode(aWindow,aNodeName,aAttributes));
                        }
                    }
                    txtNode = nodeWalker.nextNode();
                    if ( txtNode ) {
                        if ( txtNode.nodeType != 1 ) {
                            if ( !range.isPointInRange(txtNode,0) ) {
                                end = 0;
                            }
                        }
                    }
                } else {
                    end = 0;
                }
            }
            // End replace
            nodeWalker.currentNode = startC;
            range.collapse( true ); 
            range.detach();
        }
    },

    _isTextNode: function( aNode ) { 
        return aNode.nodeType == aNode.TEXT_NODE; 
    },

    _acceptNode: function( aNode ) {
        if ( aNode.nodeType == aNode.TEXT_NODE 
             && ! ( /[^\t\n\r ]/.test( aNode.nodeValue ) ) 
           )
            return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
    },

    _createNode: function( aWindow, aNodeName, aAttributes, aNodePosInRange ) {
        let newNode = aWindow.document.createElement( aNodeName );
        for ( let attr in aAttributes ) {
            newNode.setAttribute( attr, aAttributes[attr] );
        }
        return newNode;
    },

    _wrapTextNodeWithSpan: function( aDoc, aTextNode, aSpanNode ) {
        aTextNode.parentNode.insertBefore(aSpanNode, aTextNode);
        aSpanNode.appendChild( aTextNode );
        return aTextNode;
    },

};

