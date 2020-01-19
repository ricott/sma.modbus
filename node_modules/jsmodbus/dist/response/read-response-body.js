"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const response_body_1 = __importDefault(require("./response-body"));
class ModbusReadResponseBody extends response_body_1.default {
    constructor(fc) {
        super(fc);
    }
    get fc() {
        return this._fc;
    }
}
exports.default = ModbusReadResponseBody;
