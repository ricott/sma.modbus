/// <reference types="node" />
import WriteMultipleCoilsRequestBody from '../request/write-multiple-coils.js';
import ModbusWriteResponseBody from './write-response.body.js';
export default class WriteMultipleCoilsResponseBody extends ModbusWriteResponseBody {
    readonly start: number;
    readonly quantity: number;
    readonly count: number;
    readonly byteCount: number;
    static fromRequest(requestBody: WriteMultipleCoilsRequestBody): WriteMultipleCoilsResponseBody;
    static fromBuffer(buffer: Buffer): WriteMultipleCoilsResponseBody | null;
    _start: number;
    _quantity: number;
    constructor(start: number, quantity: number);
    createPayload(): Buffer;
}
//# sourceMappingURL=write-multiple-coils.d.ts.map