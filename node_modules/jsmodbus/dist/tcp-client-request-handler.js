"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('tcp-client-request-handler');
const client_request_handler_js_1 = __importDefault(require("./client-request-handler.js"));
const tcp_request_js_1 = __importDefault(require("./tcp-request.js"));
const user_request_error_1 = require("./user-request-error");
const OUT_OF_SYNC = 'OutOfSync';
const PROTOCOL = 'Protocol';
class ModbusTCPClientRequestHandler extends client_request_handler_js_1.default {
    constructor(socket, unitId, timeout = 5000) {
        super(socket, timeout);
        this._requestId = 0;
        this._unitId = unitId;
        this._requests = [];
        this._currentRequest = null;
        this._socket.on('connect', this._onConnect.bind(this));
        this._socket.on('close', this._onClose.bind(this));
    }
    register(requestBody) {
        this._requestId = (this._requestId + 1) % 0xFFFF;
        debug('registrating new request', 'transaction id', this._requestId, 'unit id', this._unitId, 'length', requestBody.byteCount);
        const tcpRequest = new tcp_request_js_1.default(this._requestId, 0x00, requestBody.byteCount + 1, this._unitId, requestBody);
        return super.registerRequest(tcpRequest);
    }
    handle(response) {
        if (!response) {
            return;
        }
        const userRequest = this._currentRequest;
        if (!userRequest) {
            debug('something is strange, received a respone without a request');
            return;
        }
        const request = userRequest.request;
        if (response.id !== request.id) {
            debug('something weird is going on, response transition id does not equal request transition id', response.id, request.id);
            userRequest.reject(new user_request_error_1.UserRequestError({
                err: OUT_OF_SYNC,
                message: 'request fc and response fc does not match.'
            }));
            this._clearAllRequests();
            return;
        }
        if (response.protocol !== 0x00) {
            debug('server responds with wrong protocol version');
            userRequest.reject(new user_request_error_1.UserRequestError({
                err: PROTOCOL,
                message: 'Unknown protocol version ' + response.protocol
            }));
            this._clearAllRequests();
            return;
        }
        super.handle(response);
    }
}
exports.default = ModbusTCPClientRequestHandler;
