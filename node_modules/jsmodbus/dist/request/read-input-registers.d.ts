/// <reference types="node" />
import ModbusRequestBody from './request-body.js';
export default class ReadInputRegistersRequestBody extends ModbusRequestBody {
    readonly start: number;
    readonly count: number;
    readonly name: "ReadInputRegisters";
    readonly byteCount: number;
    static fromBuffer(buffer: Buffer): ReadInputRegistersRequestBody | null;
    private _start;
    private _count;
    constructor(start: number, count: number);
    createPayload(): Buffer;
}
export declare function isReadInputRegistersRequestBody(x: any): x is ReadInputRegistersRequestBody;
//# sourceMappingURL=read-input-registers.d.ts.map