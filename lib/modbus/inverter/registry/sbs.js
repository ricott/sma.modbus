'use strict';

const { ModbusRegistry, type, setting } = require('../../modbusRegistry.js');
const { BASE } = require('./base.js');

// Used by
// SBS3.7-10 / SBS5.0-10 / SBS6.0-10
const SBS_int = {
    dcVoltageA: null,
    dcVoltageB: null,
    dcPowerA: null,
    dcPowerB: null,
    dailyYield: null,
    totalYield: null
};
const SBS = Object.freeze(Object.assign(Object.assign({}, BASE), SBS_int));

// Used by
// SBS2.5-1VL-10
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
    dailyYield: null
};
const SI = Object.freeze(Object.assign(Object.assign({}, BASE), SI_int));

// Used by
// SI 6.0H-11 / SI 8.0H-11
const SI11_int = {
    targetPower: null,
    status: null,
    dcVoltageA: null,
    dcVoltageB: null,
    dcPowerA: null,
    dcPowerB: null,
    dailyYield: null
};
const SI11 = Object.freeze(Object.assign(Object.assign({}, BASE), SI11_int));

module.exports = {
    SBS,
    SBS_VL,
    SI,
    SI11
}
