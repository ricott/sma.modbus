"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../codes/index.js");
const request_body_js_1 = __importDefault(require("./request-body.js"));
class ReadCoilsRequestBody extends request_body_js_1.default {
    get start() {
        return this._start;
    }
    get count() {
        return this._count;
    }
    get name() {
        return 'ReadCoils';
    }
    get byteCount() {
        return 5;
    }
    static fromBuffer(buffer) {
        try {
            const fc = buffer.readUInt8(0);
            if (fc !== index_js_1.FC.READ_COIL) {
                return null;
            }
            const start = buffer.readUInt16BE(1);
            const quantity = buffer.readUInt16BE(3);
            return new ReadCoilsRequestBody(start, quantity);
        }
        catch (e) {
            return null;
        }
    }
    constructor(start, count) {
        super(index_js_1.FC.READ_COIL);
        this._start = start;
        this._count = count;
        if (this._start > 0xFFFF) {
            throw new Error('InvalidStartAddress');
        }
        if (this._count > 0x7D0) {
            throw new Error('InvalidQuantity');
        }
    }
    createPayload() {
        const payload = Buffer.alloc(5);
        payload.writeUInt8(this._fc, 0);
        payload.writeUInt16BE(this._start, 1);
        payload.writeUInt16BE(this._count, 3);
        return payload;
    }
}
exports.default = ReadCoilsRequestBody;
function isReadCoilsRequestBody(x) {
    if (x instanceof ReadCoilsRequestBody) {
        return true;
    }
    else {
        return false;
    }
}
exports.isReadCoilsRequestBody = isReadCoilsRequestBody;
