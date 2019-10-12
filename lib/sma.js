'use strict';

var modbus = require('jsmodbus');
var net = require('net');
var EventEmitter = require('events');
var util = require('util');
var decodeData = require('./decodeData.js');

function SMA(options) {
  var self = this;
  EventEmitter.call(self);
  self.pollIntervals = [];
  self.setupReconnectOptions();

  self.shouldBeConnected = false;
  if (options == null) { options = {} };

  if (options.host && !validateIPaddress(options.host)) {
    console.log(`Invalid IP address '${options.host}'`);
    return;
  }

  self.options = options;
  console.log(self.options);

  self.socket = new net.Socket();
  self.client = new modbus.client.TCP(self.socket, 3);

  self.socket.on('connect', function () {
    console.log('client connected');
    self.shouldBeConnected = true;
    self.setupReconnectOptions();

    self.readProperties();

    //No point in initializing timers if we close connection immediately
    if (self.options.autoClose) {
      //Wait 3 seconds to allow properties to be read
      sleep(3000).then(() => {
        self.disconnect();
      });
    } else {
      self.initilializeTimers();
    }
  });

  self.socket.on('error', function (err) {
    self.emit('error', err);
  });

  self.socket.on('close', function () {
    console.log('Client closed');

    if (self.shouldBeConnected === true) {
      console.log('Client closed unexpected!');
    }
  });

  self.socket.connect(self.options);
}
util.inherits(SMA, EventEmitter);

SMA.prototype.setupReconnectOptions = function () {
  var self = this;
  self.reconnectOptions = {
    attempts: 0,
    lastAttempt: null,
    maxAttemptDelay: 3600, //1h
    interval: 2000
  }
}

SMA.prototype.initilializeTimers = function () {
  var self = this;
  //If refresh interval is set, and we don't have timers
  //initialized already - then create them
  if (self.options.refreshInterval &&
      self.pollIntervals.length === 0) {
    console.log('Timers initialized');
    self.pollIntervals.push(setInterval(() => {
        self.refreshReadings();
    }, 1000 * self.options.refreshInterval));
/*
    self.pollIntervals.push(setInterval(() => {
        self.monitorSocket();
    }, self.reconnectOptions.interval));
*/
  }
}

SMA.prototype.disconnect = function () {
  var self = this;
  self.shouldBeConnected = false;

  self.pollIntervals.forEach(timer => {
      clearInterval(timer);
  });

  if (self.socket) {
    self.socket.destroy();
  }
}

SMA.prototype.isConnected = function () {
  var self = this;

  if (self.socket.connected) {
    return true;
  } else {
    return false;
  }
}

//Called on a timer to make sure we reconnect if we get disconnected
SMA.prototype.monitorSocket = function () {
  var self = this;

  if (self.shouldBeConnected === true && !self.isConnected()) {
    //Connection dropped
    if (((Date.now() - self.reconnectOptions.lastAttempt) > self.reconnectOptions.maxAttemptDelay * 1000)
        || ((Date.now() - self.reconnectOptions.lastAttempt) > self.reconnectOptions.attempts * self.reconnectOptions.interval)) {
      //We are beyond maxAttemptDelay or
      let now = Date.now();
      console.log(`Socket closed, reconnecting for '${self.reconnectOptions.attempts}' time. Last attempt '${(now - (self.reconnectOptions.lastAttempt || now))}' s`);
      self.reconnectOptions.attempts++;
      self.reconnectOptions.lastAttempt = now;
      self.socket.connect(self.options);
    }
  }
}

SMA.prototype.readProperties = function () {
  var self = this;
  let properties = {};
/*
  if (!self.isConnected()) {
    console.log('Cant read properties since socket is not connected!');
    return;
  }
*/
  Promise.all([
    self.client.readHoldingRegisters(30053, 2), //0, Device type
    self.client.readHoldingRegisters(30057, 2), //1, Serial number
    self.client.readHoldingRegisters(30059, 2), //2, Software version
    self.client.readHoldingRegisters(30231, 2) //3, U32, Maximum active power device


  ]).then((results) => {
//    console.log(decodeData.decodeDeviceType(results[0].response._body._valuesAsArray[1]));

    properties.deviceType = decodeData.decodeDeviceType(results[0].response._body._valuesAsArray[1]);
    properties.serialNo = decodeData.decodeSerialNumber(results[1].response._body._valuesAsArray);
    properties.swVersion = decodeData.decodeSoftwareVersion(results[2].response._body._valuesAsArray);
    properties.maxPower = decodeData.decodeU32(results[3].response._body._valuesAsArray);

    self.emit('properties', properties);

  }).catch((err) => {
    console.log(err);
  });
}

