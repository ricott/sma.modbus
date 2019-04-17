"use strict";

const Homey = require('homey');

class SmaModbusApp extends Homey.App {

  onInit() {
    this.log('Initializing SMA Modbus app ...');

    new Homey.FlowCardCondition('isOperationalStatus')
      .register()
      .registerRunListener((args, state) => {
        if (args.device.getCapabilityValue('operational_status') == Homey.__('Off') && args.status == '303') {
          return Promise.resolve(true);
        } else if (args.device.getCapabilityValue('operational_status') == Homey.__('Standby') && args.status == '2291') {
          return Promise.resolve(true);
        } else if (args.device.getCapabilityValue('operational_status') == Homey.__('Charge') && args.status == '2292') {
          return Promise.resolve(true);
        } else if (args.device.getCapabilityValue('operational_status') == Homey.__('Discharge') && args.status == '2293') {
          return Promise.resolve(true);
        } else if (args.device.getCapabilityValue('operational_status') == Homey.__('NA') && args.status == '16777213') {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      })
  }

}

module.exports = SmaModbusApp;
