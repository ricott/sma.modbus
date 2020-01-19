"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const codes_1 = require("../codes");
const request_body_js_1 = __importDefault(require("./request-body.js"));
class ReadDiscreteInputsRequestBody extends request_body_js_1.default {
    get start() {
        return this._start;
    }
    get count() {
        return this._count;
    }
    get name() {
        return 'ReadDiscreteInput';
    }
    get byteCount() {
        return 5;
    }
    static fromBuffer(buffer) {
        try {
            const fc = buffer.readUInt8(0);
            if (fc !== codes_1.FC.READ_DISCRETE_INPUT) {
                return null;
            }
            const start = buffer.readUInt16BE(1);
            const quantity = buffer.readUInt16BE(3);
            return new ReadDiscreteInputsRequestBody(start, quantity);
        }
        catch (e) {
            return null;
        }
    }
    constructor(start, count) {
        super(codes_1.FC.READ_DISCRETE_INPUT);
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
exports.default = ReadDiscreteInputsRequestBody;
function isReadDiscreteInputsRequestBody(x) {
    if (x instanceof ReadDiscreteInputsRequestBody) {
        return true;
    }
    else {
        return false;
    }
}
exports.isReadDiscreteInputsRequestBody = isReadDiscreteInputsRequestBody;
