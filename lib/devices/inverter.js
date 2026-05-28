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

    // Inverter.WMax (40915), persistent flash register holding the manual
    // active power limit in Watt. Cyclical writes wear flash. Use the
    // dedicated 'Set active power curtailment (%)' action (writes 40023)
    // for repeated/automated control instead.
    await this.client.writeMultipleRegisters(40915, buffer);
    return true;
  }

  /**
   * Write a curtailment percentage to Inverter.WModCfg.WCtlComCfg.WNomPrc (40023).
   *
   * This is SMA's intended pattern for repeated/automated active power control.
   * The value is interpreted as a fraction of the manual power limit (40915),
   * encoded as %·100 in the SunSpec WMaxLimPct convention:
   *   10000 = 100.00 %, 0 = full curtailment.
   *
   * The inverter applies a fallback after a configured time of inactivity
   * (typically 10 min) and returns to 100 %. Both 'enable external control'
   * and the fallback time must be configured in EnnexOS / Sunny Portal first.
   *
   * Register layout: 1 register, S16, FIX2, write-only.
   *
   * @param {number} percent  0–100 (will be clamped and rounded to 2 decimals).
   */
  async setActivePowerCurtailment(percent) {
    const clamped = Math.max(0, Math.min(100, Number(percent)));
    const value = Math.round(clamped * 100); // S16, FIX2: 10000 == 100.00 %

    const buffer = Buffer.alloc(2);
    buffer.writeInt16BE(value, 0);

    await this.client.writeMultipleRegisters(40023, buffer);
    return true;
  }
}
module.exports = Inverter;
