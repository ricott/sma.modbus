"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const buffer_utils_js_1 = __importDefault(require("../buffer-utils.js"));
const index_js_1 = require("../codes/index.js");
const read_response_body_js_1 = __importDefault(require("./read-response-body.js"));
const { bufferToArrayStatus, arrayStatusToBuffer } = buffer_utils_js_1.default;
class ReadDiscreteInputsResponseBody extends read_response_body_js_1.default {
    get discrete() {
        return this._discrete;
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
    static fromRequest(requestBody, discreteInputs) {
        const discreteStatus = bufferToArrayStatus(discreteInputs);
        const start = requestBody.start;
        const end = start + requestBody.count;
        const segmentStatus = discreteStatus.slice(start, end);
        return new ReadDiscreteInputsResponseBody(segmentStatus, Math.ceil(segmentStatus.length / 8));
    }
    static fromBuffer(buffer) {
        try {
            const fc = buffer.readUInt8(0);
            const byteCount = buffer.readUInt8(1);
            const coilStatus = buffer.slice(2, 2 + byteCount);
            if (coilStatus.length !== byteCount) {
                return null;
            }
            if (fc !== index_js_1.FC.READ_DISCRETE_INPUT) {
                return null;
            }
            return new ReadDiscreteInputsResponseBody(coilStatus, byteCount);
        }
        catch (e) {
            return null;
        }
    }
    constructor(discrete, numberOfBytes) {
        super(index_js_1.FC.READ_DISCRETE_INPUT);
        this._discrete = discrete;
        this._numberOfBytes = numberOfBytes;
        if (discrete instanceof Array) {
            this._valuesAsArray = discrete;
            this._valuesAsBuffer = arrayStatusToBuffer(discrete);
        }
        else if (discrete instanceof Buffer) {
            this._valuesAsBuffer = discrete;
            this._valuesAsArray = bufferToArrayStatus(discrete);
        }
        else {
            throw new Error('InvalidType_MustBeBufferOrArray');
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
exports.default = ReadDiscreteInputsResponseBody;
