'use strict';

const utility = require('../util.js');
const logger = require('../logger.js');

exports.decodeSoftwareVersion = function (valueArr) {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(valueArr[0], 0);
    const majorVersion = (buf[2] & 0xF) + ((buf[2] & 0xF0) >> 4) * 10;
    const minorVersion = (buf[3] & 0xF) + ((buf[3] & 0xF0) >> 4) * 10;
    buf.writeUInt32BE(valueArr[1], 0);
    const buildVersion = buf[2];
    const releaseType = decodeReleaseType(buf[3]);

    return majorVersion + '.' + utility.pad(minorVersion, 2) + '.' + utility.pad(buildVersion, 2) + '.' + releaseType;
}

exports.decodeDeviceType = function (valueArr) {
    return decodeDevice(uint16ToUint32(valueArr[1], valueArr[0]));
}

exports.decodeSerialNumber = function (valueArr) {
    return uint16ToUint32(valueArr[1], valueArr[0]);
}

exports.decodeGridCountry = function (valueArr) {
    return decodeGridCountry(uint16ToUint32(valueArr[1], valueArr[0]));
}

exports.decodeCondition = function (valueArr) {
    return decodeConditionType(uint16ToUint32(valueArr[1], valueArr[0]));
}

exports.decodeBatteryOperationalStatus = function (valueArr) {
    return decodeBatteryOperationalStatusType(uint16ToUint32(valueArr[1], valueArr[0]));
}

exports.decodeBatteryChargingState = function (valueArr) {
    return decodeBatteryChargingState(uint16ToUint32(valueArr[1], valueArr[0]));
}

exports.decodeStatus = function (valueArr) {
    return decodeOperatingStatus(uint16ToUint32(valueArr[1], valueArr[0]));
}

exports.formatKWHasWH = function (kwhValue) {
    return parseInt(Number(kwhValue * 1000));
}

exports.formatWHasKWH = function (whValue) {
    return parseFloat(Number(whValue / 1000).toFixed(2));
}

exports.formatWHasMWH = function (whValue) {
    return parseFloat(Number(whValue / 1000 / 1000).toFixed(3));
}

exports.decodeS32 = function (valueArr, decimalsIn, decimalsOut) {
    let num = uint16ToUint32(valueArr[1], valueArr[0]) || 0;

    // 0x80000000 is SMA's S32 NaN sentinel ("no value"). Match the full 32-bit
    // pattern, not just the high word - a real value such as 0x80000001
    // (-2147483647) shares the high word 0x8000 but is NOT NaN.
    if (num === 0x80000000) {
        return 0;
    }

    // Convert to signed 32-bit integer if the highest bit is set
    if (num & 0x80000000) {
        num = num - 0x100000000;
    }

    if (decimalsIn === 1) {
        num = num / 10;
    } else if (decimalsIn === 2) {
        num = num / 100;
    } else if (decimalsIn === 3) {
        num = num / 1000;
    }

    if (decimalsIn !== decimalsOut) {
        num = parseFloat(num.toFixed(decimalsOut));
    }

    return num;
}

exports.decodeU32 = function (valueArr, decimalsIn, decimalsOut) {
    const num = uint16ToUint32(valueArr[1], valueArr[0]) || 0;

    // 0xFFFFFFFF is SMA's U32 NaN sentinel ("no value"). Match the full 32-bit
    // pattern, not just the high word, so real values in 0xFFFF0000-0xFFFFFFFE
    // are not discarded.
    if (num === 0xFFFFFFFF) {
        return 0;
    }

    return decode32(valueArr, decimalsIn, decimalsOut);
}

