const RedisServer = require('redis-server');
const kill = require('kill-port');
const AtomNuclues = require('atom').Nucleus;
// Simply pass the port that you want a Redis server to listen on.

const REDIS_PORT = 6379;
const server = new RedisServer(REDIS_PORT);


var startNucluesDaemon = () => {
	console.log("server is already running : ", server.isRunning);

	kill(REDIS_PORT).then(() => {
      	console.info("Info:", "closed port:", REDIS_PORT);
      	server.open((err) => {
			if (err != null) {
		  		throw `Error: ${err}`;
			}
			const instance = new AtomNuclues();
			Object.freeze(instance);
		});
    });
}


var handleInterrupts = function(signalEv) {
  	console.log(`Info: Received Interrupt = ${signalEv}`);
	server.close((err) => {
	  if (err === null) {
	    console.log("Info: atom.Nucleus shutdown properly")
	  }
	  throw `Error: ${err.message}`
	});
	process.exit();
}

process.on('SIGINT', handleInterrupts);
process.on('SIGTERM', handleInterrupts);

module.exports = startNucluesDaemon;