"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessages = {
    0x01: 'ILLEGAL FUNCTION',
    0x02: 'ILLEGAL DATA ADDRESS',
    0x03: 'ILLEGAL DATA VALUE',
    0x04: 'SLAVE DEVICE FAILURE',
    0x05: 'ACKNOWLEDGE',
    0x06: 'SLAVE DEVICE BUSY',
    0x08: 'MEMORY PARITY ERROR',
    0x0A: 'GATEWAY PATH UNAVAILABLE',
    0x0B: 'GATEWAY TARGET DEVICE FAILED TO RESPOND'
};
function errorCodeToMessage(x) {
    if (isErrorCode(x)) {
        return exports.ErrorMessages[x];
    }
    else {
        throw new Error('');
    }
}
exports.errorCodeToMessage = errorCodeToMessage;
function isErrorCode(x) {
    switch (x) {
        case 0x01:
        case 0x02:
        case 0x03:
        case 0x04:
        case 0x05:
        case 0x06:
        case 0x08:
        case 0x0A:
        case 0x0B:
            return true;
        default:
            return false;
    }
}
exports.isErrorCode = isErrorCode;
