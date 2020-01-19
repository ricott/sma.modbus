/// <reference types="node" />
import ModbusAbstractRequest from './abstract-request.js';
import ModbusRequestBody from './request/request-body.js';
export default class ModbusRTURequest<ReqBody extends ModbusRequestBody = ModbusRequestBody> extends ModbusAbstractRequest<ReqBody> {
    readonly address: number;
    readonly slaveId: number;
    readonly unitId: number;
    readonly crc: number;
    readonly name: import("./request/request-body.js").ModbusRequestTypeName;
    readonly corrupted: boolean;
    readonly body: ReqBody;
    readonly byteCount: number;
    static fromBuffer(buffer: Buffer): ModbusRTURequest<import("./request/exception.js").default | import("./request/read-coils.js").default | import("./request/read-discrete-inputs.js").default | import("./request/read-holding-registers.js").default | import("./request/read-input-registers.js").default | import("./request/write-multiple-coils.js").default | import("./request/write-multiple-registers.js").default | import("./request/write-single-coil.js").default | import("./request/write-single-register.js").default> | null;
    protected _address: number;
    protected _body: ReqBody;
    protected _corrupted: boolean;
    protected _crc: number;
    constructor(address: number, body: ReqBody, corrupted?: boolean);
    createPayload(): Buffer;
}
//# sourceMappingURL=rtu-request.d.ts.map