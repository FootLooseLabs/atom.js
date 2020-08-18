const fs = require("fs");
const path = require('path');

var structureGenerator = require('folder-structure-generator');
var jsonStructure = require('./markups/proj_structure.json');


const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})
.on('SIGINT', () => process.emit('SIGINT'))
.on('SIGTERM', () => process.emit('SIGTERM'));


var ComponentSpec = {
	name: "",
	config: {
		port: null,
		apis: []
	} 
}


var switchToProjectDir = (projectDir)=> {
	if (!fs.existsSync(projectDir)){
	    fs.mkdirSync(projectDir);
	}
	process.chdir(projectDir);
}

var initAtomComponentCLI = () => {
	console.log("initialising Atom Component...\n");
	rl.question("component name? ", (name) => {
		ComponentSpec.name = name;
		switchToProjectDir(ComponentSpec.name);
    	rl.question("allocate primary port? (Eg- 8888) ", (port) => {
    		ComponentSpec.config.port = port
    		structureGenerator(jsonStructure);
    	});
    });
}

module.exports = initAtomComponentCLI;