var atom = require('atom');
// ======
// Announce our own service
// ======
var service = {
	name: "TestServer 1",
	host: "127.0.0.1", // when omitted, defaults to the local IP
	port: "1231"
	// any additional information is allowed and will be propagated
};
atom.announceService(service);

// Renounce after 5 seconds
setTimeout(function() {
	atom.renounceService(service);
}, 10000);



// var existingServices = atom.getServiceInfos();

// console.log("existingServices = ", existingServices);