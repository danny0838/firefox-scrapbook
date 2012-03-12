// create the main aardvark object
var aardvark = {
//resourcePrefix:"chrome://aardvark/content/",
//这边就算没有值也没有关系,会用name来替代的
strings : {
	wider : '',
	narrower : '',
	undo : '',
	quit : '',
	remove : '',
	kill : '',
	select : '',
	deWidthify : '',
	paste : '',
    karmaticsPlug : '',
    aardvarkKeystrokes:''

	},
};

aardvark.commands = {

keyCommands : [],

//------------------------------------------------------------

//------------------------------------------------------------
wider : function (elem) {
if (elem &&	elem.parentNode) {
	var newElem = aardvark.main.findValidElement (elem.parentNode);
	if (!newElem)
		return false;

	if (this.widerStack && this.widerStack.length>0 &&
		this.widerStack[this.widerStack.length-1] == elem) {
		this.widerStack.push (newElem);
		}
	else {
		this.widerStack = [elem, newElem];
		}
	aardvark.main.selectedElem = newElem;
	aardvark.main.showBoxAndLabel (newElem,
			aardvark.main.makeElementLabelString (newElem));
	this.didWider = true;
	return true;
	}
return false;
},

//------------------------------------------------------------
narrower : function (elem) {
if (elem) {
	if (this.widerStack && this.widerStack.length>1 &&
		this.widerStack[this.widerStack.length-1] == elem) {
		this.widerStack.pop();
		newElem = this.widerStack[this.widerStack.length-1];
		aardvark.main.selectedElem = newElem;
		aardvark.main.showBoxAndLabel (newElem,
				aardvark.main.makeElementLabelString (newElem));
		this.didWider = true;
		return true;
		}
	}
return false;
},

//------------------------------------------------------------
quit : function () {
aardvark.doc.aardvarkRunning = false;
if (aardvark.doc.all) {
	aardvark.doc.detachEvent ("onmouseover", aardvark.main.mouseOver);
	aardvark.doc.detachEvent ("onmousemove", aardvark.main.mouseMove);
	aardvark.doc.detachEvent ("onkeypress", aardvark.main.keyDown);
	aardvark.doc.detachEvent ("onmouseup", aardvark.main.mouseUp, false);
	}
else {
	aardvark.doc.removeEventListener("mouseover", aardvark.main.mouseOver, false);
	aardvark.doc.removeEventListener("mousemove", aardvark.main.mouseMove, false);
	aardvark.doc.removeEventListener("mouseup", aardvark.main.mouseUp, false);
	aardvark.doc.removeEventListener("keypress", aardvark.main.keyDown, false);
	}

aardvark.main.removeBoxFromBody ();

delete (aardvark.selectedElem);
if (this.widerStack)
	delete (this.widerStack);

aardvark.killDbox(aardvark.helpBoxId)
return true;
},

//------------------------------------------------------------
suspend : function () {
if (aardvark.doc.all) {
	aardvark.doc.detachEvent ("onmouseover", aardvark.main.mouseOver);
	aardvark.doc.detachEvent ("onkeypress", aardvark.main.keyDown);
	}
else {
	aardvark.doc.removeEventListener("mouseover", aardvark.main.mouseOver, false);
	aardvark.doc.removeEventListener("keypress", aardvark.main.keyDown, false);
	}
return true;
},

//------------------------------------------------------------

resume : function () {
if (aardvark.doc.all) {
	aardvark.doc.attachEvent ("onmouseover", aardvark.main.mouseOver);
	aardvark.doc.attachEvent ("onkeypress", aardvark.main.keyDown);
	}
else {
	aardvark.doc.addEventListener ("mouseover", aardvark.main.mouseOver, false);
	aardvark.doc.addEventListener ("keypress", aardvark.main.keyDown, false);
	}
return true;
},

//------------------------------------------------------------

//------------------------------------------------------------
removeElement : function (elem) {
if (elem.parentNode != null) {
	var tmpUndoData = {
		next : aardvark.undoData,
	  mode : 'R',
		elem : elem,
	  parent : elem.parentNode,
		nextSibling : elem.nextSibling
		};
	aardvark.undoData = tmpUndoData;
	elem.parentNode.removeChild (elem);
	aardvark.main.clearBox ();
	return true;
	}
return false;
},

//------------------------------------------------------------
paste : function (o) {
if (o.parentNode != null) {
	if (aardvark.undoData.mode == "R") {
		e = aardvark.undoData.elem;
		if (e.nodeName == "TR" && o.nodeName != "TR") {
			var t = aardvark.doc.createElement ("TABLE");
			var tb = aardvark.doc.createElement ("TBODY");
			t.appendChild (tb);
			tb.appendChild (e);
			e = t;
			}
		else if (e.nodeName == "TD" && o.nodeName != "TD") {
			var t2 = aardvark.doc.createElement ("DIV");

			var len = e.childNodes.length, i, a = [];

			for (i=0; i<len; i++)
				a[i] = e.childNodes.item(i);

			for (i=0; i<len; i++) {
				e.removeChild(a[i]);
				t2.appendChild (e);
				}
			t2.appendChild (e);
			e = t2;
			}

		if (o.nodeName == "TD" && e.nodeName != "TD")
			o.insertBefore (e, o.firstChild);
		else if (o.nodeName == "TR" && e.nodeName != "TR")
			o.insertBefore (e, o.firstChild.firstChild);
		else
			o.parentNode.insertBefore (e, o);
		aardvark.main.clearBox ();
		aardvark.undoData = aardvark.undoData.next;
		}
	}
return true;
},

//------------------------------------------------------------
isolateElement : function (o) {
if (o.parentNode != null) {
	aardvark.main.clearBox ();

	var clone;

	if (document.all) {
		// this hack prevents a crash on cnn.com
		if (o.tagName == "TR" || o.tagName == "TD") {
			var t = aardvark.doc.createElement ("TABLE");
			var tb = aardvark.doc.createElement ("TBODY");
			t.appendChild (tb);

			if (o.tagName == "TD") {
				var tr = aardvark.doc.createElement ("TR");
				var td = aardvark.doc.createElement ("TD");
				td.innerHTML = o.innerHTML;
				tr.appendChild (td);
				tb.appendChild (tr);
				}
			else {
				var tr = aardvark.doc.createElement ("TR");
				var len = o.childNodes.length;

				for (var i=0; i<len; i++) {
					var td = o.childNodes.item(i);
					if (td.nodeName == "TD") {
						var newTd = aardvark.doc.createElement ("TD");
						newTd.innerHTML = td.innerHTML;
						tr.appendChild (newTd);
						}
					}
				tb.appendChild (tr);
				}
			clone = t;
			}
		else {
			var div = document.createElement ("DIV");
			div.innerHTML = o.outerHTML;
			clone = div.firstChild;
			}
		}
	else {
		clone = o.cloneNode (true);
		}

	clone.style.textAlign = "";
	clone.style.cssFloat = "none";
	clone.style.styleFloat = "none";
	clone.style.position = "";
	clone.style.padding = "5px";
	clone.style.margin = "5px";

	if (clone.tagName == "TR" || clone.tagName == "TD") {
		if (clone.tagName == "TD") {
			var tr = aardvark.doc.createElement ("TR");
			tr.appendChild (clone);
			clone = tr;
			}
		var t = aardvark.doc.createElement ("TABLE");
		var tb = aardvark.doc.createElement ("TBODY");
		t.appendChild (tb);
		tb.appendChild (clone);
		clone = t;
		}

	var tmpUndoData = [];
	var len = aardvark.doc.body.childNodes.length, i, count = 0, e;

	for (i=0; i<len; i++) {
		e = aardvark.doc.body.childNodes.item(i);
		if (!e.isAardvark) {
			tmpUndoData[count] = e;
			count++;
			}
		}
	tmpUndoData.numElems = count;

	for (i=count-1; i>=0; i--)
		aardvark.doc.body.removeChild (tmpUndoData[i]);

	tmpUndoData.mode = 'I';
	tmpUndoData.bg = aardvark.doc.body.style.background;
	tmpUndoData.bgc = aardvark.doc.body.style.backgroundColor;
	tmpUndoData.bgi = aardvark.doc.body.style.backgroundImage;
	tmpUndoData.m = aardvark.doc.body.style.margin;
	tmpUndoData.ta = aardvark.doc.body.style.textAlign;
	tmpUndoData.next = aardvark.undoData;
	aardvark.undoData = tmpUndoData;

	aardvark.doc.body.style.width = "100%";
	aardvark.doc.body.style.background = "none";
	aardvark.doc.body.style.backgroundColor = "white";
	aardvark.doc.body.style.backgroundImage = "none";
	aardvark.doc.body.style.textAlign = "left";

	aardvark.doc.body.appendChild (clone);

	//aardvark.makeElems ();
	aardvark.window.scroll (0, 0);
	}
return true;
},

//-------------------------------------------------
deWidthify : function (node, skipClear) {
switch (node.nodeType) {
	case 1: // ELEMENT_NODE
		{
		if (node.tagName != "IMG") {
			node.style.width = 'auto';
			if (node.width)
				node.width = null;
			}
		var isLeaf = (node.childNodes.length == 0 && aardvark.utils.leafElems[node.nodeName]);

		if (!isLeaf)
			for (var i=0; i<node.childNodes.length; i++)
				aardvark.commands.deWidthify (node.childNodes.item(i));
		}
		break;
	}
if (!skipClear)
	aardvark.main.clearBox ();
return true;
},


camelCaseProps : {
	'colspan': 'colSpan',
	'rowspan': 'rowSpan',
	'accesskey': 'accessKey',
	'class': 'className',
	'for': 'htmlFor',
	'tabindex': 'tabIndex',
	'maxlength': 'maxLength',
	'readonly': 'readOnly',
	'frameborder': 'frameBorder',
	'cellspacing': 'cellSpacing',
	'cellpadding': 'cellPadding'
},



//-------------------------------------------------
undo : function () {
if (aardvark.undoData == null)
	return false;

aardvark.main.clearBox ();
var ud = aardvark.undoData;
switch (ud.mode) {
	case "I": {
		var a = [];
		var len = aardvark.doc.body.childNodes.length, i, count = 0, e;

		for (i=0; i<len; i++)
			{
			e = aardvark.doc.body.childNodes.item (i);
			if (!e.isAardvark)
				{
				a[count] = e;
				count++;
				}
			}
		for (i=count-1; i>=0; i--)
			aardvark.doc.body.removeChild (a[i]);

		len =	aardvark.undoData.numElems;
		for (i=0; i<len; i++)
			aardvark.doc.body.appendChild (aardvark.undoData[i]);

		aardvark.doc.body.style.background = aardvark.undoData.bg;
		aardvark.doc.body.style.backgroundColor = aardvark.undoData.bgc;
		aardvark.doc.body.style.backgroundImage = aardvark.undoData.bgi;
		aardvark.doc.body.style.margin = aardvark.undoData.m;
		aardvark.doc.body.style.textAlign = aardvark.undoData.ta;
		break;
		}
	case "R": {
		if (ud.nextSibling)
			ud.parent.insertBefore (ud.elem, ud.nextSibling);
		else
			ud.parent.appendChild (ud.elem);
		break;
		}
	default:
		return false;
	}
aardvark.undoData = aardvark.undoData.next;
return true;
},

showMenu : function () {
if (aardvark.helpBoxId) {
  if (aardvark.killDbox (aardvark.helpBoxId) == true) {
    delete (aardvark.helpBoxId);
    return;
    }
  }
var s = "<table style='margin:5px 10px 0 10px'>";
for (var i=0; i<this.keyCommands.length; i++) {
  s += "<tr><td style='padding: 3px 7px; border: 1px solid black; font-family: courier; font-weight: bold;" +
    "background-color: #fff'>" + this.keyCommands[i].keystroke +
    "</td><td style='padding: 3px 7px; font-size: .9em;  text-align: left;'>" + this.keyCommands[i].name + "</td></tr>";
  }
s += "</table><br>" + aardvark.strings.karmaticsPlug;

var dbox = new AardvarkDBox ("#fff2db", true, true, true, aardvark.strings.aardvarkKeystrokes);
dbox.innerContainer.innerHTML = s;
dbox.show ();
aardvark.helpBoxId = dbox.id;
return true;
},

//------------------------------------------------------------
getByKey : function (key) {
var s = key + " - ";
for (var i=0; i<this.keyCommands.length; i++) {
		s += this.keyCommands[i].keystroke;
		if (this.keyCommands[i].keystroke == key) {
				return this.keyCommands[i];
				}
		}
return null;
},

//------------------------------------------------------------
load : function () {
if (this.keyCommands.length > 0)
  return;
// 0: name (member of aardvark.strings, or literal string)
// 1: function
// 2: no element needed (null for element commands)
// 3: "extension" of ext only, "bookmarklet" for bm only, null for both
     //slimx edit
var keyCommands	= [
["wider", this.wider],
["narrower", this.narrower],
["undo", this.undo, true],
["quit", this.quit, true],
["remove", this.removeElement],
//["kill", this.rip, null, "extension"],
["select", this.isolateElement],
//["black on white", this.blackOnWhite],
["deWidthify", this.deWidthify],
//["colorize", this.colorize],
//["view source", this.viewSource],
//["javascript", this.makeJavascript],
["paste", this.paste],
["help", this.showMenu, true]
];

for (var i=0; i<keyCommands.length; i++)
	this.addCommand.apply (this, keyCommands[i]);
},

//-----------------------------------------------------
addCommand : function (name, func,
		noElementNeeded, mode, keystroke) {
if (aardvark.isBookmarklet) {
	if (mode == "extension")
		return;
	}
else {
	if (mode == "bookmarklet")
		return;
	}

if (aardvark.strings[name] && aardvark.strings[name] != "")
	name = aardvark.strings[name];

if (keystroke) {
	keyOffset = -1;
	}
else {
	var keyOffset = name.indexOf('&');
	if (keyOffset != -1) {
		keystroke = name.charAt(keyOffset+1);//注册快捷键,是名字的第一个字母
		name = name.substring (0, keyOffset) + name.substring (keyOffset+1);
		}
	else {
		keystroke = name.charAt(0);
		keyOffset = 0;
		}
	}
var command = {
		name: name,
		keystroke: keystroke,
		keyOffset: keyOffset,
		func: func
		}
if (noElementNeeded)
	command.noElementNeeded = true;
this.keyCommands.push (command);
}

};

