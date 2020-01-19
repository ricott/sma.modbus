"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../codes/index.js");
const write_response_body_js_1 = __importDefault(require("./write-response.body.js"));
class WriteSingleRegisterResponseBody extends write_response_body_js_1.default {
    get address() {
        return this._address;
    }
    get value() {
        return this._value;
    }
    get byteCount() {
        return 5;
    }
    static fromRequest(requestBody) {
        const address = requestBody.address;
        const value = requestBody.value;
        return new WriteSingleRegisterResponseBody(address, value);
    }
    static fromBuffer(buffer) {
        const fc = buffer.readUInt8(0);
        const address = buffer.readUInt16BE(1);
        const value = buffer.readUInt16BE(3);
        if (fc !== index_js_1.FC.WRITE_SINGLE_HOLDING_REGISTER) {
            return null;
        }
        return new WriteSingleRegisterResponseBody(address, value);
    }
    constructor(address, value) {
        super(index_js_1.FC.WRITE_SINGLE_HOLDING_REGISTER);
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
exports.default = WriteSingleRegisterResponseBody;
