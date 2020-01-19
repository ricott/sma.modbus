"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../codes/index.js");
const write_response_body_js_1 = __importDefault(require("./write-response.body.js"));
class WriteSingleCoilResponseBody extends write_response_body_js_1.default {
    get address() {
        return this._address;
    }
    get value() {
        return this._value === 0xff00;
    }
    get byteCount() {
        return 5;
    }
    static fromRequest(requestBody) {
        const address = requestBody.address;
        const value = requestBody.value;
        return new WriteSingleCoilResponseBody(address, value);
    }
    static fromBuffer(buffer) {
        const fc = buffer.readUInt8(0);
        const address = buffer.readUInt16BE(1);
        const value = buffer.readUInt16BE(3) === 0xFF00;
        if (fc !== index_js_1.FC.WRITE_SINGLE_COIL) {
            return null;
        }
        return new WriteSingleCoilResponseBody(address, value);
    }
    constructor(address, value) {
        super(index_js_1.FC.WRITE_SINGLE_COIL);
        this._address = address;
        this._value = value === 0xFF00 ? 0xFF00 : 0x0000;
    }
    createPayload() {
        const payload = Buffer.alloc(this.byteCount);
        payload.writeUInt8(this._fc, 0);
        payload.writeUInt16BE(this._address, 1);
        payload.writeUInt16BE(this._value, 3);
        return payload;
    }
}
exports.default = WriteSingleCoilResponseBody;
