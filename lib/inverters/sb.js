'use strict';

const {ModbusRegistry, type, setting} = require('../inverterConst.js');
const {BASE} = require('./base.js');

//Used by
//SB 3000TL-21, SB 3600TL-21, SB 4000TL-21, SB 5000TL-21
//SB 3000TL-US-22, SB 3800TL-US-22, SB 4000TL-US-22 and SB 5000TL-US-22
//SB 6000TL-US-22, SB 7000TL-US-22 and SB 7700TL-US-22
const SB_int = {
};
const SB = Object.freeze(Object.assign(Object.assign({}, BASE), SB_int));

//Used by
//SB 3.0-1SP-US-40, SB 3.8-1SP-US-40, SB 5.0-1SP-US-40, SB 6.0-1SP-US-40, SB 7.0-1SP-US-40, SB 7.7-1SP-US-40
//SB 3.0-1AV-41, SB 3.6-1AV-41, SB 4.0-1AV-41, SB 5.0-1AV-41, SB 6.0-1AV-41
//Missing daily yield
const SB_4041_int = {
    dailyYield: null,
};
const SB_4041 = Object.freeze(Object.assign(Object.assign({}, SB), SB_4041_int));

//Used by
//SB 3500TL-JP-22, SB 4500TL-JP-22
//Status = 40009
//Missing swVersion, condition, dailyYield
const SB_JP22_int = {
    swVersion: null,
    condition: null,
    status: new ModbusRegistry(setting.READING, 40009, type.STATUS, 'Operating status', 'operational_status.health'),
    dailyYield: null,
};
const SB_JP22 = Object.freeze(Object.assign(Object.assign({}, SB), SB_JP22_int));

//Used by
//SB 2500TLST-21, SB 3000TLST-21
//SB1.5-1VL-40, SB2.0-1VL-40 and SB2.5-1VL-40
//Status = 40009
//Missing dcVoltageB
const SB_TLST21_int = {
    status: new ModbusRegistry(setting.READING, 40009, type.STATUS, 'Operating status', 'operational_status.health'),
    dcVoltageB: null,
};
const SB_TLST21 = Object.freeze(Object.assign(Object.assign({}, SB), SB_TLST21_int));

//Used by
//SB 3600SE-10 and SB 5000SE-10
//SB3.0-1AV-40, SB3.6-1AV-40, SB4.0-1AV-40, SB5.0-1AV-40
//Status = 40009
const SB_SE10_int = {
    status: new ModbusRegistry(setting.READING, 40009, type.STATUS, 'Operating status', 'operational_status.health'),
};
const SB_SE10 = Object.freeze(Object.assign(Object.assign({}, SB), SB_SE10_int));

module.exports = {
    SB,
    SB_JP22,
    SB_TLST21,
    SB_SE10,
    SB_4041
}
