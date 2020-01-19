"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const codes_1 = require("../codes");
const request_body_js_1 = __importDefault(require("./request-body.js"));
class WriteMultipleRegistersRequestBody extends request_body_js_1.default {
    get address() {
        return this._address;
    }
    get quantity() {
        return this._quantity;
    }
    get count() {
        return this.quantity;
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
    get byteCount() {
        return this._byteCount;
    }
    get numberOfBytes() {
        return this._numberOfBytes;
    }
    get name() {
        return 'WriteMultipleRegisters';
    }
    static fromBuffer(buffer) {
        try {
            const fc = buffer.readUInt8(0);
            const address = buffer.readUInt16BE(1);
            const numberOfBytes = buffer.readUInt8(5);
            const values = buffer.slice(6, 6 + numberOfBytes);
            if (fc !== codes_1.FC.WRITE_MULTIPLE_HOLDING_REGISTERS) {
                return null;
            }
            return new WriteMultipleRegistersRequestBody(address, values);
        }
        catch (e) {
            return null;
        }
    }
    constructor(address, values) {
        super(codes_1.FC.WRITE_MULTIPLE_HOLDING_REGISTERS);
        if (address > 0xFFFF) {
            throw new Error('InvalidStartAddress');
        }
        if (Array.isArray(values) && values.length > 0x7b) {
            throw new Error('InvalidArraySize');
        }
        if (values instanceof Buffer && values.length > 0x7b * 2) {
            throw new Error('InvalidBufferSize');
        }
        this._address = address;
        this._values = values;
        if (this._values instanceof Buffer) {
            this._byteCount = Math.min(this._values.length + 6, 0xF6);
            this._numberOfBytes = this._values.length;
            this._quantity = Math.floor(this._values.length / 2);
            this._valuesAsBuffer = this._values;
            this._valuesAsArray = [];
            for (let i = 0; i < this._values.length; i += 2) {
                this._valuesAsArray.push(this._values.readUInt16BE(i));
            }
        }
        else if (this._values instanceof Array) {
            this._valuesAsArray = this._values;
            this._byteCount = Math.min(this._values.length * 2 + 6, 0xF6);
            this._numberOfBytes = Math.floor(this._values.length * 2);
            this._quantity = this._values.length;
            this._valuesAsBuffer = Buffer.alloc(this._numberOfBytes);
            this._values.forEach((v, i) => {
                this._valuesAsBuffer.writeUInt16BE(v, i * 2);
            });
        }
        else {
            throw new Error('InvalidType_MustBeBufferOrArray');
        }
    }
    createPayload() {
        const payload = Buffer.alloc(6 + this._numberOfBytes);
        payload.writeUInt8(this._fc, 0);
        payload.writeUInt16BE(this._address, 1);
        payload.writeUInt16BE(this._quantity, 3);
        payload.writeUInt8(this._numberOfBytes, 5);
        this._valuesAsBuffer.copy(payload, 6);
        return payload;
    }
}
exports.default = WriteMultipleRegistersRequestBody;
function isWriteMultipleRegistersRequestBody(x) {
    if (x instanceof WriteMultipleRegistersRequestBody) {
        return true;
    }
    else {
        return false;
    }
}
exports.isWriteMultipleRegistersRequestBody = isWriteMultipleRegistersRequestBody;
