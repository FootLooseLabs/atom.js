var events = require("events");

var zmq = require("zeromq");
const kill = require('kill-port');

const chalk = require('chalk');

// var diont = require('diont')();
process.nucleus = require('../atom.nucleus/main');

process.nucleus.on("error",()=>{
  console.error(chalk.blue("Error: ", `interface nucleus errored. shutting down.`));
  process.exit();
});
// var lexeme = require('../atom.lexicon/main');
var signal = require('../atom.signal/main');

const BASE_LEXICON = require("./base_lexicon");

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
    eventsPort: 7994,
    lexicon: {},
    connections: {}
  }
  this.prefix = "Atom.Interface:::";
  this.connectionsDelimiter = "<-->";
  this.name = options.name;
  this.config = options.config || {};
  this.sock = null;
  this.middlewares = [];
  this.connections = {};
  this.eventHandlers = {};

  this.eventEmitter = new events.EventEmitter();

  this.eventsSock = zmq.socket("pub");

  this.__init__();
};


AtomCmpInterface.prototype.__init__ = function() {
  this.config = {...this.defaultConfig, ...this.config};
  this.config.lexicon = {...BASE_LEXICON , ...this.config.lexicon}

  this.__initComponentProps__();

  this.config.eventsPort = this.config.port+1;
  // this.config.host = this.config.host || "127.0.0.1";
  // this.config.port = this.config.port || 8888;
  // this.config.lexicon = this.config.lexicon || [];
  this.address = `tcp://${this.config.host}:${this.config.port}`;
  this.eventsSockAddress = `tcp://${this.config.host}:${this.config.eventsPort}`;

  // this.eventEmitter.on("",()=>{});

  console.log("Info: ", "Initalising - ", `${this.name}@${this.address}`);
  this._initialiseSocket();
}


AtomCmpInterface.prototype.__initComponentProps__ = function() {
  component.GetIntro = () => {
    var result = this.getSerialisedLexicon();
    console.log("GetIntro: ", result);
    return result;
  }

  component.Update = (info) => {
    console.log("Update: ", info);
    return info;
  }

  component._eventEmitter = new events.EventEmitter();

  component.emit = component._eventEmitter.emit;

  component.on = component._eventEmitter.on;
}


