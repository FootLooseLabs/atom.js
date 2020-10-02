const AtomNucleus = {};


AtomNucleus.getInterfacesInEnvConfig = (config)=>{
	return Object.keys(config).filter((_key)=>{
		return _key.substr(0,10)=="interface:"
	}).map((_interfaceKey)=>{
		config[_interfaceKey]._name = _interfaceKey; //for internal use
		return config[_interfaceKey];
	})
}


AtomNucleus.init = (config, _process) => {
	_process.nucleus.AtomInterfacesDefined = _process.nucleus.getInterfacesInEnvConfig(config);
}

module.exports = AtomNucleus;