
var sbp2HighlightNode = {

	shnActive : false,

	shnBrowser : null,
	shnChromeDoc : null,
	shnChromeWin : null,
	shnWindow : null,
	shnZoom : null,

	shnNodeLabel : null,

	shnOutline : null,
	shnOutlinecontainer : null,

	shnHighlighterContainer : null,

	init : function()
	{
		//Initialisiert den Highlighter für Nodes
		//
		//Ablauf:
		//1. Variablen initialisieren
		//7. Listener in alle Frames auf mouseover und click
		//8. HighlightNode als aktiv vermerken

		if ( this.shnActive == false ) {
			//1. Variablen initialisieren
			this.shnBrowser = window.gBrowser.selectedBrowser;
			this.shnChromeDoc = window.document;
			this.shnChromeWin = this.shnBrowser.contentWindow;
			this.shnWindow = window;
			this.handleEventResize();	//hnZoom setzen
/*
			//2. Label für Node-Namen erstellen
			
			//3. Rahmen erstellen
			this.shnOutline = this.shnChromeDoc.createElement("box");
			this.shnOutline.id = "sbp2-highlightnode-outline";
			this.shnOutlinecontainer = this.shnChromeDoc.createElement("box");
			this.shnOutlinecontainer.id = "sbp2-highlightnode-outline-container";
			this.shnOutlinecontainer.appendChild(this.shnOutline);
			//4. Label und Rahmen "stacken"
			this.shnHighlighterContainer = this.shnChromeDoc.createElement("stack");
			this.shnHighlighterContainer.id = "sbp2-highlightnode-container";
			this.shnHighlighterContainer.appendChild(this.shnOutlinecontainer);
			this.shnHighlighterContainer.appendChild(iControlsBox);
			//5. Stack des Highlighter in Stack des Browser einfügen
			var iStack = this.shnBrowser.parentNode;
			stack.insertBefore(this.shnHighlighterContainer, stack.childNodes[1]);
			//6. für wichtige Objekte direkten Zugriff aus allen lokalen Funktionen in sbp2HighlightNode ermöglichen
			this.shnNodeLabel = {
				labelContainer: iControlsBox,
				label: tagNameLabel,
			};*/
			//
			this.shnBrowser.addEventListener("resize", this.handleEventResize, true);
			//
			var iStack = this.shnBrowser.parentNode;

			this.shnHighlighterContainer = this.shnChromeDoc.createElement("stack");
			this.shnHighlighterContainer.id = "sbp2-highlightnode-container";

			this.shnOutline = this.shnChromeDoc.createElement("box");
			this.shnOutline.id = "sbp2-highlightnode-outline";

			var iOutlineContainer = this.shnChromeDoc.createElement("box");
			iOutlineContainer.appendChild(this.shnOutline);
			iOutlineContainer.id = "sbp2-highlightnode-outline-container";

			// The iControlsBox will host the different interactive
			// elements of the highlightnode (buttons, toolbars, ...).
			var iControlsBox = this.shnChromeDoc.createElement("box");
			iControlsBox.id = "sbp2-highlightnode-controls";
			this.shnHighlighterContainer.appendChild(iOutlineContainer);
			this.shnHighlighterContainer.appendChild(iControlsBox);

			// Insert the highlighter right after the browser
			iStack.insertBefore(this.shnHighlighterContainer, iStack.childNodes[1]);
			//Infobar
			var iContainer = this.shnChromeDoc.createElement("box");
			iContainer.id = "sbp2-highlightnode-nodeinfobar-container";
			iContainer.setAttribute("position", "top");

			var iNodeInfobar = this.shnChromeDoc.createElement("hbox");
			iNodeInfobar.id = "sbp2-highlightnode-nodeinfobar";

			var iArrowBoxTop = this.shnChromeDoc.createElement("box");
			iArrowBoxTop.className = "sbp2-highlightnode-nodeinfobar-arrow";
			iArrowBoxTop.id = "sbp2-highlightnode-nodeinfobar-arrow-top";

			var iArrowBoxBottom = this.shnChromeDoc.createElement("box");
			iArrowBoxBottom.className = "sbp2-highlightnode-nodeinfobar-arrow";
			iArrowBoxBottom.id = "sbp2-highlightnode-nodeinfobar-arrow-bottom";

			var iSpanL = this.shnChromeDoc.createElementNS("http://www.w3.org/1999/xhtml", "span");
			iSpanL.textContent = "_";
			var iSpanR = this.shnChromeDoc.createElementNS("http://www.w3.org/1999/xhtml", "span");
			iSpanR.textContent = "_";

			var iTagNameLabel = this.shnChromeDoc.createElementNS("http://www.w3.org/1999/xhtml", "span");
			iTagNameLabel.id = "sbp2-highlightnode-nodeinfobar-tagname";

			var iTexthbox = this.shnChromeDoc.createElement("hbox");
			iTexthbox.id = "sbp2-highlightnode-nodeinfobar-text";
			iTexthbox.setAttribute("align", "center");
			iTexthbox.setAttribute("flex", "1");

			iTexthbox.appendChild(iSpanL);
			iTexthbox.appendChild(iTagNameLabel);
			iTexthbox.appendChild(iSpanR);

			iNodeInfobar.appendChild(iTexthbox);

			iContainer.appendChild(iArrowBoxTop);
			iContainer.appendChild(iNodeInfobar);
			iContainer.appendChild(iArrowBoxBottom);

			iControlsBox.appendChild(iContainer);

			var iBarHeight = iContainer.getBoundingClientRect().height;

			this.shnNodeLabel = {
				tagNameLabel: iTagNameLabel,
				container: iContainer,
				barHeight: iBarHeight,
			};
			//7. Listener in alle Frames auf mouseover und click
			var iFrameList		= [window.content];
			for ( var iI=0; iI<window.content.frames.length; iI++ )
			{
				iFrameList.push(window.content.frames[iI]);
			}
			for ( var iI=0; iI<iFrameList.length; iI++ )
			{
				iFrameList[iI].document.addEventListener("mouseover", this.handleEventMouse, true);
				iFrameList[iI].document.addEventListener("click", sbp2Editor.deHandleEvent, true);
			}
			//8. HighlightNode als aktiv vermerken
			this.shnActive = true;
		} else {
			this.destroy();
			//8. HighlightNode als inaktiv vermerken
			this.shnActive = false;
		}
	},

	destroy : function()
	{
		//Entfernt alle Listener und Objekte des Highlighters aus dem Browser.
		//
		//Ablauf:
		//1. Maus-Listener entfernen
		//2. Browser-Listener entfernen
		//3. stack entfernen
		//4. Variablen auf null
		
		//1. Maus-Listener entfernen
		var iFrameList		= [window.content];
		for ( var iI=0; iI<window.content.frames.length; iI++ )
		{
			iFrameList.push(window.content.frames[iI]);
		}
		for ( var iI=0; iI<iFrameList.length; iI++ )
		{
			iFrameList[iI].document.removeEventListener("mouseover", this.handleEventMouse, true);
			iFrameList[iI].document.removeEventListener("click", sbp2Editor.deHandleEvent, true);
		}
		//2. Browser-Listener entfernen
		this.shnBrowser.removeEventListener("resize", this.handleEventResize, true);
		//3. stack entfernen
		this.shnHighlighterContainer.parentNode.removeChild(this.shnHighlighterContainer);
		//4. Variablen auf null
		this.shnBrowser = null;
		this.shnChromeDoc = null;
		this.shnChromeWin = null;
		this.shnWindow = null;
		this.shnZoom = null;

		this.shnNodeLabel = null;

		this.shnOutline = null;
		this.shnOutlinecontainer = null;

		this.shnHighlighterContainer = null;
	},

	handleEventMouse : function(hemEvent)
	{
		//Hebt das Element hervor, über dem sich der Mauszeiger befindet.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Rahmen ausrichten
		//3. tagName aktualisieren
		//4. Label ausrichten

		//1. Variablen initialisieren
		var hemElement = hemEvent.target;
		var hemElementRect = hemElement.getBoundingClientRect();
		//2. Rahmen ausrichten
		//Frames berücksichtigen
		var hemFrameWin = hemElement.ownerDocument.defaultView;
		var hemOffsetTop = 0;
		var hemOffsetLeft = 0;
		if ( hemFrameWin.frameElement != null ) {
			//obige Bedingung ist nur erfüllt, falls hemFrameWin tatäschlich ein Frame ist
			var hemFrameRect = hemFrameWin.frameElement.getBoundingClientRect();
			var hemStyle = hemFrameWin.frameElement.contentWindow.getComputedStyle(hemFrameWin.frameElement, null);
			if (hemStyle) {
				var hemPaddingTop = parseInt(hemStyle.getPropertyValue("padding-top"));
				var hemPaddingLeft = parseInt(hemStyle.getPropertyValue("padding-left"));
				var hemBorderTop = parseInt(hemStyle.getPropertyValue("border-top-width"));
				var hemBorderLeft = parseInt(hemStyle.getPropertyValue("border-left-width"));
				hemOffsetTop = hemBorderTop + hemFrameRect.top + hemPaddingTop;
				hemOffsetLeft = hemBorderLeft + hemFrameRect.left + hemPaddingLeft;
			}
		}
		//Ende Frames berücksichtigen
		var hemTop = "top:" + (hemElementRect.top + hemOffsetTop) * sbp2HighlightNode.shnZoom + "px;";
		var hemLeft = "left:" + (hemElementRect.left + hemOffsetLeft) * sbp2HighlightNode.shnZoom + "px;";
		var hemWidth = "width:" + hemElementRect.width * sbp2HighlightNode.shnZoom + "px;";
		var hemHeight = "height:" + hemElementRect.height * sbp2HighlightNode.shnZoom + "px;";
		sbp2HighlightNode.shnOutline.setAttribute("style", hemTop + hemLeft + hemWidth + hemHeight);
		//3. tagName aktualisieren
		sbp2HighlightNode.shnNodeLabel.tagNameLabel.textContent = hemElement.tagName;
		//4. Label ausrichten
		hemTop = (hemElementRect.top + hemOffsetTop) * sbp2HighlightNode.shnZoom;
		hemLeft = (hemElementRect.left + hemOffsetLeft) * sbp2HighlightNode.shnZoom;
		hemWidth = hemElementRect.width * sbp2HighlightNode.shnZoom;
		hemHeight = hemElementRect.height * sbp2HighlightNode.shnZoom;
		var hemLTop = hemTop;
		if ( hemLTop >= sbp2HighlightNode.shnNodeLabel.barHeight ) {
			hemLTop = hemLTop - sbp2HighlightNode.shnNodeLabel.barHeight;
			sbp2HighlightNode.shnNodeLabel.container.setAttribute("position", "top");
		} else if ( hemLTop + hemHeight + sbp2HighlightNode.shnNodeLabel.barHeight < sbp2HighlightNode.shnChromeWin.innerHeight * sbp2HighlightNode.shnZoom ) {
			hemLTop = hemLTop + hemHeight;
			sbp2HighlightNode.shnNodeLabel.container.setAttribute("position", "bottom");
		} else {
			hemLTop = Math.max(hemLTop, 0);
			hemLTop = Math.min(hemLTop, sbp2HighlightNode.shnChromeWin.innerHeight * sbp2HighlightNode.shnZoom);
			sbp2HighlightNode.shnNodeLabel.container.setAttribute("position", "overlap");
		}
		var hemLLeft = hemLeft + ( hemWidth / 2 ) - ( sbp2HighlightNode.shnNodeLabel.container.getBoundingClientRect().width / 2 );
		sbp2HighlightNode.shnNodeLabel.container.style.top = hemLTop + "px";
		sbp2HighlightNode.shnNodeLabel.container.style.left = hemLLeft + "px";
	},

	handleEventResize : function()
	{
		sbp2HighlightNode.shnZoom = sbp2HighlightNode.shnChromeWin.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils).screenPixelsPerCSSPixel;
	},

}