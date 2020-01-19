/// <reference types="node" />
import WriteSingleCoilRequestBody from '../request/write-single-coil.js';
import ModbusWriteResponseBody from './write-response.body.js';
export default class WriteSingleCoilResponseBody extends ModbusWriteResponseBody {
    readonly address: number;
    readonly value: boolean;
    readonly byteCount: number;
    static fromRequest(requestBody: WriteSingleCoilRequestBody): WriteSingleCoilResponseBody;
    static fromBuffer(buffer: Buffer): WriteSingleCoilResponseBody | null;
    _address: number;
    _value: 0 | 0xff00;
    constructor(address: number, value: 0 | 0xff00 | boolean);
    createPayload(): Buffer;
}
//# sourceMappingURL=write-single-coil.d.ts.map