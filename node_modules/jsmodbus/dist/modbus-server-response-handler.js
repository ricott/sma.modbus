"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const response_1 = require("./response");
const request_1 = require("./request");
const buffer_utils_js_1 = __importDefault(require("./buffer-utils.js"));
const codes_1 = require("./codes");
const { bufferToArrayStatus, arrayStatusToBuffer } = buffer_utils_js_1.default;
const Debug = require("debug");
const debug = Debug('modbus tcp response handler');
class ModbusServerResponseHandler {
    constructor(server, fromRequest) {
        this._server = server;
        this._fromRequest = fromRequest;
    }
    handle(request, cb) {
        if (!request) {
            return null;
        }
        if (request_1.isExceptionRequestBody(request.body)) {
            const responseBody = response_1.ExceptionResponseBody.fromRequest(request.body);
            const response = this._fromRequest(request, responseBody);
            cb(response.createPayload());
            return response;
        }
        const fc = request.body.fc;
        if (codes_1.isFunctionCode(fc)) {
            switch (fc) {
                case codes_1.FC.READ_COIL:
                    return this._handleReadCoil(request, cb);
                case codes_1.FC.READ_DISCRETE_INPUT:
                    return this._handleDiscreteInput(request, cb);
                case codes_1.FC.READ_HOLDING_REGISTERS:
                    return this._handleReadHoldingRegisters(request, cb);
                case codes_1.FC.READ_INPUT_REGISTERS:
                    return this._handleReadInputRegisters(request, cb);
                case codes_1.FC.WRITE_SINGLE_COIL:
                    return this._handleWriteSingleCoil(request, cb);
                case codes_1.FC.WRITE_SINGLE_HOLDING_REGISTER:
                    return this._handleWriteSingleHoldingRegister(request, cb);
                case codes_1.FC.WRITE_MULTIPLE_COILS:
                    return this._handleWriteMultipleCoils(request, cb);
                case codes_1.FC.WRITE_MULTIPLE_HOLDING_REGISTERS:
                    return this._handleWriteMultipleHoldingRegisters(request, cb);
            }
        }
        return;
    }
    _handleReadCoil(request, cb) {
        if (!request_1.isReadCoilsRequestBody(request.body)) {
            throw new Error(`InvalidRequestClass - Expected ReadCoilsRequestBody but received ${request.body.name}`);
        }
        if (!this._server.coils) {
            debug('no coils buffer on server, trying readCoils handler');
            this._server.emit('readCoils', request, cb);
            return;
        }
        this._server.emit('preReadCoils', request, cb);
        const responseBody = response_1.ReadCoilsResponseBody.fromRequest(request.body, this._server.coils);
        const response = this._fromRequest(request, responseBody);
        const payload = response.createPayload();
        cb(payload);
        this._server.emit('postReadCoils', request, cb);
        return response;
    }
    _handleDiscreteInput(request, cb) {
        if (!request_1.isReadDiscreteInputsRequestBody(request.body)) {
            throw new Error(`InvalidRequestClass - Expected ReadDiscreteInputsRequestBody but received ${request.body.name}`);
        }
        if (!this._server.discrete) {
            debug('no discrete input buffer on server, trying readDiscreteInputs handler');
            this._server.emit('readDiscreteInputs', request, cb);
            return;
        }
        this._server.emit('preReadDiscreteInputs', request, cb);
        const responseBody = response_1.ReadDiscreteInputsResponseBody.fromRequest(request.body, this._server.discrete);
        const response = this._fromRequest(request, responseBody);
        const payload = response.createPayload();
        cb(payload);
        this._server.emit('postReadDiscreteInputs', request, cb);
        return response;
    }
    _handleReadHoldingRegisters(request, cb) {
        if (!request_1.isReadHoldingRegistersRequestBody(request.body)) {
            const msg = `InvalidRequestClass - Expected ReadHoldingRegistersRequestBody but received ${request.body.name}`;
            throw new Error(msg);
        }
        if (!this._server.holding) {
            debug('no holding register buffer on server, trying readHoldingRegisters handler');
            this._server.emit('readHoldingRegisters', request, cb);
            return;
        }
        this._server.emit('preReadHoldingRegisters', request, cb);
        const responseBody = response_1.ReadHoldingRegistersResponseBody.fromRequest(request.body, this._server.holding);
        const response = this._fromRequest(request, responseBody);
        const payload = response.createPayload();
        cb(payload);
        this._server.emit('postReadHoldingRegisters', request, cb);
        return response;
    }
    _handleReadInputRegisters(request, cb) {
        if (!request_1.isReadInputRegistersRequestBody(request.body)) {
            throw new Error(`InvalidRequestClass - Expected ReadInputRegistersRequestBody but received ${request.body.name}`);
        }
        if (!this._server.input) {
            debug('no input register buffer on server, trying readInputRegisters handler');
            this._server.emit('readInputRegisters', request, cb);
            return;
        }
        this._server.emit('preReadInputRegisters', request, cb);
        const responseBody = response_1.ReadInputRegistersResponseBody.fromRequest(request.body, this._server.input);
        const response = this._fromRequest(request, responseBody);
        const payload = response.createPayload();
        cb(payload);
        this._server.emit('postReadInputRegisters', request, cb);
        return response;
    }
    _handleWriteSingleCoil(request, cb) {
        if (!request_1.isWriteSingleCoilRequestBody(request.body)) {
            throw new Error(`InvalidRequestClass - Expected WriteSingleCoilRequestBody but received ${request.body.name}`);
        }
        if (!this._server.coils) {
            debug('no coils buffer on server, trying writeSingleCoil handler');
            this._server.emit('writeSingleCoil', request, cb);
            return;
        }
        this._server.emit('preWriteSingleCoil', request, cb);
        const responseBody = response_1.WriteSingleCoilResponseBody.fromRequest(request.body);
        const address = request.body.address;
        debug('Writing value %d to address %d', request.body.value, address);
        const oldValue = this._server.coils.readUInt8(Math.floor(address / 8));
        let newValue;
        if (request.body.value !== 0xFF00 && request.body.value !== 0x0000) {
            debug('illegal data value');
            const exceptionBody = new response_1.ExceptionResponseBody(request.body.fc, 0x03);
            const exceptionResponse = this._fromRequest(request, exceptionBody);
            cb(exceptionResponse.createPayload());
            return exceptionResponse;
        }
        if (request.body.value === 0xFF00) {
            newValue = oldValue | Math.pow(2, address % 8);
        }
        else {
            newValue = oldValue & ~Math.pow(2, address % 8);
        }
        if (responseBody.address / 8 > this._server.coils.length) {
            debug('illegal data address');
            const exceptionBody = new response_1.ExceptionResponseBody(request.body.fc, 0x02);
            const exceptionResponse = this._fromRequest(request, exceptionBody);
            cb(exceptionResponse.createPayload());
            return exceptionResponse;
        }
        else {
            this._server.coils.writeUInt8(newValue, Math.floor(address / 8));
        }
        const response = this._fromRequest(request, responseBody);
        const payload = response.createPayload();
        cb(payload);
        this._server.emit('postWriteSingleCoil', request, cb);
        return response;
    }
    _handleWriteSingleHoldingRegister(request, cb) {
        if (!request_1.isWriteSingleRegisterRequestBody(request.body)) {
            throw new Error(`InvalidRequestClass - Expected WriteSingleRegisterRequestBody but received ${request.body.name}`);
        }
        if (!this._server.holding) {
            debug('no register buffer on server, trying writeSingleRegister handler');
            this._server.emit('writeSingleRegister', request, cb);
            return;
        }
        this._server.emit('preWriteSingleRegister', request, cb);
        const responseBody = response_1.WriteSingleRegisterResponseBody.fromRequest(request.body);
        if (responseBody.address * 2 > this._server.holding.length) {
            debug('illegal data address');
            const exceptionBody = new response_1.ExceptionResponseBody(request.body.fc, 0x02);
            const exceptionResponse = this._fromRequest(request, exceptionBody);
            cb(exceptionResponse.createPayload());
            return exceptionResponse;
        }
        else {
            this._server.holding.writeUInt16BE(responseBody.value, responseBody.address * 2);
        }
        const response = this._fromRequest(request, responseBody);
        const payload = response.createPayload();
        cb(payload);
        this._server.emit('postWriteSingleRegister', request, cb);
        return response;
    }
    _handleWriteMultipleCoils(request, cb) {
        if (!request_1.isWriteMultipleCoilsRequestBody(request.body)) {
            throw new Error(`InvalidRequestClass - Expected WriteMultipleCoilsRequestBody but received ${request.body.name}`);
        }
        if (!this._server.coils) {
            debug('no coils buffer on server, trying writeMultipleCoils handler');
            this._server.emit('writeMultipleCoils', request, cb);
            return;
        }
        this._server.emit('preWriteMultipleCoils', request, cb);
        const responseBody = response_1.WriteMultipleCoilsResponseBody.fromRequest(request.body);
        const oldStatus = bufferToArrayStatus(this._server.coils);
        const requestCoilValues = bufferToArrayStatus(request.body.valuesAsBuffer);
        const start = request.body.address;
        const end = start + request.body.quantity;
        const newStatus = oldStatus.map((byte, i) => {
            let value = byte;
            const inRange = (i >= start && i < end);
            if (inRange) {
                const newValue = requestCoilValues.shift();
                value = newValue !== undefined ? newValue : byte;
            }
            return value;
        });
        this._server.emit('writeMultipleCoils', this._server.coils, oldStatus);
        this._server.coils.fill(arrayStatusToBuffer(newStatus));
        this._server.emit('postWriteMultipleCoils', this._server.coils, newStatus);
        const response = this._fromRequest(request, responseBody);
        const payload = response.createPayload();
        cb(payload);
        this._server.emit('postWriteMultipleCoils', request, cb);
        return response;
    }
    _handleWriteMultipleHoldingRegisters(request, cb) {
        if (!request_1.isWriteMultipleRegistersRequestBody(request.body)) {
            throw new Error(`InvalidRequestClass - Expected WriteMultipleRegistersRequestBody but received ${request.body.name}`);
        }
        if (!this._server.holding) {
            debug('no register buffer on server, trying writeMultipleRegisters handler');
            this._server.emit('writeMultipleRegisters', request, cb);
            return;
        }
        this._server.emit('preWriteMultipleRegisters', request, cb);
        const responseBody = response_1.WriteMultipleRegistersResponseBody.fromRequest(request.body);
        if (((request.body.address * 2) + request.body.values.length) > this._server.holding.length) {
            debug('illegal data address');
            const exceptionBody = new response_1.ExceptionResponseBody(request.body.fc, 0x02);
            const exceptionResponse = this._fromRequest(request, exceptionBody);
            cb(exceptionResponse.createPayload());
            return exceptionResponse;
        }
        else {
            this._server.emit('writeMultipleRegisters', this._server.holding);
            debug('Request Body: ', request.body);
            this._server.holding.fill(new Uint8Array(request.body.values), request.body.address * 2, request.body.address * 2 + request.body.values.length);
            this._server.emit('postWriteMultipleRegisters', this._server.holding);
        }
        const response = this._fromRequest(request, responseBody);
        const payload = response.createPayload();
        cb(payload);
        this._server.emit('postWriteMultipleRegisters', request, cb);
        return response;
    }
}
exports.default = ModbusServerResponseHandler;
