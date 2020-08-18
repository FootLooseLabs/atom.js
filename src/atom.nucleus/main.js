var diont = require('diont')();
// var Etcd = require('node-etcd');
const redis = require("redis");

class AtomNucleus {

  	constructor(){
	   if(!AtomNucleus.instance){
	     this._data = [];
	     AtomNucleus.instance = this;
	   }

	   this.initialise();
	   return AtomNucleus.instance;
  	}

  	initialise() {
		this.redisClient = redis.createClient();
		 
		this.redisClient.on("error", function(err) {
		  throw `Error: ${err}`;
		});

		this.handleAdvertisements();
		console.log("Info: AtomNucleus setup done");
  	}

  	handleAdvertisements() {
  		// ======
		// Listen for announcements and renouncements in services
		// ======
		diont.on("serviceAnnounced", function(serviceInfo) {
			// A service was announced
			// This function triggers for services not yet available in diont.getServiceInfos()
			// serviceInfo is an Object { isOurService : Boolean, service: Object }
			// service.name, service.host and service.port are always filled
			// etcd.set(serviceInfo.name, serviceInfo);
			console.log("A new service was announced", serviceInfo.service);
			// List currently known services
			this.redisClient.set(`AtomInterface:::${serviceInfo.service.label}`, "value", serviceInfo.service);
			console.log("All known services", diont.getServiceInfos());
		});

		diont.on("serviceRenounced", function(serviceInfo) {
			console.log("A service was renounced", serviceInfo.service);
			console.log("All known services", diont.getServiceInfos());
		});	
  	}

}


AtomNucleus.getAllAdvertisedInterfaces  = () => {
	this.redisClient.keys("atomInteface__*", function(e, keys){
	    if(e)console.log(e);

	    keys.forEach(function (key) {
	        this.redisClient.get(key, function (err, value) {
	            console.log(value);
	        });
	    });
	});
}


AtomNucleus.announceInterface = (ad)=>{
	diont.announceService(ad);
}
// server.close((err) => {
//   // The associated Redis server is now closed.
// });

// var etcd = new Etcd();


module.exports = AtomNucleus;