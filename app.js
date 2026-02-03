"use strict";

const { App } = require('homey');
const { Log } = require('homey-log');

class SmaModbusApp extends App {

  async onInit() {
    this.homeyLog = new Log({ homey: this.homey });
    if (process.env.DEBUG == '1') {
      require('inspector').open(9222, '0.0.0.0', true);
    }
    this.log('Initializing SMA Modbus app ...');
  }
}

module.exports = SmaModbusApp;
