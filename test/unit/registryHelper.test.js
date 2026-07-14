'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const registryHelper = require('../../lib/modbus/registryHelper.js');
const { ModbusRegistry, type, setting } = require('../../lib/modbus/modbusRegistry.js');

function buildSettings() {
    return {
        power: new ModbusRegistry(setting.READING, 100, type.U32_FIX0, 'AC power', 'measure_power'),
        voltage: new ModbusRegistry(setting.READING, 102, type.U32_FIX0, 'AC voltage', 'measure_voltage'),
        serialNo: new ModbusRegistry(setting.INFO, 200, type.U32_FIX0, 'Serial number'),
        dailyYield: new ModbusRegistry(setting.MANUAL, null, null, 'Daily yield', 'meter_power'),
        unsupported: null
    };
}

test('getReadingRegistries returns keyed descriptors for READING registers only', () => {
    const regs = registryHelper.getReadingRegistries(buildSettings());
    assert.deepEqual(regs, [
        { key: 'power', registryId: 100, count: 2, comment: 'AC power' },
        { key: 'voltage', registryId: 102, count: 2, comment: 'AC voltage' }
    ]);
});

test('getInfoRegistries returns keyed descriptors for INFO registers only', () => {
    const regs = registryHelper.getInfoRegistries(buildSettings());
    assert.deepEqual(regs, [
        { key: 'serialNo', registryId: 200, count: 2, comment: 'Serial number' }
    ]);
});

test('getCapabilityKeys includes READING and MANUAL, excludes INFO and nulls', () => {
    const caps = registryHelper.getCapabilityKeys(buildSettings());
    assert.deepEqual(caps, {
        power: 'measure_power',
        voltage: 'measure_voltage',
        dailyYield: 'meter_power'
    });
});

test('getReadingValues decodes a keyed words map', () => {
    // U32, big-endian: high word first. [0, 100] => 100, [0, 230] => 230.
    const values = registryHelper.getReadingValues(buildSettings(), {
        power: [0, 100],
        voltage: [0, 230]
    });
    assert.deepEqual(values, { power: 100, voltage: 230 });
});

test('getReadingValues skips missing/null words (retains last value upstream)', () => {
    const values = registryHelper.getReadingValues(buildSettings(), {
        power: [0, 100]
        // voltage absent
    });
    assert.deepEqual(values, { power: 100 });
    assert.ok(!('voltage' in values));

    const withNull = registryHelper.getReadingValues(buildSettings(), {
        power: [0, 100],
        voltage: null
    });
    assert.deepEqual(withNull, { power: 100 });
});

test('getInfoValues decodes only INFO registers from the words map', () => {
    const values = registryHelper.getInfoValues(buildSettings(), {
        serialNo: [0, 42],
        power: [0, 100] // must be ignored, not an INFO register
    });
    assert.deepEqual(values, { serialNo: 42 });
});

test('U64 register decodes from its 4-word slice', () => {
    const settings = {
        total: new ModbusRegistry(setting.READING, 300, type.U64_FIX0, 'Total Wh', 'meter_power')
    };
    // 0x0000_0000_0001_0000 = 65536
    const values = registryHelper.getReadingValues(settings, { total: [0, 0, 1, 0] });
    assert.deepEqual(values, { total: 65536 });
});
