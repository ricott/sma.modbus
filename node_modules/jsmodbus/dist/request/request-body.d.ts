/// <reference types="node" />
import { FunctionCode } from '../codes';
export declare type ModbusRequestTypeName = 'ReadCoils' | 'ReadDiscreteInput' | 'ReadHoldingRegisters' | 'ReadInputRegisters' | 'WriteMultipleCoils' | 'WriteMultipleRegisters' | 'WriteSingleCoil' | 'WriteSingleRegister' | 'ExceptionRequest';
export default abstract class ModbusRequestBody {
    protected _fc: FunctionCode;
    constructor(fc: FunctionCode);
    readonly fc: FunctionCode;
    abstract createPayload(): Buffer;
    abstract readonly byteCount: number;
    abstract readonly name: ModbusRequestTypeName;
    abstract readonly count: number;
    readonly isException: boolean;
    readonly isModbusRequestBody: boolean;
}
export declare function isModbusRequestBody(x: any): x is ModbusRequestBody;
//# sourceMappingURL=request-body.d.ts.map