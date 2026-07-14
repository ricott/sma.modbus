'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const coalesce = require('../../lib/modbus/coalesce.js');
const registryHelper = require('../../lib/modbus/registryHelper.js');
const { BASE: BATTERY_BASE } = require('../../lib/modbus/battery/registry/base.js');

const { groupRegistersIntoRuns, sliceRunWords, COALESCE_MAX_GAP, COALESCE_MAX_RUN } = coalesce;

test('empty / nullish input yields no runs', () => {
    assert.deepEqual(groupRegistersIntoRuns([]), []);
    assert.deepEqual(groupRegistersIntoRuns(undefined), []);
    assert.deepEqual(groupRegistersIntoRuns(null), []);
});

test('a single register becomes one run of its own count', () => {
    const runs = groupRegistersIntoRuns([{ key: 'a', registryId: 100, count: 2 }]);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].start, 100);
    assert.equal(runs[0].count, 2);
    assert.deepEqual(runs[0].registers.map((r) => r.key), ['a']);
});

test('adjacent registers merge into one run spanning both', () => {
    const runs = groupRegistersIntoRuns([
        { key: 'a', registryId: 100, count: 2 },
        { key: 'b', registryId: 102, count: 2 }
    ]);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].start, 100);
    assert.equal(runs[0].count, 4);
    assert.deepEqual(runs[0].registers.map((r) => r.key), ['a', 'b']);
});

test('input order does not matter (registers are sorted by address)', () => {
    const runs = groupRegistersIntoRuns([
        { key: 'b', registryId: 102, count: 2 },
        { key: 'a', registryId: 100, count: 2 }
    ]);
    assert.equal(runs.length, 1);
    assert.deepEqual(runs[0].registers.map((r) => r.key), ['a', 'b']);
});

test('gap exactly at maxGap merges; one more splits', () => {
    // A ends at 102. B at 110 => gap 8 (== default maxGap) => merge.
    const merged = groupRegistersIntoRuns([
        { key: 'a', registryId: 100, count: 2 },
        { key: 'b', registryId: 110, count: 2 }
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].start, 100);
    assert.equal(merged[0].count, 12); // 112 - 100

    // B at 111 => gap 9 (> maxGap) => split.
    const split = groupRegistersIntoRuns([
        { key: 'a', registryId: 100, count: 2 },
        { key: 'b', registryId: 111, count: 2 }
    ]);
    assert.equal(split.length, 2);
    assert.deepEqual(split.map((r) => r.start), [100, 111]);
});

test('maxGap default constant is honoured', () => {
    assert.equal(COALESCE_MAX_GAP, 8);
    assert.equal(COALESCE_MAX_RUN, 120);
});

test('a run never exceeds maxRun even across small gaps', () => {
    // Wide gap allowance but tight run cap forces a split on span, not gap.
    const runs = groupRegistersIntoRuns(
        [
            { key: 'a', registryId: 100, count: 2 }, // ends 102
            { key: 'b', registryId: 103, count: 2 }, // span 5
            { key: 'c', registryId: 106, count: 2 }, // span 8
            { key: 'd', registryId: 109, count: 2 } // span 11 > 10 => split
        ],
        { maxGap: 1000, maxRun: 10 }
    );
    assert.equal(runs.length, 2);
    assert.deepEqual(runs[0].registers.map((r) => r.key), ['a', 'b', 'c']);
    assert.equal(runs[0].count, 8); // 108 - 100
    assert.deepEqual(runs[1].registers.map((r) => r.key), ['d']);
});

test('descriptors without an integer registryId are ignored (e.g. MANUAL)', () => {
    const runs = groupRegistersIntoRuns([
        { key: 'manual', registryId: null, count: 2 },
        { key: 'a', registryId: 100, count: 2 }
    ]);
    assert.equal(runs.length, 1);
    assert.deepEqual(runs[0].registers.map((r) => r.key), ['a']);
});

test('4-register (U64) values contribute their full span', () => {
    const runs = groupRegistersIntoRuns([
        { key: 'charge', registryId: 200, count: 2 },
        { key: 'total', registryId: 202, count: 4 }
    ]);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].start, 200);
    assert.equal(runs[0].count, 6); // 206 - 200
});

test('sliceRunWords maps offsets correctly and discards bridged gaps', () => {
    const run = {
        start: 100,
        count: 8,
        registers: [
            { key: 'a', registryId: 100, count: 2 },
            // gap at 102-103 (bridged, discarded)
            { key: 'c', registryId: 104, count: 2 },
            { key: 'd', registryId: 106, count: 2 }
        ]
    };
    const words = [10, 11, 99, 99, 14, 15, 16, 17];
    const slices = sliceRunWords(words, run);
    assert.deepEqual(slices.a, [10, 11]);
    assert.deepEqual(slices.c, [14, 15]);
    assert.deepEqual(slices.d, [16, 17]);
    assert.ok(!('99' in slices));
});

test('sliceRunWords gives U64 registers their 4 words', () => {
    const run = {
        start: 200,
        count: 6,
        registers: [
            { key: 'charge', registryId: 200, count: 2 },
            { key: 'total', registryId: 202, count: 4 }
        ]
    };
    const words = [1, 2, 3, 4, 5, 6];
    const slices = sliceRunWords(words, run);
    assert.deepEqual(slices.charge, [1, 2]);
    assert.deepEqual(slices.total, [3, 4, 5, 6]);
});

// Integration: the real battery BASE map should collapse from 9 sequential
// reads into 3 coalesced runs, matching the documented SMA register layout.
test('real battery BASE readings coalesce into 3 runs', () => {
    const registries = registryHelper.getReadingRegistries(BATTERY_BASE);
    assert.equal(registries.length, 9);

    const runs = groupRegistersIntoRuns(registries);
    assert.equal(runs.length, 3);

    const byStart = Object.fromEntries(runs.map((r) => [r.start, r]));

    // 30843-30852: current, SoC, (2-reg hole), temperature, voltage
    assert.ok(byStart[30843]);
    assert.equal(byStart[30843].count, 10);
    assert.deepEqual(byStart[30843].registers.map((r) => r.key), [
        'batteryCurrent', 'batterySoC', 'batteryTemperature', 'batteryVoltage'
    ]);

    // 30955: lone status register
    assert.ok(byStart[30955]);
    assert.equal(byStart[30955].registers.length, 1);
    assert.equal(byStart[30955].registers[0].key, 'batteryStatus');

    // 31393-31404: charge, discharge, chargeTotal(U64), dischargeTotal(U64)
    assert.ok(byStart[31393]);
    assert.equal(byStart[31393].count, 12);
    assert.deepEqual(byStart[31393].registers.map((r) => r.key), [
        'batteryCharge', 'batteryDischarge', 'batteryChargeTotal', 'batteryDischargeTotal'
    ]);
});
