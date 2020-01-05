'use strict';

const utility = require('./util.js');

exports.decodeSoftwareVersion = function (valueArr) {
  let buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(valueArr[0], 0);
  let majorVersion = (buf[2] & 0xF) + ((buf[2] & 0xF0) >> 4)*10;
  let minorVersion = (buf[3] & 0xF) + ((buf[3] & 0xF0) >> 4)*10;
  buf.writeUInt32BE(valueArr[1], 0);
  let buildVersion = buf[2];
  let releaseType = decodeReleaseType(buf[3]);

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

exports.decodeStatus = function (valueArr) {
  return decodeOperatingStatus(uint16ToUint32(valueArr[1], valueArr[0]));
}

exports.formatWHasKWH = function (whValue) {
  return parseFloat(Number(whValue / 1000).toFixed(2));
}

exports.formatWHasMWH = function (whValue) {
  return parseFloat(Number(whValue / 1000 / 1000).toFixed(3));
}

exports.decodeS32 = function (valueArr, decimalsIn, decimalsOut) {
  if (valueArr[0] == parseInt('0x8000 0000', 16)) {
    //NaN
    return 0;
  }

  return decode32(valueArr, decimalsIn, decimalsOut);
}

exports.decodeU32 = function (valueArr, decimalsIn, decimalsOut) {
  if (valueArr[0] == parseInt('0xFFFF FFFF', 16)) {
    //NaN
    return 0;
  }

  return decode32(valueArr, decimalsIn, decimalsOut);
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

  if (decimalsIn != decimalsOut) {
    num = parseFloat(num.toFixed(decimalsOut));
  }

  return num;
}

function uint16ToUint32(low, high) {
  let buffer = new ArrayBuffer(4);
  let intView = new Uint16Array(buffer);
  let int32View = new Uint32Array(buffer);

  intView[0] = low;
  intView[1] = high;

  return int32View[0];
}

function decodeGridCountry(numType) {
  switch (numType) {
    case 27: return 'Special setting (Adj)'; break;
    case 42: return 'AS4777.3'; break;
    case 306: return 'Island mode 60 Hz (OFF-Grid60)'; break;
    case 313: return 'Island mode 50 Hz (OFF-Grid50)'; break;
    case 333: return 'PPC'; break;
    case 438: return 'VDE0126-1-1'; break;
    case 560: return 'EN50438'; break;
    case 1013: return 'Other standard'; break;
    case 1020: return 'Medium-Voltage Directive (Germany)'; break;
    case 1032: return 'MVtgDirective Internal'; break;
    case 1199: return 'PPDS'; break;
    case 7501: return 'RD1663/661-A'; break;
    case 7505: return 'CGC/GF001'; break;
    case 7508: return 'JP50'; break;
    case 7509: return 'JP60'; break;
    case 7510: return 'VDE-AR-N4105'; break;
    case 7513: return 'VDE-AR-N4105-MP'; break;
    case 7514: return 'VDE-AR-N4105-HP'; break;
    case 7517: return 'CEI 0-21 internal'; break;
    case 7518: return 'CEI 0-21 external'; break;
    case 7519: return 'UL1741/2010/277'; break;
    case 7522: return 'NEN-EN50438'; break;
    case 7523: return 'C10/11/2012'; break;
    case 7524: return 'RD1699'; break;
    case 7525: return 'G83/2'; break;
    case 7527: return 'VFR2014'; break;
    case 7528: return 'G59/3'; break;
    case 7529: return 'SI4777_HS131_Pf'; break;
    case 7530: return 'MEA2013'; break;
    case 7531: return 'PEA2013'; break;
    case 7532: return 'EN50438:2013'; break;
    case 7533: return 'NEN-EN50438:2013'; break;
    case 7535: return 'WorstCase'; break;
    case 7536: return 'Default (DftEN)'; break;
    case 7538: return 'SI4777_HS131_13'; break;
    case 7539: return 'RD1699/413'; break;
    case 7540: return 'KEMCO2013'; break;
    case 7544: return 'VDE-AR-N4105-DK'; break;
    case 7549: return 'AS4777.2_2015'; break;
    case 7550: return 'NRS97-2-1'; break;
    case 7551: return 'NT_Ley2057'; break;
    case 7556: return 'MEA2016'; break;
    case 7557: return 'PEA2016'; break;
    case 7559: return 'UL1741/2016/120'; break;
    case 7560: return 'UL1741/2016/240'; break;
    case 7561: return 'UL1741/2016/208'; break;
    case 7562: return 'HECO2017/120'; break;
    case 7563: return 'HECO2017/208'; break;
    case 7564: return 'HECO2017/240'; break;
    case 7565: return 'ABNT NBR 16149:2013'; break;
    case 7566: return 'IE-EN50438:2013'; break;
    case 7567: return 'DEWA 2016 intern'; break;
    case 7568: return 'DEWA 2016 extern'; break;
    case 7569: return 'TOR D4 2016'; break;
    case 7570: return 'IEEE 1547'; break;
    case 7572: return 'CEI 0-16 external'; break;
    case 7573: return 'G83/2-1:2018'; break;
    case 7574: return 'G59/3-4:2018'; break;
    case 7584: return 'DE VDE-AR-N4105:2018'; break;
    case 7586: return '[DE] VDE-AR-N4105:2018'; break;
    case 7588: return 'DE VDE-AR-N4110:2018'; break;
    case 7589: return 'DE VDE-AR-N4110:2018'; break;
    case 7590: return 'EU EN50549-1:2018 LV'; break;
    case 7591: return 'EU EN50549-2:2018 MV'; break;
    case 7592: return 'AA Default country dataset 2019 50Hz'; break;
    case 7594: return 'UK ENA-EREC-G98/1:2018'; break;
    case 7595: return 'UK ENA-EREC-G99/1:2018'; break;
    case 7596: return '[BE] C10/11-LV1:2018'; break;
    case 7597: return 'BE C10/11-LV2:2018 LV'; break;
    case 7598: return 'BE C10/11-MV1:2018 MV'; break;
    case 16777213: return 'Information not available'; break;
    default: return `UNKNOWN (${numType})`; break;
  }
}

function decodeOperatingStatus(numType) {
  switch (numType) {
    case 235: return 'Parallel grid operation '; break;
    case 295: return 'MPP'; break;
    case 381: return 'Stop'; break;
    case 443: return 'Constant voltage'; break;
    case 1392: return 'Fault'; break;
    case 1393: return 'Waiting for PV voltage'; break;
    case 1428: return 'Backup mode operating mode'; break;
    case 1467: return 'Start'; break;
    case 1469: return 'Shut down'; break;
    case 1480: return 'Waiting for utilities company'; break;
    case 1855: return 'Stand-alone operation'; break;
    case 2119: return 'Derating'; break;
    case 3128: return 'Remote control via service'; break;
    case 16777213: return 'Information not available'; break;
    default: return `UNKNOWN (${numType})`; break;
  }
}

function decodeConditionType(numType) {
  switch (numType) {
    case 35: return 'Fault'; break;
    case 303: return 'Off'; break;
    case 307: return 'Ok'; break;
    case 455: return 'Warning'; break;
    default: return `UNKNOWN (${numType})`; break;
  }
}

function decodeReleaseType(numType) {
  switch (numType) {
    case 0: return 'N'; break;
    case 1: return 'E'; break;
    case 2: return 'A'; break;
    case 3: return 'B'; break;
    case 4: return 'R'; break;
    case 5: return 'S'; break;
    default: return numType; break;
  }
}

function decodeDeviceClass(numType) {
  switch (numType) {
    case 460: return 'Solar Inverter'; break;
    case 8000: return 'All Devices'; break;
    case 8001: return 'Solar Inverter'; break;
    case 8002: return 'Wind Turbine Inverter'; break;
    case 8007: return 'Battery Inverter'; break;
    case 8033: return 'Consumer'; break;
    case 8064: return 'Sensor System in General'; break;
    case 8065: return 'Electricity meter'; break;
    case 8128: return 'Communication device'; break;
    default: return `UNKNOWN (${numType})`; break;
  }
}

function decodeDevice(typeId) {
  switch (typeId) {
        case 9067: return 'STP 10000TL-10'; break;
        case 9068: return 'STP 12000TL-10'; break;
        case 9069: return 'STP 15000TL-10'; break;
        case 9070: return 'STP 17000TL-10'; break;
        case 9074: return 'SB 3000TL-21'; break;
        case 9075: return 'SB 4000TL-21'; break;
        case 9076: return 'SB 5000TL-21'; break;
        case 9098: return 'STP 5000TL-20'; break;
        case 9099: return 'STP 6000TL-20'; break;
        case 9100: return 'STP 7000TL-20'; break;
        case 9101: return 'STP 8000TL-10'; break;
        case 9102: return 'STP 9000TL-20'; break;
        case 9103: return 'STP 8000TL-20'; break;
        case 9161: return 'SB 3000TL-JP-22'; break;
        case 9162: return 'SB 3500TL-JP-22'; break;
        case 9163: return 'SB 4000TL-JP-22'; break;
        case 9164: return 'SB 4500TL-JP-22'; break;
        case 9165: return 'SB 3600TL-21'; break;
        case 9181: return 'STP 20000TLEE-10'; break;
        case 9182: return 'STP 15000TLEE-10'; break;
        case 9183: return 'SB 2000TLST-21'; break;
        case 9184: return 'SB 2500TLST-21'; break;
        case 9185: return 'SB 3000TLST-21'; break;
        case 9194: return 'STP 12000TL-US-10'; break;
        case 9195: return 'STP 15000TL-US-10'; break;
        case 9196: return 'STP 20000TL-US-10'; break;
        case 9197: return 'STP 24000TL-US-10'; break;
        case 9198: return 'SB 3000TL-US-22'; break;
        case 9199: return 'SB 3800TL-US-22'; break;
        case 9200: return 'SB 4000TL-US-22'; break;
        case 9201: return 'SB 5000TL-US-22'; break;
        case 9222: return 'STP 10000TLEE-JP-10'; break;
        case 9223: return 'SI 6.0H-11'; break;
        case 9224: return 'SI 8.0H-11'; break;
        case 9225: return 'SB 5000SE-10'; break;
        case 9226: return 'SB 3600SE-10'; break;
        case 9271: return 'STP 20000TLEE-JP-11'; break;
        case 9272: return 'STP 10000TLEE-JP-11'; break;
        case 9273: return 'SB 6000TL-21'; break;
        case 9274: return 'SB 6000TL-US-22'; break;
        case 9275: return 'SB 7000TL-US-22'; break;
        case 9276: return 'SB 7600TL-US-22'; break;
        case 9277: return 'SB 8000TL-US-22'; break;
        case 9278: return 'SI 3.0M-11'; break;
        case 9279: return 'SI 4.4M-11'; break;
        case 9281: return 'STP 10000TL-20'; break;
        case 9282: return 'STP 11000TL-20'; break;
        case 9283: return 'STP 12000TL-20'; break;
        case 9284: return 'STP 20000TL-30'; break;
        case 9285: return 'STP 25000TL-30'; break;
        case 9293: return 'SB 7700TL-US-22'; break;
        case 9301: return 'SB 1.5-1VL-40'; break;
        case 9302: return 'SB 2.5-1VL-40'; break;
        case 9303: return 'SB 2.0-1VL-40'; break;
        case 9304: return 'SB 5.0-1SP-US-40'; break;
        case 9305: return 'SB 6.0-1SP-US-40'; break;
        case 9306: return 'SB 7.7-1SP-US-40'; break;
        case 9309: return 'STP 27000TL-US-10'; break;
        case 9310: return 'STP 30000TL-US-10'; break;
        case 9311: return 'STP 25000TL-JP-30'; break;
        case 9317: return 'SB 5400TL-JP-22'; break;
        case 9319: return 'SB3.0-1AV-40'; break;
        case 9320: return 'SB3.6-1AV-40'; break;
        case 9321: return 'SB4.0-1AV-40'; break;
        case 9322: return 'SB5.0-1AV-40'; break;
        case 9326: return 'SBS 2.5-1VL-40'; break;
        case 9328: return 'SB 3.0-1SP-US-40'; break;
        case 9329: return 'SB 3.8-1SP-US-40'; break;
        case 9330: return 'SB 7.0-1SP-US-40'; break;
        case 9332: return 'SI 4.4M-12'; break;
        case 9333: return 'SI 6.0H-12'; break;
        case 9334: return 'SI 8.0H-12'; break;
        case 9336: return 'STP 15000TL-30'; break;
        case 9337: return 'STP 17000TL-30'; break;
        case 9339: return 'STP 50-US-40'; break;
        case 9340: return 'STP 50-JP-40'; break;
        case 9344: return 'STP 4.0-3AV-40'; break;
        case 9345: return 'STP 5.0-3AV-40'; break;
        case 9346: return 'STP 6.0-3AV-40'; break;
        case 9347: return 'STP 8.0-3AV-40'; break;
        case 9348: return 'STP 10.0-3AV-40'; break;
        case 9354: return 'STP 24500TL-JP-30'; break;
        case 9356: return 'SBS 3.7-10'; break;
        case 9358: return 'SBS 5.0-10'; break;
        case 9359: return 'SBS 6.0-10'; break;
        case 9360: return 'SBS 3.8-US-10'; break;
        case 9361: return 'SBS 5.0-US-10'; break;
        case 9362: return 'SBS 6.0-US-10'; break;
        case 9366: return 'STP 3.0-3AV-40'; break;
        case 9401: return 'SB 3.0-1AV-41'; break;
        case 9402: return 'SB 3.6-1AV-41'; break;
        case 9403: return 'SB 4.0-1AV-41'; break;
        case 9404: return 'SB 5.0-1AV-41'; break;
        case 9405: return 'SB 6.0-1AV-41'; break;
        case 9406: return 'SHP 100-20'; break;
        case 9407: return 'SHP 150-20'; break;
        case 9408: return 'SHP 125-US-20'; break;
        case 9409: return 'SHP 150-US-20'; break;

    default: return `UNKNOWN (${typeId})`; break;
  }
}
