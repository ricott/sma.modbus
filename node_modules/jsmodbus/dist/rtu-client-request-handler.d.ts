import * as SerialSocket from 'serialport';
import MBClientRequestHandler from './client-request-handler.js';
import ModbusRequestBody from './request/request-body.js';
import ModbusRTURequest from './rtu-request.js';
import ModbusRTUResponse from './rtu-response.js';
import UserRequest from './user-request.js';
export default class ModbusRTUClientRequestHandler extends MBClientRequestHandler<SerialSocket, ModbusRTURequest> {
    protected _requests: Array<UserRequest<ModbusRTURequest>>;
    protected _currentRequest: UserRequest<ModbusRTURequest> | null | undefined;
    protected readonly _address: number;
    constructor(socket: SerialSocket, address: number, timeout?: number);
    register<T extends ModbusRequestBody>(requestBody: T): any;
    handle<T extends ModbusRTUResponse>(response: T): void;
    readonly address: number;
}
//# sourceMappingURL=rtu-client-request-handler.d.ts.map