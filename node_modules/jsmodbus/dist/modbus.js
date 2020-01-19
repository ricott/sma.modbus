"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const modbus_tcp_client_js_1 = __importDefault(require("./modbus-tcp-client.js"));
exports.ModbusTCPClient = modbus_tcp_client_js_1.default;
const modbus_rtu_client_js_1 = __importDefault(require("./modbus-rtu-client.js"));
exports.ModbusRTUClient = modbus_rtu_client_js_1.default;
const modbus_tcp_server_js_1 = __importDefault(require("./modbus-tcp-server.js"));
exports.ModbusTCPServer = modbus_tcp_server_js_1.default;
const modbus_rtu_server_js_1 = __importDefault(require("./modbus-rtu-server.js"));
exports.ModbusRTUServer = modbus_rtu_server_js_1.default;
const Codes = __importStar(require("./codes"));
const Errors = __importStar(require("./errors"));
const Requests = __importStar(require("./request"));
const Responses = __importStar(require("./response"));
const user_request_js_1 = __importDefault(require("./user-request.js"));
const constants_1 = require("./constants");
exports.client = {
    RTU: modbus_rtu_client_js_1.default,
    TCP: modbus_tcp_client_js_1.default
};
exports.server = {
    RTU: modbus_rtu_server_js_1.default,
    TCP: modbus_tcp_server_js_1.default
};
exports.requests = Object.assign({}, Requests, { UserRequest: user_request_js_1.default });
exports.responses = Responses;
exports.codes = Codes;
exports.errors = Errors;
exports.limits = constants_1.LIMITS;
var abstract_request_1 = require("./abstract-request");
exports.ModbusAbstractRequest = abstract_request_1.default;
var abstract_response_1 = require("./abstract-response");
exports.ModbusAbstractResponse = abstract_response_1.default;
var client_request_handler_1 = require("./client-request-handler");
exports.MBClientRequestHandler = client_request_handler_1.default;
var client_response_handler_1 = require("./client-response-handler");
exports.ModbusClientResponseHandler = client_response_handler_1.default;
var modbus_client_1 = require("./modbus-client");
exports.ModbusClient = modbus_client_1.default;
var tcp_request_1 = require("./tcp-request");
exports.ModbusTCPRequest = tcp_request_1.default;
var tcp_response_1 = require("./tcp-response");
exports.ModbusTCPResponse = tcp_response_1.default;
var user_request_error_1 = require("./user-request-error");
exports.UserRequestError = user_request_error_1.UserRequestError;
var user_request_1 = require("./user-request");
exports.UserRequest = user_request_1.default;
var user_request_metrics_1 = require("./user-request-metrics");
exports.UserRequestMetrics = user_request_metrics_1.UserRequestMetrics;
