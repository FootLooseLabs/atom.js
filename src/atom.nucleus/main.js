var diont = require('diont')();
// var Etcd = require('node-etcd');
const redis = require("redis");


const AtomNucleus = {};

const redisClient = redis.createClient();


// class AtomNucleus {

//   	// constructor(){
// 	  //  if(!AtomNucleus.instance){
// 	  //    this._data = [];
// 	  //    AtomNucleus.instance = this;
// 	  //  }

// 	  //  this.initialise();
// 	  //  return AtomNucleus.instance;
//   	// }

//   	static initialise() {
// 		this.redisClient = redis.createClient();
		 
// 		this.redisClient.on("error", function(err) {
// 		  throw `Error: ${err}`;
// 		});

// 		this.handleAdvertisements();
// 		console.log("Info: AtomNucleus setup done");
//   	}

//   	handleAdvertisements() {
//   		// ======
// 		// Listen for announcements and renouncements in services
// 		// ======
// 		diont.on("serviceAnnounced", function(serviceInfo) {
// 			// A service was announced
// 			// This function triggers for services not yet available in diont.getServiceInfos()
// 			// serviceInfo is an Object { isOurService : Boolean, service: Object }
// 			// service.name, service.host and service.port are always filled
// 			// etcd.set(serviceInfo.name, serviceInfo);
// 			console.log("A new service was announced", serviceInfo.service);
// 			// List currently known services
// 			this.redisClient.set(`AtomInterface:::${serviceInfo.service.label}`, "value", serviceInfo.service);
// 			console.log("All known services", diont.getServiceInfos());
// 		});

// 		diont.on("serviceRenounced", function(serviceInfo) {
// 			console.log("A service was renounced", serviceInfo.service);
// 			console.log("All known services", diont.getServiceInfos());
// 		});	
//   	}

// }


AtomNucleus.getAllAdvertisedInterfaces  = (pattern) => { //unreliable (doesn't return proper results if many keys)

	console.log("Info: ", "Discovering Interfaces in the Environment...");
	// redisClient.get(interfaceAddress, redis.print);
	// console.log("-------------------------------");
	var pattern = pattern || 'Atom.Interface:::*';
	return new Promise((resolve, reject)=>{
		var cursor = '0';

		function scan () {
		    redisClient.scan(
		        cursor,
		        'MATCH', pattern,
		        'COUNT', '100',
		        function (err, res) {
		            if (err) {
		            	console.log("Error Discovering Interfaces - ", err);
		            	reject(err);
		            	return;
		            };
		            cursor = res[0];
		            var keys = res[1];

		            if (cursor === '0') {
		            	console.log('Discovered Interfaces - \n', keys);
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


AtomNucleus.announceInterface = (ad)=>{
	diont.announceService(ad);
}


AtomNucleus.renounceInterface = (ad)=>{
	console.log("Info: AtomNucleus: ", "Renouncing Interface - ", ad);
	diont.renounceService(ad);
}

AtomNucleus.getInterface = (interfaceAddress) => {
	console.log("Info: ", "Finding Interface = ", interfaceAddress);
	// redisClient.get(interfaceAddress, redis.print);
	// console.log("-------------------------------");
	return new Promise((resolve, reject)=>{
		var interface = redisClient.get(interfaceAddress, (err, res)=>{
			// console.log("ERR: = ", err);
			// console.log("RES: = ", res);
			if(err){
				console.log("Info: ", "Error finding interface = ", err);
				reject(err);
			}
			else{
				console.log("Info: ", "Found interface = ", res);
				resolve(res);
				return;
			}
		});
	});
}
// server.close((err) => {
//   // The associated Redis server is now closed.
// });

// var etcd = new Etcd();


module.exports = AtomNucleus;