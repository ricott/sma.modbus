/// <reference types="node" />
import ModbusAbstractResponse from './abstract-response.js';
import { ModbusRequestBody } from './request';
import ModbusResponseBody from './response/response-body.js';
import ModbusTCPRequest from './tcp-request.js';
export default class ModbusTCPResponse<ResBody extends ModbusResponseBody = ModbusResponseBody> extends ModbusAbstractResponse<ResBody> {
    readonly id: number;
    readonly protocol: number;
    readonly bodyLength: number;
    readonly byteCount: number;
    readonly unitId: number;
    readonly slaveId: number;
    readonly address: number;
    readonly body: ResBody;
    static fromRequest<ReqBody extends ModbusRequestBody, ResBody extends ModbusResponseBody>(tcpRequest: ModbusTCPRequest<ReqBody>, modbusBody: ResBody): ModbusTCPResponse<ResBody>;
    static fromBuffer(buffer: Buffer): ModbusTCPResponse<import("./response/exception.js").default | import("./response/read-coils.js").default | import("./response/read-holding-registers.js").default | import("./response/read-input-registers.js").default | import("./response/write-multiple-coils.js").default | import("./response/write-multiple-registers.js").default | import("./response/write-single-coil.js").default | import("./response/write-single-register.js").default | import("./response/read-discrete-inputs.js").default> | null;
    protected _id: number;
    protected _protocol: number;
    protected _bodyLength: number;
    protected _unitId: number;
    protected _body: ResBody;
    constructor(id: number, protocol: number, bodyLength: number, unitId: number, body: ResBody);
    createPayload(): Buffer;
}
//# sourceMappingURL=tcp-response.d.ts.map