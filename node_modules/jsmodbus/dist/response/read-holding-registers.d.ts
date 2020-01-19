/// <reference types="node" />
import ReadHoldingRegistersRequestBody from '../request/read-holding-registers';
import ModbusReadResponseBody from './read-response-body.js';
export default class ReadHoldingRegistersResponseBody extends ModbusReadResponseBody {
    readonly byteCount: any;
    readonly values: number[] | Buffer;
    readonly valuesAsArray: number[] | Uint16Array;
    readonly valuesAsBuffer: Buffer;
    readonly length: number;
    static fromRequest(requestBody: ReadHoldingRegistersRequestBody, holdingRegisters: Buffer): ReadHoldingRegistersResponseBody;
    static fromBuffer(buffer: Buffer): ReadHoldingRegistersResponseBody | null;
    protected _valuesAsArray: number[] | Uint16Array;
    protected _valuesAsBuffer: Buffer;
    private _byteCount;
    private _values;
    private _bufferLength;
    constructor(byteCount: number, values: number[] | Buffer, payload?: Buffer);
    createPayload(): Buffer;
}
//# sourceMappingURL=read-holding-registers.d.ts.map