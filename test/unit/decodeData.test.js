'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const decodeData = require('../../lib/modbus/decodeData.js');

// Registers are [highWord, lowWord] (SMA is big-endian; the register at the
// lower address is the most-significant word).

test('decodeU32 decodes a plain unsigned value', () => {
    assert.equal(decodeData.decodeU32([0, 100], 0, 0), 100);
    assert.equal(decodeData.decodeU32([0x0001, 0x86A0], 0, 0), 100000);
});

test('decodeU32 applies decimal scaling', () => {
    // 1234 with 2 decimals in, 0 out (U32_FIX2) => 12
    assert.equal(decodeData.decodeU32([0, 1234], 2, 0), 12);
    // 1234 with 1 decimal in and out => 123.4
    assert.equal(decodeData.decodeU32([0, 1234], 1, 1), 123.4);
});

test('decodeU32 treats only the exact 0xFFFFFFFF sentinel as NaN', () => {
    assert.equal(decodeData.decodeU32([0xFFFF, 0xFFFF], 0, 0), 0);
    // Regression: 0xFFFF0000 must NOT be misread as NaN (was a latent bug when
    // only the high word was compared).
    assert.equal(decodeData.decodeU32([0xFFFF, 0x0000], 0, 0), 4294901760);
});

test('decodeS32 decodes negative values', () => {
    // 0xFFFFFFFB = -5
    assert.equal(decodeData.decodeS32([0xFFFF, 0xFFFB], 0, 0), -5);
    // with 1 decimal => -0.5
    assert.equal(decodeData.decodeS32([0xFFFF, 0xFFFB], 1, 1), -0.5);
});

test('decodeS32 treats only the exact 0x80000000 sentinel as NaN', () => {
    assert.equal(decodeData.decodeS32([0x8000, 0x0000], 0, 0), 0);
    // Regression: 0x80000001 (-2147483647) is a real value, not NaN.
    assert.equal(decodeData.decodeS32([0x8000, 0x0001], 0, 0), -2147483647);
});

test('decodeU64 combines four words without precision loss', () => {
    // 0x0000_0000_0001_0000 = 65536
    assert.equal(decodeData.decodeU64([0, 0, 1, 0], 0, 0), 65536);
    // A large value beyond 32 bits
    assert.equal(decodeData.decodeU64([0x0001, 0x0000, 0x0000, 0x0000], 0, 0), 281474976710656);
});

test('decodeU64 returns 0 for the all-ones NaN sentinel and short input', () => {
    assert.equal(decodeData.decodeU64([0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF], 0, 0), 0);
    assert.equal(decodeData.decodeU64([1, 2], 0, 0), 0);
    assert.equal(decodeData.decodeU64(null, 0, 0), 0);
});

test('decodeDeviceType maps a known type id and reports unknowns', () => {
    // 9284 -> STP 20000TL-30 (passed as [highWord, lowWord])
    assert.equal(decodeData.decodeDeviceType([0, 9284]), 'STP 20000TL-30');
    assert.match(decodeData.decodeDeviceType([0, 1]), /^UNKNOWN \(1\)$/);
});

test('decodeDeviceClass maps known classes and reports unknowns', () => {
    assert.equal(decodeData.decodeDeviceClass(8007), 'Battery Inverter');
    assert.equal(decodeData.decodeDeviceClass(8001), 'Solar Inverter');
    assert.match(decodeData.decodeDeviceClass(1), /^UNKNOWN \(1\)$/);
});

test('decodeStatus / decodeCondition decode operating codes', () => {
    assert.equal(decodeData.decodeStatus([0, 303]), 'Off');
    assert.equal(decodeData.decodeStatus([0, 295]), 'MPP');
    assert.equal(decodeData.decodeCondition([0, 307]), 'Ok');
    assert.equal(decodeData.decodeCondition([0, 35]), 'Fault');
});

test('WH/KWH/MWH formatters convert as expected', () => {
    assert.equal(decodeData.formatWHasKWH(1500), 1.5);
    assert.equal(decodeData.formatKWHasWH(1.5), 1500);
    assert.equal(decodeData.formatWHasMWH(1500000), 1.5);
});
