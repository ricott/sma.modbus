'use strict';

const decodeData = require('./decodeData.js');
const { setting } = require('./modbusRegistry.js');

// Shared registry-handling logic used by both the inverter and battery
// registry handlers. These functions are pure (given a modbusSettings object
// and, for decoding, a keyed map of raw register words) so they are easy to
// unit test and keep the two handlers free of duplicated boilerplate.

// Capabilities the device should expose: READING registers plus MANUAL ones
// (values computed on the device rather than read from a register).
function getCapabilityKeys(modbusSettings) {
    const resultList = {};
    for (const [key, registry] of Object.entries(modbusSettings)) {
        if (registry != null && (registry.setting === setting.READING || registry.setting === setting.MANUAL)) {
            resultList[key] = registry.capability;
        }
    }
    return resultList;
}

// Collect readable register descriptors for a given setting type. Each entry
// carries everything the coalescing reader needs: the map key (used to pair the
// decoded value back), the Modbus address, the register span and a human
// comment for logging. MANUAL registers (registryId === null) are skipped.
function collectRegistries(modbusSettings, settingType) {
    const arr = [];
    for (const [key, registry] of Object.entries(modbusSettings)) {
        if (registry != null && registry.setting === settingType && Number.isInteger(registry.registryId)) {
            arr.push({
                key,
                registryId: registry.registryId,
                count: registry.registerCount,
                comment: registry.comment
            });
        }
    }
    return arr;
}

// Decode a keyed map of raw register words into capability values. Registers
// whose words are missing (null/undefined) are skipped so a failed read does
// not overwrite the last known value with a decode of nothing.
function decodeValues(modbusSettings, settingType, wordsByKey) {
    const resultList = {};
    for (const [key, registry] of Object.entries(modbusSettings)) {
        if (registry != null && registry.setting === settingType) {
            const words = wordsByKey ? wordsByKey[key] : undefined;
            if (words == null) {
                continue;
            }
            resultList[key] = registry.readData(words);
        }
    }
    return resultList;
}

module.exports = {
    getCapabilityKeys,
    getReadingRegistries: (modbusSettings) => collectRegistries(modbusSettings, setting.READING),
    getInfoRegistries: (modbusSettings) => collectRegistries(modbusSettings, setting.INFO),
    getReadingValues: (modbusSettings, wordsByKey) => decodeValues(modbusSettings, setting.READING, wordsByKey),
    getInfoValues: (modbusSettings, wordsByKey) => decodeValues(modbusSettings, setting.INFO, wordsByKey),
    decodeDeviceType: (valArray) => decodeData.decodeDeviceType(valArray)
};
