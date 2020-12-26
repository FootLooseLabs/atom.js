const kill = require('kill-port');

const fs = require('fs');
const path = require("path");
const { exec, execSync } = require("child_process");
const execa = require('execa');

const startSyncNucleusDaemon = require("./start_nucleus_daemon");

const chalk = require('chalk');

var events = require("events");
var eventEmitter = new events.EventEmitter();

// const zmq = require("zeromq");

// const logSock = zmq.socket("pub");
// logSock.bind("tcp://0.0.0.0:5140");


var getKwarg = (_kwarg) => {
	var kwarg = null;
	var arg = process.argv.find((_arg)=>{
		return _arg.includes(`${_kwarg}=`);
	});
	if(arg){
		kwarg = arg.split("=")[1];
	}
	return kwarg;
}

var getOrCreateDir = (_dir) => {
	if (!fs.existsSync(_dir)){
		fs.mkdirSync(_dir, { recursive: true });
	}
}

var createInterfaceLogStream = {
	stdout: (_interface) => {
		let logDir = process.nucleus.getInterfaceLogDir(_interface);
		getOrCreateDir(logDir);
		console.log(`Creating LogStream.STDOUT for ${_interface._key}`);
		// return logSock;
		return fs.createWriteStream(_interface.logsDir.stdout, {flags: 'a'})
	},
	stderr: (_interface) => {
		let logDir = process.nucleus.getInterfaceLogDir(_interface);
		getOrCreateDir(logDir);
		console.log(`Creating LogStream.STDERR for ${_interface._key}`);
		// return logSock;
		return fs.createWriteStream(_interface.logsDir.stderr, {flags: 'a'});
	}
}



var cleanPort = async (port) => { 
//NOT used currently as causing issues (interfaces starting multiple times - perhaps due to SIGINT callbacks)
	console.log("Info: cleaning port = ", port);
	return new Promise(async (resolve, reject)=>{
		try{
			await kill(port);
	      	// console.info("Info:", "cleaned port = ", port);
	      	resolve(true);
	    }catch(e){
	    	// console.info("Error:", "failed cleaning port = ", port);
	    	reject(e);
	    }
	});
}

var startInterface = async (_interface) => {
	process.chdir(process.nucleus.BaseDir);
	process.chdir(`${path.resolve(_interface.dir)}`);
	// execSync(`npm run start&`, {stdio: 'inherit'});

	console.log("INFO: Staring Interface - ",`${_interface._name} : , [${process.cwd()}]`);

	var _name = `@Atom.Interface:::${_interface._name}`;


	if(getKwarg("mode")=="dev"){
		let _interfaceSubprocess = exec(`sudo npm run dev`);
		process.nucleus.addAtomSubprocess(process, _interfaceSubprocess);
	}else{
		try{
			await exec(`sudo npm run stop`);
		}catch(e){
			
		}
		try{
			let _interfaceSubprocess = exec(`sudo npm run start &`);
			process.nucleus.addAtomSubprocess(process, _interfaceSubprocess);
			console.debug("DEBUG: ",`Started ${_interface._name}`);
		}catch(e){
			console.error("-------------:Error:------------- \n ", e);
		}
	}
}

var startEnv = (configPath="./") => {
	process.nucleus = require("atom").Nucleus;

	var error;
	if(!configPath){
		console.log("No config path provided");
	}	
	var configAbsDir = path.resolve(configPath);
	
	console.debug("DEBUG: configAbsDir = ", configAbsDir);

	// console.log("process.nucleus = ", process.nucleus);

	var initEnvRes;
	try{
		initEnvRes = process.nucleus.init(configAbsDir, process);
	}catch(e){
		error = e;
	}

	if(error || initEnvRes instanceof Error){
		console.error("exiting...coz of error - ", error || initEnvRes);
		process.exit(1);
		// return;
	}
	// eventEmitter.on("subprocess-added", (_atomSubprocess)=>{
	// 	console.log("-------------------------------------- STARTED INTERFACE -------------------------------------- ", _atomSubprocess._name);
	// });

	// process.nucleus.initEnvLogsDir(process);

	// console.table((({ _name, port }) => ({ _name, port }))(process.nucleus.AtomInterfacesDefined));

	// let table = process.nucleus.AtomInterfacesDefined.reduce(function(result, item) {
	//   var name = item._name;
	//   result[`${item._name}`] = [item.port, item.dir];
	//   return result;
	// }, {});

	let table = process.nucleus.AtomInterfacesDefined.map(function(item) {
	  return {
	  	name: item._name,
	  	port: item.port,
	  	dir: item.dir
	  };
	});

	console.info("\nInfo: ","starting the following interfaces as per config: ");
	console.table(table);

	for(var idx in process.nucleus.AtomInterfacesDefined){
		startInterface(process.nucleus.AtomInterfacesDefined[idx]);
	}
	// process.nucleus.AtomInterfacesDefined.forEach((_interface, idx)=>{
	// 	startInterface(_interface, idx);
	// });

	// console.log("started atom env...");
}

var handleInterrupts = function(signalEv) {
  	console.log(`Info: Received Interrupt = ${signalEv}`);
  	// kill(this.config.port).then(() => {
   //      console.info("Info: ", "terminated process that was using the port: ", this.config.port);
   //      process.nucleus.AtomInterfacesRunning.forEach((_interfaceProc)=>{
   //      	_interfaceProc.cancel();
   //      });
   //  });

    // console.info("Info: ", "terminated process that was using the port: ", this.config.port);

 //    if(process.nucleus.AtomInterfacesRunning){
	//     process.nucleus.AtomInterfacesRunning.forEach((_interfaceProc)=>{
	//     	_interfaceProc.cancel();
	//     });
	// }

 //    setTimeout(()=>{
 //      console.info("Info:", `Terminated Atom.Env`);
 //      process.exit();
 //    },2000);
}

process.on('SIGINT', handleInterrupts);
process.on('SIGTERM', handleInterrupts);

process.on('exit', handleInterrupts);



var startNucluesAndEnv = (configPath="./") => {
	startSyncNucleusDaemon(()=>{startEnv(configPath)});
}

module.exports = startNucluesAndEnv;