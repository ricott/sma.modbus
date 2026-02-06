"use strict";

const { App } = require('homey');

class SmaModbusApp extends App {

  async onInit() {
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
