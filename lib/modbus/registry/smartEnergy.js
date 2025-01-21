'use strict';

const { ModbusRegistry, type, setting } = require('../modbusRegistry.js');
const { BASE } = require('./base.js');

// Used by
// Sunny Boy Smart Energy 3.6 / Sunny Boy Smart Energy 4.0 / Sunny Boy Smart Energy 5.0 / Sunny Boy Smart Energy 6.0
// Sunny Boy Smart Energy 3.8-US / Sunny Boy Smart Energy 4.8-US / Sunny Boy Smart Energy 5.8-US / Sunny Boy Smart Energy 7.7-US
const SMARTENERGY_int = {
    batterySoC: new ModbusRegistry(setting.READING, 30845, type.U32_FIX0, 'Current battery state of charge', 'measure_battery'),
    batteryCharge: new ModbusRegistry(setting.READING, 31393, type.U32_FIX0, 'Present battery charge', 'measure_power.battery'),
    batteryDischarge: new ModbusRegistry(setting.READING, 31395, type.U32_FIX0, 'Present battery discharge', 'measure_power.battery'),
    batteryStatus: new ModbusRegistry(setting.READING, 40236, type.BATTERY_STATUS, 'BMS operating mode', 'operational_status.battery')
};
const SMARTENERGY = Object.freeze(Object.assign(Object.assign({}, BASE), SMARTENERGY_int));

module.exports = {
    SMARTENERGY
}