exports.decodeU64 = function (valueArr, decimalsIn, decimalsOut) {
    // SMA U64 spans 4 Modbus registers, most significant word first
    if (!Array.isArray(valueArr) || valueArr.length < 4) {
        return 0;
    }

    // NaN representation for U64 is 0xFFFFFFFFFFFFFFFF
    if (valueArr[0] === 0xFFFF && valueArr[1] === 0xFFFF &&
        valueArr[2] === 0xFFFF && valueArr[3] === 0xFFFF) {
        return 0;
    }

    // Use BigInt to avoid precision loss while combining the 64-bit value
    const raw = (BigInt(valueArr[0] >>> 0) << 48n) |
        (BigInt(valueArr[1] >>> 0) << 32n) |
        (BigInt(valueArr[2] >>> 0) << 16n) |
        BigInt(valueArr[3] >>> 0);

    let num = Number(raw);
    if (decimalsIn === 1) {
        num = num / 10;
    } else if (decimalsIn === 2) {
        num = num / 100;
    } else if (decimalsIn === 3) {
        num = num / 1000;
    }

    if (decimalsIn !== decimalsOut) {
        num = parseFloat(num.toFixed(decimalsOut));
    }

    return num;
}

function decode32(valueArr, decimalsIn, decimalsOut) {
    let num = uint16ToUint32(valueArr[1], valueArr[0]) || 0;
    if (decimalsIn === 1) {
        num = num / 10;
    } else if (decimalsIn === 2) {
        num = num / 100;
    } else if (decimalsIn === 3) {
        num = num / 1000;
    }

    if (decimalsIn !== decimalsOut) {
        num = parseFloat(num.toFixed(decimalsOut));
    }

    return num;
}

function uint16ToUint32(low, high) {
    const buffer = new ArrayBuffer(4);
    const intView = new Uint16Array(buffer);
    const int32View = new Uint32Array(buffer);

    intView[0] = low;
    intView[1] = high;

    return int32View[0];
}

function decodeGridCountry(numType) {
    switch (numType) {
        case 27: return 'Special setting (Adj)';
        case 42: return 'AS4777.3';
        case 306: return 'Island mode 60 Hz (OFF-Grid60)';
        case 313: return 'Island mode 50 Hz (OFF-Grid50)';
        case 333: return 'PPC';
        case 438: return 'VDE0126-1-1';
        case 560: return 'EN50438';
        case 1013: return 'Other standard';
        case 1020: return 'Medium-Voltage Directive (Germany)';
        case 1032: return 'MVtgDirective Internal';
        case 1199: return 'PPDS';
        case 7501: return 'RD1663/661-A';
        case 7505: return 'CGC/GF001';
        case 7508: return 'JP50';
        case 7509: return 'JP60';
        case 7510: return 'VDE-AR-N4105';
        case 7513: return 'VDE-AR-N4105-MP';
        case 7514: return 'VDE-AR-N4105-HP';
        case 7517: return 'CEI 0-21 internal';
        case 7518: return 'CEI 0-21 external';
        case 7519: return 'UL1741/2010/277';
        case 7522: return 'NEN-EN50438';
        case 7523: return 'C10/11/2012';
        case 7524: return 'RD1699';
        case 7525: return 'G83/2';
        case 7527: return 'VFR2014';
        case 7528: return 'G59/3';
        case 7529: return 'SI4777_HS131_Pf';
        case 7530: return 'MEA2013';
        case 7531: return 'PEA2013';
        case 7532: return 'EN50438:2013';
        case 7533: return 'NEN-EN50438:2013';
        case 7535: return 'WorstCase';
        case 7536: return 'Default (DftEN)';
        case 7538: return 'SI4777_HS131_13';
        case 7539: return 'RD1699/413';
        case 7540: return 'KEMCO2013';
        case 7544: return 'VDE-AR-N4105-DK';
        case 7549: return 'AS4777.2_2015';
        case 7550: return 'NRS97-2-1';
        case 7551: return 'NT_Ley2057';
        case 7556: return 'MEA2016';
        case 7557: return 'PEA2016';
        case 7559: return 'UL1741/2016/120';
        case 7560: return 'UL1741/2016/240';
        case 7561: return 'UL1741/2016/208';
        case 7562: return 'HECO2017/120';
        case 7563: return 'HECO2017/208';
        case 7564: return 'HECO2017/240';
        case 7565: return 'ABNT NBR 16149:2013';
        case 7566: return 'IE-EN50438:2013';
        case 7567: return 'DEWA 2016 intern';
        case 7568: return 'DEWA 2016 extern';
        case 7569: return 'TOR D4 2016';
        case 7570: return 'IEEE 1547';
        case 7572: return 'CEI 0-16 external';
        case 7573: return 'G83/2-1:2018';
        case 7574: return 'G59/3-4:2018';
        case 7584: return 'DE VDE-AR-N4105:2018';
        case 7586: return '[DE] VDE-AR-N4105:2018';
        case 7588: return 'DE VDE-AR-N4110:2018';
        case 7589: return 'DE VDE-AR-N4110:2018';
        case 7590: return 'EU EN50549-1:2018 LV';
        case 7591: return 'EU EN50549-2:2018 MV';
        case 7592: return 'AA Default country dataset 2019 50Hz';
        case 7594: return 'UK ENA-EREC-G98/1:2018';
        case 7595: return 'UK ENA-EREC-G99/1:2018';
        case 7596: return '[BE] C10/11-LV1:2018';
        case 7597: return 'BE C10/11-LV2:2018 LV';
        case 7598: return 'BE C10/11-MV1:2018 MV';
        case 16777213: return 'Information not available';
        default: return `UNKNOWN (${numType})`;
    }
}

