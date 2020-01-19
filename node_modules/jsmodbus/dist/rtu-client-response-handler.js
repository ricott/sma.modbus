"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('rtu-response-handler');
const client_response_handler_js_1 = __importDefault(require("./client-response-handler.js"));
const rtu_response_js_1 = __importDefault(require("./rtu-response.js"));
class ModbusRTUClientResponseHandler extends client_response_handler_js_1.default {
    constructor() {
        super();
        this._messages = [];
    }
    handleData(data) {
        debug('receiving new data');
        this._buffer = Buffer.concat([this._buffer, data]);
        debug('buffer', this._buffer);
        do {
            const response = rtu_response_js_1.default.fromBuffer(this._buffer);
            if (!response) {
                debug('not enough data available to parse');
                return;
            }
            debug('crc', response.crc);
            debug('reset buffer from', this._buffer.length, 'to', (this._buffer.length - response.byteCount));
            this._buffer = this._buffer.slice(response.byteCount);
            this._messages.push(response);
        } while (1);
    }
    shift() {
        return this._messages.shift();
    }
}
exports.default = ModbusRTUClientResponseHandler;
