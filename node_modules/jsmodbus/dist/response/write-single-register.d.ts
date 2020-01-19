/// <reference types="node" />
import WriteSingleRegisterRequestBody from '../request/write-single-register.js';
import ModbusWriteResponseBody from './write-response.body.js';
export default class WriteSingleRegisterResponseBody extends ModbusWriteResponseBody {
    readonly address: number;
    readonly value: number;
    readonly byteCount: number;
    static fromRequest(requestBody: WriteSingleRegisterRequestBody): WriteSingleRegisterResponseBody;
    static fromBuffer(buffer: Buffer): WriteSingleRegisterResponseBody | null;
    private _address;
    private _value;
    constructor(address: number, value: number);
    createPayload(): Buffer;
}
//# sourceMappingURL=write-single-register.d.ts.map