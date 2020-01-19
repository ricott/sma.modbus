"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ModbusAbstractRequest {
}
ModbusAbstractRequest.fromBuffer = (buffer) => {
    throw new TypeError('Cannot call from buffer from base abstract class');
};
exports.default = ModbusAbstractRequest;
function isModbusRequest(x) {
    if (x.body !== undefined) {
        return true;
    }
    else {
        return false;
    }
}
exports.isModbusRequest = isModbusRequest;
