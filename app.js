"use strict";

const { App } = require('homey');
const utilFunctions = require('./lib/util.js');
const logger = require('./lib/logger.js');

class SmaModbusApp extends App {

  async onInit() {
    // Optional, anonymous error reporting (Sentry). Enabled only when a
    // SENTRY_DSN is present in env.json; a no-op otherwise. Used to size how
    // many installs/inverter models are hit by the Modbus drop-out issue.
    try {
      const telemetryEnabled = logger.init(this.homey);
      // Logging the Node version helps confirm what the 13.3/Bookworm firmware
      // actually runs (central to the Modbus timing regression theory), and it
      // shows in diagnostic reports.
      this.log(`Telemetry ${telemetryEnabled ? 'enabled' : 'disabled'}, Node ${process.version}`);
    } catch (err) {
      this.error(`Failed to initialize telemetry: ${utilFunctions.formatError(err)}`);
    }

    // Safety net: log any stray unhandled promise rejection readably instead of
    // letting a non-Error rejection (e.g. a jsmodbus UserRequestError, which is a
    // plain object) surface as an unreadable '[object Object]' crash report. The
    // underlying causes are transient Modbus errors that are already handled
    // per-device, so logging here also avoids needless crash loops.
    if (!SmaModbusApp.unhandledRejectionHandlerInstalled) {
      SmaModbusApp.unhandledRejectionHandlerInstalled = true;
      process.on('unhandledRejection', (reason) => {
        this.error(`Unhandled promise rejection: ${utilFunctions.formatError(reason)}`);
      });
    }

    if (process.env.DEBUG === '1') {
      const inspector = require('inspector');
      if (inspector.url()) {
        this.log(`Inspector already active at ${inspector.url()}`);
      } else {
        inspector.open(9222, '0.0.0.0', true);
      }
    }
    this.log('Initializing SMA Modbus app ...');
  }

  async onUninit() {
    // Give Sentry a moment to send any buffered events before shutdown.
    await logger.flush();
  }
}

module.exports = SmaModbusApp;
