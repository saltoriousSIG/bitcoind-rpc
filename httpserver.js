let http = require('http');
var RpcClient = require('./lib/index');
require('dotenv').config();

var config = {
    protocol: 'http',
    user: process.env.RPCUSER || 'verusdesktop' ,
    pass:  process.env.RPCPASSWORD || '',
    host: process.env.RPCIP || '127.0.0.1' ,
    port:  process.env.RPCPORT || '12345',
};

var rpc = new RpcClient(config);
var lowerCaseMethods = [];

function setupLowerCase(){
    var methods = RpcClient.callspec;
    var key, keys = Object.keys(methods);
    var n = keys.length;
    
    while (n--) {
        key = keys[n];
        lowerCaseMethods[key.toLowerCase()] = methods[key];
    }
}

function processPost(request, response, callback) {
    var queryData = "";
    if (typeof callback !== 'function') return null;

    if (request.method == 'POST') {
        request.on('data', function (data) {
            queryData += data;
            if (queryData.length > 1e6) {
                queryData = "";
                response.writeHead(413, { 'Content-Type': 'text/plain' }).end();
                request.connection.destroy();
            }
        });

        request.on('end', function () {
            request.post = queryData;
            callback();
        });

    } else {
        response.writeHead(405, { 'Content-Type': 'text/plain' });
        response.end();
    }
}

http.createServer((request, response) => {
    if (request.method == 'POST') {
        processPost(request, response, function () {

            if (request.post) {

                let postData = JSON.parse(request.post);
                let command = postData.method;
                console.log("Command: " + command);

                if (command in lowerCaseMethods) {

                    if(postData.params.length > 0){

                        rpc[command](postData.params[0], function (err, data) {
                            if (err) {
                                response.write(JSON.stringify({ "error": err }));
                            } else {
                                response.write(JSON.stringify(data));
                            }
                            response.end();
                            response.writeHead(200, "OK", { 'Content-Type': 'application/json' });

                        });
                    } else {
                        rpc[command](function (err, data) {
                            if (err) {
                                response.write(JSON.stringify({ "error": err }));
                            } else {
                                response.write(JSON.stringify(data));
                            }
                            response.end();
                            response.writeHead(200, "OK", { 'Content-Type': 'application/json' });

                        });
                    }
                } else {
                    response.write(JSON.stringify({ "error": "method not found" }));
                    response.end();
                    response.writeHead(200, "OK", { 'Content-Type': 'application/json' });

                }
            }
        });
    } else {
        response.writeHead(200, "OK", { 'Content-Type': 'application/json' });
        response.end();
    }

}).listen(process.env.NODEPORT || 8000);

setupLowerCase();
