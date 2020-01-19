"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('rtu-request');
const CRC = require("crc");
const abstract_request_js_1 = __importDefault(require("./abstract-request.js"));
const request_factory_js_1 = __importDefault(require("./request/request-factory.js"));
class ModbusRTURequest extends abstract_request_js_1.default {
    constructor(address, body, corrupted = false) {
        super();
        this._address = address;
        this._body = body;
        this._corrupted = corrupted;
    }
    get address() {
        return this._address;
    }
    get slaveId() {
        return this.address;
    }
    get unitId() {
        return this.address;
    }
    get crc() {
        return this._crc;
    }
    get name() {
        return this._body.name;
    }
    get corrupted() {
        return (this._corrupted === true);
    }
    get body() {
        return this._body;
    }
    get byteCount() {
        return this.body.byteCount + 3;
    }
    static fromBuffer(buffer) {
        try {
            if (buffer.length < 1 + 2) {
                debug('not enough data in the buffer yet');
                return null;
            }
            const address = buffer.readUInt8(0);
            debug(`rtu header complete, address, ${address}`);
            debug('buffer', buffer);
            const body = request_factory_js_1.default.fromBuffer(buffer.slice(1));
            if (!body) {
                return null;
            }
            const payloadLength = 1 + body.byteCount;
            const expectedCrc = CRC.crc16modbus(buffer.slice(0, payloadLength));
            const actualCrc = buffer.readUInt16LE(payloadLength);
            const corrupted = (expectedCrc !== actualCrc);
            return new ModbusRTURequest(address, body, corrupted);
        }
        catch (e) {
            debug('not enough data to create a rtu request', e);
            return null;
        }
    }
    createPayload() {
        const bodyPayload = this._body.createPayload();
        this._crc = CRC.crc16modbus(Buffer.concat([Buffer.from([this._address]), bodyPayload]));
        const crBu = Buffer.alloc(2);
        crBu.writeUInt16LE(this._crc, 0);
        const idBuf = Buffer.from([this._address]);
        const payload = Buffer.concat([idBuf, bodyPayload, crBu]);
        return payload;
    }
}
exports.default = ModbusRTURequest;
