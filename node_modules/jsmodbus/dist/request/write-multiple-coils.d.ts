/// <reference types="node" />
import ModbusRequestBody from './request-body.js';
export default class WriteMultipleCoilsRequestBody extends ModbusRequestBody {
    readonly address: number;
    readonly values: boolean[] | Buffer;
    readonly valuesAsArray: boolean[];
    readonly valuesAsBuffer: Buffer;
    readonly quantity: number;
    readonly count: number;
    readonly byteCount: number;
    readonly numberOfBytes: number;
    readonly name: "WriteMultipleCoils";
    static fromBuffer(buffer: Buffer): WriteMultipleCoilsRequestBody | null;
    private _address;
    private _values;
    private _quantity;
    private _numberOfBytes;
    private _valuesAsBuffer;
    private _byteCount;
    private _valuesAsArray;
    constructor(address: number, values: boolean[]);
    constructor(address: number, values: Buffer, quantity: number);
    createPayload(): Buffer;
}
export declare function isWriteMultipleCoilsRequestBody(x: any): x is WriteMultipleCoilsRequestBody;
//# sourceMappingURL=write-multiple-coils.d.ts.map