"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rtu_request_1 = __importDefault(require("./rtu-request"));
const Debug = require("debug");
const debug = Debug('modbus-server-request-handler');
class ModbusServerRequestHandler {
    constructor(fromBufferMethod) {
        this._fromBuffer = fromBufferMethod;
        this._requests = [];
        this._buffer = Buffer.alloc(0);
    }
    shift() {
        return this._requests.shift();
    }
    handle(data) {
        this._buffer = Buffer.concat([this._buffer, data]);
        debug('this._buffer', this._buffer);
        do {
            const request = this._fromBuffer(this._buffer);
            debug('request', request);
            if (!request) {
                return;
            }
            if (request instanceof rtu_request_1.default && request.corrupted) {
                const corruptDataDump = this._buffer.slice(0, request.byteCount).toString('hex');
                debug(`request message was corrupt: ${corruptDataDump}`);
            }
            else {
                this._requests.unshift(request);
            }
            this._buffer = this._buffer.slice(request.byteCount);
        } while (1);
    }
}
exports.default = ModbusServerRequestHandler;
