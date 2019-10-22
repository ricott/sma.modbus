'use strict';

const {ModbusRegistry, type, setting} = require('../inverterConst.js');

//Used by
//SB 3000TL-21, SB 3600TL-21, SB 4000TL-21, SB 5000TL-21
//SB 3000TL-US-22, SB 3800TL-US-22, SB 4000TL-US-22 and SB 5000TL-US-22
//SB 6000TL-US-22, SB 7000TL-US-22 and SB 7700TL-US-22
const SB = {
    deviceClass: new ModbusRegistry(setting.INFO, 30051, type.U32_FIX0, 'Device class'),
    serialNo: new ModbusRegistry(setting.INFO, 30057, type.U32_FIX0, 'Serial number'),
    swVersion: new ModbusRegistry(setting.INFO, 30059, type.SW, 'Software version'),
    maxPower: new ModbusRegistry(setting.INFO, 30231, type.U32_FIX0, 'Max power'),
    gridCountry: new ModbusRegistry(setting.INFO, 40109, type.GRIDCTRY, 'Grid country standard'),
    condition: new ModbusRegistry(setting.READING, 30201, type.CONDITION, 'Condition', 'operational_status'),
    status: new ModbusRegistry(setting.READING, 40029, type.STATUS, 'Operating status', 'operational_status.health'),
    acPowerTotal: new ModbusRegistry(setting.READING, 30775, type.S32_FIX0, 'AC power total', 'measure_power'),
    dcVoltageA: new ModbusRegistry(setting.READING, 30771, type.S32_FIX2, 'DC voltage input 1', 'measure_voltage.dcA'),
    dcVoltageB: new ModbusRegistry(setting.READING, 30959, type.S32_FIX2, 'DC voltage input 2', 'measure_voltage.dcB'),
    dailyYield: new ModbusRegistry(setting.READING, 30535, type.YIELD_DAILY, 'Daily yield Wh', 'meter_power'),
    totalYield: new ModbusRegistry(setting.READING, 30529, type.YIELD_TOTAL, 'Total yield Wh', 'measure_yield'),
    acVoltageL1: new ModbusRegistry(setting.READING, 30783, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
};

//Used by
//SB 3500TL-JP-22, SB 4500TL-JP-22
//Status = 40009
//Missing swVersion, condition, dailyYield
const SB_JP22 = {
    deviceClass: new ModbusRegistry(setting.INFO, 30051, type.U32_FIX0, 'Device class'),
    serialNo: new ModbusRegistry(setting.INFO, 30057, type.U32_FIX0, 'Serial number'),
    swVersion: null,
    maxPower: new ModbusRegistry(setting.INFO, 30231, type.U32_FIX0, 'Max power'),
    gridCountry: new ModbusRegistry(setting.INFO, 40109, type.GRIDCTRY, 'Grid country standard'),
    condition: null,
    status: new ModbusRegistry(setting.READING, 40009, type.STATUS, 'Operating status', 'operational_status.health'),
    acPowerTotal: new ModbusRegistry(setting.READING, 30775, type.S32_FIX0, 'AC power total', 'measure_power'),
    dcVoltageA: new ModbusRegistry(setting.READING, 30771, type.S32_FIX2, 'DC voltage input 1', 'measure_voltage.dcA'),
    dcVoltageB: new ModbusRegistry(setting.READING, 30959, type.S32_FIX2, 'DC voltage input 2', 'measure_voltage.dcB'),
    dailyYield: null,
    totalYield: new ModbusRegistry(setting.READING, 30529, type.YIELD_TOTAL, 'Total yield Wh', 'measure_yield'),
    acVoltageL1: new ModbusRegistry(setting.READING, 30783, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
};

//Used by
//SB 2500TLST-21, SB 3000TLST-21
//SB1.5-1VL-40, SB2.0-1VL-40 and SB2.5-1VL-40
//Status = 40009
//Missing dcVoltageB
const SB_TLST21 = {
    deviceClass: new ModbusRegistry(setting.INFO, 30051, type.U32_FIX0, 'Device class'),
    serialNo: new ModbusRegistry(setting.INFO, 30057, type.U32_FIX0, 'Serial number'),
    swVersion: new ModbusRegistry(setting.INFO, 30059, type.SW, 'Software version'),
    maxPower: new ModbusRegistry(setting.INFO, 30231, type.U32_FIX0, 'Max power'),
    gridCountry: new ModbusRegistry(setting.INFO, 40109, type.GRIDCTRY, 'Grid country standard'),
    condition: new ModbusRegistry(setting.READING, 30201, type.CONDITION, 'Condition', 'operational_status'),
    status: new ModbusRegistry(setting.READING, 40009, type.STATUS, 'Operating status', 'operational_status.health'),
    acPowerTotal: new ModbusRegistry(setting.READING, 30775, type.S32_FIX0, 'AC power total', 'measure_power'),
    dcVoltageA: new ModbusRegistry(setting.READING, 30771, type.S32_FIX2, 'DC voltage input 1', 'measure_voltage.dcA'),
    dcVoltageB: null,
    dailyYield: new ModbusRegistry(setting.READING, 30535, type.YIELD_DAILY, 'Daily yield Wh', 'meter_power'),
    totalYield: new ModbusRegistry(setting.READING, 30529, type.YIELD_TOTAL, 'Total yield Wh', 'measure_yield'),
    acVoltageL1: new ModbusRegistry(setting.READING, 30783, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
};

//Used by
//SB 3.0-1SP-US-40, SB 3.8-1SP-US-40, SB 5.0-1SP-US-40, SB 6.0-1SP-US-40, SB 7.0-1SP-US-40, SB 7.7-1SP-US-40
//SB 3.0-1AV-41, SB 3.6-1AV-41, SB 4.0-1AV-41, SB 5.0-1AV-41, SB 6.0-1AV-41
//Missing daily yield
const SB_4041 = {
    deviceClass: new ModbusRegistry(setting.INFO, 30051, type.U32_FIX0, 'Device class'),
    serialNo: new ModbusRegistry(setting.INFO, 30057, type.U32_FIX0, 'Serial number'),
    swVersion: new ModbusRegistry(setting.INFO, 30059, type.SW, 'Software version'),
    maxPower: new ModbusRegistry(setting.INFO, 30231, type.U32_FIX0, 'Max power'),
    gridCountry: new ModbusRegistry(setting.INFO, 40109, type.GRIDCTRY, 'Grid country standard'),
    condition: new ModbusRegistry(setting.READING, 30201, type.CONDITION, 'Condition', 'operational_status'),
    status: new ModbusRegistry(setting.READING, 40029, type.STATUS, 'Operating status', 'operational_status.health'),
    acPowerTotal: new ModbusRegistry(setting.READING, 30775, type.S32_FIX0, 'AC power total', 'measure_power'),
    dcVoltageA: new ModbusRegistry(setting.READING, 30771, type.S32_FIX2, 'DC voltage input 1', 'measure_voltage.dcA'),
    dcVoltageB: new ModbusRegistry(setting.READING, 30959, type.S32_FIX2, 'DC voltage input 2', 'measure_voltage.dcB'),
    dailyYield: null,
    totalYield: new ModbusRegistry(setting.READING, 30529, type.YIELD_TOTAL, 'Total yield Wh', 'measure_yield'),
    acVoltageL1: new ModbusRegistry(setting.READING, 30783, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
};

//Used by
//SB 3600SE-10 and SB 5000SE-10
//Status = 40009
const SB_SE10 = {
    deviceClass: new ModbusRegistry(setting.INFO, 30051, type.U32_FIX0, 'Device class'),
    serialNo: new ModbusRegistry(setting.INFO, 30057, type.U32_FIX0, 'Serial number'),
    swVersion: new ModbusRegistry(setting.INFO, 30059, type.SW, 'Software version'),
    maxPower: new ModbusRegistry(setting.INFO, 30231, type.U32_FIX0, 'Max power'),
    gridCountry: new ModbusRegistry(setting.INFO, 40109, type.GRIDCTRY, 'Grid country standard'),
    condition: new ModbusRegistry(setting.READING, 30201, type.CONDITION, 'Condition', 'operational_status'),
    status: new ModbusRegistry(setting.READING, 40009, type.STATUS, 'Operating status', 'operational_status.health'),
    acPowerTotal: new ModbusRegistry(setting.READING, 30775, type.S32_FIX0, 'AC power total', 'measure_power'),
    dcVoltageA: new ModbusRegistry(setting.READING, 30771, type.S32_FIX2, 'DC voltage input 1', 'measure_voltage.dcA'),
    dcVoltageB: new ModbusRegistry(setting.READING, 30959, type.S32_FIX2, 'DC voltage input 2', 'measure_voltage.dcB'),
    dailyYield: new ModbusRegistry(setting.READING, 30535, type.YIELD_DAILY, 'Daily yield Wh', 'meter_power'),
    totalYield: new ModbusRegistry(setting.READING, 30529, type.YIELD_TOTAL, 'Total yield Wh', 'measure_yield'),
    acVoltageL1: new ModbusRegistry(setting.READING, 30783, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
};

module.exports = {
    SB,
    SB_JP22,
    SB_TLST21,
    SB_SE10,
    SB_4041
}