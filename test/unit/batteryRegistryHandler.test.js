'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const batteryRegistryHandler = require('../../lib/modbus/battery/batteryRegistryHandler.js');

const gridCapabilities = [
    'measure_voltage.grid_l1',
    'measure_voltage.grid_l2',
    'measure_voltage.grid_l3',
    'grid_connection_status'
];

test('Sunny Island exposes external grid connection capabilities', () => {
    const settings = batteryRegistryHandler.getModbusRegistrySettings('SI 8.0H-13');
    const capabilities = Object.values(batteryRegistryHandler.getCapabilityKeys(settings));
    for (const capability of gridCapabilities) {
        assert.ok(capabilities.includes(capability), capability);
    }
});

test('Sunny Island grid registers decode voltage and status', () => {
    const settings = batteryRegistryHandler.getModbusRegistrySettings('SI 8.0H-13');
    const values = batteryRegistryHandler.getReadingValues(settings, {
        gridVoltageL1: [0, 23012], // FIX2 => 230 V
        gridConnectionStatus: [0, 1463]
    });
    assert.equal(values.gridVoltageL1, 230);
    assert.equal(values.gridConnectionStatus, 'Backup');
});

test('Other batteries do not expose grid connection capabilities', () => {
    for (const deviceType of ['SBS 5.0-10', 'STP 10.0-3SE-40', 'Smart Energy 5.0']) {
        const settings = batteryRegistryHandler.getModbusRegistrySettings(deviceType);
        const capabilities = Object.values(batteryRegistryHandler.getCapabilityKeys(settings));
        for (const capability of gridCapabilities) {
            assert.ok(!capabilities.includes(capability), `${deviceType}: ${capability}`);
        }
    }
});
