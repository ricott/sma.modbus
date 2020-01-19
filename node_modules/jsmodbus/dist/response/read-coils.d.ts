/// <reference types="node" />
import { BooleanArray } from '../constants';
import ReadCoilsRequestBody from '../request/read-coils.js';
import ModbusReadResponseBody from './read-response-body.js';
export default class ReadCoilsResponseBody extends ModbusReadResponseBody {
    readonly values: Buffer | (number | boolean)[];
    readonly valuesAsArray: (number | boolean)[];
    readonly valuesAsBuffer: Buffer;
    readonly numberOfBytes: number;
    readonly byteCount: number;
    static fromRequest(requestBody: ReadCoilsRequestBody, coils: Buffer): ReadCoilsResponseBody;
    static fromBuffer(buffer: Buffer): ReadCoilsResponseBody | null;
    protected _valuesAsArray: BooleanArray;
    protected _valuesAsBuffer: Buffer;
    private _coils;
    private _numberOfBytes;
    constructor(coils: BooleanArray | Buffer, numberOfBytes: number);
    createPayload(): Buffer;
}
//# sourceMappingURL=read-coils.d.ts.map