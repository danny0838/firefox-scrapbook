var gData;

function init() {
	if ( !window.arguments) window.close();
	gData = window.arguments[0];
	document.getElementById('ScrapBookEditSource').value = gData.value;
}

function accept() {
	gData.value = document.getElementById('ScrapBookEditSource').value;
	gData.result = 1;
}
