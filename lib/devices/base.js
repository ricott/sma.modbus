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
    // Disable Nagle's algorithm. Modbus TCP is a chatty request/response
    // protocol: Nagle (on by default) can hold a small request waiting for the
    // previous ACK while the peer's delayed-ACK waits for data, stalling
    // back-to-back register reads. That is consistent with what we see on some
    // SMA inverters - a single read succeeds but a multi-register sweep times
    // out - and disabling it is the recommended default for Modbus TCP.
    this.#socket.setNoDelay(true);
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

  // Reads device type + info registries once and emits 'properties'.
  // Returns { ok, poisoned }: `ok` is true when properties were emitted;
  // `poisoned` is true when a read desynchronized the connection so the caller
  // can reset the socket. Never throws / rethrows: callers run in fire-and-forget
  // contexts (the polling timer and the socket 'connect' callback), and the raw
  // jsmodbus error is a plain object (UserRequestError, not an Error), so
  // rethrowing would surface as an unhandled '[object Object]' rejection.
  async #readProperties() {
    let poisoned = false;
    try {
      // Device type is critical - without it we can't map any registers, so a
      // failure here means we retry on the next poll rather than proceeding.
      let deviceTypeValues;
      try {
        const results = await Promise.all([
          this.client.readHoldingRegisters(30053, 2)
        ]);
        deviceTypeValues = results[0].response._body._valuesAsArray;
      } catch (err) {
        poisoned = util.isConnectionPoisoningError(err);
        this.emit('error', new Error(`Failed to set Device Type! ${util.formatError(err)}`));
        return { ok: false, poisoned };
      }

      this.#deviceType = this.#deviceRegistryHandler.decodeDeviceType(deviceTypeValues);
      this.modbusSettings = this.#deviceRegistryHandler.getModbusRegistrySettings(this.#deviceType);

      // Info registries are read tolerantly: a register that times out yields
      // zeros (the device applies sensible defaults) so a marginal inverter can
      // still finish initializing instead of being stuck forever.
      const { values, poisoned: batchPoisoned } = await util.readModbus(this.client, this.#deviceRegistryHandler.getInfoRegistries(this.modbusSettings), this.#deviceType, this);
      poisoned = poisoned || batchPoisoned;

      let properties = this.#deviceRegistryHandler.getInfoValues(this.modbusSettings, values);
      properties.deviceType = this.#deviceType;
      this.emit('properties', properties);
      this.#infoRegistriesRead = true;
      return { ok: true, poisoned };

    } catch (err) {
      this.emit('error', new Error(`Failed to set Device Type! ${util.formatError(err)}`));
      return { ok: false, poisoned };
    }
  }

  getDeviceCapabilities() {
    return this.#deviceRegistryHandler.getCapabilityKeys(this.modbusSettings);
  }

  async #refreshReadings() {
    // Don't stack a new cycle on top of a still-running one or an in-progress
    // reconnect; both share the single Modbus client/socket. A failing sweep can
    // take much longer than the polling interval, so without this the interval
    // would pile requests onto the socket.
    if (this.#refreshing || this.#reconnecting) {
      this._logMessage('DEBUG', 'Skipping readings, a refresh or reconnect is already in progress');
      return;
    }

    this.#refreshing = true;
    let poisoned = false;
    // if/else (no early return) so control always reaches the reconnect check.
    try {
      if (!this.#isConnected()) {
        this._logMessage('INFO', 'Skipping readings since socket is not connected!');
      } else if (!this.#infoRegistriesRead) {
        this._logMessage('INFO', 'Info registries not read yet, reading them now!');
        const result = await this.#readProperties();
        poisoned = result.poisoned;
      } else if (!this.modbusSettings) {
        this._logMessage('INFO', 'Modbus settings object is null!');
      } else {
        const { values, poisoned: readPoisoned } = await util.readModbus(this.client, this.#deviceRegistryHandler.getReadingRegistries(this.modbusSettings), this.#deviceType, this);
        poisoned = readPoisoned;
        // Emit whatever was read (failed registers are zeros) so the device keeps
        // reporting through transient glitches instead of going silent.
        const readings = this.#deviceRegistryHandler.getReadingValues(this.modbusSettings, values);
        this.emit('readings', readings);
      }
    } catch (err) {
      // Never let this fire-and-forget polling method reject; log readably.
      this._logMessage('INFO', `Failed to refresh readings: ${util.formatError(err)}`);
    } finally {
      this.#refreshing = false;
    }

    // A read desynchronized the request/response stream. Reset the socket so the
    // next poll starts clean instead of looping on OutOfSync errors. Done outside
    // the refreshing guard so the #reconnecting guard alone serializes it against
    // the next scheduled poll.
    if (poisoned && !this.#reconnecting) {
      this._logMessage('INFO', 'Modbus connection out of sync, resetting socket to recover');
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
