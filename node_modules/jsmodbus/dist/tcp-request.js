"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('tcp-request');
const abstract_request_js_1 = __importDefault(require("./abstract-request.js"));
const request_factory_js_1 = __importDefault(require("./request/request-factory.js"));
class ModbusTCPRequest extends abstract_request_js_1.default {
    constructor(id, protocol, length, unitId, body) {
        super();
        this._id = id;
        this._protocol = protocol;
        this._length = length;
        this._unitId = unitId;
        this._body = body;
    }
    get id() {
        return this._id;
    }
    get protocol() {
        return this._protocol;
    }
    get length() {
        return this._length;
    }
    get unitId() {
        return this._unitId;
    }
    get address() {
        return this.unitId;
    }
    get slaveId() {
        return this.unitId;
    }
    get name() {
        return this._body.name;
    }
    get body() {
        return this._body;
    }
    get corrupted() {
        return false;
    }
    get byteCount() {
        return this._length + 6;
    }
    static fromBuffer(buffer) {
        try {
            if (buffer.length < 7) {
                debug('no enough data in the buffer yet');
                return null;
            }
            const id = buffer.readUInt16BE(0);
            const protocol = buffer.readUInt16BE(2);
            const length = buffer.readUInt16BE(4);
            const unitId = buffer.readUInt8(6);
            debug('tcp header complete, id', id, 'protocol', protocol, 'length', length, 'unitId', unitId);
            debug('buffer', buffer);
            const body = request_factory_js_1.default.fromBuffer(buffer.slice(7, 6 + length));
            if (!body) {
                return null;
            }
            return new ModbusTCPRequest(id, protocol, length, unitId, body);
        }
        catch (e) {
            debug('not enough data to create a tcp request', e);
            return null;
        }
    }
    createPayload() {
        const body = this._body.createPayload();
        const payload = Buffer.alloc(7 + this._body.byteCount);
        payload.writeUInt16BE(this._id, 0);
        payload.writeUInt16BE(0x0000, 2);
        payload.writeUInt16BE(this._body.byteCount + 1, 4);
        payload.writeUInt8(this._unitId, 6);
        body.copy(payload, 7);
        return payload;
    }
}
exports.default = ModbusTCPRequest;
