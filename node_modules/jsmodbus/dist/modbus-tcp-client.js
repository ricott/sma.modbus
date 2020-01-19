"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const modbus_client_js_1 = __importDefault(require("./modbus-client.js"));
const tcp_client_request_handler_js_1 = __importDefault(require("./tcp-client-request-handler.js"));
const tcp_client_response_handler_js_1 = __importDefault(require("./tcp-client-response-handler.js"));
class ModbusTCPClient extends modbus_client_js_1.default {
    constructor(socket, unitId = 1, timeout = 5000) {
        super(socket);
        this._requestHandler = new tcp_client_request_handler_js_1.default(socket, unitId, timeout);
        this._responseHandler = new tcp_client_response_handler_js_1.default();
        this._unitId = unitId;
        this._timeout = timeout;
    }
    get slaveId() {
        return this._unitId;
    }
    get unitId() {
        return this._unitId;
    }
}
exports.default = ModbusTCPClient;
