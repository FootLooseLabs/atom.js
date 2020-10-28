const path = require("path");
var inquirer = require('inquirer');
const readline = require("readline");
const execa = require('execa');

const chalk = require('chalk');

const ora = require('ora');

const AtomNucleus = require('atom').Nucleus;
const AtomSignal = require('atom').Signal; //assumes (as requires) that atom js-sdk is globally installed on the system this is being run

var introspectiveInterfaceCli;

const IntrospectiveInterfaceSpecs = require("../daemons/introspective-interface/interface_specs");
var _InterfaceSubprocess;


var setupCli = (_subprocess) => {
	introspectiveInterfaceCli = readline.createInterface({
	    input: process.stdin,
	    output: process.stdout,
	    terminal: true
	})
	.on('SIGINT', () => process.emit('SIGINT'))
	.on('SIGTERM', () => process.emit('SIGTERM'));

	introspectiveInterfaceCli.on("close", function() {
	    process.exit(0);
	});
}

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
	// await _InterfaceSubprocess.stdout.pipe(process.stdout);
	console.log("\n");
	// console.log("SignalStatus = ", signalStatus);
	introspectiveInterfaceCli.question("Select a Lexeme for communication from the above list? ", (lexemeLabel) => {
		promptSendMessageCLI(`${interfaceLabel}:::${lexemeLabel}`);
	});
}

var promptSelectInterfaceCLI = async () => {
	var interfaces = await AtomNucleus.getAllInterfaceActivity();
	console.log("Interfaces: ", interfaces);

	setupCli(_InterfaceSubprocess);

	introspectiveInterfaceCli.question("Interface to interact with (from the list above) ?", (interfaceLabel) => {
		console.debug("Selected interface - ", interfaceLabel);
		promptSelectLexemeCLI(interfaceLabel);
	});
}

var startIntrospectiveInterfaceCLI = async () => {
	// _IntrospectiveInterface = require('../introspective_interface');
	// _IntrospectiveInterface.advertiseAndActivate();
	_InterfaceSubprocess = execa('nodemon', ['--exec','node',`${path.join(__dirname, '../daemons/introspective-interface/daemon.js')}`], {stdio: 'pipe'})
	
	_InterfaceSubprocess.stdout.pipe(process.stdout);
	_InterfaceSubprocess.stdin.pipe(process.stdin);
	console.log("started introspective interface");
	var spinner = ora('please wait for 2s').start();
	spinner.color = 'yellow';

	setTimeout(()=>{ //tba - better way to find out when self (interface) is announced/advertised as well 
		spinner.stop();
		// setupCli(_InterfaceSubprocess);
		promptSelectInterfaceCLI()
	},2000);
}


module.exports = startIntrospectiveInterfaceCLI;