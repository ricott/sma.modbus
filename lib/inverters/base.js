'use strict';

const {ModbusRegistry, type, setting} = require('../inverterConst.js');

const BASE = Object.freeze({
    deviceClass: new ModbusRegistry(setting.INFO, 30051, type.U32_FIX0, 'Device class'),
    serialNo: new ModbusRegistry(setting.INFO, 30057, type.U32_FIX0, 'Serial number'),
    swVersion: new ModbusRegistry(setting.INFO, 30059, type.SW, 'Software version'),
    maxPower: new ModbusRegistry(setting.INFO, 30231, type.U32_FIX0, 'Max power'),
    activePowerLimit: new ModbusRegistry(setting.INFO, 30837, type.U32_FIX0, 'Active power limit'),
    gridCountry: new ModbusRegistry(setting.INFO, 40109, type.GRIDCTRY, 'Grid country standard'),
    condition: new ModbusRegistry(setting.READING, 30201, type.CONDITION, 'Condition', 'operational_status'),
    status: new ModbusRegistry(setting.READING, 40029, type.STATUS, 'Operating status', 'operational_status.health'),
    acPowerTotal: new ModbusRegistry(setting.READING, 30775, type.S32_FIX0, 'AC power total', 'measure_power'),
    dcVoltageA: new ModbusRegistry(setting.READING, 30771, type.S32_FIX2, 'DC voltage input 1', 'measure_voltage.dcA'),
    dcVoltageB: new ModbusRegistry(setting.READING, 30959, type.S32_FIX2, 'DC voltage input 2', 'measure_voltage.dcB'),
    dcPowerA: new ModbusRegistry(setting.READING, 30773, type.S32_FIX0, 'DC power input 1', 'measure_power.dcA'),
    dcPowerB: new ModbusRegistry(setting.READING, 30961, type.S32_FIX0, 'DC power input 2', 'measure_power.dcB'),
    dailyYield: new ModbusRegistry(setting.READING, 30535, type.U32_FIX0, 'Daily yield Wh', 'meter_power'),
    totalYield: new ModbusRegistry(setting.READING, 30529, type.U32_FIX0, 'Total yield Wh', 'measure_yield'),
    acVoltageL1: new ModbusRegistry(setting.READING, 30783, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
});

module.exports = {
    BASE
}