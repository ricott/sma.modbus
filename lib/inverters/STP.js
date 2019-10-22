'use strict';

const {ModbusRegistry, type, setting} = require('../inverterConst.js');

//Used by
//STP 5000TL-20, STP 6000TL-20, STP 7000TL-20, STP 8000TL-20, STP 9000TL-20
//STP 10000TL-20, STP 12000TL-20
//STP 15000TL-30, STP 20000TL-30, STP 25000TL-30
//STP 12000TL-US-10, STP 15000TL-US-10, STP 20000TL-US-10, STP 24000TL-US-10, 
//STP 30000TL-US-10
const STP = {
    deviceClass: new ModbusRegistry(setting.INFO, 30051, type.U32_FIX0, 'Device class'),
    serialNo: new ModbusRegistry(setting.INFO, 30057, type.U32_FIX0, 'Serial number'),
    swVersion: new ModbusRegistry(setting.INFO, 30059, type.SW, 'Software version'),
    maxPower: new ModbusRegistry(setting.INFO, 30231, type.U32_FIX0, 'Max power'),
    gridCountry: new ModbusRegistry(setting.INFO, 40109, type.GRIDCTRY, 'Grid country standard'),
    condition: new ModbusRegistry(setting.READING, 30201, type.CONDITION, 'Condition', 'operational_status'),
    status: new ModbusRegistry(setting.READING, 40029, type.STATUS, 'Operating status', 'operational_status.health'),
    acPowerTotal: new ModbusRegistry(setting.READING, 30775, type.S32_FIX0, 'AC power total', 'measure_power'),
    //dcCurrentA: new ModbusRegistry(setting.READING, 30769, type.S32_FIX3, 'DC current input 1', ''),
    //dcCurrentB: new ModbusRegistry(setting.READING, 30957, type.S32_FIX3, 'DC current input 2', ''),
    dcVoltageA: new ModbusRegistry(setting.READING, 30771, type.S32_FIX2, 'DC voltage input 1', 'measure_voltage.dcA'),
    dcVoltageB: new ModbusRegistry(setting.READING, 30959, type.S32_FIX2, 'DC voltage input 2', 'measure_voltage.dcB'),
    dailyYield: new ModbusRegistry(setting.READING, 30535, type.YIELD_DAILY, 'Daily yield Wh', 'meter_power'),
    totalYield: new ModbusRegistry(setting.READING, 30529, type.YIELD_TOTAL, 'Total yield Wh', 'measure_yield'),
    acVoltageL1: new ModbusRegistry(setting.READING, 30783, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
};

//Used by
//STP 8000TL-10, STP 10000TL-10, STP 12000TL-10, STP 15000TL-10, STP 17000TL-10
//Missing A voltage and current
//Missing B voltage and current
//Missing Operating status
const STP_TL10 = {
    deviceClass: new ModbusRegistry(setting.INFO, 30051, type.U32_FIX0, 'Device class'),
    serialNo: new ModbusRegistry(setting.INFO, 30057, type.U32_FIX0, 'Serial number'),
    swVersion: new ModbusRegistry(setting.INFO, 30059, type.SW, 'Software version'),
    maxPower: new ModbusRegistry(setting.INFO, 30231, type.U32_FIX0, 'Max power'),
    gridCountry: new ModbusRegistry(setting.INFO, 40109, type.GRIDCTRY, 'Grid country standard'),
    condition: new ModbusRegistry(setting.READING, 30201, type.CONDITION, 'Condition', 'operational_status'),
    status: null,
    acPowerTotal: new ModbusRegistry(setting.READING, 30775, type.S32_FIX0, 'AC power total', 'measure_power'),
    dcVoltageA: null,
    dcVoltageB: null,
    dailyYield: new ModbusRegistry(setting.READING, 30535, type.YIELD_DAILY, 'Daily yield Wh', 'meter_power'),
    totalYield: new ModbusRegistry(setting.READING, 30529, type.YIELD_TOTAL, 'Total yield Wh', 'measure_yield'),
    acVoltageL1: new ModbusRegistry(setting.READING, 30783, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
};

//Used by
//STP 24500TL-JP-30, STP 25000TL-JP-30
//Different value for AC power L1 (30789)
const STP_JP = {
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
    acVoltageL1: new ModbusRegistry(setting.READING, 30789, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
};

//Used by
//STP 15000TLEE-10, STP 20000TLEE-10
//Missing B voltage and current
//Missing Operating status
const STP_TLEE = {
    deviceClass: new ModbusRegistry(setting.INFO, 30051, type.U32_FIX0, 'Device class'),
    serialNo: new ModbusRegistry(setting.INFO, 30057, type.U32_FIX0, 'Serial number'),
    swVersion: new ModbusRegistry(setting.INFO, 30059, type.SW, 'Software version'),
    maxPower: new ModbusRegistry(setting.INFO, 30231, type.U32_FIX0, 'Max power'),
    gridCountry: new ModbusRegistry(setting.INFO, 40109, type.GRIDCTRY, 'Grid country standard'),
    condition: new ModbusRegistry(setting.READING, 30201, type.CONDITION, 'Condition', 'operational_status'),
    status: null,
    acPowerTotal: new ModbusRegistry(setting.READING, 30775, type.S32_FIX0, 'AC power total', 'measure_power'),
    dcVoltageA: new ModbusRegistry(setting.READING, 30771, type.S32_FIX2, 'DC voltage input 1', 'measure_voltage.dcA'),
    dcVoltageB: null,
    dailyYield: new ModbusRegistry(setting.READING, 30535, type.YIELD_DAILY, 'Daily yield Wh', 'meter_power'),
    totalYield: new ModbusRegistry(setting.READING, 30529, type.YIELD_TOTAL, 'Total yield Wh', 'measure_yield'),
    acVoltageL1: new ModbusRegistry(setting.READING, 30783, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
};

//Used by
//STP 10000TLEE-JP-10, STP 10000TLEE-JP-11, STP 20000TLEE-JP-11
//Missing B voltage and current
//Different value for AC power L1 (30789)
const STP_TLEE_JP = {
    deviceClass: new ModbusRegistry(setting.INFO, 30051, type.U32_FIX0, 'Device class'),
    serialNo: new ModbusRegistry(setting.INFO, 30057, type.U32_FIX0, 'Serial number'),
    swVersion: new ModbusRegistry(setting.INFO, 30059, type.SW, 'Software version'),
    maxPower: new ModbusRegistry(setting.INFO, 30231, type.U32_FIX0, 'Max power'),
    gridCountry: new ModbusRegistry(setting.INFO, 40109, type.GRIDCTRY, 'Grid country standard'),
    condition: new ModbusRegistry(setting.READING, 30201, type.CONDITION, 'Condition', 'operational_status'),
    status: new ModbusRegistry(setting.READING, 40029, type.STATUS, 'Operating status', 'operational_status.health'),
    acPowerTotal: new ModbusRegistry(setting.READING, 30775, type.S32_FIX0, 'AC power total', 'measure_power'),
    dcVoltageA: new ModbusRegistry(setting.READING, 30771, type.S32_FIX2, 'DC voltage input 1', 'measure_voltage.dcA'),
    dcVoltageB: null,
    dailyYield: new ModbusRegistry(setting.READING, 30535, type.YIELD_DAILY, 'Daily yield Wh', 'meter_power'),
    totalYield: new ModbusRegistry(setting.READING, 30529, type.YIELD_TOTAL, 'Total yield Wh', 'measure_yield'),
    acVoltageL1: new ModbusRegistry(setting.READING, 30789, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
};

//Used by
//STP 50-US-40, STP 50-JP-40
//STP 3.0-3AV-40, STP 4.0-3AV-40, STP 5.0-3AV-40, STP 6.0-3AV-40, STP 8.0-3AV-40, STP 10.0-3AV-40
//Missing daily yield
const STP_40 = {
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

module.exports = {
    STP,
    STP_TL10,
    STP_JP,
    STP_TLEE,
    STP_TLEE_JP,
    STP_40
}