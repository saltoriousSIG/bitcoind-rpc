let http = require("http");
var RpcClient = require("./lib/index");
require("dotenv").config();

var config = {
  protocol: "http",
  user: process.env.RPCUSER || "verusdesktop",
  pass: process.env.RPCPASSWORD || "",
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

                for ([idx, type] of types.entries()) {
                  switch (type) {
                    case "obj":
                      if (postData.params[idx][0] !== "{") {
                        response.write(
                          JSON.stringify({ error: "invalid obj type" })
                        );
                        flagged = true;
                      }
                      break;
                    case "int":
                      if (parseInt(postData.params[idx]).isNaN()) {
                        response.write(
                          JSON.stringify({ error: "invalid int type" })
                        );
                        flagged = true;
                      }
                      break;
                    case "float":
                      if (parseFloat(postData.params[idx]).isNaN()) {
                        response.write(
                          JSON.stringify({ error: "invalid float type" })
                        );
                        flagged = true;
                      }
                      break;
                    case "bool":
                      if (typeof postData.params[idx] !== "boolean") {
                        response.write(
                          JSON.stringify({ error: "invalid bool type" })
                        );
                        flagged = true;
                      }
                      break;
                    case "str":
                      if (typeof postData.params[idx] !== "string") {
                        response.write(
                          JSON.stringify({ error: "invalid str type" })
                        );
                        flagged = true;
                      }
                      break;
                  }
                }
                response.end();
                response.writeHead(200, "OK", {
                  "Content-Type": "application/json",
                });
                if (flagged) return;

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
  .listen(process.env.NODEPORT || 8000);

setupLowerCase();
