/// <reference types="node" />
import ModbusAbstractRequest from './abstract-request';
import { ModbusRequestBody } from './request';
import { ModbusResponseBody } from './response';
export default abstract class ModbusAbstractResponse<ResBody extends ModbusResponseBody = ModbusResponseBody> {
    abstract readonly unitId: number;
    abstract readonly slaveId: number;
    abstract readonly address: number;
    readonly body: ResBody;
    static fromRequest<ReqBody extends ModbusRequestBody, ResBody extends ModbusResponseBody>(request: ModbusAbstractRequest<ReqBody>, body: ResBody): ModbusAbstractResponse<ResBody>;
    protected abstract _body: ResBody;
    abstract createPayload(): Buffer;
}
export declare type ModbusAbstractResponseFromRequest = (request: ModbusAbstractRequest, body: ModbusResponseBody) => ModbusAbstractResponse;
//# sourceMappingURL=abstract-response.d.ts.map