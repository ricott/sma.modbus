'use strict';

const { ModbusRegistry, type, setting } = require('../../modbusRegistry.js');
const { BASE } = require('./base.js');

// Used by
// Sunny Boy Smart Energy 3.6 / Sunny Boy Smart Energy 4.0 / Sunny Boy Smart Energy 5.0 / Sunny Boy Smart Energy 6.0
// Sunny Boy Smart Energy 3.8-US / Sunny Boy Smart Energy 4.8-US / Sunny Boy Smart Energy 5.8-US / Sunny Boy Smart Energy 7.7-US
// TODO Daily yield is available, but doesnt contain any data - switching to manual
const SMARTENERGY_int = {
    dcVoltageC: new ModbusRegistry(setting.READING, 30965, type.S32_FIX2, 'DC voltage input 3', 'measure_voltage.dcC'),
    dcPowerC: new ModbusRegistry(setting.READING, 30967, type.S32_FIX0, 'DC power input 3', 'measure_power.dcC'),
    dailyYield: new ModbusRegistry(setting.MANUAL, null, null, 'Daily yield Wh', 'meter_power'),
    batterySoC: new ModbusRegistry(setting.READING, 30845, type.U32_FIX0, 'Current battery state of charge', 'measure_battery'),
    batteryCharge: new ModbusRegistry(setting.READING, 31393, type.U32_FIX0, 'Present battery charge', 'measure_power.battery'),
    batteryDischarge: new ModbusRegistry(setting.READING, 31395, type.U32_FIX0, 'Present battery discharge', 'measure_power.battery'),
    // No real battery status available, the one that exists si same as the inverter condition
    batteryStatus: new ModbusRegistry(setting.READING, 31391, type.CONDITION, 'Status', 'operational_status.battery')
};
const SMARTENERGY = Object.freeze(Object.assign(Object.assign({}, BASE), SMARTENERGY_int));

module.exports = {
    SMARTENERGY
}
