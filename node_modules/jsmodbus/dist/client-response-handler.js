"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ModbusClientResponseHandler {
    constructor() {
        this._buffer = Buffer.alloc(0);
    }
    shift() {
        return this._messages.shift();
    }
}
exports.default = ModbusClientResponseHandler;
