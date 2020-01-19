/// <reference types="node" />
import { FunctionCode } from '../codes';
import ModbusRequestBody from '../request/request-body';
export default abstract class ModbusBaseResponseBody {
    readonly fc: FunctionCode;
    abstract readonly byteCount: number;
    readonly isException: boolean;
    static fromRequest(requestBody: ModbusRequestBody, buf: Buffer): any;
    protected _fc: FunctionCode;
    constructor(fc: FunctionCode, ignoreInvalidFunctionCode?: boolean);
    abstract createPayload(): Buffer;
}
//# sourceMappingURL=response-body.d.ts.map