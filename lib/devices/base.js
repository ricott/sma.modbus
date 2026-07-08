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
  // Guards so overlapping polls and socket resets don't run concurrently on the
  // shared client. A failing read cycle can take much longer than the polling
  // interval, so without these the interval would stack requests on the socket.
  #refreshing = false;
  #reconnecting = false;

  constructor(deviceRegistryHandler, options = {}) {
    super();
    this.#deviceRegistryHandler = deviceRegistryHandler;
    this.options = options;

    if (this.options.host && !util.validateIPaddress(this.options.host)) {
      this._logMessage('INFO', `Invalid IP address '${this.options.host}'`);
      return;
    }

    this._logMessage('DEBUG', `Initializing with options: host=${this.options.host}, port=${this.options.port}, refreshInterval=${this.options.refreshInterval}, autoClose=${this.options.autoClose}`);

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

      // Only proceed with connection if validation passed.
      // #initListenersAndConnect() can now reject on a connect error; the socket
      // 'error' handler already emits 'error' for the device to act on, so here
      // we only swallow the rejection to avoid an unhandled promise rejection.
      this.#initListenersAndConnect().catch((err) => {
        this._logMessage('DEBUG', `Initial connection attempt failed: ${util.formatError(err)}`);
      });

    } catch (err) {
      this._logMessage('ERROR', `Validation failed: ${err.message}`);
      this.emit('error', err);
    }
  }

  async #initListenersAndConnect() {
    this.#socket = new net.Socket();
    this.client = new modbus.client.TCP(this.#socket, 3, 5000);

    return new Promise((resolve, reject) => {
      // Ensure the promise settles exactly once. Previously a connection error
      // only emitted 'error' and never settled the promise, so callers that
      // await this (health check / reconnect) could hang forever.
      let settled = false;

      this.#socket.connect(this.options,
        async () => {
          settled = true;
          this._logMessage('INFO', `Client connected on IP '${this.options.host}'`);

          if (this.options.autoClose) {
            // Read properties and then disconnect. Use try/finally so the socket
            // is always closed even if reading properties fails (avoids leaks).
            try {
              await this.#readProperties();
            } finally {
              this._logMessage('INFO', 'Auto close is enabled, disconnecting!');
              this.disconnect();
            }
            resolve();
            return;
          }

          this.#initilializeTimers();

          this.#startHealthCheckLoop();

          resolve();
        });

      this.#socket.on('error', (err) => {
        this.emit('error', err);
        // Only reject for errors during the initial connect. Once connected,
        // socket errors are handled by the health check loop instead.
        if (!settled) {
          settled = true;
          reject(err);
        }
      });

      this.#socket.on('close', () => {
        this._logMessage('INFO', `Client closed for IP '${this.options.host}'`);
      });
    });
  }

  // Tears down the current socket/client and establishes a fresh connection.
  // Used to recover from a desynchronized Modbus stream (see #refreshReadings):
  // destroying the socket flushes any stale/late response still in the OS buffer
  // and the new jsmodbus client resets its transaction id counter, so requests
  // and responses line up again.
  async #reconnect() {
    if (this.#reconnecting) {
      return;
    }
    this.#reconnecting = true;
    try {
      if (this.#socket) {
        this.#socket.removeAllListeners();
        this.#socket.destroy();
      }
      await this.#initListenersAndConnect();
      this._logMessage('INFO', 'Modbus socket reset complete after out-of-sync recovery');
    } catch (err) {
      // Leave further recovery to the health check loop / device watchdog.
      this._logMessage('INFO', `Failed to reset Modbus socket: ${util.formatError(err)}`);
    } finally {
      this.#reconnecting = false;
    }
  }

  #initilializeTimers() {
    //If refresh interval is set, and we don't have timers
    //initialized already - then create them
    if (this.options.refreshInterval && this.#intervalIds.length === 0) {
      this._logMessage('INFO', 'Timers initialized');
      this.#intervalIds.push(this._setInterval(() => {
        this.#refreshReadings().catch((err) => {
          this._logMessage('INFO', `Unhandled error while refreshing readings: ${util.formatError(err)}`);
        });
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
      // Emit a proper Error so the device's 'error' handler logs it readably.
      // Important: do NOT rethrow. Callers run in fire-and-forget contexts (the
      // polling timer and the socket 'connect' callback), and the raw jsmodbus
      // error is a plain object (UserRequestError, not an Error), so rethrowing
      // surfaces as an unhandled '[object Object]' rejection / crash report.
      const noDeviceTypeErr = new Error(`Failed to set Device Type! ${util.formatError(err)}`);
      this.emit('error', noDeviceTypeErr);
    }
  }

  getDeviceCapabilities() {
    return this.#deviceRegistryHandler.getCapabilityKeys(this.modbusSettings);
  }

  async #refreshReadings() {
    // Don't stack a new cycle on top of a still-running one or an in-progress
    // reconnect; both share the single Modbus client/socket.
    if (this.#refreshing || this.#reconnecting) {
      this._logMessage('DEBUG', 'Skipping readings, a refresh or reconnect is already in progress');
      return;
    }

    this.#refreshing = true;
    let connectionPoisoned = false;
    try {
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

      const result = await util.readModbus(this.client, this.#deviceRegistryHandler.getReadingRegistries(this.modbusSettings), this.#deviceType, this);
      const readings = this.#deviceRegistryHandler.getReadingValues(this.modbusSettings, result);
      this.emit('readings', readings);
    } catch (err) {
      if (err && err.connectionPoisoned) {
        // The request/response stream is out of sync. Reset the socket below so
        // the next cycle starts clean instead of looping on OutOfSync errors.
        connectionPoisoned = true;
        this._logMessage('INFO', 'Modbus connection out of sync, resetting socket to recover');
      } else {
        // Never let this fire-and-forget polling method reject; log readably.
        this._logMessage('INFO', `Failed to refresh readings: ${util.formatError(err)}`);
      }
    } finally {
      this.#refreshing = false;
    }

    // Reconnect outside the refreshing guard so the #reconnecting guard alone
    // serializes it against the next scheduled poll.
    if (connectionPoisoned) {
      await this.#reconnect();
    }
  }

  #startHealthCheckLoop() {
    if (this.#healthCheckInterval) {
      return;
    }

    const runCheck = async () => {
      // A poison-triggered reconnect is already rebuilding the socket; don't
      // race it with a second reconnect from here.
      if (this.#reconnecting) {
        this.#healthCheckInterval = this._setTimeout(runCheck, 10_000);
        return;
      }

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
