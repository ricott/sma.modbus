/// <reference types="node" />
import { FunctionCode } from '../codes';
import { BooleanArray } from '../constants';
import ModbusBaseResponseBody from './response-body';
export default abstract class ModbusReadResponseBody extends ModbusBaseResponseBody {
    protected abstract _valuesAsArray?: number[] | BooleanArray | Uint16Array;
    protected abstract _valuesAsBuffer?: Buffer;
    constructor(fc: FunctionCode);
    readonly fc: FunctionCode;
    abstract readonly byteCount: number;
    abstract createPayload(): Buffer;
    abstract readonly valuesAsArray: number[] | BooleanArray | Uint16Array;
    abstract readonly valuesAsBuffer: Buffer;
}
//# sourceMappingURL=read-response-body.d.ts.map