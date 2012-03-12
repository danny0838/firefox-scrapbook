var sbFolderSelector2 = {

	get STRING() { return document.getElementById("sbMainString"); },
	get TEXTBOX(){ return document.getElementById("sbFolderTextbox"); },
	get resURI() { return this.TEXTBOX.getAttribute("resuri"); },

	init : function()
	{
		this.TEXTBOX.value = this.STRING.getString("ROOT_FOLDER");
		this.TEXTBOX.setAttribute("resuri", "urn:scrapbook:root");
	},

	pick : function()
	{
        
	}

};



