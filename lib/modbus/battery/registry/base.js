'use strict';

const { ModbusRegistry, type, setting } = require('../../modbusRegistry.js');

const BASE = Object.freeze({
    deviceClass: new ModbusRegistry(setting.INFO, 30051, type.U32_FIX0, 'Device class'),
    serialNo: new ModbusRegistry(setting.INFO, 30057, type.U32_FIX0, 'Serial number'),
    swVersion: new ModbusRegistry(setting.INFO, 30059, type.SW, 'Software version'),
    batteryCurrent: new ModbusRegistry(setting.READING, 30843, type.S32_FIX3, 'Battery current', 'measure_current'),
    batterySoC: new ModbusRegistry(setting.READING, 30845, type.U32_FIX0, 'Current battery state of charge', 'measure_battery'),
    batteryTemperature: new ModbusRegistry(setting.READING, 30849, type.S32_FIX1, 'Battery temperature', 'measure_temperature'),
    batteryVoltage: new ModbusRegistry(setting.READING, 30851, type.U32_FIX2, 'Battery voltage', 'measure_voltage'),
    batteryCharge: new ModbusRegistry(setting.READING, 31393, type.U32_FIX0, 'Present battery charge', 'measure_power'),
    batteryDischarge: new ModbusRegistry(setting.READING, 31395, type.U32_FIX0, 'Present battery discharge', 'measure_power'),
    batteryStatus:  new ModbusRegistry(setting.READING, 30955, type.U32_FIX0, 'Battery operating status', 'battery_charging_state')
});

module.exports = {
    BASE
}