/// <reference types="node" />
import { Socket } from 'net';
import MBClient from './modbus-client.js';
import MBTCPClientRequestHandler from './tcp-client-request-handler.js';
import ModbusTCPClientResponseHandler from './tcp-client-response-handler.js';
import ModbusTCPRequest from './tcp-request.js';
export default class ModbusTCPClient extends MBClient<Socket, ModbusTCPRequest> {
    protected _requestHandler: MBTCPClientRequestHandler;
    protected _responseHandler: ModbusTCPClientResponseHandler;
    protected readonly _unitId: number;
    protected readonly _timeout: number;
    constructor(socket: Socket, unitId?: number, timeout?: number);
    readonly slaveId: number;
    readonly unitId: number;
}
//# sourceMappingURL=modbus-tcp-client.d.ts.map