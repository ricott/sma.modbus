/// <reference types="node" />
import ModbusRequestBody from './request-body.js';
export default class WriteMultipleRegistersRequestBody extends ModbusRequestBody {
    readonly address: number;
    readonly quantity: number;
    readonly count: number;
    readonly values: number[] | Buffer;
    readonly valuesAsArray: number[];
    readonly valuesAsBuffer: Buffer;
    readonly byteCount: number;
    readonly numberOfBytes: number;
    readonly name: "WriteMultipleRegisters";
    static fromBuffer(buffer: Buffer): WriteMultipleRegistersRequestBody | null;
    private _address;
    private _values;
    private _byteCount;
    private _numberOfBytes;
    private _quantity;
    private _valuesAsBuffer;
    private _valuesAsArray;
    constructor(address: number, values: number[] | Buffer);
    createPayload(): Buffer;
}
export declare function isWriteMultipleRegistersRequestBody(x: any): x is WriteMultipleRegistersRequestBody;
//# sourceMappingURL=write-multiple-registers.d.ts.map