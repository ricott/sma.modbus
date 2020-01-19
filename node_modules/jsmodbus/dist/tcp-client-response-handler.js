"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('tcp-response-handler');
const client_response_handler_js_1 = __importDefault(require("./client-response-handler.js"));
const tcp_response_js_1 = __importDefault(require("./tcp-response.js"));
class ModbusTCPClientResponseHandler extends client_response_handler_js_1.default {
    constructor() {
        super();
        this._buffer = Buffer.alloc(0);
        this._messages = [];
    }
    handleData(data) {
        debug('receiving new data', data);
        this._buffer = Buffer.concat([this._buffer, data]);
        debug('buffer', this._buffer);
        do {
            const response = tcp_response_js_1.default.fromBuffer(this._buffer);
            if (!response) {
                debug('not enough data available to parse');
                return;
            }
            debug('response id', response.id, 'protocol', response.protocol, 'length', response.bodyLength, 'unit', response.unitId);
            debug('reset buffer from', this._buffer.length, 'to', (this._buffer.length - response.byteCount));
            this._messages.push(response);
            this._buffer = this._buffer.slice(response.byteCount);
        } while (1);
    }
}
exports.default = ModbusTCPClientResponseHandler;
