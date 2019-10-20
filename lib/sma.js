'use strict';

var modbus = require('jsmodbus');
var net = require('net');
var EventEmitter = require('events');
var util = require('util');
const inverterType = require('./inverterType.js');

function SMA(options) {
  var self = this;
  EventEmitter.call(self);
  self.pollIntervals = [];
  self.connected = false;
  self.shouldBeConnected = false;
  self.setupReconnectOptions();
  //STP .... used for setting modubs settings
  self.deviceType = null;
  self.modbusSettings = null;

  if (options == null) { options = {} };

  if (options.host && !validateIPaddress(options.host)) {
    console.log(`Invalid IP address '${options.host}'`);
    return;
  }

  isPortAvailable(options.host, options.port)
    .then(function (available) {
      if (!available) {
        let errMsg = `Port '${options.port}' on IP Address '${options.host}' is NOT reachable`;
        console.log(errMsg);
        return;
      }
    });

  self.options = options;
  console.log(self.options);

  self.initListenersAndConnect();
}
util.inherits(SMA, EventEmitter);

SMA.prototype.setupReconnectOptions = function () {
  var self = this;
  self.reconnectOptions = {
    attempts: 0,
    lastAttempt: null,
    maxAttemptDelay: 60, //1h
    interval: 2000
  }
}

SMA.prototype.initListenersAndConnect = function () {
  var self = this;

  self.socket = new net.Socket();
  self.client = new modbus.client.TCP(self.socket, 3);

  self.socket.on('connect', function () {
    console.log('client connected');
    self.connected = true;
    self.shouldBeConnected = true;
    //Connect successful, reset options
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
    if (self.connected) {
      console.log('Client closed');
      self.connected = false;

      if (self.shouldBeConnected === true) {
        console.log('Client closed unexpected!');
      }
    }
  });

  self.socket.connect(self.options);
}

SMA.prototype.initilializeTimers = function () {
  var self = this;
  //If refresh interval is set, and we don't have timers
  //initialized already - then create them
  if (self.options.refreshInterval && self.pollIntervals.length === 0) {
    console.log('Timers initialized');
    self.pollIntervals.push(setInterval(() => {
        self.refreshReadings();
    }, 1000 * self.options.refreshInterval));

    self.pollIntervals.push(setInterval(() => {
        self.monitorSocket();
    }, self.reconnectOptions.interval));

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

  if (self.connected) {
    return true;
  } else {
    return false;
  }
}

//Called on a timer to make sure we reconnect if we get disconnected
SMA.prototype.monitorSocket = function () {
  var self = this;

  if (self.shouldBeConnected === true) {
    if (!self.connected) {
      //Connection dropped
      if (((Date.now() - self.reconnectOptions.lastAttempt) > self.reconnectOptions.maxAttemptDelay * 1000)
          || ((Date.now() - self.reconnectOptions.lastAttempt) > self.reconnectOptions.attempts * self.reconnectOptions.interval)) {
        //We are beyond maxAttemptDelay or
        let now = Date.now();
        console.log(`Socket closed, reconnecting for '${self.reconnectOptions.attempts}' time. Last attempt '${(now - (self.reconnectOptions.lastAttempt || now))}' s`);
        self.reconnectOptions.attempts++;
        self.reconnectOptions.lastAttempt = now;
        //self.socket.connect(self.options);
        self.initListenersAndConnect();
      }
    }
  }
}

SMA.prototype.readProperties = function () {
  var self = this;
  
  //Device type
  Promise.all([
    self.client.readHoldingRegisters(30053, 2)
  ]).then((results) => {
    self.deviceType = inverterType.decodeDeviceType(results[0].response._body._valuesAsArray);
    self.modbusSettings = inverterType.getModbusRegistrySettings(self.deviceType);

    readModbus(self, inverterType.getInfoRegistries(self.modbusSettings))
      .then((result) => {
        let properties = inverterType.getInfoValues(self.modbusSettings, result);
        properties.deviceType = self.deviceType;
        self.emit('properties', properties);
      });

  }).catch((err) => {
    let noDeviceTypeErr = new Error('Failed to set Device Type!', err);
    self.emit('error', noDeviceTypeErr);
    return Promise.reject(err);
  });
}

SMA.prototype.getDeviceCapabilities = function () {
  var self = this;
  return inverterType.getCapabilityKeys(self.modbusSettings);
}


SMA.prototype.refreshReadings = function () {
  var self = this;

  if (!self.isConnected()) {
    console.log('Cant read readings since socket is not connected!');
    return;
  }

  readModbus(self, inverterType.getReadingRegistries(self.modbusSettings))
    .then((result) => {
      let readings = inverterType.getRegistriesValues(self.modbusSettings, result);
      self.emit('readings', readings);
    });
}

// Function to fetch values from modbus
const modbusReading = async (self, registryId) => {
  const result = await self.client.readHoldingRegisters(registryId, 2);
  return result.response._body._valuesAsArray;
}

// Iterates all modbus registries and returns their value
const readModbus = async (self, modbusRegistries) => {
  const requests = modbusRegistries.map((registryId) => {
    return modbusReading(self, registryId)
     .then((reading) => {
      return reading;
      });
  });
  return Promise.all(requests); // Waiting for all the readings to get resolved.
}

function validateIPaddress(ipaddress) {
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
    return (true)
  } else {
    return (false)
  }
}

function isPortAvailable(address, port) {
	return new Promise((resolve => {
		const socket = new net.Socket();

		const onError = () => {
			socket.destroy();
			resolve(false);
		};

		socket.setTimeout(1000);
		socket.once('error', onError);
		socket.once('timeout', onError);

		socket.connect(port, address, () => {
			socket.end();
			resolve(true);
		});
	}));
}

// sleep time expects milliseconds
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

exports = module.exports = SMA;
