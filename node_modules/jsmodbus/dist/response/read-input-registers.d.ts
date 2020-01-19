/// <reference types="node" />
import ReadInputRegistersRequestBody from '../request/read-input-registers.js';
import ModbusReadResponseBody from './read-response-body.js';
export default class ReadInputRegistersResponseBody extends ModbusReadResponseBody {
    readonly byteCount: number;
    readonly values: number[] | Uint16Array | Buffer;
    readonly valuesAsArray: number[] | Uint16Array;
    readonly valuesAsBuffer: Buffer;
    readonly length: number;
    static fromRequest(requestBody: ReadInputRegistersRequestBody, inputRegisters: Buffer): ReadInputRegistersResponseBody;
    static fromBuffer(buffer: Buffer): ReadInputRegistersResponseBody | null;
    protected _valuesAsArray: number[] | Uint16Array;
    protected _valuesAsBuffer: Buffer;
    private _byteCount;
    private _values;
    private _bufferLength;
    constructor(byteCount: number, values: number[] | Uint16Array | Buffer, payload?: Buffer);
    createPayload(): Buffer;
}
//# sourceMappingURL=read-input-registers.d.ts.map