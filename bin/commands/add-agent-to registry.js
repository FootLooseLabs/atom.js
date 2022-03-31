const path = require("path");
const fs = require("fs");
//var AtomNucleus = require('atom').Nucleus;


var startAgentRegistrationProcess = (dir) => {
    console.log("Starting Registration of the agent", dir)
    // process.nucleus.on("ready", async ()=>{
    //     var getInterfaceInfo = await AtomNucleus.getInterfaceInfo(`Atom.Interface:::${dir}`)
    //     var interfaceName = getInterfaceInfo.name;
    //     var lexicons = getInterfaceInfo.lexicon;
    //
    //     console.log(interfaceName)
    //     console.log(lexicons)
    // });
    // let data = fs.readFileSync(dir + "/src/interface.js", 'utf-8');
    // data = data.split("\n").join("").split(" ").join("")
    // var firstInstanceOfOpeningBrace = data.indexOf("{");
    // let brackets = [];
    // let str = [];
    // brackets.push("{");
    // str.push("{");
    // console.log(brackets.length)
    // for (var i = firstInstanceOfOpeningBrace + 1; i < data.length; i++) {
    //     str.push(data[i])
    //     if (data[i] === "{") {
    //         brackets.push(data[i]);
    //     } else if (data[i] === "}") {
    //         if (brackets[brackets.length - 1] === "{") brackets.pop();
    //     }
    //
    //     if (brackets.length === 0) break;
    // }
    // var interfaceSpecs = str.join("").replace(/lexicon.[a-zA-z]+/g,`""`).replace(/eventHandlers.[a-zA-z]+/g,`""`)
    // console.log(eval(interfaceSpecs))
    // console.log(interfaceSpecs.name);
    var interfaceFile = require(path.join(dir,"src","interface.js"))
    console.log(interfaceFile);

}
function normalizeJson(str){return str.replace(/"?([\w_\- ]+)"?\s*?:\s*?"?(.*?)"?\s*?([,}\]])/gsi, (str, index, item, end) => '"'+index.replace(/"/gsi, '').trim()+'":"'+item.replace(/"/gsi, '').trim()+'"'+end).replace(/,\s*?([}\]])/gsi, '$1');}



module.exports = startAgentRegistrationProcess;