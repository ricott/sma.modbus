'use strict';

const { ModbusRegistry, type, setting } = require('../inverterConst.js');
const { BASE } = require('./base.js');

// Used by
// STP 12-50 / STP 15-50 / STP 20-50 / STP 25-50 (Sunny Tripower X 12 / Sunny Tripower X 15 / Sunny Tripower X 20 / Sunny Tripower X 25)
const TRIPOWER_int = {
    // These are missing
    // dcVoltageA: new ModbusRegistry(setting.READING, 30771, type.S32_FIX2, 'DC voltage input 1', 'measure_voltage.dcA'),
    // dcVoltageB: new ModbusRegistry(setting.READING, 30959, type.S32_FIX2, 'DC voltage input 2', 'measure_voltage.dcB'),
    // dcPowerA: new ModbusRegistry(setting.READING, 30773, type.S32_FIX0, 'DC power input 1', 'measure_power.dcA'),
    // dcPowerB: new ModbusRegistry(setting.READING, 30961, type.S32_FIX0, 'DC power input 2', 'measure_power.dcB'),
    // dailyYield: new ModbusRegistry(setting.READING, 30535, type.U32_FIX0, 'Daily yield Wh', 'meter_power'),
    // Calculating daily yield manually
    dailyYield: new ModbusRegistry(setting.MANUAL, null, null, 'Daily yield Wh', 'meter_power')
};
const TRIPOWER = Object.freeze(Object.assign(Object.assign({}, BASE), TRIPOWER_int));

module.exports = {
    TRIPOWER
}
