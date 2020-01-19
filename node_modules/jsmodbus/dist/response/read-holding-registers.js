"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('ReadHoldingRegistersResponseBody');
const codes_1 = require("../codes");
const read_response_body_js_1 = __importDefault(require("./read-response-body.js"));
class ReadHoldingRegistersResponseBody extends read_response_body_js_1.default {
    get byteCount() {
        return this._bufferLength;
    }
    get values() {
        return this._values;
    }
    get valuesAsArray() {
        return this._valuesAsArray;
    }
    get valuesAsBuffer() {
        return this._valuesAsBuffer;
    }
    get length() {
        return this._values.length;
    }
    static fromRequest(requestBody, holdingRegisters) {
        const startByte = requestBody.start * 2;
        const endByte = (requestBody.start * 2) + (requestBody.count * 2);
        const bufferSegment = holdingRegisters.slice(startByte, endByte);
        return new ReadHoldingRegistersResponseBody(bufferSegment.length, bufferSegment);
    }
    static fromBuffer(buffer) {
        const fc = buffer.readUInt8(0);
        const byteCount = buffer.readUInt8(1);
        const payload = buffer.slice(2, 2 + byteCount);
        if (fc !== codes_1.FC.READ_HOLDING_REGISTERS) {
            return null;
        }
        const values = [];
        for (let i = 0; i < byteCount; i += 2) {
            values.push(payload.readUInt16BE(i));
        }
        return new ReadHoldingRegistersResponseBody(byteCount, values, payload);
    }
    constructor(byteCount, values, payload) {
        super(codes_1.FC.READ_HOLDING_REGISTERS);
        this._byteCount = byteCount;
        this._values = values;
        this._bufferLength = 2;
        debug('ReadHoldingRegistersResponseBody values', values);
        if (values instanceof Array) {
            this._valuesAsArray = values;
            this._valuesAsBuffer = Buffer.from(values);
            this._bufferLength += values.length * 2;
        }
        else if (values instanceof Buffer) {
            this._valuesAsArray = Uint16Array.from(values);
            this._valuesAsBuffer = values;
            this._bufferLength += values.length;
        }
        else {
            throw new Error('InvalidType_MustBeBufferOrArray');
        }
        if (payload instanceof Buffer) {
            this._valuesAsBuffer = payload;
        }
    }
    createPayload() {
        if (this._values instanceof Buffer) {
            let payload = Buffer.alloc(2);
            payload.writeUInt8(this._fc, 0);
            payload.writeUInt8(this._byteCount, 1);
            payload = Buffer.concat([payload, this._values]);
            return payload;
        }
        if (this._values instanceof Array) {
            const payload = Buffer.alloc(this._byteCount + 2);
            payload.writeUInt8(this._fc, 0);
            payload.writeUInt8(this._byteCount, 1);
            this._values.forEach((value, i) => {
                payload.writeUInt16BE(Math.max(0, Math.min(0xFFFF, value)), 2 * i + 2);
            });
            return payload;
        }
        throw new Error('InvalidType_MustBeBufferOrArray');
    }
}
exports.default = ReadHoldingRegistersResponseBody;
