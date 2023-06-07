'use strict';

const modbus = require('jsmodbus');
const net = require('net');
const inverterType = require('./inverterType.js');
const HomeyEventEmitter = require('./homeyEventEmitter.js');

class SMA extends HomeyEventEmitter {
  constructor(options) {
    super();
    if (options == null) { options = {} };

    var self = this;
    self.pollIntervals = [];
    self.connected = false;
    self.shouldBeConnected = false;
    self.#setupReconnectOptions();
    //STP .... used for setting modbus settings
    self.deviceType = null;
    self.modbusSettings = null;

    if (options.host && !validateIPaddress(options.host)) {
      self._logMessage('INFO', `Invalid IP address '${options.host}'`);
      return;
    }

    isPortAvailable(options.host, options.port)
      .then(function (available) {
        if (!available) {
          let errMsg = `Port '${options.port}' on IP Address '${options.host}' is NOT reachable`;
          self._logMessage('INFO', errMsg);
          self.emit('error', new Error(errMsg));
          return;
        }
      });

    self.options = options;
    self._logMessage('DEBUG', self.options);

    self.#initListenersAndConnect();
  }

  #setupReconnectOptions() {
    this.reconnectOptions = {
      attempts: 0,
      lastAttempt: null,
      maxAttemptDelay: 60, //1h
      interval: 2000
    }
  }

  #initListenersAndConnect() {
    var self = this;

    self.socket = new net.Socket();
    //Timeout is default 5000 ms
    self.client = new modbus.client.TCP(self.socket, 3, 5000);

    self.socket.on('connect', function () {
      self._logMessage('INFO', `Inverter client connected on IP '${self.options.host}'`);
      self.connected = true;
      self.shouldBeConnected = true;
      //Connect successful, reset options
      self.#setupReconnectOptions();
      self.#readProperties();

      //No point in initializing timers if we close connection immediately
      if (self.options.autoClose) {
        //Wait 3 seconds to allow properties to be read
        self._sleep(3000).then(() => {
          self.disconnect();
        });
      } else {
        self.#initilializeTimers();
      }
    });

    self.socket.on('error', function (err) {
      self.emit('error', err);
    });

    self.socket.on('close', function () {
      if (self.connected) {
        self._logMessage('INFO', `Client closed for IP '${self.options.host}'`);
        self.connected = false;

        if (self.shouldBeConnected === true) {
          self._logMessage('INFO', 'Client closed unexpected!');
        }
      }
    });

    self.socket.connect(self.options);
  }

  #initilializeTimers() {
    var self = this;
    //If refresh interval is set, and we don't have timers
    //initialized already - then create them
    if (self.options.refreshInterval && self.pollIntervals.length === 0) {
      self._logMessage('INFO', 'Inverter timers initialized');
      self.pollIntervals.push(self._setInterval(() => {
        self.#refreshReadings();
      }, 1000 * self.options.refreshInterval));

      self.pollIntervals.push(self._setInterval(() => {
        self.#monitorSocket();
      }, self.reconnectOptions.interval));

    }
  }

  disconnect() {
    var self = this;
    self.shouldBeConnected = false;

    self.pollIntervals.forEach(timer => {
      self._clearInterval(timer);
    });

    if (self.socket) {
      self.socket.destroy();
    }
  }

  isConnected() {
    var self = this;

    if (self.connected) {
      return true;
    } else {
      return false;
    }
  }

  //Called on a timer to make sure we reconnect if we get disconnected
  #monitorSocket() {
    var self = this;

    if (self.shouldBeConnected === true) {
      if (!self.connected) {
        //Connection dropped
        if (((Date.now() - self.reconnectOptions.lastAttempt) > self.reconnectOptions.maxAttemptDelay * 1000)
          || ((Date.now() - self.reconnectOptions.lastAttempt) > self.reconnectOptions.attempts * self.reconnectOptions.interval)) {
          //We are beyond maxAttemptDelay or
          let now = Date.now();
          self._logMessage('INFO', `Socket closed, reconnecting for '${self.reconnectOptions.attempts}' time. Last attempt '${(now - (self.reconnectOptions.lastAttempt || now))}' s`);
          self.reconnectOptions.attempts++;
          self.reconnectOptions.lastAttempt = now;
          //self.socket.connect(self.options);
          self.initListenersAndConnect();
        }
      }
    }
  }

  #readProperties() {
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

  getDeviceCapabilities() {
    return inverterType.getCapabilityKeys(this.modbusSettings);
  }

  isDailyYieldManual() {
    return inverterType.isDailyYieldManual(this.modbusSettings);
  }

  #refreshReadings() {
    var self = this;

    if (!self.isConnected()) {
      self._logMessage('INFO', 'Cant read readings since socket is not connected!');
      return;
    }

    if (!self.modbusSettings) {
      self._logMessage('INFO', 'Modbus settings object is null!');
      return;
    }

    readModbus(self, inverterType.getReadingRegistries(self.modbusSettings))
      .then((result) => {
        let readings = inverterType.getReadingValues(self.modbusSettings, result);
        self.emit('readings', readings);
      });
  }
}
module.exports = SMA;

// Function to fetch values from modbus
const modbusReading = async (self, registryId) => {
  try {
    const result = await self.client.readHoldingRegisters(registryId, 2);
    return result.response._body._valuesAsArray;
  } catch (err) {
    console.log(err);
    self.emit('error', new Error(`Failed to read '${registryId}' for device type '${self.deviceType}'`));
    return [0, 0];
  }
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
