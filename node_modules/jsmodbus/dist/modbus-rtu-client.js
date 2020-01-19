"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const modbus_client_js_1 = __importDefault(require("./modbus-client.js"));
const rtu_client_request_handler_js_1 = __importDefault(require("./rtu-client-request-handler.js"));
const rtu_client_response_handler_js_1 = __importDefault(require("./rtu-client-response-handler.js"));
class ModbusRTUClient extends modbus_client_js_1.default {
    constructor(socket, address, timeout = 5000) {
        super(socket);
        this._requestHandler = new rtu_client_request_handler_js_1.default(socket, address, timeout);
        this._responseHandler = new rtu_client_response_handler_js_1.default();
    }
    get slaveId() {
        return this._requestHandler.address;
    }
    get unitId() {
        return this._requestHandler.address;
    }
}
exports.default = ModbusRTUClient;
