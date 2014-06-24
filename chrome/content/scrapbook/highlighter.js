var sbHighlighter = {

	nodePositionInRange : {
		SINGLE	: 0,
		START	: 1,
		MIDDLE	: 2,
		END		: 3
	},

	get PRESET_STYLES()
	{
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

	updatePopup : function()
	{
		var idx = document.getElementById("ScrapBookHighlighter").getAttribute("color") || 6;
		document.getElementById("ScrapBookHighlighterM" + idx).setAttribute("checked", "true");
		for ( idx = 6; idx > 0; idx-- )
		{
			var cssText = sbCommonUtils.getPref("highlighter.style." + idx, "") || this.PRESET_STYLES[idx];
			this.decorateElement(document.getElementById("ScrapBookHighlighterM" + idx), cssText);
		}
	},

	decorateElement : function(aElement, aCssText)
	{
		if (aElement.localName == "menuitem") aElement = document.getAnonymousElementByAttribute(aElement, "class", "menu-iconic-text");
		aElement.style.cssText = aCssText;
		aElement.setAttribute("tooltiptext", aCssText);
	},

	set : function(aWindow, aSelection, aNodeName, aAttributes)
	{
		for ( var r = 0; r < aSelection.rangeCount; ++r ) {
			var range = aSelection.getRangeAt( r ); 
			var doc	  = aWindow.document;

			var startC	= range.startContainer;
			var endC	= range.endContainer;
			var sOffset	= range.startOffset;
			var eOffset	= range.endOffset;
			var sameNode = ( startC == endC );
//alert("startC - "+startC+"\nendC - "+endC+"\nsOffset - "+sOffset+"\neOffset - "+eOffset);
			if ( aNodeName == "a" && !sameNode )
			{
			    alert(sbCommonUtils.lang("scrapbook", "MSG_ATTACH_ACROSS_TAGS"));
				return;
			}

			// manage nodes between startC and endC
			if ( ! sameNode || ! this._isTextNode( startC ) ) {
				var nodeWalker 
					= doc.createTreeWalker(
							range.commonAncestorContainer,
							NodeFilter.SHOW_TEXT,
							this._acceptNode,
							false
					  );

				nodeWalker.currentNode = startC; 

				for ( var txtNode = nodeWalker.nextNode(); 
					  txtNode && txtNode != endC; 
					  txtNode = nodeWalker.nextNode() 
					) {

					nodeWalker.currentNode 
						= this._wrapTextNodeWithSpan(
								doc,
								txtNode,
								this._createNode( 
									aWindow, 
									aNodeName, 
									aAttributes, 
									this.nodePositionInRange.MIDDLE 
								)
						); 
				}
			}

			// manage endC
			if ( this._isTextNode( endC ) && eOffset != 0 ) {
				endC.splitText( eOffset );
				if ( ! sameNode) 
					this._wrapTextNodeWithSpan(
							doc,
							endC,
							this._createNode( 
								aWindow, 
								aNodeName, 
								aAttributes,
								this.nodePositionInRange.END
							)
					); 
			}

			// managge startC
			if ( this._isTextNode( startC ) && sOffset != startC.length ) { 
				var secondHalf = startC.splitText( sOffset );
				if ( sameNode ) {
					this._wrapTextNodeWithSpan(
							doc,
							secondHalf,
							this._createNode( 
								aWindow, 
								aNodeName, 
								aAttributes,
								this.nodePositionInRange.SINGLE
							)
					);
				}
				else {
					this._wrapTextNodeWithSpan(
							doc,
							secondHalf,
							this._createNode( 
								aWindow, 
								aNodeName, 
								aAttributes,
								this.nodePositionInRange.START
							)
					);
				}
			}
			range.collapse( true );
		}
	},

	_isTextNode : function( aNode ) 
	{ 
		return aNode.nodeType == aNode.TEXT_NODE; 
	},

	_acceptNode : function( aNode ) 
	{
		if ( aNode.nodeType == aNode.TEXT_NODE 
			 && ! ( /[^\t\n\r ]/.test( aNode.nodeValue ) ) 
		   )
			return NodeFilter.FILTER_REJECT;

		return NodeFilter.FILTER_ACCEPT;
	},

	_createNode : function( aWindow, aNodeName, aAttributes, aNodePosInRange )
	{
		var newNode = aWindow.document.createElement( aNodeName );
		for ( var attr in aAttributes )
		{
			newNode.setAttribute( attr, aAttributes[attr] );
		}
		return newNode;
	},

	_wrapTextNodeWithSpan : function( aDoc, aTextNode, aSpanNode ) 
	{
		aTextNode.parentNode.insertBefore(aSpanNode, aTextNode);
		aSpanNode.appendChild( aTextNode );
		return aTextNode;
	},

};

