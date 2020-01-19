"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const codes_1 = require("../codes");
const request_body_js_1 = __importDefault(require("./request-body.js"));
class ExceptionRequestBody extends request_body_js_1.default {
    get code() {
        return this._code;
    }
    get name() {
        return 'ExceptionRequest';
    }
    get count() {
        return 0;
    }
    get byteCount() {
        return 2;
    }
    get isException() {
        return true;
    }
    static fromBuffer(buffer) {
        try {
            const fc = buffer.readUInt8(0);
            if (fc > 0x2B) {
                return null;
            }
            return new ExceptionRequestBody(fc, 0x01);
        }
        catch (e) {
            return null;
        }
    }
    constructor(fc, code) {
        if (!codes_1.isFunctionCode(fc)) {
            throw Error('InvalidFunctionCode');
        }
        super(fc);
        this._code = code;
    }
    createPayload() {
        const payload = Buffer.alloc(2);
        payload.writeUInt8(this._fc, 0);
        payload.writeUInt8(this._code, 1);
        return payload;
    }
}
exports.default = ExceptionRequestBody;
function isExceptionRequestBody(x) {
    if (x instanceof ExceptionRequestBody) {
        return true;
    }
    else {
        return false;
    }
}
exports.isExceptionRequestBody = isExceptionRequestBody;
