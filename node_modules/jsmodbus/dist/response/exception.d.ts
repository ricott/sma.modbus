/// <reference types="node" />
import { ErrorCode, FunctionCode } from '../codes';
import ExceptionRequestBody from '../request/exception.js';
import ModbusResponseBody from './response-body.js';
export default class ExceptionResponseBody extends ModbusResponseBody {
    readonly code: ErrorCode;
    readonly message: "ILLEGAL FUNCTION" | "ILLEGAL DATA ADDRESS" | "ILLEGAL DATA VALUE" | "SLAVE DEVICE FAILURE" | "ACKNOWLEDGE" | "SLAVE DEVICE BUSY" | "MEMORY PARITY ERROR" | "GATEWAY PATH UNAVAILABLE" | "GATEWAY TARGET DEVICE FAILED TO RESPOND";
    readonly byteCount: number;
    readonly isException: boolean;
    static fromBuffer(buffer: Buffer): ExceptionResponseBody;
    static fromRequest(requestBody: ExceptionRequestBody): ExceptionResponseBody;
    private _code;
    constructor(fc: FunctionCode, code: ErrorCode);
    createPayload(): Buffer;
}
export declare function isExceptionResponseBody(x: any): x is ExceptionResponseBody;
//# sourceMappingURL=exception.d.ts.map