function decodeOperatingStatus(numType) {
    switch (numType) {
        case 235: return 'Parallel grid operation ';
        case 295: return 'MPP';
        case 303: return 'Off';
        case 381: return 'Stop';
        case 443: return 'Constant voltage';
        case 569: return 'Activated';
        case 1295: return 'Standby';
        case 1392: return 'Fault';
        case 1393: return 'Waiting for PV voltage';
        case 1428: return 'Backup mode operating mode';
        case 1467: return 'Start';
        case 1469: return 'Shut down';
        case 1480: return 'Waiting for utilities company';
        case 1795: return 'Bolted';
        case 1855: return 'Stand-alone operation';
        case 2119: return 'Derating';
        case 3128: return 'Remote control via service';
        case 16777213: return 'Information not available';
        default: return `UNKNOWN (${numType})`;
    }
}

function decodeConditionType(numType) {
    switch (numType) {
        case 35: return 'Fault';
        case 303: return 'Off';
        case 307: return 'Ok';
        case 455: return 'Warning';
        default: return `UNKNOWN (${numType})`;
    }
}

function decodeBatteryChargingState(numType) {
    switch (numType) {
        case 2289: // Charge
        case 2292: // Charge
        case 3664: // Emergency charge
            return 'charging';
        case 2290: // Discharge
        case 2293: // Discharge
            return 'discharging';
        default: 
            return 'idle';
    }
}

function decodeBatteryOperationalStatusType(numType) {
    switch (numType) {
        case 303: return 'Off';
        case 308: return 'On';
        case 2289: return 'Charge';
        case 2290: return 'Discharge';
        case 2291: return 'Standby';
        case 2292: return 'Charge';
        case 2293: return 'Discharge';
        case 2424: return 'Presetting';
        case 3664: return 'Emergency charge';
        case 16777213: return 'Not available';
        default: return `UNKNOWN (${numType})`;
    }
}

function decodeReleaseType(numType) {
    switch (numType) {
        case 0: return 'N';
        case 1: return 'E';
        case 2: return 'A';
        case 3: return 'B';
        case 4: return 'R';
        case 5: return 'S';
        default: return numType;
    }
}

