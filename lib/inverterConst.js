'use strict';

const decodeData = require('./decodeData.js');

const type = {
    U32_FIX0: { format: 'U32', decimalsIn: 0, decimalsOut: 0 },
    U32_FIX1: { format: 'U32', decimalsIn: 1, decimalsOut: 1 },
    U32_FIX2: { format: 'U32', decimalsIn: 2, decimalsOut: 0 },
    U32_FIX3: { format: 'U32', decimalsIn: 3, decimalsOut: 1 },
    S32_FIX0: { format: 'S32', decimalsIn: 0, decimalsOut: 0 },
    S32_FIX1: { format: 'S32', decimalsIn: 1, decimalsOut: 1 },
    S32_FIX2: { format: 'S32', decimalsIn: 2, decimalsOut: 0 },
    S32_FIX3: { format: 'S32', decimalsIn: 3, decimalsOut: 1 },
    STATUS: { format: 'STATUS' },
    BATTERY_STATUS: { format: 'BATTERY_STATUS' },
    CONDITION: { format: 'CONDITION' },
    SW: { format: 'SW' },
    DEVICETYPE: { format: 'DEVICETYPE' },
    GRIDCTRY:  { format: 'GRIDCTRY' }
};

const setting = {
    INFO: 'INFO',
    READING: 'READING',
    MANUAL: 'MANUAL'
}

class ModbusRegistry {
    constructor(setting, registryId, type, comment, capability) {
        this._setting = setting;
        this._registryId = registryId;
        this._type = type;
        this._comment = comment;
        this._capability = capability;
    }

    get registryId() {
      return this._registryId;
    }

    get comment() {
        return this._comment;
    }

    get setting() {
        return this._setting;
    }

    get capability() {
        return this._capability;
    }

    readData(dataArray) {
        if (this._type.format === 'U32') {
            return decodeData.decodeU32(dataArray, this._type.decimalsIn, this._type.decimalsOut);
        } else if (this._type.format === 'S32') {
            return decodeData.decodeS32(dataArray, this._type.decimalsIn, this._type.decimalsOut);
        } else if (this._type === type.CONDITION) {
            return decodeData.decodeCondition(dataArray);
        } else if (this._type === type.STATUS) {
            return decodeData.decodeStatus(dataArray);
        } else if (this._type === type.BATTERY_STATUS) {
            return decodeData.decodeBatteryOperationalStatus(dataArray);
        } else if (this._type === type.SW) {
            return decodeData.decodeSoftwareVersion(dataArray);
        } else if (this._type === type.DEVICETYPE) {
            return decodeData.decodeDeviceType(dataArray);
        } else if (this._type === type.GRIDCTRY) {
            return decodeData.decodeGridCountry(dataArray);
        }
    }
}

module.exports = {
    type,
    setting,
    ModbusRegistry
}