const path = require("path");
const fs = require('fs');
const yaml = require('js-yaml');

var startAgentRegistrationProcess = (dir) => {
    console.log("Starting Registration of the agent", dir)
    try {
        let fileContents = fs.readFileSync(path.join(dir,"agent_specs.yaml"), 'utf8');
        let data = yaml.load(fileContents);
        data.interfaces = [...data.interfaces, ...data.event_handlers]

        var request = {
            "interface": "@footloose/agent-registry:::AddOrUpdateEntry",
            "token": "",
            "request": {
                "request_type": "AddOrUpdate",
                "entries": [data],
                "sender": {}
            }
        }
        var WebSocket = require('ws');
        var ws = new WebSocket('wss://wsapi.footloose.io/wsapi/d5392136797a1bcfc78c61696df8ca31e29e250b?auth=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFic3RyYWN0aW9uLWFwcEBmb290bG9vc2UuaW8iLCJyb2xlIjoiQUxMIiwibWF4X2Nvbm5lY3Rpb24iOjEwMCwic2VjdXJlSGFzaCI6ImQ1MzkyMTM2Nzk3YTFiY2ZjNzhjNjE2OTZkZjhjYTMxZTI5ZTI1MGIiLCJpYXQiOjE2MzgzMDI1ODl9.UzfsLe-EXz4Vox2HXOQEORsOV4_J20jmYLBlZHwKNhU');
        ws.on('open', function () {
            ws.send(JSON.stringify(request));
        });
        ws.on('message', function (data, flags) {
            var response = JSON.parse(data.toString());
            if (response.result === "done") {
                console.log("Published Specs Successfully")
            }
        });
        setTimeout(()=>{
            console.log("Closing Connection after 10 Second")
            ws.close();
        },10000)
    } catch (e) {
        console.log(e);
        throw e;
    }

}


module.exports = startAgentRegistrationProcess;