/// <reference types="node" />
import ModbusRequestBody from './request-body.js';
export default class WriteSingleCoilRequestBody extends ModbusRequestBody {
    readonly address: number;
    readonly value: 0 | 65280;
    readonly byteCount: number;
    readonly count: number;
    readonly name: "WriteSingleCoil";
    static fromBuffer(buffer: Buffer): WriteSingleCoilRequestBody | null;
    private _address;
    private _value;
    constructor(address: number, value: boolean | 0 | 1);
    createPayload(): Buffer;
}
export declare function isWriteSingleCoilRequestBody(x: any): x is WriteSingleCoilRequestBody;
//# sourceMappingURL=write-single-coil.d.ts.map