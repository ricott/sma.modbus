'use strict';

const { ModbusRegistry, type, setting } = require('../inverterConst.js');
const { BASE } = require('./base.js');

// Used by
// SBS3.7-10 / SBS5.0-10 / SBS6.0-10
const SBS_int = {
    dcVoltageA: null,
    dcVoltageB: null,
    dcPowerA: null,
    dcPowerB: null,
    dailyYield: null,
    totalYield: null,
    batterySoC: new ModbusRegistry(setting.READING, 30845, type.U32_FIX0, 'Current battery state of charge', 'measure_battery'),
    batteryCharge: new ModbusRegistry(setting.READING, 31393, type.U32_FIX0, 'Present battery charge', 'measure_power.battery'),
    batteryDischarge: new ModbusRegistry(setting.READING, 31395, type.U32_FIX0, 'Present battery discharge', 'measure_power.battery'),
    batteryStatus:  new ModbusRegistry(setting.READING, 30955, type.BATTERY_STATUS, 'Battery operating status', 'operational_status.battery')
};
const SBS = Object.freeze(Object.assign(Object.assign({}, BASE), SBS_int));

// Used by
// SBS2.5-1VL-10
// SI4.4M-12 / SI6.0H-12 / SI8.0H-12 / SI4.4M-13 / SI6.0H-13 / SI8.0H-13
const SBS_VL_int = {
    swVersion: null,
    condition: null
};
const SBS_VL = Object.freeze(Object.assign(Object.assign({}, SBS_int), SBS_VL_int));

// Used by
// SI4.4M-12 / SI6.0H-12 / SI8.0H-12 / SI4.4M-13 / SI6.0H-13 / SI8.0H-13 (SUNNY ISLAND 4.4M / 6.0H / 8.0H)
const SI_int = {
    targetPower: null,
    status: null,
    dcVoltageA: null,
    dcVoltageB: null,
    dcPowerA: null,
    dcPowerB: null,
    dailyYield: new ModbusRegistry(setting.MANUAL, null, null, 'Daily yield Wh', 'meter_power'),
    batterySoC: new ModbusRegistry(setting.READING, 30845, type.U32_FIX0, 'Current battery state of charge', 'measure_battery'),
    batteryCharge: new ModbusRegistry(setting.READING, 31393, type.U32_FIX0, 'Present battery charge', 'measure_power.battery'),
    batteryDischarge: new ModbusRegistry(setting.READING, 31395, type.U32_FIX0, 'Present battery discharge', 'measure_power.battery'),
    batteryStatus:  new ModbusRegistry(setting.READING, 30955, type.BATTERY_STATUS, 'Battery operating status', 'operational_status.battery')
};
const SI = Object.freeze(Object.assign(Object.assign({}, BASE), SI_int));

module.exports = {
    SBS,
    SBS_VL,
    SI
}
