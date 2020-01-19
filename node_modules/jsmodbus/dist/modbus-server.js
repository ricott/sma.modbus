"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const DEFAULT_MODBUS_SERVER_OPTIONS = {
    coils: Buffer.alloc(1024),
    discrete: Buffer.alloc(1024),
    holding: Buffer.alloc(1024),
    input: Buffer.alloc(1024)
};
class ModbusServer extends events_1.EventEmitter {
    get _coils() {
        return this._options.coils;
    }
    get _discrete() {
        return this._options.discrete;
    }
    get _holding() {
        return this._options.holding;
    }
    get _input() {
        return this._options.input;
    }
    constructor(options = DEFAULT_MODBUS_SERVER_OPTIONS) {
        super();
        this._options = Object.assign({}, DEFAULT_MODBUS_SERVER_OPTIONS, options);
    }
    get coils() {
        return this._coils;
    }
    get discrete() {
        return this._discrete;
    }
    get holding() {
        return this._holding;
    }
    get input() {
        return this._input;
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
}
exports.default = ModbusServer;
