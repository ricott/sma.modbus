'use strict';

const { ModbusRegistry, type, setting } = require('../../modbusRegistry.js');
const { BASE } = require('./base.js');

// Used by
// Sunny Tripower X 12 / Sunny Tripower X 15 / Sunny Tripower X 20 / Sunny Tripower X 25
const TRIPOWERX_int = {
    dcVoltageC: new ModbusRegistry(setting.READING, 30965, type.S32_FIX2, 'DC voltage input 3', 'measure_voltage.dcC'),
    dcPowerC: new ModbusRegistry(setting.READING, 30967, type.S32_FIX0, 'DC power input 3', 'measure_power.dcC'),
    dailyYield: new ModbusRegistry(setting.MANUAL, null, null, 'Daily yield Wh', 'meter_power')
};
const TRIPOWERX = Object.freeze(Object.assign(Object.assign({}, BASE), TRIPOWERX_int));

const CORE1_int = {
};
const CORE1 = Object.freeze(Object.assign(Object.assign({}, BASE), CORE1_int));

module.exports = {
    TRIPOWERX,
    CORE1
}
