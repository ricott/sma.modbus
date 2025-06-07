'use strict';

const decodeData = require('../decodeData.js');
const { setting } = require('../modbusRegistry.js');
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

exports.getCapabilityKeys = function (modbusSettings) {
    let resultList = {};
    Object.keys(modbusSettings).forEach(function (key) {
        let registry = modbusSettings[key];
        if (registry != null && (registry.setting === setting.READING || registry.setting === setting.MANUAL)) {
            resultList[key] = registry.capability;
        }
    });
    return resultList;
}

exports.getReadingRegistries = function (modbusSettings) {
    let arr = [];
    Object.values(modbusSettings).forEach(function (registry) {
        if (registry != null && registry.setting === setting.READING) {
            arr.push(registry.registryId);
        }
    });
    return arr;
}

exports.getReadingValues = function (modbusSettings, resultArray) {
    let resultList = {};
    let i = 0;
    Object.keys(modbusSettings).forEach(function (key) {
        let registry = modbusSettings[key];
        if (registry != null && registry.setting === setting.READING) {
            resultList[key] = registry.readData(resultArray[i]);
            i++;
        }
    });
    return resultList;
}

exports.getInfoRegistries = function (modbusSettings) {
    let arr = [];
    Object.values(modbusSettings).forEach(function (registry) {
        if (registry != null && registry.setting === setting.INFO) {
            arr.push(registry.registryId);
        }
    });
    return arr;
}

exports.getInfoValues = function (modbusSettings, resultArray) {
    let resultList = {};
    let i = 0;
    Object.keys(modbusSettings).forEach(function (key) {
        let registry = modbusSettings[key];
        if (registry != null && registry.setting === setting.INFO) {
            resultList[key] = registry.readData(resultArray[i]);
            i++;
        }
    });
    return resultList;
}

exports.decodeDeviceType = function (valArray) {
    return decodeData.decodeDeviceType(valArray);
}