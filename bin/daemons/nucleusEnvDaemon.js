//PENDING - restart all atom.interfaces running - upon Nucleus RESTART

var events = require("events");

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


process.title = "Atom.NucleusDaemon";

const NucleusDaemon = {
	server: null,
	redisClient: null,
	diont: null
}
NucleusDaemon.diont = require('diont')({
	broadcast: true
});

NucleusDaemon.handleAdvertisements = function() {
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

		console.info(`Info: Atom.Nucleus: Saving advertisement - ${serviceInfo.service.label}`);

		console.debug("DEBUG: ", "NucleusDaemon.redisClient - ", NucleusDaemon.redisClient);

		NucleusDaemon.redisClient.set(`${serviceInfo.service.label}`, JSON.stringify(serviceInfo.service));
		// console.log("All known interfaces", NucleusDaemon.diont.getServiceInfos());
		console.log(chalk.yellow("Info: Atom.Nucleus: A new interface was announced", JSON.stringify(serviceInfo.service)));
	});

	NucleusDaemon.diont.on("serviceRenounced", function(serviceInfo) {
		serviceInfo.service.running = false;
		NucleusDaemon.redisClient.set(`${serviceInfo.service.label}`, JSON.stringify(serviceInfo.service));
		console.log(chalk.orange("Info: Atom.Nucleus: An existing interface was renounced", JSON.stringify(serviceInfo.service)));
		// console.log("All known interfaces", NucleusDaemon.diont.getServiceInfos());
	});
}


NucleusDaemon.startRedisServer = () => {

	return new Promise((resolve, reject) => {
		try{	
			NucleusDaemon.server = new RedisServer(CONFIG.REDIS_PORT);
			NucleusDaemon.server.open((err) => {
			  if (err) {
			  	console.log(`Error: ${err}`);
			    reject(err);
			    return;
			  }
			  console.log("Info: ", "started Atom.Nucleus redis server");
			  resolve(NucleusDaemon.server);
			  return;
			});
		}catch(e){
			console.log(`Error: ${e}`);
		}
	});
	// if(!NucleusDaemon.server){return;}
	// NucleusDaemon.server.open((err) => {
	// 	if (err != null) {
	//   		throw `Error: ${err}`;
	// 	}
	// 	console.log("Info: started Atom.Nucleus Redis Server");
	// });
}


NucleusDaemon.startRedisClient = () => {
	NucleusDaemon.redisClient = redis.createClient();
			
	NucleusDaemon.redisClient.on("error", function(err) {
	  console.log(`Error: NucleusDaemon.redisClient: ${err}`);
	});

	console.log("Info: ", "started Atom.Nucleus default client");
}

NucleusDaemon.cleanPorts = async () => {
	console.log("Info: cleaning atom.nucleus ports...");
	return new Promise((resolve, reject)=>{
		kill(CONFIG.REDIS_PORT).then(async () => {
	      	console.info("Info:", "cleaned port = ", CONFIG.REDIS_PORT);
	      	resolve(true);
	      	// kill(CONFIG.DIONT_PORT, 'udp').then(()=>{
	      	// 	console.info("Info:", "cleaned port = ", CONFIG.DIONT_PORT);
	      	// })
	    });
	});
}


NucleusDaemon.init = async () => {
	try{
		await NucleusDaemon.cleanPorts();
	}catch(e){
		console.error(chalk.red(`Error: failed to clean ports - ${e}`));
	}

	try{
		await NucleusDaemon.startRedisServer();
	}catch(e){
		console.error(chalk.red(`Error: failed to start redis server - ${e}`));
		throw e;
	}


	process.nextTick(() => {
		process.emit("atom-nucleus-daemon-started", true);
	});

	NucleusDaemon.handleAdvertisements();

	NucleusDaemon.startRedisClient();

	// process.emit("atom-nucleus-daemon-started", true);

	// console.log("Info: AtomNucleus running...");
}

NucleusDaemon.init();

process.stdin.resume();//so the program will not close instantly


var handleInterrupts = function(signalEv) {
  	console.log(`Info: Received Interrupt = ${signalEv}`);
  	if(NucleusDaemon.server){
		NucleusDaemon.server.close((err) => {
		  // if (err) {
		  // 	throw `Error: ${err.message}`
		  // }
		  console.log("Info: atom.Nucleus shutdown properly");
		});
	}
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
