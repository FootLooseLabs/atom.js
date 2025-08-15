const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})
.on('SIGINT', () => process.emit('SIGINT'))
.on('SIGTERM', () => process.emit('SIGTERM'));

const chalk = require('chalk');

const fdTracker = require("../lib/track-fds");

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

var AvailableAgents = [];

var SelectedAgent = null;

var listAvailableAgents = async () => {
	AvailableAgents = await AtomNucleus.getAllInterfaceActivity();
	console.log("Available Agent-Interfaces: ");
	AvailableAgents.forEach((_agent, idx)=>{
		console.log(`${idx+1}.)`, _agent);
	});
}

var sendWaveletCLI = () => {
	console.log("\n");
	rl.question("topic (lexeme)? ", (topic) => {
    	MessageSpec.topic = topic;
    	rl.question("message? ", async (message) => {
    		MessageSpec.message = message;

    		try{
    			var signalStatus = await AtomSignal.publishToInterface(`${SelectedAgent.name}:::${MessageSpec.topic}`, MessageSpec.message);
    			if(!signalStatus.error){
                	console.log("operation initiated");
                }else{
                	console.error("operation failed");
                }
    		}catch(e){
    			console.error("Error: ", e);
    		}
    		// _signal.sendWavelet(MessageSpec.topic, MessageSpec.message);
    		sendWaveletCLI();
    	});
    });
}

var sendAtomSignalCLI = () => {

	process.nucleus.on("ready", async ()=>{
        await listAvailableAgents();

        rl.question(`interface ( 1 -to- ${AvailableAgents.length} ) ?`, (selectedIdx) => {
			SelectedAgent = AvailableAgents[selectedIdx-1];
			// try{
			// 	var _signal = AtomSignal.publishToInterface()
			// 	// var _signal = new AtomSignal(SignalSpec);
			// }catch(e){
			// 	console.error(`Error: ${e}`);
			// }
		   	sendWaveletCLI(); 
		});

		rl.on("close", function() {
		    process.exit(0);
		});
    });
} 

module.exports = sendAtomSignalCLI;