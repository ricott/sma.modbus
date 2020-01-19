"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('tcp-response');
const abstract_response_js_1 = __importDefault(require("./abstract-response.js"));
const response_factory_js_1 = __importDefault(require("./response/response-factory.js"));
class ModbusTCPResponse extends abstract_response_js_1.default {
    constructor(id, protocol, bodyLength, unitId, body) {
        super();
        this._id = id;
        this._protocol = protocol;
        this._bodyLength = bodyLength;
        this._unitId = unitId;
        this._body = body;
    }
    get id() {
        return this._id;
    }
    get protocol() {
        return this._protocol;
    }
    get bodyLength() {
        return this._bodyLength;
    }
    get byteCount() {
        return this._bodyLength + 6;
    }
    get unitId() {
        return this._unitId;
    }
    get slaveId() {
        return this._unitId;
    }
    get address() {
        return this._unitId;
    }
    get body() {
        return this._body;
    }
    static fromRequest(tcpRequest, modbusBody) {
        return new ModbusTCPResponse(tcpRequest.id, tcpRequest.protocol, modbusBody.byteCount + 1, tcpRequest.unitId, modbusBody);
    }
    static fromBuffer(buffer) {
        try {
            const id = buffer.readUInt16BE(0);
            const protocol = buffer.readUInt16BE(2);
            const length = buffer.readUInt16BE(4);
            const unitId = buffer.readUInt8(6);
            debug('tcp header complete, id', id, 'protocol', protocol, 'length', length, 'unitId', unitId);
            debug('buffer', buffer);
            const body = response_factory_js_1.default.fromBuffer(buffer.slice(7, 7 + length - 1));
            if (!body) {
                debug('not enough data for a response body');
                return null;
            }
            debug('buffer contains a valid response body');
            return new ModbusTCPResponse(id, protocol, length, unitId, body);
        }
        catch (e) {
            debug('not enough data available');
            return null;
        }
    }
    createPayload() {
        const payload = Buffer.alloc(this.byteCount);
        payload.writeUInt16BE(this._id, 0);
        payload.writeUInt16BE(this._protocol, 2);
        payload.writeUInt16BE(this._bodyLength, 4);
        payload.writeUInt8(this._unitId, 6);
        this._body.createPayload().copy(payload, 7);
        return payload;
    }
}
exports.default = ModbusTCPResponse;
