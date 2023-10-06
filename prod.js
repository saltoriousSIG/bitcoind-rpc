let https = require("https");
var RpcClient = require("./lib/index");
const fs = require("fs");
const dns = require("dns");
const util = require("util");
const os = require("os");

require("dotenv").config();

const reverseDns = util.promisify(dns.reverse);

const privateKey = fs.readFileSync(process.env.PRIVATEKEY_LOCATION, "utf8");
const certificate = fs.readFileSync(process.env.FULLCHAIN_LOCATION, "utf8");

const credentials = { key: privateKey, cert: certificate };

var config = {
  protocol: "http",
  user: process.env.RPCUSER,
  pass: process.env.RPCPASSWORD,
  host: process.env.RPCIP,
  port: process.env.RPCPORT,
};

const getDomain = async (ipAddress) => {
  return await reverseDns(ipAddress);
};

var rpc = new RpcClient(config);
var lowerCaseMethods = [];
var lowerCaseMap = {};
var pingCount = 0;

function setupLowerCase() {
  var methods = RpcClient.callspec;
  var key,
    keys = Object.keys(methods);
  var n = keys.length;

  while (n--) {
    key = keys[n];
    lowerCaseMethods[key.toLowerCase()] = methods[key];
    lowerCaseMap[key.toLowerCase()] = key;
  }
}

function getServerIp() {
  const networkInterfaces = os.networkInterfaces();

  // Example: Get IPv4 address of the first network interface
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

function getSubnetMask() {
  const networkInterfaces = os.networkInterfaces();

  // Example: Get subnet mask of the first network interface
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      // Skip over internal (i.e. 127.0.0.1) addresses
      if (!net.internal) {
        return net.netmask;
      }
    }
  }
  return null;
}

function processPost(request, response, callback) {
  var queryData = "";
  if (typeof callback !== "function") return null;

  if (request.method == "POST") {
    request.on("data", function (data) {
      queryData += data;
      if (queryData.length > 1e6) {
        queryData = "";
        response.writeHead(413, { "Content-Type": "text/plain" }).end();
        request.connection.destroy();
      }
    });

    request.on("end", function () {
      request.post = queryData;
      callback();
    });
  } else {
    response.writeHead(405, { "Content-Type": "text/plain" });
    response.end();
  }
}

https
  .createServer(credentials, async (request, response) => {
    const incommingIP = request.socket.remoteAddress.replace(/^::ffff:/, "");
    console.log(incommingIP);
    console.log(getServerIp());
    console.log(getSubnetMask());
    // Calculate the network range of the server IP
    const serverNetwork = ipCalc.calculateCIDRPrefix(
      getServerIp(),
      getSubnetMask()
    );

    // Check if the incoming IP is in the same network range
    const isInSameNetwork = ipCalc
      .calculate(incomingIp)
      .some(
        (ipRange) =>
          ipRange.ipLow === serverNetwork[0].ipLow &&
          ipRange.ipHigh === serverNetwork[0].ipHigh
      );

    console.log(isInSameNetwork);

    try {
      try {
        const domain = await getDomain(incommingIP);
        console.log(domain);
        if (incommingIP === "192.168.1.1" || domain[0]) {
          console.log("accept request");
        } else {
          console.log("return a 404 error and return from this function");
        }
      } catch (e) {
        console.log("reverse dns failed");
      }

      if (request.method == "POST") {
        processPost(request, response, function () {
          if (request.post) {
            let postData;
            try {
              postData = JSON.parse(request.post);
            } catch (e) {
              postData = { method: "invalid" };
            }
            let command = postData.method;
            console.log(`command: ${command}`);

            if (command in lowerCaseMethods) {
              if (postData.params.length > 0) {
                let methods = RpcClient.callspec;
                let typeString = methods[lowerCaseMap[command] || command];
                let types = typeString.split(" ");

                let flagged = false;
                let flagData = "";

                for ([idx, type] of types.entries()) {
                  if (postData.params[idx] !== null) {
                    switch (type) {
                      case "obj":
                        if (postData.params[idx][0] !== "{") {
                          flagData = "invalid obj type";
                          flagged = true;
                        }
                        break;
                      case "int":
                        if (isNaN(parseInt(postData.params[idx]))) {
                          flagData = "invalid int type";
                          flagged = true;
                        }
                        break;
                      case "float":
                        if (isNaN(parseFloat(postData.params[idx]))) {
                          flagData = "invalid float type";
                          flagged = true;
                        }
                        break;
                      case "bool":
                        if (typeof postData.params[idx] !== "boolean") {
                          flagData = "invalid bool type";
                          flagged = true;
                        }
                        break;
                      case "str":
                        if (typeof postData.params[idx] !== "string") {
                          flagData = "invalid str type";
                          flagged = true;
                        }
                        break;
                    }
                  }
                }

                if (flagged) {
                  response.write(JSON.stringify({ error: flagData }));
                  response.end();
                  response.writeHead(200, "OK", {
                    "Content-Type": "application/json",
                  });
                  return;
                }

                rpc[command](...postData.params, function (err, data) {
                  if (err) {
                    console.log(err);
                    response.write(JSON.stringify({ error: err }));
                  } else {
                    response.write(JSON.stringify(data));
                  }

                  response.end();
                  response.writeHead(200, "OK", {
                    "Content-Type": "application/json",
                  });
                });
              } else {
                rpc[command](function (err, data) {
                  if (err) {
                    console.log(err);
                    response.write(JSON.stringify({ error: err }));
                  } else {
                    response.write(JSON.stringify(data));
                  }
                  response.end();
                  response.writeHead(200, "OK", {
                    "Content-Type": "application/json",
                  });
                });
              }
            } else {
              response.write(JSON.stringify({ error: "method not found" }));
              response.end();
              response.writeHead(200, "OK", {
                "Content-Type": "application/json",
              });
            }
          }
        });
      } else {
        response.writeHead(200, "OK", { "Content-Type": "application/json" });
        response.end();
      }
    } catch (err) {
      console.log(err.message);
    }
  })
  .listen(process.env.NODEPORT || 8000, () => {
    console.log(`server is running on port ${process.env.port || 8000}`);
  });

setupLowerCase();
