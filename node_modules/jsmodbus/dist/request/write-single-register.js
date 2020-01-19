"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const codes_1 = require("../codes");
const request_body_js_1 = __importDefault(require("./request-body.js"));
class WriteSingleRegisterRequestBody extends request_body_js_1.default {
    get address() {
        return this._address;
    }
    get value() {
        return this._value;
    }
    get name() {
        return 'WriteSingleRegister';
    }
    get quantity() {
        return 1;
    }
    get count() {
        return 1;
    }
    get byteCount() {
        return 5;
    }
    static fromBuffer(buffer) {
        try {
            const fc = buffer.readUInt8(0);
            const address = buffer.readUInt16BE(1);
            const value = buffer.readUInt16BE(3);
            if (fc !== codes_1.FC.WRITE_SINGLE_HOLDING_REGISTER) {
                return null;
            }
            return new WriteSingleRegisterRequestBody(address, value);
        }
        catch (e) {
            return null;
        }
    }
    constructor(address, value) {
        super(codes_1.FC.WRITE_SINGLE_HOLDING_REGISTER);
        if (address > 0xFFFF) {
            throw new Error('InvalidStartAddress');
        }
        if (!Number.isInteger(value) || value < 0 || value > 0xFFFF) {
            throw new Error('InvalidValue');
        }
        this._address = address;
        this._value = value;
    }
    createPayload() {
        const payload = Buffer.alloc(5);
        payload.writeUInt8(this._fc, 0);
        payload.writeUInt16BE(this._address, 1);
        payload.writeUInt16BE(this._value, 3);
        return payload;
    }
}
exports.default = WriteSingleRegisterRequestBody;
function isWriteSingleRegisterRequestBody(x) {
    if (x instanceof WriteSingleRegisterRequestBody) {
        return true;
    }
    else {
        return false;
    }
}
exports.isWriteSingleRegisterRequestBody = isWriteSingleRegisterRequestBody;
