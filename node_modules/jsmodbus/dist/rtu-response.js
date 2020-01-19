"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('rtu-response');
const CRC = require("crc");
const abstract_response_js_1 = __importDefault(require("./abstract-response.js"));
const response_factory_js_1 = __importDefault(require("./response/response-factory.js"));
class ModbusRTUResponse extends abstract_response_js_1.default {
    constructor(address, crc, body) {
        super();
        this._address = address;
        this._crc = crc;
        this._body = body;
    }
    get address() {
        return this._address;
    }
    get crc() {
        return this._crc;
    }
    get body() {
        return this._body;
    }
    get byteCount() {
        return this._body.byteCount + 3;
    }
    get slaveId() {
        return this._address;
    }
    get unitId() {
        return this._address;
    }
    static fromRequest(rtuRequest, modbusBody) {
        return new ModbusRTUResponse(rtuRequest.address, undefined, modbusBody);
    }
    static fromBuffer(buffer) {
        if (buffer.length < 1) {
            return null;
        }
        const address = buffer.readUInt8(0);
        debug('address', address, 'buffer', buffer);
        const body = response_factory_js_1.default.fromBuffer(buffer.slice(1));
        if (!body) {
            return null;
        }
        let crc;
        try {
            crc = buffer.readUInt16LE(1 + body.byteCount);
        }
        catch (e) {
            debug('If NoSuchIndexException, it is probably serial and not all data has arrived');
            return null;
        }
        return new ModbusRTUResponse(address, crc, body);
    }
    createPayload() {
        const payload = Buffer.alloc(this.byteCount);
        payload.writeUInt8(this._address, 0);
        const bodyPayload = this._body.createPayload();
        bodyPayload.copy(payload, 1);
        this._crc = CRC.crc16modbus(payload.slice(0, this.byteCount - 2));
        payload.writeUInt16LE(this._crc, this.byteCount - 2);
        return payload;
    }
}
exports.default = ModbusRTUResponse;
