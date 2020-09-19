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

const AtomInterface = require('atom').Interface;

// var msgCount = 0;

const InterfaceSpecs = {
  name: "@atom/introspective.interface",
  config: {
    port: 6667,
    lexicon: {}
  }
}

global.component = {};

const _interface = new AtomInterface(InterfaceSpecs);
_interface.advertiseAndActivate();

var sendMessageCLI = (interfaceLabel) => {
	console.log("\n");
	rl.question("message? ", (message) => {
		message.sender = InterfaceSpecs.name;
		var signalStatus = AtomSignal.publishToInterface(interfaceLabel);
		console.log("SignalStatis = ", signalStatus);
		sendMessageCLI(interfaceLabel);
	});
}

var selectInterfaceCLI = () => {
	rl.question("Interface to interact with?", (interfaceLabel) => {
		sendMessageCLI(interfaceLabel);
	});
}

var startIntrospectiveInterfaceCLI = async () => {
	await AtomNucleus.getAllAdvertisedInterfaces();

	selectInterfaceCLI();

	rl.on("close", function() {
	    process.exit(0);
	});	
}


module.exports = startIntrospectiveInterfaceCLI;