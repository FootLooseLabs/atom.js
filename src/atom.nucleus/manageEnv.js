var events = require('events');

const fs = require('fs');
const path = require("path");
const ini = require('ini');

const chalk = require('chalk');

// var events = require("events");
// var eventEmitter = new events.EventEmitter();

const AtomNucleus = {};

AtomNucleus._eventEmitter = new events.EventEmitter();


AtomNucleus.emit = AtomNucleus._eventEmitter.emit;
AtomNucleus.on = AtomNucleus._eventEmitter.on;

AtomNucleus.parseEnvConfig = (_dir) => {
	console.log("Info:", "parsing atom env config at - ", _dir);
	try{
		return ini.parse(fs.readFileSync(_dir, 'utf-8'));
	}catch(e){
		// console.error("Error: ", e);
		return e;
	}
}

AtomNucleus.getEnvModel = (config)=>{
	var envKey = Object.keys(config).find((_key)=>{
		return _key.substr(0,4)=="env:"
	});
	return config[envKey]
}


AtomNucleus.getLogStream = (interfaceName, streamType="stdout") => {
	let interface = _process.nucleus.AtomInterfacesDefined.find((_interface)=>{
		_interface._name == interfaceName;
	});

	if(!interface){
		console.log("ERROR: ", `Logstream not found for interface = ${interfaceName}`)
		return;
	}

	if(!interface[streamType]){
		console.log("ERROR: ", `Invalid streamType = ${streamType}`)
		return;
	}

	var rstream = fs.createReadStream(interface[streamType]);

	// readStream.on('data', function(data) {
 	//        ws.send(data, {binary: true, mask: false});
 	// });

 	// var dataLength = 0;
	// rstream
	//   .on('data', function (chunk) {
	//     dataLength += chunk.length;
	//   })
	//   .on('end', function () {  // done
	//     console.log('The length was:', dataLength);
	//   });
}

AtomNucleus.initEnvLogsDir = (_process)=>{
	process.chdir(_process.nucleus.BaseDir);

	if (!fs.existsSync(_process.nucleus.EnvLogDir)){
	    fs.mkdirSync(_process.nucleus.EnvLogDir);
	}
}

AtomNucleus.getInterfaceLogDir = (_interface) => {
	return path.join(process.nucleus.EnvLogDir, _interface._name)
}

AtomNucleus.getInterfacesInEnvConfig = (config)=>{ //NOTE - 'interface' is a reserved keyword. So do not use.
	return Object.keys(config).filter((_key)=>{
		return _key.substr(0,10)=="interface:"
	}).map((_interfaceKey)=>{
		config[_interfaceKey]._key = _interfaceKey; //for internal use
		config[_interfaceKey]._name = _interfaceKey.split(":")[1]; //for internal use
		let interfaceLogsDir = AtomNucleus.getInterfaceLogDir(config[_interfaceKey]);
		config[_interfaceKey].logsDir = {
			stdout: path.join(interfaceLogsDir,"stdout.log"),
			stderr: path.join(interfaceLogsDir,"stderr.log")
		};
		return config[_interfaceKey];
	})
}


AtomNucleus.addAtomSubprocess = (_process,_interfaceSubprocess) => {
	_process.nucleus.AtomInterfacesRunning.push(_interfaceSubprocess);
}

AtomNucleus.init = (configAbsDir, _process) => {
	var _config;
	try{
		_config = AtomNucleus.parseEnvConfig(configAbsDir);
	}catch(e){
		console.error(chalk.red(`Failed parsing nucleus env config = ${configAbsDir}, \n Error = `, e));
		return e;
	}

	if(_config instanceof Error) {
		console.error(chalk.red(`Failed parsing nucleus env config = ${configAbsDir}`));
		return _config;
	}

	_process.nucleus.Config = _config;

	console.log("Sucessfully parsed env config");

	_process.nucleus.AtomInterfacesRunning = [];
	_process.nucleus.BaseDir = path.dirname(configAbsDir);
	_process.nucleus.EnvModel = _process.nucleus.getEnvModel(_process.nucleus.Config);
	_process.nucleus.EnvLogDir = path.resolve(path.join(_process.nucleus.BaseDir,_process.nucleus.EnvModel.logs));
	_process.nucleus.AtomInterfacesDefined = _process.nucleus.getInterfacesInEnvConfig(_process.nucleus.Config);
}

module.exports = AtomNucleus;