"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ModbusAbstractResponse {
    get body() {
        return this._body;
    }
    static fromRequest(request, body) {
        throw new TypeError('Cannot call fromRequest directly from abstract class');
    }
}
exports.default = ModbusAbstractResponse;
