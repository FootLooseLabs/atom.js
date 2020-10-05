const kill = require('kill-port');

const fs = require('fs');
const path = require("path");
// const { execSync } = require("child_process");
const execa = require('execa');

const chalk = require('chalk');


// const zmq = require("zeromq");


process.nucleus = require("atom").Nucleus;

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

	console.log("INFO: Staring Interface - ", _interface._name);
	
	// try{
	// 	await cleanPort(_interface.port);
	// }catch(e){
	// 	console.log(e);
	// }

	var runMode = getKwarg("mode");
	var logMode = runMode == "dev" ? "inherit" : "pipe";
	
	var _interfaceSubprocess = execa('npm', ['run','start'], {stdio: logMode});


	if(logMode == "pipe"){
		_interface.stdout = createInterfaceLogStream.stdout(_interface);
		_interface.stderr = createInterfaceLogStream.stderr(_interface);


		_interfaceSubprocess.stdout.pipe(_interface.stdout);
		_interfaceSubprocess.stderr.pipe(_interface.stderr);
	}

	process.nucleus.AtomInterfacesRunning.push(_interfaceSubprocess);
	// console.log("started interface");
}


var startEnv = (configPath=__dirname) => {
	if(!configPath){
		console.log("No config path provided");
	}	
	var configAbsDir = path.resolve(configPath);
	

	console.log("Info: ","starting interfaces in config");

	// console.log("process.nucleus = ", process.nucleus);

	process.nucleus.init(configAbsDir, process);
	process.nucleus.initEnvLogsDir(process);

	process.nucleus.AtomInterfacesDefined.forEach((_interface)=>{
		startInterface(_interface);
	});

	console.log("started atom env...");
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

module.exports = startEnv;