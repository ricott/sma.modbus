"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('rtu-client-request-handler');
const crc_1 = __importDefault(require("crc"));
const client_request_handler_js_1 = __importDefault(require("./client-request-handler.js"));
const rtu_request_js_1 = __importDefault(require("./rtu-request.js"));
const user_request_error_1 = require("./user-request-error");
class ModbusRTUClientRequestHandler extends client_request_handler_js_1.default {
    constructor(socket, address, timeout = 5000) {
        super(socket, timeout);
        this._address = address;
        this._requests = [];
        this._currentRequest = null;
        this._socket.on('open', this._onConnect.bind(this));
        if (this._socket.isOpen) {
            this._onConnect();
        }
    }
    register(requestBody) {
        debug('registrating new request');
        const request = new rtu_request_js_1.default(this._address, requestBody);
        return super.registerRequest(request);
    }
    handle(response) {
        debug('new response coming in');
        if (!response) {
            return;
        }
        const userRequest = this._currentRequest;
        if (!userRequest) {
            debug('something is strange, received a respone without a request');
            return;
        }
        const buf = Buffer.concat([Buffer.from([response.address]), response.body.createPayload()]);
        debug('create crc from response', buf);
        const crc = crc_1.default.crc16modbus(buf);
        if (response.crc !== crc) {
            debug('CRC does not match', response.crc, '!==', crc);
            userRequest.reject(new user_request_error_1.UserRequestError({
                err: 'crcMismatch',
                message: 'the response payload does not match the crc'
            }));
            this._clearAllRequests();
            return;
        }
        super.handle(response);
    }
    get address() {
        return this._address;
    }
}
exports.default = ModbusRTUClientRequestHandler;
