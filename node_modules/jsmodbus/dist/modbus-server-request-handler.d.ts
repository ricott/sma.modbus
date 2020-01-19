/// <reference types="node" />
import ModbusAbstractRequest, { ModbusAbstractRequestFromBuffer } from './abstract-request';
export default class ModbusServerRequestHandler<FB extends ModbusAbstractRequestFromBuffer<any>> {
    _fromBuffer: FB;
    _requests: ModbusAbstractRequest[];
    _buffer: Buffer;
    constructor(fromBufferMethod: FB);
    shift(): ModbusAbstractRequest<import("./request").ModbusRequestBody> | undefined;
    handle(data: Buffer): void;
}
//# sourceMappingURL=modbus-server-request-handler.d.ts.map