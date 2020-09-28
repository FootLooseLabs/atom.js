const kill = require('kill-port');

const fs = require('fs');
const ini = require('ini');
const path = require("path");
const { execSync } = require("child_process");
const execa = require('execa');

const chalk = require('chalk');


var InterfacesRunning = [];

var _getInterfacesInConfig = (config)=>{
	return Object.keys(config).filter((_key)=>{
		return _key.substr(0,10)=="interface:"
	}).map((_interfaceKey)=>{
		config[_interfaceKey]._name = _interfaceKey; //for internal use
		return config[_interfaceKey];
	})
}

var parseEnvConfig = (_dir='./atom-env.ini') => {

	console.log("Info:", "parsing atom env config at - ", _dir);
	try{
		return ini.parse(fs.readFileSync(_dir, 'utf-8'));
	}catch(e){
		console.error("Error: ", e);
		return;
	}
}


var startInterface = (configAbsDir,_interface) => {
	process.chdir(configAbsDir);
	process.chdir(`${path.resolve(_interface.dir)}`);
	// execSync(`npm run start&`, {stdio: 'inherit'});

	var _interfaceSubprocess = execa('npm', ['run','start'], {stdio: 'inherit'})
	InterfacesRunning.push(_interfaceSubprocess);
	console.log("started interface");
}


var startEnv = (configPath) => {
	var config = parseEnvConfig(configPath);
	var configAbsDir = path.dirname(path.resolve(configPath));
	if(!config){return;}

	console.log("Info: ","starting interfaces in config");

	_getInterfacesInConfig(config).forEach((_interface)=>{
		startInterface(configAbsDir, _interface);
	});

	console.log("started atom env...");
}

var handleInterrupts = function(signalEv) {
  	console.log(`Info: Received Interrupt = ${signalEv}`);
  	// kill(this.config.port).then(() => {
   //      console.info("Info: ", "terminated process that was using the port: ", this.config.port);
   //      InterfacesRunning.forEach((_interfaceProc)=>{
   //      	_interfaceProc.cancel();
   //      });
   //  });

    // console.info("Info: ", "terminated process that was using the port: ", this.config.port);
    InterfacesRunning.forEach((_interfaceProc)=>{
    	_interfaceProc.cancel();
    });

    setTimeout(()=>{
      console.info("Info:", `Terminated Atom.Env`);
      process.exit();
    },2000);
}

process.on('SIGINT', handleInterrupts);
process.on('SIGTERM', handleInterrupts);

process.on('exit', handleInterrupts);

module.exports = startEnv;