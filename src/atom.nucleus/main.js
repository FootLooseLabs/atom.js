//PENDING - restart all atom.interfaces running - upon Nucleus RESTART// var Etcd = require('node-etcd');
const redis = require("redis");

const chalk = require("chalk");

const AtomNucleus = require("./manageEnv");

AtomNucleus.readystate = AtomNucleus.READYSTATES["LOADING"];
AtomNucleus.diont = require("diont")();

AtomNucleus.retryAttempts = 0;
AtomNucleus.maxRetryAttempts = 50; // Will retry for ~5 minutes (50 * 6s)
AtomNucleus.retryDelay = 6000; // 6 seconds

AtomNucleus.connectRedis = function () {
  AtomNucleus.redisClient = redis.createClient();

  AtomNucleus.redisClient.on("connect", function () {
    console.log("AtomNucleus redisClient connected");
    AtomNucleus.retryAttempts = 0; // Reset retry counter on successful connection
    AtomNucleus.readystate = AtomNucleus.READYSTATES["READY"];
    AtomNucleus.emit("ready", AtomNucleus);
  });

  AtomNucleus.redisClient.on("error", function (err) {
    if (AtomNucleus.retryAttempts < AtomNucleus.maxRetryAttempts) {
      AtomNucleus.retryAttempts++;
      console.warn(
        `${chalk.yellow("WARNING: Redis connection failed")} - Retry attempt ${AtomNucleus.retryAttempts}/${AtomNucleus.maxRetryAttempts} in ${AtomNucleus.retryDelay / 1000}s`,
      );

      AtomNucleus.readystate = AtomNucleus.READYSTATES["LOADING"];

      setTimeout(() => {
        AtomNucleus.connectRedis();
      }, AtomNucleus.retryDelay);
    } else {
      console.error(
        `${chalk.red("ERROR: Failed to connect to Redis after")} ${AtomNucleus.maxRetryAttempts} attempts. Please ensure Redis is running.`,
      );
      try {
        AtomNucleus.readystate = AtomNucleus.READYSTATES["ERRORED"];
        AtomNucleus.emit("error", err);
      } catch (err) {
        process.exit(); //exit only after all retries exhausted
      }
    }
  });

  AtomNucleus.redisClient.on("end", function () {
    console.warn(
      chalk.yellow(
        "WARNING: Redis connection ended. Attempting to reconnect...",
      ),
    );
    if (AtomNucleus.retryAttempts < AtomNucleus.maxRetryAttempts) {
      AtomNucleus.retryAttempts++;
      setTimeout(() => {
        AtomNucleus.connectRedis();
      }, AtomNucleus.retryDelay);
    }
  });
};

// Initial connection attempt
AtomNucleus.connectRedis();

AtomNucleus.getAllAdvertisedInterfaces = (pattern, logLevel = 1) => {
  //unreliable (doesn't return proper results if many keys)

  console.log(
    "Atom.Nucleus:::Info: ",
    "Discovering Interfaces in the Environment...",
  );
  // AtomNucleus.redisClient.get(interfaceAddress, redis.print);
  // console.log("-------------------------------");
  var pattern = pattern || "Atom.Interface:::*";
  return new Promise((resolve, reject) => {
    if (!AtomNucleus.redisClient.connected) {
      let err = "Atom.Nucleus is not running";
      reject(err);
      return;
    }

    var cursor = "0";

    function scan() {
      AtomNucleus.redisClient.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        "100",
        function (err, res) {
          if (err) {
            console.log("Atom.Nucleus:::Error Discovering Interfaces - ", err);
            reject(err);
            return;
          }
          cursor = res[0];
          var keys = res[1];

          if (cursor === "0") {
            if (logLevel > 1) {
              console.log("Atom.Nucleus:::Discovered Interfaces - \n", keys);
            }
            resolve(keys);
            return;
          }

          return scan();
        },
      );
    }
    scan();
  });
};

