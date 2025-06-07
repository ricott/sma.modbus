'use strict';

const modbus = require('jsmodbus');
const net = require('net');
const HomeyEventEmitter = require('./homeyEventEmitter.js');
const util = require('../util.js');

class Base extends HomeyEventEmitter {

  modbusSettings = null;
  #deviceRegistryHandler = null;
  #intervalIds = [];
  #deviceType = null;
  #socket = null;
  client = null;
  #infoRegistriesRead = false;
  // Health check loop with exponential backoff reconnect logic
  #healthCheckInterval = null;
  #healthCheckRetries = 0;
  #maxHealthCheckDelay = 600_000; // 10 minutes maximum backoff

  constructor(deviceRegistryHandler, options = {}) {
    super();
    this.#deviceRegistryHandler = deviceRegistryHandler;
    this.options = options;

    if (this.options.host && !util.validateIPaddress(this.options.host)) {
      this._logMessage('INFO', `Invalid IP address '${this.options.host}'`);
      return;
    }

    this._logMessage('DEBUG', this.options);

    // Wait for validation before proceeding
    this.#initializeDevice();
  }

  async #initializeDevice() {
    try {
      const available = await util.isModbusAvailable(this.options.host, this.options.port, this._logMessage.bind(this));
      if (!available) {
        let errMsg = `Port '${this.options.port}' on IP Address '${this.options.host}' is NOT reachable`;
        this._logMessage('INFO', errMsg);
        this.emit('error', new Error(errMsg));
        return;
      }

      // Only proceed with connection if validation passed
      this.#initListenersAndConnect();

    } catch (err) {
      this._logMessage('ERROR', `Validation failed: ${err.message}`);
      this.emit('error', err);
    }
  }

  async #initListenersAndConnect() {
    this.#socket = new net.Socket();
    this.client = new modbus.client.TCP(this.#socket, 3, 5000);

    return new Promise((resolve, reject) => {
      this.#socket.connect(this.options,
        async () => {
          this._logMessage('INFO', `Client connected on IP '${this.options.host}'`);

          if (this.options.autoClose) {
            // Read properties and then disconnect
            await this.#readProperties();
            this._logMessage('INFO', 'Auto close is enabled, disconnecting!');
            this.disconnect();
            return;
          }

          this.#initilializeTimers();

          this.#startHealthCheckLoop();

          resolve();
        });

      this.#socket.on('error', (err) => {
        this.emit('error', err);
      });

      this.#socket.on('close', () => {
        this._logMessage('INFO', `Client closed for IP '${this.options.host}'`);
      });
    });
  }

  #initilializeTimers() {
    //If refresh interval is set, and we don't have timers
    //initialized already - then create them
    if (this.options.refreshInterval && this.#intervalIds.length === 0) {
      this._logMessage('INFO', 'Timers initialized');
      this.#intervalIds.push(this._setInterval(() => {
        this.#refreshReadings();
      }, 1000 * this.options.refreshInterval));
    }
  }

  disconnect() {
    for (const timer of this.#intervalIds) {
      this._clearInterval(timer);
    }

    if (this.#healthCheckInterval) {
      this._clearTimeout(this.#healthCheckInterval);
    }

    if (this.#socket) {
      this.#socket.destroy();
    }
  }

  #isConnected() {
    return this.client && this.client._socket && this.client._socket.readable && this.client._socket.writable && !this.client._socket.destroyed && !this.client._socket.connecting;
  }

  async #readProperties() {
    try {
      //Device type
      const results = await Promise.all([
        this.client.readHoldingRegisters(30053, 2)
      ]);

      this.#deviceType = this.#deviceRegistryHandler.decodeDeviceType(results[0].response._body._valuesAsArray);
      this.modbusSettings = this.#deviceRegistryHandler.getModbusRegistrySettings(this.#deviceType);

      const result = await util.readModbus(this.client, this.#deviceRegistryHandler.getInfoRegistries(this.modbusSettings), this.#deviceType, this);
      let properties = this.#deviceRegistryHandler.getInfoValues(this.modbusSettings, result);
      properties.deviceType = this.#deviceType;
      this.emit('properties', properties);
      this.#infoRegistriesRead = true;

    } catch (err) {
      let noDeviceTypeErr = new Error('Failed to set Device Type!', err);
      this.emit('error', noDeviceTypeErr);
      throw err;
    }
  }

  getDeviceCapabilities() {
    return this.#deviceRegistryHandler.getCapabilityKeys(this.modbusSettings);
  }

  async #refreshReadings() {
    if (!this.#isConnected()) {
      this._logMessage('INFO', 'Skipping readings since socket is not connected!');
      return;
    }

    if (!this.#infoRegistriesRead) {
      this._logMessage('INFO', 'Info registries not read yet, reading them now!');
      await this.#readProperties();
      return;
    }

    if (!this.modbusSettings) {
      this._logMessage('INFO', 'Modbus settings object is null!');
      return;
    }

    util.readModbus(this.client, this.#deviceRegistryHandler.getReadingRegistries(this.modbusSettings), this.#deviceType, this)
      .then((result) => {
        let readings = this.#deviceRegistryHandler.getReadingValues(this.modbusSettings, result);
        this.emit('readings', readings);
      });
  }

  #startHealthCheckLoop() {
    if (this.#healthCheckInterval) {
      return;
    }

    const runCheck = async () => {
      if (this.#isConnected()) {
        this.#healthCheckRetries = 0;
        this.#healthCheckInterval = setTimeout(runCheck, 10_000); // Normal interval if healthy
        return;
      }

      try {
        this._logMessage('INFO', 'Health check failed, attempting to reconnect...');

        // Simple cleanup
        if (this.#socket) {
          this.#socket.removeAllListeners();
          this.#socket.destroy();
        }

        await this.#initListenersAndConnect();
        this.#healthCheckRetries = 0;
      } catch (err) {
        this.#healthCheckRetries++;
        const delay = Math.min(1000 * 2 ** this.#healthCheckRetries, this.#maxHealthCheckDelay);
        this._logMessage('INFO', `Reconnect failed, retrying in ${delay} ms`);
        this._clearTimeout(this.#healthCheckInterval);
        this.#healthCheckInterval = this._setTimeout(runCheck, delay);
        return;
      }

      this.#healthCheckInterval = this._setTimeout(runCheck, 10_000); // Normal interval if reconnected
    };
    runCheck();
  }
}
module.exports = Base;
