"use strict";

const { App } = require('homey');
const utilFunctions = require('./lib/util.js');

class SmaModbusApp extends App {

  async onInit() {
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

    if (process.env.DEBUG == '1') {
      const inspector = require('inspector');
      if (inspector.url()) {
        this.log(`Inspector already active at ${inspector.url()}`);
      } else {
        inspector.open(9222, '0.0.0.0', true);
      }
    }
    this.log('Initializing SMA Modbus app ...');
  }
}

module.exports = SmaModbusApp;
