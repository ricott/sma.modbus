'use strict';

const {ModbusRegistry, type, setting} = require('../inverterConst.js');

//Used by unknowns
const BASIC = {
    deviceClass: new ModbusRegistry(setting.INFO, 30051, type.U32_FIX0, 'Device class'),
    serialNo: new ModbusRegistry(setting.INFO, 30057, type.U32_FIX0, 'Serial number'),
    swVersion: null,
    maxPower: null,
    gridCountry: null,
    condition: null,
    status: null,
    acPowerTotal: new ModbusRegistry(setting.READING, 30775, type.S32_FIX0, 'AC power total', 'measure_power'),
    dcVoltageA: null,
    dcVoltageB: null,
    dailyYield: null,
    totalYield: new ModbusRegistry(setting.READING, 30529, type.YIELD_TOTAL, 'Total yield Wh', 'measure_yield'),
    acVoltageL1: new ModbusRegistry(setting.READING, 30783, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
};

module.exports = {
    BASIC
}