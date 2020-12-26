const chalk = require('chalk');

// const AtomNucleus = require('atom').Nucleus;
const AtomSignal = require('atom').Signal;

var broadcast = async (broadcastString) => { //broadcastString format = @flpl/devops:::GetIntro:::{}
	process.nucleus.on("ready", async ()=>{
		console.log("\n");
		var targetInterfaceName,
			targetInterfaceOp,
			payload;

		try{
			[targetInterfaceName, targetInterfaceOp, payload] = broadcastString.split(":::");	
		}catch(e){
			console.error("ERROR: ", "couldnt parse broadcastString = ", broadcastString, ` ${e.message}`);
			console.log("exiting...");
			return;
		}

		if(!targetInterfaceName || !targetInterfaceOp){
			console.error("ERROR: ", "invalid targetInterfaceName or targetInterfaceOp = (", targetInterfaceName, ", ", targetInterfaceOp, ")");
			console.log("exiting...");
			return;
		}

	
		try{
			var signalStatus = await AtomSignal.publishToInterface(`${targetInterfaceName}:::${targetInterfaceOp}`, payload);
			if(!signalStatus.error){
	        	console.log("operation initiated");
	        }else{
	        	console.error("operation failed");
	        }
		}catch(e){
			console.error("Error: ", e);
		}

		process.exit(0)
	});
}


module.exports = broadcast;