exports.decodeDeviceClass = function (numType) {
    switch (numType) {
        case 460: return 'Solar Inverter';
        case 8000: return 'All Devices';
        case 8001: return 'Solar Inverter';
        case 8002: return 'Wind Turbine Inverter';
        case 8007: return 'Battery Inverter';
        case 8009: return 'Hybrid Inverter';
        case 8033: return 'Consumer';
        case 8064: return 'Sensor System in General';
        case 8065: return 'Electricity meter';
        case 8128: return 'Communication device';
        default: return `UNKNOWN (${numType})`;
    }
}

function decodeDevice(typeId) {
    switch (typeId) {
        case 9067: return 'STP 10000TL-10';
        case 9068: return 'STP 12000TL-10';
        case 9069: return 'STP 15000TL-10';
        case 9070: return 'STP 17000TL-10';
        case 9074: return 'SB 3000TL-21';
        case 9075: return 'SB 4000TL-21';
        case 9076: return 'SB 5000TL-21';
        case 9098: return 'STP 5000TL-20';
        case 9099: return 'STP 6000TL-20';
        case 9100: return 'STP 7000TL-20';
        case 9101: return 'STP 8000TL-10';
        case 9102: return 'STP 9000TL-20';
        case 9103: return 'STP 8000TL-20';
        case 9161: return 'SB 3000TL-JP-22';
        case 9162: return 'SB 3500TL-JP-22';
        case 9163: return 'SB 4000TL-JP-22';
        case 9164: return 'SB 4500TL-JP-22';
        case 9165: return 'SB 3600TL-21';
        case 9181: return 'STP 20000TLEE-10';
        case 9182: return 'STP 15000TLEE-10';
        case 9183: return 'SB 2000TLST-21';
        case 9184: return 'SB 2500TLST-21';
        case 9185: return 'SB 3000TLST-21';
        case 9194: return 'STP 12000TL-US-10';
        case 9195: return 'STP 15000TL-US-10';
        case 9196: return 'STP 20000TL-US-10';
        case 9197: return 'STP 24000TL-US-10';
        case 9198: return 'SB 3000TL-US-22';
        case 9199: return 'SB 3800TL-US-22';
        case 9200: return 'SB 4000TL-US-22';
        case 9201: return 'SB 5000TL-US-22';
        case 9222: return 'STP 10000TLEE-JP-10';
        case 9223: return 'SI 6.0H-11';
        case 9224: return 'SI 8.0H-11';
        case 9225: return 'SB 5000SE-10';
        case 9226: return 'SB 3600SE-10';
        case 9271: return 'STP 20000TLEE-JP-11';
        case 9272: return 'STP 10000TLEE-JP-11';
        case 9273: return 'SB 6000TL-21';
        case 9274: return 'SB 6000TL-US-22';
        case 9275: return 'SB 7000TL-US-22';
        case 9276: return 'SB 7600TL-US-22';
        case 9277: return 'SB 8000TL-US-22';
        case 9278: return 'SI 3.0M-11';
        case 9279: return 'SI 4.4M-11';
        case 9281: return 'STP 10000TL-20';
        case 9282: return 'STP 11000TL-20';
        case 9283: return 'STP 12000TL-20';
        case 9284: return 'STP 20000TL-30';
        case 9285: return 'STP 25000TL-30';
        case 9293: return 'SB 7700TL-US-22';
        case 9301: return 'SB 1.5-1VL-40';
        case 9302: return 'SB 2.5-1VL-40';
        case 9303: return 'SB 2.0-1VL-40';
        case 9304: return 'SB 5.0-1SP-US-40';
        case 9305: return 'SB 6.0-1SP-US-40';
        case 9306: return 'SB 7.7-1SP-US-40';
        case 9309: return 'STP 27000TL-US-10';
        case 9310: return 'STP 30000TL-US-10';
        case 9311: return 'STP 25000TL-JP-30';
        case 9317: return 'SB 5400TL-JP-22';
        case 9319: return 'SB3.0-1AV-40';
        case 9320: return 'SB3.6-1AV-40';
        case 9321: return 'SB4.0-1AV-40';
        case 9322: return 'SB5.0-1AV-40';
        case 9326: return 'SBS 2.5-1VL-40';
        case 9328: return 'SB 3.0-1SP-US-40';
        case 9329: return 'SB 3.8-1SP-US-40';
        case 9330: return 'SB 7.0-1SP-US-40';
        case 9332: return 'SI 4.4M-12';
        case 9333: return 'SI 6.0H-12';
        case 9334: return 'SI 8.0H-12';
        case 9336: return 'STP 15000TL-30';
        case 9337: return 'STP 17000TL-30';
        case 9338: return 'Tripower CORE1 (STP 50-40)';
        case 9339: return 'Tripower CORE1 (STP 50-US-40)';
        case 9340: return 'Tripower CORE1 (STP 50-JP-40)';
        case 9344: return 'STP 4.0-3AV-40';
        case 9345: return 'STP 5.0-3AV-40';
        case 9346: return 'STP 6.0-3AV-40';
        case 9347: return 'STP 8.0-3AV-40';
        case 9348: return 'STP 10.0-3AV-40';
        case 9354: return 'STP 24500TL-JP-30';
        case 9356: return 'SBS 3.7-10';
        case 9358: return 'SBS 5.0-10';
        case 9359: return 'SBS 6.0-10';
        case 9360: return 'SBS 3.8-US-10';
        case 9361: return 'SBS 5.0-US-10';
        case 9362: return 'SBS 6.0-US-10';
        case 9366: return 'STP 3.0-3AV-40';
        case 9401: return 'SB 3.0-1AV-41';
        case 9402: return 'SB 3.6-1AV-41';
        case 9403: return 'SB 4.0-1AV-41';
        case 9404: return 'SB 5.0-1AV-41';
        case 9405: return 'SB 6.0-1AV-41';
        case 9406: return 'SHP 100-20';
        case 9407: return 'SHP 150-20';
        case 9408: return 'SHP 125-US-20';
        case 9409: return 'SHP 150-US-20';
        case 9428: return 'Tripower CORE1 (STP 62-US-41)';
        case 9429: return 'Tripower CORE1 (STP 50-US-41)';
        case 9430: return 'Tripower CORE1 (STP 33-US-41)';
        case 9431: return 'Tripower CORE1 (STP 50-41)';
        case 9432: return 'Tripower CORE1 (STP 50-JP-41)';
        case 9474: return 'SI 4.4M-13';
        case 9475: return 'SI 6.0H-13';
        case 9476: return 'SI 8.0H-13';
        case 9488: return 'Tripower X 25';
        case 9489: return 'Tripower X 20';
        // case 9490: return 'Tripower X 12 (STP 12-50)';
        case 9491: return 'Tripower X 15';
        case 9492: return 'Tripower X 12';
        // case 19035: return 'Sunny Tripower Storage 50';
        // case 19036: return 'Sunny Tripower Storage 30';
        // case 19037: return 'Sunny Tripower Storage 60 US480';
        // case 19038: return 'Sunny Tripower Storage 40 US480';
        // case 19039: return 'Sunny Tripower Storage 27 US208';
        case 19048: return 'STP 5.0-3SE-40';
        case 19049: return 'STP 6.0-3SE-40';
        case 19050: return 'STP 8.0-3SE-40';
        case 19051: return 'STP 10.0-3SE-40';
        case 19084: return 'Smart Energy 7.7-US';
        case 19085: return 'Smart Energy 6.0';
        case 19086: return 'Smart Energy 5.8-US';
        case 19087: return 'Smart Energy 4.8-US';
        case 19088: return 'Smart Energy 3.8-US';
        case 19128: return 'Smart Energy 3.6';
        case 19129: return 'Smart Energy 4.0';
        case 19130: return 'Smart Energy 5.0';
        default:
            // Unrecognised inverter model - report it (rate-limited, anonymous)
            // so we can spot models we don't support yet, old or new.
            logger.reportUnknownDeviceType(typeId);
            return `UNKNOWN (${typeId})`;
    }
}
