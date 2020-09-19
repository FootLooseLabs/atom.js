const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})
.on('SIGINT', () => process.emit('SIGINT'))
.on('SIGTERM', () => process.emit('SIGTERM'));

const chalk = require('chalk');

const AtomNucleus = require('atom').Nucleus;
const AtomSignal = require('atom').Signal; //assumes (as requires) that atom js-sdk is globally installed on the system this is being run

var SignalSpec = {
	host: "127.0.0.1",
	port: null
}

var MessageSpec = {
	topic: null,
	payload: null
}

var sendWaveletCLI = (_signal) => {
	console.log("\n");
	console.log(`[${_signal.wavelets.length}.] send signal wavelets -->`);
	rl.question("topic? ", (topic) => {
    	MessageSpec.topic = topic;
    	rl.question("message? ", (message) => {
    		MessageSpec.message = message;
    		_signal.sendWavelet(MessageSpec.topic, MessageSpec.message);
    		sendWaveletCLI(_signal);
    	});
    });
}

var sendAtomSignalCLI = () => {
	rl.question("port?", (portNo) => {
		SignalSpec.port = portNo;
		try{
			var _signal = new AtomSignal(SignalSpec);
		}catch(e){
			console.error(`Error: ${e}`);
		}
	   	sendWaveletCLI(_signal); 
	});

	rl.on("close", function() {
	    process.exit(0);
	});
} 

module.exports = sendAtomSignalCLI;