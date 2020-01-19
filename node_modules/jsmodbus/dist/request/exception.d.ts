/// <reference types="node" />
import { ErrorCode, FunctionCode } from '../codes';
import ModbusRequestBody from './request-body.js';
export default class ExceptionRequestBody extends ModbusRequestBody {
    readonly code: ErrorCode;
    readonly name: "ExceptionRequest";
    readonly count: number;
    readonly byteCount: number;
    readonly isException: boolean;
    static fromBuffer(buffer: Buffer): ExceptionRequestBody | null;
    protected _code: ErrorCode;
    constructor(fc: FunctionCode, code: ErrorCode);
    constructor(fc: number, code: ErrorCode);
    createPayload(): Buffer;
}
export declare function isExceptionRequestBody(x: any): x is ExceptionRequestBody;
//# sourceMappingURL=exception.d.ts.map