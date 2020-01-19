"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../codes/index.js");
const request_body_js_1 = __importDefault(require("./request-body.js"));
class WriteSingleCoilRequestBody extends request_body_js_1.default {
    get address() {
        return this._address;
    }
    get value() {
        return this._value ? 0xFF00 : 0x0000;
    }
    get byteCount() {
        return 5;
    }
    get count() {
        return 1;
    }
    get name() {
        return 'WriteSingleCoil';
    }
    static fromBuffer(buffer) {
        try {
            const fc = buffer.readUInt8(0);
            const address = buffer.readUInt16BE(1);
            const value = buffer.readUInt16BE(3) === 0xff00;
            if (fc !== index_js_1.FC.WRITE_SINGLE_COIL) {
                return null;
            }
            return new WriteSingleCoilRequestBody(address, value);
        }
        catch (e) {
            return null;
        }
    }
    constructor(address, value) {
        super(index_js_1.FC.WRITE_SINGLE_COIL);
        if (address > 0xFFFF) {
            throw new Error('InvalidStartAddress');
        }
        this._address = address;
        this._value = value;
    }
    createPayload() {
        const payload = Buffer.alloc(5);
        payload.writeUInt8(this._fc, 0);
        payload.writeUInt16BE(this._address, 1);
        payload.writeUInt16BE(this._value ? 0xFF00 : 0x0000, 3);
        return payload;
    }
}
exports.default = WriteSingleCoilRequestBody;
function isWriteSingleCoilRequestBody(x) {
    if (x instanceof WriteSingleCoilRequestBody) {
        return true;
    }
    else {
        return false;
    }
}
exports.isWriteSingleCoilRequestBody = isWriteSingleCoilRequestBody;
