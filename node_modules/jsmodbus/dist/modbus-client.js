"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('modbus-client');
const request_1 = require("./request");
class MBClient {
    constructor(socket) {
        if (new.target === MBClient) {
            throw new TypeError('Cannot instantiate ModbusClient directly.');
        }
        this._socket = socket;
        if (!socket) {
            throw new Error('NoSocketException.');
        }
        this._socket.on('data', this._onData.bind(this));
    }
    get connectionState() {
        return this._requestHandler.state;
    }
    get socket() {
        return this._socket;
    }
    get requestCount() {
        return this._requestHandler.requestCount;
    }
    readCoils(start, count) {
        debug('issuing new read coils request');
        let request;
        try {
            request = new request_1.ReadCoilsRequestBody(start, count);
        }
        catch (e) {
            debug('unknown request error occurred');
            return Promise.reject(e);
        }
        return this._requestHandler.register(request);
    }
    readDiscreteInputs(start, count) {
        debug('issuing new read discrete inputs request');
        let request;
        try {
            request = new request_1.ReadDiscreteInputsRequestBody(start, count);
        }
        catch (e) {
            debug('unknown request error occurred');
            return Promise.reject(e);
        }
        return this._requestHandler.register(request);
    }
    readHoldingRegisters(start, count) {
        debug('issuing new read holding registers request');
        let request;
        try {
            request = new request_1.ReadHoldingRegistersRequestBody(start, count);
        }
        catch (e) {
            debug('unknown request error occurred');
            return Promise.reject(e);
        }
        return this._requestHandler.register(request);
    }
    readInputRegisters(start, count) {
        debug('issuing new read input registers request');
        let request;
        try {
            request = new request_1.ReadInputRegistersRequestBody(start, count);
        }
        catch (e) {
            debug('unknown request error occurred');
            return Promise.reject(e);
        }
        return this._requestHandler.register(request);
    }
    writeSingleCoil(address, value) {
        debug('issuing new write single coil request');
        let request;
        try {
            request = new request_1.WriteSingleCoilRequestBody(address, value);
        }
        catch (e) {
            debug('unknown request error occurred');
            return Promise.reject(e);
        }
        return this._requestHandler.register(request);
    }
    writeSingleRegister(address, value) {
        debug('issuing new write single register request');
        let request;
        try {
            request = new request_1.WriteSingleRegisterRequestBody(address, value);
        }
        catch (e) {
            debug('unknown request error occurred');
            return Promise.reject(e);
        }
        return this._requestHandler.register(request);
    }
    writeMultipleCoils(start, values, quantity = 0) {
        debug('issuing new write multiple coils request');
        let request;
        try {
            if (values instanceof Buffer) {
                request = new request_1.WriteMultipleCoilsRequestBody(start, values, quantity);
            }
            else {
                request = new request_1.WriteMultipleCoilsRequestBody(start, values);
            }
        }
        catch (e) {
            debug('unknown request error occurred');
            return Promise.reject(e);
        }
        return this._requestHandler.register(request);
    }
    writeMultipleRegisters(start, values) {
        debug('issuing new write multiple registers request');
        let request;
        try {
            request = new request_1.WriteMultipleRegistersRequestBody(start, values);
        }
        catch (e) {
            debug('unknown request error occurred');
            return Promise.reject(e);
        }
        return this._requestHandler.register(request);
    }
    manuallyClearRequests(numRequests) {
        return this._requestHandler.manuallyRejectRequests(numRequests);
    }
    manuallyRejectCurrentRequest() {
        return this._requestHandler.manuallyRejectCurrentRequest();
    }
    customErrorRequest(err) {
        return this._requestHandler.customErrorRequest(err);
    }
    _onData(data) {
        debug('received data');
        this._responseHandler.handleData(data);
        do {
            const response = this._responseHandler.shift();
            if (!response) {
                return;
            }
            if (this.unitId === response.unitId) {
                this._requestHandler.handle(response);
            }
        } while (1);
    }
}
exports.default = MBClient;
