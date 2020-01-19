/// <reference types="node" />
import ModbusRequestBody from './request-body.js';
export default class ReadDiscreteInputsRequestBody extends ModbusRequestBody {
    readonly start: number;
    readonly count: number;
    readonly name: "ReadDiscreteInput";
    readonly byteCount: number;
    static fromBuffer(buffer: Buffer): ReadDiscreteInputsRequestBody | null;
    private _start;
    private _count;
    constructor(start: number, count: number);
    createPayload(): Buffer;
}
export declare function isReadDiscreteInputsRequestBody(x: any): x is ReadDiscreteInputsRequestBody;
//# sourceMappingURL=read-discrete-inputs.d.ts.map