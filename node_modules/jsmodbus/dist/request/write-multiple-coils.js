"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const codes_1 = require("../codes");
const request_body_js_1 = __importDefault(require("./request-body.js"));
class WriteMultipleCoilsRequestBody extends request_body_js_1.default {
    get address() {
        return this._address;
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
    get quantity() {
        return this._quantity;
    }
    get count() {
        return this.quantity;
    }
    get byteCount() {
        return this._byteCount;
    }
    get numberOfBytes() {
        return this._numberOfBytes;
    }
    get name() {
        return 'WriteMultipleCoils';
    }
    static fromBuffer(buffer) {
        try {
            const fc = buffer.readUInt8(0);
            if (fc !== codes_1.FC.WRITE_MULTIPLE_COILS) {
                return null;
            }
            const address = buffer.readUInt16BE(1);
            const quantity = buffer.readUInt16BE(3);
            const numberOfBytes = buffer.readUInt8(5);
            const values = buffer.slice(6, 6 + numberOfBytes);
            return new WriteMultipleCoilsRequestBody(address, values, quantity);
        }
        catch (e) {
            return null;
        }
    }
    constructor(address, values, quantity) {
        super(codes_1.FC.WRITE_MULTIPLE_COILS);
        if (address > 0xFFFF) {
            throw new Error('InvalidStartAddress');
        }
        if (Array.isArray(values) && values.length > 0x07b0 * 8) {
            throw new Error('InvalidArraySize');
        }
        if (values instanceof Buffer) {
            if (values.length > 0x07b0) {
                throw new Error('InvalidBufferSize');
            }
            if (quantity !== undefined && (values.length * 8) < quantity) {
                throw new Error('InvalidBufferSize');
            }
        }
        this._address = address;
        this._values = values;
        this._quantity = quantity || values.length;
        this._numberOfBytes = Math.ceil(this._quantity / 8);
        if (this._values instanceof Buffer) {
            this._valuesAsBuffer = this._values;
            this._byteCount = Math.ceil(this._quantity / 8) + 6;
            this._valuesAsArray = [];
            for (let i = 0; i < this._quantity; i += 1) {
                const pos = i % 8;
                const curByteIdx = Math.floor(i / 8);
                const curByte = this._values.readUInt8(curByteIdx);
                this._valuesAsArray.push((curByte & Math.pow(2, pos)) > 0);
            }
        }
        else if (this._values instanceof Array) {
            this._byteCount = Math.ceil(this._values.length / 8) + 6;
            this._valuesAsArray = this._values;
            const len = Math.min(1968, this._values.length);
            let curByte = 0;
            let curByteIdx = 0;
            let cntr = 0;
            const bytes = Buffer.allocUnsafe(this._numberOfBytes);
            for (let i = 0; i < len; i += 1) {
                curByte += this._values[i] ? Math.pow(2, cntr) : 0;
                cntr = (cntr + 1) % 8;
                if (cntr === 0 || i === len - 1) {
                    bytes.writeUInt8(curByte, curByteIdx);
                    curByteIdx = curByteIdx + 1;
                    curByte = 0;
                }
            }
            this._valuesAsBuffer = bytes;
        }
        else {
            throw new Error('InvalidType_MustBeBufferOrArray');
        }
    }
    createPayload() {
        const payload = Buffer.alloc(this._byteCount);
        payload.writeUInt8(this._fc, 0);
        payload.writeUInt16BE(this._address, 1);
        payload.writeUInt16BE(this._quantity, 3);
        payload.writeUInt8(this._numberOfBytes, 5);
        this._valuesAsBuffer.copy(payload, 6, 0, this._byteCount);
        return payload;
    }
}
exports.default = WriteMultipleCoilsRequestBody;
function isWriteMultipleCoilsRequestBody(x) {
    if (x instanceof WriteMultipleCoilsRequestBody) {
        return true;
    }
    else {
        return false;
    }
}
exports.isWriteMultipleCoilsRequestBody = isWriteMultipleCoilsRequestBody;
