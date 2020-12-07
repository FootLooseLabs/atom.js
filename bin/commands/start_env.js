const kill = require('kill-port');

const fs = require('fs');
const path = require("path");
// const { execSync } = require("child_process");
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

var startInterface = async (_interface, idx) => {
	process.chdir(process.nucleus.BaseDir);
	process.chdir(`${path.resolve(_interface.dir)}`);
	// execSync(`npm run start&`, {stdio: 'inherit'});

	console.log("INFO: Staring Interface - ", `[${idx}.] `,_interface._name);
	
	// try{
	// 	await cleanPort(_interface.port);
	// }catch(e){
	// 	console.log(e);
	// }

	var runMode = getKwarg("mode");
	var logMode = runMode == "dev" ? ["inherit", "inherit", "inherit", "ipc"] : "pipe";
	

	(async ()=>{
		try{
			var _interfaceSubprocess = execa('pm2', ['start','npm', `--name=@Atom.Interface:::${_interface._name}`, '--', 'start', '&']);
			// _interfaceSubprocess.nucleus = process.nucleus;
			// _interfaceSubprocess._name = _interface.name;
			
			if(logMode == "pipe"){
				_interface.stdout = createInterfaceLogStream.stdout(_interface);
				_interface.stderr = createInterfaceLogStream.stderr(_interface);

				_interfaceSubprocess.stdout.pipe(_interface.stdout);
				_interfaceSubprocess.stderr.pipe(_interface.stderr);
			}

			// console.log("=================== _interfaceSubprocess ==================== ", _interfaceSubprocess);

			// _interfaceSubprocess.on("message",(ev)=>{
			// 	console.log("--------------------interface message--------------------\n", ev);
			// });
			process.nucleus.addAtomSubprocess(process, _interfaceSubprocess);
			// eventEmitter.emit("subprocess-added", _interfaceSubprocess);
			
			// console.log("started interface");
		}catch(e){
			// console.log(_interfaceSubprocess.killed);
			// console.log(e.isCanceled);
			console.error("-------------:Error:------------- \n ", e);
		}
	})();
}


var startEnv = (configPath="./") => {
	process.nucleus = require("atom").Nucleus;

	var error;
	if(!configPath){
		console.log("No config path provided");
	}	
	var configAbsDir = path.resolve(configPath);
	
	console.debug("DEBUG: configAbsDir = ", configAbsDir);

	console.log("Info: ","starting interfaces in config");

	// console.log("process.nucleus = ", process.nucleus);

	var initEnvRes;
	try{
		initEnvRes = process.nucleus.init(configAbsDir, process);
	}catch(e){
		error = e; 
	}

	if(error || initEnvRes instanceof Error){
		console.error("exiting...")
		process.exit(1);
		// return;
	}
	// eventEmitter.on("subprocess-added", (_atomSubprocess)=>{
	// 	console.log("-------------------------------------- STARTED INTERFACE -------------------------------------- ", _atomSubprocess._name);
	// });

	process.nucleus.initEnvLogsDir(process);
	process.nucleus.AtomInterfacesDefined.forEach((_interface, idx)=>{
		startInterface(_interface, idx);
	});

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

    if(process.nucleus.AtomInterfacesRunning){
	    process.nucleus.AtomInterfacesRunning.forEach((_interfaceProc)=>{
	    	_interfaceProc.cancel();
	    });
	}

    setTimeout(()=>{
      console.info("Info:", `Terminated Atom.Env`);
      process.exit();
    },2000);
}

process.on('SIGINT', handleInterrupts);
process.on('SIGTERM', handleInterrupts);

process.on('exit', handleInterrupts);



var startNucluesAndEnv = (configPath="./") => {
	startSyncNucleusDaemon(()=>{startEnv(configPath)});
}

module.exports = startNucluesAndEnv;