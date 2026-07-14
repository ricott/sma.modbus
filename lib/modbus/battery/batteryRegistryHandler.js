'use strict';

const registryHelper = require('../registryHelper.js');
const { BASIC } = require('./registry/basic.js');
const { SBS, SBS_VL, SI } = require('./registry/sbs.js');
const { SMARTENERGY } = require('./registry/smartEnergy.js');
const { STP_SE } = require('./registry/stp.js');

exports.getModbusRegistrySettings = function (deviceType) {
    let type = BASIC;

    if (deviceType.startsWith('Smart Energy')) {
        type = SMARTENERGY;

    } else if (deviceType.startsWith('STP')) {
        if (deviceType.endsWith('SE-40')) {
            type = STP_SE;
        }
        // Sunny Boy Storage
    } else if (deviceType.startsWith('SBS')) {
        if (deviceType.endsWith('VL-10')) {
            type = SBS_VL;
        } else {
            type = SBS;
        }
        // Sunny Island
    } else if (deviceType.startsWith('SI')) {
        if (!deviceType.endsWith('-11')) {
            type = SI;
        }
    }

    return type;
}

// Shared, device-agnostic registry helpers (capability mapping, register
// collection, keyed decoding, device-type decode).
exports.getCapabilityKeys = registryHelper.getCapabilityKeys;
exports.getReadingRegistries = registryHelper.getReadingRegistries;
exports.getReadingValues = registryHelper.getReadingValues;
exports.getInfoRegistries = registryHelper.getInfoRegistries;
exports.getInfoValues = registryHelper.getInfoValues;
exports.decodeDeviceType = registryHelper.decodeDeviceType;