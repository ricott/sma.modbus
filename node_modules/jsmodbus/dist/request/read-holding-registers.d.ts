/// <reference types="node" />
import ModbusRequestBody from './request-body.js';
export default class ReadHoldingRegistersRequestBody extends ModbusRequestBody {
    readonly start: number;
    readonly count: number;
    readonly byteCount: number;
    readonly name: "ReadHoldingRegisters";
    static fromBuffer(buffer: Buffer): ReadHoldingRegistersRequestBody | null;
    private _start;
    private _count;
    constructor(start: number, count: number);
    createPayload(): Buffer;
}
export declare function isReadHoldingRegistersRequestBody(x: any): x is ReadHoldingRegistersRequestBody;
//# sourceMappingURL=read-holding-registers.d.ts.map