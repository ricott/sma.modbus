"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const codes_1 = require("../codes");
const write_response_body_1 = __importDefault(require("./write-response.body"));
class WriteMultipleRegistersResponseBody extends write_response_body_1.default {
    get start() {
        return this._start;
    }
    get quantity() {
        return this._quantity;
    }
    get count() {
        return this.quantity;
    }
    get byteCount() {
        return 5;
    }
    static fromRequest(requestBody) {
        const start = requestBody.address;
        const quantity = requestBody.quantity;
        return new WriteMultipleRegistersResponseBody(start, quantity);
    }
    static fromBuffer(buffer) {
        const fc = buffer.readUInt8(0);
        const start = buffer.readUInt16BE(1);
        const quantity = buffer.readUInt16BE(3);
        if (fc !== codes_1.FC.WRITE_MULTIPLE_HOLDING_REGISTERS) {
            return null;
        }
        return new WriteMultipleRegistersResponseBody(start, quantity);
    }
    constructor(start, quantity) {
        super(codes_1.FC.WRITE_MULTIPLE_HOLDING_REGISTERS);
        this._start = start;
        this._quantity = quantity;
    }
    createPayload() {
        const payload = Buffer.alloc(this.byteCount);
        payload.writeUInt8(this._fc, 0);
        payload.writeUInt16BE(this._start, 1);
        payload.writeUInt16BE(this._quantity, 3);
        return payload;
    }
}
exports.default = WriteMultipleRegistersResponseBody;
