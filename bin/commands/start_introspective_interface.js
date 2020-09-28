const path = require("path");
const readline = require("readline");
const execa = require('execa');

const introspectiveInterfaceCli = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})
.on('SIGINT', () => process.emit('SIGINT'))
.on('SIGTERM', () => process.emit('SIGTERM'));

const chalk = require('chalk');

const AtomNucleus = require('atom').Nucleus;
const AtomSignal = require('atom').Signal; //assumes (as requires) that atom js-sdk is globally installed on the system this is being run

const IntrospectiveInterfaceSpecs = require("../introspective_interface_specs");
var _InterfaceSubprocess;

var promptSendMessageCLI = (interfaceLexemeLabel) => {
	console.log("\n");
	introspectiveInterfaceCli.question("message? ", async (message) => {
		message.sender = IntrospectiveInterfaceSpecs.name;
		var signalStatus = await AtomSignal.publishToInterface(interfaceLexemeLabel, message);
		console.log("SignalStatuss = ", signalStatus);
		promptSendMessageCLI(interfaceLexemeLabel);
	});
}

var promptSelectLexemeCLI = async (interfaceLabel) => {
	console.log("\n\n");
	let message = {sender: IntrospectiveInterfaceSpecs.name}
	var signalStatus = await AtomSignal.publishToInterface(`${interfaceLabel}:::GetIntro`, message);
	await _InterfaceSubprocess.stdout.pipe(process.stdout);
	console.log("\n");
	// console.log("SignalStatus = ", signalStatus);
	introspectiveInterfaceCli.question("Select a Lexeme for communication from the above list? ", (lexemeLabel) => {
		promptSendMessageCLI(`${interfaceLabel}:::${lexemeLabel}`);
	});
}

var promptSelectInterfaceCLI = async () => {
	var interfaces = await AtomNucleus.getAllInterfaceActivity();
	console.log("Interfaces: ", interfaces);

	introspectiveInterfaceCli.question("Interface to interact with (from the list above) ?", (interfaceLabel) => {
		promptSelectLexemeCLI(interfaceLabel);
	});
}

var startIntrospectiveInterfaceCLI = async () => {
	// _IntrospectiveInterface = require('../introspective_interface');
	// _IntrospectiveInterface.advertiseAndActivate();
	_InterfaceSubprocess = execa('nodemon', ['--exec','node',`${path.join(__dirname, '../introspective_interface_daemon.js')}`], {stdio: 'pipe'})
	console.log("started introspective interface");

	promptSelectInterfaceCLI();

	introspectiveInterfaceCli.on("close", function() {
	    process.exit(0);
	});
}


module.exports = startIntrospectiveInterfaceCLI;