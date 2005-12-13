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
 *
 * The Initial Developer of the Original Code is Joe Antao.
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):	Joe Antao <joesaccount@gmail.com>
 *					Gomita <gomita.mail@gmail.com>
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


var sbHighlighter = {

	/**
	*	The position of a node in a range is necessary for creating a CSS
	*	styled box around the range. 
	*/
	nodePositionInRange : {
		SINGLE	: 0,
		START	: 1,
		MIDDLE	: 2,
		END		: 3
	},

	/** 
	 *	Array of the default styles.
	 */
	get PRESET_STYLES()
	{
		return [
			// [0] no styles
			"",
			// [1] kahki background with gold dashed border
			"background-color: #FFFF99; color: #000000; border: thin dashed #FFCC00;",
			// [2] limegreen underline
			"border-bottom: medium solid #33FF33;",
			// [3] skyblue border and background
			"background-color: #CCFFFF; color: #000000; border: 1px solid #0099FF;",
			// [4] yellow background
			"background-color: #FFFF00; color: #000000;",
			// [5] double violet border
			"border: medium double #993399;",
			// [6] white bold text with red background
			"background-color: #EE3311; color: #FFFFFF; font-weight: bold;",
			// [7] red text with strike-through
			"color: #FF0000; text-decoration: line-through; ",
			// [8] blue underline
			"border-bottom: 1px solid #3366FF;",
		];
	},

	updatePopup : function()
	{
		var idx = document.getElementById("ScrapBookHighlighter").getAttribute("color") || 4;
		document.getElementById("ScrapBookHighlighter" + idx).setAttribute("checked", true);
		// decorate menuitems by cssTexts
		for ( idx = 4; idx > 0; idx-- )
		{
			var cssText = nsPreferences.copyUnicharPref("scrapbook.highlighter.style." + idx, this.PRESET_STYLES[idx]);
			this.decorateElement(document.getElementById("ScrapBookHighlighter" + idx), cssText);
		}
	},

	decorateElement : function(aElement, aCssText)
	{
		aElement.setAttribute("style", aCssText);
		aElement.setAttribute("tooltiptext", aCssText);
	},

	set : function(aWindow, aSelection, aNodeName, aAttributes)
	{
		// 'for' loop allows for multiple ranges in selection
		for ( var r = 0; r < aSelection.rangeCount; ++r ) {
			var range = aSelection.getRangeAt( r ); 
			var doc	  = aWindow.document;

			var startC	= range.startContainer;
			var endC	= range.endContainer;
			var sOffset	= range.startOffset;
			var eOffset	= range.endOffset;

			var sameNode = ( startC == endC );

			if ( aNodeName == "a" && !sameNode )
			{
				alert("ScrapBook ERROR: Can't attach link across tags."); return;
			}

			/* 
				Surround every non-empty text node between startC and endC, 
				but not including startC and endC, which we handle after this 
			*/
			if ( ! sameNode || ! this._isTextNode( startC ) ) { 

				var nodeWalker 
					= doc.createTreeWalker(
							range.commonAncestorContainer,
							NodeFilter.SHOW_TEXT,
							this._acceptNode,
							false
					  );

				/* 
					createTreeWalker returns rooted 
					at range.commonAncestorContainer,
					so we move it to the range's start container. 
				*/
				nodeWalker.currentNode = startC; 

				/* 
					Loop through the nodes between startC and endC, 
					non-inclusive, surrounding the text nodes with 
					new span nodes 
				*/
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

			/* 
				If the endContainer (endC) is a text node, we split it,
				with the text node endC containing the first half, which 
				includes all of the selected text, as well as any text 
				that appears before the selection. (This can happen if 
				endC is the same as startC).
				We can safely ignore the returned text node, since it does
				not contain any selected portion of the text.
			*/
			if ( this._isTextNode( endC ) ) 
				endC.splitText( eOffset );
			
			/*
				If endC != startC (i.e. not the same node), then endC will
				consist only of selected text (due to the split done above)
				and we can safely surround the entire node.
				
				If endC == startC then it's possible that there is text 
				that is not part of the selection present in the node.
			*/
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

			/*
				If startC == endC, then we have already removed any text 
				trailing the selection, and only need to remove any text 
				preceding the selection before surrounding it with our span.
				
				If startC != endC, then we need to split off any text 
				preceding the selection. 

				Both cases require the same action, but we need to 
				differentiate between the two for CSS style reasons. 
				( e.g., when styling a box border around text, we need to
				know where the box starts, the middle, and ends )
			*/
			if ( this._isTextNode( startC ) ) { 
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

			// collapse range to its end point. 
			range.collapse( true ); 

		}

	},

	_isTextNode : function( aNode ) 
	{ 
		return aNode.nodeType == aNode.TEXT_NODE; 
	},

	_acceptNode : function( aNode ) 
	{
		/* 
			If aNode is a TEXT_NODE and it contains only whitespace 
			characters, we reject it 
		*/
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
		var clonedTextNode = aTextNode.cloneNode( false );
		var nodeParent	 = aTextNode.parentNode;	

		aSpanNode.appendChild( clonedTextNode );
		nodeParent.replaceChild( aSpanNode, aTextNode );

		return clonedTextNode;
	},

};

