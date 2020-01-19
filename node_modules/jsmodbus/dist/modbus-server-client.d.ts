/// <reference types="node" />
import * as Stream from 'stream';
import { ModbusAbstractRequestFromBuffer } from './abstract-request.js';
import { ModbusAbstractResponseFromRequest } from './abstract-response.js';
import ModbusServerRequestHandler from './modbus-server-request-handler.js';
import ModbusServerResponseHandler from './modbus-server-response-handler.js';
import ModbusServer from './modbus-server.js';
export default class ModbusServerClient<S extends Stream.Duplex, ReqFromBufferMethod extends ModbusAbstractRequestFromBuffer, ResFromRequestMethod extends ModbusAbstractResponseFromRequest> {
    _server: ModbusServer;
    _socket: S;
    _requestHandler: ModbusServerRequestHandler<ReqFromBufferMethod>;
    _responseHandler: ModbusServerResponseHandler<ResFromRequestMethod>;
    constructor(server: ModbusServer, socket: S, fromBufferMethod: ReqFromBufferMethod, fromRequestMethod: ResFromRequestMethod);
    readonly socket: S;
    readonly server: ModbusServer;
    _onData(data: Buffer): void;
}
//# sourceMappingURL=modbus-server-client.d.ts.map