/// <reference types="node" />
import ModbusAbstractResponse from './abstract-response.js';
import { ModbusRequestBody } from './request/index.js';
import ModbusResponseBody from './response/response-body.js';
import ModbusRTURequest from './rtu-request.js';
export default class ModbusRTUResponse<ResBody extends ModbusResponseBody = ModbusResponseBody> extends ModbusAbstractResponse<ResBody> {
    readonly address: number;
    readonly crc: number | undefined;
    readonly body: ResBody;
    readonly byteCount: number;
    readonly slaveId: number;
    readonly unitId: number;
    static fromRequest<ReqBody extends ModbusRequestBody, ResBody extends ModbusResponseBody>(rtuRequest: ModbusRTURequest<ReqBody>, modbusBody: ResBody): ModbusRTUResponse<ResBody>;
    static fromBuffer(buffer: Buffer): ModbusRTUResponse<import("./response/exception.js").default | import("./response/read-coils.js").default | import("./response/read-holding-registers.js").default | import("./response/read-input-registers.js").default | import("./response/write-multiple-coils.js").default | import("./response/write-multiple-registers.js").default | import("./response/write-single-coil.js").default | import("./response/write-single-register.js").default | import("./response/read-discrete-inputs.js").default> | null;
    _address: number;
    _crc: number | undefined;
    protected _body: ResBody;
    constructor(address: number, crc: number | undefined, body: ResBody);
    createPayload(): Buffer;
}
//# sourceMappingURL=rtu-response.d.ts.map