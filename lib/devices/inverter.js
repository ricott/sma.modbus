'use strict';

const inverterRegistryHandler = require('../modbus/inverter/inverterRegistryHandler.js');
const Base = require('./base.js');

class Inverter extends Base {

  constructor(options = {}) {
    super(inverterRegistryHandler, options);
  }

  isDailyYieldManual() {
    return inverterRegistryHandler.isDailyYieldManual(this.modbusSettings);
  }

  async setMaxActivePowerOutput(power) {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt16BE(0, 0);
    buffer.writeUInt16BE(power, 2);

    // Inverter.WMax, Set active power limit, Device > Inverter > Maximum active power output
    await this.client.writeMultipleRegisters(40915, buffer);
    return true;
  }
}
module.exports = Inverter;
