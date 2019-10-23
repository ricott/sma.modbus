'use strict';

const {ModbusRegistry, type, setting} = require('../inverterConst.js');
const {BASE} = require('./base.js');

//Used by
//SHP 100-20 / SHP 150-20 / SHP 125-US-20 / SHP 150-US-20
//Missing MPP B, daily yield
//Different L1 voltage, 31253
const SHP_20_int = {
    dcVoltageB: null,
    dailyYield: null,
    acVoltageL1: new ModbusRegistry(setting.READING, 31253, type.U32_FIX2, 'AC Voltage L1', 'measure_voltage')
};
const SHP_20 = Object.freeze(Object.assign(Object.assign({}, BASE), SHP_20_int));

module.exports = {
    SHP_20
}