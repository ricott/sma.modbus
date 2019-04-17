"use strict";

const Homey = require('homey');

class SmaModbusStorageDriver extends Homey.Driver {

  onInit() {
    new Homey.FlowCardTriggerDevice('changedOperationalStatus').register();
    new Homey.FlowCardTriggerDevice('changedBattery').register();
    new Homey.FlowCardTriggerDevice('changedBatteryCharging').register();
    new Homey.FlowCardTriggerDevice('changedBatteryDischarging').register();
    new Homey.FlowCardTriggerDevice('changedPowerDrawn').register();
    new Homey.FlowCardTriggerDevice('changedPowerGridFeedin').register();
    new Homey.FlowCardTriggerDevice('changedBatteryCapacity').register();
  }

}

module.exports = SmaModbusStorageDriver;
