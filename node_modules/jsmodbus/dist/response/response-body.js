"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const codes_1 = require("../codes");
class ModbusBaseResponseBody {
    get fc() {
        return this._fc;
    }
    get isException() {
        return false;
    }
    static fromRequest(requestBody, buf) {
        throw new TypeError('Cannot call from request from abstract class');
    }
    constructor(fc, ignoreInvalidFunctionCode = false) {
        if (ignoreInvalidFunctionCode === false) {
            if (!codes_1.isFunctionCode(fc)) {
                throw Error('InvalidFunctionCode');
            }
        }
        this._fc = fc;
    }
}
exports.default = ModbusBaseResponseBody;
