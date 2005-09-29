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
 * The Original Code is the Line Marker.
 *
 * The Initial Developer of the Original Code is SHIMODA Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2002-2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): SHIMODA Hiroshi <piro@p.club.ne.jp>
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

// The original script can be found at: http://piro.sakura.ne.jp/xul/_linemarker.html

var sbLineMarker = {

	set : function(aWindow, aSelection, aTagName, aAttributes)
	{
		var range = aWindow.document.createRange();

		try {
			range.setStart(aSelection.anchorNode, aSelection.anchorOffset);
			range.setEnd(aSelection.focusNode, aSelection.focusOffset);
		} catch(ex) {
			range.setStart(aSelection.focusNode, aSelection.focusOffset);
			range.setEnd(aSelection.anchorNode, aSelection.anchorOffset);
		}

		var elem = aWindow.document.createElement(aTagName);
		for ( var attr in aAttributes )
		{
			elem.setAttribute(attr, aAttributes[attr]);
		}

		if (range.startContainer == range.endContainer)
		{
			var containerNode = range.startContainer;
			var startOffset = range.startOffset;
			range.setStartBefore(range.startContainer);
			var startEdge = range.extractContents();
			range.insertNode(startEdge);

			range.selectNode(containerNode.previousSibling);
			range.setStart(containerNode.previousSibling, startOffset);
			var elemContents = range.extractContents();

			elem.appendChild(elemContents.removeChild(elemContents.firstChild));
			elemContents.appendChild(elem);
			range.insertNode(elemContents);
		}
		else {
			// can't attach link across tags.
			if ( aTagName == "a" ) { alert("ScrapBook ERROR: Cannot attach link across tags."); return; }

			var startRange = aWindow.document.createRange();
			startRange.setStart(range.startContainer, range.startOffset);
			startRange.setEndAfter(range.startContainer);
			startRange.surroundContents(elem.cloneNode(true));
			startRange.detach();

			var endRange = aWindow.document.createRange();
			endRange.setStartBefore(range.endContainer);
			endRange.setEnd(range.endContainer, range.endOffset);
			var endLine = elem.cloneNode(true);
			endLine.appendChild(endRange.extractContents());
			endRange.insertNode(endLine);
			endRange.detach();

			this.wrapUpText(range.startContainer, range.endContainer, elem);
		}
		range.detach();
	},

	// Find text nodes from aStartNode to aEndNode, and wrap up them in elemen node (aParent).
	wrapUpText : function(aStartNode, aEndNode, aParent)
	{
		var node = aStartNode,
			newNode;

		traceTree : do
		{
			if (node.hasChildNodes()) {
				node = node.firstChild;
			}
			else {
				while (!node.nextSibling)
				{
					node = node.parentNode;
					if (!node) break traceTree;
				}
				node = node.nextSibling;
			}
			if (node == aEndNode) break traceTree;
			if (node.nodeType == Node.TEXT_NODE) {
				newNode = aParent.cloneNode(true);
				newNode.appendChild(node.cloneNode(true));
				node.parentNode.replaceChild(newNode, node);
				node = newNode.lastChild;
			}
		}
		while (node != aEndNode);
		return;
	},

};


