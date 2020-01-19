"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const codes_1 = require("../codes");
const request_body_js_1 = __importDefault(require("./request-body.js"));
class ReadInputRegistersRequestBody extends request_body_js_1.default {
    get start() {
        return this._start;
    }
    get count() {
        return this._count;
    }
    get name() {
        return 'ReadInputRegisters';
    }
    get byteCount() {
        return 5;
    }
    static fromBuffer(buffer) {
        try {
            const fc = buffer.readUInt8(0);
            const start = buffer.readUInt16BE(1);
            const count = buffer.readUInt16BE(3);
            if (fc !== codes_1.FC.READ_INPUT_REGISTERS) {
                return null;
            }
            return new ReadInputRegistersRequestBody(start, count);
        }
        catch (e) {
            return null;
        }
    }
    constructor(start, count) {
        super(codes_1.FC.READ_INPUT_REGISTERS);
        if (start > 0xFFFF) {
            throw new Error('InvalidStartAddress');
        }
        if (count > 0x7D0) {
            throw new Error('InvalidQuantity');
        }
        this._start = start;
        this._count = count;
    }
    createPayload() {
        const payload = Buffer.alloc(5);
        payload.writeUInt8(this._fc, 0);
        payload.writeUInt16BE(this._start, 1);
        payload.writeUInt16BE(this._count, 3);
        return payload;
    }
}
exports.default = ReadInputRegistersRequestBody;
function isReadInputRegistersRequestBody(x) {
    if (x instanceof ReadInputRegistersRequestBody) {
        return true;
    }
    else {
        return false;
    }
}
exports.isReadInputRegistersRequestBody = isReadInputRegistersRequestBody;
