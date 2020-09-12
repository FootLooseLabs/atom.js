var zmq = require("zeromq");
const kill = require('kill-port');

// const Nucleus = require('atom').Nucleus;
const Nucleus = require('../atom.nucleus/main');


function AtomSignal(options){
   	if(!options){
    	throw "Error: no options specified";
   	}
   	if(!options.interface && !options.port){
    	throw "Error: either Interface Spec or Port needs to be specified (missing both in options)";
   	}

   	this.defaultPayload = {
   		"data": "example payload (any valid jsonfiable obect)"
   	}

	this.sock = zmq.socket("pub");

	this.interface = options.interface;
	this.port = options.port;
	this.host = options.host;

	this.wavelets = [];
	this.config = {
		bufferSize: 10
	}
	// var _payload = process.argv[4] || {
	// 	name: "ankur",
	// 	email: "ankur@footloose.io",
	// 	_type: "drona-hmi-demo-susbcriber"
	// };
	this.__init__();
}


AtomSignal.prototype.__init__ = function() {
	if(this.interface){
		this.host = this.interface.host;
		this.port = this.interface.port;
	}else{
		this.host = this.host || "127.0.0.1";
	}
	this.address = `tcp://${this.host}:${this.port}`;
	this._connect();
}
// var testInterval = process.argv[5] || 3000;

// setInterval(function() {
  
// }, testInterval);


AtomSignal.prototype._connect = function() {
	try{
		this.sock.connect(this.address);
		console.log(`Info: Signal ready to send wavelets to - ${this.address}`);
	}catch(e){
		throw `Error: ${e.message}`
	}
}

// function discoverAndConnect(cmpLabel=cmpLabel) {
// 	diont.on("serviceAnnounced", function(serviceInfo) {
// 		// A service was announced
// 		// This function triggers for services not yet available in diont.getServiceInfos()
// 		// serviceInfo is an Object { isOurService : Boolean, service: Object }
// 		// service.name, service.host and service.port are always filled
// 		console.log("A new service was announced", serviceInfo.service);
// 		// List currently known services
// 		console.log("All known services", diont.getServiceInfos());
// 	});
// }


// function discover(port=_port) {
// 	sock.bindSync(`tcp://127.0.0.1:${port}`);
// 	console.log(`Pubber bound to port ${port}`);
// }



AtomSignal.prototype.sendWavelet = function(topic, payload){
	var payload = payload || this.defaultPayload;
	try{
		if(typeof payload != "string"){ //case of cli - the json inputs are already string
			console.log("stringifying payload");
			payload = JSON.stringify(payload);
		}
		this.sock.send([topic, payload]);
		this.wavelets.push({"topic": topic, "payload": payload, "timestamp": Date.now()});
		console.log("Info: sent signal wavelet = ", `${payload}`, `to - ${this.address}:::${topic}`);
	}catch(e){
		throw `Error: ${e.message}`
	}
}


AtomSignal.publishToInterface = async (interfaceLabel, message) => {

	return new Promise(async (resolve, reject)=>{

		var status = {op: interfaceLabel, error : false, message: "", statusCode: 0};

		if(!interfaceLabel){
			status.error = "Error:", "No interface label provided";
			console.log(status.error);
			reject();
		}
		
		var [interfaceAddress, topic] = interfaceLabel.split(":::");

		interfaceAddress = `Atom.Interface:::${interfaceAddress}`;


		console.log("publishing to ", `${interfaceAddress}:::${topic}`, ", msg = ", message);

		var interface = await Nucleus.getInterface(interfaceAddress);

		if(!interface){
			status.error = "404: Not Found - ", `${interfaceAddress}`;
			status.statusCode = -1;
			console.log(status.error);
			reject(status);
		}
		try{
			var interfaceSpec = JSON.parse(interface);
		}catch(e){
			status.error = "Error: Atom.Signal: error parsing interfaceSpec - ", e;
			status.statusCode = -1;
			console.log(status.error);
			reject(status);
		}
		// console.log("\n-------------------------\n");
		// console.log("INTERFACE === ", JSON.parse(interface).name);
		// console.log("\n-------------------------\n");
		// console.log("connections = ", Publisher.connections);
		var signal = new AtomSignal({
		  interface: interfaceSpec
		})
		// var socket = Publisher.connections[serviceName];
		setTimeout(()=>{ 
		// without setTimeout the socket is not ready by the time sendWavelet is fired 
		// (also tried sock._zmq.onSendReady - but doesn't seem to fire)
		// this approach is unreliable - tba a reliable approach.
			try{
				// publishToSocket(socket,interfaceName,message);
				signal.sendWavelet(topic, message);
				status.error = false;
				status.message = "signal sent";
				status.statusCode = 1;

				resolve(status)
			}catch(e){
				status.error = e;
				status.statusCode = -1;

				reject(status)
			}
		},100);
	});
}


module.exports = AtomSignal