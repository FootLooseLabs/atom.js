// const RedisServer = require('redis-server');
// const kill = require('kill-port');


const path = require("path");
const { exec, execSync } = require("child_process");
const execa = require('execa');

var pm2 = require('pm2');
const ora = require('ora');

const DAEMON_DIR = path.join(__dirname, '../daemons/nucleusEnvDaemon.js'); 
const _PROGRAM_NAME = "@Atom.NucleusDaemon";

var startSyncNucluesDaemon = (cb=()=>{}) => {
	process.title = `Atom.Nucleus`;
	console.log("starting atom.nucleus daemon");

	try{
		execSync(`sudo pm2 stop ${_PROGRAM_NAME};`);
	}catch(e){
	}

	pm2.connect(function(err) {
		pm2.start({
			name: `${_PROGRAM_NAME}`,
		    script : `${DAEMON_DIR}`,         // Script to be run
		    exec_mode : 'fork',        // Allows your app to be clustered
		    // instances : 4,                // Optional: Scales your app by 4
		    max_memory_restart : '200M'   // Optional: Restarts your app if it reaches 100Mo
		}, function(err, proc) {
		    if (err) {throw err;}

		    console.log(`## Strated ${_PROGRAM_NAME}.##`);

		    var spinner = ora('arbitarily waiting for 3s for atom.nucleus redis-server to be ready...').start();
			spinner.color = 'yellow';

			setTimeout(()=>{
				spinner.stop();
				console.info("executing the callback provided...")
				cb();
				spinner.stop();
				pm2.disconnect();
			},3000);
		});
	});

	// var stdout = execSync(`sudo pm2 start ${DAEMON_DIR} --name ${_PROGRAM_NAME}`);

	// subprocess.on("atom-nucleus-daemon-started", ()=>{
		// console.log(stdout.toString());
		// console.log("## atom-nucleus-daemon-started ##");


	// 	if(cb){
	// 		cb();
	// 	}
	// });

	// if(cb){
	// 	var spinner = ora('waiting aribiratrily for 3s for atom.nucleus to be ready...').start();
	// 	spinner.color = 'yellow';
	// 	setTimeout(()=>{
	// 		spinner.stop();
	// 		console.info("executing the callback provided...")
	// 		cb();
	// 	},3000);
	// }
	// console.debug("DONE:");
	// console.debug("DEBUG: subprocess = ", subprocess);
	// var diont = require('diont')({
	// 	broadcast: true
	// });
	// NucleusDaemon(diont);
}

// var handleInterrupts = function(signalEv) {
//   	console.log(`Info: Received Interrupt = ${signalEv}`);
// 	server.close((err) => {
// 	  if (err === null) {
// 	    console.log("Info: atom.Nucleus shutdown properly")
// 	  }
// 	  throw `Error: ${err.message}`
// 	});
// 	process.exit();
// }

// process.on('SIGINT', handleInterrupts);
// process.on('SIGTERM', handleInterrupts);

// process.on('exit', handleInterrupts);

module.exports = startSyncNucluesDaemon;