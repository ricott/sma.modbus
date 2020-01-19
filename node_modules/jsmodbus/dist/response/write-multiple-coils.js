"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../codes/index.js");
const write_response_body_js_1 = __importDefault(require("./write-response.body.js"));
class WriteMultipleCoilsResponseBody extends write_response_body_js_1.default {
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
        return new WriteMultipleCoilsResponseBody(start, quantity);
    }
    static fromBuffer(buffer) {
        const fc = buffer.readUInt8(0);
        const start = buffer.readUInt16BE(1);
        const quantity = buffer.readUInt16BE(3);
        if (fc !== index_js_1.FC.WRITE_MULTIPLE_COILS) {
            return null;
        }
        return new WriteMultipleCoilsResponseBody(start, quantity);
    }
    constructor(start, quantity) {
        super(index_js_1.FC.WRITE_MULTIPLE_COILS);
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
exports.default = WriteMultipleCoilsResponseBody;
