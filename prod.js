import http from "http";
import RpcClient from "./lib/index.mjs";
import dotenv from "dotenv";

dotenv.config();

var config = {
  protocol: "http",
  user: process.env.RPCUSER,
  pass: process.env.RPCPASSWORD,
  host: process.env.RPCIP,
  port: process.env.RPCPORT,
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

                for (let [idx, type] of types.entries()) {
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
