"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('request-body');
class ModbusRequestBody {
    constructor(fc) {
        if (new.target === ModbusRequestBody) {
            throw new TypeError('Cannot construct ModbusRequestBody directly.');
        }
        this._fc = fc;
    }
    get fc() {
        return this._fc;
    }
    get isException() {
        return false;
    }
    get isModbusRequestBody() {
        return true;
    }
}
exports.default = ModbusRequestBody;
function isModbusRequestBody(x) {
    if (x.isModbusRequestBody) {
        return true;
    }
    else {
        return false;
    }
}
exports.isModbusRequestBody = isModbusRequestBody;
