"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const modbus_server_client_js_1 = __importDefault(require("./modbus-server-client.js"));
const modbus_server_js_1 = __importDefault(require("./modbus-server.js"));
const rtu_request_js_1 = __importDefault(require("./rtu-request.js"));
const rtu_response_js_1 = __importDefault(require("./rtu-response.js"));
class ModbusRTUServer extends modbus_server_js_1.default {
    constructor(socket, options) {
        super(options);
        this._socket = socket;
        const fromBuffer = rtu_request_js_1.default.fromBuffer;
        const fromRequest = rtu_response_js_1.default.fromRequest;
        const client = new modbus_server_client_js_1.default(this, socket, fromBuffer, fromRequest);
        this.emit('connection', client);
    }
}
exports.default = ModbusRTUServer;