aardvark.main = {


//-------------------------------------------------
// create the box and tag etc (done once and saved)
makeElems : function () {
this.borderElems = [];
var d, i, s;

for (i=0; i<4; i++) {
	d = aardvark.doc.createElement ("DIV");
	s = d.style;
	s.display = "none";
	s.overflow = "hidden";
	s.position = "absolute";
	s.height = "2px";
	s.width = "2px";
	s.top = "20px";
	s.left = "20px";
	s.zIndex = "5001";
	d.isAardvark = true; // mark as ours
	this.borderElems[i] = d;
	aardvark.doc.body.appendChild (d);
	}
var be = this.borderElems;
be[0].style.borderTopWidth = "2px";
be[0].style.borderTopColor = "#f00";
be[0].style.borderTopStyle = "solid";
be[1].style.borderBottomWidth = "2px";
be[1].style.borderBottomColor = "#f00";
be[1].style.borderBottomStyle = "solid";
be[2].style.borderLeftWidth = "2px";
be[2].style.borderLeftColor = "#f00";
be[2].style.borderLeftStyle = "solid";
be[3].style.borderRightWidth = "2px";
be[3].style.borderRightColor = "#f00";
be[3].style.borderRightStyle = "solid";

d = aardvark.doc.createElement ("DIV");
aardvark.utils.setElementStyleDefault (d, "#fff0cc");
d.isAardvark = true; // mark as ours
d.isLabel = true; //
d.style.borderTopWidth = "0";
d.style.MozBorderRadiusBottomleft = "6px";
d.style.MozBorderRadiusBottomright = "6px";
d.style.zIndex = "5005";
d.style.visibility = "hidden";
aardvark.doc.body.appendChild (d);
this.labelElem = d;

d = aardvark.doc.createElement ("DIV");
aardvark.utils.setElementStyleDefault (d, "#dfd");
d.isAardvark = true; // mark as ours
d.isKeybox = true; //
d.style.backgroundColor = "#cfc";
d.style.zIndex = "5006";
aardvark.doc.body.appendChild (d);
this.keyboxElem = d;
},

//-------------------------------------------------
// show the red box around the element, and display
// the string in the little tag
showBoxAndLabel : function (elem, string) {
var utils = aardvark.utils;
var pos = utils.getPos(elem)
var dims = utils.getWindowDimensions ();
var y = pos.y;

utils.moveElem (this.borderElems[0], pos.x, y);
this.borderElems[0].style.width = elem.offsetWidth + "px";
this.borderElems[0].style.display = "";

utils.moveElem (this.borderElems[1], pos.x, y+elem.offsetHeight-2);
this.borderElems[1].style.width = (elem.offsetWidth + 2)  + "px";
this.borderElems[1].style.display = "";

utils.moveElem (this.borderElems[2], pos.x, y);
this.borderElems[2].style.height = elem.offsetHeight  + "px";
this.borderElems[2].style.display = "";

utils.moveElem (this.borderElems[3], pos.x+elem.offsetWidth-2, y);
this.borderElems[3].style.height = elem.offsetHeight + "px";
this.borderElems[3].style.display = "";

y += elem.offsetHeight + 2;

this.labelElem.innerHTML = string;
this.labelElem.style.display = '';

// adjust the label as necessary to make sure it is within screen and
// the border is pretty
if ((y + this.labelElem.offsetHeight) >= dims.scrollY + dims.height) {
	this.labelElem.style.borderTopWidth = "1px";
	this.labelElem.style.MozBorderRadiusTopleft = "6px";
	this.labelElem.style.MozBorderRadiusTopright = "6px";
	this.labelDrawnHigh = true;
	y = (dims.scrollY + dims.height) - this.labelElem.offsetHeight;
	}
else if (this.labelElem.offsetWidth > elem.offsetWidth) {
	this.labelElem.style.borderTopWidth = "1px";
	this.labelElem.style.MozBorderRadiusTopright = "6px";
	this.labelDrawnHigh = true;
	}
else if (this.labelDrawnHigh) {
	this.labelElem.style.borderTopWidth = "0";
	this.labelElem.style.MozBorderRadiusTopleft = "";
	this.labelElem.style.MozBorderRadiusTopright = "";
	delete (this.labelDrawnHigh);
	}
utils.moveElem (this.labelElem, pos.x+2, y);
this.labelElem.style.visibility = "visible";
},

//-------------------------------------------------
removeBoxFromBody : function () {
if (this.labelElem) {
	aardvark.doc.body.removeChild(this.labelElem);
	this.labelElem = null;
	}
if (this.keyboxElem) {
	aardvark.doc.body.removeChild(this.keyboxElem);
	this.keyboxElem = null;
	}
if (this.borderElems != null) {
	for (var i=0; i<4; i++)
		aardvark.doc.body.removeChild(this.borderElems[i]);
	this.borderElems = null;
	}
},

//-------------------------------------------------
// remove the red box and tag
clearBox : function () {
this.selectedElem = null;
if (this.borderElems != null) {
	for (var i=0; i<4; i++)
		this.borderElems[i].style.display = "none";
	this.labelElem.style.display = "none";
	this.labelElem.style.visibility = "hidden";
	}
},

//-------------------------------------------------
hideKeybox : function () {
this.keyboxElem.style.display = "none";
this.keyboxTimeoutHandle = null;
},

//-------------------------------------------------
showKeybox : function (command){
if (this.keyboxElem == null)
	return;

if (command.keyOffset >= 0) {
	var s1 = command.name.substring(0, command.keyOffset);
	var s2 = command.name.substring(command.keyOffset+1);

	this.keyboxElem.innerHTML = s1 + "<b style='font-size:2em;'>" +
			command.name.charAt(command.keyOffset) + "</b>" + s2;
	}
else {
  this.keyboxElem.innerHTML = command.name;
  }

var dims = aardvark.utils.getWindowDimensions ();
var y = dims.scrollY + aardvark.mousePosY + 10;
if (y < 0)
	y = 0;
else if (y > (dims.scrollY + dims.height) - 30)
	y = (dims.scrollY + dims.height) - 60;
var x = aardvark.mousePosX + 10;
if (x < 0)
	x = 0;
else if (x > (dims.scrollX + dims.width) - 60)
	x = (dims.scrollX + dims.width) - 100;

aardvark.utils.moveElem (this.keyboxElem, x, y);
this.keyboxElem.style.display = "";
if (this.keyboxTimeoutHandle)
	clearTimeout (this.keyboxTimeoutHandle);
this.keyboxTimeoutHandle = setTimeout ("aardvark.main.hideKeybox()", 400);
},

validIfBlockElements : {
	SPAN: 1,
	A: 1
	},

validIfNotInlineElements : {
	UL: 1,
	LI: 1,
	OL: 1,
	PRE: 1,
	CODE: 1
	},

alwaysValidElements : {
	DIV: 1,
	IFRAME: 1,
	OBJECT: 1,
	APPLET: 1,
	BLOCKQUOTE: 1,
	H1: 1,
	H2: 1,
	H3: 1,
	FORM: 1,
	P: 1,
	TABLE: 1,
	TD: 1,
	TH: 1,
	TR: 1,
	IMG: 1
	},

//-------------------------------------------------
// given an element, walk upwards to find the first
// valid selectable element
findValidElement : function (elem) {
while (elem) {
	if (this.alwaysValidElements[elem.tagName])
		return elem;
	else if (this.validIfBlockElements[elem.tagName]) {
		if (aardvark.doc.defaultView) {
			if (aardvark.doc.defaultView.getComputedStyle
						(elem, null).getPropertyValue("display") == 'block')
				return elem;
			}
		else if (elem.currentStyle){
			if (elem.currentStyle["display"] == 'block')
				return elem;
			}
		}
	else if (this.validIfNotInlineElements[elem.tagName]){
		if (aardvark.doc.defaultView) {
			if (aardvark.doc.defaultView.getComputedStyle
						(elem, null).getPropertyValue("display") != 'inline')
				return elem;
			}
		else if (elem.currentStyle) {
			if (elem.currentStyle["display"] != 'inline')
				return elem;
			}
		}
	elem = elem.parentNode;
	}
return elem;
},

//-------------------------------------------------
makeElementLabelString : function (elem) {
var s = "<b style='color:#000'>" + elem.tagName.toLowerCase() + "</b>";
if (elem.id != '')
	s += ", id: " + elem.id;
if (elem.className != '')
	s += ", class: " + elem.className;
return s;
},

//-------------------------------------------------
mouseUp : function (evt) {
// todo: remove all this when we replace dlogbox with our popupwindow
if (aardvark.dragElement) {
	delete aardvark.dragElement;
	delete aardvark.dragClickX;
	delete aardvark.dragClickY;
	delete aardvark.dragStartPos;
	}
return false;
},

// the following three functions are the main event handlers
// note: "this" does not point to aardvark.main in these
//-------------------------------------------------
mouseMove : function (evt) {
if (!evt)
	evt = aardvark.window.event;

if (aardvark.mousePosX == evt.clientX &&
			aardvark.mousePosY == evt.clientY) {
	aardvark.mouseMoved = false;
	return;
	}

// todo: remove all this when we replace dlogbox with our popupwindow
aardvark.mousePosX  = evt.clientX;
aardvark.mousePosY = evt.clientY;

if (aardvark.dragElement) {
	aardvark.utils.moveElem (aardvark.dragElement,
			(aardvark.mousePosX - aardvark.dragClickX) + aardvark.dragStartPos.x,
			(aardvark.mousePosY - aardvark.dragClickY) + aardvark.dragStartPos.y);
	aardvark.mouseMoved = false;
	return true;
	}

// if it hasn't actually moved (for instance, if something
// changed under it causing a mouseover), we want to know that
aardvark.mouseMoved = true;
return false;
},

//-------------------------------------------------
mouseOver : function (evt) {
if (!evt)
	evt = aardvark.window.event;

if (!aardvark.mouseMoved)
	return;

var elem = aardvark.utils.getElemFromEvent (evt);
if (elem == null)	{
	aardvark.main.clearBox ();
	return;
	}
elem = aardvark.main.findValidElement (elem);

if (elem == null) {
	aardvark.main.clearBox();
	return;
	}

// note: this assumes that:
// 1. our display elements would be selectable types, and
// 2. elements inside display elements would not
if (elem.isAardvark) {
	if (elem.isKeybox)
		aardvark.main.hideKeybox();
	else if (elem.isLabel)
		aardvark.main.clearBox();
	else
		aardvark.main.isOnAardvarkElem = true;
	return;
	}

// this prevents it from snapping back to another element
// if you do a "wider" or "narrower" while on top of one
// of the border lines.  not fond of this, but its about
// the best i can do
if (aardvark.main.isOnAardvarkElem && aardvark.commands.didWider) {
	var e = elem, foundIt = false;
	while ((e = e.parentNode) != null) {
		if (e == aardvark.main.selectedElem) {
			foundIt = true;
			break;
			}
		}
	if (foundIt) {
		aardvark.main.isOnAardvarkElem = false;
		return;
		}
	}
aardvark.main.isOnAardvarkElem = false;
aardvark.commands.didWider = false;

if (elem == aardvark.main.selectedElem)
	return;
aardvark.commands.widerStack = null;
aardvark.main.selectedElem = elem;
aardvark.main.showBoxAndLabel (elem, aardvark.main.makeElementLabelString (elem));
aardvark.mouseMoved = false;
},

//-------------------------------------------------
keyDown : function (evt) {
if (!evt)
	evt = aardvark.window.event;
var c;

if (evt.ctrlKey || evt.metaKey || evt.altKey)
  return true;

var keyCode = evt.keyCode ? evt.keyCode :
			evt.charCode ? evt.charCode :
			evt.which ? evt.which : 0;
c = String.fromCharCode(keyCode).toLowerCase();
var command = aardvark.commands.getByKey(c);

if (command) {
	if (command.noElementNeeded) {
		if (command.func.call (aardvark.commands) == true)
			aardvark.main.showKeybox (command);
		}
	else {
		if (aardvark.main.selectedElem &&
				(command.func.call (aardvark.commands, aardvark.main.selectedElem) == true))
			aardvark.main.showKeybox (command);
		}
	}
if (c < 'a' || c > 'z')
  return true;
if (evt.preventDefault)
	evt.preventDefault ();
else
	evt.returnValue = false;
return false;
},

//-------------------------------------------------
// this is the main entry point when starting aardvark
start : function () {
aardvark.commands.load();

if (aardvark.isBookmarklet) {
	aardvark.window = window;
	aardvark.doc = document;
	}
else {
	aardvark.doc = ((gContextMenu) ? gContextMenu.target.ownerDocument : window._content.document);
	aardvark.window = window._content;
	}

if (aardvark.doc.aardvarkRunning) {
	aardvark.commands.quit();
	return;
	}
else {
	this.makeElems ();
	this.selectedElem = null;

	// need this to be page specific (for extension)...if you
	// change the page, aardvark will not be running
	aardvark.doc.aardvarkRunning = true;

	if (aardvark.doc.all) {
		aardvark.doc.attachEvent ("onmouseover", this.mouseOver);
		aardvark.doc.attachEvent ("onmousemove", this.mouseMove);
		aardvark.doc.attachEvent ("onmouseup", this.mouseUp);
	  aardvark.doc.attachEvent ("onkeypress", this.keyDown);
		}
	else {
		aardvark.doc.addEventListener ("mouseover", this.mouseOver, false);
		aardvark.doc.addEventListener ("mouseup", this.mouseUp, false);
		aardvark.doc.addEventListener ("mousemove", this.mouseMove, false);
		aardvark.doc.addEventListener ("keypress", this.keyDown, false);
		}
	}
}

};

