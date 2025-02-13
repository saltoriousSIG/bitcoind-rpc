let http = require("http");
var RpcClient = require("./lib/index");
require("dotenv").config();

var config = {
  protocol: "http",
  user: process.env.RPCUSER || "rootuser",
  pass: process.env.RPCPASSWORD || "vrsc_id_mktplace",
  host: process.env.RPCIP || "127.0.0.1",
  port: process.env.RPCPORT || "12345",
};

var rpc = new RpcClient(config);
var lowerCaseMethods = [];
var lowerCaseMap = {};

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

http
  .createServer((request, response) => {
    try {
      if (request.method == "POST") {
        processPost(request, response, function () {
          if (request.post) {
            let postData = JSON.parse(request.post);
            let command = postData.method;

            if (command in lowerCaseMethods) {
              if (postData.params.length > 0) {
                let methods = RpcClient.callspec;
                let typeString = methods[lowerCaseMap[command] || command];
                let types = typeString.split(" ");

                let flagged = false;
                let flagData = ''

                for ([idx, type] of types.entries()) {
                  switch (type) {
                    case "obj":
                      if (postData.params[idx][0] !== "{") {
                        flagData = 'invalid obj type'
                        flagged = true;
                      }
                      break;
                    case "int":
                      if (isNaN(parseInt(postData.params[idx]))) {
                        flagData ='invalid int type'
                        flagged = true;
                      }
                      break;
                    case "float":
                      if (isNaN(parseFloat(postData.params[idx]))) {
                        flagData = 'invalid float type'
                        flagged = true;
                      }
                      break;
                    case "bool":
                      if (typeof postData.params[idx] !== "boolean") {
                        flagData = 'invalid bool type'
                        flagged = true;
                      }
                      break;
                    case "str":
                      if (typeof postData.params[idx] !== "string") {
                        flagData = 'invalid str type'
                        flagged = true;
                      }
                      break;
                  }
                }

                if (flagged) { 
                  response.write(
                    JSON.stringify({ error: flagData })
                  );
                  response.end();
                  response.writeHead(200, "OK", {
                    "Content-Type": "application/json",
                  });
                  return;
                }

                rpc[command](...postData.params, function (err, data) {
                  if (err) {
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
  .listen(process.env.NODEPORT || 7000);

setupLowerCase();
