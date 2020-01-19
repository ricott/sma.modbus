/// <reference types="node" />
import { BooleanArray } from '../constants/index.js';
import ReadDiscreteInputsRequestBody from '../request/read-discrete-inputs.js';
import ModbusReadResponseBody from './read-response-body.js';
export default class ReadDiscreteInputsResponseBody extends ModbusReadResponseBody {
    readonly discrete: Buffer | (number | boolean)[];
    readonly valuesAsArray: (number | boolean)[];
    readonly valuesAsBuffer: Buffer;
    readonly numberOfBytes: number;
    readonly byteCount: number;
    static fromRequest(requestBody: ReadDiscreteInputsRequestBody, discreteInputs: Buffer): ReadDiscreteInputsResponseBody;
    static fromBuffer(buffer: Buffer): ReadDiscreteInputsResponseBody | null;
    protected _valuesAsArray: BooleanArray;
    protected _valuesAsBuffer: Buffer;
    private _discrete;
    private _numberOfBytes;
    constructor(discrete: BooleanArray | Buffer, numberOfBytes: number);
    createPayload(): Buffer;
}
//# sourceMappingURL=read-discrete-inputs.d.ts.map