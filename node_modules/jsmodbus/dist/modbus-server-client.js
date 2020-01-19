"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('modbus tcp client socket');
const modbus_server_request_handler_js_1 = __importDefault(require("./modbus-server-request-handler.js"));
const modbus_server_response_handler_js_1 = __importDefault(require("./modbus-server-response-handler.js"));
class ModbusServerClient {
    constructor(server, socket, fromBufferMethod, fromRequestMethod) {
        this._server = server;
        this._socket = socket;
        this._requestHandler = new modbus_server_request_handler_js_1.default(fromBufferMethod);
        this._responseHandler = new modbus_server_response_handler_js_1.default(this._server, fromRequestMethod);
        this._socket.on('data', this._onData.bind(this));
    }
    get socket() {
        return this._socket;
    }
    get server() {
        return this._server;
    }
    _onData(data) {
        debug('new data coming in');
        this._requestHandler.handle(data);
        do {
            const request = this._requestHandler.shift();
            if (!request) {
                debug('no request to process');
                break;
            }
            this._responseHandler.handle(request, (response) => {
                this._socket.write(response, () => {
                    debug('response flushed', response);
                });
            });
        } while (1);
    }
}
exports.default = ModbusServerClient;
