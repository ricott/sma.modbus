/// <reference types="node" />
import ModbusRequestBody from './request/request-body';
import ModbusTCPResponse from './tcp-response';
import { Socket } from 'net';
import MBClientRequestHandler from './client-request-handler.js';
import ModbusTCPRequest from './tcp-request.js';
import UserRequest from './user-request';
export default class ModbusTCPClientRequestHandler extends MBClientRequestHandler<Socket, ModbusTCPRequest> {
    protected _requests: Array<UserRequest<ModbusTCPRequest>>;
    protected _currentRequest: UserRequest<ModbusTCPRequest> | null | undefined;
    private _requestId;
    private _unitId;
    constructor(socket: Socket, unitId: number, timeout?: number);
    register<T extends ModbusRequestBody>(requestBody: T): any;
    handle<T extends ModbusTCPResponse>(response: T): void;
}
//# sourceMappingURL=tcp-client-request-handler.d.ts.map