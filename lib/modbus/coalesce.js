'use strict';

// Read-coalescing bounds. Contiguous registers within COALESCE_MAX_GAP registers
// of each other are fetched in a single readHoldingRegisters call, up to
// COALESCE_MAX_RUN registers per read (the Modbus spec caps a single read at 125
// registers). Bridging small gaps lets a run span a few reserved/unmapped holes,
// trading a handful of wasted words for far fewer round-trips.
const COALESCE_MAX_GAP = 8;
const COALESCE_MAX_RUN = 120;

/**
 * Group register descriptors into contiguous "runs" that can each be fetched
 * with a single readHoldingRegisters call. Registers are sorted by address and
 * greedily merged while the inter-register gap stays within `maxGap` and the
 * resulting run span stays within `maxRun`.
 *
 * Descriptors without an integer registryId (e.g. MANUAL registers computed on
 * the device) are ignored.
 *
 * @param {Array<{key: string, registryId: number, count: number, comment?: string}>} registries
 * @param {{maxGap?: number, maxRun?: number}} [opts]
 * @returns {Array<{start: number, count: number, registers: Array}>}
 *   Each run's `registers` is ordered by address; `start`/`count` describe the
 *   single read that covers them (count = registers spanned, holes included).
 */
function groupRegistersIntoRuns(registries, opts = {}) {
    const maxGap = Number.isFinite(opts.maxGap) ? opts.maxGap : COALESCE_MAX_GAP;
    const maxRun = Number.isFinite(opts.maxRun) ? opts.maxRun : COALESCE_MAX_RUN;

    const sorted = (registries || [])
        .filter((r) => r && Number.isInteger(r.registryId))
        .map((r) => ({ ...r, count: Number.isInteger(r.count) && r.count > 0 ? r.count : 2 }))
        .sort((a, b) => a.registryId - b.registryId);

    const runs = [];
    let current = null;

    for (const reg of sorted) {
        const regEnd = reg.registryId + reg.count; // exclusive end address

        if (current) {
            // Gap = number of registers between the current run end and this one.
            // Negative (overlap/nesting) is fine and counts as contiguous.
            const gap = reg.registryId - current.end;
            const wouldSpan = regEnd - current.start;
            if (gap <= maxGap && wouldSpan <= maxRun) {
                current.registers.push(reg);
                current.end = Math.max(current.end, regEnd);
                continue;
            }
        }

        current = { start: reg.registryId, end: regEnd, registers: [reg] };
        runs.push(current);
    }

    return runs.map((run) => ({
        start: run.start,
        count: run.end - run.start,
        registers: run.registers
    }));
}

/**
 * Slice the flat 16-bit word array returned for a run (jsmodbus
 * `_valuesAsArray`, index 0 == register `run.start`) back into per-register word
 * arrays, keyed by register key. Words falling in bridged gaps are discarded.
 *
 * @param {number[]} words - flat word array covering the whole run
 * @param {{start: number, registers: Array}} run
 * @returns {Object<string, number[]>}
 */
function sliceRunWords(words, run) {
    const slices = {};
    for (const reg of run.registers) {
        const offset = reg.registryId - run.start;
        slices[reg.key] = words.slice(offset, offset + reg.count);
    }
    return slices;
}

module.exports = {
    COALESCE_MAX_GAP,
    COALESCE_MAX_RUN,
    groupRegistersIntoRuns,
    sliceRunWords
};
