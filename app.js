"use strict";

const { App } = require('homey');
const { Log } = require('homey-log');

class SmaModbusApp extends App {

  async onInit() {
    this.homeyLog = new Log({ homey: this.homey });
    this.log('Initializing SMA Modbus app ...');
  }
}

module.exports = SmaModbusApp;