AtomCmpInterface.prototype._initialiseSocket = function() {
  this.sock = zmq.socket("sub");

  // this.sock.on('close', function(...toto) {
  //   console.log('Info: ',this.address,' interface closed');
  // });
  // this.sock.on('close_error', function(...toto) {
  //   console.log('Error: ',this.address,' error while closing interface');
  // });

  _instance = this;
  try{
    this.sock.bindSync(this.address);
    this.eventsSock.bindSync(this.eventsSockAddress);

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
  Object.keys(this.config.lexicon).forEach((_lexemeName)=>{
    this.addLexeme(_lexemeName, this.config.lexicon[_lexemeName]);
  })
}

AtomCmpInterface.prototype.getSerialisedLexicon = function(){
  return Object.keys(this.config.lexicon).map((_lexemeName)=>{
    return {name: _lexemeName, lexeme: this.config.lexicon[_lexemeName] ? this.config.lexicon[_lexemeName].schema : null}
  })
}

AtomCmpInterface.prototype.addLexeme = function(_lexemeName, _lexemeDef) {
   this.sock.subscribe(`${_lexemeName}`);

   if(!Object.keys(this.config.lexicon).includes(_lexemeName)){ //case when this method is directly called
    this.config.lexicon[_lexemeName] = _lexemeDef;
   }
   
   console.log(chalk.blue("Info: ", `Lexeme = ${_lexemeName} available at ${this.prefix}${this.name}@${this.address}`));
}


AtomCmpInterface.prototype.addMiddleWare = function() {

}

AtomCmpInterface.prototype.processMsg = function(_message) {
  console.log("INFO: ", "Processed Msg", JSON.parse(_message));
  return JSON.parse(_message);
}

AtomCmpInterface.prototype.ack1 = function(){

}

AtomCmpInterface.prototype.ack2 = function(){

}


AtomCmpInterface.prototype.initEventHandlers = function () {
  var _interfaceEventHandlersConfig = this.config.eventHandlers;

  // for(var key in _interfaceEventHandlersConfig){

  //   if(this.eventHandlers[key]){return;} //already registered

  //   console.debug("Initialising eventHandler - ", key);

  //   try{
  //     component.on(`${key}`, (msg)=>{_interfaceEventHandlersConfig[key].call(this, msg, this)});
  //      this.eventHandlers[key] = true;
  //   }catch(e){
  //      this.eventHandlers[key] = false;
  //      console.error("Error: ", e);
  //   }

  // }
  if(!_interfaceEventHandlersConfig) {return;}
  // try{
    Object.keys(_interfaceEventHandlersConfig).forEach((key)=>{
      if(this.eventHandlers[key] != true){ //else already registered
        try{
          component.on(`${key}`, (msg)=>{_interfaceEventHandlersConfig[key].call(this, msg, this)});
          this.eventHandlers[key] = true;
          console.debug("Initialised eventHandler - ", key);
        }catch(e){
          this.eventHandlers[key] = false;
          console.error(`Error: failed to initialise eventHandler-${key}: `, e);
        }
      }
    });
  // }catch(e){
  //   console.error(e);
  //   console.error(`Error: eventHandlers config initialisation failed: `, e);
  // }
}


AtomCmpInterface.prototype.initConnections = function () {
  var _interfaceConnectionsConfig = this.config.connections;

  if(!_interfaceConnectionsConfig){return;}
  
  for(var key in _interfaceConnectionsConfig){

    if(this.connections[key] && this.connections[key].statusCode == 2){return;}

    console.debug("Initialising connection - ", _interfaceConnectionsConfig[key]);

    let [interfaceToConnect, cbOperation] = _interfaceConnectionsConfig[key].split(this.connectionsDelimiter);

    this.connections[key] = signal.subscribeToInterface(interfaceToConnect);

    if(this.connections[key]){
      this.connections[key].then((signalStatus)=>{
        // console.debug(`${this.name}<-->${key} Signal Response - signalStatus channel = `, signalStatus.signal.channel);
        if(!signalStatus.error){
          // console.debug(`_________________${this.name}<-->${key} connection is active_________________`);
          signalStatus.signal.eventEmitter.on(`${signalStatus.signal.channel}`,async (msg)=>{
            component.emit(`interface.${key}`, msg);
            try{
              component[cbOperation](msg); //don't await this call
            }catch(e){
              console.error(`Error: component Callback Operation for connection = ${_interfaceConnectionsConfig[key]} Failed - `, e);
            }
          });
        }
        this.connections[key] = signalStatus;
      },(signalStatusErr)=>{
        let err = `ERROR: Initialising Connection Between ${this.name} with ${key} --> ${signalStatusErr.message}`;
        console.error(err);
        this.connections[key] = Error(err);
      });
    }
  }
}

AtomCmpInterface.prototype.publish = async function(_label, msg){
  // let label = `${this.name}:::${_label}`;
  let label = _label;

  if(typeof msg != "string"){
    var msg = JSON.stringify(msg);
  }
  this.eventEmitter.emit(label, msg);
  this.eventsSock.send([label, msg]);

  console.debug(chalk.yellow(`EVENT: ${label} published ${msg}`));
}


AtomCmpInterface.prototype.listen = async function(interfaceLabel, topic){
  try{
    let respStatus = await signal.suscrieToInterface(interfaceLabel);
    // console.log("Atom.Interface: Signal Update: ", respStatus);
  }catch(e){
    console.log("Atom.Interface signal error - ", e);
  }
}

AtomCmpInterface.prototype.reply = async function(sender,lexemeName,msg) {
  // let sender = inflection.get().sender;
  var { message, error, result } = msg;

  console.debug(">>>>>>>>>>>>>>>REPLYING TO: ", sender, ", for OP: ", `${lexemeName}` ,", with MSG: ", msg);

  var label = this.config.lexicon[lexemeName].label;
  let response = this.config.lexicon["Response"].inflect({
    "op": `${this.name}:::${lexemeName}`, 
    "label": label,
    "message": message,
    "error": error,
    "result": result,
  });

  if(label){
    this.publish(label, response.get());
  }

  console.log("RESPONSE ============================== \n ", response);

  if(!sender || !sender.split){
    console.info("INFO: ", `No sender identified (sender = ${JSON.stringify(sender)} )`,"...just logging response - ");
    console.info("RESPONSE = \n", response);
    return;
  }
  if(!sender.split(":::")[1]){  // allow custom topics to be specified in sender;
    sender+=":::Update";  // default to :::Update if no topic given whilst sender specified.
  }

  console.log("Atom.Interface: signal sender specified: ", sender);

  var senderParams = this.processInterfaceUri(sender); //allowing passing of params similar to url params in www.
  var senderInterface = senderParams.shift();

  // response.update({sender: senderInterface});

  try{
    let respStatus = await signal.publishToInterface(`${senderInterface}`, response.get(), senderParams);
    // console.log("Atom.Interface: Signal Update: ", respStatus);
  }catch(e){
    console.log("Atom.Interface signal error - ", e);
  }
}

AtomCmpInterface.prototype._bindCmpProcess = async function() {
  if(component.__start__){
    try{
      await component.__start__();
    }catch(e){
      console.error("Error: component process failed - ", e);
      process.exit();
    }
  }
}

AtomCmpInterface.prototype._bindConnections = function (argument) {

  var _interfaceConnectionsConfig = this.config.connections;

  for(var key in _interfaceConnectionsConfig){
    console.debug("Binding connection - ", _interfaceConnectionsConfig[key]);

    let connInterfaceSocket = _interfaceConnectionsConfig[key].split(this.connectionsDelimiter)[0].split("|||")[0];

    process.nucleus.on(`AgentActivated:::Atom.Interface:::${connInterfaceSocket}`, (agentAd)=>{
      if(agentAd.name != this.name){ //as interface.config.connections would not have itself in that.
        console.debug(this.name,":::heard:::AgentActivated = ", agentAd.name);
        this.initConnections();
      }
    });
    
  }

  process.nucleus.on("ready",()=>{
    this.initConnections();
  });
}

AtomCmpInterface.prototype.processInterfaceUri = function(_message) {
  return _message.split("#$#");
}

AtomCmpInterface.prototype.activate = async function() {
  try{
    await this._bindCmpProcess();
  }catch(e){
    console.error("Error: component activation failed - ", e);
    process.exit();
  }

  this.initEventHandlers();

  this._bindConnections();

  this.sock.on("message", async (_lexemeName, _message) => {
    console.log(`${this.prefix}${_instance.name}@${this.address} - `,
      "received a message related to:",
      _lexemeName.toString(),
      "containing message:",
      _message.toString()
    );


    try{
      var [message, _paramsString] = _message.toString().split("---<end-of-message>---");
    }catch(e){
      console.error(`Couldn't process incoming msg - `, e);
      return;
    }

    // var message = processedMsg.shift();

    var _paramsList = _paramsString ? this.processInterfaceUri(_paramsString) : [];

    // console.debug("_paramsList ------------ ", _paramsList);

    // var message = _paramsList.shift();
    

    // console.log("component = ", component[_lexemeName]);
    try{
      // component[_lexemeName](this.processMsg(message));

      if(!component[_lexemeName]){
        console.log(`Error: Invalid Msg - no such component function`); //in case of calling 'Response' topic.
        return;
      }

      if(!this.config.lexicon[_lexemeName]){
        console.log(`Error: Invalid Msg - no such lexeme = `, _lexemeName); //in case of calling 'Response' topic.
        return;
      }

      var inflection = this.config.lexicon[_lexemeName].inflect(message.toString(), _paramsList); //passed both at inflection & component function call below - can be utilized at iether place
      if(!inflection){
        console.log(`Error: Inflected form is invalid`);
        return;
      }

      console.log(`${this.prefix}${this.name} Inflected Lexeme: `, inflection.get());

      var result, error, message;
      try{
        result = await component[_lexemeName](inflection.get(), _paramsList); //assumed all component interface functions are async
        // console.log("INFO: result = ", result);
        if(result){
          message = result.message;
          delete result.message;
          if(result.error){ // tbcleaned further
            error = JSON.stringify(result.error);
            result = null;
          }
        }else{
          message = "no result received";
        }
      }catch(err){
        // console.error("Operation Errored with  this - ", err);
        error = err.message;
        message = `Operation Failed`;
      }
      // if(inflection.get().sender && inflection.get().sender.port){
      
      // console.debug(">>>>>>>>>>>>>>Operation Sender = ", inflection.get().sender);

      if(inflection.get().sender){

        console.debug(">>>>>>>>>>>>>>Operation Sender = ", inflection.get().sender);
        
        this.reply(inflection.get().sender, _lexemeName, {
          message: message,
          error: error,
          result: result
        });
        // p.then((respStatus) => {
        //   console.log("Atom.Interface: Signal Update: ", respStatus);
        // }, (err) => {
        //   console.log("Atom.Interface: Signal Error: ", err);
        // });
        // var _signal = new signal(inflection.get().sender);
        // _signal.sendWavelet("Update",response.get());
      }
    }catch(e){
      console.log(`Error: ${e.message}`);
      return;
    }
  });

  process.on('SIGINT', this.handleInterrupts);
  process.on('SIGTERM', this.handleInterrupts);
  console.log("Info: ", `${this.prefix}${this.name} activated`);

  // process.send("interface-activated");
}

AtomCmpInterface.prototype.handleInterrupts = function(signalEv) {
  console.log(`Info: ${_instance.prefix}${_instance.name}@${_instance.address} - Received ${signalEv}`);
  if(signalEv=="SIGINT" && !_instance.ended){ //without _instance.eneded multiple (3) SIGINTs are received.
    console.log(`Info: Terminating ${_instance.prefix}${_instance.name}@${_instance.address}`);
    _instance.renounce();
    setTimeout(()=>{
      console.info("Info:", `Terminated ${_instance.prefix}:::${_instance.name}@${_instance.address}`);
      process.exit();
    },1000);
    
    // kill(this.config.port).then(() => {
    //   console.info("Info:", "closed port:", this.config.port);
    // });
  }
}


AtomCmpInterface.prototype.advertise = function() {

  this.ad = this.config.lexicon["Advertisement"].inflect({
    name: this.name,
    label: `${this.prefix}${this.name}`,
    address: `${this.prefix}${this.address}`,
    host: `${this.config.host}`, // when omitted, this.config.host defaults to the local IP (see this.defaultConfig)
    port: `${this.config.port}`,
    eventsPort: `${this.config.eventsPort}`,
    lexicon: this.getSerialisedLexicon() // any additional information is allowed and will be propagated
  });

  process.nucleus.announceInterface(this.ad.get());

  // console.debug("DEBUG: process.nucleus = ", process.nucleus);
  console.log(chalk.yellow("Info: ", "Atom.Interface advertised - ", this.ad.stringify()));
}


AtomCmpInterface.prototype.advertiseAndActivate = function() { //activate & then advertise (tb renamed accordingly later)
  process.title = `${this.prefix}${this.name}`;
  this.activate();
  this.advertise();
}


AtomCmpInterface.prototype.renounce = function() {
  process.nucleus.renounceInterface(this.ad.get());
  try{
    _instance.sock.close();
  }catch(e){
    console.error(e);
  } 

  try{ //deestroy all the interface connection signals
    for(var k in this.connections){
      var _connection = this.connections[k];
      if(!(_connection instanceof Error)){
        if(_connection.signal){
          _connection.signal.destroy();
        }
      }
    }
  }catch(e){
    console.error(e);
  }
  this.ended = true;
}

// var component = require("./src/main.js");

// console.log("running AtomCmpinterface of component - ", component.name);

// AtomCmpInterface.config = {
//   port: "3333",
//   lexicon: ["createOrUpdateUser", "getUsers", "addLexeme"],

//   outlet: {
//     port : "3334",

//   }
// }


module.exports = AtomCmpInterface;