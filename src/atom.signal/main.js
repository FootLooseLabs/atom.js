var zmq = require("zeromq");
const kill = require('kill-port');

const Nucleus = require('atom').Nucleus;


function AtomSignal(options){
   	if(!options){
    	throw "Error: no options specified";
   	}
   	if(!options.port){
    	throw "Error: no Port specified in options";
   	}

   	this.defaultPayload = {
   		"data": "example payload (any valid jsonfiable obect)"
   	}

	this.sock = zmq.socket("pub");
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
	this.host = this.host || "127.0.0.1";
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
		if(typeof payload == "string"){ //case of cli - the json inputs are already string
			this.sock.send([topic, payload]);
		}else{
			console.log("stringifying payload");
			this.sock.send([topic, JSON.stringify(payload)]);
		}
		this.wavelets.push({topic: topic, payload: payload, timestamp: Date.now()});
		console.log("Info: sent signal wavelet = ", `${payload}`, `to - ${this.address}:::${topic}`);
	}catch(e){
		throw `Error: ${e.message}`
	}
}


AtomSignal.publishToInterface = (interfaceAddress, topic, message) => {
	console.log("publishing to ", `Atom.Interface:::${interfaceAddress}`, ", topic = ", topic, ", & msg = ", message);
	var interface = Nuclues.getInterface(serviceName);
	if(!interface){
		console.log("404: Not Found - ", `Atom.Interface:::${interfaceAddress}`);
		return false;
	}
	// console.log("connections = ", Publisher.connections);
	var signal = new AtomSignal({
	  interface: interface
	})
	// var socket = Publisher.connections[serviceName];
	try{
		// publishToSocket(socket,interfaceName,message);
		signal.sendWavelet(apiName, message);
		return true
	}catch(e){
		return false;
	}
}


module.exports = AtomSignal