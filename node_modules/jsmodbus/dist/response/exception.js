"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const codes_1 = require("../codes");
const response_body_js_1 = __importDefault(require("./response-body.js"));
class ExceptionResponseBody extends response_body_js_1.default {
    get code() {
        return this._code;
    }
    get message() {
        return codes_1.errorCodeToMessage(this._code);
    }
    get byteCount() {
        return 2;
    }
    get isException() {
        return true;
    }
    static fromBuffer(buffer) {
        const fc = buffer.readUInt8(0) - 0x80;
        const code = buffer.readUInt8(1);
        if (!codes_1.isFunctionCode(fc)) {
            throw Error('InvalidFunctionCode');
        }
        return new ExceptionResponseBody(fc, code);
    }
    static fromRequest(requestBody) {
        return new ExceptionResponseBody(requestBody.fc, requestBody.code);
    }
    constructor(fc, code) {
        const ignoreInvalidFunctionCode = true;
        super(fc, ignoreInvalidFunctionCode);
        this._code = code;
    }
    createPayload() {
        const payload = Buffer.alloc(2);
        payload.writeUInt8(this._fc + 0x80, 0);
        payload.writeUInt8(this._code, 1);
        return payload;
    }
}
exports.default = ExceptionResponseBody;
function isExceptionResponseBody(x) {
    if (x instanceof ExceptionResponseBody) {
        return true;
    }
    else {
        return false;
    }
}
exports.isExceptionResponseBody = isExceptionResponseBody;
