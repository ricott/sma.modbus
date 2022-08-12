'use strict';

const {ModbusRegistry, type, setting} = require('../inverterConst.js');
const {BASE} = require('./base.js');

//Used by
//SHP 100-20 / SHP 150-20 / SHP 125-US-20 / SHP 150-US-20
//Missing MPP B, daily yield
//Different L1, L2, L3 voltage, 31253, 31255, 31257
const SHP_20_int = {
    dcVoltageB: null,
    dcPowerB: null,
    dailyYield: new ModbusRegistry(setting.MANUAL, null, null, 'Daily yield Wh', 'meter_power'),
    acVoltageL1: new ModbusRegistry(setting.READING, 31253, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage'),
    acVoltageL2: new ModbusRegistry(setting.READING, 31255, type.U32_FIX2, 'AC Voltage L2', 'measure_voltage.l2'),
    acVoltageL3: new ModbusRegistry(setting.READING, 31257, type.U32_FIX2, 'AC Voltage L3', 'measure_voltage.l3'),
};
const SHP_20 = Object.freeze(Object.assign(Object.assign({}, BASE), SHP_20_int));

module.exports = {
    SHP_20
}
