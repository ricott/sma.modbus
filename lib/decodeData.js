'use strict';


exports.decodeSoftwareVersion = function (valueArr) {
  let buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(valueArr[0], 0);
  let majorVersion = (buf[2] & 0xF) + ((buf[2] & 0xF0) >> 4)*10;
  let minorVersion = (buf[3] & 0xF) + ((buf[3] & 0xF0) >> 4)*10;
  buf.writeUInt32BE(valueArr[1], 0);
  let buildVersion = buf[2];
  let releaseType = decodeReleaseType(buf[3]);

  return majorVersion + '.' + pad(minorVersion, 2) + '.' + pad(buildVersion, 2) + '.' + releaseType;
}

exports.decodeDeviceType = function (typeId) {
  return decodeDevice(typeId);
}

exports.decodeSerialNumber = function (valueArr) {
  return uint16ToUint32(valueArr[1], valueArr[0]);
}

exports.decodeCondition = function (valueArr) {
  return decodeConditionType(uint16ToUint32(valueArr[1], valueArr[0]));
}

exports.decodeStatus = function (valueArr) {
  return decodeOperatingStatus(uint16ToUint32(valueArr[1], valueArr[0]));
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

function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length-size);
}

function decodeOperatingStatus(numType) {
  switch (numType) {
    case 295: return 'MPP'; break;
    case 381: return 'Stop'; break;
    case 443: return 'Constant voltage'; break;
    case 1392: return 'Fault'; break;
    case 1393: return 'Waiting for PV voltage'; break;
    case 1469: return 'Shut down'; break;
    case 1480: return 'Waiting for utilities company'; break;
    case 1855: return 'Stand-alone operation'; break;
    case 2119: return 'Derating'; break;
    default: return 'UNKNOWN'; break;
  }
}

function decodeConditionType(numType) {
  switch (numType) {
    case 35: return 'Fault'; break;
    case 303: return 'Off'; break;
    case 307: return 'Ok'; break;
    case 455: return 'Warning'; break;
    default: return 'UNKNOWN'; break;
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

function decodeDevice(typeId) {
  switch (typeId) {
    case 9225: return 'SB 5000SE-10'; break;
    case 9226: return 'SB 3600SE-10'; break;
    case 9074: return 'SB 3000TL-21'; break;
    case 9165: return 'SB 3600TL-21'; break;
    case 9075: return 'SB 4000TL-21'; break;
    case 9076: return 'SB 5000TL-21'; break;
    case 9184: return 'SB 2500TLST-21'; break;
    case 9185: return 'SB 3000TLST-21'; break;
    case 9162: return 'SB 3500TL-JP-22'; break;
    case 9164: return 'SB 4500TL-JP-22'; break;
    case 9198: return 'SB 3000TL-US-22'; break;
    case 9199: return 'SB 3800TL-US-22'; break;
    case 9200: return 'SB 4000TL-US-22'; break;
    case 9201: return 'SB 5000TL-US-22'; break;
    case 9274: return 'SB 6000TL-US-22'; break;
    case 9275: return 'SB 7000TL-US-22'; break;
    case 9293: return 'SB 7700TL-US-22'; break;
    case 9301: return 'SB1.5-1VL-40'; break;
    case 9302: return 'SB2.5-1VL-40'; break;
    case 9326: return 'SBS2.5-1VL-40'; break;
    case 9101: return 'STP 8000TL-10'; break;
    case 9067: return 'STP 10000TL-10'; break;
    case 9068: return 'STP 12000TL-10'; break;
    case 9069: return 'STP 15000TL-10'; break;
    case 9070: return 'STP 17000TL-10'; break;
    case 9182: return 'STP 15000TLEE-10'; break;
    case 9181: return 'STP 20000TLEE-10'; break;
    case 9222: return 'STP 10000TLEE-JP-10'; break;
    case 9194: return 'STP 12000TL-US-10'; break;
    case 9195: return 'STP 15000TL-US-10'; break;
    case 9196: return 'STP 20000TL-US-10'; break;
    case 9197: return 'STP 24000TL-US-10'; break;
    case 9310: return 'STP 30000TL-US-10'; break;
    case 9271: return 'STP 20000TLEE-JP-11'; break;
    case 9272: return 'STP 10000TLEE-JP-11'; break;
    case 9098: return 'STP 5000TL-20'; break;
    case 9099: return 'STP 6000TL-20'; break;
    case 9100: return 'STP 7000TL-20'; break;
    case 9103: return 'STP 8000TL-20'; break;
    case 9102: return 'STP 9000TL-20'; break;
    case 9281: return 'STP 10000TL-20'; break;
    case 9282: return 'STP 11000TL-20'; break;
    case 9283: return 'STP 12000TL-20'; break;
    case 9336: return 'STP 15000TL-30'; break;
    case 9284: return 'STP 20000TL-30'; break;
    case 9285: return 'STP 25000TL-30'; break;
    case 9354: return 'STP 24500TL-JP-30'; break;
    case 9311: return 'STP 25000TL-JP-30'; break;
    case 9278: return 'SI3.0M-11'; break;
    case 9279: return 'SI4.4M-11'; break;
    case 9223: return 'SI6.0H-11'; break;
    case 9224: return 'SI8.0H-11'; break;
    case 9332: return 'SI4.4M-12'; break;
    case 9333: return 'SI6.0H-12'; break;
    case 9334: return 'SI8.0H-12'; break;
  default:
    return 'UNKNOWN';
    break;
  }
}
