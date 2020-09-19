const RedisServer = require('redis-server');
// var diont = require('diont')();
const kill = require('kill-port');
// var Etcd = require('node-etcd');
const redis = require("redis");

const chalk = require('chalk');

const CONFIG = {
	REDIS_PORT: 6379,
	DIONT_PORT: 60540
}


const NucleusDaemon = {
	server: null,
	redisClient: null,
	diont: null
}

var handleAdvertisements = function() {
	// ======
	// Listen for announcements and renouncements in services
	// ======
	NucleusDaemon.diont.on("serviceAnnounced", function(serviceInfo) {
		// A service was announced
		// This function triggers for services not yet available in diont.getServiceInfos()
		// serviceInfo is an Object { isOurService : Boolean, service: Object }
		// service.name, service.host and service.port are always filled
		// etcd.set(serviceInfo.name, serviceInfo);
		
		// List currently known services
		serviceInfo.service.running = true;

		console.log(`Info: Atom.Nucleus: Saving metadata on redis - ${serviceInfo.service.label}`, serviceInfo.service);
		NucleusDaemon.redisClient.set(`${serviceInfo.service.label}`, JSON.stringify(serviceInfo.service));
		// console.log("All known interfaces", NucleusDaemon.diont.getServiceInfos());
		console.log(chalk.yellow("Info: Atom.Nucleus: A new interface was announced", JSON.stringify(serviceInfo.service)));
	});

	NucleusDaemon.diont.on("serviceRenounced", function(serviceInfo) {
		serviceInfo.service.running = false;
		NucleusDaemon.redisClient.set(`${serviceInfo.service.label}`, JSON.stringify(serviceInfo.service));
		console.log(chalk.red("Info: Atom.Nucleus: An existing interface was renounced", JSON.stringify(serviceInfo.service)));
		// console.log("All known interfaces", NucleusDaemon.diont.getServiceInfos());
	});
}


var startRedisServer = () => {
	try{	
		NucleusDaemon.server = new RedisServer(CONFIG.REDIS_PORT);
		console.log("Info: ", "started Atom.Nucleus redis server");
	}catch(e){
		console.log(`Error: ${e}`);
	}
	// if(!NucleusDaemon.server){return;}
	// NucleusDaemon.server.open((err) => {
	// 	if (err != null) {
	//   		throw `Error: ${err}`;
	// 	}
	// 	console.log("Info: started Atom.Nucleus Redis Server");
	// });
}


var startRedisClient = () => {
	NucleusDaemon.redisClient = redis.createClient();
			
	NucleusDaemon.redisClient.on("error", function(err) {
	  console.log(`Error: NucleusDaemon.redisClient: ${err}`);
	});
}

var cleanPorts = async () => {
	console.log("Info: cleaning atom.nucleus ports...");
	return new Promise((resolve, reject)=>{
		kill(CONFIG.REDIS_PORT).then(() => {
	      	console.info("Info:", "cleaned port = ", CONFIG.REDIS_PORT);
	      	resolve(true);
	      	// kill(CONFIG.DIONT_PORT, 'udp').then(()=>{
	      	// 	console.info("Info:", "cleaned port = ", CONFIG.DIONT_PORT);
	      	// })
	      	
		    startRedisServer();

			startRedisClient();

			console.log("Info: AtomNucleus running...");
	    });
	});
}



cleanPorts();
NucleusDaemon.diont = require('diont')({
	broadcast: true
});
handleAdvertisements();



var handleInterrupts = function(signalEv) {
  	console.log(`Info: Received Interrupt = ${signalEv}`);
	NucleusDaemon.server.close((err) => {
	  if (err === null) {
	    console.log("Info: atom.Nucleus shutdown properly")
	  }
	  throw `Error: ${err.message}`
	});
	process.exit();
}

process.on('SIGINT', handleInterrupts);
process.on('SIGTERM', handleInterrupts);

process.on('exit', handleInterrupts);




// var diont = require('diont')({
// 	broadcast: true
// });
// // ======
// // Listen for announcements and renouncements in services
// // ======
// diont.on("serviceAnnounced", function(serviceInfo) {
// 	// A service was announced
// 	// This function triggers for services not yet available in diont.getServiceInfos()
// 	// serviceInfo is an Object { isOurService : Boolean, service: Object }
// 	// service.name, service.host and service.port are always filled
// 	console.log("A new service was announced", serviceInfo.service);
// 	// List currently known services
// 	console.log("All known services", diont.getServiceInfos());
// });

// diont.on("serviceRenounced", function(serviceInfo) {
// 	// A service available in diont.getServiceInfos() was renounced
// 	// serviceInfo is an Object { isOurService : Boolean, service: Object }
// 	// service.name, service.host and service.port are always filled
// 	console.log("A service was renounced", serviceInfo.service);
// 	// List currently known services
// 	console.log("All known services", diont.getServiceInfos());
// });
