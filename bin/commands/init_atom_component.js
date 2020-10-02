const fs = require("fs");
const path = require('path');

const { execSync } = require("child_process");

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
	}else{
		console.log("dir already exists...exiting.");
		process.exit();
	}
	process.chdir(projectDir);
}

var initAtomComponentCLI = () => {
	console.log("initialising Atom Component...\n");
	rl.question("component name? ", (name) => {
		ComponentSpec.name = name;
		switchToProjectDir(ComponentSpec.name);
    	rl.question("allocate primary port? (Eg- 8888) ", (port) => {
    		ComponentSpec.config.port = port;
    		structureGenerator(jsonStructure);
    		// try{ //later on enable this - after customising folder-structure-generator to use writeSync or promise wrapped result
	    	// 	execSync(`cd ${ComponentSpec.name}`, {stdio: 'inherit'});
	    	// }catch(e){
	    	// 	console.error("Error: ", e);
	    	// }

	    	setTimeout(()=>{
	    		console.log(`DONE - cd into ./${ComponentSpec.name}`)
	    		process.exit();
	    	},500);
    	});
    });
}

module.exports = initAtomComponentCLI;