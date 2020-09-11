// // const RedisServer = require('redis-server');
// // const kill = require('kill-port');


const path = require("path");
const { execSync } = require("child_process");



var startNucluesDaemon = () => {
	console.log("starting atom.nucleus");

	execSync(`node ${path.join(__dirname, '../nucleusDaemon.js')}`, {stdio: 'inherit'});
	console.log("done");
	// var diont = require('diont')({
	// 	broadcast: true
	// });
	// NucleusDaemon(diont);
}

// // var handleInterrupts = function(signalEv) {
// //   	console.log(`Info: Received Interrupt = ${signalEv}`);
// // 	server.close((err) => {
// // 	  if (err === null) {
// // 	    console.log("Info: atom.Nucleus shutdown properly")
// // 	  }
// // 	  throw `Error: ${err.message}`
// // 	});
// // 	process.exit();
// // }

// // process.on('SIGINT', handleInterrupts);
// // process.on('SIGTERM', handleInterrupts);

// // process.on('exit', handleInterrupts);

module.exports = startNucluesDaemon;