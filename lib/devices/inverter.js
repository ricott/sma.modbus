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

    // Inverter.WModCfg.WCnstCfg.W (40212), volatile RAM register for the
    // active power limit in Watt. Resets to maxPower on inverter reboot.
    // We deliberately do NOT write to the persistent flash register 40915
    // (Inverter.WMax) since cyclical writes there wear flash memory and
    // can lock the user out for 20h per write after ~1000 writes.
    await this.client.writeMultipleRegisters(40212, buffer);
    return true;
  }
}
module.exports = Inverter;
