/// <reference types="node" />
import ModbusRequestBody from './request-body.js';
export default class ReadCoilsRequestBody extends ModbusRequestBody {
    readonly start: number;
    readonly count: number;
    readonly name: "ReadCoils";
    readonly byteCount: number;
    static fromBuffer(buffer: Buffer): ReadCoilsRequestBody | null;
    private _start;
    private _count;
    constructor(start: number, count: number);
    createPayload(): Buffer;
}
export declare function isReadCoilsRequestBody(x: any): x is ReadCoilsRequestBody;
//# sourceMappingURL=read-coils.d.ts.map