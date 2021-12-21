'use strict';

var http = require('http');
var https = require('https');

const apisNoWallet = {
  coinSupply: '',
  convertPassphrase: 'str',
  createMultiSig: '',
  createRawTransaction: '',
  decodeRawTransaction: 'str bool',
  decodeScript: 'str bool',
  estimateFee: 'int',
  estimatePriority: 'int',
  getAddressMempool: 'obj',
  getAddressUtxos: 'obj',
  getAddressBalance: 'obj',
  getAddressDeltas: 'obj',
  getAddressTxids: 'obj',
  getBestBlockHash: '',
  getBestProofRoot: 'obj',
  getBlock: 'str bool',
  getBlockchainInfo: '',
  getBlockCount: '',
  getBlockHashes: 'int int',
  getBlockHash: 'int',
  getBlockHeader: 'str',
  getBlockNumber: '',
  getBlockSubsidy: 'int',
  getBlockTemplate: 'obj',
  getChainTips: '',
  getCurrency: 'str',
  getCurrencyConverters: 'str str str',
  getDifficulty: '',
  getExports: 'str int int',
  getInfo: '',
  getInitialCurrencyState: 'str',
  getIdentity: 'str int',
  getLastImportFrom: 'str',
  getLaunchInfo: 'str',
  getMemPoolInfo: '',
  getMiningInfo: '',
  getNotarizationData: 'str',
  getOffers: 'str bool bool',
  getPendingTransfers: 'str',
  getRawMemPool: '',
  getRawTransaction: 'str int',
  getReserveDeposits: 'str',
  getSaplingTree: 'int',
  getSpentInfo: 'obj',
  getTxOut: 'str int bool',
  getTxOutSetInfo: '',
  getVDXFID: '',
  help: '',
  listCurrencies: 'obj int int',
  sendRawTransaction: 'str',
  submitAcceptedNotarization: 'obj obj',
  submitImports: 'obj',
  verifyMessage: '',
  verifyHash: ''
};

