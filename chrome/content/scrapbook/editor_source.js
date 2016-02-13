var gData;

function init() {
    if ( !window.arguments) window.close();
    gData = window.arguments[0];
    document.getElementById('sbSourcePreTag').value = gData.preTag;
    document.getElementById('sbSourcePreContext').value = gData.preContext;
    document.getElementById('sbSourceValue').value = gData.value;
    document.getElementById('sbSourcePostContext').value = gData.postContext;
    document.getElementById('sbSourcePostTag').value = gData.postTag;

    if (!gData.preTag) document.getElementById('sbSourcePreTag').hidden = true;
    if (!gData.preContext) document.getElementById('sbSourcePreContext').hidden = true;
    if (!gData.postContext) document.getElementById('sbSourcePostContext').hidden = true;
    if (!gData.postTag) document.getElementById('sbSourcePostTag').hidden = true;

    document.getElementById('sbSourcePreContext').select();  // scroll to the end
    document.getElementById('sbSourceValue').select();
}

function accept() {
    gData.preContext = document.getElementById('sbSourcePreContext').value;
    gData.value = document.getElementById('sbSourceValue').value;
    gData.postContext = document.getElementById('sbSourcePostContext').value;
    gData.result = 1;
}
