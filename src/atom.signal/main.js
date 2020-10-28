var events = require("events");

var zmq = require("zeromq");
const kill = require('kill-port');

// const Nucleus = require('atom').Nucleus;
const Nucleus = require('../atom.nucleus/main');

const chalk = require('chalk');


const INTERFACE_PREFIX = "Atom.Interface:::";


const LEXICON = require("./base_lexicon");

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

   	this.labelPrefix = "AtomSignal:::";

	this.interface = options.interface;
	this.port = options.port;
	this.host = options.host;

	this.channel = options.channel;

	this.isSubscriber = options.isSubscriber;

	if(this.isSubscriber==true){
   		this.sock = zmq.socket("sub");
   		this.port = options.eventsPort;
   	}else{
		this.sock = zmq.socket("pub");
	}

	this.wavelets = [];
	this.config = {
		bufferSize: 10
	}
	// var _payload = process.argv[4] || {
	// 	name: "ankur",
	// 	email: "ankur@footloose.io",
	// 	_type: "drona-hmi-demo-susbcriber"
	// };

	this.eventEmitter = new events.EventEmitter();

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
	this.signalType = this.isSubscriber == true ? "subscriber" : "publisher";
	this._connect();
}
// var testInterval = process.argv[5] || 3000;

// setInterval(function() {
  
// }, testInterval);


AtomSignal.prototype.getLabel = function() {
	return `${this.labelPrefix}${this.signalType}<--->${this.address}`
}


AtomSignal.prototype._connect = function() {
	try{
		this.sock.connect(this.address);
		if(this.isSubscriber == true){
			console.log(`Info: Signal ready to receive wavelets from - ${this.address}`);
		}else{
			console.log(`Info: Signal ready to send wavelets to - ${this.address}`);
		}
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



AtomSignal.prototype.sendWavelet = function(channel, payload){
	var payload = payload || this.defaultPayload;
	try{
		if(typeof payload != "string"){ //case of cli - the json inputs are already string
			console.debug("AtomSignal sendWavelet - stringifying payload");
			payload = JSON.stringify(payload);
		}
		this.sock.send([channel, payload]);
		this.wavelets.push({"channel": channel, "payload": payload, "timestamp": Date.now()});
		console.log(`Info: ${this.getLabel()} published wavelet = `, `${channel}:::${payload}`);
	}catch(e){
		throw `Error: ${e.message}`
	}
}


AtomSignal.constructFromSpec = async (signalSpec) => {
	return new Promise(async (resolve, reject)=>{
		var signal;
		var status = LEXICON.SignalStatus.inflect({
			op: signalSpec.get().targetInterfaceLabel,
			error : false,
			message: "",
			statusCode: 0
		});

		if(!signalSpec.get().targetInterfaceLabel){
			status.update({
				error: "Error: No interface label provided"
			})
			console.log(status.get().error);
			reject(status.get());
			return;
		}
		
		var [interfaceAddress, channel] = signalSpec.get().targetInterfaceLabel.split(":::");

		signalSpec.update({
			channel : channel
		})

		var interfaceAddressWithPrefix = `${INTERFACE_PREFIX}${interfaceAddress}`;

		console.debug(`Atom.Signal (type=${signalSpec.get().signalType}) being setup with - `, `${interfaceAddressWithPrefix}:::${channel}`);

		try{
			var interfaceSpec = await Nucleus.getInterfaceIfActive(interfaceAddressWithPrefix);
		}catch(err){
			status.update({
				error: err.message,
				message: `AtomSignal: Error finding ${interfaceAddressWithPrefix} - it is not available or running.`,
				statusCode: -1
			});
			console.error(status.get().message);
			reject(status.get());
			return;
		};

		if(!interfaceSpec){ //case when atom.nucleus is not running
			let err = `AtomSignal: Error finding ${interfaceAddressWithPrefix} - probably Atom.Nucleus is not running.`;
			status.update({
				error: err,
				message: err,
				statusCode: -1
			});
			console.error(status.get().message);
			reject(status.get());
			return;
		}

		try{
			signal = new AtomSignal({
			  interface: interfaceSpec,
			  isSubscriber: signalSpec.get().signalType == "subscriber" ? true : false,
			  channel: channel
			})
			status.update({
				error: null,
				message: `AtomSignal: Successfully Establised Signal with ${interfaceAddressWithPrefix}`,
				statusCode: 1,
				signal : signal
			});
			console.debug(status.get().message)
			resolve(status.get());
		}catch(e){
			status.update({
				error: e.message,
				message: `AtomSignal: Error establishing signal with ${interfaceAddressWithPrefix}`,
				statusCode: -1
			});
			console.error(status.get().message);
			reject(status.get());
			return;
		}

	});
}

AtomSignal.publishToInterface = async (interfaceLabel, message, lexeme) => {
	var signalSpec = LEXICON.SignalSpec.inflect({
		targetInterfaceLabel: interfaceLabel,
		signalType: "publisher"
	});

	try{
		var establishedSignalStatus = await AtomSignal.constructFromSpec(signalSpec);
	}catch(e){
		throw e;
	}

	console.debug(`AtomSignal: Established Signal = ${establishedSignalStatus}`);

	return new Promise(async (resolve, reject)=>{
		var signal = establishedSignalStatus.signal;

		setTimeout(()=>{ 
		// without setTimeout the socket is not ready by the time sendWavelet is fired 
		// (also tried sock._zmq.onSendReady - but doesn't seem to fire)
		// this approach is unreliable - tba a reliable approach.
			try{
				if(lexeme){
					let inflection = lexeme.inflect(message);
					message = inflection.getWithLabel();
				}
				signal.sendWavelet(signal.channel, message);

				let status = LEXICON.SignalStatus.inflect({
					error: false,
					message: `${signal.getLabel()} published wavelet`,
					statusCode: 2,
					signal: signal
				});		
				resolve(status.get());
				return;
			}catch(e){
				let status = LEXICON.SignalStatus.inflect({
					error: e.message,
					message: `Error: ${signal.getLabel()} publishing wavelet - e.message`,
					statusCode: -1
				});
				status.error = e;
				status.statusCode = -1;

				reject(status);
				return;
			}
		},100);
	});
}






AtomSignal.subscribeToInterface = async (interfaceLabel) => {

	var signalSpec = LEXICON.SignalSpec.inflect({
		targetInterfaceLabel: interfaceLabel,
		signalType: "subscriber",
	});

	try{
		var establishedSignalStatus = await AtomSignal.constructFromSpec(signalSpec);
	}catch(e){
		throw e;
	}

	console.debug(`AtomSignal: Established Signal = ${establishedSignalStatus}`);

	return new Promise(async (resolve, reject)=>{

		var signal = establishedSignalStatus.signal;

		signal.sock.subscribe(signal.channel);

		signal.sock.on("message", async (_topicName, message) => {
		    console.log(chalk.yellow(`${signal.getLabel()} - 
		      received a message related to:
		      ${_topicName.toString()}, 
		      containing message:
		      ${message.toString()}`
		    ));

		    if(_topicName==signal.channel){
		    	signal.eventEmitter.emit(_topicName, message);
		    }
		});

		let msg = `${signal.getLabel()} is active`;
		let status = LEXICON.SignalStatus.inflect({
			error: false,
			message: msg,
			statusCode: 2,
			signal: signal
		});

		console.debug(msg);
		resolve(status.get());
		return;
	});
}

module.exports = AtomSignal