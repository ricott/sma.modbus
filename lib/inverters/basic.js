'use strict';

const {ModbusRegistry, type, setting} = require('../inverterConst.js');
const {BASE} = require('./base.js');

//Used by unknowns
const BASIC_int = {
    swVersion: null,
    maxPower: null,
    gridCountry: null,
    condition: null,
    status: null,
    dcVoltageA: null,
    dcVoltageB: null,
    dcPowerA: null,
    dcPowerB: null,
    dailyYield: null,
    acVoltageL2: null,
    acVoltageL3: null
};
const BASIC = Object.freeze(Object.assign(Object.assign({}, BASE), BASIC_int));

module.exports = {
    BASIC
}
