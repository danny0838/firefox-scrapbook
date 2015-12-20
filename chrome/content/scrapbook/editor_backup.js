var gData;

function init() {
    if ( !window.arguments) window.close();
    gData = window.arguments[0];
}

function accept() {
    gData.hist_html = document.getElementById("sbFileHistHTML").value;
    gData.result = 1;
}