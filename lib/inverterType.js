'use strict';

const decodeData = require('./decodeData.js');
const {setting} = require('./inverterConst.js');
const {STP, STP_TL10, STP_JP, STP_TLEE, STP_TLEE_JP} = require('./inverters/STP.js');
const {SB, SB_JP22, SB_TLST21, SB_SE10} = require('./inverters/SB.js');
const {BASIC} = require('./inverters/BASIC.js');

exports.getModbusRegistrySettings = function (deviceType) {
    if (deviceType.startsWith('STP')) {
        if (deviceType.endsWith('TL-20') || deviceType.endsWith('TL-30') || deviceType.endsWith('US-10')) {
            return STP;

        } else if (deviceType.endsWith('JP-30')) {
            return STP_JP;

        } else if (deviceType.endsWith('TLEE-JP-10') || deviceType.endsWith('TLEE-JP-11')) {
            return STP_TLEE_JP;

        } else if (deviceType.endsWith('TLEE-10')) {
            return STP_TLEE;
        
        } else if (deviceType.endsWith('TL-10')) {
            return STP_TL10;
        } else {
            return BASIC;
        }
    } else if (deviceType.startsWith('SB')) {
        if (deviceType.endsWith('TL-21') || deviceType.endsWith('TL-US-22')) {
            return SB;

        } else if (deviceType.endsWith('TL-JP-22')) {
            return SB_JP22;

        } else if (deviceType.endsWith('TLST-21') || deviceType.endsWith('VL-40')) {
            return SB_TLST21;

        } else if (deviceType.endsWith('SE-10')) {
            return SB_SE10;
        } else {
            return BASIC;
        }
    } else {
        return BASIC;
    }
}

exports.getCapabilityKeys = function (modbusSettings) {
    let resultList = {};
    Object.keys(modbusSettings).forEach(function(key) {
        let registry = modbusSettings[key];
        if (registry != null && registry.setting === setting.READING) {
            resultList[key] = registry.capability;
        }
    });
    return resultList;
}

exports.getReadingRegistries = function (modbusSettings) {
    let arr = [];
    Object.values(modbusSettings).forEach(function(registry) {
        if (registry != null && registry.setting === setting.READING) {
            arr.push(registry.registryId);
        }
      });
    return arr;  
}

exports.getRegistriesValues = function (modbusSettings, resultArray) {
    let resultList = {};
    let i = 0;
    Object.keys(modbusSettings).forEach(function(key) {
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
    Object.values(modbusSettings).forEach(function(registry) {
        if (registry != null && registry.setting === setting.INFO) {
            arr.push(registry.registryId);
        }
      });
    return arr;
}

exports.getInfoValues = function (modbusSettings, resultArray) {
    let resultList = {};
    let i = 0;
    Object.keys(modbusSettings).forEach(function(key) {
        let registry = modbusSettings[key];
        if (registry != null && registry.setting === setting.INFO) {
            resultList[key] = registry.readData(resultArray[i]);
            i++;
        }
    });
    return resultList;
}

function getObjectKeys() {

}

exports.decodeDeviceType = function (valArray) {
    return decodeData.decodeDeviceType(valArray);
}