const apisWithWallet = {
  addMergedBlock: 'str obj',
  addMultisigAddress: 'int obj',
  closeOffers: 'obj str str',
  coinSupply: '',
  convertPassphrase: 'str',
  createMultiSig: 'int obj',
  createRawTransaction: '',
  decodeRawTransaction: 'str bool',
  decodeScript: 'str bool',
  defineCurrency: 'obj',
  dumpPrivKey: 'str',
  encryptWallet: 'str',
  estimateFee: 'int',
  estimatePriority: 'int',
  fundRawTransaction: 'str',
  getAccount: 'str',
  getAccountAddress: 'str',
  getAddressesByAccount: 'str',
  getAddressMempool: 'obj',
  getAddressUtxos: 'obj',
  getAddressBalance: 'obj',
  getAddressDeltas: 'obj',
  getAddressTxids: 'obj',
  getBestBlockHash: '',
  getBestProofRoot: 'obj',
  getBlock: 'str bool',
  getBlockchainInfo: '',
  getBlockCount: '',
  getBlockHashes: 'int int',
  getBlockHash: 'int',
  getBlockHeader: 'str',
  getBlockNumber: '',
  getBlockSubsidy: 'int',
  getBlockTemplate: 'obj',
  getChainTips: '',
  getCurrency: 'str',
  getCurrencyBalance: 'str int bool',
  getCurrencyConverters: 'str str str',
  getDifficulty: '',
  getExports: 'str int int',
  getInfo: '',
  getInitialCurrencyState: 'str',
  getIdentity: 'str int',
  getLastImportFrom: 'str',
  getLaunchInfo: 'str',
  getMemPoolInfo: '',
  getMiningInfo: '',
  getNewAddress: '',
  getNotarizationData: 'str',
  getOffers: 'str bool bool',
  getPendingTransfers: 'str',
  getRawMemPool: '',
  getRawTransaction: 'str int',
  getReserveDeposits: 'str',
  getSaplingTree: 'int',
  getSpentInfo: 'obj',
  getTxOut: 'str int bool',
  getTxOutSetInfo: '',
  getVDXFID: 'str bool',
  help: '',
  importAddress: 'str str bool',
  importPrivKey: 'str str bool',
  invalidateBlock: 'str',
  keyPoolRefill: '',
  listAccounts: 'int',
  listAddressGroupings: '',
  listCurrencies: 'obj int int',
  listIdentities: 'bool bool',
  listOpenOffers: 'bool bool',
  listReceivedByAccount: 'int bool',
  listReceivedByAddress: 'int bool',
  listSinceBlock: 'str int',
  listTransactions: 'str int int',
  listUnspent: 'int int',
  listLockUnspent: 'bool',
  lockUnspent: '',
  move: 'str str float int str',
  makeOffer: 'str obj bool float',
  reconsiderBlock: 'str',
  recoverIdentity: 'obj bool',
  registerIdentity: 'obj bool float',
  registerNameCommitment: 'str str str',
  revokeIdentity: 'str bool',
  sendCurrency: 'str obj int float',
  sendFrom: 'str str float int str str',
  sendMany: 'str obj int str',
  sendRawTransaction: 'str',
  sendToAddress: 'str float str str',
  setAccount: '',
  setIdentityTimelock: 'str obj bool',
  setTxFee: 'float',
  signRawTransaction: 'str',
  signHash: 'str str str',
  signMessage: 'str str str',
  sendRawTransaction: 'str',
  submitAcceptedNotarization: 'obj obj',
  submitBlock: 'str obj',
  submitImports: 'obj',
  takeOffer: 'str obj bool float',
  updateIdentity: 'obj bool',
  validateAddress: 'str',
  verifyMessage: '',
  verifyHash: '',
  z_exportKey: 'str bool',
  z_exportViewingKey: 'str',
  z_exportWallet: 'str bool',
  z_getBalance: 'str',
  z_getNewAddress: '',
  z_getOperationResult: 'obj',
  z_getOperationStatus: 'obj',
  z_getTotalBalance: 'int bool',
  z_importKey: 'str bool int',
  z_importViewingKey: 'str bool int',
  z_importWallet: 'str',
  z_listAddresses: 'bool',
  z_listOperationIDs: '',
  z_listReceivedByAddress: 'str int',
  z_listUnspent: 'int int bool obj',
  z_mergeToAddress: 'obj str float float float str',
  z_sendmany: 'str obj int float',
  z_viewTransaction: 'str'
};

function RpcClient(opts) {
  opts = opts || {};
  this.host = opts.host || '127.0.0.1';
  this.port = opts.port || 8332;
  this.user = opts.user || 'user';
  this.pass = opts.pass || 'pass';
  this.protocol = opts.protocol === 'http' ? http : https;
  this.batchedCalls = null;
  this.disableAgent  = opts.disableAgent || false;

  var isRejectUnauthorized = typeof opts.rejectUnauthorized !== 'undefined';
  this.rejectUnauthorized = isRejectUnauthorized ? opts.rejectUnauthorized : true;

  if(RpcClient.config.log) {
    this.log = RpcClient.config.log;
  } else {
    this.log = RpcClient.loggers[RpcClient.config.logger || 'normal'];
  }
}

var cl = console.log.bind(console);

var noop = function() {};

RpcClient.loggers = {
  none: {info: noop, warn: noop, err: noop, debug: noop},
  normal: {info: cl, warn: cl, err: cl, debug: noop},
  debug: {info: cl, warn: cl, err: cl, debug: cl}
};

RpcClient.config = {
  logger: 'normal' // none, normal, debug
};