aardvark.utils = {
//-----------------------------------------------------
setElementStyleDefault : function (elem, bgColor) {
var s = elem.style;
s.display = "none";
s.backgroundColor = bgColor;
s.borderColor = "black";
s.borderWidth = "1px 2px 2px 1px";
s.borderStyle = "solid";
s.fontFamily = "arial";
s.textAlign = "left";
s.color = "#000";
s.fontSize = "12px";
s.position = "absolute";
s.paddingTop = "2px";
s.paddingBottom = "2px";
s.paddingLeft = "5px";
s.paddingRight = "5px";
},

//-----------------------------------------------------
getPos : function (o) {
var pos = {};

var leftX = 0;
var leftY = 0;
if (o.offsetParent) {
	while (o.offsetParent) {
		leftX += o.offsetLeft;
		leftY += o.offsetTop;
		o = o.offsetParent;
		}
	}
else if (o.x) {
	leftX += o.x;
	leftY += o.y;
	}
pos.x = leftX;
pos.y = leftY;
return pos;
},

setAardvarkElem : function (elem) {
if (elem.nodeType == 1) { // ELEMENT_NODE
	for (var i=0; i<elem.childNodes.length; i++) {
		elem.isAardvark = true;
		this.setAardvarkElem(elem.childNodes.item(i));
		}
	}
},

//-----------------------------------------------------
setHandler : function(obj, eventName, code) {
if (aardvark.doc.all)
	obj.attachEvent ("on" + eventName, code);
else
	obj.addEventListener (eventName, code, false);
},

//-----------------------------------------------------
// move a div (or whatever) to an x y location
moveElem : function (o, x, y) {
o = o.style;

if (aardvark.doc.all) {
	o.pixelLeft=x;
	o.pixelTop=y;
	}
else {
	o.left=x + "px";
	o.top=y + "px";
	}
},

//-------------------------------------------------
getElemFromEvent : function (evt) {
return ((evt.target) ? evt.target : evt.srcElement);
},

//-------------------------------------------------
getWindowDimensions : function () {
var out = {};

if (aardvark.window.pageXOffset) {
	out.scrollX = aardvark.window.pageXOffset;
	out.scrollY = aardvark.window.pageYOffset;
	}
else if (aardvark.doc.documentElement) {
	out.scrollX = aardvark.doc.body.scrollLeft +
				aardvark.doc.documentElement.scrollLeft;
	out.scrollY = aardvark.doc.body.scrollTop +
				aardvark.doc.documentElement.scrollTop;
	}
else if (aardvark.doc.body.scrollLeft >= 0) {
	out.scrollX = aardvark.doc.body.scrollLeft;
	out.scrollY = aardvark.doc.body.scrollTop;
	}
if (aardvark.doc.compatMode == "BackCompat") {
	out.width = aardvark.doc.body.clientWidth;
	out.height = aardvark.doc.body.clientHeight;
	}
else {
	out.width = aardvark.doc.documentElement.clientWidth;
	out.height = aardvark.doc.documentElement.clientHeight;
	}
return out;
},

leafElems : {IMG:true, HR:true, BR:true, INPUT:true},

//--------------------------------------------------------
// generate "outerHTML" for an element
// this doesn't work on IE, but its got its own outerHTML property
getOuterHtml : function (node) {
var str = "";

switch (node.nodeType) {
	case 1: { // ELEMENT_NODE
		var isLeaf = (node.childNodes.length == 0 && aardvark.leafElems[node.nodeName]);

		str += "<" + node.nodeName.toLowerCase() + " ";
		for (var i=0; i<node.attributes.length; i++) {
			if (node.attributes.item(i).nodeValue != null &&
				node.attributes.item(i).nodeValue != '') {
				str += node.attributes.item(i).nodeName +
					"='" +
					node.attributes.item(i).nodeValue +
					"' ";
				}
			}
		if (isLeaf)
			str += " />";
		else {
			str += ">";

			for (var i=0; i<node.childNodes.length; i++)
				str += aardvark.getOuterHtml(node.childNodes.item(i));

			str += "</" +
				node.nodeName.toLowerCase() + ">"
			}
		}
		break;

	case 3:	//TEXT_NODE
		str += node.nodeValue;
		break;
	}
return str;
},


// borrowed from somewhere
createCSSRule : function (selector, declaration) {
// test for IE (can i just use "aardvark.doc.all"?)
var ua = navigator.userAgent.toLowerCase();
var isIE = (/msie/.test(ua)) && !(/opera/.test(ua)) && (/win/.test(ua));

// create the style node for all browsers
var style_node = aardvark.doc.createElement("style");
style_node.setAttribute("type", "text/css");
style_node.setAttribute("media", "screen");

// append a rule for good browsers
if (!isIE)
	style_node.appendChild(aardvark.doc.createTextNode(selector + " {" + declaration + "}"));

// append the style node
aardvark.doc.getElementsByTagName("head")[0].appendChild(style_node);

// use alternative methods for IE
if (isIE && aardvark.doc.styleSheets && aardvark.doc.styleSheets.length > 0) {
	var last_style_node = aardvark.doc.styleSheets[aardvark.doc.styleSheets.length - 1];
	if (typeof(last_style_node.addRule) == "object"){
		var a = selector.split (",");
		for (var i=0; i<a.length; i++) {
			last_style_node.addRule(a[i], declaration);
			}
		}
	}
},

trimSpaces : function (s) {
while (s.charAt(0) == ' ')
	s = s.substring(1);
while (s.charAt(s.length-1) == ' ')
	s = s.substring(0, s.length-1);
return s;
},

escapeForJavascript : function (s) {
return s.replace(new RegExp("\n", "g"), " ").replace(new RegExp("\t", "g"), " ").replace(new RegExp("\"", "g"), "\\\"").replace(new RegExp("\'", "g"), "\\'").replace(new RegExp("<", "g"), "&lt;").replace(new RegExp(">", "g"), "&gt;");
}

};
