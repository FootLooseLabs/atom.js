NucleusDaemon.diont.on("serviceAnnounced", function(serviceInfo) {
		// A service was announced
		// This function triggers for services not yet available in diont.getServiceInfos()
		// serviceInfo is an Object { isOurService : Boolean, service: Object }
		// service.name, service.host and service.port are always filled
		// etcd.set(serviceInfo.name, serviceInfo);
		
		// List currently known services
		serviceInfo.service.running = true;

		console.log(`Info: Atom.Nucleus: Saving metadata on redis - ${serviceInfo.service.label}`, serviceInfo.service);
		NucleusDaemon.redisClient.set(`${serviceInfo.service.label}`, JSON.stringify(serviceInfo.service));
		// console.log("All known interfaces", NucleusDaemon.diont.getServiceInfos());
		console.log(chalk.yellow("Info: Atom.Nucleus: A new interface was announced", JSON.stringify(serviceInfo.service)));
	});

	NucleusDaemon.diont.on("serviceRenounced", function(serviceInfo) {
		serviceInfo.service.running = false;
		NucleusDaemon.redisClient.set(`${serviceInfo.service.label}`, JSON.stringify(serviceInfo.service));
		console.log(chalk.red("Info: Atom.Nucleus: An existing interface was renounced", JSON.stringify(serviceInfo.service)));
		// console.log("All known interfaces", NucleusDaemon.diont.getServiceInfos());
	});