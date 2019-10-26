'use strict';

const EMConfig = {
    serialNo: {offset: 20,  length: 4, factor: 1, unit: ''},
    //regard = from grid
    pregard: {offset: 32,  length: 4, factor: 1/10, unit: 'Watt'},
    //pregardcounter: {offset: 40,  length: 8, factor: 1/3600000, unit: 'kWh'},
    //surplus = to grid 
    psurplus: {offset: 52,  length: 4, factor: 1/10, unit: 'Watt'},
    //psurpluscounter: {offset: 60,  length: 8, factor: 1/3600000, unit: 'kWh'},

    pregardL1: {offset: 160, length: 4, factor: 1/10, unit: 'Watt'},
    psurplusL1: {offset: 180, length: 4, factor: 1/10, unit: 'Watt'},
    currentL1: {offset: 280, length: 4, factor: 1/1000, unit: 'A'},
    //voltageL1: {offset: 288, length: 4, factor: 1/1000, unit: 'V'},
    pregardL2: {offset: 304, length: 4, factor: 1/10, unit: 'Watt'},
    psurplusL2:	{offset: 324, length: 4, factor: 1/10, unit: 'Watt'},
    currentL2: {offset: 424, length: 4, factor: 1/1000, unit: 'A'},
    //voltageL2: {offset: 432, length: 4, factor: 1/1000, unit: 'V'},
    pregardL3: {offset: 448, length: 4, factor: 1/10, unit: 'Watt'},
    psurplusL3: {offset: 468, length: 4, factor: 1/10, unit: 'Watt'},
    currentL3: {offset: 568, length: 4, factor: 1/1000, unit: 'A'},
    //voltageL3: {offset: 576, length: 4, factor: 1/1000, unit: 'V'}
}

exports.readSerialNumber = function (message) {
    readDGMessage({serialNo: EMConfig.serialNo}, message)
        .then((result) => {
            return buildResultObj(result);
        });
}

exports.readDatagramValues = function (message) {
    readDGMessage(EMConfig, message)
        .then((result) => {
            return buildResultObj(result);
        });
}

// Iterates all datagram values and returns their value
const readDGMessage = async (configObj, message) => {
    const requests = Object.keys(configObj).map((config) => {
        return datagramReading(configObj[config], message)
        .then((reading) => {
        return [config, reading];
        });
    });
    return Promise.all(requests); // Waiting for all the readings to get resolved.
}

const datagramReading = async (config, message) => {
    const result = readDatagramValue(config, message);
    return result;
}

function readDatagramValue(config, message) {
    let value;
//    if(config.length === 8) {
//        let lowbyte = BigInt(message.readUInt32BE(points[point].offset +4));
//        let highbyte = BigInt(message.readUInt32BE(points[point].offset));
//        value = Number(((highbyte << 32n) + lowbyte));
//        value = value * config.factor;
// puts up to 53 bits by 32bit integers to one "64bit" integer
//let bufInt = (buf.readUInt32BE(0) & 0x001FFFFF) * 4294967296 + buf.readUInt32BE(4);

//    } else {
        value = message.readUIntBE(config.offset, config.length) * config.factor;
//    }
    return value;
}

function buildResultObj(resultArray) {
    let resultList = {};
    resultArray.map((key) => {
        resultList[key[0]] = key[1];
    });
    return resultList;
}
