/// <reference types="node" />
import WriteMultipleRegistersRequestBody from '../request/write-multiple-registers';
import ModbusWriteResponseBody from './write-response.body';
export default class WriteMultipleRegistersResponseBody extends ModbusWriteResponseBody {
    readonly start: number;
    readonly quantity: number;
    readonly count: number;
    readonly byteCount: number;
    static fromRequest(requestBody: WriteMultipleRegistersRequestBody): WriteMultipleRegistersResponseBody;
    static fromBuffer(buffer: Buffer): WriteMultipleRegistersResponseBody | null;
    protected _start: number;
    protected _quantity: number;
    constructor(start: number, quantity: number);
    createPayload(): Buffer;
}
//# sourceMappingURL=write-multiple-registers.d.ts.map