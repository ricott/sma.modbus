'use strict';

const { BASE } = require('./base.js');

//Used by unknowns
const BASIC_int = {
    serialNo: null,
    swVersion: null,
    batteryCurrent: null,
    batterySoC: null,
    batteryTemperature: null,
    batteryVoltage: null,
    batteryCharge: null,
    batteryDischarge: null,
    batteryStatus: null
};
const BASIC = Object.freeze(Object.assign(Object.assign({}, BASE), BASIC_int));

module.exports = {
    BASIC
}
