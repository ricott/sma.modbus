"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('modbus tcp server');
const modbus_server_1 = __importDefault(require("./modbus-server"));
const modbus_server_client_js_1 = __importDefault(require("./modbus-server-client.js"));
const tcp_request_js_1 = __importDefault(require("./tcp-request.js"));
const tcp_response_js_1 = __importDefault(require("./tcp-response.js"));
class ModbusTCPServer extends modbus_server_1.default {
    constructor(server, options) {
        super(options);
        this._server = server;
        server.on('connection', this._onConnection.bind(this));
    }
    _onConnection(socket) {
        debug('new connection coming in');
        const Request = tcp_request_js_1.default.fromBuffer;
        const Response = tcp_response_js_1.default.fromRequest;
        const client = new modbus_server_client_js_1.default(this, socket, Request, Response);
        this.emit('connection', client);
    }
}
exports.default = ModbusTCPServer;
