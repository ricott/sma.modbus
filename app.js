"use strict";

const Homey = require('homey');

class SmaModbusApp extends Homey.App {

  onInit() {
    this.log('Initializing SMA Modbus app ...');
  }

}

module.exports = SmaModbusApp;
