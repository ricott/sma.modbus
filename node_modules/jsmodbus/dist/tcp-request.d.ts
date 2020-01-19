/// <reference types="node" />
import ModbusAbstractRequest from './abstract-request.js';
import ModbusRequestBody from './request/request-body.js';
export default class ModbusTCPRequest<ReqBody extends ModbusRequestBody = ModbusRequestBody> extends ModbusAbstractRequest<ReqBody> {
    readonly id: number;
    readonly protocol: number;
    readonly length: number;
    readonly unitId: number;
    readonly address: number;
    readonly slaveId: number;
    readonly name: import("./request/request-body.js").ModbusRequestTypeName;
    readonly body: ReqBody;
    readonly corrupted: boolean;
    readonly byteCount: number;
    static fromBuffer(buffer: Buffer): ModbusTCPRequest<import("./request/exception.js").default | import("./request/read-coils.js").default | import("./request/read-discrete-inputs.js").default | import("./request/read-holding-registers.js").default | import("./request/read-input-registers.js").default | import("./request/write-multiple-coils.js").default | import("./request/write-multiple-registers.js").default | import("./request/write-single-coil.js").default | import("./request/write-single-register.js").default> | null;
    protected _id: number;
    protected _protocol: number;
    protected _length: number;
    protected _unitId: number;
    protected _body: ReqBody;
    constructor(id: number, protocol: number, length: number, unitId: number, body: ReqBody);
    createPayload(): Buffer;
}
//# sourceMappingURL=tcp-request.d.ts.map