SMA.prototype.refreshReadings = function () {
  var self = this;
  let readings = {};

/*
  if (!self.isConnected()) {
    console.log('Cant read properties since socket is not connected!');
    return;
  }
*/

  Promise.all([
    self.client.readHoldingRegisters(30201, 2), //0, U32, Condition
    self.client.readHoldingRegisters(40029, 2), //1, U32, Operating status
    self.client.readHoldingRegisters(30775, 2), //2, S32, AC power total
    self.client.readHoldingRegisters(30769, 2), //3, S32, 3 decomals DC current input 1
    self.client.readHoldingRegisters(30957, 2), //4, S32, 3 decomals DC current input 2
    self.client.readHoldingRegisters(30771, 2), //5, S32 2 decimals, DC voltage input 1
    self.client.readHoldingRegisters(30959, 2), //6, S32 2 decimals, DC voltage input 2
    self.client.readHoldingRegisters(30535, 2), //7, U32, Daily yield Wh
    self.client.readHoldingRegisters(30529, 2), //8, U32, Total yield Wh
    self.client.readHoldingRegisters(30783, 2), //9, U32, 2 decimals, AC Voltage L1
    self.client.readHoldingRegisters(30953, 2), //10, S32 1 decimal, Internal temperature

  ]).then((results) => {
/*
    debug('DC current input 1', results[0].response._body._valuesAsArray, decodeData.decodeS32(results[0].response._body._valuesAsArray, 3, 1));
    debug('DC current input 2', results[1].response._body._valuesAsArray, decodeData.decodeS32(results[1].response._body._valuesAsArray, 3, 1));
    debug('DC voltage input 1', results[2].response._body._valuesAsArray, decodeData.decodeS32(results[2].response._body._valuesAsArray, 2, 0));
    debug('DC voltage input 2', results[3].response._body._valuesAsArray, decodeData.decodeS32(results[3].response._body._valuesAsArray, 2, 0));
*/

    readings.condition = decodeData.decodeCondition(results[0].response._body._valuesAsArray);
    readings.status = decodeData.decodeStatus(results[1].response._body._valuesAsArray);
    readings.acPowerTotal = decodeData.decodeS32(results[2].response._body._valuesAsArray, 0, 0);
    readings.dcCurrentA = decodeData.decodeS32(results[3].response._body._valuesAsArray, 3, 1);
    readings.dcCurrentB = decodeData.decodeS32(results[4].response._body._valuesAsArray, 3, 1);
    readings.dcVoltageA = decodeData.decodeS32(results[5].response._body._valuesAsArray, 2, 0);
    readings.dcVoltageB = decodeData.decodeS32(results[6].response._body._valuesAsArray, 2, 0);
    readings.dailyYield = formatWHasKWH(decodeData.decodeU32(results[7].response._body._valuesAsArray, 0, 0));
    readings.totalYield = formatWHasMWH(decodeData.decodeU32(results[8].response._body._valuesAsArray, 0, 0));
    readings.acVoltageL1 = decodeData.decodeU32(results[9].response._body._valuesAsArray, 2, 0);
    readings.internalTemp = decodeData.decodeS32(results[10].response._body._valuesAsArray, 1, 1);

    self.emit('readings', readings);

  }).catch((err) => {
    console.log(err);
  });
}

function debug(key, arr, val) {
  console.log(`Key: '${key}', Array: '${arr}', Value: '${val}'`);
}

function formatWHasKWH(whValue) {
  return parseFloat(Number(whValue / 1000).toFixed(2));
}

function formatWHasMWH(whValue) {
  return parseFloat(Number(whValue / 1000 / 1000).toFixed(3));
}

function validateIPaddress(ipaddress) {
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
    return (true)
  } else {
    return (false)
  }
}

// sleep time expects milliseconds
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

exports = module.exports = SMA;
