"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('read-coils-response');
const buffer_utils_js_1 = __importDefault(require("../buffer-utils.js"));
const codes_1 = require("../codes");
const read_response_body_js_1 = __importDefault(require("./read-response-body.js"));
const { bufferToArrayStatus, arrayStatusToBuffer } = buffer_utils_js_1.default;
class ReadCoilsResponseBody extends read_response_body_js_1.default {
    get values() {
        return this._coils;
    }
    get valuesAsArray() {
        return this._valuesAsArray;
    }
    get valuesAsBuffer() {
        return this._valuesAsBuffer;
    }
    get numberOfBytes() {
        return this._numberOfBytes;
    }
    get byteCount() {
        return this._numberOfBytes + 2;
    }
    static fromRequest(requestBody, coils) {
        const coilsStatus = bufferToArrayStatus(coils);
        const start = requestBody.start;
        const end = start + requestBody.count;
        const coilsSegment = coilsStatus.slice(start, end);
        return new ReadCoilsResponseBody(coilsSegment, Math.ceil(coilsSegment.length / 8));
    }
    static fromBuffer(buffer) {
        try {
            const fc = buffer.readUInt8(0);
            const byteCount = buffer.readUInt8(1);
            const coilStatus = buffer.slice(2, 2 + byteCount);
            if (coilStatus.length !== byteCount) {
                return null;
            }
            if (fc !== codes_1.FC.READ_COIL) {
                return null;
            }
            return new ReadCoilsResponseBody(coilStatus, byteCount);
        }
        catch (e) {
            debug('no valid read coils response body in the buffer yet');
            return null;
        }
    }
    constructor(coils, numberOfBytes) {
        super(codes_1.FC.READ_COIL);
        this._coils = coils;
        this._numberOfBytes = numberOfBytes;
        if (coils instanceof Array) {
            this._valuesAsArray = coils;
            this._valuesAsBuffer = arrayStatusToBuffer(coils);
        }
        else if (coils instanceof Buffer) {
            this._valuesAsBuffer = coils;
            this._valuesAsArray = bufferToArrayStatus(coils);
        }
        else {
            throw new Error('InvalidCoilsInput');
        }
    }
    createPayload() {
        const payload = Buffer.alloc(this.byteCount);
        payload.writeUInt8(this._fc, 0);
        payload.writeUInt8(this._numberOfBytes, 1);
        this._valuesAsBuffer.copy(payload, 2);
        return payload;
    }
}
exports.default = ReadCoilsResponseBody;
