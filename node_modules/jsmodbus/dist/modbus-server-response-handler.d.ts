/// <reference types="node" />
import ModbusServer from './modbus-server';
import ModbusAbstractRequest from './abstract-request';
import { ModbusAbstractResponseFromRequest } from './abstract-response';
export default class ModbusServerResponseHandler<FR extends ModbusAbstractResponseFromRequest> {
    _server: ModbusServer;
    _fromRequest: FR;
    constructor(server: ModbusServer, fromRequest: FR);
    handle(request: ModbusAbstractRequest, cb: (buffer: Buffer) => void): import("./abstract-response").default<import("./response").ModbusResponseBody> | null | undefined;
    private _handleReadCoil;
    private _handleDiscreteInput;
    private _handleReadHoldingRegisters;
    private _handleReadInputRegisters;
    private _handleWriteSingleCoil;
    private _handleWriteSingleHoldingRegister;
    private _handleWriteMultipleCoils;
    private _handleWriteMultipleHoldingRegisters;
}
//# sourceMappingURL=modbus-server-response-handler.d.ts.map