AtomNucleus.getInterfaceInfo = (interfaceLabel) => {
  return new Promise((resolve, reject) => {
    if (!AtomNucleus.redisClient.connected) {
      // console.error("Atom.Nucleus redisClient is not running ***************** ", AtomNucleus.redisClient);
      let err = "Atom.Nucleus is not running";
      reject(err);
      return;
    }
    AtomNucleus.redisClient.get(interfaceLabel, function (err, res) {
      if (err) {
        console.log(
          "Atom.Nucleus:::Error finding Interface - ",
          interfaceLabel,
        );
        reject(err);
        return;
      }
      // console.log("Interface Info: ", JSON.stringify(res));
      try {
        let interface = JSON.parse(res);
        resolve(interface);
        return;
      } catch (e) {
        let err = `found invalid interface description - ${e.message}`;
        reject(Error(err));
        return;
      }
      return;
    });
  });
};

AtomNucleus.getAllInterfaceActivity = async (logLevel = 1) => {
  //ISSUE: if improper shutdown/ system shutdown - running status is not updated (running: true still shows true)
  // console.log("getAllInterfaceActivity called 0");

  // if(!AtomNucleus.redisClient.connected){
  // 	return;
  // }

  // console.log("getAllInterfaceActivity called 1");
  var interfaceList = [];

  try {
    var interfaceLabels = await AtomNucleus.getAllAdvertisedInterfaces();
  } catch (e) {
    console.log("AtomNucleus:::Error: ", e);
    throw e;
  }

  for (let i = 0; i < interfaceLabels.length; i++) {
    try {
      let _interfaceInfo = await AtomNucleus.getInterfaceInfo(
        interfaceLabels[i],
      );
      // console.log("_interfaceInfo = ", _interfaceInfo);
      interfaceList.push({
        name: _interfaceInfo.name,
        running: _interfaceInfo.running,
      });
    } catch (e) {
      console.log("AtomNucleus:::Error: ", e);
    }
  }
  // _interfaces.map(async (interfaceLabel) => {

  // });

  // console.log("interfaceList = ", interfaceList);
  return interfaceList;
};

AtomNucleus.announceInterface = (ad) => {
  // if(!AtomNucleus.redisClient){
  // 	return;
  // }

  AtomNucleus.diont.announceService(ad);

  // let _label = `AgentActivated:::${ad.label}`;

  // AtomNucleus.emit(`${_label}`,ad);

  // console.debug("~~~~~~~~~~~~~~DEBUG ATOM.NUCLEUS EMITTING EVENT : ", `${_label}`);

  AtomNucleus.diont.on("serviceAnnounced", function (serviceInfo) {
    let _label = `AgentActivated:::${serviceInfo.service.label}`;
    setTimeout(() => {
      AtomNucleus.emit(`${_label}`, serviceInfo.service);
    }, 200);
  });
};

AtomNucleus.renounceInterface = (ad) => {
  // if(!AtomNucleus.redisClient){
  // 	return;
  // }

  // console.log("Atom.Nucleus:::Info: AtomNucleus: ", "Renouncing Interface - ", ad);
  AtomNucleus.diont.renounceService(ad);
  // AtomNucleus.emit(`AgentDeactivated:::${ad.label}`,ad);
};

AtomNucleus.getInterfaceIfActive = (interfaceLabel) => {
  console.log("Atom.Nucleus:::Info: ", "Finding Interface = ", interfaceLabel);
  // AtomNucleus.redisClient.get(interfaceLabel, redis.print);
  // console.log("-------------------------------");
  return new Promise(async (resolve, reject) => {
    if (!AtomNucleus.redisClient.connected) {
      // console.error("Atom.Nucleus redisClient is not running ****#######************* ", AtomNucleus.redisClient);
      let err = "Atom.Nucleus is not running";
      reject(err);
      return;
    }
    var interface;
    try {
      interface = await AtomNucleus.getInterfaceInfo(interfaceLabel);
    } catch (e) {
      console.log("AtomNucleus:::Error: ", e);
      reject(e);
      return;
    }

    if (!interface) {
      let err = `404 : ${interfaceLabel} not found`;
      reject(err);
      return;
    }

    // console.log("***********Interface - ", interface);

    if (!interface.running) {
      let err = `405: ${interfaceLabel} is Not Active`;
      reject(err);
      return;
    }
    resolve(interface);
  });
};

AtomNucleus.readystate = AtomNucleus.READYSTATES["INTERACTIVE"];
module.exports = AtomNucleus;
