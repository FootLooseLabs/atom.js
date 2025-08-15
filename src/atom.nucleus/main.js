//PENDING - restart all atom.interfaces running - upon Nucleus RESTART// var Etcd = require('node-etcd');
const redis = require("redis");

const chalk = require('chalk');

const AtomNucleus = require("./manageEnv");

AtomNucleus.readystate = AtomNucleus.READYSTATES["LOADING"];
AtomNucleus.diont = require('diont')();


AtomNucleus.redisClient = redis.createClient();

AtomNucleus.redisClient.on('connect', function () {
    console.log('AtomNucleus redisClient connected');
    AtomNucleus.readystate = AtomNucleus.READYSTATES["READY"];;
    AtomNucleus.emit("ready", AtomNucleus);
});


AtomNucleus.redisClient.on("error", function(err) {
	console.error(`${chalk.red("ERROR: Atom.Nucleus is not running")} - \n ( to start atom.nuclueus please run: ${chalk.blue("atom -s")} )`);
	// console.warn("is emit a function - ", AtomNucleus.emit);
	try{
		AtomNucleus.readystate = AtomNucleus.READYSTATES["ERRORED"];;
		AtomNucleus.emit("error", err);
	}catch(err){
		process.exit(); //not happening - pending debug of listenerCount err.
	}
});


AtomNucleus.getAllAdvertisedInterfaces  = (pattern, logLevel=1) => { //unreliable (doesn't return proper results if many keys)

	console.log("Atom.Nucleus:::Info: ", "Discovering Interfaces in the Environment...");
	// AtomNucleus.redisClient.get(interfaceAddress, redis.print);
	// console.log("-------------------------------");
	var pattern = pattern || 'Atom.Interface:::*';
	return new Promise((resolve, reject)=>{
		if(!AtomNucleus.redisClient.connected){
			let err = "Atom.Nucleus is not running";
			reject(err);
			return;
		}

		var cursor = '0';

		function scan () {
		    AtomNucleus.redisClient.scan(
		        cursor,
		        'MATCH', pattern,
		        'COUNT', '100',
		        function (err, res) {
		            if (err) {
		            	console.log("Atom.Nucleus:::Error Discovering Interfaces - ", err);
		            	reject(err);
		            	return;
		            };
		            cursor = res[0];
		            var keys = res[1];

		            if (cursor === '0') {
		            	if(logLevel>1){
		            		console.log('Atom.Nucleus:::Discovered Interfaces - \n', keys);
		            	}
		                resolve(keys);
		                return;
		            }

		            return scan();
		        }
		    );
		}
		scan();
	});
}

AtomNucleus.getInterfaceInfo = (interfaceLabel) => {

	return new Promise((resolve, reject) => {
		if(!AtomNucleus.redisClient.connected){
			// console.error("Atom.Nucleus redisClient is not running ***************** ", AtomNucleus.redisClient);
			let err = "Atom.Nucleus is not running";
			reject(err);
			return;
		}
		AtomNucleus.redisClient.get(interfaceLabel, function(err, res) {
			if (err) {
	        	console.log("Atom.Nucleus:::Error finding Interface - ", interfaceLabel);
	        	reject(err);
	        	return;
	        };
	        // console.log("Interface Info: ", JSON.stringify(res));
	        try{
	        	let interface = JSON.parse(res);
	        	resolve(interface);
	        	return;
	        }catch(e){
	        	let err = `found invalid interface description - ${e.message}`
	        	reject(Error(err));
	        	return;
	        }
		  	return;
		});
	})
}

AtomNucleus.getAllInterfaceActivity = async (logLevel=1) => { //ISSUE: if improper shutdown/ system shutdown - running status is not updated (running: true still shows true)
	// console.log("getAllInterfaceActivity called 0");

	// if(!AtomNucleus.redisClient.connected){
	// 	return;
	// }

	// console.log("getAllInterfaceActivity called 1");
	var interfaceList = [];

	try{
		var interfaceLabels = await AtomNucleus.getAllAdvertisedInterfaces();
	}catch(e){
		console.log("AtomNucleus:::Error: ",e);
		throw e;
	}
	
	for (let i = 0; i < interfaceLabels.length; i++) {
		try{
			let _interfaceInfo = await AtomNucleus.getInterfaceInfo(interfaceLabels[i]);
			// console.log("_interfaceInfo = ", _interfaceInfo);
	        interfaceList.push({
	        	"name": _interfaceInfo.name,
	        	"running": _interfaceInfo.running
	        });
	    }catch(e){
	    	console.log("AtomNucleus:::Error: ",e);
	    }
    }
	// _interfaces.map(async (interfaceLabel) => {
		
	// });

	// console.log("interfaceList = ", interfaceList);
	return interfaceList;
}


AtomNucleus.announceInterface = (ad)=>{
	// if(!AtomNucleus.redisClient){
	// 	return;
	// }

	AtomNucleus.diont.announceService(ad);

	// let _label = `AgentActivated:::${ad.label}`;

	
	// AtomNucleus.emit(`${_label}`,ad);

	// console.debug("~~~~~~~~~~~~~~DEBUG ATOM.NUCLEUS EMITTING EVENT : ", `${_label}`);

	AtomNucleus.diont.on("serviceAnnounced", function(serviceInfo) {
		let _label = `AgentActivated:::${serviceInfo.service.label}`;
		setTimeout(()=>{AtomNucleus.emit(`${_label}`, serviceInfo.service)},200);;
	});
}


AtomNucleus.renounceInterface = (ad)=>{
	// if(!AtomNucleus.redisClient){
	// 	return;
	// }

	// console.log("Atom.Nucleus:::Info: AtomNucleus: ", "Renouncing Interface - ", ad);
	AtomNucleus.diont.renounceService(ad);
	// AtomNucleus.emit(`AgentDeactivated:::${ad.label}`,ad);
}



AtomNucleus.getInterfaceIfActive = (interfaceLabel) => {

	console.log("Atom.Nucleus:::Info: ", "Finding Interface = ", interfaceLabel);
	// AtomNucleus.redisClient.get(interfaceLabel, redis.print);
	// console.log("-------------------------------");
	return new Promise(async (resolve, reject)=>{
		if(!AtomNucleus.redisClient.connected){
			// console.error("Atom.Nucleus redisClient is not running ****#######************* ", AtomNucleus.redisClient);
			let err = "Atom.Nucleus is not running";
			reject(err);
			return;
		}
		var interface;
		try{
			interface = await AtomNucleus.getInterfaceInfo(interfaceLabel)
		}catch(e){
			console.log("AtomNucleus:::Error: ",e);
			reject(e);
			return;
		}

		if(!interface){
			let err = `404 : ${interfaceLabel} not found`;
			reject(err);
			return;	
		}

		// console.log("***********Interface - ", interface);

		if(!interface.running){
			let err = `405: ${interfaceLabel} is Not Active`;
			reject(err);
			return;
		}
		resolve(interface);
	});
}

AtomNucleus.readystate = AtomNucleus.READYSTATES["INTERACTIVE"];;
module.exports = AtomNucleus;