function rpc(request, callback) {

  var self = this;
  request = JSON.stringify(request);
  var auth = new Buffer(self.user + ':' + self.pass).toString('base64');

  var options = {
    host: self.host,
    path: '/',
    method: 'POST',
    port: self.port,
    rejectUnauthorized: self.rejectUnauthorized,
    agent: self.disableAgent ? false : undefined
  };

  if (self.httpOptions) {
    for (var k in self.httpOptions) {
      options[k] = self.httpOptions[k];
    }
  }

  var called = false;

  var errorMessage = 'Bitcoin JSON-RPC: ';

  var req = this.protocol.request(options, function(res) {

    var buf = '';
    res.on('data', function(data) {
      buf += data;
    });

    res.on('end', function() {

      if (called) {
        return;
      }
      called = true;

      if (res.statusCode === 401) {
        callback(new Error(errorMessage + 'Connection Rejected: 401 Unnauthorized'));
        return;
      }
      if (res.statusCode === 403) {
        callback(new Error(errorMessage + 'Connection Rejected: 403 Forbidden'));
        return;
      }
      if (res.statusCode === 500 && buf.toString('utf8') === 'Work queue depth exceeded') {
        var exceededError = new Error('Bitcoin JSON-RPC: ' + buf.toString('utf8'));
        exceededError.code = 429; // Too many requests
        callback(exceededError);
        return;
      }

      var parsedBuf;
      try {
        parsedBuf = JSON.parse(buf);
      } catch(e) {
        self.log.err(e.stack);
        self.log.err(buf);
        self.log.err('HTTP Status code:' + res.statusCode);
        var err = new Error(errorMessage + 'Error Parsing JSON: ' + e.message);
        callback(err);
        return;
      }

      callback(parsedBuf.error, parsedBuf);

    });
  });

  req.on('error', function(e) {
    var err = new Error(errorMessage + 'Request Error: ' + e.message);
    if (!called) {
      called = true;
      callback(err);
    }
  });

  req.setHeader('Content-Length', request.length);
  req.setHeader('Content-Type', 'application/json');
  req.setHeader('Authorization', 'Basic ' + auth);
  req.write(request);
  req.end();
}

RpcClient.prototype.batch = function(batchCallback, resultCallback) {
  this.batchedCalls = [];
  batchCallback();
  rpc.call(this, this.batchedCalls, resultCallback);
  this.batchedCalls = null;
};

RpcClient.callspec = apisNoWallet;

var slice = function(arr, start, end) {
  return Array.prototype.slice.call(arr, start, end);
};

function generateRPCMethods(constructor, apiCalls, rpc) {

  function createRPCMethod(methodName, argMap) {
    return function() {

      var limit = arguments.length - 1;

      if (this.batchedCalls) {
        limit = arguments.length;
      }

      for (var i = 0; i < limit; i++) {
        if(argMap[i]) {
          arguments[i] = argMap[i](arguments[i]);
        }
      }

      if (this.batchedCalls) {
        this.batchedCalls.push({
          jsonrpc: '2.0',
          method: methodName,
          params: slice(arguments),
          id: getRandomId()
        });
      } else {
        rpc.call(this, {
          method: methodName,
          params: slice(arguments, 0, arguments.length - 1),
          id: getRandomId()
        }, arguments[arguments.length - 1]);
      }

    };
  };

  var types = {
    str: function(arg) {
      return arg.toString();
    },
    int: function(arg) {
      return parseFloat(arg);
    },
    float: function(arg) {
      return parseFloat(arg);
    },
    bool: function(arg) {
      return (arg === true || arg == '1' || arg == 'true' || arg.toString().toLowerCase() == 'true');
    },
    obj: function(arg) {
      if(typeof arg === 'string') {
        return JSON.parse(arg);
      }
      return arg;
    }
  };

  for(var k in apiCalls) {
    var spec = apiCalls[k].split(' ');
    for (var i = 0; i < spec.length; i++) {
      if(types[spec[i]]) {
        spec[i] = types[spec[i]];
      } else {
        spec[i] = types.str;
      }
    }
    var methodName = k.toLowerCase();
    constructor.prototype[k] = createRPCMethod(methodName, spec);
    constructor.prototype[methodName] = constructor.prototype[k];
  }

}

function getRandomId() {
  return parseInt(Math.random() * 100000);
}

generateRPCMethods(RpcClient, RpcClient.callspec, rpc);

module.exports = RpcClient;
