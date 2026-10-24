'use strict';

const { ModbusRegistry, type, setting } = require('../../modbusRegistry.js');
const { BASE } = require('./base.js');

// Used by
// SBS3.7-10 / SBS5.0-10 / SBS6.0-10
const SBS_int = {
};
const SBS = Object.freeze(Object.assign(Object.assign({}, BASE), SBS_int));

// Used by
// SBS2.5-1VL-10
const SBS_VL_int = {
    swVersion: null,
};
const SBS_VL = Object.freeze(Object.assign(Object.assign({}, SBS_int), SBS_VL_int));

// Used by
// SI4.4M-12 / SI6.0H-12 / SI8.0H-12 / SI4.4M-13 / SI6.0H-13 / SI8.0H-13 (SUNNY ISLAND 4.4M / 6.0H / 8.0H)
const SI_int = {
    // External power connection (utility grid / generator), off-grid and backup systems
    gridVoltageL1: new ModbusRegistry(setting.READING, 30903, type.U32_FIX2, 'Voltage external grid connection L1', 'measure_voltage.grid_l1'),
    gridVoltageL2: new ModbusRegistry(setting.READING, 30905, type.U32_FIX2, 'Voltage external grid connection L2', 'measure_voltage.grid_l2'),
    gridVoltageL3: new ModbusRegistry(setting.READING, 30907, type.U32_FIX2, 'Voltage external grid connection L3', 'measure_voltage.grid_l3'),
    gridConnectionStatus: new ModbusRegistry(setting.READING, 30915, type.GRID_CONNECTION_STATUS, 'Power supply status', 'grid_connection_status')
};
const SI = Object.freeze(Object.assign(Object.assign({}, BASE), SI_int));

module.exports = {
    SBS,
    SBS_VL,
    SI
}