/// <reference types="node" />
import { ModbusRequestBody } from './request';
export default abstract class ModbusAbstractRequest<ReqBody extends ModbusRequestBody = ModbusRequestBody> {
    abstract readonly body: ReqBody;
    abstract readonly unitId: number;
    abstract readonly slaveId: number;
    abstract readonly address: number;
    abstract readonly byteCount: number;
    static fromBuffer: ModbusAbstractRequestFromBuffer<any>;
    protected abstract _body: ReqBody;
    abstract createPayload(): Buffer;
}
export declare type ModbusAbstractRequestFromBuffer<ReqBody extends ModbusRequestBody = any> = (buffer: Buffer) => ReqBody | null;
export declare function isModbusRequest(x: any): x is ModbusAbstractRequest;
//# sourceMappingURL=abstract-request.d.ts.map