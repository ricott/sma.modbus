'use strict';

const decodeData = require('./decodeData.js');
const { setting } = require('./modbus/modbusRegistry.js');
const { STP, STP_TL10, STP_JP, STP_TLEE, STP_TLEE_JP, STP_40, STP_SE } = require('./modbus/registry/stp.js');
const { SB, SB_JP22, SB_TLST21, SB_SE10, SB_4041 } = require('./modbus/registry/sb.js');
const { SHP_20 } = require('./modbus/registry/shp.js');
const { SBS, SBS_VL, SI, SI11 } = require('./modbus/registry/sbs.js');
const { BASIC } = require('./modbus/registry/basic.js');
const { TRIPOWERX, CORE1 } = require('./modbus/registry/tripower.js');
const { SMARTENERGY } = require('./modbus/registry/smartEnergy.js');

exports.getModbusRegistrySettings = function (deviceType) {
    let type = BASIC;

    if (deviceType.startsWith('Smart Energy')) {
        type = SMARTENERGY;
    } else if (deviceType.startsWith('Tripower')) {
        if (deviceType.indexOf('CORE1') > -1) {
            type = CORE1;

        } else if (deviceType.indexOf(' X ') > -1) {
            type = TRIPOWERX;
        }

    } else if (deviceType.startsWith('STP')) {
        if (deviceType.endsWith('TL-20') || deviceType.endsWith('TL-30') || deviceType.endsWith('US-10')) {
            type = STP;

        } else if (deviceType.endsWith('JP-30')) {
            type = STP_JP;

        } else if (deviceType.endsWith('TLEE-JP-10') || deviceType.endsWith('TLEE-JP-11')) {
            type = STP_TLEE_JP;

        } else if (deviceType.endsWith('TLEE-10')) {
            type = STP_TLEE;

        } else if (deviceType.endsWith('TL-10')) {
            type = STP_TL10;

        } else if (deviceType.endsWith('US-40') || deviceType.endsWith('JP-40') || deviceType.endsWith('AV-40')) {
            type = STP_40;

        } else if (deviceType.endsWith('SE-40')) {
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
        if (deviceType.endsWith('-11')) {
            type = SI11;
        } else {
            type = SI;
        }

    } else if (deviceType.startsWith('SB')) {
        if (deviceType.endsWith('TL-21') || deviceType.endsWith('TL-US-22')) {
            type = SB;

        } else if (deviceType.endsWith('TL-JP-22')) {
            type = SB_JP22;

        } else if (deviceType.endsWith('TLST-21') || deviceType.endsWith('VL-40')) {
            type = SB_TLST21;

        } else if (deviceType.endsWith('SE-10') || deviceType.endsWith('AV-40')) {
            type = SB_SE10;

        } else if (deviceType.endsWith('US-40') || deviceType.endsWith('AV-41')) {
            type = SB_4041;
        }
    } else if (deviceType.startsWith('SHP')) {
        if (deviceType.endsWith('20')) {
            type = SHP_20;
        }
    }

    return type;
}

exports.isDailyYieldManual = function (modbusSettings) {
    if (modbusSettings && modbusSettings.dailyYield && modbusSettings.dailyYield.setting) {
        return modbusSettings.dailyYield.setting === setting.MANUAL;
    } else {
        return false;
    }
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