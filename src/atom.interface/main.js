var zmq = require("zeromq");
const kill = require('kill-port');
// var diont = require('diont')();
var nucleus = require('../atom.nucleus/main');


global._instance = null;

function AtomCmpInterface (options){
  if (typeof component == 'undefined') {
    throw "Error: no component in scope";
  }
  if(!component){
    throw "Error: component is not an object";
  }
  if(!options){
    throw "Error: no options specified";
  }
  if(!options.name){
    throw "Error: no Name specified in options";
  }

  this.defaultConfig = {
    host: "127.0.0.1",
    port: 7993,
    apis: []
  }

  this.name = options.name;
  this.config = options.config || {};
  this.sock = null;
  this.middlewares = [];
  this.__init__();
};


AtomCmpInterface.prototype.__init__ = function() {
  this.config = {...this.defaultConfig, ...this.config};
  // this.config.host = this.config.host || "127.0.0.1";
  // this.config.port = this.config.port || 8888;
  // this.config.apis = this.config.apis || [];
  this.address = `tcp://${this.config.host}:${this.config.port}`;
  console.log("Info: ", "Initalising - ", `${this.name}@${this.address}`);
  this._initialiseSocket();
}

AtomCmpInterface.prototype._initialiseSocket = function() {
  this.sock = zmq.socket("sub");
  _instance = this;
  try{
    this.sock.bindSync(this.address);
    console.info("Info:", "Initalised - ", `${this.name}@${this.address}`);
  }catch(e){
    if(e.message.includes("already in use") && this.config.port == this.defaultConfig.port){
      console.log("Error: ", e.message);
      console.log("Info: terminating existing process using the port - ", this.config.port);
      kill(this.config.port).then(() => {
        console.info("Info: ", "terminated process that was using the port: ", this.config.port);
        try{
          this.sock.bindSync(this.address);
          console.info("Info:", "Initalised - ", `${this.name}@${this.address}`);
        }catch(e){
          throw `Error: ${e.message}`;
        }
      });
    }else{
      throw `Error: ${e.message}`;
    }
  }
  this.config.apis.forEach((apiName)=>{
    this.addAPI(apiName);
  })
}

AtomCmpInterface.prototype.addAPI = function(apiName) {
   this.sock.subscribe(`${apiName}`);

   if(!this.config.apis.includes(apiName)){ //case when this method is directly called
    this.config.apis.push(apiName);
   }
   
   console.log("Info: ", `API = ${apiName} available at Atom.Interface:::${this.name}@${this.address}`);
}


AtomCmpInterface.prototype.addMiddleWare = function() {

}

AtomCmpInterface.prototype.processMsg = function(_message) {
  console.log("INFO: ", "Processed Msg", JSON.parse(_message));
  return JSON.parse(_message);
}

AtomCmpInterface.prototype.activate = function() {
  this.sock.on("message", (apiName, message) => {
    console.log(`atom.interface:::${component.name} - `,
      "received a message related to:",
      apiName.toString(),
      "containing message:",
      message.toString()
    );

    // console.log("component = ", component[apiName]);
    try{
      component[apiName](this.processMsg(message));
    }catch(e){
      console.log(`Error: ${e.message}`);
      return;
    }
  });

  process.on('SIGINT', this.handleInterrupts);
  process.on('SIGTERM', this.handleInterrupts);
  console.log("Info: ", `Atom.Interface:::${this.name} activated`);
}

AtomCmpInterface.prototype.handleInterrupts = function(signalEv) {
  console.log(`Info: Received ${signalEv}`);
  if(signalEv=="SIGINT"){
    console.log(`Info: Terminating Atom.Interface:::${_instance.name}@${_instance.address}`);
    _instance.sock.close();
    console.info("Info:", `Terminated Atom.Interface:::${_instance.name}@${_instance.address}`);
    process.exit();
    // kill(this.config.port).then(() => {
    //   console.info("Info:", "closed port:", this.config.port);
    // });
  }
}


AtomCmpInterface.prototype.advertise = function() {
  var ad = {
    name: this.name,
    label: this.address,
    host: `${this.config.host}`, // when omitted, defaults to the local IP
    port: `${this.config.port}`,
    apis: this.config.apis
    // any additional information is allowed and will be propagated
  };
  nucleus.announceInterface(ad);
  console.log("Info: ", "Atom.Interface advertised - ", JSON.stringify(ad));
}


AtomCmpInterface.prototype.advertiseAndActivate = function() {
  this.advertise();
  this.activate();
}

// var component = require("./src/main.js");

// console.log("running AtomCmpinterface of component - ", component.name);

// AtomCmpInterface.config = {
//   port: "3333",
//   apis: ["createOrUpdateUser", "getUsers", "addAPI"],

//   outlet: {
//     port : "3334",

//   }
// }


module.exports = AtomCmpInterface;